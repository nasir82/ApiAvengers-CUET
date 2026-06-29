# Infrastructure Stack README

## 1) Scope

This stack defines container runtime, service networking, ingress, and platform dependencies.

Primary file:

- `docker-compose.yml`

Core infrastructure components:

- API Gateway (Nginx)
- RabbitMQ (message broker)
- Redis (idempotency + cache)
- Container network and health checks

## 2) Infrastructure Diagram

```mermaid
flowchart TB
    Client[Client Browser/Tool] --> FE[Frontend Container :3007]
    Client --> GW[API Gateway Nginx :8000]

    GW --> S1[Campaign Service]
    GW --> S2[Pledge Service]
    GW --> S3[Payment Service]
    GW --> S4[User Service]
    GW --> S5[Admin Service]
    GW --> S6[Notification Service]

    S1 --> MQ[(RabbitMQ)]
    S2 --> MQ
    S3 --> MQ
    S6 --> MQ

    S2 --> RD[(Redis)]
    S3 --> RD

    subgraph Network
      N1[careforall-network]
    end

    FE --- N1
    GW --- N1
    S1 --- N1
    S2 --- N1
    S3 --- N1
    S4 --- N1
    S5 --- N1
    S6 --- N1
    MQ --- N1
    RD --- N1
```

## 3) Nginx Gateway Routing

- `/api/campaigns` -> campaign-service
- `/api/pledges` -> pledge-service
- `/api/payments` -> payment-service
- `/api/webhooks` -> payment-service
- `/api/users` -> user-service
- `/api/admin` -> admin-service
- `/api/notifications` -> notification-service
- Rate limit configured at `1000 req/s` zone

## 4) Working Pipeline (Infra Lifecycle)

```mermaid
flowchart LR
    A[docker compose up -d] --> B[Network created]
    B --> C[Infra services boot]
    C --> D[App services boot]
    D --> E[Health checks pass]
    E --> F[Gateway receives traffic]
    F --> G[Requests routed to microservices]
```

## 5) Runbook

### Start full platform

```bash
docker compose up -d
```

### Check health

```bash
docker compose ps
```

### View logs

```bash
docker compose logs -f api-gateway
```

## 6) Judge Checklist

- All containers are `Up` and healthy.
- Gateway health endpoint returns success at `http://localhost:8000/health`.
- RabbitMQ UI loads at `http://localhost:15672`.
- Redis is reachable for idempotency paths.

## 7) Risks and Notes

- Externalized secret management is recommended for production.
- Capacity/load tuning (CPU/memory limits, autoscaling, HA broker setup) should be defined for production SLA.
