/* NEGOCIACIONES CON MÁS MATICES (GM.mods.negociacion)
   Para fichar a un agente libre o renovar a un jugador de tu plantilla se abre una negociación de hasta tres rondas con su agente. Además del salario y los años puedes ofrecer:
   - cláusula de rescisión: otro club puede pagarla y llevárselo (la cobras); a los jugadores les gusta una cláusula baja y les molesta una desorbitada;
   - opción en el último año: del jugador (decide él, según su ánimo) o del club (la decides tú al cerrar contratos);
   - bonus por objetivos: título de liga, playoffs, copa, minutos por partido o puntos por partido. Se pagan al acabar la temporada si se cumplen.
   El agente tiene carácter (duro, razonable o conciliador) y valora la oferta en dinero equivalente: si llega a lo que pide acepta; si se queda cerca contraoferta con lo que falta;
   si te quedas lejos rechaza y pierde paciencia; si se acaba la paciencia rompe y no se vuelve a hablar con él durante 30 días.
   Expone: agente, abrir, valorar, proponer, bonusDisponibles, aplicarOpciones, opcionesClub, decidirOpcionClub, selfTest.
   Escribe state.negociacion = { ses, bloqueos, opcionesClub, pagos }; el contrato lleva { clausula, opcion, bonus } además de salario y hasta. */
