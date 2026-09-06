import copy
import json
from pathlib import Path
import unittest
from connector import RateLimited, sync_contacts, verify_slack

SIGNATURE = json.loads(Path(__file__).with_name("signature-fixture.json").read_text())


class FakeClient:
    def __init__(self, pages, throttle=0):
        self.pages, self.throttle, self.calls = pages, throttle, []

    async def contacts(self, after):
        self.calls.append(after)
        if self.throttle:
            self.throttle -= 1
            raise RateLimited(2)
        return copy.deepcopy(self.pages[after])


class FakeStore:
    """Provided fake durability interface; this is not production persistence."""
    def __init__(self, crash_once=False):
        self.rows, self.checkpoints = {}, {}
        self.crash_once = crash_once

    def get_checkpoint(self, tenant):
        return self.checkpoints.get(tenant, {"after": None, "done": False})

    def upsert(self, tenant, row):
        key = (tenant, row["id"])
        if key not in self.rows or row["version"] > self.rows[key]["version"]:
            self.rows[key] = copy.deepcopy(row)

    def save_checkpoint(self, tenant, value):
        if self.crash_once:
            self.crash_once = False
            raise RuntimeError("fixture crash before checkpoint")
        self.checkpoints[tenant] = copy.deepcopy(value)


PAGES = {
    None: {"results": [{"id": "contact-1", "version": 2, "display_name": "Aster Revised"}], "paging": {"next": {"after": "opaque-2"}}},
    "opaque-2": {"results": [{"id": "contact-1", "version": 1, "display_name": "Aster Old"}, {"id": "contact-2", "version": 1, "display_name": "Aster Other"}]}
}


class SignatureContract(unittest.TestCase):
    def test_authentic_raw_bytes_and_tampering(self):
        f = SIGNATURE
        args = (f["body"].encode(), f["timestamp"], f["signature"], f["fictional_key"].encode(), f["now"])
        self.assertTrue(verify_slack(*args))
        self.assertFalse(verify_slack(args[0] + b" ", *args[1:]))
        self.assertFalse(verify_slack(args[0], args[1], "v0=" + "0" * 64, args[3], args[4]))

    def test_stale_future_and_malformed(self):
        f = SIGNATURE
        for timestamp, signature, now in [(f["timestamp"], f["signature"], f["now"] + 301), (f["timestamp"], f["signature"], f["now"] - 301), ("bad", f["signature"], f["now"]), (f["timestamp"], "v1=unknown", f["now"])]:
            with self.subTest(timestamp=timestamp, now=now):
                self.assertFalse(verify_slack(f["body"].encode(), timestamp, signature, f["fictional_key"].encode(), now))


class SyncContract(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.delays = []

    async def sleep(self, seconds):
        self.delays.append(seconds)

    async def test_pages_versions_and_complete_checkpoint(self):
        client, store = FakeClient(PAGES), FakeStore()
        self.assertEqual(await sync_contacts(client, store, "tenant-a", self.sleep), 2)
        self.assertEqual(client.calls, [None, "opaque-2"])
        self.assertEqual(len(store.rows), 2)
        self.assertEqual(store.rows[("tenant-a", "contact-1")]["display_name"], "Aster Revised")
        self.assertTrue(store.checkpoints["tenant-a"]["done"])
        self.assertEqual(await sync_contacts(client, store, "tenant-a", self.sleep), 0)

    async def test_rate_limit_budget(self):
        client, store = FakeClient(PAGES, throttle=1), FakeStore()
        await sync_contacts(client, store, "tenant-a", self.sleep)
        self.assertEqual(self.delays, [2])
        blocked = FakeClient(PAGES, throttle=10)
        with self.assertRaises(RateLimited):
            await sync_contacts(blocked, FakeStore(), "tenant-a", self.sleep, max_retries=2)
        self.assertEqual(len(blocked.calls), 3)

    async def test_checkpoint_crash_replays_without_duplicate(self):
        store = FakeStore(crash_once=True)
        with self.assertRaisesRegex(RuntimeError, "fixture crash"):
            await sync_contacts(FakeClient(PAGES), store, "tenant-a", self.sleep)
        self.assertNotIn("tenant-a", store.checkpoints)
        await sync_contacts(FakeClient(PAGES), store, "tenant-a", self.sleep)
        self.assertEqual(len(store.rows), 2)

    async def test_reconciliation_and_tenant_identity(self):
        store = FakeStore()
        await sync_contacts(FakeClient(PAGES), store, "tenant-a", self.sleep)
        repaired = {None: {"results": [{"id": "contact-1", "version": 3, "display_name": "Update missed by webhook"}]}}
        store.checkpoints["tenant-a"] = {"after": None, "done": False}
        await sync_contacts(FakeClient(repaired), store, "tenant-a", self.sleep)
        await sync_contacts(FakeClient(PAGES), store, "tenant-b", self.sleep)
        self.assertEqual(store.rows[("tenant-a", "contact-1")]["version"], 3)
        self.assertEqual(store.rows[("tenant-b", "contact-1")]["version"], 2)


if __name__ == "__main__":
    unittest.main()
