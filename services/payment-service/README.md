# Payment Service

Processes payments for pledges using an explicit **state machine** so only valid
status transitions are allowed, and handles asynchronous provider **webhooks**
idempotently.

| | |
|---|---|
| **Port** | `3003` |
| **Database** | MongoDB `payments` |
| **Patterns** | State machine, idempotency, webhook handling, event publishing |
| **Depends on** | MongoDB, Redis, RabbitMQ |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/payments` | Create/initiate a payment |
| `GET`  | `/api/payments/:id` | Get a payment + its `stateHistory` |
| `POST` | `/api/webhooks/:provider` | Receive a provider webhook (idempotent) |
| `GET`  | `/health` | Liveness probe |
| `GET`  | `/metrics` | Prometheus metrics |

## Data models

- **`Payment`** — amount, status, paymentMethod, `stateHistory[]` (fromState → toState).
- **`WebhookEvent`** — record of received webhooks for idempotent processing.

## State machine

Valid transitions are enforced in `services/stateMachine.js`. An invalid transition
is rejected rather than silently applied. Typical flow:

```
INITIATED -> AUTHORIZED -> CAPTURED -> SETTLED
         \-> FAILED      \-> REFUNDED
```

## Environment variables

| Var | Example |
|-----|---------|
| `PORT` | `3003` |
| `MONGODB_URI` | `mongodb://mongo:27017/payments?replicaSet=rs0` |
| `REDIS_URI` | `redis://redis:6379` |
| `RABBITMQ_URI` | `amqp://admin:admin123@rabbitmq:5672` |

## Run & verify

```bash
docker compose up -d payment-service
curl -X POST http://localhost:3003/api/payments \
  -H "Content-Type: application/json" \
  -d '{"pledgeId":"<pledgeId>","amount":100,"idempotencyKey":"pay-1","paymentMethod":"STRIPE"}'
# then inspect the state history:
curl http://localhost:3003/api/payments/<paymentId>
```

## Key files

- `src/routes/payments.js` — payment + webhook handlers
- `src/services/stateMachine.js` — allowed transitions
- `src/models/Payment.js`, `src/models/WebhookEvent.js`
- `src/services/idempotencyService.js`, `src/services/eventPublisher.js`
