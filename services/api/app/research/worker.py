from __future__ import annotations

import asyncio
import copy
import hashlib
import json
import re
from dataclasses import asdict
from datetime import timedelta
from random import uniform

from pydantic import ValidationError
from sqlalchemy import or_, select
from sqlalchemy.exc import OperationalError

from app.ai import AiGenerationError
from app.models import ResearchRun, new_uuid, utcnow

from .provider import ResearchModelError, ToolProposal, build_research_model
from .schemas import (
    MAX_ACTION_FAILURES,
    MAX_EVIDENCE,
    MAX_MODEL_CALLS,
    MAX_TOTAL_TOKENS,
    TOOL_MODELS,
)
from .service import add_event
from .tools import evidence_is_current, read_sources, search_sources

MODEL_TIMEOUT_SECONDS = 60
SOURCE_TIMEOUT_SECONDS = 10
MAX_RETRY_DELAY_SECONDS = 5


class LeaseLost(Exception):
    pass


class BudgetReached(Exception):
    pass


class SourceTimeout(Exception):
    pass


async def mutate(database, run_id, lease_id, operation):
    async with database.session_factory() as session:
        run = await session.scalar(
            select(ResearchRun)
            .where(
                ResearchRun.id == run_id,
            )
            .with_for_update()
        )
        if not run or run.status != "running" or run.lease_id != lease_id:
            raise LeaseLost()
        operation(session, run)
        run.updated_at = utcnow()
        await session.commit()


