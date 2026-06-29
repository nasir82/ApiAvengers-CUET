# Frontend

React + Vite single-page app for the CareForAll platform. Talks to the backend
through the API Gateway (Nginx). Includes a **Testing** section with interactive
panels that demonstrate each backend pattern.

| | |
|---|---|
| **Stack** | React 18, React Router, Axios, Vite 5 |
| **Dev port** | `5173` (Vite dev server) |
| **Container port** | `3007` → serves the production build via Nginx |
| **API access** | Proxies `/api/*` to the API Gateway |

## API integration

The Axios client (`src/services/api.js`) uses a **relative** base URL `/api`. The
browser therefore calls the frontend's *own* origin (e.g. `http://localhost:3007/api/...`),
and the request is reverse-proxied to the API Gateway:

- **Docker (prod build):** Nginx `location /api` → `http://api-gateway:80` (see `nginx.conf`).
- **Vite (dev):** the dev server proxies `/api` → the gateway (see `vite.config.js`).

This keeps everything **same-origin** (no CORS) and removes any dependency on a host
port such as `8000`. Override the base URL only for non-proxied setups via the
`VITE_API_URL` build-time env var.

## Pages

- **Public:** Home, Campaigns, Campaign detail, Create campaign, Donate, Register, Login, Profile, Notifications, Admin dashboard.
- **Testing panels:** `IdempotencyTest`, `OutboxTest`, `StateMachineTest`, `CQRSTest` — each drives the matching backend pattern and shows the result.

## Run

### With Docker (recommended)
```bash
docker compose up -d frontend
# open http://localhost:3007
```
The container reaches the backend internally via `api-gateway:80`, so it is
unaffected by host port conflicts.

### Local dev (without Docker)
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```
The dev server proxies `/api` to the gateway via `vite.config.js`. If you run the
gateway on a different host/port, update the `proxy` target there (the
`api-gateway:80` hostname only resolves inside the Docker network).

## Key files

- `src/App.jsx` — routes
- `src/services/api.js` — Axios client / base URL
- `src/pages/` — pages and the Testing panels
- `vite.config.js` — dev server + `/api` proxy
- `Dockerfile`, `nginx.conf` — production build + static serving
