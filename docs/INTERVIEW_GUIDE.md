# CareForAll — DevOps Interview Study Guide

A from-scratch guide to the stack, how each piece works, **why** it's used here, and
a large bank of interview questions with answers. Written for someone new to the
stack who will be interviewed on this project.

---

# Part 1 — The 30-second pitch (memorize this)

> "CareForAll is a donation platform built as **6 Node.js microservices** behind an
> **Nginx API gateway**, talking to **MongoDB** for data, **Redis** for idempotency
> caching, and **RabbitMQ** for asynchronous events. It implements four reliability
> patterns — **idempotency, transactional outbox, a payment state machine, and CQRS
> read models** — so it never double-charges, never loses a donation, never applies
> an invalid payment state, and serves campaign totals instantly. Everything is
> **Dockerized with Docker Compose**, observable through **Prometheus/Grafana, the
> ELK stack, and Jaeger tracing**, and shipped with a **GitHub Actions CI/CD pipeline**
> that tests and builds only the service that changed."

The story it solves: the old system **double-charged donors** (no idempotency),
**lost donations** (events lost on crash), **corrupted payment state** (no ordering),
**melted the DB** (totals recomputed every request), and was **un-debuggable** (no
observability). Each pattern below fixes one of those failures.

---

# Part 2 — Architecture overview

```
Browser → Frontend (React, :3007)
            │  (same-origin /api)
            ▼
        API Gateway (Nginx, :8000)  ──single entry point──
            ├── campaign-service  :3001   (CQRS read model)
            ├── pledge-service    :3002   (idempotency + outbox)
            ├── payment-service   :3003   (state machine)
            ├── user-service      :3004   (JWT auth, admin seed)
            ├── admin-service     :3005   (stats panel)
            └── notification-svc  :3006   (event-driven)

  Shared infra:  MongoDB (replica set) · Redis · RabbitMQ
  Observability: Prometheus + Grafana + cAdvisor + Node Exporter,
                 Logstash → Elasticsearch → Kibana, OpenTelemetry → Jaeger
```

**Why microservices?** Each part of a donation flow fails differently (payment vs.
pledge vs. totals). Splitting them gives independent de/scaling, isolated failures,
and clear ownership. The trade-off is operational complexity — which is exactly why
the gateway, messaging, and observability exist.

---

# Part 3 — The stack, piece by piece

For each: **What it is → How it works here → Why we need it.**

## 3.1 Node.js + Express
- **What:** JavaScript runtime + minimal web framework. Each service is an Express app.
- **How here:** Every service exposes REST endpoints (`/api/...`), a `/health`
  liveness probe, and `/metrics` for Prometheus. `src/app.js` boots the server,
  connects to dependencies, mounts routes.
- **Why:** Lightweight, fast for I/O-bound work (lots of DB/network calls, little CPU),
  huge ecosystem, same language across all services (one skill set).

## 3.2 MongoDB + Mongoose (with a replica set)
- **What:** Document database (JSON-like). Mongoose is the Node ODM (schemas/models).
- **How here:** Each service owns its **own database** on one Mongo instance
  (`campaigns`, `pledges`, `payments`, `users`, `admin`, `notifications`). Mongoose
  models define schema + validation. Mongo runs as a **single-node replica set
  (`rs0`)**.
- **Why a replica set?** MongoDB **multi-document transactions require a replica set**.
  The pledge service writes the pledge **and** the outbox event in one transaction —
  that atomicity is only available on a replica set (even a single node).
- **Why Mongo at all?** Flexible schema fits evolving donation data; per-service DBs
  enforce the "database-per-service" microservice principle (loose coupling).

## 3.3 Redis
- **What:** In-memory key-value store.
- **How here:** Stores idempotency keys/results. On a pledge/payment, the service
  checks Redis first; if the key exists, it returns the cached original result.
  Webhooks are de-duplicated by `(provider, eventId)`.
- **Why:** Sub-millisecond lookups make the idempotency check essentially free, so
  retries don't hit the database hard. Mongo is the durable fallback if Redis misses.

## 3.4 RabbitMQ (message broker)
- **What:** AMQP message broker for publish/subscribe between services.
- **How here:** The pledge outbox worker **publishes** `pledge.created`; the campaign
  and notification services **consume** it to update the read model and create
  notifications. Producers and consumers are decoupled.
