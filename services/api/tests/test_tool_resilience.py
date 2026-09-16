"""Private tool contract, replay, and resource-boundary failure probes."""

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import func, select
from test_controlled_integrations import ANALYST, REVIEWER, _case, _key

from app.agent_platform.mcp.knowledge.context import KnowledgeInvocationContext
from app.agent_platform.mcp.knowledge.gateway import (
    ARGUMENT_MODELS as KNOWLEDGE_TOOLS,
)
from app.agent_platform.mcp.knowledge.gateway import (
    GatewayDenied,
    KnowledgeMcpGateway,
)
from app.agent_platform.mcp.knowledge.schemas import KnowledgeData, KnowledgeSuccess
from app.agent_platform.mcp.regulatory.gateway import ARGUMENT_MODELS as REGULATORY_TOOLS
from app.agent_platform.mcp.result_validation import bounded_result
from app.agent_platform.mcp.workflow.gateway import (
    ARGUMENT_MODELS as WORKFLOW_TOOLS,
)
from app.agent_platform.mcp.workflow.gateway import (
    WorkflowMcpGateway,
)
from app.cases.hashing import canonical_sha256
from app.internal_knowledge.retrieval import KnowledgeRepository
from app.models import AgentVersion, IntegrationOutbox, NotificationDelivery, ToolVersion
from app.security.auth import Principal
from app.worker import process_next_job


@pytest.mark.parametrize(
    "name,model",
    list(
        {
            **KNOWLEDGE_TOOLS,
            **REGULATORY_TOOLS,
            **WORKFLOW_TOOLS,
        }.items()
    ),
)
def test_all_private_tool_inputs_reject_runtime_identity_and_extra_arguments(name, model):
    with pytest.raises(ValidationError):
        model.model_validate({"user_id": "spoofed", "run_id": str(uuid4()), "command": "send"})


def knowledge_result():
    return KnowledgeSuccess(
        request_id=uuid4(),
        tool_name="knowledge.search_assets",
        data=KnowledgeData(resource_type="SEARCH_RESULTS", records=[]),
        provenance=[],
        warnings=[],
    ).model_dump(mode="json")


def test_knowledge_warning_and_anchor_bounds_match_the_published_contract():
    result = knowledge_result()
    result["warnings"] = ["x" * 501]
    with pytest.raises(ValidationError):
        KnowledgeSuccess.model_validate(result)
    result["warnings"] = []
    result["provenance"] = [
        {"source_version_id": str(uuid4()), "source_hash": "a" * 64, "anchor_id": "x" * 257}
    ]
    with pytest.raises(ValidationError):
        KnowledgeSuccess.model_validate(result)


@pytest.mark.parametrize("failure", ["oversize", "wrong_tool", "wrong_version", "tampered"])
def test_private_results_reject_overflow_identity_and_integrity_errors(failure):
    result = knowledge_result()
    expected = canonical_sha256(result)
    if failure == "oversize":
        result["warnings"] = ["x" * 40_001]
    elif failure == "wrong_tool":
        result["tool_name"] = "knowledge.get_asset"
    elif failure == "wrong_version":
        result["tool_version"] = "2.0.0"
    else:
        result["warnings"] = ["changed after recording"]
    with pytest.raises(ValueError):
        bounded_result(result, "knowledge.search_assets", 40_000, expected_hash=expected)


@pytest.mark.asyncio
@pytest.mark.parametrize("family", ["knowledge", "workflow"])
@pytest.mark.parametrize("failure", ["corrupted_hash", "different_actor"])
async def test_gateway_does_not_release_corrupt_or_cross_actor_replay(family, failure):
    tool = "knowledge.search_assets" if family == "knowledge" else "workflow.create_email_draft"
    arguments = (
        {"query": "audit", "limit": 10, "include_obsolete": False}
        if family == "knowledge"
        else {
            "destination": "qa@example.invalid",
            "title": "Review draft",
            "body": "Please review this draft manually.",
        }
    )
    context = SimpleNamespace(
        principal=Principal("owner", frozenset({"analyst"})),
        agent_name="test-agent",
        agent_version="1.0.0",
        runtime_service="pharma-agent-runtime",
        idempotency_key="key",
    )
    replay = SimpleNamespace(
        arguments_sha256=canonical_sha256(arguments),
        tool_name=tool,
        principal_subject="other" if failure == "different_actor" else "owner",
        agent_name=context.agent_name,
        agent_version=context.agent_version,
        runtime_service=context.runtime_service,
        structured_result={
            "tool_name": tool,
            "tool_version": "1.0.0",
            "private": "must-not-escape",
        },
        result_sha256="0" * 64,
    )
    session = SimpleNamespace(scalar=AsyncMock(return_value=replay), rollback=AsyncMock())
    gateway = (KnowledgeMcpGateway if family == "knowledge" else WorkflowMcpGateway)(session)
    gateway._authorize = AsyncMock(return_value={"run": SimpleNamespace(id=str(uuid4()))})
    gateway._execute = AsyncMock()
    result = await gateway.invoke(tool_name=tool, arguments=arguments, context=context)
    assert result["status"] == "error"
    assert "must-not-escape" not in str(result)
    gateway._execute.assert_not_awaited()


