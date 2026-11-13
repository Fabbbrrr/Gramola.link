const CDP='http://127.0.0.1:9222', BASE='http://127.0.0.1:8877';
const C='window.__g||(window.GR&&window.GR.g)';
const espere=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const t=await (await fetch(`${CDP}/json/new?${encodeURIComponent(BASE+'/app/')}`,{method:'PUT'})).json();
 const ws=new WebSocket(t.webSocketDebuggerUrl); await new Promise(r=>{ws.onopen=r;});
 let id=0;const p=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id);}};
 const cmd=(method,params={})=>new Promise(r=>{const n=++id;p.set(n,r);ws.send(JSON.stringify({id:n,method,params}));});
 const ev=async x=>{const r=await cmd('Runtime.evaluate',{expression:x,returnByValue:true});const c=r.result||r;if(c.exceptionDetails)return 'EX '+String((c.exceptionDetails.exception&&c.exceptionDetails.exception.description)||'').slice(0,160);return c.result?c.result.value:'SIN RESULT';};
 await espere(4500);
 await ev(`(function(){var c=${C};c.setState({screen:'sing',mode:'solo',singers:[{name:'A',part:0,tol:0.5,bot:true},{name:'B',part:1,tol:0.5,bot:true}]});c.startSing();window.__T=0;window.__c0=c.chart;window.GR.audio={currentTime:0,paused:false,duration:400,_g:null};window.GR.songEnded=false;})()`);
 const avanzar=seg=>`(function(){var c=${C};for(var i=0;i<${Math.round(seg/0.05)};i++){window.__T+=0.05;window.GR.audio.currentTime=window.__T;if(window.GR.clock)window.GR.clock.playing=false;window.GR.update(c,0.05)}return 'ok'})()`;
 const INFO=`(function(){var c=${C};var ch=c.chart;return JSON.stringify({mismoChart:ch===window.__c0,paused:c.state.paused,screen:c.state.screen,
   ahora:Math.round(c.now*10)/10,primerasNotas:ch.notes.slice(0,3).map(n=>[Math.round(n.start*10)/10,Math.round((n.start+n.dur)*10)/10,n.done]),
   cerradas:ch.notes.filter(n=>n.done).length,total:c.score.map(v=>Math.round(v)),
   ultimaFin:Math.round(Math.max(...ch.notes.map(n=>n.start+n.dur))*10)/10});})()`;
 console.log('montaje y 42 s:', await ev(avanzar(42)));
 console.log('  a 42 s:', await ev(INFO));
 console.log('rebobino 30:', await ev(`(function(){var c=${C};window.GR.rewind(30);window.__T=window.GR.audio.currentTime;return 'ok'})()`));
 console.log('  tras 30:', await ev(INFO));
 console.log('  +6 s:', await ev(avanzar(6)), await ev(INFO));
 console.log('  +20 s:', await ev(avanzar(20)), await ev(INFO));
 process.exit(0);})();
