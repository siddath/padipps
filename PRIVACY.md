# Privacy and data flow

Padipps stores learning records in your browser. Optional local tutoring uses your own Codex sign-in after explicit startup and Send. This repository contains reusable software and fictional study material, not a shared account or learner database.

## What stays local

Notebook drafts, notes, attempts, reviewer feedback, focus intervals, themes, imported packs and chat history live in browser storage at the current origin. Pack ID and content fingerprint separate histories. There is no Padipps server database, telemetry or automatic sync. Browser storage is unencrypted and may be cleared by your browser; another script on the same origin or someone with access to that browser profile could read it.

Exports are files you control. Put private exports in the ignored `backups/` folder. Keep unpublished packs in ignored `private-packs/` or `local-packs/`. `.gitignore` reduces accidental staging; it does not remove files already committed, and it cannot stop a deliberate force-add. Review every publication candidate and its history.

## What an optional tutor sends

Running `npm start` does not enable Codex. Running `npm run chat` on your own machine explicitly enables the loopback adapter. Pressing Send shares the exact selected lesson context shown in the interface, the chosen teaching mode, and bounded recent messages with Codex through your own sign-in. Do not type information you do not want sent to that service. OpenAI account terms and usage limits apply; Padipps does not control the provider's retention or account policies.

The full study pack, notebook, focus history, answer keys, completed artifacts and other files are not attached. Source links are pointers, not fetched pages. Both imported lesson text and learner messages are treated as untrusted input. The assistant has no executable tools, file access, connectors or authority to update practice progress. Model output is rendered as text.

The server creates a temporary isolated home and workspace. It links only the current operator's existing Codex auth store for normal CLI authentication; it does not copy tokens into the repo, browser, a pack, an export, or application logs. Global instructions, memories, configuration, plugins and sessions are excluded. The temporary directory is removed after the subprocess closes. The exact supported CLI version is checked on each completion.

## Hosted demo

GitHub Pages serves only the static allowlist. It has no chat backend and no credential store. It never contacts a contributor's localhost or uses a contributor's Codex connection. Study conversation provides a prompt you can manually copy into your own ChatGPT/Codex session, or you can clone the app and enable the local adapter.

## Publication boundary

The repository includes original lessons, intentionally unsolved starter exercises and explicitly fictional fixtures. It excludes private teaching profiles, learner logs, personal records, private curriculum pointers, credentials, local provider settings and private Git history. Public contributor names/handles and retained upstream license attribution are ordinary public repository metadata.

Automated publication checks report file/rule/line findings without printing possible secret values. They are paired with manual content review and GitHub secret scanning/push protection; no finite scan proves that arbitrary future content contains no personal data. If something sensitive is accidentally committed, follow [SECURITY.md](SECURITY.md) and do not repost the value in a public issue.
