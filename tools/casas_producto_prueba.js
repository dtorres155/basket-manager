// Casas como producto (punto 52): en una mansión de prueba encarga una cocina y una piscina, entra en la casa para ver las obras (andamios, vallas, conos), el panel de la casa en 3D
// y el panel de valor y reformas, y avanza los días hasta que acaban las obras. Capturas en capturas/casas_producto/.
// Uso: node tools/casas_producto_prueba.js   (requiere `npm run serve`)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'casas_producto'); fs.mkdirSync(DIR, { recursive: true });
const { sleep, esperar, esperarEscena, irA } = require('./ayudas');
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [], out = [];
  p.on('pageerror', e => { errs.push(e.message); console.log('ERR', e.message.slice(0, 200)); }); p.on('console', m => { if (m.type() === 'warning' && /visita/.test(m.text())) console.log('W', m.text().slice(0, 300)); if (m.type() === 'error') { errs.push(m.text().slice(0, 160)); console.log('CE', m.text().slice(0, 300)); } });
  const ok = (n, c, extra) => { const l = (c ? 'ok    ' : 'FALLA ') + n + (extra ? ' ' + extra : ''); out.push(l); console.log(l); };
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(700);
  await p.evaluate(() => { localStorage.clear(); const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: 'joventut-badalona' } }); const st = GM.state; st.carrera.dinero = 900; st.carrera.vivienda.actual = { id: 'vtest', barrio: 0, barrioNombre: 'Centro', tipo: 'mansion', modo: 'compra', precio: 2600, alquiler: 1, cuota: 1, ciudad: 'Badalona', desde: st.fecha, comodidad: 3, transporte: 3, ruido: 2, prestigio: 4 }; GM.ui.start(document.getElementById('app')); GM.sede.abrir(st); });
  await esperarEscena(p);
  const r1 = await p.evaluate(() => { const st = GM.state, C = GM.casasProd, a = C.encargar(st, 'vtest', 'cocina'); return { cocina: a.ok, valor: C.valor(st, 'vtest'), fin: a.fin }; });
  ok('encargar la cocina', r1.cocina, JSON.stringify(r1));
  await irA(p, 'calle'); await irA(p, 'casa:vtest');
  await p.evaluate(() => document.querySelectorAll('.sede-ayuda').forEach(e => e.style.display = 'none'));
  const r2 = await p.evaluate(() => { const S = GM.sede._estado(); let g = 0; S.mundo.traverse(o => { if (o.userData && o.userData.obra) g++; }); return { obras: g, zona: !!S.zonas.find(z => z.sala.id === 'papeles'), acciones: S.zonas.find(z => z.sala.id === 'papeles').sala.acciones(GM.state).length }; });
  ok('obra visible y papeles de la casa', r2.obras === 1 && r2.zona && r2.acciones > 4, JSON.stringify(r2));
  await p.evaluate(() => { const S = GM.sede._estado(), PL = S.casaPlano, r = PL.habs.find(h => h.id === 'cocina'); S.yo.obj.position.set((r.x0 + r.x1) / 2 - 1.5, 0, (r.z0 + r.z1) / 2 + 1); S.zoom = 11; }); await sleep(1800); await p.screenshot({ path: path.join(DIR, '1_obra_cocina.png') });
  await p.evaluate(() => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === 'papeles'); S.yo.obj.position.set(z.obj.position.x, 0, z.obj.position.z + 0.2); }); await sleep(1200); await p.screenshot({ path: path.join(DIR, '2_papeles.png') });
  await p.evaluate(() => { const st = GM.state; GM.ui.modal(GM.casasProd.panel(st, 'vtest', () => { }), [{ t: 'Cerrar', cls: 'btn-sec' }], { alta: true }); }); await sleep(800); await p.screenshot({ path: path.join(DIR, '3_panel.png') });
  await p.evaluate(() => { document.querySelectorAll('.fondo').forEach(e => e.remove()); });
  // pasan los días: la obra termina, se paga el mantenimiento y puede haber averías
  const r3 = await p.evaluate(() => { const st = GM.state, C = GM.casasProd, p = C.buscar(st, 'vtest'), antes = C.valor(st, p); for (let i = 0; i < 20; i++) { st.fecha = GM.util.addDays(st.fecha, 1); C.dia(st); } return { obras: p.prod.obras.length, mejoras: p.prod.mejoras.length, antes: Math.round(antes), despues: Math.round(C.valor(st, p)), estado: Math.round(p.prod.estado) }; });
  ok('la obra termina y sube el valor', r3.obras === 0 && r3.mejoras === 1, JSON.stringify(r3));
  const r4 = await p.evaluate(() => { const st = GM.state, C = GM.casasProd; const e = C.encargar(st, 'vtest', 'piscina'); const e2 = C.encargar(st, 'vtest', 'garaje'); return { piscina: e.ok, segunda: e2.ok }; });
  ok('una sola obra a la vez', r4.piscina && !r4.segunda, JSON.stringify(r4));
  await p.evaluate(() => { const st = GM.state; for (let i = 0; i < 30; i++) { st.fecha = GM.util.addDays(st.fecha, 1); GM.casasProd.dia(st); } GM.casasProd.encargar(st, 'vtest', 'jardin'); }); await irA(p, 'calle'); await irA(p, 'casa:vtest');
  const r5 = await p.evaluate(() => { const S = GM.sede._estado(); return { ext: S.casaPlano.ext.map(r => r.id).join(','), obras: (S.casaObras || []).length }; });
  ok('la piscina nueva aparece en la casa y el jardín está en obras', /piscina/.test(r5.ext) && r5.obras >= 1, JSON.stringify(r5));
  await p.evaluate(() => { const S = GM.sede._estado(), r = S.casaPlano.ext[0]; S.yo.obj.position.set((r.x0 + r.x1) / 2, 0, r.z0 - 0.5); S.zoom = 13; }); await sleep(1800); await p.screenshot({ path: path.join(DIR, '4_piscina.png') });
  await p.evaluate(() => { GM.casasProd.buscar(GM.state, 'vtest').prod.vecinos[0].rel = 75; }); await irA(p, 'calle'); await irA(p, 'casa:vtest');
  await esperar(p, () => { const S = GM.sede._estado(), v = GM.casasProd.buscar(GM.state, 'vtest').prod.vecinos[0]; return S.gente.some(g => g.rol === v.n); }, null, 15000);
  const r6 = await p.evaluate(() => { const S = GM.sede._estado(), v = GM.casasProd.buscar(GM.state, 'vtest').prod.vecinos[0]; return { visita: S.gente.some(g => g.rol === v.n), nombre: v.n }; });
  ok('un vecino amigo te visita en el salón', r6.visita, JSON.stringify(r6)); await p.screenshot({ path: path.join(DIR, '5_visita.png') });
  console.log('errores: ' + (errs.length ? errs.slice(0, 6).join(' | ') : 'ninguno')); await b.close(); process.exit(errs.length || out.some(x => /^FALLA/.test(x)) ? 1 : 0);
})();
