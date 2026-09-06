import json
import unittest
from pathlib import Path

from graph_rag import authorize_sources, build_graph_records, validate_citations


FIXTURES = Path(__file__).parent / "fixtures"


class AuthorizationTest(unittest.TestCase):
    def setUp(self):
        self.sources = json.loads((FIXTURES / "corpus.json").read_text())

    def test_missing_or_wrong_scope_denies(self):
        principal = {"tenant": "cedar", "roles": ["mechanic"]}
        versions = {source["id"]: source["version"] for source in self.sources}
        allowed = authorize_sources(principal, self.sources, versions)
        allowed_ids = {source["id"] for source in allowed}
        self.assertIn("cedar-vehicle-17", allowed_ids)
        self.assertNotIn("maple-private-note", allowed_ids)
        self.assertNotIn("cedar-draft-bulletin", allowed_ids)

    def test_stale_version_denies(self):
        principal = {"tenant": "cedar", "roles": ["mechanic"]}
        versions = {source["id"]: source["version"] for source in self.sources}
        versions["cedar-bulletin-b9"] = "replaced-version"
        allowed = authorize_sources(principal, self.sources, versions)
        self.assertNotIn("cedar-bulletin-b9", {source["id"] for source in allowed})


class ProvenanceTest(unittest.TestCase):
    def test_every_derived_fact_keeps_source_identity(self):
        sources = json.loads((FIXTURES / "corpus.json").read_text())
        principal = {"tenant": "cedar", "roles": ["mechanic"]}
        versions = {source["id"]: source["version"] for source in sources}
        records = build_graph_records(authorize_sources(principal, sources, versions))
        for relationship in records["relationships"]:
            self.assertTrue(relationship["source_id"])
            self.assertTrue(relationship["source_version"])


class CitationTest(unittest.TestCase):
    def test_rejects_unavailable_source_or_version(self):
        allowed = [{"id": "source-a", "version": "v2", "text": "bounded fact"}]
        self.assertTrue(validate_citations(
            {"text": "bounded fact", "citations": [{"source_id": "source-a", "version": "v2"}]},
            allowed,
        ))
        self.assertFalse(validate_citations(
            {"text": "old fact", "citations": [{"source_id": "source-a", "version": "v1"}]},
            allowed,
        ))
        self.assertFalse(validate_citations(
            {"text": "private", "citations": [{"source_id": "source-b", "version": "v1"}]},
            allowed,
        ))


if __name__ == "__main__":
    unittest.main()

