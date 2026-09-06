"""Unsolved Neo4j GraphRAG comparison and guardrail contracts."""


def authorize_sources(principal, sources, current_versions):
    """Return only currently published source records the principal may use."""
    raise NotImplementedError("TODO learner implementation")


def build_graph_records(authorized_sources):
    """Derive provenance-carrying nodes and relationships for idempotent ingestion."""
    raise NotImplementedError("TODO learner implementation")


def ingest_neo4j(driver, graph_records):
    """Create or replace the authorized graph facts without embedding credentials."""
    raise NotImplementedError("TODO learner implementation")


def vanilla_retrieve(question, authorized_sources, k):
    """Return a bounded direct-chunk baseline trace."""
    raise NotImplementedError("TODO learner implementation")


def graph_retrieve(driver, question, authorized_sources, limits):
    """Return a bounded graph traversal trace linked to authorized source versions."""
    raise NotImplementedError("TODO learner implementation")


def validate_citations(answer, authorized_sources):
    """Validate answer citations against exact authorized source IDs and versions."""
    raise NotImplementedError("TODO learner implementation")


def compare_retrievers(cases, vanilla, graph):
    """Return per-case baseline and graph evidence without filling unmeasured results."""
    raise NotImplementedError("TODO learner implementation")

