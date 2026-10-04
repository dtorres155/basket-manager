/* DIRECTIVA IA (GM.mods.directiva) — solo en modo Presidente
   El director deportivo propone fichajes y renovaciones, el entrenador gestiona alineación y cantera. El presidente puede vetar
   (cuesta influencia), aprobar al instante, cambiar al entrenador o impulsar una obra.
   Expone: estado, pendientes, vetar, aprobar, cambiarEntrenador, impulsarObra, selfTest.
   Escribe state.directiva = { entrenador, director, propuestas, registro }. */
(function () {
  const U = GM.util;
  const yearOf = st => parseInt(st.temporada.slice(0, 4), 10);
  const PERFILES = { cantera: 'Apuesta por la cantera', estrellas: 'Busca estrellas', ganar_ya: 'Quiere ganar ya', equilibrado: 'Equilibrado' };
  const act = st => !!st && st.modo === 'presidente' && !!st.directiva;
  const M = () => GM.mods.mercado;

  function persona(st, perfil, sal) {
    const h = U.hash(st.clubId + st.fecha + sal + GM.rng.int(0, 9999));
    return { nombre: GM.nombreAleatorio(st.equipos[st.clubId].pais || 'ES', h), perfil: perfil || GM.rng.pick(Object.keys(PERFILES)) };
  }
  function puntuacion(p, perfil) {
    const edad = p.edad;
    if (perfil === 'cantera') return p.pot * 0.6 + p.ovr * 0.4 - Math.max(0, edad - 26) * 1.5;
    if (perfil === 'estrellas') return p.ovr * 1.1 + (edad < 31 ? 2 : 0) + (p.pot > 80 ? 2 : 0);
    if (perfil === 'ganar_ya') return p.ovr - Math.max(0, edad - 34) * 0.5;
    return p.ovr * 0.7 + p.pot * 0.3;
  }
  const mia = st => st.equipos[st.clubId].plantilla.map(i => st.jugadores[i]).filter(Boolean);
  function ligaPrincipal(st) { return M().ligaDe(st, st.clubId); }

  const POSN = { PG: 'base', SG: 'escolta', SF: 'alero', PF: 'ala-pívot', C: 'pívot' };
  function cita(st, p, perfil, falta) {
    const pos = POSN[p.pos], e = p.edad, base = {
      cantera: ['Tiene ' + e + ' años y mucho que crecer. Encaja con lo que somos.', 'Un ' + pos + ' joven que puede ser de los nuestros durante años.'],
      estrellas: ['Es un nombre que llena el pabellón. Cada euro está bien invertido.', 'Un ' + pos + ' con carácter de estrella. La grada lo va a querer.'],
      ganar_ya: ['Hoy nos hace mejores. Del mañana ya hablaremos.', 'Nos falta un ' + pos + ' que decida partidos. Este lo hace.'],
      equilibrado: ['Cubre una necesidad real sin disparar la masa salarial.', 'Un ' + pos + ' fiable. No es un fichaje de portada, es un fichaje que sirve.']
    }[perfil];
    return (falta ? 'Estamos cortos de plantilla. ' : '') + base[GM.rng.int(0, 1)];
  }
  function proponer(st) {
    const d = st.directiva, perfil = d.director.perfil, club = st.clubId;
    if (d.propuestas.some(p => p.estado === 'pendiente' && p.tipo === 'fichaje')) return;
    const pl = mia(st).sort((a, b) => puntuacion(b, perfil) - puntuacion(a, perfil));
    const falta = pl.length < 13;
    const referencia = pl[Math.min(pl.length - 1, 8)];
    if (!falta && (!referencia || GM.rng.next() > 0.3 || pl.length >= 15)) return;
    const l = ligaPrincipal(st);
    let c = null, mejor = -1;
    M().libres(st).slice(0, 40).forEach(p => {
      if (p.origen === 'NBA' && l !== 'NBA' && p.ovr > 72) return;
      const sc = puntuacion(p, perfil);
      if (!falta && sc < puntuacion(referencia, perfil) + 2) return;
      const ask = M().salarioPedido(st, p.id, club);
      const tp = M().topeSalarial(st, club);
      if (l === 'NBA' ? (tp.masa + ask > 140e6 && ask > 2.3e6) : tp.masa + ask > tp.tope) return;
      if (sc > mejor) { mejor = sc; c = { p, ask }; }
    });
    if (!c) return;
    d.propuestas.push({ cita: cita(st, c.p, perfil, falta), id: 'p' + (d.seq = (d.seq || 0) + 1), tipo: 'fichaje', jugadorId: c.p.id, salario: Math.round(c.ask * 1.05 / 10000) * 10000, anos: c.p.edad <= 26 ? 3 : c.p.edad <= 30 ? 2 : 1, fecha: st.fecha, ejecutaEn: U.addDays(st.fecha, 3), estado: 'pendiente' });
    GM.noticia(st, 'La directiva quiere fichar a ' + c.p.nombre + ' (' + c.p.ovr + '). Tienes 3 días para vetarlo.');
  }
  function ejecutar(st, p) {
    const d = st.directiva, jug = st.jugadores[p.jugadorId];
    if (!jug || !jug.libre) { p.estado = 'fallido'; return; }
    const r = M().ofertar(st, p.jugadorId, { salario: p.salario, anos: p.anos });
    p.estado = r.ok ? 'hecho' : 'fallido'; p.motivo = r.motivo || null;
    d.registro.unshift({ fecha: st.fecha, texto: (r.ok ? 'Ficha a ' : 'No consigue fichar a ') + jug.nombre + '.' }); if (d.registro.length > 30) d.registro.length = 30;
    if (r.ok && GM.mods.legado && GM.mods.legado.ajustar) {
      const top = mia(st).sort((a, b) => b.ovr - a.ovr).slice(0, 3).some(x => x.id === jug.id);
      if (top) GM.mods.legado.ajustar(st, { ambicion: 1 }, 0); else if (jug.edad <= 23) GM.mods.legado.ajustar(st, { cantera: 1 }, 0);
    }
  }
  function vetar(st, id) {
    const p = st.directiva.propuestas.find(x => x.id === id && x.estado === 'pendiente');
    if (!p) return { ok: false, motivo: 'La propuesta ya no está pendiente.' };
    const g = GM.mods.legado.gastar(st, 15, 'veto'); if (!g.ok) return g;
    p.estado = 'vetada'; const dr = st.directiva.director; GM.noticia(st, 'Vetas el fichaje de ' + st.jugadores[p.jugadorId].nombre + '. ' + dr.nombre + ' acepta, pero ' + ({ cantera: 'insiste en que hay que mirar más a la cantera.', estrellas: 'no esconde su malestar: «Perdemos una oportunidad».', ganar_ya: 'recuerda que el calendario no espera.', equilibrado: 'lo respeta y buscará otra opción.' })[dr.perfil]);
    if (GM.mods.legado.ajustar) GM.mods.legado.ajustar(st, {}, -0.5);
    return { ok: true };
  }
  function aprobar(st, id) {
    const p = st.directiva.propuestas.find(x => x.id === id && x.estado === 'pendiente');
    if (!p) return { ok: false, motivo: 'La propuesta ya no está pendiente.' };
    ejecutar(st, p); return { ok: p.estado === 'hecho', motivo: p.motivo };
  }
  function cambiarEntrenador(st) {
    const g = GM.mods.legado.gastar(st, 40, 'entrenador'); if (!g.ok) return g;
    const ant = st.directiva.entrenador;
    st.directiva.entrenador = persona(st, GM.rng.pick(Object.keys(PERFILES).filter(k => k !== ant.perfil)), 'e');
    GM.noticia(st, 'Cambio en el banquillo: llega ' + st.directiva.entrenador.nombre + ' (' + PERFILES[st.directiva.entrenador.perfil].toLowerCase() + ').');
    return { ok: true };
  }
  function impulsarObra(st, tipo, ref) {
    const inst = st.instalaciones[st.clubId];
    let o = null;
    if (tipo === 'cd') { const b = inst.ciudadDeportiva.edificios.find(x => x.slot === ref && x.obra); o = b && b.obra; }
    else o = inst.pabellon.obras.find(x => x.id === ref);
    if (!o) return { ok: false, motivo: 'No hay obra en marcha.' };
    const resta = U.diffDays(st.fecha, o.fin); if (resta <= 3) return { ok: false, motivo: 'La obra está casi terminada.' };
    const g = GM.mods.legado.gastar(st, 25, 'obra'); if (!g.ok) return g;
    o.fin = U.addDays(st.fecha, Math.max(2, Math.ceil(resta * 0.6)));
    GM.noticia(st, 'Aceleras la obra con tus contactos en el ayuntamiento.');
    return { ok: true };
  }

  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!act(st)) return;
    const d = st.directiva, club = st.clubId, eq = st.equipos[club];
    eq.tactica = null;
    d.propuestas.filter(p => p.estado === 'pendiente' && p.ejecutaEn <= st.fecha).forEach(p => ejecutar(st, p));
    d.propuestas = d.propuestas.filter(p => p.estado === 'pendiente' || U.diffDays(p.fecha, st.fecha) < 20);
    if (U.weekday(st.fecha) !== 1) return;
    proponer(st);
    if (GM.rng.next() < 0.3) {
      const ult = GM.mods.competiciones.calendarioClub(st, club).filter(g => g.resultado).slice(-1)[0], en = d.entrenador;
      if (ult) {
        const local = ult.local === club, gano = (ult.resultado.local > ult.resultado.visitante) === local;
        const F = { cantera: gano ? ['«Los chicos han dado la cara. Así se construye un equipo.»'] : ['«Hemos perdido, pero he visto cosas buenas en los jóvenes.»'], estrellas: gano ? ['«Cuando nuestras figuras aparecen, somos difíciles de parar.»'] : ['«Nos faltó que las estrellas decidieran.»'], ganar_ya: gano ? ['«Victoria. Ahora, la siguiente.»'] : ['«No me vale. Hay que exigirse más.»'], equilibrado: gano ? ['«Buen trabajo colectivo. Sin euforias.»'] : ['«Toca analizar y corregir. Nada más.»'] }[en.perfil];
        GM.noticia(st, en.nombre + ' (entrenador): ' + F[0]);
      }
    }
    // cantera: el entrenador sube a quien lo merece
    const C = GM.mods.cantera;
    if (C && st.cantera[club] && eq.plantilla.length < 14) {
      const per = d.entrenador.perfil;
      const j = st.cantera[club].juveniles.map(i => st.jugadores[i]).filter(p => p && (p.ovr >= 52 && p.pot >= 72 || per === 'cantera' && p.ovr >= 48 && p.pot >= 70)).sort((a, b) => b.pot - a.pot)[0];
      if (j) { const r = C.subirAlPrimerEquipo(st, j.id); if (r.ok) d.registro.unshift({ fecha: st.fecha, texto: 'El entrenador sube a ' + j.nombre + ' desde la cantera.' }); }
    }
    // plantilla sobrante
    if (eq.plantilla.length > 14) {
      const peor = mia(st).sort((a, b) => a.ovr - b.ovr)[0];
      const of = M().ofertasVenta(st, peor.id)[0];
      const r = of ? M().vender(st, peor.id, of.equipoId) : M().liberar(st, peor.id);
      if (r.ok) d.registro.unshift({ fecha: st.fecha, texto: (of ? 'Traspasa a ' : 'Libera a ') + peor.nombre + '.' });
    }
  });
  GM.bus.on('temporada:fin', function () {
    const st = GM.state; if (!act(st)) return;
    const d = st.directiva, perfil = d.director.perfil;
    const fin = yearOf(st) + 1, exp = M().expiran(st, st.clubId).sort((a, b) => puntuacion(b, perfil) - puntuacion(a, perfil));
    const total = mia(st).length; let renov = 0;
    exp.forEach((p, i) => {
      const util = i < 6 || (perfil === 'cantera' && p.edad <= 24 && p.pot >= 68) || p.ovr >= 66;
      if (!util || total - exp.length + renov >= 14) return;
      const ask = Math.round(M().salarioPedido(st, p.id, st.clubId) * 1.06 / 10000) * 10000;
      const r = M().renovar(st, p.id, { salario: ask, anos: p.edad <= 26 ? 3 : p.edad <= 30 ? 2 : 1 });
      if (r.ok) { renov++; d.registro.unshift({ fecha: st.fecha, texto: 'Renueva a ' + p.nombre + '.' }); }
    });
    d.propuestas = d.propuestas.filter(p => p.estado === 'pendiente');
  });

  function nuevaPartida(st) {
    if (st.modo !== 'presidente') return;
    st.directiva = { entrenador: persona(st, null, 'e'), director: persona(st, null, 'd'), propuestas: [], registro: [], seq: 0 };
    st.equipos[st.clubId].tactica = null;
  }
  function estado(st) { return act(st) ? st.directiva : null; }
  function pendientes(st) { return act(st) ? st.directiva.propuestas.filter(p => p.estado === 'pendiente') : []; }
  function selfTest() { return typeof puntuacion === 'function' && puntuacion({ ovr: 60, pot: 80, edad: 20 }, 'cantera') > puntuacion({ ovr: 70, pot: 70, edad: 33 }, 'cantera') - 20 && puntuacion({ ovr: 80, pot: 80, edad: 28 }, 'ganar_ya') > puntuacion({ ovr: 60, pot: 90, edad: 20 }, 'ganar_ya'); }
  GM.register('directiva', { estado, pendientes, vetar, aprobar, cambiarEntrenador, impulsarObra, nuevaPartida, selfTest, PERFILES });
})();
