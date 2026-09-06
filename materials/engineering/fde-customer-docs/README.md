# Handover without hidden knowledge

Continue [the existing capstone](../fde-capstone/README.md) in `delivery/handover/`. Reuse the current API, deployment, learning evidence, and product-design artifacts. The reader is a fictional customer administrator installing Aster or Birch and an operator investigating a failed answer.

Revisit discovery before writing: which first task must this reader finish, what access do they actually have, and what result tells them they succeeded? Write unknowns as questions for a future real customer, not as confirmed answers.

## Independent VS Code work

1. Replace the empty paths in `openapi.json` with a reference derived from your implemented FastAPI routes. Choose a version supported by your tools. Include authentication, tenant boundaries, request/response schemas, error outcomes, pagination where present and retry/idempotency semantics. Do not invent an endpoint your implementation does not provide.
2. Write `handover.md`: prerequisites, a clean local installation, synthetic configuration, verification, first tenant onboarding, document ACL setup, first cited answer, recovery, rollback limits and local uninstall. Every command must name its environment and expected result. Keep the document and examples credential-free.
3. Write `runbook.md` around four symptoms: citation absent, permission denied, repeated webhook and delayed HubSpot response. Explain the discriminating evidence, safe next action and escalation boundary. Match the accessible operator flow from `ux-implementation`; do not duplicate that session's evidence.
4. Execute documented examples against your local API. Include success, missing authentication, wrong-tenant denial, invalid input and a stub outage. Fix mismatches between schema, response and guide. HTTP transport success alone is not application success.
5. Start from a clean local context and follow the guide without relying on your shell history. Ask a consenting reader to try the task if available; otherwise label this a self-run walkthrough. Record each blocked step and your revision in `walkthrough.md`. Check keyboard navigation, status clarity and recovery instructions using the same task.

## Commands and requirements

Node.js 20+ checks that your reference remains parseable JSON; it does not validate OpenAPI semantics:

```bash
node -e "JSON.parse(require('node:fs').readFileSync('openapi.json','utf8')); console.log('JSON parsed; schema and API behavior still require verification')"
```

For a local FastAPI app serving on the explicitly chosen loopback port 8000:

```bash
curl --fail-with-body http://127.0.0.1:8000/openapi.json -o observed-openapi.json
```

The port and docs route are configurable exercise assumptions; use and record your app's actual values. Compare the observed schema with your reference using an OpenAPI validator compatible with the chosen version. Then run your own previously authored API contract tests and record actual requests/status/body for the five outcomes above. No live credentials or third-party calls are required. Without an actual app, report documentation draft only.

## Return evidence

Record the API reference, guide, runbook, observed responses, and walkthrough revision in your learning record. State the exact delivered version and whether the reader was you or another person. A JSON parse or checkbox does not prove correct API documentation, usable onboarding, or customer acceptance.

Sources: [OpenAPI specification](https://spec.openapis.org/oas/latest.html), [Diátaxis](https://diataxis.fr/).
