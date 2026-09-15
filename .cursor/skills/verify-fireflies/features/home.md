# Home

Home is `/`. After Clerk sign-in it greets the session first name (`Verify` on a launch-created user), shows three insight cards for the current library sample, lists the two newest meetings under `Last meetings`, and shows `Recent tasks` only when pending task groups exist.

## Sub-features

- `home-load` renders the greeting with a waving-hand emoji, a date line, and three insight cards after meetings fetch (`Meetings`, `In progress`, `Tasks`). The large number on Meetings is `total`. The large number on In progress is the busy count. The large number on Tasks is pending count; the desktop body is `N pending · M completed`. Busy meetings raise the In progress count. There is no fourth card titled with a meeting `sourceId`.
- `home-empty` shows capture-or-upload copy when no rows match. `Last meetings` and `view more` stay on the page. `Recent tasks` is omitted when the pending-actions total is 0.
- `home-preview` shows at most two meetings in a two-column grid on desktop and one column on mobile. Queued and processing rows show a summary skeleton (`aria-label` `Loading summary`), not empty summary copy.
- `home-more` opens `/meetings` from `view more` beside `Last meetings`. The Tasks insight card opens `/tasks`. The In progress card opens `/meetings?status=processing`.
- `home-recent-tasks` shows heading `Recent tasks` and a `view more` link named `View more tasks` that goes to `/tasks?status=pending` when at least one pending group exists.

## How to get to it (user POV)

- Open `/` (app load).
- Choose the `Home` link in the sidebar.

## Driving it with the Cursor browser

Preconditions:

- `control-fireflies doctor` reports `doctor=ok`, `blob=ok`, and `session=ready`.
- Viewport is 1440x900.
- The verify database is empty unless a later bullet says otherwise.

- **Open Home.** Go to `ui_url`. Run `browser_navigate` to the doctor `ui_url`. The header `h1` is `Home`. The greeting matches `Good (Morning|Afternoon|Evening), Verify 👋`. A date line under it uses `en-US` weekday, month, and day. The sidebar `Home` link is `aria-current=page`.
- **Read insights.** Wait until the Home skeleton (`aria-label` `Loading home`) is gone. Three cards: title `Meetings` / body `0 in the library` / metric `0`; title `In progress` / body `0 processing` / metric `0`; title `Tasks` / body `0 pending · 0 completed` / metric `0`. Title and body are visible at `md+`. There is never a fourth insight card. After an upload the Meetings metric rises. In progress stays a count card, not a `sourceId` title.
- **Last meetings.** The section heading is `Last meetings`. Beside it is a `view more` link. Home has no `All` / `Ready` / `Processing` / `Failed` tabs. There is no `Search meetings` textbox.
- **Empty copy.** The page contains `Capture your first meeting` and `No meetings yet. Capture or upload a file to start.` Buttons named `Capture a meeting` and `Upload a recording` are present. `Last meetings` and `view more` stay on the page. `Recent tasks` is absent.
- **Meetings entry.** Choose `view more` beside Last meetings. Run `browser_snapshot`, then `browser_click` that link named `view more`. The heading becomes `Meetings` and the URL path is `/meetings`.
- **Return Home.** Choose sidebar `Home`. Run `browser_click` the link named `Home`. URL path is `/`.
- **Proof.** Run `browser_snapshot` to `artifacts/home/home.aria.txt` and `browser_take_screenshot` to `artifacts/home/home.png`. Both show `Verify` and the `Home` heading.

## Gotchas

- Home stays on a skeleton until both the meetings fetch and a client clock tick finish. Wait for the greeting, not a fixed sleep.
- Insight cards stay three (`Meetings`, `In progress`, `Tasks`). A busy library does not add a fourth card titled with `sourceId`.
- A failed fetch shows `could not load meetings` in danger text. That is not empty-library proof. Re-run doctor.
- Home shows at most two meetings. A third library row is only on `/meetings`.
- Home does not show status filter tabs. Those tabs exist only on `/meetings`.
- `Recent tasks` is hidden on an empty pending list. Do not treat a missing section as a harness failure.