- **Why:** Asynchronous, decoupled communication. The pledge service doesn't call
  campaign/notification directly (which would couple them and fail together). If a
  consumer is down, messages wait in the queue — resilient by design.

## 3.5 Nginx API Gateway
- **What:** Reverse proxy / single entry point.
- **How here:** Routes `/api/campaigns` → campaign-service, `/api/pledges` →
  pledge-service, etc. Adds rate limiting (1000 r/s). Uses Docker's embedded DNS
  resolver (`127.0.0.11`) with a variable in `proxy_pass` so it **re-resolves service
  names at runtime** — which also makes it **load-balance across replicas** automatically.
- **Why:** The frontend (and clients) get **one base URL**. Cross-cutting concerns
  (routing, rate limiting, TLS termination, LB) live in one place instead of every service.

## 3.6 Docker + Docker Compose
- **What:** Containerization + multi-container orchestration via one YAML file.
- **How here:** Each service has a `Dockerfile` (Node base image, `npm install`, copy
  code, run). `docker-compose.yml` defines all services + infra, a shared network,
  volumes (data persistence), healthchecks, and `depends_on` ordering. The stack is
  **self-contained** — `docker compose up -d` runs everything, no external services.
- **Why:** Reproducible environments ("works on my machine" solved), isolation, and
  the judges/graders can run the whole platform with one command.

## 3.7 Prometheus + Grafana + cAdvisor + Node Exporter
- **Prometheus:** time-series DB that **scrapes** `/metrics` from each service every
  15s (pull model). Targets are listed in `prometheus.yml`.
- **Grafana:** dashboards/visualization on top of Prometheus.
- **cAdvisor:** exports **per-container** CPU/memory metrics.
- **Node Exporter:** exports **host machine** metrics.
- **Why:** "No monitoring" was a root cause of the old collapse. Metrics let you see
  request rate, latency, error rate, and resource usage — and alert before failure.

## 3.8 ELK — Logstash, Elasticsearch, Kibana (logging)
- **Logstash:** ingests/transforms logs. **Elasticsearch:** stores/indexes them.
  **Kibana:** searches/visualizes them.
- **How here:** Services log structured JSON (winston); logs flow to Elasticsearch;
  you query them in Kibana.
- **Why:** Centralized logs across many containers. "Digging through scattered logs"
  was another root cause — ELK makes logs searchable in one place.

## 3.9 OpenTelemetry + Jaeger (tracing)
- **What:** OpenTelemetry is a vendor-neutral instrumentation standard; Jaeger stores
  and visualizes **distributed traces**.
- **How here:** Each service's `src/tracing.js` auto-instruments HTTP/DB calls and
  exports spans to Jaeger. A donation produces a trace spanning the services it touches.
- **Why:** In microservices a single request crosses many services; tracing shows the
  **end-to-end path and where latency/errors occur** — impossible with logs alone.

## 3.10 React + Vite (frontend)
- **What:** UI library + fast build tool/dev server.
- **How here:** SPA served by Nginx in production (port 3007). API base URL is the
  **relative** `/api`, so the browser calls its own origin and Nginx proxies to the
  gateway (same-origin, no CORS).
- **Why:** Minimal UI to demonstrate the backend; Vite gives fast builds and a dev proxy.

## 3.11 Jest (testing)
- **What:** JavaScript test framework.
- **How here:** Unit tests per service: the payment **state machine** (pure logic),
  Mongoose model validation (runs offline via `validateSync()`), and the admin route
  (mocked Mongo + supertest). `npm test` runs Jest.
- **Why:** Catch regressions automatically; the CI gate runs these on every change.

## 3.12 GitHub Actions (CI/CD)
- **What:** CI/CD runner triggered by Git events.
- **How here:** On PR/push it (1) **detects which service changed**
  (`dorny/paths-filter`), (2) runs `npm test` **only for changed services**,
  (3) **builds + tags Docker images** with the service's semantic version + commit SHA,
  (4) validates the compose file.
