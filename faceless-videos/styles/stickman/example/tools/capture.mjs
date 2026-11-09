// Frame-exact capture through headless Chrome (no npm deps; Node 22+). 24 fps; AR=9x16 in front of any command = the vertical cut.
//   node tools/capture.mjs sheet  review/x.jpg "8.7,9.2,10.1" [cols=4] [scale=0.25]   contact sheet
//   node tools/capture.mjs scenes review/x.jpg "V01,V02" [perScene=4] [scale=0.25]      sheet of N frames per scene
//   node tools/capture.mjs frames review/dir "8.7,9.2"                                   full-res JPEGs
//   node tools/capture.mjs eval   'OP.duration()'                                       evaluate in the page, print JSON
//   node tools/capture.mjs check  [ids]                                                  render every scene's frames, report errors + ms/frame
//   node tools/capture.mjs video  renders/out.mp4 <start> <end> [workers=4] [--audio] [--draft]
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/snap/bin/chromium', 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p))
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FPS = 24;
const AR = process.env.AR === '9x16' ? '9x16' : '16x9';   // AR=9x16 node tools/capture.mjs … renders the vertical cut
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const [mode, ...rest] = args.filter((a) => !a.startsWith('--'));

// ---------- static server ----------
const MIME = { '.woff': 'font/woff', '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css' };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, r) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      const f = path.join(ROOT, u === '/' ? 'index.html' : u);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
      r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(r);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