def test_knowledge_replay_rechecks_asset_access(client, monkeypatch):
    principal = Principal("knowledge.analyst", frozenset({"analyst"}))
    context = KnowledgeInvocationContext(
        principal=principal,
        tenant_id="synthetic",
        case_id=str(uuid4()),
        case_state_hash="0" * 64,
        run_id=str(uuid4()),
        agent_name="internal-knowledge-agent",
        agent_version="1.1.0",
        runtime_service="pharma-agent-runtime",
        idempotency_key="read",
        scopes=frozenset({"knowledge:search"}),
        user_authenticated=True,
        runtime_authenticated=True,
    )

    async def check():
        async with client.app.state.database.session_factory() as session:
            gateway = KnowledgeMcpGateway(session)
            data, provenance, warnings = await gateway._execute(
                tool_name="knowledge.search_assets",
                arguments=KNOWLEDGE_TOOLS["knowledge.search_assets"](query="audit"),
                context=context,
            )
            assert data.records
            asset_data, _, _ = await gateway._execute(
                tool_name="knowledge.get_asset",
                arguments=KNOWLEDGE_TOOLS["knowledge.get_asset"](asset_id=data.records[0].asset_id),
                context=context,
            )
            assert asset_data.resource_type == "ASSET" and asset_data.records[0].content
            result = KnowledgeSuccess(
                request_id=uuid4(),
                tool_name="knowledge.search_assets",
                data=data,
                provenance=provenance,
                warnings=warnings,
            ).model_dump(mode="json")
            await gateway._authorize_result(result, context)
            monkeypatch.setattr(
                KnowledgeRepository, "authorized_asset_ids", AsyncMock(return_value=set())
            )
            with pytest.raises(GatewayDenied):
                await gateway._authorize_result(result, context)

    asyncio.run(check())


