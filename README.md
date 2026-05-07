# AI Task Processing Platform — Full Project Overview

This workspace contains the complete AI Task Processing Platform, split into two repositories:

- `app-repo/` — application source code (frontend, backend API, and background worker)
- `infra-repo/` — Kubernetes manifests (Kustomize) and Argo CD configuration for GitOps deployments

The platform enables authenticated users to create asynchronous “AI tasks” (simple string operations) that are queued via Redis Streams, processed by a Python worker, and persisted in MongoDB.

---

## Repositories

### `app-repo/` (Application)

**Primary components**

- `app-repo/frontend/` — React (Vite) UI for authentication and task management
- `app-repo/backend/` — Node.js (Express) REST API with JWT authentication
- `app-repo/worker/` — Python worker consuming Redis Streams and executing tasks asynchronously
- `app-repo/docker-compose.yml` — local development stack (MongoDB + Redis + services)

**Key features**

- User registration and login (JWT)
- Authenticated profile lookup (`GET /api/auth/me`)
- Logout cleanup (`POST /api/auth/logout`) that deletes the current user’s task history
- Task lifecycle: `pending` → `running` → `success|failed`
- Task logs and results persisted in MongoDB
- Queueing and worker scaling via Redis Streams consumer groups

### `infra-repo/` (Infrastructure)

This repository contains the Kubernetes manifests for running the platform in a cluster using Kustomize overlays, intended to be deployed and reconciled via Argo CD (GitOps).

- `infra-repo/k8s/base/` — base Kubernetes resources (Deployments, Services, Ingress, ConfigMap, Secrets)
- `infra-repo/k8s/overlays/staging/` — staging overlay (host + image tags)
- `infra-repo/k8s/overlays/production/` — production overlay (host + image tags)
- `infra-repo/argocd/application.yaml` — example Argo CD `Application` for staging

---

## Architecture (High Level)

1. A user authenticates and receives a JWT.
2. The user creates a task via the backend (`POST /api/tasks`).
3. The backend persists a `pending` task in MongoDB and enqueues the task ID to a Redis Stream.
4. The worker consumes from the stream (consumer group), marks the task `running`, performs the operation, and writes logs/results to MongoDB.
5. The frontend polls for status updates and renders the final result.

For additional detail, see `app-repo/docs/architecture.md`.

---

## Technology Stack

- **Frontend:** React, Vite
- **Backend API:** Node.js, Express
- **Worker:** Python
- **Database:** MongoDB
- **Queue:** Redis Streams
- **Local dev:** Docker Compose
- **Deployment:** Kubernetes (Kustomize) + Argo CD (GitOps)

---

## Local Development (Recommended: Docker Compose)

**Prerequisites**

- Docker Desktop (or Docker Engine) with Compose v2 (`docker compose`)

**Steps**

1. From the workspace root, start the stack:

   `cd app-repo && docker compose up --build`

2. Endpoints:

   - Frontend: `http://localhost:8080`
   - Backend health: `http://localhost:4000/healthz`
   - Backend readiness: `http://localhost:4000/readyz`

**Operational note**

When running via Docker Compose, do not also run `npm run dev` inside `app-repo/backend/` or `app-repo/frontend/` at the same time. Use the containers.

---

## Local Development (Without Docker)

If you prefer running services directly on your machine, you must run MongoDB and Redis locally.

**Prerequisites**

- Node.js (for backend and frontend)
- Python (for worker)
- MongoDB and Redis available locally

**Environment configuration**

- `app-repo/backend/.env` (copy from `app-repo/backend/.env.example`) and set `JWT_SECRET`
- `app-repo/worker/.env` (copy from `app-repo/worker/.env.example`)
- `app-repo/frontend/.env` (copy from `app-repo/frontend/.env.example`) and set `VITE_API_URL=http://127.0.0.1:4000`

**Run**

- Backend: `cd app-repo/backend && npm run dev`
- Frontend: `cd app-repo/frontend && npm run dev` (default Vite URL: `http://localhost:5173`)
- Worker: run the worker using the instructions in `app-repo/worker/` (Python environment required)

---

## Kubernetes Deployment (GitOps with Argo CD)

**Manifests**

- Base resources: `infra-repo/k8s/base`
- Staging overlay: `infra-repo/k8s/overlays/staging`
- Production overlay: `infra-repo/k8s/overlays/production`

**Ingress routing**

- `/api/...` routes to the backend service
- all other paths route to the frontend service

**Required customization**

The Kubernetes manifests intentionally contain placeholders. Before deploying:

- Replace image references `docker.io/YOUR_DOCKERHUB/ai-task-{backend,worker,frontend}` with your registry/repository.
- Update Ingress hosts in overlays:
  - staging: `staging.ai-task.local`
  - production: `ai-task.example.com`
- Set `JWT_SECRET` in `infra-repo/k8s/base/secrets.yaml` (or manage secrets via your preferred secret manager).

**Argo CD**

`infra-repo/argocd/application.yaml` provides an example Argo CD `Application` pointing at the staging overlay. Update:

- `spec.source.repoURL` to your infra repository URL
- `spec.source.targetRevision` and `spec.source.path` as needed

---

## API Summary (Backend)

Authentication:

- `POST /api/auth/register` `{ email, password }`
- `POST /api/auth/login` `{ email, password }` → `{ token }`
- `GET /api/auth/me` (auth required)
- `POST /api/auth/logout` (auth required; deletes that user’s tasks)

Tasks:

- `POST /api/tasks` `{ title, inputText, operation }` (auth required)
- `GET /api/tasks` (auth required)
- `GET /api/tasks/:id` (auth required)

Supported operations: `uppercase`, `lowercase`, `reverse`, `word_count`.

---

## CI/CD (GitOps Flow)

The intended pipeline is:

1. Build and push container images for backend/worker/frontend.
2. Update the image tags in `infra-repo/k8s/overlays/*`.
3. Argo CD detects the Git change and reconciles the cluster state.

`app-repo/README.md` documents the expected GitHub Actions secrets for this workflow.

---

## Troubleshooting

- If users/tasks are not visible where expected, confirm the backend is writing to the database specified by `MONGO_URI` (see `http://localhost:4000/readyz` for the active DB name in the local stack).

