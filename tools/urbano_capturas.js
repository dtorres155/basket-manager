// Urbanismo de la ciudad: pasos de cebra, farolas, aceras, boca de metro, paradas de bici y bici con pedales.
// Uso: node tools/urbano_capturas.js [carpeta]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', process.argv[2] || 'urbano'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => {
    GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }), carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } });
    GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle');
  });
  await sleep(13000);
  const vista = async (n, x, z, yaw, zoom) => {
    if (typeof x === 'string') { const z0 = await p.evaluate(id => { const q = GM.sede._estado().zonas.find(q => q.sala.id === id); return q ? [q.obj.position.x, q.obj.position.z] : null; }, x.slice(5)); if (!z0) { console.log('sin zona', x); return; } [x, z] = z0; }
    await p.evaluate(([x, z, yaw, zoom]) => { const S = GM.sede._estado(); S.yo.camino = null; S.yo.obj.position.set(x, 0, z); S.yaw = S.yawObj = yaw; S.zoom = zoom; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); }, [x, z, yaw, zoom]);
    await sleep(2200); await p.evaluate(() => { const S = GM.sede._estado(); if (S.panel) S.panel.style.display = 'none'; }); await p.screenshot({ path: path.join(DIR, n + '.png') });
  };
  const vistas = JSON.parse(process.env.VISTAS || 'null') || [
    ['1_cruce', -2, -5, 0.6, 20], ['2_paso_avenida', 8, -5, 0.2, 12], ['3_cebra_alto', 0, 0, 0.5, 30],
    ['4_metro_centro', 'zona:metro_centro', 0, 0.4, 9], ['5_bici_centro', 'zona:bici_centro', 0, 0.5, 11], ['6_metro_oeste', 'zona:metro_oeste', 0, 0.4, 10], ['7_bici_oeste', 'zona:bici_oeste', 0, 0.3, 11],
    ['8_metro_este', 'zona:metro_este', 0, 0.5, 10], ['9_bici_este', 'zona:bici_este', 0, 0.5, 11], ['10_metro_norte', 'zona:metro_norte', 0, 0.5, 10], ['11_bici_norte', 'zona:bici_norte', 0, 0.5, 11]
  ];
  for (const v of vistas) await vista(...v);
  console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
