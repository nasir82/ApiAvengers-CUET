# Scaling (Checkpoint 1)

Horizontal scaling is demonstrated with **Docker Compose replicas** — no
orchestrator (Kubernetes/Swarm) required.

## How it works

- The **API Gateway** (nginx, port `8000`) is the single entry point.
- The gateway resolves each service name at request time via Docker's embedded
  DNS (`resolver 127.0.0.11` in [`infrastructure/nginx/nginx.conf`](../infrastructure/nginx/nginx.conf)).
- When a service runs multiple replicas, Docker DNS returns multiple addresses and
  **round-robins** across them, so the gateway automatically load-balances. New
  replicas join the rotation with no config change.

The app services have **no fixed `container_name`** in `docker-compose.yml`, which
is what allows Compose to run more than one instance of each.

## Run scaled

A ready-made override, [`docker-compose.scale.yml`](../docker-compose.scale.yml),
sets replica counts and removes the fixed host ports (multiple replicas cannot all
bind the same host port — reach them through the gateway instead).

```bash
# Start the whole stack scaled (campaign=2, pledge=3, payment=2, user=2, ...)
docker compose -f docker-compose.yml -f docker-compose.scale.yml up -d

# Or scale a single service on the fly
docker compose -f docker-compose.yml -f docker-compose.scale.yml up -d --scale pledge-service=5
```

Verify:

```bash
docker compose -f docker-compose.yml -f docker-compose.scale.yml ps pledge-service   # lists N containers
# Traffic still flows through the gateway / frontend, load-balanced across replicas:
curl http://localhost:3007/api/campaigns
```

> After scaling up, the gateway re-resolves DNS within ~10s (resolver TTL); a brief
> `502` immediately after a topology change is expected and self-heals.

## Return to single-instance

```bash
docker compose down
docker compose up -d
```

This restores the default setup, including the direct host ports `3001`–`3006`
used by the manual checklist and `scripts/feature-test.ps1`.

## Notes

- **Reads scale freely** (campaign/user/admin).
- **pledge/payment** run background workers/consumers; multiple replicas are fine
  for a load demo, but strict exactly-once background processing would require
  single-worker election. The HTTP request path scales without that caveat.
