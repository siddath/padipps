import unittest
from pathlib import Path

from rag_pipeline import (
    chunk_documents,
    deterministic_embedding,
    load_corpus,
    retrieval_metrics,
)


FIXTURES = Path(__file__).parent / "fixtures"


class CorpusTest(unittest.TestCase):
    def test_loads_synthetic_corpus(self):
        documents = load_corpus(FIXTURES / "corpus.json")
        self.assertEqual(len(documents), 6)
        self.assertEqual(documents[0]["id"], "aurora-handbook")

    def test_chunks_keep_provenance(self):
        documents = load_corpus(FIXTURES / "corpus.json")
        chunks = chunk_documents(documents, max_characters=120, overlap_characters=20)
        self.assertGreater(len(chunks), len(documents))
        self.assertEqual(len({chunk["id"] for chunk in chunks}), len(chunks))
        for chunk in chunks:
            self.assertTrue(chunk["text"].strip())
            self.assertIn("document_id", chunk["metadata"])
            self.assertIn("version", chunk["metadata"])
            self.assertIn("chunk_ordinal", chunk["metadata"])


class EmbeddingTest(unittest.TestCase):
    def test_local_wiring_embedding_is_stable(self):
        first = deterministic_embedding("fictional query", dimensions=16)
        second = deterministic_embedding("fictional query", dimensions=16)
        self.assertEqual(first, second)
        self.assertEqual(len(first), 16)
        self.assertTrue(any(value != 0 for value in first))


class MetricTest(unittest.TestCase):
    def test_metrics_keep_retrieval_failures_visible(self):
        metrics = retrieval_metrics(
            ["wrong", "oriole-release", "other"],
            ["oriole-release", "aurora-handbook"],
            k=3,
        )
        self.assertAlmostEqual(metrics["precision_at_k"], 1 / 3)
        self.assertAlmostEqual(metrics["recall_at_k"], 1 / 2)
        self.assertAlmostEqual(metrics["reciprocal_rank"], 1 / 2)
        self.assertEqual(metrics["retrieved_count"], 3)
        self.assertEqual(metrics["relevant_count"], 2)


if __name__ == "__main__":
    unittest.main()

