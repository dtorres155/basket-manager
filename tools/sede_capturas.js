// Prueba y capturas de la sede 3D: caminar, salas con sus paneles, acciones y fichas.
// Uso: node tools/sede_capturas.js [carpeta] [--movil]  (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'sede'); fs.mkdirSync(DIR, { recursive: true });
const MOVIL = process.argv.includes('--movil'), sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const ctx = await b.newContext(MOVIL ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  const shot = n => p.screenshot({ path: path.join(DIR, n + '.png') });
  const out = {};
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => { localStorage.clear(); const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; pj.apellido = 'Soler'; GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: pj }); GM.ui.start(document.getElementById('app')); const st = GM.state; const j = st.jugadores[st.equipos[st.clubId].plantilla[3]]; j.estado.lesion = { tipo: 'Esguince', dias: 12 }; });
  await sleep(500); await p.click('.sede-entrar'); await sleep(7000);
  out.fps = Math.round(await p.evaluate(() => new Promise(res => { let f = 0; const t0 = performance.now(); (function k(t) { f++; if (t - t0 < 2000) requestAnimationFrame(k); else res(f * 1000 / (t - t0)); })(t0); })));
  await shot('01_entrada');
  await p.evaluate(() => { const S = GM.sede._estado(); S.zoom = 42; S.yo.obj.position.set(0, 0, 3.5); }); await sleep(1500); await shot('02_general');
  // Visita cada sala: se coloca al personaje en su círculo y se abre el panel
  const sala = async (id, zoom, yaw) => { await p.evaluate(([id, zoom, yaw]) => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === id); S.yo.camino = null; S.yo.obj.position.set(z.obj.position.x, 0, z.obj.position.z); S.zoom = zoom; S.yawObj = yaw; }, [id, zoom, yaw]); await sleep(1800); };
  const boton = async (txt) => p.evaluate(t => { const b = [...document.querySelectorAll('.sede-sala button')].find(x => x.textContent.includes(t) && !x.disabled); if (b) b.click(); return !!b; }, txt);
  const panel = () => p.evaluate(() => { const s = document.querySelector('.sede-sala'); return s && s.style.display !== 'none' ? s.innerText.replace(/\n+/g, ' | ').slice(0, 220) : null; });
  await sala('vestuario', 14, -0.4); out.vestuario = await panel(); await shot('03_vestuario_panel');
  out.charla = await boton('Charla motivadora'); await sleep(500); await shot('04_charla_flotantes');
  out.moral = await p.evaluate(() => { const st = GM.state; return st.jugadores[st.equipos[st.clubId].plantilla[0]].estado.moral; });
  await boton('La plantilla'); await sleep(400); await shot('05_corcho_plantilla');
  await sala('pista', 18, 0.3); await boton('Pizarra táctica'); await sleep(400); await boton('Zona'); await sleep(300); await shot('06_pizarra');
  out.tactica = await p.evaluate(() => GM.state.equipos[GM.state.clubId].tactica && GM.state.equipos[GM.state.clubId].tactica.defensa);
  await sala('despacho', 13, Math.PI - 0.4); await boton('Ordenador'); await sleep(400); await shot('07_ordenador');
  out.ordenador = await panel();
  await sala('prensa', 14, Math.PI); await boton('Rueda de prensa'); await sleep(400); await shot('08_rueda_prensa');
  out.rueda = await p.evaluate(() => { const b = document.querySelector('.sp-respuesta'); if (b) b.click(); return !!b; }); await sleep(500);
  await sala('fisio', 13, -0.6); await boton('Parte médico'); await sleep(400); await shot('09_parte_medico');
  await boton('Tratamiento intensivo'); await sleep(300); out.tratado = await p.evaluate(() => { const st = GM.state; return st.equipos[st.clubId].plantilla.map(i => st.jugadores[i]).filter(x => x.estado.lesion).map(x => x.estado.lesion.dias + (x.estado.lesion.tratado ? ' tratado' : '')).join(','); });
  await sala('gimnasio', 14, 0.3); await boton('Sesión de fuerza'); await sleep(600); await shot('10_gimnasio');
  await sala('recepcion', 13, Math.PI + 0.3); await boton('Próximo partido'); await sleep(400); await shot('11_proximo_partido');
  await boton('Avanzar un día'); await sleep(1500); out.fecha = await p.evaluate(() => GM.state.fecha); await p.evaluate(() => document.querySelectorAll('.hoja').forEach(x => x.closest('.fondo') && x.closest('.fondo').remove()));
  await sala('cafeteria', 12, Math.PI); await sleep(2500); await shot('12_cafeteria_sentados');
  out.sentados = await p.evaluate(() => GM.sede._estado().gente.filter(n => n.sentado).length);
  out.info = await p.evaluate(() => { const S = GM.sede._estado(); return { gente: S.gente.length, calls: S.renderer.info.render.calls, tris: S.renderer.info.render.triangles }; });
  console.log(JSON.stringify(out, null, 1), '\nerrores:', errs.slice(0, 8));
  await b.close();
})();
