// Pueblo con todos los edificios (también los nuevos: cine, polígono industrial, panadería, taller, restaurante), sus interiores con varias
// estancias y los vehículos del pueblo. Uso: node tools/pueblo_nuevo.js [carpeta] [--nivel=1|2|max] [interior1,interior2…]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'pueblo_nuevo')); fs.mkdirSync(DIR, { recursive: true });
const NV = (process.argv.find(a => /^--nivel=/.test(a)) || '--nivel=max').split('=')[1];
const SOLO = (process.argv.find(a => a !== process.argv[0] && a !== process.argv[1] && !a.startsWith('--') && a.indexOf(',') >= 0 || /^interior:/.test(a)) || '').replace('interior:', '');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(nv => {
    const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' });
    GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
    const st = GM.state, P = st.carrera.pueblo, E = GM.mods.pueblo.EDI; P.nombre = 'Torrelles del Monte'; P.cariño = 90; st.carrera.fama = 80; P.aportado = 5000; st.carrera.dinero = 5e6;
    P.edificios = Object.keys(E).map(k => ({ tipo: k, nivel: nv === 'max' ? E[k].max : +nv })); P.obras = [];
    GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(st, 'pueblo');
  }, NV);
  await sleep(12000);
  await p.evaluate(() => { GM.sede._clima('sol'); }); await sleep(1500);
  const info = await p.evaluate(() => { const S = GM.sede._estado(); return { conflictos: S.conflictos, lotes: Object.keys(S.lotes), vehiculos: !!S.zonas.find(z => z.sala.id === 'pueblo_vehiculos'), puertas: Object.keys(S.puertas || {}) }; });
  console.log(JSON.stringify(info));
  const foto = async (n, fn) => { if (fn) await p.evaluate(fn); await sleep(1600); await p.evaluate(() => { document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); const S = GM.sede._estado(); if (S.panel) S.panel.style.display = 'none'; }); await p.screenshot({ path: path.join(DIR, n + '.png') }); };
  await foto('1_general', () => { const S = GM.sede._estado(); S.yo.obj.position.set(0, 0, 0); S.zoom = 110; S.inc = 1.15; S.yaw = 0.3; });
  if (process.env.SIN_NUBES) await p.evaluate(() => { GM.sede._estado().mundo.traverse(o => { if (o.userData && o.userData.nube) o.visible = false; }); });
  await foto('1b_paisaje', () => { const S = GM.sede._estado(); S.yo.obj.position.set(0, 0, 40); S.foco.set(0, 0, 40); S.yaw = 0; S.zoom = 150; S.inc = 0.42; });
  await foto('1c_paisaje_lado', () => { const S = GM.sede._estado(); S.yo.obj.position.set(0, 0, 10); S.foco.set(0, 0, 10); S.yaw = 2.3; S.zoom = 170; S.inc = 0.35; });
  await foto('1d_suelo', () => { const S = GM.sede._estado(); S.yo.obj.position.set(52, 0, 30); S.foco.set(52, 0, 30); S.yaw = 0.6; S.zoom = 22; S.inc = 0.55; });
  for (const t of ['cine', 'industrial', 'taller', 'panaderia', 'restaurantep', 'escuela', 'hotel', 'biblioteca', 'casapadres']) {
    const ok = await p.evaluate(t => { const S = GM.sede._estado(), L = S.lotes[t]; if (!L) return false; S.pausa = true; const d = t === 'industrial' ? 34 : 15; S.camera.position.set(L.x + L.fx * d + L.fz * d * 0.45, t === 'industrial' ? 16 : 7.5, L.z + L.fz * d - L.fx * d * 0.45); S.camera.lookAt(L.x + L.fx * 1.5, t === 'industrial' ? 5 : 2.4, L.z + L.fz * 1.5); S.renderer.render(S.scene, S.camera); return true; }, t);
    if (false) await p.evaluate(t => { const S = GM.sede._estado(), L = S.lotes[t]; S.yo.camino = null; S.yo.obj.position.set(L.x + L.fx * 3, 0, L.z + L.fz * 3); S.foco.set(L.x + L.fx * 3, 0, L.z + L.fz * 3); S.zoom = t === 'industrial' ? 52 : 22; S.inc = 0.75; S.yaw = Math.atan2(L.fx, L.fz) + Math.PI + 0.5; return true; }, t);
    if (ok) { await sleep(500); await p.screenshot({ path: path.join(DIR, '2_' + t + '.png') }); } else console.log('sin lote', t);
    await p.evaluate(() => { GM.sede._estado().pausa = false; });
  }
  // Fichas de edificio (panel dentro del pueblo)
  for (const t of ['hotel', 'panaderia', 'cine', 'polideportivo']) {
    const ok = await p.evaluate(t => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === 'pueblo_' + t); if (!z) return false; S.zonaActual = null; S.yo.camino = null; S.yo.obj.position.set(z.obj.position.x, 0, z.obj.position.z + 0.3); S.zoom = 22; S.inc = 0.7; return true; }, t);
    await sleep(2200); await p.screenshot({ path: path.join(DIR, '2b_ficha_' + t + '.png') }); if (!ok) console.log('sin zona', t);
  }
  await foto('3_vehiculos', () => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === 'pueblo_vehiculos'); if (z) { S.yo.camino = null; S.yo.obj.position.set(z.obj.position.x, 0, z.obj.position.z); } S.zoom = 12; S.inc = 0.6; S.yaw = 0.4; });
  // moto
  await p.evaluate(() => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === 'pueblo_vehiculos'); if (z) z.sala.acciones(GM.state)[1].fn(); });
  await foto('4_moto', () => { const S = GM.sede._estado(); S.zoom = 6; S.inc = 0.5; S.yaw = 1.2; GM.sede._motor().irA(S.yo, S.yo.obj.position.x + 8, S.yo.obj.position.z + 2); });
  await sleep(700); await foto('4_moto_b', () => { const S = GM.sede._estado(); S.yaw = 0.5; });
  await p.evaluate(() => GM.ciudadBarrios.bici(false));
  // Interiores
  const tipos = (SOLO ? SOLO.split(',') : ['bar_pueblo', 'casa_padres', 'casa_amigos', 'casa_pueblo', 'escuela', 'biblioteca', 'tienda_pueblo', 'ambulatorio', 'polideportivo', 'hotel', 'cine', 'centrodia', 'panaderia', 'taller', 'restaurante_pueblo', 'industrial', 'pabellon_pueblo']);
  for (const t of tipos) {
    const n0 = errs.length;
    await p.evaluate(t => GM.sede._escena('interior:' + t), t); await sleep(6500);
    const r = await p.evaluate(() => { const S = GM.sede._estado(); return { escena: S.escena, tipo: S.interiorTipo, gente: S.gente.length, zonas: S.zonas.length }; });
    await foto('5_' + t, () => { const S = GM.sede._estado(); S.yo.camino = null; S.yo.obj.position.set(0, 0, -1.5); S.foco.set(0, 0, -3); S.zoom = 34; S.inc = 1.05; S.yaw = 0; });
    console.log(t, JSON.stringify(r), errs.length > n0 ? 'ERRORES: ' + errs.slice(n0, n0 + 2).join(' | ') : 'sin errores');
  }
  // Menú «Mi pueblo» (pantalla de Ciudad)
  await p.evaluate(() => { GM.sede.cerrar(); }); await sleep(1500);
  await p.evaluate(() => { GM.ui.navegar('ciudad'); }); await sleep(1500);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.tabs .tab, .seg .tab, button')].find(x => x.textContent.trim() === 'Mi pueblo'); if (b) b.click(); }); await sleep(7000);
  await p.screenshot({ path: path.join(DIR, '6_menu_pueblo.png') });
  await p.evaluate(() => { const c = document.querySelector('.panel3d'); if (c) c.scrollTop = 600; const b = [...document.querySelectorAll('.pb-edi')][3]; if (b) b.click(); }); await sleep(2500);
  await p.screenshot({ path: path.join(DIR, '6b_menu_pueblo_sel.png') });
  console.log('errores:', errs.filter(e => !/404/.test(e)).slice(0, 8));
  await b.close();
})();
