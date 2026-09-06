# Production-readiness capstone for a fictional knowledge assistant

Design and implement one reviewable MVP for the fictional Aster knowledge assistant used in the preceding lessons. Reuse your retrieval, single-agent, multi-agent and evaluation evidence where it applies. Choose the smallest architecture that meets the written acceptance criteria.

This is an independent capstone and can span multiple focused blocks. Nothing in this directory is a completed service, a deployment, a model result, or evidence of mastery. All customer names, documents and incidents are fictional.

The existing `ai-gateway` and `job-api` materials are optional companion practice for output adaptation and idempotent HTTP jobs. Link evidence from those exercises if you use it; do not rebuild or claim completion of those lessons here.

## Fictional request

Aster support staff want to ask policy questions and receive concise answers with document citations. The MVP serves a single fictional tenant from a supplied local corpus. It may draft an answer, clarify an ambiguous request, refuse an unauthorized request, or escalate a policy exception. It never approves refunds, edits records, sends messages, or reads arbitrary files or URLs.

## Decide the architecture from evidence

Write an ADR using `templates/ADR-000-template.md`. Compare at least:

- deterministic retrieval plus response formatting;
- RAG with one model response;
- one bounded tool-using agent;
- the bounded research, writer and critic graph.

Choose based on acceptance criteria and evidence: retrieval quality, workflow variability, permission boundary, failure recovery, measured latency/cost units, team operating burden and eval results. Do not choose a multi-agent graph because it sounds more advanced. If a deterministic or single-call design meets the contract, prefer its smaller failure surface.

Record the model/provider interface as an adapter even if the exercise uses only a fake. Record the resolved stack and version receipts when you implement. A framework is an implementation choice, not the architecture.

## MVP scope and explicit cuts

The baseline MVP includes:

- one request endpoint or callable service boundary;
- validated tenant, role, question and request/idempotency key;
- only the read-only local fixture search/read capabilities needed by the chosen design;
- a typed answer with disposition and citations;
- bounded time, model/tool calls, context, output and retry attempts;
- cancellation propagation;
- deterministic fixture evaluation and regression thresholds;
- redacted traces and a minimal operator runbook;
- a demo script that includes a success, clarification/refusal and failure recovery.

Cuts for the baseline: live CRM/document connectors, write tools, shared accounts, background crawling, long-term personalization, multi-tenant production storage, hosted deployment, autonomous actions, mobile UI, billing and model training. A cut can return only after its owner, threat model, acceptance criteria and evidence plan exist.

## Production-readiness contracts

Complete `service.py` and the templates. Address each boundary below in design, code and tests.

### Timeout, retry and idempotency

Use deadlines that propagate through the whole request. A timeout does not prove that a downstream side effect did not occur. Retry only declared transient, idempotent operations, with a small attempt ceiling and backoff/jitter policy. Do not nest independent retry loops at every layer.

Bind the idempotency key to tenant, caller and normalized operation. Concurrent duplicates must converge on one logical result or one documented in-progress outcome. Define retention and conflict behavior. The baseline tools are read-only, but the request boundary still needs duplicate semantics.

### Cancellation and overload

Check cancellation before expensive work and between stages; stop owned work and return a stable cancelled outcome. Bound concurrency and queue length. Reject or shed work explicitly when capacity is exhausted. Record how a reviewer can distinguish timeout, cancellation, overload and provider failure.

The small values in `ServiceLimits` are reversible exercise defaults chosen to make timeout, overload and exhaustion paths easy to trigger in local tests. They are not production recommendations. Keep or replace them only after recording the workload assumption and measured receipt.

### Security and guardrails

Treat request text, retrieved documents, tool output and prior model output as untrusted. Enforce tenant and role authorization in application code. Allowlist tool names and arguments, validate structured output, restrict egress, keep secrets out of prompts and logs, and require a human decision for policy exceptions. Add direct/indirect injection, cross-tenant, data-exfiltration, unauthorized-tool and unsafe-output tests.

### Observability and data handling

Trace request ID, idempotency status, stage/node, tool name, result status, duration, retry count, budget usage, citations and stable error code. Redact content and sensitive values by default. Define log access, retention and deletion. A trace supports diagnosis; it is not permission to retain full prompts or documents.

### Cost and latency

Set per-request call/token units and an end-to-end latency objective from the exercise contract or a clearly labeled reversible default. Measure fixture/runtime units rather than inventing prices. Record p50/p95 only from actual samples with count, window and configuration. Decide what degrades or stops when a budget is reached.

### Evaluation regression

Run the frozen `ai-context-evals` dataset before a release candidate. Define thresholds and critical-case zero-tolerance rules before viewing the new result. Block on missing denominators, cross-tenant disclosure, unauthorized tool use or unreviewed dataset changes. Store actual results separately from the blank templates.

## Architecture review

Use `templates/architecture-review.md` with a peer or reviewer. The reviewer should challenge the user/problem, chosen architecture, trust boundaries, state and retention, failure matrix, budgets, eval coverage, rollback and claim boundary. Record questions and decisions. A self-review may prepare the artifact but does not count as independent review.

## Implementation and verification

`service.py` is intentionally unfinished. Use `fixtures/requests.json` and the fictional corpus from earlier lessons, or copy a versioned subset into your own capstone project. Keep every dependency injected so tests make no network or provider calls.

At minimum verify:

- valid cited answer;
- ambiguous request;
- unauthorized role and cross-tenant request;
- duplicate and conflicting idempotency keys;
- timeout before completion and late downstream response;
- cancellation before start and between stages;
- transient failure within and beyond the retry ceiling;
- overload/concurrency limit;
- malformed model/tool output;
- direct and indirect prompt injection;
- trace redaction canaries;
- frozen eval regression, with raw counts and denominators.

Fill `templates/eval-results-template.md` only from recorded runs and `templates/operations-template.md` with commands a reviewer actually executed. Do not claim a deployment from a local server, a passing synthetic suite, a screenshot or a diagram.

## Demo and structured feedback

Use `templates/demo-script-template.md`. In 8–10 minutes:

1. state the fictional user, problem, scope and cuts;
2. show one architecture decision and the trust/tool boundary;
3. run one success case with citations;
4. run one refusal or clarification;
5. inject one failure and show the bounded, observable recovery;
6. show the eval denominators and one failure you fixed or still accept;
7. close with verified facts, prototype limitations and the next falsifiable test.

Ask the reviewer for structured feedback on correctness, architecture choice, security boundary, operability, evidence quality and explanation clarity. Keep the raw feedback, your disposition for each item and a follow-up owner/date. Never relabel a local prototype as deployed or user-validated.

## Completion evidence

Return the completed ADR, scoped implementation, deterministic tests and raw output, eval results with dataset/config hashes, redacted traces, operations/runbook receipt, architecture review, demo receipt and structured feedback. Mark each claim `verified locally`, `reviewed`, `deployed` or `not verified` as applicable. These states are distinct.

## Primary references

- [AWS Builders' Library: Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
- [AWS Builders' Library: Timeouts, retries and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [OWASP LLM prompt injection prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [OpenTelemetry generative AI semantic conventions source](https://github.com/open-telemetry/semantic-conventions/tree/main/docs/gen-ai)
- [OpenAI evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
