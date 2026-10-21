/* ACCESIBILIDAD (punto 74, GM.accesibilidad) — daltonismo, lector de pantalla y panel unificado.
   Daltonismo: atributo data-dalton en <html> (ninguno, protanopia, deuteranopia, tritanopia) que cambia los colores de acierto/fallo/aviso (--ok, --mal, --amb) a una paleta segura (azul/naranja) y añade símbolos en los chips (estilos en estilos.css).
   Lector de pantalla: región aria-live (polite) que anuncia los avisos (toast), los cambios de pantalla y los modales; las imágenes y los botones de solo icono llevan aria-label desde el código de cada módulo.
   Se guarda en gm1:accesibilidad2. Expone: estado, set, anunciar, aplicar, selfTest. */
(function () {
  const clave = 'gm1:accesibilidad2', DALTON = [['ninguno', 'Ninguno'], ['protanopia', 'Protanopia'], ['deuteranopia', 'Deuteranopia'], ['tritanopia', 'Tritanopia']];
  let est = { dalton: 'ninguno', lector: false };
  try { Object.assign(est, JSON.parse(window.localStorage.getItem(clave) || '{}')); } catch (e) { /* sin guardado */ }
  let viva = null;
  function region() { if (viva && viva.isConnected) return viva; if (typeof document === 'undefined' || !document.body) return null; viva = document.createElement('div'); viva.setAttribute('aria-live', 'polite'); viva.setAttribute('role', 'status'); viva.setAttribute('data-no-i18n', '1'); viva.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden'; document.body.appendChild(viva); return viva; }
  function anunciar(txt) { if (!est.lector || !txt) return; const r = region(); if (!r) return; r.textContent = ''; setTimeout(() => { r.textContent = String(txt); }, 40); }
  function aplicar() { if (typeof document === 'undefined') return; document.documentElement.setAttribute('data-dalton', est.dalton); document.documentElement.setAttribute('data-lector', est.lector ? '1' : '0'); }
  function set(k, v) { est[k] = v; try { window.localStorage.setItem(clave, JSON.stringify(est)); } catch (e) { /* sin guardado */ } aplicar(); if (k === 'lector' && v) anunciar('Lector de pantalla activado'); }
  // anuncia avisos y cambios de pantalla
  function engancha() {
    if (typeof MutationObserver === 'undefined' || !document.body) return;
    new MutationObserver(ms => { if (!est.lector) return; ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.classList && (n.classList.contains('toast') || n.classList.contains('aviso'))) anunciar(n.textContent); else if (n.nodeType === 1 && n.classList && n.classList.contains('fondo')) { const t = n.querySelector('h2,h3'); anunciar(t ? t.textContent : 'Ventana abierta'); } })); }).observe(document.body, { childList: true });
  }
  function selfTest() { const a = est.dalton; set('dalton', 'deuteranopia'); const ok = document.documentElement.getAttribute('data-dalton') === 'deuteranopia'; set('dalton', a); return ok; }
  GM.accesibilidad = { DALTON, estado: () => est, set, anunciar, aplicar, selfTest };
  GM.register && GM.register('accesibilidad', GM.accesibilidad);
  if (typeof document !== 'undefined') { const arranca = () => { aplicar(); engancha(); }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arranca); else arranca(); }
})();
