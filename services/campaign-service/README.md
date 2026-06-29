# Campaign Service

Campaign management with a **CQRS read model**. Owns campaign data and maintains
materialized totals (raised amount, pledge count, average) that are updated
asynchronously from pledge events — so reads are fast and never block on writes.

| | |
|---|---|
| **Port** | `3001` |
| **Database** | MongoDB `campaigns` |
| **Patterns** | CQRS read model, event-driven consumption (RabbitMQ) |
| **Depends on** | MongoDB, RabbitMQ |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/campaigns` | Create a campaign |
| `GET`  | `/api/campaigns` | List campaigns |
| `GET`  | `/api/campaigns/:id` | Get one campaign **with materialized totals** |
| `GET`  | `/health` | Liveness probe |
| `GET`  | `/metrics` | Prometheus metrics |

## Data models

- **`Campaign`** — core campaign document (title, description, goalAmount, category, createdBy).
- **`CampaignTotals`** — CQRS read model: `totalRaised`, `totalPledges`, `averagePledge`.

## How the read model updates

1. Pledge Service publishes `pledge.created` to RabbitMQ.
2. `services/eventConsumer.js` consumes the event.
3. `services/readModelUpdater.js` recomputes and upserts `CampaignTotals`.
4. `GET /api/campaigns/:id` serves the pre-computed totals — no aggregation at read time.

## Environment variables

| Var | Example |
|-----|---------|
| `PORT` | `3001` |
| `MONGODB_URI` | `mongodb://mongo:27017/campaigns?replicaSet=rs0` |
| `RABBITMQ_URI` | `amqp://admin:admin123@rabbitmq:5672` |
| `JAEGER_ENDPOINT` | `http://jaeger:14268/api/traces` |

## Run & verify

```bash
docker compose up -d campaign-service
curl http://localhost:3001/health
```

## Key files

- `src/app.js` — bootstrap, route mounting, consumer startup
- `src/routes/campaigns.js` — HTTP handlers
- `src/models/Campaign.js`, `src/models/CampaignTotals.js`
- `src/services/eventConsumer.js`, `src/services/readModelUpdater.js`
