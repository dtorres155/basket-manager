// Entra en todas las escenas del mundo 3D y en todos los interiores (gestor y carrera) y falla si alguno da error, no
// construye zonas o no llega a poblarse. Forma parte de `npm run test:visual`. Uso: node tools/escenas_todas.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const GESTOR = ['sede', 'calle', 'deportiva', 'casa', 'interior:pabellon', 'interior:tienda', 'interior:pena', 'interior:ayuntamiento', 'interior:restaurante', 'interior:gimnasio_barrio', 'interior:barberia'];
const CARRERA = ['pueblo', 'interior:bar_pueblo', 'interior:casa_padres', 'interior:casa_amigos', 'interior:casa_pueblo'];
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1000, height: 650 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  let malas = 0;
  for (const [modo, escenas] of [['gestor', GESTOR], ['carrera', CARRERA]]) {
    await p.evaluate(modo => {
      const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' });
      if (modo === 'carrera') GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
      else GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: pj });
      window.__sinAdaptar = true; GM.campus.config.calidad = 'normal'; GM.ui.start(document.getElementById('app'));
    }, modo);
    for (const esc of escenas) {
      const n0 = errs.length;
      await p.evaluate(esc => { if (GM.sede.activa && GM.sede.activa()) GM.sede.cerrar(); GM.sede.abrir(GM.state, esc === 'casa' ? 'casa:' + GM.casa.idActual(GM.state) : esc); }, esc);
      let r = null; for (let i = 0; i < 40; i++) { await sleep(500); r = await p.evaluate(() => { const S = GM.sede._estado(), c = document.querySelector('.sede-cargando'); return S ? { zonas: (S.zonas || []).length, gente: (S.gente || []).length, yo: !!S.yo, cargando: c ? c.textContent : null } : null; }); if (r && r.yo && !r.cargando) break; }
      const ok = r && r.zonas > 0 && r.yo && !r.cargando && errs.length === n0;
      if (!ok) malas++;
      console.log((ok ? 'ok    ' : 'MAL   ') + modo + ' ' + esc + ' (zonas ' + (r ? r.zonas : '?') + ', personas ' + (r ? r.gente : '?') + (r && r.cargando ? ', ' + r.cargando : '') + (errs.length > n0 ? ', ' + errs.slice(n0, n0 + 2).join(' | ') : '') + ')');
    }
  }
  console.log(malas ? malas + ' escenas con problemas' : 'todas las escenas cargan');
  console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close(); process.exit(malas ? 1 : 0);
})();