async def claim(database):
    async with database.session_factory() as session:
        run = await session.scalar(
            select(ResearchRun)
            .where(
                or_(
                    ResearchRun.status == "queued",
                    (ResearchRun.status == "running") & (ResearchRun.lease_expires_at < utcnow()),
                )
            )
            .order_by(ResearchRun.created_at, ResearchRun.id)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if not run:
            return None
        recovered = run.status == "running"
        run.status = "running"
        run.lease_id = new_uuid()
        run.lease_expires_at = utcnow() + timedelta(seconds=150)
        run.started_at = run.started_at or utcnow()
        add_event(session, run, "recovered" if recovered else "started")
        await session.commit()
        return run


async def event(database, run, kind, *, stage=None, data=None):
    await mutate(
        database,
        run.id,
        run.lease_id,
        lambda session, current: add_event(session, current, kind, data, stage),
    )


async def reserve(database, run, input_value, max_output=4_000):
    # UTF-8 bytes bound input tokens conservatively. Reserve before the network
    # call so a terminated worker cannot repeatedly spend unaccounted model calls.
    allowance = len(json.dumps(input_value, ensure_ascii=False).encode()) + max_output + 3_000

    def update(_session, current):
        if (
            current.model_calls >= MAX_MODEL_CALLS
            or current.total_tokens + allowance > MAX_TOTAL_TOKENS
        ):
            raise BudgetReached()
        current.model_calls += 1
        current.total_tokens += allowance
        current.lease_expires_at = utcnow() + timedelta(seconds=150)
        run.model_calls = current.model_calls

    await mutate(database, run.id, run.lease_id, update)
    return allowance


async def record_usage(database, run, allowance, tokens):
    def update(_session, current):
        # Missing/invalid usage leaves the conservative reservation in place.
        if type(tokens) is int and tokens > 0:
            current.total_tokens -= allowance - tokens
        run.total_tokens = current.total_tokens

    await mutate(database, run.id, run.lease_id, update)
    # Commit actual consumption before stopping; rolling back an overrun would
    # undercount the very request that exhausted the budget.
    if run.total_tokens > MAX_TOTAL_TOKENS:
        raise BudgetReached()


async def model_call(database, run, input_value, operation, *, max_output=4_000):
    """Each attempted provider call reserves budget and checks the active lease."""
    for attempt in range(2):
        allowance = await reserve(database, run, input_value, max_output)
        try:
            async with asyncio.timeout(MODEL_TIMEOUT_SECONDS):
                value = await operation()
        except TimeoutError:
            error = ResearchModelError(retryable=True)
        except ResearchModelError as exc:
            error = exc
        else:
            tokens = value.tokens if isinstance(value, ToolProposal) else value[1]
            await record_usage(database, run, allowance, tokens)
            return value
        delay = error.retry_after if error.retry_after is not None else uniform(0.5, 1.0)
        if not error.retryable or attempt or delay > MAX_RETRY_DELAY_SECONDS:
            raise error
        await event(database, run, "model_retry", data={"code": error.code, "attempt": 2})
        await asyncio.sleep(delay)


async def source_call(operation, *args):
    try:
        async with asyncio.timeout(SOURCE_TIMEOUT_SECONDS):
            return await operation(*args)
    except TimeoutError:
        raise SourceTimeout() from None


def finish_values(session, current, status, code=None, result=None):
    current.status = status
    current.error_code = code
    current.result = result
    current.finished_at = utcnow()
    current.lease_id = None
    current.lease_expires_at = None
    add_event(
        session,
        current,
        status,
        {"code": code} if code else {},
        "complete" if status == "completed" else None,
    )


async def finish(database, run, status, code=None, result=None):
    await mutate(
        database,
        run.id,
        run.lease_id,
        lambda session, current: finish_values(session, current, status, code, result),
    )


async def execute_tool(database, model, run, state, proposal):
    """Keep failed attempts out of working state; only reads may auto-retry."""
    attempts = 2 if proposal.name in {"search_sources", "read_sources"} else 1
    for attempt in range(attempts):
        working = copy.deepcopy(state)
        try:
            result = await _execute_tool(database, model, run, working, proposal)
        except (SourceTimeout, OperationalError) as exc:
            code = "tool_timeout" if isinstance(exc, SourceTimeout) else "source_unavailable"
            if attempt + 1 < attempts:
                await event(database, run, "tool_retry", data={"tool": proposal.name, "code": code})
                await asyncio.sleep(0.25)
                continue
            return {
                "error": code,
                "next": "Retry this task when the source service recovers.",
            }, "failed"
        except ResearchModelError as exc:
            return {
                "error": exc.code,
                "next": "Resume this task when generation is available.",
            }, "failed"
        except AiGenerationError:
            return {"error": "model_unavailable"}, "failed"
        except BudgetReached:
            return {"error": "execution_budget"}, "limit_reached"
        except LeaseLost:
            raise
        except Exception:
            # Never turn an implementation failure into a success or leak its text.
            return {
                "error": "tool_failed",
                "next": "Resume the task or inspect its run trace.",
            }, "failed"
        state.clear()
        state.update(working)
        return result


async def _execute_tool(database, model, run, state, proposal):
    context = state.get("context") or {}
    selected_ids = context.get("selected_chunk_ids") or []
    if selected_ids and not await source_call(evidence_is_current, database, context["sources"]):
        return {"error": "selected_context_changed"}, "insufficient_evidence"
    name = proposal.name
    validator = TOOL_MODELS.get(name)
    if not validator:
        return {"error": "unknown_tool"}, None
    try:
        args = validator.model_validate(proposal.arguments)
    except ValidationError as exc:
        return {
            "error": "invalid_arguments",
            "instruction": "Correct these fields and call the tool again.",
            # Give actionable field bounds, without copying untrusted argument values.
            "issues": [
                {"field": ".".join(str(part) for part in issue["loc"]), "message": issue["msg"]}
                for issue in exc.errors(include_input=False, include_url=False)[:5]
            ],
        }, None
    if name != "plan_research" and not state.get("plan"):
        return {"error": "plan_required"}, None

    if name == "plan_research":
        if state.get("plan"):
            return {"error": "plan_already_saved"}, None
        if run.language == "ko" and any(not re.search(r"[가-힣]", step) for step in args.steps):
            return {
                "error": "plan_language_mismatch",
                "instruction": "Call plan_research again with every action step written in Korean.",
            }, None
        state["plan"] = args.steps
        await event(database, run, "plan_saved", stage="planning", data={"steps": args.steps})
        return {"saved": True, "next": "Search the saved sources."}, None

    if name == "search_sources":
        if state.get("searches", 0) >= 4:
            return {
                "error": "search_limit",
                "next": "Use retained results or report no evidence.",
            }, None
        await event(database, run, "search_started", stage="searching", data={"query": args.query})
        found = await source_call(search_sources, database, args.query, selected_ids)
        state["searches"] = state.get("searches", 0) + 1
        candidates = {item["chunk_id"]: item for item in state.get("candidates", [])}
        candidates.update({item["chunk_id"]: item for item in found})
        state["candidates"] = list(candidates.values())[:32]
        await event(
            database, run, "search_completed", data={"query": args.query, "count": len(found)}
        )
        return {"matches": found, "note": "Read selected chunk IDs before citing them."}, None

    if name == "read_sources":
        ids = list(dict.fromkeys(str(value) for value in args.chunk_ids))
        if selected_ids and not set(ids).issubset(selected_ids):
            return {"error": "outside_selected_context"}, None
        allowed = {item["chunk_id"] for item in state.get("candidates", [])}
        if not set(ids).issubset(allowed):
            return {"error": "source_not_in_search_results"}, None
        retained = {item["chunk_id"]: item for item in state.get("evidence", [])}
        if len(set(retained) | set(ids)) > MAX_EVIDENCE:
            return {"error": "source_limit", "next": "Write using the retained evidence."}, None
        await event(database, run, "read_started", stage="reading", data={"count": len(ids)})
        records = await source_call(read_sources, database, ids)
        returned = {item["chunk_id"] for item in records}
        missing = set(ids) - returned
        # Revoked/deleted passages must never survive a fresh read as cached success.
        # Reserve IDs monotonically so removing S1 cannot relabel S2 or reuse S1.
        next_id = max(
            [state.get("next_source_id", 1)]
            + [int(item["id"][1:]) + 1 for item in retained.values()]
        )
        for key in missing:
            retained.pop(key, None)
        for item in records:
            if item["chunk_id"] in retained:
                item["id"] = retained[item["chunk_id"]]["id"]
            else:
                item["id"] = f"S{next_id}"
                next_id += 1
            retained[item["chunk_id"]] = item
        state["evidence"] = list(retained.values())
        state["next_source_id"] = next_id
        state["candidates"] = [
            item for item in state.get("candidates", []) if item["chunk_id"] not in missing
        ]
        selected = [retained[key] for key in ids if key in retained]
        await event(
            database,
            run,
            "read_completed",
            data={
                "count": len(selected),
                "sources": [
                    {key: item[key] for key in ("id", "company", "letter_id", "anchor")}
                    for item in selected
                ],
            },
        )
        if missing:
            return {
                "error": "source_unavailable",
                "sources": selected,
                "missing_chunk_ids": sorted(missing),
                "next": "Search again for accessible sources; do not cite missing passages.",
            }, None
        return {"sources": selected}, None

    if name == "report_no_evidence":
        if state.get("searches", 0) < 2:
            return {"error": "try_an_alternative_search_first"}, None
        return {"explanation": args.explanation}, "insufficient_evidence"

    evidence = state.get("evidence", [])
    cited_ids = {value for finding in args.findings for value in finding.citation_ids}
    sources = [item for item in evidence if item["id"] in cited_ids]
    if not evidence or cited_ids != {item["id"] for item in sources}:
        return {"error": "invalid_citations", "allowed_ids": [s["id"] for s in evidence]}, None
    if state.get("checks", 0) >= 2:
        return {"error": "evidence_check_limit"}, "insufficient_evidence"
    await event(database, run, "draft_prepared", stage="writing", data={"title": args.title})
    await event(database, run, "check_started", stage="checking", data={"count": len(cited_ids)})
    if not await source_call(evidence_is_current, database, sources):
        return {"error": "source_changed", "next": "Read the source again before writing."}, None
    brief = args.model_dump(mode="json")
    check, _ = await model_call(
        database,
        run,
        {"objective": run.objective, "brief": brief, "evidence": sources},
        lambda: model.verify(brief, sources, run.language, run.objective),
        max_output=3_000,
    )
    state["checks"] = state.get("checks", 0) + 1
    if not check.supported or not check.answers_objective or check.issues:
        if not check.answers_objective and not check.issues:
            check.issues = [
                "요청한 주제를 뒷받침하는 자료를 다시 검색하고 읽은 뒤 비교해 주세요."
                if run.language == "ko"
                else "Search and read sources about the requested topic before comparing findings."
            ]
        await event(database, run, "check_needs_revision", data={"issues": check.issues[:8]})
        return {"error": "revise_unsupported_findings", "issues": check.issues[:8]}, None
    # Source changes during verification also invalidate completion.
    if not await source_call(evidence_is_current, database, sources):
        return {"error": "source_changed", "next": "Read the source again."}, None
    await event(database, run, "check_completed", data={"count": len(cited_ids)})
    return {
        **brief,
        "schema_version": 2,
        "sources": sources,
        "evidence_check": "ai_checked",
        "intended_use": "human_review_draft",
    }, "completed"


async def execute_run(database, model, run):
    state = copy.deepcopy(run.checkpoint or {})
    conversation = state.setdefault(
        "conversation",
        [
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "objective": run.objective,
                        "language": run.language,
                        "scope": "Saved FDA Drug warning letters; prepare a human review draft.",
                        "selected_context": state.get("context"),
                    },
                    ensure_ascii=False,
                ),
            }
        ],
    )
    while True:
        context = state.get("context") or {}
        if (
            not state.get("pending_action")
            and context.get("selected_chunk_ids")
            and not await source_call(evidence_is_current, database, context["sources"])
        ):
            await finish(database, run, "insufficient_evidence", "selected_context_changed")
            return
        pending = state.get("pending_action")
        if pending:
            proposal = ToolProposal(**pending)
        else:
            await event(database, run, "choosing_action")
            proposal = await model_call(
                database,
                run,
                conversation,
                lambda conversation=conversation: model.propose(
                    conversation,
                    MAX_MODEL_CALLS - run.model_calls,
                ),
            )
            state["pending_action"] = asdict(proposal)
            await mutate(
                database,
                run.id,
                run.lease_id,
                lambda _session, current: setattr(current, "checkpoint", copy.deepcopy(state)),
            )
        observation, terminal = await execute_tool(database, model, run, state, proposal)
        # Preserve native call IDs and encrypted reasoning for Responses replay.
        # This private checkpoint is never included in the browser response.
        conversation = state["conversation"]
        conversation.extend(proposal.output)
        conversation.append(
            {
                "type": "function_call_output",
                "call_id": proposal.call_id,
                "output": json.dumps(observation, ensure_ascii=False),
            }
        )
        state.pop("pending_action", None)
        code = observation.get("error")
        if code:
            fingerprint = hashlib.sha256(
                json.dumps(
                    [proposal.name, proposal.arguments, code],
                    sort_keys=True,
                ).encode()
            ).hexdigest()
            repeated = state.get("last_error") == fingerprint
            state["action_failures"] = state.get("action_failures", 0) + 1 if repeated else 1
            state["last_error"] = fingerprint
            if not terminal and state["action_failures"] >= MAX_ACTION_FAILURES:
                terminal, code = "limit_reached", "repeated_tool_failure"
        else:
            state["action_failures"] = 0
            state.pop("last_error", None)

        def save(
            session,
            current,
            observation=observation,
            proposal=proposal,
            terminal=terminal,
            code=code,
        ):
            current.checkpoint = copy.deepcopy(state)
            add_event(
                session,
                current,
                "tool_completed",
                {
                    "tool": proposal.name if proposal.name in TOOL_MODELS else "unknown",
                    "status": "error" if "error" in observation else "success",
                    "code": observation.get("error"),
                },
            )
            if "error" in observation:
                add_event(
                    session,
                    current,
                    "action_needs_revision",
                    {
                        "code": observation["error"],
                    },
                )
            if terminal:
                finish_values(
                    session,
                    current,
                    terminal,
                    code,
                    observation if terminal in {"completed", "insufficient_evidence"} else None,
                )

        await mutate(database, run.id, run.lease_id, save)
        if terminal:
            return


