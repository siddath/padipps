"""Unsolved local-only LangGraph starter for Padipps."""

from __future__ import annotations

from typing import Any, Literal, TypedDict

from pydantic import BaseModel, Field


class Finding(BaseModel):
    document_id: str
    claim: str = Field(min_length=1, max_length=800)


class ResearchRequest(BaseModel):
    request_id: str = Field(min_length=1, max_length=100)
    tenant_id: str = Field(min_length=1, max_length=64)
    normalized_question: str = Field(min_length=1, max_length=1600)
    allowed_document_ids: list[str] = Field(default_factory=list, max_length=20)
    result_limit: int = Field(ge=1, le=6)


class ResearchResult(BaseModel):
    status: Literal["ok", "empty", "denied", "failed"]
    findings: list[Finding] = Field(default_factory=list, max_length=6)
    observed_document_ids: list[str] = Field(default_factory=list, max_length=6)
    warnings: list[str] = Field(default_factory=list, max_length=4)


class DraftAnswer(BaseModel):
    answer: str = Field(min_length=1, max_length=1600)
    citation_ids: list[str] = Field(default_factory=list, max_length=6)
    unresolved_questions: list[str] = Field(default_factory=list, max_length=4)


class Critique(BaseModel):
    verdict: Literal["accept", "revise", "refuse"]
    rubric_ids: list[str] = Field(default_factory=list, max_length=6)
    findings: list[str] = Field(default_factory=list, max_length=6)


class PipelineResult(BaseModel):
    status: Literal["answered", "clarify", "refused", "cancelled", "failed", "revision_limit"]
    answer: str | None = Field(default=None, max_length=1600)
    citation_ids: list[str] = Field(default_factory=list, max_length=6)
    revision_count: int = Field(ge=0, le=2)
    error_code: str | None = Field(default=None, max_length=80)
    trace: list[dict[str, Any]] = Field(default_factory=list, max_length=10)


class GraphState(TypedDict, total=False):
    request_id: str
    tenant_id: str
    question: str
    route: Literal["answer_from_request", "research_then_write", "clarify", "refuse"]
    research: dict[str, Any]
    draft: dict[str, Any]
    critique: dict[str, Any]
    revision_count: int
    budget_remaining: int
    trace: list[dict[str, Any]]
    status: str


def route_request(state: GraphState) -> dict[str, Any]:
    raise NotImplementedError("TODO: validate and route without exceeding the shared budget")


def research_node(state: GraphState, *, corpus: list[dict[str, Any]]) -> dict[str, Any]:
    raise NotImplementedError("TODO: return a typed, tenant-scoped research handoff")


def writer_node(state: GraphState, *, writer_model: Any) -> dict[str, Any]:
    raise NotImplementedError("TODO: pass only the question and compact research handoff")


def critic_node(state: GraphState, *, critic_model: Any) -> dict[str, Any]:
    raise NotImplementedError("TODO: apply the public rubric and return a typed critique")


def after_critic(state: GraphState) -> str:
    raise NotImplementedError("TODO: accept, revise within the ceiling, or fail closed")


def build_graph(*, corpus: list[dict[str, Any]], writer_model: Any, critic_model: Any, checkpointer: Any = None) -> Any:
    """Compile explicit nodes and conditional edges. Do not construct live providers here."""
    raise NotImplementedError("TODO: build and compile the bounded StateGraph")


def run_pipeline(*, graph: Any, request: dict[str, Any], cancelled=lambda: False) -> dict[str, Any]:
    raise NotImplementedError("TODO: enforce cancellation, time and global budget around graph execution")
