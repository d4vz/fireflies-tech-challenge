# Meeting search

Meeting search lives in the app header. The `Search meetings` box is on every signed-in page. Typing opens a shadcn dropdown of meeting cards with preview, title, summary, and status. The current page does not change to `/meetings`.

## Sub-features

- `search-box` shows a textbox named `Search meetings` in the header on Home, Meetings, Tasks, and meeting detail.
- `search-title` keeps only cards whose `name` matches the query.
- `search-summary` keeps cards whose summary text matches, even when the title does not.
- `search-empty` shows `No matching meetings` in the dropdown when the query matches nothing.
- `search-open` opens a meeting from a dropdown card. The URL becomes `/meetings/:id`. It does not become `/meetings?q=`.

## How to get to it (user POV)

- Use `Search meetings` in the header on Home.
- Use `Search meetings` in the header after choosing the `Meetings` link.
- Use `Search meetings` in the header on Tasks or a meeting detail page.

## Driving it with the Cursor browser

Preconditions:

- `control-fireflies doctor` reports `doctor=ok`.
- Viewport is 1440x900.
- Start on an empty `fireflies_verify` database.
- Upload at least two recordings with different names through Capture or the Next upload route. Use names `Weekly standup` and `Payroll`. Spoken audio is required for `search-summary`.

- **Open Home.** Choose sidebar `Home`. The heading is `Home`. A textbox named `Search meetings` is present in the header. URL path stays `/`.
- **Search a title from Home.** Click `Search meetings`. Type `standup`. A dropdown opens on Home. The `Weekly standup` card is present. The `Payroll` card is absent. URL path is still `/`. It does not include `q=standup`.
- **Search a summary word.** Clear the box. Type a word that is in one summary and not in either title. Only that meeting card is present. URL path stays `/`.
- **Empty match.** Clear the box. Type `no-such-meeting`. Dropdown copy is `No matching meetings` with `Try another title or summary word.`
- **Open a card.** Choose the visible meeting card. URL is `/meetings/<id>`.
- **Proxy check.** After the title search, `GET <ui_url>/api/meetings?page=1&limit=4&q=standup` returns JSON whose `items` include `Weekly standup` and do not include `Payroll`. Save as `artifacts/meeting-search/meetings.json`.
- **Proof.** Save `artifacts/meeting-search/before.aria.txt` on Home, `after.aria.txt` with the dropdown open, and `after.png` with the `Home` heading still visible and the matching card in the dropdown.

## Gotchas

- The header owns `Search meetings`. Do not treat a navigation to `/meetings?q=` as this feature.
- Home Last meetings has no search box of its own. Use the header.
- `sample-audio` / `sample-video` prove ingest. Summary search needs spoken audio and a Ready summary.
- Submit is not required. Typing a non-empty query opens the dropdown.
