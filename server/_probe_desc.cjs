const CDP='http://127.0.0.1:9222';
const C='window.__g||(window.GR&&window.GR.g)';
(async()=>{
 const t=await (await fetch(`${CDP}/json/new?${encodeURIComponent('http://127.0.0.1:8877/app/')}`,{method:'PUT'})).json();
 const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>{ws.onopen=r;});
 let id=0;const p=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id);}};
 const cmd=(method,params={})=>new Promise(r=>{const n=++id;p.set(n,r);ws.send(JSON.stringify({id:n,method,params}));});
 const ev=async x=>{const r=await cmd('Runtime.evaluate',{expression:x,returnByValue:true});const c=r.result||r;if(c.exceptionDetails)return 'EX '+String((c.exceptionDetails.exception&&c.exceptionDetails.exception.description)||'').slice(0,140);return c.result?c.result.value:'SIN RESULT';};
 await new Promise(r=>setTimeout(r,4500));
 await ev(`(function(){var c=${C};c.setState({screen:'sing',mode:'solo',singers:[{name:'A',part:0,tol:0.5}]});c.startSing()})()`);
 console.log('propias con now:', await ev(`Object.keys(${C}).filter(k=>/now/i.test(k)).join(',')||'(ninguna)'`));
 console.log('descriptor en la instancia:', await ev(`JSON.stringify(Object.getOwnPropertyDescriptor(${C},'now')||null)`));
 console.log('descriptor en el prototipo:', await ev(`(function(){var o=Object.getPrototypeOf(${C});var d=Object.getOwnPropertyDescriptor(o,'now');return d?JSON.stringify({get:!!d.get,set:!!d.set,writable:d.writable}):'no está en el prototipo directo'})()`));
 console.log('¿asignable?', await ev(`(function(){var c=${C};c.now=99;return 'leo: '+c.now})()`));
 console.log('campos _now/clock:', await ev(`JSON.stringify({_now:${C}._now,clock:${C}.clock,tiempo:${C}.tiempo,reloj:${C}.reloj})`));
 console.log('update en el prototipo:', await ev(`typeof Object.getPrototypeOf(${C}).update`));
 process.exit(0);})();
