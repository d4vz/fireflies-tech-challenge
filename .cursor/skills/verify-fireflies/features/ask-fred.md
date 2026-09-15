# AskFred

AskFred is a right-hand sheet. It opens from the header, the sidebar, or `?fred=1`, accepts a prompt or a chip, and streams a reply from `/api/ask-fred`.

## Sub-features

- `fred-open-header` opens AskFred from the header control.
- `fred-open-nav` opens AskFred from the sidebar `AskFred` link.
- `fred-open-url` opens AskFred from `/?fred=1` (and keeps other query params when already on that path).
- `fred-send` appends the user text, then streams assistant text from `/api/ask-fred`. The composer placeholder is `Ask anything here`.
- `fred-chip` sends a canned prompt from a chip button.
- `fred-close` closes the sheet with `Close AskFred` and drops `fred` from the URL.
- `fred-error` shows the stream error under the chips when `/api/ask-fred` fails.

## How to get to it (user POV)

- Choose header `AskFred`.
- Choose sidebar `AskFred`.
- Open `/?fred=1` (from `/meetings` this is also what header/sidebar produce).

## Driving it with the Cursor browser

Preconditions:

- `control-fireflies doctor` reports `doctor=ok`.
- Viewport is 1440x900. AskFred is a right sheet at every width (`sm:max-w-[420px]`, `modal={false}`). There is no dock layout.
- Start on `ui_url` `/`.

- **Header entry.** Choose header `AskFred`. Run `browser_click` the link named `AskFred` in the header (`aria-label=AskFred`). URL includes `fred=1`. The sheet heading text is `AskFred`. The first assistant line is `Hi Verify!` then `Get ready for your meeting.` (`Verify` is the launch Clerk first name via `displayName`).
- **Close.** Choose `Close AskFred`. Run `browser_click` the link named `Close AskFred`. URL no longer has `fred`. The sheet is gone.
- **Sidebar entry.** Choose sidebar `AskFred`. Run `browser_click` the nav link named `AskFred`. URL includes `fred=1` and the sheet is back. From `/meetings` this same control goes to `/?fred=1`.
- **URL entry.** Open `/?fred=1` directly. Run `browser_navigate` to `{ui_url}/?fred=1`. Same sheet as header entry.
- **Type and send.** The `Ask Fred` field placeholder is `Ask anything here`. Type `what is queued`, then send. Run `browser_fill` on the textbox named `Ask Fred` with `what is queued`, then `browser_click` the button named `Send`. A user bubble with `what is queued` appears, then streamed assistant text. A failed stream shows danger text under the chips; a successful send does not.
- **Chip.** Choose `What's my day looking like?` or `Pending tasks across all meetings`. Run `browser_click` that button. A user bubble with that chip text appears, then streamed assistant text. After the first assistant reply, the chips are gone.
- **Proof.** `artifacts/ask-fred/open.aria.txt` and `open.png` show the sheet, `Hi Verify!`, and `fred=1` in the URL. `artifacts/ask-fred/sent.aria.txt` and `sent.png` show the user bubble and streamed assistant text.

## Gotchas

- AskFred calls Next `POST /api/ask-fred`, which proxies the UI message stream to Hono `POST /ask-fred`. Closing the sheet on Home keeps the thread. Leaving Home drops client messages. A send is not persisted on the server.
- Off Home, header AskFred always goes to `/?fred=1` and drops the meetings route.
- On Home it keeps other query params (`/?fred=1` plus any existing search).
- `fred=0` is a closed chrome state, not the default. Default Home has no `fred` query. Close uses `fred` unset, not `0`.
- Blank submit does nothing. Trimmed empty strings do not add bubbles.
- Placeholder chips hide after the first assistant reply. They are `What's my day looking like?` and `Pending tasks across all meetings`.
- `ASSISTANT_DOCK_AT` in source is unused. Do not wait for a dock at `xl`. Read the sheet titled `AskFred`.
- While a reply is pending, the sheet can show `Thinking...`.
