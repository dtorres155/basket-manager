/* VIDA DEL JUGADOR (GM.mods.vida) — modo carrera, encima de la vida social (social.js), el móvil (movil.js) y el estilo (estilo.js):
   - Vestuario: química (relación media con compañeros, capitán y rival), un capitán que te protege o te hunde según vuestra relación
     y un rival por el puesto que te pica; la química mueve tu ánimo y la forma del equipo cada semana.
   - Lesiones jugables: al lesionarte, los médicos te escriben y eliges recuperación conservadora, el plan normal o volver antes
     (con riesgo de recaída y de potencial). En la sede, sesiones con el fisio (sede_acciones.js).
   - Redes sociales: seguidores (según tu fama y lo que publicas), publicaciones que eliges y comentarios de aficionados.
   - Familia que evoluciona: padres que cumplen años (achaques, jubilación), un hermano que también juega y sigue su carrera,
     e hijos (los de social.js) que crecen y van a verte al pabellón.
   - Después de la retirada: entrenador o director deportivo (cambia el modo de la partida) o comentarista.
   - Logros y retos: 24 logros con fecha y progreso, y tres retos por temporada; se ven en Carrera y en la vitrina de tu casa.
   - Mascota (todos los modos): adoptas un perro o un gato que te recibe en casa (casa3d.js) y sube el ánimo si juegas con él.
   Estado: state.carrera.vida = { vest, redes, familia, logros, retos, recaida, post } (se crea al usarse) y state.sede.mascota.
   Expone: datos, vestuario, decidir, redes, publicar, TIPOS_POST, familia, logros, retos, ofertasRetiro, elegirRetiro, comentar,
   mascota, adoptar, jugarMascota, ponerMascota, moverMascota, vitrina, fisioSesion, hablarVestuario, selfTest. */
