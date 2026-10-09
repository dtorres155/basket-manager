// Un solo mundo: la vista 3D de los menús es la misma escena que se pasea. Captura «Mi pueblo» (y el panel al tocar una parcela)
// y el mapa 3D de Ciudad. Uso: node tools/unmundo_capturas.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'unmundo'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 900, height: 800 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => { const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }); GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
    const st = GM.state, P = st.carrera.pueblo; P.aportado = 900; P.cariño = 70; P.edificios = [{ tipo: 'canasta', nivel: 2 }, { tipo: 'bar', nivel: 1 }, { tipo: 'parque', nivel: 1 }, { tipo: 'escuela', nivel: 1 }];
    st.carrera.dinero = 900; GM.mods.hogar.nivel = () => 5; GM.mods.carrera.comprarVivienda(st, 4, 'casa', 'compra');
    GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.ui.navegar('ciudad'); });
  await sleep(600);
  const tabs = await p.evaluate(() => [...document.querySelectorAll('.cuerpo .tab')].map(t => t.textContent).join(' | '));
  await p.evaluate(() => { const t = [...document.querySelectorAll('.cuerpo .tab')].find(x => /pueblo/i.test(x.textContent)); if (t) t.click(); }); await sleep(5000);
  let el = await p.$('.cuerpo canvas'); if (el) await el.screenshot({ path: path.join(DIR, '1_mi_pueblo.png') });
  // tocar la parcela de la escuela desde el panel (simulado: selección y foco)
  const sel = await p.evaluate(() => { const V = GM.mods.pueblo._v ? GM.mods.pueblo._v() : null; return !!V; });
  console.log('pestañas de Ciudad:', tabs, '| selección expuesta:', sel);
  await p.evaluate(() => { const t = [...document.querySelectorAll('.cuerpo .tab')].find(x => /mapa/i.test(x.textContent)); if (t) t.click(); }); await sleep(6000);
  el = await p.$('.cuerpo canvas'); if (el) await el.screenshot({ path: path.join(DIR, '2_mapa_ciudad.png') });
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
