# Diagnose and improve retrieval without hiding the baseline

A naive RAG pipeline embeds one question, retrieves top-k chunks, and gives them to a generator. That
baseline is valuable because it exposes the first ceiling: one representation and one ranking rule
must handle abbreviations, rare identifiers, indirect wording, multi-part questions, permissions,
and noisy chunks. Advanced RAG techniques change different stages. Treat each as a testable variant,
not a guaranteed upgrade.

Complete `ai-rag-foundations` first. The guided segment is one study block. The independent benchmark
can span multiple blocks. All fixtures are fictional, all starter functions are **unsolved**, and no
embedding, reranker, or generation provider is called.

## Start with the failure, then choose the intervention

| Observed failure | Candidate intervention | New risk |
| --- | --- | --- |
| Query vocabulary differs from corpus | Expansion or multiple queries | Drift and extra retrieval work |
| Dense search misses exact IDs | Sparse or hybrid retrieval | Fusion needs tuning |
| Relevant chunk is in candidates but ranked low | Cross-encoder reranking | Higher per-query latency |
| Results cross a known scope | Metadata pre-filter | Stale or incomplete metadata |
| One vector loses token-level detail | Multi-vector retrieval | Storage and compute growth |
| Retrieval is unnecessary or evidence is weak | Adaptive retrieval/reflection | More model decisions to evaluate |

Do not stack every technique at once. Freeze a baseline, change one controlled factor, and keep the
same held-out questions.

## Expansion, HyDE, and multi-query retrieval

**Query expansion** adds terms or rewrites a query so the retriever sees useful aliases, acronyms, or
domain vocabulary. Expansion can be deterministic, dictionary-based, learned, or model-generated.
Track the original query and every expansion; a plausible extra term can move retrieval away from the
user's intent.

**HyDE** generates a hypothetical document that might answer the question, embeds that generated
document, and retrieves nearby real corpus documents. The hypothetical text is a search pivot, not a
source and not evidence. It may contain false details, so citations and final answers must come from
retrieved corpus records.

**Multi-query retrieval** creates several alternate queries, retrieves for each, and merges or fuses
their ranked lists. It can raise recall when variants cover different wording, but it multiplies work
and can accumulate noise. Deduplicate by stable chunk identity before context assembly.

## Reranking is a second stage

First-stage retrieval favors speed and recall. A reranker receives the question and a small candidate
set, produces a relevance score for each pair, and reorders the set before context assembly. A
cross-encoder jointly processes each query-document pair, allowing token-level interactions that a
single-vector comparison loses. It is usually slower because it runs once per pair.

A cross-encoder is **not automatically an LLM call**. Many rerankers are encoder classification or
regression models. Some modern rerankers use a causal language-model backbone, but the operational
contract is still pair scoring. Record the exact model, input limit, score direction, candidate count,
latency, and whether it ran locally or through a provider.

## Metadata filtering and permission boundaries

Filter on trusted fields such as tenant, language, product version, jurisdiction, or publication
state. A pre-filter restricts the search space before similarity scoring; a post-filter can leave too
few results and, for access control, may expose forbidden text to retrieval or downstream logging.
Permission filtering must occur before unauthorized content becomes model context, cache content, or
visible candidate data. Preserve metadata provenance and refresh semantics.

## Hybrid dense and sparse retrieval

Dense embeddings support semantic similarity. Sparse or lexical methods retain weighted terms and
are often strong on exact identifiers, names, and rare vocabulary. Hybrid retrieval runs both and
combines rankings. Reciprocal rank fusion (RRF) uses rank positions rather than assuming the raw
scores are calibrated. A weighted score blend can work, but requires compatible normalization and
held-out tuning. Measure dense-only and sparse-only as well as the fused result.

## Evaluate retrieval and generation separately

Retrieval metrics require relevance judgments:

- `precision@k`: relevant retrieved items divided by the number examined at k;
- `recall@k`: relevant retrieved items divided by all judged relevant items;
- reciprocal rank: inverse of the first relevant rank, or zero when none is retrieved;
- nDCG@k: rank-sensitive gain for graded relevance, normalized by the ideal ranking.

Generation metrics answer different questions. **Faithfulness** asks whether claims are supported by
the supplied context. **Answer relevance** asks whether the answer addresses the user's question.
An answer can be faithful but irrelevant, or relevant-sounding but unsupported. Citation-ID validity
is another separate check. Automated model judges are measurements with their own error; calibrate
them against human-reviewed examples and retain per-case evidence.

## Multi-vector retrieval and Self-RAG are different ideas

A multi-vector retriever stores or compares more than one vector per item: token-level vectors,
multiple fields, summaries plus chunks, or several learned views. ColBERT-style late interaction
keeps token-granular representations and combines their matches at scoring time. This changes the
retrieval representation and its storage/latency tradeoff.

Self-RAG is a trained generation framework in which a model learns to decide when to retrieve and to
produce reflection tokens that critique retrieved evidence and its own generation. It is not a
synonym for multi-query retrieval, reranking, or a generic "ask the model to check itself" prompt.
Reproducing paper results requires the specified training and evaluation setup.

## Independent assignment — baseline before variants

Implement the TODOs in `advanced_rag.py` and use `fixtures/corpus.json` plus the untouched
`fixtures/heldout.json` suite.

1. Implement trusted metadata filtering. An unauthorized record must never reach a passed scorer.
2. Implement query expansion as a passed-in callable and keep original/expanded queries in the trace.
   Add two modes: multiple query rewrites and HyDE. Never cite hypothetical text.
3. Implement RRF over stable document IDs. Define duplicate handling and deterministic tie-breaking.
4. Implement cross-encoder reranking through a passed `scorer(query, document)` callable. The fixture
   scorer in your test may be deterministic; label it as a stub rather than a model result.
5. Compute precision@k, recall@k, reciprocal rank, and nDCG@k from held-out relevance grades. Add
   faithfulness, answer relevance, and citation validity as separate nullable output fields; `null`
   means not measured.
6. Run these named configurations: dense baseline, dense + multi-query, dense + HyDE, dense +
   reranker, and hybrid + reranker. Hold corpus, questions, k, and relevance judgments constant.
7. Report per-question retrieved IDs, metric numerators, latency, and failures before aggregates. Do
   not fill results that you did not execute and do not describe any variant as better without the
   measured table.

```sh
python3 -B -m unittest -v test_advanced_rag
```

The initial command exits nonzero with TODO errors. Framework or model experiments may require an
environment you install and own. No API key belongs in these materials, and the required benchmark
can run with deterministic test doubles before any provider experiment.

## Evidence to record

Keep the frozen fixture hash, configuration name, exact component identities, retrieval trace,
per-case judgments, metric definitions and denominators, elapsed time, and error rows. Record negative
and tied results. A benchmark over this tiny fictional suite proves only behavior on this suite.

## Primary sources

- [HyDE: Precise Zero-Shot Dense Retrieval without Relevance Labels](https://arxiv.org/abs/2212.10496)
- [Sentence Transformers cross-encoder usage](https://www.sbert.net/docs/cross_encoder/usage/usage.html)
- [Elasticsearch hybrid search documentation](https://www.elastic.co/docs/solutions/search/hybrid-search)
- [RAGAS evaluation paper](https://arxiv.org/abs/2309.15217)
- [ColBERTv2 paper](https://arxiv.org/abs/2112.01488)
- [Self-RAG paper](https://arxiv.org/abs/2310.11511)
- [TREC Deep Learning Track evaluation overview](https://trec.nist.gov/pubs/trec29/papers/OVERVIEW.DL.pdf)

