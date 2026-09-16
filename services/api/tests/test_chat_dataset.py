from __future__ import annotations

import asyncio
import json
from datetime import UTC, date, datetime

import httpx
import pytest
from sqlalchemy import event
from test_chat_metadata import ask
from test_chat_metadata import metadata_rows as metadata_rows

from app.ai import GeminiGenerator
from app.config import Settings
from app.openai_provider import OpenAIGenerator
from app.rag_agent import DatasetSearchPlan, propose_dataset_plan
from app.rag_metadata import metadata_for_turn, parse_metadata_question
from app.rag_planner import plan_rag


@pytest.mark.parametrize(
    "question",
    [
        "what are the latest FDA letters",
        "what is the letter that went out this month",
        "Show me new letters",
        "What letters came out recently?",
        "List all letters from this month",
        "Which companies received letters recently?",
        "What is new in our dataset?",
        "Show the 10 most recent letters",
        "이번 달에 나온 FDA 서한을 보여줘",
        "최신 FDA 경고서한 10개를 보여줘",
        "Are there any letters issued this month?",
        "Compare letters issued in 2025 by country",
    ],
)
def test_natural_dataset_language_is_not_rejected(question):
    plan = plan_rag(question=question)
    assert plan.retrieval_strategy == "metadata"
    assert plan.deterministic_response is None


@pytest.mark.parametrize(
    ("question", "limit"),
    [
        ("what are the latest FDA letters", None),
        ("What is the latest FDA letter?", 1),
        ("Show the 10 most recent letters", 10),
        ("최신 FDA 경고서한 10개를 보여줘", 10),
        ("Find the two latest warning letters and summarize their findings", 2),
    ],
)
def test_singular_plural_and_explicit_limits(question, limit):
    assert parse_metadata_question(question).limit == limit


def test_date_words_are_not_country_filters_and_posting_synonym_is_preserved():
    query = parse_metadata_question("List all letters from this month", today=date(2026, 9, 16))
    assert not query.country
    assert query.start == date(2026, 9, 1) and query.end == date(2026, 9, 16)
    query = parse_metadata_question(
        "Which letters appeared on the FDA site last month?", today=date(2026, 1, 5)
    )
    assert query.date_field == "posted"
    assert query.start == date(2025, 12, 1) and query.end == date(2025, 12, 31)


def test_general_letter_education_still_avoids_search():
    assert plan_rag(question="What is an FDA warning letter?").retrieval_strategy == "none"
    assert plan_rag(question="What is the weather today?").deterministic_response == "out_of_scope"


def test_mixed_request_selects_dates_before_reading_content():
    query = parse_metadata_question("Summarize the latest FDA letters")
    assert query.select_before_search and query.intent is None
    assert parse_metadata_question("Count letters issued in 2025").select_before_search is False


def test_literal_list_is_a_text_lookup_not_an_unfiltered_catalog_list():
    query = parse_metadata_question(
        'Which letters contain the exact phrase "data integrity" in 2025?'
    )
    assert query.intent == "list" and query.text_terms == ("data integrity",)
    assert query.start == date(2025, 1, 1)


def test_metadata_lookup_reads_no_passage_or_full_version_body(
    client, viewer_headers, metadata_rows
):
    statements = []

    def capture(_conn, _cursor, statement, _params, _context, _many):
        statements.append(statement)

    engine = client.app.state.database.engine.sync_engine
    event.listen(engine, "before_cursor_execute", capture)
    try:
        result = ask(client, viewer_headers, "what are the latest FDA letters", max_sources=3)
    finally:
        event.remove(engine, "before_cursor_execute", capture)
    assert len(result["citations"]) == 3
    assert result["retrieval_strategy"] == "metadata" and not result["generation_used"]
    assert all("document_chunks.content" not in statement for statement in statements)
    assert all("document_versions.normalized_text" not in statement for statement in statements)
    dates = [citation["issue_date"] for citation in result["citations"]]
    assert dates == sorted(dates, reverse=True)


def test_current_month_uses_runtime_date_and_empty_results_are_honest(
    client,
    viewer_headers,
    metadata_rows,
    monkeypatch,
):
    monkeypatch.setattr("app.routes.intelligence.utcnow", lambda: datetime(2026, 9, 16, tzinfo=UTC))
    result = ask(client, viewer_headers, "what is the letter that went out this month")
    assert result["retrieval_strategy"] == "metadata"
    assert result["filters_applied"]["issue_date_from"] == "2026-09-01"
    assert result["filters_applied"]["issue_date_to"] == "2026-09-16"
    assert (
        "**0 saved" in result["answer"]
        and "not a claim that FDA issued no letters" in result["answer"]
    )
    assert result["evidence_sufficiency"] == "sufficient"


