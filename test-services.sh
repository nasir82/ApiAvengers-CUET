#!/bin/bash

echo "=== Testing Simple Services ==="
echo ""

# Test Service A Health
echo "1. Testing Service A Health..."
curl -s http://localhost:3001/health | jq .
echo ""

# Test Service A - Create Item
echo "2. Creating item in Service A..."
ITEM_RESPONSE=$(curl -s -X POST http://localhost:3001/api/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Item", "description": "Test description"}')
echo $ITEM_RESPONSE | jq .
ITEM_ID=$(echo $ITEM_RESPONSE | jq -r '.data.item.id')
echo "Created item ID: $ITEM_ID"
echo ""

# Test Service A - List Items
echo "3. Listing items from Service A..."
curl -s http://localhost:3001/api/items | jq .
echo ""

# Test Service B Health
echo "4. Testing Service B Health..."
curl -s http://localhost:3002/health | jq .
echo ""

# Test Service B - Trigger Event
echo "5. Triggering event from Service B..."
curl -s -X POST http://localhost:3002/api/events/trigger \
  -H "Content-Type: application/json" \
  -d '{"eventType": "test.event", "payload": {"message": "Hello from test script"}}' | jq .
echo ""

# Wait a bit for event to be consumed
echo "6. Waiting 2 seconds for event to be consumed..."
sleep 2

# Test Service B - List Events
echo "7. Listing events received by Service B..."
curl -s http://localhost:3002/api/events | jq .
echo ""

echo "=== Tests Complete ==="

