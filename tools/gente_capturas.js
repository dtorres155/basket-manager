// Capturas de la gente con nombre: en la calle (leyenda, utillero, peña, periodista) y en el pueblo (primer entrenador, alcalde), con su ficha.
// Uso: node tools/gente_capturas.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'gente'); fs.mkdirSync(DIR, { recursive: true });
const CLUB = process.argv[2] || 'joventut-badalona', sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1000, height: 720 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  for (const escena of ['calle', 'pueblo']) {
    await p.evaluate(([club, escena]) => {
      if (GM.sede.activa()) GM.sede.cerrar();
      const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' });
      GM.newGame(club, undefined, { modo: 'carrera', personaje: pj, carrera: { origen: 'europa', clubId: club, pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
      GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, escena);
    }, [CLUB, escena]);
    await sleep(escena === 'pueblo' ? 12000 : 9000);
    const quienes = await p.evaluate(() => GM.sede._estado().gente.filter(n => n.charla).map(n => n.charla));
    console.log(escena, 'con nombre:', quienes.join(', ') || 'nadie');
    for (const id of quienes) {
      const txt = await p.evaluate(id => {
        const S = GM.sede._estado(), n = S.gente.find(x => x.charla === id), q = n.obj.position;
        S.yo.obj.position.set(q.x + 2.6, 0, q.z + 2.6); S.yo.ruta = null; S.ficha.style.display = 'none';
        const r = S.renderer.domElement.getBoundingClientRect(); S.camera.updateMatrixWorld();
        return [r.left, r.top, r.width, r.height];
      }, id);
      await sleep(2500);
      // tocar a la persona: se proyecta su cabeza a la pantalla
      const xy = await p.evaluate(id => { const S = GM.sede._estado(), n = S.gente.find(x => x.charla === id), v = n.obj.position.clone(); v.y = 1.2; v.project(S.camera); const r = S.renderer.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; }, id);
      await p.mouse.click(xy[0], xy[1]); await sleep(700);
      if (await p.evaluate(() => GM.sede._estado().ficha.style.display !== 'flex')) { await sleep(1500); const xy2 = await p.evaluate(id => { const S = GM.sede._estado(), n = S.gente.find(x => x.charla === id), v = n.obj.position.clone(); v.y = 1.2; v.project(S.camera); const r = S.renderer.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; }, id); await p.mouse.click(xy2[0], xy2[1]); await sleep(700); }
      const ficha = await p.evaluate(() => { const F = GM.sede._estado().ficha; return F.style.display === 'flex' ? F.innerText.replace(/\n+/g, ' | ') : '(sin ficha)'; });
      console.log(' ', id, '->', ficha);
      await p.screenshot({ path: path.join(DIR, escena + '_' + id + '.png') });
    }
  }
  console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
