# Fireflies verification map

This directory is the maintained source for verifying the user-facing behavior of the Fireflies Next.js app. Read this index before driving, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch with `.cursor/skills/verify-fireflies/scripts/control-fireflies launch`.
- Doctor must print `doctor=ok` for `http://127.0.0.1:18080` (or `FIREFLIES_UI_PORT`) and `http://127.0.0.1:13000` (or `FIREFLIES_API_PORT`).
- Mongo database is `fireflies_verify`. It starts empty unless a feature seeds it through the UI or the Next upload route.
- Viewport 1440x900 (`Emulation.setDeviceMetricsOverride`).
- Never open `http://127.0.0.1:8080` or `http://127.0.0.1:3000`.
- Never drive an instance whose pids are missing from `.cursor/skills/verify-fireflies/.run/instance.json`.

## Driving conventions

- Start every recipe from the baseline unless its preconditions say otherwise.
- Prefer accessible names from `browser_snapshot` over CSS and coordinates.
- Treat every command as literal. Keep quoted names unchanged.
- Run process actions through `control-fireflies`.
- Run browser actions through Cursor `browser_*` tools against `ui_url`.
- After a mutation, restore the empty verify database with `cleanup` only at the end of the whole run, not between proof screenshots.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with `Davi` or the page heading visible.
- Mutation proof includes a second read of the meetings list or detail.
- Record the feature ID and entry point in `artifacts/<feature-id>/notes.md`.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with the Cursor browser` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Home](./home.md) covers greeting, insight cards, status tabs, empty state, and `sourceId` / summary search.
- [Meetings list](./meetings-list.md) covers the library, empty copy, pagination, and opening a row.
- [Meeting detail](./meeting-detail.md) covers video or audio playback, summary, takeaways, action items, and transcript.
- [Capture](./capture.md) covers screen record, video or audio upload, and the meetings list after ingest.
- [AskFred](./ask-fred.md) covers opening the assistant from Home, the header, and the sidebar, then sending a prompt.
