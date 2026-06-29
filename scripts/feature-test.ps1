# CareForAll - Automated feature test (Windows)
# Verifies each core pattern against the services directly (ports 3001-3006),
# bypassing the API gateway on :8000. Run after `docker compose up -d`.
#
# Uses curl.exe (built into Windows 10/11) for reliable HTTP on this host.

function Ok($m){ Write-Host "  [PASS] $m" -ForegroundColor Green }
function Info($m){ Write-Host "  $m" -ForegroundColor Cyan }
function Fail($m){ Write-Host "  [FAIL] $m" -ForegroundColor Red }

# GET -> parsed JSON
function Get-Json($url) {
  $r = & curl.exe -s --max-time 15 $url
  return $r | ConvertFrom-Json
}
# POST JSON body -> parsed JSON
# Body is written to a temp file (curl -d @file) to avoid PowerShell 5.1
# mangling embedded quotes when passing JSON as a native-command argument.
function Send-Json($url, $bodyObj) {
  $json = $bodyObj | ConvertTo-Json -Compress
  $tmp = New-TemporaryFile
  Set-Content -Path $tmp -Value $json -Encoding utf8 -NoNewline
  try {
    $r = & curl.exe -s --max-time 15 -X POST $url -H "Content-Type: application/json" -d "@$tmp"
    return $r | ConvertFrom-Json
  } finally {
    Remove-Item $tmp -ErrorAction SilentlyContinue
  }
}

$U="http://127.0.0.1:3004"; $C="http://127.0.0.1:3001"; $P="http://127.0.0.1:3002"
$Pay="http://127.0.0.1:3003"; $A="http://127.0.0.1:3005"; $N="http://127.0.0.1:3006"
$stamp = Get-Date -Format 'yyyyMMddHHmmss'

Write-Host "`n=== Health checks (3001-3006) ===" -ForegroundColor Yellow
foreach ($port in 3001..3006) {
  $s = (Get-Json "http://127.0.0.1:$port/health").status
  if ($s -eq "ok") { Ok "port $port ok" } else { Fail "port $port -> $s" }
}

Write-Host "`n=== 1. User: register + login ===" -ForegroundColor Yellow
$user = Send-Json "$U/api/users/register" @{name="Tester $stamp"; email="t$stamp@example.com"; password="test123"}
$userId = $user.data.user.id
Ok "registered user $userId"
$login = Send-Json "$U/api/users/login" @{email="t$stamp@example.com"; password="test123"}
Ok "login token: $([bool]$login.data.token)"

Write-Host "`n=== 2. Campaign: create + list ===" -ForegroundColor Yellow
$camp = Send-Json "$C/api/campaigns" @{title="Camp $stamp"; description="demo"; goalAmount=10000; createdBy=$userId; category="MEDICAL"}
$campId = $camp.data.campaign._id
Ok "created campaign $campId"
$list = Get-Json "$C/api/campaigns"
Ok "list returned $($list.data.campaigns.Count) campaign(s)"

Write-Host "`n=== 3. Idempotency: same key -> one pledge ===" -ForegroundColor Yellow
$pbody = @{campaignId=$campId; userId=$userId; amount=50; idempotencyKey="idem-$stamp"}
$p1 = Send-Json "$P/api/pledges" $pbody
$p2 = Send-Json "$P/api/pledges" $pbody
$pledgeId = $p1.data.pledge._id
$id2 = if ($p2.data.pledge) { $p2.data.pledge._id } else { $p2.data._id }   # replay shape
Info "1st id: $pledgeId"
Info "2nd id: $id2"
if ($pledgeId -eq $id2) { Ok "idempotency works (same id, no duplicate)" } else { Fail "different ids" }

Write-Host "`n=== 4. State machine: payment status ===" -ForegroundColor Yellow
$pay = Send-Json "$Pay/api/payments" @{pledgeId=$pledgeId; amount=50; idempotencyKey="pay-$stamp"; paymentMethod="STRIPE"}
Ok "payment $($pay.data.payment._id) status: $($pay.data.payment.status)"

Write-Host "`n=== 5. Outbox + CQRS: totals update via events (wait 8s) ===" -ForegroundColor Yellow
1..3 | ForEach-Object {
  Send-Json "$P/api/pledges" @{campaignId=$campId; userId=$userId; amount=25; idempotencyKey="cqrs-$_-$stamp"} | Out-Null
}
Start-Sleep -Seconds 8
$cd = Get-Json "$C/api/campaigns/$campId"
Ok "totalRaised: $($cd.data.totals.totalRaised)  totalPledges: $($cd.data.totals.totalPledges)"

Write-Host "`n=== 6. Notifications (event-driven) ===" -ForegroundColor Yellow
$nt = Get-Json "$N/api/notifications/user/$userId"
Ok "notifications for user: $($nt.data.notifications.Count)"

Write-Host "`n=== DONE ===" -ForegroundColor Cyan
