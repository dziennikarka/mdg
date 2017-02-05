package dao.tables

import models.Currency
import slick.driver.PostgresDriver.api._
import slick.lifted._

/**
  * Maps Currency entity to the SQL table.
  */
class Currencies(tag: Tag) extends Table[Currency](tag, "currency") {
  def id = column[Long]("id", O.PrimaryKey)
  def code = column[String]("code")
  def name = column[String]("name")
  def * = (id, code, name) <> ((Currency.apply _).tupled, Currency.unapply)
}