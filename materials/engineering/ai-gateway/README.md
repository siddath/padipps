# AI gateway boundary and eval contract

Implement `createGateway` in `gateway.mjs` against the injected fake provider. The gateway receives a fictional migration incident summary and must return a validated structured recommendation or a stable contract error. The exercise is about backend boundaries, adapter behavior, and deterministic evaluation.

The fixtures cover a valid response, refusal, invalid JSON, timeout, and unsafe output. There are no model integrations, paid calls, credentials, dependencies, or network calls.

Required error codes: `PROVIDER_REFUSAL`, `INVALID_PROVIDER_RESPONSE`, `PROVIDER_TIMEOUT`, and `UNSAFE_OUTPUT`.

## Prerequisites

- Node.js 20 or newer
- No package install, API key, or network access

## Run

From this folder:

```bash
node --test gateway.test.mjs
```

The untouched starter exits non-zero with five named TODO failures. Keep the provider injected and deterministic; do not replace it with a model SDK or live endpoint.

## Return evidence

Retain the exact command/output, source path, your accepted output schema, the mapping from each fake-provider outcome to a gateway result/error, and one sentence defining what the tests cannot prove. Manual review is required before treating the boundary as production-ready.
