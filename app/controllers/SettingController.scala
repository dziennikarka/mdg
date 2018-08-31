package controllers

import javax.inject._

import controllers.api.ResultMaker._
import play.api.db.slick.DatabaseConfigProvider
import play.api.mvc._
import services.SettingService
import services.ErrorService._
import slick.jdbc.JdbcProfile

import scala.concurrent.ExecutionContext

/**
  * Setting resource REST controller
  */
@Singleton
class SettingController @Inject()(
    protected val dbConfigProvider: DatabaseConfigProvider)(
    implicit ec: ExecutionContext)
    extends InjectedController {
  val db = dbConfigProvider.get[JdbcProfile].db

  /**
    * Setting list access method
    *
    * @return list of settings on system, wrapped to json.
    */
  def index = Action.async {
    db.run(SettingService.list().map(x => makeResult(x)(OK)))
  }

  /**
    * Setting object retrieval method
    *
    * @param id setting id.
    * @return setting object.
    */
  def show(id: String) = Action.async {
    val result = SettingService
      .get(id)
      .run
      .flatMap(x =>
        handleErrors(x) { x =>
          makeResult(x)(OK)
      })
    db.run(result)
  }

  /**
    * currency.primary setting method.
    *
    * @return setting object.
    */
  def editCurrencyPrimary() = Action.async(parse.tolerantJson) { request =>
    val value = (request.body \ "data" \ "attributes" \ "value").asOpt[String]

    val result = SettingService.setCurrencyPrimary(value).run.flatMap { x =>
      handleErrors(x) { x =>
        makeResult(x)(ACCEPTED)
      }
    }
    db.run(result)
  }

  /**
    * ui.transaction.closedialog setting method.
    *
    * @return setting object.
    */
  def editUiTransactionCloseDialog() = Action.async(parse.tolerantJson) { request =>
    val value = (request.body \ "data" \ "attributes" \ "value").asOpt[String]

    val result = SettingService.setUiTransactionCloseDialog(value).run.flatMap { x =>
      handleErrors(x) { x =>
        makeResult(x)(ACCEPTED)
      }
    }
    db.run(result)
  }
}
