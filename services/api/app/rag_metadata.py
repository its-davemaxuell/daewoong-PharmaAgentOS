"""Conservative, inspectable metadata intent and calendar filters for FDA chat.

Counts come from authorized retained rows, never from a model or a top-k sample.
Unsupported date syntax is clarified rather than silently dropping the constraint.
"""

from __future__ import annotations

import calendar
import re
from dataclasses import dataclass, replace
from datetime import UTC, date, datetime, timedelta
from typing import Literal

COUNT = re.compile(
    r"\b(?:how many|count|number of)\b|몇\s*(?:건|개)|몇\s*건|건수|개수|총\s*수", re.I
)
CONTENT = re.compile(
    r"\b(?:findings?|violations?|deficienc\w*|observations?|contamination|data integrity|"
    r"quality.unit|aseptic|cleaning|validation|mention\w*|discuss\w*|contain\w*)\b|"
    r"지적|위반|결함|관찰사항|오염|무결성|품질\s*부서|밸리데이션|언급|내용",
    re.I,
)
METADATA = re.compile(
    r"\b(?:metadata|issue dates?|issued|posted|posting dates?|posted dates?|recipient countr\w*|"
    r"issuing office|latest|newest|oldest|earliest|most recent|source (?:links?|urls?)|"
    r"official (?:links?|urls?)|by (?:issue |posting )?(?:year|month|country|office))\b|"
    r"발행|발급|게시|최신|최근|가장\s*오래|최초|메타데이터|국가|발행\s*부서|원문\s*(?:링크|주소)|연도별|월별",
    re.I,
)
FOLLOWUP = re.compile(
    r"^(?:and\b|what about\b|how about\b|then\b|그럼|그러면|그중|그 중|그리고)", re.I
)
MONTHS = {name.casefold(): index for index, name in enumerate(calendar.month_name) if name}
MONTHS.update({name.casefold(): index for index, name in enumerate(calendar.month_abbr) if name})
MONTH_PATTERN = "|".join(sorted(MONTHS, key=len, reverse=True))
DATE_PATTERN = re.compile(
    rf"(?P<iso>(?:19|20)\d{{2}}-\d{{1,2}}(?:-\d{{1,2}})?)|"
    rf"(?P<ko>(?:19|20)\d{{2}}년\s*(?:\d{{1,2}}월\s*(?:\d{{1,2}}일)?)?)|"
    rf"(?P<en>\b(?:{MONTH_PATTERN})\.?\s+(?:\d{{1,2}},?\s+)?(?:19|20)\d{{2}}\b)|"
    rf"(?P<year>\b(?:19|20)\d{{2}}\b)",
    re.I,
)
COUNTRY_ALIASES = {
    "india": ("India", "인도"),
    "china": ("China", "중국"),
    "united states": ("United States", "USA", "U.S.", "미국"),
    "south korea": ("South Korea", "Republic of Korea", "한국", "대한민국"),
    "japan": ("Japan", "일본"),
    "germany": ("Germany", "독일"),
    "united kingdom": ("United Kingdom", "UK", "영국"),
    "canada": ("Canada", "캐나다"),
}


@dataclass(frozen=True)
class MetadataQuery:
    intent: Literal["list", "count", "group"] | None = None
    date_field: Literal["issue", "posted"] = "issue"
    start: date | None = None
    end: date | None = None
    ascending: bool = False
    limit: int | None = None
    group_by: Literal["year", "month", "country", "office"] | None = None
    country: str | None = None
    error: str | None = None
    followup: bool = False
    company: str | None = None
    office: str | None = None


def _period(year: int, month: int | None = None, day: int | None = None):
    if day is not None:
        value = date(year, month or 1, day)
        return value, value
    if month is not None:
        return date(year, month, 1), date(year, month, calendar.monthrange(year, month)[1])
    return date(year, 1, 1), date(year, 12, 31)


