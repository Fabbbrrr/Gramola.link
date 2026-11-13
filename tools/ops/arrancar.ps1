# Arranca el servidor de Gramola si no esta escuchando ya, desprendido de esta consola (WMI),
# con HOST=0.0.0.0 para que lo alcancen la tele y los moviles de la red de casa.
# Uso: powershell -File tools\ops\arrancar.ps1
$ErrorActionPreference = 'Continue'
$raiz = 'C:\Users\lai\Documents\workspace\Gramola.link'
$lanzador = 'C:\Users\lai\Documents\workspace\_gramola_arrancar.bat'

$conn = Get-NetTCPConnection -LocalPort 8877 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
  Write-Host ("gramola: ya esta escuchando (PID " + ($conn | Select-Object -First 1).OwningProcess + ")")
  exit 0
}

# El .bat hace cd al servidor, pone HOST=0.0.0.0 y lanza node. Si no existe, se rehace aqui.
if (-not (Test-Path $lanzador)) {
  $lineas = @(
    '@echo off',
    ('cd /d ' + (Join-Path $raiz 'server')),
    'set HOST=0.0.0.0',
    '"C:\Program Files\nodejs\node.exe" server.js >> gramola.log 2>&1'
  )
  Set-Content -Path $lanzador -Value $lineas -Encoding ASCII
}

$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
  CommandLine = $lanzador
  CurrentDirectory = (Join-Path $raiz 'server')
}
if ($r.ReturnValue -ne 0) {
  Write-Host ("gramola: no se pudo lanzar (codigo " + $r.ReturnValue + ")")
  exit 1
}

for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $h = Invoke-RestMethod -Uri 'http://127.0.0.1:8877/api/health' -TimeoutSec 2
    Write-Host ("gramola: ARRANCADO | canciones=" + $h.songs)
    exit 0
  } catch { }
}
Write-Host 'gramola: lanzado pero no responde; mirar web\..\server\gramola.log'
exit 1
