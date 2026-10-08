// Prueba y capturas del pueblo para pasear: vista general, plaza, una obra con grúa, el mapa y avanzar un día.
// Uso: node tools/pueblo_paseo.js [estilo]   (requiere `npm run serve`; estilo: castellano, catalan, andaluz o toscano)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'pueblo_paseo'); fs.mkdirSync(DIR, { recursive: true });
const NIVEL = +(process.argv.find(a => /^--nivel=/.test(a)) || '--nivel=3').split('=')[1];
const NOMBRE = { castellano: 'Torrelles del Monte', catalan: 'Vilanova de Sau', andaluz: 'Alcudia de la Sierra', toscano: 'Borgo San Pietro' }[(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'castellano')];
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 760 } });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  const info = await p.evaluate(([nombre, NIVEL]) => {
    const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' });
    GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
    const st = GM.state, P = st.carrera.pueblo, U = GM.util; P.nombre = nombre; P.cariño = 30 + NIVEL * 12; st.carrera.fama = 10 + NIVEL * 12; P.aportado = 0; while (GM.mods.pueblo.estado(st).nivel < NIVEL && P.aportado < 9000) P.aportado += 20; st.carrera.dinero = 2000;
    const E = GM.mods.pueblo.EDI; P.edificios = NIVEL >= 5 ? Object.keys(E).filter(k => ['hotel', 'biblioteca', 'ambulatorio'].indexOf(k) < 0).map(k => ({ tipo: k, nivel: E[k].max })) : [{ tipo: 'canasta', nivel: 2 }, { tipo: 'bar', nivel: 1 }, { tipo: 'parque', nivel: 2 }, { tipo: 'polideportivo', nivel: 2 }, { tipo: 'casapadres', nivel: 2 }, { tipo: 'plaza', nivel: 2 }, { tipo: 'alumbrado', nivel: 1 }, { tipo: 'mural', nivel: 3 }, { tipo: 'escuela', nivel: 1 }];
    P.obras = [{ tipo: 'hotel', dest: 1, inicio: U.addDays(st.fecha, -40), fin: U.addDays(st.fecha, 20) }, { tipo: 'biblioteca', dest: 1, inicio: U.addDays(st.fecha, -5), fin: U.addDays(st.fecha, 25) }, { tipo: 'ambulatorio', dest: 1, inicio: U.addDays(st.fecha, -30), fin: U.addDays(st.fecha, 1) }];
    GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(st, 'pueblo');
    return GM.mods.pueblo.estado(st);
  }, [NOMBRE, NIVEL]);
  await sleep(11000);
  // Plano de ocupación: calles, parcelas, casas, muralla y árboles, con el nombre de cada parcela
  const plano = await p.evaluate(() => { const S = GM.sede._estado(), D = S.ocupacion.datos(), e = 6, c = document.createElement('canvas'); c.width = D.W * e; c.height = D.H * e; const x = c.getContext('2d'); const COL = ['#efe9da', '#c9b48a', '#e67e22', '#7f8c8d', '#2c3e50', '#6aa84f']; for (let j = 0; j < D.H; j++) for (let i = 0; i < D.W; i++) { x.fillStyle = COL[D.b[j * D.W + i]]; x.fillRect(i * e, j * e, e, e); } x.font = 'bold 13px sans-serif'; x.fillStyle = '#000'; x.textAlign = 'center'; Object.keys(S.lotes).forEach(k => { const L = S.lotes[k]; x.fillText(k, (L.x - D.x0) * e, (L.z - D.z0) * e); }); return c.toDataURL('image/png'); });
  fs.writeFileSync(path.join(DIR, '0_plano.png'), Buffer.from(plano.split(',')[1], 'base64'));
  const foto = async (nombre, fn) => { if (fn) await p.evaluate(fn); await sleep(1500); await p.screenshot({ path: path.join(DIR, nombre + '.png') }); };
  await foto('1_general', () => { const S = GM.sede._estado(); S.yo.obj.position.set(0, 0, 0); S.zoom = 95; S.inc = 1.2; });
  await foto('8_paisaje', () => { const S = GM.sede._estado(); S.yo.obj.position.set(0, 0, 40); S.yaw = 0; S.zoom = 150; S.inc = 0.42; });
  await foto('9_paisaje_lado', () => { const S = GM.sede._estado(); S.yo.obj.position.set(0, 0, 10); S.yaw = 2.3; S.zoom = 170; S.inc = 0.35; });
  await p.evaluate(() => { const S = GM.sede._estado(); S.yaw = 0; });
  await foto('2_puerta', () => { const S = GM.sede._estado(); S.zoom = 22; S.inc = 0.75; S.foco.copy(S.yo.obj.position); });
  await foto('3_plaza', () => { const S = GM.sede._estado(); S.yo.obj.position.set(0, 0, 8); S.zoom = 24; S.inc = 0.7; });
  await foto('4_obra_hotel', () => { const S = GM.sede._estado(), L = S.lotes.hotel; S.yo.obj.position.set(L.zx, 0, L.zz); S.zoom = 26; S.inc = 0.65; });
  const panel = await p.evaluate(() => { const S = GM.sede._estado(); const z = S.zonas.find(z => z.sala.id === 'pueblo_biblioteca'); S.yo.obj.position.copy(z.obj.position); return [...document.querySelectorAll('.sede-sala .sp-accion b')].map(b => b.textContent).join(' | '); });
  await sleep(1500);
  const acciones = await p.evaluate(() => [...document.querySelectorAll('.sede-sala .sp-accion b')].map(b => b.textContent).join(' | '));
  await foto('5_panel_obra');
  await p.evaluate(() => { [...document.querySelectorAll('.sede-top button')].find(b => b.textContent === 'Mapa').click(); });
  await foto('6_mapa');
  await p.evaluate(() => { const c = document.querySelector('.sede-mapa'); if (c) c.remove(); [...document.querySelectorAll('.sede-top button')].find(b => b.textContent === 'Avanzar un día').click(); });
  await sleep(6000);
  const tras = await p.evaluate(() => { const st = GM.state; return { fecha: st.fecha, obras: (st.carrera.pueblo.obras || []).map(o => o.tipo).join(','), ambulatorio: (st.carrera.pueblo.edificios.find(b => b.tipo === 'ambulatorio') || {}).nivel || 0, escena: GM.sede._estado().escena, gente: GM.sede._estado().gente.length }; });
  await foto('7_tras_un_dia', () => { const S = GM.sede._estado(); S.yo.obj.position.set(0, 0, 0); S.zoom = 95; S.inc = 1.2; });
  const extra = await p.evaluate(() => { const S = GM.sede._estado(); return { conflictos: S.conflictos, casas: S.nCasas, fuera: S.nCasasFuera }; });
  console.log('pueblo', JSON.stringify({ nivel: info.nivel, etiqueta: info.etiqueta }), '| casas', extra.casas, '(fuera ' + extra.fuera + ')', '| conflictos:', extra.conflictos && extra.conflictos.length ? extra.conflictos.join('; ') : 'ninguno', '| acciones en la biblioteca:', acciones || panel, '| tras un día:', JSON.stringify(tras));
  console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
