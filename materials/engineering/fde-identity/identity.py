"""Post-validation policy exercise. This module must not parse or verify tokens."""


def authorize_claims(claims, policy, used_assertions):
    """Deny or return a tenant-bound principal; see README for adapter trust limits."""
    raise NotImplementedError("TODO learner implementation")
