# Padipps

**Make time for understanding.** A local-first study notebook, deliberate practice loop and Pomodoro bookshelf. Bring a study pack, work through one small model, explain it in your own words, make something, and keep a record of what happened.

Padipps is a playful name inspired by colloquial Tamil around studying. It is a small, extensible web app, with no account, database, analytics or AI key required.

[Open Padipps in your browser](https://siddath.github.io/padipps/) · [Pack format](PACKS.md)

## Run

Requires Node.js 20 or newer. There are no package-install or build dependencies.

```sh
git clone https://github.com/siddath/padipps.git
cd padipps
npm start
```

Open http://127.0.0.1:4177. To use another port: `PORT=4178 npm start`.

For a static host, run `npm run build` and serve `dist/` over HTTP(S). The build copies an explicit public asset list. Hash routes work without rewrite rules. This app does not yet have a service worker: a first load and reload require the local server or static host to be reachable. An already loaded session needs no model or remote API.

## What it does

- **Practice:** recognition → small model and trace → explain back → independent work → evidence and a review date. Track filters come from the active pack.
- **Notebook:** session-linked notes, Open / Revisit / Resolved status, up to 20 previous versions, Markdown export and validated JSON restore.
- **Focus room:** configurable focus, short break and long break intervals. Pause and reload preserve your timer. A running countdown continues across page changes and reloads. Every interval starts explicitly.
- **Study shelf:** completed focus timers reveal books. Each new book can carry an idea about philosophy, art or spirituality, with a primary-text or museum source and a question for your break. Choose your interests or turn ideas off. Ideas are editorial interpretations, not quotations.
- **Appearance:** Ink, Sand, Midnight, Violet, Rose and Graphite; a collapsible sidebar; GSAP feedback and transitions with system and manual reduced-motion support.

A book records elapsed timer time. It cannot verify attention or understanding. Practice outcomes are self-reported; reviewer feedback is an additional record, not an automatic verification. The app does not run learner code or grade mastery.

## Bring your own subjects

Open **Study packs**, download the current pack as a template, edit it in a text editor, and import the JSON. Preview it before choosing **Use this pack**. No pack is uploaded to a server. The included starter pack has three original lessons covering an algorithm, retry-safe API design, and durable work recovery.

See [PACKS.md](PACKS.md) for the data contract. A pack can teach another discipline: change the tracks, prompts, traces, tasks, rubrics and references. Pack files contain data only. HTML is displayed as text and source links are restricted to HTTP(S). Do not treat imported teaching material as verified merely because it passes structural validation.

Each pack ID and content revision has its own notebook and focus history. Backups include a SHA-256 fingerprint of the teaching pack and can only be restored against that exact revision. Even editorial edits create a new content fingerprint; retain the original pack to reopen its history. Use a new ID when changing lesson identities, gates or meaning. Switching packs or revisions does not merge learner records. Keep copies of imported pack files so you can reopen their associated notebooks later.

Place unpublished curricula in `private-packs/` or `local-packs/`, both ignored by Git. Backups belong in ignored `backups/`. Imported material stays in your browser unless you choose to export or commit a file yourself. The built-in static build never includes those folders.

## Keep your work

Browser storage is local to an origin and unencrypted. Clearing browser data, changing host/port, or using another browser does not transfer your work. Other scripts on the same origin or someone with access to your browser profile can access its storage. Host on an origin you trust.

Use **Backup** for notebook JSON and Markdown. The **Focus room → Focus record & backup** has a separate focus JSON export. Notebook imports are validated and merged by stable ID, preserving current conflicting entries. Export both versions before reconciling conflicting edits. The app preserves unreadable originals for recovery and reports failed saves. There is no cloud sync.

For a long-lived personal notebook, the Markdown export fits an ordinary folder or Obsidian vault. JSON is the round-trip backup that restores app state.

## Extend and verify

Vanilla browser ES modules and Node’s built-in test runner keep the code small. The pure study, focus, pack and reflection modules are also available through the package’s `./study`, `./focus`, `./packs` and `./reflections` exports. `private: true` prevents accidental npm publication; it does not restrict use of this public repository.

```sh
npm run check
npm test
npm run build
```

Run a disposable UI sandbox with `?qa#today`. QA uses separate browser keys and exposes a five-second focus interval. Never use synthetic QA entries as learning evidence.

Useful next contributions: keyboard-tested pack authoring, accessible sound options, and a user-controlled sync adapter. Add features only when they help someone start a block, learn from it, or return to a gap.

## License

Padipps code and original educational writing use the [MIT license](LICENSE). GSAP is distributed under its separate Standard License. See [third-party notices](THIRD_PARTY_LICENSES.md) for animation, generated artwork and linked source provenance.
