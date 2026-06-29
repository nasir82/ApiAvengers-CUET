# Supervisor Verification Checklist

A step-by-step, manual walkthrough to demonstrate that the CareForAll platform
runs and that each core pattern works. Every step lists the **action**, the
**command**, and the **expected result** so it can be shown live.

> **Environment:** Windows + Docker Desktop. Commands are PowerShell.
> The platform uses a **local MongoDB** container (single-node replica set `rs0`),
> so no internet/cloud database is required.

---

## 0. Prerequisites

| Check | Command | Expected |
|-------|---------|----------|
| Docker is running | `docker version` | Client + Server versions print |
| In the project folder | `cd d:\jkbd\CUETHACK-main` | — |

---

## 1. Start the platform

```powershell
docker compose up -d
```

Wait ~30–60 seconds on first start. Then confirm every container is healthy:

```powershell
docker compose ps
```

**✅ Expected:** all rows show `Up` and `(healthy)` — including `mongo`, the six
`*-service` containers, `rabbitmq`, `redis`, `frontend`, and the observability tools.

---

## 2. Health checks (all 6 services)

```powershell
foreach ($p in 3001..3006) {
  "Port $p ->  " + (Invoke-RestMethod "http://localhost:$p/health").status
}
```

**✅ Expected:** each line ends in `ok`.

| Port | Service |
|------|---------|
| 3001 | Campaign |
| 3002 | Pledge |
| 3003 | Payment |
| 3004 | User |
| 3005 | Admin |
| 3006 | Notification |

---

## 3. Feature: User registration & login

```powershell
$stamp = Get-Date -Format 'HHmmss'
$reg = @{ name="Demo $stamp"; email="demo$stamp@test.com"; password="test123" } | ConvertTo-Json
$user = Invoke-RestMethod "http://localhost:3004/api/users/register" -Method POST -ContentType "application/json" -Body $reg
$userId = $user.data.user.id
"User ID: $userId"
"Token issued: " + [bool]$user.data.token
```

**✅ Expected:** a `User ID` is printed and `Token issued: True`.

---

## 4. Feature: Create a campaign (Campaign service)

```powershell
$cb = @{ title="Demo Campaign"; description="demo"; goalAmount=10000; createdBy=$userId; category="MEDICAL" } | ConvertTo-Json
$camp = Invoke-RestMethod "http://localhost:3001/api/campaigns" -Method POST -ContentType "application/json" -Body $cb
$campId = $camp.data.campaign._id
"Campaign ID: $campId"
```

**✅ Expected:** a `Campaign ID` is printed.

---

## 5. Feature: Idempotency (no duplicate pledges)

```powershell
$key = "idem-$stamp"
$pb = @{ campaignId=$campId; userId=$userId; amount=50; idempotencyKey=$key } | ConvertTo-Json
$p1 = Invoke-RestMethod "http://localhost:3002/api/pledges" -Method POST -ContentType "application/json" -Body $pb
$p2 = Invoke-RestMethod "http://localhost:3002/api/pledges" -Method POST -ContentType "application/json" -Body $pb
"First call  id: " + $p1.data.pledge._id
"Second call id: " + $p2.data._id     # replay returns fields under .data
```

**✅ Expected:** both calls reference the **same pledge id**. The second response
message reads *"Duplicate request - returning existing pledge"* — proving the
retry did **not** create a second record.

---

## 6. Feature: State machine (Payment service)

```powershell
$payb = @{ pledgeId=$p1.data.pledge._id; amount=50; idempotencyKey="pay-$stamp"; paymentMethod="STRIPE" } | ConvertTo-Json
$pay = Invoke-RestMethod "http://localhost:3003/api/payments" -Method POST -ContentType "application/json" -Body $payb
"Payment status: " + $pay.data.payment.status
$details = Invoke-RestMethod "http://localhost:3003/api/payments/$($pay.data.payment._id)"
$details.data.payment.stateHistory
```

**✅ Expected:** a payment is created with a valid status (e.g. `INITIATED`) and a
`stateHistory` recording the transition(s). Invalid transitions are rejected by the
service.

---

## 7. Feature: Transactional Outbox + CQRS read model

Create several pledges, then watch the campaign totals update **asynchronously**
from events (not computed at read time):

```powershell
1..3 | ForEach-Object {
  $b = @{ campaignId=$campId; userId=$userId; amount=25; idempotencyKey="cqrs-$_-$stamp" } | ConvertTo-Json
  Invoke-RestMethod "http://localhost:3002/api/pledges" -Method POST -ContentType "application/json" -Body $b | Out-Null
}
Start-Sleep -Seconds 8
$cd = Invoke-RestMethod "http://localhost:3001/api/campaigns/$campId"
"Total raised:  " + $cd.data.totals.totalRaised
"Total pledges: " + $cd.data.totals.totalPledges
```

**✅ Expected:** `Total raised` and `Total pledges` reflect the pledges
(e.g. raised `125`, pledges `4`). This proves:
- **Outbox** — events were published reliably from the pledge transaction.
- **CQRS** — the Campaign Service consumed them and updated its read model.

### Visual confirmation (optional, good for a demo)
Open **RabbitMQ** at http://localhost:15672 (admin / admin123) →
**Queues** → you can see the event queues that carried `pledge.created`.

---

## 8. Feature: Event-driven notifications

```powershell
$nt = Invoke-RestMethod "http://localhost:3006/api/notifications/user/$userId"
"Notifications: " + $nt.data.notifications.Count
```

**✅ Expected:** count > 0 — notifications were created automatically from the
pledge events (no direct write).

---

## 9. Frontend (UI)

1. Open **http://localhost:3007**.
2. Browse campaigns; open the **Testing** menu.
3. Run the **Idempotency**, **Outbox**, **State Machine**, and **CQRS** panels.

**✅ Expected:** each panel reports success, mirroring steps 5–8 through the UI.

---

## 10. Observability stack

| Tool | URL | What to show |
|------|-----|--------------|
| RabbitMQ | http://localhost:15672 (admin/admin123) | Queues + message activity |
| Prometheus | http://localhost:9090/targets | Service targets `UP` |
| Grafana | http://localhost:3000 (admin/admin) | Prometheus datasource |
| Jaeger | http://localhost:16686 | Traces after making an API call |
| Kibana | http://localhost:5601 | Service logs |

---

## 11. Shut down

```powershell
docker compose down        # stop (database kept in the mongo-data volume)
# docker compose down -v   # stop AND wipe all data
```

---

## Notes for the demo

- **One reusable command:** steps 3–8 are also automated in
  `scripts/feature-test.ps1` (run it to produce the same evidence in one go).
- **API Gateway (port 8000):** this checklist calls each service **directly**
  (3001–3006), which always works. The gateway also works, but if a local
  Apache/XAMPP owns port 8000 it will shadow it — see `infrastructure/README.md`.
- **Data is empty on first start** — there is no seed data, so lists are empty
  until you create records (as the steps above do).
