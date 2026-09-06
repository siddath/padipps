# Build a bounded research, writer and critic graph

Implement the unfinished LangGraph starter for the same fictional Aster knowledge assistant. The graph receives one question and a small injected fixture corpus, routes the request, gathers evidence, drafts an answer, and asks a critic to return structured revision findings. It must stop after a finite number of revisions or return a typed failure.

This exercise uses multiple components to make boundaries visible. It does not assume that more agents improve quality. The implementation may span several focused blocks beyond the guided Padipps lesson.

## Choose the architecture before coding

Write a one-page `DESIGN.md` that compares:

- one model call with supplied context;
- one tool-using agent;
- a deterministic research then write workflow;
- the proposed research, writer and critic graph.

Use the multi-agent graph only if the task benefits from at least one concrete property: independent work that can run in parallel, specialist instructions or tools, separation of untrusted context from privileged decisions, or an independently testable critic handoff. Include the added model calls, latency, state, failure paths and evaluation surface in the decision.

## Required graph

Complete `pipeline.py` as a LangGraph `StateGraph` with explicit typed state and these logical stages:

```text
validate -> route -> research -> write -> critic
                        ^          |
                        | revise   |
                        +----------+
                              max two revisions
```

The route may choose `answer_from_request`, `research_then_write`, `clarify`, or `refuse`. A rule-based router is acceptable and preferable when the fixture categories are known. If you use a model router, validate its structured output and keep its call inside the same budget.

The research stage receives only the normalized question, tenant ID and read-only fixture search capability. The writer receives the question plus compact research records. The critic receives the question, draft, citations and a public rubric. No stage receives credentials, arbitrary tools, another tenant's documents or the full private state by default.

The orchestrator owns routing, budgets, cancellation and final assembly. Workers return data; they do not call each other or gain shared arbitrary tool authority. The two-revision ceiling is a reversible exercise default: it permits a visible repair path while guaranteeing termination. Retain or replace it only with a written rationale and measured evidence.

## Handoff contracts

Define and validate these handoffs:

- `ResearchRequest`: request ID, tenant ID, normalized question, allowed document IDs and result limit.
- `ResearchResult`: status, findings, observed document IDs, warnings and bounded usage metadata.
- `DraftAnswer`: answer, citation IDs and unresolved questions.
- `Critique`: verdict (`accept`, `revise`, `refuse`), findings with rubric IDs, and no free-form tool requests.
- `PipelineResult`: stable status, answer or failure, citations, revision count, and a redacted node trace.

A handoff is a data contract, not an authority grant. Validate IDs and lengths at every boundary. The writer may cite only documents present in `ResearchResult`. The critic may request a revision but cannot dispatch research, modify state directly, or extend its own budget.

## Memory, consent and retention

Default to one-run memory only. LangGraph state and an in-memory checkpointer may support deterministic exercise tests, but they do not establish durable storage.

If you add optional short-term memory, require a thread ID and document exactly which fields persist until the thread ends. If you propose long-term memory, leave it disabled and specify:

- the user action that grants consent;
- allowed fact types and prohibited sensitive fields;
- source, purpose, namespace and owner;
- retention duration and deletion path;
- how the user reviews, corrects, exports or revokes it;
- how tenant isolation and redaction are tested.

Do not store raw prompts, full retrieved documents or critique traces by default.

## Budgets and failure handling

Choose explicit, configurable limits for total model calls, research results, revisions, elapsed time and approximate token/cost units. The fixtures do not provide prices, so do not invent currency results. Add tests for:

- direct route with no research;
- one research path with valid citations;
- irrelevant or empty research;
- one critic-requested revision followed by acceptance;
- repeated critique that reaches the revision ceiling;
- a worker exception;
- malformed handoff data;
- cross-tenant evidence;
- cancellation before and during a node;
- an instruction-like string inside a fixture document;
- a budget that cannot cover the next node.

On partial failure, preserve completed, safe evidence and return a typed failure or partial status. Never silently convert a failed critic into approval. Retries apply only to declared transient failures and consume the same global budget.

## Local-only run

Use `fixtures/corpus.json` and injected fake model/node functions. Do not add provider clients, account setup, credentials, network tools or real customer content. The starter is intentionally incomplete and should fail until you implement it.

Suggested local commands after you choose and record compatible dependency versions:

```bash
python -m unittest -v
```

Return the exact resolved versions and command output. Separate deterministic fixture evidence from any later own-account model experiment.

## Evidence to return

Return `DESIGN.md`, completed code, deterministic tests, one redacted successful trace, one redacted failure trace, the budget table, and a statement of what remains unverified. A passing local graph does not establish that a live model improves the answer, that parallel work reduces end-to-end latency, or that persistence is production-safe.

## Primary references

- [LangGraph workflows and agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents)
- [LangGraph Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api)
- [LangChain multi-agent architectures](https://docs.langchain.com/oss/python/langchain/multi-agent)
- [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
