# Meeting detail

Meeting detail is `/meetings/:id`. It plays the stored video, shows processing status, summary / takeaways / action items, and a transcript rail.

## Sub-features

- `detail-open` shows `sourceId` as the page `h1` and a status chip.
- `detail-media` renders the video (`Clip`) with the thumbnail poster.
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
- **Media.** The page includes a `video` (or the poster image while loading) whose `src` is `/api/meetings/<id>/video`.
- **Summary block.** Headings `Summary`, `Takeaways`, and `Action items` are visible. Empty summary text is `(no summary)`.
- **Transcript dock.** On the right, heading `Transcript` (screen-reader text ` for <sourceId>`). Ready with chunks shows the joined chunk text. Ready/failed with no chunks shows `(empty transcript)`. Queued/processing shows the transcript skeleton until status is `Ready` (the dock does not fetch chunks while busy).
- **Unknown id.** Open `/meetings/missing`. Run `browser_navigate` to `http://127.0.0.1:18080/meetings/missing`. Main copy is `meeting not found`.
- **Proof.** Save `artifacts/meeting-detail/detail.aria.txt` and `detail.png` with `sourceId`, status, and the Summary heading. Save `GET <ui_url>/api/meetings/<id>` as `meeting.json`. For a ready meeting also save `GET <ui_url>/api/meetings/<id>/transcripts` as `transcripts.json`.

## Gotchas

- Detail polls every 2s while status is `queued` or `processing`. Transcript fetch is disabled until status is `ready`.
- Failed meetings can still show the video and `(empty transcript)`.
- The visible video URL is the Next proxy, not MinIO. A 404 poster is a broken blob, not a missing meeting.
- `When` timestamps format in the browser locale (`en-US`, e.g. `Sep 1, 1:10 AM`). Do not assert the raw ISO string on screen.
