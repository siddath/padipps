import unittest

from advanced_rag import (
    filter_by_metadata,
    reciprocal_rank_fusion,
    rerank_candidates,
    retrieval_metrics,
)


class MetadataTest(unittest.TestCase):
    def test_filter_requires_every_field(self):
        documents = [
            {"id": "a", "metadata": {"tenant": "north", "status": "published"}},
            {"id": "b", "metadata": {"tenant": "south", "status": "published"}},
            {"id": "c", "metadata": {"tenant": "north", "status": "draft"}},
            {"id": "d", "metadata": {"tenant": "north"}},
        ]
        self.assertEqual(
            [item["id"] for item in filter_by_metadata(
                documents, {"tenant": "north", "status": "published"}
            )],
            ["a"],
        )


class FusionTest(unittest.TestCase):
    def test_rrf_deduplicates_and_uses_stable_ties(self):
        fused = reciprocal_rank_fusion(
            [["b", "a", "c"], ["a", "b", "d"]], rank_constant=10
        )
        self.assertEqual([row["id"] for row in fused], ["a", "b", "c", "d"])
        self.assertGreater(fused[0]["score"], fused[2]["score"])


class RerankerTest(unittest.TestCase):
    def test_scorer_receives_each_candidate_once(self):
        calls = []

        def scorer(question, text):
            calls.append((question, text))
            return float(len(text))

        candidates = [{"id": "a", "text": "x"}, {"id": "b", "text": "longer"}]
        ranked = rerank_candidates("q", candidates, scorer)
        self.assertEqual([row["id"] for row in ranked], ["b", "a"])
        self.assertEqual(len(calls), 2)


class MetricTest(unittest.TestCase):
    def test_graded_metrics_keep_denominators(self):
        metrics = retrieval_metrics(
            ["d2", "d1", "d4"], {"d1": 3, "d2": 1, "d3": 2}, k=3
        )
        self.assertAlmostEqual(metrics["precision_at_k"], 2 / 3)
        self.assertAlmostEqual(metrics["recall_at_k"], 2 / 3)
        self.assertEqual(metrics["reciprocal_rank"], 1.0)
        self.assertGreater(metrics["ndcg_at_k"], 0.0)
        self.assertLessEqual(metrics["ndcg_at_k"], 1.0)
        self.assertEqual(metrics["judged_relevant_count"], 3)


if __name__ == "__main__":
    unittest.main()

