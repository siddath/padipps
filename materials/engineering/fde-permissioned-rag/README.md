# Permissioned document context and citations

Continue the [same fictional Slack/HubSpot capstone](../fde-capstone/README.md).
tenant-a = Aster and tenant-b = Birch. Keep one artifact identity and link the same evidence when
this exercise supports both AI application engineering and forward deployed engineering.

Before coding, write the experiment in your learning record: principal, document/ACL,
expected behavior, baseline, leakage risk, one falsifier and what would change your design.
Use your own VS Code copy. This is **unsolved** and makes no model or source-connector calls.

```sh
python3 -B -m unittest -v test_rag
```

Python 3.11+, standard library only. Initial exit is nonzero with TODO errors. The test suite is a
deterministic permission/citation contract, **not a retrieval-quality or live-model evaluation**.

## Implement the boundaries

`prepare_context(principal, documents, query, acl_version)` returns a list of `{id, version, text}`
in input order, at most three documents. Include a document only when its tenant equals the
principal's tenant, its `allowed_users` contains the subject or its `allowed_groups` intersects
the principal's groups, `acl_version` exactly matches the supplied current version, `revoked` is
false, and `ingestion` is `verified`. Missing ACL/ingestion information grants nothing. Match the
case-insensitive query as a substring of the document text; an empty query returns no context.
This intentionally weak retrieval baseline lets you isolate security behavior before embeddings.
In a real integration, obtain current permission/version from a trusted source, never the request.

`validate_answer(answer, context)` returns a boolean. For this bounded fixture contract, an answer
contains only `text` and `citations`. A citation has `document_id`, `version` and `quote`; its
document/version must occur in the allowed context, and its nonempty quote must occur literally in
that document's text. Empty/no context permits only `{text:"No authorized evidence",citations:[]}`.
Nonempty answers require at least one valid citation. Reject action/tool fields. This verifies
reference/spans, **not that the full answer follows logically from those spans**; manually review
semantic support and create a counterexample to this validator's limit.

## Extend the capstone, then name the evidence honestly

- Before adding a document, enforce file type/size rules, sandbox parsing, and quarantine an
  unknown scanning result. Add a test for a spoofed type, oversized file and parser failure in
  your own ingestion adapter. `ingestion: verified` here is a trusted fixture precondition,
  not antivirus or parser-sandbox proof.
- Carry document identity, source version and ACL provenance through every chunk. Model a source
  permission revocation while the index/cache is stale; invalidate or reauthorize before serving.
  The whole-context key must include tenant/principal permission state and document/ACL versions.
- Authorized retrieved text may contain hostile instructions. Treat it as data. The injection
  fixture must never authorize a tool action. Add one new adversarial case before revising code.
- Fill `eval-card.md`: expected versus actual per case, forbidden disclosure/action count,
  citation-reference validity, manually inspected answer support, baseline retrieval coverage.
  Keep denominators and excluded cases explicit. Do not infer real-world error rates from six docs.
- Embeddings/reranking, a maintained source connector and live-model repeated evals are later
  implementation checkpoints inside this same artifact; mark each not run unless actually run.
  No paid API key or separate AI coach is needed for this exercise.

Record the artifact path, exact test output, next unresolved security boundary, and one unaided
explain-back. Time spent and reading the sources do not establish mastery.
