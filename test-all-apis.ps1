# CareForAll Platform - Complete API Testing Script
Write-Host "=== CareForAll Platform API Testing ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Checks
Write-Host "1. Testing Health Checks..." -ForegroundColor Yellow
$services = @(
    @{Name="API Gateway"; Port=8000},
    @{Name="Campaign Service"; Port=3001},
    @{Name="Pledge Service"; Port=3002},
    @{Name="Payment Service"; Port=3003},
    @{Name="User Service"; Port=3004},
    @{Name="Admin Service"; Port=3005},
    @{Name="Notification Service"; Port=3006}
)

foreach ($svc in $services) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$($svc.Port)/health" -ErrorAction Stop
        Write-Host "  ✓ $($svc.Name) - OK" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ $($svc.Name) - FAILED" -ForegroundColor Red
    }
}

Write-Host ""

# Test 2: User Registration
Write-Host "2. Testing User Registration..." -ForegroundColor Yellow
$userId = $null
$token = $null
try {
    $registerBody = @{
        name = "Test User $(Get-Date -Format 'HHmmss')"
        email = "test$(Get-Date -Format 'HHmmss')@example.com"
        password = "test123"
    } | ConvertTo-Json
    
    $userResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/users/register" -Method POST -ContentType "application/json" -Body $registerBody
    $userId = $userResponse.data.user.id
    $token = $userResponse.data.token
    Write-Host "  ✓ User registered: $userId" -ForegroundColor Green
    Write-Host "  ✓ Token received" -ForegroundColor Green
} catch {
    Write-Host "  ✗ User registration failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host ""

# Test 3: User Login
Write-Host "3. Testing User Login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = $userResponse.data.user.email
        password = "test123"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/users/login" -Method POST -ContentType "application/json" -Body $loginBody
    Write-Host "  ✓ Login successful" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Create Campaign
Write-Host "4. Testing Campaign Creation..." -ForegroundColor Yellow
$campaignId = $null
try {
    $campaignBody = @{
        title = "Test Campaign $(Get-Date -Format 'HHmmss')"
        description = "Test campaign description"
        goalAmount = 10000
        createdBy = $userId
        category = "MEDICAL"
    } | ConvertTo-Json
    
    $campaignResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/campaigns" -Method POST -ContentType "application/json" -Body $campaignBody
    $campaignId = $campaignResponse.data.campaign._id
    Write-Host "  ✓ Campaign created: $campaignId" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Campaign creation failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 5: Get Campaigns
Write-Host "5. Testing Get Campaigns..." -ForegroundColor Yellow
try {
    $campaigns = Invoke-RestMethod -Uri "http://localhost:8000/api/campaigns"
    Write-Host "  ✓ Retrieved $($campaigns.data.campaigns.Count) campaigns" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Get campaigns failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 6: Create Pledge (Idempotency Test)
Write-Host "6. Testing Pledge Creation (Idempotency)..." -ForegroundColor Yellow
$pledgeId = $null
if ($campaignId -ne $null) {
    try {
        $idempotencyKey = "test-pledge-$(Get-Date -Format 'yyyyMMddHHmmss')"
        $pledgeBody = @{
            campaignId = $campaignId
            amount = 100
            idempotencyKey = $idempotencyKey
            userId = $userId
            message = "Test donation"
        } | ConvertTo-Json
        
        $pledge1 = Invoke-RestMethod -Uri "http://localhost:8000/api/pledges" -Method POST -ContentType "application/json" -Body $pledgeBody
        $pledgeId = $pledge1.data.pledge._id
        Write-Host "  ✓ Pledge 1 created: $pledgeId" -ForegroundColor Green
        
        $pledge2 = Invoke-RestMethod -Uri "http://localhost:8000/api/pledges" -Method POST -ContentType "application/json" -Body $pledgeBody
        $pledge2Id = $pledge2.data.pledge._id
        
        if ($pledgeId -eq $pledge2Id) {
            Write-Host "  ✓ Idempotency working: Same ID returned" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Idempotency failed: Different IDs" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ Pledge creation failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠ Skipped (no campaign ID)" -ForegroundColor Yellow
}

Write-Host ""

# Test 7: Process Payment
Write-Host "7. Testing Payment Processing..." -ForegroundColor Yellow
if ($pledgeId -ne $null) {
    try {
        $paymentBody = @{
            pledgeId = $pledgeId
            amount = 100
            idempotencyKey = "test-payment-$(Get-Date -Format 'yyyyMMddHHmmss')"
            paymentMethod = "STRIPE"
        } | ConvertTo-Json
        
        $payment = Invoke-RestMethod -Uri "http://localhost:8000/api/payments" -Method POST -ContentType "application/json" -Body $paymentBody
        $paymentId = $payment.data.payment._id
        Write-Host "  ✓ Payment processed: $paymentId" -ForegroundColor Green
        Write-Host "  ✓ Payment status: $($payment.data.payment.status)" -ForegroundColor Cyan
    } catch {
        Write-Host "  ✗ Payment processing failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠ Skipped (no pledge ID)" -ForegroundColor Yellow
}

Write-Host ""

# Test 8: Check Campaign Totals (CQRS)
Write-Host "8. Testing CQRS Read Model..." -ForegroundColor Yellow
if ($campaignId -ne $null) {
    try {
        Start-Sleep -Seconds 5
        $campaignDetails = Invoke-RestMethod -Uri "http://localhost:8000/api/campaigns/$campaignId"
        Write-Host "  ✓ Campaign Totals:" -ForegroundColor Green
        Write-Host "    - Total Raised: $($campaignDetails.data.totals.totalRaised)" -ForegroundColor Cyan
        Write-Host "    - Total Pledges: $($campaignDetails.data.totals.totalPledges)" -ForegroundColor Cyan
        Write-Host "    - Average Pledge: $($campaignDetails.data.totals.averagePledge)" -ForegroundColor Cyan
    } catch {
        Write-Host "  ✗ CQRS read model check failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠ Skipped (no campaign ID)" -ForegroundColor Yellow
}

Write-Host ""

# Test 9: Check Notifications
Write-Host "9. Testing Notifications..." -ForegroundColor Yellow
try {
    Start-Sleep -Seconds 5
    $notifications = Invoke-RestMethod -Uri "http://localhost:8000/api/notifications/user/$userId"
    Write-Host "  ✓ Notifications: $($notifications.data.notifications.Count)" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Notifications check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 10: Observability Tools
Write-Host "10. Testing Observability Tools..." -ForegroundColor Yellow
try {
    $metrics = Invoke-RestMethod -Uri "http://localhost:3001/metrics" -ErrorAction Stop
    Write-Host "  ✓ Prometheus metrics available" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Prometheus metrics failed" -ForegroundColor Red
}

try {
    $esHealth = Invoke-RestMethod -Uri "http://localhost:9200/_cluster/health" -ErrorAction Stop
    Write-Host "  ✓ Elasticsearch status: $($esHealth.status)" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Elasticsearch check failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Testing Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:3007" -ForegroundColor White
Write-Host "  API Gateway: http://localhost:8000" -ForegroundColor White
Write-Host "  Prometheus: http://localhost:9090" -ForegroundColor White
Write-Host "  Grafana: http://localhost:3000 (admin/admin)" -ForegroundColor White
Write-Host "  Kibana: http://localhost:5601" -ForegroundColor White
Write-Host "  Jaeger: http://localhost:16686" -ForegroundColor White
Write-Host "  RabbitMQ: http://localhost:15672 (admin/admin123)" -ForegroundColor White
