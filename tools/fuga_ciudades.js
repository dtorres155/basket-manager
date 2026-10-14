// Busca fugas al cambiar de ciudad: abre varias ciudades seguidas en la misma página y mide el tiempo de carga, la memoria de JS y los recursos de la GPU (geometrías y texturas).
// Uso: node tools/fuga_ciudades.js [n]   (requiere `npm run serve`)
const { chromium } = require('playwright'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const N = +process.argv[2] || 8, b = await chromium.launch({ channel: 'msedge', args: ['--enable-precise-memory-info'] }), p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await p.goto('http://localhost:8080/'); await sleep(800);
  const ids = await p.evaluate(() => { GM.newGame('joventut-badalona'); return Object.keys(GM.state.equipos).filter((x, i) => i % 7 === 0).slice(0, 14); });
  const filas = [];
  for (const id of ids.slice(0, N)) {
    const t0 = Date.now();
    await p.evaluate(c => { GM.sede.cerrar && GM.sede.activa() && GM.sede.cerrar(); GM.newGame(c, undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'M', apellido: 'S' }), carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } }); GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); }, id);
    for (let i = 0; i < 90; i++) { await sleep(500); if (await p.evaluate(() => { const S = GM.sede.activa() && GM.sede._estado(); return !!(S && S.yo && S.gente && S.gente.length > 0 && !document.querySelector('.sede-cargando')); }).catch(() => false)) break; }
    const ms = Date.now() - t0; await sleep(800);
    const m = await p.evaluate(() => { const S = GM.sede._estado(), i = S.renderer && S.renderer.info; return { heap: Math.round(performance.memory.usedJSHeapSize / 1048576), geo: i ? i.memory.geometries : -1, tex: i ? i.memory.textures : -1, progs: i ? i.programs.length : -1, nodos: (() => { let n = 0; S.scene.traverse(() => n++); return n; })() }; });
    filas.push(Object.assign({ id, s: +(ms / 1000).toFixed(1) }, m)); console.log(id.padEnd(24), JSON.stringify(m), (ms / 1000).toFixed(1) + ' s');
  }
  const a = filas[0], z = filas[filas.length - 1]; console.log('crecimiento: heap ' + a.heap + ' -> ' + z.heap + ' MB, geometrías ' + a.geo + ' -> ' + z.geo + ', texturas ' + a.tex + ' -> ' + z.tex + ', tiempo ' + a.s + ' -> ' + z.s + ' s');
  await b.close();
})();
