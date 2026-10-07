/* INTERFAZ: Pantalla Ciudad: resumen, mapa 3D, afición, identidad, casa, vivienda, estilo de vida y vida social.
   Separado de ui.js. Usa las utilidades del núcleo de la interfaz a través de GM.ui._ (ver ui.js). */
(function () {
  const { registerScreen, M, S, U, aviso, barra, carrera, cerrarModales, chip, desmontar, entr, eq, h, modal, navegar, pestanas, refrescar, seccion, toast, ui } = GM.ui._;
  function ciudadResumen(el, st) {
    const Cc = M().ciudad, club = st.clubId, c = st.ciudad[club], p = Cc.perfil(st, club), mod = Cc.modificadores(st, club);
    el.append(seccion(p.municipio, h('p', null, p.texto)));
    el.append(seccion('Cómo te ve la ciudad', GM.ui._.medidor('Ambiente', c.ambiente, 'El ruido de tu pabellón. Sube con victorias y eventos.'), GM.ui._.medidor('Afición', c.aficion, 'Abonados, peñas y camisetas.'), GM.ui._.medidor(p.ayuntamiento, c.apoyoAyuntamiento, 'Licencias, ayudas y permisos para obras.'),
      h('div', { class: 'chips' }, chip('Asistencia ×' + mod.asistencia.toFixed(2)), chip('Ingresos ×' + mod.ingresos.toFixed(2)), chip('Obras ×' + mod.obras.toFixed(2)), chip('Cantera ×' + mod.cantera.toFixed(2)))));
    el.append(seccion('Convenios', h('div', { class: 'lista' }, Cc.conveniosDisponibles(st, club).map(k => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, k.nombre), k.disponible ? h('button', { class: 'btn peq', onclick: () => { const r = Cc.firmarConvenio(st, club, k.id); if (!r.ok) toast(r.motivo); else { toast('Convenio firmado'); refrescar(); } } }, k.coste ? 'Firmar, ' + U.eur(k.coste) : 'Firmar') : chip('Vigente', 'ok')), h('span', { class: 'muted' }, k.desc + (k.motivo && !k.disponible ? ' ' + k.motivo + '.' : '')))))));
    el.append(seccion('Eventos', h('div', { class: 'lista' }, Cc.eventosDisponibles(st, club).map(k => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, k.nombre), k.disponible ? h('button', { class: 'btn peq', onclick: () => { const r = Cc.organizarEvento(st, club, k.id); if (!r.ok) toast(r.motivo); else { toast('Evento organizado'); refrescar(); } } }, k.ingreso ? 'Organizar, +' + U.eur(k.ingreso) : 'Organizar, ' + U.eur(k.coste)) : chip(k.motivo)), h('span', { class: 'muted' }, k.desc))))));
  }

  function ciudad(el, st) {
    desmontar();
    const car = carrera(), tabs = car ? [['mapa', 'Mapa 3D'], ['casa', 'Mi casa'], ['pueblo', 'Mi pueblo'], ['vivienda', 'Vivienda'], ['vida', 'Estilo de vida'], ['social', 'Vida social']] : entr() ? [['casa', 'Mi casa']] : [['resumen', 'Resumen'], ['mapa', 'Mapa 3D'], ['aficion', 'Afición'], ['identidad', 'Identidad'], ['casa', 'Mi casa']];
    if (!tabs.some(t => t[0] === ui.tab.ciudad)) ui.tab.ciudad = tabs[0][0];
    el.append(pestanas(tabs, ui.tab.ciudad, t => { ui.tab.ciudad = t; refrescar(true); }));
    const t = ui.tab.ciudad;
    if (car && st.carrera.fase === 'ncaa' && st.carrera.etapa === 'cantera' && (t === 'vivienda' || t === 'vida')) { el.append(aviso('Vives en la residencia de la cantera de ' + eq(st.clubId).nombre + '. A los 18 años, con tu primer contrato, podrás elegir barrio, vivienda y estilo de vida.', 'med')); return; }
    if (car && st.carrera.fase === 'ncaa' && st.carrera.etapa !== 'cantera' && t !== 'mapa' && t !== 'casa' && t !== 'pueblo') { el.append(aviso('Vives en la residencia universitaria. Cuando fiches por un club podrás elegir barrio y vivienda.', 'med')); return; }
    if (t === 'mapa') { const cont = h('div', { class: 'club3d' }); el.append(cont); M().ciudad3d.mount(cont, st); }
    else if (t === 'casa') { const cont = h('div', { class: 'club3d' }); el.append(cont); M().hogar3d.mount(cont, st); }
    else if (t === 'pueblo') { const cont = h('div', { class: 'club3d' }); el.append(cont); M().pueblo.mount(cont, st); }
    else if (t === 'resumen') ciudadResumen(el, st);
    else if (t === 'aficion') aficionTab(el, st);
    else if (t === 'identidad') identidadTab(el, st);
    else if (t === 'vivienda') viviendaTab(el, st);
    else if (t === 'social') socialTab(el, st);
    else vidaTab(el, st);
  }
  function socialTab(el, st) {
    const S_ = M().social, s = S_.estado(st); if (!s) { el.append(aviso('La vida social está disponible en la carrera de jugador.', 'med')); return; }
    const par = s.pareja, ESTADO = { no: 'Sin pareja', conocida: 'Conoces a alguien', saliendo: 'Salís juntos', pareja: 'En pareja', casados: 'Casados' };
    el.append(seccion('Tu semana', h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, 'Energía social'), h('b', null, '●'.repeat(s.energia) + '○'.repeat(Math.max(0, 3 - s.energia)))), h('p', { class: 'muted' }, 'Cada semana tienes tres puntos para cuidar tus relaciones. Se recuperan los lunes.'),
      h('div', { class: 'chips' }, chip(ESTADO[par.estado]), par.hijos ? chip(par.hijos + (par.hijos === 1 ? ' hijo' : ' hijos')) : null, chip('Ahorros ' + Math.round(st.carrera.dinero).toLocaleString('es-ES') + ' mil €')))));
    const orden = ['pareja', 'familia', 'amigo', 'mentor', 'companero', 'rival'];
    S_.contactos(st).sort((a, b) => orden.indexOf(a.tipo) - orden.indexOf(b.tipo)).forEach(k => el.append(h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('div', { class: 'ct' }, h('b', null, k.nombre), h('span', { class: 'muted' }, S_.ETQ[k.tipo])), h('b', null, Math.round(k.rel))), barra(k.rel, 100, k.rel >= 60 ? 'verde' : k.rel >= 30 ? 'ambar' : 'rojo'),
      h('div', { class: 'seg' }, S_.acciones(st, k.id).map(a => h('button', { class: 'tab', disabled: !a.disponible, onclick: () => { const r = S_.hacer(st, k.id, a.id); if (!r.ok) toast(r.motivo); else { toast(r.efectos.length ? r.efectos.join(', ') : 'Hecho'); refrescar(); if (GM.ui && GM.ui.cabecera) GM.ui.cabecera(); } } }, a.t + (a.coste ? ' (' + a.coste + ' k€)' : '') + (a.e ? ', energía ' + a.e : '')))))));
  }
  function aficionTab(el, st) {
    const Fn = M().fans, f = st.fans; if (!f) { el.append(aviso('La afición solo está disponible como presidente o director técnico.', 'med')); return; }
    const precios = [[0.8, 'Económico'], [1, 'Normal'], [1.25, 'Premium']], cur = f.abonos.precio;
    el.append(seccion('Precio de los abonos', h('div', { class: 'tarjeta' }, h('div', { class: 'seg' }, precios.map(p => h('button', { class: 'tab' + (Math.abs(cur - p[0]) < 0.01 ? ' on' : ''), onclick: () => { Fn.fijarPrecio(st, p[0]); refrescar(); } }, p[1] + ' ×' + p[0]))),
      h('p', { class: 'muted' }, cur < 1 ? 'Más gente en el pabellón y más cariño de la afición, pero cada entrada deja menos.' : cur > 1 ? 'Cada entrada deja más, pero baja la asistencia y a la afición no le hace gracia.' : 'Un precio equilibrado.'))));
    const pe = Fn.peticiones(st);
    if (pe.length) el.append(seccion('Peticiones', pe.map(q => h('div', { class: 'tarjeta' }, h('b', null, q.titulo), h('p', { class: 'muted' }, q.peña), h('p', null, q.texto), h('div', { class: 'lista' }, q.opciones.map(o => h('button', { class: 'btn btn-sec', onclick: () => { const r = Fn.resolverPeticion(st, q.id, o.i); if (!r.ok) toast(r.motivo); else { toast('Hecho'); GM.ui.cabecera(); refrescar(); } } }, o.t)))))));
    if (f.tifo) el.append(aviso('Hay un tifo preparado para el próximo partido en casa.', 'ok'));
    el.append(seccion('Peñas', h('div', { class: 'lista' }, Fn.penas(st).map(p => h('button', { class: 'item col', style: { textAlign: 'left' }, onclick: () => penaModal(p.id) }, h('div', { class: 'fila' }, h('b', null, p.nombre), chip(p.etq)), h('span', { class: 'muted' }, p.barrioNombre + ', ' + p.miembros + ' socios'), h('span', { class: 'barra ' + (p.animo >= 60 ? 'verde' : p.animo >= 35 ? 'ambar' : 'rojo') }, h('i', { style: { width: p.animo + '%' } })))))));
  }
  function penaModal(id) {
    const st = S(), Fn = M().fans, p = Fn.penas(st).find(x => x.id === id);
    modal(h('div', null, h('h3', null, p.nombre), h('p', { class: 'muted' }, p.etq + ', ' + p.barrioNombre + ', ' + p.miembros + ' socios, ánimo ' + Math.round(p.animo)),
      h('div', { class: 'lista' }, Fn.accionesPena(st, id).map(a => h('div', { class: 'item' }, h('div', { class: 'ct' }, h('b', null, a.t), h('span', { class: 'muted' }, a.motivo || U.eur(a.coste))), h('button', { class: 'btn peq', disabled: !a.disponible, onclick: () => { const r = Fn.hacerPena(st, id, a.id); if (!r.ok) toast(r.motivo); else { cerrarModales(); toast('Hecho'); GM.ui.cabecera(); refrescar(); } } }, 'Hacer'))))), [{ t: 'Cerrar', cls: 'btn-sec' }]);
  }
  function identidadTab(el, st) {
    const Fn = M().fans, f = st.fans; if (!f) { el.append(aviso('La identidad del club solo está disponible como presidente o director técnico.', 'med')); return; }
    const id = f.identidad, m = Object.assign({ nombre: '', animal: 'oso', color: '#c8553d' }, id.mascota || {}), COL = ['#c8553d', '#1f8f5f', '#2f6db5', '#e8b84a', '#6b4a8a', '#333333'];
    const ni = h('input', { class: 'sel', placeholder: 'Nombre de la mascota', value: m.nombre, maxlength: 20 }), le = h('input', { class: 'sel', placeholder: 'Lema del club', value: id.lema || '', maxlength: 44 });
    const pintar = () => refrescarIdentidad();
    function refrescarIdentidad() { m.nombre = ni.value; id.lema = le.value; cont.innerHTML = ''; cont.append(cuerpo()); }
    const cont = h('div');
    const cuerpo = () => h('div', null,
      seccion('Mascota', h('div', { class: 'tarjeta' }, ni, h('div', { class: 'seg', style: { marginTop: '8px' } }, Object.keys(Fn.ANIMALES).map(a => h('button', { class: 'tab' + (m.animal === a ? ' on' : ''), onclick: () => { m.nombre = ni.value; m.animal = a; id.lema = le.value; pintar(); } }, Fn.ANIMALES[a]))),
        h('div', { class: 'seg' }, COL.map(c2 => h('button', { class: 'tab' + (m.color === c2 ? ' on' : ''), style: { background: c2, color: '#fff', minWidth: '44px' }, 'aria-label': 'Color', onclick: () => { m.nombre = ni.value; m.color = c2; id.lema = le.value; pintar(); } }, m.color === c2 ? '✓' : ''))),
        h('p', { class: 'muted' }, 'La mascota aparece en tu ciudad deportiva y visita colegios y hospitales desde el mapa de la ciudad.'))),
      seccion('Lema e himno', h('div', { class: 'tarjeta' }, le, h('div', { class: 'seg', style: { marginTop: '8px' } }, [[null, 'Sin himno']].concat(Object.keys(Fn.HIMNOS).map(k => [k, Fn.HIMNOS[k]])).map(o => h('button', { class: 'tab' + ((id.himno || null) === o[0] ? ' on' : ''), onclick: () => { m.nombre = ni.value; id.lema = le.value; id.himno = o[0]; pintar(); } }, o[1]))))),
      seccion('Rival histórico', h('div', { class: 'tarjeta' }, h('p', { class: 'muted' }, 'Los partidos contra tu rival llenan más el pabellón y se viven con más intensidad.'), h('select', { class: 'sel', onchange: e => { id.rival = e.target.value || null; } }, h('option', { value: '' }, 'Sin rival histórico'), Fn.rivales(st).map(r => h('option', { value: r.id, selected: id.rival === r.id }, r.nombre))))),
      h('button', { class: 'btn grande', onclick: () => { Fn.fijarIdentidad(st, { mascota: ni.value.trim() ? { nombre: ni.value.trim(), animal: m.animal, color: m.color } : null, lema: le.value, himno: id.himno || null, rival: id.rival || null }); toast('Identidad guardada'); refrescar(); } }, 'Guardar identidad'));
    cont.append(cuerpo()); el.append(cont);
    if (id.lema) el.append(h('p', { class: 'muted' }, '«' + id.lema + '»'));
  }
  function viviendaTab(el, st) {
    const K = M().carrera, c = st.carrera, v = c.vivienda, a = v.actual, bar = K.barriosVivienda(st), ciu = st.equipos[st.clubId].ciudad;
    el.append(seccion('Tu hogar', h('div', { class: 'tarjeta' }, a ? [h('div', { class: 'fila' }, h('b', null, K.TIPOS_VIV[a.tipo].nombre), chip(a.modo === 'compra' ? 'En propiedad' : 'Alquilado')), h('p', { class: 'muted' }, a.barrioNombre + ', ' + a.ciudad + (a.ciudad !== ciu ? '. Te queda lejos del club: pierdes ánimo cada mes.' : '')),
      h('div', { class: 'chips' }, chip('Comodidad ' + a.comodidad + '/5'), chip('Transporte ' + a.transporte + '/5'), chip('Ruido ' + a.ruido + '/5'), chip('Prestigio ' + a.prestigio + '/5'), a.modo === 'alquiler' ? chip(a.alquiler + ' mil € al mes') : chip('Valor ' + a.precio + ' mil €')),
      h('div', { class: 'par' }, h('button', { class: 'btn', onclick: () => { ui.tab.ciudad = 'casa'; refrescar(true); } }, 'Entrar en casa'), a.modo === 'compra' ? h('button', { class: 'btn btn-sec', onclick: () => { const r = K.gestionarPropiedad(st, a.id, 'vender'); toast(r.ok ? 'Vendida por ' + r.precio + ' mil €' : r.motivo); refrescar(); } }, 'Vender') : h('button', { class: 'btn btn-sec', onclick: () => { K.gestionarPropiedad(st, a.id, 'dejar'); refrescar(); } }, 'Dejar el alquiler'))] : h('p', null, 'Ahora mismo no tienes vivienda propia. Elige un barrio y compra o alquila.'))));
    if (v.propiedades.length) el.append(seccion('Otras propiedades', h('div', { class: 'lista' }, v.propiedades.map(p => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, K.TIPOS_VIV[p.tipo].nombre + ', ' + p.barrioNombre), chip(p.ciudad)), h('div', { class: 'par' }, h('button', { class: 'btn peq btn-sec', onclick: () => { K.gestionarPropiedad(st, p.id, 'alquilar'); refrescar(); } }, p.alquilada ? 'Dejar de alquilar' : 'Poner en alquiler'), h('button', { class: 'btn peq btn-sec', onclick: () => { const r = K.gestionarPropiedad(st, p.id, 'vender'); toast(r.ok ? 'Vendida por ' + r.precio + ' mil €' : r.motivo); refrescar(); } }, 'Vender')))))));
    el.append(seccion('Barrios de ' + ciu, h('p', { class: 'muted' }, 'Ahorros: ' + Math.round(c.dinero).toLocaleString('es-ES') + ' mil €. El precio cambia según el barrio.'), h('div', { class: 'lista' }, bar.map(b => h('button', { class: 'item col', style: { textAlign: 'left' }, onclick: () => barrioViviendaModal(b.i) }, h('div', { class: 'fila' }, h('b', null, b.nombre), chip('Precio ×' + b.precio)), h('span', { class: 'muted' }, 'Transporte ' + b.transporte + '/5, ruido ' + b.ruido + '/5, prestigio ' + b.prestigio + '/5'))))));
  }
  function barrioViviendaModal(i) {
    const st = S(), K = M().carrera, b = K.barriosVivienda(st)[i];
    modal(h('div', null, h('h3', null, b.nombre), h('p', { class: 'muted' }, 'Transporte ' + b.transporte + '/5, ruido ' + b.ruido + '/5, prestigio ' + b.prestigio + '/5'),
      h('div', { class: 'lista' }, Object.keys(K.TIPOS_VIV).map(t => { const pr = K.precioVivienda(st, i, t), al = Math.max(1, Math.round(pr * 0.005 * 10) / 10); return h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, K.TIPOS_VIV[t].nombre), chip('Comodidad ' + K.TIPOS_VIV[t].comodidad)), h('div', { class: 'par' },
        h('button', { class: 'btn peq', onclick: () => { const r = K.comprarVivienda(st, i, t, 'compra'); if (!r.ok) toast(r.motivo); else { cerrarModales(); toast('Vivienda comprada'); refrescar(); } } }, 'Comprar ' + pr + ' mil €'),
        h('button', { class: 'btn peq btn-sec', onclick: () => { const r = K.comprarVivienda(st, i, t, 'hipoteca'); if (!r.ok) toast(r.motivo); else { cerrarModales(); toast('Hipoteca firmada'); refrescar(); } } }, 'Hipoteca ' + Math.round(pr * 0.2) + ' mil € de entrada'),
        h('button', { class: 'btn peq btn-sec', onclick: () => { const r = K.comprarVivienda(st, i, t, 'alquiler'); if (!r.ok) toast(r.motivo); else { cerrarModales(); toast('Vivienda alquilada'); refrescar(); } } }, 'Alquilar ' + al + ' mil €/mes'))); }))), [{ t: 'Cerrar', cls: 'btn-sec' }], { alta: true });
  }
  function casaModal() {
    const st = S(), K = M().carrera, a = st.carrera.vivienda.actual; if (!a) { navegar('ciudad'); return; }
    modal(h('div', null, h('h3', null, K.TIPOS_VIV[a.tipo].nombre), h('p', { class: 'muted' }, a.barrioNombre + ', ' + a.ciudad), h('p', null, 'Tu casa es tu refugio: aquí recuperas ánimo y recibes a los tuyos.'),
      h('button', { class: 'btn', onclick: () => { const r = K.invitarEquipo(st); if (!r.ok) toast(r.motivo); else { cerrarModales(); toast('Cena con el equipo'); refrescar(); } } }, 'Invitar al equipo a cenar (1,5 mil €)')), [{ t: 'Cerrar', cls: 'btn-sec' }]);
  }
  function vidaTab(el, st) {
    const K = M().carrera, c = st.carrera, v = c.vivienda, f = v.fundacion;
    el.append(seccion('Coche', h('div', { class: 'tarjeta' }, h('p', null, v.coche ? 'Tu coche: ' + v.coche.nombre + '.' : 'Aún no tienes coche.'), h('div', { class: 'lista' }, Object.keys(K.COCHES).map(id => h('div', { class: 'item' }, h('div', { class: 'ct' }, h('b', null, K.COCHES[id].nombre), h('span', { class: 'muted' }, K.COCHES[id].precio + ' mil €, ánimo +' + K.COCHES[id].moral + (K.COCHES[id].fama ? ', fama +' + K.COCHES[id].fama : ''))), h('button', { class: 'btn peq' + (v.coche && v.coche.id === id ? ' btn-sec' : ''), disabled: v.coche && v.coche.id === id, onclick: () => { const r = K.comprarCoche(st, id); toast(r.ok ? 'Coche nuevo' : r.motivo); refrescar(); } }, v.coche && v.coche.id === id ? 'Lo tienes' : 'Comprar')))))));
    const ni = h('input', { class: 'sel', placeholder: 'Nombre de la fundación', value: '', maxlength: 30 });
    el.append(seccion('Tu fundación', h('div', { class: 'tarjeta' }, f ? [h('b', null, f.nombre), h('p', { class: 'muted' }, 'Aportas el ' + f.aporte + ' % de tu sueldo. Sube tu fama y el cariño de los barrios.'), h('input', { class: 'rango', type: 'range', min: 1, max: 10, step: 1, value: f.aporte, onchange: e => { K.fijarAporte(st, +e.target.value); refrescar(); } })] : [h('p', null, 'Crea una fundación para ayudar a niños del barrio. Cuesta 150 mil € y destina una parte de tu sueldo.'), ni, h('button', { class: 'btn', style: { marginTop: '8px' }, onclick: () => { const r = K.crearFundacion(st, ni.value.trim(), 3); toast(r.ok ? 'Fundación creada' : r.motivo); refrescar(); } }, 'Crear fundación')])));
    el.append(h('p', { class: 'muted' }, 'En el Mapa 3D tienes más planes: visitar colegios y hospitales, cenar con las peñas, ir de compras o escaparte el fin de semana.'));
  }
  Object.assign(GM.ui._, { ciudadResumen, ciudad, socialTab, aficionTab, penaModal, identidadTab, viviendaTab, barrioViviendaModal, casaModal, vidaTab });
  registerScreen('ciudad', { titulo: 'Ciudad', icono: 'city', render: ciudad });
  GM.ui.casa = casaModal;
})();
