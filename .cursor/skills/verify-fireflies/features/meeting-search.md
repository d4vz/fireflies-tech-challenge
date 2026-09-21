# Meeting search

Meeting search lives in the app header. The `Search meetings` box is on every signed-in page. Submit writes `q` and opens `/meetings` as meeting cards. Results stay newest first and keep the status tabs when the user is already on the library.

## Sub-features

- `search-box` shows a textbox named `Search meetings` in the header on Home, Meetings, Tasks, and meeting detail.
- `search-title` keeps only cards whose `name` matches the query and writes `q` on the `/meetings` URL.
- `search-empty` shows `No matching meetings` when the query matches nothing. It does not show capture-first copy.
- `search-clear` with an empty query returns the unfiltered list for the current status tab.
- `search-tabs` keeps `q` when the user chooses All, Ready, Processing, or Failed.

## How to get to it (user POV)

- Use `Search meetings` in the header on Home.
- Use `Search meetings` in the header after choosing the `Meetings` link.
- Use `Search meetings` in the header on Tasks or a meeting detail page.
- Open `/meetings?q=standup` directly.
- Choose `view more` on Home, then use `Search meetings` in the header.

## Driving it with the Cursor browser

Preconditions:

- `control-fireflies doctor` reports `doctor=ok`.
- Viewport is 1440x900.
- Start on an empty `fireflies_verify` database.
- Upload at least two recordings with different names through Capture or the Next upload route. Use names `Weekly standup` and `Payroll`.

- **Open Home.** Choose sidebar `Home`. The heading is `Home`. A textbox named `Search meetings` is present in the header.
- **Search a title from Home.** Click `Search meetings`. Type `standup`. Submit the form (Enter). URL includes `/meetings` and `q=standup`. The `Weekly standup` card is present. The `Payroll` card is absent.
- **Empty match.** Clear the box. Type `no-such-meeting`. Submit. Copy is `No matching meetings` with `Try another title or summary word.` Capture-first copy is absent.
- **Clear.** Clear the box and submit. URL has no `q`. Both uploaded names are present again.
- **Keep q on a tab.** Search `standup` again. Choose `Ready`. URL includes `status=ready` and `q=standup`.
- **Proxy check.** After the title search, `GET <ui_url>/api/meetings?page=1&limit=5&q=standup` returns JSON whose `items` include `Weekly standup` and do not include `Payroll`. Save as `artifacts/meeting-search/meetings.json`.
- **Proof.** Save `artifacts/meeting-search/before.aria.txt` on Home with the header box, `library.aria.txt` on the full library, `after.aria.txt` after the title search, and `after.png` with the `Meetings` heading and `Weekly standup` cards visible.

## Gotchas

- The header owns `Search meetings`. The library body is cards, tabs, and empty copy only.
- Home Last meetings has no search box of its own. Use the header.
- Capture-first copy is only for an empty All list with no `q`. A miss on a populated library uses `No matching meetings`.
- `sample-audio` / `sample-video` prove ingest. Set the upload `name` to the title you will search. Do not rely on a generated summary word.
- Status tabs reset to page 1 and keep `q`. A search from Home, Tasks, or detail opens All.
- Submit the search form. Typing without Enter does not change the URL.
