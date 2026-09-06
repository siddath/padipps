import unittest
from controls import audit_event

PUBLIC = {"event_id": "evt-1", "at": "2026-09-06T12:00:00Z", "tenant_id": "tenant-a", "actor_ref": "usr-1", "resource_ref": "contact-1", "action": "read", "outcome": "allowed"}


class AuditContract(unittest.TestCase):
    def test_only_allowed_metadata_survives(self):
        event = {**PUBLIC, "email": "fiction@example.invalid", "access_token": "fictional-not-a-token", "prompt": "private fixture document", "nested": {"secret": "fictional"}, "ip": "192.0.2.1"}
        self.assertEqual(audit_event(event), PUBLIC)

    def test_missing_and_invalid_fields(self):
        for key, value in [("event_id", ""), ("actor_ref", "fiction@example.invalid"), ("resource_ref", "a" * 101), ("outcome", "maybe"), ("action", "dump-all"), ("at", "2026-02-31T12:00:00Z"), ("tenant_id", {"nested": "value"})]:
            with self.subTest(key=key):
                with self.assertRaises(ValueError):
                    audit_event({**PUBLIC, key: value})
        with self.assertRaises(ValueError):
            audit_event({})

    def test_input_is_not_mutated(self):
        original = {**PUBLIC, "prompt": "fixture-private"}
        audit_event(original)
        self.assertEqual(original["prompt"], "fixture-private")


if __name__ == "__main__":
    unittest.main()
