# Choose a RAG architecture by question shape and operating boundary

Production RAG fails outside the happy-path query: source updates lag, entity extraction merges the
wrong records, a retriever crosses permissions, graph traversal expands without a budget, a model
loops through tools, or a citation points to a transformed summary without usable provenance. This
lesson compares architecture families by the job they perform and makes the learner prove one
Neo4j-backed GraphRAG design against a vanilla RAG baseline.

Complete `ai-advanced-rag` first. The guided comparison fits one study block; the independent Neo4j
implementation and evaluation may span multiple blocks. The Cedar Transit case is entirely
fictional. The starter is **unsolved**, includes no connection value or API key, and records no Neo4j,
embedding, or model integration as run.

## Vanilla RAG remains the control

A two-step text RAG pipeline retrieves chunks for every question and gives top-k context to a
generator. Its control flow and latency are comparatively predictable, citations can point directly
to chunks, and indexing is usually cheaper than graph extraction. Keep it as the baseline for
single-document and direct fact questions. More structure adds value only if measured question types
need it.

## GraphRAG: retrieve through extracted structure

GraphRAG systems represent entities and relationships derived from sources, then use graph structure
to assemble context. Microsoft's GraphRAG pipeline extracts entities, relationships, and optionally
claims from text units; builds communities; produces community reports; and supports local, global,
DRIFT, and basic search modes. Local search combines graph data with linked source text. Global
search uses community reports for corpus-level questions. Those summaries and edges are generated
artifacts, so retain the text units and provenance that support them.

GraphRAG can help with multi-hop questions, entity neighborhoods, or corpus-wide themes. Its costs
include extraction, entity resolution, community construction, storage, refresh, and more complex
evaluation. A graph edge is not true merely because a model extracted it.

## KAG: structured domain knowledge plus language models

Knowledge Augmented Generation (KAG), as described by the OpenSPG project, centers a structured
professional knowledge base, schema-constrained knowledge construction, alignment, and logical-form
guided reasoning/retrieval. The LLM participates in construction and question answering, while the
structured knowledge and domain rules carry semantics that flat vector similarity does not.

Use this family when a maintained ontology, rules, and explicit multi-hop reasoning justify their
ownership cost. Do not label any knowledge graph plus prompt as KAG, and do not assume a schema makes
source facts correct or current.

## Agentic RAG: the model participates in control flow

In agentic RAG, a model can decide whether, when, or how to retrieve, grade evidence, rewrite a query,
or call another bounded tool. It fits questions whose information path cannot be fixed in advance.
The tradeoff is variable latency and cost, harder reproducibility, loop and tool errors, and a larger
authorization surface. Put tool allowlists, arguments, budgets, stop conditions, and human approval
outside model discretion.

## Multimodal RAG and LightRAG are separate distinctions

**Multimodal RAG** indexes or retrieves across text, images, audio, video, or their derived captions
and features. A shared multimodal embedding space can support text-to-image retrieval. The modality
choice is orthogonal to whether retrieval is flat, graph-based, or agent-controlled. Preserve media
origin, transformations, and rights as provenance.

**LightRAG** is the name of a specific published approach that combines graph structures with vector
representations and dual-level retrieval for low-level and high-level knowledge. It is not a generic
label for any small or inexpensive RAG system, and published benchmark claims do not transfer to a
different corpus or implementation.

## A selection framework

| Question and constraint | Start with | Evidence needed before escalation |
| --- | --- | --- |
| Direct facts in a bounded corpus | Vanilla two-step RAG | Retrieval misses or unsupported answers by case |
| Multi-hop entity relationships | GraphRAG | Labeled multi-hop suite and source-linked edge quality |
| Corpus-wide themes | GraphRAG global/community approach | Human review of communities and summaries |
| Stable ontology and domain rules | KAG-style structured KB | Named schema owner, rule tests, update workflow |
| Retrieval path varies by question | Agentic RAG | Tool traces, budgets, loop/failure tests |
| Images or other media are primary evidence | Multimodal RAG | Cross-modal relevance and rights/provenance checks |
| Graph plus vector dual-level retrieval fits | Evaluate LightRAG | Reproduction on the held-out local suite |

Prefer the smallest architecture that satisfies the measured question set and operating constraints.
Compare answer quality, retrieval quality, latency, index cost, update lag, and failure behavior.

## Production pitfalls to design before the graph

- **Entity resolution:** aliases can split one entity or merge different entities. Keep confidence,
  source references, and a reversible review path.
- **Provenance:** every node property, relationship, summary, and answer citation needs source ID,
  version, extraction method, and observed time.
