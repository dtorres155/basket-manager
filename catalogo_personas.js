/* Catálogo de personas (punto 25): generador de combinaciones para los vecinos del mundo.
   GM.catalogo.generar(r, { pais, mes, club, hincha, edad, sexo, rol }) -> opciones para M.personaje (modelo, altura, piel, pelo, ropa, zapas,
   complexion, cara, cabeza, sinPelo y complementos: gafas, cinta, barba, tatuaje, gorra, gorro, bufanda, mochila, bolso).
   r es un generador al azar (0 a 1). Edades: nino, joven, adulto y mayor. Ropa de verano o invierno según el mes y el país. */
(function () {
  const HOMBRE = ['h-casual_2', 'h-casual_hoodie', 'h-beach', 'h-farmer', 'h-worker', 'h-suit', 'h-punk', 'h-adventurer'], MUJER = ['m-casual', 'm-formal', 'm-adventurer', 'm-punk', 'm-suit', 'm-worker'];
  const PIEL = ['#f6d3b8', '#f1c7a5', '#e0ac85', '#c68863', '#9a6142', '#6e4329', '#4b2e1e'];
  const PELO = ['#1d1510', '#2b1c12', '#3b2617', '#5a3920', '#6a4425', '#a9793e', '#d8b46a', '#b5502a', '#8a8a8a', '#cfcfcf'];
  // Paletas de ropa: [camiseta o prenda principal, pantalón o secundaria]
  const VERANO = [['#f2efe6', '#4a6a8a'], ['#f2c14e', '#2d3a4a'], ['#7fb7be', '#d9d2c0'], ['#e07a5f', '#3d405b'], ['#8fc08f', '#e8e2d0'], ['#ffffff', '#1f2a44'], ['#d94f70', '#e9e3d6'], ['#4f9d9d', '#7a6a58'], ['#f4a259', '#324b6e']];
  const INVIERNO = [['#2f3e55', '#222a35'], ['#5a4636', '#2b2b2b'], ['#7a2e2e', '#262a33'], ['#3b5b47', '#2b2f36'], ['#444b57', '#1d2128'], ['#8a7f6e', '#383b40'], ['#1f2a44', '#2a2a2a'], ['#6b3d5c', '#262a33']];
  const OTONO = [['#a2653a', '#3b3f4a'], ['#6f7d5a', '#40362b'], ['#9a8f7b', '#2f3a4d'], ['#5d6a85', '#403a33'], ['#b7b7b7', '#2d3a4a']];
  const CALIDOS = /ES|IT|GR|TR|BR|DO|AO|SN|NG|CM|ML|CD|SS|MA|DZ|TN|EG|IL|CY|MT|PT/, NORDICOS = /DE|SE|NO|FI|DK|LT|LV|EE|PL|GB|NL|BE|AT|CZ|RS|HR|SI/;
  const ZAPAS = ['#ffffff', '#1a1a1a', '#c0392b', '#2d4a8a', '#8a6a3a', '#e8e0d0', '#3a3a3a'];
  const pick = (r, a) => a[(r() * a.length) | 0];
  const pesada = (r, a, w) => { let t = 0; w.forEach(x => { t += x; }); let k = r() * t; for (let i = 0; i < a.length; i++) { k -= w[i]; if (k <= 0) return a[i]; } return a[a.length - 1]; };

  function estacion(mes, pais) {
    const m = mes || 6, calido = CALIDOS.test(pais || ''), norte = NORDICOS.test(pais || '');
    if (m >= 12 || m <= 2) return calido ? 'otono' : 'invierno';
    if (m >= 6 && m <= 9) return norte && m === 6 ? 'otono' : 'verano';
    if (m === 3 || m === 4 || m === 5) return calido && m >= 5 ? 'verano' : 'otono';
    return norte ? 'invierno' : 'otono';
  }

  function generar(r, c) {
    c = c || {};
    const edad = c.edad || (c.rol && c.rol !== 'turista' ? 'adulto' : null) || pesada(r, ['nino', 'joven', 'adulto', 'mayor'], [0.12, 0.3, 0.38, 0.2]);
    const sexo = c.sexo || (r() < 0.5 ? 'h' : 'm'), est = c.temp === undefined || c.temp === null ? estacion(c.mes, c.pais) : c.temp <= 11 ? 'invierno' : c.temp <= 18 ? 'otono' : 'verano', calido = CALIDOS.test(c.pais || ''), norte = NORDICOS.test(c.pais || '');
    const modelo = pick(r, sexo === 'h' ? HOMBRE : MUJER);
    const piel = pesada(r, PIEL, norte ? [3, 4, 2, 1, 1, 0.6, 0.4] : calido ? [1, 3, 4, 3, 1.2, 0.6, 0.4] : [2, 3, 3, 2, 1.5, 1, 0.6]);
    let pelo = pesada(r, PELO, norte ? [1, 1.5, 2, 2, 1.5, 2, 2, 0.6, 0.2, 0.1] : [4, 3, 2, 1, 1, 0.5, 0.2, 0.3, 0.1, 0.05]);
    const o = { modelo, piel, pelo, zapas: pick(r, ZAPAS), complexion: pesada(r, [0, 1, 2], [1.2, 2, 1.2]), cara: (r() * 4) | 0 };
    // altura y proporciones según la edad (en cm)
    if (edad === 'nino') { o.altura = 108 + r() * 38; o.cabeza = 1.14; o.complexion = 0; }
    else if (edad === 'joven') o.altura = (sexo === 'h' ? 168 : 157) + r() * 20;
    else if (edad === 'adulto') o.altura = (sexo === 'h' ? 166 : 155) + r() * 22;
    else { o.altura = (sexo === 'h' ? 162 : 151) + r() * 16; pelo = r() < 0.75 ? pick(r, ['#8a8a8a', '#cfcfcf', '#e6e6e6']) : pelo; o.pelo = pelo; if (r() < 0.2) o.sinPelo = true; }
    if (edad === 'adulto' && r() < 0.1) o.pelo = pick(r, ['#8a8a8a', '#cfcfcf']);
    // ropa: del club si es hincha; si no, paleta de la estación
    if (c.hincha && c.club && c.club.colores) o.ropa = [c.club.colores[0], c.club.colores[1] || '#222'];
    else if (c.rol === 'trabajador') o.ropa = ['#2f5d8a', '#2b2b2b'];
    else if (c.rol === 'policia') { o.ropa = ['#1f3550', '#16202f']; o.modelo = sexo === 'h' ? 'h-suit' : 'm-suit'; }
    else if (c.rol === 'repartidor') { o.ropa = ['#f2a900', '#2b2b2b']; o.modelo = sexo === 'h' ? 'h-worker' : 'm-worker'; }
    else if (c.rol === 'comerciante') o.ropa = pick(r, [['#8a6a3a', '#e8e2d0'], ['#3f6f5a', '#e8e2d0'], ['#9a3d3d', '#d8d2c0']]);
    else if (c.rol === 'turista') o.ropa = pick(r, VERANO);
    else o.ropa = pick(r, est === 'verano' ? VERANO : est === 'invierno' ? INVIERNO : OTONO);
    // complementos
    if (edad !== 'nino') {
      if (sexo === 'h' && (edad === 'adulto' || edad === 'mayor') && r() < 0.3) o.barba = 1 + ((r() * 3) | 0);
      else if (sexo === 'h' && edad === 'joven' && r() < 0.18) o.barba = 1;
      if (r() < (edad === 'mayor' ? 0.4 : 0.14)) o.gafas = 1 + ((r() * 2) | 0);
      if (edad !== 'mayor' && r() < 0.1) o.tatuaje = 1 + ((r() * 3) | 0);
      if (edad === 'joven' && r() < 0.1) o.cinta = pick(r, ['#ffffff', '#c0392b', '#222']);
    }
    if (est === 'invierno' || (est === 'otono' && r() < 0.3)) {
      if (r() < 0.55) o.bufanda = pick(r, ['#8a2d2d', '#2d4a8a', '#d8d2c0', '#3b3b3b', '#c9a227']);
      if (r() < 0.35) o.gorro = pick(r, ['#2b2b2b', '#8a2d2d', '#2d4a8a', '#d8d2c0']);
    } else if (est === 'verano') {
      if (r() < 0.28) o.gorra = pick(r, ['#ffffff', '#1f2a44', '#c0392b', '#d8b46a']);
      if (!o.gafas && r() < 0.18) o.gafas = 1;
    }
    if (edad === 'nino' || (edad === 'joven' && r() < 0.4)) { if (r() < 0.6) o.mochila = pick(r, ['#c0392b', '#2d4a8a', '#2d8a4a', '#d8b46a', '#444']); }
    else if (r() < 0.2) o.bolso = pick(r, ['#5a3920', '#1a1a1a', '#8a2d2d']);
    if (c.rol === 'policia') { o.gorra = '#1f3550'; delete o.barba; delete o.tatuaje; delete o.bufanda; delete o.gorro; delete o.mochila; delete o.bolso; }
    if (c.rol === 'repartidor') { o.mochila = '#f2a900'; delete o.bolso; delete o.gorro; }
    if (c.rol === 'turista') { o.gorra = o.gorra || pick(r, ['#ffffff', '#d8b46a', '#c0392b']); o.gafas = o.gafas || 1; o.mochila = o.mochila || '#2d4a8a'; delete o.gorro; delete o.bufanda; }
    // cuerpo: de muy delgado a robusto; niños con piernas y brazos más cortos; faldas y abrigos
    o.ancho = pesada(r, [0.88, 0.94, 1, 1.07, 1.16], edad === 'mayor' ? [1, 2, 3, 3, 2] : [1.2, 2.5, 3, 2, 1]); delete o.complexion;
    if (edad === 'nino') { o.proporcion = 'nino'; delete o.cabeza; o.ancho = 0.9 + r() * 0.1; }
    if (edad === 'mayor' && r() < 0.3) o.baston = pick(r, ['#5a3920', '#2b2b2b', '#8a6a3a']);
    if (sexo === 'm' && edad !== 'nino' && !c.rol && est !== 'invierno' && r() < 0.32) { o.falda = o.ropa[1]; o.faldaLarga = r() < 0.5; }
    if (est === 'invierno' && !c.hincha && !c.rol && r() < 0.7) o.abrigo = pick(r, ['#2b2f3a', '#5a4636', '#3a4a3f', '#6b2f2f', '#8a8478', '#1f2a44']);
    else if (est === 'otono' && !c.hincha && !c.rol && r() < 0.3) o.abrigo = pick(r, ['#4a5a6a', '#6a5a3a', '#3a3a3a']);
    o.edad = edad; o.sexo = sexo; o.estacion = est; if (c.rol) o.rolV = c.rol;
    return o;
  }

  // Firma corta de una persona: sirve para comprobar que dos vecinos a la vista no son iguales
  const firma = o => [o.modelo, o.piel, o.pelo, o.ropa && o.ropa[0], o.ropa && o.ropa[1], Math.round((o.altura || 0) / 6), o.gorra || '', o.gorro || '', o.bufanda || '', o.mochila || '', o.bolso || '', o.barba || '', o.gafas || '', o.baston || '', o.abrigo || '', o.falda ? 1 : '', o.ancho || ''].map(String).join('|');
  // Lote de n personas distintas entre sí (reintenta los repetidos)
  function lote(r, n, c) { const vistas = new Set(), res = []; for (let i = 0; i < n; i++) { let o, t = 0; do { o = generar(r, c); t++; } while (vistas.has(firma(o)) && t < 12); vistas.add(firma(o)); res.push(o); } return res; }

  GM.catalogo = { generar, lote, firma, estacion, HOMBRE, MUJER, PIEL, PELO };
})();
