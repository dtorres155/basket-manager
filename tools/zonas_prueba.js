// Zonas paseables de la ciudad (punto 149 de la hoja de ruta 2): en la zona del pabellón hay taxis a las otras zonas; el taxi lleva a la
// zona, allí hay taxi de vuelta, y se vuelve a la parada. Capturas en capturas/zonas/. Uso: node tools/zonas_prueba.js [club]   (npm run serve)
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const { esperarEscena, sleep } = require('./ayudas');
const club = process.argv[2] || 'joventut-badalona',
  DIR = path.join(__dirname, '..', 'capturas', 'zonas');
fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errores = [],
    fallos = [];
  p.on('pageerror', e => errores.push(String(e)));
  const chk = (ok, txt) => {
    console.log((ok ? 'ok    ' : 'FALLA ') + txt);
    if (!ok) fallos.push(txt);
  };
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
  await sleep(2000);
  const taxis = await p.evaluate(() =>
    GM.sede
      ._estado()
      .zonas.filter(z => z.sala && /^taxi_/.test(z.sala.id))
      .map(z => ({ id: z.sala.id, irA: z.sala.irA, x: z.obj.position.x, z: z.obj.position.z }))
  );
  chk(taxis.length >= 1, 'en la zona del pabellón hay taxis: ' + taxis.map(t => t.irA).join(', '));
  for (const t of taxis) {
    await p.evaluate(dest => GM.sede._escena(dest), t.irA);
    await p.waitForFunction(d => GM.sede._estado().escena === 'calle' && GM.sede._estado().zonaCalle === d.split(':')[1] && !GM.sede._estado().cambiando, t.irA, {
      timeout: 150000
    });
    await sleep(2500);
    const r = await p.evaluate(() => {
      const S = GM.sede._estado();
      return {
        zona: S.zonaCalle,
        calle: S.calleNombre,
        vuelta: S.zonas.filter(z => z.sala && z.sala.id === 'taxi_pabellon').length,
        pab: !!S.ptoPab,
        yo: [S.yo.obj.position.x, S.yo.obj.position.z]
      };
    });
    chk(r.vuelta === 1 && !r.pab, t.irA + ': sin pabellón y con taxi de vuelta (' + r.calle + ')');
    await p.screenshot({ path: path.join(DIR, t.irA.replace(':', '_') + '.png') });
    // de vuelta a la zona del pabellón: se aparece en la parada
    await p.evaluate(() => GM.sede._escena('calle'));
    await p.waitForFunction(() => GM.sede._estado().escena === 'calle' && !GM.sede._estado().zonaCalle && !GM.sede._estado().cambiando, null, { timeout: 150000 });
    await sleep(1500);
    const v = await p.evaluate(() => {
      const S = GM.sede._estado();
      return { pab: !!S.ptoPab, yo: [S.yo.obj.position.x, S.yo.obj.position.z] };
    });
    const d = Math.hypot(v.yo[0] - t.x, v.yo[1] - t.z);
    chk(v.pab && d < 12, 'vuelta a la zona del pabellón, junto a la parada (' + d.toFixed(1) + ' m)');
  }
  if (errores.length) console.log('errores:', errores.slice(0, 3));
  console.log(!fallos.length && !errores.length ? 'zonas: bien' : 'FALLA: zonas');
  await b.close();
  process.exit(!fallos.length && !errores.length ? 0 : 1);
})();
