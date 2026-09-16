from __future__ import annotations

import asyncio
from datetime import date

import pytest
from sqlalchemy import select

from app.models import WarningLetter
from app.rag_metadata import metadata_for_turn, parse_metadata_question
from app.rag_planner import plan_rag


@pytest.mark.parametrize(
    ("question", "field", "start", "end"),
    [
        ("How many FDA warning letters were issued in 2025?", "issue", "2025-01-01", "2025-12-31"),
        (
            "How many FDA warning letters were posted in August 2026?",
            "posted",
            "2026-08-01",
            "2026-08-31",
        ),
        (
            "FDA letters issued between 2024-02-01 and 2024-02-29",
            "issue",
            "2024-02-01",
            "2024-02-29",
        ),
        (
            "2025년 1월부터 3월까지 발행된 FDA 경고서한은 몇 건인가요?",
            "issue",
            "2025-01-01",
            "2025-03-31",
        ),
        ("FDA letters issued last month", "issue", "2026-08-01", "2026-08-31"),
        ("FDA letters issued this year", "issue", "2026-01-01", "2026-09-16"),
        ("작년에 게시된 FDA 경고서한", "posted", "2025-01-01", "2025-12-31"),
        ("FDA letters issued in Q2 2025", "issue", "2025-04-01", "2025-06-30"),
        ("FDA letters issued before 2025", "issue", None, "2024-12-31"),
        ("FDA letters issued after 2025", "issue", "2026-01-01", None),
        ("FDA letters issued since 2025", "issue", "2025-01-01", None),
        ("FDA letters posted in the last 30 days", "posted", "2026-08-18", "2026-09-16"),
    ],
)
def test_calendar_dates(question, field, start, end):
    query = parse_metadata_question(question, today=date(2026, 9, 16))
    assert query.intent in {"count", "list"}
    assert query.error is None
    assert query.date_field == field
    assert (query.start.isoformat() if query.start else None) == start
    assert (query.end.isoformat() if query.end else None) == end
    assert plan_rag(question=question).retrieval_strategy == "metadata"


@pytest.mark.parametrize(
    ("question", "error"),
    [
        ("How many FDA letters were issued in 2025-02-30?", "invalid_date"),
        ("Count FDA letters in fiscal year 2025", "calendar_required"),
        ("Count FDA letters in FY2025", "calendar_required"),
        ("Count FDA letters from the past 3 months", "calendar_required"),
        ("Count FDA letters before 03/04/2025", "calendar_required"),
        ("Count FDA letters issued and posted in 2025", "date_basis_required"),
        ("Count FDA letters in 2024 or 2026", "multiple_periods"),
        ("Count FDA letters mentioning contamination", "content_count"),
        ("Count FDA letters from India and China", "multiple_countries"),
    ],
)
def test_ambiguous_questions_do_not_become_unfiltered_counts(question, error):
    assert parse_metadata_question(question).error == error


@pytest.mark.parametrize(
    ("question", "attribute", "expected"),
    [
        ("Show the five most recently issued FDA warning letters", "limit", 5),
        ("Which is the oldest FDA warning letter?", "ascending", True),
        ("Count saved FDA warning letters by issue year", "group_by", "year"),
        ("FDA 경고서한 국가별 건수", "group_by", "country"),
        (
            "How many FDA warning letters were sent to companies in India in 2025?",
            "country",
            "india",
        ),
        ("Count FDA letters from France in 2025", "country", "france"),
    ],
)
def test_operation_controls(question, attribute, expected):
    assert getattr(parse_metadata_question(question), attribute) == expected


def test_content_question_keeps_metadata_filter_without_becoming_metadata_only():
    question = "Find FDA data integrity findings in letters issued in 2025, with citations."
    query = parse_metadata_question(question)
    assert query.intent is None
    assert query.start == date(2025, 1, 1)
    assert plan_rag(question=question).retrieval_strategy == "corpus"


def test_followup_changes_year_without_inheriting_the_displayed_sample():
    question = "And in 2024?"
    previous = "How many FDA warning letters were posted in 2025?"
    query = parse_metadata_question(question, previous=previous)
    assert query.intent == "count"
    assert query.date_field == "posted"
    assert query.start == date(2024, 1, 1)
    plan = plan_rag(
        question=question,
        prior_user_questions=(previous,),
        prior_citation_letter_ids=("sample-only",),
    )
    assert plan.retrieval_strategy == "metadata"
    assert plan.letter_ids == ()


def test_repeated_metadata_followups_keep_the_original_operation():
    query = metadata_for_turn("And in 2023?", ("And in 2024?", "Count FDA letters posted in 2025"))
    assert query.intent == "count"
    assert query.date_field == "posted"
    assert query.start == date(2023, 1, 1)


def test_plural_findings_request_retrieves_evidence():
    plan = plan_rag(
        question=(
            "Give two specific quality-unit oversight findings from FDA warning letters, "
            "citing each company."
        )
    )
    assert plan.retrieval_strategy == "corpus"


@pytest.fixture(scope="module")
def metadata_rows(client):
    async def prepare():
        async with client.app.state.database.session_factory() as session:
            rows = list(
                (
                    await session.scalars(
                        select(WarningLetter)
                        .where(WarningLetter.current_in_scope.is_(True))
                        .order_by(WarningLetter.id)
                    )
                ).all()
            )
            assert len(rows) >= 4
            for index, row in enumerate(rows):
                row.issue_date = date(2025 if index < 3 else 2024, 1, index + 1)
                row.posted_date = date(2026, 2, index + 1)
                row.country = "India" if index < 2 else "United States"
            await session.commit()
            return [
                {
                    "id": row.id,
                    "company": row.company_name,
                    "issue": row.issue_date.isoformat(),
                    "posted": row.posted_date.isoformat(),
                }
                for row in rows
            ]

    return asyncio.run(prepare())


