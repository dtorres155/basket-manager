// La ciudad real jugable. Uso: node tools/real_capturas.js [club] [carpeta]   (requiere `npm run serve`)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const club = process.argv[2] || 'joventut-badalona', DIR = path.join(__dirname, '..', 'capturas', process.argv[3] || 'real'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8080/'); await sleep(800);
  await p.evaluate(([c, cal]) => { GM.newGame(c, undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }), carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } }); GM.campus.config.calidad = cal; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); }, [club, process.env.CAL || 'alta']);
  await sleep(16000);
  const info = await p.evaluate(() => { const S = GM.sede._estado(); return { real: S.real, zonas: (S.zonas || []).map(z => z.sala.id + '@' + z.obj.position.x.toFixed(0) + ',' + z.obj.position.z.toFixed(0)), gente: S.gente && S.gente.length, coches: S.coches && S.coches.length, calle: S.calleNombre, yo: S.yo && [S.yo.obj.position.x, S.yo.obj.position.z] }; });
  console.log(JSON.stringify(info)); console.log(JSON.stringify(await p.evaluate(() => { const i = GM.sede._estado().renderer.info; return { llamadas: i.render.calls, triangulos: i.render.triangles, geometrias: i.memory.geometries }; })));
  const normal = async n => { await p.evaluate(() => { const S = GM.sede._estado(); if (S.panel) S.panel.style.display = 'none'; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); }); await sleep(900); await p.screenshot({ path: path.join(DIR, n + '.png') }); };
  if (process.env.HORA) { await p.evaluate(h => { GM.sede._estado().hora = +h; }, process.env.HORA); await sleep(1500); }
  await normal('1_inicio');
  const aerea = async (n, c, t) => { await p.evaluate(([c, t]) => { const S = GM.sede._estado(); S.pausa = true; if (S.scene.fog) S.scene.fog.far = 1500; S.camera.far = 2500; S.camera.updateProjectionMatrix(); S.camera.position.set(...c); S.camera.lookAt(...t); S.renderer.render(S.scene, S.camera); }, [c, t]); await sleep(700); await p.screenshot({ path: path.join(DIR, n + '.png') }); };
  await aerea('2_aerea', [0, 260, 150], [0, 0, 0]);
  await aerea('3_centro', [40, 70, 60], [0, 0, 0]);
  await p.evaluate(() => { GM.sede._estado().pausa = false; });
  for (const [n, id, zoom] of [['4_pabellon', 'pabellon', 14], ['5_tienda', 'tienda', 12], ['6_pena', 'pena', 12], ['7_ayto', 'ayuntamiento', 14], ['8_calle', 'mercado', 22]]) {
    await p.evaluate(([id, zoom]) => { const S = GM.sede._estado(), z = S.zonas.find(q => q.sala.id === id); if (!z) return; S.yo.camino = null; S.yo.obj.position.set(z.obj.position.x, 0, z.obj.position.z + 0.2); S.foco.set(z.obj.position.x, 0, z.obj.position.z); S.zoom = zoom; }, [id, zoom]);
    await normal(n);
  }
  console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno'); await b.close();
})();
