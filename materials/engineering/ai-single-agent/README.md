# Build one bounded tool-using agent

Implement the unfinished Python starter in this directory. The system is a local knowledge assistant for the fictional Aster tenant. It can search a supplied fixture catalog and open one fixture document. It cannot use the network, read arbitrary files, change records, or act for a user.

This is an independent exercise. The guided Padipps block explains the control model; the implementation may take several focused blocks. The starter contains no finished agent and the fixtures contain no learner data or credentials.

## What you are deciding

First justify why this request needs an agent at all.

- A single model call fits when all required context is already present and no observation can change the next step.
- A deterministic workflow fits when the steps and branches are known in advance and code can choose them reliably.
- An agent loop fits when the model must choose among bounded tools, observe validated results, and decide whether another step is useful.

The target is a bounded loop:

```text
validated request
      |
      v
model proposes a tool call or final typed answer
      |                         |
validate name, arguments,       v
authorization and budget     validate output
      |
execute local mock tool
      |
return a compact observation to the next model step
```

An action/observation trace is enough for inspection. Do not log or request hidden chain-of-thought. Store the requested tool name, validated arguments, sanitized result metadata, outcome, duration and budget counters.

## Contract

Implement `build_agent`, `search_catalog`, `read_document`, `authorize_tool_call`, `sanitize_observation`, and `answer_question` in `starter.py`.

The finished exercise must:

1. Validate the external request before a model sees it: known tenant, non-empty bounded question, and an allowlisted role.
2. Give the agent only `search_catalog` and `read_document`. Both read the injected in-memory fixture catalog. Neither accepts a path, URL, shell command, tenant override, or arbitrary callable.
3. Validate every proposed tool name and arguments before dispatch. Authorization is application code, separate from model selection.
4. Return `KnowledgeAnswer`, including answer text, zero or more fixture document IDs, a disposition, and a bounded public trace.
5. Reject citations to documents that were not returned by a successful tool observation.
6. Enforce a total request budget, maximum model steps, maximum tool calls, per-tool result limit, and cancellation signal. Make the values configurable and test their boundaries.
7. Treat fixture text and tool output as untrusted data. An instruction inside a document cannot grant another tool, change the tenant, or alter the output contract.
8. Map invalid input, denied actions, exhausted budgets, model refusal, malformed tool calls, invalid structured output, tool errors and cancellation to stable application outcomes.
9. Use an injected local fake model in tests. Make no provider or network calls.

Build the agent with Pydantic AI: register only the two local function tools, use `KnowledgeAnswer` as the typed output contract, and inject a fake/test model for deterministic runs. Pydantic validation does not establish factual correctness or authorization. If you use the framework's retry support, count retries inside the same finite request budget.

Create an isolated Python 3.10+ environment, then follow the [Pydantic AI installation guide](https://pydantic.dev/docs/ai/overview/install/) to install `pydantic-ai`. Record the resolved Python, Pydantic and Pydantic AI versions with your evidence. Dependency installation is setup; the completed exercise runtime and tests must make no network or provider calls.

The starter's small budget values are reversible exercise defaults: they force the stop paths to be implemented and keep fixture traces short. Record why you retain or replace each value; a production value needs measured latency, quality, cost and failure evidence.

## MCP boundary note

MCP standardizes how a host discovers and invokes server capabilities. It does not decide whether this user may perform this action. For this exercise, keep the tools as local Python functions behind the same conceptual boundary:

```text
host policy -> allowed tool definition -> validated call -> local fixture result
```

In `DESIGN.md`, add a short mapping from your local registry to MCP's tool name, input schema, output schema/result, error and cancellation concepts. Also state what would have to change before connecting an external MCP server: server trust decision, capability allowlist, transport security, consent, output validation, timeouts, logging/redaction and a revocation path. Do not add an MCP server to this exercise.

## Fixtures and attacks

Use `fixtures/catalog.json`. `DOC-A3` contains an instruction-like sentence on purpose. It remains document content. Add deterministic tests for at least:

- a direct answer with no tool call;
- one search followed by one read and a cited answer;
- an unknown tool name;
- a cross-tenant document request;
- an extra argument such as `path` or `url`;
- malformed structured output;
- a tool result containing instruction-like text;
- an exhausted step or tool budget;
- cancellation before dispatch and between two steps;
- a final citation that the agent never observed.

## Evidence to return

Return:

- `DESIGN.md` with the architecture choice, tool schemas, authorization matrix, budgets, failure table, public trace fields and MCP mapping;
- your completed code and deterministic tests;
- exact test command and output;
- one redacted example trace;
- one paragraph separating what the offline fake-model checks prove from what remains unverified with a real model, external tool server, hostile corpus and deployed runtime.

Do not claim production safety or model quality from passing fixtures. A reviewer must inspect the tool boundary and run the tests before accepting the exercise.

## Primary references

- [Pydantic AI output types and validation](https://pydantic.dev/docs/ai/core-concepts/output/)
- [Pydantic AI installation](https://pydantic.dev/docs/ai/overview/install/)
- [Pydantic AI function tools](https://pydantic.dev/docs/ai/tools-toolsets/tools/)
- [OpenAI function calling guide](https://developers.openai.com/api/docs/guides/function-calling)
- [Model Context Protocol tools specification, 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
