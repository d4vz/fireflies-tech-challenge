# Meeting detail

Meeting detail is `/meetings/:id`. It plays the stored media, shows processing status, summary / takeaways / action items, and a transcript rail.

## Sub-features

- `detail-open` shows `sourceId` as the page `h1` and a status chip.
- `detail-media` renders stored media. Video uses `<video>` with a thumbnail poster. Audio uses a Mic plus native `<audio controls>`. Both fetch `/api/meetings/<id>/video`.
- `detail-summary` shows Summary, Takeaways, and Action items, including `(no summary)` when missing.
- `detail-transcript` shows transcript text when status is `ready`, `(empty transcript)` when there are no chunks, and a pending skeleton while status is queued or processing.
- `detail-missing` shows `meeting not found` for an unknown id.

## How to get to it (user POV)

- Choose a meeting row on Home or `/meetings`.
- Open `/meetings/:id` directly.

## Driving it with the Cursor browser

Preconditions:

- `control-fireflies doctor` reports `doctor=ok`.
- Viewport is 1440x900 so the transcript rail is docked (`lg+`). Below `lg`, open it with the `Transcript` button.
- A meeting id from `GET <ui_url>/api/meetings?page=1&limit=5` when proving a real record. Use `missing` (or any non-existent id) for the not-found path.

- **Open from list.** From `/meetings`, choose the row named the meeting `sourceId`. Run `browser_click` that link. The article `h1` is that `sourceId`. Status is one of `Queued`, `Processing`, `Ready`, `Failed`.
- **Media.** For `blob.kind` video the page includes a `video` whose `src` is `/api/meetings/<id>/video` and `poster` is `/api/meetings/<id>/thumbnail`. For `blob.kind` audio the page includes `audio` with `controls` and the same `/video` src. There is no `<video>` and no poster. Prove both kinds when both exist in the library.
- **Summary block.** Headings `Summary`, `Takeaways`, and `Action items` are visible. Empty summary text is `(no summary)`.
- **Transcript dock.** On the right, heading `Transcript` (screen-reader text ` for <sourceId>`). Ready with chunks shows the joined chunk text. Ready/failed with no chunks shows `(empty transcript)`. Queued/processing shows the transcript skeleton until status is `Ready` (the dock does not fetch chunks while busy).
- **Unknown id.** Open `/meetings/missing`. Run `browser_navigate` to `http://127.0.0.1:18080/meetings/missing`. Main copy is `meeting not found`.
- **Proof.** Save `artifacts/meeting-detail/detail.aria.txt` and `detail.png` with `sourceId`, status, and the Summary heading. Save `GET <ui_url>/api/meetings/<id>` as `meeting.json`. For a ready meeting also save `GET <ui_url>/api/meetings/<id>/transcripts` as `transcripts.json`.

## Gotchas

- Detail polls every 2s while status is `queued` or `processing`. Transcript fetch is disabled until status is `ready`.
- Failed meetings can still show the media player and `(empty transcript)`.
- The visible media URL is the Next `/video` proxy, not MinIO. A 404 poster on a video meeting is a broken blob, not a missing meeting. Audio never requests `/thumbnail`.
- `When` timestamps format in the browser locale (`en-US`, e.g. `Sep 1, 1:10 AM`). Do not assert the raw ISO string on screen.
