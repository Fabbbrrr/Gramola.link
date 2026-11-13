// CDP probe: load the TV app, collect console/exceptions/404s, sample the canvas, screenshot.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = Number(process.argv[2] || 9333);
const TARGET = process.argv[3] || 'http://127.0.0.1:8877/app/';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = path.join(os.tmpdir(), 'gram-probe-' + PORT);

const sleep = ms => new Promise(r => setTimeout(r, ms));

function findTarget() {
  return fetch(`http://127.0.0.1:${PORT}/json`).then(r => r.json())
    .then(list => (list || []).find(t => t.type === 'page' && t.webSocketDebuggerUrl));
}

(async () => {
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, 'about:blank',
  ], { detached: true, stdio: 'ignore' });
  chrome.unref();

  let target = null;
  for (let i = 0; i < 60; i++) { target = await findTarget().catch(() => null); if (target) break; await sleep(300); }
  if (!target) { console.log('NO_TARGET'); process.exit(2); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = e => rej(e); });

  let id = 0;
  const pending = new Map();
  const events = { console: [], exceptions: [], log: [], failed: [] };
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
      events.console.push((m.params.args || []).map(a => a.value ?? a.description ?? a.type).join(' '));
    if (m.method === 'Runtime.exceptionThrown')
      events.exceptions.push(JSON.stringify(m.params.exceptionDetails).slice(0, 400));
    if (m.method === 'Log.entryAdded') events.log.push(m.params.entry.level + ' ' + (m.params.entry.text || '').slice(0, 200));
    if (m.method === 'Network.loadingFailed' && m.params && m.params.request)
      events.failed.push('FAILED ' + m.params.request.url + ' ' + m.params.errorText);
    if (m.method === 'Network.responseReceived' && m.params && m.params.response && m.params.response.status >= 400)
      events.failed.push(m.params.response.status + ' ' + m.params.response.url);
  };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const evl = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result && r.result.result ? r.result.result.value : (r.result && r.result.exceptionDetails ? 'EXC ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300) : null);
  };

  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
  await send('Page.navigate', { url: TARGET });
  await sleep(Number(process.env.WAIT || 7000));

  const info = await evl(`(() => {
    const cs=[...document.querySelectorAll('canvas')].map(c=>({w:c.width,h:c.height}));
    let sig=null;
    const c=document.querySelector('canvas');
    if(c){try{const g=c.getContext('2d');const d=g.getImageData(0,0,c.width,c.height).data;const set=new Set();
      for(let i=0;i<d.length;i+=4*997)set.add([d[i]>>5,d[i+1]>>5,d[i+2]>>5].join(','));
      sig={distinct:set.size,sample:[...set].slice(0,6)};}catch(e){sig='ERR '+e.message}}
    return {title:document.title,url:location.href,canvases:cs,sig,
      bodyText:(document.body.innerText||'').replace(/\\s+/g,' ').trim().slice(0,200),
      dc:!!document.querySelector('x-dc'), dcKids:document.querySelector('x-dc')?document.querySelector('x-dc').children.length:0,
      scripts:[...document.querySelectorAll('script')].length, supportRan: typeof window.__ds_support!=='undefined'};
  })()`);
  console.log('PAGE ' + JSON.stringify(info, null, 1));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const file = path.join(os.tmpdir(), `gram-shot-${PORT}.png`);
  fs.writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
  console.log('SHOT ' + file + ' ' + fs.statSync(file).size + 'B');

  console.log('CONSOLE_ERRORS ' + JSON.stringify(events.console.slice(0, 12)));
  console.log('EXCEPTIONS ' + JSON.stringify(events.exceptions.slice(0, 8)));
  console.log('NET_BAD ' + JSON.stringify([...new Set(events.failed)].slice(0, 15)));
  console.log('LOG_ERRORS ' + JSON.stringify(events.log.filter(l => l.startsWith('error')).slice(0, 12)));

  ws.close();
  spawn('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' });
  process.exit(0);
})();
