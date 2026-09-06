# Architecture review questions

Reviewer: TODO

Date: TODO

Revision reviewed: TODO

- What exact user action and failure is the MVP responsible for?
- Which acceptance criterion requires generation, retrieval, tools or multiple agents?
- What simpler architecture was rejected, and what evidence justified rejection?
- Which context is authoritative, and which content remains untrusted?
- Where are tenant/role authorization and tool allowlists enforced outside the model?
- What state persists, under whose consent, for how long, and how is it deleted?
- What happens on timeout, cancellation, duplicate delivery, partial failure and overload?
- Which retries are safe and idempotent, and where is the global ceiling?
- What are the latency/cost-unit budgets and measured sample receipts?
- Which eval cases block release regardless of aggregate score?
- What does the trace omit or redact, and how was redaction tested?
- What is the rollback/kill-switch path and who owns it?
- Which claims are locally verified, independently reviewed, deployed or still unknown?

Decision, conditions and follow-up owners/dates: TODO.
