// Puente de la versión de escritorio (escritorio/preload.js): window.escritorio guarda en Documentos\BasketManager y hace capturas,
// y una nota con F8 llega a esa carpeta. Requiere `cd escritorio && node preparar.js`. Uso: node tools/escritorio_puente.js
const { _electron: electron } = require('playwright');
const path = require('path'),
  fs = require('fs'),
  os = require('os');
(async () => {
  const raiz = path.join(__dirname, '..', 'escritorio');
  const app = await electron.launch({ executablePath: path.join(raiz, 'node_modules', 'electron', 'dist', 'electron.exe'), args: [raiz] }),
    p = await app.firstWindow(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.waitForLoadState('domcontentloaded');
  await new Promise(r => setTimeout(r, 3000));
  await p.waitForFunction(() => window.GM && GM.pruebas, null, { timeout: 30000 });
  const carpeta = await p.evaluate(() => window.escritorio && window.escritorio.carpeta());
  const f1 = await p.evaluate(() => window.escritorio.guardar('notas', 'prueba_puente.json', '{"ok":true}'));
  const f2 = await p.evaluate(() => window.escritorio.captura('notas', 'prueba_puente.png'));
  let raro = null;
  try {
    await p.evaluate(() => window.escritorio.guardar('../fuera', 'x.txt', 'no'));
    raro = 'se dejó escribir fuera';
  } catch (e) {
    raro = 'rechazado';
  }
  // F8 en la app real: la nota queda en la carpeta
  await p.evaluate(() => {
    GM.newGame('joventut-badalona', 7, {
      modo: 'carrera',
      personaje: GM.mods.personaje.crear(),
      carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 }
    });
    GM.ajustes.marcarNovedades();
    GM.ui.start(document.getElementById('app'));
  });
  await p.keyboard.press('F8');
  await p.waitForSelector('.hoja textarea', { timeout: 8000 });
  await p.fill('.hoja textarea', 'prueba automática del puente');
  await p.evaluate(() => [...document.querySelectorAll('.hoja .acciones button')].find(b => b.textContent === 'Guardar').click());
  await new Promise(r => setTimeout(r, 1200));
  const dirNotas = path.join(carpeta || path.join(os.homedir(), 'Documents', 'BasketManager'), 'notas');
  const notas = fs.existsSync(dirNotas) ? fs.readdirSync(dirNotas) : [];
  const nota = notas
    .filter(f => /^\d{4}-.*\.json$/.test(f))
    .map(f => path.join(dirNotas, f))
    .find(f => /puente/.test(fs.readFileSync(f, 'utf8')));
  const filas = [
    ['carpeta: ' + carpeta, !!carpeta],
    ['guardar texto', !!f1 && fs.existsSync(f1)],
    [
      'captura de la ventana (' + (f2 && fs.existsSync(f2) ? Math.round(fs.statSync(f2).size / 1024) + ' KB' : 'no') + ')',
      !!f2 && fs.existsSync(f2) && fs.statSync(f2).size > 10000
    ],
    ['no deja escribir fuera de la carpeta (' + raro + ')', raro === 'rechazado'],
    ['F8 deja la nota y su captura en Documentos', !!nota && fs.existsSync(nota.replace('.json', '.png'))]
  ];
  filas.forEach(([t, ok]) => console.log((ok ? 'ok    ' : 'FALLA ') + t));
  // limpiar lo que deja la prueba
  [f1, f2, nota, nota && nota.replace('.json', '.png')].filter(Boolean).forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
  console.log('errores: ' + (errs.length ? errs.slice(0, 3).join(' | ') : 'ninguno'));
  await app.close();
  process.exit(filas.every(f => f[1]) && !errs.length ? 0 : 1);
})();
