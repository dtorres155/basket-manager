/* SEGUNDA Y TERCERA CATEGORÍA ESPAÑOLA (LEB Oro y LEB Plata, hoy Primera y Segunda FEB): se añaden con GM.registrarLiga como las demás ligas nuevas. Los clubes llevan nombres reales; las plantillas son relleno ficticio
   con nombres españoles (sin datos fiables de sus jugadores), de nivel claramente inferior a la ACB: sirven para ascender y descender (ascensos.js), para ceder canteranos y para que un jugador joven pueda empezar ahí en el modo carrera.
   Los ascensos y descensos entre ACB, LEB Oro y LEB Plata se hacen cada temporada en ascensos.js. Las fechas son aproximadas. */
(function () {
  const c = (id, nombre, siglas, ciudad, col, rep, pres, pab, aforo) => ({ def: ['leb-' + id, nombre, siglas, ciudad, 'ES', col, rep, pres, pab, aforo], filas: [], opt: { plantilla: 13, salMin: 0.03, baseOvr: Math.round(50 + (rep - 28) * 0.3), paisRelleno: 'ES' } });
  const P = (tier, nivel, f) => ({ fact: 0.03, minsal: 0.03e6, maxsal: 0.5e6, esc: { precio: 10, merch: 1.2, tv: 0.01e6 }, baseLiga: 0.3, minOvr: 46, nivel: 1, tier: 1, factorTier: f, ligaSal: 0.45, espec: 'Cantera y cesiones en España', fechas: { ini: '-10-04', fin: '-04-26', po: '-05-02' } });
  GM.registrarLiga({
    id: 'LEBORO', nombre: 'Primera FEB (LEB Oro)', pais: 'ES', formato: 'liga_simple', equipos: [],
    params: Object.assign(P(), { factorTier: 0.55, minsal: 0.04e6, maxsal: 0.7e6, nombreLiga: 'LEB Oro', ligaSal: 0.55 }),
    clubes: [
      c('palencia', 'Palencia Baloncesto', 'PAL', 'Palencia', ['#1b5e20', '#ffffff'], 40, 2.2, 'Pabellón Marta Domínguez', 2800), c('estudiantes', 'Movistar Estudiantes', 'EST', 'Madrid', ['#1d4f91', '#ffffff'], 48, 4, 'Pabellón Magariños', 3500),
      c('castello', 'Tau Castelló', 'CAS', 'Castellón', ['#1d4f91', '#fcd116'], 36, 1.8, 'Pabellón Ciutat de Castelló', 3000), c('betis', 'Real Betis Baloncesto', 'BET', 'Sevilla', ['#0b8a3c', '#ffffff'], 42, 2.5, 'Pabellón San Pablo', 6000),
      c('melilla', 'Enerdrink Melilla', 'MEL', 'Melilla', ['#1d4f91', '#ffffff'], 34, 1.6, 'Pabellón Javier Imbroda', 2500), c('zamora', 'Zamora Enamora', 'ZAM', 'Zamora', ['#d4202e', '#ffffff'], 32, 1.4, 'Ángel Nieto', 1800),
      c('caceres', 'Cáceres Patrimonio de la Humanidad', 'CAC', 'Cáceres', ['#c8102e', '#ffffff'], 36, 1.8, 'Multiusos Cáceres', 5000), c('ourense', 'Ourense Baloncesto', 'OUR', 'Ourense', ['#1d4f91', '#fcd116'], 34, 1.6, 'Pazo Paco Paz', 5000),
      c('alicante', 'HLA Alicante', 'ALI', 'Alicante', ['#1d4f91', '#ffffff'], 36, 1.8, 'Pitiu Rochel', 4000), c('palma', 'Palmer Alma Mediterránea', 'PAM', 'Palma', ['#d4202e', '#fcd116'], 36, 1.8, 'Son Moix', 3000),
      c('fuenlabrada', 'Fuenlabrada', 'FUE', 'Fuenlabrada', ['#1d4f91', '#fcd116'], 40, 2.4, 'Fernando Martín', 5400), c('albacete', 'Albacete Basket', 'ALB', 'Albacete', ['#c8102e', '#ffffff'], 32, 1.4, 'Pabellón Universitario', 2800),
      c('oviedo', 'Alimerka Oviedo Baloncesto', 'OVI', 'Oviedo', ['#1d4f91', '#ffffff'], 36, 1.8, 'Florida Arena', 4000), c('juaristi', 'Juaristi ISB', 'ISB', 'Azpeitia', ['#d4202e', '#ffffff'], 30, 1.2, 'Municipal de Azpeitia', 1800),
      c('cantabria', 'Cantabria Baloncesto', 'CNT', 'Santander', ['#d4202e', '#ffffff'], 32, 1.4, 'Palacio de Deportes', 3500), c('prat', 'CB Prat', 'PRA', 'El Prat de Llobregat', ['#1d4f91', '#ffffff'], 30, 1.2, 'Pabellón Joan Busquets', 1500)]
  });
  GM.registrarLiga({
    id: 'LEBPLATA', nombre: 'Segunda FEB (LEB Plata)', pais: 'ES', formato: 'liga_simple', equipos: [],
    params: Object.assign(P(), { factorTier: 0.45, minOvr: 42, minsal: 0.02e6, maxsal: 0.3e6, nombreLiga: 'LEB Plata', ligaSal: 0.3, fechas: { ini: '-10-11', fin: '-04-19', po: '-04-25' } }),
    clubes: [
      c('barca-b', 'FC Barcelona B', 'FCB', 'Barcelona', ['#a50044', '#004d98'], 30, 1.5, 'Palau Blaugrana, pista anexa', 1500), c('madrid-b', 'Real Madrid B', 'RMB', 'Madrid', ['#ffffff', '#00529f'], 30, 1.5, 'Ciudad Real Madrid', 1000),
      c('joventut-b', 'Joventut B', 'JOB', 'Badalona', ['#00964b', '#000000'], 26, 1.0, 'Club Joventut', 1000), c('baskonia-b', 'Baskonia B', 'BKB', 'Vitoria-Gasteiz', ['#c8102e', '#00205b'], 26, 1.0, 'Polideportivo Mendizorroza', 1000),
      c('cornella', 'Cornellà Bàsquet', 'COR', 'Cornellà de Llobregat', ['#d4202e', '#ffffff'], 26, 1.0, 'Pavelló Municipal', 1200), c('almansa', 'Almansa Basket', 'ALM', 'Almansa', ['#1d4f91', '#ffffff'], 24, 0.8, 'Pabellón Municipal', 1200),
      c('navarra', 'Basket Navarra', 'NAV', 'Pamplona', ['#d4202e', '#1d1d1b'], 28, 1.1, 'Polideportivo Universidad', 1500), c('alcala', 'Alcalá Basket', 'ALC', 'Alcalá de Henares', ['#1d4f91', '#fcd116'], 26, 1.0, 'Pabellón Caja Madrid', 1500),
      c('ibaizabal', 'Ibaizabal Bizkaia', 'IBA', 'Bilbao', ['#c8102e', '#ffffff'], 26, 1.0, 'Polideportivo Municipal', 1000), c('mataro', 'Tecnyconta Mataró', 'MAT', 'Mataró', ['#1d4f91', '#fcd116'], 26, 1.0, 'Pavelló Teresa Maria Roca', 1200),
      c('sant-antoni', 'Sant Antoni Eivissa', 'SAN', 'Ibiza', ['#1d4f91', '#ffffff'], 24, 0.8, 'Pabellón Municipal', 1200), c('lugo', 'Lugo Baloncesto', 'LUG', 'Lugo', ['#d4202e', '#ffffff'], 28, 1.1, 'Pazo dos Deportes', 3000),
      c('coruna-b', 'Leyma Coruña B', 'LCB', 'A Coruña', ['#1d4f91', '#ffffff'], 24, 0.8, 'Pazo dos Deportes de Riazor', 1000), c('lleida-b', 'Força Lleida B', 'FLB', 'Lleida', ['#fcd116', '#1d1d1b'], 24, 0.8, 'Pavelló Barris Nord', 1000)]
  });
  GM.commitDatos([]);
})();
