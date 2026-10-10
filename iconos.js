/* ICONOS (GM.iconos) — juego propio de iconos de línea (24x24, trazo currentColor) para los menús y paneles del mundo
   GM.iconos.el(nombre, tam) devuelve un <span class="ico"> con el SVG; GM.iconos.NOMBRES lista los disponibles.
   Se usan en las fichas de edificio del pueblo y en el menú «Mi pueblo»; mantienen el trazo fino del resto de la interfaz. */
(function () {
  const P = {
    balon: '<circle cx="12" cy="12" r="9"/><path d="M3.5 9.5c5 1 12 1 17 0M3.5 14.5c5-1 12-1 17 0M12 3v18M7 4.5c2.5 4 2.5 11 0 15M17 4.5c-2.5 4-2.5 11 0 15"/>',
    tienda: '<path d="M4 9l1.5-5h13L20 9M4 9h16M4 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3M5 12v8h14v-8M10 20v-5h4v5"/>',
    cruz: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M12 7.5v9M7.5 12h9"/>',
    libro: '<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13.5"/>',
    casa: '<path d="M3.5 11L12 4l8.5 7M6 9.5V20h12V9.5M10 20v-5.5h4V20"/>',
    fabrica: '<path d="M3.5 20V10l5 3v-3l5 3V6h4v14zM3.5 20h17M8 16.5h1.5M12.5 16.5H14M16.5 16.5H18"/>',
    cine: '<rect x="3.5" y="7" width="17" height="12" rx="1.5"/><path d="M3.5 7l2-3.5h3L6.5 7M8.5 7l2-3.5h3L11.5 7M13.5 7l2-3.5h3L16.5 7M10 10.5l4.5 2.5-4.5 2.5z"/>',
    hotel: '<path d="M4 20V5.5h10V20M14 20V10h6v10M3 20h18M7 9h1.5M10.5 9H12M7 12.5h1.5M10.5 12.5H12M7 16h1.5M10.5 16H12M16.5 13.5H18M16.5 16.5H18"/>',
    bar: '<path d="M6 4h12l-1.3 11.2a3 3 0 0 1-3 2.8h-3.4a3 3 0 0 1-3-2.8zM7 8.5h10M12 18v3M8.5 21h7"/>',
    escuela: '<path d="M2.5 9.5L12 5l9.5 4.5L12 14zM6.5 11.5v4.5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.5M21.5 9.5V15"/>',
    pabellon: '<path d="M3 20h18M4.5 20V10L12 4.5 19.5 10v10M8 20v-6M12 20v-6M16 20v-6M9 10h6"/>',
    parque: '<path d="M12 21v-6M8 15a4.5 4.5 0 0 1 .8-8.8A4 4 0 0 1 16 5.5a4.5 4.5 0 0 1 .5 9.3M8 15h8"/>',
    plaza: '<path d="M12 3v3M9.5 6h5M12 6v4M7 10c0 2.5 2.2 4 5 4s5-1.5 5-4M4 20h16M6 20c0-3 2.7-5 6-5s6 2 6 5M8.5 12.5l-2 2.5M15.5 12.5l2 2.5"/>',
    farola: '<path d="M8 21h8M12 21V9M12 9c0-2.8 2-5 5-5M17 4v2.5M15.5 6.5h3"/>',
    carretera: '<path d="M8.5 3L5 21M15.5 3L19 21M12 4.5v3M12 10.5v3M12 16.5v3"/>',
    corazon: '<path d="M12 20s-7.5-4.6-7.5-10.2C4.5 7 6.6 5 9 5c1.4 0 2.6.7 3 1.8C12.4 5.7 13.6 5 15 5c2.4 0 4.5 2 4.5 4.8C19.5 15.4 12 20 12 20z"/>',
    mural: '<rect x="3.5" y="4.5" width="17" height="15" rx="1"/><path d="M3.5 15l5-4.5 4 3.5 3-2.5 5 4M8 9.2h.01"/>',
    pan: '<path d="M3.5 12.5c0-3.5 3.8-6.5 8.5-6.5s8.5 3 8.5 6.5c0 1.8-1 2.5-2 2.5v3.5h-13V15c-1 0-2-.7-2-2.5zM8 11l1.5 2M12 10.5l1.5 2.5M16 11l-1 2.5"/>',
    llave: '<path d="M14.5 4a5 5 0 0 0-4.7 6.7L3.5 17l3.5 3.5 6.3-6.3A5 5 0 0 0 20 9.5l-3.3 3.3-3-.5-.5-3z"/>',
    cubiertos: '<path d="M7 3v8M5 3v5.5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2.5 1.5-3.5 4.5-3.5 8H17"/>',
    moneda: '<circle cx="12" cy="12" r="8.5"/><path d="M14.7 9c-.5-1-1.5-1.5-2.7-1.5-1.7 0-2.8.9-2.8 2.1 0 3 5.6 1.5 5.6 4.3 0 1.2-1.1 2.1-2.8 2.1-1.3 0-2.4-.6-2.9-1.6M12 6v1.5M12 16.5V18"/>',
    estrella: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
    reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
    candado: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    flecha: '<path d="M9 5l7 7-7 7"/>',
    obra: '<path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6M2.5 9.5h19"/>',
    persona: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/>',
    puerta: '<path d="M6 20V4.5h12V20M4 20h16M14.5 12.5h.01"/>',
    ruedas: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-8h4l4 8M10 8H8"/>',
    mapa: '<path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6zM9 4v14M15 6v14"/>',
    sol: '<circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>'
  };
  const POR_EDIFICIO = { canasta: 'balon', bar: 'bar', escuela: 'escuela', mural: 'mural', ambulatorio: 'cruz', polideportivo: 'balon', tienda: 'tienda', hotel: 'hotel', pabellon: 'pabellon', plaza: 'plaza', parque: 'parque', alumbrado: 'farola', biblioteca: 'libro', centrodia: 'corazon', carretera: 'carretera', casapadres: 'casa', micasa: 'casa', casaamigos: 'casa', cine: 'cine', industrial: 'fabrica', panaderia: 'pan', taller: 'llave', restaurantep: 'cubiertos' };
  function svg(n, t) { return '<svg viewBox="0 0 24 24" width="' + (t || 20) + '" height="' + (t || 20) + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || P.casa) + '</svg>'; }
  function el(n, t) { const s = document.createElement('span'); s.className = 'ico'; s.innerHTML = svg(POR_EDIFICIO[n] || n, t); return s; }
  // Ficha de edificio: cabecera con icono y niveles, rentas, gestor, obra en curso, mejora, ruta de mejoras y acciones.
  // f: { icono, titulo, sub, nivel, max, niveles, stats, gestor, obra, mejora, acciones }; hecho(r) recibe el resultado de cada acción.
  function ficha(c, f, hecho) {
    const h = GM.h, I = (n, t) => el(n, t), K = GM.mods.pueblo && GM.mods.pueblo.fmtK || (x => x + ' mil €');
    const w = h('div', { class: 'pb' }); c.append(w);
    const pips = h('div', { class: 'pb-pips' }); for (let i = 0; i < f.max; i++) pips.append(h('i', { class: i < f.nivel ? 'on' : '' }));
    w.append(h('div', { class: 'pb-hero' }, h('div', { class: 'pb-ic' }, I(f.icono, 30)), h('div', null, h('h3', null, f.titulo), h('p', null, f.sub || ''), f.max > 1 || f.nivel ? pips : null)));
    if (f.stats && f.stats.length) w.append(h('div', { class: 'pb-stats' }, f.stats.map(s => h('div', { class: 'pb-stat' }, I(s.ico, 18), h('b', null, s.val), h('span', null, s.etq)))));
    if (f.gestor) w.append(h('div', { class: 'pb-gestor' }, h('div', { class: 'av' }, f.gestor.nombre.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ ]/g, '').trim()[0] || '?'), h('div', null, h('b', null, f.gestor.nombre), h('span', null, 'Lo lleva ' + f.gestor.rol + '. Te da una parte de lo que gana cada mes.'))));
    if (f.obra) w.append(h('div', { class: 'pb-obra' }, h('div', { class: 'cab' }, I('obra', 20), 'Obra en marcha', h('small', null, f.obra.dias + ' días')), h('div', { class: 'tira' }, h('i', { style: { width: Math.max(4, Math.round(f.obra.prog * 100)) + '%' } })), h('p', null, f.obra.fase + ' (' + Math.round(f.obra.prog * 100) + ' %). ' + f.obra.texto + '. Inauguración el ' + f.obra.fin + '.')));
    if (f.mejora) {
      const m = f.mejora, bt = h('button', { class: 'pb-cta', disabled: !m.disponible, onclick: () => hecho(m.fn()) }, I(m.disponible ? 'obra' : 'candado', 18), m.titulo);
      w.append(h('div', { class: 'pb-mejora' }, h('div', { class: 'fila' }, h('span', { class: 'pb-chip' }, I('moneda', 14), K(m.coste)), h('span', { class: 'pb-chip' }, I('reloj', 14), m.dias + ' días de obra'),
        m.falta ? h('span', { class: 'pb-chip mal' }, 'Te faltan ' + K(m.falta.necesitas - m.falta.tienes)) : (m.motivo ? null : h('span', { class: 'pb-chip ok' }, I('check', 14), 'Puedes pagarlo'))),
        m.falta ? h('div', { class: 'pb-falta' }, h('i', { style: { width: Math.round(Math.min(1, m.falta.tienes / m.falta.necesitas) * 100) + '%' } })) : null, bt,
        !m.disponible && m.motivo && !m.falta ? h('span', { style: { fontSize: '12.5px', opacity: 0.75 } }, m.motivo) : null));
    }
    if (f.niveles && f.niveles.length > 1) w.append(h('div', { class: 'pb-tit' }, 'Ruta de mejoras'), h('div', { class: 'pb-ruta' }, f.niveles.map(n => h('div', { class: 'pb-paso ' + n.estado }, h('div', { class: 'pt' }, n.estado === 'hecho' ? I('check', 12) : null), h('div', null, h('b', null, n.nombre), h('span', null, n.estado === 'hecho' ? 'Hecho' : n.estado === 'sig' ? 'Siguiente mejora' : 'Más adelante'))))));
    (f.acciones || []).forEach(x => w.append(h('button', { class: 'pb-acc', disabled: !x.disponible, onclick: () => hecho(x.fn()) }, h('div', { class: 'ic' }, I(x.ico || f.icono, 20)), h('div', null, h('b', null, x.t), h('span', null, x.disponible ? x.d : x.motivo || x.d)), h('span', { class: 'fl' }, I('flecha', 16)))));
    return w;
  }
  GM.iconos = { svg, el, ficha, NOMBRES: Object.keys(P), POR_EDIFICIO };
})();
