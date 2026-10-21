/* Pantalla del punto 64: pestaña «Pizarra» en Plantilla (modos gestor y entrenador): preparar el próximo partido con una pulsación, libro de jugadas con su dominio, emparejamientos, minutos objetivo,
   química de parejas y quintetos y análisis avanzado (+/-, +/- por 40, valoración por 36). Usa GM.tacticaPlus y las utilidades de GM.ui._. */
(function () {
  const { addTab, U, h, refrescar, seccion, toast, barra, clip, eq } = GM.ui._;
  const T = () => GM.tacticaPlus, P = () => GM.mods.partidos, nombre = (st, id) => (st.jugadores[id] ? st.jugadores[id].nombre : id);
  const sig = st => (st.calendario || []).filter(g => !g.resultado && (g.local === st.clubId || g.visitante === st.clubId) && g.fecha >= st.fecha).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))[0] || null;
  function tab(el, st) {
    const z = T().est(st), q = P().tacticaValida(st, st.clubId).quinteto, propios = st.equipos[st.clubId].plantilla.map(i => st.jugadores[i]).filter(Boolean).sort((a, b) => b.ovr - a.ovr), g = sig(st), rid = g ? (g.local === st.clubId ? g.visitante : g.local) : null;
    const rivales = rid ? st.equipos[rid].plantilla.map(i => st.jugadores[i]).filter(Boolean).sort((a, b) => b.ovr - a.ovr).slice(0, 8) : [], an = T().analitica(st, st.clubId);
    const sel = (v, ops, fn) => h('select', { class: 'sel', onchange: e => { fn(e.target.value); refrescar(); } }, ops.map(([k, t]) => h('option', { value: k, selected: String(v) === String(k) }, t)));
    // ---- Preparar el partido
    if (rid) {
      const r = T().recomendar(st, rid), prep = z.prep && z.prep.rival === rid && z.prep.fecha >= U.addDays(st.fecha, -7);
      el.append(seccion('Próximo partido: ' + eq(rid).nombre, h('div', { class: 'tarjeta' }, h('p', { class: 'muted' }, U.fecha(g.fecha) + (g.local === st.clubId ? ', en casa' : ', fuera') + '. Prepararlo elige las jugadas que mejor encajan con tu quinteto y reparte tus mejores defensores sobre los tres mejores rivales.'),
        h('ul', null, r.razones.map(t => h('li', null, t))), h('button', { class: 'btn', onclick: () => { const o = T().preparar(st, rid); toast(o.ok ? 'Partido preparado' : o.motivo); refrescar(); } }, prep ? 'Volver a preparar' : 'Preparar el partido'), prep ? h('span', { class: 'chip ok' }, 'Preparado el ' + U.fecha(z.prep.fecha)) : null)));
    }
    // ---- Libro de jugadas
    const lib = z.libro.slice(); while (lib.length < 3) lib.push(null);
    el.append(seccion('Libro de jugadas', h('div', { class: 'tarjeta' }, h('p', { class: 'muted' }, 'Hasta tres jugadas. Se juegan en más de la mitad de las posesiones; cada una rinde según los jugadores en pista (idoneidad) y lo que la hayáis trabajado (dominio, sube cada lunes). Si repites siempre lo mismo, los rivales se adaptan.'),
      lib.map((x, i) => h('div', { class: 'par' }, sel(x ? x.id : '', [['', 'Sin jugada']].concat(Object.keys(T().JUGADAS).map(k => [k, T().JUGADAS[k].n])), v => { const nuevo = z.libro.filter((y, j) => j !== i); if (v) nuevo.splice(Math.min(i, nuevo.length), 0, { id: v, w: x ? x.w : 2 }); const o = T().fijarLibro(st, nuevo); if (!o.ok) toast(o.motivo); }), x ? sel(x.w, [[1, 'Poca frecuencia'], [2, 'Normal'], [3, 'Frecuente'], [5, 'Muy frecuente']], v => { x.w = +v; }) : null)),
      h('div', { class: 'lista' }, Object.keys(T().JUGADAS).map(k => { const J = T().JUGADAS[k], d = Math.round(T().dominio(st, k)), id = T().idoneidad(st, k, q); return h('div', { class: 'item' }, h('div', { class: 'ct' }, h('b', null, J.n + (z.libro.some(y => y.id === k) ? ' ✓' : '')), h('span', { class: 'muted' }, J.d), h('div', null, h('span', { class: 'muted' }, 'Dominio ' + d + ' %'), barra(d, 100, ''), h('span', { class: 'muted' }, 'Idoneidad con tu quinteto ' + Math.round(id * 100) + ' %'), barra(id * 100, 100, id < 0.3 ? 'mal' : ''), z.vistas[k] > 1 ? h('span', { class: 'chip med' }, 'El rival ya la conoce') : null))); })))));
    // ---- Emparejamientos
    if (rivales.length) el.append(seccion('Emparejamientos', h('div', { class: 'tarjeta' }, h('p', { class: 'muted' }, 'Quién marca a quién. Un buen defensor sobre la estrella rival le baja el acierto, pero deja a sus compañeros con un defensor menos.'),
      q.map(i => st.jugadores[i]).filter(Boolean).map(p => h('div', { class: 'fila' }, h('span', null, p.nombre + ' (defensa ' + Math.round((p.att.defPer + p.att.defInt) / 2) + ')'), sel(z.emp[p.id] || '', [['', 'Defensa en bloque']].concat(rivales.map(r => [r.id, r.nombre + ' (' + r.pos + ', ' + r.ovr + ')'])), v => { T().fijarEmparejamiento(st, p.id, v || null); }))))));
    // ---- Minutos objetivo
    const tot = propios.reduce((s, p) => s + (z.minutos[p.id] || 0), 0), fijos = propios.filter(p => z.minutos[p.id] !== undefined).length;
    el.append(seccion('Minutos objetivo', h('div', { class: 'tarjeta' }, h('p', { class: 'muted' }, 'Fija los minutos que quieres para un jugador (de 0 a 40); el resto se reparte lo que queda. Total fijado: ' + tot + ' min en ' + fijos + ' jugadores (hay 200 en juego).'),
      propios.map(p => h('div', { class: 'fila' }, h('span', null, p.nombre + ' (' + p.pos + ', ' + p.ovr + ')' + (p.estado.lesion ? ' lesionado' : '')), h('input', { class: 'sel', type: 'number', min: 0, max: 40, placeholder: 'auto', value: z.minutos[p.id] !== undefined ? z.minutos[p.id] : '', style: { width: '72px' }, onchange: e => { T().fijarMinutos(st, p.id, e.target.value === '' ? null : e.target.value); refrescar(); } }))))));
    // ---- Química
    const Q = st.quimica || { pares: {}, quintetos: {} }, mejores = T().mejoresQuintetos(st, 5);
    el.append(seccion('Química del equipo', h('div', { class: 'tarjeta' }, h('p', null, 'Tu quinteto titular: química ' + T().quimicaQuinteto(st, q) + ' de 100. Con más minutos juntos y saldo positivo sube; un quinteto sin rodaje rinde algo menos.'), barra(T().quimicaQuinteto(st, q), 100, ''),
      h('b', null, 'Mejores quintetos' + (an < 2 ? ' (necesitas el departamento de datos de nivel 2 para ver el detalle)' : '')), an >= 2 && mejores.length ? mejores.map(x => h('div', { class: 'fila' }, h('span', null, x.ids.map(i => nombre(st, i).split(' ').slice(-1)[0]).join(', ')), h('b', null, (x.pm >= 0 ? '+' : '') + x.pm + ' en ' + x.min + ' min, química ' + x.quim))) : h('p', { class: 'muted' }, an < 2 ? 'Mejora la analítica del club (Club, Árbol de mejoras).' : 'Aún no hay quintetos con más de 15 minutos.'))));
    // ---- Análisis avanzado
    const tabla = T().tablaAvanzada(st);
    el.append(seccion('Análisis avanzado', tabla.length ? h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, 'Jugador'), h('b', null, 'min  +/-  +/-40  val/36')), tabla.map(x => h('div', { class: 'fila' }, h('span', null, clip(x.nombre, 24)), h('span', null, x.min + '   ' + (x.pm >= 0 ? '+' : '') + x.pm + '   ' + (x.pm40 >= 0 ? '+' : '') + x.pm40 + '   ' + x.val36)))) : h('p', { class: 'muted' }, 'Aparece cuando se hayan jugado partidos.')));
  }
  addTab('plantilla', 'pizarra', 'Pizarra', tab, st => !!GM.tacticaPlus && (st.modo === 'gestor' || st.modo === 'entrenador'));
})();
