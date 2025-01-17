package org.akashihi.mdg.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.akashihi.mdg.api.v1.RestException;
import org.akashihi.mdg.dao.AccountRepository;
import org.akashihi.mdg.dao.BudgetEntryRepository;
import org.akashihi.mdg.dao.BudgetRepository;
import org.akashihi.mdg.entity.AccountType;
import org.akashihi.mdg.entity.Budget;
import org.akashihi.mdg.entity.BudgetEntry;
import org.akashihi.mdg.entity.BudgetEntryMode;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import javax.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.Collections;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class BudgetService {
    private final AccountRepository accountRepository;
    private final BudgetRepository budgetRepository;
    private final BudgetEntryRepository budgetEntryRepository;
    private final TransactionService transactionService;
    private final SettingService settingService;
    private final RateService rateService;

    protected Boolean validateBudget(Budget budget) {
        if (budget.getBeginning().isAfter(budget.getEnd())) {
            throw new RestException("BUDGET_INVALID_TERM", 412, "/budgets");
        }
        if (ChronoUnit.DAYS.between(budget.getBeginning(), budget.getEnd()) < 1) {
            throw new RestException("BUDGET_SHORT_RANGE", 412, "/budgets");
        }
        if (budgetRepository.existsByEndGreaterThanEqualAndBeginningLessThanEqual(budget.getBeginning(), budget.getEnd())) {
            throw new RestException("BUDGET_OVERLAPPING", 412, "/budgets");
        }

        return true;
    }

    protected BudgetEntry applyActualAmount(BudgetEntry entry) {
        var from = entry.getBudget().getBeginning();
        var to = entry.getBudget().getEnd();

        // Find actual spendings
        entry.setActualAmount(transactionService.spendingOverPeriod(from.atTime(0, 0), to.atTime(23, 59), entry.getAccount()));
        return entry;
    }

    @Transactional
    public Budget create(Budget budget) {
        validateBudget(budget);
        String id = budget.getBeginning().format(DateTimeFormatter.BASIC_ISO_DATE);
        budget.setId(Long.valueOf(id));
        budgetRepository.save(budget);
        log.info("Created budget {}", budget);
        return budget;
    }

    @Transactional
    public Collection<Budget> list() {
        return budgetRepository.findAll(Sort.by("beginning").descending());
    }

    @Transactional
    public Collection<Budget> listInRange(LocalDate from, LocalDate to) {
        return budgetRepository.findByBeginningGreaterThanEqualAndEndIsLessThanEqualOrderByBeginningAsc(from, to)
                .stream()
                .map(this::enrichBudget)
                .toList();
    }

    protected BigDecimal applyRateForEntry(BigDecimal amount, BudgetEntry entry) {
        var primaryCurrency = settingService.getCurrentCurrencyPrimary();
        if (primaryCurrency.map(c -> c.equals(entry.getAccount().getCurrency())).orElse(true)) {
            return amount;
        }
        var rate = rateService.getCurrentRateForPair(entry.getAccount().getCurrency(), primaryCurrency.get());
        return amount.multiply(rate.getRate());
    }

    protected Budget.BudgetPair getActualExpectedForDate(LocalDate from, LocalDate to, Collection<BudgetEntry> entries, AccountType type) {
        var actual = entries.stream()
                .filter(e -> e.getAccount().getAccountType().equals(type))
                .map(e -> {
                    var amount = transactionService.spendingOverPeriod(from.atTime(0, 0), to.atTime(23, 59), e.getAccount());
                    return this.applyRateForEntry(amount, e);
                }).reduce(BigDecimal.ZERO, BigDecimal::add);
        var expected = entries.stream()
                .filter(e -> e.getAccount().getAccountType().equals(type))
                .map(e -> this.applyRateForEntry(e.getExpectedAmount(), e))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Budget.BudgetPair(actual, expected);
    }

    protected Budget.BudgetPair getActualExpectedForBudget(Budget budget, Collection<BudgetEntry> entries, AccountType type) {
        return this.getActualExpectedForDate(budget.getBeginning(), budget.getEnd(), entries, type);
    }

    @Transactional
    public Optional<Budget> get(Long id) {
        var budgetValue = budgetRepository.findFirstByIdLessThanEqualOrderByIdDesc(id);
        if (budgetValue.isEmpty()) {
            return budgetValue;
        }
        var budget = budgetValue.get();
        enrichBudget(budget);
        return Optional.of(budget);
    }

    protected Budget enrichBudget(Budget budget) {
        budget.setIncomingAmount(accountRepository.getTotalAssetsForDate(budget.getBeginning()).orElse(BigDecimal.ZERO));

        var outgoingActual = accountRepository.getTotalAssetsForDate(budget.getEnd().plusDays(1)).orElse(BigDecimal.ZERO);

        var entries = budgetEntryRepository.findByBudget(budget).stream()
                .map(this::applyActualAmount)
                .map(e -> BudgetService.analyzeSpendings(e, LocalDate.now()))
                .toList();
        var outgoingExpected = entries.stream()
                .map(e -> {
                    var amount = e.getExpectedAmount();
                    if (e.getAccount().getAccountType().equals(AccountType.EXPENSE)) {
                        amount = amount.negate(); // Expense account decrease expected performance
                    }
                    return this.applyRateForEntry(amount, e);
                })
                .reduce(budget.getIncomingAmount(), BigDecimal::add);
        var outgoing = new Budget.BudgetPair(outgoingActual, outgoingExpected);
        budget.setOutgoingAmount(outgoing);

        var incomeTotals = getActualExpectedForBudget(budget, entries, AccountType.INCOME);
        incomeTotals = new Budget.BudgetPair(incomeTotals.actual().negate(), incomeTotals.expected()); // Incomes are subtractions from income account, so they are always negative. But for the budget purposes it should be positive
        var expenseTotals = getActualExpectedForBudget(budget, entries, AccountType.EXPENSE);
        var allowedSpendingsTotals = getActualExpectedForDate(LocalDate.now(), LocalDate.now(), entries, AccountType.EXPENSE);

        var state = new Budget.BudgetState(incomeTotals, expenseTotals, allowedSpendingsTotals);
        budget.setState(state);
        return budget;
    }

    @Transactional
    public Optional<Budget> update(Long id, Budget newBudget) {
        validateBudget(newBudget);

        var budgetValue = budgetRepository.findById(id);
        if (budgetValue.isEmpty()) {
            return budgetValue;
        }
        var budget = budgetValue.get();
        budget.setBeginning(newBudget.getBeginning());
        budget.setEnd(newBudget.getEnd());

        budgetRepository.save(budget);
        return Optional.of(budget);
    }

    public static BigDecimal getSpendingPercent(BigDecimal actualAmount, BigDecimal expectedAmount) {
        if (expectedAmount.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.valueOf(100L);
        }
        var value = actualAmount.setScale(2, RoundingMode.HALF_UP).divide(expectedAmount, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100L)).setScale(0, RoundingMode.HALF_UP);
        if (value.compareTo(BigDecimal.valueOf(100L)) > 0) {
            value = BigDecimal.valueOf(100L); // Cap overspending to 100%
        }
        return value;
    }

    public static BigDecimal getAllowedSpendings(BigDecimal actualAmount, BigDecimal expectedAmount, LocalDate from, LocalDate to, LocalDate forDay, BudgetEntryMode mode) {
        if (forDay.isBefore(from.minusDays(1)) || forDay.isAfter(to)) {
            // We are out of that budget, no spendings are allowed
            return BigDecimal.ZERO;
        }
        var budgetLength = BigDecimal.valueOf(ChronoUnit.DAYS.between(from.minusDays(1), to)); //Including first day
        var daysLeft = BigDecimal.valueOf(ChronoUnit.DAYS.between(forDay.minusDays(1), to)); //Including today
        var daysPassed = BigDecimal.valueOf(ChronoUnit.DAYS.between(from.minusDays(1), forDay)); //Including first day and today

        BigDecimal allowed = BigDecimal.ZERO;
        if (mode == BudgetEntryMode.PRORATED) {
            allowed = expectedAmount.divide(budgetLength, RoundingMode.HALF_DOWN).multiply(daysPassed).subtract(actualAmount);
        }
        if (mode == BudgetEntryMode.EVEN || allowed.compareTo(BigDecimal.ZERO) < 0) { // Negative prorations are re-calculated in the even mode
            allowed = expectedAmount.subtract(actualAmount).divide(daysLeft, RoundingMode.HALF_DOWN);
        }
        if (mode == BudgetEntryMode.SINGLE) {
            // Not evenly distributed, spend everything left
            allowed = expectedAmount.subtract(actualAmount);
        }
        if (allowed.compareTo(BigDecimal.ZERO) < 0) {
            //Nothing to spend
            allowed = BigDecimal.ZERO;
        }
        return allowed.setScale(0, RoundingMode.HALF_DOWN);
    }

    public static BudgetEntry analyzeSpendings(BudgetEntry entry, LocalDate forDay) {
        entry.setSpendingPercent(getSpendingPercent(entry.getActualAmount(), entry.getExpectedAmount()));

        var from = entry.getBudget().getBeginning();
        var to = entry.getBudget().getEnd();
        entry.setAllowedSpendings(getAllowedSpendings(entry.getActualAmount(), entry.getExpectedAmount(), from, to, forDay, BudgetEntryMode.from(entry)));
        return entry;
    }

    @Transactional
    public Optional<BudgetEntry> getBudgetEntry(Long entryId) {
        var entryValue = budgetEntryRepository.findById(entryId);
        if (entryValue.isEmpty()) {
            return entryValue;
        }

        var entry = entryValue.get();

        this.applyActualAmount(entry);
        // Apply spendings analysis
        analyzeSpendings(entry, LocalDate.now());

        return Optional.of(entry);
    }

    @Transactional
    public Optional<BudgetEntry> updateBudgetEntry(Long entryId, BudgetEntry newEntry) {
        var entryValue = budgetEntryRepository.findById(entryId);
        if (entryValue.isEmpty()) {
            return entryValue;
        }

        var entry = entryValue.get();
        if (newEntry.getExpectedAmount().compareTo(BigDecimal.ZERO) >= 0) {
            entry.setExpectedAmount(newEntry.getExpectedAmount());
        } else {
            throw new RestException("BUDGETENTRY_IS_NEGATIVE", 422, "/budgets/%d/entry/%d".formatted(entry.getBudget().getId(), entryId));
        }
        entry.setEvenDistribution(newEntry.getEvenDistribution());
        if (newEntry.getEvenDistribution()) {
            entry.setProration(newEntry.getProration());
        } else {
            entry.setProration(false);
        }

        this.applyActualAmount(entry);
        analyzeSpendings(entry, LocalDate.now());

        budgetEntryRepository.save(entry);
        return Optional.of(entry);
    }

    @Transactional
    public Collection<BudgetEntry> listEntries(Long budgetId) {
        var budget = this.get(budgetId);
        if (budget.isEmpty()) {
            return Collections.emptyList();
        }

        var today = LocalDate.now();
        var entries = budgetEntryRepository.findByBudget(budget.get());
        entries.forEach(e -> {
            this.applyActualAmount(e);
            analyzeSpendings(e, today);
        });

        return entries;
    }

    @Transactional
    public void delete(Long id) {
        budgetRepository.deleteById(id);
    }
}
