# Testing Padipps

Run syntax, behavioral tests, the redacted publication guard and the static build from the repository root. CI uses Node 22 on Linux and synthetic providers; it does not require Codex credentials or make model calls.

```sh
npm run check
npm test
npm run audit:publication -- --history
npm run build
```

## Coverage

- Study/notebook: gates, self-reported outcomes, validation, note revisions, migration, exports and conflict-preserving restore.
- Packs/backups: data-only schema, safe references, lesson identity, content fingerprints, separate revision histories and starter compatibility.
- Focus/reflections: immutable pause/resume, elapsed deadline recovery, explicit interval starts, exactly-once timer receipts, retention and source-linked editorial ideas.
- Engineering library: complete reusable tracks, valid source/material pointers, ordered prerequisites and intentionally unsolved assignments.
- Conversation: per-pack/lesson isolation, drafts and retention, explicit context, rendering/error boundaries, own-auth resolution, disabled default, version/tool guards, cancellation and request/resource limits.
- Server/publication: loopback Host/origin checks, served-file allowlist, blocked credential/private paths, rejected secret patterns, redacted findings and static/backend separation.

## Real interface checks

Use a disposable port and `?qa` namespace. Preview/select the engineering pack, compare each track, open a lesson, switch back to the unchanged starter and confirm histories stay separate. Start a five-second QA focus block only inside the QA namespace; a timer receipt must never count as a practice attempt.

Check Explain/Quiz/Check, saved drafts across reload, a pending response while changing lessons, Stop/Retry and actual exported files. Test default-disabled and static-host manual-copy fallback before any explicitly authorized live model probe. Test a different synthetic auth home without reading real credentials. Confirm browser requests stay on the app's own origin and the hosted build makes no localhost connection.

Use desktop and 375px views, visible keyboard focus and reduced motion. Check console errors and horizontal overflow. Browser emulation does not prove real-handset performance or screen-reader behavior.

## Avoid false confidence

Do not replace the behavior under test with a mock of itself, solve TODO starters, count a fixture as a live integration, or use real learner evidence during QA. A model reply is not proof of learning. Pattern scans do not replace a content review or establish that every future contribution is free of personal information. Re-run checks after changes that invalidate their evidence.
