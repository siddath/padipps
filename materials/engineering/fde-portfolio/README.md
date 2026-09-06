# Package an honest capstone case study

Continue [the same learner-owned capstone](../fde-capstone/README.md). This final session productizes your existing artifacts. Put working drafts in its `delivery/portfolio/` folder and link them from one learning record.

The fictional Aster/Birch Slack assistant connects HubSpot and permissioned documents. Reconstruct the full loop unaided: discover → scope → build → secure → deploy → operate → measure → productize. Name what you implemented and actually tested, not what an exercise asked you to do.

## Independent VS Code work

1. Complete `case-study.md` using the original problem, agreed-in-the-fiction versus unknown requirements, scope, decisions, implementation, failed approaches, and evidence. Point each significant claim to an existing artifact and its real result. Link shared evidence rather than recording it again.
2. Write `implementation-guide.md` for a fresh local reader. Reuse your tested handover and versioned environment; explain assumptions, setup, synthetic fixtures, authorization checks, fault drill and known limits. Do not maintain a contradictory second runbook: link the owned one.
3. In `release-allowlist.txt`, enumerate only files intended for a fresh local sanitized candidate. Default is empty. Manually inspect source, screenshots, logs, metadata, generated assets, sample configuration, and dependency licenses. Exclude unrelated records and Git history, credentials, real customer material, personal paths, and private screenshots. Recreate any screenshot using fictional data.
4. Copy only reviewed files into a separate local candidate directory. Do not initialize a remote, upload, publish a package or change repository visibility. This exercise's output is a reviewable local candidate; a future publication needs its own explicit scope and review.
5. Reproduce the guide from a clean directory/environment. Record exact commands/output, missing steps and fixes. Request an independent claim review when feasible; otherwise label it self-review. Record a concise demo without private panels or invented business impact.

## Commands and acceptance evidence

Use Node.js 20+ to inspect your case study and candidate file list, plus the actual runtime requirements already documented by your capstone. In the copied portfolio folder:

```bash
node -e "const fs=require('node:fs'); console.log(fs.readFileSync('release-allowlist.txt','utf8'))"
```

This displays your proposed list; it neither copies files nor sanitizes them. Inspect every allowlisted file and the entire candidate separately. A secret scanner may supplement review, but neither a clean scan nor a filename allowlist certifies absence of private content.

Rerun the documented application tests, clean installation, permission-denial scenario, and one failure/recovery drill from the candidate. Record actual commands and outputs in your learning record. If deployment, independent reader testing, or any competency is unfinished, the case study must say so. Do not claim production, compliance certification, real customers, or measured ROI from this exercise.

## Return evidence

Link the case study, implementation guide, inspected local candidate, reproduction result, and review notes in your learning record. The candidate reuses reviewed code and artifacts. Finish with one supported claim, one limitation, and the next smallest demonstration that would close it.

Sources: [Diátaxis](https://diataxis.fr/), [SRE learning from incidents](https://sre.google/workbook/postmortem-culture/), [measuring service outcomes](https://www.gov.uk/service-manual/measuring-success/measuring-the-success-of-your-service).
