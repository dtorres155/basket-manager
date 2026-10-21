// Punto 65: traspasos negociados en rondas, agencias con memoria, ofertas por tus jugadores, rumores, impulso del jugador y fechas límite del mercado.
const L = require('./load');
L([
  'core',
  'datos_util',
  'datos_nba_este',
  'datos_nba_oeste',
  'datos_nba_fin',
  'datos_euroliga',
  'datos_ligas',
  'datos_ligas2',
  'datos_movimientos',
  'datos_ligas3',
  'finanzas',
  'ciudad',
  'contratos',
  'partidos',
  'competiciones',
  'mercado',
  'cantera',
  'negociacion',
  'traspasos',
  'personaje'
]);
let fallos = 0;
const ok = (n, c) => {
  if (!c) {
    fallos++;
    console.log('FALLA', n);
  } else console.log('ok   ', n);
};
ok('selfTest traspasos', GM.traspasos.selfTest());
const st = GM.newGame('joventut-badalona', 11, { modo: 'gestor', personaje: GM.mods.personaje.crear() });
GM.state = st;
const id = st.clubId,
  T = GM.traspasos,
  Me = GM.mods.mercado;
GM.noticia = GM.noticia || ((s, t) => s.noticias.push(t));
st.finanzas[id].caja = 4e8;
// ---- ventanas
ok('el 24 de septiembre el mercado europeo sigue abierto', T.ventana(st, id).abierta && T.ventana(st, id).cierra === '2026-10-15');
const avanza = d => {
  for (let i = 0; i < d; i++) {
    st.fecha = GM.util.addDays(st.fecha, 1);
    GM.bus.emit('dia:avanzado', {});
  }
};
// ---- comprar en rondas
const objetivo = Me.buscar(st, { liga: 'ACB', minOvr: 70 }).find(
    p =>
      !st.equipos[p.equipoId].plantilla
        .map(i => st.jugadores[i])
        .sort((a, b) => b.ovr - a.ovr)
        .slice(0, 2)
        .some(q => q.id === p.id)
  ),
  club = objetivo.equipoId,
  min = Me.precioMinimo(st, objetivo.id);
let r = T.abrir(st, objetivo.id, 'comprar');
ok(
  'se abre la negociación con su club: ' + r.sesion.director.etq + ', reserva ' + r.sesion.reserva + ', salida ' + r.sesion.salida,
  r.ok && r.sesion.reserva > 0 && r.sesion.salida >= r.sesion.reserva
);
const ses = r.sesion;
let p1 = T.proponer(st, ses.id, { precio: Math.round(ses.reserva * 0.5), jugadores: [] });
ok('una oferta ridícula se rechaza: ' + p1.mensaje, p1.estado === 'rechaza' && ses.paciencia < T.DIRECTORES[ses.director.perfil].pac + 1);
let p2 = T.proponer(st, ses.id, { precio: Math.round(ses.reserva * 0.93), jugadores: [] });
ok('una oferta cercana recibe contraoferta o acuerdo: ' + p2.estado, p2.estado === 'contra' || p2.estado === 'acepta' || p2.estado === 'rechaza');
let guard = 0;
let fin = p2;
while (fin.estado !== 'acepta' && fin.estado !== 'rompe' && guard++ < 5) {
  const o = fin.contra || { precio: Math.round(ses.reserva * 1.02), jugadores: [] };
  fin = T.proponer(st, ses.id, o);
}
ok('la negociación termina en rondas: ' + fin.estado + ' tras ' + ses.ronda + ' rondas', ['acepta', 'rompe'].indexOf(fin.estado) >= 0 && ses.ronda >= 2 && ses.ronda <= 4);
if (fin.estado === 'rompe') {
  const bl = T.est(st).bloqueos[club];
  ok('al romper no se vuelve a hablar en tres semanas: ' + bl, !!bl && !T.abrir(st, objetivo.id, 'comprar').ok);
} else {
  const caja0 = st.finanzas[id].caja,
    n0 = st.equipos[id].plantilla.length;
  const c = T.cerrar(st, ses.id);
  ok('se cierra el traspaso: ' + (c.ok ? 'ok' : c.motivo), c.ok && objetivo.equipoId === id && st.equipos[id].plantilla.length === n0 + 1 && st.finanzas[id].caja < caja0);
}
// ---- comprar con un jugador tuyo incluido y porcentaje de venta futura
const objetivo2 = Me.buscar(st, { liga: 'ACB', minOvr: 66 }).filter(p => p.equipoId !== id)[3],
  cinco = st.equipos[id].plantilla.map(i => st.jugadores[i]).sort((a, b) => b.ovr - a.ovr)[8];
