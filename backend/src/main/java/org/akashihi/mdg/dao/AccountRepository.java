package org.akashihi.mdg.dao;

import org.akashihi.mdg.dao.projections.AmountAndName;
import org.akashihi.mdg.entity.Account;
import org.akashihi.mdg.entity.AccountType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long>, JpaSpecificationExecutor<Account> {
    @Modifying
    @Query(nativeQuery = true, value = "UPDATE ACCOUNT SET CATEGORY_ID=null WHERE category_id = ?1")
    void dropCategory(Long id);

    @Query(nativeQuery = true, value = "SELECT balance FROM account_balance WHERE account_id = ?1")
    Optional<BigDecimal> getBalance(Long id);

    @Query(nativeQuery = true, value = "select sum(o.amount*coalesce(r.rate,1)) from operation as o left outer join account as a on(o.account_id = a.id) inner join tx on (o.tx_id=tx.id) inner join setting as s on (s.name='currency.primary') left outer join rates as r on (r.from_id=a.currency_id and r.to_id=s.value\\:\\:bigint and r.rate_beginning <= now() and r.rate_end > now()) where a.account_type='asset' and tx.ts < ?1")
    Optional<BigDecimal> getTotalAssetsForDate(LocalDate dt);

    @Query(nativeQuery = true, value = "select sum(o.amount), c.code from operation as o left outer join account as a on(o.account_id = a.id) inner join tx on (o.tx_id=tx.id) inner join currency c on c.id = a.currency_id where a.account_type='asset' and tx.ts < ?1 group by c.code;")
    List<AmountAndName> getTotalAssetsForDateByCurrency(LocalDate dt);

    @Query(nativeQuery = true, value = "select sum(o.amount*coalesce(r.rate,1)), c.name from operation as o left outer join account as a on(o.account_id = a.id) inner join tx on (o.tx_id=tx.id) inner join setting as s on (s.name='currency.primary') inner join category c on c.id = a.category_id left outer join rates as r on (r.from_id=a.currency_id and r.to_id=s.value\\:\\:bigint and r.rate_beginning <= now() and r.rate_end > now()) where a.account_type='asset' and tx.ts < ?1 group by c.name")
    List<AmountAndName> getTotalAssetsForDateByType(LocalDate dt);

    @Query(nativeQuery = true, value = "select sum(o.amount*coalesce(r.rate,1)), a.name from operation as o left outer join account as a on(o.account_id = a.id) inner join tx on (o.tx_id=tx.id) inner join setting as s on (s.name='currency.primary') left outer join rates as r on (r.from_id=a.currency_id and r.to_id=s.value\\:\\:bigint and r.rate_beginning <= now() and r.rate_end > now()) where a.account_type=?1 and tx.ts between ?2 and ?3 group by a.name order by a.name")
    List<AmountAndName> getTotalByAccountTypeForRange(String type, LocalDate from, LocalDate to);

    Collection<Account> findAllByAccountType(AccountType type);
}
