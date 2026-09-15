---
name: verify-fireflies
description: >-
  Verify the Fireflies app by running the backend and frontend, signing in
  with live Clerk keys, then navigating Home / Meetings / Tasks / AskFred
  over Chrome DevTools Protocol.
---

# Verify Fireflies

Start the Hono API and the Next.js UI. Sign in with a live Clerk secret and publishable key. Drive Home, Meetings, Tasks, and AskFred over Chrome DevTools Protocol. Do not treat a curl-only check as the browser test. Chrome `--screenshot` / `--dump-dom` is not CDP.

The helper is `.cursor/skills/verify-fireflies/scripts/control-fireflies`. Run it from any cwd.

```
.cursor/skills/verify-fireflies/scripts/control-fireflies launch
.cursor/skills/verify-fireflies/scripts/control-fireflies doctor
.cursor/skills/verify-fireflies/scripts/control-fireflies browser-test
.cursor/skills/verify-fireflies/scripts/control-fireflies cleanup
```

`browser-test` is the default proof. It starts system Chrome with `--remote-debugging-port` and runs `scripts/cdp-capture.mjs` (Node 22 WebSocket). CDP methods: `Page.navigate`, `Page.captureScreenshot`, `Runtime.evaluate`, `Accessibility.getFullAXTree`, plus a Clerk ticket `signIn` on `window.Clerk`. It:

- Opens `/health`, then `/sign-in`
- Mints `POST /sign_in_tokens` for the launch Clerk user
- Signs in and waits for `Verify` on Home
- Clicks sidebar `Meetings`, `Tasks`, `AskFred`, then `Home`

Clerk's development handshake hangs on `127.0.0.1`, so the UI binds `localhost`. The browser talks to Next `/api/*`, not to Hono.

Read `features/README.md` before a deeper feature run. Launch must print `session=ready`. Dummy Clerk keys (`dummy.clerk.accounts.dev`) fail launch.

## Launch

Launch starts MongoDB, Redis, and MinIO from `backend/docker-compose.yml`, then:

| process | default port | command |
| --- | --- | --- |
| Hono API | `FIREFLIES_API_PORT` or **3000** | `bun src/server.ts` |
| Next.js UI | `FIREFLIES_UI_PORT` or **8080** | `next dev --hostname localhost` |

It does not start the compose `api` or `web` services. Isolation is Mongo DB `fireflies_verify`, Redis DB 15, and bucket `fireflies-verify`.

Ready when:

- `GET http://127.0.0.1:<api-port>/health` returns JSON with `services.blob` `ok` (HTTP 200 or 503). Transcribe may fail if AssemblyAI is a placeholder; that does not block launch.
- `GET http://localhost:<ui-port>/sign-in` is 200.

Launch creates a Clerk verify user (`Verify`, `+clerk_test` email) and writes `session=ready`. Invalid or dummy Clerk keys fail launch. Browser-test mints a fresh sign-in ticket for that user.

Logs: `.cursor/skills/verify-fireflies/.run/`. Do not print JWT or agent-task files.

Secrets: parent `.env`, `backend/.env`, `backend/.env.local`, `frontend/.env.local`, `$FIREFLIES_VERIFY_ENV`, then process env (env wins). Need `OPENAI_API_KEY`, `ASSEMBLYAI_API_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. Compose fills Mongo / Redis / MinIO when those keys are absent. If Docker Hub denies `minio/minio`, launch tags `quay.io/minio/minio:latest`.

If 8080 or 3000 is busy, stop that process or set `FIREFLIES_UI_PORT` / `FIREFLIES_API_PORT`. A second UI on the same `distDir` is not supported; non-8080 launches set `NEXT_DIST_DIR=.next-verify`.

## Doctor

```
.cursor/skills/verify-fireflies/scripts/control-fireflies doctor
```

Worth opening in a browser when stdout ends with `doctor=ok` and includes:

- `ui_url=http://localhost:8080` (or the port you set), owned by the UI pid
- `api_url=http://127.0.0.1:3000` (or the port you set), owned by the API pid
- `health_url=.../health` with `blob=ok`
- `GET <ui_url>/sign-in` 200
- `GET <ui_url>/` without a session redirects to sign-in
- `GET <ui_url>/api/meetings?page=1&limit=5` without a session is 401 or a sign-in redirect

`transcribe=` and `session=` are reported. `session=ready` is required. `session=missing` fails doctor and browser-test.

If doctor fails, read `.run/api.log` and `.run/ui.log`, then cleanup and relaunch.

## Drive

Default harness: `control-fireflies browser-test`. It writes `artifacts/stack/`, `artifacts/home/`, `artifacts/meetings-list/`, `artifacts/tasks/`, and `artifacts/ask-fred/`.

The CDP client is `scripts/cdp-capture.mjs`. Prove capture and click without the app via `scripts/test_cdp_harness.py`.

Deeper recipes use Cursor `browser_*` tools against `ui_url`, or `snapshot <feature-id>`. Viewport 1440x900. Handles are in the feature files.

Stable signed-in handles:

| name | where |
| --- | --- |
| greeting `Good …, Verify` | Home after Clerk ticket sign-in |
| sidebar `Home` / `Meetings` / `Tasks` / `AskFred` | AppFrame nav |
| `Hi Verify!` | AskFred sheet |
| brand `alt="Fireflies"` | sign-in and sidebar |

## Evidence

Write under `.cursor/skills/verify-fireflies/artifacts/<feature-id>/`. Cleanup leaves this tree.

Browser-test proof:

- `artifacts/stack/notes.md` with `harness: cdp` and `login: clerk-ticket`
- `artifacts/stack/health.*` of `/health` with blob `ok`
- `artifacts/stack/sign-in.*` of `/sign-in` before the ticket
- `artifacts/home/home.*` with `Verify` and the greeting
- `artifacts/meetings-list/empty.*` with `Capture your first meeting`
- `artifacts/tasks/empty.*` with the same empty copy
- `artifacts/ask-fred/open.*` with `Hi Verify!`
- `artifacts/stack/root.*` after returning to Home

Proof standards:

- Chrome CDP signed in with a Clerk ticket. HTTP-only is not enough.
- Blob `ok` proves the API process and MinIO. Transcribe `ok` is extra.
- `host_invalid` or `session=missing` is a failed run. Use live Clerk keys and allow localhost.

## Cleanup

```
.cursor/skills/verify-fireflies/scripts/control-fireflies cleanup
```

Kills only the UI and API pids in `.run/instance.json`, drops the verify DB / Redis DB / bucket scratch, and stops compose only if this launch started it. It does not kill by process name. It does not delete `artifacts/`.

## Helpers

```
.cursor/skills/verify-fireflies/scripts/control-fireflies launch
.cursor/skills/verify-fireflies/scripts/control-fireflies doctor
.cursor/skills/verify-fireflies/scripts/control-fireflies status
.cursor/skills/verify-fireflies/scripts/control-fireflies session
.cursor/skills/verify-fireflies/scripts/control-fireflies browser-test
.cursor/skills/verify-fireflies/scripts/control-fireflies snapshot <feature-id> [path]
.cursor/skills/verify-fireflies/scripts/control-fireflies cleanup
.cursor/skills/verify-fireflies/scripts/control-fireflies sample-video
.cursor/skills/verify-fireflies/scripts/control-fireflies sample-audio
```