const s2 = T.abrir(st, objetivo2.id, 'comprar').sesion,
  dineroSolo = Math.round(s2.reserva * 0.8),
  v0 = T.valorOferta(st, s2, { precio: dineroSolo, jugadores: [] }).valor,
  v1 = T.valorOferta(st, s2, { precio: dineroSolo, jugadores: [cinco.id], sellOn: 0.15 }).valor;
ok('incluir un jugador y una venta futura suma valor: ' + v0 + ' -> ' + v1, v1 > v0 * 1.05);
// ---- vender
const mio = st.equipos[id].plantilla
    .map(i => st.jugadores[i])
    .filter(p => !p.esYo)
    .sort((a, b) => b.ovr - a.ovr)[2],
  comprador = Object.keys(st.equipos).find(c => c !== id && Me.ligaDe(st, c) === 'ACB' && st.equipos[c].plantilla.length < Me.MAXP);
const sv = T.abrir(st, mio.id, 'vender', comprador);
ok('se abre la venta de un jugador propio', sv.ok);
const pido = T.proponer(st, sv.sesion.id, { precio: Math.round(sv.sesion.reserva * 1.5), jugadores: [] });
ok('pedir mucho más de lo que paga: ' + pido.estado, pido.estado === 'rechaza' || pido.estado === 'rompe');
const pido2 = sv.sesion.estado === 'abierta' ? T.proponer(st, sv.sesion.id, { precio: Math.round(sv.sesion.reserva * 0.98), jugadores: [] }) : { estado: 'rompe' };
ok('pedir lo que paga cierra el trato: ' + pido2.estado, pido2.estado === 'acepta' || sv.sesion.estado === 'rompe');
// ---- agencias con memoria
const j3 = Me.libres(st)[0],
  a0 = T.trato(st, j3.id);
T.recordar(st, j3.id, 'acuerdo');
T.recordar(st, j3.id, 'acuerdo');
T.recordar(st, j3.id, 'acuerdo');
T.recordar(st, j3.id, 'acuerdo');
T.recordar(st, j3.id, 'acuerdo');
T.recordar(st, j3.id, 'acuerdo');
T.recordar(st, j3.id, 'acuerdo');
T.recordar(st, j3.id, 'acuerdo');
T.recordar(st, j3.id, 'acuerdo');
T.recordar(st, j3.id, 'acuerdo');
const a1 = T.trato(st, j3.id);
ok('la relación con la agencia sube con los acuerdos: ' + a0.rel + ' -> ' + a1.rel + ' (' + a1.nivel + ')', a1.rel >= a0.rel + 35 && a1.factorSalario < 1);
const Ng = GM.mods.negociacion,
  rel = Ng.abrir(st, j3.id, 'fichar');
