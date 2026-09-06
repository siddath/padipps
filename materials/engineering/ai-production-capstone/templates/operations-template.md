# Operations and verification receipt

## Runtime contract

- Owner/on-call: TODO
- Supported environment: TODO
- Start/stop/health commands actually run: TODO
- Timeout, concurrency, queue and retry limits: TODO
- Idempotency scope/retention/conflict behavior: TODO
- Cancellation behavior: TODO
- Data/log access, retention and deletion: TODO

## Signals and alerts

TODO: define request outcome, latency, retry, budget, tool failure, guardrail and redaction signals with actionable thresholds and owners.

## Failure drills

| Drill | Injection method | Expected safe state | Observed result | Receipt | Follow-up owner/date |
| --- | --- | --- | --- | --- | --- |
| Timeout | TODO | TODO | NOT RUN | TODO | TODO |
| Cancellation | TODO | TODO | NOT RUN | TODO | TODO |
| Duplicate request | TODO | TODO | NOT RUN | TODO | TODO |
| Overload | TODO | TODO | NOT RUN | TODO | TODO |
| Unsafe document | TODO | TODO | NOT RUN | TODO | TODO |
| Trace canary | TODO | TODO | NOT RUN | TODO | TODO |

## Rollback and kill switch

TODO: define trigger, authority, exact reversible action, data consequences and verification.

## Claim boundary

TODO: separate local verification, independent review, deployment and user validation.

