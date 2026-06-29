# Notification Service

Creates user notifications by **consuming events** from RabbitMQ (e.g. when a
pledge is created) and exposes them for querying. Fully event-driven — it has no
write endpoint.

| | |
|---|---|
| **Port** | `3006` |
| **Database** | MongoDB `notifications` |
| **Patterns** | Event-driven consumption (RabbitMQ) |
| **Depends on** | MongoDB, RabbitMQ |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/notifications/user/:userId` | List a user's notifications |
| `GET`  | `/health` | Liveness probe |
| `GET`  | `/metrics` | Prometheus metrics |

## Data model

- **`Notification`** — userId, type, message, read flag, timestamps.

## How it works

1. Pledge Service publishes `pledge.created` to RabbitMQ.
2. `services/eventConsumer.js` consumes it and inserts a `Notification`.
3. `GET /api/notifications/user/:userId` returns them.

## Environment variables

| Var | Example |
|-----|---------|
| `PORT` | `3006` |
| `MONGODB_URI` | `mongodb://mongo:27017/notifications?replicaSet=rs0` |
| `RABBITMQ_URI` | `amqp://admin:admin123@rabbitmq:5672` |

## Run & verify

```bash
docker compose up -d notification-service
# after creating a pledge for <userId>, wait ~10s then:
curl http://localhost:3006/api/notifications/user/<userId>
```

## Key files

- `src/services/eventConsumer.js` — RabbitMQ consumer
- `src/routes/notifications.js`, `src/models/Notification.js`
