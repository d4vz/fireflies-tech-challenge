# Meeting detail

Meeting detail is `/meetings/:id`. It plays the stored media, shows processing status, summary, tasks, and a transcript rail of speaker turns.

## Sub-features

- `detail-open` shows `meeting.name` as the page `h1` and a status chip.
- `detail-media` renders stored media. Video uses `<video>` with a thumbnail poster. Audio uses a Mic plus native `<audio controls>`. Both fetch `/api/meetings/<id>/video`.
- `detail-summary` shows Summary and Tasks, including `(no summary)` when missing.
- `detail-transcript` shows speaker turns when status is `ready` and turns exist, `(empty transcript)` when there are no turns, and a pending skeleton while status is queued or processing.
- `detail-missing` shows `meeting not found` for an unknown id.

## How to get to it (user POV)

- Choose a meeting row on Home or `/meetings`.
- Open `/meetings/:id` directly.

## Driving it with the Cursor browser

Preconditions:

- `control-fireflies doctor` reports `doctor=ok`.
- Viewport is 1440x900 so the transcript rail is docked (`lg+`). Below `lg`, open it with the `Transcript` button.
- A meeting id from `GET <ui_url>/api/meetings?page=1&limit=5` when proving a real record. Use `missing` (or any non-existent id) for the not-found path.

- **Open from list.** From `/meetings`, choose the row named the meeting `name`. Run `browser_click` that link. The article `h1` is that `name`. Status is one of `Queued`, `Processing`, `Ready`, `Failed`.
- **Media.** For `blob.kind` video the page includes a `video` whose `src` is `/api/meetings/<id>/video` and `poster` is `/api/meetings/<id>/thumbnail`. For `blob.kind` audio the page includes `audio` with `controls` and the same `/video` src. There is no `<video>` and no poster. Prove both kinds when both exist in the library.
- **Summary block.** Headings `Summary` and `Tasks` are visible. Empty summary text is `(no summary)`. There is no `Takeaways` heading and no `Action items` heading.
- **Transcript dock.** On the right, heading `Transcript` (screen-reader text ` for <name>`). Ready with turns shows each turn as speaker label, `m:ss` start time, and utterance text. Consecutive turns stay separate rows; do not expect joined blob text. Ready/failed with no turns shows `(empty transcript)`. Queued/processing shows the transcript skeleton until status is `Ready` (the dock does not fetch turns while busy).
- **Speaker-rail proof.** `control-fireflies sample-audio` / `sample-video` are 2s sine tones. Those meetings go `Ready` with `(empty transcript)`. To prove a speaker label, upload spoken audio (for example a `say`-generated mp3) through Capture or the Next upload fallback, wait until `Ready`, then confirm the rail shows a speaker such as `A`. A short clip may be only `A`.
- **Unknown id.** Open `/meetings/missing`. Run `browser_navigate` to `{ui_url}/meetings/missing`. Main copy is `meeting not found`.
- **Proof.** Save `artifacts/meeting-detail/detail.aria.txt` and `detail.png` with `name`, status, Summary, and at least one speaker label when the meeting has turns. Save `GET <ui_url>/api/meetings/<id>` as `meeting.json`. For a ready meeting also save `GET <ui_url>/api/meetings/<id>/transcripts` as `transcripts.json`. Each item is `{ index, speaker, start, end, text }` with utterance `text` (not `Speaker: …` prefixes).

## Gotchas

- Detail polls every 2s while status is `queued` or `processing`. Transcript fetch is disabled until status is `ready`.
- Failed meetings can still show the media player and `(empty transcript)`.
- The visible media URL is the Next `/video` proxy, not MinIO. A 404 poster on a video meeting is a broken blob, not a missing meeting. Audio never requests `/thumbnail`.
- `When` timestamps format in the browser locale (`en-US`, e.g. `Sep 1, 1:10 AM`). Do not assert the raw ISO string on screen.
- `h1` is `meeting.name` (filename stem such as `verify-sample`), not `sourceId` (`verify-sample.mp4`).