def test_latest_then_content_cannot_select_older_relevant_letters(
    client, viewer_headers, metadata_rows
):
    result = ask(
        client, viewer_headers, "Find the two latest warning letters and summarize their findings"
    )
    expected = {
        row["id"] for row in sorted(metadata_rows, key=lambda row: row["issue"], reverse=True)[:2]
    }
    assert result["route_reason"] == "catalog_then_passages"
    assert {c["warning_letter_id"] for c in result["citations"]} == expected


def test_empty_latest_selection_does_not_fall_back_to_global_passages(
    client, viewer_headers, metadata_rows
):
    result = ask(client, viewer_headers, "Summarize the latest warning letters issued in 2099")
    assert not result["citations"]
    assert result["route_reason"] == "catalog_selection_empty"
    assert "2099" in result["answer"] and "**0 saved" in result["answer"]


def test_topic_recency_searches_before_sorting():
    query = parse_metadata_question("Show the latest letters about data integrity")
    assert query.intent is None and query.sort_matches_by_date
    assert not query.select_before_search
    query = parse_metadata_question("Tell me about the latest FDA letters")
    assert query.intent == "list" and not query.sort_matches_by_date
    assert parse_metadata_question("Show letters related to laboratory controls").intent is None


def test_unsupported_catalog_constraints_require_clarification():
    for question in [
        "List the latest letters added to the dataset this month",
        "Count letters issued in 2025 excluding India",
    ]:
        assert parse_metadata_question(question).error == "dataset_query_required"


def test_saved_pagination_advances_by_displayed_rows_not_requested_limit(
    client, viewer_headers, metadata_rows
):
    thread = client.post(
        "/api/v1/chat/threads", headers=viewer_headers, json={"title": "Dataset pagination"}
    ).json()
    results = []
    for index, question in enumerate(["Show the 10 most recent letters", "Show more", "Next"]):
        results.append(
            ask(
                client,
                viewer_headers,
                question,
                thread_id=thread["id"],
                client_message_id=f"page-{index}",
                max_sources=1,
            )
        )
    ids = [result["citations"][0]["warning_letter_id"] for result in results]
    expected = [
        row["id"] for row in sorted(metadata_rows, key=lambda row: row["issue"], reverse=True)[:3]
    ]
    assert ids == expected
    assert all(result["retrieval_strategy"] == "metadata" for result in results)


def test_topic_matches_are_sorted_without_unrelated_recent_letters(
    client, viewer_headers, metadata_rows, monkeypatch
):
    from sqlalchemy import select

    from app.models import DocumentChunk

    eligible = {row["id"] for row in metadata_rows[:2]}

    async def prepare():
        async with client.app.state.database.session_factory() as session:
            for chunk in (await session.scalars(select(DocumentChunk))).all():
                chunk.content = (
                    "chromatography calibration failures"
                    if chunk.warning_letter_id in eligible
                    else "unrelated product information"
                )
            await session.commit()

    asyncio.run(prepare())
    model = PlannerStub(
        [
            DatasetSearchPlan(
                tool="passages_by_date", search_query="chromatography calibration", limit=2
            ).model_dump_json()
        ]
    )
    monkeypatch.setattr(client.app.state, "ai_generator", model)
    result = ask(client, viewer_headers, "Latest letters about chromatography calibration")
    assert result["route_reason"] == "passages_sorted_by_date"
    assert {c["warning_letter_id"] for c in result["citations"]} == eligible
    dates = [c["issue_date"] for c in result["citations"]]
    assert dates == sorted(dates, reverse=True)


class PlannerStub:
    model_id = "test-planner"
    provider = "test"
    prompt_version = "test"

    async def generate_grounded_answer(self, **kwargs):
        from app.ai import AiGenerationError

        raise AiGenerationError("No answer provider configured for this planning fixture")

    def __init__(self, replies):
        self.replies, self.payloads = replies, []

    async def plan_dataset_query(self, **kwargs):
        self.payloads.append(kwargs["payload"])
        return self.replies[min(len(self.payloads) - 1, len(self.replies) - 1)]


