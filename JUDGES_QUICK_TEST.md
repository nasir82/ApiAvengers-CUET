# CareForAll Platform - Quick Test Guide for Judges

## 🚀 Quick Start

### 1. Start the System
```bash
cd E:\varsity\CUETHACK
docker-compose up -d
```

**Wait 30-60 seconds for services to start**

### 2. Verify Services
```bash
docker-compose ps
```

**All services should show "Up" and "healthy"**

### 3. Access URLs
- **Frontend:** http://localhost:3007
- **API Gateway:** http://localhost:8000
- **RabbitMQ:** http://localhost:15672 (admin/admin123)
- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3000 (admin/admin)
- **Kibana:** http://localhost:5601
- **Jaeger:** http://localhost:16686

---

## ✅ Test 1: Idempotency Pattern

### Objective
Verify duplicate requests return the same result.

### Quick Test (Frontend)
1. Open: http://localhost:3007
2. Navigate: **Testing → Idempotency**
3. Register a user first (get User ID)
4. Create a campaign (get Campaign ID)
5. Enter Campaign ID, User ID, Amount
6. Click **Run Idempotency Test**
7. **Expected:** Both requests return **SAME ID** ✅

### API Test
```powershell
# 1. Register User
$user = Invoke-RestMethod -Uri "http://localhost:8000/api/users/register" -Method POST -ContentType "application/json" -Body '{"name":"Test User","email":"test@example.com","password":"test123"}'
$userId = $user.data.user.id
Write-Host "User ID: $userId"

# 2. Create Campaign
$campaign = Invoke-RestMethod -Uri "http://localhost:8000/api/campaigns" -Method POST -ContentType "application/json" -Body "{`"title`":`"Test Campaign`",`"description`":`"Test`",`"goalAmount`":1000,`"createdBy`":`"$userId`",`"category`":`"MEDICAL`"}"
$campaignId = $campaign.data.campaign._id
Write-Host "Campaign ID: $campaignId"

# 3. Create First Pledge
$key = "idempotency-test-$(Get-Date -Format 'yyyyMMddHHmmss')"
$body = @{campaignId=$campaignId; userId=$userId; amount=50; idempotencyKey=$key} | ConvertTo-Json
$result1 = Invoke-RestMethod -Uri "http://localhost:8000/api/pledges" -Method POST -ContentType "application/json" -Body $body
$id1 = $result1.data.pledge._id
Write-Host "First ID: $id1"

# 4. Create Second Pledge (Same Key)
$result2 = Invoke-RestMethod -Uri "http://localhost:8000/api/pledges" -Method POST -ContentType "application/json" -Body $body
$id2 = $result2.data.pledge._id
Write-Host "Second ID: $id2"

# 5. Verify
Write-Host "Same ID: $($id1 -eq $id2)" -ForegroundColor $(if ($id1 -eq $id2) { "Green" } else { "Red" })
```

**Expected:** `Same ID: True` ✅

---

## ✅ Test 2: Transactional Outbox Pattern

### Objective
Verify events are stored atomically and published to RabbitMQ.

### Quick Test (Frontend)
1. Open: http://localhost:3007
2. Navigate: **Testing → Outbox**
3. Enter Campaign ID, User ID, Amount
4. Click **Create Pledge with Outbox Event**
5. Wait 10 seconds
6. Open: http://localhost:15672 (admin/admin123)
7. Go to: **Queues → campaign-service-events**
8. **Expected:** Message appears in queue ✅

### API Test
```powershell
# Create Pledge
$body = @{campaignId=$campaignId; userId=$userId; amount=75; idempotencyKey="outbox-test-$(Get-Date -Format 'yyyyMMddHHmmss')"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8000/api/pledges" -Method POST -ContentType "application/json" -Body $body | Out-Null

# Wait 10 seconds
Start-Sleep -Seconds 10

# Check RabbitMQ (manual check at http://localhost:15672)
Write-Host "Check RabbitMQ at http://localhost:15672 → Queues → campaign-service-events"
```

**Expected:** Event in RabbitMQ queue ✅

---

## ✅ Test 3: State Machine Pattern

### Objective
Verify payment state transitions are enforced.

### Quick Test (Frontend)
1. Open: http://localhost:3007
2. Navigate: **Testing → State Machine**
3. Create a pledge first (get Pledge ID)
4. Enter Pledge ID, Amount
5. Click **Create Payment**
6. **Observe:**
   - Initial State: `INITIATED`
   - Current State: `AUTHORIZED`
   - State History shows transitions ✅

