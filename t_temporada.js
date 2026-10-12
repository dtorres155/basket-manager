// Pretemporada, selecciones, All-Star, ojeadores, negociaciones, rivalidades con historia, prensa con memoria, entrenador y ciudad que crece.
const assert = require('assert');
const L = require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','finanzas','ciudad','contratos','partidos','competiciones','mercado','cantera','personaje','carrera','estilo','movil','fans','copas','continental','rivalidades','entrenador','social','sponsor','pueblo','vida','gente','hogar','pretemporada','allstar','ojeadores','negociacion','prensa','tactica','crecimiento'].filter(f => require('fs').existsSync(__dirname + '/' + f + '.js')));
let fallos = 0; const ok = (n, c) => { if (!c) { fallos++; console.log('FALLA', n); } else console.log('ok   ', n); };
Object.keys(GM.mods).forEach(k => { const m = GM.mods[k]; if (['pretemporada', 'allstar', 'ojeadores', 'negociacion', 'prensa', 'tactica', 'crecimiento'].indexOf(k) >= 0 && m.selfTest) ok('selfTest ' + k, m.selfTest()); });
const avanza = (st, hasta) => { let g = 0; while (st.fecha < hasta && g++ < 600) GM.mods.competiciones.jugarDia(st); };
// ---- una temporada completa en modo gestor: All-Star y, al pasar de temporada, pretemporada y selección
const st = GM.newGame('joventut-badalona', 11, { modo: 'gestor', personaje: GM.mods.personaje.crear() }); GM.state = st;
if (GM.mods.allstar) { avanza(st, '2027-02-20'); const ev = GM.mods.allstar.estado(st).eventos; const hechos = Object.values(ev).filter(e => e.estado === 'hecho'); ok('All-Star celebrados: ' + hechos.map(e => e.id).join(','), hechos.length >= 1 && hechos.every(e => e.partido && e.triples.ganador && e.mates.ganador)); }
{ let g = 0; while (!st.temporadaTerminada && g++ < 500) GM.mods.competiciones.jugarDia(st); ok('temporada terminada', st.temporadaTerminada); }
GM.mods.competiciones.nuevaTemporada(st); st.temporadaTerminada = false;
if (GM.mods.pretemporada) {
  const P = GM.mods.pretemporada.estado(st); ok('cuatro amistosos y torneo', P.amistosos.length === 4 && P.torneo && P.torneo.semis.length === 2);
  avanza(st, '2027-09-20'); const am = GM.mods.pretemporada.amistososClub(st); ok('amistosos jugados: ' + am.filter(g => g.resultado).length, am.filter(g => g.resultado).length >= 5);
  ok('el torneo tiene campeón', !!P.torneo.campeon); ok('los amistosos no puntúan', Object.values(st.clasificaciones).every(t => !t || JSON.stringify(t).indexOf('"AMISTOSO"') < 0));
  ok('ventana de selección resuelta (Mundial 2027)', !!P.seleccion && P.seleccion.id === 'MUNDIAL' && P.seleccion.convocados.length >= 0 && !!P.seleccion.campeon);
}

