# ABDQuiz SYSTEM AUDIT - INDUSTRIAL HIGH-FIDELITY EDITION
# Sequential execution with clear status reporting on new lines.

CLS
$LogFile = "abd-audit-results.log"
$GlobalStatus = $true
$SpinnerChars = @('|', '/', '-', '\')

if (Test-Path $LogFile) { Remove-Item $LogFile }
"ABDQuiz SYSTEM AUDIT REPORT - $(Get-Date)" | Out-File -FilePath $LogFile -Encoding utf8

function Run-AuditStep {
    param(
        [string]$Name,
        [string]$Command,
        [string[]]$StepArgs
    )
    
    Write-Host "`n[$Name] " -ForegroundColor Cyan
    Write-Host "  > In progress... " -NoNewline -ForegroundColor Gray
    
    $fullCmd = ""
    if ($Command -eq "npm" -or $Command -eq "npx") {
        $fullCmd = "cmd /c $Command $($StepArgs -join ' ')"
    } else {
        $fullCmd = "$Command $($StepArgs -join ' ')"
    }
    
    # Execute and capture everything
    $errorsCount = 0
    $warningsCount = 0
    $out = Invoke-Expression $fullCmd 2>&1
    $out | Out-File -FilePath $LogFile -Append -Encoding utf8
    
    $exitCode = $LASTEXITCODE
    
    # Parse results from output
    $progressLine = $out | Where-Object { $_ -like "PROGRESS:*" } | Select-Object -Last 1
    if ($progressLine) {
        $parts = $progressLine.Split(':')
        if ($parts.Count -ge 4) { $errorsCount = $parts[3] }
        if ($parts.Count -ge 5) { $warningsCount = $parts[4] }
    }
    
    if ($exitCode -eq 0) {
        Write-Host "`r  -> PASSED [OK] ($errorsCount errors, $warningsCount warnings)".PadRight(60) -ForegroundColor Green
    } else {
        $errDisplay = $errorsCount
        if ($errorsCount -eq 0) { $errDisplay = "Technical" }
        Write-Host "`r  -> FAILED [!!] ($errDisplay errors detected, $warningsCount warnings)".PadRight(60) -ForegroundColor Red
        $script:GlobalStatus = $false
    }
}

Write-Host "`n[ABDQuiz AUDIT] Starting 6-Phase Industrial Certification..." -ForegroundColor White -BackgroundColor DarkCyan

Run-AuditStep -Name "1/6 Structural Audit" -Command "node" -StepArgs @("scripts/arch-guard.mjs", "structural")
Run-AuditStep -Name "2/6 i18n Coverage   " -Command "node" -StepArgs @("scripts/arch-guard.mjs", "i18n")
Run-AuditStep -Name "3/6 a11y Compliance " -Command "node" -StepArgs @("scripts/arch-guard.mjs", "a11y")
Run-AuditStep -Name "4/6 Purity & Types  " -Command "node" -StepArgs @("scripts/arch-guard.mjs", "purity")
Run-AuditStep -Name "5/6 Type Safety (TSC)" -Command "npx"  -StepArgs @("tsc", "--noEmit")
Run-AuditStep -Name "6/6 Code Quality    " -Command "npm"  -StepArgs @("run", "lint", "--", "--quiet")

if ($GlobalStatus) {
    Write-Host "`n[AUDIT] SYSTEM CERTIFIED - ERA 11 COMPLIANT [OK]" -ForegroundColor Green -BackgroundColor Black
    exit 0
} else {
    Write-Host "`n[AUDIT] BREACHES DETECTED - SYSTEM NOT READY [!!]" -ForegroundColor Red -BackgroundColor Black
    Write-Host "Detailed diagnostics available in: $LogFile" -ForegroundColor Gray
    exit 1
}
