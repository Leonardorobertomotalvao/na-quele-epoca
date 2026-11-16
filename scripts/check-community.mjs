// Smoke test local com Edge/CDP, sem dependências e sem acessar APIs reais.
// Uso: node scripts/check-community.mjs (servidor local na porta 3101).
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const output = 'E:/apps/temp/nme-browser';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3101';
await mkdir(output, { recursive: true });
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9333', `--user-data-dir=${output}/profile`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(r => setTimeout(r, ms));
let socket;
try {
  let pages;
  for (let i = 0; i < 50; i++) {
    try { pages = await (await fetch('http://127.0.0.1:9333/json')).json(); if (pages.length) break; } catch {}
    await pause(200);
  }
  socket = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => socket.addEventListener('open', r, { once: true }));
  let serial = 0;
  const pending = new Map();
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const user = { id: 'fixture-user', name: 'Pessoa de teste', email: 'teste@example.invalid', image: null };
  let failEnvios = false;
  const posts = [[40, 30], [180, 800], [900, 240]].map(([w, h], i) => ({
    id: `fixture-${i}`, content: 'Publicação de teste', createdAt: new Date().toISOString(), author: user,
    imageUrl: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#16c978"/></svg>`)}`,
    _count: { likes: 0, comments: 0 }, likedByMe: false,
  }));
  socket.addEventListener('message', async event => {
    const m = JSON.parse(event.data);
    if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p?.reject(m.error) : p?.resolve(m.result); }
    if (m.method === 'Fetch.requestPaused') {
      const { requestId, request } = m.params;
      const path = new URL(request.url).pathname;
      let body = [], status = 200;
      if (path.includes('get-session')) body = { user, session: { id: 'fixture', userId: user.id, expiresAt: '2099-01-01T00:00:00Z', token: 'fixture' } };
      else if (path === '/api/comunidade/posts') body = posts;
      else if (path === '/api/comunidade/brincadeiras') {
        if (request.method === 'POST') { body = { ok: true, possibleDuplicate: 'Nome privado', item: { status: 'PENDENTE' } }; status = 201; }
        else if (failEnvios) { body = { error: 'Falha simulada' }; status = 500; }
        else body = [{ id: 's1', name: 'Sugestão teste', status: 'REJEITADO', rejectionReason: 'Explique melhor as regras.', categories: [] }, { id: 's2', name: 'Aprovada teste', status: 'APROVADO', categories: [] }];
      }
      await call('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
    }
  });
  await call('Page.enable');
  await call('Fetch.enable', { patterns: [{ urlPattern: '*://*/api/*' }] });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  for (const width of [390, 1280]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 700 });
    await call('Page.navigate', { url: `${base}/comunidade` }); await pause(2200);
    const dimensions = await evaluate(`Array.from(document.querySelectorAll('.community-post-image img')).map(i=>({w:i.clientWidth,h:i.clientHeight,nw:i.naturalWidth,nh:i.naturalHeight,link:i.parentElement.target}))`);
    assert.equal(dimensions.length, 3);
    for (const i of dimensions) { assert(i.w <= i.nw && i.h <= i.nh); assert(Math.abs(i.w / i.h - i.nw / i.nh) < 0.03); assert.equal(i.link, '_blank'); }
    assert(await evaluate(`document.body.textContent.includes('Aprovada teste') && document.body.innerText.includes('Minhas sugestões')`));
    assert(await evaluate(`document.querySelector('details.community-alert.error').textContent.includes('Explique melhor')`));
    assert(await evaluate(`document.documentElement.scrollWidth <= innerWidth`));
    for (const dark of [false, true]) {
      await evaluate(`document.documentElement.classList.toggle('dark', ${dark})`);
      const shot = await call('Page.captureScreenshot', { format: 'png' });
      await writeFile(`${output}/comunidade-${width}-${dark ? 'dark' : 'light'}.png`, Buffer.from(shot.data, 'base64'));
    }
  }
  failEnvios = true;
  await call('Page.navigate', { url: `${base}/comunidade?teste=erro#sugerir` }); await pause(1800);
  assert(await evaluate(`document.body.innerText.includes('Não foi possível atualizar seus envios')`));
  assert(await evaluate(`!!document.querySelector('[role=dialog]')`));
  await evaluate(`(async()=>{
    const canvas=document.createElement('canvas');canvas.width=40;canvas.height=30;
    const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
    const dt=new DataTransfer();dt.items.add(new File([blob],'teste.png',{type:'image/png'}));
    const input=document.getElementById('share-game-image-input');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await pause(200);
  assert(await evaluate(`document.querySelector('.community-image-preview img').clientWidth <= 40`));
  await evaluate(`document.querySelector('.remove-image-button').click()`);
  for (const [id, value] of [['share-game-name', 'Brincadeira teste'], ['share-game-desc', 'Descrição para teste isolado'], ['share-game-how', 'Instruções para teste isolado']]) {
    await evaluate(`document.getElementById('${id}').focus()`);
    await call('Input.insertText', { text: value });
    assert.equal(await evaluate(`document.activeElement.id`), id);
  }
  await evaluate(`document.querySelector('.share-categoria-chip').click()`);
  await pause(100);
  await evaluate(`document.querySelector('.share-actions button[type=submit]').click()`);
  await pause(500);
  assert(await evaluate(`document.body.innerText.includes('possível duplicidade') && !document.body.innerText.includes('Nome privado')`));
  await call('Page.navigate', { url: `${base}/` }); await pause(1800);
  assert.equal(await evaluate(`document.querySelector('.catalog-contribute a').getAttribute('href')`), '/comunidade#sugerir');
  await call('Page.navigate', { url: `${base}/oficina` }); await pause(1800);
  assert(await evaluate(`document.body.innerText.includes('Oficina')`));
  console.log('OK: imagens pequenas/verticais/horizontais; proporção; links; 390/1280px; temas; status/rejeição/erro; CTA; formulário; prévia; foco; envio/duplicidade; Oficina. APIs simuladas.');
} finally { socket?.close(); edge.kill(); }
