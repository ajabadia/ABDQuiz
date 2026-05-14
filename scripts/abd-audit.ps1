# ABDQuiz SYSTEM AUDIT
# Executes full system check: arch-guard, tsc, lint.

$LogFile = "abd-audit-results.log"
$Separator = "`n" + ("=" * 80) + "`n"
$GlobalStatus = $true

if (Test-Path $LogFile) { Remove-Item $LogFile }

Write-Host "`n[ABDQuiz AUDIT] Starting full system check..." -ForegroundColor Cyan
"ABDQuiz SYSTEM AUDIT REPORT - $(Get-Date)" | Out-File -FilePath $LogFile -Encoding utf8

# 1. ARCHITECTURAL GUARD
Write-Host "[1/3] Running Architectural Audit (Fire Rules)..." -ForegroundColor Yellow
$Separator | Out-File -FilePath $LogFile -Append -Encoding utf8
"SECTION 1: ARCHITECTURAL INTEGRITY" | Out-File -FilePath $LogFile -Append -Encoding utf8
node scripts/arch-guard.mjs | Out-File -FilePath $LogFile -Append -Encoding utf8
if ($LASTEXITCODE -ne 0) { $GlobalStatus = $false; Write-Host "  -> [FAILED]" -ForegroundColor Red } else { Write-Host "  -> [PASSED]" -ForegroundColor Green }

# 2. TYPESCRIPT
Write-Host "[2/3] Running Type Safety Check..." -ForegroundColor Yellow
$Separator | Out-File -FilePath $LogFile -Append -Encoding utf8
"SECTION 2: TYPE SAFETY CHECK" | Out-File -FilePath $LogFile -Append -Encoding utf8
npx tsc --noEmit | Out-File -FilePath $LogFile -Append -Encoding utf8
if ($LASTEXITCODE -ne 0) { $GlobalStatus = $false; Write-Host "  -> [FAILED]" -ForegroundColor Red } else { Write-Host "  -> [PASSED]" -ForegroundColor Green }

# 3. LINTING
Write-Host "[3/3] Running Code Linting..." -ForegroundColor Yellow
$Separator | Out-File -FilePath $LogFile -Append -Encoding utf8
"SECTION 3: CODE LINTING" | Out-File -FilePath $LogFile -Append -Encoding utf8
npm run lint --quiet | Out-File -FilePath $LogFile -Append -Encoding utf8
if ($LASTEXITCODE -ne 0) { $GlobalStatus = $false; Write-Host "  -> [FAILED]" -ForegroundColor Red } else { Write-Host "  -> [PASSED]" -ForegroundColor Green }

if ($GlobalStatus) {
    Write-Host "`n[AUDIT] SYSTEM READY ✅" -ForegroundColor Green
} else {
    Write-Host "`n[AUDIT] ERRORS DETECTED ❌" -ForegroundColor Red
}

exit ($GlobalStatus ? 0 : 1)
