import copy
import json
from pathlib import Path
import unittest
from identity import authorize_claims

FIXTURE = json.loads(Path(__file__).with_name("fixtures.json").read_text())


class IdentityContract(unittest.TestCase):
    def test_allowed_oidc_and_saml(self):
        for protocol in ("oidc", "saml"):
            with self.subTest(protocol=protocol):
                self.assertEqual(authorize_claims(copy.deepcopy(FIXTURE[protocol]), copy.deepcopy(FIXTURE["policy"]), set()), {"allowed": True, "tenant_id": "tenant-a", "subject": "user-1"})

    def test_all_denials(self):
        for case in FIXTURE["denials"]:
            with self.subTest(case=case["id"]):
                claims = copy.deepcopy(FIXTURE[case["base"]])
                claims.update(case["change"])
                self.assertEqual(authorize_claims(claims, copy.deepcopy(FIXTURE["policy"]), set()), {"allowed": False})

    def test_saml_replay(self):
        seen = set()
        self.assertTrue(authorize_claims(copy.deepcopy(FIXTURE["saml"]), copy.deepcopy(FIXTURE["policy"]), seen)["allowed"])
        self.assertEqual(authorize_claims(copy.deepcopy(FIXTURE["saml"]), copy.deepcopy(FIXTURE["policy"]), seen), {"allowed": False})

    def test_revoked_membership_and_other_tenant(self):
        for change in ("revoke", "tenant"):
            policy = copy.deepcopy(FIXTURE["policy"])
            if change == "revoke":
                policy["memberships"][0]["active"] = False
            else:
                policy["requested_tenant"] = "tenant-b"
            self.assertEqual(authorize_claims(copy.deepcopy(FIXTURE["oidc"]), policy, set()), {"allowed": False})

    def test_missing_identity_denies(self):
        self.assertEqual(authorize_claims({}, copy.deepcopy(FIXTURE["policy"]), set()), {"allowed": False})


if __name__ == "__main__":
    unittest.main()
