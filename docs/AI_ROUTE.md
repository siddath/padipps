# AI application engineering route

Open **Study packs → Preview engineering pack → Use this pack**, then **Practice → AI application engineering**. Begin with **Trace text into a validated model result** and follow the eight modules below. Titles in the app may spell out the specific problem; the stable IDs identify the lessons and their materials.

The guided lesson opens with a diagnostic, then a small model and trace, a decision and an unaided explanation. The independent assignment takes place in your editor and may need several study blocks. Prerequisites suggest an order; they do not certify readiness or prevent opening a lesson.

| Module and materials | Concepts | Independent assignment |
| --- | --- | --- |
| 1. [LLM foundations](../materials/engineering/ai-llm-foundations/README.md) | Token pieces and IDs, internal embeddings, attention, parameters, training/post-training/inference, logits, probabilities, next-token generation, context, sampling, hallucination; system/user/few-shot prompts and structured output. Distinguish base generation from external retrieval. | Compute cosine similarity from scratch, validate edge cases and structured JSON, and make an optional call through your own chosen provider. |
| 2. [RAG foundations](../materials/engineering/ai-rag-foundations/README.md) | Ingest, chunk, embed, index and retrieve; generation with sources; chunk and embedding choices; HNSW, IVF and PQ tradeoffs. | Build an end-to-end LangChain/Chroma pipeline on a fictional corpus with retrieval and answer checks. |
| 3. [Advanced RAG](../materials/engineering/ai-advanced-rag/README.md) | Query expansion, HyDE, multi-query, cross-encoder reranking, metadata filters, dense/sparse hybrid search, multi-vector and Self-RAG distinctions; faithfulness and relevance. | Compare retrieval variants with the same held-out evaluation set. Record failures, cost and latency as well as quality. |
| 4. [RAG architectures](../materials/engineering/ai-rag-architectures/README.md) | Production pitfalls; graph retrieval, KAG, agentic, multimodal and LightRAG approaches; evidence-based architecture selection. | Implement a Neo4j graph retrieval variant and compare it with a vanilla RAG baseline on the same use case. |
| 5. [Single agent](../materials/engineering/ai-single-agent/README.md) | Model/tool/observation loops, deterministic workflows, validated function dispatch, ReAct, typed outputs, Pydantic AI, MCP and permission boundaries. | Build a bounded agent with tools, structured results, guardrails and failure tests. |
| 6. [Multi-agent workflow](../materials/engineering/ai-multi-agent/README.md) | Orchestrator-worker and routing patterns; planning, handoffs, information isolation, short/long memory and cost/latency budgets. | Build a LangGraph research/writer/critic pipeline with explicit routing and bounded retries. |
| 7. [Context and evaluation](../materials/engineering/ai-context-evals/README.md) | Context selection, trust boundaries, memory retention; accuracy, F1, exact match and tool-call accuracy; judge rubrics, calibration and bias; redacted traces. | Evaluate the previous workflow with quantitative metrics and a separate optional model judge, including guardrail failures and observability. |
| 8. [Production capstone](../materials/engineering/ai-production-capstone/README.md) | MVP scope, stack/RAG/agent choices, reliability, security, observability, cost and release evidence. | Produce an implementation, architecture review, eval walkthrough, operations plan and demo with structured feedback. Describe the limits of what you verified. |

The route uses these stable IDs in order:

`ai-llm-foundations` → `ai-rag-foundations` → `ai-advanced-rag` → `ai-rag-architectures` → `ai-single-agent` → `ai-multi-agent` → `ai-context-evals` → `ai-production-capstone`.

The AI track ends with two existing companion lessons, `job-api` and `ai-gateway`, for retry-safe API behavior and model-output validation. They remain single shared lesson records. The FDE route keeps its existing permissioned-retrieval delivery exercise; it does not acquire duplicate copies of these eight modules.

## Kafka has a separate home

[Kafka consumer lag](../materials/engineering/kafka-consumer-lag/README.md), ID `kafka-consumer-lag`, belongs to **Distributed systems**. Its fixture exercise traces a producer, topic partitions, brokers and a conventional consumer group; compares log-end and group positions; and asks you to discriminate causes with evidence. It is not an AI prerequisite.

## Tools and evidence

Local starter checks use the language/runtime named in each exercise. Framework assignments need a learner-owned environment and may need dependencies, a local database or a model account. Consult the linked official documentation and record the versions you use. The Padipps tutor connection does not supply an API key to exercise code.

All starters remain unsolved. Synthetic fixtures, blank review templates and example traces are teaching aids. They are not live integrations, production deployments, real user outcomes or completed learner evidence. Live peer/mentor feedback must come from an actual reviewer; the app does not supply a cohort, certification or scheduled one-to-one review.

Write your own implementation, record the tests you ran and assistance you used, then explain a counterexample without the lesson open. Neither a model response nor completion of a focus timer proves understanding.

## Existing notebooks

The expanded pack is `engineering-v2`: 40 lessons in six overlapping tracks. The 31-lesson `engineering-v1` remains available through **Study packs → Preview previous engineering pack** and as [engineering-v1.json](../packs/engineering-v1.json). Its bytes and existing lesson objects are unchanged. Choosing the expanded pack opens separate notebook, focus and conversation histories. No records are migrated or merged. Keep backups and the exact pack revision associated with them.
