# Accessibility and usability review rubric

Score only observed behavior. Mark `Not tested` when evidence is absent.

| Area | Evidence to collect | Meets the bar when |
|---|---|---|
| Task hierarchy | First-view screenshot and first-click observation | The current operational decision and primary action are apparent without explanation. |
| Semantics | DOM/accessibility-tree inspection | Landmarks, headings, labels, tables/lists, buttons, and status messages match their purpose. |
| Keyboard | Recorded tab order and activation result | Every action is reachable, focus remains visible, order is logical, and no trap occurs. |
| Status and errors | Retry, conflict, loading, empty, paused, failed, and completed scenarios | Meaning does not rely on colour alone; the message gives a next action where one exists. |
| Form behavior | Label, validation, submit, duplicate-submit observations | Inputs have persistent labels; validation is specific; submit state prevents uncertainty. |
| Responsive use | Narrow and desktop viewport observations | Content remains readable and actionable without hidden controls or horizontal page scrolling. |
| Data trust | Compare UI against `jobs.json` | IDs, state, progress, timestamps, and synthetic provenance are presented without invented claims. |

The rubric does not certify WCAG conformance, production readiness, or operator acceptance. Record reviewer, browser, viewport, date, and unresolved issues with the result.
