"""Failure probes for the actual research loop and its five native tools."""

import asyncio
import json

import httpx
import pytest
from pydantic import SecretStr
from test_research_agent import (  # noqa: F401
    ScriptedModel,
    create,
    execute,
    get,
    proposal,
    research,
)

from app.ai import AiGenerationError
from app.models import ResearchRun
from app.research import worker
from app.research.provider import OpenAIResearchModel, ResearchModelError
from app.research.schemas import EvidenceCheck
from app.research.tools import read_sources, search_sources, source_query
from app.research.worker import claim, execute_tool


def test_topic_passage_outranks_warning_letter_boilerplate(research):  # noqa: F811
    client, _, database = research

    async def check():
        async with database.session_factory() as session:
            rows = (await session.execute(source_query().limit(2))).all()
            assert len(rows) == 2
            rows[0][0].content = "FDA warning letter drug site gov data company introduction."
            topic = ("Background detail. " * 40) + "Data integrity: records were deleted."
            rows[1][0].content = topic
            rows[0][0].acl = rows[1][0].acl = {"roles": ["viewer"]}
            ids = [row[0].id for row in rows]
            await session.commit()
        matches = await search_sources(
            database, "data integrity warning letter FDA drug site: fda.gov", ids
        )
        assert matches[0]["chunk_id"] == ids[1]
        assert "Data integrity: records were deleted" in matches[0]["excerpt"]
        assert matches[0]["start_offset"] > 0
        assert topic[matches[0]["start_offset"]:matches[0]["end_offset"]] == matches[0]["excerpt"]
        # Boilerplate alone cannot manufacture topic evidence.
        assert await search_sources(database, "FDA warning letter drug site gov", ids) == []

    client.portal.call(check)


def test_supported_but_off_topic_draft_cannot_complete(research):  # noqa: F811
    objective = "Compare two data integrity findings"
    run, _ = create(research, objective=objective)

    class OffTopicModel(ScriptedModel):
        async def verify(self, brief, evidence, language, original_objective):
            assert original_objective == objective
            self.checks += 1
            return EvidenceCheck(supported=True, answers_objective=False, issues=[]), 100

    model = OffTopicModel()
    execute(research, model)
    result = get(research, run["id"])
    assert result["status"] == "insufficient_evidence"
    assert model.checks == 2
    assert result["result"].get("evidence_check") != "ai_checked"
    assert "completed" not in [event["kind"] for event in result["events"]]
    revision = next(event for event in result["events"] if event["kind"] == "check_needs_revision")
    assert "requested topic" in revision["data"]["issues"][0]


@pytest.mark.asyncio
@pytest.mark.parametrize("output", [[None], ["not-an-item"], {"type": "function_call"}])
async def test_malformed_provider_items_are_safe_failures(settings, output):
    settings.openai_api_key = SecretStr("fixture-key")
    model = OpenAIResearchModel(
        settings,
        transport=httpx.MockTransport(
            lambda _: httpx.Response(200, json={"status": "completed", "output": output})
        ),
    )
    with pytest.raises(AiGenerationError):
        await model.propose([], 5)


def test_reread_does_not_return_a_disappeared_retained_source(research, monkeypatch):  # noqa: F811
    client, _, database = research
    create(research)

    async def check():
        run = await claim(database)
        matches = await search_sources(database, "validation")
        source = (await read_sources(database, [matches[0]["chunk_id"]]))[0]
        source["id"] = "S1"
        state = {"plan": ["Search", "Read"], "candidates": matches, "evidence": [source]}

        async def missing(*_):
            return []

        monkeypatch.setattr("app.research.worker.read_sources", missing)
        result, terminal = await execute_tool(
            database,
            ScriptedModel(),
            run,
            state,
            proposal("read_sources", {"chunk_ids": [source["chunk_id"]]}),
        )
        assert result.get("error") == "source_unavailable"
        assert not result["sources"] and not state["evidence"]
        assert terminal is None
        assert "excerpt" not in json.dumps(result)

    client.portal.call(check)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "status,code,retryable",
    [
        (429, "rate_limit_exceeded", True),
        (503, "server_error", True),
        (401, "invalid_api_key", False),
        (400, "invalid_request", False),
        (429, "insufficient_quota", False),
        (429, "credit_balance_exhausted", False),
        (429, "project_spend_limit_exceeded", False),
    ],
)
async def test_provider_classifies_failures_without_echoing_private_payload(
    settings,
    status,
    code,
    retryable,
):
    settings.openai_api_key = SecretStr("fixture-key")
    model = OpenAIResearchModel(
        settings,
        transport=httpx.MockTransport(
            lambda _: httpx.Response(
                status,
                headers={"Retry-After": "2"},
                json={
                    "error": {"code": code, "message": "private-provider-payload"},
                },
            )
        ),
    )
    with pytest.raises(ResearchModelError) as captured:
        await model.propose([], 5)
    assert captured.value.retryable is retryable
    assert captured.value.retry_after == 2
    assert "private-provider" not in str(captured.value)


