# One fictional customer system, built in small steps

This is the reusable capstone brief for the Padipps engineering pack. Use one learner-owned project throughout the route. The sessions are exercises and do not represent completed work, deployed software, or verified expertise.

## Fictional customer request

“We want an assistant in Slack that can answer from our HubSpot CRM and internal documents, with sources we can open. Employees must never see another customer's records or documents outside their own permission.”

Aster and Birch are fictional tenants. Start with synthetic records and a local fake connector. Credentials, real customer documents and production infrastructure are not supplied or required for the first slice.

## Discover before building

Write the first five questions yourself. Establish the user and buyer, current workflow, permission authority, what a successful task means, non-goals, failure tolerance, and who accepts delivery. Mark every unanswered assumption. Capture a measurement protocol now: baseline task, sample selection, manual effort, failure/rework, denominator, observation window and cost inputs. Do not invent customer savings or causal impact from synthetic data.

Keep your evolving artifacts together:

- `discovery.md`: stakeholder questions, answers or explicit hypotheses, acceptance criteria, baseline protocol, scope changes and expectation updates.
- `decisions/`: API, identity, tenancy, data handling, permissioned retrieval and deployment trade-offs.
- `service/`, `tests/`, `deploy/`: your implementation and actual test output.
- `operations/`: traces, dashboard definitions, failure drills, rollback receipts and customer communication.
- `docs/`: API/deployment guide, runbook, troubleshooting, onboarding and measured limitations.
- `portfolio/`: sanitized case study and implementation guide, with laboratory results labelled.

Names are suggestions; preserve one project and stable artifact references. Copy a session's starter into that project when you reach it. The backend, distributed-systems, AI, and product-design exercises keep their existing IDs; link the same evidence when an exercise supports more than one track.

## The delivery loop

Discover → scope → build → secure → deploy → operate → measure → productize. Revisit discovery whenever a constraint or customer outcome changes. The pack defines a prerequisite order, not a deadline or a mastery score.

Each session follows recognition → small model → decision → explain-back → independent editor work → artifact and test evidence → review. Run unfamiliar integrations in a local sandbox or authorized test account. Document fixture-only checks separately from actual HTTP, identity-provider, PostgreSQL, cluster, or user-observation evidence.

## What finishing the route means

An independent outcome is a learner self-report with an artifact and checks. It is not verified expertise, compliance certification, production readiness, or demonstrated customer adoption. Keep failed drills and missing evidence visible. Have the implementation reviewed and complete a fresh unaided variant before relying on it as evidence. Padipps does not run this code or publish the resulting portfolio.
