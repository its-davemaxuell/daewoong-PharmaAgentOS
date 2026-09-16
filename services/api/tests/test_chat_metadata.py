from __future__ import annotations

import asyncio
from datetime import date

import pytest
from sqlalchemy import select

from app.models import DocumentChunk, WarningLetter
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
        ("Count FDA letters in fiscal year 2025", "issue", "2024-10-01", "2025-09-30"),
        ("Count FDA letters in FY2025", "issue", "2024-10-01", "2025-09-30"),
        ("Count FDA letters in Q1 FY2025", "issue", "2024-10-01", "2024-12-31"),
        ("Count FDA letters in Q4 FY2025", "issue", "2025-07-01", "2025-09-30"),
        ("Count FDA letters from the past 3 months", "issue", "2026-06-16", "2026-09-16"),
        ("Count FDA letters issued last quarter", "issue", "2026-04-01", "2026-06-30"),
        ("Count FDA letters issued last week", "issue", "2026-09-07", "2026-09-13"),
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
        ("Count FDA letters before 03/04/2025", "calendar_required"),
        ("Count FDA letters issued and posted in 2025", "date_basis_required"),
        ("Count FDA letters with contamination violations", "content_count"),
        ("Count FDA letters not mentioning contamination", "content_count"),
        ("How many observations are in FDA warning letters?", "count_unit_required"),
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
    result = ask(
        client, viewer_headers, "How many FDA warning letters have contamination violations?"
    )
    assert "requires content review" in result["answer"]
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


def test_multiple_countries_count_union_and_show_zero_groups(client, viewer_headers, metadata_rows):
    result = ask(client, viewer_headers, "Count FDA warning letters from India and China in 2025")
    assert "**2 saved FDA Drug warning letters**" in result["answer"]
    assert "India: **2**" in result["answer"]
    assert "China: **0**" in result["answer"]


def test_disjoint_periods_do_not_include_intervening_year(client, viewer_headers, metadata_rows):
    result = ask(client, viewer_headers, "Compare FDA warning letter counts in 2024 and 2026")
    assert f"**{len(metadata_rows) - 3} saved FDA Drug warning letters**" in result["answer"]
    assert "2026-01-01 – 2026-12-31: **0**" in result["answer"]
    assert all(c["issue_date"].startswith("2024") for c in result["citations"])


@pytest.mark.parametrize(
    ("first", "reply", "expected"),
    [
        ("Count FDA letters before 03/04/2025", "March 4, 2025", (None, date(2025, 3, 3), "issue")),
        (
            "Count FDA letters issued and posted in 2025",
            "Use the posting date",
            (date(2025, 1, 1), date(2025, 12, 31), "posted"),
        ),
        (
            "Count FDA letters from India in 2025",
            "And China?",
            (date(2025, 1, 1), date(2025, 12, 31), "issue"),
        ),
    ],
)
def test_clarifications_keep_operation_and_date_context(first, reply, expected):
    parsed = metadata_for_turn(reply, (first,))
    assert parsed.intent == "count" and parsed.error is None
    assert (parsed.start, parsed.end, parsed.date_field) == expected
    assert plan_rag(question=reply, prior_user_questions=(first,)).retrieval_strategy == "metadata"


def test_literal_clarification_inherits_count_and_dates():
    parsed = metadata_for_turn(
        '"contamination"', ("Count FDA letters with contamination violations in 2025",)
    )
    assert parsed.text_terms == ("contamination",)
    assert parsed.start == date(2025, 1, 1)
    assert parsed.error is None


def test_quoted_search_content_is_not_interpreted_as_country_or_date_filters():
    query = parse_metadata_question('Count FDA letters mentioning "India in 2025"')
    assert query.text_terms == ("india in 2025",)
    assert not query.country and not query.countries and not query.start and not query.end


def test_unlisted_country_is_not_dropped_from_a_country_pair():
    query = parse_metadata_question("Count FDA letters from France and Germany in 2025")
    assert query.countries == ("france", "germany")
    assert query.country is None


