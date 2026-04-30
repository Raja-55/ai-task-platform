# Architecture Document

## 1) System Overview

### Components
- **Frontend (`frontend/`)**: React/Vite UI for register/login, task creation, task list/detail, and logout.
- **Backend (`backend/`)**: Express API with JWT auth, task APIs, Redis stream enqueue, and MongoDB persistence.
- **Worker (`worker/`)**: Python stream consumer that executes task operations asynchronously and updates task state.
- **MongoDB**: System of record for `users` and `tasks`.
- **Redis Streams**: Queue and decoupling layer between API writes and worker execution.
- **Kubernetes + Argo CD** (infra repo): declarative deployment to staging and production via overlays.

### Request/Task Lifecycle
1. User authenticates and receives JWT.
2. User submits a task (`POST /api/tasks`), backend writes `pending` task in MongoDB.
3. Backend enqueues `taskId` into Redis Stream.
4. Worker consumes `taskId`, marks task `running`, executes, appends logs, stores result.
5. Worker marks final status (`success` or `failed`), UI polls for updates.

### Logout Data Lifecycle
- Frontend calls `POST /api/auth/logout`.
- Backend deletes all tasks for the authenticated user (`Task.deleteMany({ userId })`).
- Frontend clears token and session state, then redirects to login, removing previous user text from UI.

---

## 2) Worker Scaling Strategy

### Horizontal Scaling Model
- Workers run as a `Deployment` with N replicas.
- All replicas join the same Redis Stream consumer group.
- Redis assigns each message to one consumer, allowing parallel processing without duplicate work in normal operation.

### Scaling Controls
- **Replica count**: baseline fixed replicas + autoscaling.
- **HPA signals**:
  - CPU and memory utilization.
  - Preferred custom metric: stream lag (`pending + unacked` entries).
- **Per-worker concurrency**: keep low initially; increase with strict profiling and idempotency controls.

### Safe Recovery Strategy
- Use `XPENDING`/`XAUTOCLAIM` to reclaim stuck messages when worker crashes.
- Enforce `maxAttempts` metadata per task.
- Move poisoned messages to a dead-letter stream (`ai_tasks_dlq`) for manual or automated replay.

### Operational Recommendations
- Separate worker pools by queue/priority if needed (e.g., short vs long tasks).
- Add graceful shutdown hook so in-flight tasks are either completed or safely reclaimable.

---

## 3) Handling High Task Volume (100k Tasks/Day)

100k/day is ~1.16 tasks/sec average, but peak traffic can be 10-50x bursts.

### Capacity Approach
- **Ingress layer**: backend is stateless; scale pods horizontally.
- **Buffering layer**: Redis Streams absorb spikes and smooth worker load.
- **Execution layer**: workers autoscale based on lag + resource usage.
- **Storage layer**: MongoDB indexes and connection pooling keep read/write latency stable.

### Throughput Guardrails
- Enforce payload size and input limits (already present in request validation).
- Rate-limit auth and task creation endpoints to protect backend and queue.
- Apply per-user quotas to avoid one tenant exhausting shared throughput.
- Track SLOs:
  - Queue lag age
  - Task start latency (enqueue -> running)
  - Task completion latency (enqueue -> terminal state)
  - Error/retry rates

### Example Scaling Numbers
- If one worker processes ~3 tasks/sec sustained, 100k/day average needs ~1 worker, but peaks require overprovisioning.
- Use minimum replicas (e.g., 2-3) and scale to 10+ during spikes.
- Keep Redis and Mongo sized for peak write/read IOPS, not just daily average.

---

## 4) Database Indexing Strategy

### Existing Access Patterns
- List latest user tasks: `find({ userId }).sort({ createdAt: -1 }).limit(100)`.
- Read one task detail securely: `findOne({ _id, userId })`.
- Auth user lookup by email during login/register.

### Current Indexes
- `users.email` unique index.
- `tasks.userId` index.
- `tasks.status` index.
- `tasks.operation` index.
- Compound: `tasks({ userId: 1, createdAt: -1 })`.

### Recommended Production Indexes
- `tasks({ status: 1, createdAt: -1 })` for operational dashboards and stale-task scans.
- Optional partial index for active tasks only:
  - `tasks({ status: 1, updatedAt: 1 }, { partialFilterExpression: { status: { $in: ["pending","running"] }}})`
- If retention policy exists, archive old tasks and apply TTL in archive collection.

### Index Management Rules
- Validate with `explain("executionStats")` before and after adding indexes.
- Avoid over-indexing large log-heavy documents.
- Revisit index strategy quarterly based on real query telemetry.

---

## 5) Redis Failure Handling (Deep)

### Failure Modes
1. **Redis unavailable during enqueue**: task created in MongoDB but not queued.
2. **Redis unavailable during consume**: workers cannot read new tasks.
3. **Redis failover/restart**: brief unavailability and possible duplicated delivery semantics.

