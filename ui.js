/* INTERFAZ MÓVIL (GM.mods.ui y GM.ui)
   Expone: start(raiz), navegar(id), refrescar, toast, modal, registerScreen. Pantallas: inicio, plantilla, mercado, calendario, club, ciudad, finanzas.
   Menú de arranque (nueva partida por liga y club, continuar, cargar, importar). Usa solo funciones del contrato y comprueba que existan. */
(function () {
  const U = GM.util, h = GM.h;
  const M = () => GM.mods;
  const S = () => GM.state;
  const ICON = {
    home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    users: '<circle cx="9" cy="7" r="4"/><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M16 3.1a4 4 0 0 1 0 7.8M23 21v-2a4 4 0 0 0-3-3.9"/>',
    swap: '<path d="M7 7h13l-3-3M17 17H4l3 3"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>',
    club: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h6"/>',
    city: '<path d="M3 21V11l6-3v13M9 21V4l6 3v14M15 21V9l6 3v9"/>',
    eur: '<path d="M17 5a6 6 0 0 0-10 3v8a6 6 0 0 0 10 3M4 10h9M4 14h9"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    trofeo: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    dir: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>'
  };
  const icon = (n, s) => h('span', { class: 'ic', html: '<svg viewBox="0 0 24 24" width="' + (s || 22) + '" height="' + (s || 22) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICON[n] + '</svg>' });
  const NAV_G = [['inicio', 'Inicio', 'home'], ['plantilla', 'Plantilla', 'users'], ['mercado', 'Mercado', 'swap'], ['calendario', 'Calendario', 'cal'], ['club', 'Club', 'club'], ['ciudad', 'Ciudad', 'city'], ['finanzas', 'Finanzas', 'eur']];
  const NAV_P = [['inicio', 'Inicio', 'home'], ['plantilla', 'Plantilla', 'users'], ['directiva', 'Directiva', 'dir'], ['calendario', 'Calendario', 'cal'], ['club', 'Club', 'club'], ['ciudad', 'Ciudad', 'city'], ['legado', 'Legado', 'trofeo'], ['finanzas', 'Finanzas', 'eur']];
  const pres = () => !!S() && S().modo === 'presidente';
  const carrera = () => !!S() && S().modo === 'carrera' && !!S().carrera;
  const etqFase = (g, st) => g.fase === 'continental' ? ', ' + GM.compNombre(st, g.comp) + (g.ronda ? ' (' + g.ronda + ')' : '') : g.fase === 'copa' ? ', ' + (st.copas && st.copas[g.copa] ? st.copas[g.copa].nombre : 'Copa') : g.fase === 'playoff' ? ', Playoffs' : g.fase === 'playin' ? ', Play-in' : g.jornada ? ', J' + g.jornada : '';
  const catEdad = e => e <= 15 ? 'Cadete' : e <= 17 ? 'Junior' : 'Filial';
  const enCantera = () => !!S() && S().modo === 'carrera' && !!S().carrera && S().carrera.fase === 'ncaa' && S().carrera.etapa === 'cantera';
  const lectura = () => !!S() && S().modo !== 'gestor';
  const avatarEl = (pj, size, o) => h('span', { class: 'avatar-pj', style: { width: size + 'px', height: size + 'px' }, html: M().personaje.avatar(pj, Object.assign({ size }, o || {})) });
  const dorsal = st => 2 + (U.hash(st.personaje ? st.personaje.nombre + st.personaje.apellido : 'yo') % 30);
  const NAV_E = [['inicio', 'Inicio', 'home'], ['plantilla', 'Plantilla', 'users'], ['junta', 'Directiva', 'dir'], ['calendario', 'Calendario', 'cal'], ['ciudad', 'Casa', 'city'], ['trayectoria', 'Carrera', 'trofeo']];
  const entr = () => !!S() && S().modo === 'entrenador' && !!S().entrenador;
  const tacticaOn = () => !!S() && (S().modo === 'gestor' || S().modo === 'entrenador');
  const NAV_C = [['inicio', 'Inicio', 'home'], ['jugador', 'Jugador', 'users'], ['agente', 'Agente', 'dir'], ['plantilla', 'Equipo', 'club'], ['ciudad', 'Ciudad', 'city'], ['calendario', 'Calendario', 'cal'], ['trayectoria', 'Carrera', 'trofeo']];
  const navItems = () => entr() ? NAV_E : carrera() ? NAV_C : pres() ? NAV_P : NAV_G;
  const ATT = { tiro3: 'Triple', tiro2: 'Tiro de 2', tl: 'Tiros libres', pase: 'Pase', bote: 'Bote', reb: 'Rebote', defInt: 'Defensa interior', defPer: 'Defensa exterior', fisico: 'Físico', iq: 'Visión de juego' };
  const POSN = { PG: 'Base', SG: 'Escolta', SF: 'Alero', PF: 'Ala-pívot', C: 'Pívot' };
  const CORTO = { EUROCUP: 'EuroCup', BCL: 'Champions', NBA: 'NBA', EUROLIGA: 'Euroliga', ACB: 'ACB', LEGA: 'Lega', GBL: 'Grecia', BBL: 'Alemania', BSL: 'Turquía' };
  function rgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function lum(h) { const c = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function mezcla(h, t) { const c = rgb(h).map(v => Math.round(v + (255 - v) * t)); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); }
  function aplicaKit(colores) {
    const r = document.documentElement.style; let fill = colores[0], trim = colores[1] || '#ffffff';
    if (lum(fill) > 0.6) { fill = colores[1] || '#1c2b3a'; trim = colores[0]; }
    if (lum(fill) > 0.6) fill = '#1c2b3a';
    if (lum(trim) < 0.03 && lum(fill) < 0.03) trim = '#ffffff';
    r.setProperty('--club', fill); r.setProperty('--club2', trim);
    r.setProperty('--club-ink', contraste(fill, '#101c2e') >= contraste(fill, '#ffffff') ? '#101c2e' : '#ffffff');
    r.setProperty('--club-hi', lum(fill) < 0.1 ? mezcla(fill, 0.5) : fill);
  }
  function setTema(t) { document.documentElement.setAttribute('data-tema', t); try { window.localStorage.setItem('gm1:tema', t); } catch (e) { } }
  try { const t0 = window.localStorage.getItem('gm1:tema'); if (t0) document.documentElement.setAttribute('data-tema', t0); } catch (e) { }
  const ui = { raiz: null, cuerpo: null, pantalla: 'inicio', tab: { plantilla: 'plantilla', mercado: 'libres', calendario: 'partidos', club: 'cd', ciudad: 'resumen', finanzas: 'resumen' }, comp: null, fil: { liga: '', equipo: '', pos: '', texto: '' }, modales: [] };
  const screens = {};

  // ---------- Utilidades de interfaz ----------
  const eq = id => S().equipos[id];
  const clip = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
  function claro(hex) { const n = parseInt(String(hex).replace('#', ''), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (r * 299 + g * 587 + b * 114) / 1000 > 150; }
  // Siglas legibles sobre los dos colores del escudo: si uno es claro y el otro oscuro, letra blanca con contorno
  function tintaEscudo(c1, c2) { const k1 = claro(c1), k2 = claro(c2); return k1 && k2 ? { color: '#10202f', cls: '' } : !k1 && !k2 ? { color: '#fff', cls: '' } : { color: '#fff', cls: ' halo' }; }
  function escudo(id, big) {
    const e = eq(id), c1 = e.colores[0], c2 = e.colores[1] || c1;
    return h('span', { class: 'escudo' + (big ? ' grande' : '') + tintaEscudo(c1, c2).cls, style: { background: 'linear-gradient(135deg,' + c1 + ' 55%,' + c2 + ' 55%)', color: tintaEscudo(c1, c2).color } }, e.siglas);
  }
  const chip = (t, c) => h('span', { class: 'chip' + (c ? ' ' + c : '') }, t);
  const barra = (v, max, cls) => h('span', { class: 'barra ' + (cls || '') }, h('i', { style: { width: U.clamp(v / (max || 100) * 100, 0, 100) + '%' } }));
  const num = n => Math.round(n).toLocaleString('es-ES');
  const clsOvr = o => o >= 80 ? 'o-a' : o >= 70 ? 'o-b' : o >= 60 ? 'o-c' : 'o-d';
  const lesionTxt = p => p.estado.lesion ? 'Lesión, ' + p.estado.lesion.dias + ' d' : null;
  function seccion(titulo, ...hijos) { return h('section', { class: 'sec' }, titulo ? h('h2', null, titulo) : null, ...hijos); }
  function pestanas(opts, actual, fn) { return h('div', { class: 'tabs' }, opts.map(o => h('button', { class: 'tab' + (o[0] === actual ? ' on' : ''), onclick: () => fn(o[0]) }, o[1]))); }
  function aviso(txt, c) { return h('div', { class: 'aviso ' + (c || '') }, txt); }

  function toast(t) {
    const el = h('div', { class: 'toast' }, t); document.body.appendChild(el);
    setTimeout(() => { el.classList.add('fuera'); setTimeout(() => el.remove(), 300); }, 2600);
  }
  function modal(contenido, botones, opt) {
    const fondo = h('div', { class: 'fondo' });
    const hoja = h('div', { class: 'hoja' + (opt && opt.alta ? ' alta' : '') });
    const cerrar = () => { fondo.remove(); ui.modales = ui.modales.filter(m => m !== cerrar); };
    hoja.append(h('div', { class: 'asa', onclick: cerrar }), typeof contenido === 'string' ? h('div', { html: contenido }) : contenido);
    if (botones && botones.length) hoja.append(h('div', { class: 'acciones' }, botones.map(b => h('button', { class: 'btn ' + (b.cls || ''), onclick: () => { if (b.fn) { if (b.fn() === false) return; } if (!b.queda) cerrar(); } }, b.t))));
    fondo.addEventListener('click', e => { if (e.target === fondo) cerrar(); });
    fondo.append(hoja); document.body.appendChild(fondo); ui.modales.push(cerrar);
    return cerrar;
  }
  function cerrarModales() { ui.modales.slice().forEach(f => f()); }
  function registerScreen(id, def) { screens[id] = def; GM.ui.screens[id] = def; }

  // ---------- Arranque y menú ----------
  // Filas desplazables (.tabs, .seg.compacto): la clase «mas» difumina el borde derecho mientras quede contenido por ver
  function pistasScroll() {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined' || !document.body || typeof window.addEventListener !== 'function') return;
    const marca = el => { el.classList.toggle('mas', el.scrollLeft + el.clientWidth < el.scrollWidth - 4); };
    let pend = false;
    const revisar = () => { pend = false; document.querySelectorAll('.tabs, .seg.compacto').forEach(el => { if (!el._pista) { el._pista = true; el.addEventListener('scroll', () => marca(el), { passive: true }); } marca(el); }); };
    new MutationObserver(() => { if (!pend) { pend = true; requestAnimationFrame(revisar); } }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', revisar);
    // Con el teclado abierto, el campo activo queda a la vista
    document.addEventListener('focusin', e => { const t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.scrollIntoView) setTimeout(() => t.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300); });
  }
  function start(raiz) {
    ui.raiz = raiz; raiz.className = 'app'; pistasScroll(); if (M().guardado) M().guardado.pedirPersistencia();
    if (S()) juego(); else menu();
  }
  function menu() {
    cerrarModales(); desmontar(); aplicaKit(['#e8590c', '#1c2b3a']);
    const r = ui.raiz; r.innerHTML = '';
    const g = M().guardado, slots = g ? g.listar().filter(s => s.club) : [];
    r.append(h('div', { class: 'menu' },
      h('div', { class: 'portada' }, h('div', { class: 'cancha' }, h('i'), h('b')), h('h1', null, 'Basket Manager'), h('p', null, 'Temporada 2026-27, NBA, Euroliga y ligas europeas')),
      h('div', { class: 'col' },
        h('button', { class: 'btn grande', onclick: flujoNueva }, 'Nueva partida'),
        slots.length ? h('button', { class: 'btn btn-sec grande', onclick: () => cargarMenu(slots) }, 'Continuar partida') : null,
        g ? h('button', { class: 'btn btn-sec', onclick: dialogoImportar }, 'Importar partida') : null,
        h('button', { class: 'btn btn-sec', onclick: () => { setTema(document.documentElement.getAttribute('data-tema') === 'noche' ? 'dia' : 'noche'); } }, 'Cambiar entre tema claro y oscuro'),
        h('p', { class: 'muted pie' }, 'Los nombres de clubes y jugadores son reales y las valoraciones son estimaciones. Los jugadores sin fama pueden ser ficticios.'))));
  }
  function cargarMenu(slots) {
    const cont = h('div', { class: 'lista' }, slots.map(s => h('div', { class: 'item' }, h('div', null, h('b', null, s.club), h('div', { class: 'muted' }, (s.slot === 0 ? 'Autoguardado' : 'Ranura ' + s.slot) + ', ' + s.temporada + ', ' + U.fechaLarga(s.fecha))),
      h('button', { class: 'btn', onclick: () => { const r = M().guardado.cargar(s.slot); if (r.ok) { cerrarModales(); } else toast(r.motivo); } }, 'Cargar'))));
    modal(h('div', null, h('h3', null, 'Continuar partida'), cont), [{ t: 'Cerrar', cls: 'btn-sec' }]);
  }
  function dialogoImportar() {
    const ta = h('textarea', { class: 'area', rows: 6, placeholder: 'Pega aquí el texto que empieza por GM1:' });
    const fi = h('input', { type: 'file', accept: '.txt,text/plain', style: { display: 'none' }, onchange: () => { const f = fi.files && fi.files[0]; if (!f) return; f.text().then(t => { const r = M().guardado.importar(t); if (!r.ok) toast(r.motivo); else cerrarModales(); }); } });
    modal(h('div', null, h('h3', null, 'Importar partida'), h('button', { class: 'btn', style: { width: '100%', marginBottom: '10px' }, onclick: () => fi.click() }, 'Elegir archivo de copia'), fi, h('p', { class: 'muted' }, 'O pega el texto:'), ta), [{ t: 'Importar', fn: () => { const r = M().guardado.importar(ta.value); if (!r.ok) { toast(r.motivo); return false; } } }, { t: 'Cancelar', cls: 'btn-sec' }]);
  }
  function flujoNueva() {
    const op = (modo, tit, desc, rol) => h('button', { class: 'liga', onclick: () => { cerrarModales(); ui.nuevo = { modo, pj: M().personaje.crear(), jug: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'cantera', agente: 'equilibrado' } }; setTimeout(() => personajeModal(ui.nuevo.pj, rol, () => { if (modo === 'carrera') jugadorModal(); else elegirLiga(); }), 0); } }, h('b', null, tit), h('span', { class: 'muted' }, desc));
    modal(h('div', null, h('h3', null, '¿Cómo quieres jugar?'), h('div', { class: 'col' },
      op('presidente', 'Presidente', 'El club se gestiona solo. Cuidas el legado, la ciudad y las instalaciones, y tomas las grandes decisiones.', 'Tu presidente'),
      op('gestor', 'Director técnico', 'Plantilla, fichajes, tácticas y todo lo demás.', 'Tu director técnico'),
      op('entrenador', 'Entrenador', 'Dirige al equipo desde el banquillo: táctica, vestuario y prensa. La directiva te mide, te despide o te ficha otro club.', 'Tu entrenador'),
      op('carrera', 'Carrera de jugador', 'Sé un jugador: de la cantera o la universidad a la Liga Endesa, la Euroliga y, si llegas, la NBA.', 'Tu jugador'))), [{ t: 'Cancelar', cls: 'btn-sec' }]);
  }
  function personajeModal(pj, titulo, fin, edit) {
    const OP = M().personaje.OPC, cuerpo = h('div'), ni = h('input', { class: 'sel', placeholder: 'Nombre', value: pj.nombre, maxlength: 18 }), na = h('input', { class: 'sel', placeholder: 'Apellido', value: pj.apellido, maxlength: 20 });
    const campo = (lbl, key, n, nom) => h('div', { class: 'ajuste' }, h('b', null, lbl), h('div', { class: 'seg' }, Array.from({ length: n }, (_, i) => h('button', { class: 'tab' + (pj[key] === i ? ' on' : ''), 'aria-label': lbl + ' ' + (i + 1), onclick: () => { pj.nombre = ni.value; pj.apellido = na.value; pj[key] = i; pintar(); } }, nom(i)))));
    const punto = c => h('span', { style: { display: 'inline-block', width: '18px', height: '18px', borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,.3)', verticalAlign: 'middle' } });
    function pintar() {
      cuerpo.innerHTML = '';
      cuerpo.append(h('div', { class: 'centro' }, avatarEl(pj, 120, edit && edit.camiseta ? { camiseta: true, numero: 7 } : {})),
        h('div', { class: 'filtros' }, ni, na), campo('Piel', 'piel', 5, i => punto(OP.piel[i])), campo('Peinado', 'pelo', 6, i => OP.pelo[i]), campo('Color de pelo', 'peloColor', 6, i => punto(OP.peloColor[i])),
        campo('Barba', 'barba', 4, i => OP.barba[i]), campo('Gafas', 'gafas', 3, i => OP.gafas[i]), campo('Ropa', 'ropa', 4, i => OP.ropa[i]));
    }
    pintar();
    modal(h('div', null, h('h3', null, titulo), cuerpo), [{ t: edit ? 'Guardar' : 'Continuar', fn: () => { pj.nombre = ni.value.trim(); pj.apellido = na.value.trim(); if (!pj.nombre) { toast('Escribe un nombre'); return false; } setTimeout(() => fin(pj), 0); } },
      { t: 'Aspecto aleatorio', cls: 'btn-sec', queda: true, fn: () => { const a = M().personaje.aleatorio(); ['piel', 'pelo', 'peloColor', 'barba', 'gafas', 'ropa'].forEach(k => { pj[k] = a[k]; }); pj.nombre = ni.value; pj.apellido = na.value; pintar(); return false; } },
      { t: 'Cancelar', cls: 'btn-sec' }], { alta: true });
  }
  function perfilModal() {
    const st = S(), copia = Object.assign({}, st.personaje || M().personaje.crear());
    personajeModal(copia, 'Tu aspecto', pj => { st.personaje = pj; refrescar(); }, { camiseta: carrera() });
  }
  function jugadorModal() {
    const j = ui.nuevo.jug, K = M().carrera, cuerpo = h('div');
    const POSS = [['PG', 'Base'], ['SG', 'Escolta'], ['SF', 'Alero'], ['PF', 'Ala-pívot'], ['C', 'Pívot']], PERF = [['tirador', 'Tirador'], ['defensor', 'Defensor'], ['interior', 'Interior'], ['creador', 'Creador'], ['atleta', 'Atleta']];
    const NAC = [['ES', 'España'], ['US', 'EE. UU.'], ['FR', 'Francia'], ['RS', 'Serbia'], ['GR', 'Grecia'], ['LT', 'Lituania'], ['IT', 'Italia'], ['DE', 'Alemania'], ['TR', 'Turquía']];
    const seg = (lbl, key, ops) => h('div', { class: 'ajuste' }, h('b', null, lbl), h('div', { class: 'seg' }, ops.map(o => h('button', { class: 'tab' + (j[key] === o[0] ? ' on' : ''), onclick: () => { j[key] = o[0]; pintar(); } }, o[1]))));
    const cards = (lbl, key, obj) => h('div', { class: 'ajuste' }, h('b', null, lbl), h('div', { class: 'lista' }, Object.keys(obj).map(k => h('button', { class: 'item', style: { borderColor: j[key] === k ? 'var(--club)' : '', borderWidth: j[key] === k ? '2px' : '' }, onclick: () => { j[key] = k; pintar(); } }, h('div', { class: 'ct' }, h('b', null, obj[k].etq), h('span', { class: 'muted', style: { whiteSpace: 'normal' } }, obj[k].desc)), j[key] === k ? chip('Elegido', 'ok') : null))));
    function pintar() { cuerpo.innerHTML = ''; cuerpo.append(seg('Posición', 'pos', POSS), seg('Estilo de juego', 'perfil', PERF), seg('Nacionalidad', 'nac', NAC), cards('Cómo empiezas', 'origen', K.ORIGENES), cards('Tu representante', 'agente', K.AGENTES)); }
    pintar();
    modal(h('div', null, h('h3', null, 'Tu carrera'), cuerpo), [{ t: 'Continuar', fn: () => { setTimeout(() => { if (j.origen === 'ncaa') empezar(null, 'carrera'); else elegirLiga(); }, 0); } }, { t: 'Cancelar', cls: 'btn-sec' }], { alta: true });
  }
  function elegirLiga() {
    const st0 = GM.data, r = ui.raiz; r.innerHTML = '';
    const ligas = ['NBA', 'EUROLIGA', 'ACB', 'LEGA', 'GBL', 'BBL', 'BSL'].filter(l => st0.ligas[l] && !(ui.nuevo && ui.nuevo.modo === 'carrera' && l === 'NBA'));
    r.append(h('div', { class: 'menu' }, h('button', { class: 'btn btn-sec', onclick: menu }, '‹ Volver'), h('h2', null, 'Elige competición'),
      h('div', { class: 'col' }, ligas.map(l => h('button', { class: 'liga', onclick: () => elegirClub(l) }, h('b', null, st0.ligas[l].nombre), h('span', { class: 'muted' }, st0.ligas[l].equipos.length + ' clubes'))))));
  }
  function ovrData(id) { const o = GM.data.equipos[id].plantilla.map(p => GM.data.jugadores[p].ovr).sort((a, b) => b - a).slice(0, 8); return o.reduce((a, b) => a + b, 0) / o.length; }
  function elegirClub(liga) {
    const D = GM.data, r = ui.raiz; r.innerHTML = '';
    const ids = D.ligas[liga].equipos.slice().sort((a, b) => D.equipos[b].reputacion - D.equipos[a].reputacion);
    const fake = { equipos: D.equipos };
    r.append(h('div', { class: 'menu' }, h('button', { class: 'btn btn-sec', onclick: elegirLiga }, '‹ Ligas'), h('h2', null, D.ligas[liga].nombre),
      h('p', { class: 'muted' }, 'Los clubes están ordenados por reputación. Recomendado para empezar: FC Barcelona (Euroliga y ACB) con la Ciutat Esportiva de Sant Joan Despí.'),
      h('div', { class: 'col' }, ids.map(id => {
        const e = D.equipos[id], ligas = Object.keys(D.ligas).filter(l => D.ligas[l].equipos.indexOf(id) >= 0).map(l => CORTO[l]).join(' + ');
        const c1 = e.colores[0];
        return h('button', { class: 'club', onclick: () => confirmarClub(id) },
          h('span', { class: 'escudo' + tintaEscudo(c1, e.colores[1] || c1).cls, style: { background: 'linear-gradient(135deg,' + c1 + ' 55%,' + (e.colores[1] || c1) + ' 55%)', color: tintaEscudo(c1, e.colores[1] || c1).color } }, e.siglas),
          h('span', { class: 'ct' }, h('b', null, e.nombre), h('span', { class: 'muted' }, ligas + ', ' + e.pabellon.nombre)),
          h('span', { class: 'ovr ' + clsOvr(ovrData(id)) }, Math.round(ovrData(id))), id === 'fc-barcelona' ? chip('Recomendado', 'ok') : null);
      }))));
  }
  function confirmarClub(id) {
    const e = GM.data.equipos[id];
    modal(h('div', null, h('h3', null, e.nombre), h('p', { class: 'muted' }, e.pabellon.nombre + ', ' + num(e.pabellon.aforo) + ' espectadores'),
      e.ciudadDeportiva ? h('p', null, e.ciudadDeportiva.nombre + ' (' + e.ciudadDeportiva.municipio + '). ' + e.ciudadDeportiva.descripcion) : h('p', { class: 'muted' }, 'Cuenta con un complejo de entrenamiento básico que puedes ampliar.'),
      h('p', null, 'Presupuesto anual: ' + U.eur(e.presupuesto))), [{
        t: ui.nuevo && ui.nuevo.modo === 'carrera' ? 'Empezar aquí' : 'Dirigir este club', fn: () => { setTimeout(() => { const m = ui.nuevo ? ui.nuevo.modo : 'gestor'; if (m === 'presidente') elegirPilares(id); else empezar(id, m); }, 0); }
      }, { t: 'Cancelar', cls: 'btn-sec' }]);
  }
  function empezar(id, modo, altos) {
    ui.raiz.innerHTML = ''; ui.raiz.append(h('div', { class: 'cargando' }, 'Preparando la temporada…'));
    const nu = ui.nuevo || {}, op = { modo, personaje: nu.pj || null };
    let real = id;
    if (modo === 'carrera') { op.carrera = Object.assign({}, nu.jug, { clubId: nu.jug.origen === 'ncaa' ? null : id }); if (nu.jug.origen === 'ncaa') real = GM.data.ligas.NBA.equipos[U.hash((nu.pj.nombre || '') + (nu.pj.apellido || '')) % GM.data.ligas.NBA.equipos.length]; }
    setTimeout(() => { ui.pantalla = 'inicio'; GM.newGame(real, undefined, op); if (modo === 'presidente' && altos) M().legado.fijarPilares(S(), altos); if (M().guardado) M().guardado.guardar(0); juego(); }, 40);
  }
  function elegirModo(id) {
    modal(h('div', null, h('h3', null, '¿Cómo quieres jugar?'), h('div', { class: 'col' },
      h('button', { class: 'liga', onclick: () => { cerrarModales(); setTimeout(() => elegirPilares(id), 0); } }, h('b', null, 'Presidente'), h('span', { class: 'muted' }, 'El club se gestiona solo. Cuidas el legado, la ciudad y las instalaciones, y tomas las grandes decisiones.')),
      h('button', { class: 'liga', onclick: () => { cerrarModales(); empezar(id, 'gestor'); } }, h('b', null, 'Gestor total'), h('span', { class: 'muted' }, 'Plantilla, fichajes, tácticas y todo lo demás.')))), [{ t: 'Cancelar', cls: 'btn-sec' }]);
  }
  function elegirPilares(id) {
    const sel = [], P = M().legado.PIL, cont = h('div', { class: 'col' });
    const info = { cantera: 'Apostar por los jóvenes de casa', estilo: 'Un estilo de juego reconocible', arraigo: 'Estar cerca de la ciudad y los socios', ambicion: 'Ganar títulos y crecer' };
    const draw = () => { cont.innerHTML = ''; Object.keys(P).forEach(k => cont.append(h('button', { class: 'item', style: { borderColor: sel.indexOf(k) >= 0 ? 'var(--acc)' : '' }, onclick: () => { const i = sel.indexOf(k); if (i >= 0) sel.splice(i, 1); else if (sel.length < 2) sel.push(k); else toast('Solo dos pilares prioritarios'); draw(); } }, h('div', { class: 'ct' }, h('b', null, P[k]), h('span', { class: 'muted' }, info[k])), sel.indexOf(k) >= 0 ? chip('Prioridad', 'ok') : null))); };
    draw();
    modal(h('div', null, h('h3', null, 'Los pilares de tu club'), h('p', { class: 'muted' }, 'Elige los dos que más importan. Cada decisión del club los acerca o los aleja, y eso sube o baja su alma.'), cont),
      [{ t: 'Empezar', fn: () => { if (sel.length !== 2) { toast('Elige 2 pilares'); return false; } setTimeout(() => empezar(id, 'presidente', sel.slice()), 0); } }, { t: 'Cancelar', cls: 'btn-sec' }]);
  }

  // ---------- Armazón del juego ----------
  function juego() {
    const st = S(), r = ui.raiz; cerrarModales(); desmontar(); r.innerHTML = '';
    const e = eq(st.clubId); aplicaKit(e.colores);
    ui.cabecera = h('header', { class: 'cab' }); ui.cuerpo = h('main', { class: 'cuerpo' });
    ui.nav = h('nav', { class: 'nav' }, navItems().map(n => h('button', { class: 'navb', 'data-id': n[0], onclick: () => navegar(n[0]) }, icon(n[2]), h('span', null, n[1]))));
    r.append(ui.cabecera, ui.cuerpo, ui.nav); navegar(ui.pantalla || 'inicio');
  }
  function cabecera() {
    const st = S(), e = eq(st.clubId), f = st.finanzas[st.clubId], car = carrera() && st.carrera.fase === 'ncaa' && st.carrera.etapa !== 'cantera';
    aplicaKit(car || (carrera() && st.carrera.fase === 'retirado') ? ['#e8590c', '#1c2b3a'] : e.colores);
    ui.cabecera.innerHTML = '';
    if (carrera()) {
      const c = st.carrera, K = M().carrera, rt = K.retrato(st);
      ui.cabecera.append(h('button', { class: 'btn-ic avatar-btn', 'aria-label': 'Tu jugador', onclick: () => navegar('jugador') }, avatarEl(st.personaje, 40, { camiseta: true, numero: dorsal(st) })),
        h('div', { class: 'cab-t' }, h('b', null, clip(rt.nombre, 22)), h('span', null, clip(rt.club, 18) + ', ' + rt.liga + ', ' + U.fecha(st.fecha))),
        h('div', { class: 'cab-c' }, h('b', null, Math.round(c.dinero).toLocaleString('es-ES') + ' k€'), h('span', null, 'ahorros')),
        h('button', { class: 'btn-ic', 'aria-label': 'Menú', onclick: menuJuego }, icon('menu')));
      return;
    }
    ui.cabecera.append(escudo(st.clubId), h('div', { class: 'cab-t' }, h('b', null, clip(e.nombre, 22)), h('span', null, U.fechaLarga(st.fecha) + ', ' + st.temporada)),
      entr() ? h('div', { class: 'cab-c' }, h('b', { class: st.entrenador.confianza < 25 ? 'neg' : '' }, Math.round(st.entrenador.confianza) + ' %'), h('span', null, st.entrenador.fase === 'activo' ? 'confianza' : 'sin equipo')) : h('div', { class: 'cab-c' }, h('b', { class: f.caja < 0 ? 'neg' : '' }, U.eur(f.caja)), h('span', null, 'caja')),
      h('button', { class: 'btn-ic avatar-btn', 'aria-label': 'Tu perfil', onclick: perfilModal }, avatarEl(st.personaje || M().personaje.crear(), 40)),
      h('button', { class: 'btn-ic', 'aria-label': 'Menú', onclick: menuJuego }, icon('menu')));
  }
  function desmontar() { const m = M(); if (m.ciudadDeportiva && m.ciudadDeportiva.unmount) m.ciudadDeportiva.unmount(); if (m.estadio && m.estadio.unmount) m.estadio.unmount(); if (m.ciudad3d && m.ciudad3d.unmount) m.ciudad3d.unmount(); if (m.hogar3d && m.hogar3d.unmount) m.hogar3d.unmount(); if (m.pueblo && m.pueblo.unmount) m.pueblo.unmount(); }
  function navegar(id) {
    if (!S() || !ui.cuerpo) return;
    if (id !== 'club') desmontar();
    ui.pantalla = id; refrescar(true);
    Array.from(ui.nav.children).forEach(b => b.classList.toggle('on', b.getAttribute('data-id') === id));
  }
  function refrescar(arriba) {
    if (!S() || !ui.cuerpo) return;
    const y = ui.cuerpo.scrollTop; cabecera();
    ui.cuerpo.innerHTML = '';
    try { screens[ui.pantalla].render(ui.cuerpo, S()); } catch (err) { ui.cuerpo.append(aviso('Error al mostrar la pantalla: ' + err.message, 'mal')); if (typeof console !== 'undefined') console.error(err); }
    ui.cuerpo.scrollTop = arriba ? 0 : y;
  }
  function menuJuego() {
    const g = M().guardado, st = S();
    const filas = g ? g.listar().map(s => h('div', { class: 'item' }, h('div', null, h('b', null, s.slot === 0 ? 'Autoguardado' : 'Ranura ' + s.slot), h('div', { class: 'muted' }, s.club ? s.temporada + ', ' + U.fechaLarga(s.fecha) : 'Vacía')),
      h('div', { class: 'par' }, s.slot ? h('button', { class: 'btn', onclick: () => { const r = g.guardar(s.slot); toast(r.ok ? (r.persistente ? 'Partida guardada' : 'Guardada en memoria (se perderá al cerrar)') : r.motivo); cerrarModales(); } }, 'Guardar') : null,
        s.club ? h('button', { class: 'btn btn-sec', onclick: () => { const r = g.cargar(s.slot); if (!r.ok) toast(r.motivo); else cerrarModales(); } }, 'Cargar') : null))) : [];
    modal(h('div', null, h('h3', null, 'Partida'), h('div', { class: 'lista' }, filas),
      h('div', { class: 'par' }, h('button', { class: 'btn btn-sec', onclick: dialogoExportar }, 'Copia de seguridad'), h('button', { class: 'btn btn-sec', onclick: dialogoImportar }, 'Importar')),
      h('button', { class: 'btn btn-sec', style: { marginTop: '8px' }, onclick: () => { try { window.localStorage.setItem('gm1:directo', directoOn() ? 'no' : 'si'); } catch (e) { } toast(directoOn() ? 'Partidos en directo activados' : 'Partidos en directo desactivados'); } }, 'Ver los partidos en directo: activar o desactivar'),
      h('button', { class: 'btn btn-sec', style: { marginTop: '8px' }, onclick: () => setTema(document.documentElement.getAttribute('data-tema') === 'noche' ? 'dia' : 'noche') }, 'Tema claro u oscuro'),
      h('p', { class: 'muted' }, 'El guardado vive en este móvil' + (g && g.protegido() ? ' y el navegador lo protege (no lo borra aunque falte espacio)' : g && g.protegido() === false ? '; el navegador podría borrarlo si falta espacio' : '') + '. Haz copias de seguridad de vez en cuando.')),
      [{ t: 'Salir al menú principal', cls: 'btn-sec', fn: () => { if (g) g.guardar(0); GM.state = null; setTimeout(menu, 0); } }, { t: 'Cerrar', cls: 'btn-sec' }]);
  }
  function dialogoExportar() {
    const G = M().guardado, st = S(), txt = G.exportar(), ta = h('textarea', { class: 'area', rows: 4, readonly: true }); ta.value = txt;
    const hecha = msg => { G.copiaHecha(st); G.guardar(0); toast(msg); if (ui.pantalla === 'inicio') refrescar(); };
    const archivo = () => { try { return new File([txt], G.nombreArchivo(st), { type: 'text/plain' }); } catch (e) { return null; } };
    const compartir = typeof navigator !== 'undefined' && navigator.canShare && archivo() && navigator.canShare({ files: [archivo()] });
    modal(h('div', null, h('h3', null, 'Copia de seguridad'), h('p', { class: 'muted' }, 'Guarda la partida fuera del navegador (' + (txt.length / 1e6).toFixed(1) + ' MB). Para recuperarla: Importar, en el menú.'),
      h('div', { class: 'col' },
        compartir ? h('button', { class: 'btn', onclick: () => { navigator.share({ files: [archivo()], title: 'Basket Manager' }).then(() => hecha('Copia enviada'), () => {}); } }, 'Compartir (Drive, correo...)') : null,
        h('button', { class: 'btn' + (compartir ? ' btn-sec' : ''), onclick: () => { const a = document.createElement('a'), u = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })); a.href = u; a.download = G.nombreArchivo(st); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); hecha('Archivo guardado en Descargas'); } }, 'Guardar archivo'),
        h('button', { class: 'btn btn-sec', onclick: () => { try { ta.select(); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => hecha('Copiado'), () => { document.execCommand && document.execCommand('copy'); hecha('Copiado'); }); } catch (e) { toast('Selecciona y copia el texto a mano'); } } }, 'Copiar como texto')),
      ta), [{ t: 'Cerrar', cls: 'btn-sec' }]);
  }

  // ---------- Partido: avanzar y resultado ----------
  function topStats(st, g, eqId) {
    const s = g.resultado.stats || {};
    return Object.keys(s).filter(i => st.jugadores[i] && st.jugadores[i].equipoId === eqId).sort((a, b) => s[b].pts - s[a].pts).slice(0, 3).map(i => ({ p: st.jugadores[i], s: s[i] }));
  }
  function resultadoModal(g) {
    const st = S(), r = g.resultado, mio = st.clubId;
    const gano = (r.local > r.visitante) === (g.local === mio);
    const col = id => h('div', { class: 'top' }, topStats(st, g, id).map(x => h('div', { class: 'fila' }, h('span', null, clip(x.p.nombre, 18)), h('b', null, x.s.pts + ' pts, ' + x.s.reb + ' reb, ' + x.s.ast + ' ast'))));
    const cuartos = h('table', { class: 'tabla pq' }, h('tr', null, h('th'), r.cuartos.map((_, i) => h('th', null, i < 4 ? 'C' + (i + 1) : 'P' + (i - 3))), h('th', null, 'Final')),
      h('tr', null, h('td', null, eq(g.local).siglas), r.cuartos.map(c => h('td', null, c[0])), h('td', { class: 'b' }, r.local)),
      h('tr', null, h('td', null, eq(g.visitante).siglas), r.cuartos.map(c => h('td', null, c[1])), h('td', { class: 'b' }, r.visitante)));
    const ys = carrera() && r.stats && r.stats.yo, yoEl = ys ? h('div', { class: 'aviso ok' }, 'Tu partido: ' + Math.round(ys.min) + ' min, ' + ys.pts + ' pts, ' + ys.reb + ' reb, ' + ys.ast + ' ast.') : (carrera() ? h('div', { class: 'aviso med' }, 'Hoy no has jugado.') : null);
    modal(h('div', { class: 'resultado ' + (gano ? 'gana' : 'pierde') },
      h('div', { class: 'etq' }, (gano ? 'Victoria' : 'Derrota') + ', ' + (CORTO[g.comp] || g.comp) + (g.fase === 'playoff' ? ', Playoffs' : g.fase === 'playin' ? ', Play-in' : '')),
      h('div', { class: 'marcador' }, escudo(g.local, true), h('div', { class: 'pts' }, h('b', null, r.local), h('i', null, '-'), h('b', null, r.visitante)), escudo(g.visitante, true)),
      cuartos, h('h4', null, eq(g.local).nombre), col(g.local), h('h4', null, eq(g.visitante).nombre), col(g.visitante),
      yoEl, h('h4', null, 'Crónica'), h('ul', { class: 'cronica' }, (r.cronica || []).map(t => h('li', null, t))),
      r.asistencia ? h('p', { class: 'muted' }, 'Asistencia: ' + num(r.asistencia) + ', Ingresos del día: ' + U.eur(r.ingresos || 0)) : null), [{ t: 'Continuar' }], { alta: true });
  }
  const directoOn = () => { try { return window.localStorage.getItem('gm1:directo') === 'si'; } catch (e) { return true; } };
  function jugarUnDia(simular) {
    const st = S(), C0 = M().competiciones, g0 = C0.proximoPartido(st, st.clubId);
    if (simular !== true && directoOn() && g0 && g0.fecha === st.fecha && M().directo) {
      M().directo.abrir(st, g0, { control: st.modo === 'gestor' || st.modo === 'entrenador', onFin: res => { st._directo = st._directo || {}; st._directo[g0.id] = res; jugarDiaYa(); } });
      return;
    }
    jugarDiaYa();
  }
  function jugarDiaYa() {
    const st = S(), C = M().competiciones, mio = st.clubId;
    const antes = st.temporadaTerminada;
    const juegos = C.jugarDia(st);
    const g = juegos.find(x => x.local === mio || x.visitante === mio);
    refrescar(); if (g) resultadoModal(g);
    if (!antes && st.temporadaTerminada) toast('¡Fin de temporada!');
  }
  function hastaPartido() {
    const st = S(), C = M().competiciones;
    const n = C.avanzarHastaPartido(st, st.clubId); refrescar(true);
    toast(n ? 'Avanzas ' + n + (n === 1 ? ' día' : ' días') : 'Hoy hay partido');
  }
  function hastaFin() {
    const st = S(), C = M().competiciones; let n = 0;
    while (!st.temporadaTerminada && n < 200) { C.jugarDia(st); n++; }
    refrescar(true); toast('Avanzas ' + n + ' días');
  }
  function nuevaTemporada() {
    const st = S(), M_ = M(), exp = carrera() ? [] : M_.mercado.expiran(st, st.clubId);
    if (entr() && st.entrenador.ofertas.length) { modal(h('div', null, h('h3', null, 'Tu futuro sigue abierto'), h('p', null, 'Tienes ' + st.entrenador.ofertas.length + ' ofertas. Si no decides, la directiva actual decidirá por ti.')), [{ t: 'Ver ofertas', fn: () => { setTimeout(() => navegar('junta'), 0); } }, { t: 'Seguir como estoy', cls: 'btn-sec', fn: () => { M_.competiciones.nuevaTemporada(st); ui.comp = null; refrescar(true); toast('Empieza la temporada ' + st.temporada); } }]); return; }
    if (carrera() && (st.carrera.fase !== 'ncaa' || st.carrera.etapa === 'cantera') && st.carrera.ofertas.length) { modal(h('div', null, h('h3', null, 'Tu futuro sigue abierto'), h('p', null, 'Tu representante tiene ' + st.carrera.ofertas.length + ' ofertas. Si no decides, cerrará él un contrato por ti.')), [{ t: 'Ver ofertas', fn: () => { setTimeout(() => navegar('agente'), 0); } }, { t: 'Que decida mi representante', cls: 'btn-sec', fn: () => { M_.competiciones.nuevaTemporada(st); ui.comp = null; refrescar(true); toast('Empieza la temporada ' + st.temporada); } }]); return; }
    const go = () => { M_.competiciones.nuevaTemporada(st); ui.comp = null; refrescar(true); toast('Empieza la temporada ' + st.temporada); };
    if (exp.length) modal(h('div', null, h('h3', null, 'Contratos sin renovar'), h('p', null, 'Estos jugadores se marcharán al empezar la temporada: ' + exp.map(p => p.nombre).join(', ') + '.')), [{ t: 'Empezar igualmente', fn: go }, { t: 'Volver y renovar', cls: 'btn-sec' }]); else go();
  }

  // ---------- Pantalla: Inicio ----------
  function ovrBarra(a, b) {
    const t = a + b; return h('div', { class: 'duelo' }, h('b', null, a.toFixed(1)), h('span', { class: 'barra dual' }, h('i', { style: { width: (a / t * 100) + '%' } })), h('b', null, b.toFixed(1)));
  }
  function avisos(st) {
    const club = st.clubId, M_ = M(), out = [];
    const pl = st.equipos[club].plantilla.map(i => st.jugadores[i]);
    const les = pl.filter(p => p.estado.lesion && p.estado.lesion.dias > 0);
    if (les.length) out.push(['Lesionados: ' + les.map(p => p.nombre.split(' ').slice(-1)[0] + ' (' + p.estado.lesion.dias + ' d)').join(', ') + '.', 'med']);
    if (pl.length < 10) out.push(['Plantilla corta: ' + pl.length + ' jugadores. Ficha a alguien.', 'mal']);
    if (pl.length > 15) out.push(['Plantilla con ' + pl.length + ' jugadores: el máximo útil es 15.', 'med']);
    const exp = M_.mercado.expiran(st, club);
    if (exp.length && (st.temporadaTerminada || st.fecha >= (parseInt(st.temporada) + 1) + '-03-01')) out.push([exp.length + ' contratos terminan esta temporada: ' + exp.slice(0, 3).map(p => p.nombre.split(' ').slice(-1)[0]).join(', ') + (exp.length > 3 ? '…' : '') + '.', 'med']);
    M_.finanzas.resumen(st, club).avisos.forEach(a => out.push([a, 'med']));
    const t = st.equipos[club].tactica;
    if (t) { const ids = t.quinteto || []; const baja = ids.filter(i => st.jugadores[i] && st.jugadores[i].estado.lesion); if (baja.length) out.push(['Tu quinteto tiene lesionados; se sustituirán solos.', 'med']); }
    return out;
  }
  function inicio(el, st) {
    const club = st.clubId, C = M().competiciones, P = M().partidos, G = M().guardado;
    if (GM.sede && GM.kit && GM.kit.disponible()) el.append(h('button', { class: 'sede-entrar', onclick: () => GM.sede.abrir(st) }, h('b', null, 'Entrar en la sede del club'), h('span', null, 'Camina por las instalaciones, habla con la plantilla y entra en cada sala')));
    if (G && G.necesitaCopia(st)) el.append(h('div', { class: 'aviso med' }, h('b', null, 'Haz una copia de seguridad. '), 'Si se borran los datos del navegador, la partida se pierde. ', h('div', { class: 'par', style: { marginTop: '8px' } }, h('button', { class: 'btn peq', onclick: dialogoExportar }, 'Hacer copia'), h('button', { class: 'btn btn-sec peq', onclick: () => { G.copiaAvisada(st); refrescar(); } }, 'Más tarde'))));
    if (carrera()) { if (inicioCarrera(el, st)) return; }
    else if (st.personaje) el.append(h('button', { class: 'perfil-linea', onclick: perfilModal }, avatarEl(st.personaje, 44), h('div', { class: 'ct' }, h('b', null, M().personaje.nombre(st.personaje)), h('span', { class: 'muted' }, (pres() ? 'Presidente' : entr() ? 'Entrenador' : 'Director técnico') + ' de ' + eq(club).nombre)), chip('Cambiar aspecto')));
    if (entr() && st.entrenador.fase !== 'retirado') {
      const E = M().entrenador, c = st.entrenador, r = E.rango(st);
      el.append(seccion('La directiva', h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, c.fase === 'activo' ? 'Objetivo: ' + c.objetivo.txt : 'Estás sin equipo'), h('b', null, Math.round(c.confianza) + ' %')), barra(c.confianza, 100, c.confianza >= 55 ? 'verde' : c.confianza >= 30 ? 'ambar' : 'rojo'),
        r && c.fase === 'activo' ? h('p', { class: 'muted' }, 'Ahora estás ' + r.puesto + 'º de ' + r.de + ', y el objetivo es acabar ' + c.objetivo.puesto + 'º o mejor.') : null,
        c.fase === 'libre' ? h('div', null, h('p', { class: 'aviso mal' }, 'Te han destituido. Revisa las ofertas en Directiva.'), h('button', { class: 'btn', onclick: () => navegar('junta') }, 'Ver ofertas')) : h('button', { class: 'btn btn-sec', onclick: () => navegar('junta') }, 'Hablar con la directiva'))));
      eventosCards(el, st);
    }
    if (st.temporadaTerminada) {
      const champs = st.historial.filter(x => x.temporada === st.temporada);
      el.append(seccion('Temporada ' + st.temporada + ' terminada', h('div', { class: 'tarjeta' }, h('ul', { class: 'cronica' }, champs.map(c => h('li', null, '🏆 ' + (CORTO[c.comp] || GM.compNombre(st, c.comp)) + ': ' + eq(c.campeon).nombre + (c.campeon === club ? ' (¡tu club!)' : '')))),
        h('p', { class: 'muted' }, carrera() ? 'Revisa las ofertas de tu representante y empieza la siguiente temporada cuando estés listo.' : 'Renueva a los jugadores con contrato que vence (Mercado) y empieza la siguiente temporada cuando estés listo.'), h('button', { class: 'btn grande', onclick: nuevaTemporada }, 'Empezar temporada siguiente'))));
    } else {
      const g = C.proximoPartido(st, club);
      if (g) {
        const hoy = g.fecha === st.fecha, rival = g.local === club ? g.visitante : g.local;
        el.append(seccion('Próximo partido', h('div', { class: 'tarjeta partido' },
          h('div', { class: 'etq' }, (hoy ? 'Hoy' : U.fecha(g.fecha)) + ', ' + (CORTO[g.comp] || g.comp) + etqFase(g, st)),
          h('div', { class: 'marcador' }, escudo(g.local, true), h('div', { class: 'vs' }, 'vs'), escudo(g.visitante, true)),
          h('div', { class: 'nombres' }, h('span', null, clip(eq(g.local).nombre, 20)), h('span', null, clip(eq(g.visitante).nombre, 20))),
          ovrBarra(P.ovrEquipo(st, g.local), P.ovrEquipo(st, g.visitante)),
          (() => { const dv = M().rivalidades && M().rivalidades.derbi(st, g.local, g.visitante); if (!dv) return null; const hh = M().rivalidades.historial(st, g.local, g.visitante); return h('div', { class: 'aviso med' }, '🔥 ' + dv.nombre + '. Historial reciente: ' + eq(g.local).siglas + ' ' + hh[g.local] + ', ' + eq(g.visitante).siglas + ' ' + hh[g.visitante] + '.'); })(),
          h('p', { class: 'muted' }, (g.local === club ? 'Juegas en casa' : 'Juegas fuera') + ', ' + eq(g.local).pabellon.nombre),
          h('div', { class: 'par' }, hoy ? h('button', { class: 'btn grande', onclick: () => jugarUnDia() }, 'Jugar partido') : h('button', { class: 'btn grande', onclick: hastaPartido }, 'Hasta el día del partido'),
            h('button', { class: 'btn btn-sec', onclick: hoy && tacticaOn() ? () => { ui.tab.plantilla = 'tactica'; navegar('plantilla'); } : () => jugarUnDia(true) }, hoy && tacticaOn() ? 'Táctica' : 'Avanzar un día')))));
      } else {
        el.append(seccion('Sin más partidos', h('div', { class: 'tarjeta' }, h('p', null, 'Tu club ya no tiene partidos esta temporada. Puedes seguir al resto de competiciones.'), h('div', { class: 'par' }, h('button', { class: 'btn', onclick: hastaFin }, 'Avanzar hasta el final'), h('button', { class: 'btn btn-sec', onclick: jugarUnDia }, 'Avanzar un día')))));
      }
    }
    if (pres()) {
      const dl = M().legado.dilemas(st), L = st.legado;
      el.append(seccion('Presidencia', h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, 'Alma del club ' + Math.round(L.alma)), h('b', null, 'Influencia ' + Math.round(L.influencia))), barra(L.alma, 100, L.alma >= 60 ? 'verde' : L.alma >= 35 ? 'ambar' : 'rojo'),
        dl.length ? h('p', { class: 'aviso med' }, dl.length + (dl.length === 1 ? ' decisión pendiente' : ' decisiones pendientes') + ': ' + dl.map(d => d.titulo).join(', ') + '.') : h('p', { class: 'muted' }, 'Sin decisiones pendientes.'),
        h('div', { class: 'par' }, h('button', { class: 'btn', onclick: () => navegar('legado') }, 'Legado'), h('button', { class: 'btn btn-sec', onclick: () => navegar('directiva') }, 'Directiva')))));
    }
    const av = avisos(st);
    if (av.length) el.append(seccion('Avisos', av.map(a => aviso(a[0], a[1]))));
    const ligas = GM.ligasDe(st, club);
    ligas.forEach(l => {
      if (!st.ligas[l] || !st.clasificaciones[l]) return;
      const conf = l === 'NBA' ? eq(club).conferencia : null, tabla = C.clasificacion(st, l, conf);
      const pos = tabla.findIndex(r => r.equipoId === club);
      const fil = tabla.slice(0, 4); if (pos >= 4) fil.push(tabla[pos]);
      el.append(seccion(CORTO[l] + ', clasificación', tablaClasif(st, fil, tabla, club)));
    });
    const rec = C.calendarioClub(st, club).filter(g => g.resultado).slice(-5).reverse();
    if (rec.length) el.append(seccion('Últimos resultados', h('div', { class: 'lista' }, rec.map(filaResultado))));
    if (st.noticias.length) el.append(seccion('Noticias', h('div', { class: 'lista noticias' }, st.noticias.slice(0, 6).map(n => h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(n.fecha)), h('span', null, n.texto))))));
  }
  function filaResultado(g) {
    const st = S(), club = st.clubId, r = g.resultado, local = g.local === club, rival = local ? g.visitante : g.local, gano = (r.local > r.visitante) === local;
    return h('button', { class: 'item res', onclick: () => r.cronica ? resultadoModal(g) : null }, h('span', { class: 'wl ' + (gano ? 'w' : 'l') }, gano ? 'V' : 'D'), escudo(rival), h('div', { class: 'ct' }, h('b', null, (local ? 'vs ' : '@ ') + clip(eq(rival).nombre, 20)), h('span', { class: 'muted' }, U.fecha(g.fecha) + ', ' + (CORTO[g.comp] || g.comp))), h('b', null, (local ? r.local : r.visitante) + '-' + (local ? r.visitante : r.local)));
  }
  function tablaClasif(st, filas, tabla, club) {
    return h('table', { class: 'tabla' }, h('tr', null, h('th', null, '#'), h('th', { class: 'iz' }, 'Equipo'), h('th', null, 'PJ'), h('th', null, 'G'), h('th', null, 'P'), h('th', null, '+/-')),
      filas.map(r => h('tr', { class: r.equipoId === club ? 'mio' : '' }, h('td', null, tabla.indexOf(r) + 1), h('td', { class: 'iz' }, escudo(r.equipoId), ' ', clip(eq(r.equipoId).nombre, 17)), h('td', null, r.pj), h('td', null, r.g), h('td', null, r.p), h('td', null, (r.pf - r.pc > 0 ? '+' : '') + (r.pf - r.pc)))));
  }

  // ---------- Pantalla: Plantilla ----------
  function filaJugador(p, st, alClic) {
    const les = lesionTxt(p), s = st.estadisticas[p.id];
    return h('button', { class: 'jug' + (les ? ' lesion' : ''), onclick: alClic },
      h('span', { class: 'pos' }, p.pos), h('span', { class: 'ct' }, h('b', null, clip(p.nombre, 22)), h('span', { class: 'muted' }, p.edad + ' años, ' + U.eur(p.contrato.salario) + (p.contrato.hasta ? ' hasta ' + p.contrato.hasta : '') + (s ? ', ' + (s.pts / s.pj).toFixed(1) + ' pts' : ''))),
      les ? chip(les, 'mal') : h('span', { class: 'energia' }, barra(100 - p.estado.fatiga, 100, p.estado.fatiga > 60 ? 'rojo' : p.estado.fatiga > 35 ? 'ambar' : 'verde')),
      h('span', { class: 'ovr ' + clsOvr(p.ovr) }, p.ovr));
  }
  function detalleJugador(id) {
    const st = S(), p = st.jugadores[id], M_ = M(), mio = p.equipoId === st.clubId, s = st.estadisticas[id];
    const att = h('div', { class: 'attrs' }, Object.keys(ATT).map(k => h('div', { class: 'at' }, h('span', null, ATT[k]), barra(p.att[k], 99, p.att[k] >= 75 ? 'verde' : p.att[k] >= 55 ? 'ambar' : 'rojo'), h('b', null, p.att[k]))));
    const botones = [];
    if (mio && !p.juvenil && !lectura()) {
      botones.push({ t: 'Renovar', fn: () => { setTimeout(() => dialogoContrato(id, 'renovar'), 0); } });
      botones.push({ t: 'Ofertas de venta', cls: 'btn-sec', fn: () => { setTimeout(() => dialogoVenta(id), 0); } });
      botones.push({ t: 'Liberar', cls: 'btn-sec peligro', fn: () => { setTimeout(() => confirmarLiberar(id), 0); } });
    } else if (lectura()) { } else if (p.libre) botones.push({ t: 'Ofrecer contrato', fn: () => { setTimeout(() => dialogoContrato(id, 'fichar'), 0); } });
    else if (p.equipoId && !mio) botones.push({ t: 'Comprar por ' + U.eur(M_.mercado.precioMinimo(st, id)), fn: () => { setTimeout(() => confirmarCompra(id), 0); } });
    botones.push({ t: 'Cerrar', cls: 'btn-sec' });
    modal(h('div', null, h('div', { class: 'fila' }, h('h3', null, p.nombre), h('span', { class: 'ovr grande ' + clsOvr(p.ovr) }, p.ovr)),
      h('p', { class: 'muted' }, POSN[p.pos] + ', ' + p.edad + ' años, ' + p.altura + ' cm, ' + p.nac + (p.equipoId ? ', ' + eq(p.equipoId).nombre : ', Agente libre') + (p.ficticio ? ', jugador ficticio' : '')),
      h('div', { class: 'chips' }, chip('Potencial ' + p.pot), chip('Forma ' + Math.round(p.estado.forma)), chip('Fatiga ' + Math.round(p.estado.fatiga)), chip('Moral ' + Math.round(p.estado.moral)), p.contrato.salario ? chip(U.eur(p.contrato.salario) + ' hasta ' + p.contrato.hasta) : null, lesionTxt(p) ? chip(p.estado.lesion.tipo + ', ' + p.estado.lesion.dias + ' d', 'mal') : null),
      s ? h('p', null, 'Temporada: ' + s.pj + ' pj, ' + (s.pts / s.pj).toFixed(1) + ' pts, ' + (s.reb / s.pj).toFixed(1) + ' reb, ' + (s.ast / s.pj).toFixed(1) + ' ast, ' + Math.round(s.min / s.pj) + ' min') : null, att), botones, { alta: true });
  }
  function confirmarLiberar(id) {
    const st = S(), p = st.jugadores[id], quedan = Math.max(0, p.contrato.hasta - parseInt(st.temporada)), coste = Math.min(p.contrato.salario * 2, Math.round(p.contrato.salario * 0.5 * quedan));
    modal(h('div', null, h('h3', null, '¿Liberar a ' + p.nombre + '?'), h('p', null, 'Indemnización estimada: ' + U.eur(coste) + '. Dejará el club y pasará a agentes libres.')),
      [{ t: 'Liberar', cls: 'peligro', fn: () => { const r = M().mercado.liberar(st, id); if (!r.ok) { toast(r.motivo); return false; } refrescar(); } }, { t: 'Cancelar', cls: 'btn-sec' }]);
  }
  function confirmarCompra(id) {
    const st = S(), p = st.jugadores[id], pr = M().mercado.precioMinimo(st, id);
    modal(h('div', null, h('h3', null, 'Comprar a ' + p.nombre), h('p', null, 'Su club pide ' + U.eur(pr) + '. Mantiene su contrato (' + U.eur(p.contrato.salario) + ' hasta ' + p.contrato.hasta + ').'), h('p', { class: 'muted' }, 'Tu caja: ' + U.eur(st.finanzas[st.clubId].caja))),
      [{ t: 'Pagar ' + U.eur(pr), fn: () => { const r = M().mercado.comprar(st, id); if (!r.ok) { toast(r.motivo); return false; } toast('Fichaje completado'); refrescar(); } }, { t: 'Cancelar', cls: 'btn-sec' }]);
  }
  function dialogoVenta(id) {
    const st = S(), p = st.jugadores[id], of = M().mercado.ofertasVenta(st, id);
    modal(h('div', null, h('h3', null, 'Ofertas por ' + p.nombre), of.length ? h('div', { class: 'lista' }, of.map(o => h('div', { class: 'item' }, escudo(o.equipoId), h('div', { class: 'ct' }, h('b', null, eq(o.equipoId).nombre), h('span', { class: 'muted' }, 'Ofrece ' + U.eur(o.precio))),
      h('button', { class: 'btn', onclick: () => { const r = M().mercado.vender(st, id, o.equipoId); if (r.ok) { cerrarModales(); toast('Traspaso cerrado'); refrescar(); } else toast(r.motivo); } }, 'Vender')))) : h('p', { class: 'muted' }, 'Ningún club está interesado ahora mismo.')), [{ t: 'Cerrar', cls: 'btn-sec' }]);
  }
  function dialogoContrato(id, tipo) {
    const st = S(), p = st.jugadores[id], Mm = M().mercado, club = st.clubId;
    const pedido = Mm.salarioPedido(st, id, club), ren = tipo === 'renovar';
    const min = Math.round(pedido * 0.7 / 10000) * 10000, max = Math.round(pedido * 1.8 / 10000) * 10000;
    let anos = 2; const sl = h('input', { type: 'range', min, max, step: 10000, value: Math.round(pedido / 10000) * 10000, class: 'rango' });
    const info = h('p', { class: 'muted' }), tp = Mm.topeSalarial(st, club);
    const yb = h('div', { class: 'seg' });
    const upd = () => { const ev = Mm.evaluarOferta(st, id, club, +sl.value, anos, ren); info.textContent = 'Pide unos ' + U.eur(ev.pedido) + '/año, probabilidad de aceptar: ' + Math.round(ev.prob * 100) + ' %'; sal.textContent = U.eur(+sl.value) + ' / año'; yb.innerHTML = ''; [1, 2, 3, 4].forEach(a => yb.append(h('button', { class: 'tab' + (a === anos ? ' on' : ''), onclick: () => { anos = a; upd(); } }, a + (a === 1 ? ' año' : ' años')))); };
    const sal = h('b', { class: 'gran' });
    sl.addEventListener('input', upd);
    modal(h('div', null, h('h3', null, (ren ? 'Renovar a ' : 'Contrato para ') + p.nombre), h('p', { class: 'muted' }, 'Masa salarial ' + U.eur(tp.masa) + ' de ' + U.eur(tp.tope) + ' (' + tp.tipo + ')'), sal, sl, yb, info),
      [{ t: ren ? 'Proponer renovación' : 'Ofrecer contrato', fn: () => { const r = ren ? Mm.renovar(st, id, { salario: +sl.value, anos }) : Mm.ofertar(st, id, { salario: +sl.value, anos }); if (!r.ok) { toast(r.motivo); return false; } toast(ren ? 'Renovación firmada' : 'Fichaje completado'); refrescar(); } }, { t: 'Cancelar', cls: 'btn-sec' }]);
    upd();
  }
  function tabPlantilla(el, st) {
    const club = st.clubId, pl = st.equipos[club].plantilla.map(i => st.jugadores[i]).sort((a, b) => b.ovr - a.ovr);
    el.append(seccion('Primer equipo, ' + pl.length + ' jugadores', h('div', { class: 'lista' }, pl.map(p => filaJugador(p, st, () => detalleJugador(p.id))))));
  }
  function tabTactica(el, st) {
    const club = st.clubId, P = M().partidos, pl = st.equipos[club].plantilla.map(i => st.jugadores[i]).sort((a, b) => b.ovr - a.ovr);
    let t = Object.assign({}, st.equipos[club].tactica || P.tacticaAuto(st, club));
    t.quinteto = (t.quinteto || []).filter(i => st.jugadores[i] && st.jugadores[i].equipoId === club);
    const cont = h('div'), draw = () => {
      cont.innerHTML = '';
      const sel = t.quinteto;
      cont.append(h('p', { class: sel.length === 5 ? 'muted' : 'aviso med' }, 'Quinteto titular: ' + sel.length + '/5. Toca para elegir.'));
      cont.append(h('div', { class: 'lista' }, pl.map(p => h('button', { class: 'jug' + (sel.indexOf(p.id) >= 0 ? ' sel' : '') + (p.estado.lesion ? ' lesion' : ''), onclick: () => { const i = sel.indexOf(p.id); if (i >= 0) sel.splice(i, 1); else if (sel.length < 5) sel.push(p.id); else toast('Ya hay 5 titulares'); draw(); } },
        h('span', { class: 'pos' }, p.pos), h('span', { class: 'ct' }, h('b', null, clip(p.nombre, 22)), h('span', { class: 'muted' }, p.edad + ' años' + (p.estado.lesion ? ', lesionado' : ''))), sel.indexOf(p.id) >= 0 ? chip('Titular', 'ok') : null, h('span', { class: 'ovr ' + clsOvr(p.ovr) }, p.ovr)))));
      const seg = (tit, key, ops) => h('div', { class: 'ajuste' }, h('b', null, tit), h('div', { class: 'seg' }, ops.map(o => h('button', { class: 'tab' + (t[key] === o[0] ? ' on' : ''), onclick: () => { t[key] = o[0]; draw(); } }, o[1]))));
      cont.append(seccion('Estilo', seg('Ritmo', 'ritmo', [[1, 'Muy lento'], [2, 'Lento'], [3, 'Normal'], [4, 'Rápido'], [5, 'Muy rápido']]), seg('Defensa', 'defensa', [['hombre', 'Individual'], ['zona', 'Zona'], ['mixta', 'Mixta']]), seg('Foco ofensivo', 'foco', [['interior', 'Interior'], ['equilibrado', 'Equilibrado'], ['exterior', 'Exterior']])));
      cont.append(h('div', { class: 'par' }, h('button', { class: 'btn', onclick: () => { if (t.quinteto.length !== 5) { toast('Elige 5 titulares'); return; } st.equipos[club].tactica = { quinteto: t.quinteto.slice(), ritmo: t.ritmo, defensa: t.defensa, foco: t.foco }; toast('Táctica guardada'); } }, 'Guardar táctica'),
        h('button', { class: 'btn btn-sec', onclick: () => { t = Object.assign({}, P.tacticaAuto(st, club)); draw(); } }, 'Automática')));
    };
    el.append(cont); draw();
  }
  function tabCantera(el, st) {
    const club = st.clubId, C = M().cantera, c = st.cantera[club];
    if (lectura()) { el.append(seccion('Juveniles (' + c.juveniles.length + ')', h('p', { class: 'muted' }, 'Tu entrenador decide quién sube al primer equipo.'), h('div', { class: 'lista' }, c.juveniles.map(i => st.jugadores[i]).sort((a, b) => b.pot - a.pot).map(p => h('div', { class: 'jug' }, h('span', { class: 'pos' }, p.pos), h('span', { class: 'ct' }, h('b', null, p.nombre), h('span', { class: 'muted' }, p.edad + ' años, potencial ' + p.pot)), h('span', { class: 'ovr ' + clsOvr(p.ovr) }, p.ovr)))))); return; }
    el.append(seccion('Entrenamiento', h('div', { class: 'seg' }, ['equilibrado', 'tiro', 'defensa', 'fisico', 'pase'].map(f => h('button', { class: 'tab' + (c.foco === f ? ' on' : ''), onclick: () => { C.fijarFoco(st, club, f); refrescar(); } }, f.charAt(0).toUpperCase() + f.slice(1)))),
      h('p', { class: 'muted' }, 'El foco decide qué atributos mejoran cada semana. Los lunes se aplica el entrenamiento.')));
    el.append(seccion('Juveniles (' + c.juveniles.length + '/10)', c.juveniles.length ? h('div', { class: 'lista' }, c.juveniles.map(i => st.jugadores[i]).sort((a, b) => b.pot - a.pot).map(p => h('div', { class: 'jug' }, h('span', { class: 'pos' }, p.pos), h('span', { class: 'ct' }, h('b', null, p.nombre), h('span', { class: 'muted' }, p.edad + ' años, potencial ' + p.pot)), h('span', { class: 'par' }, h('button', { class: 'btn peq', onclick: () => { const r = C.subirAlPrimerEquipo(st, p.id); if (!r.ok) toast(r.motivo); else refrescar(); } }, 'Subir'), h('button', { class: 'btn btn-sec peq', onclick: () => { C.soltarJuvenil(st, club, p.id); refrescar(); } }, 'Soltar')), h('span', { class: 'ovr ' + clsOvr(p.ovr) }, p.ovr)))) : h('p', { class: 'muted' }, 'Sin juveniles.')));
    const cont = h('div', { class: 'lista' }, c.prospectos.map(i => st.jugadores[i]).map(p => h('div', { class: 'jug' }, h('span', { class: 'pos' }, p.pos), h('span', { class: 'ct' }, h('b', null, p.nombre), h('span', { class: 'muted' }, p.edad + ' años, ' + p.nac + ', potencial ' + p.pot)), h('button', { class: 'btn peq', onclick: () => { const r = C.ficharJuvenil(st, club, p.id); if (!r.ok) toast(r.motivo); else refrescar(); } }, 'Fichar'), h('span', { class: 'ovr ' + clsOvr(p.ovr) }, p.ovr))));
    el.append(seccion('Ojeadores', h('div', { class: 'seg' }, Object.keys(C.ZONAS).map(z => h('button', { class: 'tab', onclick: () => { const r = C.ojear(st, club, z); if (!r.ok) toast(r.motivo); else { toast('Ojeo hecho por ' + U.eur(r.coste)); refrescar(); } } }, z === 'eeuu' ? 'EE. UU.' : z.charAt(0).toUpperCase() + z.slice(1)))), c.prospectos.length ? cont : h('p', { class: 'muted' }, 'Elige una zona para ver prospectos (cuesta dinero).')));
  }
  function plantilla(el, st) {
    if (lectura() && !tacticaOn() && ui.tab.plantilla === 'tactica') ui.tab.plantilla = 'plantilla';
    if ((carrera() || entr()) && ui.tab.plantilla === 'cantera') ui.tab.plantilla = 'plantilla';
    el.append(pestanas(carrera() ? [['plantilla', 'Plantilla']] : entr() ? [['plantilla', 'Plantilla'], ['tactica', 'Táctica']] : pres() ? [['plantilla', 'Plantilla'], ['cantera', 'Cantera']] : [['plantilla', 'Plantilla'], ['tactica', 'Táctica'], ['cantera', 'Cantera']], ui.tab.plantilla, t => { ui.tab.plantilla = t; refrescar(true); }));
    ({ plantilla: tabPlantilla, tactica: tabTactica, cantera: tabCantera })[ui.tab.plantilla](el, st);
  }

  // ---------- Pantalla: Mercado ----------
  function filaFicha(p, st, extra) {
    return h('button', { class: 'jug', onclick: () => detalleJugador(p.id) }, h('span', { class: 'pos' }, p.pos), h('span', { class: 'ct' }, h('b', null, clip(p.nombre, 22)), h('span', { class: 'muted' }, p.edad + ' años, pot. ' + p.pot + (p.equipoId ? ', ' + eq(p.equipoId).siglas : '') + (extra ? ', ' + extra : ''))), h('span', { class: 'ovr ' + clsOvr(p.ovr) }, p.ovr));
  }
  function mercado(el, st) {
    const Mm = M().mercado, club = st.clubId, tp = Mm.topeSalarial(st, club);
    el.append(pestanas([['libres', 'Libres'], ['clubes', 'Otros clubes'], ['contratos', 'Contratos']], ui.tab.mercado, t => { ui.tab.mercado = t; refrescar(true); }));
    el.append(h('div', { class: 'resumen' }, h('span', null, 'Masa salarial'), h('b', null, U.eur(tp.masa) + ' / ' + U.eur(tp.tope)), barra(tp.masa, tp.tope, tp.margen < 0 ? 'rojo' : 'verde'), h('span', { class: 'muted' }, tp.tipo + ', plantilla ' + st.equipos[club].plantilla.length + '/15')));
    if (ui.tab.mercado === 'libres') {
      const ls = Mm.libres(st).slice(0, 40);
      el.append(seccion('Agentes libres', h('div', { class: 'lista' }, ls.map(p => filaFicha(p, st, 'pide ' + U.eur(Mm.salarioPedido(st, p.id, club)))))));
    } else if (ui.tab.mercado === 'clubes') {
      const f = ui.fil, D = st;
      const lig = h('select', { class: 'sel', onchange: e => { f.liga = e.target.value; f.equipo = ''; refrescar(); } }, h('option', { value: '' }, 'Todas las ligas'), Object.keys(st.ligas).map(l => h('option', { value: l, selected: f.liga === l }, st.ligas[l].nombre)));
      const ids = f.liga ? st.ligas[f.liga].equipos : Object.keys(st.equipos);
      const eqs = h('select', { class: 'sel', onchange: e => { f.equipo = e.target.value; refrescar(); } }, h('option', { value: '' }, 'Todos los clubes'), ids.filter(i => i !== club).sort((a, b) => st.equipos[a].nombre.localeCompare(st.equipos[b].nombre)).map(i => h('option', { value: i, selected: f.equipo === i }, st.equipos[i].nombre)));
      const pos = h('select', { class: 'sel', onchange: e => { f.pos = e.target.value; refrescar(); } }, h('option', { value: '' }, 'Cualquier posición'), ['PG', 'SG', 'SF', 'PF', 'C'].map(x => h('option', { value: x, selected: f.pos === x }, POSN[x])));
      const txt = h('input', { class: 'sel', placeholder: 'Buscar por nombre', value: f.texto }); txt.addEventListener('change', () => { f.texto = txt.value; refrescar(); });
      const res = Mm.buscar(st, { liga: f.liga, equipo: f.equipo, pos: f.pos, texto: f.texto }).slice(0, 40);
      el.append(h('div', { class: 'filtros' }, lig, eqs, pos, txt), seccion('Jugadores de otros clubes', h('div', { class: 'lista' }, res.map(p => filaFicha(p, st, Mm.precioMinimo(st, p.id) ? 'pide ' + U.eur(Mm.precioMinimo(st, p.id)) : '')))));
    } else {
      const pl = st.equipos[club].plantilla.map(i => st.jugadores[i]).sort((a, b) => a.contrato.hasta - b.contrato.hasta || b.ovr - a.ovr);
      el.append(seccion('Contratos de tu plantilla', h('div', { class: 'lista' }, pl.map(p => filaJugador(p, st, () => detalleJugador(p.id))))));
      const dr = st.mercado.ultimoDraft;
      if (dr) el.append(seccion('Último draft NBA (' + dr.temporada + ')', h('div', { class: 'lista' }, dr.picks.filter(k => k.n <= 10 || k.equipoId === club).map(k => h('div', { class: 'item' }, h('span', { class: 'muted f' }, '#' + k.n), escudo(k.equipoId), h('span', { class: 'ct' }, h('b', null, st.jugadores[k.jugadorId] ? st.jugadores[k.jugadorId].nombre : '-'))))))); 
    }
  }

  // ---------- Pantalla: Calendario ----------
  function copasPantalla(el, st) {
    const CP = M().copas, club = st.clubId, mias = GM.ligasDe(st, club);
    const ids = Object.keys(st.copas || {}).sort((a, b) => (mias.indexOf(st.copas[a].liga) < 0) - (mias.indexOf(st.copas[b].liga) < 0));
    ids.forEach(id => {
      const c = CP.copa(st, id), mio = mias.indexOf(c.liga) >= 0;
      const rondas = c.rondas.slice().reverse().map(r => h('div', null, h('h4', null, r.nombre),
        h('div', { class: 'lista' }, r.partidos.map(g => h('div', { class: 'item serie' + (g.local === club || g.visitante === club ? ' mio' : '') }, escudo(g.local), h('b', null, g.resultado ? g.resultado.local : '-'), h('span', { class: 'muted' }, ' '), h('b', null, g.resultado ? g.resultado.visitante : '-'), escudo(g.visitante))))));
      el.append(seccion(c.nombre, h('div', { class: 'tarjeta' },
        c.campeon ? h('div', { class: 'aviso ok' }, '🏆 Campeón: ' + eq(c.campeon).nombre) : h('p', { class: 'muted' }, c.estado === 'pendiente' ? 'Se disputa el ' + U.fechaLarga(c.fecha) + ' entre los 8 primeros de ' + (CORTO[c.liga] || c.liga) + '.' : 'Eliminatoria en curso.'), rondas)));
    });
    const CN = M().continental, mios_ = CN ? CN.de(st, club) : [];
    Object.keys(st.continental || {}).sort((a, b) => (mios_.indexOf(a) < 0) - (mios_.indexOf(b) < 0)).forEach(id => {
      const c = st.continental[id], mio = mios_.indexOf(id) >= 0, G = c.grupos || [];
      const gi = G.findIndex(g => g.equipos.indexOf(club) >= 0), tabla = gi >= 0 ? CN.tablaGrupo(st, id, gi) : null;
      const estTxt = { pendiente: 'Empieza a finales de septiembre.', previa: 'Fase previa en juego.', grupos: 'Fase de grupos en juego.', ko: 'Eliminatorias en juego.', fin: 'Terminada.' }[c.estado];
      const serie = s => h('div', { class: 'item serie' + (s.a === club || s.b === club ? ' mio' : '') }, escudo(s.a), h('b', null, s.g.map(i => { const g = st.calendario.find(x => x.id === i); return g && g.resultado ? (g.local === s.a ? g.resultado.local : g.resultado.visitante) : '-'; }).join('/')), h('span', { class: 'muted' }, ' '), h('b', null, s.g.map(i => { const g = st.calendario.find(x => x.id === i); return g && g.resultado ? (g.local === s.a ? g.resultado.visitante : g.resultado.local) : '-'; }).join('/')), escudo(s.b), s.ganador ? chip(eq(s.ganador).siglas + ' pasa', 'ok') : null);
      el.append(seccion(c.nombre, h('div', { class: 'tarjeta' }, c.campeon ? h('div', { class: 'aviso ok' }, '🏆 Campeón: ' + eq(c.campeon).nombre) : h('p', { class: 'muted' }, estTxt + (mio ? ' Tu club participa.' : '')),
        tabla ? [h('h4', null, 'Tu grupo'), tablaClasif(st, tabla, tabla, club)] : null,
        (c.ko || []).slice().reverse().map(r => h('div', null, h('h4', null, r.nombre), h('div', { class: 'lista' }, r.series.map(serie)))),
        c.previa && c.previa.length && !G.length ? [h('h4', null, 'Fase previa'), h('div', { class: 'lista' }, c.previa.map(serie))] : null)));
    });
    const rv = M().rivalidades.rivalesDe(st, club).slice(0, 8);
    el.append(seccion('Tus rivalidades', rv.length ? h('div', { class: 'lista' }, rv.map(r => h('div', { class: 'item' }, escudo(r.equipoId), h('div', { class: 'ct' }, h('b', null, eq(r.equipoId).nombre), h('span', { class: 'muted' }, r.nombre)), h('b', null, r.hist[club] + '-' + r.hist[r.equipoId]), r.i === 2 ? chip('Clásico', 'ok') : null))) : h('p', { class: 'muted' }, 'Tu club no tiene rivalidades marcadas todavía.')));
  }
  function calendario(el, st) {
    const club = st.clubId, C = M().competiciones, ligas = Object.keys(st.ligas);
    if (!ui.comp || !st.ligas[ui.comp]) ui.comp = GM.ligasDe(st, club)[0] || ligas[0];
    if (carrera() && st.carrera.fase === 'ncaa' && ui.tab.calendario === 'partidos') ui.tab.calendario = 'tabla';
    el.append(pestanas([['partidos', 'Partidos'], ['tabla', 'Clasificación'], ['playoffs', 'Playoffs'], ['copas', 'Copas y derbis'], ['lideres', 'Líderes']], ui.tab.calendario, t => { ui.tab.calendario = t; refrescar(true); }));
    if (ui.tab.calendario === 'copas') { copasPantalla(el, st); return; }
    if (ui.tab.calendario !== 'partidos') el.append(h('div', { class: 'seg compacto' }, ligas.map(l => h('button', { class: 'tab' + (ui.comp === l ? ' on' : ''), onclick: () => { ui.comp = l; refrescar(); } }, CORTO[l] || l))));
    const t = ui.tab.calendario;
    if (t === 'partidos') {
      const todos = C.calendarioClub(st, club), jug = todos.filter(g => g.resultado), prox = todos.filter(g => !g.resultado);
      el.append(seccion('Resultados', h('div', { class: 'lista' }, jug.slice(-8).reverse().map(filaResultado))));
      el.append(seccion('Próximos partidos', h('div', { class: 'lista' }, prox.slice(0, 10).map(g => { const rival = g.local === club ? g.visitante : g.local; return h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(g.fecha)), escudo(rival), h('div', { class: 'ct' }, h('b', null, (g.local === club ? 'vs ' : '@ ') + clip(eq(rival).nombre, 20)), h('span', { class: 'muted' }, (CORTO[g.comp] || g.comp) + etqFase(g, st)))); }))));
    } else if (t === 'tabla') {
      if (ui.comp === 'NBA') ['E', 'O'].forEach(c => { const tb = C.clasificacion(st, 'NBA', c); el.append(seccion('Conferencia ' + (c === 'E' ? 'Este' : 'Oeste'), tablaClasif(st, tb, tb, club))); });
      else { const tb = C.clasificacion(st, ui.comp); el.append(seccion(st.ligas[ui.comp].nombre, tablaClasif(st, tb, tb, club))); }
    } else if (t === 'playoffs') {
      const po = C.playoffs(st, ui.comp);
      if (!po) { el.append(seccion('Playoffs', h('p', { class: 'muted' }, 'Empezarán cuando termine la fase regular.'))); return; }
      if (po.playin && po.fase === 'playin') el.append(seccion('Play-in', po.playin.map(gr => h('div', { class: 'tarjeta' }, h('b', null, gr.conf ? (gr.conf === 'E' ? 'Este' : 'Oeste') : 'Euroliga'), h('p', { class: 'muted' }, 'Del 7º al 10º: ' + gr.seeds.slice(6).map(i => eq(i).siglas).join(', '))))));
      po.rondas.slice().reverse().forEach(r => el.append(seccion(r.nombre + ' (al mejor de ' + r.mejorDe + ')', h('div', { class: 'lista' }, r.series.map(s => h('div', { class: 'item serie' }, escudo(s.a), h('b', null, s.wa), h('span', { class: 'muted' }, '-'), h('b', null, s.wb), escudo(s.b), s.ganador ? chip(eq(s.ganador).siglas + ' pasa', 'ok') : null))))));
      if (po.campeon) el.append(aviso('🏆 Campeón: ' + eq(po.campeon).nombre, 'ok'));
    } else {
      const liga = st.ligas[ui.comp], mia = new Set(liga.equipos);
      const l = Object.keys(st.estadisticas).filter(i => st.jugadores[i] && mia.has(st.jugadores[i].equipoId) && st.estadisticas[i].pj >= 5).sort((a, b) => st.estadisticas[b].pts / st.estadisticas[b].pj - st.estadisticas[a].pts / st.estadisticas[a].pj).slice(0, 12);
      el.append(seccion('Máximos anotadores', h('div', { class: 'lista' }, l.length ? l.map((i, k) => { const p = st.jugadores[i], s = st.estadisticas[i]; return h('button', { class: 'jug', onclick: () => detalleJugador(i) }, h('span', { class: 'pos' }, k + 1), escudo(p.equipoId), h('span', { class: 'ct' }, h('b', null, p.nombre), h('span', { class: 'muted' }, s.pj + ' pj, ' + (s.reb / s.pj).toFixed(1) + ' reb, ' + (s.ast / s.pj).toFixed(1) + ' ast')), h('b', null, (s.pts / s.pj).toFixed(1))); }) : [h('p', { class: 'muted' }, 'Aún no hay estadísticas.')])));
    }
  }

  // ---------- Pantalla: Club (3D) ----------
  function club(el, st) {
    desmontar();
    el.append(pestanas([['cd', 'Ciudad deportiva'], ['est', 'Estadio']], ui.tab.club, t => { ui.tab.club = t; refrescar(true); }));
    const cont = h('div', { class: 'club3d' }); el.append(cont);
    const m = ui.tab.club === 'cd' ? M().ciudadDeportiva : M().estadio;
    if (m && m.mount) m.mount(cont, st); else cont.append(aviso('Módulo no disponible.', 'mal'));
  }

  // ---------- Pantalla: Ciudad ----------
  function medidor(t, v, desc) { return h('div', { class: 'medidor' }, h('div', { class: 'fila' }, h('b', null, t), h('b', null, Math.round(v))), barra(v, 100, v >= 60 ? 'verde' : v >= 35 ? 'ambar' : 'rojo'), h('span', { class: 'muted' }, desc)); }
  function ciudadResumen(el, st) {
    const Cc = M().ciudad, club = st.clubId, c = st.ciudad[club], p = Cc.perfil(st, club), mod = Cc.modificadores(st, club);
    el.append(seccion(p.municipio, h('p', null, p.texto)));
    el.append(seccion('Cómo te ve la ciudad', medidor('Ambiente', c.ambiente, 'El ruido de tu pabellón. Sube con victorias y eventos.'), medidor('Afición', c.aficion, 'Abonados, peñas y camisetas.'), medidor(p.ayuntamiento, c.apoyoAyuntamiento, 'Licencias, ayudas y permisos para obras.'),
      h('div', { class: 'chips' }, chip('Asistencia ×' + mod.asistencia.toFixed(2)), chip('Ingresos ×' + mod.ingresos.toFixed(2)), chip('Obras ×' + mod.obras.toFixed(2)), chip('Cantera ×' + mod.cantera.toFixed(2)))));
    el.append(seccion('Convenios', h('div', { class: 'lista' }, Cc.conveniosDisponibles(st, club).map(k => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, k.nombre), k.disponible ? h('button', { class: 'btn peq', onclick: () => { const r = Cc.firmarConvenio(st, club, k.id); if (!r.ok) toast(r.motivo); else { toast('Convenio firmado'); refrescar(); } } }, k.coste ? 'Firmar, ' + U.eur(k.coste) : 'Firmar') : chip('Vigente', 'ok')), h('span', { class: 'muted' }, k.desc + (k.motivo && !k.disponible ? ' ' + k.motivo + '.' : '')))))));
    el.append(seccion('Eventos', h('div', { class: 'lista' }, Cc.eventosDisponibles(st, club).map(k => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, k.nombre), k.disponible ? h('button', { class: 'btn peq', onclick: () => { const r = Cc.organizarEvento(st, club, k.id); if (!r.ok) toast(r.motivo); else { toast('Evento organizado'); refrescar(); } } }, k.ingreso ? 'Organizar, +' + U.eur(k.ingreso) : 'Organizar, ' + U.eur(k.coste)) : chip(k.motivo)), h('span', { class: 'muted' }, k.desc))))));
  }

  // ---------- Pantalla: Finanzas ----------
  function finanzasResumen(el, st) {
    const F = M().finanzas, club = st.clubId, r = F.resumen(st, club);
    el.append(seccion('Caja', h('div', { class: 'tarjeta' }, h('div', { class: 'gran ' + (r.caja < 0 ? 'neg' : '') }, U.eur(r.caja)),
      h('div', { class: 'fila' }, h('span', { class: 'muted' }, 'Ingresos de la temporada'), h('b', { class: 'pos-v' }, U.eur(r.ingresosTemp))), h('div', { class: 'fila' }, h('span', { class: 'muted' }, 'Gastos de la temporada'), h('b', { class: 'neg' }, U.eur(r.gastosTemp))),
      h('div', { class: 'fila' }, h('span', { class: 'muted' }, 'Masa salarial'), h('b', null, U.eur(r.masaSalarial) + (r.tope ? ' / ' + U.eur(r.tope.tope) : ''))))));
    r.avisos.forEach(a => el.append(aviso(a, 'med')));
    el.append(seccion('Patrocinadores', h('div', { class: 'lista' }, r.patrocinios.map(p => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, p.nombre), h('b', null, U.eur(p.importeAnual) + '/año')), h('span', { class: 'muted' }, p.tipo + ', hasta ' + p.hasta)))),
      r.ofertas.length ? h('h4', null, 'Ofertas nuevas') : null, h('div', { class: 'lista' }, r.ofertas.map(o => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, o.nombre + ', ' + o.tipo), h('button', { class: 'btn peq', onclick: () => { const x = F.firmarPatrocinio(st, club, o.id); if (!x.ok) toast(x.motivo); else { toast('Patrocinio firmado'); refrescar(); } } }, 'Firmar')), h('span', { class: 'muted' }, U.eur(o.importeAnual) + ' al año durante ' + o.anos + (o.anos === 1 ? ' temporada' : ' temporadas')))))));
    el.append(seccion('Últimos movimientos', h('div', { class: 'lista' }, r.movimientos.slice(0, 14).map(m => h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(m.fecha)), h('span', { class: 'ct' }, m.concepto), h('b', { class: m.importe < 0 ? 'neg' : 'pos-v' }, U.eur(m.importe)))))));
    if (r.historial.length) el.append(seccion('Temporadas anteriores', h('div', { class: 'lista' }, r.historial.map(x => h('div', { class: 'item' }, h('b', null, x.temporada), h('span', { class: 'ct muted' }, 'Ingresos ' + U.eur(x.ingresos) + ', gastos ' + U.eur(x.gastos)), h('b', null, U.eur(x.caja)))))));
  }

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
  function finanzas(el, st) {
    el.append(pestanas([['resumen', 'Resumen'], ['contratos', 'Contratos']], ui.tab.finanzas, t => { ui.tab.finanzas = t; refrescar(true); }));
    if (ui.tab.finanzas === 'contratos') contratosPantalla(el, st); else finanzasResumen(el, st);
  }
  function contratosPantalla(el, st) {
    const K = M().contratos, perf = K.PERF;
    el.append(h('p', { class: 'muted' }, 'Cada categoría ofrece tres alternativas que se excluyen: al firmar una, las otras desaparecen hasta que el contrato termine. Tus decisiones se recuerdan.'));
    K.categorias(st).forEach(c => {
      const act = c.activo, cuerpo = [h('div', { class: 'fila' }, h('b', null, c.nombre), act ? chip('Activo', 'ok') : chip('Libre'))];
      if (act) {
        cuerpo.push(h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, act.nombre), h('b', null, act.importeAnual ? U.eur(act.importeAnual) + '/año' : 'Sin ingresos')),
          h('span', { class: 'muted' }, (act.perfil ? perf[act.perfil].etq + ', ' : '') + 'hasta ' + act.hasta + (act.rescision ? ', rescisión ' + Math.round(act.rescision * 100) + ' % del resto' : '')),
          h('button', { class: 'btn btn-sec peq', onclick: () => { const q = Math.round((act.rescision || 0.5) * act.importeAnual * Math.max(0.5, act.hasta - parseInt(st.temporada)) / 1000) * 1000; modal(h('div', null, h('h3', null, '¿Rescindir con ' + act.nombre + '?'), h('p', null, 'Penalización estimada: ' + U.eur(q) + '. La afición y el ayuntamiento lo notarán.')), [{ t: 'Rescindir', cls: 'peligro', fn: () => { const r = K.rescindir(st, c.tipo); if (!r.ok) { toast(r.motivo); return false; } refrescar(); } }, { t: 'Cancelar', cls: 'btn-sec' }]); } }, 'Rescindir')));
      }
      if (c.bloqueo) cuerpo.push(h('p', { class: 'muted' }, c.bloqueo));
      c.ofertas.forEach(o => cuerpo.push(h('button', { class: 'item col', style: { textAlign: 'left' }, onclick: () => modal(h('div', null, h('h3', null, o.nombre), h('p', { class: 'muted' }, o.etq + ', ' + c.nombre), h('p', null, o.desc),
        h('div', { class: 'chips' }, chip(o.importeAnual ? U.eur(o.importeAnual) + '/año' : 'Sin ingresos'), chip(o.anos + (o.anos === 1 ? ' temporada' : ' temporadas')), chip('Rescisión ' + Math.round(o.rescision * 100) + ' %')), o.req ? h('p', { class: 'aviso med' }, o.req) : null),
        [{ t: 'Firmar', fn: () => { const r = K.firmar(st, c.tipo, o.id); if (!r.ok) { toast(r.motivo); return false; } toast('Contrato firmado'); refrescar(); } }, { t: 'Cancelar', cls: 'btn-sec' }]) },
        h('div', { class: 'fila' }, h('b', null, o.nombre), h('b', null, o.importeAnual ? U.eur(o.importeAnual) : '—')), h('span', { class: 'muted' }, o.etq + ', ' + o.anos + (o.anos === 1 ? ' temporada' : ' temporadas') + (o.req ? ', ' + o.req : '')))));
      el.append(seccion(null, h('div', { class: 'tarjeta' }, cuerpo)));
    });
  }
  function inicioCarrera(el, st) {
    const K = M().carrera, c = st.carrera, p = st.jugadores.yo, s = K.stats(st), ro = K.rol(st);
    if (c.fase === 'retirado') { trayectoriaPantalla(el, st); return true; }
    el.append(h('button', { class: 'perfil-linea', onclick: () => navegar('jugador') }, avatarEl(st.personaje, 48, { camiseta: true, numero: dorsal(st) }), h('div', { class: 'ct' }, h('b', null, p.nombre), h('span', { class: 'muted' }, c.fase === 'ncaa' ? (c.etapa === 'cantera' ? 'Cantera de ' + eq(c.cantera.clubId).nombre + ', ' + catEdad(p.edad) : 'Universidad de EE. UU., curso ' + c.curso) : K.retrato(st).club + ', ' + (ro || 'sin equipo'))), h('span', { class: 'ovr grande ' + clsOvr(p.ovr) }, p.ovr)));
    eventosCards(el, st);
    if (c.fase === 'libre') el.append(aviso('No tienes equipo. Ve a Agente y acepta una oferta antes de empezar la temporada.', 'med'));
    if (c.ofertas.length && (c.fase !== 'ncaa' || c.etapa === 'cantera')) el.append(seccion('Ofertas', h('div', { class: 'tarjeta' }, h('p', null, 'Tu representante tiene ' + c.ofertas.length + ' ofertas.'), h('button', { class: 'btn', onclick: () => navegar('agente') }, 'Ver ofertas'))));
    if (c.fase === 'ncaa' && c.etapa === 'cantera') {
      const gf = K.gradoFama(c), cat = catEdad(p.edad);
      el.append(seccion('Tu etapa en la cantera', h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, 'Categoría ' + cat), h('b', null, p.edad + ' años')),
        h('p', null, st.temporadaTerminada ? 'La temporada ha terminado.' : 'Cada semana entrenas y el club te va viendo. Si progresas, subes de categoría.'),
        h('div', { class: 'chips' }, chip('Nivel ' + p.ovr + ', potencial ' + p.pot), chip('Reputación: ' + gf.nombre)),
        p.edad < 18 ? h('p', { class: 'muted' }, 'A los 18 llegarán las ofertas: contrato profesional, universidad en EE. UU. o un año más en el filial.') : h('p', { class: 'aviso med' }, 'Con ' + p.edad + ' años es el momento de decidir tu futuro. Mira las ofertas de tu representante.'),
        st.temporadaTerminada ? h('button', { class: 'btn grande', onclick: nuevaTemporada }, 'Empezar la temporada siguiente') : h('div', { class: 'par' }, h('button', { class: 'btn', onclick: () => { for (let i = 0; i < 7 && !st.temporadaTerminada; i++) M().competiciones.jugarDia(st); refrescar(); } }, 'Avanzar una semana'), h('button', { class: 'btn btn-sec', onclick: () => { let n = 0; while (!st.temporadaTerminada && n < 400) { M().competiciones.jugarDia(st); n++; } refrescar(true); } }, 'Hasta el final')))));
      if (st.noticias.length) el.append(seccion('Noticias', h('div', { class: 'lista noticias' }, st.noticias.slice(0, 5).map(n => h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(n.fecha)), h('span', null, n.texto))))));
      return true;
    }
    if (c.fase === 'ncaa') {
      const mk = K.mock(st);
      el.append(seccion('Tu temporada universitaria', h('div', { class: 'tarjeta' },
        h('p', null, st.temporadaTerminada ? 'El curso ha terminado.' : 'El curso va avanzando. Entrena cada semana y decide si te declaras para el draft.'),
        h('p', { class: 'muted' }, 'Proyección del draft: ' + mk.proyeccion + (mk.pick <= 60 ? ' (puesto ' + mk.pick + ')' : '') + '.'),
        st.temporadaTerminada ? h('button', { class: 'btn grande', onclick: nuevaTemporada }, 'Empezar curso siguiente') : h('div', { class: 'par' }, h('button', { class: 'btn', onclick: () => { for (let i = 0; i < 7 && !st.temporadaTerminada; i++) M().competiciones.jugarDia(st); refrescar(); } }, 'Avanzar una semana'), h('button', { class: 'btn btn-sec', onclick: () => { let n = 0; while (!st.temporadaTerminada && n < 400) { M().competiciones.jugarDia(st); n++; } refrescar(true); } }, 'Hasta el final')))));
      if (st.noticias.length) el.append(seccion('Noticias', h('div', { class: 'lista noticias' }, st.noticias.slice(0, 5).map(n => h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(n.fecha)), h('span', null, n.texto))))));
      return true;
    }
    el.append(seccion('Esta temporada', h('div', { class: 'tarjeta' }, h('div', { class: 'chips' }, chip(s.pj + ' partidos'), chip(s.pts.toFixed(1) + ' pts'), chip(s.reb.toFixed(1) + ' reb'), chip(s.ast.toFixed(1) + ' ast'), chip(Math.round(s.min) + ' min'), ro ? chip(ro) : null))));
    return false;
  }
  function eventosCards(el, st) {
    const K = entr() ? M().entrenador : M().carrera, ev = K.eventos(st);
    if (!ev.length) return;
    el.append(seccion('Decisiones', ev.map(e => h('div', { class: 'tarjeta' }, h('b', null, e.titulo), h('div', { class: 'cita' }, h('span', { class: 'avatar' }, e.quien.charAt(0)), h('div', { class: 'ct' }, h('b', null, e.quien), h('p', { class: 'dicho' }, '«' + e.texto + '»'))),
      h('div', { class: 'lista' }, e.opciones.map(o => h('button', { class: 'btn btn-sec', style: { flexDirection: 'column', alignItems: 'flex-start' }, onclick: () => { const r = K.elegirEvento(st, e.id, o.i); if (!r.ok) toast(r.motivo); else { toast(r.efectos.length ? r.efectos.join(', ') : 'Hecho'); refrescar(); } } }, h('span', null, o.t), h('span', { class: 'muted', style: { fontWeight: 400 } }, o.d))))))));
  }
  function jugadorPantalla(el, st) {
    const K = M().carrera, c = st.carrera, p = st.jugadores.yo, s = K.stats(st), ro = K.rol(st);
    el.append(h('div', { class: 'tarjeta ficha' }, h('div', { class: 'fila' }, avatarEl(st.personaje, 84, { camiseta: true, numero: dorsal(st) }), h('div', { class: 'ct', style: { marginLeft: '10px' } }, h('b', { class: 'gran' }, p.nombre), h('span', { class: 'muted' }, POSN[p.pos] + ', ' + p.edad + ' años, ' + p.altura + ' cm')), h('span', { class: 'ovr grande ' + clsOvr(p.ovr) }, p.ovr)),
      h('div', { class: 'chips' }, chip('Potencial ' + p.pot), chip('Forma ' + Math.round(p.estado.forma)), chip('Fatiga ' + Math.round(p.estado.fatiga)), chip('Moral ' + Math.round(c.moral)), chip(K.gradoFama(c).nombre), p.estado.lesion ? chip('Lesión, ' + p.estado.lesion.dias + ' d', 'mal') : null)));
    { const gf = K.gradoFama(c), es = K.estatusClub(st);
      el.append(seccion('Reputación', h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, gf.nombre), h('span', { class: 'muted' }, gf.sig ? 'Siguiente: ' + gf.sig : 'Nivel máximo')), barra(gf.frac * 100, 100, 'verde'),
        es ? [h('div', { class: 'fila', style: { marginTop: '10px' } }, h('b', null, 'En ' + clip(eq(es.clubId).nombre, 20) + ': ' + es.nombre), h('span', { class: 'muted' }, es.temps + (es.temps === 1 ? ' temporada' : ' temporadas'))), barra(es.frac * 100, 100, es.idx >= 5 ? 'verde' : 'ambar'), h('p', { class: 'muted' }, es.sig ? 'Siguiente grado en el club: ' + es.sig + '.' : 'Eres leyenda de este club.')] : null,
        h('p', { class: 'muted' }, 'La reputación cuesta ganarla y depende del nivel de la liga donde juegas. Cambiar de liga o fichar por un rival la afecta.')))); }
    if (c.fase !== 'ncaa') el.append(seccion('Esta temporada', h('div', { class: 'tarjeta' }, h('div', { class: 'chips' }, chip(s.pj + ' partidos'), chip(Math.round(s.min) + ' min'), chip(s.pts.toFixed(1) + ' pts'), chip(s.reb.toFixed(1) + ' reb'), chip(s.ast.toFixed(1) + ' ast')),
      ro ? h('p', null, 'Rol en el equipo: ' + ro + '. ' + (ro === 'Titular' ? 'El entrenador cuenta contigo para empezar.' : ro === 'Rotación' ? 'Entras con regularidad desde el banquillo.' : 'Necesitas subir de nivel para ganarte minutos.')) : null, c.mejor ? h('p', { class: 'muted' }, 'Tu mejor partido: ' + c.mejor.pts + ' pts, ' + c.mejor.reb + ' reb, ' + c.mejor.ast + ' ast.') : null)));
    { // Potencial dinámico: lo que haces mueve tu techo
      const P = K.potEstado(st), aj = P.ajuste + P.resto, ult = P.historial[0], mes = Object.keys(P.mes || {});
      const linea = (t, v) => h('div', { class: 'fila' }, h('span', null, t), h('b', { class: v >= 0 ? 'sube' : 'baja' }, v >= 0 ? 'sube' : 'baja'));
      el.append(seccion('Tu potencial', h('div', { class: 'tarjeta' },
        h('div', { class: 'fila' }, h('b', null, 'Potencial ' + p.pot), h('span', { class: 'muted' }, Math.abs(aj) < 0.05 ? 'sin cambios todavía' : (aj > 0 ? '+' : '−') + Math.abs(aj).toFixed(1).replace('.', ',') + ' por cómo te cuidas')),
        barra(aj + K.POT_MAX, K.POT_MAX * 2, aj >= 0 ? 'verde' : 'ambar'),
        mes.length ? h('div', null, h('p', { class: 'muted', style: { margin: '10px 0 4px' } }, 'Este mes'), mes.sort((x, y) => Math.abs(P.mes[y]) - Math.abs(P.mes[x])).slice(0, 4).map(k => linea(k, P.mes[k]))) : null,
        ult ? h('div', null, h('p', { class: 'muted', style: { margin: '10px 0 4px' } }, 'El mes pasado'), ult.motivos.map(m => linea(m.t, m.v))) : null,
        h('p', { class: 'muted', style: { marginTop: '10px' } }, p.edad > 27 ? 'A tu edad el potencial ya no se mueve.' : 'Lo suben entrenar fuerte y con constancia, jugar minutos de joven, el buen ánimo y tu mentor. Lo bajan las lesiones, el cansancio, las noches largas y quedarte sin jugar. Como mucho ' + K.POT_MAX + ' puntos arriba o abajo, hasta los 27 años.'))));
    }
    el.append(seccion('Entrenamiento personal', h('div', { class: 'tarjeta' }, h('b', null, 'En qué trabajas'),
      h('div', { class: 'seg' }, [['tiro', 'Tiro'], ['defensa', 'Defensa'], ['fisico', 'Físico'], ['pase', 'Pase y bote'], ['mente', 'Mentalidad']].map(o => h('button', { class: 'tab' + (c.entreno.foco === o[0] ? ' on' : ''), onclick: () => { c.entreno.foco = o[0]; refrescar(); } }, o[1]))),
      h('b', null, 'Intensidad'), h('div', { class: 'seg' }, [['suave', 'Suave'], ['normal', 'Normal'], ['intensa', 'Intensa']].map(o => h('button', { class: 'tab' + (c.entreno.intensidad === o[0] ? ' on' : ''), onclick: () => { c.entreno.intensidad = o[0]; refrescar(); } }, o[1]))),
      h('p', { class: 'muted' }, 'Los lunes trabajas lo que elijas. Una intensidad alta te hace progresar más rápido, pero aumenta el riesgo de lesión.' + (c.prevencion ? ' Tu preparador físico reduce ese riesgo.' : '')))));
    el.append(seccion('Atributos', h('div', { class: 'tarjeta' }, h('div', { class: 'attrs' }, Object.keys(ATT).map(k => h('div', { class: 'at' }, h('span', null, ATT[k]), barra(p.att[k], 99, p.att[k] >= 75 ? 'verde' : p.att[k] >= 55 ? 'ambar' : 'rojo'), h('b', null, p.att[k])))))));
    el.append(h('button', { class: 'btn btn-sec', onclick: perfilModal }, 'Cambiar aspecto'));
  }
  function ofertaModal(o) {
    const st = S(), K = M().carrera, c = st.carrera, e = eq(o.clubId), j = st.jugadores.yo;
    modal(h('div', null, h('div', { class: 'fila' }, h('h3', null, e.nombre), escudo(o.clubId, true)), h('p', { class: 'muted' }, o.tipo + ', ' + K.NOMLIGA[o.liga]),
      h('div', { class: 'chips' }, chip(U.eur(o.salario) + ' al año'), chip(o.anos + (o.anos === 1 ? ' temporada' : ' temporadas')), chip('Rol: ' + o.rol)), h('p', null, o.nota), h('p', { class: 'muted' }, 'Pabellón: ' + e.pabellon.nombre + '. Nivel del equipo: ' + Math.round(M().partidos.ovrEquipo(st, o.clubId)) + '.'),
      o.liga === 'NBA' ? h('p', { class: 'aviso ok' }, 'Es tu oportunidad de jugar en la NBA.') : null,
      (() => { const im = o.tipo === 'Renovación' || !j.equipoId ? null : K.impacto(st, o.clubId); return im ? im.textos.map(t => h('p', { class: 'aviso ' + (im.rival ? 'mal' : 'med') }, t)) : null; })()),
      [{ t: 'Aceptar oferta', fn: () => { const r = K.aceptar(st, o.id); if (!r.ok) { toast(r.motivo); return false; } ui.comp = null; aplicaKit(eq(st.clubId).colores); toast(r.cambioClub ? 'Fichaje cerrado' : 'Renovado'); refrescar(true); } }, { t: 'Cerrar', cls: 'btn-sec' }]);
  }
  function agentePantalla(el, st) {
    const K = M().carrera, c = st.carrera, p = st.jugadores.yo, ag = K.AGENTES[c.agente.perfil];
    el.append(seccion('Tu representante', h('div', { class: 'tarjeta' }, h('div', { class: 'cita' }, h('span', { class: 'avatar' }, c.agente.nombre.charAt(0)), h('div', { class: 'ct' }, h('b', null, c.agente.nombre), h('span', { class: 'rol' }, ag.etq), h('p', { class: 'dicho' }, '«' + ag.desc + '»'))))));
    eventosCards(el, st);
    if (c.fase === 'ncaa' && c.etapa === 'cantera') {
      el.append(seccion('Tu futuro', h('div', { class: 'tarjeta' }, h('p', null, p.edad < 18 ? 'Todavía eres juvenil. A los 18 tu representante te presentará las opciones: contrato profesional, universidad en EE. UU. (con camino al draft de la NBA) o un año más en el filial.' : 'Es la hora de decidir. Elige con cabeza: la liga y el rol que aceptes marcarán tus primeros años.'))));
      if (c.ofertas.length) el.append(seccion('Ofertas', h('div', { class: 'lista' }, c.ofertas.map(o => h('button', { class: 'item', onclick: () => ofertaModal(o) }, escudo(o.clubId), h('div', { class: 'ct' }, h('b', null, eq(o.clubId).nombre), h('span', { class: 'muted' }, o.tipo + ', ' + K.NOMLIGA[o.liga] + ', ' + U.eur(o.salario) + ', ' + o.anos + (o.anos === 1 ? ' año' : ' años'))), o.liga === 'NBA' ? chip('NBA', 'ok') : chip(o.rol))))));
      return;
    }
    if (c.fase === 'ncaa') {
      const mk = K.mock(st);
      el.append(seccion('Camino al draft de la NBA', h('div', { class: 'tarjeta' },
        h('p', null, 'Curso ' + c.curso + ' de 3. ' + (c.curso >= 3 ? 'Este año tendrás que entrar en el draft.' : 'Puedes declararte elegible o esperar otro año.')),
        h('div', { class: 'chips' }, chip('Proyección: ' + mk.proyeccion, mk.pick <= 30 ? 'ok' : ''), mk.pick <= 60 ? chip('Puesto ' + mk.pick) : null),
        h('p', { class: 'muted' }, 'Si te eligen, juegas en la NBA con contrato de novato. Si nadie te elige, saldrás al mercado y tu representante buscará una opción en Europa o un contrato de dos vías.'),
        h('button', { class: 'btn' + (c.declarado ? '' : ' btn-sec'), onclick: () => { K.declararse(st); refrescar(); } }, c.declarado ? 'Estás declarado para el draft (tocar para retirarte)' : 'Declararme para el draft'),
        h('h4', null, 'Candidatos de esta clase'), h('div', { class: 'lista' }, mk.top.slice(0, 5).map(x => h('div', { class: 'item' }, h('span', { class: 'pos' }, x.pos), h('span', { class: 'ct' }, h('b', null, x.nombre)), h('span', { class: 'muted' }, 'pot. ' + x.pot), h('span', { class: 'ovr ' + clsOvr(x.ovr) }, x.ovr)))))));
      return;
    }
    if (c.fase === 'retirado') { el.append(aviso('Te has retirado.', 'med')); return; }
    { const SP = M().sponsor, cats = SP.categorias(st), tot = SP.activos(st).reduce((a, s) => a + s.importe, 0);
      el.append(seccion('Patrocinadores personales', h('p', { class: 'muted' }, 'Marcas que te patrocinan a ti. Cada categoría ofrece tres alternativas incompatibles. Ingresos actuales: ' + Math.round(tot).toLocaleString('es-ES') + ' mil € al año.'),
        cats.map(k => h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, k.nombre), k.activo ? chip('Activo', 'ok') : k.bloqueo && !k.ofertas.length ? chip('Bloqueado') : chip('Libre')),
          k.activo ? h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, k.activo.marca), h('b', null, k.activo.importe + ' k€/año')), h('span', { class: 'muted' }, SP.PERF[k.activo.perfil].etq + ', hasta ' + k.activo.hasta + '. ' + k.activo.clausula),
            h('button', { class: 'btn btn-sec peq', onclick: () => { const r = SP.rescindir(st, k.cat); toast(r.ok ? 'Contrato roto (' + r.penalizacion + ' mil €)' : r.motivo); refrescar(); } }, 'Rescindir')) : null,
          k.bloqueo ? h('p', { class: 'muted' }, k.bloqueo) : null,
          k.ofertas.map(o => h('button', { class: 'item col', style: { textAlign: 'left' }, onclick: () => modal(h('div', null, h('h3', null, o.marca), h('p', { class: 'muted' }, o.etq + ', ' + k.nombre), h('p', null, o.desc), h('div', { class: 'chips' }, chip(o.importe + ' k€ al año'), chip(o.anos + (o.anos === 1 ? ' temporada' : ' temporadas')), chip('Rescisión ' + Math.round(o.rescision * 100) + ' %')), h('p', { class: 'muted' }, o.clausula)),
            [{ t: 'Firmar', fn: () => { const r = SP.firmar(st, k.cat, o.id); if (!r.ok) { toast(r.motivo); return false; } toast('Patrocinio firmado'); refrescar(); } }, { t: 'Cancelar', cls: 'btn-sec' }]) }, h('div', { class: 'fila' }, h('b', null, o.marca), h('b', null, o.importe + ' k€')), h('span', { class: 'muted' }, o.etq + ', ' + o.anos + (o.anos === 1 ? ' temporada' : ' temporadas')))))))); }
    el.append(seccion('Contrato', h('div', { class: 'tarjeta' }, p.equipoId ? [h('div', { class: 'fila' }, h('b', null, eq(p.equipoId).nombre), escudo(p.equipoId)), h('p', { class: 'muted' }, K.NOMLIGA[K.liga(st)] + ', ' + U.eur(p.contrato.salario) + ' al año, hasta ' + p.contrato.hasta)] : h('p', null, 'No tienes equipo.'))));
    el.append(seccion('Ofertas', c.ofertas.length ? h('div', { class: 'lista' }, c.ofertas.map(o => h('button', { class: 'item', onclick: () => ofertaModal(o) }, escudo(o.clubId), h('div', { class: 'ct' }, h('b', null, eq(o.clubId).nombre), h('span', { class: 'muted' }, o.tipo + ', ' + K.NOMLIGA[o.liga] + ', ' + U.eur(o.salario) + ', ' + o.anos + (o.anos === 1 ? ' año' : ' años'))), o.liga === 'NBA' ? chip('NBA', 'ok') : chip(o.rol)))) : [h('p', { class: 'muted' }, c.fase === 'libre' ? 'Sin ofertas todavía.' : 'Las ofertas llegan al final de la temporada o cuando tu contrato se acerca a su fin.'), c.fase === 'libre' ? h('button', { class: 'btn', onclick: () => { K.generarOfertas(st); refrescar(); } }, 'Pedir ofertas a mi representante') : null]));
  }
  function juntaPantalla(el, st) {
    const E = M().entrenador, c = st.entrenador, r = E.rango(st);
    el.append(seccion('Tu situación', h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, 'Confianza de la directiva'), h('b', null, Math.round(c.confianza) + ' %')), barra(c.confianza, 100, c.confianza >= 55 ? 'verde' : c.confianza >= 30 ? 'ambar' : 'rojo'),
      h('div', { class: 'fila' }, h('b', null, 'Reputación'), h('b', null, Math.round(c.reputacion))), barra(c.reputacion, 100, 'verde'), c.fase === 'activo' ? [h('p', null, 'Objetivo: ' + c.objetivo.txt + '.'), r ? h('p', { class: 'muted' }, 'Posición actual: ' + r.puesto + 'º de ' + r.de + '.') : null] : h('p', { class: 'aviso mal' }, 'Estás sin equipo.'))));
    eventosCards(el, st);
    if (c.ofertas.length) el.append(seccion('Ofertas', h('div', { class: 'lista' }, c.ofertas.map(o => h('button', { class: 'item', onclick: () => modal(h('div', null, h('div', { class: 'fila' }, h('h3', null, eq(o.clubId).nombre), escudo(o.clubId, true)), h('p', { class: 'muted' }, o.tipo + ', ' + E.NOMLIGA[o.liga] + ', ' + o.anos + (o.anos === 1 ? ' temporada' : ' temporadas')), h('p', null, o.nota), h('p', null, 'Objetivo: ' + o.obj.txt + '.'), h('p', { class: 'muted' }, 'Nivel del equipo: ' + Math.round(M().partidos.ovrEquipo(st, o.clubId)))),
        [{ t: 'Aceptar', fn: () => { const x = E.aceptar(st, o.id); if (!x.ok) { toast(x.motivo); return false; } ui.comp = null; refrescar(true); toast('Contrato firmado'); } }, { t: 'Cerrar', cls: 'btn-sec' }]) }, escudo(o.clubId), h('div', { class: 'ct' }, h('b', null, eq(o.clubId).nombre), h('span', { class: 'muted' }, o.tipo + ', ' + E.NOMLIGA[o.liga] + ', ' + o.obj.txt)), o.tipo === 'Ascenso' ? chip('Ascenso', 'ok') : o.tipo === 'Renovación' ? chip('Renovar') : null)))));
    if (c.fase !== 'activo') return;
    el.append(seccion('Pedir un fichaje', h('div', { class: 'tarjeta' }, h('p', { class: 'muted' }, 'La directiva decide. Cada petición gasta confianza: te quedan ' + Math.floor(c.peticiones) + '.'),
      h('div', { class: 'lista' }, E.candidatosFichaje(st).slice(0, 8).map(p => h('div', { class: 'item' }, h('span', { class: 'pos' }, p.pos), h('span', { class: 'ct' }, h('b', null, p.nombre), h('span', { class: 'muted' }, p.edad + ' años, pot. ' + p.pot + (p.libre ? ', libre' : ', ' + p.club + ', ' + U.eur(p.precio)))), h('span', { class: 'ovr ' + clsOvr(p.ovr) }, p.ovr), h('button', { class: 'btn peq', onclick: () => { const x = E.pedirFichaje(st, p.id); toast(x.ok ? 'La directiva ficha a ' + p.nombre : x.motivo); refrescar(); } }, 'Pedir')))))));
    el.append(seccion('Cuerpo técnico', h('div', { class: 'lista' }, Object.keys(E.AYUDANTES).map(k => { const a = E.AYUDANTES[k], n = c.ayudantes[k]; return h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, a.etq), chip(E.NIVELES[n], n ? 'ok' : '')), h('span', { class: 'muted' }, a.desc), n < 3 ? h('button', { class: 'btn peq', onclick: () => { const x = E.contratar(st, k); toast(x.ok ? 'Fichado' : x.motivo); refrescar(); } }, (n ? 'Mejorar' : 'Contratar') + ', ' + (a.coste * (n + 1)) + ' mil €') : null); }))));
  }
  function trayectoriaEntrenador(el, st) {
    const c = st.entrenador, E = M().entrenador;
    el.append(seccion('Tu carrera en el banquillo', h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, 'Reputación'), h('b', null, Math.round(c.reputacion))), barra(c.reputacion, 100, 'verde'), h('p', { class: 'muted' }, 'Con reputación suficiente te llegan ofertas de ligas mejores: la Euroliga a partir de 55 y la NBA desde 60.'))));
    el.append(seccion('Temporadas', c.historial.length ? h('table', { class: 'tabla' }, h('tr', null, h('th', { class: 'iz' }, 'Temp.'), h('th', { class: 'iz' }, 'Club'), h('th', null, 'Pos.'), h('th', null, 'Obj.')), c.historial.slice().reverse().map(x => h('tr', null, h('td', { class: 'iz' }, x.temporada.slice(2)), h('td', { class: 'iz' }, (x.titulo ? '🏆 ' : '') + clip(x.club, 16) + ' (' + x.liga + ')'), h('td', null, x.puesto + '/' + x.de), h('td', null, x.cumplido ? '✔' : '✖')))) : h('p', { class: 'muted' }, 'Aún no has completado ninguna temporada.')));
    el.append(seccion('Hitos', h('div', { class: 'lista' }, c.hitos.slice(0, 12).map(x => h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(x.fecha)), h('span', { class: 'ct' }, x.texto))))));
  }
  function trayectoriaPantalla(el, st) {
    if (entr()) return trayectoriaEntrenador(el, st);
    const K = M().carrera, c = st.carrera, p = st.jugadores.yo, lg = K.liga(st);
    const nivelAct = c.fase === 'ncaa' ? 0 : lg ? (lg === 'NBA' ? 3 : lg === 'EUROLIGA' ? 2 : 1) : 0;
    const PELD = [['Cantera o universidad', 'Aprendes el oficio'], ['Liga Endesa o Lega', 'Primeros minutos como profesional'], ['Euroliga', 'La élite europea'], ['NBA', 'El sueño']];
    el.append(seccion(c.fase === 'retirado' ? 'Salón de la fama' : 'El camino', h('div', { class: 'tarjeta' }, h('div', { class: 'escalera' }, PELD.map((d, i) => h('div', { class: 'peldano' + (i === nivelAct ? ' act' : i < nivelAct ? ' sup' : '') }, h('b', null, d[0]), h('span', { class: 'muted' }, d[1]))).reverse()),
      c.fase === 'retirado' ? h('p', null, 'Te retiraste con ' + c.retiro.edad + ' años y un nivel ' + c.retiro.ovr + '. Fama final: ' + Math.round(c.fama) + '. Títulos: ' + c.historial.filter(x => x.titulo).length + '.') : h('p', { class: 'muted' }, 'Para jugar en la NBA suele hacer falta un nivel de ' + K.MIN.NBA + ' o más, o un potencial muy alto siendo joven. En la Euroliga, ' + K.MIN.EUROLIGA + '.'))));
    el.append(seccion('Temporadas', c.historial.length ? h('table', { class: 'tabla' }, h('tr', null, h('th', { class: 'iz' }, 'Temp.'), h('th', { class: 'iz' }, 'Club'), h('th', null, 'PJ'), h('th', null, 'Pts'), h('th', null, 'Reb'), h('th', null, 'Ast')),
      c.historial.slice().reverse().map(x => h('tr', null, h('td', { class: 'iz' }, x.temporada.slice(2)), h('td', { class: 'iz' }, (x.titulo ? '🏆 ' : '') + clip(x.club, 16) + ' (' + x.liga + ')'), h('td', null, x.pj), h('td', null, x.pts), h('td', null, x.reb), h('td', null, x.ast)))) : h('p', { class: 'muted' }, 'Aún no has completado ninguna temporada.')));
    el.append(seccion('Hitos', h('div', { class: 'lista' }, c.hitos.slice(0, 12).map(x => h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(x.fecha)), h('span', { class: 'ct' }, x.texto))))));
    if (c.fase !== 'retirado') el.append(h('button', { class: 'btn btn-sec peligro', onclick: () => modal(h('div', null, h('h3', null, '¿Retirarte?'), h('p', null, 'Tu carrera terminará con ' + p.edad + ' años. No se puede deshacer.')), [{ t: 'Retirarme', cls: 'peligro', fn: () => { M().carrera.retirarse(st); refrescar(true); } }, { t: 'Seguir jugando', cls: 'btn-sec' }]) }, 'Retirarme'));
  }
  registerScreen('junta', { titulo: 'Directiva', icono: 'dir', render: juntaPantalla });
  registerScreen('jugador', { titulo: 'Jugador', icono: 'users', render: jugadorPantalla });
  registerScreen('agente', { titulo: 'Agente', icono: 'dir', render: agentePantalla });
  registerScreen('trayectoria', { titulo: 'Carrera', icono: 'trofeo', render: trayectoriaPantalla });
  registerScreen('legado', { titulo: 'Legado', icono: 'trofeo', render: legadoPantalla });
  registerScreen('directiva', { titulo: 'Directiva', icono: 'dir', render: directivaPantalla });
  registerScreen('inicio', { titulo: 'Inicio', icono: 'home', render: inicio });
  registerScreen('plantilla', { titulo: 'Plantilla', icono: 'users', render: plantilla });
  registerScreen('mercado', { titulo: 'Mercado', icono: 'swap', render: mercado });
  registerScreen('calendario', { titulo: 'Calendario', icono: 'cal', render: calendario });
  registerScreen('club', { titulo: 'Club', icono: 'club', render: club });
  registerScreen('ciudad', { titulo: 'Ciudad', icono: 'city', render: ciudad });
  registerScreen('finanzas', { titulo: 'Finanzas', icono: 'eur', render: finanzas });
  GM.ui.casa = casaModal; GM.ui.jugarUnDia = jugarUnDia; GM.ui.hastaPartido = hastaPartido; GM.ui.refrescar = refrescar; GM.ui.cabecera = () => { if (ui.cabecera && S()) cabecera(); }; GM.ui.registerScreen = registerScreen; GM.ui.start = start; GM.ui.navegar = navegar; GM.ui.toast = toast; GM.ui.modal = modal;
  GM.bus.on('partida:cargada', function () { if (ui.raiz) juego(); });

  function selfTest() {
    if (typeof document === 'undefined' || !GM.state) return true;
    const raiz = document.createElement('div'); start(raiz);
    let ok = true; navItems().forEach(n => { navegar(n[0]); if (ui.cuerpo.querySelector('.aviso.mal')) ok = false; }); desmontar();
    return ok;
  }
  GM.register('ui', { start, navegar, refrescar, toast, modal, registerScreen, selfTest });
})();
