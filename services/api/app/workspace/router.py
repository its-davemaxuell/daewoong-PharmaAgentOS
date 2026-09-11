from __future__ import annotations

import hashlib
import json
from datetime import timedelta
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import defer

from app.audit import add_audit_event
from app.dependencies import session_dependency
from app.models import (
    ChangeEvent,
    ChatThread,
    ResearchBriefSnapshot,
    ResearchRun,
    Subscription,
    WarningLetter,
    WorkspaceInboxPreference,
    WorkspaceTriage,
    utcnow,
)
from app.research.service import admission_lock, owned_run, timestamp
from app.routes.letter_search import catalog_scope
from app.security.auth import Principal, view_principal

from .schemas import BriefDetail, BriefPage, BriefSummary, InboxPage, SearchPage, TriageResult

router = APIRouter(tags=["Personal workspace"])


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class TriageInput(Strict):
    state: Literal["new", "later", "done", "dismissed"]
    expected_revision: int = Field(ge=0)
    reason: str = Field(default="", max_length=1000)


class SnapshotInput(Strict):
    run_id: UUID
    expected_revision: int = Field(ge=0)


def private(response: Response):
    response.headers["Cache-Control"] = "private, no-store"


def pattern(q: str):
    return "%" + q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


def saved_view_href(row):
    from app.routes.intelligence import (
        _controlled_saved_view_criteria,
        _saved_view_open_url,
        _view_display,
    )

    href = _saved_view_open_url(_controlled_saved_view_criteria(row.criteria))
    display = _view_display(row.display or {})
    return (
        href
        + ("&" if "?" in href else "?")
        + f"sort={display['sort']}&pageSize={display['pageSize']}"
    )


@router.get("/workspace/search", response_model=SearchPage)
async def search(
    response: Response,
    q: str = Query(default="", max_length=500),
    kind: Literal["all", "sources", "research", "briefs", "views", "chats"] = "all",
    page: int = Query(default=1, ge=1, le=10000),
    limit: int = Query(default=20, ge=1, le=100),
    principal: Principal = Depends(view_principal),
    session: AsyncSession = Depends(session_dependency),
):
    private(response)
    if not q.strip():
        return {"groups": [], "page": page}
    match = pattern(q)
    specs = [
        (
            "sources",
            WarningLetter,
            [
                *catalog_scope(),
                or_(
                    WarningLetter.company_name.ilike(match, escape="\\"),
                    WarningLetter.subject.ilike(match, escape="\\"),
                    WarningLetter.marcs_cms_number.ilike(match, escape="\\"),
                ),
            ],
        ),
        (
            "research",
            ResearchRun,
            [
                ResearchRun.owner_id == principal.subject,
                ResearchRun.objective.ilike(match, escape="\\"),
            ],
        ),
        (
            "briefs",
            ResearchBriefSnapshot,
            [
                ResearchBriefSnapshot.owner_id == principal.subject,
                ResearchBriefSnapshot.title.ilike(match, escape="\\"),
            ],
        ),
        (
            "views",
            Subscription,
            [
                Subscription.owner_id == principal.subject,
                ~Subscription.name.startswith("Drug letter bookmark:"),
                Subscription.name.ilike(match, escape="\\"),
            ],
        ),
        (
            "chats",
            ChatThread,
            [
                ChatThread.owner_subject == principal.subject,
                ChatThread.archived_at.is_(None),
                ChatThread.title.ilike(match, escape="\\"),
            ],
        ),
    ]
    groups = []
    for name, model, conditions in specs:
        if kind not in ("all", name):
            continue
        size = 5 if kind == "all" else limit
        options = (
            [defer(ResearchRun.checkpoint), defer(ResearchRun.result)]
            if name == "research"
            else [defer(ResearchBriefSnapshot.snapshot)]
            if name == "briefs"
            else []
        )
        rows = (
            await session.scalars(
                select(model)
                .options(*options)
                .where(*conditions)
                .order_by(model.id)
                .offset((page - 1) * size)
                .limit(size + 1)
            )
        ).all()
        items = []
        for row in rows[:size]:
            if name == "sources":
                title, subtitle, href = (
                    row.company_name,
                    row.subject,
                    f"/drug-letters?selected={row.id}",
                )
            elif name == "research":
                title, subtitle, href = row.objective, row.status, f"/research?run={row.id}"
            elif name == "briefs":
                title, subtitle, href = (
                    row.title,
                    "Draft snapshot",
                    f"/saved-work?tab=briefs&brief={row.id}",
                )
            elif name == "views":
                title, subtitle, href = (
                    row.name,
                    row.description,
                    saved_view_href(row),
                )
            else:
                title, subtitle, href = row.title, "Conversation", f"/chat/{row.id}"
            items.append(
                {"id": row.id, "title": title, "subtitle": subtitle, "href": href, "kind": name}
            )
        groups.append({"kind": name, "items": items, "has_more": len(rows) > size})
    return {"groups": groups, "page": page}


