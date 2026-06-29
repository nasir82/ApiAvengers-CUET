# CareForAll - Overall Project Presentation

## Slide 1 - Executive Summary

CareForAll is a microservices-based donation platform engineered for reliability and scale.

Key goals delivered:

- Prevent duplicate financial operations with idempotency
- Guarantee event durability with transactional outbox
- Enforce payment correctness with state machine transitions
- Improve read performance with CQRS materialized totals
- Ensure operational visibility using logs, metrics, and traces

## Slide 2 - Problem and Solution Fit

Problems addressed:

- Duplicate requests and retries
- Event loss during service failure windows
- Invalid payment lifecycle transitions
- Slow aggregate reads under load

Solution fit:

- Redis-backed idempotency controls duplicate side effects
- Outbox pattern guarantees eventual event publication
- Transition validator blocks illegal payment states
- CampaignTotals read model provides fast aggregate queries

## Slide 3 - High-Level Architecture

```mermaid
flowchart TB
    Client[Web Client] --> FE[React Frontend :3007]
    FE --> GW[API Gateway :8000]

    GW --> C[Campaign Service]
    GW --> PL[Pledge Service]
    GW --> PY[Payment Service]
    GW --> U[User Service]
    GW --> AD[Admin Service]
    GW --> N[Notification Service]

    C --> DB1[(Mongo Atlas: campaigns)]
    PL --> DB2[(Mongo Atlas: pledges)]
    PY --> DB3[(Mongo Atlas: payments)]
    U --> DB4[(Mongo Atlas: users)]
    AD --> DB5[(Mongo Atlas: admin)]
    N --> DB6[(Mongo Atlas: notifications)]

    PL --> R[(Redis)]
    PY --> R

    C --> MQ[(RabbitMQ)]
    PL --> MQ
    PY --> MQ
    N --> MQ

    subgraph Observability
      ELK[ELK Stack]
      PM[Prometheus + Grafana]
      JG[Jaeger]
    end

    C --> ELK
    PL --> ELK
    PY --> ELK
    U --> ELK
    AD --> ELK
    N --> ELK

    C --> PM
    PL --> PM
    PY --> PM
    U --> PM
    AD --> PM
    N --> PM

    C --> JG
    PL --> JG
    PY --> JG
    U --> JG
    AD --> JG
    N --> JG
```

## Slide 4 - End-to-End Working Pipeline

```mermaid
sequenceDiagram
    participant User as User
    participant FE as Frontend
    participant GW as API Gateway
    participant US as User Service
    participant CS as Campaign Service
    participant PS as Pledge Service
    participant Pay as Payment Service
    participant MQ as RabbitMQ
    participant NS as Notification Service

    User->>FE: Register/Login
    FE->>GW: /api/users/*
    GW->>US: Auth requests

    User->>FE: Create campaign
    FE->>GW: POST /api/campaigns
    GW->>CS: Create campaign

    User->>FE: Donate with idempotency key
    FE->>GW: POST /api/pledges
    GW->>PS: Create pledge + outbox
    PS->>MQ: publish pledge.created
    MQ->>CS: update CQRS totals
    MQ->>NS: create notification

    FE->>GW: POST /api/payments
    GW->>Pay: process payment, enforce state machine
    Pay->>MQ: publish payment.authorized/captured/completed
```

## Slide 5 - Reliability Mechanisms

- Idempotency:
  - Request key checked in Redis + persistence fallback
  - Duplicate requests return same business result
- Transactional Outbox:
  - Business write and outbox event in one DB transaction
  - Worker publishes pending events to broker
- Payment State Machine:
  - Allowed transitions only
  - Invalid transitions return deterministic error
- CQRS Read Model:
  - Fast campaign aggregate reads with precomputed totals

## Slide 6 - Observability and Ops

- Centralized logging via ELK for troubleshooting and audit
- Metrics via Prometheus and Grafana for SLI/SLO tracking
- Distributed tracing via Jaeger for latency root-cause analysis
- Health checks and restart policies in compose improve resilience

## Slide 7 - Judge Demo Pipeline

1. Start stack: `docker compose up -d`
2. Verify health and reachability
3. Run `test-all-apis.ps1`
4. Confirm idempotency, outbox behavior, payment transitions, CQRS totals
5. Validate dashboards/logs/traces

## Slide 8 - Current Maturity and Next Steps

Current strengths:

- Clear architecture and stack separation
- Practical implementation of core distributed-system patterns
- Full local demo footprint for judging

Recommended next steps:

- Add CI pipeline with automated API/integration tests
- Move credentials and secrets to secure vault/secret manager
- Add production hardening (authz, limits, backup/recovery, HA broker)
