# Security evidence for the fictional assistant

Continue the [same capstone](../fde-capstone/README.md), tenant-a/Aster and tenant-b/Birch.
This is unsolved; use only invented data.

```sh
python3 -B -m unittest -v test_controls
```

Python 3.11+, standard library only. Untouched result: **nonzero**, TODO exceptions.
Implement `audit_event(event)` in your own copy. Return exactly the allowlisted fields:
`event_id`, `at`, `tenant_id`, `actor_ref`, `resource_ref`, `action`, `outcome`. Values must be
nonempty strings up to 100 characters; fields except `at` accept only ASCII letters/digits plus
`-_.:`. `at` must be a UTC timestamp `YYYY-MM-DDTHH:MM:SSZ` that parses as a real date. Invalid or
missing required fields raise ValueError. Drop all extra fields. Action is one of `read`, `sync`,
`deny`, `delete`; outcome is `allowed`, `denied`, `failed` or `completed`.

Stable references are **pseudonymous identifiers**, not anonymization. They still need access and
retention controls. A regex is not a general-purpose PII detector. The contract avoids arbitrary
free text; downstream lookup permissions are a separate boundary.

## Produce the control evidence

Fill `control-evidence.md`; do not label these controls implemented merely because the table
exists. Trace synthetic contact data through Slack, HubSpot, ingestion, model context, answer
cache, logs and backups. For each copy specify purpose, access, retention and deletion behavior.
Rehearse: (a) contact deletion with a stale answer cache, (b) unauthorized audit reader,
(c) a rotated/unavailable encryption key, (d) a failed provider request containing a fake token.

Implement TLS and encryption-at-rest using maintained infrastructure/libraries in your disposable
capstone environment. Record configuration **and** observed negative/restore tests. Example check
after you have built a local TLS endpoint on 8443 using a test CA:

```sh
openssl s_client -connect localhost:8443 -servername localhost -verify_return_error -CAfile test-ca.pem
```

Repeat with an unrelated test CA and preserve the rejection. For encrypted persistence, inspect
the actual stored representation and demonstrate authorized read, unavailable-key failure and
restore after the key is available. Do not put encryption keys or real data in screenshots/logs.
The starter has not provisioned TLS, keys, encryption, or an audit service; unexecuted checks remain
**unverified**. Do not write your own cryptographic primitive.

## Scope the words

Use the pack's linked AICPA, EUR-Lex, and HHS sources. SOC 2 is an examination of scoped
service-organization controls. GDPR review includes personal-data purpose, roles, minimization
and appropriate safeguards. HIPAA applicability depends on covered-entity/business-associate
relationships and protected health information; do not infer it from the word healthcare alone.
The security/privacy/audit owners must decide applicability and contractual requirements.
This exercise supplies engineering evidence, not legal advice, certification or a compliance
determination. No real PHI or customer data is part of the capstone.

Record the audit test output and the completed, honestly labelled matrix in your learning record.
