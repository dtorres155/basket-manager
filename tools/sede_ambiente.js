// Prueba la sede según el día y el ánimo: sesión de grupo (rueda y 3x3), día de partido, tras derrota y desanimados.
// Uso: node tools/sede_ambiente.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'sede_ambiente'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const out = {};
  const abrir = async (prep) => {
    await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(700);
    await p.evaluate(prep); await sleep(8500);
    await p.evaluate(() => document.querySelectorAll('.sede-ayuda').forEach(e => e.style.display = 'none'));
  };
  const camara = (x, z, zoom, yaw) => p.evaluate(([x, z, zoom, yaw]) => { const S = GM.sede._estado(); S.yo.obj.visible = false; S.yo.obj.position.set(x, 0, z); S.foco.set(x, 0, z); S.zoom = zoom; S.yawObj = S.yaw = yaw; }, [x, z, zoom, yaw]);
  const nueva = `localStorage.clear(); const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: pj }); GM.ui.start(document.getElementById('app'));`;
  // 1) Día normal: sesión de grupo
  await abrir(new Function(nueva + ` GM.sede.abrir(GM.state); setTimeout(() => GM.sede._grupo(), 7000);`));
  await camara(-13, -5, 13, 0.5); await sleep(9000);
  out.grupo1 = await p.evaluate(() => { const G = GM.sede._estado().grupo; return G && { tipo: G.tipo, miembros: G.miembros.length, fase: G.fase, pases: G.pases }; });
  await camara(-13, -5, 13, 0.5); await p.screenshot({ path: path.join(DIR, '1_grupo_' + (out.grupo1 ? out.grupo1.tipo : 'nada') + '.png') });
  // forzar el siguiente grupo (el otro tipo)
  await p.evaluate(() => { const S = GM.sede._estado(); S.grupo && (S.grupo.t = 999); }); await sleep(600); await p.evaluate(() => GM.sede._grupo()); await sleep(14000);
  out.grupo2 = await p.evaluate(() => { const G = GM.sede._estado().grupo; return G && { tipo: G.tipo, miembros: G.miembros.length, fase: G.fase, pases: G.pases }; });
  await camara(-14, -5.5, 12, 0.6); await p.screenshot({ path: path.join(DIR, '2_grupo_' + (out.grupo2 ? out.grupo2.tipo : 'nada') + '.png') });
  // 2) Día de partido en casa
  await abrir(new Function(nueva + ` const st = GM.state, g = GM.mods.competiciones.proximoPartido(st, st.clubId); st.fecha = g.fecha; GM.sede.abrir(st);`));
  out.partido = await p.evaluate(() => ({ dia: GM.sede._estado().dia.texto, fans: GM.sede._estado().gente.filter(n => n.aficionado).length }));
  await camara(6, 13.5, 11, Math.PI + 0.2); await sleep(5000); await p.screenshot({ path: path.join(DIR, '3_dia_partido.png') });
  // 3) Tras una derrota, con un jugador desanimado
  await abrir(new Function(nueva + ` const st = GM.state, C = GM.mods.competiciones; C.avanzarHastaPartido(st, st.clubId); const g = C.proximoPartido(st, st.clubId); C.jugarDia(st); const r = g.resultado; if (r) { const mio = g.local === st.clubId; if ((mio && r.local > r.visitante) || (!mio && r.visitante > r.local)) { const t = r.local; r.local = r.visitante; r.visitante = t; } } st.equipos[st.clubId].plantilla.slice(0, 3).forEach(i => { st.jugadores[i].estado.moral = 30; }); GM.sede.abrir(st);`));
  out.derrota = await p.evaluate(() => { const S = GM.sede._estado(); return { dia: S.dia.texto, presentes: S.gente.filter(n => !n.fijo).length, cabizbajos: S.gente.filter(n => n.cabizbajo).length }; });
  await sleep(6000); await p.evaluate(() => { const S = GM.sede._estado(), n = S.gente.find(n => n.cabizbajo); if (n) { n.espera = 999; n.camino = null; n.obj.position.set(2.6, 0, 3.4); GM.sede._anim(n, 'walk'); n.actual = null; } });
  await camara(2.6, 3.4, 6, 0.3); await sleep(1500); await p.screenshot({ path: path.join(DIR, '4_desanimado.png') });
  console.log(JSON.stringify(out, null, 1), '\nerrores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
