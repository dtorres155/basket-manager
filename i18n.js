/* IDIOMAS (punto 74, GM.i18n) — español (original), catalán e inglés. Los textos del juego están escritos en español dentro del código, así que la traducción se hace sobre lo que sale en pantalla:
   1) frases exactas (etiquetas, botones, títulos de pantallas y pestañas, avisos frecuentes) de i18n_datos.js;
   2) patrones con números («12 años», «Ronda 2 de 4», «hasta 2028», fechas con día y mes);
   3) vocabulario de apoyo (palabras y expresiones de baloncesto y de gestión) que se sustituye dentro de frases más largas.
   Lo que no está en las tablas se queda en español (nunca se rompe nada). Un MutationObserver traduce lo que aparece después (pantallas nuevas, avisos, el HUD del mundo) y vuelve a poner el original si cambias de idioma;
   se mantienen los textos originales para poder cambiar de un idioma a otro sin acumular errores. El idioma se guarda en este dispositivo (gm1:idioma) y se elige en Accesibilidad, Idioma.
   Para ampliar un idioma basta con añadir entradas a las tablas (exacta, patron o frag) de i18n_datos.js. Expone: idioma, setIdioma, t, traducirDOM, cobertura, IDIOMAS, selfTest. Prueba: tools/idiomas_prueba.js. */
