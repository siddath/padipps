# Bring your own curriculum repository

Keep lesson text, study tracks, references and exercises in a repository you control. Choose its visibility in your Git host. Padipps reads a JSON pack you import; it does not connect to GitHub accounts, clone repositories, fetch private materials, or synchronize edits.

## Local workflow

1. Clone your curriculum repository using your own Git client and authentication. Keep that checkout outside this public app checkout. Do not copy credentials, Git configuration or learner records into either a pack or the app.
2. Prepare `pack.json` with the pack metadata: `id`, `title`, `description`, `firstSession` and `tracks`. Put the complete session objects in `sessions.json` as an array. [PACKS.md](../PACKS.md) lists the schema. The fictional sample provides a complete session shape.
3. From your Padipps checkout, build an output in your curriculum folder. Replace the example paths with your local paths:

   ```sh
   npm run build:pack -- ../my-curriculum/source ../my-curriculum/release-v1.json
   npm run validate:pack -- ../my-curriculum/release-v1.json
   ```

   The builder reads only `pack.json` and `sessions.json` from the chosen source folder. It validates their combined version 1 envelope and refuses to overwrite an existing output. It does not execute author scripts, read repository authentication, or contact a network. The output directory must already exist.

4. Review the output for teaching accuracy, sensitive text and external links. In the running app choose **Study packs → Import study pack JSON**, select the output, inspect the preview and choose **Use this pack**.
5. Keep the exact JSON revision with the corresponding notebook and focus backups. After editing the source, build a new output, validate it and import it again. A changed content fingerprint opens a separate history even if the pack ID stays the same. The app does not merge revisions or transfer completed work.

To try the two-file format with the public sample, run this from your app checkout. `private-packs/` is ignored by Git and excluded from the static build:

```sh
mkdir -p private-packs/sample-source
node --input-type=module -e 'import fs from "node:fs"; const {pack}=JSON.parse(fs.readFileSync("packs/starter.json","utf8")); const {sessions,...metadata}=pack; fs.writeFileSync("private-packs/sample-source/pack.json",JSON.stringify(metadata,null,2)); fs.writeFileSync("private-packs/sample-source/sessions.json",JSON.stringify(sessions,null,2));'
npm run build:pack -- private-packs/sample-source private-packs/sample-v1.json
npm run validate:pack -- private-packs/sample-v1.json
```

## Integrate your own source tools

Your repository may hold Markdown, a CMS export, or another data model. Write the conversion in that repository and emit the documented `pack.json` and `sessions.json` files, or emit a complete version 1 pack and use `validate:pack`. Padipps does not include a general Markdown parser, CMS connector or scheduled pipeline. Run and review your converters with the permissions their inputs require.

The reusable `padipps/packs` module exports validation functions for your own tooling. `./study`, `./focus` and `./reflections` expose the other pure engines. The package has `private: true` to prevent accidental npm publication; use a local checkout or an explicitly pinned Git dependency.

## Access and privacy

A private Git repository controls access to its own files. Importing a file copies its lesson data into unencrypted browser storage at the current origin. An authenticated repository link in a lesson opens in your browser when clicked; Padipps does not fetch that resource or give the tutor access to it. Do not place access tokens or signed private URLs in pack text. Use your own tools to open exercise files from the local curriculum checkout.

Using the tutor is a separate opt-in. When you press Send, the previewed lesson context and bounded recent messages go through your own configured Codex sign-in. Importing a private pack does not exempt its selected context from that data flow. Read [PRIVACY.md](../PRIVACY.md).

Earlier public releases included generic engineering materials. This release removes them from the current tree and website, but old Git commits and downloaded copies remain public. New private curriculum belongs in a separate repository and must never enter this repository's commits, screenshots or build.

## Existing learners

An app update does not clear browser data. Imported packs continue to load from their existing storage key. The new fictional sample has a new identity; the former default starter's records stay under their original fingerprint. Import your retained exact old pack JSON on the same host, port and browser profile to reopen its notebook. Export your current pack before switching away if you do not already have a copy.
