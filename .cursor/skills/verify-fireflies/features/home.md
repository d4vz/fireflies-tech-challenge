# Home

Home is `/`. After Clerk sign-in it greets the session first name (`Verify` on a launch-created user), shows insight cards for the current library sample, lists the two newest meetings under `Last meetings`, and links through to the full meetings list.

## Sub-features

- `home-load` renders the greeting, workspace name, and three insight cards after meetings fetch (`Meetings`, `In progress`, `Tasks`). Busy meetings raise the In progress count. There is no fourth card titled with a meeting `sourceId`.
- `home-empty` shows capture-or-upload copy when no rows match. `Last meetings` and `view more` stay on the page.
- `home-preview` shows at most three meetings in a two-column grid on desktop and one column on mobile. Queued and processing rows show a summary skeleton (`aria-label` `Loading summary`), not empty summary copy.
- `home-more` opens `/meetings` from `view more` beside `Last meetings`.

## How to get to it (user POV)

- Open `/` (app load).
- Choose the `Home` link in the sidebar.

## Driving it with the Cursor browser

Preconditions:

- `control-fireflies doctor` reports `doctor=ok` and `mongo_db=fireflies_verify`.
- Viewport is 1440x900.
- The verify database is empty unless a later bullet says otherwise.

- **Open Home.** Go to `ui_url`. Run `browser_navigate` to the doctor `ui_url`. The heading is `Home`. The greeting matches `Good (Morning|Afternoon|Evening), Verify`. The sidebar `Home` link is `aria-current=page`.
- **Read insights.** Wait until the Home skeleton is gone. Three cards read `Meetings` / `0 in the library`, `In progress` / `0 processing`, `Tasks` / `0 action items` on an empty library. There is never a fourth insight card. `Processing for …` does not appear. After an upload the Meetings count rises. In progress stays a count card, not a `sourceId` title.
- **Last meetings.** The section heading is `Last meetings`. Beside it is a `view more` link. There are no `All` / `Ready` / `Busy` / `Failed` tabs. There is no `Search meetings` textbox.
- **Empty copy.** The page contains `Capture your first meeting` and `No meetings yet. Capture or upload a file to start.` Buttons named `Capture a meeting` and `Upload a recording` are present. `Last meetings` and `view more` stay on the page.
- **Meetings entry.** Choose `view more`. Run `browser_snapshot`, then `browser_click` the link named `view more`. The heading becomes `Meetings` and the URL path is `/meetings`.
- **Return Home.** Choose sidebar `Home`. Run `browser_click` the link named `Home`. URL path is `/`.
- **Proof.** Run `browser_snapshot` to `artifacts/home/home.aria.txt` and `browser_take_screenshot` to `artifacts/home/home.png`. Both show `Verify` and the `Home` heading.

## Gotchas

- Home stays on a skeleton until both the meetings fetch and a client clock tick finish. Wait for the greeting, not a fixed sleep.
- Insight cards stay three (`Meetings`, `In progress`, `Tasks`). A busy library does not add a fourth card titled with `sourceId`.
- A failed fetch shows `could not load meetings` in danger text. That is not empty-library proof. Re-run doctor.
- Home shows at most two meetings. A third library row is only on `/meetings`.