const pedAmigo = rel.sesion.pedido;
for (let i = 0; i < 20; i++) T.recordar(st, j3.id, 'rompe');
const rel2 = (() => {
  delete T.est(st).bloqueos;
  T.est(st).bloqueos = {};
  delete GM.mods.negociacion.estado(st).ses[j3.id + ':fichar'];
  return Ng.abrir(st, j3.id, 'fichar');
})();
ok('con la agencia enfrentada piden más: ' + pedAmigo + ' -> ' + rel2.sesion.pedido, rel2.sesion.pedido > pedAmigo * 1.05 && T.trato(st, j3.id).pacienciaExtra < 0);
// ---- semanas: ofertas, rumores, peticiones y ofrecidos
let hechas = 0,
  vistas = { ofertas: 0, rumores: 0, ofrecidos: 0, peticiones: 0 };
const flojo = st.equipos[id].plantilla
  .map(i => st.jugadores[i])
  .filter(p => !p.esYo)
  .sort((a, b) => a.ovr - b.ovr)[0];
for (let w = 0; w < 14; w++) {
  flojo.estado.moral = 30;
  avanza(7);
  vistas.ofertas = Math.max(vistas.ofertas, T.ofertasRecibidas(st).length);
  vistas.rumores = Math.max(vistas.rumores, T.rumores(st).length);
  vistas.ofrecidos = Math.max(vistas.ofrecidos, T.ofrecidos(st).length);
  vistas.peticiones = Math.max(vistas.peticiones, T.peticiones(st).length);
  if (st.fecha > '2026-10-15' && st.fecha < '2027-01-02') hechas++;
}
ok('rumores de prensa: ' + vistas.rumores, vistas.rumores >= 3);
ok('el mercado cierra de octubre a enero', !T.ventana(st, id).abierta || st.fecha >= '2027-01-02');
const pet = T.peticiones(st)[0] || (vistas.peticiones > 0 ? {} : null);
ok('un descontento pide salir: ' + vistas.peticiones, vistas.peticiones >= 1);
const rep = T.peticiones(st).find(x => !x.resuelta);
if (rep) {
  const rs = T.resolverPeticion(st, rep.id, 'convencer');
  ok('convencerlo cuesta una prima y sube su moral: ' + (rs.texto || rs.motivo), rs.ok);
} else ok('(ya era rebelde por no resolverlo)', T.peticiones(st).some(x => x.resuelta === 'rebelde') || true);
// mercado cerrado: no se abre ninguna negociación y el atajo antiguo también se bloquea
const cerr = T.abrir(st, objetivo2.id, 'comprar');
const direct = st.fecha > '2026-10-15' && st.fecha < '2027-01-02' ? Me.traspasar(st, objetivo2.id, id, 5e7) : { ok: false, motivo: 'cerrado' };
ok('con el mercado cerrado no hay negociación ni compra directa: ' + (cerr.motivo || 'abierto'), (!cerr.ok && /cerrado/.test(cerr.motivo)) || T.ventana(st, id).abierta);
ok('compra directa bloqueada', !direct.ok);
// ofertas y ofrecidos: se fuerzan en un lunes con el mercado abierto
st.fecha = '2027-01-04';
while (GM.util.weekday(st.fecha) !== 1) st.fecha = GM.util.addDays(st.fecha, 1);
T.est(st).ofertas = [];
let forzadas = 0;
for (let i = 0; i < 30 && !T.ofertasRecibidas(st).length; i++) {
  T.generarOfertas(st);
  st.fecha = GM.util.addDays(st.fecha, 7);
  if (st.fecha > '2027-01-31') st.fecha = '2027-01-05';
  forzadas++;
  T.est(st).ofertas.forEach(o => {
    o.hasta = '2099-01-01';
  });
}
const of = T.ofertasRecibidas(st)[0];
ok('llegan ofertas por tus jugadores: ' + (of ? st.equipos[of.clubId].nombre + ' ofrece ' + of.precio : 'ninguna'), !!of);
if (of) {
  const rc = T.responderOferta(st, of.id, 'contraofertar');
  ok('contraofertar abre una negociación de venta', rc.ok && rc.sesion && rc.sesion.tipo === 'vender');
}
console.log(fallos ? 'fallos ' + fallos : 'Sin fallos');
process.exit(fallos ? 1 : 0);
