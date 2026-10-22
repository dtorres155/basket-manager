// Las personas de Mixamo dentro del juego (solo calidad alta y con modelos/personas/mixamo): cuántas hay en la escena, tu personaje y capturas. Uso: node tools/mixamo_juego.js [escena] [modo] (requiere npm run serve y mixamo_instalar.js --dist)
const { chromium } = require('playwright');
const fs = require('fs');
const { esperarEscena, sleep } = require('./ayudas');
const escena = process.argv[2] || 'calle',
  modo = process.argv[3] || 'gestor';
(async () => {
  fs.mkdirSync('capturas/mixamo2', { recursive: true });
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text());
  });
  await p.goto('http://localhost:8080/');
  await sleep(800);
  await p.evaluate(
    ([m]) => {
      GM.newGame('joventut-badalona', 11, {
        modo: m,
        personaje: GM.mods.personaje.crear(),
        carrera: m === 'carrera' ? { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } : undefined
      });
      GM.campus.config.calidad = 'alta';
      GM.ui.start(document.getElementById('app'));
      GM.sede.abrir(GM.state, 'calle');
    },
    [modo]
  );
  await esperarEscena(p, escena.split(':')[0], 150000);
  if (escena !== 'calle') {
    await p.evaluate(d => GM.sede._escena(d), escena);
    await sleep(300);
    await esperarEscena(p, escena, 150000);
  }
  await sleep(8000);
  const r = await p.evaluate(() => {
    const S = GM.sede._estado();
    return {
      yo: S.yo && S.yo.mixamo,
      gente: S.gente.length,
      mixamo: S.gente.filter(n => n.mixamo).length,
      mallas: (() => {
        let k = 0;
        S.gente
          .filter(n => n.mixamo)
          .forEach(n =>
            n.obj.traverse(m => {
              if (m.isSkinnedMesh) k++;
            })
          );
        return k;
      })(),
      ejemplos: S.gente
        .filter(n => n.mixamo)
        .slice(0, 4)
        .map(n => n.mixamo + ':' + (n.actual || ''))
    };
  });
  console.log(JSON.stringify(r));
  // cierra el panel de la zona y acerca la cámara a tu personaje (y a un vecino con modelo de Mixamo, si hay)
  await p.evaluate(() => {
    const S = GM.sede._estado();
    document.querySelectorAll('.sede-panel .cerrar, .sede-panel button[aria-label=Cerrar]').forEach(b => b.click());
    S.zoom = 5;
    S.yawObj = 0.4;
  });
  await sleep(1500);
  await p.screenshot({ path: 'capturas/mixamo2/juego_' + escena.replace(':', '_') + '_' + modo + '.png' });
  console.log('errores: ' + (errs.length ? errs.slice(0, 4).join(' | ') : 'ninguno'));
  await b.close();
})();
