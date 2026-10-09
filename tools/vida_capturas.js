// Vida del jugador en pantalla: vestuario y lesión (Jugador), familia y redes (Ciudad, vida social), retos y logros (Carrera),
// la vitrina y la mascota en tu casa, tu casa del pueblo por dentro y las salidas tras la retirada.
// Uso: node tools/vida_capturas.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'vida'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => {
    const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' });
    GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
    const st = GM.state, y = st.jugadores.yo; y.ovr = 79; Object.keys(y.att).forEach(k => { y.att[k] = Math.max(y.att[k], 80); });
    try { localStorage.setItem('gm1:tutorial', JSON.stringify({ carrera: true, gestor: true, entrenador: true, presidente: true })); } catch (e) {}
    GM.ui.start(document.getElementById('app'));
    for (let i = 0; i < 45; i++) GM.mods.competiciones.jugarDia(st);
    y.estado.lesion = { tipo: 'Esguince de tobillo', dias: 12 }; GM.mods.competiciones.jugarDia(st);
    GM.mods.vida.publicar(st, 'familia'); st.fecha = GM.util.addDays(st.fecha, 1); GM.mods.vida.publicar(st, 'fiesta');
    GM.mods.vida.datos(st).familia.avisos.unshift({ fecha: st.fecha, texto: 'Tu hermano Dani sube al equipo junior.' });
  });
  const pantalla = async (n, fn, hasta) => { await p.evaluate(fn); await sleep(900); if (hasta) await p.evaluate(tx => { const e = [...document.querySelectorAll('.cuerpo h2, .cuerpo h3, .cuerpo .sec-t, .cuerpo b')].find(x => x.textContent.indexOf(tx) === 0); if (e) e.scrollIntoView(); }, hasta); await sleep(300); await p.screenshot({ path: path.join(DIR, n + '.png') }); };
  await pantalla('jugador', () => { const U = GM.ui._; U.navegar('jugador'); });
  await pantalla('vida_social', () => { const U = GM.ui._; U.ui.tab.ciudad = 'social'; U.navegar('ciudad'); }, 'Tu familia');
  await pantalla('carrera_logros', () => { const U = GM.ui._; U.navegar('trayectoria'); }, 'Retos de la temporada');
  console.log(await p.evaluate(() => 'móvil: ' + GM.mods.movil.chats(GM.state).map(c => c.nombre + (c.pendientes ? ' (decidir)' : '')).join(', ') + '\nlogros: ' + GM.mods.vida.logros(GM.state).filter(x => x.fecha).map(x => x.t).join(', ')));
  // casa con vitrina y perro
  await p.evaluate(() => { const st = GM.state; GM.mods.vida.adoptar(st, 'perro'); GM.campus.config.calidad = 'alta'; GM.sede.abrir(st, 'casa:' + GM.casa.idActual(st)); });
  await sleep(9000);
  await p.evaluate(() => { const S = GM.sede._estado(); document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); S.zoom = 9; S.inc = 0.8; });
  await sleep(1500); await p.screenshot({ path: path.join(DIR, 'casa_mascota.png') });
  console.log(await p.evaluate(() => { const S = GM.sede._estado(); return 'mascota en escena: ' + (S.mascota ? S.mascota.nombre + ' a ' + S.mascota.obj.position.distanceTo(S.yo.obj.position).toFixed(1) + ' m de ti' : 'no') + ', zonas: ' + S.zonas.map(z => z.sala.id).join(', '); }));
  // tu casa del pueblo: comprar, acabar la obra y entrar
  await p.evaluate(() => { const st = GM.state; st.carrera.dinero = 900; const r = GM.mods.pueblo.invertir(st, 'micasa'); (st.carrera.pueblo.obras || []).forEach(o => { o.fin = st.fecha; }); GM.mods.competiciones.jugarDia(st); window._micasa = r; GM.sede.cerrar(); GM.sede.abrir(st, 'interior:casa_pueblo'); });
  await sleep(9000);
  await p.evaluate(() => { const S = GM.sede._estado(); document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); S.zoom = 10; S.inc = 0.85; });
  await sleep(1500); await p.screenshot({ path: path.join(DIR, 'casa_pueblo.png') });
  console.log(await p.evaluate(() => 'casa del pueblo: ' + JSON.stringify(window._micasa).slice(0, 80) + ', ' + GM.sede._estado().interiorNombre + ', acciones: ' + GM.sede._estado().zonas.filter(z => z.sala.acciones).map(z => z.sala.acciones(GM.state).map(a => a.t + (a.disponible ? '' : ' (no)')).join(' / ')).join(' | ')));
  // retirada
  await p.evaluate(() => { GM.sede.cerrar(); GM.mods.carrera.retirarse(GM.state); GM.ui._.navegar('trayectoria'); });
  await sleep(900); await p.evaluate(() => { const e = [...document.querySelectorAll('.cuerpo *')].find(x => x.children.length === 0 && x.textContent === 'Después de la retirada'); if (e) e.scrollIntoView(); }); await sleep(300); await p.screenshot({ path: path.join(DIR, 'retirada.png') });
  await p.evaluate(() => { const V = GM.mods.vida, st = GM.state, o = V.ofertasRetiro(st)[0]; V.elegirRetiro(st, 'entrenador', o.clubes[0].id); GM.ui._.ui.pantalla = 'inicio'; GM.ui._.juego(); });
  await sleep(1200); await p.screenshot({ path: path.join(DIR, 'entrenador.png') });
  console.log('modo tras retirarse:', await p.evaluate(() => GM.state.modo + ', ' + document.querySelectorAll('.navb').length + ' botones de navegación'));
  console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
