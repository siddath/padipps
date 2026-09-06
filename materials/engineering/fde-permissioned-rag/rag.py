"""Unsolved deterministic permission boundary; no model or embedding provider."""


def prepare_context(principal, documents, query, acl_version):
    raise NotImplementedError("TODO learner implementation")


def validate_answer(answer, context):
    raise NotImplementedError("TODO learner implementation")