@pytest.mark.asyncio
@pytest.mark.parametrize("arguments", ['{"steps":', "[]", "null", '"bad"'])
async def test_identified_malformed_call_gets_one_corrective_observation(settings, arguments):
    settings.openai_api_key = SecretStr("fixture-key")
    model = OpenAIResearchModel(
        settings,
        transport=httpx.MockTransport(
            lambda _: httpx.Response(
                200,
                json={
                    "status": "completed",
                    "usage": {"total_tokens": "invalid"},
                    "output": [
                        {
                            "type": "function_call",
                            "call_id": "call-1",
                            "name": "plan_research",
                            "arguments": arguments,
                        }
                    ],
                },
            )
        ),
    )
    action = await model.propose([], 5)
    result, terminal = await execute_tool(None, None, None, {}, action)
    assert action.call_id == "call-1" and action.tokens == 0
    assert result["error"] == "invalid_arguments" and terminal is None


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "tool",
    ["plan_research", "search_sources", "read_sources", "submit_brief", "report_no_evidence"],
)
async def test_every_research_tool_rejects_extra_fields_before_execution(tool):
    result, terminal = await execute_tool(
        None,
        None,
        None,
        {},
        proposal(tool, {"owner_id": "spoofed", "url": "https://bad"}),
    )
    assert result["error"] == "invalid_arguments" and terminal is None
    assert "spoofed" not in json.dumps(result)


@pytest.mark.parametrize("phase", ["propose", "verify"])
def test_transient_model_error_recovers_with_metered_retry(research, phase):  # noqa: F811
    class Flaky(ScriptedModel):
        failed = False

        async def propose(self, conversation, remaining):
            if phase == "propose" and not self.failed:
                self.failed = True
                raise ResearchModelError(retryable=True, retry_after=0)
            return await super().propose(conversation, remaining)

        async def verify(self, *args):
            if phase == "verify" and not self.failed:
                self.failed = True
                raise ResearchModelError(retryable=True, retry_after=0)
            return await super().verify(*args)

    run, _ = create(research)
    execute(research, Flaky())
    result = get(research, run["id"])
    assert result["status"] == "completed"
    assert result["model_calls"] == 6
    assert sum(e["kind"] == "model_retry" for e in result["events"]) == 1


@pytest.mark.parametrize("retryable,delay,expected", [(True, 0, 2), (False, 0, 1), (True, 120, 1)])
def test_model_retries_stop_and_honor_long_retry_after(research, retryable, delay, expected):  # noqa: F811
    class Down(ScriptedModel):
        async def propose(self, *_):
            raise ResearchModelError("model_rate_limited", retryable=retryable, retry_after=delay)

    run, _ = create(research)
    execute(research, Down())
    result = get(research, run["id"])
    assert result["status"] == "failed"
    assert result["error_code"] == "model_rate_limited"
    assert result["model_calls"] == expected


def test_read_timeout_is_bounded_and_has_a_saved_tool_result(research, monkeypatch):  # noqa: F811
    calls = 0

    async def slow(*_):
        nonlocal calls
        calls += 1
        await asyncio.sleep(10)

    monkeypatch.setattr(worker, "search_sources", slow)
    monkeypatch.setattr(worker, "SOURCE_TIMEOUT_SECONDS", 0.01)
    run, _ = create(research)
    execute(research)
    result = get(research, run["id"])
    assert calls == 2 and result["status"] == "failed"
    assert result["error_code"] == "tool_timeout"
    client, _, database = research

    async def checkpoint():
        async with database.session_factory() as session:
            return (await session.get(ResearchRun, run["id"])).checkpoint

    saved = client.portal.call(checkpoint)
    last = saved["conversation"][-1]
    assert last["type"] == "function_call_output"
    assert json.loads(last["output"])["error"] == "tool_timeout"
    assert "pending_action" not in saved


