# Capture

Capture adds a meeting by recording the screen or uploading a video or audio file. On success the session resets and a toast offers `View meeting`. The app does not auto-navigate to `/meetings`.

## Sub-features

- `capture-record` starts a screen recording from the `Capture` button and stops with `Stop`.
- `capture-upload` opens the chevron menu, chooses `Upload`, and sends a file from the name dialog dropzone.
- `capture-busy` shows `uploading` in the header and disables Capture while the POST is in flight.
- `capture-error` shows the error string next to Capture when the upload fails.
- `capture-list` shows a row whose `sourceId` is the filename after ingest (open `/meetings` or the toast link).

## How to get to it (user POV)

- Choose `Capture` in the header (screen recording).
- Choose the `Upload` chevron, then menu `Upload`, then drop or browse a file.

## Driving it with the Cursor browser

Preconditions:

- `control-fireflies doctor` reports `doctor=ok`.
- Viewport is 1440x900 so the `Capture` label is visible (`md+`).
- A 2s mp4 exists. Create it with `.cursor/skills/verify-fireflies/scripts/control-fireflies sample-video` and read the printed path.
- A 2s mp3 exists. Create it with `.cursor/skills/verify-fireflies/scripts/control-fireflies sample-audio` and read the printed path.
- The OS may show a display-picker or file-picker the browser tools cannot complete. Follow the fallback in the later bullets rather than calling Hono on the API port.

- **Upload menu.** Choose the chevron. Run `browser_click` the button named `Upload` (`aria-label`). A menu item named `Upload` appears.
- **Name dialog.** Choose menu `Upload`. A dialog titled `Meeting name` opens. The dropzone copy is `Drop a video or audio file, or click to browse`. Supported files include `.mp4` and `.mp3`.
- **Choose file.** If `browser_fill` can set the dropzone file input to a sample path, do that, type a name, then confirm `Upload`.
- **Fallback when the file chooser is native.** POST the sample bytes to `<ui_url>/api/meetings/upload?filename=verify-sample.mp4` with `Content-Type: video/mp4`. Expect 201 JSON with `_id`, `sourceId`, and `blob.kind` `video`. POST `<ui_url>/api/meetings/upload?filename=verify-sample.mp3` with `Content-Type: audio/mpeg`. Expect 201 and `blob.kind` `audio`. These are the same Next route the dialog uses. Then `browser_navigate` to `<ui_url>/meetings`.
- **Header while uploading.** The header shows `uploading` and Capture is `aria-busy=true` during a UI POST. After success a toast shows processing copy and a `View meeting` link. The current route stays put.
- **List result.** `/meetings` is no longer the empty copy. A video row heading matches `verify-sample.mp4`. An audio row heading matches `verify-sample.mp3` and the link name starts with `Audio recording`. Status starts as `Queued` or `Processing` (tiny samples may already be `Ready`).
- **Second read.** Reload `/meetings` or `GET <ui_url>/api/meetings?page=1&limit=5`. Both `_id`s are still present. Save JSON as `artifacts/capture/meetings.json`.
- **Screen record path.** Choose `Capture`. The button becomes `Stop` and the header shows `recording` if `getDisplayMedia` is allowed. If the browser permission prompt appears, stop and record `capture-record` as blocked with that prompt, not as failed product behavior.
- **Proof.** `artifacts/capture/dialog.png` shows the dropzone and audio extensions. `artifacts/capture/list` proof shows both rows on `/meetings`. Include both upload status codes in `notes.md`.

## Gotchas

- The primary `Capture` button is screen recording, not file upload. Clicking it without handling the permission dialog looks like a hang.
- Denied display capture (`NotAllowedError`) clears the recording state and shows no error. That is expected.
- Allowed types include video (mp4, webm, mov, mkv, m4v) and audio (mp3, wav, m4a, aac, ogg, flac). Other files return `file format is not supported`.
- Screen capture still uploads `video/webm` as video. Do not treat a recording as audio.
- Success does not `router.push` `/meetings`. Looking only at the current URL after confirm is not ingest proof. Open `/meetings` or the toast link.
- Do not POST to `http://127.0.0.1:13000/meetings/upload` as proof of the user path. The browser never talks to Hono.
- Processing needs ffmpeg plus OpenAI. List appearance after 201 is ingest proof. `Ready` plus transcript is processing proof and can take minutes. Do not wait forever; snapshot `Queued`/`Processing` then move on unless the feature under test is the ready summary.
- Cleanup drops `fireflies_verify`. Keep `artifacts/capture/` .
