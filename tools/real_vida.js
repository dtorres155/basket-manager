// Vida de la ciudad real: mercadillo, obras, fiesta mayor, motos, pájaros, metro y bicis. Uso: node tools/real_vida.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const club = process.argv[2] || 'real-madrid', DIR = path.join(__dirname, '..', 'capturas', 'real_vida'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }); let mal = 0;
  const caso = async (nombre, fecha, vistas) => {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8080/'); await sleep(700);
    await p.evaluate(([c, f]) => { GM.newGame(c, undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }), carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } }); if (f) { GM.state.fecha = f; GM.state.calendario.forEach(x => { if (x.fecha === f) x.fecha = '2099-01-01'; }); } GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); }, [club, fecha]);
    await sleep(15000);
    const info = await p.evaluate(() => { const S = GM.sede._estado(); return { real: S.real, mercadillo: !!S.mercadillo, puestos: (S.cvPuestos || []).length, obras: !!S.cvObras, pajaros: (S.cvPajaros || []).length, coches: S.coches.length, motos: S.coches.filter(c => c.len < 3).length, anc: S.vidaAnc && { puestos: !!S.vidaAnc.puestos, obra: !!S.vidaAnc.obra, fiesta: S.vidaAnc.fiesta.length }, zonas: S.zonas.map(z => z.sala.id).filter(i => /metro|bici/.test(i)) }; });
    console.log(nombre, JSON.stringify(info));
    for (const [n, fn] of vistas) {
      const ok = await p.evaluate(fn); if (!ok) { console.log('  sin', n); mal++; continue; }
      await sleep(1600); await p.evaluate(() => { const S = GM.sede._estado(); if (S.panel) S.panel.style.display = 'none'; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); }); await sleep(300); await p.screenshot({ path: path.join(DIR, nombre + '_' + n + '.png') });
    }
    if (errs.length) { console.log('  ERRORES', errs.slice(0, 3)); mal++; }
    await p.close();
  };
  const ira = (x, z, zoom) => `(() => { const S = GM.sede._estado(); S.yo.camino = null; S.yo.obj.position.set(${x}, 0, ${z}); S.foco.set(${x}, 0, ${z}); S.zoom = ${zoom}; return true; })()`;
  const aZona = (re, zoom) => `(() => { const S = GM.sede._estado(), z = S.zonas.find(q => ${re}.test(q.sala.id)); if (!z) return false; S.yo.camino = null; S.yo.obj.position.set(z.obj.position.x, 0, z.obj.position.z + 0.3); S.foco.set(z.obj.position.x, 0, z.obj.position.z); S.zoom = ${zoom}; return true; })()`;
  await caso('transporte', null, [['metro', aZona('/metro_/', 14)], ['bici', aZona('/bici_/', 14)]]);
  await caso('mercadillo', '2026-10-17', [['puestos', `(() => { const S = GM.sede._estado(); if (!S.cvPuestos || !S.cvPuestos.length) return false; const p = S.cvPuestos[1] || S.cvPuestos[0]; S.yo.camino = null; S.yo.obj.position.set(p.x, 0, p.z + 3); S.foco.set(p.x, 0, p.z); S.zoom = 16; return true; })()`]]);
  await caso('obras', '2026-10-24', [['obra', `(() => { const S = GM.sede._estado(); if (!S.cvObras) return false; const o = S.cvObras; S.yo.camino = null; S.yo.obj.position.set(o.x, 0, o.z - 3); S.foco.set(o.x, 0, o.z); S.zoom = 14; return true; })()`]]);
  await caso('fiesta', '2027-08-15', [['fiesta', `(() => { const S = GM.sede._estado(), f = S.vidaAnc && S.vidaAnc.fiesta[0]; if (!f) return false; const q = f.p[Math.min(1, f.p.length - 1)]; S.yo.camino = null; S.yo.obj.position.set(q[0], 0, q[1]); S.foco.set(q[0], 0, q[1]); S.zoom = 24; return true; })()`]]);
  await b.close(); console.log(mal ? 'FALLOS ' + mal : 'vida de la ciudad real correcta');
})();
