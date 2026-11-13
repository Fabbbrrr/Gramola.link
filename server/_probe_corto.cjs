const CDP='http://127.0.0.1:9222';
(async()=>{
 const t=await (await fetch(`${CDP}/json/new?${encodeURIComponent('http://127.0.0.1:8877/app/')}`,{method:'PUT'})).json();
 const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>{ws.onopen=r;});
 let id=0; const p=new Map(); ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id);}};
 const cmd=(method,params={})=>new Promise(r=>{const n=++id;p.set(n,r);ws.send(JSON.stringify({id:n,method,params}));});
 const ev=async x=>{const r=await cmd('Runtime.evaluate',{expression:x,returnByValue:true});const c=r.result||r;return c.result?c.result.value:('ERR '+JSON.stringify(c).slice(0,100));};
 await new Promise(r=>setTimeout(r,4000));
 console.log('__g:', await ev('typeof window.__g'));
 console.log('GR.g:', await ev('typeof (window.GR&&window.GR.g)'));
 console.log('el objeto tiene:', await ev('Object.keys(window.__g||window.GR.g||{}).slice(0,14).join(",")'));
 console.log('state tiene:', await ev('Object.keys((window.__g||window.GR.g||{}).state||{}).slice(0,14).join(",")'));
 console.log('screen:', await ev('((window.__g||window.GR.g||{}).state||{}).screen'));
 console.log('pantallas del diseño:', await ev('document.querySelectorAll("[data-screen-label]").length'));
 console.log('visible ahora:', await ev('[...document.querySelectorAll("[data-screen-label]")].filter(e=>e.offsetParent).map(e=>e.dataset.screenLabel).join(",")'));
 process.exit(0);})();
