// Prueba y capturas del pueblo para pasear: vista general, plaza, una obra con grúa, el mapa y avanzar un día.
// Uso: node tools/pueblo_paseo.js [estilo]   (requiere `npm run serve`; estilo: castellano, catalan, andaluz o toscano)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'pueblo_paseo'); fs.mkdirSync(DIR, { recursive: true });
const NOMBRE = { castellano: 'Torrelles del Monte', catalan: 'Vilanova de Sau', andaluz: 'Alcudia de la Sierra', toscano: 'Borgo San Pietro' }[process.argv[2] || 'castellano'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 760 } });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  const info = await p.evaluate(nombre => {
    const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' });
    GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
    const st = GM.state, P = st.carrera.pueblo, U = GM.util; P.nombre = nombre; P.cariño = 70; st.carrera.fama = 50; P.aportado = 400; st.carrera.dinero = 2000;
    P.edificios = [{ tipo: 'canasta', nivel: 2 }, { tipo: 'bar', nivel: 1 }, { tipo: 'parque', nivel: 2 }, { tipo: 'polideportivo', nivel: 2 }, { tipo: 'casapadres', nivel: 2 }, { tipo: 'plaza', nivel: 2 }, { tipo: 'alumbrado', nivel: 1 }, { tipo: 'mural', nivel: 3 }, { tipo: 'escuela', nivel: 1 }];
    P.obras = [{ tipo: 'hotel', dest: 1, inicio: U.addDays(st.fecha, -40), fin: U.addDays(st.fecha, 20) }, { tipo: 'biblioteca', dest: 1, inicio: U.addDays(st.fecha, -5), fin: U.addDays(st.fecha, 25) }, { tipo: 'ambulatorio', dest: 1, inicio: U.addDays(st.fecha, -30), fin: U.addDays(st.fecha, 1) }];
    GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(st, 'pueblo');
    return GM.mods.pueblo.estado(st);
  }, NOMBRE);
  await sleep(11000);
  const foto = async (nombre, fn) => { if (fn) await p.evaluate(fn); await sleep(1500); await p.screenshot({ path: path.join(DIR, nombre + '.png') }); };
  await foto('1_general', () => { const S = GM.sede._estado(); S.yo.obj.position.set(0, 0, 0); S.zoom = 70; S.inc = 1.15; });
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
  await foto('7_tras_un_dia', () => { const S = GM.sede._estado(); S.yo.obj.position.set(0, 0, 0); S.zoom = 70; S.inc = 1.15; });
  console.log('pueblo', JSON.stringify({ nivel: info.nivel, etiqueta: info.etiqueta }), '| acciones en la biblioteca:', acciones || panel, '| tras un día:', JSON.stringify(tras));
  console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
