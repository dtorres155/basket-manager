// Entra en la ciudad real de varios clubes y comprueba que se construye (zonas, gente, coches, errores) y hace una vista aérea.
// Uso: node tools/real_clubes.js [club1,club2,...] [carpeta]   (requiere `npm run serve`)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const clubes = (process.argv[2] || 'fc-barcelona,real-madrid,new-york-knicks,olympiacos,fenerbahce,alba-berlin,virtus-bologna,unicaja').split(','), DIR = path.join(__dirname, '..', 'capturas', process.argv[3] || 'real_clubes'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }); let mal = 0;
  for (const c of clubes) {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8080/'); await sleep(600);
    const ok = await p.evaluate(c => { const eq = GM.data.equipos; if (!GM.state && !c) return false; try { GM.newGame(c, undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }), carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } }); } catch (e) { return String(e); } GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); return true; }, c);
    if (ok !== true) { console.log(c, 'NO ARRANCA', ok); mal++; await p.close(); continue; }
    await sleep(15000);
    const info = await p.evaluate(() => { const S = GM.sede._estado(), i = S.renderer.info; return { real: S.real, zonas: (S.zonas || []).length, gente: S.gente && S.gente.length, coches: S.coches && S.coches.length, arboles: S.arbolesN, llamadas: i.render.calls, tri: i.render.triangles, sinPuerta: ['pabellon', 'sede_calle', 'tienda', 'pena', 'ayuntamiento'].filter(id => !(S.zonas || []).some(z => z.sala.id === id)) }; });
    await p.evaluate(() => { const S = GM.sede._estado(); S.pausa = true; if (S.panel) S.panel.style.display = 'none'; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); if (S.scene.fog) S.scene.fog.far = 1500; S.camera.far = 2500; S.camera.updateProjectionMatrix(); S.camera.position.set(0, 330, 190); S.camera.lookAt(0, 0, 0); S.renderer.render(S.scene, S.camera); });
    await sleep(600); await p.screenshot({ path: path.join(DIR, c + '.png') });
    console.log(c, JSON.stringify(info), errs.length ? 'ERRORES ' + errs.slice(0, 3).join(' | ') : ''); if (errs.length || !info.real || info.sinPuerta.length) mal++;
    await p.close();
  }
  await b.close(); console.log(mal ? mal + ' con problemas' : 'todas las ciudades reales cargan');
})();