def test_expired_slice_resumes_pending_tool_without_another_planning_call(research, monkeypatch):  # noqa: F811
    run, _ = create(research)
    model = ScriptedModel()
    original = worker.execute_tool

    async def interrupted(*_):
        await asyncio.sleep(10)

    monkeypatch.setattr(worker, "execute_tool", interrupted)
    client, _, database = research
    client.portal.call(
        lambda: worker.run_research_slice(
            database,
            client.app.state.settings,
            model=model,
            slice_seconds=0.2,
        )
    )
    assert get(research, run["id"])["status"] == "queued"
    assert model.calls == 1
    monkeypatch.setattr(worker, "execute_tool", original)
    execute(research, model)
    result = get(research, run["id"])
    assert result["status"] == "completed" and model.calls == 4
    assert result["model_calls"] == 5


def test_no_evidence_tool_finishes_after_alternative_searches(research):  # noqa: F811
    class Empty(ScriptedModel):
        async def propose(self, conversation, remaining):
            outputs = [x for x in conversation if x.get("type") == "function_call_output"]
            calls = [
                ("plan_research", {"steps": ["Search evidence", "Check alternatives"]}),
                ("search_sources", {"query": "zznonexistentalpha"}),
                ("search_sources", {"query": "zznonexistentbeta"}),
                ("report_no_evidence", {"explanation": "No saved passages match either search."}),
            ]
            return proposal(*calls[len(outputs)])

    run, _ = create(research)
    execute(research, Empty())
    result = get(research, run["id"])
    assert result["status"] == "insufficient_evidence"
    assert result["result"]["explanation"] and not result["sources"]


def test_unexpected_tool_failure_is_saved_and_does_not_expose_exception(research, monkeypatch):  # noqa: F811
    async def broken(*_):
        raise RuntimeError("private-connection-string")

    monkeypatch.setattr(worker, "search_sources", broken)
    run, _ = create(research)
    execute(research)
    result = get(research, run["id"])
    assert result["status"] == "failed" and result["error_code"] == "tool_failed"
    assert "private-connection-string" not in json.dumps(result)


def test_model_retry_checks_stop_before_spending_again(research, monkeypatch):  # noqa: F811
    client, headers, _ = research
    run, _ = create(research)
    original = worker.event

    async def stop_on_retry(database, claimed, kind, **kwargs):
        await original(database, claimed, kind, **kwargs)
        if kind == "model_retry":
            client.post(f"/api/v1/research/runs/{run['id']}/stop", headers=headers)

    class Down(ScriptedModel):
        async def propose(self, *_):
            self.calls += 1
            raise ResearchModelError(retryable=True, retry_after=0)

    model = Down()
    monkeypatch.setattr(worker, "event", stop_on_retry)
    execute(research, model)
    assert get(research, run["id"])["status"] == "stopped"
    assert model.calls == 1


def test_reported_usage_over_reservation_is_counted_before_any_tool_executes(research):  # noqa: F811
    class Overspent(ScriptedModel):
        async def propose(self, *args):
            action = await super().propose(*args)
            action.tokens = worker.MAX_TOTAL_TOKENS + 1
            return action

    run, _ = create(research)
    execute(research, Overspent())
    result = get(research, run["id"])
    assert result["status"] == "limit_reached" and not result["plan"]
    client, _, database = research

    async def tokens():
        async with database.session_factory() as session:
            return (await session.get(ResearchRun, run["id"])).total_tokens

    assert client.portal.call(tokens) == worker.MAX_TOTAL_TOKENS + 1
    assert not result["can_resume"]


def test_verifier_budget_stop_still_records_the_tool_observation(research, monkeypatch):  # noqa: F811
    from unittest.mock import AsyncMock

    class Exhausted(ScriptedModel):
        async def propose(self, *args):
            action = await super().propose(*args)
            if action.name == "submit_brief":
                monkeypatch.setattr(worker, "reserve", AsyncMock(side_effect=worker.BudgetReached))
            return action

    run, _ = create(research)
    execute(research, Exhausted())
    assert get(research, run["id"])["status"] == "limit_reached"
    client, _, database = research

    async def checkpoint():
        async with database.session_factory() as session:
            return (await session.get(ResearchRun, run["id"])).checkpoint

    saved = client.portal.call(checkpoint)
    assert "pending_action" not in saved
    observation = saved["conversation"][-1]
    assert observation["type"] == "function_call_output"
    assert json.loads(observation["output"])["error"] == "execution_budget"
