// Interacción con los muebles (punto 51): entra en una mansión de prueba con un mueble de cada tipo, toca cada uno, ejecuta sus acciones y saca capturas a mitad de la acción.
// Uso: node tools/interaccion_prueba.js [carpeta]   (requiere `npm run serve`; deja capturas en capturas/interaccion/)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', process.argv[2] || 'interaccion'); fs.mkdirSync(DIR, { recursive: true });
const { sleep, esperarEscena, irA } = require('./ayudas');
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [], out = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(700);
  await p.evaluate(() => { localStorage.clear(); const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: 'joventut-badalona' } }); const st = GM.state; st.carrera.dinero = 500; st.carrera.vivienda.actual = { id: 'vtest', barrio: 0, barrioNombre: 'Centro', tipo: 'mansion', modo: 'compra', precio: 2600, alquiler: 1, cuota: 1, ciudad: 'Badalona', desde: st.fecha, comodidad: 3, transporte: 3, ruido: 2, prestigio: 4 }; GM.ui.start(document.getElementById('app')); GM.sede.abrir(st); });
  await esperarEscena(p);
  const PRUEBAS = [['kitchenFridge', 'cocina', 1.4, -1.0, 'nevera'], ['shower', 'dormitorio', 2.4, 1.0, 'ducha'], ['bedDouble', 'dormitorio', 0, 0, 'siesta'], ['loungeSofa', 'salon', -2.2, 0.8, 'sentar'], ['televisionModern', 'salon', 1.0, -1.2, 'tele'], ['kitchenStove', 'cocina', -1.4, -1.0, 'cocinar'], ['kitchenFridge', 'cocina', 1.4, -1.0, 'nevera'], ['desk', 'despacho', 0, -0.6, 'trabajar'], ['shower', 'dormitorio', 2.4, 1.0, 'ducha'], ['lampRoundFloor', 'salon', 3.4, -1.6, 'luz'], ['bench', 'gimnasio', 0, 0, 'sentar'], ['bookcaseClosedDoors', 'despacho', 1.8, -1.0, 'abrir']];
  const ok = await p.evaluate(P => { try { const st = GM.state, H = GM.mods.hogar, v = H.viviendas(st).find(x => x.actual), D = GM.casa.datos(st, v.id), PL = GM.casa.plano(v); D.muebles = P.map(([m, hab, dx, dz]) => { const r = PL.habs.concat(PL.ext).find(q => q.id === hab) || PL.habs[0]; return { m, x: Math.round(((r.x0 + r.x1) / 2 + dx) * 2) / 2, z: Math.round(((r.z0 + r.z1) / 2 + dz) * 2) / 2, r: 0, hab }; }); return D.muebles.length; } catch (e) { return e.stack; } }, PRUEBAS);
  await irA(p, 'calle'); await irA(p, 'casa:vtest');
  await p.evaluate(() => document.querySelectorAll('.sede-ayuda').forEach(e => e.style.display = 'none'));
  out.push('escena ' + await p.evaluate(() => GM.sede._estado().escena) + ', muebles ' + ok);
  for (const [m, hab, dx, dz, acc] of PRUEBAS) {
    const r = await p.evaluate(async ([m, acc]) => {
      const S = GM.sede._estado(), M = GM.sede.motor(), o = S.mueblesCasa.find(q => q.userData.muebleCasa.m === m); if (!o) return { m, error: 'no está el mueble' };
      const q = GM.interaccion.cercano(S, { x: o.position.x, z: o.position.z }); if (!q) return { m, error: 'no se detecta al tocar' };
      const a = GM.interaccion.accionesDe(S, q).find(x => x.id === acc); if (!a) return { m, error: 'sin acción ' + acc };
      S.zoom = 12; S.foco.set(o.position.x, 0, o.position.z); const h0 = S.hora, mo0 = GM.state.carrera.moral;
      GM.interaccion.empezar(S, M, q, a); return { m, x: o.position.x, z: o.position.z, h0, mo0, dur: a.dur };
    }, [m, acc]);
    if (r.error) { out.push('FALLA ' + m + ': ' + r.error); continue; }
    for (let i = 0; i < 40 && !(await p.evaluate(() => GM.interaccion.activa())); i++) await sleep(300);
    await sleep(Math.max(500, r.dur * 1000 * 0.3)); await p.screenshot({ path: path.join(DIR, m + '_' + acc + '.png') });
    for (let i = 0; i < 60 && (await p.evaluate(() => GM.interaccion.activa())); i++) await sleep(300);
    const f = await p.evaluate(h0 => ({ hora: +(GM.sede._estado().hora - h0).toFixed(2), moral: GM.state.carrera.moral }), r.h0);
    out.push('ok ' + m.padEnd(22) + acc.padEnd(10) + 'hora +' + f.hora + ', ánimo ' + r.mo0 + ' a ' + f.moral);
    await p.evaluate(() => { GM.interaccion.cancelar(GM.sede._estado(), GM.sede.motor()); document.querySelectorAll('.inter-panel').forEach(e => e.remove()); }); await sleep(300);
  }
  console.log(out.join('\n')); console.log('errores: ' + (errs.length ? errs.slice(0, 6).join(' | ') : 'ninguno')); await b.close(); process.exit(errs.length || out.some(x => /^FALLA/.test(x)) ? 1 : 0);
})();
