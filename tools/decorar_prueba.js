// Decorar los locales y la sede: en el restaurante coloca un sofá (pedido con entrega), un muro y un suelo, comprueba que se guarda, que al volver sigue ahí, que se deshace, que admite acciones y que se vende; y repite lo básico en la sede (despacho).
// Capturas en capturas/decorar/. Uso: node tools/decorar_prueba.js   (requiere `npm run serve`)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'); const { sleep, esperarEscena, irA } = require('./ayudas');
const DIR = path.join(__dirname, '..', 'capturas', 'decorar'); fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }), p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [], out = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  const ok = (n, c, x) => { const l = (c ? 'ok    ' : 'FALLA ') + n + (x ? ' ' + x : ''); out.push(l); console.log(l); };
  await p.goto('http://localhost:8080/'); await sleep(700);
  await p.evaluate(() => { const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: 'joventut-badalona' } }); GM.state.carrera.dinero = 400; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state); });
  await esperarEscena(p);
  // ---- la sede (despacho) ----
  ok('la sede se puede decorar', await p.evaluate(() => GM.decorar.puede(GM.sede._estado()) && !!document.querySelector('.casa-btn')));
  const rs = await p.evaluate(async () => { const S = GM.sede._estado(), M = GM.sede.motor(), st = GM.state; await GM.decorar.activar(S, M, true); const i = GM.casa._i; await i.medir(M, 'plantSmall1'); let pos = null; for (let z = -6; z < 8 && !pos; z += 0.5) for (let x = -8; x < 9 && !pos; x += 0.5) if (GM.decorar.libre(S, 'plantSmall1', x, z, 0)) pos = [x, z]; return { pos }; });
  const rs2 = await p.evaluate(async ([x, z]) => { const S = GM.sede._estado(), M = GM.sede.motor(), st = GM.state; await GM.decorar.activar(S, M, true); const C = GM.decorar.estado(); document.querySelectorAll('.cc-cat').forEach(b => { if (b.textContent === 'Decoración') b.click(); }); await new Promise(r => setTimeout(r, 200)); document.querySelectorAll('.cc-item').forEach(b => { if (/Planta pequeña/.test(b.querySelector('b').textContent)) b.click(); }); await new Promise(r => setTimeout(r, 1200)); GM.decorar.hover(S, { x, z }); await GM.decorar.toque(S, M, { x, z }); return { n: GM.decorar.lista(st, 'sede').length }; }, rs.pos);
  ok('colocar una planta en el despacho', rs2.n === 1, JSON.stringify(rs2));
  await p.evaluate(() => GM.decorar.activar(GM.sede._estado(), GM.sede.motor(), false)); await irA(p, 'calle'); await irA(p, 'sede');
  ok('al volver a la sede sigue ahí', await p.evaluate(() => (GM.sede._estado().decorObjs || []).length === 1));
  await p.evaluate(() => { const S = GM.sede._estado(); GM.decorar.lista(GM.state, 'sede').length = 0; });
  await irA(p, 'calle'); await irA(p, 'interior:restaurante');
  ok('el restaurante se puede decorar', await p.evaluate(() => GM.decorar.puede(GM.sede._estado()) && !!document.querySelector('.casa-btn')));
  const r = await p.evaluate(async () => { const S = GM.sede._estado(), M = GM.sede.motor(); await GM.decorar.activar(S, M, true); const i = GM.casa._i; await i.medir(M, 'loungeSofa'); let puesto = null; for (let z = -3; z < 4 && !puesto; z += 0.5) for (let x = -5; x < 6 && !puesto; x += 0.5) if (GM.decorar.libre(S, 'loungeSofa', x, z, 0)) puesto = [x, z]; return { puesto }; });
  const r3 = await p.evaluate(async ([x, z]) => { const S = GM.sede._estado(), M = GM.sede.motor(), st = GM.state, d0 = st.carrera.dinero; document.querySelectorAll('.cc-item').forEach(b => { if (/Sofá$/.test(b.querySelector('b').textContent)) b.click(); }); await new Promise(r => setTimeout(r, 1200)); GM.decorar.hover(S, { x, z }); await GM.decorar.toque(S, M, { x, z }); const L = GM.decorar.lista(st, 'interior:restaurante'); return { n: L.length, gasto: Math.round((d0 - st.carrera.dinero) * 1000) / 1000, llega: L[0] && L[0].llega, caja: (S.decorObjs || []).some(o => o.userData.pedido) }; }, r.puesto);
  ok('colocar un sofá como pedido con entrega', r3.n === 1 && r3.gasto > 0 && r3.llega && r3.caja, JSON.stringify(r3)); await p.screenshot({ path: path.join(DIR, '1_pedido.png') });
  const r4 = await p.evaluate(async () => { const S = GM.sede._estado(), M = GM.sede.motor(), st = GM.state, d0 = st.carrera.dinero; await GM.decorar.deshacer(S, M); return { n: GM.decorar.lista(st, 'interior:restaurante').length, devuelto: Math.round((st.carrera.dinero - d0) * 1000) / 1000, objs: (S.decorObjs || []).length }; });
  ok('deshacer devuelve el dinero', r4.n === 0 && r4.devuelto > 0 && r4.objs === 0, JSON.stringify(r4));
  await p.evaluate(async () => { await GM.decorar.rehacer(GM.sede._estado(), GM.sede.motor()); });
  // muro y suelo
  const r5 = await p.evaluate(async () => { const S = GM.sede._estado(), M = GM.sede.motor(), st = GM.state, C = GM.decorar.estado(), d0 = st.carrera.dinero; C.herr = 'muro'; let hecho = false; for (let z = 3; z > -3 && !hecho; z -= 0.5) { C.ini = null; await GM.decorar.toque(S, M, { x: -4, z }); await GM.decorar.toque(S, M, { x: -1, z }); hecho = GM.decorar.meta(st, 'interior:restaurante').muros.length > 0; } C.herr = null; C.cat = 'Suelo'; C.ini = null;
    document.querySelectorAll('.cc-cat').forEach(b => { if (b.textContent === 'Suelo') b.click(); }); await new Promise(r => setTimeout(r, 200)); const bs = [...document.querySelectorAll('.cc-item')]; if (bs[3]) bs[3].click(); await new Promise(r => setTimeout(r, 800)); const m = GM.decorar.meta(st, 'interior:restaurante'); return { muros: m.muros.length, suelo: m.suelo, malla: S.decorMuros && S.decorMuros.children.length, gasto: Math.round((d0 - st.carrera.dinero) * 1000) / 1000 }; });
  ok('muro y suelo nuevo', r5.muros === 1 && r5.suelo === 3 && r5.malla === 1, JSON.stringify(r5)); await p.screenshot({ path: path.join(DIR, '2_muro_suelo.png') });
  await p.evaluate(() => GM.decorar.activar(GM.sede._estado(), GM.sede.motor(), false)); await irA(p, 'calle'); await irA(p, 'interior:restaurante');
  const r6 = await p.evaluate(() => { const S = GM.sede._estado(), m = GM.decorar.meta(GM.state, 'interior:restaurante'); return { objs: (S.decorObjs || []).length, muros: S.decorMuros && S.decorMuros.children.length, suelo: !!S.decorSuelo }; });
  ok('al volver sigue todo', r6.objs === 1 && r6.muros === 1 && r6.suelo, JSON.stringify(r6));
  const r7 = await p.evaluate(async ([x, z]) => { const S = GM.sede._estado(), M = GM.sede.motor(), st = GM.state, d0 = st.carrera.dinero; await GM.decorar.activar(S, M, true); await GM.decorar.toque(S, M, { x, z }); return { n: GM.decorar.lista(st, 'interior:restaurante').length, objs: S.decorObjs.length }; }, r.puesto);
  ok('vender (cancela el pedido al tocarlo)', r7.n === 0 && r7.objs === 0, JSON.stringify(r7));
  console.log('errores: ' + (errs.length ? errs.slice(0, 4).join(' | ') : 'ninguno')); await b.close(); process.exit(errs.length || out.some(x => /^FALLA/.test(x)) ? 1 : 0);
})();
