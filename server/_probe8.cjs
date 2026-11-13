// Control vs flag: does the mic actually open on a plain LAN IP?
const { spawn } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const PORT = Number(process.argv[2] || 9350);
const URL_ = 'http://192.168.50.165:8877/m/';
const CHROME = process.env.CHROME;
const EXTRA = (process.env.EXTRA || '').split(';').filter(Boolean);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--use-fake-device-for-media-stream',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(os.tmpdir(), 'mf' + PORT)}`, ...EXTRA, 'about:blank'],
    { detached: true, stdio: 'ignore' });
  chrome.unref();
  let t = null;
  for (let i = 0; i < 60; i++) { const l = await fetch(`http://127.0.0.1:${PORT}/json`).then(r => r.json()).catch(() => null);
    t = (l || []).find(x => x.type === 'page' && x.webSocketDebuggerUrl); if (t) break; await sleep(300); }
  if (!t) { console.log('NO_TARGET'); process.exit(2); }
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const errs = [];
  ws.onmessage = ev => { const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') errs.push('EXC ' + JSON.stringify(m.params.exceptionDetails).slice(0, 200));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('console ' + JSON.stringify(m.params.args).slice(0, 200)); };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const evl = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true });
    return r.result && r.result.result ? r.result.result.value : 'ERR ' + JSON.stringify(r.result).slice(0, 200); };
  await send('Page.enable'); await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: URL_ });
  await sleep(6000);
  console.log('secureContext :', await evl('window.isSecureContext'));
  console.log('installScreen :', await evl(`(()=>{const s=document.querySelector('.screen.on');return s?s.id:'(none)'})()`));
  console.log('visibleText   :', await evl(`(document.querySelector('.screen.on')||document.body).innerText.replace(/\\s+/g,' ').trim().slice(0,150)`));
  console.log('mediaDevices  :', await evl('!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)'));
  console.log('getUserMedia  :', await evl(`navigator.mediaDevices.getUserMedia({audio:true}).then(s=>'OPEN tracks='+s.getAudioTracks().length).catch(e=>'ERR '+e.name)`));
  console.log('micPermission   :', await evl(`navigator.permissions.query({name:'microphone'}).then(p=>p.state).catch(e=>'n/a')`));
  console.log('serviceWorker :', await evl(`!!(navigator.serviceWorker&&navigator.serviceWorker.controller)||'none'`));
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const f = path.join(os.tmpdir(), `mic-${PORT}.png`); fs.writeFileSync(f, Buffer.from(r.result.data, 'base64'));
  console.log('shot          :', f, fs.statSync(f).size + 'B');
  console.log('errors        :', JSON.stringify([...new Set(errs)].slice(0, 5)));
  ws.close(); spawn('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }); process.exit(0);
})();
