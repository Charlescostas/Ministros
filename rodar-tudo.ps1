# Sobe backend (8080) e frontend (5173) em terminais separados.
# Uso: .\rodar-tudo.ps1

$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not $env:JAVA_HOME) {
    $jdk = 'C:\Program Files\Java\jdk-22'
    if (Test-Path $jdk) { $env:JAVA_HOME = $jdk }
}

Write-Host "Iniciando backend em http://localhost:8080 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "Set-Location '$raiz\backend'; .\mvnw.cmd spring-boot:run"

Write-Host "Iniciando frontend em http://localhost:5173 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "Set-Location '$raiz\frontend'; npm run dev"

Write-Host "Pronto! Abra http://localhost:5173 (login: admin / admin123)" -ForegroundColor Green