### Current Behavior
- Backend writes task then does `XADD`.
- If `XADD` fails, request errors and task can remain `pending`.
- This is safe for data durability but can leave stranded tasks.

### Production-Grade Strategy
1. **Outbox Pattern (recommended)**
   - Write task + outbox event to MongoDB in one transaction.
   - Dispatcher reads unsent outbox events and publishes to Redis with retries.
   - Mark event as sent only after confirmed publish.
2. **Idempotent Worker Updates**
   - Task transitions enforce monotonic state changes.
   - Replays or duplicates do not corrupt final result.
3. **Retry + Circuit Breaker**
   - Exponential backoff with jitter for Redis calls.
   - Circuit breaker opens during sustained failures; API returns controlled 503 for create-task if queue is degraded.
4. **Reconciliation Job**
   - Periodic scan for `pending` tasks older than threshold and re-enqueue safely.
5. **HA Redis Setup**
   - Managed Redis or Sentinel/Cluster.
   - AOF persistence (or managed equivalent) for durability.
   - Monitoring: memory, replication lag, failover count, rejected connections.

### Runbook Snapshot
- Detect high pending-age alert.
- Verify Redis health and stream lag.
- If recovered, run reconciliation for stranded `pending` tasks.
- Track duplicate/failed task deltas post-recovery.

---

## 6) Staging and Production Deployment

### Environment Layout
- `infra-repo/k8s/overlays/staging`
- `infra-repo/k8s/overlays/production`

### Deployment Flow
1. Build images in CI on merge.
2. Push immutable tags (commit SHA).
3. Update staging overlay image tags.
4. Argo CD syncs staging automatically.
5. Run smoke + manual regression.
6. Promote same artifact to production overlay (no rebuild).
7. Argo CD syncs production after approval gate.

### Environment Differences
- Separate namespaces/clusters.
- Different secrets and external endpoints.
- Higher resource requests/limits and replica counts in production.
- Stronger network policies and stricter disruption budgets in production.

### Rollback Strategy
- Git revert overlay tag commit and re-sync Argo CD.
- Keep database migrations backward compatible.
- Feature-flag risky behavior so rollback can be fast without schema rollback.

---

## 7) Rate Limiting Strategy

### Current Implementation
- Global API rate limiter.
- Extra stricter limits on auth and task creation routes.
- `429` responses include `Retry-After`.

### Production Improvements
- Distributed limiter store (Redis-backed) instead of in-memory counters.
- Apply multiple dimensions:
  - IP-based (unauthenticated)
  - User ID based (authenticated)
  - Endpoint-specific (e.g., login, task create)
- Add progressive penalties for repeated abuse and bot fingerprints.
- Combine with WAF/Ingress-level throttling for edge protection.

---

## 8) Security for Production

### Implemented Controls
- Password hashing with bcrypt.
- JWT auth middleware on protected routes.
- Helmet headers.
- Input validation with Zod.
- API rate limiting.
- Secrets externalized via env/Kubernetes secrets.

### Hardening Checklist
- Rotate JWT secret regularly and support key rotation (`kid`/JWKS if expanded).
- Move to short-lived access tokens + refresh token rotation/revocation list.
- Strict CORS allowlist (not wildcard/reflect-all in prod).
- TLS everywhere, HSTS enabled at ingress.
- Mongo/Redis private networking only; no public exposure.
- Add audit logging for auth events and admin/security actions.
- Add dependency scanning + image scanning in CI.
- Enforce least-privilege service accounts and network policies.

---

## 9) Manual Testing Plan (Step-by-Step)

### A) Auth and User Data
1. Register a new user.
2. Confirm user document appears in MongoDB (`users` collection).
3. Login and verify UI shows signed-in identity.
4. Call `GET /api/auth/me` and verify returned email/id.

### B) Task Flow
1. Create tasks for each operation (`uppercase`, `lowercase`, `reverse`, `word_count`).
2. Confirm task documents are created in MongoDB with `pending`.
3. Confirm worker updates tasks through `running` -> terminal state.
4. Open task detail and verify logs/result correctness.

### C) Logout Data Cleanup
1. Create multiple tasks containing identifiable text.
2. Click logout.
3. Verify UI redirects to login and prior task list/details are not visible.
4. Verify MongoDB `tasks` documents for that `userId` are deleted.
5. Login again and confirm a clean dashboard.

### D) Rate Limit
1. Rapidly call login endpoint with invalid creds until limited.
2. Verify `429` response and `Retry-After` header.
3. Repeat for task creation bursts and verify throttling behavior.

### E) Redis Failure
1. Stop Redis.
2. Submit task and verify expected degraded behavior (error response and/or pending record).
3. Restart Redis.
4. Run reconciliation/retry procedure and verify stranded tasks recover.

### F) Security Smoke
1. Verify protected endpoints reject missing/invalid JWT.
2. Verify user A cannot access user B’s task detail.
3. Verify headers from Helmet are present.
4. Run dependency audit and image scan checks.
