package controllers.api

import controllers.dto.{BudgetDTO, BudgetEntryDTO, TransactionDto}
import models.{Account, Currency, Error, TxTag}
import controllers.api.IdentifiableObject._
import play.api.libs.json._

/**
  * Api error object array wrapper.
  * @param errors errors to be wrapped.
  */
case class ErrorWrapper(errors: Seq[Error])

/**
  * Common api object JSON wrapper
  * @param id object id
  * @param type object type name
  * @param attributes object data
  */
case class JsonDataWrapper(id: Long,
                           `type`: String,
                           attributes: IdentifiableObject)
object JsonDataWrapper {
  def apply(o: IdentifiableObject): JsonDataWrapper =
    new JsonDataWrapper(o.id.getOrElse(-1), typeName(o), o)

  /**
    * Maps object class to type name
    * @param x object to match
    * @return class name
    */
  def typeName(x: IdentifiableObject): String = x match {
    case _: Currency => "currency"
    case _: Account => "account"
    case _: TransactionDto => "transaction"
    case _: BudgetDTO => "budget"
    case _: BudgetEntryDTO => "budgetentry"
    case _: TxTag => "tag"
  }
}

/**
  * Single entry api object JSON wrapper
  * @param data api object
  */
case class JsonWrapper(data: JsonDataWrapper)

/**
  * Multiple entries api object json wrapper
  * @param data api objects
  */
case class JsonWrapperSeq(data: Seq[JsonDataWrapper], count: Option[Int] = None)

object JsonWrapper {

  /**
    * Json helpers
    */
  implicit val dataWrites = Json.writes[JsonDataWrapper]
  implicit val wrapperWrites = Json.writes[JsonWrapper]
  implicit val wrapperSeqWrites = Writes[JsonWrapperSeq] { wrapper =>
    wrapper.count match {
      case None => (JsPath \ "data").write[Seq[JsonDataWrapper]].writes(wrapper.data)
      case Some(count) => (JsPath \ "data").write[Seq[JsonDataWrapper]].writes(wrapper.data) ++ (JsPath \ "count").write[Int].writes(count)
    }
  }
  implicit val errorWrapperWrites = Json.writes[ErrorWrapper]

  /**
    * Converts ApiObject to Json
    * @param x object to convert
    * @return JsValue
    */
  def wrapJson(x: IdentifiableObject): JsValue = {
    Json.toJson(JsonWrapper(JsonDataWrapper(x)))
  }

  /**
    * Converts several ApiObjects to Json
    * * @param x objects to convert
    * @return JsValue
    */
  def wrapJson(x: Seq[IdentifiableObject], count: Option[Int] = None): JsValue = {
    Json.toJson(JsonWrapperSeq(x.map(JsonDataWrapper.apply), count))
  }

  /**
    * Converts Error to Json
    * @param x error to convert
    * @return JsValue
    */
  def wrapJson(x: Error): JsValue = {
    Json.toJson(ErrorWrapper(Seq(x)))
  }
}
