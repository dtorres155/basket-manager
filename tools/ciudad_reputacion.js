// La ciudad según la reputación y la afición: compara un club modesto y uno grande, y el día de partido en casa.
// Uso: node tools/ciudad_reputacion.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'ciudad_reputacion'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 760 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  for (const [nombre, rep, afi, partido] of [['modesto', 45, 35, false], ['grande', 85, 80, false], ['partido', 85, 80, true]]) {
    await p.evaluate(([rep, afi, partido]) => {
      if (GM.sede.activa()) GM.sede.cerrar();
      GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) });
      const st = GM.state; st.equipos[st.clubId].reputacion = rep; st.ciudad[st.clubId].aficion = afi;
      if (partido) { const g = st.calendario.find(x => !x.resultado && x.local === st.clubId); st.fecha = g.fecha; }
      GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(st, 'calle');
    }, [rep, afi, partido]);
    await sleep(13000);
    const vistas = partido ? [['multitud', -22, 0, 0.3, 30, 0.6]] : [['oeste', -96, 0, 0.5, 55, 0.8], ['norte', 100, -50, 2.4, 70, 0.8]];
    for (const [n, x, z, yaw, zoom, inc] of vistas) {
      await p.evaluate(([x, z, yaw, zoom, inc]) => { const S = GM.sede._estado(); S.yo.obj.position.set(x, 0, z); S.yo.camino = null; S.yaw = S.yawObj = yaw; S.zoom = zoom; S.inc = inc; if (S.panel) S.panel.style.display = 'none'; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); }, [x, z, yaw, zoom, inc]);
      await sleep(2200); await p.screenshot({ path: path.join(DIR, nombre + '_' + n + '.png') });
    }
    console.log(nombre, await p.evaluate(() => { const S = GM.sede._estado(); return 'multitud: ' + (S.multitud ? 'sí' : 'no') + ', día: ' + S.dia.texto; }));
  }
  console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
