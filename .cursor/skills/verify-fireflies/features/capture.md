# Capture

Capture adds a meeting by recording the screen or uploading a video file. On success the app goes to `/meetings` and the new row appears.

## Sub-features

- `capture-record` starts a screen recording from the `Capture` button and stops with `Stop`.
- `capture-upload` opens the chevron menu, chooses `Upload video`, and sends a file.
- `capture-busy` shows `uploading` in the header and disables Capture while the POST is in flight.
- `capture-error` shows the error string next to Capture when the upload fails.
- `capture-list` lands on `/meetings` with a row whose `sourceId` is the filename.

## How to get to it (user POV)

- Choose `Capture` in the header (screen recording).
- Choose the `Upload video` chevron, then `Upload video`, then pick a file.

## Driving it with the Cursor browser

Preconditions:

- `control-fireflies doctor` reports `doctor=ok`.
- Viewport is 1440x900 so the `Capture` label is visible (`md+`).
- A 2s mp4 exists. Create it with `.cursor/skills/verify-fireflies/scripts/control-fireflies sample-video` and read the printed path.
- The OS may show a display-picker or file-picker the browser tools cannot complete. Follow the fallback in the last bullets rather than calling Hono on the API port.

- **Upload menu.** Choose the chevron. Run `browser_click` the button named `Upload video` (`aria-label`). A menu item named `Upload video` appears.
- **Choose file.** Choose menu `Upload video`. That clicks a hidden `<input type=file>` (`accept` includes `video/mp4`). If `browser_fill` can set that input to the sample mp4 path, do that.
- **Fallback when the file chooser is native.** POST the sample bytes to `<ui_url>/api/meetings/upload?filename=verify-sample.mp4` with `Content-Type: video/mp4`. Expect 201 JSON with `_id` and `sourceId`. This is the same Next route the hidden input uses. Then `browser_navigate` to `<ui_url>/meetings`.
- **Header while uploading.** The header shows `uploading` and Capture is `aria-busy=true` during the POST. After success the app navigates to `/meetings`.
- **List result.** `/meetings` is no longer the empty copy. A row heading matches the uploaded filename (`verify-sample.mp4` or the sample-video basename). Status starts as `Queued` or `Processing`.
- **Second read.** Reload `/meetings` or `GET <ui_url>/api/meetings?page=1&limit=5`. The new `_id` is still present. Save JSON as `artifacts/capture/meetings.json`.
- **Screen record path.** Choose `Capture`. The button becomes `Stop` and the header shows `recording` if `getDisplayMedia` is allowed. If the browser permission prompt appears, stop and record `capture-record` as blocked with that prompt, not as failed product behavior.
- **Proof.** `artifacts/capture/list.aria.txt` and `list.png` show the new row on `/meetings`. Include the upload request status in `notes.md`.

## Gotchas

- The primary `Capture` button is screen recording, not file upload. Clicking it without handling the permission dialog looks like a hang.
- Denied display capture (`NotAllowedError`) clears the recording state and shows no error. That is expected.
- Allowed types are mp4, webm, mov, mkv, m4v. Other files return `file format is not supported`.
- Do not POST to `http://127.0.0.1:13000/meetings/upload` as proof of the user path. The browser never talks to Hono.
- Processing needs ffmpeg plus OpenAI. List appearance after 201 is ingest proof. `Ready` plus transcript is processing proof and can take minutes. Do not wait forever; snapshot `Queued`/`Processing` then move on unless the feature under test is the ready summary.
- Cleanup drops `fireflies_verify`. Keep `artifacts/capture/` .
