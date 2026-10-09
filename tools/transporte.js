// Transporte en la ciudad: metro entre barrios, bici compartida (más velocidad) y autobús entre la estación y tu pueblo (carrera).
// Uso: node tools/transporte.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'transporte'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 760 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => {
    GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }), carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
    GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle');
  });
  await sleep(13000);
  const zona = id => p.evaluate(id => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === id); return z ? z.sala.acciones ? z.sala.acciones(GM.state).map(a => a.t) : [z.sala.boton] : null; }, id);
  const accion = (id, n) => p.evaluate(([id, n]) => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === id); return z.sala.acciones(GM.state)[n].fn(); }, [id, n]);
  const pos = () => p.evaluate(() => { const o = GM.sede._estado().yo.obj.position; return [+o.x.toFixed(1), +o.z.toFixed(1)]; });
  const foto = async (n, yaw, zoom) => { await p.evaluate(([yaw, zoom]) => { const S = GM.sede._estado(); S.yaw = S.yawObj = yaw; S.zoom = zoom; S.inc = 0.6; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); }, [yaw, zoom]); await sleep(1800); await p.screenshot({ path: path.join(DIR, n + '.png') }); };
  console.log('metro centro:', await zona('metro_centro'));
  console.log('bicis:', await zona('bici_centro'));
  console.log('autobús al pueblo:', await zona('bus_pueblo'));
  await p.evaluate(() => { const S = GM.sede._estado(); S.yo.obj.position.set(-8, 0, 29.4); S.yo.camino = null; });
  await foto('metro_centro', 0.4, 14);
  console.log('viaje:', await accion('metro_centro', 1), 'antes', await pos()); await sleep(1200); console.log('después', await pos());
  await foto('metro_destino', 0.4, 14);
  console.log('bici:', await accion('bici_oeste', 0));
  const v = await p.evaluate(async () => { const S = GM.sede._estado(), o = S.yo.obj.position; S.yo.camino = null; o.set(-30, 0, 2.5); const a = o.clone(); GM.sede._motor().irA(S.yo, 10, 2.5); await new Promise(r => setTimeout(r, 2000)); return +o.distanceTo(a).toFixed(1); });
  console.log('metros en 2 s con bici:', v);
  await foto('bici', 1.2, 6);
  console.log('dejar:', await accion('bici_oeste', 0));
  await p.evaluate(() => GM.sede._escena('pueblo')); await sleep(12000);
  console.log('en el pueblo:', await p.evaluate(() => GM.sede._estado().escena), await zona('pueblo_bus'));
  await foto('pueblo_parada', 0.5, 16);
  await p.evaluate(() => GM.sede._escena('calle')); await sleep(12000);
  console.log('vuelta a la ciudad:', await p.evaluate(() => GM.sede._estado().escena), await pos());
  await foto('vuelta_estacion', 0.5, 16);
  console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
