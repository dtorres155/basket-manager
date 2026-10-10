// La ciudad real de OpenStreetMap alrededor de la calle. Uso: node tools/osm_capturas.js [club] [carpeta]   (requiere `npm run serve`)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const club = process.argv[2] || 'joventut-badalona', DIR = path.join(__dirname, '..', 'capturas', process.argv[3] || 'osm');
fs.mkdirSync(DIR, { recursive: true }); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8080/'); await sleep(800);
  await p.evaluate(c => { GM.newGame(c, undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }), carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } }); GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); }, club);
  await sleep(13000);
  const vistas = [['1_aerea', [0, 230, 160], [0, 0, -23]], ['2_este', [120, 40, -20], [330, 0, -23]], ['3_norte', [0, 40, -80], [0, 0, -280]], ['4_sur', [-40, 60, 40], [60, 0, 260]]];
  for (const [n, c, t] of vistas) {
    await p.evaluate(([c, t]) => { const S = GM.sede._estado(); S.pausa = true; if (S.scene && S.scene.fog) S.scene.fog.far = 2000; S.camera.far = 3000; S.camera.updateProjectionMatrix(); S.camera.position.set(...c); S.camera.lookAt(...t); if (S.panel) S.panel.style.display = 'none'; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); S.renderer.render(S.scene, S.camera); }, [c, t]);
    await sleep(1500); await p.screenshot({ path: path.join(DIR, n + '.png') });
  }
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno'); await b.close();
})();
