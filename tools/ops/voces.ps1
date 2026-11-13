# Pre-procesa las canciones que aun no tienen sin-voz.mp3 (Demucs, una vez por cancion).
# Lo hecho se salta, asi que se puede lanzar las veces que haga falta.
# Uso: powershell -File tools\ops\voces.ps1 [-Listar] [-Forzar] [-Cancion "Nombre de la carpeta"]
param(
  [switch]$Listar,
  [switch]$Forzar,
  [string]$Cancion = ''
)
$ErrorActionPreference = 'Continue'
$raiz = 'C:\Users\lai\Documents\workspace\Gramola.link'
$py = 'C:\Users\lai\Documents\workspace\.venvs\gramola-voz\Scripts\python.exe'
$herramienta = Join-Path $raiz 'tools\quitar-voz.py'
$canciones = Join-Path $raiz 'web\songs'

if (-not (Test-Path $py)) {
  Write-Host ("falta el entorno de python con demucs: " + $py)
  Write-Host 'ver docs\QUITAR-VOCES.md'
  exit 1
}

$llamada = @($herramienta, '--carpeta', $canciones)
if ($Listar) { $llamada += '--listar' }
if ($Forzar) { $llamada += '--forzar' }
if ($Cancion) { $llamada += @('--cancion', $Cancion) }

& $py @llamada
$codigo = $LASTEXITCODE

$sv = @(Get-ChildItem (Join-Path $canciones '*\sin-voz.mp3') -ErrorAction SilentlyContinue).Count
$total = @(Get-ChildItem $canciones -Directory -ErrorAction SilentlyContinue).Count
Write-Host ("pistas sin voz: " + $sv + " de " + $total + " canciones")
exit $codigo
