/* INTERFAZ MÓVIL (GM.mods.ui y GM.ui)
   Expone: start(raiz), navegar(id), refrescar, toast, modal, registerScreen y GM.ui._ (utilidades para los archivos de pantallas).
   Aquí quedan las utilidades, el menú, el armazón, el partido y la pantalla Inicio; el resto de pantallas está en ui_*.js.
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
    movil: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10.5 18.5h3"/>',
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
  // Accesibilidad (por dispositivo, en localStorage): tamaño de letra, contraste alto y animaciones reducidas.
  // Se aplican como atributos de <html> que lee estilos.css; las animaciones reducidas siguen la preferencia del sistema si no hay elección.
  const ACCES = { letra: [['normal', 'Normal'], ['grande', 'Grande'], ['muy-grande', 'Muy grande']], contraste: [['normal', 'Normal'], ['alto', 'Alto']], animaciones: [['normal', 'Normales'], ['reducidas', 'Reducidas']] };
  function acces() { let a = {}; try { a = JSON.parse(window.localStorage.getItem('gm1:accesibilidad') || '{}'); } catch (e) { } if (!a.animaciones) { try { a.animaciones = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reducidas' : 'normal'; } catch (e) { a.animaciones = 'normal'; } } return Object.assign({ letra: 'normal', contraste: 'normal' }, a); }
  function aplicarAcces(a) { const r = document.documentElement; r.setAttribute('data-letra', a.letra); r.setAttribute('data-contraste', a.contraste); r.setAttribute('data-animaciones', a.animaciones); }
  function setAcces(k, v) { const a = acces(); a[k] = v; try { window.localStorage.setItem('gm1:accesibilidad', JSON.stringify(a)); } catch (e) { } aplicarAcces(a); }
  try { aplicarAcces(acces()); } catch (e) { }
  function accesModal() {
    const cuerpo = h('div');
    const pintar = () => { const a = acces(); cuerpo.innerHTML = ''; cuerpo.append(h('h3', null, 'Accesibilidad'),
      ...[['letra', 'Tamaño de letra'], ['contraste', 'Contraste'], ['animaciones', 'Animaciones']].map(([k, t]) => h('div', { class: 'ajuste' }, h('b', null, t), h('div', { class: 'seg' }, ACCES[k].map(([v, n]) => h('button', { class: 'tab' + (a[k] === v ? ' on' : ''), onclick: () => { setAcces(k, v); pintar(); } }, n))))),
      h('p', { class: 'muted' }, 'Se guarda en este dispositivo. Las animaciones reducidas quitan transiciones y fundidos de la interfaz.')); };
    pintar(); modal(cuerpo, [{ t: 'Cerrar', cls: 'btn-sec' }]);
  }
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
  // Fondo 3D de las pantallas previas a la partida (menú, elegir liga y club): fijo detrás de la app
  function fondoPortada(on) {
    let f = document.getElementById('portada');
    if (!on) { if (GM.portada3d) GM.portada3d.desmontar(); if (f) f.remove(); if (ui.raiz) ui.raiz.classList.remove('pre'); return; }
    if (ui.raiz) ui.raiz.classList.add('pre');
    if (f) return; f = h('div', { id: 'portada', 'aria-hidden': 'true' }, h('div', { class: 'portada-velo' })); document.body.prepend(f);
    try { if (GM.portada3d) GM.portada3d.montar(f, ['#e8590c']); } catch (e) { if (typeof console !== 'undefined') console.warn('Fondo 3D no disponible: ' + e.message); } // el fondo es decorativo: nunca debe romper el menú
  }
  function menu() {
    cerrarModales(); desmontar(); aplicaKit(['#e8590c', '#1c2b3a']);
    const r = ui.raiz; r.innerHTML = ''; fondoPortada(true);
    const g = M().guardado, slots = g ? g.listar().filter(s => s.club) : [];
    const ultima = slots.slice().sort((x, y) => (y.t || 0) - (x.t || 0))[0];
    const clubDe = nombre => Object.values(GM.data.equipos).find(e => e.nombre === nombre);
    const tarjetaContinuar = () => {
      const e = clubDe(ultima.club), c1 = e ? e.colores[0] : '#e8590c', c2 = e ? (e.colores[1] || c1) : '#1c2b3a';
      return h('button', { class: 'm-continuar', style: { borderLeftColor: c1 }, onclick: () => { const rr = g.cargar(ultima.slot); if (!rr.ok) toast(rr.motivo); } },
        h('span', { class: 'm-escudo', style: { background: 'linear-gradient(135deg,' + c1 + ' 55%,' + c2 + ' 55%)', color: tintaEscudo(c1, c2).color } }, e ? e.siglas : '?'),
        h('span', { class: 'ct' }, h('small', null, 'Continuar'), h('b', null, ultima.club), h('span', null, ultima.temporada + ', ' + U.fechaLarga(ultima.fecha) + (ultima.slot === 0 ? ', autoguardado' : ', ranura ' + ultima.slot))),
        h('span', { class: 'm-flecha' }, '›'));
    };
    r.append(h('div', { class: 'menu menu2' },
      h('header', { class: 'm-marca' },
        h('span', { class: 'm-sello' }, 'Temporada 2026-27'),
        h('h1', null, h('span', null, 'Basket'), h('span', null, 'Manager')),
        h('p', null, 'NBA, Euroliga y siete ligas europeas. Dirige un club, sé su presidente, entrénalo o empieza tu carrera desde cadete.')),
      h('div', { class: 'm-acciones' },
        ultima ? tarjetaContinuar() : null,
        h('button', { class: 'm-nueva', onclick: flujoNueva }, h('b', null, 'Nueva partida'), h('span', null, 'Elige modo, crea tu personaje y tu club')),
        h('div', { class: 'm-fila' },
          slots.length > 1 ? h('button', { class: 'm-sec', onclick: () => cargarMenu(slots) }, 'Otras partidas') : null,
          g ? h('button', { class: 'm-sec', onclick: dialogoImportar }, 'Importar') : null,
          h('button', { class: 'm-sec', onclick: accesModal }, 'Accesibilidad'),
          h('button', { class: 'm-sec', onclick: () => { setTema(document.documentElement.getAttribute('data-tema') === 'noche' ? 'dia' : 'noche'); } }, 'Tema claro u oscuro'))),
      h('p', { class: 'm-pie' }, 'Clubes y jugadores reales; las valoraciones son estimaciones. Modelos 3D de Kenney y Quaternius (CC0).')));
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
    const op = (modo, tit, desc, rol) => h('button', { class: 'liga', onclick: () => { cerrarModales(); ui.nuevo = { modo, pj: M().personaje.crear(), jug: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'cantera', agente: 'equilibrado' } }; setTimeout(() => personajeModal(ui.nuevo.pj, rol, () => { if (modo === 'carrera') jugadorModal(); else elegirLiga(); }, null, modo), 0); } }, h('b', null, tit), h('span', { class: 'muted' }, desc));
    modal(h('div', null, h('h3', null, '¿Cómo quieres jugar?'), h('div', { class: 'col' },
      op('presidente', 'Presidente', 'El club se gestiona solo. Cuidas el legado, la ciudad y las instalaciones, y tomas las grandes decisiones.', 'Tu presidente'),
      op('gestor', 'Director técnico', 'Plantilla, fichajes, tácticas y todo lo demás.', 'Tu director técnico'),
      op('entrenador', 'Entrenador', 'Dirige al equipo desde el banquillo: táctica, vestuario y prensa. La directiva te mide, te despide o te ficha otro club.', 'Tu entrenador'),
      op('carrera', 'Carrera de jugador', 'Sé un jugador: de la cantera o la universidad a la Liga Endesa, la Euroliga y, si llegas, la NBA.', 'Tu jugador'))), [{ t: 'Cancelar', cls: 'btn-sec' }]);
  }
  function personajeModal(pj, titulo, fin, edit, modo) {
    if (pj.cara === undefined) pj.cara = 0; if (pj.zapas === undefined) pj.zapas = 0;
    const OP = M().personaje.OPC, cuerpo = h('div'), ni = h('input', { class: 'sel', placeholder: 'Nombre', value: pj.nombre, maxlength: 18 }), na = h('input', { class: 'sel', placeholder: 'Apellido', value: pj.apellido, maxlength: 20 });
    const campo = (lbl, key, n, nom) => h('div', { class: 'ajuste' }, h('b', null, lbl), h('div', { class: 'seg' }, Array.from({ length: n }, (_, i) => h('button', { class: 'tab' + (pj[key] === i ? ' on' : ''), 'aria-label': lbl + ' ' + (i + 1), onclick: () => { pj.nombre = ni.value; pj.apellido = na.value; pj[key] = i; pintar(); } }, nom(i)))));
    const punto = c => h('span', { style: { display: 'inline-block', width: '18px', height: '18px', borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,.3)', verticalAlign: 'middle' } });
    function pintar() {
      cuerpo.innerHTML = '';
      cuerpo.append(h('div', { class: 'centro' }, avatarEl(pj, 120, edit && edit.camiseta ? { camiseta: true, numero: 7 } : {})),
        h('div', { class: 'filtros' }, ni, na), campo('Piel', 'piel', 5, i => punto(OP.piel[i])), campo('Cara', 'cara', 4, i => OP.cara[i]), campo('Peinado', 'pelo', 6, i => OP.pelo[i]), campo('Color de pelo', 'peloColor', 6, i => punto(OP.peloColor[i])),
        modo === 'carrera' ? null : campo('Cuerpo', 'cuerpo', 2, i => OP.cuerpo[i]), modo === 'carrera' ? null : campo('Altura', 'altura', 3, i => OP.altura[i]),
        campo('Complexión', 'complexion', 3, i => OP.complexion[i]), pj.cuerpo === 1 ? null : campo('Barba', 'barba', 4, i => OP.barba[i]), campo('Gafas', 'gafas', 3, i => OP.gafas[i]),
        campo(modo === 'carrera' ? 'Ropa de calle' : 'Ropa', 'ropa', 4, i => OP.ropa[i]), campo('Accesorios', 'accesorio', 4, i => OP.accesorio[i]), campo('Tatuajes', 'tatuaje', 4, i => OP.tatuaje[i]), campo('Zapatillas', 'zapas', 4, i => OP.zapas[i]));
    }
    pintar();
    modal(h('div', null, h('h3', null, titulo), cuerpo), [{ t: edit ? 'Guardar' : 'Continuar', fn: () => { pj.nombre = ni.value.trim(); pj.apellido = na.value.trim(); if (!pj.nombre) { toast('Escribe un nombre'); return false; } setTimeout(() => fin(pj), 0); } },
      { t: 'Aspecto aleatorio', cls: 'btn-sec', queda: true, fn: () => { const a = M().personaje.aleatorio(); ['piel', 'pelo', 'peloColor', 'barba', 'gafas', 'ropa', 'complexion', 'accesorio', 'tatuaje', 'cara', 'zapas'].forEach(k => { pj[k] = a[k]; }); pj.nombre = ni.value; pj.apellido = na.value; pintar(); return false; } },
      { t: 'Cancelar', cls: 'btn-sec' }], { alta: true });
  }
  function perfilModal() {
    const st = S(), copia = Object.assign({}, st.personaje || M().personaje.crear());
    personajeModal(copia, 'Tu aspecto', pj => { st.personaje = pj; refrescar(); }, { camiseta: carrera() }, st.modo);
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
    const st = S(), r = ui.raiz; cerrarModales(); desmontar(); fondoPortada(false); r.innerHTML = '';
    const e = eq(st.clubId); aplicaKit(e.colores);
    ui.cabecera = h('header', { class: 'cab' }); ui.cuerpo = h('main', { class: 'cuerpo' });
    ui.nav = h('nav', { class: 'nav' }, navItems().map(n => h('button', { class: 'navb', 'data-id': n[0], onclick: () => navegar(n[0]) }, icon(n[2]), h('span', null, n[1]))));
    r.append(ui.cabecera, ui.cuerpo, ui.nav); navegar(ui.pantalla || 'inicio');
    if (GM.ui.tutorialAuto) GM.ui.tutorialAuto();   // ui_tutorial.js: la primera vez de cada modo
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
        M().movil && c.fase !== 'retirado' ? (() => { const n = M().movil.noLeidos(st); return h('button', { class: 'btn-ic movil-btn', 'aria-label': 'Móvil, ' + n + ' sin leer', onclick: () => GM.ui.movil && GM.ui.movil() }, icon('movil'), n ? h('span', { class: 'movil-badge' }, n > 9 ? '9+' : n) : null); })() : '',
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
    ui.cuerpo.innerHTML = ''; ui.cuerpo.setAttribute('data-pantalla', ui.pantalla);
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
      M().copias ? h('button', { class: 'btn btn-sec', style: { marginTop: '8px' }, onclick: copiasModal }, 'Copias automáticas') : null,
      h('button', { class: 'btn btn-sec', style: { marginTop: '8px' }, onclick: () => { try { window.localStorage.setItem('gm1:directo', directoOn() ? 'no' : 'si'); } catch (e) { } toast(directoOn() ? 'Partidos en directo activados' : 'Partidos en directo desactivados'); } }, 'Ver los partidos en directo: activar o desactivar'),
      h('button', { class: 'btn btn-sec', style: { marginTop: '8px' }, onclick: () => setTema(document.documentElement.getAttribute('data-tema') === 'noche' ? 'dia' : 'noche') }, 'Tema claro u oscuro'),
      h('button', { class: 'btn btn-sec', style: { marginTop: '8px' }, onclick: accesModal }, 'Accesibilidad'),
      GM.ui.tutorial ? h('button', { class: 'btn btn-sec', style: { marginTop: '8px' }, onclick: () => { cerrarModales(); navegar('inicio'); setTimeout(() => GM.ui.tutorial(), 300); } }, 'Ver el tutorial') : null,
      h('p', { class: 'muted' }, 'El guardado vive en este móvil' + (g && g.protegido() ? ' y el navegador lo protege (no lo borra aunque falte espacio)' : g && g.protegido() === false ? '; el navegador podría borrarlo si falta espacio' : '') + '. Haz copias de seguridad de vez en cuando.')),
      [{ t: 'Salir al menú principal', cls: 'btn-sec', fn: () => { if (g) g.guardar(0); GM.state = null; setTimeout(menu, 0); } }, { t: 'Cerrar', cls: 'btn-sec' }]);
  }
  // Copias automáticas (copias.js): las 10 últimas en el navegador y, en el ordenador, una carpeta donde se escribe cada autoguardado
  function copiasModal() {
    const C = M().copias, cuerpo = h('div', null, h('h3', null, 'Copias automáticas'), h('p', { class: 'muted' }, 'Cargando…'));
    const pintar = async () => {
      const l = await C.listar(), ca = C.hayCarpeta() ? await C.carpetaEstado() : null; cuerpo.innerHTML = '';
      cuerpo.append(h('h3', null, 'Copias automáticas'),
        h('p', { class: 'muted' }, 'Cada autoguardado deja una copia aparte en este navegador (las 10 últimas). Si algo falla, restaura desde aquí.'),
        l.length ? h('div', { class: 'lista' }, l.map(c => h('div', { class: 'item' }, h('div', null, h('b', null, c.club), h('div', { class: 'muted' }, c.temporada + ', ' + U.fechaLarga(c.fecha) + ' (guardada el ' + new Date(c.cuando).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ', ' + c.kb + ' KB)')),
          h('button', { class: 'btn btn-sec peq', onclick: async () => { const r = await C.restaurar(c.id); if (!r.ok) toast(r.motivo); else { toast('Partida restaurada'); cerrarModales(); } } }, 'Restaurar')))) : h('p', { class: 'muted' }, 'Aún no hay copias: se crean con el autoguardado.'),
        h('button', { class: 'btn btn-sec', style: { marginTop: '8px' }, onclick: async () => { const ok = await C.copiar('manual'); toast(ok ? 'Copia hecha' : 'No se ha podido hacer la copia'); pintar(); } }, 'Hacer una copia ahora'),
        ca ? h('div', { class: 'tarjeta', style: { marginTop: '10px' } }, h('b', null, 'Carpeta del ordenador'),
          h('p', { class: 'muted' }, ca.activa ? 'Cada autoguardado se escribe en «' + ca.nombre + '». Si es una carpeta de Drive, OneDrive o Dropbox, la copia queda en la nube.' + (ca.permiso ? '' : ' Tras reiniciar, el navegador pide permiso otra vez.') : 'Elige una carpeta (por ejemplo, una que sincronice con Drive o OneDrive) y cada autoguardado se escribirá ahí.'),
          h('div', { class: 'par' }, h('button', { class: 'btn btn-sec peq', onclick: async () => { const r = await C.carpeta(); toast(r.ok ? 'Copias en «' + r.nombre + '»' : r.motivo); pintar(); } }, ca.activa ? 'Cambiar carpeta' : 'Elegir carpeta'),
            ca.activa && !ca.permiso ? h('button', { class: 'btn peq', onclick: async () => { toast(await C.reactivar() ? 'Copias en carpeta activas' : 'Sin permiso'); pintar(); } }, 'Dar permiso') : null))
          : h('p', { class: 'muted' }, 'En el móvil no se puede escribir en una carpeta: usa «Copia de seguridad» (archivo o compartir a Drive) de vez en cuando.'));
    };
    pintar(); modal(cuerpo, [{ t: 'Cerrar', cls: 'btn-sec' }]);
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
    if (carrera()) { if (GM.ui._.inicioCarrera(el, st)) return; }
    else if (st.personaje) el.append(h('button', { class: 'perfil-linea', onclick: perfilModal }, avatarEl(st.personaje, 44), h('div', { class: 'ct' }, h('b', null, M().personaje.nombre(st.personaje)), h('span', { class: 'muted' }, (pres() ? 'Presidente' : entr() ? 'Entrenador' : 'Director técnico') + ' de ' + eq(club).nombre)), chip('Cambiar aspecto')));
    if (entr() && st.entrenador.fase !== 'retirado') {
      const E = M().entrenador, c = st.entrenador, r = E.rango(st);
      el.append(seccion('La directiva', h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, c.fase === 'activo' ? 'Objetivo: ' + c.objetivo.txt : 'Estás sin equipo'), h('b', null, Math.round(c.confianza) + ' %')), barra(c.confianza, 100, c.confianza >= 55 ? 'verde' : c.confianza >= 30 ? 'ambar' : 'rojo'),
        r && c.fase === 'activo' ? h('p', { class: 'muted' }, 'Ahora estás ' + r.puesto + 'º de ' + r.de + ', y el objetivo es acabar ' + c.objetivo.puesto + 'º o mejor.') : null,
        c.fase === 'libre' ? h('div', null, h('p', { class: 'aviso mal' }, 'Te han destituido. Revisa las ofertas en Directiva.'), h('button', { class: 'btn', onclick: () => navegar('junta') }, 'Ver ofertas')) : h('button', { class: 'btn btn-sec', onclick: () => navegar('junta') }, 'Hablar con la directiva'))));
      GM.ui._.eventosCards(el, st);
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

  registerScreen('inicio', { titulo: 'Inicio', icono: 'home', render: inicio });
  GM.ui.jugarUnDia = jugarUnDia; GM.ui.hastaPartido = hastaPartido; GM.ui.refrescar = refrescar; GM.ui.cabecera = () => { if (ui.cabecera && S()) cabecera(); }; GM.ui.registerScreen = registerScreen; GM.ui.start = start; GM.ui.navegar = navegar; GM.ui.toast = toast; GM.ui.modal = modal;
  GM.bus.on('partida:cargada', function () { if (ui.raiz) juego(); });

  function selfTest() {
    if (typeof document === 'undefined' || !GM.state) return true;
    const raiz = document.createElement('div'); start(raiz);
    let ok = true; navItems().forEach(n => { navegar(n[0]); if (ui.cuerpo.querySelector('.aviso.mal')) ok = false; }); desmontar();
    return ok;
  }
  // Utilidades compartidas con los archivos de pantallas (ui_gestion.js, ui_ciudad.js, ui_presidente.js, ui_carrera.js, ui_entrenador.js)
  GM.ui._ = { accesModal,  U, M, S, ICON, icon, NAV_G, NAV_P, pres, carrera, etqFase, catEdad, enCantera, lectura, avatarEl, dorsal, NAV_E, entr, tacticaOn, NAV_C, navItems, ATT, POSN, CORTO, rgb, lum, contraste, mezcla, aplicaKit, setTema, ui, screens, eq, clip, claro, tintaEscudo, escudo, chip, barra, num, clsOvr, lesionTxt, seccion, pestanas, aviso, toast, modal, cerrarModales, registerScreen, pistasScroll, start, fondoPortada, menu, cargarMenu, dialogoImportar, flujoNueva, personajeModal, perfilModal, jugadorModal, elegirLiga, ovrData, elegirClub, confirmarClub, empezar, elegirModo, elegirPilares, juego, cabecera, desmontar, navegar, refrescar, menuJuego, dialogoExportar, topStats, resultadoModal, directoOn, jugarUnDia, jugarDiaYa, hastaPartido, hastaFin, nuevaTemporada, ovrBarra, avisos, inicio, filaResultado, tablaClasif, selfTest, h };
  GM.register('ui', { start, navegar, refrescar, toast, modal, registerScreen, selfTest });
})();
