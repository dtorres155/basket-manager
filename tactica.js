/* TÁCTICA Y CUERPO TÉCNICO (GM.mods.tactica) — modos gestor y entrenador
   Profundiza en el trabajo del entrenador:
   - Táctica ampliada (partidos.js): además de ritmo, defensa y foco hay PRESIÓN (ninguna, media, alta), ESQUEMA DE ATAQUE (equilibrado, pick and roll, aislamientos, movimiento de balón,
     poste), REBOTE (equilibrado, ofensivo, retorno) y ROTACIÓN (corta, normal, larga). Cada club de la IA tiene su propio estilo.
   - Plan de la semana: tiro, defensa, físico, pase, ataque, equipo (sube la cohesión) o descanso (recupera fatiga). Se aplica los lunes.
   - Cohesión del equipo (0 a 100, equipos[club].cohesion): sube con victorias y con el plan de equipo, baja con cada fichaje o venta y tras derrotas; influye un poco en el rendimiento.
   - Cuerpo técnico: analista (informes del rival), ayudante de ataque (esquemas más eficaces) y de defensa (presión más eficaz), de nivel 0 a 3.
   - Informe del rival: puntos fuertes y débiles frente a la media de su liga, estilo, quinteto y jugador clave según el nivel del analista, y una recomendación de táctica que se aplica con un toque.
   - Charla antes del partido: motivar, calmar, exigir o repasar el plan (una por jornada).
   Expone: estado, PLANES, fijarPlan, staff, contratar, informeRival, aplicarRecomendacion, charla, cohesion, selfTest. Escribe state.tactica = { plan, charla, aplicada } y state.staff = { analista, ataque, defensa }. */
