const CDP='http://127.0.0.1:9222';
const C='window.__g||(window.GR&&window.GR.g)';
(async()=>{
 const t=await (await fetch(`${CDP}/json/new?${encodeURIComponent('http://127.0.0.1:8877/app/')}`,{method:'PUT'})).json();
 const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>{ws.onopen=r;});
 let id=0;const p=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id);}};
 const cmd=(method,params={})=>new Promise(r=>{const n=++id;p.set(n,r);ws.send(JSON.stringify({id:n,method,params}));});
 const ev=async x=>{const r=await cmd('Runtime.evaluate',{expression:x,returnByValue:true});const c=r.result||r;if(c.exceptionDetails)return 'EX '+String((c.exceptionDetails.exception&&c.exceptionDetails.exception.description)||'').slice(0,200);return c.result?c.result.value:'SIN RESULT';};
 await new Promise(r=>setTimeout(r,4500));
 console.log('código de update:', await ev(`Object.getPrototypeOf(${C}).update.toString().slice(0,120)`));
 console.log('montar:', await ev(`(function(){var c=${C};c.setState({screen:'sing',mode:'solo',singers:[{name:'A',part:0,tol:0.5}]});c.startSing();return 'chart='+(!!c.chart)+' now='+c.now})()`));
 console.log('estado al llamar:', await ev(`JSON.stringify({paused:${C}.state.paused, screen:${C}.state.screen, chart:!!${C}.chart, singers:(${C}.state.singers||[]).length})`));
 console.log('una llamada, leo dentro:', await ev(`(function(){var c=${C};var antes=c.now;c.update(0.05);return 'antes='+antes+' despues='+c.now})()`));
 console.log('llamo a la del prototipo con call:', await ev(`(function(){var c=${C};var f=Object.getPrototypeOf(c).update;f.call(c,0.05);return 'now='+c.now})()`));
 process.exit(0);})();
