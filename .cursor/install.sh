#!/usr/bin/env bash
set -euo pipefail

# Fireflies Clone - durable repository bootstrap (runs in the `install` phase).
# Installs the toolchain and project dependencies. Per-boot services (the Docker
# daemon and the Mongo/Redis/MinIO containers) live in start.sh, not here.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Backend and frontend live in their own repos, pulled in as submodules.
git submodule update --init --recursive

# Bun: the runtime both apps use.
if [ ! -x "$HOME/.bun/bin/bun" ] && ! command -v bun >/dev/null 2>&1; then
  curl -fsSL https://bun.sh/install | bash
fi
export PATH="$HOME/.bun/bin:$PATH"

# Docker Engine + compose plugin: run MongoDB Atlas Local, Redis, and MinIO.
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sudo sh /tmp/get-docker.sh
fi
# This VM stores /var/lib/docker on an overlay filesystem. overlay-on-overlay
# cannot extract image whiteout files, so pin the portable vfs storage driver.
sudo mkdir -p /etc/docker
printf '{ "storage-driver": "vfs" }\n' | sudo tee /etc/docker/daemon.json >/dev/null
sudo usermod -aG docker "$USER" || true

# ffmpeg: the backend extracts audio from uploaded video with it.
if ! command -v ffmpeg >/dev/null 2>&1; then
  sudo apt-get update && sudo apt-get install -y --no-install-recommends ffmpeg
fi

# Project dependencies.
(cd backend && bun install --frozen-lockfile)
(cd frontend && bun install --frozen-lockfile)

echo "install.sh: done"
