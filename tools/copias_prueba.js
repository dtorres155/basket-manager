// Prueba de las copias automáticas en un navegador real: autoguardado -> copia en IndexedDB -> borrar la ranura -> restaurar.
// Uso: node tools/copias_prueba.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext()).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  const r = await p.evaluate(async () => {
    GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) });
    for (let i = 0; i < 8; i++) GM.mods.competiciones.jugarDia(GM.state);   // a los 7 días hay autoguardado
    await new Promise(r => setTimeout(r, 1500));
    const l = await GM.mods.copias.listar(), fecha = GM.state.fecha;
    localStorage.removeItem('gm1:slot0'); GM.state = null;
    const res = l.length ? await GM.mods.copias.restaurar(l[0].id) : { ok: false };
    return { copias: l.length, primera: l[0] && (l[0].club + ' ' + l[0].fecha + ' ' + l[0].kb + ' KB'), restaurada: res.ok, fechaRestaurada: GM.state && GM.state.fecha, fechaAntes: fecha, ranura: !!localStorage.getItem('gm1:slot0') };
  });
  console.log(JSON.stringify(r), '| errores:', errs.length ? errs : 'ninguno');
  await b.close();
})();
