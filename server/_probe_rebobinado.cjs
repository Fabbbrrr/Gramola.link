/* _probe_rebobinado.cjs — mide el rebobinado en el navegador real (no de palabra).
   Entra en una canción, la deja cantar, rebobina 10 s y compara los números.
   Uso: node _probe_rebobinado.cjs   (Edge headless en 9222, Gramola en 8877) */
const CDP = 'http://127.0.0.1:9222', BASE = 'http://127.0.0.1:8877';
const espere = ms => new Promise(r => setTimeout(r, ms));
const C = 'window.__g||(window.GR&&window.GR.g)';

async function main() {
  const t = await (await fetch(`${CDP}/json/new?${encodeURIComponent(BASE + '/app/')}`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pendientes = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pendientes.has(m.id)) { pendientes.get(m.id)(m); pendientes.delete(m.id); } };
  const cmd = (method, params = {}) => new Promise(res => { const n = ++id; pendientes.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });
  const ev = async x => {
    const r = await cmd('Runtime.evaluate', { expression: x, returnByValue: true });
    const c = r.result || r;
    if (c.exceptionDetails) return 'EX ' + String((c.exceptionDetails.exception && c.exceptionDetails.exception.description) || c.exceptionDetails.text).slice(0, 100);
    return c.result ? c.result.value : 'SIN RESULT';
  };
  const LECTURA = `(function(){var c=${C};if(!c||!c.chart)return 'sin gráfico';var s=c.state.singers;
    return JSON.stringify({ahora:Math.round(c.now*10)/10,total:s.map((_,k)=>Math.round(c.score[k])),racha:s.map((_,k)=>c.combo[k]),
      mejor:s.map((_,k)=>c.best[k]),doradas:s.map((_,k)=>c.goldHit[k]),hechas:c.chart.notes.filter(n=>n.done).length,notas:c.chart.notes.length,pants:c.chart.phrases.filter(p=>p.done).length});})()`;

  await espere(4500);
  // El splash no atiende teclas a propósito: se entra por donde entra el diseño.
  await ev(`(${C}).go('welcome')`); await espere(500);
  await ev(`(${C}).act('ok')`); await espere(500);                     // bienvenida → sala
  await ev(`(${C}).act('y')`); await espere(500);                      // sala: simular un cantante
  console.log('cantantes en la sala:', await ev(`(${C}).state.singers.length`));
  await ev(`(${C}).act('ok')`); await espere(500);                     // → menú
  await ev(`(${C}).act('ok')`); await espere(1200);                    // menú: Cantar → canciones
  console.log('pantalla:', await ev(`(${C}).state.screen`), '| canciones:', await ev(`(${C}).props.songs ? 1 : 0`), '| lista:', await ev(`(${C}).songsList().length`));
  await ev(`(${C}).act('ok')`); await espere(800);                     // canción 0 → preparar
  console.log('pantalla:', await await ev(`(${C}).state.screen`));
  await ev(`(${C}).setState({setupF:(${C}).state.setup.length})`); await espere(300);
  await ev(`(${C}).act('ok')`);                                        // Empezar → cuenta atrás
  console.log('pantalla:', await ev(`(${C}).state.screen`));
  await espere(9000);                                                   // que corra la cuenta atrás y cante
  console.log('pantalla:', await ev(`(${C}).state.screen`));
  console.log('esperando 8 s de canto…'); await espere(8000);
  console.log('antes        :', await ev(LECTURA));
  console.log('rebobino 10 s:', await ev(`(${C})&&(window.GR.rewind(10),'hecho')`));
  console.log('justo después:', await ev(LECTURA));
  console.log('esperando 10 s más (el trozo se vuelve a cantar)…'); await espere(10000);
  console.log('después      :', await ev(LECTURA));
  console.log('audio (s):', await ev(`[...document.querySelectorAll('audio')].map(a=>Math.round(a.currentTime*10)/10).join(",")`));
  console.log('buscadas del puente:', await ev(`window.GR&&window.GR.stats&&JSON.stringify(window.GR.stats)`));
  console.log('tira de controles:', await ev(`(function(){var d=[...document.body.children].filter(e=>e.style&&e.style.position==='fixed'&&e.querySelectorAll('button').length===3);return d.length?d[0].style.display:'no montada'})()`));
  process.exit(0);
}
main().catch(e => { console.log('ERROR', String(e).slice(0, 140)); process.exit(1); });
