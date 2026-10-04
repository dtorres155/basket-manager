/* GUARDADO (GM.mods.guardado)
   Expone: guardar, cargar, listar, borrar, exportar, importar, persistente, selfTest.
   Ranuras gm1:slot0 (autoguardado, cada 7 días de juego y al acabar la temporada), slot1 y slot2 (manuales).
   Usa localStorage con try/catch; si no está disponible guarda en memoria (se pierde al cerrar) y avisa. Sin PWA. */
(function () {
  const PFX = 'gm1:slot', META = 'gm1:meta', MAXB = 2.6e6;
  const mem = {};
  let persist = true;
  function alm() {
    try { const s = window.localStorage; s.setItem('gm1:t', '1'); s.removeItem('gm1:t'); return s; }
    catch (e) { persist = false; return { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } }; }
  }
  function metas(a) { try { return JSON.parse(a.getItem(META) || '{}'); } catch (e) { return {}; } }
  function guardar(slot) {
    const st = GM.state; if (!st) return { ok: false, motivo: 'No hay partida en curso.' };
    const a = alm(), txt = JSON.stringify(st);
    if (txt.length > MAXB) return { ok: false, motivo: 'La partida pesa demasiado (' + (txt.length / 1e6).toFixed(1) + ' MB). Exporta una copia como texto.' };
    try {
      a.setItem(PFX + slot, txt);
      const m = metas(a); m[slot] = { club: st.equipos[st.clubId].nombre, fecha: st.fecha, temporada: st.temporada, t: Date.now(), mb: +(txt.length / 1e6).toFixed(2) };
      a.setItem(META, JSON.stringify(m));
    } catch (e) { return { ok: false, motivo: 'No hay espacio en el navegador. Borra una ranura o exporta la partida.' }; }
    return { ok: true, persistente: persist };
  }
  function migrar(st) { if (!st.version) st.version = 1; if (!st.estadisticas) st.estadisticas = {}; if (!st.historial) st.historial = []; return st; }
  function cargar(slot) {
    const a = alm(), txt = a.getItem(PFX + slot);
    if (!txt) return { ok: false, motivo: 'La ranura está vacía.' };
    try { GM.state = migrar(JSON.parse(txt)); } catch (e) { return { ok: false, motivo: 'La partida guardada está dañada.' }; }
    GM.bus.emit('partida:cargada', { slot });
    return { ok: true };
  }
  function listar() { const m = metas(alm()); return [0, 1, 2].map(s => Object.assign({ slot: s }, m[s] || null)); }
  function borrar(slot) { const a = alm(); a.removeItem(PFX + slot); const m = metas(a); delete m[slot]; a.setItem(META, JSON.stringify(m)); return { ok: true }; }
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function unb64(s) { return decodeURIComponent(escape(atob(s))); }
  function exportar() { return GM.state ? 'GM1:' + b64(JSON.stringify(GM.state)) : ''; }
  function importar(texto) {
    try {
      const t = String(texto || '').trim(); if (t.slice(0, 4) !== 'GM1:') return { ok: false, motivo: 'El texto no empieza por GM1:.' };
      const st = JSON.parse(unb64(t.slice(4)));
      if (!st.equipos || !st.jugadores || !st.calendario) return { ok: false, motivo: 'El texto no es una partida válida.' };
      GM.state = migrar(st); GM.bus.emit('partida:cargada', { slot: -1 }); return { ok: true };
    } catch (e) { return { ok: false, motivo: 'No se ha podido leer la partida.' }; }
  }
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !st.clubId) return;
    if (st.ultimoAuto === undefined || GM.util.diffDays(st.ultimoAuto, st.fecha) >= 7) { st.ultimoAuto = st.fecha; guardar(0); }
  });
  GM.bus.on('temporada:fin', function () { if (GM.state) guardar(0); });
  function selfTest() {
    if (typeof btoa === 'undefined') return true;
    const prev = GM.state;
    GM.state = { version: 1, clubId: 'a', fecha: '2026-10-01', temporada: '2026-27', equipos: { a: { nombre: 'Ñandú' } }, jugadores: { x: { n: 1 } }, calendario: [], estadisticas: {}, historial: [] };
    const j0 = JSON.stringify(GM.state);
    const r = guardar(2); GM.state = null; const c = cargar(2);
    const ok1 = r.ok && c.ok && JSON.stringify(GM.state) === j0;
    const ex = exportar(); GM.state = null; const im = importar(ex);
    const ok2 = im.ok && JSON.stringify(GM.state) === j0;
    borrar(2); GM.state = prev;
    return ok1 && ok2;
  }
  GM.register('guardado', { guardar, cargar, listar, borrar, exportar, importar, persistente: () => persist, selfTest });
})();
