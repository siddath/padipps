# Identity and tenant binding — independent starter

Continue the [same fictional Slack/HubSpot capstone](../fde-capstone/README.md): tenant-a is Aster
and tenant-b is Birch. This is unsolved. Copy it into your capstone project and keep one learning record.

```sh
python3 -B -m unittest -v test_identity
```

Python 3.11+, standard library only. Expected untouched result: **nonzero**, TODO exceptions.
`fixtures.json` is a **parsed-claims policy simulation**. It contains no JWTs, XML signatures or
credentials. Its `signature_verified` flag represents a prior maintained-library result; accepting
that boolean from an actual client would be insecure. These tests cannot prove cryptography or SSO.

Implement `authorize_claims(claims, policy, used_assertions)` returning either
`{"allowed": false}` or `{"allowed": true, "tenant_id": "tenant-a", "subject": "user-1"}`.
The fake trusted adapter must report a verified signature, the configured issuer and audience,
`not_before <= now < expires_at`, an allowed current membership for (issuer, subject), and the
required action scope. An OIDC login must match the expected nonce. A SAML login must match
recipient and `in_response_to`, have an unused assertion ID, and consume that ID on success.
Any missing required input denies. Read requested tenant from the policy set by the application;
never turn a token's arbitrary tenant claim or email domain into membership.

The fixture action scope is the adapter's normalized **resource grant**, not an assertion that
OIDC ID tokens or SAML assertions intrinsically carry OAuth API scopes. Your protocol diagram must
show login identity, Slack app installation and HubSpot OAuth grant as three separate paths.

Complete `protocol-review.md` before wiring real identity. Then in your capstone, replace the API
fixture tenant header with a maintained OIDC/SAML library and a disposable local IdP. Document the
chosen library, version, exact startup/configuration and test commands. Exercise a real bad
signature, wrong audience, replay, redirect mismatch, expired assertion, rotated signing key and
revoked membership. No external IdP account or deployment is required by this starter.

Record the real-IdP checkpoint as **not run** until you have executed it. A written diagram and
green parsed-claims tests are limited evidence, never a live SSO claim. Record the actual result,
remaining gap, and next retrieval question in your learning record.
