# Meetings list

Meetings list is `/meetings`. It shows the library five cards per page, filters All / Ready / Processing / Failed, paginates with Previous / Next, and opens a meeting from its card.

## Sub-features

- `list-empty` shows capture-or-upload copy and CTAs when All has `total` 0.
- `list-filter-empty` shows filter-specific copy on Ready / Processing / Failed when that slice is empty.
- `list-rows` shows a preview tile, `meeting.name` as `h2`, status chip, optional summary, and timestamp. Queued and processing cards show a summary skeleton (`aria-label` `Loading summary`). Video uses the thumbnail. Audio uses a Mic with sr-only `Audio recording`.
- `list-open` navigates to `/meetings/:id` from a card.
- `list-page` moves between pages when `total` is greater than 5.

## How to get to it (user POV)

- Choose the `Meetings` link in the sidebar.
- Choose `view more` on Home (Last meetings).
- Choose the Home `Meetings` insight card (`/meetings`).
- Choose the Home `In progress` insight card (`/meetings?status=processing`).
- Open `/meetings`, `/meetings?page=N`, or `/meetings?status=ready|processing|failed` directly.

## Driving it with the Cursor browser

Preconditions:

- `control-fireflies doctor` reports `doctor=ok`.
- Viewport is 1440x900.
- Start on an empty `fireflies_verify` database unless proving rows.

- **Nav entry.** Choose sidebar `Meetings`. Run `browser_click` the link named `Meetings`. Header heading is `Meetings`. `Meetings` is `aria-current=page`. Tabs `All`, `Ready`, `Processing`, and `Failed` are present. There is no `Queued` tab.
- **Empty library.** On a fresh verify database, All shows `Capture your first meeting` with `No meetings yet. Capture or upload a file to start.` Buttons named `Capture a meeting` and `Upload a recording` are present. There is no Previous/Next bar.
- **Empty Ready.** Choose `Ready`. Run `browser_click` the link named `Ready`. URL is `/meetings?status=ready`. Copy is `No ready meetings` / `They stay on All after processing finishes.`
- **Empty Processing.** Choose `Processing`. URL is `/meetings?status=processing`. Copy is `No processing meetings`.
- **Empty Failed.** Choose `Failed`. URL is `/meetings?status=failed`. Copy is `No failed meetings`.
- **Proxy check.** `GET <ui_url>/api/meetings?page=1&limit=5` returns `{"items":[],"total":0,...}` (field order may vary). Save as `artifacts/meetings-list/empty.json`.
- **Open a card.** After Capture has created at least one meeting, choose the card whose heading is that meeting's `name`. Run `browser_click` the card link. An audio card's accessible name includes `Audio recording`. URL is `/meetings/<id>`.
- **Pagination.** When `total` is greater than 5, the footer reads `Page 1 of N` with `Previous` disabled (button, not a link) and `Next` a link. Choose `Next`. Run `browser_click` the link named `Next`. URL is `/meetings?page=2` (status query stays if a filter is active). Choose `Previous`. Page 2's Previous goes to `/meetings` on All.
- **Proof.** Empty run: `artifacts/meetings-list/empty.aria.txt` and `empty.png` show the capture copy, the four tabs, and the `Meetings` heading. Populated run: snapshot the card grid and save `GET <ui_url>/api/meetings?page=1&limit=5` beside it.

## Gotchas

- Page size is 5. Home uses a different limit (20). A meeting can appear on Home and sit on list page 2. Assert the list URL, not Home rows.
- `Previous` on page 1 is a disabled `<button>`, not a missing control. A snapshot with a disabled Previous is the first-page state.
- Busy cards refetch every 2s. Do not treat a status flip during the run as a harness bug.
- Card title is `meeting.name` (filename stem, e.g. `verify-sample`), not `sourceId` (`verify-sample.mp4`). The clickable control is the whole card.
- Audio preview is a Mic in the gray `aspect-video` tile. Do not expect a thumbnail image for `blob.kind` audio.
- `Page 1 of 1` still renders when `total` is between 1 and 5. That is not a second page.
- There is no Queued tab. Queued meetings stay on All.