def _dates(question: str, today: date) -> tuple[date | None, date | None, str | None]:
    if re.search(r"\d{1,4}/\d{1,2}/\d{1,4}|\bFY\s*\d{2,4}\b", question, re.I):
        return None, None, "calendar_required"
    if re.search(r"fiscal|financial year|회계연도|회계 연도", question, re.I):
        return None, None, "calendar_required"
    relative = re.search(
        r"\b(this|last|previous)\s+(year|month)\b|올해|작년|지난해|이번\s*달|지난\s*달",
        question,
        re.I,
    )
    if relative:
        value = relative.group().casefold()
        last = value.startswith(("last", "previous", "작년", "지난"))
        if "year" in value or value in {"올해", "작년", "지난해"}:
            start, end = _period(today.year - int(last))
        else:
            first = date(today.year, today.month, 1)
            target = first - timedelta(days=1) if last else today
            start, end = _period(target.year, target.month)
        return start, min(end, today) if not last else end, None
    days = re.search(r"\b(?:last|past)\s+(\d{1,4})\s+days?\b|최근\s*(\d{1,4})\s*일", question, re.I)
    if days:
        number = int(days.group(1) or days.group(2))
        return (
            (today - timedelta(days=number - 1), today, None)
            if number
            else (None, None, "invalid_date")
        )
    tokens = []
    try:
        for match in DATE_PATTERN.finditer(question):
            if match.lastgroup == "en":
                parts = re.findall(r"[A-Za-z]+|\d+", match.group())
                start, end = _period(
                    int(parts[-1]),
                    MONTHS[parts[0].casefold()],
                    int(parts[1]) if len(parts) == 3 else None,
                )
            else:
                values = [int(value) for value in re.findall(r"\d+", match.group())]
                start, end = _period(*values)
            tokens.append((start, end, match.start(), match.end()))
        # Korean ranges commonly omit the repeated year: 2025년 1월부터 3월까지.
        if len(tokens) == 1 and "부터" in question[tokens[0][3] :]:
            remainder = question[tokens[0][3] :]
            final_month = re.search(r"부터\s*(\d{1,2})월", remainder)
            if final_month:
                start, end = _period(tokens[0][0].year, int(final_month.group(1)))
                tokens.append((start, end, 0, 0))
        quarter = re.search(r"\bQ([1-4])\b|([1-4])\s*분기", question, re.I)
        if quarter and len(tokens) == 1:
            month = (int(quarter.group(1) or quarter.group(2)) - 1) * 3 + 1
            return date(tokens[0][0].year, month, 1), _period(tokens[0][0].year, month + 2)[1], None
    except (ValueError, OverflowError):
        return None, None, "invalid_date"
    if len(tokens) > 2:
        return None, None, "multiple_periods"
    if tokens:
        if len(tokens) == 2:
            between = question[tokens[0][3] : tokens[1][2]]
            if re.search(r"\bor\b|\bvs\b|versus|대비|비교|또는", between, re.I):
                return None, None, "multiple_periods"
            if re.search(r"\band\b", between, re.I) and not re.search(
                r"\bbetween\b", question, re.I
            ):
                return None, None, "multiple_periods"
            start, end = tokens[0][0], tokens[-1][1]
        else:
            start, end, before_at, after_at = tokens[0]
            before, after = question[:before_at], question[after_at:]
            if re.search(r"\b(?:before|earlier than)\s*$", before, re.I) or re.match(
                r"\s*이전", after
            ):
                return None, start - timedelta(days=1), None
            if re.search(r"\b(?:after|later than)\s*$", before, re.I) or re.match(
                r"\s*이후", after
            ):
                return end + timedelta(days=1), None, None
            if re.search(r"\bsince\s*$", before, re.I) or re.match(r"\s*부터", after):
                return start, None, None
            if re.search(r"\b(?:until|through|on or before)\s*$", before, re.I) or re.match(
                r"\s*까지", after
            ):
                return None, end, None
        return (start, end, None) if start <= end else (None, None, "invalid_date")
    if re.search(
        r"\b(?:last|this|past|previous|next)\s+(?:\d+\s+)?(?:weeks?|months?|quarters?|years?)\b|"
        r"지난\s*주|이번\s*주|지난\s*분기",
        question,
        re.I,
    ):
        return None, None, "calendar_required"
    return None, None, None


