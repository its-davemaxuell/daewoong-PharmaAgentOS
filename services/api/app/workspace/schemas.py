from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SearchItem(Output):
    id: str
    title: str
    subtitle: str | None
    href: str
    kind: Literal["sources", "research", "briefs", "views", "chats"]


class SearchGroup(Output):
    kind: Literal["sources", "research", "briefs", "views", "chats"]
    items: list[SearchItem]
    has_more: bool


class SearchPage(Output):
    groups: list[SearchGroup]
    page: int


class TriageResult(Output):
    id: str
    state: Literal["new", "later", "done", "dismissed"]
    reason: str
    revision: int


class InboxItem(TriageResult):
    letter_id: str
    title: str
    subtitle: str | None
    event_type: str
    version_id: str | None
    detected_at: datetime


class InboxPage(Output):
    items: list[InboxItem]
    counts: dict[str, int]
    page: int
    has_more: bool
    starts_at: datetime


class BriefSummary(Output):
    id: str
    title: str
    run_id: str
    run_revision: int
    content_hash: str
    created_at: datetime


class BriefPage(Output):
    items: list[BriefSummary]
    page: int
    has_more: bool


class BriefDetail(BriefSummary):
    snapshot: dict[str, Any]
