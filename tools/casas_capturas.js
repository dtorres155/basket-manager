// Capturas de las viviendas con su plano real (hogar.js: variantes con habitaciones, planta de arriba, terraza, jardín o piscina).
// Compra varias casas sin vender las anteriores y entra en cada una. Uso: node tools/casas_capturas.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'casas'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 760 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  const vivs = await p.evaluate(() => {
    const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' });
    GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
    const st = GM.state; st.carrera.dinero = 9000; GM.mods.hogar.nivel = () => 5; GM.campus.config.calidad = 'alta';   // solo para las capturas: todas las viviendas disponibles
    [['piso', 2], ['atico', 1], ['casa', 3], ['mansion', 0]].forEach(([t, b]) => { const r = GM.mods.carrera.comprarVivienda(st, b, t, 'compra'); if (!r.ok) console.log(r.motivo); });
    GM.ui.start(document.getElementById('app'));
    return GM.mods.hogar.viviendas(st).map(v => ({ id: v.id, nombre: v.nombre, tipo: v.tipo, barrio: v.barrioNombre, actual: v.actual }));
  });
  console.log('viviendas:', vivs.map(v => v.nombre + ' (' + v.tipo + ', ' + v.barrio + (v.actual ? ', vives aquí' : '') + ')').join(' | '));
  for (const v of vivs) {
    await p.evaluate(id => { if (GM.sede.activa()) GM.sede.cerrar(); GM.sede.abrir(GM.state, 'casa:' + id); }, v.id); await sleep(6000);
    const info = await p.evaluate(() => { const S = GM.sede._estado(), [x0, z0, x1, z1] = S.casaRect; S.yo.obj.position.set((x0 + x1) / 2, 0, (S.casaPlano.front + S.casaPlano.fondo) / 2); S.yo.camino = null; if (S.panel) S.panel.style.display = 'none'; S.zoom = Math.max(x1 - x0, z1 - z0) * 1.15; S.inc = 1.15; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); return { nombre: S.casaNombre, habs: S.casaPlano.habs.map(h => h.id).concat(S.casaPlano.ext.map(h => h.id)).join(','), muebles: GM.mods && GM.casa.datos(GM.state).muebles.length }; });
    await sleep(1500); await p.screenshot({ path: path.join(DIR, v.tipo + '.png') });
    // ir andando a la habitación del fondo (comprueba que las puertas dejan pasar)
    const anda = await p.evaluate(() => new Promise(res => { const S = GM.sede._estado(), PL = S.casaPlano, r = PL.habs[PL.habs.length - 1], M = GM.sede._motor(); const ok = M.irA(S.yo, (r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, () => res('llega')); if (!ok) res('sin camino'); setTimeout(() => res('no llega a tiempo'), 12000); }));
    console.log(' ', info.nombre, '| habitaciones:', info.habs, '| muebles:', info.muebles, '| andar al fondo:', anda);
  }
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