### API Test
```powershell
# Create Payment
$paymentBody = @{pledgeId=$pledgeId; amount=100; idempotencyKey="state-test-$(Get-Date -Format 'yyyyMMddHHmmss')"; paymentMethod="STRIPE"} | ConvertTo-Json
$payment = Invoke-RestMethod -Uri "http://localhost:8000/api/payments" -Method POST -ContentType "application/json" -Body $paymentBody
$paymentId = $payment.data.payment._id

Write-Host "Initial State: $($payment.data.payment.status)"

# Check Payment Details
$details = Invoke-RestMethod -Uri "http://localhost:8000/api/payments/$paymentId"
Write-Host "Current State: $($details.data.payment.status)"
Write-Host "State History:"
$details.data.payment.stateHistory | ForEach-Object {
    Write-Host "  $($_.fromState) → $($_.toState)" -ForegroundColor Cyan
}
```

**Expected:** Valid state transitions shown ✅

---

## ✅ Test 4: CQRS Read Model Pattern

### Objective
Verify campaign totals update via events.

### Quick Test (Frontend)
1. Open: http://localhost:3007
2. Navigate: **Testing → CQRS**
3. Enter Campaign ID, User ID, Amount, Number of Pledges
4. Click **Run CQRS Test**
5. **Observe:**
   - Before: Initial totals
   - After: Updated totals
   - **Expected:** Totals increased ✅

### API Test
```powershell
# Get Initial Totals
$initial = Invoke-RestMethod -Uri "http://localhost:8000/api/campaigns/$campaignId"
Write-Host "Initial Total Raised: $($initial.data.totals.totalRaised)"

# Create 3 Pledges
1..3 | ForEach-Object {
    $body = @{campaignId=$campaignId; userId=$userId; amount=25; idempotencyKey="cqrs-test-$_-$(Get-Date -Format 'yyyyMMddHHmmss')"} | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8000/api/pledges" -Method POST -ContentType "application/json" -Body $body | Out-Null
}

# Wait for events
Start-Sleep -Seconds 10

# Check Updated Totals
$updated = Invoke-RestMethod -Uri "http://localhost:8000/api/campaigns/$campaignId"
Write-Host "Updated Total Raised: $($updated.data.totals.totalRaised)"
Write-Host "Total Pledges: $($updated.data.totals.totalPledges)"
Write-Host "Average Pledge: $($updated.data.totals.averagePledge)"
```

**Expected:** Totals updated correctly ✅

---

## ✅ Test 5: End-to-End Flow

### Objective
Test complete donation flow.

### Quick Test (Frontend)
1. Open: http://localhost:3007
2. **Register** → Get User ID
3. **Create Campaign** → Get Campaign ID
4. **Donate** → Create Pledge
5. **Wait 10 seconds**
6. **Check Campaign** → Totals updated
7. **Check Notifications** → Notification created

### API Test
```powershell
Write-Host "=== End-to-End Test ===" -ForegroundColor Cyan

# 1. Register User
$user = Invoke-RestMethod -Uri "http://localhost:8000/api/users/register" -Method POST -ContentType "application/json" -Body '{"name":"E2E User","email":"e2e@test.com","password":"test123"}'
$userId = $user.data.user.id
Write-Host "✓ User: $userId" -ForegroundColor Green

# 2. Create Campaign
$campaign = Invoke-RestMethod -Uri "http://localhost:8000/api/campaigns" -Method POST -ContentType "application/json" -Body "{`"title`":`"E2E Campaign`",`"description`":`"Test`",`"goalAmount`":1000,`"createdBy`":`"$userId`",`"category`":`"MEDICAL`"}"
$campaignId = $campaign.data.campaign._id
Write-Host "✓ Campaign: $campaignId" -ForegroundColor Green

# 3. Create Pledge
$pledge = Invoke-RestMethod -Uri "http://localhost:8000/api/pledges" -Method POST -ContentType "application/json" -Body "{`"campaignId`":`"$campaignId`",`"userId`":`"$userId`",`"amount`":100,`"idempotencyKey`":`"e2e-$(Get-Date -Format 'yyyyMMddHHmmss')`"}"
$pledgeId = $pledge.data.pledge._id
Write-Host "✓ Pledge: $pledgeId" -ForegroundColor Green

