# How Idempotency Keys Work - Technical Explanation

## 🔑 The Key Principle

**Idempotency Key Rule:**
- **Same operation = Same key** → Returns same result (no duplicate)
- **Different operation = Different key** → Creates new result

## 🎯 How It Works

### Current Implementation (Fixed)

**Key Generation:**
```javascript
const generateIdempotencyKey = (campaignId, userId, amount) => {
  // Get or create session for this campaign
  const sessionKey = `donation-${campaignId}`;
  let sessionId = sessionStorage.getItem(sessionKey);
  
  if (!sessionId) {
    // Create new session on first click
    sessionId = `session-${Date.now()}-${Math.random()}`;
    sessionStorage.setItem(sessionKey, sessionId);
  }
  
  // Key includes: operation, campaign, user, amount, session
  return `pledge-${campaignId}-${userId || 'anonymous'}-${amount}-${sessionId}`;
};
```

**Key Format:**
```
pledge-{campaignId}-{userId}-{amount}-{sessionId}

Example:
pledge-camp123-user456-100-session789
```

**Why This Works:**
1. **First Click:**
   - No session exists → Create new session
   - Generate key: `pledge-camp123-user456-100-session789`
   - Store key in component state
   - Send request

2. **Second Click (Duplicate):**
   - Session exists → Reuse same session
   - Generate key: `pledge-camp123-user456-100-session789` (SAME!)
   - Key already in state → Reuse same key
   - Send request with SAME key
   - Server: Key exists → Return cached result ✅

3. **Network Retry:**
   - Same session → Same key
   - Server: Key exists → Return cached result ✅

## 📊 Step-by-Step Flow

### Scenario: User Double-Clicks "Donate $100"

```
┌─────────────────────────────────────────────────────────┐
│ CLICK 1                                                  │
└─────────────────────────────────────────────────────────┘
1. User clicks "Donate $100"
2. Check sessionStorage: No session for this campaign
3. Create session: "session-1700568000000-abc123"
4. Generate key: "pledge-camp123-user456-100-session-1700568000000-abc123"
5. Store key in state: setIdempotencyKey(key)
6. Send request to server
7. Server: Key not found → Create pledge → Store in Redis
8. Response: pledge-001

┌─────────────────────────────────────────────────────────┐
│ CLICK 2 (0.5 seconds later)                             │
└─────────────────────────────────────────────────────────┘
1. User clicks "Donate $100" again
2. Check sessionStorage: Session exists!
3. Reuse session: "session-1700568000000-abc123"
4. Generate key: "pledge-camp123-user456-100-session-1700568000000-abc123" (SAME!)
5. Key already in state → Reuse same key
6. Send request to server (SAME key)
7. Server: Key found in Redis! → Return cached pledge-001
8. Response: pledge-001 (SAME ID) ✅
9. No duplicate created ✅
```

## 🔍 Key Components

### 1. Session Storage
```javascript
// Stores session ID per campaign
sessionStorage.setItem(`donation-${campaignId}`, sessionId);

// Why per campaign?
// - User can donate to multiple campaigns
// - Each campaign gets its own session
// - Same campaign = same session = same key
```

### 2. Key Format
```javascript
`pledge-${campaignId}-${userId}-${amount}-${sessionId}`

// Why include all these?
// - campaignId: Different campaign = different key ✅
// - userId: Different user = different key ✅
// - amount: Different amount = different key ✅
// - sessionId: Same session = same key (for duplicates) ✅
```

### 3. State Management
```javascript
const [idempotencyKey, setIdempotencyKey] = useState(null);

// Generate ONCE
if (!idempotencyKey) {
  const key = generateIdempotencyKey(...);
  setIdempotencyKey(key);
}

// Reuse for retries
// Same key = same result ✅
```

## 🎯 Different Scenarios

### Scenario 1: Duplicate Click (Same Form)
```
Form: Campaign X, User Y, Amount $100
Click 1: Key = "pledge-X-Y-100-session123"
Click 2: Key = "pledge-X-Y-100-session123" (SAME)
Result: Same pledge returned ✅
```

### Scenario 2: User Changes Amount
```
Form: Campaign X, User Y, Amount $100
Click 1: Key = "pledge-X-Y-100-session123"
User changes amount to $200
Click 2: Key = "pledge-X-Y-200-session123" (DIFFERENT - correct!)
Result: New pledge created ✅
```

### Scenario 3: Network Retry
```
Request 1: Key = "pledge-X-Y-100-session123"
Network timeout
Retry: Key = "pledge-X-Y-100-session123" (SAME)
Result: Same pledge returned ✅
```

### Scenario 4: Different Campaign
```
Campaign A: Key = "pledge-A-Y-100-session123"
Campaign B: Key = "pledge-B-Y-100-session456" (DIFFERENT - correct!)
Result: Different pledges ✅
```

## 🔧 Implementation Details

### Component State
```javascript
const [idempotencyKey, setIdempotencyKey] = useState(null);

// Why null initially?
// - Generate key only when form is submitted
// - Store in state for reuse
// - Clear on success (new donation = new key)
```

### Session Storage
```javascript
// Key: "donation-{campaignId}"
// Value: "session-{timestamp}-{random}"

// Why sessionStorage?
// - Persists during page session
// - Cleared when tab closes
// - Perfect for donation session
```

### Key Generation Logic
```javascript
// 1. Check if session exists for this campaign
let sessionId = sessionStorage.getItem(`donation-${campaignId}`);

// 2. If not, create new session
if (!sessionId) {
  sessionId = `session-${Date.now()}-${Math.random()}`;
  sessionStorage.setItem(`donation-${campaignId}`, sessionId);
}

// 3. Generate key with session
return `pledge-${campaignId}-${userId}-${amount}-${sessionId}`;
```

## ✅ Why This Approach Works

### 1. Duplicate Clicks
```
Same form + Same session = Same key ✅
```

### 2. Network Retries
```
Same form + Same session = Same key ✅
```

### 3. User Changes Form
```
Different amount = Different key ✅
(Correct behavior - user wants different donation)
```

### 4. Different Campaigns
```
Different campaign = Different session = Different key ✅
(Correct behavior - different donations)
```

## 🎓 Summary

**How Idempotency Key Works:**

1. **Generated ONCE** when form is first submitted
2. **Stored in state** for reuse
3. **Based on form data + session** for consistency
4. **Reused for retries** (same key = same result)
5. **Cleared on success** (new donation = new key)

**Key Format:**
```
pledge-{campaignId}-{userId}-{amount}-{sessionId}
```

**Why Same Key for Duplicates:**
- Session stored in sessionStorage
- Same campaign = same session
- Same form data = same key components
- Result: Same key = Same result ✅
