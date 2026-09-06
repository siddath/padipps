# Recoverable Slack / HubSpot connector

Continue the [shared capstone](../fde-capstone/README.md) in your own copy: tenant-a = Aster and
tenant-b = Birch.
This is an **unsolved**, fake-provider exercise. No real signing key, access token or SDK connection.

```sh
python3 -B -m unittest -v test_connector
```

Python 3.11+. Untouched tests must exit nonzero with TODO errors. Implement the functions in
`connector.py`; preserve the failing and passing output in one learning record.

## Signature contract

`verify_slack(raw_body, timestamp, signature, secret, now)` returns a boolean. Use Slack's documented
versioned HMAC scheme on the **raw bytes**, with constant-time comparison. Reject malformed input,
unsupported signature version, a timestamp more than 300 seconds away from the supplied clock,
and any tampering. The five-minute window follows Slack's verification example. The fixed key in
`signature-fixture.json` is **fictional public test material**, never a deployable secret.

Then sketch the HTTP boundary: verify → trusted installation-to-tenant lookup → deduplicated durable
event intent → acknowledgement. Write a failure test for a crash after persistence but before the
HTTP reply in your evolving API. A signature does not authorize arbitrary CRM access.

## HubSpot-shaped pull contract

`sync_contacts(client, store, tenant_id, sleep, max_retries=2)` returns the number of successfully
checkpointed pages during this run. These adapters are fictional interfaces:

- `await client.contacts(after)` returns `{results, paging?}`. `paging.next.after` is an opaque
  cursor. Initial cursor is null; a saved `store.get_checkpoint(tenant_id)` resumes work. A done
  checkpoint returns zero without another request.
- Each record has `id`, integer `version`, and `display_name`. Call
  `store.upsert(tenant_id, record)` for every result, then
  `store.save_checkpoint(tenant_id, {after: next_cursor, done: no_next_cursor})`.
- `RateLimited(retry_after)` calls injected `sleep(seconds)` before a retry. Permit at most
  `max_retries` retries per page, reset the budget after a successful page, and propagate exhaustion.
  Do not sleep in tests: the injected sleeper records the requested delay. Real endpoint/account
  rate contracts must be checked when choosing the SDK.
- Store failures propagate and cannot silently skip a page. Upsert identity is tenant plus object
  ID; an older version must not replace a newer one. The provided store simulates this contract;
  build and test actual persistence in your capstone rather than calling an in-memory pass durable.

Failure drills: duplicate objects across pages; 429 then recovery; endless 429; crash before
checkpoint then replay; missed webhook recovered by a full reconciliation; same object ID under
another tenant. For full reconciliation, explicitly reset only that tenant's scan checkpoint while
retaining idempotent records. Record deletion/tombstone handling as a separate unresolved provider
contract until you add and run a corresponding test. Do not delete records merely because a partial
page did not contain them.

Before the demo, write a three-sentence customer note for an expired CRM grant: observed effect,
bounded recovery and what needs the administrator's action. Cross-reference the earlier identity
and idempotency sessions by linking their existing evidence.
