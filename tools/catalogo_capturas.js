// Catálogo de personas (punto 25): una fila de vecinos de la ciudad real, en invierno y en verano. Uso: node tools/catalogo_capturas.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona', DIR = path.join(__dirname, '..', 'capturas', 'catalogo'); fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }), p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); await p.goto('http://localhost:8080/'); await sleep(800);
  for (const [nombre, mes] of [['invierno', '01'], ['verano', '07']]) {
    await p.evaluate(([c, m]) => { GM.newGame(c, undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }), carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } }); GM.state.fecha = '2027-' + m + '-12'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); }, [club, mes]); await sleep(15000);
    await p.evaluate(async (edad) => { window.__edad = edad; const S = GM.sede._estado(), y = S.yo.obj.position; let a = 99; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; const l = GM.catalogo.lote(r, 16, { pais: 'ES', mes: +GM.state.fecha.slice(5, 7), club: GM.state.equipos[GM.state.clubId], edad: window.__edad || undefined }); for (let i = 0; i < 16; i++) { const p = await GM.sede.personaje(l[i]); p.obj.position.set(y.x - 4.4 + (i % 8) * 1.25, 80, y.z - 6 - (i >> 3) * 1.6); p.obj.rotation.y = 0; S.mundo.add(p.obj); GM.sede.animar(p, 'idle'); } S.enFoto = true; S.camLibre = { pos: new THREE.Vector3(y.x, 81.4, y.z - 0.5), yaw: 0, pitch: -0.06 }; document.querySelectorAll('.panel,.sede-panel').forEach(e => { e.style.display = 'none'; }); }, process.env.EDAD || null);
    await sleep(1500); await p.screenshot({ path: path.join(DIR, nombre + '.png') });
  }
  console.log('errores:', errs.length ? errs.slice(0, 3) : 'ninguno'); await b.close();
})();
