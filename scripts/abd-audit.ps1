# ABDQuiz SYSTEM AUDIT - INDUSTRIAL HIGH-FIDELITY EDITION
# Sequential execution with clear status reporting on new lines.

CLS
$LogFile = "abd-audit-results.log"
$GlobalStatus = $true

# Clean log file initially
if (Test-Path $LogFile) { Remove-Item $LogFile -Force -ErrorAction SilentlyContinue }
"ABDQuiz SYSTEM AUDIT REPORT - $(Get-Date)" | Out-File -FilePath $LogFile -Encoding utf8

# Helper to append logs safely to disk with lock-resilience
function Write-AuditLog {
    param([string]$Text)
    try {
        $Text | Out-File -FilePath $LogFile -Append -Encoding utf8 -ErrorAction Stop
    } catch {
        # Silent failover in case of strict OS lock by external editors
    }
}

function Run-AuditStep {
    param(
        [string]$Name,
        [string]$ExecCmd,
        [string[]]$StepArgs
    )
    
    Write-Host "`n[$Name] " -ForegroundColor Cyan
    Write-Host "  > In progress... " -NoNewline -ForegroundColor Gray
    
    $errorsCount = 0
    $warningsCount = 0
    
    # 🛡️ Capture both stdout and stderr (2>&1) to unmask hidden compiler and runtime errors
    $global:LASTEXITCODE = 0
    if ($ExecCmd -eq "node") {
        $out = & node $StepArgs 2>&1
    } elseif ($ExecCmd -eq "pnpm") {
        $out = & pnpm $StepArgs 2>&1
    } elseif ($ExecCmd -eq "npx") {
        $joinedArgs = $StepArgs -join " "
        $out = Invoke-Expression "cmd /c npx $joinedArgs" 2>&1
    } else {
        $out = & $ExecCmd $StepArgs 2>&1
    }
    
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
        # Write explicit success confirmation to log
        Write-AuditLog -Text "`n[PHASE:SUCCESS] [$Name]: Passed successfully with $errorsCount errors and $warningsCount warnings."
    } else {
        $errDisplay = $errorsCount
        if ($errorsCount -eq 0) { $errDisplay = "Technical" }
        Write-Host "`r  -> FAILED [!!] ($errDisplay errors detected, $warningsCount warnings)".PadRight(60) -ForegroundColor Red
        $script:GlobalStatus = $false
        
        # Write failure dump to log
        Write-AuditLog -Text "`n[PHASE:FAILED] [$Name]: Failed with exit code $exitCode ($errDisplay errors detected, $warningsCount warnings)."
        Write-AuditLog -Text "--- RAW ERROR DETAIL START ---"
        if ($out) {
            foreach ($line in $out) {
                if ($line -notlike "PROGRESS:*") {
                    Write-AuditLog -Text $line
                }
            }
        } else {
            Write-AuditLog -Text "No output captured."
        }
        Write-AuditLog -Text "--- RAW ERROR DETAIL END ---`n"
    }
}

Write-Host "`n[ABDQuiz AUDIT] Starting 6-Phase Industrial Certification..." -ForegroundColor White -BackgroundColor DarkCyan

Run-AuditStep -Name "1/6 Structural Audit" -ExecCmd "node" -StepArgs @("scripts/arch-guard.mjs", "structural")
Run-AuditStep -Name "2/6 i18n Coverage   " -ExecCmd "node" -StepArgs @("scripts/arch-guard.mjs", "i18n")
Run-AuditStep -Name "3/6 a11y Compliance " -ExecCmd "node" -StepArgs @("scripts/arch-guard.mjs", "a11y")
Run-AuditStep -Name "4/6 Purity & Types  " -ExecCmd "node" -StepArgs @("scripts/arch-guard.mjs", "purity")
Run-AuditStep -Name "5/6 Type Safety (TSC)" -ExecCmd "npx"  -StepArgs @("tsc", "--noEmit")
Run-AuditStep -Name "6/6 Code Quality    " -ExecCmd "npx"  -StepArgs @("eslint", "--quiet")

if ($GlobalStatus) {
    Write-Host "`n[AUDIT] SYSTEM CERTIFIED - ERA 11 COMPLIANT [OK]" -ForegroundColor Green -BackgroundColor Black
    exit 0
} else {
    Write-Host "`n[AUDIT] BREACHES DETECTED - SYSTEM NOT READY [!!]" -ForegroundColor Red -BackgroundColor Black
    Write-Host "Detailed diagnostics available in: $LogFile" -ForegroundColor Gray
    exit 1
}
