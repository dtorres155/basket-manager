/* PERSONAJE (GM.mods.personaje)
   Avatar vectorial (SVG en línea) personalizable: piel, peinado y color, barba, gafas y vestimenta. Se viste con los colores del club mediante las
   variables CSS --club, --club2 y --club-ink. Expone: crear, avatar(pj, opciones), nombre, OPC, aleatorio, selfTest.
   Se guarda en state.personaje = { nombre, apellido, piel, pelo, peloColor, barba, gafas, ropa }. */
(function () {
  const OPC = {
    piel: ['#f3d6bc', '#e4b98f', '#c88f62', '#8f5d3c', '#5c3b27'],
    pelo: ['Rapado', 'Corto', 'Rizado', 'Largo', 'Moño', 'Calvo'],
    peloColor: ['#15110f', '#4a2f1d', '#8a5a2b', '#c9a25f', '#bdbdbd', '#a8321f'],
    barba: ['Sin barba', 'Perilla', 'Corta', 'Larga'],
    gafas: ['Sin gafas', 'Redondas', 'Cuadradas'],
    ropa: ['Traje', 'Chaqueta', 'Polo', 'Chándal']
  };
  let uid = 0;
  const clamp = (v, n) => ((v % n) + n) % n;
  function oscuro(hex, t) { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * (1 - t))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); }
  function crear(extra) { return Object.assign({ nombre: '', apellido: '', piel: 1, pelo: 1, peloColor: 1, barba: 0, gafas: 0, ropa: 0 }, extra || {}); }
  function aleatorio() { return crear({ piel: GM.rng.int(0, 4), pelo: GM.rng.int(0, 5), peloColor: GM.rng.int(0, 5), barba: GM.rng.int(0, 3), gafas: GM.rng.int(0, 2), ropa: GM.rng.int(0, 3) }); }
  function nombre(p) { return ((p && p.nombre ? p.nombre : '') + ' ' + (p && p.apellido ? p.apellido : '')).trim(); }

  function avatar(p, o) {
    p = crear(p); o = o || {};
    const S = o.size || 64, id = 'av' + (++uid), skin = OPC.piel[clamp(p.piel, 5)], sh = oscuro(skin, 0.14), hair = OPC.peloColor[clamp(p.peloColor, 6)];
    const ropa = o.camiseta ? 'camiseta' : ['traje', 'chaqueta', 'polo', 'chandal'][clamp(p.ropa, 4)];
    let s = '<svg viewBox="0 0 100 100" width="' + S + '" height="' + S + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar"><defs><clipPath id="' + id + '"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#' + id + ')">';
    s += '<rect width="100" height="100" ' + (o.camiseta ? 'fill="#cfd8de"' : 'style="fill:var(--club)"') + '/>';
    // pelo trasero (largo y moño)
    if (p.pelo === 3) s += '<path d="M28 44 Q22 78 36 84 L64 84 Q78 78 72 44Z" fill="' + hair + '"/>';
    // hombros y ropa
    const cuerpo = { traje: '#223042', chaqueta: '#46545f', polo: '#e9ecef', chandal: 'var(--club2)', camiseta: 'var(--club)' }[ropa];
    s += '<path d="M6 100 C8 76 28 69 50 69 C72 69 92 76 94 100Z" style="fill:' + cuerpo + '"/>';
    s += '<rect x="43" y="56" width="14" height="18" rx="5" fill="' + sh + '"/>';
    if (ropa === 'traje') s += '<path d="M38 70 L50 90 L62 70Z" fill="#f4f4f4"/><path d="M47 76 L53 76 L55 96 L50 100 L45 96Z" style="fill:var(--club)"/><path d="M38 70 L50 90 L30 100 L24 80Z M62 70 L50 90 L70 100 L76 80Z" fill="#1a2533"/>';
    else if (ropa === 'chaqueta') s += '<path d="M50 72 L50 100" stroke="#2c3740" stroke-width="2"/><path d="M38 70 L50 80 L62 70 L58 100 L42 100Z" fill="#dfe3e6" opacity=".9"/>';
    else if (ropa === 'polo') s += '<path d="M40 70 L50 80 L44 76Z M60 70 L50 80 L56 76Z" fill="#c9ced3"/><path d="M38 69 L50 84 L62 69 L58 66 L50 74 L42 66Z" fill="#fff"/>';
    else if (ropa === 'chandal') s += '<path d="M36 70 Q50 86 64 70" fill="' + sh + '"/><path d="M50 82 L50 100" stroke="rgba(255,255,255,.7)" stroke-width="2"/>';
    else { s += '<path d="M36 70 Q50 88 64 70" fill="' + sh + '"/><path d="M36 70 Q50 88 64 70" fill="none" style="stroke:var(--club2)" stroke-width="3"/>'; if (o.numero !== undefined) s += '<text x="50" y="96" text-anchor="middle" font-size="20" font-weight="700" font-family="Graduate,Georgia,serif" style="fill:var(--club-ink)">' + o.numero + '</text>'; }
    // cabeza
    s += '<ellipse cx="50" cy="44" rx="19" ry="22" fill="' + skin + '"/><circle cx="31.5" cy="46" r="4" fill="' + skin + '"/><circle cx="68.5" cy="46" r="4" fill="' + skin + '"/>';
    // pelo
    const pelo = [
      '<path d="M31 40 Q32 23 50 23 Q68 23 69 40 Q60 32 50 32 Q40 32 31 40Z" fill="' + hair + '" opacity=".55"/>',
      '<path d="M30 42 Q27 19 50 19 Q73 19 70 42 Q65 30 50 29 Q35 30 30 42Z" fill="' + hair + '"/>',
      '<g fill="' + hair + '"><circle cx="34" cy="30" r="8"/><circle cx="44" cy="23" r="8"/><circle cx="56" cy="23" r="8"/><circle cx="66" cy="30" r="8"/><circle cx="50" cy="28" r="9"/></g>',
      '<path d="M29 44 Q25 18 50 18 Q75 18 71 44 Q66 28 50 28 Q34 28 29 44Z" fill="' + hair + '"/>',
      '<path d="M30 42 Q27 19 50 19 Q73 19 70 42 Q65 30 50 29 Q35 30 30 42Z" fill="' + hair + '"/><circle cx="50" cy="13" r="7" fill="' + hair + '"/>',
      ''][clamp(p.pelo, 6)];
    s += pelo;
    // cara
    s += '<path d="M37 40 L46 39.5 M54 39.5 L63 40" stroke="' + hair + '" stroke-width="2.2" stroke-linecap="round" fill="none"/><circle cx="42.5" cy="45" r="1.9" fill="#1b1b1b"/><circle cx="57.5" cy="45" r="1.9" fill="#1b1b1b"/>';
    s += '<path d="M50 46 Q47.5 52 51 53" stroke="' + sh + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>';
    const b = clamp(p.barba, 4);
    if (b === 1) s += '<path d="M44 62 Q50 71 56 62 Q50 66 44 62Z" fill="' + hair + '"/>';
    if (b === 2) s += '<path d="M31 50 Q33 67 50 68 Q67 67 69 50 Q62 59 50 59 Q38 59 31 50Z" fill="' + hair + '" opacity=".9"/>';
    if (b === 3) s += '<path d="M30 49 Q31 74 50 78 Q69 74 70 49 Q62 60 50 60 Q38 60 30 49Z" fill="' + hair + '"/>';
    s += '<path d="M44.5 57.5 Q50 61.5 55.5 57.5" stroke="#7a3b2e" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
    const g = clamp(p.gafas, 3);
    if (g === 1) s += '<g fill="none" stroke="#1d2630" stroke-width="1.6"><circle cx="42.5" cy="45" r="6"/><circle cx="57.5" cy="45" r="6"/><path d="M48.5 45 L51.5 45"/></g>';
    if (g === 2) s += '<g fill="none" stroke="#1d2630" stroke-width="1.8"><rect x="36" y="40" width="13" height="10" rx="2"/><rect x="51" y="40" width="13" height="10" rx="2"/><path d="M49 44 L51 44"/></g>';
    return s + '</g></svg>';
  }
  function selfTest() {
    const a = avatar(crear({ piel: 2, pelo: 3, barba: 2, gafas: 1, ropa: 3 }), { size: 40 }), b = avatar({ ropa: 0 }, { camiseta: true, numero: 7 });
    return a.indexOf('<svg') === 0 && a.indexOf(OPC.piel[2]) > 0 && a.indexOf('width="40"') > 0 && b.indexOf('>7<') > 0 && nombre({ nombre: 'Ana', apellido: 'Ruiz' }) === 'Ana Ruiz';
  }
  GM.register('personaje', { crear, avatar, nombre, aleatorio, OPC, selfTest });
})();