(function () {
  const U = GM.util,
    P = () => GM.mods.partidos,
    M = () => GM.mods.mercado,
    F = () => GM.mods.finanzas;
  const PLANES = {
    general: { etq: 'Sesión general', desc: 'Un poco de todo.', foco: 'equilibrado' },
    tiro: { etq: 'Tiro', desc: 'Más triples y tiros libres.', foco: 'tiro' },
    defensa: { etq: 'Defensa', desc: 'Mejora la defensa y el rebote.', foco: 'defensa' },
    fisico: { etq: 'Físico', desc: 'Más fuerza y aguante, algo más de cansancio.', foco: 'fisico', fatiga: 4 },
    pase: { etq: 'Pase y manejo', desc: 'Mejora la circulación y el manejo.', foco: 'pase' },
    ataque: { etq: 'Automatismos de ataque', desc: 'Trabaja los esquemas y sube la cohesión.', foco: 'equilibrado', coh: 1.5 },
    equipo: { etq: 'Cohesión de grupo', desc: 'Actividades de equipo: sube mucho la cohesión.', foco: 'equilibrado', coh: 3 },
    descanso: { etq: 'Descanso', desc: 'Recupera fatiga y forma; no se entrena.', foco: 'equilibrado', fatiga: -10, forma: 3 }
  };
  const ROLES = {
    analista: { etq: 'Analista de vídeo', desc: 'Informes del rival más completos (nivel 1: puntos fuertes; 2: quinteto y jugador clave; 3: recomendación exacta).', coste: 30 },
    ataque: { etq: 'Ayudante de ataque', desc: 'Los esquemas de ataque rinden un 25 % más por nivel.', coste: 25 },
    defensa: { etq: 'Ayudante de defensa', desc: 'La presión rinde un 20 % más por nivel.', coste: 25 }
  };
  const NIVELES = ['sin contratar', 'discreto', 'bueno', 'excelente'];
  const activo = st => st.modo === 'gestor' || st.modo === 'entrenador';
  function estado(st) {
    return st.tactica || (st.tactica = { plan: 'general', charla: null, aplicada: null });
  }
  function staff(st) {
    const s = st.staff || (st.staff = { analista: 0, ataque: 0, defensa: 0 });
    return Object.keys(ROLES).map(k => Object.assign({ id: k, nivel: s[k], nombre: NIVELES[s[k]], siguiente: s[k] < 3 ? ROLES[k].coste * (s[k] + 1) : null }, ROLES[k]));
  }
  function contratar(st, rol) {
    if (!activo(st)) return { ok: false, motivo: 'Este modo no gestiona el cuerpo técnico.' };
    const r = ROLES[rol],
      s = st.staff || (st.staff = { analista: 0, ataque: 0, defensa: 0 });
    if (!r) return { ok: false, motivo: 'Puesto desconocido.' };
    if (s[rol] >= 3) return { ok: false, motivo: 'Ya tienes al mejor.' };
    const coste = r.coste * (s[rol] + 1) * 1000;
    if (F() && st.finanzas[st.clubId].caja < coste) return { ok: false, motivo: 'No hay caja para ' + U.eur(coste) + '.' };
    if (F()) F().registrar(st, st.clubId, 'Cuerpo técnico: ' + r.etq, -coste);
    s[rol]++;
    GM.noticia(st, 'Cuerpo técnico: ' + r.etq.toLowerCase() + ' (' + NIVELES[s[rol]] + ').');
    return { ok: true };
  }
  function fijarPlan(st, id) {
    const p = PLANES[id];
    if (!p) return { ok: false, motivo: 'Plan desconocido.' };
    estado(st).plan = id;
    if (GM.mods.cantera && GM.mods.cantera.fijarFoco && st.cantera && st.cantera[st.clubId]) GM.mods.cantera.fijarFoco(st, st.clubId, p.foco);
    return { ok: true };
  }
  const cohesion = (st, club) => {
    const e = st.equipos[club || st.clubId];
    return e && typeof e.cohesion === 'number' ? e.cohesion : 55;
  };
  function mueveCoh(st, d) {
    const e = st.equipos[st.clubId];
    if (e) e.cohesion = U.clamp(cohesion(st) + d, 10, 100);
  }
  // ---------- Informe del rival ----------
  const ATTS = ['tiro3', 'tiro2', 'tl', 'pase', 'bote', 'reb', 'defInt', 'defPer', 'fisico', 'iq'],
    ETQ = {
      tiro3: 'el triple',
      tiro2: 'el tiro de media',
      tl: 'el tiro libre',
      pase: 'la circulación de balón',
      bote: 'el manejo',
      reb: 'el rebote',
      defInt: 'la defensa interior',
      defPer: 'la defensa exterior',
      fisico: 'el físico',
      iq: 'la lectura del juego'
    };
  function perfil(st, id) {
    const pl = st.equipos[id].plantilla
        .map(i => st.jugadores[i])
        .filter(p => p && !(p.estado.lesion && p.estado.lesion.dias > 0))
        .sort((a, b) => b.ovr - a.ovr)
        .slice(0, 8),
      o = {};
    ATTS.forEach(k => {
      o[k] =
        pl.reduce((s, p, i) => s + p.att[k] * [1.3, 1.2, 1.1, 1, 0.9, 0.7, 0.6, 0.4][i], 0) / [1.3, 1.2, 1.1, 1, 0.9, 0.7, 0.6, 0.4].slice(0, pl.length).reduce((a, b) => a + b, 0);
    });
    o.ovr = P().ovrEquipo(st, id);
    o.pl = pl;
    return o;
  }
  function mediaLiga(st, liga) {
    const c = st._mediaLiga && st._mediaLiga.f === st.fecha && st._mediaLiga.l === liga ? st._mediaLiga : null;
    if (c) return c;
    const ids = st.ligas[liga].equipos,
      per = ids.map(i => perfil(st, i)),
      m = {},
      sd = {};
    ATTS.forEach(k => {
      const v = per.map(p => p[k]),
        mu = v.reduce((a, b) => a + b, 0) / v.length;
      m[k] = mu;
      sd[k] = Math.sqrt(v.reduce((a, b) => a + (b - mu) * (b - mu), 0) / v.length) || 1;
    });
    return (st._mediaLiga = { f: st.fecha, l: liga, m, sd });
  }
  function informeRival(st, rivalId) {
    const nivel = (st.staff && st.staff.analista) || 0,
      lg = M().ligaDe(st, rivalId),
      ML = mediaLiga(st, lg),
      pr = perfil(st, rivalId),
      mio = perfil(st, st.clubId),
      tac = P().tacticaAuto(st, rivalId);
    const z = {};
    ATTS.forEach(k => {
      z[k] = (pr[k] - ML.m[k]) / ML.sd[k];
    });
    const orden = ATTS.slice().sort((a, b) => z[b] - z[a]),
      fuertes = orden.filter(k => z[k] > 0.4).slice(0, 3),
      debiles = orden
        .slice()
        .reverse()
        .filter(k => z[k] < -0.4)
        .slice(0, 3);
    const estilo =
      {
        pick: 'Juega mucho el pick and roll',
        movimiento: 'Mueve el balón sin parar',
        aislamiento: 'Busca aislamientos para su estrella',
        poste: 'Carga el juego en el poste',
        equilibrado: 'Juego equilibrado'
      }[tac.ataque] +
      (tac.presion !== 'ninguna' ? ' y aprieta la defensa' : '') +
      '.';
    // recomendación
    const rec = {
      ritmo: tac.ritmo >= 4 ? 2 : 3,
      defensa: 'hombre',
      foco: 'equilibrado',
      ataque: 'equilibrado',
      presion: 'ninguna',
      rebote: 'equilibrado',
      rotacion: 'normal',
      razones: []
    };
    if (z.defInt < -0.5) {
      rec.ataque = 'poste';
      rec.foco = 'interior';
      rec.razones.push('Su defensa interior es floja: ataca el aro.');
    } else if (z.defPer < -0.5) {
      rec.ataque = 'pick';
      rec.foco = 'exterior';
      rec.razones.push('Defiende mal el perímetro: pick and roll y triples.');
    } else if (mio.pase - ML.m.pase > 3) {
      rec.ataque = 'movimiento';
      rec.razones.push('Tu equipo pasa mejor que la media: mueve el balón.');
    }
    if (z.bote < -0.6 || z.pase < -0.6) {
      rec.presion = 'alta';
      rec.razones.push('Cuida poco el balón: aprieta arriba para forzar pérdidas.');
    }
    if (z.tiro3 > 0.8) {
      rec.defensa = 'hombre';
      rec.razones.push('Tira muy bien de tres: evita la zona y sal a sus tiradores.');
    } else if (z.tiro3 < -0.6 && z.reb < 0) {
      rec.defensa = 'zona';
      rec.razones.push('Tira mal de lejos: una zona le complica.');
    }
    if (z.reb > 0.7) {
      rec.rebote = 'retorno';
      rec.razones.push('Domina el rebote: prioriza volver a defender.');
    } else if (z.reb < -0.6) {
      rec.rebote = 'ofensivo';
      rec.razones.push('Rebotea poco: ataca el rebote ofensivo.');
    }
    if (mio.ovr - pr.ovr >= 3) rec.rotacion = 'larga';
    else if (pr.ovr - mio.ovr >= 4) {
      rec.rotacion = 'corta';
      rec.razones.push('Es superior: cierra la rotación y apura a tus mejores.');
    }
    if (!rec.razones.length) rec.razones.push('Sin puntos débiles claros: mantén tu plan.');
    const out = { nivel, equipoId: rivalId, ovr: Math.round(pr.ovr * 10) / 10, mio: Math.round(mio.ovr * 10) / 10, estilo };
    out.fuertes = nivel >= 1 ? fuertes.map(k => ETQ[k]) : [];
    out.debiles = nivel >= 1 ? debiles.map(k => ETQ[k]) : [];
    if (nivel >= 2) {
      out.quinteto = P().tacticaValida
        ? rivalId === st.clubId
          ? []
          : P()
              .tacticaAuto(st, rivalId)
              .quinteto.map(i => ({ nombre: st.jugadores[i].nombre, pos: st.jugadores[i].pos, ovr: st.jugadores[i].ovr }))
        : [];
      const k = pr.pl[0];
      if (k) {
        const fk = Object.keys(k.att).sort((a, b) => k.att[b] - k.att[a])[0];
        out.clave = { nombre: k.nombre, ovr: k.ovr, fuerte: ETQ[fk] };
      }
    }
    if (nivel >= 3) out.recomendacion = rec;
    else if (nivel >= 1) out.pista = rec.razones[0];
    return out;
  }
  function aplicarRecomendacion(st, rivalId) {
    if (!activo(st)) return { ok: false, motivo: 'La táctica la decide el entrenador.' };
    const inf = informeRival(st, rivalId);
    if (!inf.recomendacion) return { ok: false, motivo: 'Necesitas un analista de nivel 3 para recibir una recomendación exacta.' };
    const t = Object.assign({}, P().tacticaValida(st, st.clubId)),
      r = inf.recomendacion;
    ['ritmo', 'defensa', 'foco', 'ataque', 'presion', 'rebote', 'rotacion'].forEach(k => {
      t[k] = r[k];
    });
    st.equipos[st.clubId].tactica = t;
    estado(st).aplicada = { fecha: st.fecha, rival: rivalId };
    return { ok: true };
  }
  // ---------- Charla ----------
  const CHARLAS = {
    motivar: { etq: 'Motivar', desc: 'Sube el ánimo de todos.' },
    calma: { etq: 'Pedir calma', desc: 'Menos nervios: algo más de forma.' },
    exigir: { etq: 'Exigir', desc: 'Los titulares salen mordiendo; los suplentes se resienten.' },
    plan: { etq: 'Repasar el plan', desc: 'Si has aplicado el plan al rival, sube la cohesión y la forma.' }
  };
  function charla(st, tipo) {
    if (!activo(st)) return { ok: false, motivo: 'No puedes dar charlas en este modo.' };
    const c = estado(st),
      ch = CHARLAS[tipo];
    if (!ch) return { ok: false, motivo: 'Charla desconocida.' };
    if (c.charla === st.fecha) return { ok: false, motivo: 'Ya has hablado al equipo hoy.' };
    const pl = st.equipos[st.clubId].plantilla.map(i => st.jugadores[i]).filter(Boolean),
      tit = P().tacticaValida(st, st.clubId).quinteto;
    let txt = '';
    if (tipo === 'motivar') {
      pl.forEach(p => {
        p.estado.moral = U.clamp(p.estado.moral + 4, 20, 100);
      });
      txt = 'El vestuario sale con la moral alta.';
    } else if (tipo === 'calma') {
      pl.forEach(p => {
        p.estado.forma = U.clamp(p.estado.forma + 2, 40, 100);
        p.estado.moral = U.clamp(p.estado.moral + 1, 20, 100);
      });
      txt = 'El equipo sale tranquilo.';
    } else if (tipo === 'exigir') {
      pl.forEach(p => {
        if (tit.indexOf(p.id) >= 0) p.estado.forma = U.clamp(p.estado.forma + 4, 40, 100);
        else p.estado.moral = U.clamp(p.estado.moral - 2, 20, 100);
      });
      txt = 'Los titulares salen con hambre; el banquillo, algo molesto.';
    } else {
      const ap = c.aplicada && c.aplicada.fecha >= U.addDays(st.fecha, -3);
      if (ap) {
        pl.forEach(p => {
          p.estado.forma = U.clamp(p.estado.forma + 2, 40, 100);
        });
        mueveCoh(st, 2);
        txt = 'Todos saben lo que hay que hacer.';
      } else txt = 'Repasas el plan, pero sin un plan para el rival no cambia mucho.';
    }
    c.charla = st.fecha;
    return { ok: true, texto: txt };
  }
  // ---------- Vida del plan, cohesión y fichajes ----------
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state;
    if (!st || !st.tactica || !activo(st) || U.weekday(st.fecha) !== 1) return;
    const p = PLANES[st.tactica.plan] || PLANES.general,
      pl = st.equipos[st.clubId].plantilla.map(i => st.jugadores[i]).filter(Boolean);
    if (p.fatiga)
      pl.forEach(j => {
        j.estado.fatiga = U.clamp((j.estado.fatiga || 0) + p.fatiga, 0, 100);
      });
    if (p.forma)
      pl.forEach(j => {
        j.estado.forma = U.clamp(j.estado.forma + p.forma, 40, 100);
      });
    mueveCoh(st, (p.coh || 0) + (cohesion(st) < 55 ? 0.8 : cohesion(st) > 70 ? -0.5 : 0));
  });
  GM.bus.on('partido:jugado', function (e) {
    const st = GM.state;
    if (!st || !st.tactica || !activo(st)) return;
    const g = e.partido;
    if (g.local !== st.clubId && g.visitante !== st.clubId) return;
    const gano = (g.local === st.clubId) === g.resultado.local > g.resultado.visitante;
    mueveCoh(st, gano ? 0.6 : -0.4);
  });
  GM.bus.on('fichaje:hecho', function (e) {
    const st = GM.state;
    if (!st || !st.tactica || !activo(st)) return;
    if (e.a === st.clubId || e.de === st.clubId) mueveCoh(st, -3);
  });
  function nuevaPartida(st) {
    st.tactica = { plan: 'general', charla: null, aplicada: null };
    st.staff = { analista: 0, ataque: 0, defensa: 0 };
  }
  function selfTest() {
    const st = { clubId: 'a', equipos: { a: {} }, tactica: null, staff: { analista: 0, ataque: 0, defensa: 0 }, modo: 'gestor' };
    mueveCoh(st, 10);
    return (
      cohesion(st) === 65 &&
      estado(st).plan === 'general' &&
      fijarPlan(st, 'equipo').ok &&
      estado(st).plan === 'equipo' &&
      !fijarPlan(st, 'x').ok &&
      staff(st).length === 3 &&
      staff(st)[0].siguiente === 30
    );
  }
  GM.register('tactica', { estado, PLANES, ROLES, CHARLAS, fijarPlan, staff, contratar, informeRival, aplicarRecomendacion, charla, cohesion, nuevaPartida, selfTest });
})();
