# CareForAll Donation Platform

A scalable, event-driven fundraising backend built as Node.js microservices, with
a React frontend and a full observability stack. It demonstrates production
reliability patterns: **idempotency**, **transactional outbox**, payment
**state machine**, and **CQRS** read models.

---

## 🚀 Quick Start

Requires **Docker Desktop** only — the database runs locally in a container
(no cloud account needed).

```bash
docker compose up -d        # build/start everything
docker compose ps           # all should be Up / healthy
```

Then open:

- **Frontend** → http://localhost:3007
- **API Gateway** → http://localhost:8000
- Services → `3001`–`3006` (each exposes `/health` and `/metrics`)

To verify every feature in one command:

```powershell
.\scripts\feature-test.ps1
```

For a manual, demo-ready walkthrough see **[SUPERVISOR_CHECKLIST.md](./SUPERVISOR_CHECKLIST.md)**.

---

## 🧩 Services

| Service | Port | Responsibility | Pattern |
|---------|------|----------------|---------|
| [Campaign](./services/campaign-service/) | 3001 | Campaign CRUD | CQRS read model |
| [Pledge](./services/pledge-service/) | 3002 | Donation pledges | Idempotency + Transactional Outbox |
| [Payment](./services/payment-service/) | 3003 | Payment processing | State machine + webhooks |
| [User](./services/user-service/) | 3004 | Auth & profiles | JWT |
| [Admin](./services/admin-service/) | 3005 | Admin stats | — |
| [Notification](./services/notification-service/) | 3006 | User notifications | Event-driven |

Each service folder contains its own `README.md`.

---

## 📁 Project Structure

```
CUETHACK/
├── services/               # 6 Node.js microservices (each has a README)
├── frontend/               # React + Vite SPA (README inside)
├── infrastructure/         # Nginx gateway, Prometheus, Grafana, Logstash (README inside)
├── docs/                   # mkdocs site + per-stack docs
├── examples/               # Example API requests/responses
├── scripts/                # feature-test.ps1 (automated verification)
├── docker-compose.yml      # Full stack incl. local MongoDB (replica set)
├── SUPERVISOR_CHECKLIST.md # Manual step-by-step verification
└── CareForAll_API.postman_collection.json
```

---

## 🏗️ Architecture

```
Frontend (3007) ─▶ API Gateway / Nginx (8000)
                      ├─▶ Campaign (3001) ─┐
                      ├─▶ Pledge   (3002) ─┤
                      ├─▶ Payment  (3003) ─┼─▶ MongoDB (local, replica set rs0)
                      ├─▶ User     (3004) ─┤
                      ├─▶ Admin    (3005) ─┘
                      └─▶ Notification (3006)
        Pledge/Payment ─▶ Redis (idempotency)  &  RabbitMQ (events)
        Events ─▶ Campaign (read model) & Notification (notifications)
```

Observability: RabbitMQ UI `15672`, Prometheus `9090`, Grafana `3000`,
Jaeger `16686`, Kibana `5601`.

---

## 🔑 Key Patterns

- **Idempotency** — duplicate requests (same `idempotencyKey`) return the original result; no double charge. *(Pledge, Payment)*
- **Transactional Outbox** — a pledge and its event are written in one MongoDB transaction; a worker publishes events reliably. *(Pledge)*
- **State Machine** — only valid payment status transitions are allowed. *(Payment)*
- **CQRS** — campaign totals are a materialized read model updated from events. *(Campaign)*
- **Observability** — structured logs, Prometheus metrics, and Jaeger traces across all services.

---

## 📚 Documentation

- **[docs/](./docs/)** — full documentation site (per-stack guides under `docs/stacks/`)
- **[SUPERVISOR_CHECKLIST.md](./SUPERVISOR_CHECKLIST.md)** — manual verification steps
- **[docs/CICD.md](./docs/CICD.md)** — CI/CD pipeline (Checkpoint 4)
- **[docs/SCALING.md](./docs/SCALING.md)** — horizontal scaling via Compose replicas (Checkpoint 1)
- **[docs/OBSERVABILITY_SCENARIOS.md](./docs/OBSERVABILITY_SCENARIOS.md)** — tracing, stress & partial-failure demos (Checkpoint 3)
- Per-segment `README.md` in each `services/*`, `frontend/`, and `infrastructure/`

## ✅ Testing

```bash
# unit tests (per service, Jest)
cd services/payment-service && npm install && npm test
# end-to-end feature test (all patterns)
./scripts/feature-test.ps1
# load / stress
./scripts/stress-test.ps1 -Requests 300
```

---

## 🛑 Stop

```bash
docker compose down        # keep data (mongo-data volume)
docker compose down -v     # wipe data too
```
