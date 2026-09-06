# Engineering study tracks

> [`engineering.json`](../packs/engineering.json) contains 40 lessons across six overlapping tracks: DSA 9, backend 3, distributed systems 5, AI application engineering 10, forward deployed engineering 21, and product design 3. The AI track includes eight ordered modules and two shared companion lessons. The FDE route retains its fictional delivery capstone. Starters are unsolved and fixtures are synthetic; learners produce their own evidence.

The pack can be imported from **Study packs** in Padipps. Its first recommended session is `customer-discovery`, but every track remains directly accessible from the practice library. A lesson can belong to more than one track without being duplicated.

| Track | Lessons | What it practises |
| --- | ---: | --- |
| Data structures and algorithms | 9 | Hash lookup, two pointers, prefix sums, windows, monotonic structures, graph traversal, bipartite checking, and minimum spanning trees. |
| Backend engineering | 3 | Retry-safe API contracts, Spring proxy transaction boundaries, and SQL job claiming. |
| Distributed systems | 5 | Recoverable migration work, overload diagnosis, idempotent job creation, concurrent ownership and Kafka consumer lag. |
| AI application engineering | 10 | Eight modules from LLM mechanics through RAG, agents, context/evals and production; shared API and output-validation companions. |
| Forward deployed engineering | 21 | Discovery, scoping, APIs, identity, integrations, tenant isolation, security, permissioned retrieval, delivery, operations, measurement, and productization. |
| Product design | 3 | Evidence-grounded critique, recovery flows, accessibility, and responsive implementation. |

See the [AI route guide](AI_ROUTE.md) for its module sequence, concept coverage and independent assignments. The 31-lesson [previous pack](../packs/engineering-v1.json) stays available with unchanged bytes and a separate notebook identity.

## Prerequisites and order

Prerequisites in the pack are advisory links to earlier concepts. They do not lock a lesson. The FDE sequence is deliberately discovery-first:

`customer-discovery` → `ux-baseline` → `job-api` → `fde-python-api` → `fde-identity` → `fde-crm-sync` → `sql-jobs` → `fde-tenant-isolation` → `fde-security-controls` → `ai-gateway` → `fde-permissioned-rag` → `migration-design` → `ux-flow` → `ux-implementation` → `fde-environments` → `fde-observability` → `debug-overload` → `fde-incident-delivery` → `fde-customer-docs` → `fde-adoption` → `fde-portfolio`.

Useful local tools vary by exercise: Node.js 20+, JDK 17+, and Python 3.11+ cover the dependency-free starters. PostgreSQL, FastAPI, Docker, Kubernetes, Helm, and local identity tooling are required only for the exercises that name them. Their READMEs distinguish template checks from runtime proof.

## Materials and evidence

Each lesson's `task` points to a self-contained folder under [`materials/engineering/`](../materials/engineering/). The source links in the pack retain primary technical references and add a public GitHub link to the matching exercise folder.

The starter implementations deliberately fail with `TODO`, `NotImplementedError`, an empty design template, or a blocked deployment manifest. Tests and fixtures define bounded contracts; they are not solutions. A passing fixture test supports only the named local behavior. It does not prove production operation, security certification, real customer outcomes, accessibility, or independent expertise.

All customer, tenant, incident, telemetry, adoption, and financial examples are fictional or synthetic. Keep actual command output, reviewer findings, and observed user evidence separate from design proposals and self-reported completion.

## Extending the pack

Add a lesson by following the [pack format](../PACKS.md), giving it a stable ID, linking an unsolved self-contained exercise, and assigning it to at least one track. Preserve existing IDs when refining compatible material and use a new pack ID for incompatible lesson-gate changes.

The public design track currently contains `ux-baseline`, `ux-flow`, and `ux-implementation`. A fuller product-design school can extend that track after its lessons, exercises, and rights review are complete; this release does not claim that integration exists.
