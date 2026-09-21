#!/usr/bin/env bash
set -euo pipefail
export PATH="/usr/local/bin:${HOME}/.bun/bin:${PATH}"
export HUSKY=0
export DEBIAN_FRONTEND=noninteractive
export BUN_VERSION="${BUN_VERSION:-1.4.2}"
export NODE_VERSION="${NODE_VERSION:-22.23.2}"

if ! command -v bun >/dev/null 2>&1 || [ "$(bun --version 2>/dev/null || true)" != "${BUN_VERSION}" ]; then
  curl -fsSL https://bun.com/install | bash -s "bun-v${BUN_VERSION}"
fi
if [ -x "${HOME}/.bun/bin/bun" ]; then
  sudo install -m 0755 "${HOME}/.bun/bin/bun" /usr/local/bin/bun
fi

if ! /usr/local/bin/node -v 2>/dev/null | grep -qx "v${NODE_VERSION}"; then
  tmp="$(mktemp -d)"
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o "${tmp}/node.tar.xz"
  sudo tar -xJf "${tmp}/node.tar.xz" -C /usr/local --strip-components=1
  rm -rf "${tmp}"
fi

git submodule update --init --recursive
(cd backend && bun install --frozen-lockfile)
(cd frontend && bun install --frozen-lockfile)

ensure_dockerd() {
  if docker info >/dev/null 2>&1; then
    return 0
  fi
  if [ -S /var/run/docker.sock ]; then
    sudo chmod 666 /var/run/docker.sock || true
  fi
  if docker info >/dev/null 2>&1; then
    return 0
  fi
  sudo mkdir -p /var/run /var/lib/docker
  if [ -f /var/run/docker.pid ] && ! sudo kill -0 "$(sudo cat /var/run/docker.pid)" 2>/dev/null; then
    sudo rm -f /var/run/docker.pid
  fi
  if ! pgrep -x dockerd >/dev/null 2>&1; then
    sudo nohup dockerd --host=unix:///var/run/docker.sock >/tmp/dockerd.log 2>&1 &
  fi
  for _ in $(seq 1 40); do
    sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
    if docker info >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "dockerd failed to become ready" >&2
  tail -50 /tmp/dockerd.log >&2 || true
  return 1
}

ensure_dockerd
docker pull redis:7-alpine
docker pull mongodb/mongodb-atlas-local:preview
docker pull quay.io/minio/minio:latest
docker tag quay.io/minio/minio:latest minio/minio:latest
