/* INTERFAZ: Pantalla del entrenador: la junta directiva.
   Separado de ui.js. Usa las utilidades del núcleo de la interfaz a través de GM.ui._ (ver ui.js). */
(function () {
  const { registerScreen, M, U, barra, chip, clsOvr, eq, escudo, h, modal, refrescar, seccion, toast, ui } = GM.ui._;
  function juntaPantalla(el, st) {
    const E = M().entrenador, c = st.entrenador, r = E.rango(st);
    el.append(seccion('Tu situación', h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, 'Confianza de la directiva'), h('b', null, Math.round(c.confianza) + ' %')), barra(c.confianza, 100, c.confianza >= 55 ? 'verde' : c.confianza >= 30 ? 'ambar' : 'rojo'),
      h('div', { class: 'fila' }, h('b', null, 'Reputación'), h('b', null, Math.round(c.reputacion))), barra(c.reputacion, 100, 'verde'), c.fase === 'activo' ? [h('p', null, 'Objetivo: ' + c.objetivo.txt + '.'), r ? h('p', { class: 'muted' }, 'Posición actual: ' + r.puesto + 'º de ' + r.de + '.') : null] : h('p', { class: 'aviso mal' }, 'Estás sin equipo.'))));
    GM.ui._.eventosCards(el, st);
    if (c.ofertas.length) el.append(seccion('Ofertas', h('div', { class: 'lista' }, c.ofertas.map(o => h('button', { class: 'item', onclick: () => modal(h('div', null, h('div', { class: 'fila' }, h('h3', null, eq(o.clubId).nombre), escudo(o.clubId, true)), h('p', { class: 'muted' }, o.tipo + ', ' + E.NOMLIGA[o.liga] + ', ' + o.anos + (o.anos === 1 ? ' temporada' : ' temporadas')), h('p', null, o.nota), h('p', null, 'Objetivo: ' + o.obj.txt + '.'), h('p', { class: 'muted' }, 'Nivel del equipo: ' + Math.round(M().partidos.ovrEquipo(st, o.clubId)))),
        [{ t: 'Aceptar', fn: () => { const x = E.aceptar(st, o.id); if (!x.ok) { toast(x.motivo); return false; } ui.comp = null; refrescar(true); toast('Contrato firmado'); } }, { t: 'Cerrar', cls: 'btn-sec' }]) }, escudo(o.clubId), h('div', { class: 'ct' }, h('b', null, eq(o.clubId).nombre), h('span', { class: 'muted' }, o.tipo + ', ' + E.NOMLIGA[o.liga] + ', ' + o.obj.txt)), o.tipo === 'Ascenso' ? chip('Ascenso', 'ok') : o.tipo === 'Renovación' ? chip('Renovar') : null)))));
    if (c.fase !== 'activo') return;
    el.append(seccion('Pedir un fichaje', h('div', { class: 'tarjeta' }, h('p', { class: 'muted' }, 'La directiva decide. Cada petición gasta confianza: te quedan ' + Math.floor(c.peticiones) + '.'),
      h('div', { class: 'lista' }, E.candidatosFichaje(st).slice(0, 8).map(p => h('div', { class: 'item' }, h('span', { class: 'pos' }, p.pos), h('span', { class: 'ct' }, h('b', null, p.nombre), h('span', { class: 'muted' }, p.edad + ' años, pot. ' + p.pot + (p.libre ? ', libre' : ', ' + p.club + ', ' + U.eur(p.precio)))), h('span', { class: 'ovr ' + clsOvr(p.ovr) }, p.ovr), h('button', { class: 'btn peq', onclick: () => { const x = E.pedirFichaje(st, p.id); toast(x.ok ? 'La directiva ficha a ' + p.nombre : x.motivo); refrescar(); } }, 'Pedir')))))));
    el.append(seccion('Cuerpo técnico', h('div', { class: 'lista' }, Object.keys(E.AYUDANTES).map(k => { const a = E.AYUDANTES[k], n = c.ayudantes[k]; return h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, a.etq), chip(E.NIVELES[n], n ? 'ok' : '')), h('span', { class: 'muted' }, a.desc), n < 3 ? h('button', { class: 'btn peq', onclick: () => { const x = E.contratar(st, k); toast(x.ok ? 'Fichado' : x.motivo); refrescar(); } }, (n ? 'Mejorar' : 'Contratar') + ', ' + (a.coste * (n + 1)) + ' mil €') : null); }))));
  }
  Object.assign(GM.ui._, { juntaPantalla });
  registerScreen('junta', { titulo: 'Directiva', icono: 'dir', render: juntaPantalla });
})();
