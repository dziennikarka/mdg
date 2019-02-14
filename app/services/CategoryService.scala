package services
import controllers.dto.CategoryDTO
import dao.{SqlDatabase, SqlExecutionContext}
import javax.inject.Inject
import models.Category
import util.EitherOps._

import scala.concurrent._
import scalaz._
import Scalaz._
import dao.queries.CategoryQuery
import util.Default

class CategoryService  @Inject() (protected val sql: SqlDatabase)
                                 (implicit ec: SqlExecutionContext) {

  private def categoryToDto(c: Category): Future[CategoryDTO] = {
    val query = sql.query(CategoryQuery.listChildren(c))
    val kids = query.map(_.map(categoryToDto)).flatMap(k => Future.sequence(k))
    kids.map(k => CategoryDTO(c.id, c.name, c.account_type, c.priority, None, k))
  }

  private def dtoToCategory(dto: CategoryDTO): Category =
    Category(dto.id, dto.account_type, dto.name, dto.priority)

  def create(dto: Option[CategoryDTO]): ErrorF[CategoryDTO] = {
    val validDto = dto.fromOption("CATEGORY_DATA_INVALID")

    val category = validDto.map(dtoToCategory)

    val query = validDto.map(_.parent_id)
      .map(_.getOrElse(Default.value[Long]))
        .flatMap(parent => category.map(CategoryQuery.insertLeaf(parent, _)))

    query.map(sql.query).transform.map(categoryToDto).flatten
  }

  def list(): Future[Seq[CategoryDTO]] = sql.query(CategoryQuery.list).map(_.map(categoryToDto)).flatMap(dto => Future.sequence(dto))

  def getCategory(id: Long): ErrorF[Category] = EitherT(sql.query(CategoryQuery.findById(id)).map(_.fromOption("CATEGORY_NOT_FOUND")))

  def get(id: Long): ErrorF[CategoryDTO] = getCategory(id).map(categoryToDto).flatten

  def edit(id: Long, dto: Option[CategoryDTO]): ErrorF[CategoryDTO] = {
    val validDto = dto.fromOption("CATEGORY_DATA_INVALID")
    val wrappedDto = EitherT(Future.successful(validDto))
    val newCategory = wrappedDto.flatMap(vd => getCategory(id)
        .map(_.copy(name = vd.name, priority = vd.priority)))

    val query = wrappedDto.map(dto => dto.parent_id)
      .flatMap(_.map(parent => newCategory.map(CategoryQuery.reparent(_, parent)))
        .getOrElse(newCategory.map(CategoryQuery.update(_))))
        .map(_.map(_.fromOption("CATEGORY_NOT_FOUND")))

    query
      .flatMapF(sql.query)
      .map(categoryToDto)
      .flatten
  }

  def delete(id: Long): ErrorF[Int] = {
    val query = CategoryQuery.delete(id).map {
      case 1 => 1.right
      case _ => "CATEGORY_NOT_FOUND".left
    }
    EitherT(sql.query(query))
  }
}
