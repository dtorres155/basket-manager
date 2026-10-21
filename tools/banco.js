// Banco de capturas comparables: las mismas vistas, a las mismas horas, con medidas y comprobación del presupuesto (docs/PRESUPUESTOS.md).
// Uso: node tools/banco.js [club] [carpeta] [--escenas=calle,pueblo] [--cal=alta|normal]   (requiere `npm run serve`)
// Salida: capturas/banco/<carpeta>/<escena>_<hora>_<vista>.png y medidas.json; sale con error si se supera el presupuesto.
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const arg = n => (process.argv.find(a => a.startsWith('--' + n + '=')) || '').split('=')[1];
const pos = process.argv.slice(2).filter(a => !a.startsWith('--'));
// Escenas: calle, pueblo, sede, interior:pabellon, interior:tienda, interior:pena, interior:ayuntamiento, casa:<id> (los interiores se capturan una vez, sin horas ni vista aérea)
const club = pos[0] || 'joventut-badalona',
  nombre = pos[1] || 'actual',
  CAL = arg('cal') || 'alta',
  ESC = (arg('escenas') || 'calle,pueblo,interior:pabellon,interior:tienda,sede').split(',');
const DIR = path.join(__dirname, '..', 'capturas', 'banco', nombre);
fs.mkdirSync(DIR, { recursive: true });
const HORAS = { dia: 11, tarde: 18.7, noche: 22 };
// Presupuesto por perfil (alta = PC, normal = móvil): llamadas de dibujo y triángulos tras construir la escena.
const PRES = { alta: { llamadas: 1500, tri: 3e6 }, normal: { llamadas: 400, tri: 1.2e6 } }[CAL] || { llamadas: 1500, tri: 3e6 };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(),
    errs = [],
    medidas = {};
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text());
  });
  p.on('response', r => {
    if (r.status() >= 400 && !/\/modelos\/reales\/arboles\//.test(r.url())) errs.push(r.status() + ' ' + r.url());
  });
  for (const esc of ESC) {
    await p.goto('http://localhost:8080/');
    await sleep(800);
    await p.evaluate(
      ([c, cal, esc]) => {
        GM.newGame(c, undefined, {
          modo: 'carrera',
          personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }),
          carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 }
        });
        GM.campus.config.calidad = cal;
        GM.ui.start(document.getElementById('app'));
        GM.sede.abrir(GM.state, esc.indexOf(':') > 0 ? 'calle' : esc);
      },
      [club, CAL, esc]
    );
    await sleep(esc === 'calle' ? 16000 : 9000);
    if (esc.indexOf(':') > 0) {
      await p.evaluate(e => GM.sede._escena(e), esc);
      await sleep(6000);
    }
    await p.evaluate(() => {
      const S = GM.sede._estado();
      if (S.panel) S.panel.style.display = 'none';
      document.querySelectorAll('.sede-ayuda').forEach(e => e.remove());
    });
    const ext = esc === 'calle' || esc === 'pueblo',
      vistas = ext
        ? [
            ['1_pie', null],
            ['2_aerea', [0, 260, 150]],
            ['3_centro', [40, 70, 60]]
          ]
        : [['1_pie', null]];
    for (const [hn, h] of Object.entries(ext ? HORAS : { dia: 11 })) {
      await p.evaluate(h => {
        const S = GM.sede._estado();
        S.pausa = false;
        S.hora = h;
      }, h);
      await sleep(1500);
      for (const [vn, cam] of vistas) {
        await p.evaluate(c => {
          const S = GM.sede._estado();
          if (!c) {
            S.pausa = false;
            return;
          }
          S.pausa = true;
          if (S.scene.fog) S.scene.fog.far = 1500;
          S.camera.far = 2500;
          S.camera.updateProjectionMatrix();
          S.camera.position.set(...c);
          S.camera.lookAt(0, 0, 0);
          S.renderer.render(S.scene, S.camera);
        }, cam);
        await sleep(800);
        await p.screenshot({ path: path.join(DIR, `${esc.replace(':', '-')}_${hn}_${vn}.png`) });
      }
      const m = await p.evaluate(() => {
        const i = GM.sede._estado().renderer.info;
        return { llamadas: i.render.calls, tri: i.render.triangles, geom: i.memory.geometries, tex: i.memory.textures };
      });
      medidas[esc + '_' + hn] = m;
    }
  }
  fs.writeFileSync(path.join(DIR, 'medidas.json'), JSON.stringify({ club, cal: CAL, presupuesto: PRES, medidas, errores: errs }, null, 1));
  let fallos = 0;
  for (const [k, m] of Object.entries(medidas)) {
    const ok = m.llamadas <= PRES.llamadas && m.tri <= PRES.tri;
    if (!ok) fallos++;
    console.log((ok ? 'ok     ' : 'EXCEDE ') + k, JSON.stringify(m));
  }
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
  process.exit(fallos || errs.length ? 1 : 0);
})();