- **Why:** Fast, efficient pipelines (don't rebuild everything), enforced quality gate
  (no merge unless tests pass), traceable versioned images.

---

# Part 4 — The four reliability patterns (the heart of the interview)

## 4.1 Idempotency — "no double charge"
- **Problem:** Retried webhooks/clicks created duplicate charges.
- **Solution:** Client sends an `idempotencyKey`. Service checks **Redis → Mongo**;
  if found, returns the **original** result instead of creating a new record.
- **Proof:** Two requests with the same key produce **one** pledge.

## 4.2 Transactional Outbox — "no lost events"
- **Problem:** Service saved the pledge but crashed before publishing the event →
  donation vanished from the rest of the platform.
- **Solution:** Write the pledge **and** an `Outbox` row in **one MongoDB transaction**.
  A background worker polls every 5s, publishes `PENDING` events to RabbitMQ, marks
  them `PUBLISHED`; on failure `retryCount++`, after 5 tries → `FAILED`.
- **Why it works:** The business write and the "intent to publish" commit atomically,
  so an event is never lost even if RabbitMQ is down — the worker retries later.

## 4.3 Payment State Machine — "valid order only"
- **Problem:** "captured" arrived before "authorized"; state went backward; totals broke.
- **Solution:** Allowed transitions only: `INITIATED→AUTHORIZED→CAPTURED→COMPLETED`
  (and any → `FAILED`). Backward transitions (e.g. `CAPTURED→AUTHORIZED`) are
  **rejected**. Every change recorded in `stateHistory`.

## 4.4 CQRS read model — "fast, correct totals"
- **Problem:** Totals endpoint recomputed sums from scratch each request → 100% CPU,
  "0 raised".
- **Solution:** **C**ommand **Q**uery **R**esponsibility **S**egregation: writes
  (pledges) emit events; the campaign service maintains a **materialized**
  `CampaignTotals` document. Reads are O(1) lookups, never recompute.

---

# Part 5 — End-to-end walkthrough of one donation

1. Browser → `POST /api/pledges` to the frontend origin; Nginx proxies to the gateway;
   gateway routes to **pledge-service**.
2. Pledge service starts a **Mongo transaction**, checks **idempotency** (Redis→Mongo).
3. Inserts `Pledge` + `Outbox(PENDING)` in the same transaction, commits. Returns 201.
4. The **outbox worker** (5s poll) publishes `pledge.created` to **RabbitMQ**.
5. **campaign-service** consumes it → updates `CampaignTotals` (CQRS).
   **notification-service** consumes it → creates a notification.
6. Payment is created via **payment-service**, which enforces the **state machine**.
7. Throughout, **metrics** go to Prometheus, **logs** to ELK, **traces** to Jaeger.

---

# Part 6 — How it's built & run (step by step)

1. **Define services:** each folder under `services/` is an independent Node app with
   its own `package.json`, `Dockerfile`, routes, models.
2. **Add infra to compose:** Mongo (replica set), Redis, RabbitMQ, observability.
3. **Wire env vars:** `MONGODB_URI`, `REDIS_URI`, `RABBITMQ_URI` per service.
4. **Gateway:** Nginx routes `/api/*` to services; frontend uses relative `/api`.
5. **Run:** `docker compose up -d` → open `http://localhost:3007`.
6. **Verify:** `scripts/feature-test.ps1` exercises every pattern; `/health` per service.
7. **Scale:** `docker compose -f docker-compose.yml -f docker-compose.scale.yml up -d`.
8. **CI/CD:** push to GitHub → Actions tests/builds only changed services.

---

# Part 7 — Interview questions & answers

## A. "Tell me about this project" / general
**Q: Walk me through the project.**
A: Use the Part 1 pitch, then mention the four patterns and the DevOps stack
(Docker Compose, observability, CI/CD).

**Q: Why microservices instead of a monolith?**
A: Independent scaling and deployment, fault isolation (a payment bug doesn't crash
campaigns), clear ownership, and database-per-service decoupling. Trade-off:
operational complexity, which we manage with a gateway, messaging, and observability.

**Q: What was the hardest part?**
A: Guaranteeing correctness under retries/failures — solved with idempotency and the
transactional outbox so events are never lost and charges never duplicated.

## B. Docker & Compose
**Q: What's the difference between an image and a container?**
A: An image is the immutable template (built from a Dockerfile); a container is a
running instance of an image.

**Q: Walk me through a Dockerfile here.**
A: Start from `node:18-alpine`, set workdir, `COPY package*.json` then `npm install`
(so dependency layer caches), `COPY . .`, expose the port, `CMD ["node","src/app.js"]`.
Copying package.json first means code changes don't re-install dependencies.

**Q: What does docker-compose give you over `docker run`?**
A: Declarative multi-container setup in one file: networks, volumes, env, healthchecks,
`depends_on`, and one command to bring it all up/down.

**Q: How do containers talk to each other?**
A: Compose puts them on a shared bridge network with **DNS by service name** —
`pledge-service` resolves to that container. No hardcoded IPs.

**Q: What are volumes for?**
A: Persist data outside the container lifecycle (e.g. `mongo-data`) so `docker compose
down` doesn't lose the database. `down -v` wipes volumes.

**Q: What is `depends_on` and its limitation?**
A: Controls start order; with `condition: service_healthy` it waits for healthchecks.
Limitation: it waits for the container, not necessarily app readiness — hence healthchecks.

**Q: Why a `.dockerignore`?**
A: Keeps `node_modules`, tests, and `.git` out of the build context — smaller, faster,
more reproducible builds and prevents stale local `node_modules` leaking into the image.

**Q: Multi-stage build — where and why?**
A: The frontend Dockerfile: stage 1 builds the React app with Node; stage 2 copies the
static `dist` into Nginx. The final image has no Node/build tooling — small and secure.

## C. MongoDB
**Q: Why does this project need a replica set?**
A: Multi-document transactions require it. The outbox pattern writes the pledge + the
event atomically, so we run Mongo as a single-node replica set `rs0`.

**Q: Database-per-service — why?**
A: Loose coupling: services can't reach into each other's data; each owns its schema
and can evolve independently. They communicate via APIs/events, not shared tables.

**Q: How does the admin service read other services' data then?**
A: All databases live on the **same Mongo instance**, so the admin service uses
`mongoose.connection.useDb('campaigns')` etc. to aggregate stats. (In a stricter
setup it would consume events instead — I can explain that trade-off.)

## D. Redis
**Q: Why Redis for idempotency and not just Mongo?**
A: In-memory, sub-millisecond reads. Retries are common; checking Redis first avoids
hammering Mongo. Mongo is the durable fallback if the key isn't in Redis.

**Q: What happens if Redis is down?**
A: The code falls back to a Mongo `findOne({ idempotencyKey })`, so correctness holds;
we just lose the fast-path cache.

## E. RabbitMQ / messaging
**Q: Why a message broker instead of direct HTTP calls between services?**
A: Decoupling and resilience. The producer doesn't know/care who consumes. If a
consumer is down, messages queue up instead of failing the request. It also smooths
traffic spikes (async).

**Q: Difference between synchronous and asynchronous communication here?**
A: Client→service is synchronous HTTP (needs an immediate response). Service→service
for side effects (update totals, notify) is asynchronous via RabbitMQ.

**Q: What if a message fails to process?**
A: The outbox worker retries publishing (up to 5x, then `FAILED`). On the consumer
side you'd use acks/requeue/dead-letter queues to avoid losing messages.

## F. Nginx / gateway / load balancing
**Q: What does the API gateway do?**
A: Single entry point: routing, rate limiting, and load balancing. The frontend uses
one base URL; cross-cutting concerns live in one place.

**Q: How does the gateway load-balance across replicas?**
A: It uses Docker's embedded DNS resolver with a variable in `proxy_pass`, so it
re-resolves the service name per request. When a service has N replicas, Docker DNS
returns multiple IPs and round-robins — new replicas join automatically.

**Q: You hit a 502 after a rebuild once — why, and the fix?**
A: Nginx cached the old container IP at startup; after a rebuild the IP changed.
Fix: the runtime `resolver` directive so Nginx re-resolves names instead of caching.

## G. Observability
**Q: Three pillars of observability?**
A: **Metrics** (Prometheus/Grafana — rates, latency, resource use), **logs** (ELK —
what happened), **traces** (OpenTelemetry/Jaeger — the path of one request across
services).

**Q: Push vs pull metrics — which does Prometheus use?**
A: Pull. Prometheus scrapes each service's `/metrics` endpoint on an interval.

**Q: Why distributed tracing in microservices?**
A: One request spans many services; tracing ties the spans together so you can see
end-to-end latency and pinpoint the slow/failing service.

**Q: How would you demonstrate a partial failure?**
A: Stop RabbitMQ, create a pledge — it still commits (outbox), worker retries, restart
RabbitMQ, the pending event publishes and consumers catch up. No data lost.

## H. CI/CD
**Q: Walk through your pipeline.**
A: On PR/push, GitHub Actions detects changed services, runs Jest only for those,
builds+tags their Docker images with semver + SHA, and validates compose. Branch
protection blocks merges unless the test checks pass.

**Q: Why test/build only the changed service?**
A: Speed and cost. In a real microservice repo you don't rebuild everything on every
commit; path filters scope the work to what changed.

**Q: How do you version images?**
A: Each service has a semantic version in `package.json`; the pipeline tags images
with that version plus the commit SHA for traceability.

**Q: What's a CI quality gate?**
A: Required status checks: code can't merge to `main` unless tests pass — enforced
via branch protection.

## I. Scaling
**Q: How do you scale without Kubernetes?**
A: Docker Compose replicas: `--scale pledge-service=5`. The gateway load-balances via
Docker DNS. We removed `container_name` from app services so Compose can run multiple
instances, and an override file frees host ports.

**Q: Why can't you publish a fixed host port when scaling?**
A: Multiple replicas can't all bind the same host port. Traffic goes through the
gateway instead; the override removes the published ports.

**Q: What doesn't scale cleanly here?**
A: Background workers/consumers (pledge/payment). Running several would double-process;
in production you'd elect a single worker or use a competing-consumer pattern with acks.
The stateless HTTP/read paths scale freely.

## J. The patterns (deep dives)
**Q: Explain idempotency to a non-engineer.**
A: Doing the same thing twice has the same effect as doing it once — clicking "donate"
twice still results in one donation.

**Q: Why not just check "does a pledge exist" instead of an outbox?**
A: The outbox solves a different problem: making the DB write and the event-publish
atomic. Without it you can save the pledge and then crash before publishing — the
event is lost. The outbox stores the intent in the same transaction.

**Q: What is CQRS and why here?**
A: Separating writes from reads. Writes emit events; a read model (`CampaignTotals`)
is kept up to date so reads are instant. It fixed the DB-melting recompute-on-read.

**Q: Eventual consistency — is that a problem?**
A: Totals update a moment after the pledge (async via events). For donation totals,
a sub-second delay is acceptable; we trade strict consistency for speed and resilience.

## K. Scenario / troubleshooting
**Q: A service is "unhealthy" but responds on curl — why?**
A: Real example here: the healthcheck used `localhost`, which resolved to IPv6 `::1`
while the app listened on IPv4. Fixed by using `127.0.0.1` in the healthcheck.

**Q: First donation click failed with "fields required" — diagnose.**
A: A React state bug: the idempotency key was set via `setState` (async) and read in
the same render as `null`. Fixed by computing the key into a local variable.

**Q: How would you debug "donations succeed but totals don't update"?**
A: Check RabbitMQ (is the event published? queue depth?), the outbox table (PENDING/
FAILED/retryCount), the campaign consumer logs, and the Jaeger trace for the workflow.

## L. Behavioral / wrap-up
**Q: What would you improve with more time?**
A: Backend JWT enforcement on the admin API (currently UI-guarded), consumer-side
dead-letter queues, pushing images to a registry in CI, Kubernetes for production
scaling/orchestration, and contract/integration tests.

**Q: What did you learn?**
A: How reliability patterns (idempotency, outbox, state machine, CQRS) turn a fragile
system into a correct one, and how Docker Compose + observability + CI/CD make it
operable and shippable.

---

# Part 8 — One-line glossary (quick recall)

- **Idempotency:** same request twice = one effect.
- **Transactional outbox:** write data + event atomically; publish later via a worker.
- **State machine:** only valid status transitions allowed.
- **CQRS:** separate write model from a fast, materialized read model.
- **API gateway:** single entry point for routing/rate-limit/LB.
- **Replica set:** Mongo cluster mode that enables transactions.
- **Pull metrics:** Prometheus scrapes `/metrics`.
- **Distributed tracing:** follow one request across services (Jaeger).
- **Change-detection CI:** test/build only what changed.
- **Healthcheck:** container-level readiness probe Compose waits on.
