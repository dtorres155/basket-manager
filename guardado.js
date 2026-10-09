/* GUARDADO (GM.mods.guardado)
   Expone: guardar, cargar, listar, borrar, exportar, importar, persistente, selfTest.
   Ranuras gm1:slot0 (autoguardado, cada 7 días de juego y al acabar la temporada), slot1 y slot2 (manuales).
   Usa localStorage con try/catch; si no está disponible guarda en memoria (se pierde al cerrar) y avisa.
   También: guarda al pasar a segundo plano, migra partidas por versión (state.version, MIGRACIONES), pide almacenamiento
   persistente (navigator.storage.persist) y lleva la cuenta de las copias de seguridad (state.copia). */
(function () {
  const PFX = 'gm1:slot', META = 'gm1:meta', MAXB = 2.6e6;
  const mem = {};
  let persist = true;
  function alm() {
    try { const s = window.localStorage; s.setItem('gm1:t', '1'); s.removeItem('gm1:t'); return s; }
    catch (e) { persist = false; return { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } }; }
  }
  const LZ = () => typeof LZString !== 'undefined';
  function leer(txt) { return txt.slice(0, 4) === 'LZ1:' ? LZString.decompressFromUTF16(txt.slice(4)) : txt; }
  function metas(a) { try { return JSON.parse(a.getItem(META) || '{}'); } catch (e) { return {}; } }
  function guardar(slot) {
    const st = GM.state; if (!st) return { ok: false, motivo: 'No hay partida en curso.' };
    // Compresión LZ (vendor/lz-string): la partida ocupa ~10 veces menos. Prefijo LZ1: para distinguirla de las antiguas sin comprimir
    const a = alm(), plano = JSON.stringify(st), txt = LZ() ? 'LZ1:' + LZString.compressToUTF16(plano) : plano;
    if (txt.length > MAXB) return { ok: false, motivo: 'La partida pesa demasiado (' + (txt.length / 1e6).toFixed(1) + ' MB). Exporta una copia como texto.' };
    try {
      a.setItem(PFX + slot, txt);
      const m = metas(a); m[slot] = { club: st.equipos[st.clubId].nombre, fecha: st.fecha, temporada: st.temporada, t: Date.now(), mb: +(txt.length / 1e6).toFixed(2) };
      a.setItem(META, JSON.stringify(m));
    } catch (e) { return { ok: false, motivo: 'No hay espacio en el navegador. Borra una ranura o exporta la partida.' }; }
    if (slot === 0 && GM.bus) GM.bus.emit('guardado:auto', { slot });   // copias.js: copia en IndexedDB y en la carpeta elegida
    return { ok: true, persistente: persist };
  }
  // Migraciones: MIGRACIONES[n] pasa una partida de la versión n a la n+1. Nunca borres una: las partidas viejas las necesitan.
  const MIGRACIONES = {
    1: st => { st.copia = st.copia || { creada: Date.now(), ultima: null, avisada: null }; },
    2: st => { st.sede = st.sede || { charlas: {} }; },
    3: st => { st.rua = null; st.ruaHist = (st.historial || []).length; }
  };
  function migrar(st) {
    if (!st.version) st.version = 1; if (!st.estadisticas) st.estadisticas = {}; if (!st.historial) st.historial = [];
    const fin = GM.VERSION_ESTADO || 1;
    while (st.version < fin) { const m = MIGRACIONES[st.version]; if (m) m(st); st.version++; }
    return st;
  }
  // Almacenamiento persistente: pide al navegador que no borre los datos del juego si el móvil se queda sin espacio.
  // En Chrome se concede sin preguntar si la app está instalada o se usa a menudo.
  let protegido = null;
  function pedirPersistencia() {
    try {
      if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) return Promise.resolve(null);
      return navigator.storage.persisted().then(ya => ya || navigator.storage.persist()).then(r => { protegido = !!r; return protegido; }).catch(() => null);
    } catch (e) { return Promise.resolve(null); }
  }
  // Copia de seguridad: se recuerda si hace más de 7 días reales desde la última (o desde que empezó la partida), como mucho una vez al día
  const DIA = 864e5;
  function necesitaCopia(st) {
    const c = st && st.copia; if (!c || st.fecha === '2026-09-24') return false;
    const ahora = Date.now();
    return ahora - (c.ultima || c.creada || ahora) > 7 * DIA && (!c.avisada || ahora - c.avisada > DIA);
  }
  function copiaHecha(st) { if (st && st.copia) st.copia.ultima = Date.now(); }
  function copiaAvisada(st) { if (st && st.copia) st.copia.avisada = Date.now(); }
  function nombreArchivo(st) { const e = st && st.equipos && st.equipos[st.clubId]; return 'basket-manager_' + ((e && e.siglas) || 'partida') + '_' + (st ? st.fecha : '') + '.txt'; }
  function cargar(slot) {
    const a = alm(), txt = a.getItem(PFX + slot);
    if (!txt) return { ok: false, motivo: 'La ranura está vacía.' };
    try { GM.state = migrar(JSON.parse(leer(txt))); } catch (e) { return { ok: false, motivo: 'La partida guardada está dañada.' }; }
    GM.bus.emit('partida:cargada', { slot });
    return { ok: true };
  }
  function listar() { const m = metas(alm()); return [0, 1, 2].map(s => Object.assign({ slot: s }, m[s] || null)); }
  function borrar(slot) { const a = alm(); a.removeItem(PFX + slot); const m = metas(a); delete m[slot]; a.setItem(META, JSON.stringify(m)); return { ok: true }; }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function unb64(s) { return decodeURIComponent(escape(atob(s))); }
  function exportar() { if (!GM.state) return ''; const j = JSON.stringify(GM.state); return LZ() ? 'GM2:' + LZString.compressToBase64(j) : 'GM1:' + b64(j); }
  function importar(texto) {
    try {
      const t = String(texto || '').trim(), pre = t.slice(0, 4); if (pre !== 'GM1:' && pre !== 'GM2:') return { ok: false, motivo: 'El texto no empieza por GM1: ni GM2:.' };
      if (pre === 'GM2:' && !LZ()) return { ok: false, motivo: 'Esta copia está comprimida y falta el descompresor.' };
      const st = JSON.parse(pre === 'GM2:' ? LZString.decompressFromBase64(t.slice(4)) : unb64(t.slice(4)));
      if (!st.equipos || !st.jugadores || !st.calendario) return { ok: false, motivo: 'El texto no es una partida válida.' };
      GM.state = migrar(st); GM.bus.emit('partida:cargada', { slot: -1 }); return { ok: true };
    } catch (e) { return { ok: false, motivo: 'No se ha podido leer la partida.' }; }
  }
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !st.clubId) return;
    if (st.ultimoAuto === undefined || GM.util.diffDays(st.ultimoAuto, st.fecha) >= 7) { st.ultimoAuto = st.fecha; guardar(0); }
  });
  GM.bus.on('temporada:fin', function () { if (GM.state) guardar(0); });
  // En el móvil la app puede cerrarse en cualquier momento: se guarda al pasar a segundo plano
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    const alSalir = () => { if (GM.state && GM.state.clubId && GM.state.equipos) guardar(0); };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') alSalir(); });
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('pagehide', alSalir);
  }
  function selfTest() {
    if (typeof btoa === 'undefined') return true;
    const prev = GM.state;
    GM.state = { version: GM.VERSION_ESTADO, copia: { creada: 1, ultima: null, avisada: null }, clubId: 'a', fecha: '2026-10-01', temporada: '2026-27', equipos: { a: { nombre: 'Ñandú' } }, jugadores: { x: { n: 1 } }, calendario: [], estadisticas: {}, historial: [] };
    const j0 = JSON.stringify(GM.state);
    const r = guardar(2); GM.state = null; const c = cargar(2);
    const ok1 = r.ok && c.ok && JSON.stringify(GM.state) === j0;
    const ex = exportar(); GM.state = null; const im = importar(ex);
    const ok2 = im.ok && JSON.stringify(GM.state) === j0;
    borrar(2); GM.state = prev;
    return ok1 && ok2;
  }
  GM.register('guardado', { guardar, cargar, listar, borrar, exportar, importar, migrar, persistente: () => persist, pedirPersistencia, protegido: () => protegido, necesitaCopia, copiaHecha, copiaAvisada, nombreArchivo, selfTest });
})();