def test_fiscal_year_comparison_keeps_both_fiscal_years():
    query = parse_metadata_question("Compare FDA letter counts in FY2024 and FY2026")
    assert query.periods == (
        (date(2023, 10, 1), date(2024, 9, 30)),
        (date(2025, 10, 1), date(2026, 9, 30)),
    )


def test_count_unit_clarification_can_be_answered_without_repeating_the_question():
    query = metadata_for_turn(
        "Letters.", ("How many observations are in FDA letters issued in 2025?",)
    )
    assert query.error is None and query.followup
    assert query.intent == "count" and query.start == date(2025, 1, 1)


def test_invalid_date_correction_retains_before():
    query = metadata_for_turn("2025-02-28", ("Count FDA letters before 2025-02-30",))
    assert query.start is None and query.end == date(2025, 2, 27)


@pytest.fixture
def mention_rows(client, metadata_rows):
    async def prepare():
        async with client.app.state.database.session_factory() as session:
            chunks = list(
                (
                    await session.scalars(
                        select(DocumentChunk).where(
                            DocumentChunk.chunker_version
                            == client.app.state.settings.chunker_version
                        )
                    )
                ).all()
            )
            originals = [(chunk.id, chunk.content, chunk.acl) for chunk in chunks]
            for chunk in chunks:
                index = next(
                    i for i, row in enumerate(metadata_rows) if row["id"] == chunk.warning_letter_id
                )
                chunk.content = "Control specimen text."
                if index < 2:
                    chunk.content = "The letter mentions TEST\nPHRASE; test phrase occurs twice."
                elif index == 2:
                    chunk.content = "Test phrase appears only in restricted text."
                    chunk.acl = {"roles": ["admin"]}
                elif index == 3:
                    chunk.content = "A near match: test phrases."
            await session.commit()
            return originals

    originals = asyncio.run(prepare())
    yield

    async def restore():
        async with client.app.state.database.session_factory() as session:
            for identifier, content, acl in originals:
                row = await session.get(DocumentChunk, identifier)
                row.content, row.acl = content, acl
            await session.commit()

    asyncio.run(restore())


def test_mentions_count_distinct_letters_and_cite_matching_authorized_text(
    client, viewer_headers, mention_rows
):
    result = ask(
        client, viewer_headers, 'Count FDA warning letters mentioning "test phrase"', max_sources=1
    )
    assert "**2 saved FDA Drug warning letters**" in result["answer"]
    assert len(result["citations"]) == 1
    assert "Matched source passage:" in result["citations"][0]["excerpt"]
    assert "TEST\nPHRASE" in result["citations"][0]["excerpt"]
    assert result["generation_used"] is False
    scoped = ask(
        client,
        viewer_headers,
        'Count FDA letters mentioning "test phrase"',
        filters={"issue_date_from": "2025-01-02", "issue_date_to": "2025-01-02"},
    )
    assert "**1 saved FDA Drug warning letters**" in scoped["answer"]


def test_mentions_zero_is_valid_and_semantic_negation_is_not_silently_dropped(
    client, viewer_headers, mention_rows
):
    result = ask(client, viewer_headers, 'Count FDA letters mentioning "no such phrase"')
    assert "**0 saved FDA Drug warning letters**" in result["answer"]
    assert result["evidence_sufficiency"] == "sufficient"
    assert not result["citations"]
    result = ask(client, viewer_headers, 'Count FDA letters not mentioning "test phrase"')
    assert result["evidence_sufficiency"] == "insufficient"


def test_companies_are_not_counted_as_letters(client, viewer_headers, metadata_rows):
    async def name(value=None):
        async with client.app.state.database.session_factory() as session:
            row = await session.get(WarningLetter, metadata_rows[1]["id"])
            previous = row.company_name
            row.company_name = value or metadata_rows[0]["company"]
            await session.commit()
            return previous

    original = asyncio.run(name())
    try:
        result = ask(
            client, viewer_headers, "How many companies received FDA warning letters in 2025?"
        )
        assert "**2 distinct recorded company names**" in result["answer"]
    finally:
        asyncio.run(name(original))
