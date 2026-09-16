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
    r"\b(?:how many|counts?|number of)\b|몇\s*(?:건|개)|몇\s*건|건수|개수|총\s*수", re.I
)
CONTENT = re.compile(
    r"\b(?:findings?|violations?|deficienc\w*|observations?|contamination|data integrity|"
    r"quality.unit|aseptic|cleaning|validation|mention\w*|discuss\w*|contain\w*|"
    r"about|concerning|related to|regarding)\b|"
    r"지적|위반|결함|관찰사항|오염|무결성|품질\s*부서|밸리데이션|언급|내용",
    re.I,
)
METADATA = re.compile(
    r"\b(?:metadata|issue dates?|issued|posted|posting dates?|posted dates?|recipient countr\w*|"
    r"issuing office|latest|newest|oldest|earliest|most recent|recent(?:ly)?|"
    r"source (?:links?|urls?)|"
    r"official (?:links?|urls?)|by (?:issue |posting )?(?:year|month|country|office))\b|"
    r"발행|발급|게시|최신|최근|가장\s*오래|최초|메타데이터|국가|발행\s*부서|원문\s*(?:링크|주소)|연도별|월별",
    re.I,
)
DATASET = re.compile(
    r"\b(?:letters?|dataset|database|catalog|saved (?:records|sources)|collection)\b|"
    r"경고(?:장|서한)|서한|데이터셋|데이터베이스|저장\s*(?:자료|원문)",
    re.I,
)
RECENCY = re.compile(
    r"\b(?:latest|newest|oldest|earliest|most recent|recent(?:ly)?|new)\b|"
    r"최신|최근|가장\s*오래|최초|새로운|새로",
    re.I,
)
CONTENT_ACTION = re.compile(
    r"\b(?:summari[sz]e|summary|explain|findings?|violations?|compare|analy[sz]e)\b|"
    r"요약|설명|지적|위반|비교|분석",
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
    group_by: Literal["year", "month", "country", "office", "period"] | None = None
    country: str | None = None
    error: str | None = None
    followup: bool = False
    company: str | None = None
    office: str | None = None
    countries: tuple[str, ...] = ()
    periods: tuple[tuple[date, date], ...] = ()
    text_terms: tuple[str, ...] = ()
    fiscal: bool = False
    count_unit: Literal["letters", "companies"] = "letters"
    date_relation: str | None = None
    select_before_search: bool = False
    offset: int = 0
    date_basis_explicit: bool = False
    sort_matches_by_date: bool = False


def _period(year: int, month: int | None = None, day: int | None = None):
    if day is not None:
        value = date(year, month or 1, day)
        return value, value
    if month is not None:
        return date(year, month, 1), date(year, month, calendar.monthrange(year, month)[1])
    return date(year, 1, 1), date(year, 12, 31)


def _dates(question: str, today: date) -> tuple[date | None, date | None, str | None]:
    if re.search(r"\d{1,4}/\d{1,2}/\d{1,4}", question, re.I):
        return None, None, "calendar_required"
    fiscal = re.search(
        r"\bFY\s*((?:19|20)\d{2})\b|(?:fiscal|financial)\s+year\s+((?:19|20)\d{2})|((?:19|20)\d{2})\s*회계\s*연도",
        question,
        re.I,
    )
    if fiscal:
        if len(re.findall(r"(?:19|20)\d{2}", question)) > 1:
            return None, None, "multiple_periods"
        year = int(next(value for value in fiscal.groups() if value))
        # FDA's fiscal year ends September 30; the label is the ending year.
        quarter = re.search(r"\bQ([1-4])\b|([1-4])\s*분기", question, re.I)
        if quarter:
            offset = (int(quarter.group(1) or quarter.group(2)) - 1) * 3
            month = (9 + offset) % 12 + 1
            start_year = year - 1 if month == 10 else year
            return date(start_year, month, 1), _period(start_year, month + 2)[1], None
        return date(year - 1, 10, 1), date(year, 9, 30), None
    if re.search(r"fiscal|financial year|회계\s*연도|\bFY\b", question, re.I):
        return None, None, "calendar_required"
    week = re.search(r"\b(last|previous|this)\s+week\b|지난\s*주|이번\s*주", question, re.I)
    if week:
        start = today - timedelta(days=today.weekday())
        previous = week.group().casefold().startswith(("last", "previous", "지난"))
        return (
            (start - timedelta(days=7), start - timedelta(days=1), None)
            if previous
            else (start, today, None)
        )
    quarter = re.search(
        r"\b(last|previous|this)\s+quarter\b|지난\s*분기|이번\s*분기", question, re.I
    )
    if quarter:
        first = date(today.year, ((today.month - 1) // 3) * 3 + 1, 1)
        previous = quarter.group().casefold().startswith(("last", "previous", "지난"))
        target = first - timedelta(days=1) if previous else today
        month = ((target.month - 1) // 3) * 3 + 1
        return (
            date(target.year, month, 1),
            _period(target.year, month + 2)[1] if previous else today,
            None,
        )
    months = re.search(
        r"\b(?:past|last)\s+(\d{1,3})\s+months?\b|최근\s*(\d{1,3})\s*개월", question, re.I
    )
    if months:
        number = int(months.group(1) or months.group(2))
        if not number:
            return None, None, "invalid_date"
        serial = today.year * 12 + today.month - 1 - number
        year, month0 = divmod(serial, 12)
        start = date(year, month0 + 1, min(today.day, calendar.monthrange(year, month0 + 1)[1]))
        return start, today, None
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
    inherited = (
        previous
        if isinstance(previous, MetadataQuery)
        else parse_metadata_question(previous, today=today)
        if previous
        else MetadataQuery()
    )
    count = bool(COUNT.search(question))
    is_content = bool(CONTENT.search(question))
    quoted_reply = bool(
        inherited.error == "content_count" and re.fullmatch(r'["“][^"”]{1,120}["”][.!?]?', question)
    )
    if quoted_reply:
        count, is_content = True, True
    unit_reply = bool(
        inherited.error == "count_unit_required"
        and re.fullmatch(r"(?:letters?|서한|경고서한)[.!?]?", question, re.I)
    )
    if unit_reply:
        count, is_content = True, False
    dataset = bool(DATASET.search(question))
    metadata = bool(METADATA.search(question) or (dataset and RECENCY.search(question)))
    is_content = is_content or bool(dataset and CONTENT_ACTION.search(question) and not count)
    # 'Tell me about the latest letters' requests a list, not passage analysis.
    if re.search(
        r"\babout (?:the )?(?:latest|newest|most recent) (?:FDA |warning )*letters?[.!?]?$",
        question,
        re.I,
    ) and not CONTENT_ACTION.search(question):
        is_content = False
    constraints = re.sub(r'["“][^"”]+["”]', "", question)
    start, end, error = _dates(constraints, today)
    periods: tuple[tuple[date, date], ...] = ()
    if error == "multiple_periods":
        parts = re.split(
            r"\b(?:and|or|vs\.?|versus)\b|대비|또는|(?<=년)\s*(?:과|와)", question, flags=re.I
        )
        parsed = [_dates(part, today) for part in parts]
        if 2 <= len(parsed) <= 4 and all(a and b and not e for a, b, e in parsed):
            periods = tuple(dict.fromkeys((a, b) for a, b, _ in parsed))
            start, end, error = None, None, None
    intent = "count" if count else "list" if metadata and not is_content else None
    if (
        dataset
        and not is_content
        and re.search(
            r"^(?:show(?: me)?|list)(?: all| the| saved| FDA| drug| warning)* letters[?.!]*$",
            question,
            re.I,
        )
    ):
        intent = intent or "list"
    group_by = None
    for field, pattern in {
        "year": r"\bby (?:issue |posting )?year\b|연도별|년도별",
        "month": r"\bby (?:issue |posting )?month\b|월별",
        "country": r"\bby (?:recipient )?countr(?:y|ies)\b|국가별",
        "office": r"\bby (?:issuing )?office\b|부서별",
    }.items():
        if re.search(pattern, constraints, re.I):
            group_by, intent = field, "group"
    text_terms = ()
    literal_list = bool(
        dataset
        and re.search(r"\b(?:mention\w*|contain\w*|exact phrase)\b|언급|문구", question, re.I)
        and not CONTENT_ACTION.search(question)
    )
    if (count and is_content) or literal_list:
        quoted = re.findall(r'["“]([^"”]{1,120})["”]', question)
        topics = {
            "contamination": r"\bcontamination\b|오염",
            "data integrity": r"\bdata integrity\b|데이터\s*무결성",
            "quality unit": r"\bquality.unit\b|품질\s*부서",
            "aseptic": r"\baseptic\b|무균",
            "validation": r"\bvalidation\b|밸리데이션",
            "cleaning": r"\bcleaning\b|세척",
        }
        candidates = quoted or [
            term for term, pattern in topics.items() if re.search(pattern, question, re.I)
        ]
        plain_phrase = re.search(
            r"\b(?:mention(?:ing|s)?|contain(?:ing|s)?)\s+(?:the\s+(?:word|phrase)\s+)?"
            rf"(.+?)(?=\s+(?:in\s+(?:(?:19|20)\d{{2}}|{MONTH_PATTERN}|Q[1-4])|"
            r"issued|posted|during|between|from|before|after)\b|[?.!]|$)",
            question,
            re.I,
        )
        if not quoted and plain_phrase:
            phrase = plain_phrase.group(1).strip()
            if re.search(r"\b(?:and|or|not|without)\b", phrase, re.I) or len(phrase) > 120:
                candidates = []
            else:
                candidates = [phrase]
        # A literal mention count is distinct from judging which letters have a topic/violation.
        mentions = re.search(
            r"\b(?:mention\w*|contain\w*|word|phrase)\b|언급|포함|단어|문구", question, re.I
        )
        if (
            len(candidates) == 1
            and (mentions or quoted_reply)
            and not re.search(r"\b(?:not|without|exclude|excluding)\b|않|제외|없는", question, re.I)
        ):
            text_terms = (" ".join(candidates[0].casefold().split()),)
            intent = intent or "list"
            if not quoted and plain_phrase:
                constraints = question[: plain_phrase.start(1)] + question[plain_phrase.end(1) :]
                if not periods:
                    start, end, error = _dates(constraints, today)
        else:
            error = error or "content_count"
    if count and re.search(
        r"\b(?:how many|count|number of)\s+(?:FDA\s+)?"
        r"(?:observations?|findings?|violations?)\b|지적\s*사항.*몇",
        question,
        re.I,
    ):
        error = "count_unit_required"
    if not is_content and (start or end or error) and dataset:
        intent = intent or "list"
    country = None
    matched_countries = []
    for canonical, aliases in COUNTRY_ALIASES.items():
        if any(
            re.search(rf"(?<![A-Za-z]){re.escape(alias)}(?![A-Za-z])", constraints, re.I)
            for alias in aliases
        ):
            matched_countries.append(canonical)
    country = matched_countries[0] if len(matched_countries) == 1 else None
    named_country = re.search(
        r"\b(?:companies|manufacturers|letters)\s+(?:in|from)\s+"
        r"([A-Za-z][A-Za-z .,]+?)(?=\s+"
        r"(?:in|issued|posted|during|between|since|before|after|mentioning)\b|[?.!]|$)",
        constraints,
        re.I,
    )
    if named_country:
        value = named_country.group(1).strip().casefold()
        if not re.search(
            rf"\b(?:library|corpus|database|dataset|collection|scope|saved|stored|this|last|"
            rf"past|previous|today|yesterday|recent\w*|month|week|year|quarter|{MONTH_PATTERN})\b",
            value,
        ):
            named_values = re.split(r"\s+(?:and|or|versus|vs\.?)\s+|\s*,\s*", value)
            if len(named_values) > 1:
                matched_countries = list(
                    dict.fromkeys(
                        next(
                            (
                                canonical
                                for canonical, aliases in COUNTRY_ALIASES.items()
                                if item in {canonical, *(a.casefold() for a in aliases)}
                            ),
                            item,
                        )
                        for item in named_values
                    )
                )
                country = None
            elif not matched_countries:
                country = value
    posted = bool(
        re.search(
            r"\bpost(?:ed|ing)\b|appeared on (?:the )?FDA (?:site|website)|게시", constraints, re.I
        )
    )
    issued = bool(re.search(r"\bissu(?:ed|e)\b|발행|발급", constraints, re.I))
    # Retain the original operation for a short clarification answer, not citation sample IDs.
    followup = bool(
        inherited.intent
        and (FOLLOWUP.search(question) or inherited.error)
        and (
            start
            or end
            or periods
            or metadata
            or country
            or matched_countries
            or text_terms
            or unit_reply
        )
        and not (
            inherited.error
            and count
            and not unit_reply
            and re.search(r"\bletters?\b|경고", question, re.I)
        )
    )
    if followup:
        intent = intent if count else inherited.intent
        group_by = group_by or inherited.group_by
    # A question asking for both dates may list both, but a shared range is ambiguous.
    if posted and issued and (start or end):
        error = "date_basis_required"
    field = "posted" if posted and not issued else "issue"
    if followup and not posted and not issued:
        field = inherited.date_field
    relation = next(
        (
            name
            for name, pattern in {
                "before": r"\b(?:before|earlier than)\b|이전",
                "after": r"\b(?:after|later than)\b|이후",
                "since": r"\bsince\b|부터",
                "until": r"\b(?:until|through|on or before)\b|까지",
            }.items()
            if re.search(pattern, question, re.I)
        ),
        None,
    )
    if followup and not start and not end and not periods:
        start, end, periods = inherited.start, inherited.end, inherited.periods
    elif followup and inherited.error in {"calendar_required", "invalid_date"} and not relation:
        relation = inherited.date_relation
        if relation == "before" and start:
            start, end = None, start - timedelta(days=1)
        elif relation == "after" and end:
            start, end = end + timedelta(days=1), None
        elif relation == "since":
            end = None
        elif relation == "until":
            start = None
    ascending = bool(
        re.search(r"\b(?:oldest|earliest|ascending)\b|가장\s*오래|최초|오름차순", question, re.I)
    )
    limit = None
    number = re.search(
        r"\b(?:top|first|latest|last|show|list|find|next)\s+(?:me\s+)?(?:the\s+)?"
        r"(\d{1,3}|one|two|three|four|five|ten)\b|(?:최근|최신)\s*(\d{1,3})\s*(?:건|개)|"
        r"(?:경고서한|경고장|서한)\s*(\d{1,3})\s*(?:건|개)",
        question,
        re.I,
    )
    if number:
        value = next(value for value in number.groups() if value).casefold()
        limit = (
            int(value)
            if value.isdigit()
            else {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "ten": 10}[value]
        )
    elif re.search(
        r"\b(?:which|what) is (?:the )?(?:(?:oldest|latest|newest|earliest) )?"
        r"(?:FDA |warning )*letter\b|\bthe (?:oldest|latest|newest|earliest) "
        r"(?:FDA |warning )*letter\b|가장\s*오래|최초",
        question,
        re.I,
    ):
        limit = 1
    result = MetadataQuery(
        intent, field, start, end, ascending, limit, group_by, country, error, followup
    )
    companies = bool(
        re.search(
            r"\b(?:how many|count|number of)\s+(?:distinct\s+|unique\s+)?"
            r"(?:companies|manufacturers)\b|회사.*몇\s*(?:개|곳)|업체.*몇\s*(?:개|곳)",
            question,
            re.I,
        )
    )
    result = replace(
        result,
        countries=tuple(matched_countries) if len(matched_countries) > 1 else (),
        periods=periods,
        text_terms=text_terms,
        fiscal=bool(re.search(r"\bFY\s*\d|fiscal|financial year|회계\s*연도", constraints, re.I)),
        count_unit="companies" if companies else "letters",
        date_relation=relation,
        date_basis_explicit=posted or issued,
        select_before_search=bool(
            dataset
            and RECENCY.search(question)
            and is_content
            and not count
            and CONTENT_ACTION.search(question)
        ),
        sort_matches_by_date=bool(
            dataset
            and RECENCY.search(question)
            and is_content
            and not count
            and not CONTENT_ACTION.search(question)
            and not text_terms
        ),
        group_by=group_by
        or (
            ("period" if periods else "country" if len(matched_countries) > 1 else None)
            if intent == "count"
            else None
        ),
    )
    company_match = re.search(
        r"\b(?:letters?\s+(?:for|to)|company\s+named)\s+(.+?)"
        r"(?=\s+(?:issued|posted|in\s+\d{4}|between|since|before|after|mention\w*|contain\w*)\b|[?!]|$)",
        question,
        re.I,
    )
    if company_match and not country and not result.countries:
        result = replace(result, company=company_match.group(1).strip().rstrip("."))
    office_match = re.search(r"\b(CDER|CBER|CDRH|CVM|CFSAN)\b", question, re.I)
    if office_match:
        result = replace(result, office=office_match.group(1).upper())
    if inherited.intent and followup:
        result = replace(
            result,
            country=country if result.countries else country or inherited.country,
            countries=result.countries or (() if country else inherited.countries),
            company=result.company or inherited.company,
            office=result.office or inherited.office,
            text_terms=result.text_terms or inherited.text_terms,
            count_unit="companies" if companies else inherited.count_unit,
            limit=result.limit or inherited.limit,
        )
    more = re.fullmatch(
        r"(?:show (?:me )?(?:more|the next(?: \d{1,2})?)|next(?: \d{1,2})?|"
        r"더\s*보여\s*줘|다음(?:\s*\d{1,2}건)?)[.!?]?",
        question,
        re.I,
    )
    if inherited.intent == "list" and more:
        page_size = result.limit or inherited.limit or 5
        return replace(
            inherited,
            followup=True,
            limit=page_size,
            offset=inherited.offset + (inherited.limit or 5),
        )
    if result.intent and re.search(
        r"\b(?:ingested|downloaded|added to|first seen|closed out|closeout|excluding|except)\b|"
        r"수집된|추가된|종결된|제외",
        question,
        re.I,
    ):
        result = replace(result, error="dataset_query_required")
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


def mention_pattern(term: str) -> re.Pattern[str]:
    """Literal whole-word/phrase search, tolerant of source line breaks."""
    return re.compile(
        r"(?<!\w)" + r"\s+".join(re.escape(word) for word in term.split()) + r"(?!\w)", re.I
    )


def clarification(error: str, language: str) -> str:
    if error == "dataset_query_required":
        return (
            "저장된 서한의 발행일·게시일, 회사, 국가, 발행 부서로 검색할 수 있습니다. "
            "어떤 기준으로 찾을까요? 실시간 FDA 조회나 수집 일시는 이 검색에서 지원하지 않습니다."
            if language == "ko"
            else "I can search saved letters by issue/posting date, company, country "
            "or issuing office. Which should I use? Live FDA lookups and ingestion dates "
            "are not supported by this search."
        )
    messages = {
        "filter_conflict": (
            "Your question conflicts with the selected filters. "
            "Clear or change the filters and try again.",
            "질문과 선택한 필터가 서로 다릅니다. 필터를 지우거나 변경한 뒤 다시 시도해 주세요.",
        ),
        "content_count": (
            "Which exact word or phrase should I count? "
            'For example: letters mentioning "contamination". '
            "I can search all accessible saved text for that phrase. Deciding whether each letter "
            "establishes a particular violation requires content review.",
            '어떤 정확한 단어나 문구를 집계할까요? 예: "contamination"을 언급한 서한. '
            "접근 가능한 저장 원문 전체에서 문구를 검색할 수 있습니다. 각 서한이 특정 위반을 "
            "지적하는지 판단하려면 내용 검토가 필요합니다.",
        ),
        "count_unit_required": (
            "Do you want the number of letters, or individual findings inside them? "
            "Letter counts are available; a complete finding count requires reviewing each letter.",
            "서한 수를 원하시나요, 서한 안의 개별 지적 사항 수를 원하시나요? "
            "서한 수는 집계할 수 있지만 전체 지적 사항 수는 각 서한 검토가 필요합니다.",
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
