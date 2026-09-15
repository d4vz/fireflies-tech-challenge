---
name: verify-fireflies
description: >-
  Verify the Fireflies app by running the backend and frontend, then driving
  their ports over Chrome DevTools Protocol. Reach for this to launch the
  stack, doctor it, CDP-capture sign-in plus /health, and keep screenshots
  after cleanup.
---

# Verify Fireflies

Start the Hono API and the Next.js UI, then drive their links over Chrome DevTools Protocol. Prove the server and the UI answer. Do not treat a curl-only check as the browser test. Chrome `--screenshot` / `--dump-dom` is not CDP.

The helper is `.cursor/skills/verify-fireflies/scripts/control-fireflies`. Run it from any cwd.

```
.cursor/skills/verify-fireflies/scripts/control-fireflies launch
.cursor/skills/verify-fireflies/scripts/control-fireflies doctor
.cursor/skills/verify-fireflies/scripts/control-fireflies browser-test
.cursor/skills/verify-fireflies/scripts/control-fireflies cleanup
```

`browser-test` is the default proof. It starts system Chrome with `--remote-debugging-port` and runs `scripts/cdp-capture.mjs` (Node 22 WebSocket). CDP methods: `Page.navigate`, `Page.captureScreenshot`, `Runtime.evaluate`, `Accessibility.getFullAXTree`. It opens:

- UI: `http://localhost:8080/` and `http://localhost:8080/sign-in`
- API: `http://127.0.0.1:3000/health`

Clerk's development handshake hangs on `127.0.0.1`, so the UI binds `localhost`. The browser talks to Next `/api/*`, not to Hono.

Read `features/README.md` before a signed-in feature run. Drive every entry point that file lists. Signed-in Home still needs `session=ready`.

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

Launch then tries to create a Clerk verify user. If Clerk keys are invalid, it prints `session=missing` and still writes `.run/instance.json`. Signed-in recipes need `session=ready`. Browser-test does not.

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

`transcribe=` and `session=` are reported. `session=missing` is enough for `browser-test`. Signed-in Home / Capture / AskFred need `session=ready`.

If doctor fails, read `.run/api.log` and `.run/ui.log`, then cleanup and relaunch.

## Drive

Default harness: `control-fireflies browser-test` (Chrome CDP against the printed links). It writes `artifacts/stack/`.

The CDP client is `scripts/cdp-capture.mjs`. Prove it without the app via `scripts/test_cdp_harness.py`.

For a signed-in feature, use Cursor `browser_*` tools against `ui_url`, or `snapshot <feature-id>`. Viewport 1440x900. Handles are in the feature files.

Stable unsigned handles:

| name | where |
| --- | --- |
| document title `Meetings` | every page |
| brand `alt="Fireflies"` | sign-in and sidebar when signed in |
| `/sign-in` | Clerk `<SignIn />` when keys are live |

## Evidence

Write under `.cursor/skills/verify-fireflies/artifacts/<feature-id>/`. Cleanup leaves this tree.

Stack proof (`artifacts/stack/`):

- `notes.md` with `harness: cdp` and the opened links
- `health.json` plus `health.png` / `health.html` / `health.aria.txt` of `/health`
- `sign-in.png` / `sign-in.html` / `sign-in.aria.txt` of `/sign-in`
- `root.png` / `root.html` / `root.aria.txt` of `/` after the sign-in redirect

Proof standards:

- Chrome CDP opened the UI and health URLs. HTTP-only is not enough for `browser-test`.
- Blob `ok` proves the API process and MinIO. Transcribe `ok` is extra.
- A Clerk `host_invalid` page still counts as UI-up if Next returned 200 and Chrome captured it.

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