(function () {
  const U = GM.util,
    M = () => GM.mods.mercado,
    F = () => GM.mods.finanzas,
    yearOf = st => parseInt(st.temporada.slice(0, 4), 10);
  const PERFIL = {
    duro: { etq: 'Agente duro', desc: 'Pide un 10 % más y casi no cede.', f: 1.1, pac: 2 },
    razonable: { etq: 'Agente razonable', desc: 'Pide lo que vale su jugador.', f: 1, pac: 3 },
    conciliador: { etq: 'Agente conciliador', desc: 'Busca un acuerdo: se conforma con un 5 % menos.', f: 0.95, pac: 4 }
  };
  const BONUS = {
    titulo: { etq: 'Campeón de liga', unidad: '' },
    playoffs: { etq: 'Clasificación para playoffs', unidad: '' },
    copa: { etq: 'Campeón de copa', unidad: '' },
    minutos: { etq: 'Minutos por partido', unidad: 'min', def: 24 },
    puntos: { etq: 'Puntos por partido', unidad: 'pts', def: 12 }
  };
  function estado(st) {
    return st.negociacion || (st.negociacion = { ses: {}, bloqueos: {}, opcionesClub: [], pagos: [] });
  }
  function agente(st, jugId) {
    const h = U.hash(jugId + 'agente') % 100,
      perfil = h < 30 ? 'duro' : h < 80 ? 'razonable' : 'conciliador';
    return Object.assign({ perfil, nombre: GM.nombreAleatorio ? GM.nombreAleatorio('ES', U.hash(jugId + 'ag')) : 'Su agente' }, PERFIL[perfil]);
  }
  function bonusDisponibles() {
    return Object.keys(BONUS).map(k => Object.assign({ tipo: k }, BONUS[k]));
  }
  function abrir(st, jugId, tipo) {
    const E = estado(st),
      p = st.jugadores[jugId],
      club = st.clubId;
    if (!p) return { ok: false, motivo: 'Jugador desconocido.' };
    if (E.bloqueos[jugId] && st.fecha < E.bloqueos[jugId]) return { ok: false, motivo: 'Su agente no quiere volver a hablar hasta el ' + U.fechaLarga(E.bloqueos[jugId]) + '.' };
    if (tipo === 'renovar' && p.equipoId !== club) return { ok: false, motivo: 'Solo puedes renovar a jugadores de tu plantilla.' };
    if (tipo === 'fichar' && !p.libre) return { ok: false, motivo: 'Tiene contrato con otro club: negocia un traspaso.' };
    const ag = agente(st, jugId),
      tr = GM.traspasos && st.mercado ? GM.traspasos.trato(st, jugId) : null,
      pedido = Math.round((M().salarioPedido(st, jugId, club) * (tipo === 'renovar' ? 1.04 : 1) * ag.f * (tr ? tr.factorSalario : 1)) / 10000) * 10000; // la agencia del jugador te recuerda (punto 65)
    const ses = {
      id: jugId + ':' + tipo,
      jugId,
      tipo,
      ronda: 0,
      paciencia: ag.pac + (tr ? tr.pacienciaExtra : 0),
      agencia: tr ? tr.agencia : null,
      agente: { perfil: ag.perfil, nombre: ag.nombre, etq: ag.etq },
      pedido,
      estado: 'abierta',
      historial: []
    };
    E.ses[ses.id] = ses;
    return { ok: true, sesion: ses };
  }
  // Probabilidades aproximadas de cumplir cada bonus (la usa el jugador para valorarlos)
  function probBonus(st, p, b) {
    const club = p.equipoId || st.clubId,
      lg = M().ligaDe(st, club),
      ids = st.ligas[lg].equipos,
      orden = ids.slice().sort((a, c) => GM.mods.partidos.ovrEquipo(st, c) - GM.mods.partidos.ovrEquipo(st, a)),
      r = Math.max(0, orden.indexOf(club)) / Math.max(1, ids.length - 1);
    const rango = st.equipos[club]
      ? st.equipos[club].plantilla
          .map(i => st.jugadores[i])
          .filter(Boolean)
          .sort((a, c) => c.ovr - a.ovr)
          .findIndex(j => j.id === p.id)
      : 5;
    if (b.tipo === 'titulo') return r <= 0.06 ? 0.3 : r <= 0.2 ? 0.1 : 0.02;
    if (b.tipo === 'playoffs') return U.clamp(1.05 - r * 1.15, 0.05, 0.95);
    if (b.tipo === 'copa') return r <= 0.2 ? 0.2 : 0.07;
    if (b.tipo === 'minutos') {
      const esp = rango < 0 ? 12 : rango < 5 ? 29 - rango * 1.5 : rango < 8 ? 15 : 6;
      return U.clamp(0.9 - (b.umbral - esp) * 0.09, 0.03, 0.95);
    }
    if (b.tipo === 'puntos') {
      const esp = rango < 0 ? 4 : rango < 3 ? (p.ovr - 50) * 0.5 : rango < 6 ? (p.ovr - 50) * 0.3 : 3;
      return U.clamp(0.9 - (b.umbral - esp) * 0.11, 0.03, 0.95);
    }
    return 0.1;
  }
  // Valor de la oferta para el jugador, en euros al año equivalentes
  function valorar(st, ses, o) {
    const p = st.jugadores[ses.jugId],
      salario = Math.round(o.salario || 0),
      anos = U.clamp(o.anos || 1, 1, 4),
      partes = [],
      club = st.clubId;
    let v = salario;
    partes.push({ t: 'Salario', v: salario });
    const seg = p.edad >= 29 ? 0.02 * (anos - 1) : p.edad <= 24 ? -0.02 * Math.max(0, anos - 2) : 0.005 * (anos - 1);
    if (seg) {
      v += salario * seg;
      partes.push({ t: seg > 0 ? 'Le da seguridad' : 'Prefiere no atarse tanto', v: Math.round(salario * seg) });
    }
    (o.bonus || []).forEach(b => {
      const pr = probBonus(st, p, b),
        x = Math.round((b.cant || 0) * pr * 0.8);
      v += x;
      partes.push({ t: (BONUS[b.tipo] ? BONUS[b.tipo].etq : b.tipo) + (b.umbral ? ' (' + b.umbral + ')' : ''), v: x, prob: pr });
    });
    const vm = M().valorJugador(p),
      cl = o.clausula || 0;
    if (cl > 0) {
      const k = cl / Math.max(1, vm);
      const x = k < 1.5 ? salario * 0.03 : k > 4 ? -salario * 0.04 : k > 2.5 ? -salario * 0.015 : 0;
      if (x) {
        v += x;
        partes.push({ t: x > 0 ? 'Cláusula baja: se siente libre' : 'Cláusula desorbitada: se siente atado', v: Math.round(x) });
      }
    }
    if (o.opcion === 'jugador') {
      const x = salario * 0.05;
      v += x;
      partes.push({ t: 'Opción del jugador', v: Math.round(x) });
    } else if (o.opcion === 'club') {
      const x = -salario * 0.04;
      v += x;
      partes.push({ t: 'Opción del club', v: Math.round(x) });
    }
    const moral = ((p.estado.moral - 60) / 100) * 0.08 * salario;
    if (ses.tipo === 'renovar') {
      v += moral;
      if (Math.abs(moral) > 1000) partes.push({ t: moral > 0 ? 'Está a gusto en el club' : 'Está descontento', v: Math.round(moral) });
    }
    return { valor: Math.round(v), exigido: ses.pedido, ratio: v / ses.pedido, partes, club };
  }
  function proponer(st, ses, o) {
    const E = estado(st),
      p = st.jugadores[ses.jugId];
    if (ses.estado !== 'abierta') return { estado: ses.estado, mensaje: 'La negociación ya ha terminado.' };
    ses.ronda++;
    const val = valorar(st, ses, o),
      min = ses.agente.perfil === 'duro' ? 0.93 : 0.9,
      r = val.ratio;
    ses.historial.push({ ronda: ses.ronda, oferta: Object.assign({}, o), ratio: Math.round(r * 100) / 100 });
    if (GM.traspasos && st.mercado && r < 0.72) GM.traspasos.recordar(st, ses.jugId, 'lowball', 'Oferta muy baja por ' + p.nombre);
    if (r >= 1) {
      ses.estado = 'acepta';
      ses.final = o;
      if (GM.traspasos && st.mercado) GM.traspasos.recordar(st, ses.jugId, ses.tipo === 'renovar' ? 'renovacion' : 'acuerdo', 'Contrato acordado con ' + p.nombre);
      return { estado: 'acepta', mensaje: ses.agente.nombre + ': «De acuerdo. ' + p.nombre + ' firma.»', val };
    }
    if ((r >= min && ses.agente.perfil !== 'duro') || (r >= min && ses.ronda <= 2)) {
      const falta = Math.max(10000, Math.round((ses.pedido - val.valor) / 10000) * 10000),
        contra = Object.assign({}, o, { salario: Math.round(o.salario) + falta });
      return { estado: 'contra', mensaje: ses.agente.nombre + ': «Estamos cerca. Si subes el salario a ' + U.eur(contra.salario) + ' al año, firmamos.»', contra, val };
    }
    ses.paciencia--;
    if (ses.paciencia <= 0 || ses.ronda >= 3) {
      ses.estado = 'rompe';
      E.bloqueos[ses.jugId] = U.addDays(st.fecha, 30);
      if (GM.traspasos && st.mercado) GM.traspasos.recordar(st, ses.jugId, 'rompe', 'Se rompe la negociación por ' + p.nombre);
      return { estado: 'rompe', mensaje: ses.agente.nombre + ': «Se acabó. No volveremos a hablar en un mes.»', val };
    }
    return { estado: 'rechaza', mensaje: ses.agente.nombre + ': «Eso queda lejos de lo que merece. Piden unos ' + U.eur(ses.pedido) + ' al año en total.»', val };
  }
  // Firma el contrato pactado
  function cerrar(st, ses) {
    if (ses.estado !== 'acepta' || !ses.final) return { ok: false, motivo: 'No hay acuerdo.' };
    const o = ses.final,
      r = M().firmar(
        st,
        ses.jugId,
        { salario: o.salario, anos: o.anos, clausula: o.clausula || 0, opcion: o.opcion || null, bonus: (o.bonus || []).filter(b => b.cant > 0) },
        ses.tipo === 'renovar'
      );
    delete estado(st).ses[ses.id];
    return r;
  }
  // ---------- Efectos de las cláusulas ----------
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state;
    if (!st || !st.negociacion || U.weekday(st.fecha) !== 3) return;
    const club = st.clubId,
      F0 = F();
    if (!st.equipos[club]) return;
    st.equipos[club].plantilla
      .map(i => st.jugadores[i])
      .filter(p => p && p.contrato && p.contrato.clausula > 0 && !p.esYo)
      .forEach(p => {
        const vm = M().valorJugador(p);
        if (p.contrato.clausula > vm * 3.2 || p.ovr < 68) return;
        const comprador = Object.keys(st.equipos)
          .filter(id => id !== club && st.equipos[id].reputacion >= st.equipos[club].reputacion - 4 && (!F0 || !st.finanzas[id] || st.finanzas[id].caja >= p.contrato.clausula))
          .sort((a, b) => U.hash(a + p.id + st.fecha) - U.hash(b + p.id + st.fecha))[0];
        if (!comprador || GM.rng.next() > 0.06 * Math.min(2, vm / Math.max(1, p.contrato.clausula) + 0.3)) return;
        if (st.equipos[club].plantilla.length <= 10) return;
        const pr = p.contrato.clausula;
        if (F0) {
          F0.registrar(st, comprador, 'Cláusula de ' + p.nombre, -pr);
          F0.registrar(st, club, 'Cláusula de ' + p.nombre, pr);
        }
        st.equipos[club].plantilla = st.equipos[club].plantilla.filter(i => i !== p.id);
        st.equipos[comprador].plantilla.push(p.id);
        p.equipoId = comprador;
        p.contrato = { salario: M().salarioPedido(st, p.id, comprador), hasta: yearOf(st) + 3 };
        GM.noticia(st, '💶 ' + st.equipos[comprador].nombre + ' paga la cláusula de ' + U.eur(pr) + ' y se lleva a ' + p.nombre + '.');
        GM.bus.emit('fichaje:hecho', { jugadorId: p.id, de: club, a: comprador });
      });
  });
  // Opciones del último año: se resuelven al cerrar los contratos (mercado.cerrarContratos)
  function opcionesClub(st) {
    const y = yearOf(st) + 1;
    return st.equipos[st.clubId].plantilla
      .map(i => st.jugadores[i])
      .filter(p => p && p.contrato && p.contrato.opcion === 'club' && p.contrato.hasta <= y && !p.contrato.opcionUsada)
      .map(p => ({ jugId: p.id, salario: p.contrato.salario }));
  }
  function aplicarOpciones(st) {
    const club = st.clubId,
      y = yearOf(st) + 1;
    st.equipos[club].plantilla
      .map(i => st.jugadores[i])
      .filter(p => p && p.contrato && p.contrato.opcion && p.contrato.hasta <= y && !p.contrato.opcionUsada)
      .forEach(p => {
        if (p.contrato.opcion === 'jugador') {
          const queda = p.estado.moral >= 55 + (U.hash(p.id + st.temporada) % 20) - 10 || p.ovr < 60;
          if (queda) {
            p.contrato.hasta += 1;
            p.contrato.opcionUsada = true;
            GM.noticia(st, p.nombre + ' ejerce su opción y se queda otro año.');
          } else {
            p.contrato.opcionUsada = true;
            GM.noticia(st, p.nombre + ' rechaza su opción: quiere probar suerte fuera.');
          }
        } else {
          p.contrato.opcionUsada = true;
          if (p.ovr >= 60) {
            p.contrato.hasta += 1;
            GM.noticia(st, 'El club ejerce la opción de ' + p.nombre + ': un año más.');
          }
        }
      });
  }
  function decidirOpcionClub(st, jugId, ejerce) {
    const E = estado(st),
      p = st.jugadores[jugId];
    if (!p || !opcionesClub(st).some(x => x.jugId === jugId)) return { ok: false, motivo: 'No hay opción pendiente.' };
    p.contrato.opcionUsada = true;
    if (ejerce) {
      p.contrato.hasta += 1;
      GM.noticia(st, 'Ejerces la opción de ' + p.nombre + ': un año más.');
    } else GM.noticia(st, 'No ejerces la opción de ' + p.nombre + '.');
    return { ok: true };
  }
  // Pago de bonus al acabar la temporada
  GM.bus.on('temporada:fin', function () {
    const st = GM.state;
    if (!st || !st.equipos || !st.equipos[st.clubId]) return;
    const club = st.clubId,
      E = estado(st),
      lg = M().ligaDe(st, club);
    const camp = st.historial.some(h => h.temporada === st.temporada && h.campeon === club && h.comp === lg),
      copa = st.historial.some(h => h.temporada === st.temporada && h.campeon === club && st.copas && st.copas[h.comp]);
    const tabla = GM.mods.competiciones.clasificacion(st, lg, lg === 'NBA' ? st.equipos[club].conferencia : null),
      pos = tabla.findIndex(r => r.equipoId === club) + 1,
      po = pos > 0 && pos <= (lg === 'NBA' ? 10 : Math.ceil(st.ligas[lg].equipos.length * 0.5));
    st.equipos[club].plantilla
      .map(i => st.jugadores[i])
      .filter(p => p && p.contrato && p.contrato.bonus && p.contrato.bonus.length)
      .forEach(p => {
        const s = (st.estadisticas || {})[p.id] || { pj: 0, min: 0, pts: 0 };
        let total = 0;
        const ok = [];
        p.contrato.bonus.forEach(b => {
          const cumple =
            b.tipo === 'titulo'
              ? camp
              : b.tipo === 'playoffs'
                ? po
                : b.tipo === 'copa'
                  ? copa
                  : b.tipo === 'minutos'
                    ? s.pj >= 20 && s.min / s.pj >= b.umbral
                    : b.tipo === 'puntos'
                      ? s.pj >= 20 && s.pts / s.pj >= b.umbral
                      : false;
          if (cumple) {
            total += b.cant;
            ok.push(BONUS[b.tipo].etq);
          }
        });
        if (total > 0) {
          if (F()) F().registrar(st, club, 'Bonus de ' + p.nombre, -total);
          E.pagos.unshift({ temporada: st.temporada, jugador: p.nombre, importe: total, motivos: ok });
          GM.noticia(st, 'Bonus: ' + p.nombre + ' cobra ' + U.eur(total) + ' (' + ok.join(', ') + ').');
          p.estado.moral = U.clamp(p.estado.moral + 3, 20, 100);
        }
      });
    if (E.pagos.length > 30) E.pagos.length = 30;
  });
  function nuevaPartida(st) {
    st.negociacion = { ses: {}, bloqueos: {}, opcionesClub: [], pagos: [] };
  }
  function selfTest() {
    if (!GM.mods.mercado || !GM.mods.mercado.firmar) return false;
    const st = {
      fecha: '2026-10-01',
      temporada: '2026-27',
      clubId: 'a',
      modo: 'gestor',
      seed: 3,
      noticias: [],
      equipos: { a: { reputacion: 70, plantilla: [] } },
      ligas: { ACB: { equipos: ['a'] } },
      mercado: { libres: [] },
      finanzas: {}
    };
    const p = GM.mkJugador('x', 1, 'Prueba', 'SF', 26, 200, 'ES', 'UE', 72, 74, 'E', 1e6, 2027);
    p.estado = p.estado || { moral: 70 };
    st.jugadores = { [p.id]: p };
    st.equipos.a.plantilla = [];
    p.libre = true;
    p.equipoId = null;
    st.mercado.libres = [p.id];
    const ses = abrir(st, p.id, 'fichar').sesion;
    const base = { salario: ses.pedido, anos: 2 };
    const a = valorar(st, ses, base),
      b = valorar(st, ses, Object.assign({}, base, { opcion: 'jugador' })),
      c = valorar(st, ses, Object.assign({}, base, { clausula: 90e6 }));
    return a.ratio >= 0.99 && b.valor > a.valor && c.valor < a.valor && proponer(st, ses, { salario: Math.round(ses.pedido * 1.2), anos: 2 }).estado === 'acepta';
  }
  GM.register('negociacion', {
    estado,
    agente,
    abrir,
    valorar,
    proponer,
    cerrar,
    bonusDisponibles,
    opcionesClub,
    aplicarOpciones,
    decidirOpcionClub,
    nuevaPartida,
    selfTest,
    PERFIL,
    BONUS
  });
})();
