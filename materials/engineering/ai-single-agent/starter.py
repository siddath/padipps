"""Unsolved local-only starter for the Padipps single-agent exercise."""

from __future__ import annotations

from dataclasses import dataclass
from collections.abc import Callable
from typing import Any, Literal, Protocol

from pydantic import BaseModel, Field
from pydantic_ai import Agent


class KnowledgeAnswer(BaseModel):
    answer: str = Field(min_length=1, max_length=1200)
    citation_ids: list[str] = Field(default_factory=list, max_length=5)
    disposition: Literal["answer", "clarify", "escalate"]
    trace: list[dict[str, Any]] = Field(default_factory=list, max_length=8)


class ModelAdapter(Protocol):
    def complete(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]]) -> dict[str, Any]: ...


@dataclass(frozen=True)
class Budget:
    max_model_steps: int = 4
    max_tool_calls: int = 3
    max_results_per_search: int = 3


def search_catalog(*, query: str, tenant_id: str, catalog: list[dict[str, Any]], limit: int) -> list[dict[str, str]]:
    """Return compact metadata from the injected tenant-scoped fixture catalog."""
    raise NotImplementedError("TODO: validate arguments and implement tenant-scoped local search")


def read_document(*, document_id: str, tenant_id: str, catalog: list[dict[str, Any]]) -> dict[str, str]:
    """Return one tenant-scoped fixture document; never accept a path or URL."""
    raise NotImplementedError("TODO: validate authorization and return one local fixture document")


def authorize_tool_call(*, role: str, tenant_id: str, tool_name: str, arguments: dict[str, Any]) -> None:
    raise NotImplementedError("TODO: enforce the application authorization matrix before dispatch")


def sanitize_observation(result: Any) -> dict[str, Any]:
    raise NotImplementedError("TODO: bound and redact the tool result without treating content as instructions")


def build_agent(*, model: ModelAdapter, catalog: list[dict[str, Any]], budget: Budget) -> Agent:
    """Build the typed agent around injected dependencies. No provider construction belongs here."""
    raise NotImplementedError("TODO: construct a Pydantic AI Agent with only the two local tools and KnowledgeAnswer output")


def answer_question(
    *,
    model: ModelAdapter,
    catalog: list[dict[str, Any]],
    tenant_id: str,
    role: str,
    question: str,
    budget: Budget = Budget(),
    cancelled: Callable[[], bool] = lambda: False,
) -> KnowledgeAnswer:
    raise NotImplementedError("TODO: implement the bounded action/observation loop and final validation")