def test_all_workflow_tools_execute_and_replay_without_duplicate_drafts(client, monkeypatch):
    """Exercise all five tools through real approval, runtime, ACL and write boundaries."""
    from app.agent_platform.mcp.workflow.gateway import TOOL_SCOPES

    case = _case(client)

    async def registry():
        async with client.app.state.database.session_factory() as session:
            agent = await session.scalar(
                select(AgentVersion).where(AgentVersion.agent_key == "case-orchestrator")
            )
            tools = list(
                await session.scalars(
                    select(ToolVersion.id).where(ToolVersion.tool_key.in_(WORKFLOW_TOOLS))
                )
            )
            return agent.id, tools

    agent_id, tool_ids = asyncio.run(registry())
    response = client.post(
        f"/api/v1/cases/{case['id']}/plans",
        headers={**ANALYST, "Idempotency-Key": _key("tool-plan")},
        json={
            "plan_schema_version": "1.0.0",
            "assigned_reviewer_id": REVIEWER["X-Dev-User"],
            "steps": [
                {
                    "step_key": "drafts",
                    "title": "Prepare review drafts",
                    "instructions": "Prepare drafts for human review without delivery.",
                    "depends_on": [],
                    "agent_version_id": agent_id,
                    "skill_version_ids": [],
                    "tool_version_ids": tool_ids,
                    "output_schema_ref": "OrchestrationDirective@1.0.0",
                    "risk_level": "R1",
                    "requires_approval": False,
                    "limits": {
                        "max_turns": 2,
                        "max_tool_calls": 8,
                        "max_input_tokens": 10000,
                        "max_output_tokens": 2000,
                        "max_runtime_seconds": 120,
                        "max_cost_usd": 1,
                    },
                }
            ],
        },
    )
    assert response.status_code == 201, response.text
    plan = response.json()
    approved = client.post(
        f"/api/v1/cases/{case['id']}/plans/{plan['version']}/approve",
        headers={**REVIEWER, "Idempotency-Key": _key("tool-approval")},
        json={
            "decision": "approve",
            "expected_plan_sha256": plan["plan_sha256"],
            "expected_state_hash": plan["based_on_state_hash"],
            "reason": "Bounded local draft and read operations for review.",
        },
    )
    assert approved.status_code == 200, approved.text
    started = client.post(
        f"/api/v1/cases/{case['id']}/runs",
        headers={**ANALYST, "Idempotency-Key": _key("tool-run")},
        json={
            "plan_version": plan["version"],
            "expected_plan_sha256": plan["plan_sha256"],
            "expected_state_hash": plan["based_on_state_hash"],
        },
    )
    assert started.status_code == 201, started.text
    asyncio.run(process_next_job(client.app.state.database, client.app.state.settings))
    context = KnowledgeInvocationContext(
        principal=Principal(ANALYST["X-Dev-User"], frozenset({"analyst"})),
        tenant_id="synthetic",
        case_id=case["id"],
        case_state_hash=case["current_state_hash"],
        run_id=started.json()["id"],
        agent_name="case-orchestrator",
        agent_version="1.0.0",
        runtime_service="pharma-agent-runtime",
        idempotency_key="unused",
        scopes=frozenset(TOOL_SCOPES.values()),
        user_authenticated=True,
        runtime_authenticated=True,
    )

    async def exercise():
        async with client.app.state.database.session_factory() as session:
            before = await session.scalar(select(func.count()).select_from(NotificationDelivery))
            repository = KnowledgeRepository(session, context.principal)
            source = (await repository.search("audit", limit=1)).items[0]
            for name in WORKFLOW_TOOLS:
                args = {
                    "destination": "qa@example.invalid",
                    "title": "Manual review requested",
                    "body": "Please review these source references before making a decision.",
                }
                if name.endswith("collaboration_draft"):
                    args["platform"] = "TEAMS"
                elif name.endswith("task_draft"):
                    args["system"] = "TASK"
                elif name.endswith("document_metadata"):
                    args = {"asset_version_id": str(source.asset_version_id)}
                call_context = KnowledgeInvocationContext(
                    **{
                        **context.__dict__,
                        "idempotency_key": _key("tool-call"),
                    }
                )
                gateway = WorkflowMcpGateway(session)
                first = await gateway.invoke(tool_name=name, arguments=args, context=call_context)
                assert first["status"] == "success", (name, first)
                assert first["data"]["external_delivery_allowed"] is False
                second = await gateway.invoke(tool_name=name, arguments=args, context=call_context)
                assert first == second
            drafts = await session.scalar(
                select(func.count())
                .select_from(IntegrationOutbox)
                .where(IntegrationOutbox.case_id == case["id"])
            )
            after = await session.scalar(select(func.count()).select_from(NotificationDelivery))
            assert drafts == 4 and after == before
            original = WorkflowMcpGateway._execute

            async def invalid_result(self, **kwargs):
                result = await original(self, **kwargs)
                result["data"]["external_delivery_allowed"] = True
                return result

            monkeypatch.setattr(WorkflowMcpGateway, "_execute", invalid_result)
            rejected = await WorkflowMcpGateway(session).invoke(
                tool_name="workflow.create_email_draft",
                arguments={
                    "destination": "qa@example.invalid",
                    "title": "Rollback test",
                    "body": "Review these references before taking any action.",
                },
                context=KnowledgeInvocationContext(
                    **{
                        **context.__dict__,
                        "idempotency_key": _key("bad-result"),
                    }
                ),
            )
            assert rejected["status"] == "error"
            remaining = await session.scalar(
                select(func.count())
                .select_from(IntegrationOutbox)
                .where(IntegrationOutbox.case_id == case["id"])
            )
            assert remaining == 4

    asyncio.run(exercise())


@pytest.mark.asyncio
@pytest.mark.parametrize("family", ["knowledge", "workflow"])
async def test_private_tool_timeout_rolls_back_without_releasing_output(family, monkeypatch):
    from unittest.mock import Mock

    name = "knowledge.search_assets" if family == "knowledge" else "workflow.create_email_draft"
    args = (
        {"query": "audit"}
        if family == "knowledge"
        else {
            "destination": "qa@example.invalid",
            "title": "Review draft",
            "body": "Please review these references manually.",
        }
    )
    session = SimpleNamespace(scalar=AsyncMock(return_value=None), rollback=AsyncMock())
    gateway = (KnowledgeMcpGateway if family == "knowledge" else WorkflowMcpGateway)(session)
    gateway._authorize = AsyncMock(
        return_value={"run": SimpleNamespace(id=str(uuid4())), "invocation": None}
    )
    gateway._consume_budget = Mock()

    async def slow(**_):
        await asyncio.sleep(10)

    gateway._execute = slow
    monkeypatch.setattr(f"app.agent_platform.mcp.{family}.gateway.TOOL_TIMEOUT_SECONDS", 0.01)
    result = await gateway.invoke(
        tool_name=name, arguments=args, context=SimpleNamespace(idempotency_key="timeout")
    )
    assert result["status"] == "error" and result["error"]["retryable"] is False
    session.rollback.assert_awaited_once()
