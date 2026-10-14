// Decorar los locales (punto 50, otros espacios): en el restaurante coloca un sofá y una planta, comprueba que se guardan, que al volver siguen ahí, que se pueden usar (interacción) y que se venden. Capturas en capturas/decorar/.
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'); const { sleep, esperarEscena, irA } = require('./ayudas');
const DIR = path.join(__dirname, '..', 'capturas', 'decorar'); fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }), p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [], out = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  const ok = (n, c, x) => { const l = (c ? 'ok    ' : 'FALLA ') + n + (x ? ' ' + x : ''); out.push(l); console.log(l); };
  await p.goto('http://localhost:8080/'); await sleep(700);
  await p.evaluate(() => { const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: 'joventut-badalona' } }); GM.state.carrera.dinero = 200; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state); });
  await esperarEscena(p); await irA(p, 'calle'); await irA(p, 'interior:restaurante');
  ok('el restaurante se puede decorar', await p.evaluate(() => GM.decorar.puede(GM.sede._estado()) && !!document.querySelector('.casa-btn')));
  const r = await p.evaluate(async () => { const S = GM.sede._estado(), M = GM.sede.motor(), st = GM.state, d0 = st.carrera.dinero; await GM.decorar.activar(S, M, true); const res = []; const G = S.G; let puesto = null;
    for (let z = -3; z < 4 && !puesto; z += 0.5) for (let x = -5; x < 6 && !puesto; x += 0.5) if (GM.decorar.libre(S, 'loungeSofa', x, z, 0)) { puesto = [x, z]; }
    const i = GM.casa._i; await i.medir(M, 'loungeSofa'); const antes = GM.decorar.lista(st, 'interior:restaurante').length; GM.decorar.hover(S, { x: puesto[0], z: puesto[1] });
    return { puesto, antes }; });
  await p.evaluate(async () => { const S = GM.sede._estado(), M = GM.sede.motor(); await GM.decorar.toque(S, M, { x: 0, z: 0 }); });
  const r2 = await p.evaluate(async ([x, z]) => { const S = GM.sede._estado(), M = GM.sede.motor(), st = GM.state, d0 = st.carrera.dinero; const i = GM.casa._i; await i.medir(M, 'loungeSofa'); const C = null; return { x, z }; }, r.puesto);
  // se elige y se coloca por la API
  const r3 = await p.evaluate(async ([x, z]) => { const S = GM.sede._estado(), M = GM.sede.motor(), st = GM.state, d0 = st.carrera.dinero; document.querySelectorAll('.cc-item').forEach(b => { if (/Sofá$/.test(b.querySelector('b').textContent)) b.click(); }); await new Promise(r => setTimeout(r, 1200)); GM.decorar.hover(S, { x, z }); await GM.decorar.toque(S, M, { x, z }); return { n: GM.decorar.lista(st, 'interior:restaurante').length, gasto: Math.round((d0 - st.carrera.dinero) * 1000) / 1000, objs: (S.decorObjs || []).length, mueble: S.interiorMuebles.some(q => q[0] === 'loungeSofa') }; }, r.puesto);
  ok('colocar un sofá', r3.n === 1 && r3.gasto > 0 && r3.objs === 1 && r3.mueble, JSON.stringify(r3)); await p.screenshot({ path: path.join(DIR, '1_colocado.png') });
  await p.evaluate(() => GM.decorar.activar(GM.sede._estado(), GM.sede.motor(), false)); await irA(p, 'calle'); await irA(p, 'interior:restaurante');
  const r4 = await p.evaluate(() => { const S = GM.sede._estado(); return { objs: (S.decorObjs || []).length, guardados: GM.decorar.lista(GM.state, 'interior:restaurante').length }; });
  ok('al volver sigue ahí', r4.objs === 1 && r4.guardados === 1, JSON.stringify(r4));
  const r5 = await p.evaluate(async ([x, z]) => { const S = GM.sede._estado(), M = GM.sede.motor(), q = GM.interaccion.cercano(S, { x, z }); return { acciones: q ? GM.interaccion.accionesDe(S, q).length : 0 }; }, r.puesto);
  ok('el mueble nuevo admite acciones', r5.acciones > 0, JSON.stringify(r5));
  const r6 = await p.evaluate(async ([x, z]) => { const S = GM.sede._estado(), M = GM.sede.motor(), st = GM.state, d0 = st.carrera.dinero; await GM.decorar.activar(S, M, true); await GM.decorar.toque(S, M, { x, z }); return { n: GM.decorar.lista(st, 'interior:restaurante').length, devuelto: Math.round((st.carrera.dinero - d0) * 1000) / 1000, objs: S.decorObjs.length }; }, r.puesto);
  ok('vender lo colocado', r6.n === 0 && r6.devuelto > 0 && r6.objs === 0, JSON.stringify(r6));
  console.log('errores: ' + (errs.length ? errs.slice(0, 4).join(' | ') : 'ninguno')); await b.close(); process.exit(errs.length || out.some(x => /^FALLA/.test(x)) ? 1 : 0);
})();
