# Observability Scenarios (Checkpoint 3)

The stack ships full observability: **metrics** (Prometheus + Grafana, cAdvisor,
Node Exporter), **logging** (Logstash → Elasticsearch → Kibana), and **tracing**
(OpenTelemetry → Jaeger). This document gives the two required demonstrations:
an **end-to-end trace** of a donation and a **stress / partial-failure** scenario.

## Dashboards

| Tool | URL | Login |
|------|-----|-------|
| Grafana | http://localhost:3000 | admin / admin |
| Prometheus | http://localhost:9090 (targets: `/targets`) | — |
| cAdvisor (containers) | http://localhost:8082 | — |
| Node Exporter (host) | http://localhost:9100/metrics | — |
| Jaeger (traces) | http://localhost:16686 | — |
| Kibana (logs) | http://localhost:5601 | — |
| RabbitMQ | http://localhost:15672 | admin / admin123 |

## Scenario A — End-to-end trace of a donation

1. Make a full donation (creates pledge → payment, emits events):
   ```bash
   # via the app: http://localhost:3007 → open a campaign → Donate
   # or via API (gateway):
   curl -X POST http://localhost:3007/api/pledges -H "Content-Type: application/json" \
     -d '{"campaignId":"<id>","userId":"<id>","amount":50,"idempotencyKey":"trace-1"}'
   ```
2. Open **Jaeger** → http://localhost:16686.
3. Select a service (e.g. `pledge-service`) → **Find Traces**.
4. Open a trace to see the spans across the request path (HTTP handler → MongoDB →
   downstream calls). All services are auto-instrumented via OpenTelemetry
   (`src/tracing.js`) and export to Jaeger.

You can correlate the same workflow in **Kibana** (service logs) and watch the
event hop to the Campaign/Notification consumers in **RabbitMQ**.

## Scenario B — Stress test (system under load)

1. Generate load:
   ```powershell
   .\scripts\stress-test.ps1 -Requests 300
   # run several copies in parallel terminals for higher concurrency
   ```
2. Watch in real time:
   - **Grafana / Prometheus** — `http_requests_total`, `http_request_duration_seconds`
     per service (rate increases under load).
   - **cAdvisor** (http://localhost:8082) — per-container CPU/memory.
   - **Jaeger** — latency of traces grows under load.
3. Optionally scale the hot service and repeat to show improved throughput:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.scale.yml up -d --scale pledge-service=5
   ```
   (see [SCALING.md](SCALING.md)). The gateway load-balances across replicas.

## Scenario C — Partial failure & recovery (reliability)

This proves the **transactional outbox** survives a broker outage — the exact
failure that lost donations in the original system.

1. Stop the message broker:
   ```bash
   docker compose stop rabbitmq
   ```
2. Create a pledge (new `idempotencyKey`). The pledge + outbox row commit in one
   MongoDB transaction, so the **donation is never lost** even though publishing
   fails:
   ```bash
   curl -X POST http://localhost:3007/api/pledges -H "Content-Type: application/json" \
     -d '{"campaignId":"<id>","userId":"<id>","amount":25,"idempotencyKey":"fail-1"}'
   ```
3. Watch the outbox worker retry (publish fails, `retryCount` increases):
   ```bash
   docker compose logs -f pledge-service
   ```
4. Bring the broker back:
   ```bash
   docker compose start rabbitmq
   ```
5. The worker publishes the pending event on its next poll; the Campaign read
   model and Notification service catch up. **No donation lost, no double charge.**

> Idempotency check: repeat step 2 with the *same* `idempotencyKey` at any point —
> the same pledge is returned, never a duplicate.
