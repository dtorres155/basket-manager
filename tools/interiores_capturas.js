// Capturas de los interiores (pabellón, tienda, peña, ayuntamiento): se entra desde la calle por su puerta y se vuelve a ella.
// Uso: node tools/interiores_capturas.js [modo]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'interiores'); fs.mkdirSync(DIR, { recursive: true });
const MODO = process.argv[2] || 'carrera', sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 760 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(modo => { const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }); GM.newGame('joventut-badalona', undefined, modo === 'carrera' ? { modo, personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } } : { modo, personaje: pj }); GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); }, MODO);
  await sleep(12000);
  for (const t of ['pabellon', 'tienda', 'pena', 'ayuntamiento']) {
    const r = await p.evaluate(async t => {
      const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === t); if (!z || !z.sala.irA) return t + ': sin puerta';
      await GM.sede._escena(z.sala.irA); await new Promise(r => setTimeout(r, 6000));
      const S2 = GM.sede._estado(); S2.zoom = 22; S2.inc = 1.0; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove());
      // abrir el panel de la zona propia y el de actividades
      const zp = S2.zonas.find(q => q.sala.id === t), zl = S2.zonas.find(q => /^lugar_/.test(q.sala.id));
      S2.yo.obj.position.copy(zl.obj.position); await new Promise(r => setTimeout(r, 900));
      const act = [...document.querySelectorAll('.sede-sala .sp-accion b')].map(b => b.textContent).join(' | ');
      S2.yo.obj.position.copy(zp.obj.position); await new Promise(r => setTimeout(r, 900));
      const propias = [...document.querySelectorAll('.sede-sala .sp-accion b')].map(b => b.textContent).join(' | ');
      if (S2.panel) S2.panel.style.display = 'none'; S2.yo.obj.position.set(0, 0, 0);
      return { t, nombre: S2.interiorNombre, gente: S2.gente.map(g => g.rol).join(', '), act, propias };
    }, t);
    await sleep(1500); await p.screenshot({ path: path.join(DIR, t + '.png') });
    const vuelta = await p.evaluate(async () => { await GM.sede._escena('calle'); await new Promise(r => setTimeout(r, 11000)); const q = GM.sede._estado().yo.obj.position; return q.x.toFixed(1) + ',' + q.z.toFixed(1); });
    console.log(JSON.stringify(r), '| vuelta a la calle en', vuelta);
  }
  console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