// ---------- chrome worker ----------
async function openWorker(port) {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'op-chrome-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${prof}`, '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', AR === '9x16' ? '--window-size=1080,1920' : '--window-size=1920,1080', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : []), '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--js-flags=--max-old-space-size=4096', 'about:blank'], { stdio: 'ignore' });
  let target, dbg;
  for (let i = 0; i < 150 && !dbg; i++) { try { dbg = fs.readFileSync(path.join(prof, 'DevToolsActivePort'), 'utf8').split('\n')[0].trim(); } catch { await sleep(100); } }
  for (let i = 0; i < 150; i++) {
    try { const r = await fetch(`http://127.0.0.1:${dbg}/json/new?${encodeURIComponent(`http://127.0.0.1:${port}/index.html?capture=1&ar=${AR}${process.env.QS || ''}`)}`, { method: 'PUT' }); target = await r.json(); break; } catch { await sleep(150); }
  }
  if (!target) throw new Error('chrome did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map(); const logs = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
    else if (m.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) logs.push(m.params.type.toUpperCase() + ' ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalv = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  await send('Runtime.enable');
  for (let i = 0; i < 600; i++) {
    const st = await evalv('window.OP ? (OP.bootError ? "ERR:" + OP.bootError : OP.ready) : false').catch(() => false);
    if (st === true) break;
    if (typeof st === 'string') throw new Error('boot failed: ' + st + '\n' + logs.join('\n'));
    if (i === 599) throw new Error('boot timeout\n' + logs.join('\n'));
    await sleep(100);
  }
  try { DUR = DUR || await evalv('OP.duration()'); } catch {}
  const close = () => { try { ws.close(); } catch {} chrome.kill('SIGKILL'); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch {} }, 500); };
  return { evalv, logs, close };
}
const jpg = (d) => Buffer.from(d.slice(d.indexOf(',') + 1), 'base64');

// ---------- modes ----------
const srv = await serve(); const port = srv.address().port;
let exit = 0;
let DUR = 0;
try {
  if (mode === 'sheet' || mode === 'scenes') {
    const [out, list, cols = '4', scale = '0.25'] = rest;
    const w = await openWorker(port);
    let times;
    if (mode === 'sheet') times = list.split(',').map(Number);
    else {
      const per = parseInt(cols || '4', 10);
      const sc = await w.evalv('OP.scenes()');
      const ids = list === 'all' ? sc.map((s) => s.id) : list.split(',');
      times = [];
      for (const id of ids) { const s = sc.find((x) => x.id === id); if (!s) { console.error('no scene', id); continue; } const next = sc[s.i + 1]?.start ?? DUR; for (let k = 0; k < per; k++) times.push(+(s.start + (next - s.start) * (k + 0.5) / per).toFixed(3)); }
    }
    const c = mode === 'scenes' ? Math.max(parseInt(cols, 10), 4) : parseInt(cols, 10);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, jpg(await w.evalv(`OP.sheet(${JSON.stringify(times)}, ${c}, ${parseFloat(scale)})`)));
    console.log(out, times.length, 'frames');
    const errs = await w.evalv('OP.errors()'); if (errs.length) { console.log('SCENE ERRORS:'); errs.forEach((e) => console.log(' ', e.id, e.msg)); }
    if (w.logs.length) console.log('PAGE LOGS:\n ' + [...new Set(w.logs)].slice(0, 20).join('\n '));
    w.close();
  } else if (mode === 'panels') {
    // node tools/capture.mjs panels review/x.jpg "1.2,3.4" [cols=2] [scale=0.5]   — illustration only, bigger
    const [out, list, cols = '2', scale = '0.5'] = rest;
    const w = await openWorker(port);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, jpg(await w.evalv(`OP.panels(${JSON.stringify(list.split(',').map(Number))}, ${parseInt(cols, 10)}, ${parseFloat(scale)})`)));
    console.log(out);
    const errs = await w.evalv('OP.errors()'); if (errs.length) { console.log('SCENE ERRORS:'); errs.forEach((e) => console.log(' ', e.id, e.msg, '\n', (e.stack || '').split('\n').slice(0, 3).join('\n'))); }
    if (w.logs.length) console.log('PAGE LOGS:\n ' + [...new Set(w.logs)].slice(0, 20).join('\n '));
    w.close();
  } else if (mode === 'eval') {
    const w = await openWorker(port);
    console.log(JSON.stringify(await w.evalv(rest[0]), null, 1));
    if (w.logs.length) console.log('PAGE LOGS:\n ' + [...new Set(w.logs)].slice(0, 20).join('\n '));
    w.close();
  } else if (mode === 'cues') {
    const w = await openWorker(port);
    const cues = await w.evalv('OP.cues()');
    fs.writeFileSync(rest[0] || 'data/cues.json', JSON.stringify(cues, null, 1));
    console.log(rest[0] || 'data/cues.json', cues.length, 'cues');
    w.close();
  } else if (mode === 'frames') {
    const [dir, list] = rest; fs.mkdirSync(dir, { recursive: true });
    const w = await openWorker(port);
    for (const t of list.split(',').map(Number)) { const f = path.join(dir, `f_${t.toFixed(2)}.jpg`); fs.writeFileSync(f, jpg(await w.evalv(`OP.frame(${Math.round(t * FPS)}, 0.92)`))); console.log(f); }
    const errs = await w.evalv('OP.errors()'); if (errs.length) errs.forEach((e) => console.log('ERR', e.id, e.msg));
    w.close();
  } else if (mode === 'check') {
    const w = await openWorker(port);
    const sc = await w.evalv('OP.scenes()');
    const ids = rest[0] ? rest[0].split(',') : sc.map((s) => s.id);
    for (const id of ids) {
      const s = sc.find((x) => x.id === id); if (!s) continue;
      const next = sc[s.i + 1]?.start ?? DUR, f0 = Math.ceil(s.start * FPS), f1 = Math.floor(next * FPS) - 1;
      const step = Math.max(1, Math.floor((f1 - f0) / 6)); let tot = 0, n = 0, max = 0;
      for (let f = f0; f <= f1; f += step) { const ms = await w.evalv(`OP.bench(${f})`); tot += ms; n++; max = Math.max(max, ms); }
      console.log(`${id.padEnd(4)} ${s.start.toFixed(2)}-${next.toFixed(2)}  avg ${(tot / n).toFixed(0)}ms  max ${max.toFixed(0)}ms  ${s.tech}`);
    }
    const errs = await w.evalv('OP.errors()'); if (errs.length) { console.log('SCENE ERRORS:'); errs.forEach((e) => console.log(' ', e.id, e.msg, '\n', (e.stack || '').split('\n').slice(0, 4).join('\n'))); exit = 2; }
    if (w.logs.length) console.log('PAGE LOGS:\n ' + [...new Set(w.logs)].slice(0, 30).join('\n '));
    w.close();
  } else if (mode === 'video') {
    const [out, a = '0', b = '-1', nw = '4'] = rest;
    if (b === '-1') { const w0 = await openWorker(port); DUR = await w0.evalv('OP.duration()'); w0.close(); }
    const f0 = Math.round(parseFloat(a) * FPS), f1 = Math.round((b === '-1' ? DUR : parseFloat(b)) * FPS), N = parseInt(nw, 10);
    const draft = flags.has('--draft');
    const tmp = fs.mkdtempSync(path.join(path.dirname(path.resolve(out)), '.chunks-'));
    const per = Math.ceil((f1 - f0) / N), t0 = Date.now();
    let done = 0;
    await Promise.all(Array.from({ length: N }, async (_, k) => {
      const s = f0 + k * per, e = Math.min(f1, s + per); if (s >= e) return;
      const w = await openWorker(port);
      const seg = path.join(tmp, `c${String(k).padStart(3, '0')}.mp4`);
      const vf = draft ? 'scale=trunc(iw/4)*2:trunc(ih/4)*2,format=yuv420p' : 'format=yuv420p';  // draft = half size, any aspect
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', vf, '-c:v', 'libx264', '-preset', draft ? 'veryfast' : 'medium', '-crf', draft ? '23' : '15', '-g', '24', '-bf', '0', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-r', String(FPS), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = s; f < e; f++) {
        const buf = jpg(await w.evalv(`OP.frame(${f}, ${draft ? 0.8 : 0.95})`));
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
        done++;
        if (done % 150 === 0) console.log(`  ${done}/${f1 - f0} frames · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
      ff.stdin.end(); await new Promise((r) => ff.on('close', r));
      const errs = await w.evalv('OP.errors()'); if (errs.length) errs.forEach((x) => console.log('ERR', x.id, x.msg));
      w.close();
    }));
    const listF = path.join(tmp, 'list.txt');
    fs.writeFileSync(listF, fs.readdirSync(tmp).filter((f) => f.endsWith('.mp4')).sort().map((f) => `file '${path.join(tmp, f)}'`).join('\n'));
    const silent = flags.has('--audio') ? path.join(tmp, 'silent.mp4') : out;
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listF, '-c', 'copy', '-movflags', '+faststart', silent]);
    if (flags.has('--audio')) {
      const audio = process.env.AUDIO || path.join(ROOT, 'data/mix.wav');
      await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-ss', String(f0 / FPS), '-t', String((f1 - f0) / FPS), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', out]);
    }
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(out, `${f1 - f0} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } else {
    console.log('usage: sheet|scenes|frames|check|video (see header)');
  }
} catch (e) { console.error('ERROR', e.message); exit = 1; }
srv.close();
setTimeout(() => process.exit(exit), 600);

function run(cmd, a) { return new Promise((res, rej) => { const p = spawn(cmd, a, { stdio: 'inherit' }); p.on('close', (c) => (c === 0 ? res() : rej(new Error(cmd + ' exited ' + c)))); }); }
