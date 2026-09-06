# Study pack format

Keep your curriculum in a repository or folder you control. This public app includes one fictional observation sample to demonstrate the schema. It bundles no engineering study tracks or exercise materials. See [the local content pipeline](docs/CONTENT_PIPELINE.md) for building, validating and importing your own pack.

Start by downloading **Study packs → Download current pack** or copying [`packs/starter.json`](packs/starter.json). The version 1 envelope is:

```json
{
  "version": 1,
  "pack": {
    "id": "my-subject-v1",
    "title": "My subject",
    "description": "What this pack helps a learner practise.",
    "firstSession": "first-lesson",
    "tracks": [{"id":"basics","title":"Basics","description":"First principles.","sessionIds":["first-lesson"]}],
    "sessions": []
  }
}
```

The envelope above is illustrative; an import needs at least one complete session. Copy the fictional sample session to preserve its required fields.

| Field | Purpose |
| --- | --- |
| `id`, `title`, `category` | Stable lesson identity and readable labels. |
| `home`, `lenses`, `capability` | A safe ownership/category ID, one or more safe lens IDs, and a description of the capability exercised. These are descriptive, not access controls. |
| `estimatedMinutes` | Optional-in-practice pacing guidance, encoded as an integer from 1 to 240. |
| `prompt`, `options`, `answer`, `feedback` | Recognition question, 2–8 options, zero-based correct index and explanation. |
| `model`, `example`, `trigger`, `nonTrigger`, `invariant` | Small model and a concrete worked example, when to use it, when it does not fit, and what must remain true. |
| `trace` | 1–10 `{code, note}` steps. `code` is displayed as text and may describe a non-coding process. |
| `decision` | Another `{prompt, options, answer, feedback}` question based on the trace. |
| `explainPrompt`, `checklist` | A reconstruction prompt and 1–12 honest self-checks. |
| `task`, `rubric` | An independent assignment and 1–12 review criteria. The app does not execute the assignment. |
| `sources` | 1–12 `{label, url}` references. Only HTTP(S), with no embedded username or password. |
| `reviewPrompt`, `prerequisites` | A later retrieval question and an array of preceding lesson IDs. |

Packs are limited to 2 MB, 100 lessons and 20 tracks. Every lesson must be assigned to a track. `all` is reserved for the combined practice view. IDs use letters, numbers, dots, underscores, colons or hyphens; start with a letter or number and stay within 128 characters. Unknown fields and unsafe identifiers are rejected. See `pack-engine.js` for exact text and array bounds.

Use original teaching material or material you have permission to distribute. Reference source passages with links rather than copying whole books. Never put API keys, private learner notebooks, credentials or executable HTML into a pack.

Importing a pack is local. If the learner enables their own Codex and presses Send, the tutor receives the previewed, stage-specific lesson context and recent messages. The adapter does not upload the whole pack, recognition answer keys, notebook or focus record. Imported text remains untrusted teaching content, not instructions that grant tools or file access.

A pack ID and its content fingerprint select the browser notebook. Reusing an ID for incompatible lesson content may make older gated drafts incompatible. Use a new pack ID for those revisions and keep the previous JSON available. Export notebook and focus data before a major change.

Prerequisites are advisory earlier skills, not locks. A pack may deliberately start with a cold diagnostic that has prerequisites. The learner can return to an earlier skill when that diagnostic exposes a gap.
