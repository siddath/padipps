# Idempotent migration job service

Implement the dependency-free in-memory core in `job-service.mjs`. The fictional operator submits a LegacyLedger-to-NovaLedger migration with an idempotency key. The core must validate input, deduplicate an exact retry, reject reuse of a key with a different payload, and expose jobs without duplicate records.

`contract.md` is a separate blank design exercise for the HTTP boundary, SQL persistence, and Spring transaction behavior. Do not add a server, database driver, Spring project, or package dependency here.

## Prerequisites

- Node.js 20 or newer
- No package install or network service

## Run

From this folder:

```bash
node --test job-service.test.mjs
```

The untouched starter exits non-zero with four named TODO failures. Implement `createJobService` without changing the tests.

## Return evidence

Retain the exact command/output, source path, one explanation of the idempotency invariant, one rejected-conflict example, and your completed `contract.md`. Record whether the result was assisted and keep independent review separate.