(function () {
  const IDIOMAS = [['es', 'Español'], ['ca', 'Català'], ['en', 'English']];
  const guardado = () => { try { return window.localStorage.getItem('gm1:idioma'); } catch (e) { return null; } };
  const detecta = () => { try { const n = (navigator.language || 'es').slice(0, 2); return n === 'ca' || n === 'en' ? n : 'es'; } catch (e) { return 'es'; } };
  let ido = guardado() || 'es'; const caches = { ca: new Map(), en: new Map() }; let regFrag = { ca: null, en: null };
  const D = () => GM.i18nDatos || { ca: {}, en: {} };
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function prepara(l) {
    const d = D()[l] || {}, frag = (d.frag || []).slice().sort((a, b) => b[0].length - a[0].length); if (!frag.length) { regFrag[l] = null; return; }
    const mapa = new Map(frag.map(([a, b]) => [a, b])); regFrag[l] = { re: new RegExp('(?<![\\p{L}\\p{N}])(' + frag.map(f => esc(f[0])).join('|') + ')(?![\\p{L}\\p{N}])', 'giu'), mapa };
  }
  const MAY = (orig, trad) => (orig && orig[0] !== orig[0].toLowerCase() && trad ? trad[0].toUpperCase() + trad.slice(1) : trad);
  function traduce(s, l) {
    const d = D()[l]; if (!d) return s; const cache = caches[l]; if (cache.has(s)) return cache.get(s); let r = s;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), pre = m[1], cuerpo = m[2], post = m[3];
    if (cuerpo && d.exacta && d.exacta[cuerpo] !== undefined) r = pre + d.exacta[cuerpo] + post;
    else if (cuerpo) {
      let t = cuerpo, hecho = false;
      for (const [re, rep] of (d.patron || [])) { if (re.test(t)) { t = t.replace(re, rep); hecho = true; break; } }
      if (!hecho || true) { if (regFrag[l] === null && d.frag && d.frag.length) prepara(l); const R = regFrag[l]; if (R) t = t.replace(R.re, (x) => { const b = R.mapa.get(x) || R.mapa.get(x.toLowerCase()) || R.mapa.get(x[0].toUpperCase() + x.slice(1).toLowerCase()); return b === undefined ? x : MAY(x, b); }); }
      r = pre + t + post;
    }
    if (cache.size > 6000) cache.clear(); cache.set(s, r); return r;
  }
  const t = s => (ido === 'es' || typeof s !== 'string' || !s ? s : traduce(s, ido));
  // ---------- DOM ----------
  const ATTR = ['aria-label', 'placeholder', 'title', 'alt'], saltar = n => { const p = n.parentNode; if (!p) return true; const tag = p.nodeName; return tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'CANVAS' || (p.closest && p.closest('[data-no-i18n]')); };
  const ORIG = new WeakMap(); // nodo de texto o elemento -> { texto, attrs }
  function nodoTexto(n) {
    if (saltar(n)) return; const v = n.nodeValue; let o = ORIG.get(n);
    if (o && o.trad === v) { if (ido === 'es') { n.nodeValue = o.orig; ORIG.delete(n); } else { const x = t(o.orig); if (x !== v) { n.nodeValue = x; o.trad = x; } } return; }
    if (ido === 'es' || !v || !v.trim()) { if (o) ORIG.delete(n); return; }
    const x = t(v); ORIG.set(n, { orig: v, trad: x }); if (x !== v) n.nodeValue = x;
  }
  function attrs(el) {
    if (!el.getAttribute || (el.closest && el.closest('[data-no-i18n]'))) return; let o = ORIG.get(el) || {};
    ATTR.forEach(a => { const v = el.getAttribute(a); if (v === null) return; const g = o[a]; if (g && g.trad === v) { const x = ido === 'es' ? g.orig : t(g.orig); if (x !== v) { el.setAttribute(a, x); g.trad = x; } if (ido === 'es') delete o[a]; return; } if (ido === 'es' || !v) return; const x = t(v); o[a] = { orig: v, trad: x }; if (x !== v) el.setAttribute(a, x); }); if (Object.keys(o).length) ORIG.set(el, o);
  }
  function recorre(raiz) {
    if (!raiz) return; if (raiz.nodeType === 3) { nodoTexto(raiz); return; } if (raiz.nodeType !== 1 && raiz.nodeType !== 9) return;
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n = w.currentNode; if (n.nodeType === 1) attrs(n); while ((n = w.nextNode())) { if (n.nodeType === 3) nodoTexto(n); else attrs(n); }
  }
  let obs = null, pend = new Set(), prog = false;
  function lote() { prog = false; const L = Array.from(pend); pend.clear(); L.forEach(n => { try { if (n.isConnected || n.nodeType === 3) recorre(n); } catch (e) { /* nodo ya fuera */ } }); }
  function observar() {
    if (obs || typeof MutationObserver === 'undefined' || !document.body) return;
    obs = new MutationObserver(ms => { ms.forEach(m => { if (m.type === 'characterData') pend.add(m.target); else if (m.type === 'attributes') pend.add(m.target); else m.addedNodes.forEach(n => pend.add(n)); }); if (!prog) { prog = true; (window.requestAnimationFrame || setTimeout)(lote); } });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
  }
  function traducirDOM() { if (typeof document === 'undefined' || !document.body) return; observar(); recorre(document.body); }
  function setIdioma(l) {
    if (!IDIOMAS.some(x => x[0] === l)) l = 'es'; ido = l; try { window.localStorage.setItem('gm1:idioma', l); } catch (e) { /* sin almacenamiento */ } if (typeof document !== 'undefined') { document.documentElement.setAttribute('lang', l); }
    caches.ca.clear(); caches.en.clear(); regFrag = { ca: null, en: null }; traducirDOM(); return l;
  }
  // Cuántas frases exactas y fragmentos tiene cada idioma y qué parte de los textos fijos de una lista se traduce
  function cobertura(frases) { const r = {}; ['ca', 'en'].forEach(l => { const d = D()[l] || {}, tot = frases.length; const ok = frases.filter(f => { const x = traduce(f, l); return x !== f; }).length; r[l] = { exacta: Object.keys(d.exacta || {}).length, patrones: (d.patron || []).length, fragmentos: (d.frag || []).length, textosFijos: ok + '/' + tot }; }); return r; }
  function selfTest() {
    const a = ido; ido = 'ca'; caches.ca.clear(); const x = t('Mercado'), y = t('Aceptar'); ido = 'en'; caches.en.clear(); const z = t('Mercado'), w = t('Texto que no está en las tablas xyz'); ido = 'es'; const v = t('Plantilla'); ido = a;
    return typeof x === 'string' && x !== 'Plantilla' && y !== 'Aceptar' && z !== 'Plantilla' && w === 'Texto que no está en las tablas xyz' && v === 'Plantilla';
  }
  GM.i18n = { IDIOMAS, idioma: () => ido, setIdioma, t, traducirDOM, cobertura, selfTest };
  GM.register && GM.register('i18n', GM.i18n);
  if (typeof document !== 'undefined') { const arranca = () => { if (guardado() === null && detecta() !== 'es' && false) ido = detecta(); document.documentElement.setAttribute('lang', ido); if (ido !== 'es') traducirDOM(); else observar(); }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arranca); else arranca(); }
})();