async def test_invalid_tool_arguments_are_repaired_once_without_executing_them():
    model = PlannerStub(
        [
            '{"tool":"sql","sql":"DELETE FROM warning_letters"}',
            DatasetSearchPlan(tool="catalog", operation="count").model_dump_json(),
        ]
    )
    result, trace = await propose_dataset_plan(
        [model], question="Tally our recorded letters", prior_questions=(), today=date(2026, 9, 16)
    )
    assert result.tool == "catalog" and trace["calls"] == 2
    assert model.payloads[1]["validation_feedback"]
    assert "DELETE" not in json.dumps(model.payloads[1])


async def test_planner_failures_are_bounded_and_return_no_executable_plan(monkeypatch):
    model = PlannerStub(['{"tool":"catalog","limit":9999}'])
    result, trace = await propose_dataset_plan(
        [model], question="Latest ones", prior_questions=(), today=date.today()
    )
    assert result is None and trace["calls"] == 2
    monkeypatch.setattr("app.rag_agent.PLANNER_TIMEOUT_SECONDS", 0.01)

    async def slow(**_kwargs):
        await asyncio.sleep(1)

    model.plan_dataset_query = slow
    result, trace = await propose_dataset_plan(
        [model], question="Latest ones", prior_questions=(), today=date.today()
    )
    assert result is None and trace["status"] == "timeout"


async def test_model_cannot_answer_a_semantic_violation_count_with_all_records():
    model = PlannerStub([DatasetSearchPlan(tool="catalog", operation="count").model_dump_json()])
    result, _ = await propose_dataset_plan(
        [model], question="Tally contamination violations", prior_questions=(), today=date.today()
    )
    assert result.tool == "clarify"


def test_semantic_catalog_plan_honors_user_filters(
    client, viewer_headers, metadata_rows, monkeypatch
):
    model = PlannerStub(
        [
            DatasetSearchPlan(
                tool="catalog",
                operation="count",
                country="India",
                start=date(2025, 1, 1),
                end=date(2025, 12, 31),
            ).model_dump_json()
        ]
    )
    monkeypatch.setattr(client.app.state, "ai_generator", model)
    result = ask(
        client, viewer_headers, "Tally the recipients in our records", filters={"country": "China"}
    )
    assert result["retrieval_strategy"] == "metadata" and not result["citations"]
    assert "conflicts" in result["answer"]


async def test_openai_planner_uses_validated_structured_output_without_external_tools():
    plan = DatasetSearchPlan(tool="catalog", operation="list", limit=5)

    def handler(request):
        body = json.loads(request.content)
        assert body["store"] is False and body["max_output_tokens"] == 1000
        assert "tools" not in body
        schema = body["text"]["format"]
        assert schema["strict"] is True and schema["schema"]["additionalProperties"] is False
        return httpx.Response(
            200,
            json={
                "status": "completed",
                "output": [
                    {
                        "type": "message",
                        "role": "assistant",
                        "status": "completed",
                        "content": [{"type": "output_text", "text": plan.model_dump_json()}],
                    }
                ],
            },
        )

    generator = OpenAIGenerator(
        Settings(
            _env_file=None,
            app_env="test",
            llm_provider="openai",
            openai_api_key="test-not-a-real-key",
        ),
        transport=httpx.MockTransport(handler),
    )
    result, trace = await propose_dataset_plan(
        [generator],
        question="Bring up the recently published notices",
        prior_questions=(),
        today=date(2026, 9, 16),
    )
    assert result == plan and trace["calls"] == 1


def test_next_page_preserves_order_and_date_constraints():
    query = metadata_for_turn("Show more", ("Show the latest two letters issued in 2025",))
    assert query.offset == 2 and query.limit == 2 and query.start == date(2025, 1, 1)


@pytest.mark.parametrize("complete", [True, False])
async def test_gemini_planner_accepts_only_complete_structured_output(complete):
    plan = DatasetSearchPlan(tool="catalog", limit=3)

    def handler(request):
        body = json.loads(request.content)
        assert "tools" not in body
        assert body["generationConfig"]["responseJsonSchema"]["additionalProperties"] is False
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "finishReason": "STOP" if complete else "MAX_TOKENS",
                        "content": {"parts": [{"text": plan.model_dump_json()}]},
                    }
                ]
            },
        )

    generator = GeminiGenerator(
        Settings(
            _env_file=None, app_env="test", llm_provider="gemini", gemini_api_key="test-not-real"
        ),
        transport=httpx.MockTransport(handler),
    )
    result, trace = await propose_dataset_plan(
        [generator], question="Recent saved notices", prior_questions=(), today=date(2026, 9, 16)
    )
    assert result == (plan if complete else None)
    assert trace["calls"] == (1 if complete else 2)
