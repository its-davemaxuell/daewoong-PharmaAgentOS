"""SQL pagination and aggregate facets; never materialize the catalog in the portal."""

from sqlalchemy import String, cast, exists, func, literal, or_, select, true

from app.enums import ScopeStatus
from app.models import AiSummary, Document, Finding, WarningLetter


def catalog_scope():
    return (
        WarningLetter.current_in_scope.is_(True),
        WarningLetter.scope_status == ScopeStatus.IN_SCOPE_DRUGS.value,
    )


def array_values(session, column):
    function = (
        func.json_array_elements_text
        if session.bind.dialect.name == "postgresql"
        else func.json_each
    )
    values = function(column).table_valued("value", joins_implicitly=True)
    # PostgreSQL's SRF column must be named explicitly; SQLite exposes `value`.
    return values.render_derived() if session.bind.dialect.name == "postgresql" else values


def latest_summary_id():
    return (
        select(AiSummary.id)
        .where(AiSummary.document_version_id == WarningLetter.current_version_id)
        .order_by(AiSummary.created_at.desc(), AiSummary.revision.desc(), AiSummary.id)
        .limit(1)
        .correlate(WarningLetter)
        .scalar_subquery()
    )


def linked_document(kind):
    return exists(
        select(Document.id).where(
            Document.warning_letter_id == WarningLetter.id, Document.document_type == kind
        )
    )


def search_query(
    session, *, q, subtype, category, country, lifecycle, review, document, posted_from, posted_to
):
    query = select(WarningLetter).where(*catalog_scope())
    if q:
        # Literal substring semantics; wildcard characters supplied by users are not SQL patterns.
        escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        columns = [
            WarningLetter.company_name,
            WarningLetter.marcs_cms_number,
            WarningLetter.subject,
            cast(WarningLetter.issuing_offices, String),
        ]
        finding_match = exists(
            select(Finding.id).where(
                Finding.summary_id == latest_summary_id(),
                or_(
                    cast(Finding.categories, String).ilike(pattern, escape="\\"),
                    cast(Finding.regulatory_references, String).ilike(pattern, escape="\\"),
                ),
            )
        )
        query = query.where(
            or_(*(column.ilike(pattern, escape="\\") for column in columns), finding_match)
        )
    if subtype:
        values = array_values(session, WarningLetter.drug_subtypes)
        query = query.where(
            exists(select(literal(1)).select_from(values).where(values.c.value == subtype))
        )
    if category:
        values = array_values(session, Finding.categories)
        query = query.where(
            exists(
                select(Finding.id)
                .select_from(Finding)
                .join(values, true())
                .where(Finding.summary_id == latest_summary_id(), values.c.value == category)
            )
        )
    if country:
        query = query.where(WarningLetter.country == country)
    if lifecycle:
        query = query.where(func.upper(WarningLetter.lifecycle_status) == lifecycle.upper())
    if review:
        state = (
            select(AiSummary.review_state)
            .where(AiSummary.id == latest_summary_id())
            .correlate(WarningLetter)
            .scalar_subquery()
        )
        query = query.where(func.coalesce(state, "not_generated") == review)
    if document:
        query = query.where(
            ~linked_document("closeout") if document == "open" else linked_document(document)
        )
    posted = func.coalesce(WarningLetter.posted_date, WarningLetter.issue_date)
    if posted_from:
        query = query.where(posted >= posted_from)
    if posted_to:
        query = query.where(posted <= posted_to)
    return query


async def catalog_facets(session):
    facets = {}
    for name, column in [
        ("country", WarningLetter.country),
        ("lifecycle", func.upper(WarningLetter.lifecycle_status)),
    ]:
        rows = await session.execute(
            select(column, func.count())
            .where(*catalog_scope(), column.is_not(None))
            .group_by(column)
            .order_by(column)
        )
        facets[name] = [{"value": value, "count": count} for value, count in rows if value]
    values = array_values(session, WarningLetter.drug_subtypes)
    rows = await session.execute(
        select(values.c.value, func.count(func.distinct(WarningLetter.id)))
        .select_from(WarningLetter)
        .join(values, true())
        .where(*catalog_scope())
        .group_by(values.c.value)
        .order_by(values.c.value)
    )
    facets["subtype"] = [{"value": value, "count": count} for value, count in rows if value]
    values = array_values(session, Finding.categories)
    rows = await session.execute(
        select(values.c.value, func.count(func.distinct(WarningLetter.id)))
        .select_from(WarningLetter)
        .join(Finding, Finding.summary_id == latest_summary_id())
        .join(values, true())
        .where(*catalog_scope())
        .group_by(values.c.value)
        .order_by(values.c.value)
    )
    facets["category"] = [{"value": value, "count": count} for value, count in rows if value]
    state = func.coalesce(AiSummary.review_state, "not_generated")
    rows = await session.execute(
        select(state, func.count())
        .select_from(WarningLetter)
        .outerjoin(AiSummary, AiSummary.id == latest_summary_id())
        .where(*catalog_scope())
        .group_by(state)
        .order_by(state)
    )
    facets["review"] = [{"value": value, "count": count} for value, count in rows]
    facets["document"] = []
    for kind in ["response", "closeout", "open"]:
        condition = ~linked_document("closeout") if kind == "open" else linked_document(kind)
        count = await session.scalar(
            select(func.count()).select_from(WarningLetter).where(*catalog_scope(), condition)
        )
        if count:
            facets["document"].append({"value": kind, "count": count})
    return facets
