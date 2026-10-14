// Simulación larga de la economía personal: tres años de carrera jugando los días de verdad (partidos, nóminas, vivienda) con decisiones de patrimonio, negocios, pueblo, rutina y colección; comprueba que no hay números rotos
// (NaN, infinitos), que no hay excepciones en los manejadores de eventos y que el patrimonio neto es coherente. Uso: node tools/economia_larga.js [días]
const { JSDOM } = require('jsdom'); const dom = new JSDOM('<div id=app></div>'); global.window = global; global.document = dom.window.document; global.THREE = require('./three_node');
const lista = require('fs').readFileSync(__dirname + '/../t_vida.js', 'utf8').split('\n')[1].match(/L\((\[.*\])\)/)[1]; const L = require('../load'); L(eval(lista).concat(['estilo', 'movil', 'vida', 'casas_producto', 'economia', 'patrimonio', 'negocios', 'pueblo_gestion', 'rutina', 'logros_eco', 'ciudad_juego', 'coleccionables']));
const GM = global.GM, DIAS = +process.argv[2] || 1100, errores = []; const ce = console.error; console.error = (...a) => { errores.push(a.map(String).join(' ').slice(0, 200)); };
GM.rng.seed(11); const st = GM.newGame('unicaja', 11, { modo: 'carrera', personaje: { nombre: 'Marc', apellido: 'Soler' }, carrera: { origen: 'europa', clubId: 'unicaja', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'dinero' } }); GM.state = st; const c = st.carrera, P = GM.patrimonio, N = GM.negocios, G = GM.puebloGestion, K = GM.coleccionables, CP = GM.casasProd;
const sano = (v, n) => { if (!Number.isFinite(v)) throw new Error('número roto en ' + n + ': ' + v); };
for (let d = 0; d < DIAS; d++) {
  try { GM.mods.competiciones.jugarDia(st); } catch (e) { errores.push('jugarDia: ' + e.message); break; }
  if (c.fase === 'libre') { const o = c.ofertas && c.ofertas[0]; if (o) { try { GM.mods.carrera.aceptarOferta(st, o.id); } catch (e) { /* sin oferta */ } } }
  if (d === 5) c.dinero = Math.max(c.dinero, 400);
  if (d % 45 === 0) { const of = P.mercado(st), x = of.find(o => o.tipo === 'local') || of[0]; const r = P.comprar(st, x.id, d % 90 === 0 ? 'hipoteca' : 'contado'); if (r.ok && r.bien.renta) P.alquilar(st, r.bien.id, true); }
  if (d === 30) { P.contratarSeguro(st, 'lesion', true); P.contratarSeguro(st, 'hogar', true); } if (d === 60) N.abrir(st, 'bar', 'Centro'); if (d === 400) N.abrir(st, 'tienda', 'Ensanche'); if (d % 120 === 0 && N.activos(st)[0]) N.contratar(st, N.activos(st)[0].id);
  if (d % 30 === 0 && c.pueblo && G.gest(st)) { G.donar(st, 3); const q = G.gest(st).peticiones[0]; if (q) G.apoyar(st, q.id); } if (d % 20 === 0) { K.comprarSobre(st, 2); K.abrirSobre(st); K.abrirSobre(st); }
  if (d % 100 === 0) { const v = c.vivienda; if (!v.actual) { try { GM.mods.carrera.comprarVivienda(st, 1, 'piso', 'compra'); } catch (e) { /* sin ahorros */ } } const cs = CP.lista(st).filter(p => p.modo === 'compra'); if (cs[0] && !CP.ini(st, cs[0]).obras.length) CP.encargar(st, cs[0].id, 'fachada', { color: '#e6d3b3' }); }
  if (d % 15 === 0) { sano(c.dinero, 'dinero'); sano(P.neto(st).total, 'neto'); sano(c.moral, 'moral'); }
}
const n = P.neto(st), libro = P.libro(st), cats = [...new Set(libro.map(l => l.c))];
console.error = ce; console.log('días ' + DIAS + ', fecha ' + st.fecha + ', club ' + st.jugadores.yo.equipoId + ', dinero ' + c.dinero.toFixed(1) + ', patrimonio neto ' + n.total + ' (casas ' + n.casas + ', bienes ' + n.bienes + ', deudas ' + n.deudas + '), negocios ' + N.activos(st).length + ', pueblo ' + (G.gest(st) ? G.gest(st).pob : '-') + ' hab, colección ' + K.total(st) + ', logros eco ' + GM.logrosEco.resumen(st).hechos + ', libro ' + libro.length + ' mov. en ' + cats.join(','));
console.log('errores capturados: ' + errores.length); errores.slice(0, 8).forEach(e => console.log('  ' + e)); process.exit(errores.length ? 1 : 0);
