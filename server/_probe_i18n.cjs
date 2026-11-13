/* _probe_i18n.cjs — comprueba el cambio de idioma en cada pantalla, midiendo.
   Uso: node _probe_i18n.cjs   (con Edge headless en 9222 y Gramola en 8877) */
const fs = require('fs'), path = require('path');
const CDP = 'http://127.0.0.1:9222', BASE = 'http://127.0.0.1:8877';
const RAIZ = path.join(__dirname, '..');
const PAGINAS = { tv: '/app/', m: '/m/', site: '/', admin: '/admin/' };

const espere = ms => new Promise(r => setTimeout(r, ms));

async function nuevoTarget(url) {
  const r = await fetch(`${CDP}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  return r.json();
}

async function conectar(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pendientes = new Map();
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pendientes.has(m.id)) { pendientes.get(m.id)(m); pendientes.delete(m.id); }
  };
  const cmd = (metodo, params = {}) => new Promise(res => {
    const n = ++id; pendientes.set(n, res);
    ws.send(JSON.stringify({ id: n, method: metodo, params }));
  });
  return { ws, cmd };
}

async function evaluar(cmd, expr) {
  const r = await cmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  const cuerpo = r.result || r;                                   // la respuesta de Runtime.evaluate va anidada
  if (cuerpo.exceptionDetails) return { error: 'EX ' + String((cuerpo.exceptionDetails.exception && cuerpo.exceptionDetails.exception.description) || cuerpo.exceptionDetails.text || '').slice(0, 140) };
  return { value: cuerpo.result ? cuerpo.result.value : undefined };
}

async function probar(clave, ruta) {
  const inventario = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tools', 'i18n', `inventario-${clave}.json`), 'utf-8'));
  const claves = Object.keys(inventario);
  const t = await nuevoTarget(BASE + ruta);
  await espere(3500);                                    // que monte la app
  const { ws, cmd } = await conectar(t.webSocketDebuggerUrl);

  // Baseline limpio: el idioma se guarda en el aparato, así que hay que arrancar en castellano para poder comparar.
  await evaluar(cmd, `try{localStorage.removeItem('gramola-lang')}catch(e){}; window.I18N && window.I18N.cambiar('es')`);
  await espere(700);
  const donde = await evaluar(cmd, 'location.href');
  const antes = await evaluar(cmd, 'document.body.innerText');
  const hayControl = await evaluar(cmd, '!!document.querySelector("[data-i18n-control]") || !!window.I18N');
  const cambiado = await evaluar(cmd, `window.I18N && window.I18N.cambiar('en'), !!window.I18N`);
  await espere(900);
  const despues = await evaluar(cmd, 'document.body.innerText');
  const canvas = await evaluar(cmd, `window.I18N ? Object.keys(${JSON.stringify(inventario)}).filter(k=>window.I18N.t(k)!==k)[0] : null`);
  for (const [nombre, r] of Object.entries({ antes, hayControl, cambiado, despues, canvas })) if (r.error) console.log(`       ${nombre}: ${r.error}`);

  const en = texto => (texto || '').replace(/\s+/g, ' ');
  const A = en(antes.value), B = en(despues.value);
  const presentesAntes = claves.filter(k => !k.includes('${') && A.includes(k));
  const siguenDespues = presentesAntes.filter(k => B.includes(k) && inventario[k] !== k);
  const traducciones = presentesAntes.filter(k => B.includes(inventario[k]));

  console.log(`${clave.padEnd(6)} ${String(donde.value).padEnd(30)} control:${hayControl.value ? 'sí' : 'NO'}  cambió:${cambiado.value ? 'sí' : 'NO'}` +
    `  | texto en pantalla con clave: ${presentesAntes.length}, traducidas: ${traducciones.length}, sin traducir: ${siguenDespues.length}` +
    `  | canvas/t(): ${canvas.value ? 'sí' : 'n/d'}`);
  if (siguenDespues.length) console.log('       sin traducir:', siguenDespues.slice(0, 4).map(s => s.slice(0, 46)));
  if (presentesAntes.length && traducciones.length < presentesAntes.length && !siguenDespues.length) console.log('       (el resto eran huecos con ${})');
  ws.close();
}

(async () => {
  for (const [clave, ruta] of Object.entries(PAGINAS)) {
    try { await probar(clave, ruta); } catch (e) { console.log(clave, 'ERROR', String(e).slice(0, 90)); }
  }
  process.exit(0);
})();
