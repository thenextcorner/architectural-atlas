// Screenshot helper for the Architectural Atlas.
//
// Chromium 152 blocks navigation to localhost (Local Network Access checks), so
// this script builds a self-contained file:// copy of dist/ with each model
// inlined (fetch override) and drives it over Chrome DevTools Protocol.
//
// Usage:
//   npm run build
//   node scripts/screenshots.mjs   # needs /opt/meta-chromium/chrome or CHROME_BIN
// Output: ~/workspace/architectural-atlas/screenshots/<slug>/{assembled,exploded}.png
import { spawn, execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const dist = path.join(repo, 'dist');
const work = '/tmp/atlas-shotbuild';
const outRoot = path.resolve(repo, '..', 'screenshots');
const CHROME = process.env.CHROME_BIN || '/opt/meta-chromium/chrome';
const PORT = 9344;

const index = JSON.parse(await fs.readFile(path.join(dist, 'models', 'index.json'), 'utf8'));
const only = new Set(process.argv.slice(2));
const buildings = only.size ? index.filter((e) => only.has(e.slug)) : index;
if (only.size && buildings.length !== only.size) throw new Error(`Unknown slug(s): ${[...only].filter((s) => !buildings.some((b) => b.slug === s)).join(', ')}`);

const chrome = spawn(CHROME, [
  '--headless', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader',
  '--allow-file-access-from-files', '--window-size=1440,900',
  `--remote-debugging-port=${PORT}`, 'about:blank',
], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
let targets = null;
for (let i = 0; i < 30; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); break; }
  catch { await new Promise((r) => setTimeout(r, 1000)); }
}
if (!targets) throw new Error('Chrome DevTools did not come up on port ' + PORT);
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((resolve) => { const mid = ++id; pending.set(mid, resolve); ws.send(JSON.stringify({ id: mid, method, params })); });
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const shot = async (outPath) => { const r = await send('Page.captureScreenshot', { format: 'png' }); const b = Buffer.from(r.result.data, 'base64'); await fs.mkdir(path.dirname(outPath), { recursive: true }); await fs.writeFile(outPath, b); console.log(path.relative(outRoot, outPath), b.length, 'bytes'); };
await send('Page.enable'); await send('Runtime.enable');

for (const entry of buildings) {
  const slug = entry.slug;
  const atlas = JSON.parse(await fs.readFile(path.join(dist, 'models', slug, 'atlas.json'), 'utf8'));
  const binName = `${slug}-0.bin`;
  execSync(`rm -rf ${work} && cp -r ${dist} ${work}`);
  let html = await fs.readFile(path.join(work, 'index.html'), 'utf8');
  html = html.replaceAll('href="/assets/', 'href="./assets/').replaceAll('src="/assets/', 'src="./assets/');
  const atlasJson = JSON.stringify(atlas).replaceAll('/models/', './models/');
  const binB64 = (await fs.readFile(path.join(work, 'models', slug, binName))).toString('base64');
  const inject = `<script>
window.__AJ=${atlasJson};
window.__TB="${binB64}";
window.__IX=${JSON.stringify(index)};
const __ofetch=window.fetch.bind(window);
window.fetch=(u,o)=>{const s=String(u);
if(s.includes("index.json"))return Promise.resolve(new Response(JSON.stringify(window.__IX),{headers:{"Content-Type":"application/json"}}));
if(s.includes("atlas.json"))return Promise.resolve(new Response(JSON.stringify(window.__AJ),{headers:{"Content-Type":"application/json"}}));
if(s.includes(".bin")){const b=Uint8Array.from(atob(window.__TB),c=>c.charCodeAt(0));return Promise.resolve(new Response(b.buffer));}
return __ofetch(u,o);};
</script>\n`;
  html = html.replace('</head>', inject + '</head>');
  await fs.writeFile(path.join(work, 'index.html'), html);

  // A hash-only URL change is a same-document navigation (no reload), which would
  // keep the previous building's injected model. Bounce through about:blank so
  // each building gets a fresh page load with its own data.
  await send('Page.navigate', { url: 'about:blank' });
  await new Promise((r) => setTimeout(r, 400));
  await send('Page.navigate', { url: 'file://' + work + '/index.html#/viewer/' + slug });
  // Wait for the "Preparing the structure" card to appear (it renders a beat
  // after navigation) and then disappear, so the assembled screenshot never
  // catches the loading overlay.
  for (let i = 0; i < 20; i++) { if (await evaluate(`!!document.querySelector('.loading')`)) break; await new Promise((r) => setTimeout(r, 500)); }
  let ready = false;
  for (let i = 0; i < 60; i++) { if (await evaluate(`!document.querySelector('.loading')`)) { ready = true; break; } await new Promise((r) => setTimeout(r, 500)); }
  if (!ready) { console.log(slug, 'WARNING: loading indicator never cleared'); continue; }
  await new Promise((r) => setTimeout(r, 4000));
  await shot(path.join(outRoot, slug, 'assembled.png'));

  const click = async (x, y) => {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
};
const explodeOutput = () => evaluate(`document.querySelector('.explode-label output').textContent`);
  for (let attempt = 0; attempt < 3; attempt++) {
    const center = await evaluate(`(() => { const e = document.querySelector('[data-slot="slider-thumb"]'); if(!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; })()`);
    if (!center) { console.log(slug, 'WARNING: slider thumb not found'); break; }
    await click(center[0], center[1]);
    await new Promise((r) => setTimeout(r, 300));
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'End', code: 'End', windowsVirtualKeyCode: 35 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'End', code: 'End', windowsVirtualKeyCode: 35 });
    await new Promise((r) => setTimeout(r, 2500));
    const label = await explodeOutput();
    console.log(slug, 'explode:', label);
    if (String(label).startsWith('100')) break;
  }
  await shot(path.join(outRoot, slug, 'exploded.png'));
}
ws.close(); chrome.kill(); console.log('done ->', outRoot);
