/* MERCADO Y CONTRATOS MÁS RICOS (punto 65, GM.traspasos) — continúa negociacion.js (agentes libres y renovaciones) con todo lo que rodea a un traspaso. Modo gestor.
   - Traspasos negociados entre clubes, en rondas (hasta cuatro): el director del otro club tiene carácter (duro, justo o flexible), un precio de salida y un precio de reserva que no ves. Puedes ofrecer dinero, incluir
     jugadores tuyos (los valora el otro club) y un porcentaje de futura venta. Acepta, contraoferta o rechaza; si se agota su paciencia rompe y no vuelve a hablar contigo en 21 días. Lo mismo al vender.
   - Agentes con memoria: cada jugador pertenece a una agencia (14) que te recuerda: acuerdos cerrados, plantones y lowballs suben o bajan la relación (de -100 a 100), y la relación mueve lo que piden por sus clientes
     (hasta un 6 %), su paciencia y los soplos: con buena relación una agencia te avisa de jugadores que se pueden fichar con rebaja.
   - Ofertas por tus jugadores: cada semana, mientras el mercado está abierto, los clubes pujan por tus mejores jugadores (a veces ofreciendo a uno de los suyos); caducan a los siete días y puedes aceptar, rechazar o contraofertar.
   - Filtraciones de prensa: rumores de fuentes distintas (radio local, agencias, redes) con su fiabilidad; unos se confirman en dos semanas y otros eran falsos, y el juego recuerda cuánto acierta cada fuente.
   - Impulso del jugador: tus descontentos piden salir (con plazo: convencerlos cuesta una prima, ignorarlos baja la moral y los vuelve rebeldes) y jugadores de otros clubes se ofrecen a venir si tu club les atrae (su club baja el precio un 15 %).
   - Fechas límite: las ligas europeas tienen ventana del 1 de julio al 15 de octubre y del 2 al 31 de enero; la NBA, abierta hasta el 6 de febrero. Fuera de ellas no se cierran traspasos (sí fichajes de agentes libres). Avisos de cierre.
   Estado: state.mercadoPlus = { ses, ofertas, rumores, agencias, peticiones, ofrecidos, fuentes, bloqueos, seq }. Expone: ventana, abrir, proponer, cerrar, abandonar, trato, recordar, ofertasRecibidas, responderOferta, rumores,
   peticiones, resolverPeticion, ofrecidos, aceptarOfrecido, resumen, AGENCIAS, selfTest. Prueba: t_traspasos.js. */