async def run_research_slice(database, settings, *, model=None, slice_seconds=195):
    if not settings.research_agent_enabled:
        return {"processed": 0, "disabled": True}
    model = model or build_research_model(settings)
    if model is None:
        return {"processed": 0, "unavailable": True}
    run = await claim(database)
    if run is None:
        return {"processed": 0}
    try:
        async with asyncio.timeout(slice_seconds):
            await execute_run(database, model, run)
    except LeaseLost:
        return {"processed": 1, "stopped_or_reclaimed": True}
    except BudgetReached:
        try:
            await finish(database, run, "limit_reached", "execution_budget")
        except LeaseLost:
            pass
    except (AiGenerationError, ValueError, TypeError, KeyError) as exc:
        try:
            await finish(database, run, "failed", getattr(exc, "code", "model_unavailable"))
        except LeaseLost:
            pass
    except (OperationalError, SourceTimeout):
        try:
            await finish(database, run, "failed", "source_unavailable")
        except LeaseLost:
            pass
    except TimeoutError:

        def release(session, current):
            current.status = "queued"
            current.lease_id = None
            current.lease_expires_at = None
            add_event(session, current, "checkpoint_saved")

        try:
            await mutate(database, run.id, run.lease_id, release)
        except LeaseLost:
            pass
    return {"processed": 1}
