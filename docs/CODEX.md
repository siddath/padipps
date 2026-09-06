# Connect your own Codex

Optional tutoring uses the Codex CLI installed on the person running Padipps. No author account, API configuration, token or hosted AI service is bundled. Default startup leaves this connection disabled.

## Local setup

Install Node 20+ and the supported Codex CLI from the official package, then sign in yourself:

```sh
npm install -g @openai/codex@0.147.0
codex --version
codex login
```

In the cloned Padipps folder:

```sh
npm run chat
```

The server discovers `codex` on your own `PATH`. If you maintain a separate supported installation, set `PADIPPS_CODEX_BIN` to that installation's absolute executable path when starting the server. Keep this setting in your local shell; do not commit a machine-specific path. An existing absolute `CODEX_HOME` selects your own CLI auth store; otherwise the CLI's ordinary home directory is used. Padipps does not read or copy credential values.

Open the printed loopback URL. Choose a pack, then **Ask Padipps Study** on Today or **Study this lesson** within a lesson. Sending uses your Codex account and its normal usage limits. Close the local server to stop accepting new requests. Use `npm start` for study without an enabled model connection.

The official [Codex CLI guide](https://learn.chatgpt.com/docs/codex/cli) describes installation and authentication. Padipps never asks for a password, token or API key in the browser. Do not copy an auth file into this repository or a public issue. CI and Pages need no model credentials.

## Compatibility and troubleshooting

- CLI **0.147.0** is deliberately pinned because the executable-tool denial and startup isolation were tested against that build. A newer version is not automatically trusted; revalidate it before changing the guard. Avoid downgrading another project's CLI blindly; a separate supported installation can be used for Padipps.
- The fixed tutor model is **GPT-5.6 Sol**. Your account must be able to use it. Installation/version status alone is not proof of authentication, network access or model entitlement; the first successful answer establishes a live connection.
- macOS has live connection and cancellation evidence. Linux uses the same POSIX boundary and CI tests with synthetic providers; a live model call on Linux has not been verified in this release. Windows local chat is disabled because the process-group guarantee is not implemented there.
- If Codex is absent, unsupported, signed out, offline or rate-limited, the question remains available with retry and a manual copyable prompt. Sign in through the official Codex CLI yourself, then refresh the connection. No credentials should be placed in a pack or notebook.
- On GitHub Pages, the manual prompt is expected. To receive answers inside Padipps, run the local app with the explicit chat command. The website does not reach into your computer.

## Data and teaching limits

Review the exact lesson context before sending. Only selected context and recent conversation messages are sent; other files, global agent instructions, memories, plugins, notebook entries and focus history are not attached. Source pages are not fetched. The model is instructed to explain one small idea, ask a question or challenge an explanation rather than solve the assigned exercise. It can still be wrong.

Threads are saved per pack revision and lesson in browser storage, with up to 80 retained messages. The model receives at most 12 recent whole messages, bounded to 32,000 Unicode characters. Replies are bounded to 4,000 characters. Markdown/JSON conversation exports are archival and have no restore/import path. They are separate from the notebook's restorable backups.

The provider uses a temporary isolated home/workspace and only an auth-store link for normal CLI sign-in. All other global state is excluded. No executable tools are permitted; unexpected tool/event output is discarded. Read-only sandboxing, same-origin API guards, bounded resources and process-group cancellation provide additional controls. See [privacy](../PRIVACY.md), [architecture](ARCHITECTURE.md) and [tests](TESTING.md).
