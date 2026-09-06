# Recover the capstone and communicate clearly

Use the same learner-owned [Aster/Birch capstone](../fde-capstone/README.md) and the instrumentation you already wrote. Copy these documents into `delivery/incident/`. This is a fictional tabletop plus a local failure drill. It creates no real customer incident, outage communication or production ownership claim.

Start with the shared `debug-overload` reasoning and your original discovery acceptance scenario. Ask which customer tasks are affected, what remains safe, who decides a mitigation, and when the customer expects another update. Do not replace the missing answers with an invented agreement.

## Independent VS Code work

1. Inspect `incident.json`. In `timeline.md`, record observations separately from hypotheses. Propose at least two causes and a discriminator. The fixture intentionally leaves the cause unresolved.
2. Before changing your local application, define a bounded fault, an observable stop condition and a recovery path. Use the existing HubSpot stub to inject latency or failure; alternatively use a bad local release in your disposable cluster. Preserve accepted jobs, tenant permissions and evidence. Never run this drill against Slack, HubSpot or a customer environment.
3. Execute the fault in your own capstone. Record exact commands, versions, trace IDs and actual before/after output. Test whether a bounded mitigation changes the predicted signals. If considering rollback, check schema compatibility and queued work rather than assuming an image change reverses state.
4. Write initial, progress and recovery drafts in `customer-updates.md`. Include observed impact, known scope, what is happening, what remains uncertain and a next update checkpoint. Use a hypothetical owner/checkpoint in the tabletop; do not imply approval or send any message.
5. In `postmortem.md`, separate mitigation, recovery and confirmed causal evidence. Check Aster and Birch answer delivery, denied retrieval, duplicate effects and backlog reconciliation before proposing closure. Add actionable follow-ups with an owner role and a verification test.

## Commands and runtime requirements

Node.js 20+ can inspect the supplied fixture:

```bash
node -e "const f=require('./incident.json'); console.table(f.timeline)"
```

This prints invented observations and proves no runtime behavior. Actual drilling requires your running local capstone and the dependency fault mechanism you implement. Use its start, scenario-test and fault-toggle commands from the previous sessions; paste those exact invocations into `timeline.md`. For a local Kubernetes drill, always name `--context kind-padipps-fde` and your namespace explicitly. Container/cluster tools being unavailable means the runtime drill is not run, even if the tabletop is complete.

## Return evidence

Record the timeline, draft updates, postmortem, and actual drill outputs in your learning record. Keep one artifact identity for the shared debugging foundation. A reviewer should be able to distinguish fixture observation, your inference, actual local evidence, and unresolved unknowns. No customer update is sent by the exercise.

Sources: [SRE incident response](https://sre.google/workbook/incident-response/), [SRE postmortem practice](https://sre.google/workbook/postmortem-culture/).
