# Stack

Stack is the running backend and frontend. Launch opens API port 3000 and UI port 8080. Browser-test signs in with a live Clerk ticket, then drives Home, Meetings, Tasks, and AskFred over Chrome DevTools Protocol.

## Sub-features

- `stack-api` serves `GET /health` with JSON `services.blob` `ok`.
- `stack-ui-sign-in` serves `GET /sign-in` 200 and paints the Clerk sign-in page.
- `stack-ui-root` redirects unsigned `/` to sign-in.
- `stack-login` uses a Clerk sign-in ticket for the launch `Verify` user and lands on Home.
- `stack-nav` opens sidebar Meetings, Tasks, and AskFred after login.

## How to get to it (user POV)

- Start the apps with `control-fireflies launch`.
- Open `http://localhost:8080/sign-in` for the UI.
- After sign-in, open `/`, `/meetings`, and `/tasks`.
- Open `http://127.0.0.1:3000/health` for the API.

## Driving it with the Cursor browser

Preconditions:

- `control-fireflies launch` finished and printed `session=ready`.
- `control-fireflies doctor` prints `doctor=ok`, `blob=ok`, and `session=ready`.

- **Open the API link.** Run `control-fireflies browser-test`, or `browser_navigate` to `health_url`. The page or saved `health.json` includes `"blob":"ok"` (or `services.blob` `ok`). HTTP may be 200 or 503.
- **Open the UI sign-in link.** CDP navigates to `http://localhost:8080/sign-in`. The Next page includes the brand and Clerk `<SignIn />`.
- **Sign in.** Browser-test mints `POST /sign_in_tokens` and calls `window.Clerk.client.signIn.create({ strategy: "ticket" })`. Home shows `Good …, Verify`.
- **Navigate.** Sidebar `Meetings` shows `Capture your first meeting`. Sidebar `Tasks` shows the same empty copy. `AskFred` shows `Hi Verify!`.
- **Proof.** After cleanup: `artifacts/stack/notes.md` has `login: clerk-ticket`. `artifacts/home/home.*` shows Verify. `artifacts/meetings-list/empty.*` and `artifacts/tasks/empty.*` show the capture copy. `artifacts/ask-fred/open.*` shows `Hi Verify!`.

## Gotchas

- Transcribe can fail while the API is up. Do not treat AssemblyAI 401 as a dead server when blob is `ok`.
- Dummy or rejected Clerk keys fail launch. `host_invalid` is not proof.
- Do not treat Chrome `--screenshot` or `--dump-dom` as this proof. Browser-test must use CDP.
- Do not open a URL that is missing from `.run/instance.json`.
- Do not print the Clerk ticket, JWT, or agent-task URL.
