"""Unsolved deterministic evaluator for the Padipps multi-agent exercise."""

from __future__ import annotations

from collections.abc import Callable, Iterable
from typing import Any


def normalize_exact_answer(value: str) -> str:
    raise NotImplementedError("TODO: define and test the exact-match normalization contract")


def route_counts(rows: Iterable[dict[str, Any]]) -> dict[str, int]:
    raise NotImplementedError("TODO: return explicit correct and eligible counts")


def citation_counts(rows: Iterable[dict[str, Any]]) -> dict[str, int]:
    raise NotImplementedError("TODO: pool true-positive, predicted and required citation counts")


def citation_metrics(counts: dict[str, int]) -> dict[str, float]:
    raise NotImplementedError("TODO: implement declared zero rules and precision/recall/F1")


def tool_call_counts(rows: Iterable[dict[str, Any]]) -> dict[str, int]:
    raise NotImplementedError("TODO: compare ordered normalized calls using the proper denominator")


def redact_trace(trace: list[dict[str, Any]]) -> list[dict[str, Any]]:
    raise NotImplementedError("TODO: retain safe metadata and remove content, canaries and PII-like values")


def evaluate_cases(
    *,
    cases: Iterable[dict[str, Any]],
    pipeline: Callable[[dict[str, Any]], dict[str, Any]],
    configuration: dict[str, Any],
) -> dict[str, Any]:
    """Run every case, retain exceptions as outcomes, and report counts plus provenance."""
    raise NotImplementedError("TODO: implement the recorded offline evaluation run")

