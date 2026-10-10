// Vida de la calle: mercadillo (sábado), obras (una de cada cuatro semanas), fiesta mayor, motos, reparto, pájaros, fotógrafos y los
// locales nuevos (cine y bolera). Uso: node tools/calle_vida.js [carpeta]   (requiere `npm run serve`)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', process.argv[2] || 'calle_vida'); fs.mkdirSync(DIR, { recursive: true }); const sleep = ms => new Promise(r => setTimeout(r, ms));
async function sesion(fecha, estilo, fn) {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' }), p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(([f, es]) => { const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }); GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } }); const st = GM.state; st.fecha = f; if (es !== null) st.carrera.estilo = { v: es, cd: {}, hist: [] }; GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(st, 'calle'); }, [fecha, estilo]);
  await sleep(13000); await fn(p); console.log(fecha, 'errores:', errs.slice(0, 4)); await b.close();
}
const vista = async (p, n, x, z, yaw, zoom, inc) => { await p.evaluate(([x, z, yaw, zoom, inc]) => { const S = GM.sede._estado(); S.yo.camino = null; S.yo.obj.position.set(x, 0, z); S.foco.set(x, 0, z); S.yaw = S.yawObj = yaw; S.zoom = zoom; S.inc = inc || 0.7; if (S.panel) S.panel.style.display = 'none'; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); }, [x, z, yaw, zoom, inc]); await sleep(2500); await p.screenshot({ path: path.join(DIR, n + '.png') }); };
(async () => {
  await sesion('2026-10-10', -60, async p => { // sábado: mercadillo; chico malo: fotógrafos
    console.log(JSON.stringify(await p.evaluate(() => { const S = GM.sede._estado(); return { mercadillo: !!S.mercadillo, puestos: (S.cvPuestos || []).length, obras: !!S.cvObras, fotografos: (S.cvFotografos || []).length, pajaros: (S.cvPajaros || []).length, motos: S.coches.filter(c => c.moto).length, reparto: S.coches.filter(c => c.reparto).length }; })));
    await vista(p, '1_mercadillo', -4, 33, 0.3, 26); await vista(p, '2_fotografos', 0, -4.5, 0.5, 14); await vista(p, '3_trafico', 0, 0, 0.9, 30, 0.9); });
  await sesion('2026-10-22', null, async p => { await p.evaluate(() => { const S = GM.sede._estado(); S.pausa = true; if (S.panel) S.panel.style.display = 'none'; S.camera.position.set(26, 11, -6); S.camera.lookAt(28, 0, 4.9); S.renderer.render(S.scene, S.camera); }); await sleep(600); await p.screenshot({ path: path.join(DIR, '4_obras.png') }); });
  await sesion('2026-08-15', null, async p => { await p.evaluate(() => { GM.sede._estado().hora = 22; }); await vista(p, '5_fiesta', 0, -2, 0.4, 40, 0.8); });
  await sesion('2026-09-24', null, async p => {
    const tipos = await p.evaluate(() => { const S = GM.sede._estado(); return Object.keys(S.puertas || {}).filter(k => /^interior:/.test(k)); }); console.log('interiores en la calle:', tipos.join(', '));
    for (const t of ['cine_ciudad', 'bolera']) { await p.evaluate(t => GM.sede._escena('interior:' + t), t); await sleep(6500); await p.evaluate(() => { const S = GM.sede._estado(); S.yo.camino = null; S.yo.obj.position.set(0, 0, -1.5); S.foco.set(0, 0, -1); S.zoom = 38; S.inc = 1.05; S.yaw = 0; if (S.panel) S.panel.style.display = 'none'; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); }); await sleep(2000); await p.screenshot({ path: path.join(DIR, '6_' + t + '.png') }); console.log(t, await p.evaluate(() => { const S = GM.sede._estado(); return { escena: S.escena, tipo: S.interiorTipo, gente: S.gente.length, zonas: S.zonas.map(z => z.sala.id).join(',') }; })); }
  });
})();
