/* ESTILO DE VIDA (GM.mods.estilo) — modo carrera: de «profesional ejemplar» a «chico malo», y que se note
   Un valor de -100 (rebelde del todo) a +100 (profesional del todo) que se mueve con lo que haces: la intensidad del entreno, las
   fiestas de la vida social, las decisiones personales y los planes de esta pantalla (salir de fiesta, viaje improvisado, tatuaje,
   deportivo, polémica en redes, plantar a la prensa, encararte con el entrenador; o al revés: entrenar al amanecer, nutricionista,
   vídeo del rival, descansar, voluntariado). Cada plan tiene efectos inmediatos y una espera antes de repetirlo.
   Consecuencias cada semana, en las dos direcciones:
   - Rebelde: más reputación y seguidores (y patrocinios de marcas atrevidas por el móvil), pero riesgo de multas, partidos de
     sanción (no juegas: estado.sancion, que respeta partidos.js), lesiones y potencial que baja.
   - Profesional: el potencial sube, el entrenador confía y te tranquiliza; la fama crece más despacio; patrocinios serios.
   Avisa por el móvil (GM.mods.movil) de lo que pasa. Estado: state.carrera.estilo = { v, cd: {plan: fecha}, hist: [{fecha, d, motivo}],
   ultimo } (se crea al usarse). Expone: estado(st), etiqueta(v), mover(st, d, motivo), planes(st), hacer(st, id), PLANES, selfTest. */
