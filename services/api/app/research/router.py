from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import defer

from app.dependencies import session_dependency
from app.models import ResearchRun
from app.pagination import InvalidCursor, decode_cursor, encode_cursor
from app.security.auth import Principal, rag_principal

from .schemas import CreateResearch
from .service import control_run, create_run, detail, owned_run, summary

router = APIRouter(prefix="/research/runs", tags=["FDA Research"])


def private(response: Response):
    response.headers["Cache-Control"] = "private, no-store"


@router.post("", status_code=201)
async def create_research(
    payload: CreateResearch,
    request: Request,
    response: Response,
    principal: Principal = Depends(rag_principal),
    session: AsyncSession = Depends(session_dependency),
):
    private(response)
    if not request.app.state.settings.research_agent_enabled:
        raise HTTPException(503, "FDA research is not available yet")
    if request.app.state.research_model is None:
        raise HTTPException(503, "Research AI is unavailable; try again later")
    run = await create_run(session, principal.subject, payload)
    return await detail(session, run)


@router.get("")
async def list_research(
    response: Response,
    q: str = Query(default="", max_length=500),
    status: Literal["all", "active", "completed", "attention"] = "all",
    cursor: str | None = Query(default=None, max_length=2048),
    limit: int = Query(default=30, ge=1, le=100),
    principal: Principal = Depends(rag_principal),
    session: AsyncSession = Depends(session_dependency),
):
    private(response)
    try:
        offset = decode_cursor(cursor)
    except InvalidCursor as exc:
        raise HTTPException(400, str(exc)) from exc
    conditions = [ResearchRun.owner_id == principal.subject]
    if q.strip():
        escaped = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        conditions.append(ResearchRun.objective.ilike(f"%{escaped}%", escape="\\"))
    if status != "all":
        states = {
            "active": ["queued", "running"],
            "completed": ["completed"],
            "attention": ["failed", "stopped", "limit_reached", "insufficient_evidence"],
        }
        conditions.append(ResearchRun.status.in_(states[status]))
    runs = (
        await session.scalars(
            select(ResearchRun)
            .where(*conditions)
            .options(defer(ResearchRun.checkpoint), defer(ResearchRun.result))
            .order_by(ResearchRun.updated_at.desc(), ResearchRun.id)
            .offset(offset)
            .limit(limit + 1)
        )
    ).all()
    return {
        "items": [summary(run) for run in runs[:limit]],
        "has_more": len(runs) > limit,
        "next_cursor": encode_cursor(offset + limit) if len(runs) > limit else None,
    }


@router.get("/context")
async def search_context(
    request: Request,
    response: Response,
    q: str = Query(min_length=2, max_length=180),
    principal: Principal = Depends(rag_principal),
):
    from .tools import search_sources

    private(response)
    return {"items": await search_sources(request.app.state.database, q)}


@router.get("/{run_id}")
async def get_research(
    run_id: UUID,
    response: Response,
    after: int = Query(default=0, ge=0, le=10_000),
    principal: Principal = Depends(rag_principal),
    session: AsyncSession = Depends(session_dependency),
):
    private(response)
    return await detail(session, await owned_run(session, str(run_id), principal.subject), after)


@router.post("/{run_id}/{action}")
async def control_research(
    run_id: UUID,
    action: str,
    request: Request,
    response: Response,
    principal: Principal = Depends(rag_principal),
    session: AsyncSession = Depends(session_dependency),
):
    private(response)
    if action not in {"stop", "resume"}:
        raise HTTPException(404, "Unknown research action")
    if action == "resume" and (
        not request.app.state.settings.research_agent_enabled
        or request.app.state.research_model is None
    ):
        raise HTTPException(503, "Research AI is unavailable; try again later")
    run = await control_run(session, str(run_id), principal.subject, action)
    return await detail(session, run)
