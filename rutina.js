/* NECESIDADES Y RUTINA (punto 58, GM.rutina) — ligeras, opcionales y nunca punitivas. El personaje tiene energía, hambre (cuánto has comido) y tiempo libre, además del ánimo de siempre, y un día en cuatro bloques
   (mañana, mediodía, tarde y noche) en los que puedes planear entrenar, comer, descansar, ocio, familia o trabajar en tus negocios. Si no planeas nada, el día sigue un plan por defecto razonable.
   - En el mundo 3D, mientras pasan las horas baja la comida y la energía poco a poco; las acciones de los muebles (comer, dormir, ducharse, la tele) las recuperan (hogar.aplicar acepta energia y hambre).
   - Cada día se aplica el plan: pequeños efectos en ánimo, fatiga y progresión. Con todo desactivado (state.carrera.rutina.activa = false) el juego es exactamente igual que antes; los efectos están acotados
     (como mucho ±2 de fatiga y +0,25 o −0,4 de ánimo al día) para que ignorarla no rompa nada.
   Estado: state.carrera.rutina (modo carrera; en otros modos no hace nada). Expone: estado, activar, fijarBloque, aplicar, tick, planDe, ACTIVIDADES, BLOQUES, selfTest. Prueba: t_rutina.js. */
(function () {
  const U = GM.util, clamp = U.clamp, C = st => st.carrera, act = st => st && st.modo === 'carrera' && !!st.carrera;
  const BLOQUES = ['Mañana', 'Mediodía', 'Tarde', 'Noche'];
  // ef: cambios por bloque (energía y hambre de 0 a 100, ánimo, fatiga en puntos del jugador, xp de progresión, coste en miles de euros y tiempo libre en horas)
  const ACTIVIDADES = {
    entrenar: { n: 'Entrenar', ef: { energia: -12, hambre: -9, moral: 0.1, fat: 0.8, xp: 0.012 }, d: 'Entrenas por tu cuenta o con el equipo.' }, comer: { n: 'Comer bien', ef: { energia: 3, hambre: 42, moral: 0.2, fat: -0.4 }, coste: 0.04, d: 'Una comida tranquila, sin prisas.' },
    descansar: { n: 'Descansar', ef: { energia: 26, hambre: -4, moral: 0.2, fat: -1.2 }, d: 'Siesta, sofá, series o dormir.' }, ocio: { n: 'Ocio', ef: { energia: -3, hambre: -5, moral: 0.5, fat: -0.2, libre: 1 }, coste: 0.05, d: 'Cine, videojuegos, paseo o amigos.' },
    familia: { n: 'Familia y amigos', ef: { energia: -2, hambre: -4, moral: 0.5, fat: -0.3, libre: 1, social: 1 }, d: 'Tiempo con los tuyos.' }, trabajo: { n: 'Mis negocios', ef: { energia: -8, hambre: -6, moral: 0.1, fat: 0.4 }, d: 'Pasas por tus negocios y reuniones.' }
  };
  const PLAN0 = ['entrenar', 'comer', 'ocio', 'descansar'];
  const nuevaPartida = st => { if (act(st)) st.carrera.rutina = nuevo(); };
  const nuevo = () => ({ activa: true, hud: false, energia: 80, hambre: 70, libre: 0, plan: PLAN0.slice(), hist: [], horaPrev: null });
  function estado(st) { if (!act(st)) return null; const c = C(st); if (!c.rutina) c.rutina = nuevo(); return c.rutina; }
  const planDe = (st, dia) => { const r = estado(st); return (r.planes && r.planes[dia]) || r.plan; };
  function activar(st, on) { const r = estado(st); if (!r) return { ok: false }; r.activa = on === undefined ? !r.activa : !!on; return { ok: true, activa: r.activa }; }
  function fijarBloque(st, i, id, dia) { const r = estado(st); if (!r || !ACTIVIDADES[id] || i < 0 || i > 3) return { ok: false, motivo: 'No se puede.' }; if (dia) { r.planes = r.planes || {}; r.planes[dia] = (r.planes[dia] || r.plan).slice(); r.planes[dia][i] = id; } else r.plan[i] = id; return { ok: true }; }
  // Efectos sueltos (los llaman las acciones de los muebles): energia y hambre se suman con tope; el resto lo gestiona hogar.aplicar
  function aplicar(st, ef) { const r = estado(st); if (!r || !r.activa || !ef) return; if (ef.energia) r.energia = clamp(r.energia + ef.energia, 0, 100); if (ef.hambre) r.hambre = clamp(r.hambre + ef.hambre, 0, 100); }
  // El reloj del mundo 3D: con el paso de las horas baja la comida y la energía; se llama cada segundo con la hora del mundo
  function tick(st, hora) {
    const r = estado(st); if (!r) return; if (r.horaPrev === null || hora < r.horaPrev || hora - r.horaPrev > 6) { r.horaPrev = hora; return; } const dh = hora - r.horaPrev; r.horaPrev = hora; if (!r.activa || dh <= 0) return;
    r.hambre = clamp(r.hambre - dh * 4.5, 0, 100); r.energia = clamp(r.energia - dh * (hora > 22 ? 4 : 2), 0, 100);
  }
  // Cada día se aplica el plan (el partido sustituye a entrenar) y se aplican los efectos acotados
  function dia(st) {
    const r = estado(st); if (!r) return; const c = C(st), p = st.jugadores && st.jugadores.yo; if (!r.activa) return; const hoy = st.fecha, juega = st.calendario && st.calendario.some && st.calendario.some(g => g.fecha === hoy && g.resultado && (g.local === st.clubId || g.visitante === st.clubId)), plan = planDe(st, hoy);
    let moral = 0, fat = 0, xp = 0, coste = 0, soc = 0; const neg = GM.negocios && GM.negocios.activos ? GM.negocios.activos(st).length : 0;
    plan.forEach(id => { let a = ACTIVIDADES[id]; if (id === 'entrenar' && juega) a = { ef: { energia: -16, hambre: -10, moral: 0, fat: 0 } }; if (id === 'trabajo' && !neg) a = ACTIVIDADES.descansar; const e = a.ef; r.energia = clamp(r.energia + e.energia, 0, 100); r.hambre = clamp(r.hambre + e.hambre, 0, 100); moral += e.moral || 0; fat += e.fat || 0; xp += e.xp || 0; coste += a.coste || 0; if (e.libre) r.libre += e.libre; if (e.social) soc++; });
    // la rutina empuja un poco, sin castigar: un día con poca energía o sin comer suma un punto de fatiga y quita 0,3 de ánimo como mucho
    const carencia = (Math.max(0, 40 - r.energia) + Math.max(0, 35 - r.hambre)) / 75; fat += carencia * 1.2; moral -= carencia * 0.3 - (r.energia > 70 && r.hambre > 55 ? 0.15 : 0);
    if (p && p.estado) p.estado.fatiga = clamp(p.estado.fatiga + clamp(fat, -2, 2), 0, 100); c.moral = clamp(c.moral + clamp(moral, -0.4, 0.25), 0, 100); if (p) p.xp = (p.xp || 0) + clamp(xp, 0, 0.03);
    if (coste && GM.mods.hogar && GM.mods.hogar.dinero(st) > coste * 5) { GM.mods.hogar.gastar(st, coste); if (GM.patrimonio) GM.patrimonio.reg(st, 'vida', 'Comidas y ocio', -coste); }
    if (soc && c.social && c.social.contactos) c.social.contactos.filter(k => k.tipo === 'familia' || k.tipo === 'amigo').forEach(k => { k.rel = clamp(k.rel + 0.25, 0, 100); });
    r.hist.unshift({ f: hoy, e: Math.round(r.energia), h: Math.round(r.hambre), plan: plan.join(',') }); if (r.hist.length > 30) r.hist.length = 30; if (r.planes) delete r.planes[U.addDays(hoy, -3)];
  }
  GM.bus.on('dia:avanzado', () => { const st = GM.state; if (act(st)) { try { dia(st); } catch (e) { console.error('rutina', e); } } });
  // Chips discretos en el mundo 3D (se activan en la pestaña «Mi día»): energía, comida y ánimo
  function hud(S) {
    const st = S.st; if (!act(st) || !GM.h) return; const r = estado(st); if (S.chipRut) { S.chipRut.remove(); S.chipRut = null; } if (S.rutIv) { clearInterval(S.rutIv); S.rutIv = null; }
    const h = GM.h, e = h('span', null), c = h('span', null), a = h('span', null), el = h('div', { class: 'sede-hud rutina-chips', style: { display: r.hud && r.activa ? '' : 'none' } }, e, c, a); S.raiz.append(el); S.chipRut = el;
    const pinta = () => { if (!GM.sede || GM.sede._estado() !== S || !S.raiz.contains(el)) { clearInterval(S.rutIv); return; } const q = estado(st); el.style.display = q.hud && q.activa ? '' : 'none'; if (typeof S.hora === 'number') tick(st, S.hora); e.textContent = 'Energía ' + Math.round(q.energia); c.textContent = 'Comida ' + Math.round(q.hambre); a.textContent = 'Ánimo ' + Math.round(C(st).moral); el.className = 'sede-hud rutina-chips' + (q.energia < 25 || q.hambre < 20 ? ' bajo' : ''); };
    pinta(); S.rutIv = setInterval(pinta, 1000);
  }
  function selfTest() {
    const st = { modo: 'carrera', fecha: '2026-10-05', clubId: 'a', equipos: { a: { id: 'a' } }, jugadores: { yo: { estado: { fatiga: 20 }, xp: 0 } }, carrera: { moral: 60, dinero: 100 } };
    const r = estado(st); if (!r || !r.activa) return false; const f0 = st.jugadores.yo.estado.fatiga; for (let i = 0; i < 20; i++) { st.fecha = U.addDays(st.fecha, 1); dia(st); } if (!(r.energia >= 0 && r.energia <= 100 && r.hist.length === 20)) return false;
    r.activa = false; const m0 = st.carrera.moral; dia(st); if (st.carrera.moral !== m0) return false; r.activa = true; fijarBloque(st, 1, 'descansar'); return planDe(st, st.fecha)[1] === 'descansar' && Math.abs(st.jugadores.yo.estado.fatiga - f0) <= 40 + 1;
  }
  GM.rutina = { ACTIVIDADES, BLOQUES, nuevaPartida, estado, activar, fijarBloque, aplicar, tick, dia, hud, planDe, selfTest };
  GM.register && GM.register('rutina', GM.rutina);
})();
