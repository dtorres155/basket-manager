/* LIGAS GRIEGA (GBL), ALEMANA (BBL) Y TURCA (BSL) 2026-27.
   Los clubes de la Euroliga (Olympiacos, Panathinaikos, Bayern, Fenerbahçe, Efes y Beşiktaş) juegan también su liga nacional.
   Los clubes propios de cada liga son los de 2026-27; las plantillas reales se aplican en datos_ligas3.js (en la BSL solo Tofaş, Türk Telekom y Bahçeşehir;
   el resto sigue siendo relleno). Pabellones y presupuestos, aproximados. */
(function () {
  // baseOvr: la misma media objetivo que tools/generar_plantillas.js para los clubes que siguen con relleno
  const C = (pais, id, n, s, c, col, rep, pres, pab, af) => GM.club([id, n, s, c, pais, col, rep, pres, pab, af], [], { plantilla: 12, salMin: 0.06, salStep: 0.012, baseOvr: Math.round(51 + rep * 0.25), paisRelleno: pais });
  const gr = [
    ['aek-atenas', 'AEK Atenas', 'AEK', 'Atenas', ['#ffd200', '#000000'], 68, 20, 'Pabellón de Ano Liosia', 5000],
    ['paok', 'PAOK Salónica', 'PAK', 'Tesalónica', ['#000000', '#ffffff'], 66, 17, 'PAOK Sports Arena', 8000],
    ['aris', 'Aris Salónica', 'ARI', 'Tesalónica', ['#ffd200', '#000000'], 62, 12, 'Alexandreio Melathron', 5000],
    ['peristeri', 'Peristeri', 'PER', 'Atenas', ['#c8102e', '#ffffff'], 58, 9, 'Peristeri Arena', 4000],
    ['promitheas', 'Promitheas Patras', 'PRO', 'Patras', ['#000000', '#ffffff'], 56, 8, 'Dimitris Tofalos Arena', 5000],
    ['kolossos', 'Kolossos Rodou', 'KOL', 'Rodas', ['#00539f', '#ffffff'], 48, 5, 'Kallipateira Arena', 2500],
    ['maroussi', 'Maroussi', 'MAR', 'Atenas', ['#00539f', '#ffffff'], 46, 4, 'Pabellón de Maroussi', 3000],
    ['karditsa', 'Karditsa', 'KRD', 'Karditsa', ['#c8102e', '#ffffff'], 42, 3, 'Pabellón de Karditsa', 2800],
    ['vikos', 'Vikos Falcons', 'VIK', 'Ioánina', ['#e2001a', '#000000'], 42, 3, 'Pabellón Olímpico de Ioánina', 2500],
    ['doxa-lefkadas', 'Doxa Lefkadas', 'DOX', 'Léucade', ['#00539f', '#ffffff'], 42, 3, 'Pabellón de Léucade', 1500],
    ['iraklis', 'Iraklis Salónica', 'IRA', 'Tesalónica', ['#00539f', '#ffffff'], 46, 4, 'Ivanofeio', 2500],
    ['mykonos', 'Mykonos', 'MYK', 'Míkonos', ['#00a3e0', '#ffffff'], 42, 3.5, 'Pabellón de Míkonos', 1200]
  ];
  const de = [
    ['alba-berlin', 'ALBA Berlín', 'ALB', 'Berlín', ['#ffd200', '#000000'], 78, 22, 'Uber Arena', 14500],
    ['ulm', 'ratiopharm Ulm', 'ULM', 'Ulm', ['#f58220', '#000000'], 64, 12, 'ratiopharm arena', 6200],
    ['ludwigsburg', 'MHP Riesen Ludwigsburg', 'LUD', 'Ludwigsburg', ['#00539f', '#ffffff'], 60, 10, 'MHP Arena', 5000],
    ['bamberg', 'Bamberg Baskets', 'BAM', 'Bamberg', ['#c8102e', '#ffffff'], 60, 10, 'Brose Arena', 6800],
    ['bonn', 'Telekom Baskets Bonn', 'BON', 'Bonn', ['#e2001a', '#ffffff'], 58, 9, 'Telekom Dome', 6000],
    ['frankfurt', 'Skyliners Fráncfort', 'FRA', 'Fráncfort', ['#003f87', '#ffffff'], 54, 6, 'Süwag Energie Arena', 5000],
    ['hamburg', 'Veolia Towers Hamburgo', 'HAM', 'Hamburgo', ['#e2001a', '#ffffff'], 52, 7, 'Inselpark Arena', 3400],
    ['oldenburg', 'EWE Baskets Oldemburgo', 'OLD', 'Oldemburgo', ['#003f87', '#ffffff'], 52, 6, 'EWE Arena', 6000],
    ['wuerzburg', 'Würzburg Baskets', 'WUR', 'Wurzburgo', ['#f58220', '#000000'], 50, 6, 'tectake Arena', 3000],
    ['chemnitz', 'Niners Chemnitz', 'CHE', 'Chemnitz', ['#00539f', '#ffffff'], 50, 5, 'Chemnitz Arena', 5000],
    ['weissenfels', 'Syntainics MBC', 'MBC', 'Weißenfels', ['#ffd200', '#00539f'], 48, 5, 'Stadthalle Weißenfels', 3000],
    ['vechta', 'Rasta Vechta', 'VEC', 'Vechta', ['#00539f', '#ffffff'], 48, 5, 'Rasta Dome', 3000],
    ['jena', 'Science City Jena', 'JEN', 'Jena', ['#003f87', '#ffffff'], 46, 4.5, 'Sparkassen-Arena Jena', 3000],
    ['rostock', 'Rostock Seawolves', 'ROS', 'Rostock', ['#00539f', '#ffffff'], 50, 5.5, 'Stadthalle Rostock', 4500],
    ['hagen', 'Phoenix Hagen', 'HAG', 'Hagen', ['#f58220', '#000000'], 44, 3.5, 'Krollmann Arena', 3145],
    ['trier', 'Gladiators Trier', 'GTR', 'Tréveris', ['#c8102e', '#ffffff'], 44, 3.5, 'SWT-Arena', 5000],
    ['braunschweig', 'Basketball Löwen Braunschweig', 'BRA', 'Brunswick', ['#00539f', '#ffd200'], 46, 4.5, 'Volkswagen Halle', 6600]
  ];
  const tr = [
    ['galatasaray', 'Galatasaray', 'GAL', 'Estambul', ['#c8102e', '#ffd200'], 66, 15, 'Pabellón del Galatasaray', 4500],
    ['tofas', 'Tofaş', 'TOF', 'Bursa', ['#c8102e', '#ffffff'], 60, 10, 'Pabellón de Bursa', 5000],
    ['turk-telekom', 'Türk Telekom', 'TTE', 'Ankara', ['#00539f', '#ffffff'], 58, 9, 'Pabellón de Ankara', 5500],
    ['bahcesehir', 'Bahçeşehir Koleji', 'BAH', 'Estambul', ['#003f87', '#ffffff'], 56, 9, 'Pabellón de Bahçeşehir', 3000],
    ['karsiyaka', 'Pınar Karşıyaka', 'PKA', 'Esmirna', ['#c8102e', '#00a859'], 56, 8, 'Karşıyaka Arena', 4500],
    ['merkezefendi', 'Merkezefendi Denizli', 'DEN', 'Denizli', ['#00539f', '#ffd200'], 48, 5, 'Pabellón de Denizli', 3500],
    ['aliaga', 'Aliağa Petkimspor', 'ALI', 'Aliağa', ['#c8102e', '#ffffff'], 44, 4, 'Pabellón de Aliağa', 2500],
    ['bursaspor', 'Bursaspor', 'BRS', 'Bursa', ['#00a859', '#ffffff'], 46, 4, 'Pabellón de Bursa Norte', 3000],
    ['korfez', 'Kocaeli Körfez', 'KRF', 'Körfez', ['#00539f', '#ffd200'], 44, 3.5, 'Pabellón de Körfez', 2500],
    ['cayirova', 'Çayırova Belediyespor', 'CAY', 'Çayırova', ['#008751', '#0054a6'], 44, 3.5, 'Çayırova Akse Kapalı Spor Salonu', 3500],
    ['bandirma', 'Bandırma Bordo', 'BAN', 'Bandırma', ['#7a1f3d', '#ffffff'], 46, 4, 'Kara Ali Acar Spor Salonu', 3000],
    ['erokspor', 'Esenler Erokspor', 'ERO', 'Estambul', ['#00539f', '#ffffff'], 46, 4.5, 'Pabellón de Esenler', 3000],
    ['trabzonspor', 'Trabzonspor', 'TRA', 'Trebisonda', ['#7a1f3d', '#00a3e0'], 50, 5, 'Hayri Gür Arena', 7500]
  ];
  gr.forEach(r => C('GR', ...r)); de.forEach(r => C('DE', ...r)); tr.forEach(r => C('TR', ...r));
  const ids = a => a.map(r => r[0]);
  GM.commitDatos([
    { id: 'GBL', nombre: 'Liga griega (GBL)', pais: 'GR', formato: 'liga_simple', equipos: ['olympiacos', 'panathinaikos'].concat(ids(gr)) },
    { id: 'BBL', nombre: 'Bundesliga alemana (BBL)', pais: 'DE', formato: 'liga_simple', equipos: ['bayern-munich'].concat(ids(de)) },
    { id: 'BSL', nombre: 'Liga turca (BSL)', pais: 'TR', formato: 'liga_simple', equipos: ['fenerbahce', 'anadolu-efes', 'besiktas'].concat(ids(tr)) }
  ]);
})();
