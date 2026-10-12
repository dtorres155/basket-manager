// Prueba del mando y de los botones táctiles de la cámara libre del modo foto con un mando simulado y eventos de puntero. Uso: node tools/foto_mando.js   (requiere `npm run serve`)
const { chromium } = require('playwright'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }), p = await (await b.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); await p.addInitScript('window.__sinAdaptar = true;'); await p.goto('http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => { GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'M', apellido: 'S' }), carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } }); GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); });
  await sleep(14000);
  const clic = txt => p.evaluate(t => { [...document.querySelectorAll('.sede-foto button, .sede-foto-panel button, .sede-hud button')].filter(b => b.textContent === t).forEach(b => b.click()); }, txt);
  await clic('Foto'); await sleep(500); await clic('Ajustes'); await clic('Cámara libre: no'); await sleep(400);
  const pos = () => p.evaluate(() => { const L = GM.sede._estado().camLibre; return L && [L.pos.x, L.pos.y, L.pos.z, L.yaw, L.pitch].map(v => +v.toFixed(2)); });
  const p0 = await pos();
  // mando simulado: palanca izquierda adelante, derecha a un lado, gatillo derecho (subir)
  await p.evaluate(() => { window.__gp = { connected: true, axes: [0, -1, 0.8, 0], buttons: [] }; window.__gp.buttons[7] = { value: 1 }; navigator.getGamepads = () => [window.__gp]; });
  await sleep(1000); const p1 = await pos(); await p.evaluate(() => { navigator.getGamepads = () => []; }); 
  // botones táctiles: pulsar «▲» con eventos de puntero durante un segundo
  const visible = await p.evaluate(() => { const pad = document.querySelector('.ff-pad'); return pad && getComputedStyle(pad).display !== 'none'; });
  await p.evaluate(() => { const pad = document.querySelector('.ff-pad'); pad.style.display = ''; });
  await p.evaluate(() => { const b = [...document.querySelectorAll('.ff-pad button')].find(x => x.textContent === '▲'); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
  await sleep(1000); await p.evaluate(() => { const b = [...document.querySelectorAll('.ff-pad button')].find(x => x.textContent === '▲'); b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); });
  const p2 = await pos();
  console.log('inicio', JSON.stringify(p0), '\ntras el mando', JSON.stringify(p1), '(debe cambiar posición, altura y giro)\ntras el botón ▲', JSON.stringify(p2), '(debe avanzar)\npad visible al activar la cámara libre en pantalla sin tacto:', visible, '\nerrores:', errs.length ? errs : 'ninguno'); await b.close();
})();
