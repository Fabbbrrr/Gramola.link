/* _probe_rewind2.cjs — reproduce el «Fallo» tras rebobinar, paso a paso.
   Mueve el reloj del juego a mano (no hace falta audio ni móvil), canta 40 s y rebobina. */
const CDP = 'http://127.0.0.1:9222', BASE = 'http://127.0.0.1:8877';
const espere = ms => new Promise(r => setTimeout(r, ms));
const C = 'window.__g||(window.GR&&window.GR.g)';

(async () => {
  const t = await (await fetch(`${CDP}/json/new?${encodeURIComponent(BASE + '/app/')}`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });
  let id = 0; const p = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && p.has(m.id)) { p.get(m.id)(m); p.delete(m.id); } };
  const cmd = (method, params = {}) => new Promise(r => { const n = ++id; p.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
  const ev = async x => {
    const r = await cmd('Runtime.evaluate', { expression: x, returnByValue: true });
    const c = r.result || r;
    if (c.exceptionDetails) return 'EX ' + String((c.exceptionDetails.exception && c.exceptionDetails.exception.description) || c.exceptionDetails.text).slice(0, 160);
    return c.result ? c.result.value : 'SIN RESULT';
  };
  await espere(4500);

  // Canción montada a mano: dos cantantes y el gráfico del diseño (que canta solo, q='good').
  console.log('montaje:', await ev(`(function(){var c=${C};
    c.setState({screen:'sing',mode:'solo',singers:[{name:'A',part:0,tol:0.5},{name:'B',part:1,tol:0.5}]});
    c.startSing(); return c.chart.notes.length+' notas, '+c.chart.phrases.length+' frases';})()`));

  const estado = `(function(){var c=${C};
    return JSON.stringify({ahora:Math.round(c.now*10)/10,total:c.score.map(v=>Math.round(v)),
      racha:c.combo.slice(),mejor:c.best.slice(),frasesHechas:c.chart.phrases.filter(p=>p.done).length,
      textos:(c.pops||[]).slice(-4).map(p=>p.text)});})()`;

  // 40 s de canto, 0,05 s por paso
  console.log('cantando 40 s:', await ev(`(function(){var c=${C};for(var i=0;i<800;i++)c.update(0.05);return 'ok'})()`));
  console.log('  antes       :', await ev(estado));

  const puntoNuevo = await ev(`(function(){var c=${C};window.GR.rewind(10);return Math.round(c.now*10)/10})()`);
  console.log('rebobino 10 s → ahora:', puntoNuevo);
  console.log('  justo después:', await ev(estado));
  console.log('  frases rearmadas:', await ev(`(function(){var c=${C};return c.chart.phrases.filter(p=>!p.done&&p.end>c.now).length})()`));
  console.log('  notas sin marcar por delante:', await ev(`(function(){var c=${C};return c.chart.notes.filter(n=>n.sl&&n.start+n.dur>c.now&&n.sl[0].some(v=>v)).length})()`));

  // Los 20 s siguientes: el gráfico vuelve a cantar solo el trozo
  for (const bloque of [4, 4, 4, 8]) {
    await ev(`(function(){var c=${C};for(var i=0;i<${bloque / 0.05};i++)c.update(0.05);return 'ok'})()`);
    console.log(`  +${bloque}s:`, await ev(estado));
  }
  console.log('avisos «Fallo» en total:', await ev(`(function(){var c=${C};return (c.pops||[]).filter(p=>p.text==='Fallo').length})()`));
  process.exit(0);
})();
