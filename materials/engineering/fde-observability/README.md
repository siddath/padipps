# Observe one customer journey

Continue [the same capstone](../fde-capstone/README.md) in `delivery/observability/`. Aster and Birch still share the assistant you built. Do not create a second service or copy real Slack, HubSpot or document data into telemetry.

Open with the discovery acceptance scenario: which user task must succeed, what counts as failure, and who investigates? Reconstruct one request across the asynchronous queue before viewing your earlier diagram.

## Independent VS Code work

1. Implement `analyze.mjs` from its contract using `telemetry.json`. Deduplicate exact redeliveries by event ID; reject conflicting duplicates. Validate numeric durations and allowed outcomes. Count success, dependency errors and denied outcomes separately, and leave an empty rate unavailable. Do not change fixture tests to manufacture a pass.
2. Instrument your existing Python/FastAPI application with OpenTelemetry using a console exporter or a local collector/backend you configure. Create a sanitized trace for Slack ingestion, queued work, HubSpot stub calls, permission-filtered retrieval and reply. Establish actual propagation across the queue and test a broken propagation case.
3. Author `panels-and-alerts.md`: health, useful usage, SLI and contractual SLA status. Specify numerator/denominator, window, units, missing-data behavior and low-cardinality labels. The fictional exercise has no agreed SLA. Any proposed target is configurable and is an exercise assumption, never a customer promise.
4. Inject one delayed/unavailable HubSpot stub and one access-denied document request. Compare user completion with pod health. Trigger and recover an alert with a named operator action. Inspect output for forbidden content such as credentials, message bodies, prompts and document text; tenant correlation itself also needs a scoped privacy decision.

## Commands and what they prove

Node.js 20+ is sufficient for the offline exercise. In your copied observability folder:

```bash
node --test analyze.test.mjs
```

Untouched tests fail with `TODO`. A pass establishes only the synthetic analyzer contract. Actual tracing requires your Python environment, your pinned OpenTelemetry API/SDK/instrumentation packages and a local exporter. Use the official instrumentation guide for versions compatible with your app; retain your own install/start/fault commands and real output. A file of invented spans is not a captured application trace, and a dashboard screenshot is not an alert test.

Run the customer acceptance and denial requests from your earlier capstone tests, inspect emitted spans, then repeat with the stub fault enabled. Record the exact invocation you implemented and the observed start/end of the fault. Do not use an arbitrary shell request against a real CRM.

## Return evidence

Record actual trace IDs, scrubbed output, panel queries, fault and alert receipts, the fixture command, a zero-traffic interpretation, and one limitation in your learning record. If telemetry/runtime tools were not run, preserve that gap; do not label the exercise mastered from fixture output.

Sources: [OpenTelemetry Python instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/), [sensitive telemetry](https://opentelemetry.io/docs/security/handling-sensitive-data/), [SRE alerting](https://sre.google/workbook/alerting-on-slos/).
