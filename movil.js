/* TU MÓVIL (GM.mods.movil) — modo carrera: chats con tu representante, el entrenador, el club, la prensa, la peña, tu familia,
   tus amigos y tu pareja. Llegan mensajes con decisiones que puedes aceptar o ignorar (si no contestas en 5 días, cuenta como ignorar):
   - las decisiones personales de carrera.js (cada evento pendiente llega como mensaje de quien lo propone y se contesta desde aquí),
   - planes de tus amigos (una fiesta: aceptar es el plan de estilo.js; ignorarla suma un poco de profesionalidad),
   - patrocinios según tu imagen (estilo.js), entrevistas de la prensa,
   - y mensajes sin decisión: la familia tras un partidazo o una derrota, la peña tras ganar, avisos del club y del entrenador.
   Estado: state.carrera.movil = { chats: [{ id, nombre, rol, msgs: [{ n, de: 'el'|'yo', t, fecha, ops?, dec?, estado?, leido }] }], n, espejo: {} }
   (se crea al usarse). Expone: enviar(st, quien, texto, decision), chats(st), chat(st, id), leer(st, id), contestar(st, chatId, n, i),
   noLeidos(st), CONTACTOS, selfTest. */
(function () {
  const U = GM.util, C = st => st.carrera, YO = st => st.jugadores.yo;
  const act = st => !!st && st.modo === 'carrera' && !!st.carrera && st.carrera.fase !== 'retirado';
  const DATOS = st => C(st).movil || (C(st).movil = { chats: [], n: 0, espejo: {} });
  // Contactos fijos (el nombre puede depender del club o de tu vida social)
  const CONTACTOS = {
    agente: st => ['Tu representante', 'Representante'],
    entrenador: st => ['Entrenador', 'Entrenador del ' + (st.equipos[YO(st).equipoId] || { siglas: 'equipo' }).siglas],
    club: st => [(st.equipos[YO(st).equipoId] || { nombre: 'El club' }).nombre, 'Comunicación del club'],
    prensa: st => ['Diario de ' + (st.equipos[YO(st).equipoId] || { ciudad: 'la ciudad' }).ciudad, 'Prensa'],
    pena: st => ['Peña ' + (st.equipos[YO(st).equipoId] || { siglas: '' }).siglas, 'Aficionados'],
    familia: st => ['Familia', 'Grupo familiar'],
    amigos: st => ['Los de siempre', 'Grupo de amigos'],
    pareja: st => { const s = C(st).social, k = s && s.contactos && s.contactos.find(x => x.tipo === 'pareja'); return [k ? k.nombre : 'Pareja', 'Pareja']; }
  };
  // Las decisiones personales: quién las propone en carrera.js -> chat
  const DE_EVENTO = q => /represent|agente|inmobiliaria/i.test(q) ? 'agente' : /entrenador|veterano|preparador|selecc/i.test(q) ? 'entrenador' : /comunicaci|fundaci/i.test(q) ? 'club' : 'agente';
  function chatDe(st, id) {
    const D = DATOS(st); let c = D.chats.find(x => x.id === id);
    if (!c) { const [nombre, rol] = (CONTACTOS[id] || (() => [id, '']))(st); c = { id, nombre, rol, msgs: [] }; D.chats.push(c); }
    return c;
  }
  // dec: { tipo: 'evento'|'plan'|'patrocinio'|'entrevista', ... } -> el mensaje lleva opciones
  function opciones(st, dec) {
    if (!dec) return null;
    if (dec.tipo === 'evento') { const e = GM.mods.carrera.eventos(st).find(x => x.id === dec.id); return e ? e.opciones.map(o => ({ t: o.t, d: o.d, i: o.i })) : null; }
    if (dec.tipo === 'plan') return [{ t: '¡Me apunto!', d: 'Plan de fiesta (más rebelde).' }, { t: 'Hoy no, que mañana entreno', d: 'Un poco más profesional.' }];
    if (dec.tipo === 'patrocinio') return [{ t: 'Firmar', d: '+' + dec.dinero + ' mil €.' }, { t: 'No me interesa', d: 'Sin cambios.' }];
    if (dec.tipo === 'vida') return dec.ops;
    if (dec.tipo === 'entrevista') return [{ t: 'Atenderles', d: 'Un poco de fama, imagen de profesional.' }, { t: 'No contestar', d: 'Morbo y algo más de rebeldía.' }];
    return null;
  }
  function enviar(st, quien, texto, dec) {
    if (!act(st)) return null; const D = DATOS(st), c = chatDe(st, quien), ops = opciones(st, dec);
    const m = { n: ++D.n, de: 'el', t: texto, fecha: st.fecha, leido: false }; if (ops) { m.ops = ops; m.dec = dec; m.estado = 'pendiente'; }
    c.msgs.push(m); if (c.msgs.length > 40) c.msgs.splice(0, c.msgs.length - 40);
    return m;
  }
  function contestar(st, chatId, n, i) {
    const c = DATOS(st).chats.find(x => x.id === chatId), m = c && c.msgs.find(x => x.n === n);
    if (!m || m.estado !== 'pendiente' || !m.ops || !m.ops[i]) return { ok: false, motivo: 'Ya no se puede contestar.' };
    const d = m.dec, out = []; let r = { ok: true };
    if (d.tipo === 'evento') { r = GM.mods.carrera.elegirEvento(st, d.id, m.ops[i].i !== undefined ? m.ops[i].i : i); if (r.ok) out.push.apply(out, r.efectos || []); }
    else if (d.tipo === 'plan') { if (i === 0) { r = GM.mods.estilo.hacer(st, d.plan); if (r.ok) out.push.apply(out, r.efectos); } else GM.mods.estilo.mover(st, 2, 'Rechazas una fiesta'); }
    else if (d.tipo === 'patrocinio') { if (i === 0) { const k = C(st); k.dinero += d.dinero; k.fama = k.fama + d.fama; GM.mods.estilo.mover(st, d.dv, 'Patrocinio'); out.push('+' + d.dinero + ' mil €'); k.hitos.unshift({ fecha: st.fecha, texto: 'Firmas un patrocinio de ' + d.dinero + ' mil €.' }); } }
    else if (d.tipo === 'vida') { r = GM.mods.vida.decidir(st, d, i); if (r.ok) out.push.apply(out, r.efectos || []); }
    else if (d.tipo === 'entrevista') { if (i === 0) { C(st).fama = C(st).fama + 0.5; GM.mods.estilo.mover(st, 2, 'Atiendes a la prensa'); out.push('reputación +'); } else { C(st).fama = C(st).fama + 0.3; GM.mods.estilo.mover(st, -3, 'No contestas a la prensa'); } }
    if (!r.ok) return r;
    m.estado = 'respondido'; m.eleccion = i; c.msgs.push({ n: ++DATOS(st).n, de: 'yo', t: m.ops[i].t, fecha: st.fecha, leido: true });
    return { ok: true, efectos: out };
  }
  // Ignorar: a los 5 días el mensaje caduca (las fiestas rechazadas por silencio también cuentan como «profesional»)
  function caducar(st) {
    DATOS(st).chats.forEach(c => c.msgs.forEach(m => {
      if (m.estado !== 'pendiente') return;
      if (m.dec.tipo === 'evento' && !C(st).pend.some(p => p.id === m.dec.id)) { m.estado = 'respondido'; return; }   // contestado en otra pantalla
      if (m.dec.tipo !== 'evento' && U.diffDays(m.fecha, st.fecha) >= 5) { m.estado = 'ignorado'; if (m.dec.tipo === 'vida' && GM.mods.vida) GM.mods.vida.decidir(st, m.dec, m.dec.def === undefined ? -1 : m.dec.def); if (m.dec.tipo === 'plan') GM.mods.estilo.mover(st, 1, 'Te quedas en casa en vez de salir'); }
    }));
  }
  // Las decisiones de carrera.js pendientes llegan como mensajes (una vez cada una)
  function espejo(st) {
    const D = DATOS(st);
    GM.mods.carrera.eventos(st).forEach(e => { const k = e.id + '@' + (C(st).pend.find(p => p.id === e.id) || {}).fecha; if (D.espejo[k]) return; D.espejo[k] = 1; enviar(st, DE_EVENTO(e.quien), e.titulo + '. ' + e.texto, { tipo: 'evento', id: e.id }); });
  }
  function chats(st) {
    if (!act(st)) return []; espejo(st); caducar(st);
    return DATOS(st).chats.map(c => { const u = c.msgs[c.msgs.length - 1]; return { id: c.id, nombre: c.nombre, rol: c.rol, ultimo: u ? u.t : '', fecha: u ? u.fecha : '', noLeidos: c.msgs.filter(m => !m.leido).length, pendientes: c.msgs.filter(m => m.estado === 'pendiente').length }; })
      .sort((a, b) => (b.fecha > a.fecha ? 1 : b.fecha < a.fecha ? -1 : 0));
  }
  function chat(st, id) { const c = DATOS(st).chats.find(x => x.id === id); return c ? c.msgs.slice() : []; }
  function leer(st, id) { const c = DATOS(st).chats.find(x => x.id === id); if (c) c.msgs.forEach(m => { m.leido = true; }); }
  function noLeidos(st) { if (!act(st)) return 0; espejo(st); return DATOS(st).chats.reduce((s, c) => s + c.msgs.filter(m => !m.leido).length, 0); }
  // Mensajes de la vida: partidos, semana y bienvenida
  GM.bus.on('partido:jugado', ({ partido: g }) => {
    const st = GM.state; if (!act(st) || !g.resultado) return; const p = YO(st), s = g.resultado.stats && g.resultado.stats.yo; if (!s || !s.min) return;
    const gana = (g.local === p.equipoId) === (g.resultado.local > g.resultado.visitante), riv = st.equipos[g.local === p.equipoId ? g.visitante : g.local], r = GM.rng.next();
    if (s.pts >= 20) enviar(st, 'familia', ['¡¡' + s.pts + ' puntos!! Tu abuela ha llamado a medio pueblo.', '¡Qué partidazo! Te hemos visto todos en el bar.', s.pts + ' puntos contra el ' + riv.siglas + '. Estamos orgullosísimos.'][GM.rng.int(0, 2)]);
    else if (!gana && r < 0.25) enviar(st, 'familia', ['Ánimo, que habrá más partidos. ¿Vienes a comer el domingo?', 'No pasa nada, cariño. Descansa.', 'Hoy no ha salido, mañana será otro día.'][GM.rng.int(0, 2)]);
    else if (gana && r < 0.2) enviar(st, 'pena', ['¡Victoria! Esta noche lo celebramos en la peña.', '¡Vamos! Se ha notado tu energía en la pista.', 'Ganar al ' + riv.siglas + ' sabe a gloria.'][GM.rng.int(0, 2)]);
    else if (s.pts >= 12 && r < 0.3) enviar(st, 'amigos', ['Buen partido, crack.', 'Ese triple del tercer cuarto, ¡madre mía!', 'Te debemos una cena por lo de hoy.'][GM.rng.int(0, 2)]);
  });
  GM.bus.on('dia:avanzado', () => {
    const st = GM.state; if (!act(st)) return; const D = DATOS(st);
    if (!D.bienvenida) { D.bienvenida = true; enviar(st, 'agente', 'Te escribo por aquí a partir de ahora: ofertas, patrocinios y lo que haga falta. Contesta cuando puedas.'); enviar(st, 'familia', 'Mucha suerte en esta temporada. Llámanos de vez en cuando.'); }
    espejo(st); caducar(st);
    if (U.weekday(st.fecha) !== 3) return;   // los miércoles, algo de vida
    const r = GM.rng.next(), es = GM.mods.estilo && GM.mods.estilo.estado(st);
    if (r < 0.18) enviar(st, 'prensa', '¿Nos atiendes cinco minutos para una entrevista sobre el próximo partido?', { tipo: 'entrevista' });
    else if (r < 0.32 && (!es || es.v > -25)) enviar(st, 'amigos', ['Este finde hay fiesta en casa de Álex. ¿Vienes?', '¿Salimos el viernes? Hace mil que no te vemos.'][GM.rng.int(0, 1)], { tipo: 'plan', plan: 'fiesta' });
    else if (r < 0.4) enviar(st, 'familia', ['¿Cómo estás? Ya nos contarás qué tal los entrenos.', 'Te mandamos un táper de croquetas con el autobús.', 'Tu primo dice que quiere ser jugador como tú.'][GM.rng.int(0, 2)]);
  });
  function selfTest() { return Object.keys(CONTACTOS).length >= 8 && typeof DE_EVENTO('Tu representante') === 'string' && DE_EVENTO('Entrenador') === 'entrenador'; }
  GM.register('movil', { enviar, chats, chat, leer, contestar, noLeidos, CONTACTOS, selfTest });
})();
