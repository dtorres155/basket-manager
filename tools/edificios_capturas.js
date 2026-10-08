// Capturas de los edificios de la calle montados con piezas glTF (Building Kit de Kenney) y del público en la grada.
// Uso: node tools/edificios_capturas.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'edificios'); fs.mkdirSync(DIR, { recursive: true });
const CLUB = process.argv[2] || 'joventut-badalona', sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 760 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(club => { GM.campus.config.calidad = 'alta'; GM.newGame(club, undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) }); GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); }, CLUB);
  await sleep(12000);
  const vistas = [['1_norte', 27, -4, 3.14, 26, 0.35], ['2_sur', 31, 4.5, 0, 26, 0.35], ['3_portal', -31, 4.5, 0, 24, 0.4], ['4_general', 0, 0, 0.6, 70, 0.9]];
  for (const [n, x, z, yaw, zoom, inc] of vistas) {
    await p.evaluate(([x, z, yaw, zoom, inc]) => { const S = GM.sede._estado(); S.yo.obj.position.set(x, 0, z); S.yo.ruta = null; S.yaw = yaw; S.zoom = zoom; S.inc = inc; document.querySelectorAll('.sede-ayuda').forEach(e => e.style.display = 'none'); }, [x, z, yaw, zoom, inc]);
    await sleep(1800); await p.screenshot({ path: path.join(DIR, n + '.png') });
  }
  // Público: pabellón (pestaña del club) y partido en directo
  await p.evaluate(() => { GM.sede.cerrar(); GM.ui.navegar('club'); }); await sleep(600);
  await p.evaluate(() => { const t = [...document.querySelectorAll('.tab')].find(x => /pabell|estadio/i.test(x.textContent)); if (t) t.click(); }); await sleep(3000);
  let el = await p.$('.cuerpo canvas'); if (el) await el.screenshot({ path: path.join(DIR, '5_pabellon.png') });
  await p.evaluate(() => { const st = GM.state, g = st.calendario.find(x => !x.resultado && (x.local === st.clubId || x.visitante === st.clubId)); GM.mods.directo.abrir(st, g, { control: true, onFin: () => {} }); }); await sleep(4000);
  await p.screenshot({ path: path.join(DIR, '6_directo.png') }); await sleep(9000); await p.screenshot({ path: path.join(DIR, '7_directo_avanzado.png') });
  await p.evaluate(() => GM.sede.abrir(GM.state, 'calle')).catch(() => {}); await sleep(200);
  const info = await p.evaluate(() => { const S = GM.sede._estado(); let piezas = 0; S.mundo.traverse(o => { if (o.isMesh && o.material && o.material.map && o.material.map.isCanvasTexture && o.material.map.image && o.material.map.image.width === 512) piezas++; }); return { piezas, calls: S.renderer.info.render.calls }; });
  console.log('mallas del kit:', info.piezas, '| llamadas de dibujo:', info.calls, '| errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
