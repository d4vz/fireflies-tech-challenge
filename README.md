# Fireflies Clone

This is the parent repository. Backend and frontend live in their own Git repos and are pulled in as [Git submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules). This repo only pins the SHAs for [backend](https://github.com/d4vz/fireflies-tech-challenge-backend) and [frontend](https://github.com/d4vz/fireflies-tech-challenge-frontend).

**Why Git Modules?** I split the apps into two repositories instead of a monorepo. Separate repos are easier to work with, and they map better to Railway, where I deployed each app as its own service.

## Overview

![Railway deployment](assets/railway.png)

The frontend is [Next.js](https://nextjs.org), with [TanStack Query](https://tanstack.com/query/latest) for server state and [shadcn/ui](https://ui.shadcn.com) for the UI. Auth is [Clerk](https://clerk.com). The browser never talks to the backend. It hits Next.js API routes, and those routes call the private network. That is how the Hono server and the MinIO bucket stay off the public internet. Only the Next.js server can reach them.

![Access diagram](assets/access.svg)

The backend is one Bun process running [Hono](https://hono.dev). MongoDB is the primary database. Meetings can arrive from different sources and the shape is not fixed, so a document store fits, and [MongoDB Vector Search](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-overview/) lets us search across embeddings. Blobs go to [MinIO](https://min.io), an S3-compatible store we run ourselves. Redis backs [BullMQ.](https://docs.bullmq.io) This README is the parent overview. How to run both apps is below. Child repos have the env templates.

## LLM usage

I built this project AI-first. The agent workflow is [pstack](https://github.com/cursor/plugins/tree/main/pstack). I use it every session. Unfortunately agents still write sloppy TypeScript. Each child repo installs [anti-slop](https://github.com/dmmulroy/anti-slop/tree/main/skills/install-anti-slop), an Oxlint plugin that rejects the patterns models keep producing: unknown type aliases, value widening, chained assertions. [oxlint](https://oxc.rs/docs/guide/usage/linter) and [oxfmt](https://oxc.rs/docs/guide/usage/formatter) run in pre-commit hooks and again in GitHub Actions on every push. If the code seems like slop, it does not merge.

### Models

For transcription, summaries, and embeddings I use OpenAI because one API key covers all three. If you want something cheaper or local-first, those jobs could also run on [whisper.cpp](https://github.com/ggml-org/whisper.cpp) for speech-to-text, [Voyage](https://docs.voyageai.com/docs/embeddings) or a similar embedding model, and any other provider for summaries. That is not wired up today. The current model names live in the backend [config.yaml](https://github.com/d4vz/fireflies-tech-challenge-backend/blob/main/config.yaml).

## Clone

```
git clone --recurse-submodules https://github.com/d4vz/fireflies-tech-challenge.git
```

If you already cloned without submodules:

```
git submodule update --init --recursive
```

## Run

You need [Docker](https://docs.docker.com/get-docker/) and [Bun](https://bun.sh). Bun is only for the frontend. You also need an [OpenAI](https://platform.openai.com) API key and a [Clerk](https://clerk.com) application. Use the same Clerk app in both repos.

```
curl -fsSL https://bun.sh/install | bash
```

The backend is one compose project: Hono, MongoDB, Redis, and MinIO. I used the Atlas local image so `$vectorSearch` works on your machine. ffmpeg is already in the API image.

```
cd backend
cp .env.example .env
```

Fill in `OPENAI_API_KEY` and `CLERK_SECRET_KEY`. Then start the whole backend:

```
docker compose up --build
```

The API listens on `http://localhost:3000`.

```
cd ../frontend
cp .env.example .env.local
```

Put the Clerk publishable key and secret key there. `API_URL` already points at `http://localhost:3000`. Next.js talks to the backend. The browser does not. The frontend does not run in Docker, and it does not need a new env key. Build and start the production server. Do not use `next dev`.

```
bun install
bun run build
bun run start
```

Open `http://localhost:8080`. Clerk's development handshake hangs on `127.0.0.1`, so stay on `localhost`.

To run Hono on the host instead of in compose, start only the data stores (`docker compose up -d mongodb redis minio`), install [ffmpeg](https://ffmpeg.org), then `bun install` and `bun run dev` in `backend/`.

