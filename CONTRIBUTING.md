# Contributing

Contribute a bounded improvement that helps a learner begin, understand, practise or return to a gap. Keep personal records and private connections outside the repository. The application is vanilla JavaScript with Node's built-in tests and no install-time app dependencies.

## Before a pull request

1. Create a branch and describe the concrete learner problem.
2. Use synthetic QA data, original writing and material you have permission to share. Follow [PACKS.md](PACKS.md) for subjects and [privacy boundaries](PRIVACY.md) for data.
3. Add tests for meaningful observable changes; do not solve TODO exercises to make a test pass.
4. Run `npm run check`, `npm test`, `npm run audit:publication -- --history` and `npm run build`.
5. Check changed flows at desktop and narrow widths, with keyboard and reduced motion. Use `?qa` so test records stay separate.
6. Review files, Git history and the static asset list. Use the GitHub noreply address shown in your account's email settings. Keep secrets, personal exports, local settings, logs and screenshots of real records out of commits.

For README images, follow the [screenshot capture and review procedure](docs/screenshots/README.md). Only reviewed demo captures belong in documentation.

Keep the three-lesson starter stable unless a deliberate content revision is intended. New engineering material belongs in its own pack revision. A pack fingerprint selects a separate notebook; document that consequence instead of silently migrating progress.

AI connection changes need explicit local opt-in, a provider with no executable tools, no browser credentials, bounded requests, failure recovery and independent review. Do not add a public proxy or shared API key as a convenience. GitHub Actions uses synthetic tests and must never require a contributor's Codex auth.

See [testing guidance](docs/TESTING.md), [conventions](docs/CONVENTIONS.md) and [architecture](docs/ARCHITECTURE.md). Report vulnerabilities through [SECURITY.md](SECURITY.md).