- **Freshness:** updates and revocations must invalidate affected chunks, embeddings, edges, reports,
  and answer caches.
- **Permissions:** authorize source records before extraction results or graph neighborhoods enter a
  caller's context. A path through an allowed node does not grant access to a forbidden source.
- **Injection:** source text and extracted instructions are untrusted data. They cannot grant tools or
  change authorization.
- **Traversal budget:** bound depth, fan-out, result count, time, and context size. Record truncation.
- **Evaluation:** inspect extraction errors and retrieval paths as well as final answers. Separate
  vanilla-friendly direct questions from graph-shaped multi-hop and global questions.
- **Operations:** observe index version, schema version, component versions, latency by stage, token
  use, cache identity, retries, and partial failures.

## Fictional case: Cedar Transit maintenance evidence

The fixtures describe vehicles, components, bulletins, depots, and maintenance events for two
fictional tenants. Questions include direct facts and multi-hop paths such as vehicle → component →
bulletin. Source ACLs differ. A safe graph may contain shared entity names, but a caller can only use
properties and edges whose supporting source records are currently authorized.

Model these minimum labels and relationships in your own implementation:

```text
(:Source {id, version, tenant, allowed_roles, observed_at})
(:Vehicle {id})-[:HAS_COMPONENT {source_id, source_version}]->(:Component {id})
(:Bulletin {id})-[:APPLIES_TO {source_id, source_version}]->(:Component)
(:Maintenance {id})-[:PERFORMED_ON {source_id, source_version}]->(:Vehicle)
```

Treat these as a domain contract, not a completed Cypher solution. Decide constraints, indexes,
upserts, deletion/version behavior, and authorized retrieval yourself.

## Independent assignment — Neo4j GraphRAG versus vanilla RAG

Implement every TODO in `graph_rag.py` and complete the checklist in `schema.cypher.todo`.

1. Validate the principal and filter source records by tenant, role, publication state, and current
   version before deriving caller-visible graph context. Missing metadata denies access.
2. Build idempotent Neo4j ingestion for source, vehicle, component, bulletin, and maintenance nodes.
   Every derived property and relationship must retain supporting source ID/version. Define how a
   replaced or revoked source removes or invalidates its derived facts.
3. Implement a vanilla chunk retriever and a bounded graph retriever over the same authorized source
   set. The graph path must cap depth, fan-out, records, and elapsed time.
4. Return `{text, citations, retrieval_trace}` through a passed generator. Validate citations against
   authorized source versions. Retrieved text can never authorize a write or another tool.
5. Run all questions in `fixtures/eval_questions.json` through both retrievers. Keep direct and
   multi-hop slices separate. Report retrieved source IDs, path, abstention, citation validity,
   retrieval metrics, latency, and errors. Do not invent a GraphRAG improvement.
6. Replay a source-version change and a role revocation. Prove stale edges, graph summaries, and cache
   entries are not served.
7. Add a synthetic prompt-injection sentence to an authorized bulletin. Prove it remains quoted data
   and cannot expand permissions or cause a write.

Install Neo4j and `neo4j-graphrag` only in an environment you own, following current official docs.
Use normal environment variables or an interactive secret store for connection values; do not commit
them. A learner may first use fakes for deterministic unit contracts, then add a separately recorded
local integration run.

```sh
python3 -B -m unittest -v test_graph_rag
```

The initial command exits nonzero with TODO errors. A future unit pass proves only the specified
local contracts. A Neo4j result requires a real integration run; a generation-quality claim requires
a separately configured model and held-out evaluation.

## Evidence to record

Record fixture and schema fingerprints, Neo4j/package versions, exact query templates, source and
graph index versions, per-question vanilla and graph traces, metric denominators, latency, revocation
replay, injection outcome, and all not-run stages. Keep manual reviews attached to the source IDs they
inspect.

## Primary sources

- [Microsoft GraphRAG indexing overview](https://microsoft.github.io/graphrag/index/overview/)
- [Microsoft GraphRAG query overview](https://microsoft.github.io/graphrag/query/overview/)
- [OpenSPG KAG repository](https://github.com/OpenSPG/KAG)
- [Neo4j GraphRAG for Python](https://neo4j.com/docs/neo4j-graphrag-python/current/)
- [LangChain retrieval architecture comparison](https://docs.langchain.com/oss/python/langchain/retrieval)
- [Chroma multimodal embeddings](https://docs.trychroma.com/docs/embeddings/multimodal)
- [LightRAG paper](https://arxiv.org/abs/2410.05779)
- [OWASP prompt-injection prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)

