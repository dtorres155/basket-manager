/* PLANTILLA Y MERCADO (GM.mods.mercado)
   Expone: valorJugador, salarioPedido, topeSalarial, evaluarOferta, ofertar, renovar, liberar, precioMinimo, comprar,
   ofertasVenta, vender, traspasar, draft, expiran, libres, buscar, selfTest.
   Escribe state.mercado = { libres, seq, ultimoDraft }. NBA: tope blando (140 M€); resto: límite de masa salarial según reputación.
   La IA mueve el mercado en dia:avanzado; en temporada:fin hace el draft y caducan contratos. */
(function () {
  const U = GM.util;
  const yearOf = st => parseInt(st.temporada.slice(0, 4), 10);
  const PRIO = ['NBA', 'EUROLIGA', 'ACB', 'LEGA', 'GBL', 'BBL', 'BSL'];
  const FACT = { NBA: 1, EUROLIGA: 0.18, ACB: 0.07, LEGA: 0.06, GBL: 0.06, BBL: 0.07, BSL: 0.08 };
  const MINSAL = { NBA: 2.2e6, EUROLIGA: 0.2e6, ACB: 0.1e6, LEGA: 0.1e6, GBL: 0.1e6, BBL: 0.1e6, BSL: 0.1e6 };
  const TOPE_NBA = 140e6, TECHO_NBA = 190e6, MAXP = 15;
  const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
  const F = () => GM.mods.finanzas;

  function ligaDe(st, eqId) { return PRIO.find(l => st.ligas[l] && st.ligas[l].equipos.indexOf(eqId) >= 0) || 'LEGA'; }
  function valorJugador(p) {
    let v = Math.pow(Math.max(0, p.ovr - 42) / 50, 3.6) * 58e6;
    if (p.edad <= 22) v *= 1 + Math.max(0, p.pot - p.ovr) * 0.03;
    if (p.edad >= 31) v *= Math.max(0.3, 1 - 0.06 * (p.edad - 30));
    return Math.round(v + 100000);
  }
  function salarioPedido(st, jugId, eqId) {
    const p = st.jugadores[jugId], l = ligaDe(st, eqId);
    const s = valorJugador(p) * FACT[l] * (0.9 + (U.hash(jugId) % 21) / 100);
    return Math.max(MINSAL[l], Math.round(s / 10000) * 10000);
  }
  const masaMax = (st, eqId) => Math.round(2e6 + Math.pow(st.equipos[eqId].reputacion / 100, 3) * 60e6);
  function masa(st, eqId) { return F() ? F().masaSalarial(st, eqId) : st.equipos[eqId].plantilla.reduce((a, i) => a + st.jugadores[i].contrato.salario, 0); }
  function topeSalarial(st, eqId) {
    const l = ligaDe(st, eqId), m = masa(st, eqId);
    if (l === 'NBA') return { tope: TOPE_NBA, techo: TECHO_NBA, masa: m, margen: TOPE_NBA - m, tipo: 'Tope blando de la NBA' };
    const t = masaMax(st, eqId);
    return { tope: t, techo: t, masa: m, margen: t - m, tipo: 'Límite salarial del club' };
  }
  function motivoNoAnadir(st, eqId, salario, via, antiguo) {
    const l = ligaDe(st, eqId), m = masa(st, eqId) - (antiguo || 0);
    if (via !== 'renovar' && st.equipos[eqId].plantilla.length >= MAXP) return 'Plantilla completa (' + MAXP + ' jugadores).';
    if (l === 'NBA') {
      if (via === 'renovar') return m + salario > TECHO_NBA ? 'Superarías el techo salarial de 190 M€.' : null;
      if (salario <= MINSAL.NBA * 1.02) return null;
      return m + salario > TOPE_NBA ? 'No hay espacio bajo el tope salarial (' + U.eur(TOPE_NBA) + ').' : null;
    }
    return m + salario > masaMax(st, eqId) ? 'Supera el límite salarial del club (' + U.eur(masaMax(st, eqId)) + ').' : null;
  }
  const nl = (st, id) => st.equipos[id].plantilla.length;

  function evaluarOferta(st, jugId, eqId, salario, anos, renov) {
    const p = st.jugadores[jugId], eq = st.equipos[eqId];
    const ask = salarioPedido(st, jugId, eqId) * (renov ? 1.04 : 1);
    const ratio = salario / ask;
    let prob = ratio >= 1 ? 1 : ratio < 0.8 ? 0 : (ratio - 0.8) / 0.2 * 0.85 + (eq.reputacion - 60) / 300;
    if (p.edad >= 32 && anos >= 3) prob -= 0.1;
    if (p.edad <= 23 && anos === 1) prob -= 0.1;
    if (renov) prob += (p.estado.moral - 60) / 300;
    return { pedido: Math.round(ask / 10000) * 10000, prob: U.clamp(prob, 0, 1) };
  }
  function ficha(st, p, eqId, salario, anos) {
    st.mercado.libres = st.mercado.libres.filter(i => i !== p.id);
    p.libre = false; p.equipoId = eqId;
    p.contrato = { salario, hasta: yearOf(st) + anos };
    if (st.equipos[eqId].plantilla.indexOf(p.id) < 0) st.equipos[eqId].plantilla.push(p.id);
  }
  function ofertar(st, jugId, o) {
    const p = st.jugadores[jugId], club = st.clubId;
    if (!p) return { ok: false, motivo: 'Jugador desconocido.' };
    if (!p.libre) return { ok: false, motivo: 'Tiene contrato con otro club: negocia un traspaso.' };
    const salario = Math.round(o.salario), anos = U.clamp(o.anos || 1, 1, 4);
    if (p.origen === 'NBA' && ligaDe(st, club) !== 'NBA' && p.ovr > 72) return { ok: false, motivo: 'Prefiere seguir en la NBA.' };
    const nope = motivoNoAnadir(st, club, salario, 'fichaje');
    if (nope) return { ok: false, motivo: nope };
    const ev = evaluarOferta(st, jugId, club, salario, anos, false);
    if (GM.rng.next() > ev.prob) return { ok: false, motivo: ev.prob === 0 ? 'Quiere bastante más: pide unos ' + U.eur(ev.pedido) + ' al año.' : 'Prefiere esperar otras ofertas. Mejora el salario.' };
    ficha(st, p, club, salario, anos);
    GM.noticia(st, 'Fichaje: ' + p.nombre + ' (' + p.ovr + ') firma por ' + anos + (anos === 1 ? ' temporada.' : ' temporadas.'));
    GM.bus.emit('fichaje:hecho', { jugadorId: p.id, de: null, a: club });
    return { ok: true };
  }
  function renovar(st, jugId, o) {
    const p = st.jugadores[jugId], club = st.clubId;
    if (!p || p.equipoId !== club) return { ok: false, motivo: 'Solo puedes renovar a jugadores de tu plantilla.' };
    const salario = Math.round(o.salario), anos = U.clamp(o.anos || 1, 1, 4);
    const nope = motivoNoAnadir(st, club, salario, 'renovar', p.contrato.salario);
    if (nope) return { ok: false, motivo: nope };
    const ev = evaluarOferta(st, jugId, club, salario, anos, true);
    if (GM.rng.next() > ev.prob) return { ok: false, motivo: 'No acepta. Pide unos ' + U.eur(ev.pedido) + ' al año.' };
    p.contrato = { salario, hasta: Math.max(p.contrato.hasta, yearOf(st) + 1) + anos };
    p.estado.moral = U.clamp(p.estado.moral + 8, 0, 100);
    GM.noticia(st, 'Renovación: ' + p.nombre + ' continúa hasta ' + p.contrato.hasta + '.');
    return { ok: true };
  }
  function liberar(st, jugId) {
    const p = st.jugadores[jugId], club = st.clubId;
    if (!p || p.equipoId !== club) return { ok: false, motivo: 'No es de tu plantilla.' };
    if (nl(st, club) <= 10) return { ok: false, motivo: 'Necesitas al menos 10 jugadores.' };
    const quedan = Math.max(0, p.contrato.hasta - yearOf(st));
    const coste = Math.min(p.contrato.salario * 2, Math.round(p.contrato.salario * 0.5 * quedan));
    if (coste && F()) F().registrar(st, club, 'Indemnización a ' + p.nombre, -coste);
    sacar(st, p);
    GM.noticia(st, p.nombre + ' deja el club.');
    return { ok: true, coste };
  }
  function sacar(st, p) {
    if (p.equipoId) p.origen = ligaDe(st, p.equipoId);
    const eq = st.equipos[p.equipoId];
    if (eq) eq.plantilla = eq.plantilla.filter(i => i !== p.id);
    p.equipoId = null; p.libre = true;
    p.contrato = { salario: 0, hasta: 0 };
    if (st.mercado.libres.indexOf(p.id) < 0) st.mercado.libres.push(p.id);
  }

  // ----- Traspasos -----
  function precioMinimo(st, jugId) {
    const p = st.jugadores[jugId]; if (!p.equipoId) return 0;
    const l = ligaDe(st, p.equipoId), anos = Math.max(1, p.contrato.hasta - yearOf(st));
    return Math.max(50000, Math.round(valorJugador(p) * FACT[l] * 1.25 * (0.6 + 0.2 * Math.min(anos, 3)) / 50000) * 50000);
  }
  function valorIA(st, jugId, compradorId) {
    const p = st.jugadores[jugId], lv = ligaDe(st, p.equipoId), lc = ligaDe(st, compradorId);
    return Math.max(50000, Math.round(precioMinimo(st, jugId) * 0.95 * U.clamp(FACT[lc] / FACT[lv], 0.4, 1.6) / 50000) * 50000);
  }
  function top2(st, eqId, jugId) {
    return st.equipos[eqId].plantilla.map(i => st.jugadores[i]).sort((a, b) => b.ovr - a.ovr).slice(0, 2).some(p => p.id === jugId);
  }
  function mover(st, p, aId, precio) {
    const de = p.equipoId;
    st.equipos[de].plantilla = st.equipos[de].plantilla.filter(i => i !== p.id);
    st.equipos[aId].plantilla.push(p.id); p.equipoId = aId;
    if (F()) {
      F().registrar(st, aId, 'Traspaso de ' + p.nombre, -precio);
      F().registrar(st, de, 'Traspaso de ' + p.nombre, precio);
    }
    GM.bus.emit('fichaje:hecho', { jugadorId: p.id, de, a: aId });
  }
  function traspasar(st, jugId, aId, precio) {
    const p = st.jugadores[jugId], user = st.clubId;
    if (!p || !p.equipoId) return { ok: false, motivo: 'Jugador no disponible para traspaso.' };
    precio = Math.round(precio);
    if (aId === user && p.equipoId !== user) {
      if (precio < precioMinimo(st, jugId)) return { ok: false, motivo: 'El club pide al menos ' + U.eur(precioMinimo(st, jugId)) + '.' };
      if (top2(st, p.equipoId, jugId) && precio < precioMinimo(st, jugId) * 1.8) return { ok: false, motivo: 'Es intocable para su club salvo que pagues mucho más.' };
      if (nl(st, p.equipoId) <= 10) return { ok: false, motivo: 'Su club no puede quedarse con menos de 10 jugadores.' };
      const nope = motivoNoAnadir(st, user, p.contrato.salario, 'traspaso');
      if (nope) return { ok: false, motivo: nope };
      if (F() && st.finanzas[user].caja < precio) return { ok: false, motivo: 'No tienes caja suficiente.' };
      mover(st, p, user, precio);
      GM.noticia(st, 'Traspaso: llega ' + p.nombre + ' por ' + U.eur(precio) + '.');
      return { ok: true };
    }
    if (p.equipoId === user && aId !== user) {
      if (nl(st, user) <= 10) return { ok: false, motivo: 'Necesitas al menos 10 jugadores.' };
      if (precio > valorIA(st, jugId, aId)) return { ok: false, motivo: st.equipos[aId].nombre + ' no paga tanto.' };
      const nope = motivoNoAnadir(st, aId, p.contrato.salario, 'traspaso');
      if (nope) return { ok: false, motivo: st.equipos[aId].nombre + ': ' + nope };
      if (F() && st.finanzas[aId].caja < precio) return { ok: false, motivo: st.equipos[aId].nombre + ' no tiene caja.' };
      mover(st, p, aId, precio);
      GM.noticia(st, 'Traspaso: ' + p.nombre + ' se marcha a ' + st.equipos[aId].nombre + ' por ' + U.eur(precio) + '.');
      return { ok: true };
    }
    return { ok: false, motivo: 'El traspaso debe involucrar a tu club.' };
  }
  const comprar = (st, jugId) => traspasar(st, jugId, st.clubId, precioMinimo(st, jugId));
  function ofertasVenta(st, jugId) {
    const p = st.jugadores[jugId], out = [];
    Object.keys(st.equipos).forEach(id => {
      if (id === st.clubId || nl(st, id) >= MAXP) return;
      const l = ligaDe(st, id);
      if (FACT[l] < FACT[ligaDe(st, st.clubId)] * 0.35) return;
      if (motivoNoAnadir(st, id, p.contrato.salario, 'traspaso')) return;
      if (p.ovr < Math.max.apply(null, st.equipos[id].plantilla.map(i => st.jugadores[i].ovr)) - 12) return;
      const precio = valorIA(st, jugId, id);
      if (F() && st.finanzas[id].caja < precio * 1.5) return;
      out.push({ equipoId: id, precio });
    });
    return out.sort((a, b) => b.precio - a.precio).slice(0, 4);
  }
  const vender = (st, jugId, aId) => traspasar(st, jugId, aId, valorIA(st, jugId, aId));

  // ----- Agentes libres -----
  function nuevoLibre(st, ovr, edad, pais) {
    const m = st.mercado; m.seq = (m.seq || 0) + 1;
    const h = U.hash('fa' + m.seq + st.fecha);
    const pos = POS[h % 5];
    const pa = pais || GM.rng.pick(['US', 'US', 'US', 'ES', 'FR', 'RS', 'GR', 'LT', 'IT', 'DE', 'TR', 'IL']);
    const p = GM.mkJugador('fa', m.seq, GM.nombreAleatorio(pa, h), pos, edad, GM.alturaPos(pos, h), pa, GM.pasaporte(pa), ovr, ovr + (edad < 25 ? 3 : 0), ['E', 'T', 'D', 'R', 'P'][(h >>> 4) % 5], 0, 0);
    p.id = 'fa-' + m.seq; p.equipoId = null; p.libre = true; p.ficticio = true;
    st.jugadores[p.id] = p; m.libres.push(p.id);
    return p;
  }
  function libres(st) { return st.mercado.libres.map(i => st.jugadores[i]).filter(Boolean).sort((a, b) => b.ovr - a.ovr); }
  function buscar(st, f) {
    f = f || {};
    const q = (f.texto || '').toLowerCase();
    return Object.keys(st.jugadores).map(i => st.jugadores[i]).filter(p => p.equipoId && p.equipoId !== st.clubId && !p.juvenil &&
      (!f.liga || st.ligas[f.liga].equipos.indexOf(p.equipoId) >= 0) && (!f.equipo || p.equipoId === f.equipo) && (!f.pos || p.pos === f.pos) &&
      (!f.minOvr || p.ovr >= f.minOvr) && (!q || p.nombre.toLowerCase().indexOf(q) >= 0)).sort((a, b) => b.ovr - a.ovr);
  }
  function expiran(st, clubId) {
    return st.equipos[clubId].plantilla.map(i => st.jugadores[i]).filter(p => p.contrato.hasta <= yearOf(st) + 1).sort((a, b) => b.ovr - a.ovr);
  }

  // ----- IA diaria -----
  const minRoster = (st, id) => ligaDe(st, id) === 'NBA' ? 13 : 11;
  function mejorLibre(st, eqId, minOvr) {
    const sorted = libres(st);
    for (const p of sorted) {
      if (p.ovr < minOvr) break;
      if (p.origen === 'NBA' && ligaDe(st, eqId) !== 'NBA' && p.ovr > 72) continue;
      const ask = salarioPedido(st, p.id, eqId);
      if (!motivoNoAnadir(st, eqId, ask, 'fichaje')) return { p, ask };
    }
    return null;
  }
  function iaDia(st) {
    const mes = parseInt(st.fecha.slice(5, 7), 10);
    const ids = Object.keys(st.equipos).filter(i => i !== st.clubId || (st.modo === 'carrera' || st.modo === 'entrenador'));
    ids.forEach(id => {
      const eq = st.equipos[id];
      while (eq.plantilla.length > MAXP) {
        const peor = eq.plantilla.map(i => st.jugadores[i]).filter(x => !x.esYo).sort((a, b) => a.ovr - b.ovr)[0];
        sacar(st, peor);
      }
      if (eq.plantilla.length < minRoster(st, id)) {
        let c = mejorLibre(st, id, 0);
        if (!c) { const p = nuevoLibre(st, GM.rng.int(48, 60), GM.rng.int(21, 32)); c = { p, ask: Math.max(MINSAL[ligaDe(st, id)], 100000) }; }
        ficha(st, c.p, id, c.ask, GM.rng.int(1, 2));
      }
    });
    // Tu club con menos de 8 jugadores no puede jugar: la directiva firma agentes libres baratos hasta llegar a 8
    const tuyo = st.equipos[st.clubId];
    if (tuyo && ids.indexOf(st.clubId) < 0) while (tuyo.plantilla.length < 8) {
      let c = mejorLibre(st, st.clubId, 0);
      if (!c) { const p = nuevoLibre(st, GM.rng.int(48, 58), GM.rng.int(21, 32)); c = { p, ask: Math.max(MINSAL[ligaDe(st, st.clubId)], 100000) }; }
      ficha(st, c.p, st.clubId, c.ask, 1);
      GM.noticia(st, 'Con la plantilla bajo mínimos, la directiva firma a ' + c.p.nombre + ' por un año.');
    }
    if (mes >= 7 && mes <= 9) {
      for (let k = 0; k < 6; k++) {
        const id = GM.rng.pick(ids), eq = st.equipos[id];
        if (eq.plantilla.length >= 14) continue;
        const nueve = eq.plantilla.map(i => st.jugadores[i].ovr).sort((a, b) => b - a)[8] || 50;
        const c = mejorLibre(st, id, nueve + 1);
        if (c && (!st.finanzas || st.finanzas[id].caja > c.ask)) ficha(st, c.p, id, c.ask, GM.rng.int(1, 3));
      }
    }
    if (st.mercado.libres.length < 25) for (let i = 0; i < 10; i++) nuevoLibre(st, GM.rng.int(46, 62), GM.rng.int(21, 34));
  }
  GM.bus.on('dia:avanzado', function () { const st = GM.state; if (st && st.mercado && st.mercado.libres) iaDia(st); });

  // ----- Draft NBA -----
  function claseDraft(st) {
    const y = yearOf(st) + 1, pros = [];
    const paises = ['US', 'US', 'US', 'US', 'US', 'FR', 'ES', 'RS', 'GR', 'LT', 'DE', 'IT', 'TR', 'IL', 'GEN'];
    for (let i = 0; i < 72; i++) { // 72 candidatos para 60 puestos: quien no tiene nivel se queda sin elegir
      const h = U.hash('dr' + y + i), pos = POS[h % 5], pa = paises[h % paises.length];
      const q = 1 - i / 72;
      // Los primeros puestos pueden traer una promesa generacional (techo de 96 o 97); los demás, como mucho 94
      const gen = i < 2 && h % 3 === 0, ovr = Math.round(51 + q * 14 + (h % 5) - 2 + (gen ? 3 : 0)), pot = Math.round(Math.min(gen ? 97 : 94, ovr + 12 + q * 16 + (h >>> 3) % 7 + (gen ? 4 : 0)));
      const p = GM.mkJugador('dr' + y, i + 1, GM.nombreAleatorio(pa, h), pos, 19 + (h >>> 5) % 4, GM.alturaPos(pos, h), pa === 'GEN' ? 'PL' : pa, GM.pasaporte(pa === 'GEN' ? 'PL' : pa), ovr, pot, ['T', 'P', 'D', 'R', 'E'][(h >>> 7) % 5], 0, 0);
      p.ficticio = true; pros.push(p);
    }
    return pros;
  }
  function draft(st) {
    if (!st.ligas.NBA) return null;
    const y = yearOf(st) + 1, equipos = GM.mods.competiciones.clasificacion(st, 'NBA').map(r => r.equipoId).reverse();
    const pros = claseDraft(st);
    const yo = GM.mods.carrera && GM.mods.carrera.preDraft ? GM.mods.carrera.preDraft(st) : null;
    if (yo) pros.push(yo);
    const picks = [];
    for (let ronda = 0; ronda < 2; ronda++) {
      equipos.forEach((eqId, k) => {
        const n = ronda * 30 + k + 1;
        const val = x => x.pot * 0.6 + x.ovr * 0.4 + (x.ojeo || 0) + (x.deseado === eqId ? 4 : 0) + (U.hash(x.id + eqId) % 5);   // deseado: el equipo con el que dijiste que querías jugar
        pros.sort((a, b) => val(b) - val(a));   // ojeo: informe de los ojeadores sobre tu jugador (carrera.js)
        const p = pros.shift();
        p.equipoId = eqId; p.libre = false;
        p.contrato = { salario: Math.round(ronda === 0 ? 12e6 * Math.pow(0.93, k) : 1.8e6), hasta: y + 3 };
        if (!p.esYo) p.id = 'dr' + y + '-' + String(n).padStart(2, '0');
        st.jugadores[p.id] = p; st.equipos[eqId].plantilla.push(p.id);
        picks.push({ n, equipoId: eqId, jugadorId: p.id });
      });
    }
    st.mercado.ultimoDraft = { temporada: st.temporada, picks };
    if (GM.mods.carrera && GM.mods.carrera.postDraft) GM.mods.carrera.postDraft(st, picks);
    const mios = picks.filter(k => k.equipoId === st.clubId);
    if (mios.length) GM.noticia(st, 'Draft: tu club elige a ' + mios.map(k => st.jugadores[k.jugadorId].nombre + ' (nº ' + k.n + ')').join(' y ') + '.');
    return picks;
  }
  GM.bus.on('temporada:fin', function () {
    const st = GM.state; if (!st || !st.mercado || !st.mercado.libres) return;
    if (GM.mods.carrera && GM.mods.carrera.preCierre) GM.mods.carrera.preCierre(st);
    draft(st);
    // contratos que caducan
    const fin = yearOf(st) + 1;
    Object.keys(st.equipos).forEach(id => {
      st.equipos[id].plantilla.slice().forEach(pid => {
        const p = st.jugadores[pid];
        if (p.esYo || p.contrato.hasta > fin) return;
        if (id === st.clubId && st.modo !== 'carrera') return;
        if (GM.rng.chance(p.ovr >= 62 ? 0.8 : 0.4)) {
          p.contrato = { salario: salarioPedido(st, pid, id), hasta: fin + GM.rng.int(1, 3) };
        } else sacar(st, p);
      });
    });
    const n = (st.modo === 'carrera' || st.modo === 'entrenador') ? 0 : expiran(st, st.clubId).length;
    if (n) GM.noticia(st, 'Tienes ' + n + ' jugadores con el contrato a punto de vencer. Renueva antes de empezar la nueva temporada.');
    // limpiar agentes libres sobrantes
    const ls = libres(st);
    ls.slice(110).forEach(p => { delete st.jugadores[p.id]; });
    st.mercado.libres = ls.slice(0, 110).map(p => p.id);
  });

  // Se llama al empezar la nueva temporada: se marchan los del club que no se hayan renovado.
  function cerrarContratos(st) {
    if ((st.modo === 'carrera' || st.modo === 'entrenador')) {
      if (st.modo === 'entrenador' && GM.mods.entrenador) GM.mods.entrenador.cerrar(st);
      expiran(st, st.clubId).filter(p => !p.esYo).forEach(p => { if (GM.rng.chance(p.ovr >= 62 ? 0.8 : 0.4)) p.contrato = { salario: salarioPedido(st, p.id, st.clubId), hasta: yearOf(st) + 1 + GM.rng.int(1, 3) }; else sacar(st, p); });
      if (GM.mods.carrera && GM.mods.carrera.cerrar) GM.mods.carrera.cerrar(st);
      return;
    }
    expiran(st, st.clubId).forEach(p => { GM.noticia(st, p.nombre + ' termina contrato y abandona el club.'); sacar(st, p); });
  }
  function nuevaPartida(st) {
    st.mercado = { libres: [], seq: 0, ultimoDraft: null };
    for (let i = 0; i < 45; i++) nuevoLibre(st, GM.rng.int(48, 72) - (i > 30 ? 6 : 0), GM.rng.int(23, 36));
  }
  function selfTest() {
    const a = { ovr: 90, pot: 90, edad: 27 }, b = { ovr: 70, pot: 70, edad: 27 };
    return valorJugador(a) > valorJugador(b) * 4 && valorJugador(b) > 1e6 && valorJugador({ ovr: 70, pot: 70, edad: 36 }) < valorJugador(b);
  }
  GM.register('mercado', { claseDraft, sacar, valorJugador, salarioPedido, topeSalarial, evaluarOferta, ofertar, renovar, liberar, precioMinimo, comprar, ofertasVenta, vender, traspasar, draft, expiran, libres, buscar, cerrarContratos, nuevaPartida, selfTest, ligaDe, MAXP });
})();
