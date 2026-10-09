// Valoraciones a partir de las estadísticas reales de 2025-26 (NBA, Euroliga y EuroCup) -> datos_valoraciones.js
// Fuentes abiertas: Basketball-Reference (NBA, medias por partido) y la API pública de la Euroliga (Euroliga y EuroCup, con la
// valoración PIR). Se descargan una vez en recursos/stats_2026/ (2 s entre peticiones). Para cada competición se ordenan los jugadores
// del juego que tienen estadísticas por su producción (Game Score en la NBA, PIR en Europa) y se les reparte, en ese orden, la misma
// lista de valoraciones que ya tenían: la media y la dispersión de la liga no cambian, solo quién está arriba. Después se mezcla con la
// valoración anterior según la muestra (partidos y minutos) y se limita el cambio a ±8.
// Uso: node tools/valoraciones_stats.js [--descargar]
const fs = require('fs'), path = require('path'), https = require('https');
const RAIZ = path.join(__dirname, '..'), DIR = path.join(RAIZ, 'recursos', 'stats_2026'); fs.mkdirSync(DIR, { recursive: true });
const UA = 'BasketManager-datos/1.0 (proyecto personal, sin fines comerciales)';
const FUENTES = [
  ['nba.html', 'https://www.basketball-reference.com/leagues/NBA_2026_per_game.html'],
  ['euroliga.json', 'https://api-live.euroleague.net/v3/competitions/E/statistics/players/traditional?seasonMode=Single&seasonCode=E2025&statisticMode=PerGame&limit=600'],
  ['eurocup.json', 'https://api-live.euroleague.net/v3/competitions/U/statistics/players/traditional?seasonMode=Single&seasonCode=U2025&statisticMode=PerGame&limit=600']
];
const bajar = url => new Promise((ok, mal) => https.get(url, { headers: { 'User-Agent': UA } }, r => { if (r.statusCode !== 200) { mal(new Error(url + ' -> ' + r.statusCode)); r.resume(); return; } let d = ''; r.setEncoding('utf8'); r.on('data', c => d += c); r.on('end', () => ok(d)); }).on('error', mal));
const espera = ms => new Promise(r => setTimeout(r, ms));
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/ı/g, 'i').replace(/ł/g, 'l').replace(/đ/g, 'd').toLowerCase().replace(/[^a-z]/g, '');

