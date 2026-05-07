# AI Task Processing Platform (MERN + Python Worker)

This repo contains the application code:

- `frontend/` React (Vite) UI
- `backend/` Node.js + Express API (JWT auth)
- `worker/` Python background worker
- `docker-compose.yml` local dev stack

## Features

- User registration + login (JWT)
- Authenticated profile lookup (`/api/auth/me`)
- Logout cleanup endpoint (`/api/auth/logout`) that removes user task history
- Create asynchronous “AI tasks” (string operations)
- Task statuses: `pending` → `running` → `success|failed`
- Task logs + results
- Queue: Redis Streams (consumer group; supports worker scaling)
- Database: MongoDB

## Local development (Docker Compose)

1) Copy env examples:

- `backend/.env.example` → `backend/.env` (set `JWT_SECRET`) (optional if only using compose)
- `worker/.env.example` → `worker/.env`
- `frontend/.env.example` → `frontend/.env` (optional)

2) Run:

`docker compose up --build`

3) Open:

- Frontend: `http://localhost:8080`
- Backend health: `http://localhost:4000/healthz`
- Backend readiness (includes Mongo DB name): `http://localhost:4000/readyz`

Important: when using Docker Compose, do NOT also run `npm run dev` inside `backend/` or `frontend/` at the same time. Use the containers.

## Local development (run without Docker)

If you want to run backend/frontend on your machine (without Docker), you must run MongoDB + Redis locally.

1) Start MongoDB + Redis on your machine.
2) Create `backend/.env` (or use `backend/.env.example`) and set `JWT_SECRET`.
3) Create `frontend/.env` with `VITE_API_URL=http://127.0.0.1:4000`.
4) Run:
   - `cd backend && npm run dev`
   - `cd frontend && npm run dev` (open `http://localhost:5173`)

## API (quick)

- `POST /api/auth/register` `{ email, password }`
- `POST /api/auth/login` `{ email, password }` → `{ token }`
- `GET /api/auth/me` (auth)
- `POST /api/auth/logout` (auth, clears that user's task history)
- `POST /api/tasks` `{ title, inputText, operation }` (auth)
- `GET /api/tasks` (auth)
- `GET /api/tasks/:id` (auth)

Operations:
`uppercase`, `lowercase`, `reverse`, `word_count`

## Kubernetes + Argo CD (GitOps)

Kubernetes manifests live in the separate infra repo (`../infra-repo` in this assignment workspace).

At a high level:
- Install k3s (allowed) + NGINX Ingress Controller.
- Install Argo CD in `argocd` namespace.
- Point an Argo CD `Application` at `infra-repo/k8s/overlays/staging`.

## CI/CD

GitHub Actions:
- `CI` lints backend + frontend.
- `Build and Deploy (GitOps)` builds/pushes images, then bumps image tags in infra repo overlay.

Secrets expected:
- `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`
- `INFRA_REPO` (e.g. `your-org/ai-task-platform-infra`)
- `INFRA_REPO_TOKEN` (PAT with push access)

## Notes

- No secrets are committed; use Kubernetes Secrets or GitHub secrets.
- Production should use managed MongoDB/Redis or HA setups (see architecture doc).

## Troubleshooting (users not visible in MongoDB)

- The backend writes users into the database specified in `MONGO_URI` (Compose uses `mongodb://mongo:27017/aitask`).
- Check `http://localhost:4000/readyz` and confirm the reported `mongo.db` matches the database you are browsing in MongoDB Compass (for this stack it should be `aitask` and the collection is `users`).
