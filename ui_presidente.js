/* INTERFAZ: Pantallas del presidente: legado y directiva.
   Separado de ui.js. Usa las utilidades del núcleo de la interfaz a través de GM.ui._ (ver ui.js). */
(function () {
  const { registerScreen, M, POSN, U, aviso, barra, chip, clsOvr, h, refrescar, seccion, toast } = GM.ui._;
  // ---------- Pantalla: Ciudad ----------
  function medidor(t, v, desc) { return h('div', { class: 'medidor' }, h('div', { class: 'fila' }, h('b', null, t), h('b', null, Math.round(v))), barra(v, 100, v >= 60 ? 'verde' : v >= 35 ? 'ambar' : 'rojo'), h('span', { class: 'muted' }, desc)); }
  function citaVoz(v, texto) { return v ? h('div', { class: 'cita' }, h('span', { class: 'avatar' }, v.nombre.charAt(0)), h('div', { class: 'ct' }, h('b', null, v.nombre), h('span', { class: 'rol' }, v.rol), h('p', { class: 'dicho' }, '«' + texto + '»'))) : null; }
  function legadoPantalla(el, st) {
    const Lg = M().legado, L = st.legado; if (!L) { el.append(aviso('El Legado solo existe en el modo Presidente.', 'med')); return; }
    const niv = { 1: 'Prioridad baja', 2: 'Prioridad media', 3: 'Prioridad alta' };
    el.append(seccion('Alma del club', h('div', { class: 'tarjeta' }, medidor('Alma', L.alma, 'Cuánto se parece el club a lo que quieres que sea.'), medidor('Influencia', L.influencia, 'Sirve para vetar, acelerar obras o cambiar al entrenador. Se recupera cada semana.'),
      h('div', { class: 'chips' }, Lg.pilares(st).map(p => chip(p.nombre + ', ' + niv[p.nivel], p.nivel === 3 ? 'ok' : ''))))));
    const dl = Lg.dilemas(st);
    el.append(seccion('Decisiones pendientes', dl.length ? dl.map(d => h('div', { class: 'tarjeta' }, h('b', null, d.titulo), citaVoz(d.voz, d.cita), h('p', null, d.texto),
      h('div', { class: 'lista' }, d.opciones.map(o => h('button', { class: 'btn btn-sec', style: { flexDirection: 'column', alignItems: 'flex-start' }, onclick: () => { const r = Lg.resolver(st, d.id, o.i); if (!r.ok) toast(r.motivo); else { toast(r.efectos.length ? r.efectos.join(', ') : 'Decisión tomada'); refrescar(); } } }, h('span', null, o.t), h('span', { class: 'muted', style: { textTransform: 'none', fontFamily: 'var(--fb)', fontSize: '12px', fontWeight: 400 } }, o.d)))))) : h('p', { class: 'muted' }, 'Nada pendiente. Las decisiones llegan con el tiempo.')));
    const m = L.mandato.ultima;
    el.append(seccion('Mandato', h('div', { class: 'tarjeta' }, h('p', null, m ? 'Últimas elecciones (' + m.temporada + '): ' + (m.gana ? 'mandato renovado' : 'mandato debilitado') + ' con un apoyo estimado del ' + m.score + ' %.' : 'Aún no ha habido elecciones de socios.'), h('p', { class: 'muted' }, 'Las elecciones se celebran cada dos temporadas.'))));
    const sh = Lg.salaHistoria(st);
    el.append(seccion('Sala de historia', h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, 'Títulos'), h('b', null, sh.titulos)),
      h('div', { class: 'chips' }, sh.camisetas.length ? sh.camisetas.map(c => chip('Dorsal ' + c.numero + ' retirado (' + c.temporada + ')', 'ok')) : [h('span', { class: 'muted' }, 'Sin camisetas retiradas')])), h('div', { class: 'lista' }, sh.hitos.slice(0, 20).map(x => h('div', { class: 'item' }, h('span', { class: 'muted f' }, x.temporada.slice(2)), h('span', { class: 'ct' }, x.texto))))));
  }
  function directivaPantalla(el, st) {
    const D = M().directiva, d = D.estado(st), L = st.legado; if (!d) { el.append(aviso('La Directiva solo existe en el modo Presidente.', 'med')); return; }
    const per = D.PERFILES;
    el.append(seccion('Equipo directivo', h('div', { class: 'tarjeta' },
      h('div', { class: 'fila' }, h('div', { class: 'ct' }, h('b', null, 'Entrenador, ' + d.entrenador.nombre), h('span', { class: 'muted' }, per[d.entrenador.perfil])), h('button', { class: 'btn btn-sec peq', onclick: () => { const r = D.cambiarEntrenador(st); if (!r.ok) toast(r.motivo); else { toast('Nuevo entrenador'); refrescar(); } } }, 'Cambiar, 40')),
      h('div', { class: 'ct', style: { marginTop: '8px' } }, h('b', null, 'Director deportivo, ' + d.director.nombre), h('span', { class: 'muted' }, per[d.director.perfil])),
      h('p', { class: 'muted' }, 'Influencia disponible: ' + Math.round(L.influencia)))));
    const pend = D.pendientes(st);
    el.append(seccion('Propuestas de la directiva', pend.length ? h('div', { class: 'lista' }, pend.map(p => { const j = st.jugadores[p.jugadorId]; return h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, 'Fichar a ' + j.nombre), h('span', { class: 'ovr ' + clsOvr(j.ovr) }, j.ovr)),
      p.cita ? citaVoz({ nombre: d.director.nombre, rol: 'Director deportivo' }, p.cita) : null, h('p', { class: 'muted' }, POSN[j.pos] + ', ' + j.edad + ' años, potencial ' + j.pot + ', ' + U.eur(p.salario) + '/año, ' + p.anos + (p.anos === 1 ? ' temporada' : ' temporadas') + ', se firma el ' + U.fecha(p.ejecutaEn)),
      h('div', { class: 'par' }, h('button', { class: 'btn btn-sec', onclick: () => { const r = D.vetar(st, p.id); if (!r.ok) toast(r.motivo); else { toast('Fichaje vetado'); refrescar(); } } }, 'Vetar, 15'), h('button', { class: 'btn', onclick: () => { const r = D.aprobar(st, p.id); toast(r.ok ? 'Fichaje cerrado' : (r.motivo || 'No ha podido fichar')); refrescar(); } }, 'Aprobar ya'))); })) : h('p', { class: 'muted' }, 'Sin propuestas ahora mismo. Si no vetas, se firman a los 3 días.')));
    const obras = [], inst = st.instalaciones[st.clubId];
    (inst.ciudadDeportiva ? inst.ciudadDeportiva.edificios.filter(b => b.obra).map(b => ({ tipo: 'cd', ref: b.slot, nombre: b.tipo, fin: b.obra.fin })) : []).forEach(o => obras.push(o));
    inst.pabellon.obras.forEach(o => obras.push({ tipo: 'est', ref: o.id, nombre: 'Pabellón: ' + o.id, fin: o.fin }));
    el.append(seccion('Obras en marcha', obras.length ? h('div', { class: 'lista' }, obras.map(o => h('div', { class: 'item' }, h('div', { class: 'ct' }, h('b', null, o.nombre), h('span', { class: 'muted' }, 'Termina el ' + U.fecha(o.fin))), h('button', { class: 'btn peq', onclick: () => { const r = D.impulsarObra(st, o.tipo, o.ref); if (!r.ok) toast(r.motivo); else { toast('Obra acelerada'); refrescar(); } } }, 'Acelerar, 25')))) : h('p', { class: 'muted' }, 'No hay obras. Puedes iniciarlas en Club.')));
    el.append(seccion('Registro', h('div', { class: 'lista' }, d.registro.slice(0, 10).map(r => h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(r.fecha)), h('span', { class: 'ct' }, r.texto))))));
  }
  Object.assign(GM.ui._, { medidor, citaVoz, legadoPantalla, directivaPantalla });
  registerScreen('legado', { titulo: 'Legado', icono: 'trofeo', render: legadoPantalla });
  registerScreen('directiva', { titulo: 'Directiva', icono: 'dir', render: directivaPantalla });
})();
