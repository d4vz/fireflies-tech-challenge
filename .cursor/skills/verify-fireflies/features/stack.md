# Stack

Stack is the running backend and frontend. Launch opens API port 3000 and UI port 8080. Browser-test loads those links and checks that the server and the UI answer.

## Sub-features

- `stack-api` serves `GET /health` with JSON `services.blob` `ok`.
- `stack-ui-sign-in` serves `GET /sign-in` 200 and paints a page in Chrome.
- `stack-ui-root` redirects unsigned `/` to sign-in.
- `stack-links` prints `ui_url`, `sign_in_url`, and `health_url` for a human or agent to open.

## How to get to it (user POV)

- Start the apps with `control-fireflies launch`.
- Open `http://localhost:8080/sign-in` for the UI.
- Open `http://localhost:8080/` (redirects to sign-in when signed out).
- Open `http://127.0.0.1:3000/health` for the API.

## Driving it with the Cursor browser

Preconditions:

- `control-fireflies launch` finished and printed `ui_url` and `health_url`.
- `control-fireflies doctor` prints `doctor=ok` and `blob=ok`.

- **Open the API link.** Run `control-fireflies browser-test`, or `browser_navigate` to `health_url`. The page or saved `health.json` includes `"blob":"ok"` (or `services.blob` `ok`). HTTP may be 200 or 503.
- **Open the UI sign-in link.** Chrome shows `http://localhost:8080/sign-in`. Document title is `Meetings`, or Clerk markup is present, or Clerk prints `host_invalid` when keys are placeholders. That last case still proves Next is serving.
- **Open the UI root.** Unsigned `/` redirects to `/sign-in`.
- **Proof.** `artifacts/stack/health.png`, `sign-in.png`, `root.png`, and `notes.md` exist after cleanup.

## Gotchas

- Transcribe can fail while the API is up. Do not treat AssemblyAI 401 as a dead server when blob is `ok`.
- Clerk placeholder keys show `host_invalid` instead of the sign-in form. The UI process is still working.
- Do not open a URL that is missing from `.run/instance.json`.
- Signed-in Home is a different feature. It needs `session=ready`.
