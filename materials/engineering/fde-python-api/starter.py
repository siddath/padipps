"""Unsolved adapter contracts; fictional providers only."""


async def contact_response(client, tenant_id, contact_id, timeout_s=1.0):
    """Return (HTTP status, bounded public body), preserving cancellation."""
    raise NotImplementedError("TODO learner implementation")


def graphql_result(payload):
    """Classify data/errors without claiming a complete GraphQL integration."""
    raise NotImplementedError("TODO learner implementation")
