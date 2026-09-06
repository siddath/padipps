# Measure the original customer outcome

Continue [the same Aster/Birch capstone](../fde-capstone/README.md) in `delivery/adoption/`. Reopen the measurement protocol from `customer-discovery` before changing it. This exercise analyzes invented observations; it does not establish real adoption, customers retained, expansion revenue or ROI.

Ask whether the original task and eligible population still match the acceptance scenario. Record any changed metric definition and its reason in the same learning record.

## Independent VS Code work

1. Implement `measure.mjs`. Scope identities by tenant and user together. The fixture includes a duplicate delivery, a bot, an ineligible person, failed work and the same user ID in two tenants. Define rates from their stated populations; do not divide by all registered accounts or silently hide failures.
2. For the fixture's named `pilot` period, return eligible people, active people with at least one useful task, people with at least two useful tasks, useful task count, all eligible task attempts, activation rate and useful-task rate. Period names are configurable fixture labels, not a recommended customer measurement window. The offline calculator assumes the supplied period is completely observed. Establish collection coverage separately in real measurement; a telemetry gap is not zero use.
3. Implement the separate hypothetical ROI calculator. Its inputs are explicit assumptions: baseline/pilot minutes per comparable task, comparable task count, hypothetical value per hour and total delivery/operation/review cost. Missing inputs yield an unknown result; a zero total cost makes the ROI ratio unavailable. Preserve negative benefits. Never use the synthetic event volume as measured customer savings.
4. Complete `value-review.md` with metric definitions, a baseline comparability check, costs and sensitivity scenarios. Include onboarding/setup and human review costs where relevant. Explain why a before/after change alone does not prove the assistant caused the result.
5. Turn usage signals into discovery questions. Propose one expansion hypothesis, one churn hypothesis and an alternative explanation for each. Choose a next observation that could change your decision. Do not write invented stakeholder interviews or commercial outcomes.

## Run the bounded tests

Node.js 20+, no external services. In your copied folder:

```bash
node --test measure.test.mjs
```

The untouched starter fails with `TODO`. Passing tests proves only these synthetic calculations. It does not prove instrumentation, real task success, causal impact, adoption or revenue. Actual measurement needs a separately authorized cohort, collection policy, observation window and observed data; none are supplied or claimed here.

## Return evidence

Record actual test output, definitions, the value review, and one uncertainty. Keep synthetic results and hypothetical scenarios visibly labeled. Link the existing discovery acceptance artifact instead of duplicating evidence. A reviewer should be able to recompute every number and see which inputs were absent.

Sources: [GOV.UK measurement guidance](https://www.gov.uk/service-manual/measuring-success/measuring-the-success-of-your-service), [defining service success](https://www.gov.uk/service-manual/service-standard/point-10-define-success-publish-performance-data).
