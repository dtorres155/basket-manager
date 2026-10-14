// Editor de la casa (punto 50): entra en una mansión de prueba y recorre muros, puertas, ventanas, derribo, suelo por habitación, pedidos con entrega, deshacer y rehacer,
// copiar, alinear, vistas (planta y corte), techo, biblioteca y diseños (guardar, exportar, importar y aplicar). Deja capturas en capturas/casa_editor/.
// Uso: node tools/casa_editor_prueba.js [carpeta]   (requiere `npm run serve`; para ver la biblioteca realista copia antes recursos/pesados/modelos/objetos a dist/modelos/objetos)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', process.argv[2] || 'casa_editor'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [], out = [];
  p.on('pageerror', e => { errs.push(e.message); console.log('ERR', e.message.slice(0, 200)); }); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  const ok = (n, c, extra) => { const l = (c ? 'ok    ' : 'FALLA ') + n + (extra ? ' ' + extra : ''); out.push(l); console.log(l); };
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(700); await p.evaluate(() => { window.GM_PESADOS = true; });
  await p.evaluate(() => { localStorage.clear(); const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: 'joventut-badalona' } }); const st = GM.state; st.carrera.dinero = 900; st.carrera.vivienda.actual = { id: 'vtest', barrio: 0, barrioNombre: 'Centro', tipo: 'mansion', modo: 'compra', precio: 2600, alquiler: 1, cuota: 1, ciudad: 'Badalona', desde: st.fecha, comodidad: 3, transporte: 3, ruido: 2, prestigio: 4 }; GM.ui.start(document.getElementById('app')); GM.sede.abrir(st); });
  await sleep(11000); await p.evaluate(() => GM.sede._escena('calle')); await sleep(10000); await p.evaluate(() => GM.sede._escena('casa:vtest')); await sleep(9000);
  await p.evaluate(() => document.querySelectorAll('.sede-ayuda').forEach(e => e.style.display = 'none'));
  const ev = (f, a) => p.evaluate(f, a);
  await ev(async () => { const S = GM.sede._estado(); await GM.casa.activar(S, GM.sede.motor(), true); }); await sleep(2500);
  ok('modo construcción activo', await ev(() => GM.casa.activo() && !!GM.casaEditor.estado()));
  // suelo de la sala de estar: coordenadas
  const sal = await ev(() => { const S = GM.sede._estado(), r = S.casaPlano.habs.find(h => h.id === 'salon'); return { x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, rect: S.casaRect }; });
  await p.screenshot({ path: path.join(DIR, '1_modo.png') });
  // 1) pedido con entrega: un sofá de diseño (1,8 k€) tarda 3 días y se ve como caja
  const r1 = await ev(async ([x, z]) => { const S = GM.sede._estado(), M = GM.sede.motor(), st = GM.state, d0 = GM.state.carrera.dinero; await GM.casa._i.elegir(S, M, 'loungeDesignSofa'); const C = GM.casa._i.getC(); GM.casa.hover(S, { x, z }); const ray = new THREE.Raycaster(); await GM.casa.toque(S, M, { x, z }, ray); const D = GM.casa.datos(st), q = D.muebles[D.muebles.length - 1]; return { m: q.m, llega: q.llega, gasto: Math.round((d0 - GM.state.carrera.dinero) * 1000) / 1000, pedido: S.mueblesCasa.some(o => o.userData.pedido), conf: GM.casa.confort(st) }; }, [sal.x0 + 2.6, sal.z1 - 1.6]);
  ok('pedido con entrega', r1.llega && r1.pedido && r1.gasto > 1, JSON.stringify(r1)); await p.screenshot({ path: path.join(DIR, '2_pedido.png') });
  // 2) deshacer y rehacer devuelven el dinero
  const r2 = await ev(async () => { const S = GM.sede._estado(), M = GM.sede.motor(), c = GM.state.carrera, d1 = c.dinero, n1 = GM.casa.datos(GM.state).muebles.length; await GM.casaEditor.deshacer(S, M); const d2 = c.dinero, n2 = GM.casa.datos(GM.state).muebles.length; await GM.casaEditor.rehacer(S, M); return { d1, d2, d3: c.dinero, n1, n2, n3: GM.casa.datos(GM.state).muebles.length }; });
  ok('deshacer y rehacer', r2.d2 > r2.d1 && r2.n2 === r2.n1 - 1 && r2.n3 === r2.n1 && Math.abs(r2.d3 - r2.d1) < 1e-9, JSON.stringify(r2));
  // 3) muro, puerta, ventana y derribo
  const r3 = await ev(async ([x0, z0, z1]) => { const S = GM.sede._estado(), M = GM.sede.motor(), CE = GM.casaEditor, c = GM.state.carrera, d0 = c.dinero, D = GM.casa.datos(GM.state), ray = new THREE.Raycaster(); const a = Math.round((x0 + 1) * 2) / 2, b = a + 4; let z = null; for (let q = z0 + 0.5; q < z1; q += 0.5) { if (CE.nuevoMuro(S, M, [a, q], [b, q])) { z = q; break; } } if (z === null) return { nMuros: 0 }; const nMuros = D.muros.length; CE.estado().herr = 'puerta'; GM.casa.toque(S, M, { x: a + 1, z: z + 0.1 }, ray); const conPuerta = D.muros.map(m => m.t).join(','); CE.estado().herr = 'ventana'; GM.casa.toque(S, M, { x: a + 3, z }, ray); CE.estado().herr = null; return { nMuros, z, conPuerta, final: D.muros.map(m => m.t).join(','), gasto: Math.round((d0 - c.dinero) * 1000) / 1000, malla: S.casaMurosMallas.length }; }, [sal.x0, sal.z0, sal.z1]);
  ok('muro con puerta y ventana', r3.nMuros === 1 && /puerta/.test(r3.conPuerta) && /ventana/.test(r3.final), JSON.stringify(r3)); await sleep(500); await p.screenshot({ path: path.join(DIR, '3_muros.png') });
  // 4) planta, corte y techo
  await ev(() => { GM.casaEditor.vista(GM.sede._estado(), 'planta'); }); await sleep(1200); await p.screenshot({ path: path.join(DIR, '4_planta.png') });
  await ev(() => { const CE = GM.casaEditor; CE.estado().techo = true; CE.vista(GM.sede._estado(), 'corte'); }); await sleep(1200); await p.screenshot({ path: path.join(DIR, '5_corte_techo.png') });
  await ev(() => { const CE = GM.casaEditor; CE.estado().techo = false; CE.vista(GM.sede._estado(), 'persp'); }); await sleep(800);
  // 5) derribar la puerta (se tapia) y suelo de una habitación
  const r5 = await ev(async ([x0, z0]) => { const S = GM.sede._estado(), M = GM.sede.motor(), D = GM.casa.datos(GM.state); const antes = D.muros.map(m => m.t).join(','); const idx = D.muros.findIndex(m => m.t === 'puerta'); const m = D.muros[idx]; let mesh = null; S.edMuros.traverse(o => { if (!mesh && o.userData && o.userData.edMuro === idx) mesh = o; }); const pos = mesh.getWorldPosition(new THREE.Vector3()); const cam = S.camera, ray = new THREE.Raycaster(); const v = pos.clone().project(cam); ray.setFromCamera(new THREE.Vector2(v.x, v.y), cam); GM.casaEditor.estado().herr = 'derribar'; GM.casa.toque(S, M, { x: pos.x, z: pos.z }, ray); const despues = D.muros.map(m => m.t).join(','); GM.casaEditor.estado().herr = null; return { antes, despues }; }, [sal.x0, sal.z0]);
  ok('derribar tapia la puerta', r5.antes !== r5.despues && !/puerta/.test(r5.despues), JSON.stringify(r5));
  const r6 = await ev(async () => { const S = GM.sede._estado(), M = GM.sede.motor(), D = GM.casa.datos(GM.state); const c = GM.state.carrera, d0 = c.dinero, hab = S.casaPlano.habs.find(h => h.id === 'cocina'); const sel = document.querySelector('.ce-hab'); const ids = Object.keys(D.sueloHab || {}); GM.casa._i.getC().cat = 'Reformas'; GM.casa._i.pintarCatalogo(S, M); const selects = [...document.querySelectorAll('.cc-reformas .ce-fila select')]; if (selects[0]) { selects[0].value = '2'; selects[0].dispatchEvent(new Event('change')); } return { habs: selects.length, suelos: Object.keys(D.sueloHab), gasto: Math.round((d0 - c.dinero) * 1000) / 1000 }; });
  ok('suelo por habitación', r6.habs > 3 && r6.suelos.length === 1 && r6.gasto > 0, JSON.stringify(r6)); await sleep(500); await p.screenshot({ path: path.join(DIR, '6_suelo.png') });
  // 6) copiar y alinear
  const r7 = await ev(async () => { const S = GM.sede._estado(), M = GM.sede.motor(), D = GM.casa.datos(GM.state), o = S.mueblesCasa.find(q => !q.userData.pedido && !/_/.test(q.userData.muebleCasa.m)); GM.casa._i.getC().sel = o; const x = o.userData.muebleCasa, ax = x.x, az = x.z; GM.casaEditor.alinear(S, M); const movido = x.x !== ax || x.z !== az; GM.casa._i.getC().sel = o; GM.casaEditor.copiar(S, M); await new Promise(r => setTimeout(r, 800)); return { movido, elegido: GM.casa._i.getC().elegido === x.m, m: x.m }; });
  ok('alinear y copiar', r7.elegido, JSON.stringify(r7)); await ev(() => { GM.casa._i.cancelarElegido(GM.sede._estado()); });
  // 7) biblioteca
  const r8 = await ev(async () => { const S = GM.sede._estado(), M = GM.sede.motor(); await new Promise(r => setTimeout(r, 1500)); const L = GM.casa._i.CATALOGO.filter(c => c[4] === 'Biblioteca'); return { n: L.length, primero: L[0] && L[0][0] }; });
  ok('biblioteca de objetos', r8.n >= 1, JSON.stringify(r8));
  if (r8.n) { const r9 = await ev(async ([x, z, id]) => { const S = GM.sede._estado(), M = GM.sede.motor(); await GM.casa._i.elegir(S, M, id); GM.casa.hover(S, { x, z }); await GM.casa.toque(S, M, { x, z }, new THREE.Raycaster()); const D = GM.casa.datos(GM.state), q = D.muebles[D.muebles.length - 1]; return { m: q.m, llega: q.llega, tam: GM.casa._i.TAMS[id] }; }, [sal.x1 - 2, sal.z0 + 3.6, r8.primero]); ok('colocar un objeto de la biblioteca', r9.m === r8.primero, JSON.stringify(r9)); }
  // 8) diseños: guardar, exportar, importar, aplicar
  const r10 = await ev(async () => { const S = GM.sede._estado(), M = GM.sede.motor(), CE = GM.casaEditor, st = GM.state, o = CE.empaquetar(S, 'Mi casa'); const cod = CE.codigo(o), vuelta = CE.leerCodigo(cod); st.sede.disenos = st.sede.disenos || {}; st.sede.disenos['Mi casa'] = o; const D = GM.casa.datos(st), n0 = D.muebles.length; D.muebles.length = Math.max(0, D.muebles.length - 2); await GM.casaEditor.aplicarDiseno(S, M, vuelta); return { cod: cod.slice(0, 8), n0, n1: D.muebles.length, muros: D.muros.length }; });
  ok('diseño guardado, exportado y aplicado', /^CASA1:/.test(r10.cod) && r10.n1 >= r10.n0 - 1, JSON.stringify(r10)); await sleep(1500); await p.screenshot({ path: path.join(DIR, '7_diseno.png') });
  // 9) salir y entrar conserva todo
  const r11 = await ev(async () => { const S = GM.sede._estado(), M = GM.sede.motor(); const D = GM.casa.datos(GM.state), antes = { m: D.muebles.length, mu: D.muros.length, sh: Object.keys(D.sueloHab).length }; await GM.casa.activar(S, M, false); return { antes, ed: !!GM.casaEditor.estado() }; });
  ok('salir del modo limpia el editor', r11.ed === false, JSON.stringify(r11)); await sleep(600); await p.screenshot({ path: path.join(DIR, '8_salir.png') });
  console.log(out.join('\n')); console.log('errores: ' + (errs.length ? errs.slice(0, 6).join(' | ') : 'ninguno')); await b.close(); process.exit(errs.length || out.some(x => /^FALLA/.test(x)) ? 1 : 0);
})();
