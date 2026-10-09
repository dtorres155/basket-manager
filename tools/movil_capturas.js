// Capturas del estilo (disciplinado o rebelde) y del móvil: tarjeta en Inicio, planes, lista de chats, un chat con decisión y el
// botón en el mundo 3D. Uso: node tools/movil_capturas.js [dias] [estilo -100..100]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'movil'); fs.mkdirSync(DIR, { recursive: true });
const DIAS = +(process.argv[2] || 40), V = +(process.argv[3] || -60), sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  const info = await p.evaluate(([DIAS, V]) => {
    const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' });
    GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
    const st = GM.state; st.carrera.dinero = 400; GM.mods.estilo.mover(st, V, 'Captura');
    for (let i = 0; i < DIAS; i++) GM.mods.competiciones.jugarDia(st);
    GM.mods.estilo.hacer(st, 'fiesta'); GM.ui.start(document.getElementById('app'));
    return { estilo: GM.mods.estilo.estado(st), chats: GM.mods.movil.chats(st).map(c => c.nombre + ' (' + c.noLeidos + (c.pendientes ? ', decidir' : '') + ')').join(', ') };
  }, [DIAS, V]);
  await sleep(800); await p.screenshot({ path: path.join(DIR, '1_inicio.png') });
  await p.evaluate(() => { const c = document.querySelector('.estilo'); if (c) c.scrollIntoView(); }); await sleep(300); await p.screenshot({ path: path.join(DIR, '2_estilo.png') });
  await p.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Hacer planes').click()); await sleep(500); await p.screenshot({ path: path.join(DIR, '3_planes.png') });
  await p.evaluate(() => document.querySelectorAll('.fondo').forEach(f => f.remove()));
  await p.evaluate(() => document.querySelector('.movil-btn').click()); await sleep(500); await p.screenshot({ path: path.join(DIR, '4_movil.png') });
  const abierto = await p.evaluate(() => { const c = [...document.querySelectorAll('.movil-chat')].find(x => x.querySelector('.movil-pend')) || document.querySelector('.movil-chat'); if (!c) return null; c.click(); return c.querySelector('b').textContent; });
  await sleep(500); await p.screenshot({ path: path.join(DIR, '5_chat.png') });
  const resp = await p.evaluate(() => { const b = document.querySelector('.movil-ops .btn'); if (!b) return 'sin decisiones'; const t = b.textContent; b.click(); return t; });
  await sleep(500); await p.screenshot({ path: path.join(DIR, '6_respondido.png') });
  await p.evaluate(() => { document.querySelectorAll('.fondo').forEach(f => f.remove()); GM.campus.config.calidad = 'alta'; GM.sede.abrir(GM.state, 'calle'); }); await sleep(9000);
  await p.screenshot({ path: path.join(DIR, '7_mundo.png') });
  console.log(JSON.stringify(info), '| chat abierto:', abierto, '| respuesta:', resp, '| errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
