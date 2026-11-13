const CDP='http://127.0.0.1:9222';
const C='window.__g||(window.GR&&window.GR.g)';
(async()=>{
 const t=await (await fetch(`${CDP}/json/new?${encodeURIComponent('http://127.0.0.1:8877/app/')}`,{method:'PUT'})).json();
 const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>{ws.onopen=r;});
 let id=0;const p=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id);}};
 const cmd=(method,params={})=>new Promise(r=>{const n=++id;p.set(n,r);ws.send(JSON.stringify({id:n,method,params}));});
 const ev=async x=>{const r=await cmd('Runtime.evaluate',{expression:x,returnByValue:true});const c=r.result||r;if(c.exceptionDetails)return 'EX '+String((c.exceptionDetails.exception&&c.exceptionDetails.exception.description)||'').slice(0,140);return c.result?c.result.value:'SIN RESULT';};
 await new Promise(r=>setTimeout(r,4500));
 console.log('claves del host:', await ev(`Object.keys((${C}).__host||{}).slice(0,10).join(',')`));
 console.log('host.update es:', await ev(`typeof ((${C}).__host||{}).update`));
 console.log('host.now:', await ev(`String((${C}).__host||{}).now)`));
 console.log('montar en host:', await ev(`(function(){var h=(${C}).__host;h.setState({screen:'sing',mode:'solo',singers:[{name:'A',part:0,tol:0.5}]});h.startSing();return 'now='+h.now+' notas='+(h.chart&&h.chart.notes.length)})()`));
 console.log('100 updates en host:', await ev(`(function(){var h=(${C}).__host;for(var i=0;i<100;i++)h.update(0.05);return 'now='+h.now+' total='+h.score[0]+' frases='+h.chart.phrases.filter(p=>p.done).length})()`));
 console.log('400 más:', await ev(`(function(){var h=(${C}).__host;for(var i=0;i<400;i++)h.update(0.05);return 'now='+h.now+' total='+h.score[0]+' racha='+h.combo[0]})()`));
 process.exit(0);})();
