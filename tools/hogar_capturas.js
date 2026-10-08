// Capturas de la casa antigua (Mi casa, vista Habitaciones) amueblada. Uso: node tools/hogar_capturas.js  (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'hogar'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  const r = await p.evaluate(() => {
    GM.newGame('joventut-badalona', undefined, { modo: 'gestor' });
    const st = GM.state, H = GM.mods.hogar; GM.campus.config.calidad = 'alta';
    if (st.finanzas && st.finanzas[st.clubId]) st.finanzas[st.clubId].caja += 5e6;
    const c0 = H.casaActual(st), hab = H.habitaciones(c0.tipo, c0.variante).find(x => !x.ext) || H.habitaciones(c0.tipo, c0.variante)[0], out = [];
    // Se colocan directamente (sin comprobar nivel ni dinero): solo es para ver los modelos
    const quiero = ['sofa1', 'cama2', 'mesa1', 'planta', 'lampara', 'alfombra', 'butaca', 'escritorio', 'nevera'], dm = H.dims(st, hab.id);
    const L = st.hogar.muebles[c0.id] = []; quiero.forEach((id, k) => { const it = H.ITEMS.find(x => x.id === id), fila = Math.floor(k / 3), col = (k % 3) * 2; if (fila < dm.rows && col < dm.cols) { L.push({ hab: hab.id, slot: 'f-' + fila + '-' + col, item: id, color: k % 4 }); out.push(id); } });
    GM.ui.start(document.getElementById('app')); GM.ui.navegar('ciudad');
    [...document.querySelectorAll('.cuerpo .tab')].find(x => x.textContent.includes('Mi casa')).click();
    const hb = [...document.querySelectorAll('.cuerpo button')].find(x => x.textContent.trim() === 'Habitaciones'); if (hb) hb.click();
    return out;
  });
  await sleep(3000);
  const el = await p.$('.cuerpo canvas'); if (el) await el.screenshot({ path: path.join(DIR, 'habitacion.png') });
  console.log('colocados', r.join(', '), '| errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
