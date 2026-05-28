# ABD Suite - CENTRAL AUDIT DELEGATOR
# Checks the local suite utilidades directory first, falling back to node_modules/@abd/styles.
$SuiteCentralScript = "D:\desarrollos\ABDSuite\utilidades\scripts\abd-audit.ps1"
$StylesCentralScript = "$PSScriptRoot/../node_modules/@abd/styles/scripts/abd-audit.ps1"

# Save current directory and change to ABDQuiz project root so the central
# audit script can find node_modules (tsc, eslint) and tsconfig.json.
$PrevDir = Get-Location
Set-Location (Resolve-Path "$PSScriptRoot/..")

if (Test-Path $SuiteCentralScript) {
    & powershell -File $SuiteCentralScript
    $exitCode = $LASTEXITCODE
    Set-Location $PrevDir
    exit $exitCode
} elseif (Test-Path $StylesCentralScript) {
    & powershell -File $StylesCentralScript
    $exitCode = $LASTEXITCODE
    Set-Location $PrevDir
    exit $exitCode
} else {
    Set-Location $PrevDir
    Write-Host "`nError: Central audit script not found in ABD Suite or node_modules." -ForegroundColor Red
    Write-Host "Please restore dependencies or verify your local development structure.`n" -ForegroundColor Yellow
    exit 1
}
