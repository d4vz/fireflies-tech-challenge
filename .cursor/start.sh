#!/usr/bin/env bash
set -euo pipefail

# Fireflies Clone - per-boot runtime setup (runs in the `start` phase).
# Starts the Docker daemon and the Mongo/Redis/MinIO infra, then writes the
# gitignored dev env files. The api and web dev servers run as `terminals`.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
export PATH="$HOME/.bun/bin:$PATH"

# 1. Start the Docker daemon. This VM has no systemd, so launch dockerd directly.
if ! docker info >/dev/null 2>&1; then
  sudo nohup dockerd >/tmp/dockerd.log 2>&1 &
  for _ in $(seq 1 30); do
    docker info >/dev/null 2>&1 && break
    sleep 1
  done
fi
sudo chmod 666 /var/run/docker.sock 2>/dev/null || true

# 2. Ensure the MinIO image. MinIO removed its Docker Hub images, so mirror it
#    from quay.io and retag so backend/docker-compose.yml resolves unmodified.
if ! docker image inspect minio/minio:latest >/dev/null 2>&1; then
  docker pull quay.io/minio/minio:latest
  docker tag quay.io/minio/minio:latest minio/minio:latest
fi

# 3. Materialize the gitignored dev env files. Infra values are fixed; secret
#    values are copied only when the matching secret is injected as an env var.
cat > backend/.env.local <<EOF
MONGODB_URI=mongodb://fireflies:fireflies@localhost:27017/fireflies?authSource=admin&directConnection=true
REDIS_URL=redis://127.0.0.1:6379
S3_ENDPOINT=http://localhost:9000
S3_PUBLIC_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=fireflies
S3_REGION=us-east-1
FRONTEND_ORIGIN=http://localhost:8080
PORT=3000
${OPENAI_API_KEY:+OPENAI_API_KEY=$OPENAI_API_KEY}
${ASSEMBLYAI_API_KEY:+ASSEMBLYAI_API_KEY=$ASSEMBLYAI_API_KEY}
${CLERK_SECRET_KEY:+CLERK_SECRET_KEY=$CLERK_SECRET_KEY}
EOF

cat > frontend/.env.local <<EOF
API_URL=http://localhost:3000
${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:+NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
${CLERK_SECRET_KEY:+CLERK_SECRET_KEY=$CLERK_SECRET_KEY}
EOF

# 4. Bring up infra only. Never start the compose api/web services; the dev
#    servers run from terminals against these ports.
(cd backend && docker compose up -d mongodb redis minio)

# 5. Wait for MongoDB Atlas Local (mongod + mongot) to report healthy.
for _ in $(seq 1 40); do
  status="$(docker inspect --format '{{.State.Health.Status}}' backend-mongodb-1 2>/dev/null || echo missing)"
  [ "$status" = "healthy" ] && break
  sleep 3
done

echo "start.sh: infra status"
(cd backend && docker compose ps)
