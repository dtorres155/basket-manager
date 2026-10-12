// Herramienta (puntos 26 y 30): fila de personas en el aire con un hueso girado en cada eje, para ver las convenciones de ejes del esqueleto. Uso: node tools/anim_ejes.js [hueso] [angulo]   (requiere `npm run serve`)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const hueso = process.argv[2] || 'UpperArm.L', ang = +(process.argv[3] || 1.2), DIR = path.join(__dirname, '..', 'capturas', 'anim'); fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }), p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto('http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => { const c = 'joventut-badalona'; GM.newGame(c, undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'M', apellido: 'S' }), carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } }); GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); }); await sleep(14000);
  const info = await p.evaluate(async ([hueso, ang]) => { const S = GM.sede._estado(), y = S.yo.obj.position, out = [];
    const casos = [[0, 0, 0], [ang, 0, 0], [0, ang, 0], [0, 0, ang], [-ang, 0, 0], [0, -ang, 0], [0, 0, -ang]];
    for (let i = 0; i < casos.length; i++) { const q = await GM.sede.personaje({ modelo: 'h-casual_2', altura: 180, piel: '#e0ac85', pelo: '#3b2617', ropa: ['#2d6a4f', '#333'] }); q.obj.position.set(y.x - 4.5 + i * 1.5, 80, y.z - 6); q.obj.rotation.y = 0; S.mundo.add(q.obj); const B = q.huesos[hueso]; if (i === 0) out.push(B ? B.position.toArray().map(v => +v.toFixed(3)).join(',') + ' | ' + Object.keys(q.huesos).slice(0, 80).join(' ') : 'no hay hueso'); if (B) B.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...casos[i]))); }
    S.enFoto = true; S.camLibre = { pos: new THREE.Vector3(y.x, 81.2, y.z - 0.5), yaw: 0, pitch: -0.03 }; return out; }, [hueso, ang]);
  console.log(info.join('\n')); await sleep(1200); await p.screenshot({ path: path.join(DIR, 'ejes_' + hueso.replace('.', '') + '.png') }); console.log('errores:', errs.length ? errs.slice(0, 3) : 'ninguno'); await b.close();
})();
