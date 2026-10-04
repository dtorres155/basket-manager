/* CIUDAD (GM.mods.ciudad)
   Medidores por club (ambiente, apoyoAyuntamiento, aficion; 0-100), convenios, eventos y sucesos aleatorios.
   Expone: modificadores, perfil, conveniosDisponibles, firmarConvenio, eventosDisponibles, organizarEvento, selfTest.
   Escribe state.ciudad[clubId]. Usa finanzas.registrar y ciudadDeportiva.efectos si existen. */
(function () {
  const U = GM.util;
  const CONVENIOS = [
    { id: 'ayto-suelo', nombre: 'Cesión de suelo municipal', desc: 'El Ayuntamiento cede terrenos y agiliza las licencias: las obras salen un 15 % más baratas.', coste: 0, meses: 36, minApoyo: 55, efecto: { obras: -0.15 }, ahora: { apoyo: 3 } },
    { id: 'colegios', nombre: 'Programa escolar', desc: 'Clínics en los colegios de la zona: más afición joven y mejor cantera.', coste: 60000, meses: 12, efecto: { cantera: 0.05 }, ahora: { aficion: 5 } },
    { id: 'empresas', nombre: 'Club de empresas locales', desc: 'Empresas de la zona apoyan al club con palcos y publicidad.', coste: 0, meses: 12, minApoyo: 45, efecto: { ingresos: 0.04 }, ahora: { apoyo: 2 } },
    { id: 'hospital', nombre: 'Convenio con el hospital', desc: 'Revisiones y fisioterapia con el centro sanitario de la zona: plantilla más animada y mejor cuidada.', coste: 90000, meses: 12, efecto: { moral: 0.03 }, ahora: {} },
    { id: 'transporte', nombre: 'Transporte los días de partido', desc: 'Refuerzo de autobuses y metro: llega más gente al pabellón.', coste: 40000, meses: 12, efecto: { asistencia: 0.04 }, ahora: { ambiente: 2 } },
    { id: 'tv-local', nombre: 'Acuerdo con la televisión autonómica', desc: 'Emisión de partidos en abierto a cambio de derechos.', coste: 0, meses: 12, minApoyo: 60, efecto: { ingresos: 0.05 }, ahora: {} }
  ];
  const EVENTOS = [
    { id: 'puertas', nombre: 'Jornada de puertas abiertas', desc: 'Los vecinos visitan las instalaciones.', coste: 15000, efecto: { aficion: 3, ambiente: 2 } },
    { id: 'clinic', nombre: 'Clínic infantil con los jugadores', desc: 'Entrenamiento con niños de los colegios cercanos.', coste: 20000, efecto: { aficion: 4, apoyo: 3 } },
    { id: 'torneo', nombre: 'Torneo de baloncesto base', desc: 'Torneo con clubes de la comarca.', coste: 35000, efecto: { apoyo: 3, ambiente: 3 } },
    { id: 'concierto', nombre: 'Concierto en el pabellón', desc: 'Ingresos extra, pero a algunos vecinos no les hace gracia el ruido.', coste: 0, ingreso: 90000, efecto: { ambiente: 4, apoyo: -2 } },
    { id: 'homenaje', nombre: 'Homenaje a una leyenda del club', desc: 'Un acto emotivo antes de un partido.', coste: 10000, efecto: { aficion: 6 } }
  ];
  const SUCESOS = [
    { t: 'Protesta vecinal por el ruido tras el último partido.', d: { apoyoAyuntamiento: -4, ambiente: -2 } },
    { t: 'El alcalde visita el club y elogia el trabajo con la cantera.', d: { apoyoAyuntamiento: 4 } },
    { t: 'Una peña organiza una campaña de abonados.', d: { aficion: 4, ambiente: 2 } },
    { t: 'Obras en el entorno complican el acceso al pabellón.', d: { ambiente: -3 } },
    { t: 'Una empresa local hace un donativo al club.', d: { apoyoAyuntamiento: 2 }, dinero: 25000 }
  ];
  const KEY = { apoyo: 'apoyoAyuntamiento', ambiente: 'ambiente', aficion: 'aficion' };
  const esc = (st, id) => U.clamp(st.equipos[id].presupuesto / 60e6, 0.3, 8);

  function perfil(st, clubId) {
    const eq = st.equipos[clubId];
    const mun = eq.ciudadDeportiva ? eq.ciudadDeportiva.municipio : eq.ciudad;
    let texto = 'El club es una referencia en ' + eq.ciudad + '. Mantener buena relación con el ayuntamiento y los vecinos facilita licencias, obras y convenios.';
    let ayto = 'Ayuntamiento de ' + eq.ciudad;
    if (clubId === 'fc-barcelona') {
      ayto = 'Ayuntamiento de Sant Joan Despí';
      texto = 'La Ciutat Esportiva Joan Gamper está en Sant Joan Despí, en el Baix Llobregat. El municipio vive el club con orgullo, pero también soporta el tráfico y el ruido los días de partido: cuidar la relación con el Ayuntamiento y los vecinos facilita licencias, obras y convenios, y el Palau Blaugrana, en Barcelona, mantiene el pulso de la afición.';
    } else if (clubId === 'real-madrid') {
      ayto = 'Ayuntamiento de Madrid';
      texto = 'La Ciudad Real Madrid, en Valdebebas, comparte espacio con el fútbol y la cantera. La relación con el Ayuntamiento de Madrid es fluida, pero el Movistar Arena compite con muchos otros planes de ocio de la capital.';
    } else if (['olympiacos', 'panathinaikos'].indexOf(clubId) >= 0) {
      texto = 'En Atenas y El Pireo el baloncesto es pasión. La afición llena las gradas, pero exige títulos y se enfada pronto.';
    } else if (['fenerbahce', 'anadolu-efes', 'besiktas'].indexOf(clubId) >= 0) {
      texto = 'Estambul vive el baloncesto con intensidad: rivalidades históricas, pabellones ruidosos y una afición muy exigente.';
    }
    return { municipio: mun, ayuntamiento: ayto, texto };
  }

  function modificadores(st, clubId) {
    const c = (st.ciudad && st.ciudad[clubId]) || { ambiente: 50, aficion: 50, apoyoAyuntamiento: 50, convenios: [] };
    const m = { asistencia: 0.85 + 0.3 * (c.ambiente + c.aficion) / 200, ingresos: 0.9 + 0.2 * c.apoyoAyuntamiento / 100, moral: 0.95 + 0.1 * c.ambiente / 100, cantera: 0.9 + 0.2 * c.apoyoAyuntamiento / 100, obras: 1 };
    (c.convenios || []).forEach(v => {
      if (v.hasta < st.fecha) return;
      const k = CONVENIOS.find(x => x.id === v.id);
      if (k) for (const e in k.efecto) m[e] += k.efecto[e];
    });
    const cd = GM.mods.ciudadDeportiva;
    if (cd && cd.efectos) m.asistencia += cd.efectos(st, clubId).ciudad - 1;
    return m;
  }
  function aplica(st, clubId, d) {
    const c = st.ciudad[clubId];
    for (const k in d) { const kk = KEY[k] || k; c[kk] = U.clamp(c[kk] + d[k], 0, 100); }
  }
  function conveniosDisponibles(st, clubId) {
    const c = st.ciudad[clubId], e = esc(st, clubId);
    return CONVENIOS.map(k => {
      const act = c.convenios.find(v => v.id === k.id && v.hasta >= st.fecha);
      const coste = Math.round(k.coste * e / 1000) * 1000;
      let motivo = null;
      if (act) motivo = 'Vigente hasta ' + U.fechaLarga(act.hasta);
      else if (k.minApoyo && c.apoyoAyuntamiento < k.minApoyo) motivo = 'Requiere apoyo del ayuntamiento de ' + k.minApoyo + '+';
      return Object.assign({}, k, { coste, disponible: !motivo, motivo });
    });
  }
  function firmarConvenio(st, clubId, id) {
    const k = conveniosDisponibles(st, clubId).find(x => x.id === id);
    if (!k) return { ok: false, motivo: 'Convenio desconocido.' };
    if (!k.disponible) return { ok: false, motivo: k.motivo };
    const c = st.ciudad[clubId];
    c.convenios = c.convenios.filter(v => v.id !== id);
    c.convenios.push({ id, hasta: U.addDays(st.fecha, k.meses * 30) });
    if (k.coste && GM.mods.finanzas) GM.mods.finanzas.registrar(st, clubId, 'Convenio: ' + k.nombre, -k.coste);
    aplica(st, clubId, k.ahora || {});
    if (clubId === st.clubId) GM.noticia(st, 'Firmado el convenio «' + k.nombre + '».');
    return { ok: true };
  }
  function eventosDisponibles(st, clubId) {
    const c = st.ciudad[clubId], e = esc(st, clubId);
    return EVENTOS.map(v => {
      const ult = c.eventos.find(x => x.id === v.id);
      const espera = ult ? 60 - U.diffDays(ult.fecha, st.fecha) : 0;
      return Object.assign({}, v, { coste: Math.round(v.coste * e / 1000) * 1000, ingreso: v.ingreso ? Math.round(v.ingreso * e / 1000) * 1000 : 0, disponible: espera <= 0, motivo: espera > 0 ? 'Disponible de nuevo en ' + espera + ' días' : null });
    });
  }
  function organizarEvento(st, clubId, id) {
    const v = eventosDisponibles(st, clubId).find(x => x.id === id);
    if (!v) return { ok: false, motivo: 'Evento desconocido.' };
    if (!v.disponible) return { ok: false, motivo: v.motivo };
    const c = st.ciudad[clubId];
    c.eventos = c.eventos.filter(x => x.id !== id); c.eventos.push({ id, fecha: st.fecha });
    const F = GM.mods.finanzas;
    if (F) { if (v.coste) F.registrar(st, clubId, 'Evento: ' + v.nombre, -v.coste); if (v.ingreso) F.registrar(st, clubId, 'Evento: ' + v.nombre, v.ingreso); }
    aplica(st, clubId, v.efecto);
    if (clubId === st.clubId) GM.noticia(st, 'Evento organizado: ' + v.nombre + '.');
    return { ok: true };
  }

  GM.bus.on('partido:jugado', function (e) {
    const st = GM.state; if (!st || !st.ciudad) return;
    const g = e.partido, r = g.resultado, gl = r.local > r.visitante;
    [[g.local, gl, 1], [g.visitante, !gl, 0.7]].forEach(a => {
      const c = st.ciudad[a[0]]; if (!c) return;
      const f = a[1] ? 1 : -0.8;
      c.ambiente = U.clamp(c.ambiente + 0.5 * f * a[2], 0, 100);
      c.aficion = U.clamp(c.aficion + 0.4 * f * a[2], 0, 100);
    });
  });
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !st.ciudad) return;
    for (const id in st.ciudad) {
      const c = st.ciudad[id], rep = st.equipos[id].reputacion;
      const ee = GM.mods.estadio && GM.mods.estadio.efectos ? (GM.mods.estadio.efectos(st, id).ambiente - 1) * 100 : 0;
      c.ambiente += ((32 + rep * 0.5 + ee) - c.ambiente) * 0.004;
      c.aficion += ((28 + rep * 0.55) - c.aficion) * 0.003;
    }
    if ((st.modo === 'gestor' || st.modo === 'presidente') && GM.rng.chance(0.04)) {
      const s = GM.rng.pick(SUCESOS);
      aplica(st, st.clubId, s.d);
      if (s.dinero && GM.mods.finanzas) GM.mods.finanzas.registrar(st, st.clubId, 'Donativo de una empresa local', Math.round(s.dinero * esc(st, st.clubId)));
      GM.noticia(st, s.t);
    }
  });
  function nuevaPartida(st) {
    Object.keys(st.equipos).forEach(id => {
      const rep = st.equipos[id].reputacion, h = U.hash(id);
      st.ciudad[id] = { ambiente: U.clamp(32 + rep * 0.5, 0, 100), aficion: U.clamp(28 + rep * 0.55, 0, 100), apoyoAyuntamiento: U.clamp(38 + h % 20 + (rep - 50) * 0.1, 0, 100), convenios: [], eventos: [] };
    });
  }
  function selfTest() {
    const st = { fecha: '2026-10-01', clubId: 'a', noticias: [], equipos: { a: { id: 'a', ciudad: 'X', presupuesto: 60e6, reputacion: 60 } }, ciudad: {} };
    nuevaPartida(st);
    const a0 = st.ciudad.a.aficion, m0 = modificadores(st, 'a').asistencia;
    const r1 = firmarConvenio(st, 'a', 'colegios'), r2 = organizarEvento(st, 'a', 'homenaje'), r3 = organizarEvento(st, 'a', 'homenaje');
    return r1.ok && r2.ok && !r3.ok && st.ciudad.a.aficion > a0 && modificadores(st, 'a').asistencia > m0;
  }
  GM.register('ciudad', { modificadores, perfil, conveniosDisponibles, firmarConvenio, eventosDisponibles, organizarEvento, nuevaPartida, selfTest });
})();
