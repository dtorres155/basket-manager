/* DATOS ACB y LEGA BASKET 2026-27 (Real Madrid, Barça, Baskonia, Valencia, Olimpia y Virtus se definen en datos_euroliga.js).
   Estimaciones: solo las figuras que conozco con cierta fiabilidad; el resto de la plantilla es relleno ficticio. Edítalo a tu gusto.
   Fila: [nombre,pos,edad,ovr,pot,perfil,salario M€,fin contrato,nac?] */
(function () {
  const O = rep => ({ plantilla: 12, salMin: 0.12, baseOvr: Math.round(56 + (rep - 46) * 0.4) });
  const C = (id, n, s, c, col, rep, pres, pab, af, rows, pais) => GM.club([id, n, s, c, pais || 'ES', col, rep, pres, pab, af], rows, Object.assign(O(rep), pais ? { paisRelleno: pais } : {}));
  // ACB (14 clubes propios; los otros 4 vienen de la Euroliga)
  C('unicaja', 'Unicaja', 'UNI', 'Málaga', ['#006a4e', '#ffd200'], 66, 22, 'Palacio de Deportes Martín Carpena', 10700, [["Willy Hernangómez", "C", 32, 78, 78, "R", 2.0, 2028, "ES"], ["Alberto Díaz", "PG", 33, 72, 72, "D", 1.0, 2027, "ES"], ["Cameron Hunt", "SG", 28, 72, 72, "T", 0.8, 2028, "US"], ["Ignas Brazdeikis", "SF", 27, 72, 72, "T", 0.8, 2027, "CA"], ["Simonas Lukosius", "SG", 22, 70, 78, "T", 0.6, 2027, "LT"], ["Nihad Đedović", "SF", 36, 70, 70, "T", 0.8, 2027, "BA"], ["Tyson Pérez", "PF", 31, 70, 70, "R", 0.6, 2029, "US"], ["Yannick Nzosa", "C", 23, 70, 76, "R", 0.5, 2027, "CD"], ["Amine Noua", "C", 24, 68, 68, "R", 0.5, 2028, "MA"], ["Melwin Pantzar", "PG", 26, 68, 68, "P", 0.5, 2027, "SE"], ["Chris Ledlum", "SF", 26, 68, 68, "D", 0.5, 2027, "US"], ["Matt Thomas", "SG", 32, 68, 68, "T", 0.6, 2027, "US"], ["Jonathan Barreiro", "SF", 28, 66, 66, "D", 0.4, 2027, "ES"]]);
  C('joventut-badalona', 'Asisa Joventut', 'JOV', 'Badalona', ['#00a859', '#000000'], 62, 14, 'Palau Olímpic de Badalona', 12760, [["Ricky Rubio", "PG", 36, 76, 76, "P", 2.0, 2027, "ES"], ["Nico Laprovittola", "PG", 36, 70, 70, "T", 1.0, 2028, "AR"], ["Boogie Ellis", "SG", 27, 70, 70, "T", 0.8, 2027, "US"], ["Isaac Nogués", "PG", 29, 66, 66, "P", 0.5, 2028, "ES"], ["Álex Reyes", "SF", 22, 66, 72, "T", 0.4, 2028, "ES"], ["Yannick Kraag", "SF", 22, 66, 74, "D", 0.4, 2027, "NL"], ["Kwan Cheatham", "PF", 28, 68, 68, "R", 0.5, 2027, "US"], ["Emir Sulejmanović", "PF", 24, 70, 70, "R", 0.6, 2028, "BA"], ["Ante Tomić", "C", 39, 66, 66, "R", 0.6, 2027, "HR"], ["Simon Birgander", "C", 31, 70, 70, "R", 0.6, 2027, "SE"], ["Michael Ružić", "C", 27, 70, 70, "R", 0.6, 2029, "HR"], ["Rubén Prey", "SF", 28, 66, 66, "D", 0.4, 2028, "ES"], ["Eli Ndiaye", "C", 24, 70, 74, "R", 0.5, 2027, "SN"], ["Dane Erikstrup", "PF", 24, 64, 68, "R", 0.3, 2027, "DK"]]);
  GM._pack.equipos.find(e => e.id === 'joventut-badalona').ciudadDeportiva = { nombre: 'Campus de la Penya', municipio: 'Badalona', descripcion: 'Campus inspirado en la historia de la Penya: el Pavelló Ausiàs March, una de las canteras más reconocidas de Europa y el Palau Olímpic como telón de fondo.' };
  C('leyma-coruna', 'Leyma Coruña', 'COR', 'A Coruña', ['#0b3d91', '#ffffff'], 46, 7, 'Coliseum da Coruña', 6000, [["Dani García", "PG", 30, 68, 68, "P", 0.4, 2027, "ES"], ["Dídac Cuevas", "PG", 28, 66, 66, "P", 0.3, 2027, "ES"]]);
  C('tenerife', 'La Laguna Tenerife', 'TEN', 'San Cristóbal de La Laguna', ['#00539f', '#ffd200'], 60, 13, 'Santiago Martín', 5100, [['Marcelinho Huertas', 'PG', 43, 64, 64, 'P', 0.4, 2027, 'BR']]);
  C('ucam-murcia', 'UCAM Murcia', 'MUR', 'Murcia', ['#1d3a8a', '#ffffff'], 54, 11, 'Palacio de los Deportes de Murcia', 7500, [["Juani Marcos", "SF", 22, 68, 72, "T", 0.4, 2028, "ES"], ["Souleyman Boum", "PG", 26, 66, 66, "P", 0.3, 2027, "FR"]]);
  C('bilbao-basket', 'Surne Bilbao Basket', 'BIL', 'Bilbao', ['#003f87', '#ffffff'], 56, 11, 'Bilbao Arena', 8500, [["Nate Darling", "SG", 27, 70, 70, "T", 0.4, 2027, "CA"], ["Mike Tobey", "C", 32, 70, 70, "R", 0.4, 2027, "US"], ["Bastien Vautier", "SG", 29, 66, 66, "D", 0.3, 2027, "FR"]]);
  C('girona', 'FIATC Girona', 'GIR', 'Girona', ['#c8102e', '#ffffff'], 56, 11, 'Pavelló Fontajau', 5500, [["Aljaž Kunc", "PF", 28, 68, 68, "R", 0.3, 2027, "SI"], ["Andrzej Pluta", "SG", 27, 68, 68, "T", 0.3, 2027, "PL"]]);
  C('zaragoza', 'Casademont Zaragoza', 'ZAR', 'Zaragoza', ['#c8102e', '#ffffff'], 52, 10, 'Pabellón Príncipe Felipe', 10700, [["Guillem Vives", "PG", 33, 72, 72, "P", 0.6, 2027, "ES"]]);
  C('manresa', 'Kids&Us Manresa', 'MAN', 'Manresa', ['#f58220', '#00539f'], 50, 8, 'Nou Congost', 5200, [["Lucas Beaufort", "C", 29, 70, 70, "R", 0.4, 2027, "FR"], ["Michael Enabulele", "PF", 30, 66, 66, "R", 0.3, 2027, "US"], ["Chibuzu Agbo", "PF", 28, 66, 66, "T", 0.3, 2027, "NG"], ["Łukasz Kolenda", "SF", 30, 66, 66, "T", 0.3, 2027, "PL"]]);
  C('andorra', 'MoraBanc Andorra', 'AND', 'Andorra la Vella', ['#00539f', '#ffd200'], 52, 9, 'Poliesportiu d\'Andorra', 5500, [], 'AD');
  C('hiopos-lleida', 'iLERNA Lleida', 'LLE', 'Lleida', ['#c8102e', '#ffffff'], 46, 7, 'Pavelló Barris Nord', 5000, []);
  C('breogan', 'Río Breogán', 'BRE', 'Lugo', ['#00539f', '#ffffff'], 48, 8, 'Pazo dos Deportes', 6000, [["Tevin Brown", "SG", 29, 68, 68, "T", 0.3, 2027, "US"], ["Aleksa Ilić", "PG", 27, 66, 66, "P", 0.3, 2027, "RS"], ["Josep Peris", "SF", 28, 66, 66, "D", 0.3, 2027, "ES"]]);
  C('burgos', 'Recoletas San Pablo Burgos', 'BUR', 'Burgos', ['#00539f', '#c8102e'], 48, 8, 'Coliseum Burgos', 9400, [["Chase Audige", "SG", 30, 70, 70, "D", 0.4, 2027, "US"], ["Žiga Samar", "SG", 32, 66, 66, "T", 0.3, 2027, "SI"]]);
  C('obradoiro', 'Monbus Obradoiro', 'OBR', 'Santiago de Compostela', ['#00539f', '#ffffff'], 46, 7, 'Multiusos Fontes do Sar', 6000, []);
  // LEGA BASKET (14 clubes propios; Milano y Virtus vienen de la Euroliga)
  const I = (id, n, s, c, col, rep, pres, pab, af, rows) => GM.club([id, n, s, c, 'IT', col, rep, pres, pab, af], rows, { plantilla: 11, salMin: 0.12, baseOvr: Math.round(54 + (rep - 46) * 0.4) });
  I('reyer-venezia', 'Umana Reyer Venezia', 'VEN', 'Venecia', ['#7a1f3d', '#f58220'], 62, 16, 'Palasport Taliercio', 3500, []);
  I('trento', 'Dolomiti Energia Trentino', 'TRE', 'Trento', ['#7a1f3d', '#ffffff'], 54, 10, 'BTS Arena', 4300, []);
  I('reggio-emilia', 'UNA Hotels Reggio Emilia', 'REG', 'Reggio Emilia', ['#c8102e', '#ffffff'], 52, 9, 'Unipol Arena Reggio', 5500, []);
  I('napoli-basket', 'Napoli Basketball', 'NAP', 'Nápoles', ['#00539f', '#ffffff'], 50, 8, 'PalaBarbuto', 4000, []);
  I('trieste', 'Pallacanestro Trieste', 'TRI', 'Trieste', ['#c8102e', '#ffffff'], 50, 8, 'Allianz Dome', 6500, []);
  I('varese', 'Openjobmetis Varese', 'VAR', 'Varese', ['#c8102e', '#ffffff'], 52, 9, 'Itelyum Arena', 5100, []);
  I('treviso', 'Nutribullet Treviso', 'TVB', 'Treviso', ['#00539f', '#ffffff'], 52, 9, 'Palaverde', 5200, []);
  I('tortona', 'Bertram Derthona Tortona', 'TOR', 'Tortona', ['#00539f', '#c8102e'], 48, 7, 'PalaCastellania', 3500, []);
  // Recién llegados o no incluidos antes (pabellones y presupuestos aproximados)
  I('cantu', 'Acqua S.Bernardo Cantù', 'CAN', 'Cantù', ['#003f87', '#ffffff'], 50, 7, 'PalaDesio', 6700, []);
  I('udine', 'APU Udine', 'UDI', 'Udine', ['#000000', '#ffffff'], 48, 7, 'Palasport Primo Carnera', 3850, []);
  I('bc-roma', 'BC Roma', 'BCR', 'Roma', ['#8a1538', '#f5b400'], 48, 7, 'PalaTiziano', 3500, []);
  I('maxima-roma', 'Maxima Roma', 'MXR', 'Roma', ['#7a1f3d', '#ffd200'], 54, 10, 'Palazzo dello Sport', 11200, []);
  I('scafati', 'Longobardi Scafati', 'SCA', 'Scafati', ['#ffd200', '#00539f'], 46, 6, 'PalaMangano', 3700, []);
  I('verona', 'Tezenis Verona', 'VER', 'Verona', ['#003f87', '#ffd200'], 48, 7, 'AGSM AIM Forum', 5350, []);
  const ids = (arr) => arr.map(e => e.id);
  const acbPropios = ids(GM._pack.equipos).filter(id => ['unicaja','joventut-badalona','leyma-coruna','tenerife','ucam-murcia','bilbao-basket','girona','zaragoza','manresa','andorra','hiopos-lleida','breogan','burgos','obradoiro'].indexOf(id) >= 0);
  const lega = ids(GM._pack.equipos).filter(id => acbPropios.indexOf(id) < 0);
  GM.commitDatos([
    { id: 'ACB', nombre: 'Liga Endesa (ACB)', pais: 'ES', formato: 'acb', equipos: ['real-madrid', 'fc-barcelona', 'baskonia', 'valencia-basket'].concat(acbPropios) },
    { id: 'LEGA', nombre: 'Lega Basket Serie A', pais: 'IT', formato: 'liga_simple', equipos: ['olimpia-milano', 'virtus-bologna'].concat(lega) }
  ]);
})();