@router.get("/workspace/inbox", response_model=InboxPage)
async def inbox(
    response: Response,
    preview: bool = False,
    state: Literal["all", "new", "later", "done", "dismissed"] = "new",
    page: int = Query(default=1, ge=1, le=10000),
    limit: int = Query(default=20, ge=1, le=100),
    principal: Principal = Depends(view_principal),
    session: AsyncSession = Depends(session_dependency),
):
    private(response)
    # Establish the personal horizon once; unresolved events never age out.
    if not preview:
        await admission_lock(session)
    preference = await session.get(WorkspaceInboxPreference, principal.subject)
    starts_at = preference.starts_at if preference else utcnow() - timedelta(days=30)
    if preference is None and not preview:
        preference = WorkspaceInboxPreference(
            owner_id=principal.subject, starts_at=starts_at
        )
        session.add(preference)
        await session.flush()
    effective = func.coalesce(WorkspaceTriage.state, "new")
    base = (
        select(ChangeEvent, WarningLetter, WorkspaceTriage)
        .join(WarningLetter, ChangeEvent.warning_letter_id == WarningLetter.id)
        .outerjoin(
            WorkspaceTriage,
            (WorkspaceTriage.event_id == ChangeEvent.id)
            & (WorkspaceTriage.owner_id == principal.subject),
        )
        .where(*catalog_scope(), ChangeEvent.detected_at >= starts_at)
    )
    counts = dict(
        (
            await session.execute(
                base.with_only_columns(effective, func.count()).group_by(effective)
            )
        ).all()
    )
    query = base if state == "all" else base.where(effective == state)
    rows = (
        await session.execute(
            query.order_by(ChangeEvent.detected_at.desc(), ChangeEvent.id)
            .offset((page - 1) * limit)
            .limit(limit + 1)
        )
    ).all()
    items = [
        {
            "id": event.id,
            "letter_id": letter.id,
            "title": letter.company_name,
            "subtitle": letter.subject,
            "event_type": event.event_type,
            "version_id": event.source_version_id,
            "detected_at": timestamp(event.detected_at),
            "state": triage.state if triage else "new",
            "revision": triage.revision if triage else 0,
            "reason": triage.reason if triage else "",
        }
        for event, letter, triage in rows[:limit]
    ]
    if not preview:
        await session.commit()
    return {
        "items": items,
        "counts": counts,
        "page": page,
        "has_more": len(rows) > limit,
        "starts_at": timestamp(starts_at),
    }


@router.patch("/workspace/inbox/{event_id}", response_model=TriageResult)
async def triage(
    event_id: UUID,
    payload: TriageInput,
    response: Response,
    request: Request,
    principal: Principal = Depends(view_principal),
    session: AsyncSession = Depends(session_dependency),
):
    private(response)
    if payload.state == "dismissed" and len(payload.reason.strip()) < 3:
        raise HTTPException(422, "A dismissal reason is required")
    await admission_lock(session)
    event = await session.scalar(
        select(ChangeEvent)
        .join(WarningLetter)
        .where(ChangeEvent.id == str(event_id), *catalog_scope())
    )
    if event is None:
        raise HTTPException(404, "Source change unavailable")
    item = await session.get(WorkspaceTriage, (principal.subject, str(event_id)))
    if (item.revision if item else 0) != payload.expected_revision:
        raise HTTPException(409, "This item changed. Refresh before trying again.")
    if item is None:
        item = WorkspaceTriage(owner_id=principal.subject, event_id=str(event_id), revision=0)
        session.add(item)
    before = {"state": item.state or "new", "reason": item.reason or "", "revision": item.revision}
    item.state, item.reason = payload.state, payload.reason.strip()
    item.revision += 1
    add_audit_event(
        session,
        principal=principal,
        request_id=request.state.request_id,
        operation="workspace.triage",
        object_type="change_event",
        object_id=str(event_id),
        application_version=request.app.state.settings.app_version,
        before=before,
        after={"state": item.state, "reason": item.reason, "revision": item.revision},
    )
    await session.commit()
    return {
        "id": str(event_id),
        "state": item.state,
        "reason": item.reason,
        "revision": item.revision,
    }


