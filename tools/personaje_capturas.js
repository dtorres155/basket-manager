// Capturas de tu personaje en 3D (sede) con distintos aspectos: complementos, complexión, cuerpo y ropa.
// Uso: node tools/personaje_capturas.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'personaje'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CASOS = [
  ['completo', 'gestor', { pelo: 0, gafas: 2, barba: 2, accesorio: 3, tatuaje: 2, complexion: 2, ropa: 3, piel: 3 }],
  ['traje', 'gestor', { pelo: 1, gafas: 1, barba: 3, accesorio: 0, tatuaje: 3, complexion: 0, ropa: 0, piel: 0, altura: 2 }],
  ['femenino', 'presidente', { cuerpo: 1, pelo: 3, gafas: 1, ropa: 1, piel: 2, altura: 0 }],
  ['jugador', 'carrera', { pelo: 2, accesorio: 3, tatuaje: 1, complexion: 1, piel: 4 }]
];
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 2 }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  for (const [nombre, modo, asp] of CASOS) {
    await p.evaluate(([modo, asp]) => {
      if (GM.sede.activa()) GM.sede.cerrar();
      const pj = Object.assign(GM.mods.personaje.crear(), asp, { nombre: 'Marc', apellido: 'Soler' });
      GM.newGame('joventut-badalona', undefined, modo === 'carrera' ? { modo, personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } } : { modo, personaje: pj });
      GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state);
    }, [modo, asp]);
    await sleep(7000);
    await p.evaluate(() => { const S = GM.sede._estado(); document.querySelectorAll('.sede-panel, .panel-sala').forEach(e => e.remove()); S.yo.obj.position.set(7, 0, -4.2); S.yo.obj.rotation.y = 0; S.yo.ruta = null; S.yo.dest = null; S.yaw = 0; S.inc = 0.22; S.zoom = 4.6; });
    await sleep(1200);
    await p.screenshot({ path: path.join(DIR, nombre + '.png') }); await p.screenshot({ path: path.join(DIR, nombre + '_cara.png'), clip: { x: 360, y: 60, width: 180, height: 140 } });
    console.log(nombre, 'listo');
  }
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
