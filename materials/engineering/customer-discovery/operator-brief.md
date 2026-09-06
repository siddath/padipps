# Fictional operator brief: Northwind Archive Cooperative

This organization, its people, and its systems are synthetic.

Mira is an operations lead overseeing scheduled tenant migrations from LegacyLedger to NovaLedger. Operators currently receive a request in an internal queue, start a migration job, and watch status updates until completion or escalation.

Reported observations:

- A retry after a slow response can create uncertainty about whether a second job exists.
- Operators need to distinguish queued, running, paused, failed, and completed work.
- A destination slowdown sometimes causes the pending-work count to rise.
- Operators need a safe handoff note when the next shift takes over.

Unknowns to discover:

- Which decision an operator must make at each state
- What evidence earns trust after a retry
- Which failure detail is useful versus distracting
- What a credible demo must prove before a pilot decision
