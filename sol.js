/* Sol real: posición y horas de salida y puesta del sol según la fecha y la latitud de la ciudad del club.
   Expone: posicion(lat, iso, hora) -> { elev, azim } (radianes; azim desde el sur hacia el oeste), direccion(lat, iso, hora) -> {x,y,z} (x este, z sur),
   salidaPuesta(lat, iso) -> { sale, pone } (hora solar), latitud(st) (la de OpenStreetMap si está cargada, si no la de la capital del país) y horaSolar(st, hora). */
(function () {
  const RAD = Math.PI / 180;
  const LAT_PAIS = { ES: 40.4, IT: 42.0, GR: 38.0, DE: 51.0, TR: 40.0, FR: 46.5, LT: 54.9, RS: 44.8, US: 40.0, IL: 32.1, HR: 45.1, SI: 46.1, LV: 56.9, AE: 25.2, PT: 38.7, BA: 43.9, ME: 42.4, BG: 42.7, HU: 47.5, PL: 52.2, CZ: 50.1, GB: 51.5, BE: 50.8, NL: 52.4, CY: 35.2, FI: 60.2, CA: 43.7 };
  const diaDelAno = iso => { const d = new Date(iso + 'T00:00:00Z'), a = new Date(Date.UTC(d.getUTCFullYear(), 0, 0)); return Math.round((d - a) / 864e5); };
  const declinacion = iso => 23.44 * RAD * Math.sin(2 * Math.PI * (284 + diaDelAno(iso)) / 365);
  function posicion(lat, iso, hora) {
    const f = lat * RAD, d = declinacion(iso), H = 15 * RAD * (hora - 12);
    const elev = Math.asin(Math.sin(f) * Math.sin(d) + Math.cos(f) * Math.cos(d) * Math.cos(H));
    const azim = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(f) - Math.tan(d) * Math.cos(f));
    return { elev, azim };
  }
  function direccion(lat, iso, hora, elevMin) {
    const p = posicion(lat, iso, hora), e = Math.max(p.elev, elevMin || 0);
    return { x: -Math.sin(p.azim) * Math.cos(e), y: Math.sin(e), z: Math.cos(p.azim) * Math.cos(e) };
  }
  function salidaPuesta(lat, iso) {
    const c = -Math.tan(lat * RAD) * Math.tan(declinacion(iso));
    if (c >= 1) return { sale: 12, pone: 12 };   // noche polar
    if (c <= -1) return { sale: 0, pone: 24 };   // sol de medianoche
    const h = Math.acos(c) / (15 * RAD); return { sale: 12 - h, pone: 12 + h };
  }
  function latitud(st) {
    const R = GM.mods && GM.mods.calleReal, D = R && R.datos && R.datos(st.clubId);
    if (D && D.g) return D.g[0];
    const c = st.equipos && st.equipos[st.clubId]; return LAT_PAIS[c && c.pais] || 42;
  }
  // El reloj del juego es el reloj de pared: en verano de Europa y de EE. UU. (abril a octubre) la hora solar va una hora por detrás
  function horaSolar(st, hora) { const m = +String(st.fecha || '2026-10-01').slice(5, 7), c = st.equipos && st.equipos[st.clubId], verano = m >= 4 && m <= 10 && !(c && (c.pais === 'AE' || c.pais === 'TR')); return hora - (verano ? 1 : 0); }
  GM.register('sol', { posicion, direccion, salidaPuesta, latitud, horaSolar, selfTest() {
    const e = [], inv = salidaPuesta(41.4, '2026-12-21'), ver = salidaPuesta(41.4, '2026-06-21');
    if (!(ver.pone - ver.sale > inv.pone - inv.sale + 4)) e.push('el día de verano debe ser mucho más largo');
    if (!(posicion(41.4, '2026-06-21', 12).elev > posicion(41.4, '2026-12-21', 12).elev)) e.push('el sol de verano al mediodía va más alto');
    const dm = direccion(41.4, '2026-06-21', 12); if (!(dm.z > 0.3)) e.push('al mediodía el sol está al sur (+z)');
    const dt = direccion(41.4, '2026-06-21', 17); if (!(dt.x < 0)) e.push('por la tarde el sol está al oeste (-x)');
    return e;
  } });
})();
