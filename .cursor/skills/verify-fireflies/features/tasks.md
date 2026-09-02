# Tasks

Tasks is `/tasks`. It lists action items grouped by meeting, filters All / Pending / Completed, and lets the user check an item complete or pending. Home's Tasks card and meeting detail use the same checkboxes.

## Sub-features

- `tasks-nav` opens `/tasks` from the sidebar `Tasks` link. The heading is `Tasks`. `Tasks` is `aria-current=page`.
- `tasks-empty` shows empty copy when no groups match the filter. All is `No action items yet`. Pending is `No pending tasks`. Completed is `No completed tasks`.
- `tasks-groups` shows one section per meeting. The header is that meeting's `sourceId` (a link to `/meetings/:id`) plus a timestamp. Rows are native checkboxes. Completed text is struck through.
- `tasks-filter` maps All / Pending / Completed to `status` on `GET /api/actions`. All has no `status` query. Pending is `/tasks?status=pending`. Completed is `/tasks?status=completed`.
- `tasks-toggle` checks or unchecks a row. Reload still shows the new status. Home's Tasks card reads `N pending · M completed` from the meetings sample.

## How to get to it (user POV)

- Choose the `Tasks` link in the sidebar.
- Choose the `Tasks` insight card on Home.
- Open `/tasks`, `/tasks?status=pending`, or `/tasks?status=completed` directly.
- On a meeting detail page, use the Action items checkbox list (same control, different heading).

## Driving it with the Cursor browser

Preconditions:

- `control-fireflies doctor` reports `doctor=ok` and `mongo_db=fireflies_verify`.
- Viewport is 1440x900.
- Empty-library bullets need a fresh verify database. Toggle and grouped-list bullets need at least one `Ready` meeting whose summary produced action items. Use Capture upload, then wait until detail shows Action items checkboxes (not the empty `No action items` line). Tiny samples can stay `Queued`; do not treat that as a Tasks failure. Snapshot empty `/tasks` first, then continue after `Ready`.

- **Nav entry.** Choose sidebar `Tasks`. Run `browser_click` the link named `Tasks`. Heading is `Tasks`. URL path is `/tasks`. `Tasks` is `aria-current=page`.
- **Home card.** From `/`, the Tasks insight card body is `0 pending · 0 completed` on an empty library (desktop). The card is a link named from that copy. Choose it. Run `browser_click` that link. URL path is `/tasks`.
- **Empty All.** On a fresh verify database, `/tasks` shows `No action items yet` and `They appear here when a meeting is ready.` Filters `All`, `Pending`, and `Completed` are present. There is no Previous/Next bar.
- **Empty Pending.** Choose `Pending`. Run `browser_click` the link named `Pending`. URL is `/tasks?status=pending`. Copy is `No pending tasks`.
- **Empty Completed.** Choose `Completed`. Run `browser_click` the link named `Completed`. URL is `/tasks?status=completed`. Copy is `No completed tasks`.
- **Proxy check.** `GET <ui_url>/api/actions?page=1&limit=10` returns `{"items":[],"total":0,...}` on an empty library. `GET <ui_url>/api/actions?page=1&limit=10&status=pending` also has `total` 0. Save empty JSON as `artifacts/tasks/empty.json`.
- **Grouped list.** After a meeting is `Ready` with action items, `/tasks` shows a heading whose name is that meeting `sourceId`. Choose it. Run `browser_click` that heading link. URL is `/meetings/<id>`. The detail `h1` is that `sourceId`. Headings `Summary`, `Takeaways`, and `Action items` are visible. Action items are checkboxes, not a bullet list.
- **Toggle.** On detail or `/tasks`, choose an unchecked Action items checkbox. Run `browser_click` that checkbox. The row text is struck through. Reload the same URL (`browser_navigate` to the current URL). The box stays checked. `GET <ui_url>/api/meetings/<id>` shows that task `status` `completed`. Save as `artifacts/tasks/meeting.json`.
- **Home counts.** Return to `/`. The Tasks card body includes a pending count and a completed count, not `action items`.
- **AskFred pending tasks.** Open AskFred. Type `what pending tasks do I have`, then send. Run `browser_fill` on the textbox named `Ask Fred` with `what pending tasks do I have`, then `browser_click` the button named `Send`. A user bubble with that text appears, then streamed assistant text. The greeting is `Hi Verify!` for the launch Clerk user.
- **Proof.** Empty run: `artifacts/tasks/empty.aria.txt` and `empty.png` show the empty copy and the `Tasks` heading. Populated run: `artifacts/tasks/list.aria.txt` and `list.png` show a meeting group and checkboxes. Toggle run: `artifacts/tasks/toggled.aria.txt` and `toggled.png` after reload. AskFred: `artifacts/tasks/ask-fred.aria.txt` and `ask-fred.png` with the pending-tasks prompt and reply.

## Gotchas

- Sidebar `Tasks` is a real route. It is not a muted placeholder like Analytics.
- Home's large mobile number is pending only. Desktop body is `N pending · M completed`. Snapshot at 1440px to read the full body.
- `/tasks` paginates by meeting group, not by individual task. Page size is 10 groups.
- Meeting detail keeps the heading `Action items`. The library page heading is `Tasks`.
- Do not assert AskFred tool names in the UI. Prove `listActions` by the pending-tasks answer, not by a tool chip.
- Do not POST to Hono `:13000` to complete a task. Toggle the checkbox, then reload.
- Old Mongo docs that still store `summary.actionItems` strings do not appear as tasks until the meeting is processed again. A fresh `fireflies_verify` database does not have those docs.
- If the OS file chooser blocks Capture upload, POST the sample to `<ui_url>/api/meetings/upload?filename=...` with `Authorization: Bearer` from `.run/session.jwt`. A `Cookie: __session=` POST to Next redirects to Clerk sign-in.
