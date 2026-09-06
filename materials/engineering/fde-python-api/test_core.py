import asyncio
import unittest
from starter import contact_response, graphql_result


class FakeCRM:
    def __init__(self, value=None, failure=None):
        self.value = value if value is not None else {"id": "contact-1", "display_name": "Aster Example", "email": "fiction@example.invalid"}
        self.failure, self.calls = failure, []

    async def get_contact(self, tenant_id, contact_id):
        self.calls.append((tenant_id, contact_id))
        if self.failure:
            raise self.failure
        return self.value


class APIContract(unittest.IsolatedAsyncioTestCase):
    async def test_returns_only_agreed_fields(self):
        client = FakeCRM()
        self.assertEqual(await contact_response(client, "tenant-a", "contact-1"), (200, {"id": "contact-1", "display_name": "Aster Example"}))
        self.assertEqual(client.calls, [("tenant-a", "contact-1")])

    async def test_invalid_input_never_calls_sdk(self):
        for tenant, contact in [("", "x"), (None, "x"), ("a b", "x"), ("a", "x" * 101)]:
            with self.subTest(tenant=tenant, contact=contact):
                client = FakeCRM()
                self.assertEqual(await contact_response(client, tenant, contact), (400, {"error": "invalid_request"}))
                self.assertEqual(client.calls, [])

    async def test_provider_exception_does_not_leak(self):
        self.assertEqual(await contact_response(FakeCRM(failure=ValueError("fictional-secret")), "tenant-a", "contact-1"), (502, {"error": "upstream_failure"}))

    async def test_malformed_provider_object(self):
        self.assertEqual(await contact_response(FakeCRM(value={"id": 123}), "tenant-a", "contact-1"), (502, {"error": "upstream_failure"}))

    async def test_deadline(self):
        class StalledCRM:
            async def get_contact(self, *_):
                await asyncio.Event().wait()
        self.assertEqual(await contact_response(StalledCRM(), "tenant-a", "contact-1", timeout_s=0.01), (504, {"error": "upstream_timeout"}))

    async def test_caller_cancellation_propagates(self):
        with self.assertRaises(asyncio.CancelledError):
            await contact_response(FakeCRM(failure=asyncio.CancelledError()), "tenant-a", "contact-1")

    async def test_other_task_progresses_while_provider_waits(self):
        started, release = asyncio.Event(), asyncio.Event()
        class GatedCRM:
            async def get_contact(self, *_):
                started.set()
                await release.wait()
                return {"id": "contact-1", "display_name": "Aster Example"}
        task = asyncio.create_task(contact_response(GatedCRM(), "tenant-a", "contact-1"))
        try:
            await asyncio.wait_for(started.wait(), 0.2)
            self.assertFalse(task.done())
            release.set()
            self.assertEqual((await task)[0], 200)
        finally:
            if not task.done():
                task.cancel()
            await asyncio.gather(task, return_exceptions=True)


class GraphQLContract(unittest.TestCase):
    def test_complete_partial_and_failed_are_distinct(self):
        for payload, expected in [
            ({"data": {"contact": 1}}, {"status": "complete", "data": {"contact": 1}}),
            ({"data": {"contact": 1}, "errors": [{"message": "restricted"}]}, {"status": "partial", "data": {"contact": 1}}),
            ({"errors": [{"message": "invalid query"}]}, {"status": "failed", "data": None}),
            ({"data": None}, {"status": "failed", "data": None})
        ]:
            with self.subTest(payload=payload):
                self.assertEqual(graphql_result(payload), expected)


if __name__ == "__main__":
    unittest.main()
