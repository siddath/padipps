# Migration system design exercise

Use the synthetic incident in `incident.json` to complete `design.md`. Cover the required HLD, LLD, backpressure, and crash/rollback sections. `requirements-checklist.json` is deliberately mechanical: the validator checks whether every required heading has learner-authored content, not whether the design is correct, safe, or technically complete.

## Prerequisites

- Node.js 20 or newer
- No external services or packages

## Validate completeness

From this folder:

```bash
node validate-design.mjs
```

The untouched starter exits non-zero and names all four incomplete sections. Replace the learner markers in `design.md`; do not edit the fixture, checklist, or validator to manufacture a green result.

## Return evidence

Retain the command/output, completed design path, one diagram or readable text equivalent, assumptions, capacity arithmetic, one backpressure trigger, and a crash-point walkthrough. A green completeness check still requires human design review.
