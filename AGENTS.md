# Parent

This repo only records submodule SHAs for `backend` and `frontend`.

## After a submodule push

1. Push the child `main`.
2. In this repo, `git add backend` and/or `git add frontend`.
3. Commit `chore: bump <name> submodule` and push `main`.
4. Done when `git submodule status` matches each child's `origin/main`.

A GitHub Action on each child also bumps this repo. Still bump in-session so the workspace is not stale.
