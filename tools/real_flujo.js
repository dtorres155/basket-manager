// Flujo en la ciudad real: entrar en la tienda, en tu casa y en la ciudad deportiva y volver a la calle (aparecer en su puerta); mapa.
// Uso: node tools/real_flujo.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const club = process.argv[2] || 'real-madrid', DIR = path.join(__dirname, '..', 'capturas', 'real_flujo'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = []; let mal = 0;
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8080/'); await sleep(800);
  await p.evaluate(c => { GM.newGame(c, undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }), carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } }); GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); }, club);
  await sleep(15000);
  const ir = async (id, boton, esperaEscena) => {
    const ok = await p.evaluate(id => { const S = GM.sede._estado(), z = S.zonas.find(q => q.sala.id === id); if (!z) return false; S.yo.camino = null; S.yo.obj.position.set(z.obj.position.x, 0, z.obj.position.z); S.foco.set(z.obj.position.x, 0, z.obj.position.z); return true; }, id);
    if (!ok) { console.log('sin zona', id); mal++; return; } await sleep(1200);
    const hecho = await p.evaluate(t => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes(t)); if (b) { b.click(); return true; } return false; }, boton);
    if (!hecho) { console.log('sin botón', boton); mal++; return; }
    await sleep(6000); const esc = await p.evaluate(() => GM.sede._estado().escena); if (esc !== esperaEscena) { console.log('escena', esc, 'esperaba', esperaEscena); mal++; }
    await p.screenshot({ path: path.join(DIR, id + '_dentro.png') });
    // volver a la calle
    const sal = await p.evaluate(() => { const S = GM.sede._estado(), z = S.zonas.find(q => q.sala.irA === 'calle' || /salir|salida/.test(q.sala.id)); if (!z) return false; S.yo.camino = null; S.yo.obj.position.set(z.obj.position.x, 0, z.obj.position.z); S.foco.set(z.obj.position.x, 0, z.obj.position.z); return true; });
    if (!sal) { console.log('sin salida en', esc); mal++; return; } await sleep(1200);
    console.log(await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].map(x => x.textContent.trim()).filter(Boolean); const b = [...document.querySelectorAll('button')].find(x => /Salir a la/i.test(x.textContent) || /^Salir al/i.test(x.textContent)); if (b) b.click(); return bs.join(' / ') + ' -> ' + !!b; }));
    await sleep(14000);
    const r = await p.evaluate(id => { const S = GM.sede._estado(), z = S.zonas.find(q => q.sala.id === id); return { escena: S.escena, real: S.real, cerca: z ? Math.hypot(z.obj.position.x - S.yo.obj.position.x, z.obj.position.z - S.yo.obj.position.z) : -1 }; }, id);
    console.log(id, JSON.stringify(r)); if (r.escena !== 'calle' || !r.real || r.cerca < 0 || r.cerca > 3) mal++;
    await p.evaluate(() => { const S = GM.sede._estado(); if (S.panel) S.panel.style.display = 'none'; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); }); await p.screenshot({ path: path.join(DIR, id + '_vuelta.png') });
  };
  await ir('tienda', 'Entrar en la tienda', 'interior');
  const casa = await p.evaluate(() => (GM.sede._estado().zonas.find(q => /^casa_/.test(q.sala.id)) || { sala: {} }).sala.id);
  if (casa) await ir(casa, 'Entrar en casa', 'casa'); else { console.log('sin casa'); mal++; }
  await ir('lugar_campus', 'Entrar en la ciudad deportiva', 'deportiva');
  // mapa
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent === 'Mapa'); if (b) b.click(); }); await sleep(2500); await p.screenshot({ path: path.join(DIR, 'mapa.png') });
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno'); if (errs.length) mal++;
  await b.close(); console.log(mal ? 'FALLOS ' + mal : 'flujo correcto');
})();
