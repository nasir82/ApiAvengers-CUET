# Infrastructure

Configuration for the supporting infrastructure: the API gateway and the
observability stack. These files are mounted into the official images by
`docker-compose.yml` (no custom builds).

## Components

| Folder | Used by | Purpose |
|--------|---------|---------|
| `nginx/nginx.conf` | `api-gateway` (Nginx, port `8000→80`) | Reverse proxy + rate limiting, routes `/api/*` to each service |
| `prometheus/prometheus.yml` | `prometheus` (`9090`) | Scrape targets for service `/metrics` |
| `grafana/provisioning/` | `grafana` (`3000`) | Auto-provisioned Prometheus datasource + dashboards |
| `logstash/logstash.conf` | `logstash` (`5044/9600`) | Log pipeline into Elasticsearch |

## API Gateway routing (`nginx/nginx.conf`)

| Path | Upstream |
|------|----------|
| `/api/campaigns` | campaign-service:3001 |
| `/api/pledges` | pledge-service:3002 |
| `/api/payments`, `/api/webhooks` | payment-service:3003 |
| `/api/users` | user-service:3004 |
| `/api/admin` | admin-service:3005 |
| `/api/notifications` | notification-service:3006 |

Rate limiting: `1000 r/s` per client IP with a burst of 100.

## Observability endpoints

| Tool | URL | Login |
|------|-----|-------|
| RabbitMQ | http://localhost:15672 | admin / admin123 |
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3000 | admin / admin |
| Kibana | http://localhost:5601 | — |
| Jaeger | http://localhost:16686 | — |

## Notes

- The gateway listens on host port **8000**. If a local server (e.g. Apache/XAMPP)
  already owns 8000, it will shadow the gateway — change the host port mapping in
  `docker-compose.yml` (e.g. `"8080:80"`) or stop the conflicting service. The
  frontend reaches the gateway internally and is unaffected.
