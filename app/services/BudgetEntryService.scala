package services

import java.time.LocalDate
import java.time.temporal.ChronoUnit

import controllers.dto.BudgetEntryDTO
import models.{Account, Budget, BudgetEntry, ExpenseAccount}
import slick.jdbc.PostgresProfile.api._
import play.api.libs.concurrent.Execution.Implicits._

import scala.math.Ordering
import scalaz._
import Scalaz._
import dao.queries.{AccountQuery, BudgetQuery, BudgetEntryQuery}

import scala.math.BigDecimal.RoundingMode

/**
  * Budget operations service.
  */
object BudgetEntryService {

  /**
    * Calculates allowed future spendings.
    *
    * @param b      BudgetEntry
    * @param budget related Budget
    * @return allowed future spendings.
    */
  def getEntryAmounts(b: BudgetEntry,
                              forDay: LocalDate,
                              budget: Budget,
                              actual: BigDecimal): Option[BigDecimal] = {
    if (forDay.plusDays(1).isAfter(budget.term_beginning) && forDay.minusDays(1).isBefore(budget.term_end)) { //We need to check equality condition too
      val budgetLength =
        ChronoUnit.DAYS.between(budget.term_beginning.minusDays(1), budget.term_end) //We need to include first day
      val daysLeft =
        ChronoUnit.DAYS.between(forDay.minusDays(1), budget.term_end) //We need to include specified day
      val daysPassed =
        ChronoUnit.DAYS.between(budget.term_beginning.minusDays(1), forDay) //We need to include first day
      val changeAmount = b.even_distribution match {
        case false => None
        case true =>
          b.proration match {
            case Some(false) | None =>
              Some((b.expected_amount - actual) / daysLeft)
            case Some(true) =>
              Some(
                (b.expected_amount / budgetLength) * daysPassed - actual)
          }
      }
      changeAmount
        .map(x => if (x < 0) BigDecimal(0) else x)
        .map(_.setScale(0, RoundingMode.HALF_DOWN))
    } else {
      None
    }
  }

  /**
    * Converts BudgetEntry object to the DTO
    *
    * @param b budget entry object to convert
    * @return Fully filled DTO object
    */
  def entryToDTO(b: BudgetEntry): DBIO[BudgetEntryDTO] = {
    val amounts: DBIO[(BigDecimal, Option[BigDecimal])] =
      BudgetQuery.find(b.budget_id).flatMap {
        case None => DBIO.successful((BigDecimal(0), None))
        case Some(budget) =>
          BudgetEntryQuery.getActualSpendings(b.account_id, budget).map {
            actual =>
              (actual, getEntryAmounts(b, LocalDate.now(), budget, actual))
          }
      }
    amounts.flatMap { p =>
      val (actual, normalizedChangeAmount) = p
      val defaultAccount = Account(None, ExpenseAccount, 0, "No account found", 0, false, false, false)
      val account = AccountQuery.findById(b.account_id).map(_.getOrElse(defaultAccount))
      account.map { a =>
        BudgetEntryDTO(b.id,
          b.account_id,
          a.account_type.value,
          a.name,
          b.even_distribution,
          b.proration,
          b.expected_amount,
          actual,
          normalizedChangeAmount)
      }
    }
  }

  /**
    * Lists entries for specified budget.
    *
    * @param budget_id Identity of a budget.
    * @return Sequence of BudgetEntry DTOs.
    */
  def list(budget_id: Long): DBIO[Seq[BudgetEntryDTO]] =
    BudgetEntryQuery
      .list(budget_id: Long)
      .flatMap(x => DBIO.sequence(x.map(entryToDTO)))
    .map(_.sortBy(r => (r.account_type, r.account_name))(Ordering.Tuple2(Ordering.String.reverse, Ordering.String)))

  def find(id: Long, budget_id: Long): DBIO[Option[BudgetEntryDTO]] = {
    BudgetEntryQuery.find(id, budget_id).flatMap { x =>
      x.map(entryToDTO) match {
        case Some(f) => f.map(Some(_))
        case None => DBIO.successful(None)
      }
    }
  }

  /**
    * Replaces values in a specified budget entry.
    *
    * @param id        Identity of a budget entry.
    * @param budget_id Identity of owning budget.
    * @param ed        New value of even_distribution property.
    * @param p         New value of proration property.
    * @param ea        New value of expected_amount property
    * @return Error code or updated BudgetEntry(DTO).
    */
  def edit(id: Long,
           budget_id: Long,
           ed: Option[Boolean],
           p: Option[Boolean],
           ea: Option[BigDecimal]): DBIO[\/[String, BudgetEntryDTO]] = {
    val proration = ed match {
      case Some(true) => p
      case _ => Some(false)
    }
    BudgetEntryQuery.find(id, budget_id).flatMap {
      case None => DBIO.successful("BUDGETENTRY_NOT_FOUND".left)
      case Some(x) =>
        val updated = x.copy(even_distribution =
          ed.getOrElse(x.even_distribution),
          proration = proration,
          expected_amount = ea.getOrElse(x.expected_amount))
        BudgetEntryQuery.update(updated).flatMap {
          case 1 => entryToDTO(updated).map(_.right)
          case _ => DBIO.successful("BUDGETENTRY_BOT_UPDATED".left)
        }
    }
  }
}
