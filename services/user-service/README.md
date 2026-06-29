# User Service

User registration, login, and profile lookup. Issues JWTs on register/login.

| | |
|---|---|
| **Port** | `3004` |
| **Database** | MongoDB `users` |
| **Patterns** | Password hashing, JWT auth |
| **Depends on** | MongoDB, RabbitMQ |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/users/register` | Register a user, returns user + JWT |
| `POST` | `/api/users/login` | Authenticate, returns JWT |
| `GET`  | `/api/users/:id` | Get a user profile |
| `GET`  | `/health` | Liveness probe |
| `GET`  | `/metrics` | Prometheus metrics |

## Data model

- **`User`** — name, email (unique), hashed password.

## Environment variables

| Var | Example |
|-----|---------|
| `PORT` | `3004` |
| `MONGODB_URI` | `mongodb://mongo:27017/users?replicaSet=rs0` |
| `JWT_SECRET` | `your-secret-key-change-in-production` |
| `RABBITMQ_URI` | `amqp://admin:admin123@rabbitmq:5672` |

> ⚠️ Set a strong `JWT_SECRET` for any non-local use.

## Run & verify

```bash
docker compose up -d user-service
curl -X POST http://localhost:3004/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo","email":"demo@example.com","password":"test123"}'
```

## Key files

- `src/routes/users.js` — register / login / profile
- `src/models/User.js`