(function () {
  const U = GM.util, C = st => st.carrera, YO = st => st.jugadores.yo;
  const act = st => !!st && st.modo === 'carrera' && !!st.carrera && st.carrera.fase !== 'retirado';
  const E = st => C(st).estilo || (C(st).estilo = { v: 0, cd: {}, hist: [] });
  const NIVELES = [[55, 'Profesional ejemplar'], [20, 'Profesional'], [-20, 'Equilibrado'], [-55, 'Rebelde'], [-101, 'Chico malo']];
  function etiqueta(v) { return NIVELES.find(n => v >= n[0])[1]; }
  function mover(st, d, motivo) {
    if (!act(st) || !d) return; const e = E(st), antes = etiqueta(e.v);
    e.v = U.clamp(e.v + d, -100, 100); e.hist.unshift({ fecha: st.fecha, d: Math.round(d * 10) / 10, motivo }); if (e.hist.length > 30) e.hist.length = 30;
    const ahora = etiqueta(e.v);
    if (ahora !== antes) { GM.noticia(st, 'Te ven como: ' + ahora.toLowerCase() + '.'); C(st).hitos.unshift({ fecha: st.fecha, texto: 'Tu imagen cambia: ' + ahora.toLowerCase() + '.' }); }
  }
  const pot = (st, d, m) => { const K = GM.mods.carrera; if (K && K.ajustarPot) K.ajustarPot(st, d, m); };
  const msg = (st, quien, texto, ops) => { const Mv = GM.mods.movil; if (Mv) Mv.enviar(st, quien, texto, ops); };
  const sueldo = st => { const p = YO(st); return p.contrato && p.contrato.salario ? p.contrato.salario / 1000 : 30; };   // en miles al año
  const multa = st => Math.max(1, Math.round(sueldo(st) * 0.02));
  function sancionar(st, partidos, motivo) { const p = YO(st); p.estado.sancion = (p.estado.sancion || 0) + partidos; msg(st, 'entrenador', motivo + ' No juegas ' + (partidos === 1 ? 'el próximo partido' : 'los próximos ' + partidos + ' partidos') + '.'); }
  // Planes: lado 'r' rebelde, 'p' profesional; dv: cuánto mueve el estilo; cd: días antes de repetirlo; coste en miles de euros
  const PLANES = [
    { id: 'fiesta', lado: 'r', t: 'Salir de fiesta hasta las tantas', d: 'Ánimo y fama; mañana estarás cansado.', dv: -8, cd: 3, coste: 0.3,
      fn: (st, out) => { const c = C(st), p = YO(st); c.moral = U.clamp(c.moral + 6, 0, 100); c.fama = c.fama + 0.5; p.estado.fatiga = U.clamp((p.estado.fatiga || 0) + 18, 0, 100); out.push('ánimo +6', 'cansancio'); if (GM.rng.next() < 0.18) { pot(st, -0.03, 'Resaca antes de un partido'); out.push('resaca'); } } },
    { id: 'viaje', lado: 'r', t: 'Viaje improvisado', d: 'Desconectas a lo grande; te saltas un entrenamiento.', dv: -10, cd: 21, coste: 6,
      fn: (st, out) => { const c = C(st); c.moral = U.clamp(c.moral + 10, 0, 100); c.fama = c.fama + 0.8; out.push('ánimo +10'); if (GM.rng.next() < 0.5) { c.dinero -= multa(st); out.push('multa del club'); msg(st, 'club', 'Faltaste al entrenamiento del martes. El club te multa con ' + multa(st) + ' mil €.'); } } },
    { id: 'tatuaje', lado: 'r', t: 'Hacerte un tatuaje', d: 'Se te verá en el personaje. Un poco más de fama.', dv: -4, cd: 30, coste: 0.4,
      disponible: st => (st.personaje && (st.personaje.tatuaje || 0) < 3), motivo: 'Ya no te cabe otro',
      fn: (st, out) => { const pj = st.personaje || (st.personaje = GM.mods.personaje.crear()); pj.tatuaje = Math.min(3, (pj.tatuaje || 0) + 1); C(st).fama = C(st).fama + 0.4; out.push('tatuaje nuevo: ' + GM.mods.personaje.OPC.tatuaje[pj.tatuaje].toLowerCase()); } },
    { id: 'coche', lado: 'r', t: 'Comprarte un deportivo', d: 'Fotos, titulares y mucho dinero menos.', dv: -8, cd: 180, coste: 90,
      fn: (st, out) => { const c = C(st); c.fama = c.fama + 2; c.moral = U.clamp(c.moral + 8, 0, 100); out.push('reputación +', 'ánimo +8'); msg(st, 'amigos', '¡Vaya cochazo! ¿Cuándo nos das una vuelta?'); } },
    { id: 'redes', lado: 'r', t: 'Montar una polémica en redes', d: 'Ganas seguidores… o problemas con el club.', dv: -7, cd: 10, coste: 0,
      fn: (st, out) => { const c = C(st); c.fama = c.fama + 2.2; out.push('reputación +'); if (GM.rng.next() < 0.35) { c.dinero -= multa(st); out.push('multa del club'); msg(st, 'club', 'Tu publicación ha molestado en el club. Multa de ' + multa(st) + ' mil € y borra el mensaje, por favor.'); } else msg(st, 'pena', 'Jajaja, ¡vaya lío has montado en redes! Aquí estamos contigo.'); } },
    { id: 'prensa', lado: 'r', t: 'Plantar a la prensa', d: 'Morbo y titulares; los periodistas no lo olvidan.', dv: -6, cd: 7, coste: 0,
      fn: (st, out) => { C(st).fama = C(st).fama + 0.8; const g = st.gente; if (g && g.rel) g.rel.periodista = U.clamp((g.rel.periodista === undefined ? 40 : g.rel.periodista) - 10, 0, 100); out.push('los periodistas, molestos'); msg(st, 'prensa', 'Te esperábamos en zona mixta. Mañana lo contaremos a nuestra manera.'); } },
    { id: 'entrenador', lado: 'r', t: 'Encararte con el entrenador', d: 'Puede que te gane respeto… o una sanción.', dv: -12, cd: 30, coste: 0,
      fn: (st, out) => { const c = C(st); if (GM.rng.next() < 0.35) { c.moral = U.clamp(c.moral + 5, 0, 100); out.push('te ganas su respeto'); msg(st, 'entrenador', 'Me gusta que tengas carácter. Pero la próxima vez, en mi despacho.'); } else { c.moral = U.clamp(c.moral - 4, 0, 100); c.dinero -= multa(st); sancionar(st, 1, 'Lo de hoy no se puede repetir.'); out.push('un partido de sanción', 'multa'); } } },
    { id: 'madrugar', lado: 'p', t: 'Entrenar extra al amanecer', d: 'Progresas un poco más; acabas cansado.', dv: 4, cd: 2, coste: 0,
      fn: (st, out) => { const p = YO(st); p.xp = (p.xp || 0) + 0.05; p.estado.fatiga = U.clamp((p.estado.fatiga || 0) + 8, 0, 100); out.push('progresión extra'); } },
    { id: 'nutricion', lado: 'p', t: 'Dieta con nutricionista', d: 'Mejor físico y menos lesiones durante un mes.', dv: 5, cd: 30, coste: 2,
      fn: (st, out) => { pot(st, 0.02, 'Te cuidas con un nutricionista'); E(st).cuidado = U.addDays(st.fecha, 30); out.push('menos riesgo de lesión'); } },
    { id: 'video', lado: 'p', t: 'Ver vídeo del próximo rival', d: 'Llegas preparado al partido.', dv: 3, cd: 3, coste: 0,
      fn: (st, out) => { const p = YO(st); p.xp = (p.xp || 0) + 0.03; C(st).moral = U.clamp(C(st).moral + 1, 0, 100); out.push('lectura de juego'); } },
    { id: 'descanso', lado: 'p', t: 'Dormir nueve horas y desconectar', d: 'Recuperas cansancio.', dv: 2, cd: 2, coste: 0,
      fn: (st, out) => { const p = YO(st); p.estado.fatiga = U.clamp((p.estado.fatiga || 0) - 15, 0, 100); C(st).moral = U.clamp(C(st).moral + 2, 0, 100); out.push('cansancio −15'); } },
    { id: 'voluntario', lado: 'p', t: 'Visitar un hospital infantil', d: 'La gente lo agradece.', dv: 5, cd: 14, coste: 0,
      fn: (st, out) => { const c = C(st); c.fama = c.fama + 0.7; c.moral = U.clamp(c.moral + 4, 0, 100); out.push('reputación +', 'ánimo +4'); msg(st, 'familia', 'Te hemos visto en las noticias con los niños del hospital. Qué orgullo.'); } }
  ];
  function planes(st) {
    const e = E(st), c = C(st);
    return PLANES.map(pl => { const ult = e.cd[pl.id], espera = ult ? pl.cd - U.diffDays(ult, st.fecha) : 0, extra = pl.disponible && !pl.disponible(st);
      return { id: pl.id, lado: pl.lado, t: pl.t, d: pl.d + (pl.coste ? ' ' + (pl.coste >= 1 ? Math.round(pl.coste) + ' mil €.' : Math.round(pl.coste * 1000) + ' €.') : ''), disponible: espera <= 0 && !extra && c.dinero >= pl.coste,
        motivo: extra ? pl.motivo : espera > 0 ? 'Podrás repetirlo en ' + espera + (espera === 1 ? ' día' : ' días') : 'No te llega el dinero' }; });
  }
  function hacer(st, id) {
    if (!act(st)) return { ok: false, motivo: 'Solo en el modo carrera.' };
    const pl = PLANES.find(x => x.id === id), x = planes(st).find(q => q.id === id); if (!pl || !x) return { ok: false, motivo: 'Plan desconocido.' };
    if (!x.disponible) return { ok: false, motivo: x.motivo };
    const c = C(st), out = []; c.dinero -= pl.coste; E(st).cd[id] = st.fecha;
    pl.fn(st, out); mover(st, pl.dv, pl.t);
    return { ok: true, texto: pl.t, efectos: out };
  }
  // Semana: intensidad del entreno, consecuencias del estilo y algo de olvido (vuelve poco a poco al centro)
  function semana(st) {
    const e = E(st), c = C(st), p = YO(st), v = e.v, int = c.entreno && c.entreno.intensidad;
    if (int === 'intensa') mover(st, 1.5, 'Entrenas a tope'); else if (int === 'suave') mover(st, -1.5, 'Entrenas con el freno puesto');
    e.v *= 0.985;
    if (v <= -25) {
      const k = -v / 100;
      c.fama = c.fama + 0.25 * k;                                          // seguidores
      const r = GM.rng.next();
      if (r < 0.1 * k) { c.dinero -= multa(st); msg(st, 'club', 'Te han visto de madrugada antes del entrenamiento. Multa de ' + multa(st) + ' mil €.'); }
      else if (r < 0.16 * k) sancionar(st, 1, 'Llegas tarde otra vez y con mala cara.');
      else if (r < 0.2 * k && !(p.estado.lesion && p.estado.lesion.dias > 0) && !(e.cuidado && e.cuidado >= st.fecha)) { p.estado.lesion = { tipo: 'Esguince fuera de la pista', dias: GM.rng.int(5, 14) }; msg(st, 'club', 'Los médicos confirman un esguince de ' + p.estado.lesion.dias + ' días. Fuera del pabellón, cuidado.'); }
      if (p.edad <= 25) pot(st, -0.006 * k, 'Vida desordenada');
      if (GM.rng.next() < 0.3 * k) msg(st, 'amigos', ['¿Esta noche salimos?', 'Hay una fiesta en el ático de un amigo. ¿Te apuntas?', 'Concierto el sábado, tenemos entrada para ti.'][GM.rng.int(0, 2)], { tipo: 'plan', plan: 'fiesta' });
    } else if (v >= 25) {
      const k = v / 100;
      if (p.edad <= 26) pot(st, 0.006 * k, 'Vida de profesional');
      c.moral = U.clamp(c.moral + 0.6 * k, 0, 100);
      if (GM.rng.next() < 0.08 * k) msg(st, 'entrenador', ['Así se hace. Eres el primero en llegar y el último en irse.', 'Los jóvenes te miran. Sigue dando ejemplo.', 'Esta semana he visto tu trabajo extra. Se notará en los minutos.'][GM.rng.int(0, 2)]);
    }
    // Patrocinios según tu imagen (el representante escribe por el móvil)
    if (Math.abs(v) >= 40 && (!e.ultimoPatro || U.diffDays(e.ultimoPatro, st.fecha) >= 42) && GM.rng.next() < 0.35) {
      e.ultimoPatro = st.fecha; const reb = v < 0, fama = c.fama || 10, dinero = Math.round((reb ? 25 : 15) + fama * (reb ? 1.6 : 1.1));
      msg(st, 'agente', reb ? 'Una marca de bebidas energéticas quiere que seas su cara más gamberra: ' + dinero + ' mil € por una campaña. Les encanta tu imagen.' : 'Un banco quiere asociar su marca a un deportista serio como tú: ' + dinero + ' mil € por un año. Imagen limpia, cero polémicas.',
        { tipo: 'patrocinio', dinero, fama: reb ? 1.5 : 0.6, dv: reb ? -3 : 3 });
    }
  }
  GM.bus.on('dia:avanzado', () => { const st = GM.state; if (act(st) && U.weekday(st.fecha) === 1) semana(st); });
  // Las decisiones personales también dicen algo de ti
  const DECIS = { redes: [2, -5, 0], caridad: [5, 1], mentor: [3, -1], fisio: [4, 0], seleccion: [2, -2], zapatillas: [-1, 1, 0] };
  GM.bus.on('evento:elegido', ({ id, i }) => { const st = GM.state; if (act(st) && DECIS[id] && DECIS[id][i]) mover(st, DECIS[id][i], 'Decisión: ' + id); });
  GM.bus.on('social:hecho', ({ accion }) => { const st = GM.state; if (!act(st)) return; if (accion === 'fiesta') mover(st, -6, 'Montas una fiesta'); else if (accion === 'entrenar' || accion === 'consejo') mover(st, 1.5, 'Trabajo con compañeros y mentor'); });
  // Los partidos de sanción se cumplen jugando el club
  GM.bus.on('partido:jugado', ({ partido: g }) => { const st = GM.state; if (!act(st)) return; const p = YO(st); if (p.estado.sancion > 0 && (g.local === p.equipoId || g.visitante === p.equipoId)) p.estado.sancion--; });
  function estado(st) { if (!act(st)) return null; const e = E(st); return { v: Math.round(e.v), etiqueta: etiqueta(e.v), hist: e.hist.slice(0, 6), sancion: YO(st).estado.sancion || 0 }; }
  function selfTest() { return etiqueta(80) === 'Profesional ejemplar' && etiqueta(-80) === 'Chico malo' && etiqueta(0) === 'Equilibrado' && PLANES.filter(p => p.lado === 'r').length >= 7; }
  GM.register('estilo', { estado, etiqueta, mover, planes, hacer, PLANES, selfTest });
})();
