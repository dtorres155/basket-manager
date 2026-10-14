// Progresión económica y logros (punto 59): logros económicos que aparecen en vida.logros, retos por etapa que se cumplen y se premian, y el cambio de etapa con la fama. Usa una partida de carrera completa.
const { JSDOM } = require('jsdom'); const dom = new JSDOM('<div id=app></div>'); global.window = global; global.document = dom.window.document; global.THREE = require('./tools/three_node');
const lista = require('fs').readFileSync(__dirname + '/t_vida.js', 'utf8').split('\n')[1].match(/L\((\[.*\])\)/)[1]; const L = require('./load'); L(eval(lista).concat(['estilo', 'movil', 'vida', 'casas_producto', 'economia', 'patrimonio', 'negocios', 'pueblo_gestion', 'rutina', 'logros_eco']));
const GM = global.GM, E = GM.logrosEco, assert = require('assert'); GM.rng.seed(5); assert(E.selfTest(), 'logrosEco.selfTest');
const st = GM.newGame('unicaja', 5, { modo: 'carrera', personaje: { nombre: 'Marc', apellido: 'Soler' }, carrera: { origen: 'europa', clubId: 'unicaja', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'dinero' } }); GM.state = st; const c = st.carrera, V = GM.mods.vida;
const avanza = d => { for (let i = 0; i < d; i++) { st.fecha = GM.util.addDays(st.fecha, 1); GM.bus.emit('dia:avanzado', {}); } };
assert(V.logros(st).filter(x => /^eco_/.test(x.id)).length >= 20, 'los logros económicos salen con los demás'); assert(E.etapa(st) === 'promesa' || E.etapa(st) === 'profesional', 'etapa ' + E.etapa(st));
// reto de la etapa: seguro de lesión, primera inversión y patrimonio
c.dinero = 300; const P = GM.patrimonio; P.contratarSeguro(st, 'lesion', true); const of = P.mercado(st).find(o => o.tipo === 'aparcamiento'); assert(P.comprar(st, of.id, 'contado').ok, 'inversión'); avanza(2);
const R = E.retos(st); assert(R.length === 3 && R.filter(r => r.hecho).length >= 2, 'retos cumplidos: ' + JSON.stringify(R.map(r => [r.id, r.valor, r.meta, r.hecho]))); assert(st.carrera.hitos.some(h => /Reto económico cumplido/.test(h.texto)), 'hito del reto');
// logros económicos
assert(V.logros(st).find(x => x.id === 'eco_inversor').fecha, 'logro de inversor'); P.alquilar(st, P.est(st).bienes[0].id, true); avanza(40); assert(V.logros(st).find(x => x.id === 'eco_alquiler').fecha, 'logro de casero');
// patrimonio alto: logros por tramos y cambio de etapa con la fama
c.dinero = 150000; Object.defineProperty(c, 'fama', { value: 70, writable: true, configurable: true }); avanza(2); const g = V.logros(st).filter(x => /^eco_n/.test(x.id)); assert(g.find(x => x.id === 'eco_n100').fecha && g.find(x => x.id === 'eco_n2000').fecha && g.find(x => x.id === 'eco_n50000').fecha, 'logros de patrimonio'); assert(E.etapa(st) === 'estrella', 'etapa estrella'); assert(E.retos(st).some(r => r.id === 'e1' && r.hecho), 'reto de 3 millones'); assert(st.noticias.some(n => /Nueva etapa/.test(n.texto || n)), 'aviso de nueva etapa');
const r = E.resumen(st); assert(r.hechos >= 6 && r.logros >= 24, 'resumen ' + JSON.stringify([r.hechos, r.logros]));
console.log('OK t_logros_eco (' + r.hechos + ' de ' + r.logros + ' logros económicos, etapa ' + r.etapa + ')');
