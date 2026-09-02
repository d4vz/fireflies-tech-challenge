# Home

Home is `/`. It greets `Davi`, shows insight cards for the current library sample, filters that sample with All / Ready / Busy / Failed tabs and a `sourceId`-or-summary search, and links through to the full meetings list.

## Sub-features

- `home-load` renders the greeting, workspace name, and three insight cards after meetings fetch (`Meetings`, `In progress`, `Tasks`). Busy meetings raise the In progress count. There is no fourth card titled with a meeting `sourceId`.
- `home-empty` shows empty copy and `View all meetings` when no rows match.
- `home-tabs` filters rows by All, Ready, Busy, and Failed without leaving `/`.
- `home-search` filters by `sourceId` or summary text from the header search box.
- `home-more` opens `/meetings` from `View more` when rows exist.

## How to get to it (user POV)

- Open `/` (app load).
- Choose the `Home` link in the sidebar.
- Submit the header search from another route (that navigation lands on Home with `?q=`).

## Driving it with the Cursor browser

Preconditions:

- `control-fireflies doctor` reports `doctor=ok` and `mongo_db=fireflies_verify`.
- Viewport is 1440x900.
- The verify database is empty unless a later bullet says otherwise.

- **Open Home.** Go to `ui_url`. Run `browser_navigate` to `http://127.0.0.1:18080/`. The heading is `Home`. The greeting matches `Good (Morning|Afternoon|Evening), Davi`. The sidebar `Home` link is `aria-current=page`.
- **Read insights.** Wait until the Home skeleton is gone. Three cards read `Meetings` / `0 in the library`, `In progress` / `0 processing`, `Tasks` / `0 action items` on an empty library. There is never a fourth insight card. `Processing for …` does not appear. After an upload the Meetings count rises. In progress stays a count card, not a `sourceId` title.
- **Empty copy.** The page contains `No meetings in this view.` and a `View all meetings` link.
- **Meetings entry.** Choose `View all meetings`. Run `browser_snapshot`, then `browser_click` the link named `View all meetings`. The heading becomes `Meetings` and the URL path is `/meetings`.
- **Return Home.** Choose sidebar `Home`. Run `browser_click` the link named `Home`. URL path is `/`.
- **Tabs.** Choose `Ready`, then `Busy`, then `Failed`, then `All`. Run `browser_click` those links in order. The URL gains `?tab=ready`, `?tab=busy`, `?tab=failed`, then returns to `/` for All. Empty copy stays visible on an empty library.
- **Search.** Focus `Search meetings`, type `volcano`, submit. Run `browser_fill` on the textbox named `Search meetings` with `volcano`, then `browser_press_key` with `Enter`. URL is `/?q=volcano`. Empty copy stays visible.
- **Proof.** Run `browser_snapshot` to `artifacts/home/home.aria.txt` and `browser_take_screenshot` to `artifacts/home/home.png`. Both show `Davi` and the `Home` heading.

## Gotchas

- Home stays on a skeleton until both the meetings fetch and a client clock tick finish. Wait for the greeting, not a fixed sleep.
- Insight cards stay three (`Meetings`, `In progress`, `Tasks`). A busy library does not add a fourth card titled with `sourceId`.
- A failed fetch shows `could not load meetings` in danger text. That is not empty-library proof. Re-run doctor.
- Tab labels omit the count when the count is 0. Do not require `All 0`.
- Header search is `md+` only. The 1440px viewport is required for that box. Below `md`, search is inside the Home canvas.
- Search matches `sourceId` and summary text, not a separate title field.
- Search from `/meetings` `router.push`es to Home. Search already on Home `router.replace`s. Assert the URL, not the history stack.
- `⌘K` / `Ctrl+K` focuses search only when the header search is mounted (`hotkey=true`).
