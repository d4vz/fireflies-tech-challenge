#!/usr/bin/env bash
set -euo pipefail
export PATH="/usr/local/bin:${HOME}/.bun/bin:${PATH}"

ensure_dockerd() {
  if docker info >/dev/null 2>&1; then
    sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
    return 0
  fi
  sudo mkdir -p /etc/docker /var/run /var/lib/docker
  if [ ! -f /etc/docker/daemon.json ]; then
    sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "storage-driver": "fuse-overlayfs",
  "features": { "containerd-snapshotter": false }
}
EOF
  fi
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

write_env_files() {
  python3 - <<'PY'
from pathlib import Path
import os

repo = Path("/workspace")
backend_example = (repo / "backend" / ".env.example").read_text()
keys = []
for line in backend_example.splitlines():
    stripped = line.strip()
    if stripped == "" or stripped.startswith("#") or "=" not in stripped:
        continue
    keys.append(stripped.split("=", 1)[0])


def emit(path: Path, wanted: list[str], extras: dict[str, str]) -> None:
    lines = []
    seen: set[str] = set()
    for key in wanted:
        val = os.environ.get(key, extras.get(key, ""))
        if val == "":
            continue
        lines.append(f"{key}={val}")
        seen.add(key)
    for key, val in extras.items():
        if key not in seen and val:
            lines.append(f"{key}={val}")
    path.write_text("\n".join(lines) + "\n")
    os.chmod(path, 0o600)


extras = {
    "API_URL": os.environ.get("API_URL", "http://127.0.0.1:3000"),
    "FRONTEND_ORIGIN": os.environ.get("FRONTEND_ORIGIN") or ("http://" + "localhost" + ":8080"),
    "PORT": os.environ.get("PORT", "3000"),
}
emit(
    repo / "backend" / ".env",
    [key for key in keys if key not in {"NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "API_URL"}],
    extras,
)
emit(
    repo / "frontend" / ".env.local",
    ["API_URL", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"],
    extras,
)
emit(
    repo / ".env",
    [
        "OPENAI_API_KEY",
        "ASSEMBLYAI_API_KEY",
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
        "CLERK_SECRET_KEY",
    ],
    {},
)
print("env-files=written")
PY
}

ensure_dockerd
if ! docker image inspect minio/minio:latest >/dev/null 2>&1; then
  docker pull quay.io/minio/minio:latest
  docker tag quay.io/minio/minio:latest minio/minio:latest
fi
docker compose -f /workspace/backend/docker-compose.yml up -d mongodb redis minio
write_env_files

ready=0
for i in $(seq 1 90); do
  redis_ok=0
  minio_ok=0
  mongo_ok=0
  docker compose -f /workspace/backend/docker-compose.yml exec -T redis redis-cli ping 2>/dev/null | grep -q PONG && redis_ok=1 || true
  curl -sf -o /dev/null http://127.0.0.1:9000/minio/health/live && minio_ok=1 || true
  docker compose -f /workspace/backend/docker-compose.yml exec -T mongodb mongosh --quiet --eval 'db.runCommand({ ping: 1 }).ok' >/dev/null 2>&1 && mongo_ok=1 || true
  if [ "${redis_ok}" = 1 ] && [ "${minio_ok}" = 1 ] && [ "${mongo_ok}" = 1 ]; then
    ready=1
    break
  fi
  sleep 2
done
if [ "${ready}" != 1 ]; then
  echo "infra failed to become ready" >&2
  docker compose -f /workspace/backend/docker-compose.yml ps >&2 || true
  exit 1
fi
echo "start=ok"