def ask(client, viewer_headers, question, **extra):
    response = client.post(
        "/api/v1/rag/query",
        headers=viewer_headers,
        json={"question": question, "language": "en", **extra},
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_exact_count_not_limited_to_citations(client, viewer_headers, metadata_rows):
    result = ask(
        client, viewer_headers, "How many FDA warning letters were issued in 2025?", max_sources=1
    )
    assert "**3 saved FDA Drug warning letters**" in result["answer"]
    assert len(result["citations"]) == 1
    assert result["generation_used"] is False
    assert result["filters_applied"]["issue_date_from"] == "2025-01-01"


def test_posted_date_and_issue_date_are_distinct(client, viewer_headers, metadata_rows):
    result = ask(client, viewer_headers, "How many FDA warning letters were posted in 2025?")
    assert "**0 saved FDA Drug warning letters**" in result["answer"]
    assert result["evidence_sufficiency"] == "sufficient"
    assert result["citations"] == []


def test_company_date_uses_metadata_and_cites_dates(client, viewer_headers, metadata_rows):
    row = metadata_rows[0]
    result = ask(
        client, viewer_headers, f"When was {row['company']}'s FDA warning letter issued and posted?"
    )
    assert result["retrieval_strategy"] == "metadata"
    assert result["generation_used"] is False
    assert row["issue"] in result["answer"] and row["posted"] in result["answer"]
    assert "[1]" in result["answer"]
    assert "Issue date:" in result["citations"][0]["excerpt"]


def test_country_count_combines_calendar_and_country(client, viewer_headers, metadata_rows):
    result = ask(
        client,
        viewer_headers,
        "How many FDA warning letters were sent to companies in India in 2025?",
    )
    assert "**2 saved FDA Drug warning letters**" in result["answer"]
    assert result["filters_applied"]["country"] == "india"


def test_oldest_uses_issue_date_not_posting_date(client, viewer_headers, metadata_rows):
    result = ask(
        client, viewer_headers, "Which is the oldest FDA warning letter in the saved library?"
    )
    assert len(result["citations"]) == 1
    assert result["citations"][0]["issue_date"].startswith("2024-")


def test_grouped_counts_cover_all_rows(client, viewer_headers, metadata_rows):
    result = ask(
        client, viewer_headers, "Count saved FDA warning letters by issue year", max_sources=1
    )
    assert "2025: **3**" in result["answer"]
    assert f"2024: **{len(metadata_rows) - 3}**" in result["answer"]


def test_metadata_counts_honor_explicit_date_intersection(client, viewer_headers, metadata_rows):
    result = ask(
        client,
        viewer_headers,
        "Count FDA warning letters issued in 2025",
        filters={"issue_date_from": "2025-01-02", "issue_date_to": "2025-01-02"},
    )
    assert "**1 saved FDA Drug warning letters**" in result["answer"]


def test_content_retrieval_is_date_filtered(client, viewer_headers, metadata_rows):
    result = ask(
        client,
        viewer_headers,
        "Find FDA data integrity findings in letters issued in 2025, with citations.",
    )
    assert result["retrieval_strategy"] == "corpus"
    assert result["filters_applied"]["issue_date_to"] == "2025-12-31"
    assert all(c["issue_date"].startswith("2025-") for c in result["citations"])


def test_thread_followup_counts_full_scope(client, viewer_headers, metadata_rows):
    thread = client.post(
        "/api/v1/chat/threads", headers=viewer_headers, json={"title": "Metadata follow-up"}
    ).json()
    first = ask(
        client,
        viewer_headers,
        "How many FDA warning letters were issued in 2025?",
        thread_id=thread["id"],
        client_message_id="first",
        max_sources=1,
    )
    second = ask(
        client,
        viewer_headers,
        "And in 2024?",
        thread_id=thread["id"],
        client_message_id="second",
        max_sources=1,
    )
    assert "**3 saved FDA Drug warning letters**" in first["answer"]
    assert f"**{len(metadata_rows) - 3} saved FDA Drug warning letters**" in second["answer"]
    replay = ask(
        client,
        viewer_headers,
        "And in 2024?",
        thread_id=thread["id"],
        client_message_id="second",
        max_sources=1,
    )
    assert replay["query_id"] == second["query_id"]


def test_uncertain_semantic_total_is_not_fabricated(client, viewer_headers, metadata_rows):
    result = ask(client, viewer_headers, "How many FDA warning letters mention contamination?")
    assert "complete content review" in result["answer"]
    assert result["evidence_sufficiency"] == "insufficient"
    assert result["generation_used"] is False


def test_nonexistent_named_company_is_not_a_global_count(client, viewer_headers, metadata_rows):
    result = ask(
        client, viewer_headers, "Count FDA warning letters for Nonexistent Testing Pharma in 2025"
    )
    assert "**0 saved FDA Drug warning letters**" in result["answer"]


def test_office_count_is_filtered_before_counting(client, viewer_headers, metadata_rows):
    result = ask(client, viewer_headers, "Count FDA warning letters issued by CBER in 2025")
    assert result["filters_applied"]["issuing_office"] == "CBER"
    assert "**0 saved FDA Drug warning letters**" in result["answer"]
