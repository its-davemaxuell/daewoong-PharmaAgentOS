from __future__ import annotations

from datetime import UTC, timedelta

from fastapi import HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.cases.hashing import canonical_sha256
from app.models import DocumentChunk, ResearchEvent, ResearchRun, utcnow

from .schemas import MAX_MODEL_CALLS, MAX_TOTAL_TOKENS, CreateResearch
from .tools import public_source, source_query, source_record

ACTIVE = {"queued", "running"}


def add_event(session: AsyncSession, run: ResearchRun, kind: str, data=None, stage=None):
    run.revision = (run.revision or 0) + 1
    run.updated_at = utcnow()
    if stage:
        run.stage = stage
    session.add(
        ResearchEvent(
            run_id=run.id,
            sequence=run.revision,
            kind=kind,
            stage=run.stage,
            data=data or {},
        )
    )


async def owned_run(session: AsyncSession, run_id: str, owner: str, *, lock=False):
    query = select(ResearchRun).where(ResearchRun.id == run_id, ResearchRun.owner_id == owner)
    if lock:
        query = query.with_for_update().execution_options(populate_existing=True)
    run = await session.scalar(query)
    if run is None:
        raise HTTPException(404, "Research task not found")
    return run


async def admission_lock(session: AsyncSession):
    # Serialize quota admission across API replicas; no process-local rate-limit gap.
    if session.bind.dialect.name == "postgresql":
        await session.execute(text("SELECT pg_advisory_xact_lock(728389901)"))


async def create_run(session: AsyncSession, owner: str, payload: CreateResearch):
    await admission_lock(session)
    previous = await session.scalar(
        select(ResearchRun).where(
            ResearchRun.owner_id == owner,
            ResearchRun.client_request_id == str(payload.client_request_id),
        )
    )
    if previous:
        saved_context = (previous.checkpoint or {}).get("context") or {}
        saved_ids = sorted(saved_context.get("selected_chunk_ids", []))
        if (
            previous.objective != payload.objective
            or previous.language != payload.language
            or saved_ids != sorted(str(value) for value in payload.selected_chunk_ids)
        ):
            raise HTTPException(409, "This request ID already belongs to a different task")
        return previous
    since = utcnow() - timedelta(days=1)
    active = await session.scalar(
        select(func.count())
        .select_from(ResearchRun)
        .where(
            ResearchRun.owner_id == owner,
            ResearchRun.status.in_(ACTIVE),
        )
    )
    daily = await session.scalar(
        select(func.count())
        .select_from(ResearchRun)
        .where(
            ResearchRun.owner_id == owner,
            ResearchRun.created_at >= since,
        )
    )
    total = await session.scalar(
        select(func.count())
        .select_from(ResearchRun)
        .where(
            ResearchRun.created_at >= since,
        )
    )
    if active >= 2 or daily >= 10 or total >= 100:
        raise HTTPException(429, "Research capacity reached; finish an active task or try later")
    selected_ids = sorted(str(value) for value in payload.selected_chunk_ids)
    selected = []
    if selected_ids:
        rows = (
            await session.execute(
                source_query().where(DocumentChunk.id.in_(selected_ids)).order_by(DocumentChunk.id)
            )
        ).all()
        selected = [source_record(row) for row in rows if public_source(row)]
        if {item["chunk_id"] for item in selected} != set(selected_ids):
            raise HTTPException(409, "Selected evidence is unavailable; refresh your selection")
    context = {
        "schema_version": 1,
        "actor_id": owner,
        "policy_version": "public-fda-evidence@1",
        "selected_chunk_ids": selected_ids,
        "sources": selected,
        "hydrated_at": utcnow().isoformat(),
    }
    context["context_hash"] = canonical_sha256(context)
    run = ResearchRun(
        owner_id=owner,
        client_request_id=str(payload.client_request_id),
        objective=payload.objective,
        language=payload.language,
        status="queued",
        stage="planning",
        revision=0,
        checkpoint={"context": context, "candidates": selected},
        model_calls=0,
        total_tokens=0,
        resumes=0,
    )
    session.add(run)
    await session.flush()
    context = {key: value for key, value in context.items() if key != "context_hash"}
    context["run_id"] = run.id
    context["context_hash"] = canonical_sha256(context)
    run.checkpoint = {"context": dict(context), "candidates": selected}
    add_event(session, run, "queued")
    await session.commit()
    return run


async def control_run(session: AsyncSession, run_id: str, owner: str, action: str):
    await admission_lock(session)
    run = await owned_run(session, run_id, owner, lock=True)
    if action == "stop":
        if run.status in ACTIVE:
            run.status = "stopped"
            run.lease_id = None
            run.lease_expires_at = None
            run.finished_at = utcnow()
            add_event(session, run, "stopped")
    elif action == "resume":
        if run.status not in {"stopped", "failed"}:
            raise HTTPException(409, "Only stopped or failed tasks can be resumed")
        if (
            run.model_calls >= MAX_MODEL_CALLS
            or run.total_tokens >= MAX_TOTAL_TOKENS
            or run.resumes >= 3
        ):
            raise HTTPException(409, "This task has reached its execution budget")
        active = await session.scalar(
            select(func.count())
            .select_from(ResearchRun)
            .where(
                ResearchRun.owner_id == owner,
                ResearchRun.status.in_(ACTIVE),
            )
        )
        if active >= 2:
            raise HTTPException(429, "Finish another active task before resuming")
        run.status = "queued"
        run.resumes += 1
        run.error_code = None
        run.finished_at = None
        run.lease_id = None
        run.lease_expires_at = None
        add_event(session, run, "resumed")
    await session.commit()
    return run


def timestamp(value):
    # SQLite loses timezone metadata; PostgreSQL retains it. Both store UTC.
    return value.replace(tzinfo=UTC) if value and value.tzinfo is None else value


def summary(run: ResearchRun):
    return {
        "id": run.id,
        "objective": run.objective,
        "language": run.language,
        "status": run.status,
        "stage": run.stage,
        "revision": run.revision,
        "created_at": timestamp(run.created_at),
        "updated_at": timestamp(run.updated_at),
        "started_at": timestamp(run.started_at),
        "finished_at": timestamp(run.finished_at),
        "model_calls": run.model_calls,
        "max_model_calls": MAX_MODEL_CALLS,
        "error_code": run.error_code,
        "can_resume": run.status in {"stopped", "failed"}
        and run.resumes < 3
        and run.model_calls < MAX_MODEL_CALLS
        and run.total_tokens < MAX_TOTAL_TOKENS,
    }


async def detail(session: AsyncSession, run: ResearchRun, after: int = 0):
    events = (
        await session.scalars(
            select(ResearchEvent)
            .where(
                ResearchEvent.run_id == run.id,
                ResearchEvent.sequence > after,
                ResearchEvent.sequence <= run.revision,
            )
            .order_by(ResearchEvent.sequence)
            .limit(200)
        )
    ).all()
    return {
        **summary(run),
        "plan": (run.checkpoint or {}).get("plan", []),
        "context": (run.checkpoint or {}).get("context"),
        "sources": (run.checkpoint or {}).get("evidence", []),
        "result": run.result,
        "events": [
            {
                "sequence": event.sequence,
                "kind": event.kind,
                "stage": event.stage,
                "data": event.data,
                "created_at": timestamp(event.created_at),
            }
            for event in events
        ],
    }