(function () {
  const U = GM.util, clamp = U.clamp, M = () => GM.mods.mercado, F = () => GM.mods.finanzas, act = st => st && st.modo === 'gestor' && st.mercado && st.equipos && st.equipos[st.clubId];
  const AGENCIAS = ['Sports Capital', 'Nexo Management', 'Pivot Agency', 'Triple Doble', 'Aro Global', 'Bastión Sport', 'Zona Libre', 'Mar y Cancha', 'Quinteto Partners', 'Última Posesión', 'Primer Tiempo', 'Rebote Group', 'Línea de Tres', 'Doble Pivote'];
  const DIRECTORES = { duro: { etq: 'Director duro', desc: 'No baja de su precio y se cansa pronto.', res: 1.0, pac: 2, techo: 0.92 }, justo: { etq: 'Director justo', desc: 'Negocia con calma y acepta un precio razonable.', res: 0.92, pac: 3, techo: 1.0 }, flexible: { etq: 'Director flexible', desc: 'Busca cerrar el trato: cede si le ayudas.', res: 0.85, pac: 4, techo: 1.1 } };
  const est = st => st.mercadoPlus || (st.mercadoPlus = { ses: {}, ofertas: [], rumores: [], agencias: {}, peticiones: [], ofrecidos: [], fuentes: { radio: { ok: 0, n: 0 }, agencia: { ok: 0, n: 0 }, redes: { ok: 0, n: 0 } }, bloqueos: {}, seq: 0, hist: [] });
  const yearOf = st => parseInt(String(st.temporada).slice(0, 4), 10), nl = (st, id) => st.equipos[id].plantilla.length;
  const eur = v => U.eur(Math.round(v));
  // ---------- Fechas límite ----------
  function ventanaLiga(st, liga) {
    const f = st.fecha, md = f.slice(5), y = +f.slice(0, 4);
    if (liga === 'NBA') { const abierta = md <= '02-06' || md >= '07-01'; return { abierta, cierra: abierta ? (md <= '02-06' ? y + '-02-06' : (y + 1) + '-02-06') : null, abre: abierta ? null : y + '-07-01', nombre: 'Fecha límite de traspasos de la NBA' }; }
    const verano = md >= '07-01' && md <= '10-15', invierno = md >= '01-02' && md <= '01-31';
    if (verano) return { abierta: true, cierra: y + '-10-15', abre: null, nombre: 'Ventana de verano' }; if (invierno) return { abierta: true, cierra: y + '-01-31', abre: null, nombre: 'Ventana de invierno' };
    return { abierta: false, cierra: null, abre: md < '01-02' ? y + '-01-02' : md < '07-01' ? y + '-07-01' : (y + 1) + '-01-02', nombre: 'Mercado cerrado' };
  }
  const ligaDe = (st, id) => M().ligaDe(st, id);
  function ventana(st, clubIds) {
    const ids = [].concat(clubIds || st.clubId), vs = ids.map(id => ventanaLiga(st, ligaDe(st, id))), cerrada = vs.find(v => !v.abierta); if (cerrada) return cerrada;
    return vs.reduce((a, b) => (b.cierra < a.cierra ? b : a));
  }
  const motivoCerrado = (st, ids) => { const v = ventana(st, ids); return v.abierta ? null : 'El mercado está cerrado: abre el ' + U.fechaLarga(v.abre) + '.'; };
  // ---------- Agencias con memoria ----------
  const agenciaDe = (st, jugId) => AGENCIAS[(U.hash(jugId + 'agencia') >>> 0) % AGENCIAS.length];
  const ag = (st, nombre) => { const E = est(st); return E.agencias[nombre] || (E.agencias[nombre] = { rel: 0, hist: [] }); };
  const NIV = rel => (rel >= 60 ? 'Confianza total' : rel >= 25 ? 'Buena relación' : rel > -25 ? 'Neutral' : rel > -60 ? 'Tensa' : 'Enfrentados');
  function trato(st, jugId) { const n = agenciaDe(st, jugId), a = ag(st, n); return { agencia: n, rel: Math.round(a.rel), nivel: NIV(a.rel), factorSalario: Math.round((1 - a.rel / 100 * 0.06) * 1000) / 1000, pacienciaExtra: a.rel >= 40 ? 1 : a.rel <= -40 ? -1 : 0 }; }
  const DELTA = { acuerdo: 4, rompe: -9, lowball: -2, renovacion: 5, bonus: 3, venta: -1, despido: -6, convencer: 3, ignorar: -5, plantón: -7 };
  function recordar(st, jugId, tipo, texto) { if (!st.mercado) return; const a = ag(st, agenciaDe(st, jugId)), d = DELTA[tipo] || 0; a.rel = clamp(a.rel + d, -100, 100); a.hist.unshift({ f: st.fecha, tipo, t: texto || '', d }); if (a.hist.length > 12) a.hist.length = 12; }
  // ---------- Negociación de traspasos ----------
  const dirDe = (st, clubId) => { const h = (U.hash(clubId + 'director') >>> 0) % 100, k = h < 30 ? 'duro' : h < 75 ? 'justo' : 'flexible'; return Object.assign({ perfil: k }, DIRECTORES[k]); };
  const valorMio = (st, jugId, compradorId) => M().valorIA ? M().valorIA(st, jugId, compradorId) : M().precioMinimo(st, jugId);
  function abrir(st, jugId, tipo, otroClub, op) {
    if (!act(st)) return { ok: false, motivo: 'Solo en el modo gestor.' }; const E = est(st), p = st.jugadores[jugId]; op = op || {}; if (!p || !p.equipoId) return { ok: false, motivo: 'Jugador no disponible para traspaso.' };
    const user = st.clubId; if (tipo === 'comprar' && p.equipoId === user) return { ok: false, motivo: 'Ya es tuyo.' }; if (tipo === 'vender' && p.equipoId !== user) return { ok: false, motivo: 'No es tuyo.' };
    const otro = tipo === 'comprar' ? p.equipoId : otroClub; if (!otro || otro === user || !st.equipos[otro]) return { ok: false, motivo: 'Falta el club interesado.' };
    const cerrado = motivoCerrado(st, [user, otro]); if (cerrado) return { ok: false, motivo: cerrado };
    if (E.bloqueos[otro] && st.fecha < E.bloqueos[otro]) return { ok: false, motivo: st.equipos[otro].nombre + ' no quiere hablar contigo hasta el ' + U.fechaLarga(E.bloqueos[otro]) + '.' };
    const id = tipo + ':' + jugId + ':' + otro; if (E.ses[id] && E.ses[id].estado === 'abierta') return { ok: true, sesion: E.ses[id] };
    const d = dirDe(st, otro), min = M().precioMinimo(st, jugId), desc = op.descuento || (p.impulso === 'quiereSalir' ? 0.15 : 0), intocable = tipo === 'comprar' && M().precioMinimo && st.equipos[otro].plantilla.map(i => st.jugadores[i]).sort((a, b) => b.ovr - a.ovr).slice(0, 2).some(q => q.id === jugId);
    const t = trato(st, jugId), ses = { id, tipo, jugId, otro, ronda: 0, maxRondas: 4, paciencia: d.pac + (tipo === 'comprar' ? Math.max(0, t.pacienciaExtra) : 0), director: { perfil: d.perfil, etq: d.etq, desc: d.desc }, estado: 'abierta', historial: [], desc,
      salida: tipo === 'comprar' ? Math.round(min * 1.3 * (1 - desc) / 50000) * 50000 : Math.round(valorMio(st, jugId, otro) * 0.78 / 50000) * 50000, reserva: tipo === 'comprar' ? Math.round(min * d.res * (intocable ? 1.8 : 1) * (1 - desc) / 50000) * 50000 : Math.round(valorMio(st, jugId, otro) * d.techo / 50000) * 50000, intocable: !!intocable };
    E.ses[id] = ses; return { ok: true, sesion: ses };
  }
  // Valor de la oferta para el otro club (en euros): dinero + jugadores incluidos + parte de una futura venta
  function valorOferta(st, ses, o) {
    const p = st.jugadores[ses.jugId], base = Math.round(+o.precio || 0); let v = base; const partes = [{ t: 'Dinero', v: base }];
    (o.jugadores || []).forEach(id => { const q = st.jugadores[id]; if (!q || q.equipoId !== st.clubId) return; const x = Math.round(valorMio(st, id, ses.otro) * 0.9 * (nl(st, ses.otro) >= M().MAXP - 1 ? 0.4 : 1)); v += x; partes.push({ t: 'Incluye a ' + q.nombre, v: x }); });
    const so = clamp((o.sellOn || 0), 0, 0.3), vs = Math.round(so * M().valorJugador(p) * 0.5); if (so > 0) { v += vs; partes.push({ t: Math.round(so * 100) + ' % de una futura venta', v: vs }); }
    return { valor: v, partes };
  }
  function proponer(st, id, o) {
    const E = est(st), ses = E.ses[id]; if (!ses || ses.estado !== 'abierta') return { estado: 'cerrada', mensaje: 'La negociación ya ha terminado.' }; const cerrado = motivoCerrado(st, [st.clubId, ses.otro]); if (cerrado) { ses.estado = 'rompe'; return { estado: 'rompe', mensaje: cerrado }; }
    ses.ronda++; const val = valorOferta(st, ses, o), club = st.equipos[ses.otro].nombre, p = st.jugadores[ses.jugId], comprando = ses.tipo === 'comprar';
    ses.historial.push({ ronda: ses.ronda, oferta: JSON.parse(JSON.stringify(o)), valor: val.valor });
    if (comprando) {
      const ratio = val.valor / ses.reserva;
      if (ratio >= 1) { ses.estado = 'acepta'; ses.final = o; recordar(st, ses.jugId, 'acuerdo', 'Traspaso acordado con ' + club); return { estado: 'acepta', mensaje: club + ': «Trato hecho por ' + p.nombre + '.»', val }; }
      if (ratio < 0.7) recordar(st, ses.jugId, 'lowball', 'Oferta muy baja por ' + p.nombre);
      if (ratio >= 0.9 || (ratio >= 0.84 && ses.director.perfil === 'flexible')) { const falta = Math.max(50000, Math.round((ses.reserva - val.valor) / 50000) * 50000); return { estado: 'contra', mensaje: club + ': «Estamos cerca. Con ' + eur(+o.precio + falta) + ' en total lo cerramos.»', contra: Object.assign({}, o, { precio: Math.round(+o.precio + falta) }), val }; }
    } else {
      const ratio = val.valor / ses.reserva;   // al vender, "valor" es lo que pides y "reserva" lo máximo que paga el comprador
      const pido = Math.round(+o.precio || 0) + ((o.jugadores || []).length ? 0 : 0) - (o.sellOn ? Math.round(clamp(o.sellOn, 0, 0.3) * M().valorJugador(p) * 0.5) : 0);
      if (pido <= ses.reserva) { ses.estado = 'acepta'; ses.final = o; recordar(st, ses.jugId, 'venta', 'Venta a ' + club); return { estado: 'acepta', mensaje: club + ': «De acuerdo, lo pagamos.»', val: { valor: pido, partes: [] } }; }
      if (pido <= ses.reserva * 1.07 || (pido <= ses.reserva * 1.12 && ses.director.perfil === 'flexible')) return { estado: 'contra', mensaje: club + ': «Es mucho, pero podemos llegar a ' + eur(ses.reserva) + '.»', contra: Object.assign({}, o, { precio: ses.reserva, sellOn: 0 }), val: { valor: pido, partes: [] } };
    }
    ses.paciencia--; if (ses.paciencia <= 0 || ses.ronda >= ses.maxRondas) { ses.estado = 'rompe'; E.bloqueos[ses.otro] = U.addDays(st.fecha, 21); recordar(st, ses.jugId, 'rompe', 'Se rompe el trato con ' + club); return { estado: 'rompe', mensaje: club + ': «Se acabó. No volvemos a hablar en tres semanas.»', val }; }
    return { estado: 'rechaza', mensaje: club + ': «' + (comprando ? 'Eso queda lejos de lo que vale para nosotros.' : 'No pagamos tanto.') + '»', val };
  }
  function cerrar(st, id) {
    const E = est(st), ses = E.ses[id]; if (!ses || ses.estado !== 'acepta' || !ses.final) return { ok: false, motivo: 'No hay acuerdo.' }; const o = ses.final, p = st.jugadores[ses.jugId], user = st.clubId, m = M(), precio = Math.round(+o.precio || 0), inc = (o.jugadores || []).filter(i => st.jugadores[i] && st.jugadores[i].equipoId === user && !st.jugadores[i].esYo);
    const cerrado = motivoCerrado(st, [user, ses.otro]); if (cerrado) return { ok: false, motivo: cerrado };
    if (ses.tipo === 'comprar') {
      if (nl(st, ses.otro) - 1 + inc.length > m.MAXP) return { ok: false, motivo: 'Su club no puede recibir tantos jugadores.' }; if (nl(st, ses.otro) - 1 + inc.length < 10) return { ok: false, motivo: 'Su club no puede quedarse con menos de 10 jugadores.' };
      if (nl(st, user) - inc.length + 1 > m.MAXP) return { ok: false, motivo: 'Tu plantilla estaría completa.' }; if (nl(st, user) - inc.length < 8) return { ok: false, motivo: 'Te quedarías con menos de ocho jugadores.' };
      if (F() && st.finanzas[user].caja < precio) return { ok: false, motivo: 'No tienes caja suficiente.' }; if (m.motivoNoAnadir) { const nope = m.motivoNoAnadir(st, user, p.contrato.salario, 'traspaso'); if (nope && !inc.length) return { ok: false, motivo: nope }; }
      const deId = p.equipoId; inc.forEach(i => m.mover(st, st.jugadores[i], deId, 0)); m.mover(st, p, user, precio); if (o.sellOn > 0) p.sellOn = { clubId: deId, pct: clamp(o.sellOn, 0, 0.3) }; p.impulso = null;
      GM.noticia(st, 'Traspaso negociado: llega ' + p.nombre + ' por ' + eur(precio) + (inc.length ? ' y ' + inc.length + ' jugador' + (inc.length > 1 ? 'es' : '') + ' tuyo' + (inc.length > 1 ? 's' : '') : '') + '.');
    } else {
      if (nl(st, user) - 1 < 10) return { ok: false, motivo: 'Necesitas al menos 10 jugadores.' }; if (F() && st.finanzas[ses.otro].caja < precio) return { ok: false, motivo: st.equipos[ses.otro].nombre + ' no tiene caja.' }; if (m.motivoNoAnadir) { const nope = m.motivoNoAnadir(st, ses.otro, p.contrato.salario, 'traspaso'); if (nope) return { ok: false, motivo: st.equipos[ses.otro].nombre + ': ' + nope }; }
      m.mover(st, p, ses.otro, precio); if (p.sellOn && p.sellOn.pct > 0 && F() && precio > 0) { const x = Math.round(precio * p.sellOn.pct); F().registrar(st, user, 'Cláusula de venta futura de ' + p.nombre, -x); F().registrar(st, p.sellOn.clubId, 'Cláusula de venta futura de ' + p.nombre, x); }
      GM.noticia(st, 'Traspaso negociado: ' + p.nombre + ' se marcha a ' + st.equipos[ses.otro].nombre + ' por ' + eur(precio) + '.');
    }
    ses.estado = 'cerrada'; E.hist.unshift({ f: st.fecha, tipo: ses.tipo, jug: p.nombre, club: st.equipos[ses.otro].nombre, precio }); if (E.hist.length > 30) E.hist.length = 30; delete E.ses[id]; return { ok: true };
  }
  function abandonar(st, id) { const E = est(st), s = E.ses[id]; if (s) { s.estado = 'abandonada'; delete E.ses[id]; } return { ok: true }; }
  // ---------- Ofertas por tus jugadores ----------
  function ofertasRecibidas(st) { return est(st).ofertas.filter(o => o.hasta >= st.fecha); }
  function generarOfertas(st) {
    const E = est(st), user = st.clubId; if (!ventana(st, user).abierta) return; const mios = st.equipos[user].plantilla.map(i => st.jugadores[i]).filter(p => p && !p.esYo).sort((a, b) => b.ovr - a.ovr).slice(0, 9);
    E.ofertas = E.ofertas.filter(o => o.hasta >= st.fecha && st.jugadores[o.jugId] && st.jugadores[o.jugId].equipoId === user); if (E.ofertas.length >= 3) return;
    mios.forEach((p, k) => {
      if (E.ofertas.length >= 3 || E.ofertas.some(o => o.jugId === p.id)) return; const interes = (U.hash(p.id + st.fecha + 'oferta') >>> 0) % 1000 / 1000, rum = E.rumores.some(r => r.jugId === p.id && r.tipo === 'interes' && r.fiable && !r.resuelto), prob = (k < 3 ? 0.07 : 0.035) + (p.impulso === 'quiereSalir' ? 0.12 : 0) + (rum ? 0.5 : 0); if (interes > prob) return;
      const cand = Object.keys(st.equipos).filter(id => id !== user && nl(st, id) < M().MAXP && ventana(st, id).abierta && (!st.finanzas || st.finanzas[id].caja > 0)).map(id => ({ id, h: U.hash(id + p.id + st.fecha) })).sort((a, b) => a.h - b.h)[0]; if (!cand) return;
      const precio = Math.round(valorMio(st, p.id, cand.id) * (0.85 + (cand.h % 25) / 100) / 50000) * 50000; if (st.finanzas && st.finanzas[cand.id].caja < precio) return; let jug = null;
      if (cand.h % 3 === 0) { const q = st.equipos[cand.id].plantilla.map(i => st.jugadores[i]).filter(Boolean).sort((a, b) => b.ovr - a.ovr)[3 + (cand.h % 3)]; if (q && q.ovr >= p.ovr - 10) jug = q.id; }
      E.ofertas.push({ id: 'of' + (++E.seq), jugId: p.id, clubId: cand.id, precio, jugador: jug, desde: st.fecha, hasta: U.addDays(st.fecha, 7) }); GM.noticia && GM.noticia(st, '📩 ' + st.equipos[cand.id].nombre + ' ofrece ' + eur(precio) + ' por ' + p.nombre + (jug ? ' (y te da a ' + st.jugadores[jug].nombre + ')' : '') + '. Tienes siete días.');
    });
  }
  function responderOferta(st, id, accion) {
    const E = est(st), o = E.ofertas.find(x => x.id === id); if (!o || o.hasta < st.fecha) return { ok: false, motivo: 'La oferta ya no está.' };
    if (accion === 'rechazar') { E.ofertas = E.ofertas.filter(x => x !== o); recordar(st, o.jugId, 'plantón', 'Rechazas una oferta'); ag(st, agenciaDe(st, o.jugId)).rel = clamp(ag(st, agenciaDe(st, o.jugId)).rel + 6, -100, 100); return { ok: true, texto: 'Oferta rechazada.' }; }
    if (accion === 'contraofertar') { const r = abrir(st, o.jugId, 'vender', o.clubId); if (!r.ok) return r; E.ofertas = E.ofertas.filter(x => x !== o); return { ok: true, sesion: r.sesion, texto: 'Abres una negociación con ' + st.equipos[o.clubId].nombre + '.' }; }
    const r = abrir(st, o.jugId, 'vender', o.clubId); if (!r.ok) return r; r.sesion.estado = 'acepta'; r.sesion.final = { precio: o.precio, jugadores: [] }; const c = cerrar(st, r.sesion.id);
    if (!c.ok) { abandonar(st, r.sesion.id); return c; } if (o.jugador && st.jugadores[o.jugador] && st.jugadores[o.jugador].equipoId === o.clubId) { const q = st.jugadores[o.jugador]; if (nl(st, st.clubId) < M().MAXP) { M().mover(st, q, st.clubId, 0); GM.noticia(st, q.nombre + ' llega como parte del trato.'); } } E.ofertas = E.ofertas.filter(x => x !== o); return { ok: true, texto: 'Aceptas la oferta de ' + st.equipos[o.clubId].nombre + '.' };
  }
  // ---------- Filtraciones de prensa ----------
  const FUENTES = { radio: { n: 'Radio local', fia: 0.62 }, agencia: { n: 'Una agencia', fia: 0.85 }, redes: { n: 'Redes sociales', fia: 0.35 } };
  function generarRumores(st) {
    const E = est(st), user = st.clubId, mios = st.equipos[user].plantilla.map(i => st.jugadores[i]).filter(p => p && !p.esYo).sort((a, b) => b.ovr - a.ovr); E.rumores = E.rumores.filter(r => U.diffDays(r.f, st.fecha) < 40);
    const n = 1 + ((U.hash(st.fecha + 'rumor') >>> 0) % 2); for (let i = 0; i < n; i++) {
      const h = (U.hash(st.fecha + 'rm' + i) >>> 0), tipo = ['interes', 'salida', 'inquieto', 'fichaje'][h % 4], fuente = ['radio', 'agencia', 'redes'][(h >>> 3) % 3], F0 = FUENTES[fuente], fiable = ((h >>> 7) % 100) / 100 < F0.fia * (fuente === 'agencia' ? 1 : 1), id = 'ru' + (++E.seq); let r = null;
      if (tipo === 'interes' && mios.length) { const p = mios[(h >>> 11) % Math.min(5, mios.length)], cl = Object.keys(st.equipos).filter(c => c !== user)[(h >>> 4) % (Object.keys(st.equipos).length - 1)]; r = { tipo, jugId: p.id, clubId: cl, texto: F0.n + ': «' + st.equipos[cl].nombre + ' sigue de cerca a ' + p.nombre + '».' }; }
      else if (tipo === 'salida') { const todos = Object.keys(st.jugadores).filter(j => { const q = st.jugadores[j]; return q.equipoId && q.equipoId !== user && !q.juvenil && !q.esYo && q.ovr >= 66; }); if (!todos.length) continue; const q = st.jugadores[todos[(h >>> 5) % todos.length]]; r = { tipo, jugId: q.id, clubId: q.equipoId, texto: F0.n + ': «' + q.nombre + ' (' + st.equipos[q.equipoId].nombre + ') podría salir este mercado».' }; }
      else if (tipo === 'inquieto' && mios.length) { const p = mios[(h >>> 9) % mios.length]; r = { tipo, jugId: p.id, clubId: user, texto: F0.n + ': «' + p.nombre + ' no está contento con su papel en el equipo».' }; }
      else if (tipo === 'fichaje') { const l = st.mercado.libres.map(j => st.jugadores[j]).filter(Boolean).sort((a, b) => b.ovr - a.ovr)[(h >>> 6) % 5]; if (!l) continue; const cl = Object.keys(st.equipos).filter(c => c !== user)[(h >>> 4) % (Object.keys(st.equipos).length - 1)]; r = { tipo, jugId: l.id, clubId: cl, texto: F0.n + ': «' + st.equipos[cl].nombre + ' está cerca de fichar a ' + l.nombre + '».' }; }
      if (!r) continue; Object.assign(r, { id, f: st.fecha, fuente, fiable, resuelto: null, vence: U.addDays(st.fecha, 14) }); E.rumores.unshift(r); if (r.tipo === 'interes' && fiable && GM.noticia) GM.noticia(st, '🗞️ ' + r.texto);
    }
    // Se resuelven los de hace dos semanas: los ciertos ocurren y los falsos no
    E.rumores.filter(r => !r.resuelto && r.vence <= st.fecha).forEach(r => {
      r.resuelto = r.fiable ? 'confirmado' : 'falso'; const f = E.fuentes[r.fuente]; f.n++; if (r.fiable) f.ok++; const p = st.jugadores[r.jugId];
      if (r.fiable && p) { if (r.tipo === 'salida') { p.impulso = 'quiereSalir'; p.impulsoHasta = U.addDays(st.fecha, 30); GM.noticia && GM.noticia(st, '🗞️ Se confirma: ' + p.nombre + ' quiere salir de ' + st.equipos[p.equipoId].nombre + '. Su club aceptaría una rebaja.'); } else if (r.tipo === 'inquieto' && p.equipoId === st.clubId) { p.estado.moral = clamp(p.estado.moral - 8, 20, 100); } }
    });
  }
  const rumores = st => est(st).rumores.slice(0, 15);
  const fiabilidadFuente = (st, k) => { const f = est(st).fuentes[k]; return f && f.n >= 3 ? Math.round(f.ok / f.n * 100) : null; };
  // ---------- Impulso del jugador ----------
  function generarPeticiones(st) {
    const E = est(st), user = st.clubId, mios = st.equipos[user].plantilla.map(i => st.jugadores[i]).filter(p => p && !p.esYo).sort((a, b) => b.ovr - a.ovr);
    mios.forEach((p, rango) => { if (rango < 5 || p.estado.moral >= 46 || E.peticiones.some(x => x.jugId === p.id && !x.resuelta)) return; if (((U.hash(p.id + st.fecha + 'pide') >>> 0) % 100) > 40) return; E.peticiones.push({ id: 'pe' + (++E.seq), jugId: p.id, f: st.fecha, plazo: U.addDays(st.fecha, 20), resuelta: null }); GM.noticia && GM.noticia(st, '⚠️ ' + p.nombre + ' pide salir: no cuenta en tus planes. Tienes veinte días para decidir.'); });
    E.peticiones.filter(x => !x.resuelta && x.plazo <= st.fecha).forEach(x => { x.resuelta = 'rebelde'; const p = st.jugadores[x.jugId]; if (p) { p.estado.moral = 25; p.estado.forma = clamp(p.estado.forma - 10, 40, 100); p.rebelde = true; GM.noticia && GM.noticia(st, p.nombre + ' se declara en rebeldía: rinde por debajo de lo suyo hasta que se resuelva.'); recordar(st, p.id, 'ignorar', 'Ignoras su petición'); } });
  }
  const peticiones = st => est(st).peticiones.filter(x => !x.resuelta || x.resuelta === 'rebelde');
  function resolverPeticion(st, id, accion) {
    const E = est(st), x = E.peticiones.find(q => q.id === id && (!q.resuelta || q.resuelta === 'rebelde')), p = x && st.jugadores[x.jugId]; if (!x || !p) return { ok: false, motivo: 'Esa petición ya no está.' };
    if (accion === 'convencer') { const coste = Math.round(p.contrato.salario / 12 / 10000) * 10000; if (F() && st.finanzas[st.clubId].caja < coste) return { ok: false, motivo: 'No hay caja para ' + eur(coste) + '.' }; if (F()) F().registrar(st, st.clubId, 'Prima de convencimiento a ' + p.nombre, -coste); p.estado.moral = clamp(p.estado.moral + 18, 20, 100); p.rebelde = false; x.resuelta = 'convencido'; recordar(st, p.id, 'convencer', 'Le convences de quedarse'); return { ok: true, texto: p.nombre + ' acepta quedarse con una prima de ' + eur(coste) + '.' }; }
    if (accion === 'vender') { p.impulso = 'quiereSalir'; p.impulsoHasta = U.addDays(st.fecha, 30); x.resuelta = 'venta'; p.rebelde = false; p.estado.moral = clamp(p.estado.moral + 8, 20, 100); return { ok: true, texto: 'Aceptas que se marche: busca comprador y su club saldrá con rebaja (15 %).' }; }
    return { ok: false, motivo: 'Acción desconocida.' };
  }
  function generarOfrecidos(st) {
    const E = est(st), user = st.clubId, e = st.equipos[user]; E.ofrecidos = E.ofrecidos.filter(o => o.hasta >= st.fecha && st.jugadores[o.jugId] && st.jugadores[o.jugId].equipoId === o.clubId); if (!ventana(st, user).abierta || E.ofrecidos.length >= 2) return;
    const orden = e.plantilla.map(i => st.jugadores[i]).filter(Boolean).sort((a, b) => b.ovr - a.ovr), corte = (orden[6] || { ovr: 60 }).ovr, techo = (orden[0] || { ovr: 80 }).ovr + 2, atractivo = clamp((e.reputacion - 40) / 60, 0.1, 1);
    const c = Object.keys(st.jugadores).filter(j => { const q = st.jugadores[j]; return q.equipoId && q.equipoId !== user && !q.juvenil && !q.esYo && q.ovr >= corte && q.ovr <= techo && !E.ofrecidos.some(o => o.jugId === j); }); if (!c.length) return;
    const h = (U.hash(st.fecha + 'ofrece') >>> 0); if ((h % 1000) / 1000 > 0.06 * atractivo + (trato(st, c[h % c.length]).rel >= 40 ? 0.1 : 0)) return; const q = st.jugadores[c[(h >>> 4) % c.length]];
    E.ofrecidos.push({ id: 'ofr' + (++E.seq), jugId: q.id, clubId: q.equipoId, rebaja: 0.15, desde: st.fecha, hasta: U.addDays(st.fecha, 14), fuente: trato(st, q.id).rel >= 40 ? 'agencia' : 'directo' }); GM.noticia && GM.noticia(st, '🤝 ' + q.nombre + ' (' + st.equipos[q.equipoId].nombre + ') quiere jugar en tu club: su club bajaría el precio un 15 % durante dos semanas.');
  }
  const ofrecidos = st => est(st).ofrecidos.filter(o => o.hasta >= st.fecha);
  function aceptarOfrecido(st, id) { const o = est(st).ofrecidos.find(x => x.id === id && x.hasta >= st.fecha); if (!o) return { ok: false, motivo: 'La oferta ya no está.' }; return abrir(st, o.jugId, 'comprar', null, { descuento: o.rebaja }); }
  // ---------- Día a día ----------
  GM.bus.on('dia:avanzado', () => { try { dia(); } catch (e) { console.error('traspasos', e); } });
  function dia() {
    const st = GM.state; if (!act(st)) return; const E = est(st), md = st.fecha.slice(5), v = ventana(st, st.clubId);
    if (U.weekday(st.fecha) === 1) { try { generarRumores(st); generarOfertas(st); generarPeticiones(st); generarOfrecidos(st); } catch (e) { console.error('traspasos', e); } }
    // los jugadores que "quieren salir" lo dejan de querer pasado el mes
    Object.keys(st.jugadores).forEach(id => { const p = st.jugadores[id]; if (p.impulso === 'quiereSalir' && p.impulsoHasta && p.impulsoHasta < st.fecha) { p.impulso = null; p.impulsoHasta = null; } });
    // avisos de cierre de mercado y soplos de las agencias amigas
    if (v.abierta && v.cierra && U.diffDays(st.fecha, v.cierra) === 3 && GM.noticia) GM.noticia(st, '⏳ Quedan tres días de mercado (' + v.nombre.toLowerCase() + ', cierra el ' + U.fechaLarga(v.cierra) + '): es el momento de cerrar tus traspasos.');
    if (v.abierta && v.cierra === st.fecha && GM.noticia) { GM.noticia(st, '🔔 Último día de mercado: cualquier negociación abierta se cierra esta noche.'); }
    if (!v.abierta) Object.keys(E.ses).forEach(id => { if (E.ses[id].estado === 'abierta') { E.ses[id].estado = 'rompe'; delete E.ses[id]; } });
    if (U.weekday(st.fecha) === 5) Object.keys(E.agencias).forEach(n => { const a = E.agencias[n]; if (a.rel > 0) a.rel = Math.max(0, a.rel - 0.4); else if (a.rel < 0) a.rel = Math.min(0, a.rel + 0.4); });   // con el tiempo, los agravios y los favores se olvidan un poco
    void md;
  }
  function resumen(st) { const E = est(st); return { ventana: ventana(st, st.clubId), sesiones: Object.keys(E.ses).length, ofertas: ofertasRecibidas(st).length, rumores: E.rumores.length, peticiones: peticiones(st).length, ofrecidos: ofrecidos(st).length, agencias: Object.keys(E.agencias).length }; }
  function selfTest() {
    const st = { modo: 'gestor', fecha: '2026-09-10', temporada: '2026-27', clubId: 'a', equipos: { a: { id: 'a', nombre: 'A', plantilla: [] } }, ligas: { ACB: { equipos: ['a'] }, NBA: { equipos: [] } }, mercado: { libres: [] }, jugadores: {} }; if (!GM.mods.mercado) return false;
    const v1 = ventanaLiga(st, 'ACB'), v2 = ventanaLiga(Object.assign({}, st, { fecha: '2026-11-20' }), 'ACB'), v3 = ventanaLiga(Object.assign({}, st, { fecha: '2027-03-01' }), 'NBA'), v4 = ventanaLiga(Object.assign({}, st, { fecha: '2027-01-10' }), 'ACB');
    recordar(st, 'x1', 'acuerdo'); recordar(st, 'x1', 'rompe'); const a = trato(st, 'x1'); return v1.abierta && !v2.abierta && v2.abre === '2027-01-02' && !v3.abierta && v3.abre === '2027-07-01' && v4.abierta && a.rel === -5 && a.factorSalario > 1 && Object.keys(DIRECTORES).length === 3 && AGENCIAS.length === 14;
  }
  GM.traspasos = { AGENCIAS, DIRECTORES, FUENTES, est, ventana, motivoCerrado, ventanaLiga, abrir, proponer, cerrar, abandonar, valorOferta, trato, recordar, agenciaDe, ofertasRecibidas, generarOfertas, responderOferta, generarRumores, rumores, fiabilidadFuente, generarPeticiones, peticiones, resolverPeticion, generarOfrecidos, ofrecidos, aceptarOfrecido, resumen, selfTest };
  GM.register && GM.register('traspasos', GM.traspasos);
})();
