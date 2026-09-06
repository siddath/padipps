# From text to a bounded model call

This lesson builds the smallest useful mental model of an LLM application: text becomes token IDs,
the model turns those IDs into contextual representations, inference produces a distribution over
the next token, and application code validates the result. It also separates the model's internal
representations from a retrieval system that an application may choose to call.

The guided segment is designed for one short study block. The independent implementation may take
several blocks. Use your own VS Code copy. The starter is intentionally **unsolved**, uses only
synthetic fixtures, and makes no network call.

```sh
python3 -B -m unittest -v test_foundations
```

The initial command exits nonzero with `NotImplementedError`. A passing result after your work shows
only that the specified local contracts pass; it does not prove that a model response is correct.

## 1. Tokens are pieces with IDs, not words

A tokenizer maps text to a sequence of vocabulary entries. Each entry has an integer ID. Depending
on the tokenizer and surrounding characters, one token may be a whole word, part of a word,
punctuation, whitespace, or bytes used to represent unfamiliar text. The same visible word can split
differently after a space, in another language, or under another tokenizer. Count with the tokenizer
for the model you will actually call; do not estimate by counting words.

```text
text ──tokenizer──> token pieces ──vocabulary lookup──> integer token IDs
```

Token IDs are labels, not measurements. ID 900 is not "closer" to ID 901 than to ID 20. The model
uses a learned embedding table to map each ID to a dense vector.

## 2. Internal token embeddings and retrieval embeddings have different jobs

Inside a transformer, token embeddings are learned parameters that turn token IDs into vectors of
the model's hidden width. Position information is added or represented so order matters. Layer after
layer, self-attention and feed-forward transformations update each position. The representation for
"bank" can therefore change when nearby tokens describe a river instead of finance. This is
contextualization.

An external retrieval embedding is produced by a separate embedding model or embedding endpoint. It
usually compresses a query or document chunk into one fixed-length vector so application code can
compare or index items. That vector is not the transformer's live hidden state and is not a token ID.
Changing the retrieval embedding model can require re-embedding the corpus because dimensions and
vector geometry must match.

| Representation | Created by | Typical shape | Purpose |
| --- | --- | --- | --- |
| Token ID | Tokenizer | integer sequence | Address vocabulary entries |
| Internal token state | Generative model | one vector per position per layer | Predict the next token in context |
| Retrieval embedding | Embedding model | one vector per query or chunk | Search or cluster external items |

A base LLM does **not** always query a vector database. Plain inference can run using only the prompt
and model parameters. RAG is a separate application pattern: retrieve documents first, add selected
text to the model context, then generate. Retrieval happens only when code or a tool invocation makes
it happen.

## 3. Attention contextualizes; parameters retain learned behavior

Self-attention lets each position weight information from other allowed positions. Queries, keys,
and values are learned projections of the current states. A causal language model masks future
positions, so the state used to predict the next token depends only on tokens already in context.
Attention is part of inference; it does not silently fetch external documents.

Parameters are the learned numbers in embedding tables, attention projections, feed-forward layers,
normalization, and output layers. Pre-training adjusts them over a large corpus to improve a training
objective such as next-token prediction. Post-training can further tune behavior for instructions,
preferences, safety, or a task. Runtime inference normally uses the resulting fixed parameters to
compute outputs; putting examples in a prompt changes the current context, not the stored weights.

## 4. Logits become probabilities, then one token is selected

For the next position, the model emits one logit per vocabulary entry. A softmax transformation turns
those arbitrary real scores into a probability distribution whose values sum to one. Decoding then
selects a token. Greedy decoding takes the highest-probability token; sampling draws from the
distribution. Temperature and top-p change the sampling distribution, but they do not verify truth.
The chosen token is appended and the process repeats autoregressively.

```text
context IDs → transformer → logits → softmax / decoding policy → next token ID
      ↑                                                        │
      └──────────────── append chosen token and repeat ────────┘
```

The context window bounds the tokens available to a request, including instructions, examples,
retrieved text, conversation state, and generated output as defined by the provider. Content outside
that window is not automatically remembered. A fluent continuation can still be unsupported or
false: the objective rewards plausible token prediction, not a database-backed truth guarantee.
Sampling can vary wording and errors; deterministic decoding can repeat the same error.

## 5. Prompts are runtime inputs with roles

- A system or developer instruction sets durable behavior for the request, such as output policy.
- A user message carries the task and its data.
- Few-shot examples demonstrate input/output behavior inside the context window.

Keep data clearly delimited, state what to do when evidence is missing, and request a narrow output
shape. Role precedence helps organize instructions, but application code must still enforce security,
permissions, and output contracts. Prompt text is not an authorization system.

## 6. Validate structured output in application code

"Return JSON" is a prompt request, not validation. A robust boundary has three separate checks:

1. Ask for a supported structured output schema when the provider offers one.
2. Parse the returned text or structured payload.
3. Validate types, required keys, allowed values, lengths, and unknown keys before using it.

Never execute a returned field merely because the JSON parsed. Keep tool authorization and side
effects behind deterministic code. The fixture in `fixtures/prompts.json` is fictional and contains
no credential. `build_responses_request` should produce a request-shaped dictionary for inspection;
it must not send anything.

## 7. Implement cosine similarity from scratch

For equal-length vectors `a` and `b`, cosine similarity is:

```text
dot(a, b) / (length(a) × length(b))
```

Make the boundary explicit. Reject different dimensions. Reject an empty vector. Reject either zero
vector because division by a zero norm is undefined. Check every value is a finite real number; in
Python, remember that `bool` is a subclass of `int`. Clamp only tiny floating-point drift after the
calculation, not invalid input. Cosine compares direction, not truth or authorization.

## Independent assignment — keep it unsolved until you do the work

Implement every TODO in `foundations.py` and make `test_foundations.py` pass.

1. Implement cosine similarity without NumPy or a library similarity helper, including all stated
   edge cases.
2. Parse and validate the model's JSON against the exact synthetic incident-label contract. Reject
   extra keys, wrong types, invalid severity, blank summary, and overlong summary.
3. Build a Responses-style request dictionary with a system instruction, one few-shot pair, the user
   input, and a strict JSON schema. Do not add a key or make a call.
4. Inspect the request and write down which bytes are prompt data, which fields constrain output,
   and which validations still belong to your application.
5. Explain tokens, internal states, retrieval embeddings, attention, parameters, logits, context,
   sampling, and hallucination without reading this page.

`optional_live_call` is an explicit learner-run extension. Leave it disabled unless you choose and
own the environment, provider account, cost, data handling, and installed SDK. It must read any
credential through the provider's normal environment mechanism; never put a key in this repository.
No live call is needed for the required exercise, and this material records none as run.

## Evidence to record

Record the exact command and output, one rejected invalid payload, the zero-vector behavior, an
unaided explain-back, and whether the optional call remained disabled. A green local test suite is a
contract result, not evidence of model quality or production readiness.

## Primary sources

- [OpenAI tiktoken README](https://github.com/openai/tiktoken/blob/main/README.md)
- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- [Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165)
- [OpenAI API quickstart](https://developers.openai.com/api/docs/quickstart)
- [OpenAI structured outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI embeddings guide](https://developers.openai.com/api/docs/guides/embeddings)

