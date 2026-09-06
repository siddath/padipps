"""Unsolved Slack verification and fake HubSpot synchronization contracts."""


class RateLimited(Exception):
    def __init__(self, retry_after):
        super().__init__("fictional provider rate limit")
        self.retry_after = retry_after


def verify_slack(raw_body, timestamp, signature, secret, now):
    raise NotImplementedError("TODO learner implementation")


async def sync_contacts(client, store, tenant_id, sleep, max_retries=2):
    raise NotImplementedError("TODO learner implementation")
