# Meeting search

Meeting search lives on `/meetings`. The `Search meetings` box filters the library by meeting title or summary text. Results stay newest first and keep the status tabs.

## Sub-features

- `search-box` shows a textbox named `Search meetings` on `/meetings`, including an empty library.
- `search-title` keeps only rows whose `name` matches the query and writes `q` on the URL.
- `search-empty` shows `No matching meetings` when the query matches nothing. It does not show capture-first copy.
- `search-clear` with an empty query returns the unfiltered list for the current status tab.
- `search-tabs` keeps `q` when the user chooses All, Ready, Processing, or Failed.

## How to get to it (user POV)

- Choose the `Meetings` link in the sidebar, then use `Search meetings`.
- Open `/meetings?q=standup` directly.
- Choose `view more` on Home, then use `Search meetings`. Home has no search box.

## Driving it with the Cursor browser

Preconditions:

- `control-fireflies doctor` reports `doctor=ok`.
- Viewport is 1440x900.
- Start on an empty `fireflies_verify` database.
- Upload at least two recordings with different names through Capture or the Next upload route. Use names `Weekly standup` and `Payroll`.

- **Open the library.** Choose sidebar `Meetings`. Run `browser_click` the link named `Meetings`. Heading is `Meetings`. A textbox named `Search meetings` is present.
- **Search a title.** Click `Search meetings`. Type `standup`. Submit the form (Enter). URL includes `q=standup`. The `Weekly standup` row is present. The `Payroll` row is absent.
- **Empty match.** Clear the box. Type `no-such-meeting`. Submit. Copy is `No matching meetings` with `Try another title or summary word.` Capture-first copy is absent.
- **Clear.** Clear the box and submit. URL has no `q`. Both uploaded names are present again.
- **Keep q on a tab.** Search `standup` again. Choose `Ready`. URL includes `status=ready` and `q=standup`.
- **Proxy check.** After the title search, `GET <ui_url>/api/meetings?page=1&limit=5&q=standup` returns JSON whose `items` include `Weekly standup` and do not include `Payroll`. Save as `artifacts/meeting-search/meetings.json`.
- **Proof.** Save `artifacts/meeting-search/before.aria.txt` on the full library, `after.aria.txt` after the title search, and `after.png` with the `Meetings` heading and `Weekly standup` visible.

## Gotchas

- Home has no `Search meetings` box. Do not treat Home as this feature.
- Capture-first copy is only for an empty All list with no `q`. A miss on a populated library uses `No matching meetings`.
- `sample-audio` / `sample-video` prove ingest. Set the upload `name` to the title you will search. Do not rely on a generated summary word.
- Status tabs reset to page 1 and keep `q`.
- Submit the search form. Typing without Enter does not change the URL.