# 4. Process Payment
$payment = Invoke-RestMethod -Uri "http://localhost:8000/api/payments" -Method POST -ContentType "application/json" -Body "{`"pledgeId`":`"$pledgeId`",`"amount`":100,`"idempotencyKey`":`"e2e-pay-$(Get-Date -Format 'yyyyMMddHHmmss')`",`"paymentMethod`":`"STRIPE`"}"
Write-Host "✓ Payment: $($payment.data.payment._id)" -ForegroundColor Green

# 5. Wait for events
Start-Sleep -Seconds 10

# 6. Check Campaign Totals
$campaignDetails = Invoke-RestMethod -Uri "http://localhost:8000/api/campaigns/$campaignId"
Write-Host "✓ Total Raised: $($campaignDetails.data.totals.totalRaised)" -ForegroundColor Green

# 7. Check Notifications
$notifications = Invoke-RestMethod -Uri "http://localhost:8000/api/notifications/user/$userId"
Write-Host "✓ Notifications: $($notifications.data.notifications.Count)" -ForegroundColor Green

Write-Host "`n=== E2E Test Complete ===" -ForegroundColor Cyan
```

**Expected:** All steps complete successfully ✅

---

## ✅ Test 6: Observability Tools

### 1. Logging (Kibana)
```powershell
# Open Kibana
Start-Process "http://localhost:5601"

# Instructions:
# 1. Go to Stack Management → Index Patterns
# 2. Create pattern: careforall-logs-*
# 3. Select @timestamp as time field
# 4. Go to Discover to view logs
```

**Expected:** Logs from all services visible ✅

### 2. Metrics (Prometheus)
```powershell
# Open Prometheus
Start-Process "http://localhost:9090"

# Check targets
Start-Process "http://localhost:9090/targets"

# Query: http_requests_total
```

**Expected:** All targets UP, metrics visible ✅

### 3. Visualization (Grafana)
```powershell
# Open Grafana
Start-Process "http://localhost:3000"
# Login: admin/admin
```

**Expected:** Prometheus data source configured ✅

### 4. Tracing (Jaeger)
```powershell
# Open Jaeger
Start-Process "http://localhost:16686"

# Make API call, then refresh Jaeger
Invoke-RestMethod -Uri "http://localhost:8000/api/campaigns" | Out-Null
```

**Expected:** Traces appear in Jaeger ✅

### 5. Message Broker (RabbitMQ)
```powershell
# Open RabbitMQ
Start-Process "http://localhost:15672"
# Login: admin/admin123

# Check Queues tab
```

**Expected:** Queues exist, messages visible ✅

---

## 📊 Success Criteria

### All Tests Pass If:
- ✅ **Idempotency:** Same ID returned for duplicate requests
- ✅ **Outbox:** Events appear in RabbitMQ queue
- ✅ **State Machine:** Valid transitions work, invalid rejected
- ✅ **CQRS:** Campaign totals update after pledges
- ✅ **End-to-End:** Complete flow works
- ✅ **Observability:** All tools show data

### Quick Verification
```powershell
# Health Check
Invoke-RestMethod -Uri "http://localhost:8000/health"
Invoke-RestMethod -Uri "http://localhost:3001/health"
Invoke-RestMethod -Uri "http://localhost:3002/health"
Invoke-RestMethod -Uri "http://localhost:3003/health"
Invoke-RestMethod -Uri "http://localhost:3004/health"

# All should return: {"status":"ok",...}
```

---

## 🎯 Testing Checklist

- [ ] Services started successfully
- [ ] Frontend accessible at http://localhost:3007
- [ ] Idempotency test passed
- [ ] Outbox test passed (event in RabbitMQ)
- [ ] State Machine test passed
- [ ] CQRS test passed (totals updated)
- [ ] End-to-End test passed
- [ ] Kibana shows logs
- [ ] Prometheus shows metrics
- [ ] Grafana accessible
- [ ] Jaeger shows traces
- [ ] RabbitMQ shows messages

---

## 📝 Notes

- **First Start:** Services may take 1-2 minutes to fully initialize
- **Event Processing:** Wait 5-10 seconds for events to process
- **MongoDB Atlas:** Requires internet connection (cloud database)
- **Cache:** Redis cache builds up as requests are made

---

**All tests should complete successfully. The platform demonstrates:**
- ✅ Idempotency (no duplicate charges)
- ✅ Reliable events (never lost)
- ✅ State management (valid transitions)
- ✅ Fast reads (CQRS)
- ✅ Complete observability (logs, metrics, traces)

