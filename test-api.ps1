# PowerShell Test Script for CareForAll API

Write-Host "=== Testing CareForAll API ===" -ForegroundColor Green

# Test 1: Health Checks
Write-Host "`n1. Testing Service A Health:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri http://localhost:3001/health
    Write-Host "✓ Service A is healthy" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "✗ Service A failed: $_" -ForegroundColor Red
}

Write-Host "`n2. Testing Service B Health:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri http://localhost:3002/health
    Write-Host "✓ Service B is healthy" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "✗ Service B failed: $_" -ForegroundColor Red
}

Write-Host "`n3. Testing API Gateway Health:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri http://localhost:8000/health
    Write-Host "✓ API Gateway is healthy" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "✗ API Gateway failed: $_" -ForegroundColor Red
}

# Test 2: List Items
Write-Host "`n4. Listing Items:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri http://localhost:8000/api/items
    Write-Host "✓ Items retrieved" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "✗ Failed to list items: $_" -ForegroundColor Red
}

# Test 3: Create Item
Write-Host "`n5. Creating Item:" -ForegroundColor Yellow
try {
    $body = @{
        name = "Test Item"
        description = "My first item"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri http://localhost:8000/api/items -Method POST -ContentType "application/json" -Body $body
    Write-Host "✓ Item created successfully" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
    $itemId = $response.data.item.id
} catch {
    Write-Host "✗ Failed to create item: $_" -ForegroundColor Red
    $itemId = $null
}

# Test 4: Get Item by ID
if ($itemId) {
    Write-Host "`n6. Getting Item by ID ($itemId):" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/items/$itemId"
        Write-Host "✓ Item retrieved" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 3
    } catch {
        Write-Host "✗ Failed to get item: $_" -ForegroundColor Red
    }
}

# Test 5: List Events
Write-Host "`n7. Listing Events:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri http://localhost:8000/api/events
    Write-Host "✓ Events retrieved" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "✗ Failed to list events: $_" -ForegroundColor Red
}

# Test 6: Trigger Event
Write-Host "`n8. Triggering Event:" -ForegroundColor Yellow
try {
    $body = @{
        eventType = "test.event"
        payload = @{
            message = "Hello from PowerShell test"
        }
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri http://localhost:8000/api/events/trigger -Method POST -ContentType "application/json" -Body $body
    Write-Host "✓ Event triggered" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "✗ Failed to trigger event: $_" -ForegroundColor Red
}

Write-Host "`n=== All Tests Complete ===" -ForegroundColor Green

