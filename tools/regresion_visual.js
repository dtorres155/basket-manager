// Punto 83: regresión visual. Saca capturas de pantallas fijas (partida con semilla, día fijo, tema claro, 1000x900) y las compara píxel a píxel con las de calidad/base/ (media de la diferencia por canal; pasa si es menor del 1,5 %).
// Uso: node tools/regresion_visual.js [--actualizar]   (requiere `npm run serve`). --actualizar guarda las capturas actuales como base nueva (hazlo cuando un cambio visual sea intencionado y lo hayas mirado).
const { chromium } = require('playwright');
const { sleep } = require('./ayudas');
const fs = require('fs'),
  path = require('path');
const base = path.join(__dirname, '..', 'calidad', 'base'),
  nuevo = path.join(__dirname, '..', 'calidad', 'actual'),
  actualizar = process.argv.includes('--actualizar'),
  UMBRAL = 1.5;
const VISTAS = [
  ['inicio', 'inicio', 'inicio'],
  ['plantilla', 'plantilla', 'plantilla'],
  ['mercado', 'mercado', 'libres'],
  ['calendario', 'calendario', 'partidos'],
  ['finanzas', 'finanzas', 'resumen'],
  ['galeria', 'muestra', null]
];
(async () => {
  fs.mkdirSync(base, { recursive: true });
  fs.mkdirSync(nuevo, { recursive: true });
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8080/');
  await sleep(700);
  await p.evaluate(() => {
    try {
      localStorage.clear();
      localStorage.setItem(
        'gm1:consejos',
        JSON.stringify({ 'ayuda-inicio': 1, 'ayuda-plantilla': 1, 'ayuda-mercado': 1, 'ayuda-calendario': 1, 'ayuda-finanzas': 1, 'ayuda-muestra': 1 })
      );
      localStorage.setItem('gm1:novedades', '0.9.128');
    } catch (e) {}
  });
  await p.reload();
  await sleep(600);
  await p.evaluate(() => {
    GM.rng.seed && GM.rng.seed(7);
    const pj = GM.mods.personaje.crear();
    pj.nombre = 'Marc';
    GM.newGame('joventut-badalona', 7, { modo: 'gestor', personaje: pj });
    GM.state.misiones = { hechas: {}, cont: {}, oculta: true };
    GM.ui.start(document.getElementById('app'));
    GM.diseno.setTema('dia');
  });
  let ok = true;
  const filas = [];
  for (const [nombre, pant, tab] of VISTAS) {
    await p.evaluate(
      ([pa, t]) => {
        if (t) GM.ui._.ui.tab[pa] = t;
        GM.ui.navegar(pa);
      },
      [pant, tab]
    );
    await sleep(700);
    const buf = await p.screenshot({ path: path.join(nuevo, nombre + '.png') }),
      ref = path.join(base, nombre + '.png');
    if (actualizar || !fs.existsSync(ref)) {
      fs.writeFileSync(ref, buf);
      filas.push('base  ' + nombre + (actualizar ? ' (actualizada)' : ' (nueva)'));
      continue;
    }
    const diff = await p.evaluate(
      async ([a, c]) => {
        const carga = s =>
            new Promise(r => {
              const i = new Image();
              i.onload = () => r(i);
              i.src = s;
            }),
          [A, B] = await Promise.all([carga(a), carga(c)]),
          w = Math.min(A.width, B.width),
          h = Math.min(A.height, B.height);
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const x = cv.getContext('2d', { willReadFrequently: true });
        x.drawImage(A, 0, 0);
        const da = x.getImageData(0, 0, w, h).data;
        x.clearRect(0, 0, w, h);
        x.drawImage(B, 0, 0);
        const db = x.getImageData(0, 0, w, h).data;
        let s = 0;
        for (let i = 0; i < da.length; i += 4) s += Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
        return { pct: (s / (w * h * 3 * 255)) * 100, tam: A.width === B.width && A.height === B.height };
      },
      ['data:image/png;base64,' + fs.readFileSync(ref).toString('base64'), 'data:image/png;base64,' + buf.toString('base64')]
    );
    const bien = diff.pct < UMBRAL && diff.tam;
    if (!bien) ok = false;
    filas.push((bien ? 'ok    ' : 'FALLA ') + nombre + ' diferencia ' + diff.pct.toFixed(2) + ' %' + (diff.tam ? '' : ', tamaño distinto'));
  }
  console.log(filas.join('\n'));
  console.log((ok && !errs.length ? 'regresión visual: ok' : 'regresión visual: FALLA') + (errs.length ? ', errores: ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  process.exit(ok && !errs.length ? 0 : 1);
})();
