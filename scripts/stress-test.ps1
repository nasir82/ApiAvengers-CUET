# CareForAll - Stress / load generator (Checkpoint 3)
# Fires many donation pledges through the gateway to generate load you can watch
# in Grafana / Prometheus / cAdvisor, and traces in Jaeger.
#
# Usage:  .\scripts\stress-test.ps1 -Requests 300
# Tip:    run several copies in parallel terminals to push higher concurrency.

param(
  [int]$Requests = 200,
  [string]$Base = "http://127.0.0.1:3007"   # frontend origin -> gateway -> services
)

function Send-Json($url, $bodyObj) {
  $json = $bodyObj | ConvertTo-Json -Compress
  $tmp = New-TemporaryFile
  Set-Content -Path $tmp -Value $json -Encoding utf8 -NoNewline
  try { return (& curl.exe -s --max-time 15 -X POST $url -H "Content-Type: application/json" -d "@$tmp") | ConvertFrom-Json }
  finally { Remove-Item $tmp -ErrorAction SilentlyContinue }
}

$stamp = Get-Date -Format 'yyyyMMddHHmmss'
Write-Host "Seeding a user and campaign..." -ForegroundColor Yellow
$user = Send-Json "$Base/api/users/register" @{name="Load $stamp"; email="load$stamp@test.com"; password="test123"}
$userId = $user.data.user.id
$camp = Send-Json "$Base/api/campaigns" @{title="Load Campaign $stamp"; description="load"; goalAmount=1000000; createdBy=$userId; category="MEDICAL"}
$campId = $camp.data.campaign._id
Write-Host "campaign=$campId  user=$userId" -ForegroundColor Cyan

Write-Host "Firing $Requests pledges..." -ForegroundColor Yellow
$ok = 0; $fail = 0
$sw = [System.Diagnostics.Stopwatch]::StartNew()
for ($i = 1; $i -le $Requests; $i++) {
  $r = Send-Json "$Base/api/pledges" @{campaignId=$campId; userId=$userId; amount=1; idempotencyKey="load-$stamp-$i"}
  if ($r.success) { $ok++ } else { $fail++ }
  if ($i % 25 -eq 0) { Write-Host "  $i / $Requests" -ForegroundColor DarkGray }
}
$sw.Stop()
$rps = [math]::Round($Requests / $sw.Elapsed.TotalSeconds, 1)

Write-Host "`n=== Load complete ===" -ForegroundColor Green
Write-Host "  ok: $ok   failed: $fail"
Write-Host "  duration: $([math]::Round($sw.Elapsed.TotalSeconds,1))s   throughput: $rps req/s"
Write-Host "`nObserve:" -ForegroundColor Cyan
Write-Host "  Grafana    http://localhost:3000   Prometheus http://localhost:9090"
Write-Host "  cAdvisor   http://localhost:8082    Jaeger     http://localhost:16686"
