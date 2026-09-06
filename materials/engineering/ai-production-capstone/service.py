"""Unsolved service boundary for the Padipps production-readiness capstone."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal, Protocol

from pydantic import BaseModel, Field


class AssistantRequest(BaseModel):
    request_id: str = Field(min_length=1, max_length=100)
    idempotency_key: str = Field(min_length=8, max_length=128)
    tenant_id: str = Field(min_length=1, max_length=64)
    role: Literal["support_reader", "support_reviewer"]
    question: str = Field(min_length=1, max_length=2000)


class AssistantResponse(BaseModel):
    status: Literal["answered", "clarify", "refused", "escalated", "cancelled", "failed"]
    answer: str | None = Field(default=None, max_length=2000)
    citation_ids: list[str] = Field(default_factory=list, max_length=6)
    error_code: str | None = Field(default=None, max_length=80)


class KnowledgePipeline(Protocol):
    def run(self, request: AssistantRequest, *, deadline_ms: int, cancelled: Any) -> AssistantResponse: ...


class IdempotencyStore(Protocol):
    def begin(self, *, scope: str, key: str, fingerprint: str) -> dict[str, Any]: ...
    def complete(self, *, scope: str, key: str, response: AssistantResponse) -> None: ...


@dataclass(frozen=True)
class ServiceLimits:
    request_timeout_ms: int = 4_000
    max_concurrent_requests: int = 4
    max_retry_attempts: int = 2
    max_model_calls: int = 4
    max_tool_calls: int = 3


class KnowledgeAssistantService:
    def __init__(self, *, pipeline: KnowledgePipeline, idempotency: IdempotencyStore, limits: ServiceLimits):
        raise NotImplementedError("TODO: retain only validated injected dependencies and concurrency controls")

    def answer(self, raw_request: dict[str, Any], *, cancelled=lambda: False) -> AssistantResponse:
        raise NotImplementedError(
            "TODO: validate, authorize, deduplicate, propagate deadlines/cancellation, bound retries, redact traces and return a stable outcome"
        )

