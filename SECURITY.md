# Security policy

Padipps is a local study tool with an optional loopback Codex adapter, not a public AI gateway. Run the backend only on your own machine and keep its loopback binding. The static Pages deployment contains no backend or credential store.

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/siddath/padipps/security/advisories/new). Include the affected revision, reproducible steps, expected/actual behavior and a synthetic example. Do not put credentials, personal notebooks or exploitable details in a public issue. If private reporting is unavailable, ask for a private reporting channel in an issue without including the sensitive details.

## Supported boundary

The current release uses a fixed Codex CLI version and model, explicit local opt-in, isolated startup context, disabled executable tools, strict event parsing and same-origin request validation. Unsupported CLI versions fail closed. A provider or platform update needs new isolation, cancellation and failure-path verification. Standard study features remain usable without an AI connection.

Enable GitHub secret scanning and push protection on forks. Use a GitHub noreply commit email. Before pushing, run the publication audit against files and reachable history, inspect the diff, and check that `dist/` contains only allowlisted browser assets. A key added and later deleted can remain in history. Rotate a leaked credential through its issuing provider and coordinate history remediation; deleting its latest copy is not sufficient.

## Verification limits

The audit covers relevant configuration, access control, injection, data-egress and exceptional-condition boundaries, informed by [OWASP Top 10:2025](https://owasp.org/Top10/2025/), [ASVS 5.0.0](https://owasp.org/www-project-application-security-verification-standard/) and [API Security Top 10:2023](https://owasp.org/API-Security/). Automated checks and sampled live calls are not a penetration test, a guarantee of secret-free future contributions, or compliance certification.
