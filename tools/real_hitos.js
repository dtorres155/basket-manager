// La ciudad que crece en la ciudad real: fan zone, plaza, estatua, megatienda, hotel, museo, metro con el nombre del club y obras en curso. Uso: node tools/real_hitos.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const club = process.argv[2] || 'real-madrid',
  DIR = path.join(__dirname, '..', 'capturas', 'real_hitos');
fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(),
    errs = [];
  let mal = 0;
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error') errs.push(m.text());
  });
  await p.goto('http://localhost:8080/');
  await sleep(700);
  await p.evaluate(c => {
    GM.newGame(c, undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) });
    const st = GM.state,
      C = (st.ciudad[c].crec = st.ciudad[c].crec || { hitos: {}, turismo: 40, comercio: 40, hist: [] });
    ['fanzone', 'plaza', 'estatua', 'tienda', 'hotel', 'museo', 'metro'].forEach(id => {
      C.hitos[id] = { estado: 'hecho', fecha: st.fecha };
    });
    C.hitos.pistas = { estado: 'obra', desde: st.fecha, fin: '2026-12-30' };
    GM.campus.config.calidad = 'alta';
    GM.ui.start(document.getElementById('app'));
    GM.sede.abrir(st, 'calle');
  }, club);
  await sleep(16000);
  const info = await p.evaluate(() => {
    const S = GM.sede._estado();
    const ids = S.zonas.map(z => z.sala.id);
    let tipos = {};
    S.mundo.traverse(o => {
      const u = o.userData;
      if (u)
        ['fanzone', 'plaza', 'estatua', 'obraCiudad'].forEach(k => {
          if (u[k]) tipos[k] = (tipos[k] || 0) + 1;
        });
    });
    return { hotel: ids.includes('hotel'), museo: ids.includes('museo'), tipos, pto: S.ptoPab };
  });
  console.log(JSON.stringify(info));
  if (!info.hotel || !info.museo || !info.tipos.fanzone || !info.tipos.plaza || !info.tipos.estatua || !info.tipos.obraCiudad) mal++;
  await p.evaluate(() => {
    const S = GM.sede._estado();
    S.pausa = true;
    if (S.panel) S.panel.style.display = 'none';
    document.querySelectorAll('.sede-ayuda').forEach(e => e.remove());
    if (S.scene.fog) S.scene.fog.far = 1500;
    S.camera.far = 2500;
    S.camera.updateProjectionMatrix();
    const [x, z] = S.ptoPab;
    S.camera.position.set(x + 40, 55, z + 55);
    S.camera.lookAt(x, 0, z);
    S.renderer.render(S.scene, S.camera);
  });
  await sleep(700);
  await p.screenshot({ path: path.join(DIR, 'pabellon_alto.png') });
  await p.evaluate(() => {
    const S = GM.sede._estado(),
      [x, z] = S.ptoPab;
    S.camera.position.set(x + 18, 14, z + 22);
    S.camera.lookAt(x, 1, z);
    S.renderer.render(S.scene, S.camera);
  });
  await sleep(500);
  await p.screenshot({ path: path.join(DIR, 'pabellon_cerca.png') });
  if (errs.length) {
    console.log('ERRORES', errs.slice(0, 4));
    mal++;
  }
  await b.close();
  console.log(mal ? 'FALLOS ' + mal : 'hitos de la ciudad correctos');
})();
