import math
import unittest

from foundations import (
    build_responses_request,
    cosine_similarity,
    parse_and_validate_incident_label,
)


class CosineSimilarityTest(unittest.TestCase):
    def test_direction_and_scale(self):
        self.assertAlmostEqual(cosine_similarity([1, 2], [2, 4]), 1.0)
        self.assertAlmostEqual(cosine_similarity([1, 0], [0, 1]), 0.0)
        self.assertAlmostEqual(cosine_similarity([1, 0], [-3, 0]), -1.0)

    def test_rejects_invalid_vectors(self):
        invalid_pairs = [
            ([], []),
            ([1], [1, 2]),
            ([0, 0], [1, 1]),
            ([1, 1], [0, 0]),
            ([True, 1], [1, 1]),
            ([math.inf, 1], [1, 1]),
        ]
        for left, right in invalid_pairs:
            with self.subTest(left=left, right=right):
                with self.assertRaises((TypeError, ValueError)):
                    cosine_similarity(left, right)


class StructuredOutputTest(unittest.TestCase):
    def test_accepts_exact_contract(self):
        value = parse_and_validate_incident_label(
            '{"severity":"high","summary":"Checkout retries exhausted"}'
        )
        self.assertEqual(
            value,
            {"severity": "high", "summary": "Checkout retries exhausted"},
        )

    def test_rejects_malformed_or_out_of_contract_json(self):
        invalid = [
            "not json",
            "[]",
            '{"severity":"urgent","summary":"x"}',
            '{"severity":"low","summary":"   "}',
            '{"severity":"low","summary":"x","action":"deploy"}',
            '{"severity":1,"summary":"x"}',
            '{"severity":"low","summary":1}',
            '{"severity":"low","summary":"' + ("x" * 161) + '"}',
        ]
        for payload in invalid:
            with self.subTest(payload=payload[:40]):
                with self.assertRaises((TypeError, ValueError)):
                    parse_and_validate_incident_label(payload)


class RequestShapeTest(unittest.TestCase):
    def test_request_is_inspectable_and_strict(self):
        request = build_responses_request("The checkout worker retried three times.")
        self.assertIsInstance(request, dict)
        self.assertNotIn("api_key", request)
        self.assertNotIn("authorization", request)
        self.assertEqual(request["store"], False)
        roles = [item["role"] for item in request["input"]]
        self.assertEqual(roles, ["system", "user", "assistant", "user"])
        schema = request["text"]["format"]
        self.assertEqual(schema["type"], "json_schema")
        self.assertTrue(schema["strict"])
        self.assertFalse(schema["schema"]["additionalProperties"])


if __name__ == "__main__":
    unittest.main()

