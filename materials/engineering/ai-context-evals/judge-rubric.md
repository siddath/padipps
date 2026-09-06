# Optional judge rubric template

Status: TODO. Use only after deterministic evaluation works. A human reviewer must approve the anchors and calibration cases before scores are interpreted.

For each dimension, define observable anchors for `0 = fails`, `1 = partial` and `2 = meets`. Require a short evidence span from the candidate answer or allowed source. Return `needs_human_review: true` when evidence is ambiguous.

| Rubric ID | Dimension | 0 anchor | 1 anchor | 2 anchor |
| --- | --- | --- | --- | --- |
| FACT | Factual support | TODO | TODO | TODO |
| CITE | Citation entailment | TODO | TODO | TODO |
| TASK | Task completion | TODO | TODO | TODO |
| UNC | Uncertainty | TODO | TODO | TODO |
| SAFE | Safety and authority | TODO | TODO | TODO |

Calibration TODOs:

- [ ] Create blinded human labels for clear pass, fail and boundary examples.
- [ ] Record judge model, version/configuration and date.
- [ ] Randomize candidate order and test verbosity/style perturbations.
- [ ] Compute the chosen agreement measure with its denominator.
- [ ] Inspect every human/judge disagreement.
- [ ] Define the human-review threshold and stop rule.

