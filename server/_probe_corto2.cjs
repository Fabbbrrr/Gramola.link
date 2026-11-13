const CDP='http://127.0.0.1:9222';
const C='window.__g||(window.GR&&window.GR.g)';
(async()=>{
 const t=await (await fetch(`${CDP}/json/new?${encodeURIComponent('http://127.0.0.1:8877/app/')}`,{method:'PUT'})).json();
 const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>{ws.onopen=r;});
 let id=0;const p=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id);}};
 const cmd=(method,params={})=>new Promise(r=>{const n=++id;p.set(n,r);ws.send(JSON.stringify({id:n,method,params}));});
 const ev=async x=>{const r=await cmd('Runtime.evaluate',{expression:x,returnByValue:true});const c=r.result||r;if(c.exceptionDetails)return 'EX '+String((c.exceptionDetails.exception&&c.exceptionDetails.exception.description)||'').slice(0,120);return c.result?c.result.value:'SIN RESULT';};
 await new Promise(r=>setTimeout(r,4500));
 console.log('paused:', await ev(`(${C}).state.paused`));
 console.log('update es:', await ev(`typeof (${C}).update`));
 console.log('now es:', await ev(`typeof (${C}).now + ' = ' + (${C}).now`));
 console.log('montar:', await ev(`(function(){var c=${C};c.setState({screen:'sing',mode:'solo',singers:[{name:'A',part:0,tol:0.5}]});c.startSing();return 'now='+c.now+' notas='+c.chart.notes.length})()`));
 console.log('un update:', await ev(`(function(){var c=${C};c.update(0.05);return 'now='+c.now})()`));
 console.log('cien updates:', await ev(`(function(){var c=${C};for(var i=0;i<100;i++)c.update(0.05);return 'now='+c.now+' total='+c.score[0]})()`));
 console.log('paused tras montar:', await ev(`(${C}).state.paused`), '| screen:', await ev(`(${C}).state.screen`));
 process.exit(0);})();