def parse_metadata_question(
    question: str, *, today: date | None = None, previous: str | MetadataQuery | None = None
) -> MetadataQuery:
    today = today or datetime.now(UTC).date()
    question = " ".join(question.split())
    count = bool(COUNT.search(question))
    is_content = bool(CONTENT.search(question))
    metadata = bool(METADATA.search(question))
    start, end, error = _dates(question, today)
    intent = "count" if count else "list" if metadata and not is_content else None
    group_by = None
    for field, pattern in {
        "year": r"\bby (?:issue |posting )?year\b|연도별|년도별",
        "month": r"\bby (?:issue |posting )?month\b|월별",
        "country": r"\bby (?:recipient )?countr(?:y|ies)\b|국가별",
        "office": r"\bby (?:issuing )?office\b|부서별",
    }.items():
        if re.search(pattern, question, re.I):
            group_by, intent = field, "group"
    if count and is_content:
        error = "content_count"
    if (
        not is_content
        and (start or end or error)
        and re.search(r"\bletters?\b|경고(?:장|서한)", question, re.I)
    ):
        intent = intent or "list"
    # A date-only follow-up inherits a prior structured operation, not its displayed sample IDs.
    followup = bool(previous and FOLLOWUP.search(question) and (start or end or metadata))
    inherited = (
        previous
        if isinstance(previous, MetadataQuery)
        else parse_metadata_question(previous, today=today)
        if followup
        else MetadataQuery()
    )
    if followup and inherited.intent:
        intent = intent or inherited.intent
        group_by = group_by or inherited.group_by
    country = None
    matched_countries = []
    for canonical, aliases in COUNTRY_ALIASES.items():
        if any(
            re.search(rf"(?<![A-Za-z]){re.escape(alias)}(?![A-Za-z])", question, re.I)
            for alias in aliases
        ):
            matched_countries.append(canonical)
    if len(matched_countries) > 1:
        error = "multiple_countries"
    country = matched_countries[0] if matched_countries else None
    if not country:
        named_country = re.search(
            r"\b(?:companies|manufacturers|letters)\s+(?:in|from|to)\s+"
            r"([A-Za-z][A-Za-z .]+?)(?=\s+"
            r"(?:in|issued|posted|during|between|since|before|after)\b|[?.!]|$)",
            question,
            re.I,
        )
        if named_country:
            value = named_country.group(1).strip().casefold()
            if not re.search(
                r"\b(?:library|corpus|database|collection|scope|saved|stored)\b", value
            ):
                country = value
    posted = bool(re.search(r"\bpost(?:ed|ing)\b|게시", question, re.I))
    issued = bool(re.search(r"\bissu(?:ed|e)\b|발행|발급", question, re.I))
    # A question asking for both dates may list both, but a shared range is ambiguous.
    if posted and issued and (start or end):
        error = "date_basis_required"
    field = "posted" if posted and not issued else "issue"
    if followup and not posted and not issued:
        field = inherited.date_field
    ascending = bool(
        re.search(r"\b(?:oldest|earliest|ascending)\b|가장\s*오래|최초|오름차순", question, re.I)
    )
    limit = None
    number = re.search(
        r"\b(?:top|first|latest|last|show|list)\s+(?:the\s+)?"
        r"(\d{1,3}|one|two|three|four|five|ten)\b|(?:최근|최신)\s*(\d{1,3})\s*(?:건|개)",
        question,
        re.I,
    )
    if number:
        value = (number.group(1) or number.group(2)).casefold()
        limit = (
            int(value)
            if value.isdigit()
            else {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "ten": 10}[value]
        )
    elif re.search(
        r"\b(?:which is|what is|the oldest|the latest|the newest|the earliest)\b|가장\s*오래|최초",
        question,
        re.I,
    ):
        limit = 1
    result = MetadataQuery(
        intent, field, start, end, ascending, limit, group_by, country, error, followup
    )
    company_match = re.search(
        r"\b(?:letters?\s+(?:for|to)|company\s+named)\s+(.+?)"
        r"(?=\s+(?:issued|posted|in\s+\d{4}|between|since|before|after)\b|[?!]|$)",
        question,
        re.I,
    )
    if company_match and not country:
        result = replace(result, company=company_match.group(1).strip().rstrip("."))
    office_match = re.search(r"\b(CDER|CBER|CDRH|CVM|CFSAN)\b", question, re.I)
    if office_match:
        result = replace(result, office=office_match.group(1).upper())
    if inherited.intent and followup:
        result = replace(
            result,
            country=country or inherited.country,
            company=result.company or inherited.company,
            office=result.office or inherited.office,
        )
    return result


def metadata_for_turn(
    question: str, prior_questions: tuple[str, ...], *, today: date | None = None
):
    previous = None
    for prior in reversed(prior_questions):
        previous = parse_metadata_question(prior, today=today, previous=previous)
    return parse_metadata_question(question, today=today, previous=previous)


def country_matches(stored: str | None, requested: str) -> bool:
    values = {
        requested.casefold(),
        *(alias.casefold() for alias in COUNTRY_ALIASES.get(requested.casefold(), ())),
    }
    return (stored or "").casefold() in values


def clarification(error: str, language: str) -> str:
    messages = {
        "filter_conflict": (
            "Your question conflicts with the selected filters. "
            "Clear or change the filters and try again.",
            "질문과 선택한 필터가 서로 다릅니다. 필터를 지우거나 변경한 뒤 다시 시도해 주세요.",
        ),
        "content_count": (
            "I can count saved letters by date, company or country. An exact count of letters "
            "mentioning a topic requires a complete content review; retrieved examples are not "
            "a total. Ask for cited examples, or use Research to investigate the topic.",
            "저장된 서한을 날짜·회사·국가별로 집계할 수 있습니다. 특정 주제를 언급한 서한의 "
            "정확한 총수는 전체 내용 검토가 필요하며, 검색된 예시 수를 총수로 볼 수 없습니다. "
            "근거가 있는 예시를 요청하거나 리서치에서 해당 주제를 조사해 주세요.",
        ),
        "date_basis_required": (
            "Should this date range apply to the issue date or the FDA posting date?",
            "이 기간을 발행일 기준으로 조회할까요, FDA 게시일 기준으로 조회할까요?",
        ),
        "invalid_date": (
            "Please enter a valid date range, with the start before the end (YYYY-MM-DD).",
            "시작일이 종료일보다 늦지 않은 유효한 날짜 범위를 입력해 주세요(YYYY-MM-DD).",
        ),
        "calendar_required": (
            "Please give the start and end dates (YYYY-MM-DD), "
            "and choose issue date or posting date.",
            "시작일과 종료일(YYYY-MM-DD), 그리고 발행일 또는 게시일 기준을 알려주세요.",
        ),
        "multiple_periods": (
            "Please query one date range at a time, or ask for counts by year.",
            "날짜 범위를 하나씩 조회하거나 연도별 집계를 요청해 주세요.",
        ),
        "multiple_countries": (
            "Please query one recipient country at a time, or ask for counts by country.",
            "수신인 국가를 하나씩 조회하거나 국가별 집계를 요청해 주세요.",
        ),
    }
    return messages[error][language == "ko"]
