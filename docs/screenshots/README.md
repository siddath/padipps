# Application screenshots

These are unedited browser captures of Padipps 0.2.0, app revision `5b45173988a447e082a812a02e7a0257af0d47fa`, taken on 6 September 2026. They show the public application running on a separate local port with chat disabled. The browser's default viewport was 1280 × 720; no device emulation or screenshot compositing was used.

| Image | Visible state |
| --- | --- |
| [Practice library](practice.jpg) | Engineering pack selected; 31 lessons, six overlapping track filters; Ink theme. |
| [Notebook](notebook.jpg) | One sample note titled “Demo note: plan the next study block”, marked Revisit; zero recorded attempts; Violet theme. |
| [Focus room](focus.jpg) | Short break ready to start following a five-second QA timer; Sand theme. |
| [Study shelf](shelf.jpg) | One book labelled “QA timer check”, its five-second duration and a source-linked editorial reflection; Sand theme. |

The notebook entry and timer receipt are synthetic demonstration data created through the interface in a `?qa` session. They are not personal notes, study evidence or claims of learning. No model conversation, account details, private connections or credentials were used in these captures. The book illustration is part of the shipped app; its provenance is in [third-party notices](../../THIRD_PARTY_LICENSES.md).

## Updating the images

Use the public app on a disposable port with `?qa`. Interact through the visible interface and label sample records. Capture the page itself, excluding desktop windows, account menus and browser chrome. Keep screenshots faithful to the shipped UI; do not generate a mockup or fill in model answers.

Before committing, inspect every image for private text and check metadata. These JPEGs contain a standard JFIF header and image segments, with no EXIF, XMP, ICC or comment segments. Their exact SHA-256 hashes are recorded in [reviewed-images.json](reviewed-images.json). The publication guard admits only matching bytes at the recorded screenshot paths. A changed image needs another manual review and a new hash; retain reviewed older hashes when they remain in Git history. Hash approval records the review, but cannot inspect pixels or prove privacy by itself.

Run the publication audit and verify that the images render in GitHub's README. Screenshots are repository documentation and are excluded from the static app build.
