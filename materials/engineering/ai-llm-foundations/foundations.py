"""Unsolved local contracts for the LLM foundations exercise."""


ALLOWED_SEVERITIES = {"low", "medium", "high"}
MAX_SUMMARY_CHARACTERS = 160


def cosine_similarity(left, right):
    """Return cosine similarity for two finite, equal-length, non-zero vectors."""
    raise NotImplementedError("TODO learner implementation")


def parse_and_validate_incident_label(payload_text):
    """Return the exact validated {severity, summary} object from JSON text."""
    raise NotImplementedError("TODO learner implementation")


def build_responses_request(user_text):
    """Build, but do not send, the synthetic structured-output request dictionary."""
    raise NotImplementedError("TODO learner implementation")


def optional_live_call(client, request):
    """Optional learner-owned provider call; deliberately excluded from required tests."""
    raise NotImplementedError("OPTIONAL learner implementation; no live call is required")

