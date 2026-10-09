// Iluminación y acabado visual: capturas de cada escena en calidad alta (y normal), de día y de noche, y fps.
// Uso: node tools/luz_capturas.js [carpeta] [escenas separadas por comas] [--normal]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const args = process.argv.slice(2), normal = args.includes('--normal'), pos = args.filter(a => !a.startsWith('--'));
const DIR = path.join(__dirname, '..', 'capturas', pos[0] || 'luz'); fs.mkdirSync(DIR, { recursive: true });
const ESC = (pos[1] || 'calle,deportiva,sede,pueblo').split(',');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge', args: ['--use-angle=d3d11', '--enable-gpu'] });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 720 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  for (const esc of ESC) {
    await p.evaluate(([esc, normal]) => {
      if (GM.sede.activa && GM.sede.activa()) GM.sede.cerrar();
      const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' });
      if (esc === 'pueblo') GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
      else GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: pj });
      try { localStorage.removeItem('gm1:rendimiento'); } catch (e) {} window.__sinAdaptar = true;
      GM.campus.config.calidad = normal ? 'normal' : 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, esc);
    }, [esc, normal]);
    await sleep(13000);
    for (const [hora, n] of [[11, 'dia'], [21.5, 'noche']]) {
      await p.evaluate(h => { const S = GM.sede._estado(); S.hora = h; S.tLuz = 0; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); S.zoom = +(window.__zoom || 20); S.inc = +(window.__inc || 0.75); if (window.__foco) { S.yo.obj.position.set(window.__foco[0], 0, window.__foco[1]); S.yo.camino = null; S.foco.set(window.__foco[0], 0, window.__foco[1]); } }, hora);
      await sleep(2500); await p.screenshot({ path: path.join(DIR, esc + '_' + n + (normal ? '_normal' : '') + '.png') });
    }
    console.log(esc, await p.evaluate(() => { const S = GM.sede._estado(); return 'fps ' + S.fps + ', posprocesado ' + (S.composer ? 'sí' : 'no') + ', entorno ' + (S.scene.environment ? 'sí' : 'no') + ', nivel ' + (S.nivelRend || 0); }));
  }
  console.log('avisos y errores:', errs.length ? [...new Set(errs)].slice(0, 6) : 'ninguno');
  await b.close();
})();
