/* COPIAS AUTOMÁTICAS (GM.mods.copias) — para no perder la partida
   1. Copias en IndexedDB: cada vez que se autoguarda (guardado.js, cada 7 días de juego, al acabar la temporada y al cerrar la app) se
      guarda también una copia comprimida (formato de exportación GM2:) en otra base de datos del navegador; se quedan las 10 últimas.
      Si la ranura de localStorage se estropea o se borra, se restaura desde aquí.
   2. Carpeta en el ordenador (Chrome y Edge de escritorio, API File System Access): eliges una carpeta una vez y cada autoguardado
      escribe ahí un archivo por partida (basket-manager_<siglas>.txt), que puedes sincronizar con Drive, OneDrive o Dropbox.
      En el móvil esa API no existe: allí queda la copia por archivo o compartir del menú (y el recordatorio semanal).
   No hay servidor propio: nada sale del dispositivo salvo que tú elijas compartir o una carpeta sincronizada.
   Expone: listar() -> Promise, restaurar(id) -> Promise, copiar(motivo) -> Promise, carpeta(): elegir, carpetaEstado() -> Promise, hayCarpeta(). */
(function () {
  const DB = 'gm1-copias', ST = 'copias', MAX = 10;
  let dbp = null;
  const idb = () => { if (typeof indexedDB === 'undefined') return Promise.reject(new Error('sin IndexedDB')); return dbp || (dbp = new Promise((ok, mal) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => { r.result.createObjectStore(ST, { keyPath: 'id' }); r.result.createObjectStore('ajustes'); }; r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); })); };
  const tx = (store, modo, fn) => idb().then(db => new Promise((ok, mal) => { const t = db.transaction(store, modo), s = t.objectStore(store), r = fn(s); t.oncomplete = () => ok(r && r.result); t.onerror = () => mal(t.error); }));
  function resumen(st) { const e = st.equipos && st.equipos[st.clubId]; return { club: e ? e.nombre : '', siglas: e ? e.siglas : '', modo: st.modo, fecha: st.fecha, temporada: st.temporada }; }
  function copiar(motivo) {
    const st = GM.state, G = GM.mods.guardado; if (!st || !st.clubId || !G) return Promise.resolve(false);
    const txt = G.exportar(); if (!txt) return Promise.resolve(false);
    const c = Object.assign({ id: Date.now(), motivo: motivo || 'autoguardado', datos: txt, kb: Math.round(txt.length / 1024) }, resumen(st));
    return tx(ST, 'readwrite', s => s.put(c)).then(() => tx(ST, 'readonly', s => s.getAllKeys())).then(ks => { const sobran = (ks || []).sort((a, b) => a - b).slice(0, Math.max(0, (ks || []).length - MAX)); return sobran.length ? tx(ST, 'readwrite', s => { sobran.forEach(k => s.delete(k)); }) : null; })
      .then(() => aCarpeta(txt, st)).then(() => true).catch(() => false);
  }
  function listar() { return tx(ST, 'readonly', s => s.getAll()).then(l => (l || []).map(c => ({ id: c.id, club: c.club, modo: c.modo, fecha: c.fecha, temporada: c.temporada, kb: c.kb, motivo: c.motivo, cuando: c.id })).sort((a, b) => b.id - a.id)).catch(() => []); }
  function restaurar(id) { return tx(ST, 'readonly', s => s.get(id)).then(c => { if (!c) return { ok: false, motivo: 'Copia no encontrada.' }; const r = GM.mods.guardado.importar(c.datos); if (r.ok) GM.mods.guardado.guardar(0); return r; }).catch(() => ({ ok: false, motivo: 'No se ha podido leer la copia.' })); }
  // ---- Carpeta del ordenador (File System Access) ----
  const hayCarpeta = () => typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
  const leerAjuste = k => tx('ajustes', 'readonly', s => s.get(k)).catch(() => null);
  const ponerAjuste = (k, v) => tx('ajustes', 'readwrite', s => s.put(v, k));
  async function carpeta() {
    if (!hayCarpeta()) return { ok: false, motivo: 'Este navegador no permite elegir una carpeta (en el móvil usa la copia por archivo o compartir).' };
    try { const d = await window.showDirectoryPicker({ id: 'basket-manager', mode: 'readwrite' }); await ponerAjuste('carpeta', d); const st = GM.state; if (st) await aCarpeta(GM.mods.guardado.exportar(), st, true); return { ok: true, nombre: d.name }; }
    catch (e) { return { ok: false, motivo: 'No se ha elegido carpeta.' }; }
  }
  async function carpetaEstado() {
    const d = await leerAjuste('carpeta'); if (!d) return { activa: false };
    let p = 'prompt'; try { p = await d.queryPermission({ mode: 'readwrite' }); } catch (e) { }
    return { activa: true, nombre: d.name, permiso: p === 'granted' };
  }
  async function reactivar() { const d = await leerAjuste('carpeta'); if (!d) return false; try { return (await d.requestPermission({ mode: 'readwrite' })) === 'granted'; } catch (e) { return false; } }
  async function aCarpeta(txt, st, forzar) {
    if (!hayCarpeta() || !txt) return; const d = await leerAjuste('carpeta'); if (!d) return;
    try { if ((await d.queryPermission({ mode: 'readwrite' })) !== 'granted' && !forzar) return;   // tras recargar, el navegador pide permiso otra vez (menú > Copias)
      const e = st.equipos[st.clubId], f = await d.getFileHandle('basket-manager_' + ((e && e.siglas) || 'partida') + '_' + st.modo + '.txt', { create: true }), w = await f.createWritable(); await w.write(txt); await w.close();
      if (GM.mods.guardado.copiaHecha) GM.mods.guardado.copiaHecha(st);
    } catch (e) { }
  }
  // Cada autoguardado (ranura 0) deja también una copia; como mucho una cada 10 minutos
  let ultima = 0;
  GM.bus.on('guardado:auto', () => { const t = Date.now(); if (t - ultima < 10 * 60 * 1000) return; ultima = t; copiar('autoguardado'); });
  GM.bus.on('temporada:fin', () => { ultima = Date.now(); setTimeout(() => copiar('fin de temporada'), 0); });
  GM.register('copias', { copiar, listar, restaurar, carpeta, carpetaEstado, reactivar, hayCarpeta, selfTest: () => typeof copiar === 'function' });
})();