def snapshot_summary(item):
    return {
        "id": item.id,
        "title": item.title,
        "run_id": item.run_id,
        "run_revision": item.run_revision,
        "content_hash": item.content_hash,
        "created_at": timestamp(item.created_at),
    }


@router.post("/research/briefs", status_code=201, response_model=BriefSummary)
async def save_brief(
    payload: SnapshotInput,
    response: Response,
    principal: Principal = Depends(view_principal),
    session: AsyncSession = Depends(session_dependency),
):
    private(response)
    await admission_lock(session)
    run = await owned_run(session, str(payload.run_id), principal.subject, lock=True)
    if run.revision != payload.expected_revision or run.status != "completed" or not run.result:
        raise HTTPException(409, "Only the displayed completed revision can be saved")
    existing = await session.scalar(
        select(ResearchBriefSnapshot).where(
            ResearchBriefSnapshot.owner_id == principal.subject,
            ResearchBriefSnapshot.run_id == run.id,
            ResearchBriefSnapshot.run_revision == run.revision,
        )
    )
    if existing:
        return snapshot_summary(existing)
    sources = run.result.get("sources", [])
    source_ids = {source.get("id") for source in sources}
    if (
        not sources
        or any(not source.get("version_id") or not source.get("source_hash") for source in sources)
        or any(
            citation not in source_ids
            for finding in run.result.get("findings", [])
            for citation in finding.get("citation_ids", [])
        )
    ):
        raise HTTPException(409, "The brief has incomplete evidence bindings")
    snapshot = {
        "objective": run.objective,
        "language": run.language,
        "run_id": run.id,
        "run_revision": run.revision,
        "result": run.result,
        "review_state": "draft",
    }
    digest = hashlib.sha256(
        json.dumps(snapshot, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    ).hexdigest()
    item = ResearchBriefSnapshot(
        owner_id=principal.subject,
        run_id=run.id,
        run_revision=run.revision,
        title=run.result.get("title", run.objective)[:200],
        snapshot=snapshot,
        content_hash=digest,
    )
    session.add(item)
    await session.commit()
    return snapshot_summary(item)


@router.get("/research/briefs", response_model=BriefPage)
async def briefs(
    response: Response,
    page: int = Query(default=1, ge=1, le=10000),
    limit: int = Query(default=20, ge=1, le=100),
    principal: Principal = Depends(view_principal),
    session: AsyncSession = Depends(session_dependency),
):
    private(response)
    rows = (
        await session.scalars(
            select(ResearchBriefSnapshot)
            .where(ResearchBriefSnapshot.owner_id == principal.subject)
            .order_by(ResearchBriefSnapshot.created_at.desc(), ResearchBriefSnapshot.id)
            .offset((page - 1) * limit)
            .limit(limit + 1)
        )
    ).all()
    return {
        "items": [snapshot_summary(row) for row in rows[:limit]],
        "page": page,
        "has_more": len(rows) > limit,
    }


@router.get("/research/briefs/{brief_id}", response_model=BriefDetail)
async def brief(
    brief_id: UUID,
    response: Response,
    principal: Principal = Depends(view_principal),
    session: AsyncSession = Depends(session_dependency),
):
    private(response)
    item = await session.scalar(
        select(ResearchBriefSnapshot).where(
            ResearchBriefSnapshot.id == str(brief_id),
            ResearchBriefSnapshot.owner_id == principal.subject,
        )
    )
    if item is None:
        raise HTTPException(404, "Saved brief unavailable")
    return {**snapshot_summary(item), "snapshot": item.snapshot}


@router.get("/research/briefs/{brief_id}/export")
async def export_brief(
    brief_id: UUID,
    principal: Principal = Depends(view_principal),
    session: AsyncSession = Depends(session_dependency),
):
    result = await brief(brief_id, Response(), principal, session)
    return Response(
        json.dumps(jsonable_encoder(result), ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={
            "Cache-Control": "private, no-store",
            "Content-Disposition": f'attachment; filename="research-brief-{brief_id}.json"',
        },
    )