(async () => {
  for (const [f, url] of FUENTES) { const p = path.join(DIR, f); if (fs.existsSync(p) && !process.argv.includes('--descargar')) continue; console.log('descargando', url); fs.writeFileSync(p, await bajar(url)); await espera(2000); }
  // --- Estadísticas ---
  const stats = [];
  { const html = fs.readFileSync(path.join(DIR, 'nba.html'), 'utf8'), vistos = new Set();
    html.split('<tr').forEach(fila => {
      const v = k => { const m = fila.match(new RegExp('data-stat="' + k + '"([^>]*)>(.*?)</t[dh]>')); if (!m) return ''; const c = m[1].match(/csk="([^"]*)"/); return c && k !== 'name_display' ? c[1] : m[2].replace(/<[^>]*>/g, ''); };   // el valor exacto va en csk (los líderes salen en negrita)
      const nombre = v('name_display'); if (!nombre || nombre === 'Player' || vistos.has(nombre)) return; vistos.add(nombre);   // la primera fila de un traspasado es su total
      const n = k => parseFloat(v(k)) || 0, gp = n('games'), min = n('mp_per_g');
      const gs = n('pts_per_g') + 0.4 * n('fg_per_g') - 0.7 * n('fga_per_g') - 0.4 * (n('fta_per_g') - n('ft_per_g')) + 0.7 * n('orb_per_g') + 0.3 * n('drb_per_g') + n('stl_per_g') + 0.7 * n('ast_per_g') + 0.7 * n('blk_per_g') - 0.4 * n('pf_per_g') - n('tov_per_g');
      stats.push({ liga: 'NBA', nombre: nombre.replace(/&#39;/g, "'").replace(/&amp;/g, '&'), gp, min, score: gs });
    }); }
  for (const [f, liga] of [['euroliga.json', 'EUROLIGA'], ['eurocup.json', 'EUROCUP']]) {
    const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    j.players.forEach(p => { const [ap, no] = p.player.name.split(','); const nombre = ((no || '').trim() + ' ' + (ap || '').trim()).trim().toLowerCase().replace(/(^|[\s-])\S/g, c => c.toUpperCase());
      stats.push({ liga, nombre, gp: p.gamesPlayed, min: p.minutesPlayed, score: p.pir }); });
  }
  console.log('estadísticas:', stats.filter(s => s.liga === 'NBA').length, 'NBA,', stats.filter(s => s.liga === 'EUROLIGA').length, 'Euroliga,', stats.filter(s => s.liga === 'EUROCUP').length, 'EuroCup');
  // --- Jugadores del juego (sin correcciones previas) ---
  global.window = global; global.LZString = require(path.join(RAIZ, 'node_modules', 'lz-string'));
  const lista = fs.readFileSync(path.join(RAIZ, 't_aserciones.js'), 'utf8').split('\n').find(l => /^L\(\[/.test(l)).match(/'[^']+'/g).map(s => s.slice(1, -1)).filter(m => m !== 'datos_valoraciones');
  require(path.join(RAIZ, 'load'))(lista); GM.VALORACIONES = {};
  GM.rng.seed(1); const st = GM.newGame('joventut-badalona', 1, { modo: 'gestor' });
  const porNombre = {}; Object.values(st.jugadores).forEach(p => { if (p.ficticio || !p.nombre) return; (porNombre[norm(p.nombre)] = porNombre[norm(p.nombre)] || []).push(p); });
  // --- Reparto por competición ---
  const salida = {}, cambios = [];
  for (const liga of ['NBA', 'EUROLIGA', 'EUROCUP']) {
    const grupo = stats.filter(s => s.liga === liga && s.gp >= 5 && s.min >= 5).map(s => ({ s, p: (porNombre[norm(s.nombre)] || [])[0] })).filter(x => x.p && !salida[norm(x.p.nombre)]);
    const ovrs = grupo.map(x => x.p.ovr).sort((a, b) => b - a);
    grupo.sort((a, b) => b.s.score - a.s.score).forEach((x, i) => {
      const w = 0.65 * Math.min(1, x.s.gp / 25) * Math.min(1, x.s.min / 18), nuevo = Math.round(x.p.ovr + Math.max(-8, Math.min(8, (ovrs[i] - x.p.ovr) * w)));
      if (nuevo !== x.p.ovr) { salida[norm(x.p.nombre)] = nuevo; cambios.push([liga, x.p.nombre, x.p.ovr, nuevo, x.s.score.toFixed(1)]); }
    });
    console.log(liga + ':', grupo.length, 'jugadores del juego con estadísticas,', cambios.filter(c => c[0] === liga).length, 'cambian');
  }
  cambios.sort((a, b) => Math.abs(b[3] - b[2]) - Math.abs(a[3] - a[2])).slice(0, 12).forEach(c => console.log('  ', c[0], c[1], c[2], '->', c[3], '(producción ' + c[4] + ')'));
  const js = `/* VALORACIONES DESDE LAS ESTADÍSTICAS DE 2025-26 (generado por tools/valoraciones_stats.js; no editar a mano)
   NBA (Basketball-Reference, Game Score por partido), Euroliga y EuroCup (API de la Euroliga, PIR por partido). Cada jugador con
   muestra suficiente se reordena dentro de su competición por su producción real, conservando la media y la dispersión de la liga,
   y se mezcla con la valoración estimada según partidos y minutos (cambio máximo ±8). ${Object.keys(salida).length} jugadores.
   Se aplica al crear cada jugador (GM.mkJugador): cambia su nivel y mueve su potencial lo mismo (nunca por debajo del nivel). */
(function () {
  GM.VALORACIONES = ${JSON.stringify(salida)};
  const norm = s => s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/ß/g, 'ss').replace(/ı/g, 'i').replace(/ł/g, 'l').replace(/đ/g, 'd').toLowerCase().replace(/[^a-z]/g, '');
  const base = GM.mkJugador;
  GM.mkJugador = function (club, n, nombre, pos, edad, altura, nac, pasp, ovr, pot) {
    const v = nombre && GM.VALORACIONES[norm(nombre)];
    if (v) { const a = arguments; a[9] = Math.max(v, pot + (v - ovr)); a[8] = v; return base.apply(this, a); }
    return base.apply(this, arguments);
  };
})();
`;
  fs.writeFileSync(path.join(RAIZ, 'datos_valoraciones.js'), js);
  console.log('datos_valoraciones.js:', Object.keys(salida).length, 'jugadores,', Math.round(js.length / 1024), 'KB');
})().catch(e => { console.error(e); process.exit(1); });
