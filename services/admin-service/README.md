# Admin Service

Exposes a single aggregate statistics endpoint for an admin dashboard.

| | |
|---|---|
| **Port** | `3005` |
| **Database** | MongoDB `admin` |
| **Depends on** | MongoDB, RabbitMQ |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/admin/stats` | Aggregate counts (campaigns, pledges, amount, active users) |
| `GET`  | `/health` | Liveness probe |
| `GET`  | `/metrics` | Prometheus metrics |

## Environment variables

| Var | Example |
|-----|---------|
| `PORT` | `3005` |
| `MONGODB_URI` | `mongodb://mongo:27017/admin?replicaSet=rs0` |
| `RABBITMQ_URI` | `amqp://admin:admin123@rabbitmq:5672` |

## Run & verify

```bash
docker compose up -d admin-service
curl http://localhost:3005/api/admin/stats
```

> **Note:** this service uses its own `admin` database and is **not** wired into the
> event stream, so `stats` reflects only data written directly to that database
> (it returns zeros against the other services' data by design). To make it report
> live platform totals it would need to consume the same RabbitMQ events the
> Campaign Service does.

## Key files

- `src/routes/admin.js` — stats handler
- `src/config/database.js`
