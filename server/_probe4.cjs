// Deterministic walk: notice -> welcome -> lobby (room code + QR), one real key press per step.
const { spawn } = require('child_process');
const fs = require('fs'); const os = require('os'); const path = require('path');
const PORT = Number(process.argv[2] || 9341);
const TARGET = 'http://192.168.50.165:8877/app/';
const CHROME = process.env.CHROME;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(os.tmpdir(), 'gp' + PORT)}`, 'about:blank'],
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
    if (m.method === 'Runtime.exceptionThrown') errs.push('EXC ' + JSON.stringify(m.params).slice(0, 160));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('console ' + JSON.stringify(m.params.args).slice(0, 160)); };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const evl = async e => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true }); return r.result && r.result.result && r.result.result.value; };
  const press = async () => { await send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 13, code: 'Enter', key: 'Enter', text: '\r' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13, code: 'Enter', key: 'Enter' }); };
  const shot = async n => { const r = await send('Page.captureScreenshot', { format: 'png' });
    const f = path.join(os.tmpdir(), `w-${PORT}-${n}.png`); fs.writeFileSync(f, Buffer.from(r.result.data, 'base64')); return f; };
  const state = () => evl(`(document.body.innerText||'').replace(/\\s+/g,' ').trim().slice(0,200)`);
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: TARGET });
  await sleep(4000); console.log('s0', await state()); await shot('s0');
  await sleep(12000); console.log('s1', await state());
  await press(); await sleep(3500); console.log('s2', await state());
  await press(); await sleep(3500); console.log('s3', await state()); await shot('s3');
  await press(); await sleep(4000); console.log('s4', await state()); await shot('s4');
  console.log('canvases', await evl(`[...document.querySelectorAll('canvas')].map(c=>c.width+'x'+c.height).join(' ')`));
  console.log('roomCode', await evl(`(document.body.innerText.match(/\\b[A-Z]{4}\\b/g)||[]).join(',')`));
  console.log('ERRORS', JSON.stringify([...new Set(errs)].slice(0, 6)));
  ws.close(); spawn('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }); process.exit(0);
})();
