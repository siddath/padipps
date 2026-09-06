# Assistant API boundary — independent starter

This is an **unsolved** step in the [shared fictional capstone](../fde-capstone/README.md).
Use tenant-a for Aster and tenant-b for Birch. Extend the same capstone copy, not a second project.

First reconstruct the recognition, model, and decision in the pack. Copy this folder to your
practice area, implement it yourself, then record the exact command, output, artifact, and limitation
in your learning record. No live Slack or CRM account is needed.

## Run

Python 3.11+ is required. From your copied folder:

```sh
python3 -B -m unittest -v test_core
```

Expected untouched result: **nonzero**, with `NotImplementedError: TODO learner implementation`.
These tests exercise an injected fake provider only. They do not start an HTTP server.

The second checkpoint is real FastAPI routing via its in-process ASGI test client. Install only in
your own disposable environment; the starter installs nothing:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install 'fastapi>=0.115,<1' 'httpx>=0.28,<1'
.venv/bin/python -m unittest -v test_http
.venv/bin/python -m pip freeze > dependency-versions.txt
```

Record resolved versions. Missing packages mean **HTTP checks not run**, not an implementation pass.
Neither test set proves real-network delivery, provider durability, deployment or authorization.

## Implement the contract

1. `contact_response(client, tenant_id, contact_id, timeout_s=1)` returns `(status, body)`.
   Accept nonempty string IDs of at most 100 characters, with no whitespace. Invalid input returns
   `(400, {"error":"invalid_request"})` without contacting the provider. Await
   `client.get_contact(tenant_id, contact_id)` with a deadline. A valid provider object contains
   string `id` and `display_name`; expose only those two fields. Missing/malformed fields map to
   `(502, {"error":"upstream_failure"})`. Timeout maps to 504 / `upstream_timeout`; provider
   exceptions map to 502 / `upstream_failure`. Propagate caller cancellation. Never echo exceptions.
2. `graphql_result(payload)` returns `{status, data}` with `status` complete, partial or failed.
   Non-null `data` without nonempty `errors` is complete; data plus nonempty errors is partial;
   absent/null data is failed with data null. Never turn a partial GraphQL result into REST success
   without choosing and documenting the customer contract. This classifier is not a GraphQL server.
3. Implement `create_app(client)` in `web.py`: `GET /contacts/{contact_id}` reads the fixture tenant
   from `X-Tenant-Id`, calls the core and returns its exact status/body. A missing header maps to the
   core's 400. This header is an **untrusted development fixture**, replaced by validated identity
   in the next session. Never expose this starter to the internet.
4. Add your own `POST /events` webhook request/response model and at least three tests: invalid
   body, durable acceptance, uncertain storage outcome. Define what 202 means before implementing
   the route. Do not acknowledge successful processing when you only accepted work. Signature and
   tenant binding arrive in the connector and identity sessions.
5. Inspect one chosen third-party SDK's documented sync/async contract. Write an adapter boundary
   and a bounded-offloading decision if it blocks; do not add real credentials or vendor calls.

## Deliver and explain

Keep a short `decision.md`: customer acceptance example, REST/GraphQL choice, timeout/cancellation
policy, SDK contract, evidence actually run and next unsupported integration. Demonstrate why the
heartbeat test checks cooperative scheduling rather than claiming a throughput benchmark.
