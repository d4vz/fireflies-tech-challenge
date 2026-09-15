# Daily maintain verification skill

You are the scheduled maintainer of this parent repository's verification skill.

Read this file and run it. Do not stop at a summary of the file.

If pstack `/maintain-verification-skill` is available in this session, follow that skill. This file names the target and the pass for this repository. If the plugin skill is missing, still run the pass below. Do not invent a different audit.

## Target

Glob `.cursor/skills/verify-*/`. There must be exactly one match. That directory is the target.

It owns `SKILL.md`, `features/`, and `scripts/`. Backend and frontend product code are out of scope.

If the glob is empty or matches more than one directory, stop with outcome `blocked` and name what you found.

## Outcomes

Pick one, and say which:

- `clean`. Every feature got source coverage and a live drive. Nothing worth shipping. No branch. No pull request.
- `changed`. One pull request of proven corrections inside the verification skill directory.
- `blocked`. Coverage could not finish, or a proven fix could not ship safely. Name the blocker.

## Edit scope

Edit only the target directory.

Never edit product code. If the map describes behavior the app no longer does, that is doc drift (fix the map) or a product regression (report it, leave the map honest). Do not hide a product bug in the map.

## Pass

0. Locate the target above.

1. Index hygiene. Read `features/README.md` and glob its sibling files. Fix missing, extra, duplicate, or dead entries. Do not generate an inventory.

2. Source wave. Launch one read-only subagent per feature file, all at once. Each answers how that user-facing feature works from source, flags likely doc drift with citations, and returns one live-verification recipe. Children never drive the app and never edit files. Return shape: feature summary / source entry points / likely drift or none / one recipe.

3. Reconcile. Every feature file must have a returned summary. Merge overlapping recipes into as few app states as practical. Spot-check cited drift. Add a missing user-facing surface only when you can cite a concrete source path.

4. Live pass. Required even when source looks clean. Follow the verification skill's Launch section. One long-lived instance, driven serially. Doctor before the first drive. Doctor after any failed drive. If doctor cannot see a wedged UI, reset to a known state or relaunch. Exercise every feature at least once. Keep evidence at the skill's named artifact paths through cleanup. Tear down after the last drive, including re-proofs. A doctor failure caused by skill drift is drift: fix it under edit scope and retry once. A feature you cannot reach is `verified-unreachable` only with the concrete prerequisite and the route you tried.

5. Triage. Wrong or missing user-POV description is doc drift. Working behavior the harness cannot drive is a harness gap. Broken app behavior is a product gap: record it for the human and keep it out of this pull request. Re-drive any harness fix live before it ships.

6. Ship or stop. For `changed`, open one pull request of proven corrections after you re-read every changed file. For `clean` or `blocked`, do not open a pull request.

Keep run notes in a scratch location. Do not commit them.

## Secrets and environment

Launch reads secrets as the target skill's Launch section says. The required keys are `OPENAI_API_KEY`, `ASSEMBLYAI_API_KEY`, and `CLERK_SECRET_KEY`.

If those secrets are missing, stop with `blocked`. Do not skip the live pass and call the run `clean`.
