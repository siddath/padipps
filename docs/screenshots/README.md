# Application screenshots

These are actual browser captures of Padipps 0.4.0 taken on 6 September 2026, using the public app on a separate local port with chat disabled. Each image is 1280 × 720 and shows the fictional sample, with no private curriculum, learner records or account details.

| Image | Visible state |
| --- | --- |
| [Practice library](sample.jpg) | One fictional observation lesson, one sample track, Ink theme. |
| [Study packs](import.jpg) | Current sample identity and the import entry point for user-owned material. |

Both images were inspected for visible private text and metadata. They contain JPEG/JFIF image data with no EXIF, XMP, ICC or comment metadata. Current hashes are recorded in [reviewed-images.json](reviewed-images.json). The separate [historical-images.json](historical-images.json) retains previously reviewed hashes solely so publication checks can inspect reachable Git history; those older images are removed from the current tree.

## Updating the images

Use the public app on a disposable port with `?qa`. Interact through the visible interface. Capture the page itself, excluding desktop windows, account menus and browser chrome. Use only fictional sample content and label any demonstration records. Do not generate a mockup or insert model answers.

Inspect every changed image and its metadata before updating its hash. Hash approval records a manual review; it cannot inspect pixels or prove privacy by itself. Stage intended additions and deletions, run the publication audit, and verify that README image links resolve. Screenshots are repository documentation and are excluded from the static app build.
