# Estado del servidor de Gramola (8877): puerto, salud, pistas sin voz y filtro en vivo.
# Se lanza desde la pestana Tasks de PI WEB (o a mano): powershell -File tools\ops\estado.ps1
$ErrorActionPreference = 'Continue'
$raiz = 'C:\Users\lai\Documents\workspace\Gramola.link'

$conn = Get-NetTCPConnection -LocalPort 8877 -State Listen -ErrorAction SilentlyContinue
if (-not $conn) {
  Write-Host 'gramola: PARADO (nada escucha en 8877)'
  exit 1
}
$procId = ($conn | Select-Object -First 1).OwningProcess
Write-Host ("gramola: escuchando en " + $conn[0].LocalAddress + ":8877 | PID " + $procId)

try {
  $h = Invoke-RestMethod -Uri 'http://127.0.0.1:8877/api/health' -TimeoutSec 5
  Write-Host ("salud: ok=" + $h.ok + " | canciones=" + $h.songs + " | salas=" + $h.rooms + " | cantando=" + $h.singing)
} catch {
  Write-Host 'salud: el puerto escucha pero no responde'
  exit 1
}

$sv = @(Get-ChildItem (Join-Path $raiz 'web\songs\*\sin-voz.mp3') -ErrorAction SilentlyContinue).Count
$canciones = @(Get-ChildItem (Join-Path $raiz 'web\songs') -Directory -ErrorAction SilentlyContinue).Count
Write-Host ("pistas sin voz: " + $sv + " de " + $canciones + " canciones")

try {
  $w = Invoke-WebRequest -Uri 'http://127.0.0.1:8877/tv/quita-voces-worklet.js' -TimeoutSec 5 -UseBasicParsing
  Write-Host ("filtro en vivo: HTTP " + $w.StatusCode)
} catch {
  Write-Host 'filtro en vivo: no se sirve'
}
exit 0
