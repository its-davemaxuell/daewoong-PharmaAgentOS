from __future__ import annotations

import hashlib
import re

from sqlalchemy import and_, case, cast, exists, func, literal, or_, select
from sqlalchemy.dialects.postgresql import JSONB

from app.models import Document, DocumentChunk, DocumentVersion, WarningLetter


def source_query():
    return (
        select(DocumentChunk, DocumentVersion, WarningLetter, Document)
        .join(DocumentVersion, DocumentVersion.id == DocumentChunk.document_version_id)
        .join(WarningLetter, WarningLetter.id == DocumentChunk.warning_letter_id)
        .join(Document, Document.id == DocumentVersion.document_id)
        .where(
            WarningLetter.current_in_scope.is_(True),
            WarningLetter.scope_status == "IN_SCOPE_DRUGS",
            DocumentVersion.scope_status == "IN_SCOPE_DRUGS",
            WarningLetter.current_version_id == DocumentVersion.id,
            Document.warning_letter_id == WarningLetter.id,
            Document.document_type == "warning_letter",
            DocumentChunk.corpus_id == "fda-drugs",
        )
    )


def source_record(row):
    chunk, version, letter, document = row
    return {
        "chunk_id": chunk.id,
        "document_id": document.id,
        "letter_id": letter.id,
        "company": letter.company_name,
        "source_url": document.canonical_url,
        "anchor": chunk.source_anchor,
        "version_id": version.id,
        "version": version.version_number,
        "source_hash": version.canonical_hash,
        "chunk_hash": hashlib.sha256(chunk.content.encode()).hexdigest(),
        "text_representation": "document-chunk-content-utf8@1",
        "start_offset": 0,
        "end_offset": min(len(chunk.content), 4_500),
        "posted_date": letter.posted_date.isoformat() if letter.posted_date else None,
        "excerpt": chunk.content[:4_500],
    }


def public_source(row):
    # This account-free tool has viewer scope only, even when its worker has a
    # broader database role. Match the existing public FDA retrieval ACL boundary.
    acl = row[0].acl
    if acl is None:
        return True
    if not isinstance(acl, dict):
        return False
    roles = acl.get("roles", [])
    return isinstance(roles, list) and (not roles or "viewer" in roles)


def public_source_filter(session):
    """Remove denied rows before scoring/limiting, including malformed ACLs."""
    acl = DocumentChunk.acl
    if session.bind.dialect.name == "postgresql":
        value = cast(acl, JSONB)
        roles = value["roles"]
        role_type = func.jsonb_typeof(roles)
        safe_roles = case((role_type == "array", roles), else_=cast(literal("[]"), JSONB))
        return or_(
            acl.is_(None),
            func.jsonb_typeof(value) == "null",
            and_(
                func.jsonb_typeof(value) == "object",
                or_(
                    roles.is_(None),
                    and_(
                        role_type == "array",
                        or_(
                            func.jsonb_array_length(safe_roles) == 0,
                            safe_roles.op("@>")(cast(literal('["viewer"]'), JSONB)),
                        ),
                    ),
                ),
            ),
        )
    roles = func.json_extract(acl, "$.roles")
    role_type = func.json_type(acl, "$.roles")
    safe_roles = case((role_type == "array", roles), else_=literal("[]"))
    values = func.json_each(safe_roles).table_valued("value", joins_implicitly=True)
    return or_(
        acl.is_(None),
        func.json_type(acl) == "null",
        and_(
            func.json_type(acl) == "object",
            or_(
                role_type.is_(None),
                and_(
                    role_type == "array",
                    or_(
                        func.json_array_length(safe_roles) == 0,
                        exists(
                            select(literal(1)).select_from(values).where(values.c.value == "viewer")
                        ),
                    ),
                ),
            ),
        ),
    )


async def search_sources(database, query: str, selected_chunk_ids: list[str] | None = None):
    terms = list(dict.fromkeys(re.findall(r"[a-zA-Z0-9가-힣]{2,}", query.lower())))[:10]
    terms = [term for term in terms if term not in {"the", "and", "for", "with", "fda"}]
    if not terms:
        return []
    matches = [DocumentChunk.content.ilike(f"%{term}%") for term in terms]
    score = sum(case((match, 1), else_=0) for match in matches)
    statement = source_query().where(or_(*matches))
    if selected_chunk_ids:
        statement = statement.where(DocumentChunk.id.in_(selected_chunk_ids))
    async with database.session_factory() as session:
        rows = (
            await session.execute(
                statement.where(public_source_filter(session))
                .order_by(
                    score.desc(),
                    WarningLetter.posted_date.desc(),
                    DocumentChunk.id,
                )
                .limit(40)
            )
        ).all()
    selected = []
    company_counts = {}
    for row in rows:
        if not public_source(row):
            continue
        item = source_record(row)
        count = company_counts.get(item["letter_id"], 0)
        if count >= 2:
            continue
        company_counts[item["letter_id"]] = count + 1
        item["excerpt"] = item["excerpt"][:500]
        item["end_offset"] = len(item["excerpt"])
        selected.append(item)
        if len(selected) == 8:
            break
    return selected


async def read_sources(database, chunk_ids: list[str]):
    async with database.session_factory() as session:
        rows = (
            await session.execute(
                source_query()
                .where(
                    DocumentChunk.id.in_(chunk_ids),
                )
                .order_by(DocumentChunk.id)
            )
        ).all()
    return [source_record(row) for row in rows if public_source(row)]


async def evidence_is_current(database, evidence: list[dict]):
    current = {
        item["chunk_id"]: item
        for item in await read_sources(database, [item["chunk_id"] for item in evidence])
    }
    for item in evidence:
        source = current.get(item["chunk_id"])
        if not source or any(
            source[field] != item[field]
            for field in ("version_id", "source_hash", "chunk_hash", "letter_id", "excerpt")
        ):
            return False
    return True
