// Pestañas nuevas de los puntos 62 a 66 en modo gestor: Árbol de mejoras, Entrenamiento, Pizarra, Traspasos, Selecciones y All-Star en directo. Uso: node tools/tanda31_ui.js
const { chromium } = require('playwright'); const { sleep } = require('./ayudas'); const fs = require('fs');
(async () => {
  fs.mkdirSync('capturas/tanda31', { recursive: true });
  const b = await chromium.launch({ channel: 'msedge' }), p = await (await b.newContext({ viewport: { width: 1000, height: 900 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text().slice(0, 160)); });
  await p.goto('http://localhost:8080/'); await sleep(700); const filas = []; let ok = true; const chk = (c, t) => { filas.push((c ? 'ok    ' : 'FALLA ') + t); if (!c) ok = false; };
  await p.evaluate(() => { GM.newGame('joventut-badalona', 11, { modo: 'gestor', personaje: GM.mods.personaje.crear() }); GM.ui.start(document.getElementById('app')); const st = GM.state; st.finanzas[st.clubId].caja = 5e8; });
  // datos para que las pantallas tengan contenido
  await p.evaluate(() => { const st = GM.state, T = GM.traspasos, id = st.clubId; const ob = GM.mods.mercado.buscar(st, { liga: 'ACB', minOvr: 70 })[3]; T.abrir(st, ob.id, 'comprar'); T.recordar(st, ob.id, 'acuerdo'); T.est(st).rumores.push({ id: 'ru0', tipo: 'interes', jugId: ob.id, clubId: ob.equipoId, texto: 'Radio local: «' + st.equipos[ob.equipoId].nombre + ' sigue de cerca a un jugador tuyo».', f: st.fecha, fuente: 'radio', fiable: true, resuelto: null, vence: st.fecha });
    const mio = st.equipos[id].plantilla.map(i => st.jugadores[i]).filter(p => !p.esYo)[2]; T.est(st).ofertas.push({ id: 'of0', jugId: mio.id, clubId: ob.equipoId, precio: 2500000, jugador: null, desde: st.fecha, hasta: '2099-01-01' }); const g = GM.mods.competiciones.proximoPartido(st, id); GM.tacticaPlus.preparar(st, g.local === id ? g.visitante : g.local);
    for (let i = 0; i < 12; i++) { st.fecha = GM.util.addDays(st.fecha, 1); GM.bus.emit('dia:avanzado', {}); } });
  const ir = async (pant, tab, nombre, esperar) => { await p.evaluate(([pa, ta]) => { GM.ui._.ui.tab[pa] = ta; GM.ui.navegar(pa); }, [pant, tab]); await sleep(900); await p.screenshot({ path: 'capturas/tanda31/' + nombre + '.png', fullPage: true }); const t = await p.evaluate(() => document.body.innerText); chk(esperar.every(r => r.test(t)), nombre + ': ' + esperar.map(String).join(' ')); return t; };
  await ir('club', 'arbol', 'arbol', [/Árbol de mejoras/, /Cantera \(/, /Analítica \(/]);
  await ir('plantilla', 'entrenamiento', 'entrenamiento', [/Entrenamiento colectivo/, /Plantilla \(/]);
  await ir('plantilla', 'pizarra', 'pizarra', [/Libro de jugadas/, /Emparejamientos/, /Minutos objetivo/, /Química del equipo/]);
  await ir('mercado', 'traspasos', 'traspasos', [/Mercado/, /Negociaciones abiertas/, /Ofertas por tus jugadores/, /Rumores de prensa/, /Agencias de representantes/]);
  // proponer una oferta desde la pantalla
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Hacer la oferta/.test(x.textContent)); if (b) b.click(); }); await sleep(600); const t2 = await p.evaluate(() => document.body.innerText); chk(/Ronda 1 de 4/.test(t2) && /«/.test(t2), 'la oferta recibe respuesta del director'); await p.screenshot({ path: 'capturas/tanda31/traspasos_oferta.png', fullPage: true });
  // selecciones
  await p.evaluate(() => { const st = GM.state; st.fecha = '2027-08-01'; st.temporada = '2027-28'; GM.bus.emit('temporada:nueva', {}); const c = GM.seleccion.convocados(st); if (!c.length) { const m = st.equipos[st.clubId].plantilla.map(i => st.jugadores[i]).sort((a, b) => b.ovr - a.ovr)[0], V = GM.mods.pretemporada.estado(st).ventana, E = V.equipos.find(t => t.pais === m.nac) || V.equipos[0]; E.jugadores.unshift(m.id); } });
  await ir('calendario', 'selecciones', 'selecciones', [/Mundial/, /Tus convocados/, /Grupos/, /Salón de la fama del club/]);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Dejarle ir/.test(x.textContent)); if (b) b.click(); }); await sleep(500);
  await p.evaluate(() => { const st = GM.state; for (let i = 0; i < 45; i++) { st.fecha = GM.util.addDays(st.fecha, 1); GM.bus.emit('dia:avanzado', { fecha: st.fecha }); } });
  await ir('calendario', 'selecciones', 'selecciones_fin', [/Eliminatorias/, /Campeón/, /Salón de la fama del club: medallas/]);
  await ir('calendario', 'pretemporada', 'pretemporada', [/Pretemporada/]);
  // All-Star en directo desde la pantalla
  await p.evaluate(() => { const st = GM.state; st.fecha = '2027-01-20'; st.temporada = '2026-27'; GM.mods.allstar.nuevaPartida(st); const ev = Object.values(st.allstar.eventos)[0]; st.estComp = st.estComp || {}; st.estComp[ev.id] = st.estComp[ev.id] || {}; const L = Object.values(st.jugadores).filter(j => j.equipoId && GM.mods.mercado.ligaDe(st, j.equipoId) === ev.id && !j.esYo); L.forEach((j, k) => { st.estComp[ev.id][j.id] = [30, 30 * 24, 30 * (10 + (k % 12)), 30 * 5, 30 * 3, 30, 30]; }); st.fecha = GM.util.addDays(ev.fecha, -3); });
  const tas = await ir('calendario', 'allstar', 'allstar', [/El partido de las estrellas en directo/, /Ver el partido en directo/]);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Ver el partido en directo/.test(x.textContent)); if (b) b.click(); }); await sleep(2500); await p.screenshot({ path: 'capturas/tanda31/allstar_directo.png' });
  const dir = await p.evaluate(() => !!document.querySelector('.directo')); chk(dir, 'se abre el partido en directo'); void tas;
  console.log(filas.join('\n')); console.log((ok ? 'ok' : 'FALLA') + ', errores: ' + (errs.length ? errs.slice(0, 5).join(' | ') : 'ninguno')); await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();
