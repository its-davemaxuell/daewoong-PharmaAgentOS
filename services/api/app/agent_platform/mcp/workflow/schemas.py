from __future__ import annotations

from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class StrictArguments(BaseModel):
    model_config = ConfigDict(extra="forbid")


class InternalDraftArguments(StrictArguments):
    destination: str = Field(min_length=1, max_length=320)
    title: str = Field(min_length=3, max_length=300)
    body: str = Field(min_length=8, max_length=10_000)


class EmailDraftArguments(StrictArguments):
    destination: str = Field(
        min_length=3,
        max_length=320,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    )
    title: str = Field(min_length=3, max_length=300)
    body: str = Field(min_length=8, max_length=10_000)


class CollaborationDraftArguments(InternalDraftArguments):
    platform: Literal["SLACK", "TEAMS"]


class TaskDraftArguments(InternalDraftArguments):
    system: Literal["NOTION", "TASK"]


class DocumentMetadataArguments(StrictArguments):
    asset_version_id: UUID


class WorkflowData(StrictArguments):
    resource_type: Literal["INTEGRATION_DRAFT", "DOCUMENT_METADATA"]
    draft_id: UUID | None
    channel: str | None
    draft_status: str | None
    content_sha256: Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")] | None
    external_delivery_allowed: Literal[False]
    asset_id: UUID | None
    asset_version_id: UUID | None
    asset_key: str | None
    title: str | None
    revision: Annotated[int, Field(ge=1)] | None
    document_status: str | None
    access_filtered: bool
    integration_mode: Literal["DRAFT_ONLY", "READ_ONLY"]


class WorkflowSuccess(StrictArguments):
    status: Literal["success"]
    request_id: UUID
    tool_name: str = Field(pattern=r"^workflow\.[a-z][a-z0-9_]*$")
    tool_version: Literal["1.0.0"]
    data: WorkflowData
    warnings: list[Annotated[str, Field(max_length=500)]] = Field(max_length=10)
