// Vistas aéreas de la ciudad real (para ver huecos entre manzanas y el borde de la ciudad): el juego se congela y la cámara se pone a mano.
// Uso: node tools/aerea.js [club] [carpeta]   (requiere npm run serve)
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const { esperarEscena, sleep } = require('./ayudas');
const club = process.argv[2] || 'joventut-badalona',
  DIR = path.join(__dirname, '..', 'capturas', process.argv[3] || 'aerea');
fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  await p.goto('http://localhost:8080/');
  await p.waitForFunction(() => window.GM && GM.pruebas);
  await p.evaluate(c => {
    GM.newGame(c, 7, { modo: 'carrera', personaje: GM.mods.personaje.crear(), carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } });
    GM.campus.config.calidad = 'alta';
    GM.ajustes.marcarNovedades();
    GM.ui.start(document.getElementById('app'));
    GM.sede.abrir(GM.state, 'calle');
  }, club);
  await esperarEscena(p, 'calle', 150000);
  await sleep(3000);
  const vistas = [
    ['centro_260', [0, 260, 160], [0, 0, 0]],
    ['norte_200', [0, 200, -120], [0, 0, -320]],
    ['horizonte_60', [0, 60, 300], [0, 20, -400]]
  ];
  for (const [n, pos, mira] of vistas) {
    await p.evaluate(
      ([pos, mira]) => {
        const S = GM.sede._estado();
        GM.sede._clima('sol');
        S.velTiempo = 0;
        S.hora = 12;
        S.pausa = true;
        if (S.panel) S.panel.style.display = 'none';
        S.camera.far = 3000;
        S.camera.updateProjectionMatrix();
        S.camera.position.set(...pos);
        S.camera.lookAt(...mira);
        if (S.horizonte && GM.horizonte) GM.horizonte.actualizar(S);
        if (S.cieloDomo && GM.cielo) GM.cielo.actualizar(S, 1);
        S.renderer.render(S.scene, S.camera);
      },
      [pos, mira]
    );
    await sleep(600);
    await p.screenshot({ path: path.join(DIR, n + '.png') });
  }
  await b.close();
})();
