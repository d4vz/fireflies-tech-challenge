# Meetings list

Meetings list is `/meetings`. It shows the library five rows per page, paginates with Previous / Next, and opens a meeting from its row.

## Sub-features

- `list-empty` shows capture copy when `total` is 0.
- `list-rows` shows a preview tile, `sourceId`, status chip, optional summary, and timestamp. Video uses the thumbnail. Audio uses a Mic with sr-only `Audio recording`.
- `list-open` navigates to `/meetings/:id` from a row.
- `list-page` moves between pages when `total` is greater than 5.

## How to get to it (user POV)

- Choose the `Meetings` link in the sidebar.
- Choose `View all meetings` or `View more` on Home.
- Open `/meetings` or `/meetings?page=N` directly.

## Driving it with the Cursor browser

Preconditions:

- `control-fireflies doctor` reports `doctor=ok`.
- Viewport is 1440x900.
- Start on an empty `fireflies_verify` database unless proving rows.

- **Nav entry.** Choose sidebar `Meetings`. Run `browser_click` the link named `Meetings`. Heading is `Meetings`. `Meetings` is `aria-current=page`.
- **Empty library.** On a fresh verify database the main copy is `No meetings yet. Capture or upload a file to start.` There is no Previous/Next bar. After the first upload, the footer reads `Page 1 of 1` with `Previous` and `Next` as muted text.
- **Proxy check.** `GET <ui_url>/api/meetings?page=1&limit=5` returns `{"items":[],"total":0,...}` (field order may vary). Save as `artifacts/meetings-list/empty.json`.
- **Open a row.** After Capture has created at least one meeting, choose the row whose heading is that meeting's `sourceId`. Run `browser_click` the row link. A video row's accessible name starts with `sourceId`. An audio row's accessible name starts with `Audio recording` then `sourceId`. URL is `/meetings/<id>`.
- **Pagination.** When `total` is greater than 5, the footer reads `Page 1 of N` with `Previous` disabled (plain text) and `Next` a link. Choose `Next`. Run `browser_click` the link named `Next`. URL is `/meetings?page=2`. Choose `Previous`. Page 2's Previous goes to `/meetings`.
- **Proof.** Empty run: `artifacts/meetings-list/empty.aria.txt` and `empty.png` show the capture copy and the `Meetings` heading. Populated run: snapshot the row list and save `GET <ui_url>/api/meetings?page=1&limit=5` beside it.

## Gotchas

- Page size is 5. Home uses a different limit (20). A meeting can appear on Home and sit on list page 2. Assert the list URL, not Home rows.
- `Previous` on page 1 is a `<span>`, not a link. A snapshot with no `Previous` link is the disabled state.
- Busy rows refetch every 2s. Do not treat a status flip during the run as a harness bug.
- Row title is `meeting.sourceId` (the upload filename), not a user-edited title. The clickable control is the whole row. A video snapshot will not show a link whose name is only `sourceId`. An audio row includes sr-only `Audio recording` before that name.
- Audio preview is a Mic in the gray `aspect-video` tile. Do not expect a thumbnail image for `blob.kind` audio.
- `Page 1 of 1` still renders when `total` is between 1 and 5. That is not a second page.
