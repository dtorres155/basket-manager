// Pabellón y monumento de varios clubes (arquitectura_club.js). Uso: node tools/pabellones.js [carpeta] [club1,club2…]   (requiere `npm run serve`)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', process.argv[2] || 'pabellones'); fs.mkdirSync(DIR, { recursive: true }); const sleep = ms => new Promise(r => setTimeout(r, ms));
const CLUBES = (process.argv[3] || 'fc-barcelona,real-madrid,olympiacos,new-york-knicks,joventut-badalona,fenerbahce,unicaja,alba-berlin,boston-celtics').split(',');
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' }), p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  for (const club of CLUBES) {
    const ok = await p.evaluate(club => { try { if (GM.sede.activa()) GM.sede.cerrar(); const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }); GM.newGame(club, undefined, { modo: 'gestor', personaje: pj }); GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); return true; } catch (e) { return String(e); } }, club);
    if (ok !== true) { console.log(club, ok); continue; } await sleep(12500);
    const info = await p.evaluate(() => { const S = GM.sede._estado(); S.pausa = true; if (S.panel) S.panel.style.display = 'none'; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); S.camera.position.set(-5, 15, 14); S.camera.lookAt(-19.5, 3.5, -15); S.renderer.render(S.scene, S.camera); return GM.state.equipos[GM.state.clubId].pais; });
    await sleep(500); await p.screenshot({ path: path.join(DIR, club + '.png') });
    await p.evaluate(() => { const S = GM.sede._estado(); S.camera.position.set(30, 75, -40); S.camera.lookAt(30, 8, -122); S.renderer.render(S.scene, S.camera); }); await sleep(500); await p.screenshot({ path: path.join(DIR, 'monumento_' + club + '.png') });
    console.log(club, info);
  }
  console.log('errores:', errs.slice(0, 4)); await b.close();
})();
