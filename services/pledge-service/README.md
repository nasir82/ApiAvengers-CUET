# Pledge Service

Creates donation pledges with two reliability guarantees: **idempotency**
(no duplicate pledges on retries) and the **transactional outbox** pattern
(a pledge and its event are written in one MongoDB transaction, so events are
never lost even if the message broker is down).

| | |
|---|---|
| **Port** | `3002` |
| **Database** | MongoDB `pledges` (requires a replica set for transactions) |
| **Patterns** | Idempotency, Transactional Outbox, background worker |
| **Depends on** | MongoDB (replica set), Redis, RabbitMQ |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/pledges` | Create a pledge (idempotent via `idempotencyKey`) |
| `GET`  | `/api/pledges/:id` | Get one pledge |
| `GET`  | `/api/pledges/user/:userId` | List a registered user's pledges |
| `GET`  | `/api/pledges/reference/:reference` | List an **unregistered** donor's pledges by the reference (e.g. email) they used |
| `GET`  | `/health` | Liveness probe |
| `GET`  | `/metrics` | Prometheus metrics |

## Data models

- **`Pledge`** — the donation record (campaignId, userId, amount, status, idempotencyKey).
- **`Outbox`** — pending events (`eventType`, `status` = PENDING/PUBLISHED/FAILED, `retryCount`).

## How it works

1. Begin a MongoDB transaction.
2. Check idempotency: Redis first, then `Pledge.findOne({ idempotencyKey })` fallback.
   If found, return the existing pledge — **no new record**.
3. Insert the `Pledge` **and** an `Outbox` row (`status=PENDING`) in the same transaction.
4. Commit. The HTTP response returns immediately.
5. `services/outboxWorker.js` polls every 5s, publishes PENDING events to RabbitMQ,
   marks them `PUBLISHED`. On failure it increments `retryCount`; after 5 retries → `FAILED`.

> **Why a replica set?** MongoDB multi-document transactions require it. The local
> `mongo` container in `docker-compose.yml` runs as single-node replica set `rs0`.

## Environment variables

| Var | Example |
|-----|---------|
| `PORT` | `3002` |
| `MONGODB_URI` | `mongodb://mongo:27017/pledges?replicaSet=rs0` |
| `REDIS_URI` | `redis://redis:6379` |
| `RABBITMQ_URI` | `amqp://admin:admin123@rabbitmq:5672` |

## Run & verify

```bash
docker compose up -d pledge-service
# create a pledge (uses a transaction)
curl -X POST http://localhost:3002/api/pledges \
  -H "Content-Type: application/json" \
  -d '{"campaignId":"cmp-001","amount":100,"idempotencyKey":"demo-1","userId":"user-001"}'
# repeat with the SAME idempotencyKey -> returns the same pledge, no duplicate
```

## Key files

- `src/routes/pledges.js` — transaction + outbox write + idempotency check
- `src/models/Pledge.js`, `src/models/Outbox.js`
- `src/services/outboxWorker.js` — poll / publish / retry
- `src/services/idempotencyService.js` — Redis + Mongo fallback
