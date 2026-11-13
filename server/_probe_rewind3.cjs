/* _probe_rewind3.cjs — mide el rebobinado con el código real (GR.update), sin micro ni audio de verdad.
   Reloj: se le pone al puente un audio falso con currentTime, que es de donde lee el reloj de verdad. */
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
    if (c.exceptionDetails) return 'EX ' + String((c.exceptionDetails.exception && c.exceptionDetails.exception.description) || c.exceptionDetails.text).slice(0, 200);
    return c.result ? c.result.value : 'SIN RESULT';
  };
  await espere(4500);

  // Audio falso: el puente lee currentTime para el reloj. paused=false para que no toque menús de música.
  console.log('montaje:', await ev(`(function(){var c=${C};
    c.setState({screen:'sing',mode:'solo',singers:[{name:'A',part:0,tol:0.5,bot:true},{name:'B',part:1,tol:0.5,bot:true}]});
    c.startSing();
    window.__T=0; window.__err=null;
    window.GR.audio={currentTime:0,paused:false,duration:400,_g:null};
    window.GR.songEnded=false;
    return 'notas='+c.chart.notes.length+' frases='+c.chart.phrases.length+' paused='+c.state.paused})()`));

  // Avanza el reloj y llama al update de verdad, paso a paso
  const avanzar = seg => `(function(){var c=${C};for(var i=0;i<${Math.round(seg / 0.05)};i++){
      window.__T+=0.05; window.GR.audio.currentTime=window.__T; if(window.GR.clock)window.GR.clock.playing=false;
      try{window.GR.update(c,0.05)}catch(e){window.__err=String(e).slice(0,120);break}}
    return window.__err||'ok'})()`;

  const LECTURA = `(function(){var c=${C};
    return JSON.stringify({ahora:Math.round(c.now*10)/10,audio:Math.round((window.GR.audio.currentTime)*10)/10,
      total:c.score.map(v=>Math.round(v)),racha:c.combo.slice(),mejor:c.best.slice(),doradas:c.goldHit.slice(),
      frasesCerradas:c.chart.phrases.filter(p=>p.done).length,notasCerradas:c.chart.notes.filter(n=>n.done).length,
      fallos:(c.pops||[]).filter(p=>p.text==='Fallo').length,ultimos:(c.pops||[]).slice(-3).map(p=>p.text)});})()`;

  console.log('cantando 40 s…', await ev(avanzar(40)));
  console.log('  antes        :', await ev(LECTURA));

  console.log('rebobino 10 s :', await ev(`(function(){var c=${C};var a=c.now;window.GR.rewind(10);window.__T=window.GR.audio.currentTime;return 'reloj '+a.toFixed(1)+' → '+c.now.toFixed(1)+', audio '+window.GR.audio.currentTime.toFixed(1)})()`));
  console.log('  justo después:', await ev(LECTURA));

  console.log('sigo 4 s…', await ev(avanzar(4)));
  console.log('  +4 s         :', await ev(LECTURA));
  console.log('sigo 8 s…', await ev(avanzar(8)));
  console.log('  +12 s        :', await ev(LECTURA));
  console.log('rebobino 30 s:', await ev(`(function(){var c=${C};var a=c.now;window.GR.rewind(30);window.__T=window.GR.audio.currentTime;return 'reloj '+a.toFixed(1)+' → '+c.now.toFixed(1)})()`));
  console.log('  después de 30:', await ev(LECTURA));
  console.log('sigo 6 s desde 22…', await ev(avanzar(6)));
  console.log('  +6 s         :', await ev(LECTURA));
  console.log('rebobino al principio (60 s, debe quedarse en 0):', await ev(`(function(){var c=${C};window.GR.rewind(60);window.__T=window.GR.audio.currentTime;return 'ahora='+c.now.toFixed(1)+' audio='+window.GR.audio.currentTime.toFixed(1)+' total='+c.score.map(v=>Math.round(v)).join('/')})()`));
  console.log('errores:', await ev(`window.__err||'ninguno'`));
  console.log('stats:', await ev(`JSON.stringify(window.GR.stats)`));
  process.exit(0);
})();
