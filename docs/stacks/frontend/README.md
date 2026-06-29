# Frontend Stack README

## 1) Scope

This stack contains the React single-page application used for donor, campaign, profile, admin, notifications, and pattern-demo flows.

- Technology: React 18 + React Router + Axios + Vite
- Source: `frontend/src`
- Runtime port (local): `5173` (Vite dev), `3007` (Docker Nginx container)
- Upstream API base URL: `http://localhost:8000/api`

## 2) Stack Components

- Routing shell: `frontend/src/App.jsx`
- UI pages:
  - Home, Campaigns, Campaign Detail, Donate
  - Login/Register/Profile
  - Admin Dashboard
  - Notifications
  - Pattern demos: Idempotency, Outbox, State Machine, CQRS
- API client layer: `frontend/src/services/api.js`

## 3) Frontend Architecture Diagram

```mermaid
flowchart TD
    A[Browser] --> B[React App]
    B --> C[React Router]
    C --> D[Feature Pages]
    D --> E[Axios API Service]
    E --> F[API Gateway :8000]

    subgraph Feature Pages
      D1[Campaign Views]
      D2[Auth Views]
      D3[Donation View]
      D4[Test Pattern Views]
    end

    D --> D1
    D --> D2
    D --> D3
    D --> D4
```

## 4) Working Pipeline (Frontend)

```mermaid
flowchart LR
    P1[Developer starts Vite] --> P2[React app loads]
    P2 --> P3[User action: form/click]
    P3 --> P4[Axios request]
    P4 --> P5[Gateway route /api/*]
    P5 --> P6[Microservice response]
    P6 --> P7[UI state update]
```

## 5) Runbook

### Local Dev

```bash
cd frontend
npm install
npm run dev
```

### Production-like (Docker)

```bash
docker compose up -d frontend api-gateway
```

Open:

- Frontend: `http://localhost:3007`
- Gateway: `http://localhost:8000`

## 6) Judge Checklist

- App home page loads at `http://localhost:3007`
- Campaign list page is reachable
- Auth routes are reachable
- Testing routes (`/test/idempotency`, `/test/outbox`, `/test/state-machine`, `/test/cqrs`) render correctly
- Requests pass through API gateway and return data

## 7) Risks and Notes

- No frontend unit/e2e test framework is configured yet.
- Production API base URL should be parameterized through environment variables if deployed outside this compose network.
