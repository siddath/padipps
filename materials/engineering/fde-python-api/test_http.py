"""Run separately with FastAPI and httpx installed; not a real-network test."""
import unittest
from fastapi.testclient import TestClient
from web import create_app
from test_core import FakeCRM


class HTTPContract(unittest.TestCase):
    def test_route_maps_success_and_fields(self):
        with TestClient(create_app(FakeCRM())) as client:
            result = client.get("/contacts/contact-1", headers={"X-Tenant-Id": "tenant-a"})
            self.assertEqual(result.status_code, 200)
            self.assertEqual(result.json(), {"id": "contact-1", "display_name": "Aster Example"})

    def test_missing_fixture_tenant(self):
        with TestClient(create_app(FakeCRM())) as client:
            result = client.get("/contacts/contact-1")
            self.assertEqual((result.status_code, result.json()), (400, {"error": "invalid_request"}))

    def test_provider_error_is_publicly_bounded(self):
        with TestClient(create_app(FakeCRM(failure=ValueError("fixture-secret")))) as client:
            result = client.get("/contacts/contact-1", headers={"X-Tenant-Id": "tenant-a"})
            self.assertEqual((result.status_code, result.json()), (502, {"error": "upstream_failure"}))

    def test_openapi_describes_route(self):
        with TestClient(create_app(FakeCRM())) as client:
            schema = client.get("/openapi.json").json()
            self.assertIn("get", schema["paths"]["/contacts/{contact_id}"])


if __name__ == "__main__":
    unittest.main()
