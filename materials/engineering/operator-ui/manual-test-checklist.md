# Manual test checklist — learner evidence

Record browser, version, viewport, date, and evidence path before checking an item.

- [ ] Page has one clear primary task and a logical heading hierarchy.
- [ ] Every form control has a persistent accessible name and useful instructions.
- [ ] Keyboard-only use reaches and activates every control in a logical order.
- [ ] Focus is always visible and is moved deliberately after dynamic updates.
- [ ] Loading, empty, running, paused, failed, completed, retry, and conflict states are distinguishable without colour alone.
- [ ] Exact retry explains that the existing job was returned; conflicting retry explains what must change.
- [ ] Errors identify the affected job or field and give the next available action.
- [ ] A narrow viewport has no horizontal page scroll or unreachable control.
- [ ] A desktop viewport preserves readable line lengths and scan order.
- [ ] Refresh and repeated actions do not create misleading duplicate rows.
- [ ] `jobs.json` values match what the UI displays; synthetic data is not presented as live production data.
- [ ] Browser console has no uncaught error during the recorded scenarios.

Unchecked means unverified. This checklist requires observed evidence; checking boxes from code inspection alone is insufficient.
