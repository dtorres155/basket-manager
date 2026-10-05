/* VIDA SOCIAL (GM.mods.social) — modo carrera
   Contactos con relación 0-100: familia, amigo de la infancia, pareja (puede nacer, crecer, casarse y tener hijos), compañeros de equipo, mentor y rival.
   Cada semana tienes 3 de energía social para gastarla en acciones (llamar, visitar, cenar, entrenar juntos…). La relación se enfría si la descuidas.
   Efectos: ánimo (moral), progresión extra con el mentor y los compañeros, fama y ahorros. Si cambias de ciudad, la pareja lo nota.
   Expone: estado, contactos, acciones, hacer, selfTest. Escribe state.carrera.social = { contactos, energia, pareja, eventos }. */
(function () {
  const U = GM.util, YO = st => st.jugadores.yo, C = st => st.carrera;
  const ACC = {
    familia: [{ id: 'llamar', t: 'Llamar', e: 0, coste: 0, rel: 3, moral: 1 }, { id: 'visitar', t: 'Visitarlos', e: 2, coste: 1.2, rel: 12, moral: 5 }, { id: 'partido', t: 'Invitarlos al partido', e: 1, coste: 0.4, rel: 8, moral: 3, fama: 1 }],
    amigo: [{ id: 'quedar', t: 'Quedar a tomar algo', e: 1, coste: 0.1, rel: 7, moral: 3 }, { id: 'fiesta', t: 'Montar una fiesta', e: 2, coste: 1, rel: 12, moral: 4, fama: 1, riesgo: 0.12 }],
    pareja: [{ id: 'cenar', t: 'Cenar fuera', e: 1, coste: 0.15, rel: 6, moral: 3 }, { id: 'escapada', t: 'Escapada de fin de semana', e: 2, coste: 1.5, rel: 14, moral: 6 }],
    companero: [{ id: 'entrenar', t: 'Entrenar juntos', e: 1, coste: 0, rel: 8, xp: 0.12 }, { id: 'cena', t: 'Cena del equipo', e: 1, coste: 0.3, rel: 10, moral: 2 }],
    mentor: [{ id: 'consejo', t: 'Pedir consejo', e: 1, coste: 0, rel: 6, xp: 0.25, moral: 1 }, { id: 'comer', t: 'Comer juntos', e: 1, coste: 0.1, rel: 8, xp: 0.1 }],
    rival: [{ id: 'hablar', t: 'Hablar claro', e: 1, coste: 0, rel: 8, moral: 1 }, { id: 'competir', t: 'Retarle en el entrenamiento', e: 1, coste: 0, rel: -2, xp: 0.2, moral: -1 }]
  };
  const ETQ = { familia: 'Familia', amigo: 'Amigo de siempre', pareja: 'Pareja', companero: 'Compañero', mentor: 'Mentor', rival: 'Rival por el puesto' };
  const PASOS = { conocida: ['saliendo', 50, 'Pedirle salir', 1], saliendo: ['pareja', 70, 'Dar el paso de ser pareja', 1], pareja: ['casados', 85, 'Casarse', 20], casados: ['hijo', 80, 'Tener un hijo', 8] };
  const ciudad = st => st.equipos[st.clubId].ciudad;

  function equipo(st) {
    const club = st.clubId, h = U.hash(club + 'soc'), pl = st.equipos[club].plantilla.map(i => st.jugadores[i]).filter(p => p && !p.esYo);
    const y = YO(st), out = [], vet = pl.slice().sort((a, b) => b.edad - a.edad)[0], rival = pl.filter(p => p.pos === y.pos).sort((a, b) => Math.abs(a.ovr - y.ovr) - Math.abs(b.ovr - y.ovr))[0];
    const comp = pl.filter(p => p !== vet && p !== rival).sort((a, b) => U.hash(a.id + h) - U.hash(b.id + h)).slice(0, 3);
    comp.forEach(p => out.push({ id: 'c-' + p.id, tipo: 'companero', nombre: p.nombre, rel: 25 + (h % 15), ref: p.id }));
    if (vet) out.push({ id: 'm-' + vet.id, tipo: 'mentor', nombre: vet.nombre, rel: 20, ref: vet.id });
    if (rival) out.push({ id: 'r-' + rival.id, tipo: 'rival', nombre: rival.nombre, rel: 15, ref: rival.id });
    return out;
  }
  // nombreAleatorio solo tiene nombres masculinos: la madre usa su propia lista
  const MADRES = { ES: 'Carmen,Montse,Laura,Marta,Pilar,Núria,Elena,Isabel,Rosa,Cristina,Anna,Teresa', US: 'Jennifer,Michelle,Lisa,Angela,Kimberly,Tanya,Monique,Rachel,Denise,Karen,Stephanie,Nicole' };
  function nombreMadre(pais, h) { const l = (MADRES[pais] || MADRES.ES).split(','); return l[(h >>> 2) % l.length]; }
  const XP_SEMANA = 0.04; // ~2 puntos de nivel al año como mucho
  function potencial(st, d, motivo) { const K = GM.mods.carrera; if (K && K.ajustarPot) K.ajustarPot(st, d, motivo); }
  function nuevaPartida(st) {
    if (st.modo !== 'carrera' || !st.carrera) return;
    const pais = YO(st).nac === 'US' ? 'US' : 'ES', h = U.hash(YO(st).nombre + 'fam');
    st.carrera.social = { contactos: [
      { id: 'f1', tipo: 'familia', nombre: nombreMadre(pais, h) + ' (tu madre)', rel: 75 }, { id: 'f2', tipo: 'familia', nombre: GM.nombreAleatorio(pais, h + 7).split(' ')[0] + ' (tu hermano)', rel: 65 },
      { id: 'a1', tipo: 'amigo', nombre: GM.nombreAleatorio(pais, h + 3), rel: 60 }].concat(st.carrera.fase === 'pro' ? equipo(st) : []), energia: 3, pareja: { estado: 'no', ciudad: null, hijos: 0 }, club: st.clubId, semana: st.fecha };
  }
  function refrescarEquipo(st) {
    const s = C(st).social; if (!s) return;
    s.contactos = s.contactos.filter(c => ['familia', 'amigo', 'pareja'].indexOf(c.tipo) >= 0);
    if (C(st).fase === 'pro') s.contactos = s.contactos.concat(equipo(st));
    s.club = st.clubId;
  }
  function pareja(st) { return C(st).social.contactos.find(c => c.tipo === 'pareja'); }
  function acciones(st, id) {
    const s = C(st).social, c = s.contactos.find(x => x.id === id); if (!c) return [];
    const out = (ACC[c.tipo] || []).map(a => Object.assign({}, a, { disponible: s.energia >= a.e && C(st).dinero >= a.coste, motivo: s.energia < a.e ? 'Sin energía social' : C(st).dinero < a.coste ? 'Faltan ahorros' : null }));
    if (c.tipo === 'pareja') {
      const p = s.pareja, paso = PASOS[p.estado];
      if (paso && c.rel >= paso[1]) out.push({ id: 'paso', t: paso[2], e: 1, coste: paso[3], disponible: s.energia >= 1 && C(st).dinero >= paso[3], motivo: null });
      if (p.ciudad && p.ciudad !== ciudad(st)) out.push({ id: 'mudarse', t: 'Mudarse juntos a ' + ciudad(st), e: 2, coste: 4, disponible: s.energia >= 2 && C(st).dinero >= 4, motivo: null });
    }
    return out;
  }
  function hacer(st, id, accion) {
    const c = C(st), s = c.social, k = s.contactos.find(x => x.id === id), a = acciones(st, id).find(x => x.id === accion);
    if (!k || !a) return { ok: false, motivo: 'Acción no disponible.' };
    if (!a.disponible) return { ok: false, motivo: a.motivo || 'No puedes ahora.' };
    s.energia -= a.e; c.dinero -= a.coste;
    const out = [];
    if (accion === 'paso') { const p = s.pareja, paso = PASOS[p.estado]; if (paso[0] === 'hijo') { p.hijos++; c.moral = U.clamp(c.moral + 8, 0, 100); c.hitos.unshift({ fecha: st.fecha, texto: 'Nace tu hijo. Todo cambia.' }); out.push('un hijo, y una alegría enorme'); k.rel = U.clamp(k.rel + 5, 0, 100); } else { p.estado = paso[0]; c.hitos.unshift({ fecha: st.fecha, texto: p.estado === 'casados' ? 'Te casas con ' + k.nombre + '.' : p.estado === 'saliendo' ? 'Empiezas a salir con ' + k.nombre + '.' : k.nombre + ' y tú ya sois pareja.' }); c.fama = Math.min(100, c.fama + (p.estado === 'casados' ? 3 : 0)); out.push(p.estado === 'casados' ? 'os casáis' : 'la relación avanza'); } return { ok: true, efectos: out }; }
    if (accion === 'mudarse') { s.pareja.ciudad = ciudad(st); k.rel = U.clamp(k.rel + 10, 0, 100); out.push('vivís en la misma ciudad'); return { ok: true, efectos: out }; }
    k.rel = U.clamp(k.rel + (a.rel || 0), 0, 100); if (a.rel) out.push('relación ' + (a.rel > 0 ? '+' : '') + a.rel);
    if (a.moral) { c.moral = U.clamp(c.moral + a.moral, 0, 100); out.push('moral ' + (a.moral > 0 ? '+' : '') + a.moral); }
    // La progresión que da la vida social tiene un tope semanal (XP_SEMANA): antes, pedir consejo al mentor tres veces por semana daba más nivel que entrenar
    if (a.xp) { const x = Math.min(a.xp, Math.max(0, XP_SEMANA - (s.xpSemana || 0))); if (x > 0) { s.xpSemana = (s.xpSemana || 0) + x; YO(st).xp = (YO(st).xp || 0) + x; out.push('progresión extra'); } }
    if (a.fama) c.fama = U.clamp(c.fama + a.fama, 0, 100);
    if (a.riesgo && GM.rng.next() < a.riesgo) { c.fama = U.clamp(c.fama - 3, 0, 100); c.moral = U.clamp(c.moral - 3, 0, 100); out.push('la fiesta se te va de las manos en redes'); potencial(st, -0.12, 'La fiesta se te va de las manos'); }
    // Potencial dinámico: las noches largas pasan factura; los consejos del mentor ayudan
    if (accion === 'fiesta') potencial(st, -0.01, 'Noches largas');
    if (accion === 'consejo') potencial(st, 0.005, 'Consejos del mentor');
    return { ok: true, efectos: out };
  }
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || st.modo !== 'carrera' || !st.carrera || !st.carrera.social) return;
    const c = C(st), s = c.social; if (c.fase === 'retirado') return;
    if (U.weekday(st.fecha) !== 1) return;
    if (s.club !== st.clubId || (c.fase === 'pro' && !s.contactos.some(x => x.tipo === 'companero'))) refrescarEquipo(st);
    s.energia = 3; s.xpSemana = 0;
    s.contactos.forEach(k => {
      const dist = k.tipo === 'pareja' && s.pareja.ciudad && s.pareja.ciudad !== ciudad(st);
      k.rel = U.clamp(k.rel - (k.tipo === 'familia' ? 0.6 : k.tipo === 'rival' ? 0.2 : 1.2) - (dist ? 2 : 0), k.tipo === 'familia' ? 20 : 5, 100);
    });
    const comp = s.contactos.filter(k => k.tipo === 'companero'), q = comp.length ? comp.reduce((a, k) => a + k.rel, 0) / comp.length : 0, m = s.contactos.find(k => k.tipo === 'mentor');
    if (q >= 55) c.moral = Math.min(100, c.moral + 1);
    if (m && m.rel >= 60) YO(st).xp = (YO(st).xp || 0) + 0.015;
    const par = pareja(st); if (par) { if (par.rel >= 70) c.moral = Math.min(100, c.moral + 0.6); if (par.rel < 20 && s.pareja.estado !== 'no') { s.pareja.estado = 'no'; s.contactos = s.contactos.filter(k => k.tipo !== 'pareja'); c.hitos.unshift({ fecha: st.fecha, texto: 'Rompéis la relación.' }); c.moral = Math.max(0, c.moral - 10); GM.noticia(st, 'Tu relación se ha enfriado hasta romperse.'); } }
    if (s.pareja.estado === 'no' && c.moral > 40 && GM.rng.next() < 0.05) {
      const pais = YO(st).nac === 'US' ? 'US' : 'ES', nom = GM.nombreAleatorio(pais, U.hash(st.fecha + 'amor'));
      s.pareja = { estado: 'conocida', ciudad: ciudad(st), hijos: 0 }; s.contactos.push({ id: 'p1', tipo: 'pareja', nombre: nom, rel: 25 });
      c.hitos.unshift({ fecha: st.fecha, texto: 'Conoces a ' + nom + '.' }); GM.noticia(st, 'Has conocido a alguien especial: ' + nom + '.');
    }
  });
  function invitarACasa(st, id) {
    const c = C(st), sc = c.social, k = sc.contactos.find(x => x.id === id), H = GM.mods.hogar; if (!k) return { ok: false, motivo: 'No encuentras a esa persona.' };
    if (sc.energia < 1) return { ok: false, motivo: 'No te queda energía social esta semana.' }; if (c.dinero < 0.2) return { ok: false, motivo: 'Faltan ahorros para recibirlos.' };
    const casa = H.casaActual(st), n = H.muebles(st).length, extra = ['barbacoa', 'billar', 'bar', 'piano'].filter(i => H.muebles(st).some(m => m.item === i)).length;
    const rel = Math.round(5 + casa.lujo * 2 + Math.min(4, n * 0.3) + extra * 2); sc.energia--; c.dinero -= 0.2; k.rel = U.clamp(k.rel + rel, 0, 100); c.moral = U.clamp(c.moral + 1.5, 0, 100);
    return { ok: true, efectos: ['relación +' + rel, casa.lujo >= 3 ? 'se quedan impresionados con tu casa' : 'una tarde en casa'] };
  }
  function estado(st) { return st.modo === 'carrera' && st.carrera && st.carrera.social ? st.carrera.social : null; }
  function contactos(st) { return C(st).social.contactos.slice(); }
  function selfTest() { return Object.keys(ACC).every(k => ACC[k].length >= 2) && PASOS.conocida[0] === 'saliendo'; }
  GM.register('social', { invitarACasa, estado, contactos, acciones, hacer, nuevaPartida, selfTest, ETQ, PASOS });
})();
