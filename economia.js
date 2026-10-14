/* ECONOMÍA BASADA EN DATOS (punto 57, GM.economia): cada ciudad tiene su coste de vida, salario medio, precio del alquiler y del suelo (a partir de tablas por país y un factor por ciudad que se parece
   a los datos de INE, Eurostat, BLS y Numbeo; son cifras redondeadas, no oficiales), y la economía tiene un ciclo anual (boom, recesión, burbuja inmobiliaria, inflación alta) y una inflación suave.
   Efectos en el juego: lo que cuesta vivir (hogar.js), el precio de la vivienda y de los bienes (carrera.js, patrimonio.js), los sueldos que piden los jugadores (mercado.js) y los ingresos del club:
   patrocinios y taquilla/abonados (finanzas.js). Así Boston es más cara que Lleida y se nota en el contrato, en el alquiler y en la caja del club.
   Expone: ficha(st, clubId), indiceVida, indiceSuelo, indicePrecios, factorSalario, factorClub, ciclo, inflacion, comparar, ranking, gastosMes, selfTest. No guarda estado (el ciclo sale de la semilla de la partida). Prueba: t_economia.js. */
(function () {
  const U = GM.util, clamp = U.clamp;
  // coste de vida (España = 1), salario medio anual en miles de euros, alquiler en €/m² al mes, inflación anual base
  const PAIS = {
    ES: { vida: 1.00, sal: 28, alq: 13, infl: 0.026, n: 'España' }, US: { vida: 1.38, sal: 62, alq: 25, infl: 0.03, n: 'Estados Unidos' }, DE: { vida: 1.15, sal: 50, alq: 16, infl: 0.024, n: 'Alemania' }, FR: { vida: 1.20, sal: 42, alq: 22, infl: 0.022, n: 'Francia' },
    IT: { vida: 1.04, sal: 32, alq: 14, infl: 0.023, n: 'Italia' }, GR: { vida: 0.85, sal: 19, alq: 9, infl: 0.03, n: 'Grecia' }, TR: { vida: 0.55, sal: 11, alq: 6, infl: 0.12, n: 'Turquía' }, IL: { vida: 1.45, sal: 40, alq: 24, infl: 0.03, n: 'Israel' },
    LT: { vida: 0.80, sal: 20, alq: 9, infl: 0.03, n: 'Lituania' }, RS: { vida: 0.60, sal: 11, alq: 7, infl: 0.04, n: 'Serbia' }, AE: { vida: 1.30, sal: 45, alq: 28, infl: 0.025, n: 'Emiratos' }, AD: { vida: 1.10, sal: 30, alq: 18, infl: 0.02, n: 'Andorra' }
  };
  // Factor de la ciudad respecto a la media de su país
  const CIUDAD = {
    Madrid: 1.17, Barcelona: 1.18, Badalona: 1.05, Lleida: 0.82, Manresa: 0.85, Girona: 0.97, Bilbao: 1.08, 'Vitoria-Gasteiz': 0.96, Valencia: 1.0, 'Málaga': 1.04, Murcia: 0.88, Zaragoza: 0.93, 'A Coruña': 0.91, Lugo: 0.80, Burgos: 0.86, 'Santiago de Compostela': 0.86, 'San Cristóbal de La Laguna': 0.9,
    Atlanta: 0.98, Boston: 1.38, Brooklyn: 1.5, Charlotte: 0.93, Chicago: 1.05, Cleveland: 0.8, Detroit: 0.82, 'Indianápolis': 0.83, Miami: 1.22, Milwaukee: 0.86, 'Nueva York': 1.55, Orlando: 0.95, Filadelfia: 1.05, Toronto: 1.2, Washington: 1.27, Dallas: 1.0, Denver: 1.12, 'San Francisco': 1.6, Houston: 0.96, 'Los Ángeles': 1.38,
    Memphis: 0.8, Minneapolis: 0.98, 'Nueva Orleans': 0.88, 'Oklahoma City': 0.82, Phoenix: 0.99, Portland: 1.1, Sacramento: 1.04, 'San Antonio': 0.85, 'Salt Lake City': 0.98,
    Atenas: 1.1, 'El Pireo': 1.0, 'Tesalónica': 0.92, Patras: 0.82, Rodas: 0.9, Karditsa: 0.74, 'Ioánina': 0.78, 'Léucade': 0.8, 'Míkonos': 1.45, Estambul: 1.25, Bursa: 0.85, Ankara: 1.0, Esmirna: 0.95, Denizli: 0.78, 'Aliağa': 0.78, 'Körfez': 0.8, 'Çayırova': 0.85, 'Bandırma': 0.78, Trebisonda: 0.8,
    'Tel Aviv': 1.3, Kaunas: 0.9, Belgrado: 1.1, Bolonia: 1.12, 'Milán': 1.4, Venecia: 1.15, Trento: 1.1, 'Reggio Emilia': 1.0, 'Nápoles': 0.88, Trieste: 1.0, Varese: 1.05, Treviso: 1.02, Tortona: 0.86, 'Cantù': 1.0, Udine: 0.96, Roma: 1.22, Scafati: 0.82, Verona: 1.06,
    'Múnich': 1.42, 'Berlín': 1.15, Ulm: 1.05, Ludwigsburg: 1.12, Bamberg: 0.95, Bonn: 1.08, 'Fráncfort': 1.25, Hamburgo: 1.2, Oldemburgo: 0.93, Wurzburgo: 0.97, Chemnitz: 0.82, 'Weißenfels': 0.78, Vechta: 0.85, Jena: 0.9, Rostock: 0.9, Hagen: 0.88, 'Tréveris': 0.93, Brunswick: 0.92,
    'París': 1.55, Villeurbanne: 1.1, 'Dubái': 1.15, 'Andorra la Vella': 1.0
  };
  const pais = (st, clubId) => { const e = st.equipos[clubId || st.clubId]; return (e && e.pais) || 'ES'; };
  const ciudadF = (st, clubId) => { const e = st.equipos[clubId || st.clubId], c = e && e.ciudad; return CIUDAD[c] !== undefined ? CIUDAD[c] : 0.9 + (U.hash(String(c)) % 21) / 100; };
  const anioT = st => parseInt(String(st.temporada).slice(0, 4), 10);
  // El ciclo de cada año sale de la semilla de la partida: 2026-27 es normal, después hay recesiones, bonanzas, burbujas y años de inflación alta
  const CICLOS = { normal: { n: 'Año normal', patrocinio: 1, taquilla: 1, vivienda: 1, infl: 0 }, boom: { n: 'Bonanza económica', patrocinio: 1.12, taquilla: 1.06, vivienda: 1.07, infl: 0.005 }, recesion: { n: 'Recesión', patrocinio: 0.84, taquilla: 0.93, vivienda: 0.93, infl: -0.01 }, burbuja: { n: 'Burbuja inmobiliaria', patrocinio: 1.03, taquilla: 1.02, vivienda: 1.14, infl: 0.01 }, inflacion: { n: 'Inflación alta', patrocinio: 0.97, taquilla: 0.98, vivienda: 1.04, infl: 0.035 } };
  function ciclo(st, anio) {
    anio = anio || anioT(st); if (anio <= 2026) return Object.assign({ id: 'normal' }, CICLOS.normal); const h = U.hash(String(st.seed) + 'eco' + anio) % 100, id = h < 9 ? 'recesion' : h < 20 ? 'boom' : h < 27 ? 'burbuja' : h < 34 ? 'inflacion' : 'normal'; return Object.assign({ id }, CICLOS[id]);
  }
  function inflacion(st, clubId, anios) {   // inflación acumulada desde 2026 hasta la temporada actual (o los años que se pidan)
    const p = PAIS[pais(st, clubId)] || PAIS.ES, fin = anios !== undefined ? 2026 + anios : anioT(st); let f = 1; for (let y = 2027; y <= fin; y++) f *= 1 + Math.max(0, p.infl + ciclo(st, y).infl + ((U.hash(String(st.seed) + 'i' + y) % 9) - 4) / 1000); return Math.round(f * 1000) / 1000;
  }
  // ---------- Índices ----------
  const indiceVida = (st, clubId) => Math.round((PAIS[pais(st, clubId)] || PAIS.ES).vida * ciudadF(st, clubId) * inflacion(st, clubId) * 1000) / 1000;
  const indiceSuelo = (st, clubId) => { const p = PAIS[pais(st, clubId)] || PAIS.ES; return Math.round(p.alq / PAIS.ES.alq * Math.pow(ciudadF(st, clubId), 1.2) * ciclo(st).vivienda * inflacion(st, clubId) * 1000) / 1000; };
  const indicePrecios = (st, clubId) => indiceSuelo(st, clubId);
  function factorSalario(st, clubId) { return Math.round(clamp(0.92 + 0.08 * ciudadF(st, clubId) * Math.sqrt((PAIS[pais(st, clubId)] || PAIS.ES).vida), 0.9, 1.12) * 1000) / 1000; }
  function factorClub(st, clubId) {
    const c = ciclo(st), p = PAIS[pais(st, clubId)] || PAIS.ES, riqueza = Math.pow(clamp(p.sal * Math.pow(ciudadF(st, clubId), 0.8) / 30, 0.4, 2.4), 0.25);   // el poder adquisitivo de la afición pesa poco, pero pesa
    return { patrocinio: Math.round(c.patrocinio * riqueza * 1000) / 1000, taquilla: Math.round(c.taquilla * (0.9 + 0.1 * riqueza) * 1000) / 1000 };
  }
  function ficha(st, clubId) {
    clubId = clubId || st.clubId; const e = st.equipos[clubId], p = PAIS[pais(st, clubId)] || PAIS.ES, c = ciudadF(st, clubId), cl = ciclo(st);
    return { clubId, ciudad: e.ciudad, pais: p.n, vida: Math.round(p.vida * c * 100) / 100, indiceVida: indiceVida(st, clubId), salarioMedio: Math.round(p.sal * Math.pow(c, 0.8) * 10) / 10, alquilerM2: Math.round(p.alq * Math.pow(c, 1.2) * 10) / 10, inflacionBase: p.infl, inflacionAcum: inflacion(st, clubId), suelo: indiceSuelo(st, clubId), club: factorClub(st, clubId), sueldos: factorSalario(st, clubId), ciclo: cl.n };
  }
  function comparar(st, a, b) { const x = ficha(st, a), y = ficha(st, b); return { a: x, b: y, vida: Math.round((x.vida / y.vida - 1) * 100), alquiler: Math.round((x.alquilerM2 / y.alquilerM2 - 1) * 100), salario: Math.round((x.salarioMedio / y.salarioMedio - 1) * 100) }; }
  function ranking(st) { const vistos = {}, L = []; Object.keys(st.equipos).forEach(id => { const e = st.equipos[id]; if (!e || !e.ciudad || vistos[e.ciudad]) return; vistos[e.ciudad] = 1; const f = ficha(st, id); L.push({ id, ciudad: e.ciudad, pais: f.pais, vida: f.vida, alquilerM2: f.alquilerM2, salarioMedio: f.salarioMedio }); }); return L.sort((a, b) => b.vida - a.vida); }
  // Lo que cuesta vivir al mes (miles de euros): se aplica al estilo de vida del nivel
  const gastosMes = (st, base) => Math.round(base * indiceVida(st) * 100) / 100;
  // El ciclo cambia cada temporada nueva: se avisa
  GM.bus.on('temporada:nueva', () => { const st = GM.state; if (!st || !st.equipos || !st.equipos[st.clubId]) return; const c = ciclo(st); if (c.id !== 'normal' && GM.noticia) GM.noticia(st, '📉 Economía de ' + st.temporada + ': ' + c.n.toLowerCase() + '. ' + ({ recesion: 'Los patrocinios y la taquilla bajan.', boom: 'Suben patrocinios y taquilla.', burbuja: 'La vivienda se encarece mucho.', inflacion: 'Todo cuesta más.' }[c.id] || '')); });
  function selfTest() {
    const st = { temporada: '2026-27', seed: 'x', clubId: 'bo', equipos: { bo: { ciudad: 'Boston', pais: 'US' }, ll: { ciudad: 'Lleida', pais: 'ES' }, tr: { ciudad: 'Estambul', pais: 'TR' } } };
    const c = comparar(st, 'bo', 'll'); if (!(c.vida > 30 && c.alquiler > 100 && c.salario > 100)) return false; if (!(factorSalario(st, 'bo') > factorSalario(st, 'll'))) return false;
    const a = inflacion(Object.assign({}, st, { temporada: '2030-31' }), 'bo'), t = inflacion(Object.assign({}, st, { temporada: '2030-31' }), 'tr'); return a > 1.05 && t > a * 1.2 && ciclo(st).id === 'normal' && Object.keys(CICLOS).length === 5 && factorClub(st, 'bo').patrocinio > factorClub(st, 'tr').patrocinio;
  }
  GM.economia = { PAIS, CIUDAD, CICLOS, ficha, comparar, ranking, indiceVida, indiceSuelo, indicePrecios, factorSalario, factorClub, ciclo, inflacion, gastosMes, selfTest };
  GM.register && GM.register('economia', GM.economia);
})();