// ---- ojeadores: contratar, asignar y recibir informes
{
  const O = GM.mods.ojeadores, st2 = GM.newGame('joventut-badalona', 5, { modo: 'gestor', personaje: GM.mods.personaje.crear() }); GM.state = st2;
  const c = O.candidatos(st2); ok('seis candidatos a ojeador', c.length === 6); const r = O.contratar(st2, c[0].id); ok('contratar ojeador', r.ok);
  O.asignar(st2, O.estado(st2).equipo[0].id, 'ACB'); for (let i = 0; i < 3; i++) { st2.fecha = GM.util.addDays(st2.fecha, 7); O.semana(st2); }
  ok('informes de ojeo con rangos', O.informes(st2).length >= 3 && O.informes(st2).every(i => i.ovr[0] <= i.ovr[1] && i.pot[0] <= i.pot[1]));
  // ---- negociación: el agente, las cláusulas y el contrato firmado
  const N = GM.mods.negociacion, libre = GM.mods.mercado.libres(st2)[0], ses = N.abrir(st2, libre.id, 'fichar').sesion;
  const mala = N.proponer(st2, ses, { salario: Math.round(ses.pedido * 0.6), anos: 2 }); ok('oferta baja no se acepta (' + mala.estado + ')', mala.estado !== 'acepta');
  const ses2 = N.abrir(st2, libre.id, 'fichar').sesion, buena = N.proponer(st2, ses2, { salario: Math.round(ses2.pedido * 1.05), anos: 2, opcion: 'jugador', bonus: [{ tipo: 'playoffs', cant: 100000 }], clausula: 20e6 });
  ok('oferta buena acepta', buena.estado === 'acepta'); st2.equipos[st2.clubId].plantilla.length > 14 && GM.mods.mercado.liberar(st2, st2.equipos[st2.clubId].plantilla[st2.equipos[st2.clubId].plantilla.length - 1]);
  const cerrado = N.cerrar(st2, ses2); ok('contrato con cláusulas firmado: ' + (cerrado.motivo || ''), cerrado.ok === true && libre.contrato.clausula === 20e6 && libre.contrato.opcion === 'jugador' && libre.contrato.bonus.length === 1);
  // opción del club pendiente al cerrar contratos
  libre.contrato.hasta = parseInt(st2.temporada.slice(0, 4), 10) + 1; libre.contrato.opcion = 'club'; ok('opción del club pendiente', N.opcionesClub(st2).some(o => o.jugId === libre.id)); N.decidirOpcionClub(st2, libre.id, true); ok('opción ejercida', libre.contrato.hasta === parseInt(st2.temporada.slice(0, 4), 10) + 2 && N.opcionesClub(st2).length === 0);
  // ---- prensa con memoria
  const Pr = GM.mods.prensa, conf = Pr.conferencia(st2); ok('rueda de prensa con opciones', conf.respuestas.length >= 3 && !!conf.pregunta);
  const iPromesa = conf._o.findIndex(o => o.promesa); if (iPromesa >= 0) { const rr = Pr.responder(st2, iPromesa); ok('promesa registrada', rr.ok && Pr.abiertas(st2).length === 1); Pr.abiertas(st2)[0].desde = GM.util.addDays(st2.fecha, -30); st2.fecha = GM.util.addDays(st2.fecha, 1); ok('la prensa recuerda la promesa', Pr.conferencia(st2).contexto !== undefined); }
  // ---- táctica: informe del rival y plan
  const T = GM.mods.tactica, riv = st2.ligas.ACB.equipos.find(i => i !== st2.clubId); T.contratar(st2, 'analista'); T.contratar(st2, 'analista'); T.contratar(st2, 'analista');
  const inf = T.informeRival(st2, riv); ok('informe del rival de nivel 3', inf.nivel === 3 && !!inf.recomendacion && inf.quinteto.length === 5 && !!inf.clave);
  ok('aplicar recomendación', T.aplicarRecomendacion(st2, riv).ok && !!st2.equipos[st2.clubId].tactica.ataque); ok('charla', T.charla(st2, 'motivar').ok && !T.charla(st2, 'calma').ok);
  // ---- el simulador acepta la táctica ampliada
  const g = GM.mods.competiciones.proximoPartido(st2, st2.clubId); st2.equipos[st2.clubId].tactica = Object.assign(GM.mods.partidos.tacticaValida(st2, st2.clubId), { presion: 'alta', ataque: 'pick', rebote: 'ofensivo', rotacion: 'corta' }); const sim = GM.mods.partidos.simular(st2, g); ok('simulación con táctica ampliada', sim.local > 40 && sim.visitante > 40);
  // ---- la ciudad crece
  const Cr = GM.mods.crecimiento, cc = st2.ciudad[st2.clubId]; cc.aficion = 80; cc.apoyoAyuntamiento = 80; st2.equipos[st2.clubId].reputacion = 80; st2.fecha = '2027-03-01'; GM.bus.emit('dia:avanzado', {});
  ok('hitos disponibles al crecer', Cr.hitos(st2).filter(h => h.estado === 'disponible').length >= 4); ok('impulsar el hito', Cr.impulsar(st2, 'fanzone').ok || Cr.impulsar(st2, 'pistas').ok);
  // ---- rivalidades con historia
  const Rv = GM.mods.rivalidades; const a = st2.clubId, b2 = 'fc-barcelona'; const gg = { id: 'gX', fecha: st2.fecha, comp: 'ACB', fase: 'regular', local: a, visitante: b2, resultado: { local: 98, visitante: 70 } }; st2.calendario.push(gg); GM.bus.emit('partido:jugado', { partido: gg });
  const H = Rv.historia(st2, a, b2); ok('recuerdo de una paliza en el derbi', H.recuerdos.length >= 1 && H.recuerdos[0].tipo === 'paliza' && Rv.ambiente(st2, a, b2) >= 1);
}
console.log(fallos ? 'FALLOS ' + fallos : 'Todo bien en t_temporada');
process.exit(fallos ? 1 : 0);
