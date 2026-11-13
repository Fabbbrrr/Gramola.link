// Prove real audio capture over plain HTTP with the origin treated as secure.
const { spawn } = require('child_process');
const os = require('os'); const path = require('path'); const fs = require('fs');
const PORT = Number(process.argv[2] || 9360);
const ORIGIN = 'http://192.168.50.165:8877';
const CHROME = process.env.CHROME;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mk = url => { const ws = new WebSocket(url); const p = new Promise(r => ws.onopen = r); return { ws, ready: p }; };
const mkCall = (ws, id) => (method, params = {}) => new Promise(res => { const cb = m => { if (m.id === id.cur) { ws.removeEventListener('message', cb); res(m); } }; ws.addEventListener('message', cb); id.cur++; ws.send(JSON.stringify({ id: id.cur, method, params })); });
(async () => {
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--use-fake-device-for-media-stream',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(os.tmpdir(), 'mg' + PORT)}`,
    `--unsafely-treat-insecure-origin-as-secure=${ORIGIN}`, 'about:blank'], { detached: true, stdio: 'ignore' });
  chrome.unref();
  let v = null;
  for (let i = 0; i < 60; i++) { v = await fetch(`http://127.0.0.1:${PORT}/json/version`).then(r => r.json()).catch(() => null); if (v && v.webSocketDebuggerUrl) break; await sleep(300); }
  if (!v) { console.log('NO_BROWSER'); process.exit(2); }
  const b = mk(v.webSocketDebuggerUrl); await b.ready;
  const bid = { cur: 1 }; const bcall = mkCall(b.ws, bid);
  await bcall('Browser.grantPermissions', { origin: ORIGIN, permissions: ['audioCapture'] });
  let t = null;
  for (let i = 0; i < 40; i++) { const l = await fetch(`http://127.0.0.1:${PORT}/json`).then(r => r.json()).catch(() => null);
    t = (l || []).find(x => x.type === 'page' && x.webSocketDebuggerUrl); if (t) break; await sleep(300); }
  const p = mk(t.webSocketDebuggerUrl); await p.ready;
  const pid = { cur: 1 }; const pcall = mkCall(p.ws, pid);
  const evl = async e => { const r = await pcall('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
    return r.result && r.result.result ? r.result.result.value : 'ERR'; };
  await pcall('Page.enable'); await pcall('Runtime.enable');
  await pcall('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await pcall('Page.navigate', { url: ORIGIN + '/m/' });
  await sleep(6000);
  console.log('secureContext :', await evl('window.isSecureContext'));
  console.log('screen        :', await evl(`(()=>{const s=document.querySelector('.screen.on');return s?s.id:'(none)'})()`));
  console.log('micPermission :', await evl(`navigator.permissions.query({name:'microphone'}).then(p=>p.state).catch(e=>'n/a')`));
  console.log('getUserMedia  :', await evl(`navigator.mediaDevices.getUserMedia({audio:true}).then(s=>'OPEN tracks='+s.getAudioTracks().length+' label='+s.getAudioTracks()[0].label).catch(e=>'ERR '+e.name)`));
  console.log('text          :', await evl(`(document.querySelector('.screen.on')||document.body).innerText.replace(/\\s+/g,' ').trim().slice(0,140)`));
  p.ws.close(); b.ws.close();
  spawn('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }); process.exit(0);
})();