(function () {
  const U = GM.util, C = st => st.carrera, YO = st => st.jugadores.yo;
  const act = st => !!st && st.modo === 'carrera' && !!st.carrera && st.carrera.fase !== 'retirado';
  const R = () => GM.rng.next(), pick = a => a[Math.floor(R() * a.length)];
  const clamp = (v, a, b) => U.clamp(v, a, b);
  const enviar = (st, quien, texto, dec) => GM.mods.movil ? GM.mods.movil.enviar(st, quien, texto, dec) : null;
  const pais = st => (YO(st).nac === 'US' ? 'US' : 'ES');
  const nombre1 = (st, h) => GM.nombreAleatorio(pais(st), h).split(' ')[0];
  const moral = (st, d) => { C(st).moral = clamp(C(st).moral + d, 0, 100); };
  function datos(st) {
    const c = C(st); if (c.vida) return c.vida;
    const p = YO(st), h = U.hash(p.nombre + 'vida'), so = c.social && c.social.contactos || [];
    const madre = (so.find(k => / \(tu madre\)/.test(k.nombre)) || {}).nombre, herm = (so.find(k => / \(tu hermano\)/.test(k.nombre)) || {}).nombre;
    c.vida = {
      vest: { piques: 0 }, redes: { seg: 0, extra: 0, posts: [], ult: null },
      familia: { madre: { nombre: madre ? madre.replace(' (tu madre)', '') : 'Tu madre', edad: p.edad + 27 + (h % 5) }, padre: { nombre: nombre1(st, h + 11), edad: p.edad + 29 + (h >>> 3) % 6 },
        hermano: { nombre: herm ? herm.replace(' (tu hermano)', '') : nombre1(st, h + 7), edad: Math.max(9, p.edad - 2 - (h >>> 5) % 4), nivel: 30 + (h >>> 7) % 18, etapa: 'cantera', club: null }, hijos: [], temporada: st.temporada, avisos: [] },
      logros: { hechos: {}, pj: 0, pts: 0 }, retos: null, recaida: null, post: null
    };
    return c.vida;
  }
  // ---------------- Vestuario ----------------
  function vestuario(st) {
    if (!st.carrera || !st.carrera.social) return null; const s = C(st).social, ks = s.contactos;
    const comp = ks.filter(k => k.tipo === 'companero'), cap = ks.find(k => k.tipo === 'mentor'), riv = ks.find(k => k.tipo === 'rival');
    if (!comp.length && !cap) return null;
    const todos = comp.concat(cap ? [cap] : [], riv ? [riv] : []), quimica = Math.round(todos.reduce((a, k) => a + k.rel, 0) / todos.length);
    const yo = YO(st), rj = riv && st.jugadores[riv.ref], cj = cap && st.jugadores[cap.ref];
    return {
      quimica, etiqueta: quimica >= 65 ? 'Piña' : quimica >= 45 ? 'Buen ambiente' : quimica >= 30 ? 'Frío' : 'Vestuario roto',
      capitan: cap ? { nombre: cap.nombre, rel: Math.round(cap.rel), edad: cj ? cj.edad : null, trato: cap.rel >= 55 ? 'Te protege' : cap.rel >= 25 ? 'Te observa' : 'Te tiene en el punto de mira' } : null,
      rival: riv ? { nombre: riv.nombre, rel: Math.round(riv.rel), ovr: rj ? rj.ovr : null, pos: rj ? rj.pos : yo.pos, puesto: rj ? (yo.ovr >= rj.ovr ? 'Le ganas el puesto' : 'Te gana el puesto') : '' } : null,
      companeros: comp.map(k => ({ nombre: k.nombre, rel: Math.round(k.rel) })), piques: datos(st).vest.piques
    };
  }
  function hablarVestuario(st) {
    const s = C(st).social; if (!s) return { ok: false, motivo: 'Sin vestuario.' };
    s.contactos.filter(k => ['companero', 'mentor', 'rival'].includes(k.tipo)).forEach(k => { k.rel = clamp(k.rel + (k.tipo === 'rival' ? 2 : 4), 0, 100); });
    moral(st, 1); return { ok: true, texto: 'Un rato de bromas en el vestuario. Relación con los compañeros +4.' };
  }
  function semanaVestuario(st) {
    const V = vestuario(st); if (!V) return; const c = C(st), pl = st.equipos[YO(st).equipoId] ? st.equipos[YO(st).equipoId].plantilla.map(i => st.jugadores[i]).filter(p => p && p.id !== 'yo') : [];
    if (V.quimica >= 60) { moral(st, 1); pl.forEach(p => { p.estado.forma = clamp(p.estado.forma + 1, 0, 100); }); }
    else if (V.quimica < 30) { moral(st, -1); if (R() < 0.15) enviar(st, 'entrenador', 'El ambiente en el vestuario no es bueno. Habla con tus compañeros, que se nota en la pista.'); }
    const riv = c.social.contactos.find(k => k.tipo === 'rival');
    if (riv && riv.rel < 35 && R() < 0.3) enviar(st, 'rival', pick(['Hoy en el entreno te he dejado en evidencia. El puesto es mío.', '¿Eso es todo lo que tienes? El míster ya se ha dado cuenta.', 'Disfruta del banquillo, que te va a tocar mucho.']),
      { tipo: 'vida', que: 'pique', ops: [{ t: 'Responder en la pista', d: 'Progresas, pero la relación empeora.' }, { t: 'Hablarlo con calma', d: 'La relación mejora.' }], def: 1 });
  }
  // ---------------- Lesiones ----------------
  function avisoLesion(st) {
    const p = YO(st), l = p && p.estado.lesion; if (!l || l.aviso) return; l.aviso = true; l.orig = l.dias;
    enviar(st, 'medico', 'Tienes ' + (l.tipo || 'una lesión').toLowerCase() + ': unos ' + l.dias + ' días de baja. ¿Cómo quieres recuperarte?', { tipo: 'vida', que: 'lesion', ops: [
      { t: 'Recuperación conservadora', d: 'Unos días más, sin riesgos y con el potencial a salvo.' }, { t: 'El plan de los médicos', d: l.dias + ' días.' }, { t: 'Volver antes', d: 'Infiltración y prisas: casi la mitad de días, pero puedes recaer.' }], def: 1 });
  }
  function fisioSesion(st) {
    const p = YO(st), l = p && p.estado.lesion; if (!l) return { ok: false, motivo: 'No estás lesionado.' };
    l.dias = Math.max(1, l.dias - 1); moral(st, 1); return { ok: true, texto: 'Hora y media de camilla, hielo y ejercicios. Un día menos de baja (quedan ' + l.dias + ').' };
  }
  // ---------------- Decisiones que llegan al móvil ----------------
  function decidir(st, d, i) {
    const c = C(st), out = [];
    if (d.que === 'lesion') {
      const p = YO(st), l = p.estado.lesion; if (!l) return { ok: true, efectos: ['Ya estás recuperado'] }; if (i < 0) i = 1;
      if (i === 0) { l.dias = Math.ceil(l.dias * 1.25); l.plan = 'conservador'; out.push(l.dias + ' días de baja, sin riesgos'); }
      else if (i === 1) { l.plan = 'normal'; out.push('Sigues el plan: ' + l.dias + ' días'); }
      else { l.dias = Math.max(1, Math.ceil(l.dias * 0.55)); l.plan = 'arriesgado'; datos(st).recaida = { tipo: l.tipo, dias: Math.max(3, Math.round((l.orig || l.dias) * 0.8)), hasta: U.addDays(st.fecha, l.dias + 30) }; out.push('Vuelves en ' + l.dias + ' días, con riesgo de recaída'); GM.mods.estilo && GM.mods.estilo.mover(st, -1, 'Vuelves antes de tiempo'); }
      return { ok: true, efectos: out };
    }
    if (d.que === 'pique') { const k = c.social.contactos.find(x => x.tipo === 'rival'); if (i < 0) return { ok: true, efectos: [] };
      if (k) { if (i === 0) { k.rel = clamp(k.rel - 6, 0, 100); YO(st).xp = (YO(st).xp || 0) + 0.08; moral(st, 1); datos(st).vest.piques++; out.push('le respondes con tres triples seguidos', 'relación −6'); } else { k.rel = clamp(k.rel + 8, 0, 100); out.push('relación +8'); } }
      return { ok: true, efectos: out };
    }
    if (d.que === 'padres') { if (i === 0) { if (c.dinero < 0.5) return { ok: false, motivo: 'Faltan ahorros para el viaje.' }; c.dinero -= 0.5; moral(st, 2); (c.social.contactos.filter(k => k.tipo === 'familia')).forEach(k => { k.rel = clamp(k.rel + 12, 0, 100); }); out.push('relación con tu familia +12'); } else if (i === 1) { (c.social.contactos.filter(k => k.tipo === 'familia')).forEach(k => { k.rel = clamp(k.rel + 3, 0, 100); }); out.push('relación +3'); } else moral(st, -1);
      return { ok: true, efectos: out };
    }
    return { ok: true, efectos: [] };
  }
  // ---------------- Redes sociales ----------------
  const TIPOS_POST = {
    entreno: { t: 'Vídeo del entreno', d: 'Imagen de profesional.', gana: 0.006, likes: 0.04, estilo: 2, txt: ['Sesión doble hoy. Sin atajos.', 'A las 7 en el gimnasio. El trabajo no se ve, se nota.', 'Cien tiros más antes de irme a casa.'] },
    partido: { t: 'Foto del partido', d: 'Mejor si has ganado y has jugado bien.', gana: 0.012, likes: 0.07, txt: ['¡Qué noche! Gracias por el apoyo.', 'A seguir. Esto no ha hecho más que empezar.', 'Equipo. Siempre equipo.'] },
    aficion: { t: 'Gracias a la afición', d: 'La grada lo agradece. Afición +1.', gana: 0.01, likes: 0.06, txt: ['Esta afición es otra cosa. Gracias por estar siempre.', 'Sin vosotros no sería lo mismo. ¡Nos vemos en el pabellón!'] },
    familia: { t: 'Foto con tu familia', d: 'Ánimo +2 y tu familia contenta.', gana: 0.008, likes: 0.08, txt: ['Domingo en casa. Lo mejor de la semana.', 'Los que estaban antes de todo esto.'] },
    fiesta: { t: 'Fotos de fiesta', d: 'Muchos seguidores, pero el club puede enfadarse.', gana: 0.025, likes: 0.09, estilo: -3, txt: ['Noche épica 🔥', 'Celebrando como se merece.'] },
    polemica: { t: 'Mensaje polémico', d: 'Lo verá todo el mundo. Puede haber multa.', gana: 0.04, likes: 0.14, estilo: -6, txt: ['Algunos deberían mirar el vídeo antes de pitar.', 'Hay cosas que no se pueden decir… pero las pienso.'] },
    publi: { t: 'Publicación patrocinada', d: 'Cobras según tus seguidores (desde 20.000).', gana: 0.003, likes: 0.03, estilo: -1, txt: ['Con estas zapatillas cada salto cuenta. #publi', 'Mi bebida para los entrenos. #colaboración'] }
  };
  const COMENT = {
    bien: ['¡Crack!', 'Así se hace 💪', 'Orgullo de pueblo', 'Eres el mejor de la plantilla', '¡Vamos!', 'Te quiero en mi equipo del fantasy'],
    mal: ['Menos fotos y más defensa', 'Para esto no te pagan…', 'Céntrate en el baloncesto', 'Pues el partido de ayer…'],
    fiesta: ['Mañana hay entreno, ¿eh?', 'Jajaja leyenda', 'El míster no va a estar contento', '¿Dónde es la próxima?'],
    familia: ['Qué bonito ❤️', 'Se nota de dónde sale el talento', 'Saludos a tu madre'],
    polemica: ['Totalmente de acuerdo', 'Te va a caer una multa…', 'Por fin alguien lo dice', 'Esto no ayuda al equipo']
  };
  const USUARIOS = ['basket_lover', 'grada_animada', 'triple_y_falta', 'mister_fantasy', 'pivot_de_barrio', 'abuela_del_10', 'la_peña_oficial', 'canasta_ya', 'aro_y_red', 'el_del_tercer_anfiteatro'];
  function base(st) { return Math.round(200 * Math.pow(1.085, C(st).fama)); }
  function redes(st) {
    const r = datos(st).redes; if (!r.seg) r.seg = base(st);
    return { seg: Math.round(r.seg), posts: r.posts.slice(0, 6), puede: r.ult !== st.fecha, tipos: Object.keys(TIPOS_POST).map(k => ({ id: k, t: TIPOS_POST[k].t, d: TIPOS_POST[k].d, disponible: r.ult !== st.fecha && (k !== 'publi' || r.seg >= 20000) && (k !== 'partido' || !!ultimoPartido(st)) })) };
  }
  function ultimoPartido(st) { const id = YO(st).equipoId; if (!id) return null; const g = (st.calendario || []).filter(x => x.resultado && (x.local === id || x.visitante === id)).pop(); return g && U.diffDays(g.fecha, st.fecha) <= 3 ? g : null; }
  function publicar(st, tipo) {
    const T = TIPOS_POST[tipo], r = datos(st).redes, c = C(st); if (!T) return { ok: false, motivo: 'Tipo desconocido.' };
    redes(st); if (r.ult === st.fecha) return { ok: false, motivo: 'Ya has publicado hoy.' };
    if (tipo === 'publi' && r.seg < 20000) return { ok: false, motivo: 'Necesitas 20.000 seguidores.' };
    let gana = T.gana, lk = T.likes, tono = tipo === 'fiesta' ? 'fiesta' : tipo === 'familia' ? 'familia' : tipo === 'polemica' ? 'polemica' : 'bien'; const out = [];
    if (tipo === 'partido') { const g = ultimoPartido(st); if (!g) return { ok: false, motivo: 'No has jugado en los últimos días.' }; const id = YO(st).equipoId, w = (g.local === id) === (g.resultado.local > g.resultado.visitante), s = g.resultado.stats && g.resultado.stats.yo; if (w && s && s.pts >= 15) { gana *= 2; lk *= 1.6; } else if (!w) { gana *= 0.4; tono = 'mal'; } }
    if (T.estilo && GM.mods.estilo) GM.mods.estilo.mover(st, T.estilo, 'Publicas en redes: ' + T.t.toLowerCase());
    if (tipo === 'aficion') { const ci = st.ciudad && st.ciudad[st.clubId]; if (ci) ci.aficion = clamp(ci.aficion + 1, 0, 100); out.push('afición +1'); }
    if (tipo === 'familia') { moral(st, 2); (c.social ? c.social.contactos.filter(k => k.tipo === 'familia') : []).forEach(k => { k.rel = clamp(k.rel + 3, 0, 100); }); out.push('ánimo +2'); }
    if (tipo === 'fiesta' && R() < 0.25) { moral(st, -2); enviar(st, 'club', 'Hemos visto las fotos. Te pedimos que las borres y que cuides tu imagen.'); out.push('al club no le ha gustado'); }
    if (tipo === 'polemica') { c.fama = c.fama + 1; if (R() < 0.5) { c.dinero -= 2; enviar(st, 'club', 'La liga te ha multado con 2.000 € por tus declaraciones en redes.'); out.push('multa de 2.000 €'); } }
    if (tipo === 'publi') { const k = Math.round(r.seg / 10000 * 10) / 10; c.dinero += k; out.push('+' + k.toString().replace('.', ',') + ' mil €'); }
    const nuevos = Math.round(r.seg * gana * (0.7 + R() * 0.6)); r.extra += nuevos; r.seg += nuevos; r.ult = st.fecha;
    const likes = Math.round(r.seg * lk * (0.7 + R() * 0.6)), usados = {}, coms = [0, 1, 2].map(k => { const l = COMENT[k === 2 && tono === 'bien' && R() < 0.3 ? 'mal' : tono]; let x = pick(l); for (let n = 0; usados[x] && n < 6; n++) x = pick(l); usados[x] = 1; return { u: '@' + USUARIOS[(U.hash(st.fecha + tipo + k) >>> 0) % USUARIOS.length], t: x }; });
    r.posts.unshift({ fecha: st.fecha, tipo, texto: pick(T.txt), likes, coms }); if (r.posts.length > 12) r.posts.length = 12;
    return { ok: true, texto: '+' + nuevos.toLocaleString('es-ES') + ' seguidores, ' + likes.toLocaleString('es-ES') + ' me gusta', efectos: out };
  }
  // ---------------- Familia ----------------
  function familia(st) {
    const F = datos(st).familia, so = C(st).social, hijosN = so && so.pareja ? so.pareja.hijos || 0 : 0;
    while (F.hijos.length < hijosN) { const k = F.hijos.length; F.hijos.push({ nombre: nombre1(st, U.hash(st.fecha + 'hijo' + k)), nace: st.fecha }); }
    const edad = f => Math.max(0, Math.floor(U.diffDays(f, st.fecha) / 365));
    return { madre: F.madre, padre: F.padre, hermano: F.hermano, hijos: F.hijos.map(x => ({ nombre: x.nombre, edad: edad(x.nace) })), avisos: F.avisos.slice(0, 5) };
  }
  function nuevaTemporadaFamilia(st) {
    const F = datos(st).familia; if (F.temporada === st.temporada) return; F.temporada = st.temporada;
    const av = t => { F.avisos.unshift({ fecha: st.fecha, texto: t }); if (F.avisos.length > 12) F.avisos.length = 12; };
    F.madre.edad++; F.padre.edad++;
    [F.padre, F.madre].forEach((x, k) => { if (x.edad === 65) { av((k ? 'Tu madre' : 'Tu padre') + ' se jubila.'); enviar(st, 'familia', '¡' + (k ? 'Tu madre' : 'Tu padre') + ' se jubila! Ahora tendrá tiempo de ir a todos tus partidos.'); } });
    const mayor = Math.max(F.padre.edad, F.madre.edad);
    if (mayor >= 62 && R() < 0.35) { const quien = F.padre.edad >= F.madre.edad ? 'Tu padre' : 'Tu madre', que = pick(['tiene que operarse de la cadera', 'ha tenido un susto con la tensión', 'se ha roto la muñeca en una caída']);
      av(quien + ' ' + que + '.'); enviar(st, 'familia', quien + ' ' + que + '. Está bien, pero le haría ilusión verte.', { tipo: 'vida', que: 'padres', ops: [{ t: 'Ir a verle', d: '500 €, la familia lo agradece mucho.' }, { t: 'Llamar cada día', d: 'Un poco de cariño.' }], def: 2 }); }
    const H = F.hermano; H.edad++;
    if (H.etapa === 'cantera' || H.etapa === 'profesional') {
      H.nivel = clamp(H.nivel + (H.edad < 22 ? 2 + Math.floor(R() * 6) : H.edad < 29 ? Math.floor(R() * 3) - 1 : -2), 20, 85);
      if (H.etapa === 'cantera' && H.edad >= 18 && H.nivel >= 52) {
        const dom = ['ACB', 'LEGA', 'GBL', 'BBL', 'BSL'].find(l => st.ligas[l] && st.ligas[l].equipos.indexOf(st.clubId) >= 0) || (pais(st) === 'ES' ? 'ACB' : null);
        const pool = dom && st.ligas[dom] ? st.ligas[dom].equipos.map(id => st.equipos[id]).filter(e => e && e.reputacion < 60 && e.id !== st.clubId) : [], e = pool.length ? pool[(U.hash(H.nombre + st.temporada) >>> 0) % pool.length] : null;
        H.etapa = 'profesional'; H.club = e ? e.nombre : 'una universidad de la NCAA'; av('Tu hermano ' + H.nombre + ' firma su primer contrato profesional con ' + H.club + '.'); GM.noticia(st, 'Tu hermano ' + H.nombre + ' firma con ' + H.club + '.'); enviar(st, 'familia', '¡¡' + H.nombre + ' ha firmado con ' + H.club + '!! Dice que quiere ser como tú.');
      } else if (H.etapa === 'cantera' && H.edad >= 20 && H.nivel < 45) { H.etapa = 'estudios'; av(H.nombre + ' deja el baloncesto para estudiar.'); }
      else if (H.etapa === 'profesional' && H.edad >= 33) { H.etapa = 'retirado'; av(H.nombre + ' se retira del baloncesto.'); }
    }
    familia(st).hijos.forEach(h => { if (h.edad === 6) av(h.nombre + ' empieza a jugar en el equipo del colegio.'); if (h.edad === 12) enviar(st, 'familia', h.nombre + ' quiere probar en la cantera. ¿De quién habrá salido?'); });
  }
  // Tu casa del pueblo: los veranos (de junio a agosto, una vez por temporada) descansas de verdad
  function accionesCasaPueblo(st) {
    if (!act(st)) return []; const v = datos(st), mes = +st.fecha.slice(5, 7), verano = mes >= 6 && mes <= 8, hecho = v.verano === st.temporada;
    return [{ id: 'verano', t: 'Pasar el verano aquí', d: 'Fatiga a cero, ánimo +10, tu familia y el pueblo encantados.', disponible: verano && !hecho, motivo: hecho ? 'Ya pasaste aquí este verano.' : 'Solo de junio a agosto.', fn: () => {
      v.verano = st.temporada; const p = YO(st); p.estado.fatiga = 0; moral(st, 10); if (C(st).pueblo) C(st).pueblo.cariño = clamp(C(st).pueblo.cariño + 5, 0, 100);
      (C(st).social ? C(st).social.contactos.filter(k => k.tipo === 'familia' || k.tipo === 'amigo') : []).forEach(k => { k.rel = clamp(k.rel + 10, 0, 100); });
      C(st).hitos.unshift({ fecha: st.fecha, texto: 'Pasas el verano en tu casa del pueblo.' }); return { ok: true, texto: 'Verano en el pueblo: fatiga 0, ánimo +10, cariño del pueblo +5.' }; } }];
  }
  // ---------------- Logros y retos ----------------
  const LOGROS = [
    ['debut', 'Debut profesional', 'Juega tu primer partido como profesional.'], ['p20', '20 puntos', 'Mete 20 puntos en un partido.'], ['p30', '30 puntos', 'Mete 30 puntos en un partido.'],
    ['p40', '40 puntos', 'Mete 40 puntos en un partido.'], ['p50', '50 puntos en un partido', 'Una noche para la historia.'], ['doble', 'Doble-doble', 'Diez o más en dos estadísticas.'],
    ['triple', 'Triple-doble', 'Diez o más en puntos, rebotes y asistencias.'], ['pj100', '100 partidos', 'Cien partidos como profesional.', 'pj', 100], ['pts1000', '1.000 puntos', 'Mil puntos como profesional.', 'pts', 1000],
    ['pts5000', '5.000 puntos', 'Cinco mil puntos como profesional.', 'pts', 5000], ['titulo', 'Primer título', 'Gana un título con tu equipo.'], ['titulos3', 'Tres títulos', 'Tres títulos en tu carrera.'],
    ['mvp', 'Máximo anotador de la liga', 'Acaba la temporada como máximo anotador de tu liga.'], ['mvp21', 'Estrella con 21 años', 'Máximo anotador de tu liga con 21 años o menos.'], ['draft', 'Elegido en el draft', 'Te elige un equipo de la NBA.'],
    ['nba', 'Jugador de la NBA', 'Juega en la NBA.'], ['euroliga', 'Jugador de Euroliga', 'Juega en la Euroliga.'], ['fama80', 'Estrella mundial', 'Llega a 80 de fama.'],
    ['seg100k', '100.000 seguidores', 'Cien mil seguidores en tus redes.'], ['millon', 'Millonario', 'Un millón de euros ahorrados.'], ['pueblo', 'Hijo predilecto', 'Que tu pueblo te quiera con locura (cariño 90).'],
    ['ejemplar', 'Profesional ejemplar', 'Estilo de 80 o más.'], ['rebelde', 'Chico malo', 'Estilo de −80 o menos.'], ['padre', 'Padre de familia', 'Ten un hijo.']
  ];
  function lograr(st, id) {
    const L = datos(st).logros; if (L.hechos[id]) return; L.hechos[id] = st.fecha; const d = LOGROS.find(x => x[0] === id); if (!d) return;
    C(st).hitos.unshift({ fecha: st.fecha, texto: 'Logro: ' + d[1] + '.' }); GM.noticia(st, '🏅 Logro desbloqueado: ' + d[1] + '.'); C(st).fama = C(st).fama + 0.3;
  }
  function revisarLogros(st) {
    const c = C(st), L = datos(st).logros, p = YO(st);
    if (L.pj >= 1) lograr(st, 'debut'); if (L.pj >= 100) lograr(st, 'pj100'); if (L.pts >= 1000) lograr(st, 'pts1000'); if (L.pts >= 5000) lograr(st, 'pts5000');
    const tit = c.historial.filter(x => x.titulo).length + (L.titulosExtra || 0); if (tit >= 1) lograr(st, 'titulo'); if (tit >= 3) lograr(st, 'titulos3');
    const en = l => !!(p.equipoId && st.ligas[l] && st.ligas[l].equipos.indexOf(p.equipoId) >= 0); if (c.draftPick) lograr(st, 'draft'); if (en('NBA') && L.pj) lograr(st, 'nba'); if (en('EUROLIGA') && L.pj) lograr(st, 'euroliga');
    if (c.fama >= 80) lograr(st, 'fama80'); if (c.vida.redes.seg >= 100000) lograr(st, 'seg100k'); if (c.dinero >= 1000) lograr(st, 'millon');
    if (c.pueblo && c.pueblo.cariño >= 90) lograr(st, 'pueblo'); const es = GM.mods.estilo && GM.mods.estilo.estado(st); if (es && es.v >= 80) lograr(st, 'ejemplar'); if (es && es.v <= -80) lograr(st, 'rebelde');
    if (c.social && c.social.pareja && c.social.pareja.hijos > 0) lograr(st, 'padre');
  }
  function logros(st) {
    const L = datos(st).logros, v = { pj: L.pj, pts: L.pts };
    return LOGROS.map(([id, t, d, k, meta]) => ({ id, t, d, fecha: L.hechos[id] || null, prog: k ? Math.min(1, v[k] / meta) : null, valor: k ? v[k] : null, meta: meta || null }));
  }
  function nuevosRetos(st) {
    const ult = C(st).historial.filter(x => x.pj && !/^(NCAA|Cadete|Junior|Filial)$/.test(x.liga)).pop(), pts = ult ? Math.max(6, Math.round(ult.pts + 2)) : Math.round(clamp((YO(st).ovr - 58) * 0.7 + 5, 5, 22)), id = YO(st).equipoId;
    datos(st).retos = { temporada: st.temporada, pj0: datos(st).logros.pj, pts0: datos(st).logros.pts, lista: [
      { id: 'media', t: 'Promedia ' + pts + ' puntos', meta: pts }, { id: 'pj', t: 'Juega 25 partidos', meta: 25 }, { id: 'p25', t: 'Mete 25 puntos en un partido', meta: 25, mejor: 0 }], club: id, premiado: false };
  }
  function retos(st) {
    const R0 = datos(st).retos; if (!R0 || R0.temporada !== st.temporada) nuevosRetos(st); const Rt = datos(st).retos, L = datos(st).logros, pj = L.pj - Rt.pj0, pts = L.pts - Rt.pts0;
    return Rt.lista.map(r => { const v = r.id === 'media' ? (pj ? pts / pj : 0) : r.id === 'pj' ? pj : r.mejor || 0; return { id: r.id, t: r.t, valor: Math.round(v * 10) / 10, meta: r.meta, hecho: r.id === 'media' ? pj >= 10 && v >= r.meta : v >= r.meta }; });
  }
  function premiarRetos(st) {
    const Rt = datos(st).retos; if (!Rt || Rt.premiado || Rt.temporada !== st.temporada) return; Rt.premiado = true;
    const h = retos(st).filter(r => r.hecho).length; if (!h) return; C(st).fama = C(st).fama + h; moral(st, 2 * h); C(st).dinero += h * 2;
    C(st).hitos.unshift({ fecha: st.fecha, texto: 'Retos de la temporada cumplidos: ' + h + ' de 3.' }); GM.noticia(st, 'Retos de la temporada: cumples ' + h + ' de 3 (fama +' + h + ', ' + h * 2 + ' mil €).');
  }
  function maximoAnotador(st) {
    const p = YO(st); Object.keys(st.estComp || {}).forEach(comp => { const E = st.estComp[comp]; if (!E || !E.yo || E.yo[0] < 15) return;
      const media = k => E[k][2] / Math.max(1, E[k][0]), mejor = Object.keys(E).filter(k => E[k][0] >= 15).sort((a, b) => media(b) - media(a))[0];
      if (mejor === 'yo') { lograr(st, 'mvp'); if (p.edad <= 21) lograr(st, 'mvp21'); } });
  }
  // ---------------- Después de la retirada ----------------
  function ofertasRetiro(st) {
    const c = C(st); if (c.fase !== 'retirado' || c.post) return [];
    const fama = c.fama, ult = (c.historial.filter(x => x.club && !/Cantera|Universidad/.test(x.club)).pop() || {}).club, prefer = Object.values(st.equipos).find(e => e.nombre === ult);
    const objetivo = 25 + fama * 0.65, ligas = ['ACB', 'LEGA', 'GBL', 'BBL', 'BSL', 'EUROLIGA'].filter(l => st.ligas[l]);
    const pool = ligas.flatMap(l => st.ligas[l].equipos).map(id => st.equipos[id]).filter(Boolean).sort((a, b) => Math.abs(a.reputacion - objetivo) - Math.abs(b.reputacion - objetivo));
    const ent = (prefer ? [prefer] : []).concat(pool.filter(e => e !== prefer)).slice(0, 3), dir = pool.filter(e => e !== prefer).slice(3, 5).concat(prefer ? [prefer] : []).slice(0, 3);
    return [
      { id: 'entrenador', t: 'Entrenador', d: 'Te sientas en el banquillo: táctica, vestuario y una directiva que te exige resultados.', clubes: ent.map(e => ({ id: e.id, nombre: e.nombre })) },
      { id: 'director', t: 'Director deportivo', d: 'Llevas el club: fichajes, cantera, finanzas e instalaciones.', clubes: dir.map(e => ({ id: e.id, nombre: e.nombre })) },
      { id: 'comentarista', t: 'Comentarista', d: 'Comentas partidos en la tele: un sueldo según tu fama y seguir en el foco.', clubes: [] }
    ];
  }
  function elegirRetiro(st, tipo, clubId) {
    const c = C(st), of = ofertasRetiro(st).find(o => o.id === tipo); if (!of) return { ok: false, motivo: 'Ya elegiste qué hacer tras la retirada.' };
    if (tipo === 'comentarista') { c.post = { tipo, desde: st.fecha, sueldo: Math.round(3 + c.fama * 0.12) }; c.hitos.unshift({ fecha: st.fecha, texto: 'Empiezas como comentarista en la tele.' }); GM.noticia(st, YO(st).nombre + ' ficha como comentarista.'); return { ok: true, texto: 'Comentarista: ' + c.post.sueldo + ' mil € al mes.' }; }
    if (!of.clubes.some(e => e.id === clubId)) return { ok: false, motivo: 'Ese club no te ha llamado.' };
    const ahorro = c.dinero; c.post = { tipo, desde: st.fecha, clubId }; c.hitos.unshift({ fecha: st.fecha, texto: (tipo === 'entrenador' ? 'Nuevo entrenador del ' : 'Nuevo director deportivo del ') + st.equipos[clubId].nombre + '.' });
    st.modo = tipo === 'entrenador' ? 'entrenador' : 'gestor'; st.clubId = clubId;
    if (tipo === 'entrenador' && GM.mods.entrenador) { GM.mods.entrenador.nuevaPartida(st); st.entrenador.reputacion = clamp(st.entrenador.reputacion + c.fama * 0.25, 20, 90); }
    if (GM.mods.hogar) { GM.mods.hogar.dinero(st); st.hogar.ahorros = Math.max(st.hogar.ahorros || 0, ahorro); }
    GM.noticia(st, YO(st).nombre + ', exjugador, nuevo ' + (tipo === 'entrenador' ? 'entrenador' : 'director deportivo') + ' del ' + st.equipos[clubId].nombre + '.');
    return { ok: true, texto: 'Empieza tu nueva vida en el ' + st.equipos[clubId].nombre, cambioModo: true };
  }
  function comentar(st) {
    const c = C(st); if (!c.post || c.post.tipo !== 'comentarista') return { ok: false, motivo: 'No eres comentarista.' };
    if (c.post.ultimo && U.diffDays(c.post.ultimo, st.fecha) < 7) return { ok: false, motivo: 'Ya comentaste un partido esta semana.' };
    c.post.ultimo = st.fecha; c.fama = c.fama + 0.3; c.dinero += 1; const g = (st.calendario || []).filter(x => x.resultado).pop(), e = g ? st.equipos[g.local].nombre + ' y ' + st.equipos[g.visitante].nombre : 'la jornada';
    return { ok: true, texto: 'Comentas el partido entre ' + e + '. +1 mil €, fama +0,3.' };
  }
  // ---------------- Mascota (todos los modos) ----------------
  const NOMBRES_MASCOTA = { perro: ['Triple', 'Rebote', 'Coco', 'Toby', 'Luna', 'Nala', 'Bruno', 'Kobe'], gato: ['Mate', 'Misha', 'Tapón', 'Lola', 'Simba', 'Michi', 'Canasta', 'Nube'] };
  function mascota(st) { return st.sede && st.sede.mascota ? st.sede.mascota : null; }
  function adoptar(st, tipo) {
    st.sede = st.sede || { charlas: {} }; if (st.sede.mascota) return { ok: false, motivo: 'Ya tienes a ' + st.sede.mascota.nombre + '.' };
    const H = GM.mods.hogar; if (H && H.dinero(st) < 0.15) return { ok: false, motivo: 'Faltan 150 € para la adopción.' }; if (st.modo === 'carrera') C(st).dinero -= 0.15; else if (H) st.hogar.ahorros -= 0.15;
    const L = NOMBRES_MASCOTA[tipo] || NOMBRES_MASCOTA.perro, nombre = L[(U.hash(st.fecha + tipo) >>> 0) % L.length];
    st.sede.mascota = { tipo: tipo === 'gato' ? 'gato' : 'perro', nombre, desde: st.fecha, juego: null, color: ['#c98d4f', '#3b2a1e', '#e8e2d4', '#8a8f94'][(U.hash(nombre) >>> 1) % 4] };
    if (act(st)) moral(st, 4);
    return { ok: true, texto: 'Adoptas a ' + nombre + ' en la protectora. Ya te espera en casa.' };
  }
  function jugarMascota(st) {
    const m = mascota(st); if (!m) return { ok: false, motivo: 'No tienes mascota.' };
    if (m.juego === st.fecha) return { ok: false, motivo: m.nombre + ' ya está agotado de jugar hoy.' };
    m.juego = st.fecha; if (act(st)) moral(st, 2);
    return { ok: true, texto: m.tipo === 'perro' ? 'Lanzas la pelota y ' + m.nombre + ' te la trae veinte veces. Ánimo +2.' : m.nombre + ' persigue el láser por todo el salón. Ánimo +2.' };
  }
  // Modelo procedural del perro o el gato; te recibe en la puerta y luego te sigue o da vueltas
  function ponerMascota(S, st, x, z) {
    const m = mascota(st); S.mascota = null; if (!m) return;
    const g = new THREE.Group(), pelo = new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.9 }), osc = new THREE.MeshStandardMaterial({ color: 0x1d1510 });
    const B = (w, h, d, px, py, pz, mt) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mt || pelo); me.position.set(px, py, pz); me.castShadow = true; g.add(me); return me; };
    const perro = m.tipo === 'perro', k = perro ? 1 : 0.7;
    B(0.24 * k, 0.2 * k, 0.5 * k, 0, 0.3 * k, 0); const cab = B(0.2 * k, 0.2 * k, 0.2 * k, 0, 0.45 * k, 0.3 * k); B(0.04, 0.04, 0.02, -0.05 * k, 0.48 * k, 0.4 * k, osc); B(0.04, 0.04, 0.02, 0.05 * k, 0.48 * k, 0.4 * k, osc);
    if (perro) { B(0.12, 0.1, 0.12, 0, 0.4, 0.43); B(0.05, 0.12, 0.03, -0.09, 0.53, 0.28); B(0.05, 0.12, 0.03, 0.09, 0.53, 0.28); } else { const o1 = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 4), pelo); o1.position.set(-0.05, 0.57 * k, 0.3 * k); g.add(o1); const o2 = o1.clone(); o2.position.x = 0.05; g.add(o2); }
    const patas = [[-0.08, 0.17], [0.08, 0.17], [-0.08, -0.17], [0.08, -0.17]].map(([px, pz]) => B(0.06 * k, 0.22 * k, 0.06 * k, px * k, 0.11 * k, pz * k));
    const cola = new THREE.Group(); cola.position.set(0, 0.38 * k, -0.25 * k); const cm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, perro ? 0.2 : 0.3), pelo); cm.position.z = perro ? -0.1 : -0.15; cola.add(cm); cola.rotation.x = perro ? 0.6 : 0.9; g.add(cola);
    g.position.set(x, 0, z); g.userData = { mascota: true }; S.mundo.add(g);
    S.mascota = { obj: g, cab, patas, cola, t: 0, estado: 'recibe', espera: 0, objetivo: null, nombre: m.nombre };
    const e = GM.sede && GM.sede._motor ? GM.sede._motor().etiqueta : null; if (e) { const et = e(m.nombre); et.scale.multiplyScalar(0.5); et.position.y = 0.9; g.add(et); }
  }
  function moverMascota(S, dt) {
    const P = S.mascota; if (!P || !S.yo) return; P.t += dt; const o = P.obj.position, yo = S.yo.obj.position;
    const dx = yo.x - o.x, dz = yo.z - o.z, dist = Math.hypot(dx, dz); let vx = 0, vz = 0;
    if (P.estado === 'recibe' || dist > 2.2) { if (dist > 0.9) { vx = dx / dist; vz = dz / dist; } else P.estado = 'sigue'; }
    else { P.espera -= dt; if (!P.objetivo || P.espera <= 0) { P.objetivo = [yo.x + (Math.random() - 0.5) * 3, yo.z + (Math.random() - 0.5) * 3]; P.espera = 2 + Math.random() * 3; } const ox = P.objetivo[0] - o.x, oz = P.objetivo[1] - o.z, d2 = Math.hypot(ox, oz); if (d2 > 0.3) { vx = ox / d2 * 0.5; vz = oz / d2 * 0.5; } }
    const vel = P.estado === 'recibe' ? 3.2 : 2.4, nx = o.x + vx * vel * dt, nz = o.z + vz * vel * dt;
    const cel = S.G && S.G.celda ? S.G.celda(nx, nz) : null; if (!cel || S.G.libre(cel[0], cel[1])) { o.x = nx; o.z = nz; }
    const mov = Math.abs(vx) + Math.abs(vz) > 0.05; if (mov) P.obj.rotation.y = Math.atan2(vx, vz);
    P.patas.forEach((p, i) => { p.rotation.x = mov ? Math.sin(P.t * 14 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.6 : 0; });
    P.cola.rotation.y = Math.sin(P.t * (P.estado === 'recibe' || dist < 1.5 ? 16 : 4)) * 0.6; P.obj.position.y = mov ? Math.abs(Math.sin(P.t * 14)) * 0.03 : 0;
  }
  // Vitrina de logros en el salón de tu casa: una copa o una placa por logro
  function vitrina(S, st, W, x, z, ry) {
    if (!act(st) && !(st.carrera && st.carrera.vida)) return null; const L = st.carrera && st.carrera.vida ? Object.keys(st.carrera.vida.logros.hechos).length : 0;
    const g = new THREE.Group(), madera = new THREE.MeshStandardMaterial({ color: 0x5a3b26, roughness: 0.6 }), cristal = new THREE.MeshStandardMaterial({ color: 0xbfe0f0, transparent: true, opacity: 0.25, roughness: 0.05 }), oro = new THREE.MeshStandardMaterial({ color: 0xd4a72c, metalness: 0.85, roughness: 0.3 }), plata = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 0.85, roughness: 0.3 });
    const B = (w, h, d, px, py, pz, m) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(px, py, pz); g.add(me); return me; };
    B(1.6, 0.08, 0.45, 0, 0.04, 0, madera); B(1.6, 0.06, 0.45, 0, 1.62, 0, madera); B(0.06, 1.6, 0.45, -0.78, 0.82, 0, madera); B(0.06, 1.6, 0.45, 0.78, 0.82, 0, madera); B(1.6, 1.6, 0.04, 0, 0.82, -0.2, madera);
    for (let i = 1; i <= 3; i++) B(1.5, 0.03, 0.4, 0, i * 0.4, 0, cristal); B(1.56, 1.56, 0.02, 0, 0.82, 0.22, cristal);
    for (let i = 0; i < Math.min(L, 24); i++) { const f = Math.floor(i / 6), c = i % 6, px = -0.6 + c * 0.24, py = 0.08 + f * 0.4; if (i % 3 === 0) { const cu = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.16, 10), oro); cu.position.set(px, py + 0.1, 0); g.add(cu); } else { const pl = B(0.14, 0.18, 0.02, px, py + 0.09, -0.05, i % 2 ? plata : oro); pl.rotation.x = -0.2; } }
    g.position.set(x, 0, z); g.rotation.y = ry || 0; g.userData = { vitrina: true }; W.add(g); return g;
  }
  // ---------------- Eventos ----------------
  GM.bus.on('partido:jugado', ({ partido: g }) => {
    const st = GM.state; if (!act(st) || !g.resultado) return; const p = YO(st), s = g.resultado.stats && g.resultado.stats.yo; datos(st);
    if (p.estado.lesion && !p.estado.lesion.aviso) avisoLesion(st);
    if (!s || !s.min || C(st).fase !== 'pro') return;
    const L = C(st).vida.logros; L.pj++; L.pts += s.pts || 0;
    if (s.pts >= 20) lograr(st, 'p20'); if (s.pts >= 30) lograr(st, 'p30'); if (s.pts >= 40) lograr(st, 'p40'); if (s.pts >= 50) lograr(st, 'p50');
    const dd = [s.pts, s.reb, s.ast].filter(v => v >= 10).length; if (dd >= 2) lograr(st, 'doble'); if (dd >= 3) lograr(st, 'triple');
    const Rt = C(st).vida.retos; if (Rt && Rt.temporada === st.temporada) { const r = Rt.lista.find(x => x.id === 'p25'); if (r) r.mejor = Math.max(r.mejor || 0, s.pts || 0); }
    // recaída si volviste antes de tiempo
    const rc = C(st).vida.recaida; if (rc && !p.estado.lesion) { if (st.fecha > rc.hasta) C(st).vida.recaida = null; else if (R() < 0.3) { p.estado.lesion = { tipo: 'Recaída: ' + (rc.tipo || 'lesión').toLowerCase(), dias: rc.dias, aviso: true, plan: 'normal' }; C(st).vida.recaida = null; if (GM.mods.carrera.ajustarPot) GM.mods.carrera.ajustarPot(st, -0.3, 'Recaída por volver antes'); enviar(st, 'medico', 'Recaída. Te lo advertimos: ' + rc.dias + ' días más de baja.'); } }
    // el capitán te protege o te hunde tras una derrota en la que no has estado bien
    const id = p.equipoId, gana = (g.local === id) === (g.resultado.local > g.resultado.visitante), cap = C(st).social && C(st).social.contactos.find(k => k.tipo === 'mentor');
    if (cap && !gana && s.pts < 6 && R() < 0.5) { if (cap.rel >= 55) { moral(st, 2); enviar(st, 'capitan', 'Tranquilo, hoy no era tu día. Delante de la prensa he dicho que la culpa es de todos. La próxima es tuya.'); } else if (cap.rel < 25) { moral(st, -3); enviar(st, 'capitan', 'Hoy has estado fuera del partido. Ya lo he dicho en el vestuario: así no.'); } }
    // tus hijos van a verte a los partidos en casa
    if (g.local === id) { const hj = familia(st).hijos.filter(h => h.edad >= 3); if (hj.length && R() < 0.35) { const h = pick(hj); moral(st, 2); enviar(st, 'familia', h.nombre + ' ha venido a verte con la bufanda. Ha gritado tu nombre ' + (gana ? 'en cada canasta.' : 'aunque perdierais.')); } }
    revisarLogros(st);
  });
  GM.bus.on('dia:avanzado', () => {
    const st = GM.state; if (!st || st.modo !== 'carrera' || !st.carrera) return; const c = C(st);
    if (c.fase === 'retirado') { if (c.post && c.post.tipo === 'comentarista' && st.fecha.slice(8) === '01') c.dinero += c.post.sueldo; return; }
    datos(st); const p = YO(st);
    if (p.estado.lesion && !p.estado.lesion.aviso) avisoLesion(st);
    nuevaTemporadaFamilia(st); familia(st); if (!c.vida.retos || c.vida.retos.temporada !== st.temporada) nuevosRetos(st);
    if (U.weekday(st.fecha) === 1) {
      if (c.fase === 'pro') semanaVestuario(st);
      const r = c.vida.redes; if (!r.seg) r.seg = base(st); r.extra *= 0.97; const obj = base(st) + r.extra; r.seg = Math.max(50, r.seg + (obj - r.seg) * 0.15);
      const m = mascota(st); if (m) { if (m.juego && U.diffDays(m.juego, st.fecha) <= 7) moral(st, 0.5); else if (R() < 0.3) enviar(st, 'familia', m.nombre + ' te echa de menos. Juega un rato con él cuando llegues a casa.'); }
      revisarLogros(st);
    }
  });
  GM.bus.on('temporada:nueva', () => { const st = GM.state; if (!act(st)) return; datos(st); nuevaTemporadaFamilia(st); nuevosRetos(st); });
  GM.bus.on('temporada:fin', () => { const st = GM.state; if (!act(st)) return; datos(st); maximoAnotador(st); premiarRetos(st); revisarLogros(st); });
  GM.bus.on('copa:fin', ({ campeon }) => { const st = GM.state; if (!act(st) || !YO(st).equipoId || campeon !== YO(st).equipoId) return; const L = datos(st).logros; L.titulosExtra = (L.titulosExtra || 0) + 1; revisarLogros(st); });
  // Contactos nuevos en el móvil
  if (GM.mods.movil) Object.assign(GM.mods.movil.CONTACTOS, {
    medico: st => ['Servicios médicos del ' + ((st.equipos[YO(st).equipoId] || {}).siglas || 'club'), 'Médicos'],
    capitan: st => { const k = C(st).social && C(st).social.contactos.find(x => x.tipo === 'mentor'); return [k ? k.nombre : 'El capitán', 'Capitán']; },
    rival: st => { const k = C(st).social && C(st).social.contactos.find(x => x.tipo === 'rival'); return [k ? k.nombre : 'Tu rival', 'Rival por el puesto']; }
  });
  function selfTest() { return LOGROS.length >= 20 && Object.keys(TIPOS_POST).length === 7 && typeof decidir === 'function'; }
  GM.register('vida', { accionesCasaPueblo, datos, vestuario, decidir, redes, publicar, TIPOS_POST, familia, logros, retos, ofertasRetiro, elegirRetiro, comentar, mascota, adoptar, jugarMascota, ponerMascota, moverMascota, vitrina, fisioSesion, hablarVestuario, LOGROS, selfTest });
})();
