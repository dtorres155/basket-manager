/* Pantalla «Mi día» (punto 58): pestaña de Ciudad (modo carrera) con energía, comida, ánimo y tiempo libre, el plan del día en cuatro bloques (por defecto y para mañana), y los interruptores de la rutina y de los chips del mundo 3D.
   Es opcional: con la rutina desactivada el juego no cambia. */
(function () {
  const { addTab, U, chip, h, refrescar, seccion, ui, barra } = GM.ui._;
  function tab(el, st) {
    const R = GM.rutina, r = R.estado(st), c = st.carrera; if (!r) return; const sel = (valor, fn) => h('select', { class: 'sel', onchange: e => { fn(e.target.value); refrescar(); } }, Object.keys(R.ACTIVIDADES).map(k => h('option', { value: k, selected: valor === k }, R.ACTIVIDADES[k].n)));
    el.append(seccion('Mi día', h('div', { class: 'tarjeta' }, h('p', { class: 'muted' }, 'Es opcional y suave: si la ignoras, el día sigue un plan razonable y el juego no cambia casi nada. Si la cuidas, rindes y te sientes mejor.'),
      h('div', { class: 'par' }, h('button', { class: 'btn peq' + (r.activa ? '' : ' btn-sec'), onclick: () => { R.activar(st); refrescar(); } }, r.activa ? 'Rutina activada' : 'Rutina desactivada'), h('button', { class: 'btn peq' + (r.hud ? '' : ' btn-sec'), onclick: () => { r.hud = !r.hud; refrescar(); } }, r.hud ? 'Chips en el mundo: sí' : 'Chips en el mundo: no')),
      h('span', { class: 'muted' }, 'Energía ' + Math.round(r.energia)), barra(r.energia, 100, r.energia >= 50 ? 'verde' : r.energia >= 25 ? '' : 'rojo'), h('span', { class: 'muted' }, 'Comida ' + Math.round(r.hambre)), barra(r.hambre, 100, r.hambre >= 50 ? 'verde' : r.hambre >= 25 ? '' : 'rojo'),
      h('span', { class: 'muted' }, 'Ánimo ' + Math.round(c.moral)), barra(c.moral, 100, c.moral >= 60 ? 'verde' : c.moral >= 35 ? '' : 'rojo'), h('div', { class: 'chips' }, chip('Tiempo libre disfrutado: ' + r.libre + ' bloques')))));
    el.append(seccion('Plan de cada día', h('div', { class: 'tarjeta' }, R.BLOQUES.map((b, i) => h('div', { class: 'fila' }, h('span', null, b), sel(r.plan[i], v => R.fijarBloque(st, i, v)))), h('p', { class: 'muted' }, 'Los días de partido, entrenar es jugar. Comer, descansar, el ocio y la familia recuperan; entrenar y trabajar en tus negocios gastan energía.'))));
    const m = U.addDays(st.fecha, 1), pm = R.planDe(st, m); el.append(seccion('Mañana (' + U.fecha(m) + ')', h('div', { class: 'tarjeta' }, R.BLOQUES.map((b, i) => h('div', { class: 'fila' }, h('span', null, b), sel(pm[i], v => R.fijarBloque(st, i, v, m)))))));
    el.append(seccion('Últimos días', h('div', { class: 'lista' }, r.hist.length ? r.hist.slice(0, 7).map(x => h('div', { class: 'item' }, h('div', { class: 'ct' }, h('b', null, U.fecha(x.f)), h('span', { class: 'muted' }, x.plan.split(',').map(k => R.ACTIVIDADES[k].n).join(', '))), h('span', null, 'E ' + x.e + ' C ' + x.h))) : h('p', { class: 'muted' }, 'Todavía no hay días registrados.'))));
  }
  addTab('ciudad', 'rutina', 'Mi día', tab, st => st.modo === 'carrera' && !!st.carrera && !!GM.rutina);
})();
