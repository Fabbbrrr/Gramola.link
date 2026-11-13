# Para el servidor de Gramola (el proceso que escucha en 8877), sin tocar otros node de la maquina.
# Uso: powershell -File tools\ops\parar.ps1
$ErrorActionPreference = 'Continue'

$conn = Get-NetTCPConnection -LocalPort 8877 -State Listen -ErrorAction SilentlyContinue
if (-not $conn) {
  Write-Host 'gramola: ya estaba parado'
  exit 0
}

foreach ($procId in ($conn | Select-Object -ExpandProperty OwningProcess -Unique)) {
  try {
    Stop-Process -Id $procId -Force -ErrorAction Stop
    Write-Host ("gramola: parado (PID " + $procId + ")")
  } catch {
    Write-Host ("gramola: no se pudo parar el PID " + $procId + ": " + $_.Exception.Message)
    exit 1
  }
}

Start-Sleep -Milliseconds 800
if (Get-NetTCPConnection -LocalPort 8877 -State Listen -ErrorAction SilentlyContinue) {
  Write-Host 'gramola: sigue escuchando en 8877'
  exit 1
}
exit 0
