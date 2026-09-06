# Evaluate context and the multi-agent pipeline

Build an offline evaluation suite around your completed `ai-multi-agent` pipeline. The suite uses fictional Aster and Birch cases. It must preserve test denominators, separate deterministic checks from optional model judgment, and never report scores that were not produced by a recorded run.

The guided Padipps lesson covers the evaluation model. Designing cases, implementing the runner, reviewing failures and calibrating an optional judge may take several independent blocks.

## Context is the system input

A prompt is one part of context. For each pipeline stage, inventory the full context:

- governing instructions and output schema;
- tools and their descriptions, argument schemas and authority;
- conversation or graph history;
- retrieved documents and tool observations;
- short-term state and any retained long-term memory;
- budgets, tenant identity, user role, cancellation and trace metadata.

Label the origin and trust class of every item. User text, retrieved documents, tool output, pack content and prior model output remain untrusted data. A higher-priority placement or repeated appearance does not make them authoritative. Keep privileged instructions and authorization decisions out of retrieved text.

Define a finite context budget before truncation occurs. Record the selection policy: required instructions first, then the minimum relevant evidence, then recent state needed for continuity. State what is excluded, summarized, redacted or dropped. If memory is used, document consent, purpose, retention, deletion and tenant-scoped retrieval. Do not keep everything because it may be useful later.

## Evaluation contract

Use `fixtures/eval_cases.jsonl` as a starting set and extend it with your own fictional cases. Freeze a versioned dataset before comparing changes. For every run, record code revision, dataset hash, configuration, resolved dependency versions, start/end time and per-case outcomes.

Implement `evaluate.py` with no provider calls. It should accept a pipeline callable and produce a machine-readable result for every input case, including failures. The supplied starter leaves all scoring functions unfinished.

Calculate, with explicit numerators and denominators:

- **Route accuracy:** correctly predicted route / all cases with a route label.
- **Answer exact match:** normalized predicted answer equals normalized expected answer / all cases with an expected exact answer. Document normalization before running.
- **Citation precision:** correctly cited required document IDs / all cited document IDs. Define the zero-prediction rule.
- **Citation recall:** correctly cited required document IDs / all required document IDs. Define the zero-required rule.
- **Citation F1:** harmonic mean of citation precision and recall under the declared zero rules.
- **Tool-call accuracy:** cases whose ordered tool calls exactly match the expected call sequence / all cases with a tool-call label. Validate both tool names and normalized arguments.
- **Guardrail pass rate:** guardrail cases with the expected refuse/allow and no forbidden disclosure / all guardrail cases.

Do not average per-case F1 unless that is the metric you explicitly chose. A micro score pools citation counts; a macro score averages defined per-case scores. Report which one you compute and retain the raw counts. Never drop timeouts, malformed outputs or exceptions from the denominator: record them as declared failures unless the dataset contract says the case is not applicable.

## Context ablations

Run the same frozen cases against controlled variants:

1. required instructions and relevant documents;
2. no retrieved documents;
3. one irrelevant document added;
4. an instruction-like sentence inside a retrieved document;
5. history truncated at the documented boundary;
6. memory disabled;
7. one worker timeout or malformed handoff.

The goal is to locate sensitivity, not to manufacture a higher score. Keep each variant's configuration and denominator. Do not infer causality when multiple variables changed.

## Optional own-account LLM judge

Deterministic metrics cannot grade every useful answer property. You may add an optional, separately invoked judge using your own authorized account after the offline suite works. The repository supplies no provider client or credentials.

Use `judge-rubric.md` to define a single-answer rubric with anchored levels for factual support, citation entailment, task completion, uncertainty and safety. Give the judge only the case, allowed evidence, candidate answer and rubric. Do not include the system's self-rating. Require structured output with rubric IDs and evidence spans.

Calibrate before relying on it:

- create a small human-reviewed set with clear pass, fail and boundary cases;
- blind candidate labels and randomize presentation order;
- compare judge decisions with human labels and inspect disagreements;
- test position, verbosity, style and self-preference effects;
- keep the judge model/config fixed during one comparison;
- route ambiguous or consequential cases to human review.

A judge agreement statistic measures agreement on that calibration set. It does not prove truth or replace direct checks.

## Guardrail and observability tests

Add deterministic cases for direct injection, indirect document instructions, cross-tenant references, unauthorized tool names, malformed handoffs, oversized context, secrets-like canaries, PII-like fictional strings, cancellation and budget exhaustion.

Capture a trace per case with request/case ID, dataset/config version, node, route, tool name, argument field names, status, duration, retries, budget counters, citation IDs and error code. Redact raw document bodies, prompts, answers, tokens, credentials and fictional PII-like values by default. Test the redactor with canaries. Logs are another data store with access and retention requirements.

## Files to return

Return:

- completed evaluator and tests;
- expanded, versioned fictional dataset;
- `eval-plan.md` with metric definitions and denominators;
- `results.json` created by an actual recorded offline run;
- `results.md` that reports raw counts, rates, failures and limitations without invented values;
- redacted sample traces and redaction tests;
- optional judge calibration artifacts, clearly separated from deterministic results.

The included `results-template.md` is blank by design. Do not replace placeholders until you have actual runner output.

## Primary references

- [OpenAI evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [OpenAI graders guide](https://developers.openai.com/api/docs/guides/graders)
- [scikit-learn classification metrics](https://scikit-learn.org/stable/modules/model_evaluation.html#classification-metrics)
- [OWASP LLM prompt injection prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [OpenTelemetry generative AI semantic conventions source](https://github.com/open-telemetry/semantic-conventions/tree/main/docs/gen-ai)
