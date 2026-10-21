/* REGISTRO DE ERRORES (punto 82, GM.registro) — guarda los últimos errores de JavaScript, promesas rechazadas y mensajes de console.error (con la hora, el mensaje y el origen) en la memoria y, resumidos, en este dispositivo (gm1:errores),
   para poder reportar un fallo con un archivo: informe() devuelve el texto JSON con la versión del juego (la de la caché), el navegador, el modo y la temporada de la partida, la calidad gráfica, el idioma y los últimos errores; no incluye datos personales ni la partida.
   Se carga justo después del núcleo para verlo todo. Expone: lista, anotar, vaciar, informe, descargar, selfTest. */
(function () {
  const MAX = 60, KEY = 'gm1:errores'; let buf = [];
  try { buf = JSON.parse(window.localStorage.getItem(KEY) || '[]').slice(-20).map(e => Object.assign({ anterior: true }, e)); } catch (e) { buf = []; }
  const guarda = () => { try { window.localStorage.setItem(KEY, JSON.stringify(buf.slice(-30).map(e => ({ t: e.t, m: String(e.m).slice(0, 300), o: e.o })))); } catch (e) { /* sin almacenamiento */ } };
  function anotar(m, o) { const txt = String(m && m.message ? m.message : m); if (buf.length && buf[buf.length - 1].m === txt) { buf[buf.length - 1].n = (buf[buf.length - 1].n || 1) + 1; return; } buf.push({ t: new Date().toISOString(), m: txt, o: o || '' }); if (buf.length > MAX) buf.shift(); guarda(); }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('error', e => anotar(e.message, (e.filename || '') + ':' + (e.lineno || '')));
    window.addEventListener('unhandledrejection', e => anotar(e.reason, 'promesa'));
    if (typeof console !== 'undefined' && console.error && !console.error._reg) { const f = console.error; console.error = function () { try { anotar(Array.from(arguments).map(a => (a && a.message) || (typeof a === 'object' ? '' : a)).join(' ').trim() || 'console.error', 'console'); } catch (e) { /* nunca romper el registro */ } return f.apply(this, arguments); }; console.error._reg = true; }
  }
  const lista = () => buf.slice();
  function vaciar() { buf = []; guarda(); }
  async function version() { try { const ks = await caches.keys(); const k = ks.find(x => /^bm-/.test(x)); return k || 'sin caché (' + (typeof location !== 'undefined' ? location.protocol : '') + ')'; } catch (e) { return 'desconocida'; } }
  async function informe() {
    const st = GM.state, i = {
      juego: 'Basket Manager 2026-27', version: await version(), fecha: new Date().toISOString(), navegador: typeof navigator !== 'undefined' ? navigator.userAgent : '', pantalla: typeof window !== 'undefined' ? window.innerWidth + 'x' + window.innerHeight + ' @' + (window.devicePixelRatio || 1) : '',
      idioma: GM.i18n ? GM.i18n.idioma() : 'es', calidad: GM.campus && GM.campus.config ? { calidad: GM.campus.config.calidad, nivel: GM.campus.config.nivel } : null, versionEstado: GM.VERSION_ESTADO,
      partida: st ? { modo: st.modo, club: st.clubId, temporada: st.temporada, fecha: st.fecha, ligas: Object.keys(st.ligas || {}).length } : null, errores: buf.slice(-40)
    };
    return JSON.stringify(i, null, 2);
  }
  async function descargar() { const t = await informe(); try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'application/json' })); a.download = 'informe-basket-manager-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove(); return true; } catch (e) { return false; } }
  function selfTest() { const n = buf.length; anotar('prueba del registro', 'selfTest'); const ok = buf.length === n + 1 || buf[buf.length - 1].n > 1; buf = buf.filter(e => e.o !== 'selfTest'); guarda(); return ok && typeof informe === 'function'; }
  GM.registro = { lista, anotar, vaciar, informe, descargar, selfTest };
  GM.register && GM.register('registro', GM.registro);
})();
