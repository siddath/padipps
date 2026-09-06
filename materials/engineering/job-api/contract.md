# HTTP, SQL, and Spring contract — learner submission

All systems and identifiers in this exercise are fictional. Replace every learner marker with your own design; do not paste a framework-generated answer.

## HTTP request and response

<!-- LEARNER TODO: method/path, idempotency-key location, request schema, success/retry/conflict/validation responses, and status lookup. -->

## SQL persistence

<!-- LEARNER TODO: tables, keys, uniqueness constraint, payload-equivalence representation, state transitions, and the query/transaction that prevents duplication. -->

## Spring service boundary

<!-- LEARNER TODO: controller/service/repository responsibilities and transaction boundary. -->

## Spring transaction proxy trap

<!-- LEARNER TODO: explain what happens when one method in a Spring bean directly calls another method on the same instance, why proxy-based @Transactional advice may be bypassed, and how your design avoids relying on self-invocation. -->

## Crash and retry discussion

<!-- LEARNER TODO: crash points before/after persistence, client retry behavior, conflict behavior, and observable recovery. -->
