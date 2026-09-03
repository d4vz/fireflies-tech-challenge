# Fireflies Clone

First of all, thank you so much for the opportunity to do this challenge. It was a lot of fun 😄

I learned much more about embbedings, about a pipeline that converts video and extracts audio, about streaming microphone audio and doing screen sharing from the browser mixing multiple stream channels.

I put a lot of effort into this. I hope you appreciate it.

## Overview

This is the parent repository. Backend and frontend live in their own Git repos and are pulled in as [Git submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules). This repo only pins the SHAs for [backend](https://github.com/d4vz/fireflies-tech-challenge-backend) and [frontend](https://github.com/d4vz/fireflies-tech-challenge-frontend).

**Why Git Modules?** I split the apps into two repositories instead of a monorepo. Separate repos are easier to work with, and they map better to Railway, where I deployed each app as its own service.

![Railway deployment](assets/railway.png)

The frontend is [Next.js](https://nextjs.org), with [TanStack Query](https://tanstack.com/query/latest) for server state and [shadcn/ui](https://ui.shadcn.com) for the UI. Auth is [Clerk](https://clerk.com). The browser never talks to the backend. It hits Next.js API routes, and those routes call the private network. That is how the Hono server and the MinIO bucket stay off the public internet. Only the Next.js server can reach them.

![Access diagram](assets/access.svg)

The backend is one Bun process running [Hono](https://hono.dev). MongoDB is the primary database. Meetings can arrive from different sources and the shape is not fixed, so a document store fits, and [MongoDB Vector Search](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-overview/) lets us search across embeddings. Blobs go to [MinIO](https://min.io), an S3-compatible store we run ourselves. Redis backs [BullMQ.](https://docs.bullmq.io) This README is the parent overview. How to run both apps is below. Child repos have the env templates.

## LLM usage

I built this project AI-first. The agent workflow is [pstack](https://github.com/cursor/plugins/tree/main/pstack). I use it every session. Unfortunately agents still write sloppy TypeScript. Each child repo installs [anti-slop](https://github.com/dmmulroy/anti-slop/tree/main/skills/install-anti-slop), an Oxlint plugin that rejects the patterns models keep producing: unknown type aliases, value widening, chained assertions. [oxlint](https://oxc.rs/docs/guide/usage/linter) and [oxfmt](https://oxc.rs/docs/guide/usage/formatter) run in pre-commit hooks and again in GitHub Actions on every push. If the code seems like slop, it does not merge.

### Models

Transcription uses [AssemblyAI](https://www.assemblyai.com) with speaker labels. The name in the backend [config.yaml](https://github.com/d4vz/fireflies-tech-challenge-backend/blob/main/config.yaml) is `assemblyai`. Summaries and embeddings still use [OpenAI](https://platform.openai.com). I tried OpenAI `gpt-4o-transcribe-diarize` first so one API key would cover speech-to-text too. AssemblyAI was faster and more reliable, and it labeled speakers on the whole file.

If you want something cheaper or local-first, those jobs could also run on [whisper.cpp](https://github.com/ggml-org/whisper.cpp) for speech-to-text, [Voyage](https://docs.voyageai.com/docs/embeddings) or a similar embedding model, and any other provider for summaries. That is not wired up today.

## Clone

```
git clone --recurse-submodules https://github.com/d4vz/fireflies-tech-challenge.git
cd fireflies-tech-challenge
```

If you already cloned without submodules:

```
git submodule update --init --recursive
```

## Run

You need [Docker](https://docs.docker.com/get-docker/), an [OpenAI](https://platform.openai.com) API key, an [AssemblyAI](https://www.assemblyai.com) API key, and a [Clerk](https://clerk.com) application. Use the same Clerk app in both services. Clerk shows the publishable key and the secret key when you create the application.

Give Docker enough RAM and CPUs. MongoDB Atlas Local and Next.js do not fit in a 2 GB VM. The Next.js compile can spike above the usual memory use. If that happens, or if `web` exits while `Compiling /`, raise or remove the Docker VM limits so the stack can use the host resources.

Colima:

```
colima start --cpu 4 --memory 8
```

Docker Desktop: Settings → Resources. Move Memory and CPUs up, or match the host.

The parent `docker-compose.yml` includes [backend/docker-compose.yml](backend/docker-compose.yml) and [frontend/docker-compose.yml](frontend/docker-compose.yml). One `.env` in this directory is enough.

```
cp .env.example .env
```

Fill the keys in `.env`.

```
# backend only
OPENAI_API_KEY=sk-proj-your-openai-key
ASSEMBLYAI_API_KEY=your-assemblyai-key

# same Clerk app in both services
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-publishable-key
CLERK_SECRET_KEY=sk_test_your-clerk-secret-key
```

Then start the whole stack:

```
docker compose up --build
```

The first run is slow: it pulls MongoDB Atlas Local. Later starts can omit `--build` unless app code changed.

Open `http://localhost:8080`. API listens on `http://localhost:3000`.

---

> [!NOTE]
> I tested this stack on a few machines, but you may still hit a problem on yours. If you have any issue or question while running it, email me: [daviorlandi.floripa@gmail.com](mailto:daviorlandi.floripa@gmail.com)

## Next steps

- A meeting bot that joins a live call and records it, either with [Playwright](https://playwright.dev) or an API such as [Recall.ai](https://www.recall.ai).
- [Google Calendar](https://developers.google.com/calendar) so upcoming meetings can be scheduled and captured from the calendar.
- Semantic search across all of a user's meetings, including summaries, not only meeting-scoped transcript search.
