---
name: verify-fireflies
description: >-
  Verify the Fireflies Next.js meeting UI in a real browser. Reach for this
  to launch an isolated local stack, doctor that instance, drive Home /
  Meetings / detail / Capture / AskFred as a user would, and keep proof
  artifacts after cleanup.
---

# Verify Fireflies

Drive the Next.js UI the way a user does. Do not call Hono on port 3000 from the browser, and do not open `http://127.0.0.1:8080` or `http://localhost:8080` (that is the operator's session). Clerk's development handshake hangs on `127.0.0.1`, so the UI binds `localhost`.

The helper is `.cursor/skills/verify-fireflies/scripts/control-fireflies`. Run it from any cwd.

```
.cursor/skills/verify-fireflies/scripts/control-fireflies launch
.cursor/skills/verify-fireflies/scripts/control-fireflies doctor
.cursor/skills/verify-fireflies/scripts/control-fireflies cleanup
```

Read `features/README.md` before the first click. Drive every entry point the chosen feature file lists. One convenient path is not enough.

## Launch

The UI is Next.js. `frontend/package.json` binds `next dev` to 8080. The API is Hono in `backend/` (`bun src/server.ts`, `PORT` or 3000). MongoDB, Redis, and MinIO come from `backend/docker-compose.yml` on 27017, 6379, 9000, and 9001. Those Docker ports cannot be remapped without editing compose, so launch reuses a running compose project and never starts a second one.

Launch starts a **new** UI and API on unoccupied ports:

| process | default | isolation |
| --- | --- | --- |
| Next.js UI | `FIREFLIES_UI_PORT` or 18080 | own process on `localhost`, `API_URL=http://127.0.0.1:<api-port>` |
| Hono API | `FIREFLIES_API_PORT` or 13000 | own process, Mongo DB `fireflies_verify`, Redis DB 15, bucket `fireflies-verify` |

Ready when `GET http://127.0.0.1:<api-port>/health` is 200 with `"status":"ok"` and `GET http://localhost:<ui-port>/sign-in` is 200. Launch then creates a Clerk verify user (`first_name` `Verify`), writes a session JWT to `.run/session.jwt`, and writes a one-time agent-task URL to `.run/agent-task.url`. Do not print those files. Logs live in `.cursor/skills/verify-fireflies/.run/`.

Secrets come from `backend/.env`, then `backend/.env.local`, or `$FIREFLIES_VERIFY_ENV`. `OPENAI_API_KEY` and `CLERK_SECRET_KEY` are required. If Mongo / Redis / MinIO keys are absent, launch fills the values published in `backend/docker-compose.yml`. Need `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` only when they differ from that compose file. Do not print secrets. `/health` calls OpenAI `models.list` and creates the verify MinIO bucket.

Launch refuses 8080 and 3000. If 18080 or 13000 is busy, stop, or set `FIREFLIES_UI_PORT` / `FIREFLIES_API_PORT`. If `.run/instance.json` still names live pids, run cleanup first. Next.js will not run two `next dev` servers against the same `distDir`. Launch sets `NEXT_DIST_DIR=.next-verify` so it can sit beside a session on 8080. `frontend/next.config.mjs` must keep `distDir: process.env.NEXT_DIST_DIR || ".next"`.

Two verification stacks at once are not supported. Docker volumes `mongo-db`, `minio-data`, and Redis on 6379 are shared infra. Isolation is the verify database, Redis DB, and bucket, not a second compose project.

## Doctor

Run doctor first whenever anything looks off.

```
.cursor/skills/verify-fireflies/scripts/control-fireflies doctor
```

It is worth driving only when stdout ends with `doctor=ok` and includes:

- `ui_url=http://localhost:18080` (or the port you set), owned by the recorded UI pid
- `api_url=http://127.0.0.1:13000` (or the port you set), owned by the recorded API pid
- `mongo_db=fireflies_verify`
- `GET /health` 200 with blob and transcribe `ok`
- `GET <ui_url>/sign-in` 200
- `GET <ui_url>/` without a session redirects to sign-in
- `GET <ui_url>/api/meetings?page=1&limit=5` without a session is 401 or a sign-in redirect
- `GET <api_url>/meetings?page=1&limit=5` with `Authorization: Bearer <jwt from .run/session.jwt>` 200 JSON with `items`
- `display_name=Verify` and `session=ready`

If doctor fails, read `.run/api.log` and `.run/ui.log`, then cleanup and relaunch. Do not fall back to :8080 or :3000.

## Drive

Harness: Cursor browser tools (`cursor-ide-browser`) against `ui_url` from doctor. If those tools do not register, drive Chrome against the same `ui_url` and still write artifacts under `artifacts/<feature-id>/`.

1. `browser_tabs` action `list`. Reuse a tab only if its URL is already this `ui_url`.
2. Run `control-fireflies session`. Read `agent_task_file` (do not print it). `browser_navigate` to that URL so Clerk sets cookies and lands on Home. If that URL is spent, set `__session` from `cookie_file` with `browser_cdp` `Network.setCookie` (`name` `__session`, `url` `ui_url`, `httpOnly` true, `secure` false), then `browser_navigate` to `ui_url`.
3. `browser_lock` action `lock`.
4. `browser_cdp` method `Emulation.setDeviceMetricsOverride` with `width` 1440, `height` 900, `deviceScaleFactor` 1, `mobile` false. Sidebar nav, Capture label, and the AskFred dock (`xl`) need this width. 1024 shows AskFred as a sheet and hides the dock.
5. `browser_snapshot` and click by `ref` using the accessible name from the feature file.
6. `browser_lock` action `unlock` when the run is finished.

Stable handles (from the running UI, not CSS):

| name | role | where |
| --- | --- | --- |
| `Home` | link, `aria-current=page` on `/` | sidebar |
| `Meetings` | link | sidebar |
| `AskFred` | link in sidebar; link `aria-label=AskFred` in the header | both |
| `Search meetings` | textbox | header (md+) and Home (mobile) |
| `Capture` | button | header. This starts screen recording, not upload. |
| `Upload` | button `aria-label=Upload` | header chevron, then menu item `Upload` |
| `Close AskFred` | link | AskFred panel |
| `Ask Fred` | textbox | AskFred composer. Placeholder `Ask anything here`. |
| `Send` | button | AskFred composer |
| `All` / `Ready` / `Busy` / `Failed` | links | Home tabs |
| `View all meetings` / `View more` | links | Home empty / populated |
| `Open navigation` | button | header, below md |
| `Transcript` | button | meeting detail, below lg |

Document title is `Meetings`. Sidebar brand is the Fireflies wordmark. Greeting on Home is `Good Morning, Verify`, `Good Afternoon, Verify`, or `Good Evening, Verify` from local time (`Verify` is the launch-created Clerk first name). Unsigned `/` redirects to `/sign-in`, which mounts Clerk's default `<SignIn />`. Empty Home and list copy is `Capture your first meeting` with `No meetings yet. Capture or upload a file to start.` Buttons `Capture a meeting` and `Upload a recording` open the same Capture naming dialog as the header. Status chips are `Queued`, `Processing`, `Ready`, `Failed`. Audio rows include sr-only `Audio recording` in the link name.

The browser talks only to Next `/api/*`. Home and list poll every 2s while any row is queued or processing.

## Evidence

Write under `.cursor/skills/verify-fireflies/artifacts/<feature-id>/`. Cleanup must leave this tree in place.

Each run needs:

- `notes.md` with feature id, entry point, `ui_url`, doctor excerpt, and what changed
- an ARIA snapshot **before** the action and **after** (`browser_snapshot` saved as `*.aria.txt`)
- a screenshot of the resulting screen with `Verify` or the `Home` / `Meetings` heading visible (`browser_take_screenshot`, `filename` the artifact png)
- for a mutation: a second user-facing read (reload or another route) plus `GET <ui_url>/api/meetings?page=1&limit=5` JSON saved as `meetings.json`

Proof standards:

- Click and type in the UI. Do not seed Mongo or call Hono `:13000` as a stand-in for a user action.
- Upload is the exception in `features/capture.md`: if the OS file chooser blocks the hidden input, POST the file to `<ui_url>/api/meetings/upload?filename=...` (the same Next route `Capture` uses), then prove the list in the browser.
- Capture the click and the new state, not only the last frame.
- A dry-run name is not proof. After upload, the meetings list or detail must show the new `sourceId`.

## Cleanup

```
.cursor/skills/verify-fireflies/scripts/control-fireflies cleanup
```

Kills only the UI and API pids in `.run/instance.json`, drops `fireflies_verify` and Redis DB 15, and stops compose only if **this** launch started it. It does not kill by process name. It does not touch :8080, :3000, or `artifacts/`.

## Helpers

All invocations from repo root, executable bit on:

```
.cursor/skills/verify-fireflies/scripts/control-fireflies launch
.cursor/skills/verify-fireflies/scripts/control-fireflies doctor
.cursor/skills/verify-fireflies/scripts/control-fireflies status
.cursor/skills/verify-fireflies/scripts/control-fireflies session
.cursor/skills/verify-fireflies/scripts/control-fireflies cleanup
.cursor/skills/verify-fireflies/scripts/control-fireflies sample-video
.cursor/skills/verify-fireflies/scripts/control-fireflies sample-audio
```

`sample-video` prints a 2s mp4 path (default `.run/sample.mp4`). `sample-audio` prints a 2s mp3 path (default `.run/sample.mp3`). Use them only for Capture.

Optional env: `FIREFLIES_VERIFY_ENV`, `FIREFLIES_UI_PORT`, `FIREFLIES_API_PORT`, `FIREFLIES_VERIFY_VIDEO`, `FIREFLIES_VERIFY_AUDIO`. If `FIREFLIES_VERIFY_ENV` is unset, launch reads `backend/.env` and then `backend/.env.local`.
