// Convierte las plantillas reales descargadas (recursos/*_2026.json, ver plantillas_*.js) en datos_ligas3.js.
// Uso: node tools/generar_plantillas.js
// Nombre, posición, nacionalidad, edad y altura son reales; valoración, potencial, perfil, salario y contrato son ESTIMACIONES:
// cada club tiene una media objetivo de sus 8 mejores según reputación y liga; los extranjeros suben, los muy jóvenes bajan.
// Si el jugador ya estaba en los datos con valoración hecha a mano (mismo club), se respeta la suya.
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..');
const GM = require(path.join(RAIZ, 'load'))(['core', 'datos_util', 'datos_nba_este', 'datos_nba_oeste', 'datos_nba_fin', 'datos_euroliga', 'datos_ligas', 'datos_ligas2', 'datos_movimientos']);
const D = GM.data, lee = f => JSON.parse(fs.readFileSync(path.join(RAIZ, 'recursos', f + '_2026.json'), 'utf8'));

// [archivo, nombre en la fuente, id del club, liga]
const MAPA = [
  ['acb', 'Leyma Coruña', 'leyma-coruna', 'ACB'], ['acb', 'FIATC Girona', 'girona', 'ACB'], ['acb', 'iLERNA Lleida', 'hiopos-lleida', 'ACB'],
  ['acb', 'Recoletas Salud San Pablo Burgos', 'burgos', 'ACB'], ['acb', 'UCAM Murcia', 'ucam-murcia', 'ACB'], ['acb', 'Surne Bilbao', 'bilbao-basket', 'ACB'],
  ['acb', 'Casademont Zaragoza', 'zaragoza', 'ACB'], ['acb', 'MoraBanc Andorra', 'andorra', 'ACB'], ['acb', 'Río Breogán', 'breogan', 'ACB'],
  ['acb', 'Monbus Obradoiro', 'obradoiro', 'ACB'], ['acb', 'Kids&amp;Us Manresa', 'manresa', 'ACB'], ['acb', 'La Laguna Tenerife', 'tenerife', 'ACB'],
  ['euroliga', 'Anadolu Efes', 'anadolu-efes', 'EUROLIGA'], ['euroliga', 'ASVEL Lyon-Villeurbanne', 'asvel', 'EUROLIGA'],
  ['bbl', 'Telekom Baskets Bonn', 'bonn', 'BBL'], ['bbl', 'Science City Jena', 'jena', 'BBL'], ['bbl', 'NINERS Chemnitz', 'chemnitz', 'BBL'],
  ['bbl', 'ROSTOCK SEAWOLVES', 'rostock', 'BBL'], ['bbl', 'Fitness First Würzburg Baskets', 'wuerzburg', 'BBL'], ['bbl', 'Bamberg Baskets', 'bamberg', 'BBL'],
  ['bbl', 'SYNTAINICS MBC', 'weissenfels', 'BBL'], ['bbl', 'EWE Baskets Oldenburg', 'oldenburg', 'BBL'], ['bbl', 'Phoenix Hagen', 'hagen', 'BBL'],
  ['bbl', 'VET-CONCEPT Gladiators Trier', 'trier', 'BBL'], ['bbl', 'ALBA BERLIN', 'alba-berlin', 'BBL'], ['bbl', 'SC RASTA Vechta', 'vechta', 'BBL'],
  ['bbl', 'Ratiopharm Ulm', 'ulm', 'BBL'], ['bbl', 'Basketball Löwen Braunschweig', 'braunschweig', 'BBL'], ['bbl', 'MHP RIESEN Ludwigsburg', 'ludwigsburg', 'BBL'],
  ['bbl', 'SKYLINERS', 'frankfurt', 'BBL'], ['bbl', 'Hamburg Towers', 'hamburg', 'BBL'],
  ['lega', 'Acqua S.Bernardo Cantù', 'cantu', 'LEGA'], ['lega', 'APU Old Wild West Udine', 'udine', 'LEGA'], ['lega', 'BC Roma', 'bc-roma', 'LEGA'],
  ['lega', 'Bertram Derthona Tortona', 'tortona', 'LEGA'], ['lega', 'Dolomiti Energia Trentino', 'trento', 'LEGA'], ['lega', 'Longobardi Scafati Basket', 'scafati', 'LEGA'],
  ['lega', 'Maxima Roma', 'maxima-roma', 'LEGA'], ['lega', 'Napoli Basketball', 'napoli-basket', 'LEGA'], ['lega', 'Nutribullet Treviso Basket', 'treviso', 'LEGA'],
  ['lega', 'Openjobmetis Varese', 'varese', 'LEGA'], ['lega', 'Pallacanestro Trieste', 'trieste', 'LEGA'], ['lega', 'Tezenis Verona', 'verona', 'LEGA'],
  ['lega', 'Umana Reyer Venezia', 'reyer-venezia', 'LEGA'], ['lega', 'UNA Hotels Reggio Emilia', 'reggio-emilia', 'LEGA'],
  ['gbl', 'VIKOS FALCONS', 'vikos', 'GBL'], ['gbl', 'ΑΕΚ', 'aek-atenas', 'GBL'], ['gbl', 'ΑΡΗΣ', 'aris', 'GBL'], ['gbl', 'ΔΟΞΑ ΛΕΥΚΑΔΑΣ', 'doxa-lefkadas', 'GBL'],
  ['gbl', 'ΗΡΑΚΛΗΣ', 'iraklis', 'GBL'], ['gbl', 'ΚΑΡΔΙΤΣΑ ΙΑΠΩΝΙΚΗ', 'karditsa', 'GBL'], ['gbl', 'ΚΟΛΟΣΣΟΣ H HOTELS COLLECTION', 'kolossos', 'GBL'],
  ['gbl', 'ΜΑΡΟΥΣΙ', 'maroussi', 'GBL'], ['gbl', 'ΜΥΚΟΝΟΣ Betsson BC', 'mykonos', 'GBL'], ['gbl', 'ΠΑΟΚ', 'paok', 'GBL'],
  ['gbl', 'ΠΕΡΙΣΤΕΡΙ Betsson', 'peristeri', 'GBL'], ['gbl', 'ΠΡΟΜΗΘΕΑΣ ΠΑΤΡΑΣ ΒΙΚΟΣ COLA', 'promitheas', 'GBL'],
  ['eurocup', 'Tofas SK', 'tofas', 'BSL'], ['eurocup', 'Türk Telekom Ankara', 'turk-telekom', 'BSL'], ['eurocup', 'Bahçeşehir Koleji', 'bahcesehir', 'BSL']
];
// Media objetivo de los 8 mejores: base + reputación × 0,25 (Euroliga: 60 + rep × 0,15)
const AJUSTE = { ACB: 1.5, LEGA: 0, BBL: -0.5, GBL: -1, BSL: 0 };
const objetivo = (e, liga) => liga === 'EUROLIGA' ? 60 + e.reputacion * 0.15 : 51 + e.reputacion * 0.25 + AJUSTE[liga];
const NOMINA = { EUROLIGA: 0.3, ACB: 0.45, LEGA: 0.45, BBL: 0.45, GBL: 0.45, BSL: 0.45 }; // parte del presupuesto que va a sueldos

const PAIS = {
  US: 'EE.UU.|USA|ΗΠΑ', ES: 'España|Spanien|ΙΣΠΑΝΙΑ', IT: 'Italia|Italien|ITA', RS: 'Serbia|Serbien|ΣΕΡΒΙΑ|SRB', PT: 'Portugal', LT: 'Lituania|Litauen|ΛΙΘΟΥΑΝΙΑ|LTU',
  LV: 'Letonia|Lettland|LVA', UA: 'Ucrania|Ukraine', NL: 'Países Bajos|Niederlande', AR: 'Argentina|Argentinien|ARG', SI: 'Eslovenia|Slowenien|SVN',
  FR: 'Francia|Frankreich|ΓΑΛΛΙΑ|FRA', PL: 'Polonia|Polen|POL', DO: 'República Dominicana|Dom. Republik|ΔΟΜΙΝΙΚΑΝΗ ΔΗΜΟΚΡΑΤΙΑ', BA: 'Bosnia y Herzegovina|Bosnien-Herzegowina',
  AM: 'Armenia|Armenien', NG: 'Nigeria|ΝΙΓΗΡΙΑ|NGA', JM: 'Jamaica', BE: 'Bélgica|Belgien', DE: 'Alemania|Deutschland|ΓΕΡΜΑΝΙΑ|DEU', UY: 'Uruguay', GN: 'Guinea',
  EE: 'Estonia|Estland', ME: 'Montenegro|MNE', SE: 'Suecia|Schweden|SWE', RO: 'Rumanía|Rumänien', HR: 'Croacia|Kroatien|HRV', NO: 'Noruega', CA: 'Canadá|Kanada|ΚΑΝΑΔΑΣ|CAN',
  HU: 'Hungría', IS: 'Islandia|Island', GB: 'Reino Unido|Großbritannien|England', BB: 'Barbados', SK: 'Eslovaquia', GE: 'Georgia|Georgien', ZA: 'Sudáfrica|Südafrika',
  BG: 'Bulgaria|Bulgarien|ΒΟΥΛΓΑΡΙΑ', MK: 'Macedonia del Norte|Nordmazedonien|Β. ΜΑΚΕΔΟΝΙΑ', DK: 'Dänemark', CZ: 'Tschechien', IL: 'Israel', AT: 'Österreich|AUT',
  AF: 'Afghanistan', CH: 'Schweiz', IR: 'Iran', SS: 'Südsudan', CL: 'Chile', CM: 'Kamerun', CU: 'Kuba|CUB', TR: 'Türkei|ΤΟΥΡΚΙΑ', XK: 'Kosovo', SN: 'Senegal|ΣΕΝΕΓΑΛΗ|SEN',
  PA: 'Panama', AU: 'Australien|ΑΥΣΤΡΑΛΙΑ|AUS', PR: 'Puerto Rico', GR: 'Griechenland|ΕΛΛΑΔΑ|ΕΛΛΗΝΙΚΗ', GM: 'Gambia', KH: 'Kambodscha', BR: 'Brasilien', MX: 'Mexiko',
  CD: 'Kongo|COD', ML: 'Mali|MLI', AO: 'Angola|ΑΝΓΚΟΛΑ', GA: 'Gabun', FI: 'Finnland', CV: 'Kap Verde', BS: 'Bahamas', BY: 'ΛΕΥΚΟΡΩΣΙΑ', CY: 'ΚΥΠΡΟΣ', CO: 'COL'
};
const ISO = {}; for (const k in PAIS) PAIS[k].split('|').forEach(n => { ISO[n] = k; });
const POS = { Base: 'PG', Escolta: 'SG', Alero: 'SF', 'Ala-pívot': 'PF', 'Pívot': 'C', 'Play/Guardia': 'PG', 'Guardia/Ala': 'SG', PG: 'PG', SG: 'SG', SF: 'SF', PF: 'PF', C: 'C' };
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const limpiaNombre = s => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/\bMc ([A-Z])/g, 'Mc$1').replace(/\s+/g, ' ').trim()
  .replace(/^([A-ZÀ-Ý])([A-ZÀ-Ý]+)\b/, (m, a, b) => a + b.toLowerCase()); // «ΤYson» de esake
const edadDe = n => { const m = /^(\d\d)\.(\d\d)\.(\d{4})$/.exec(n || ''); if (!m) return null; let e = 2026 - +m[3]; if (+m[2] > 10 || (+m[2] === 10 && +m[1] > 1)) e--; return e; };
const H = s => GM.util.hash(s);

// Índice de todos los jugadores actuales por nombre normalizado (para respetar valoraciones hechas a mano y detectar traspasos)
const porNombre = {};
for (const id in D.jugadores) { const j = D.jugadores[id]; if (!j.ficticio) (porNombre[norm(j.nombre)] = porNombre[norm(j.nombre)] || []).push(j); }
const destino = new Set(MAPA.map(m => m[2]));

const sinPais = new Set(), salida = [], traspasos = [];
for (const [arch, fuente, id, liga] of MAPA) {
  const datos = lee(arch)[fuente]; if (!datos) { console.log('FALTA en la fuente:', arch, fuente); continue; }
  const e = D.equipos[id], pres = e ? e.presupuesto / 1e6 : null;
  // Guard/Forward (Sportschau) se reparten entre PG/SG y SF/PF
  let g = 0, f = 0;
  let js = datos.jugadores.map(x => {
    const nombre = limpiaNombre(x.nombre), h = H(nombre), edad = edadDe(x.nacimiento) || 24;
    let pos = POS[x.pos];
    if (!pos) pos = x.pos === 'Guard' ? (g++ % 2 ? 'SG' : 'PG') : x.pos === 'Forward' ? (f++ % 2 ? 'PF' : 'SF') : x.pos === 'Center' ? 'C' : ['SG', 'SF', 'PF'][h % 3];
    const nac = ISO[x.pais] || (x.pais ? (sinPais.add(x.pais), null) : null) || (e ? e.pais : 'GEN');
    const alt = +x.altura >= 160 && +x.altura <= 235 ? +x.altura : null;
    const previo = (porNombre[norm(nombre)] || []).find(j => j.equipoId === id);
    // Traspaso: mismo nombre y edad parecida en otro club que no se reescribe
    (porNombre[norm(nombre)] || []).filter(j => j.equipoId !== id && !destino.has(j.equipoId) && Math.abs(j.edad - edad) <= 1).forEach(j => traspasos.push([j.id, j.nombre, j.equipoId, id]));
    return { nombre, pos, edad, alt, nac, h, previo, hasta: +x.hasta || null };
  });
  // Sin repetidos y como mucho 15: fuera primero los más jóvenes
  js = js.filter((j, i) => js.findIndex(k => norm(k.nombre) === norm(j.nombre)) === i);
  const local = e ? e.pais : 'GR';
  const crudo = j => {
    if (j.previo) return j.previo.ovr;
    const imp = j.nac !== local ? (j.nac === 'US' ? 3.5 : 2) : 0;
    const ed = j.edad <= 18 ? -13 : j.edad === 19 ? -11 : j.edad === 20 ? -8 : j.edad === 21 ? -6 : j.edad === 22 ? -4 : j.edad === 23 ? -2 : j.edad <= 31 ? 0 : j.edad <= 33 ? -1 : -3;
    return (imp + ed + ((j.h >>> 4) % 9) - 4) * 1.3;
  };
  js.forEach(j => { j.c = crudo(j); });
  js.sort((a, b) => b.c - a.c); if (js.length > 15) js = js.slice(0, 15);
  if (!e) { console.log('CLUB SIN DEFINIR:', id); continue; }
  // Desplaza las estimaciones para que la media de los 8 mejores sea la del objetivo (las valoraciones previas no se tocan)
  const nuevos = js.filter(j => !j.previo), top = js.slice(0, 8);
  const T = objetivo(e, liga), med = top.reduce((s, j) => s + j.c, 0) / top.length;
  const nPrev = top.filter(j => j.previo).length;
  const delta = nPrev === top.length ? 0 : (T * top.length - top.reduce((s, j) => s + (j.previo ? j.c : 0), 0)) / (top.length - nPrev) - (top.filter(j => !j.previo).reduce((s, j) => s + j.c, 0) / (top.length - nPrev));
  nuevos.forEach(j => {
    j.ovr = Math.max(48, Math.min(84, Math.round(j.c + delta)));
    const crece = j.edad <= 18 ? 14 : j.edad === 19 ? 12 : j.edad === 20 ? 10 : j.edad === 21 ? 8 : j.edad === 22 ? 6 : j.edad === 23 ? 4 : j.edad === 24 ? 2 : j.edad === 25 ? 1 : 0;
    j.pot = Math.min(92, j.ovr + crece + (crece ? (j.h >>> 9) % 4 : 0));
    j.perfil = { PG: 'PEPT', SG: 'TTED', SF: 'EDTE', PF: 'RERD', C: 'RRDE' }[j.pos][(j.h >>> 11) % 4];
  });
  js.filter(j => j.previo).forEach(j => { j.ovr = j.previo.ovr; j.pot = j.previo.pot; j.perfil = null; });
  // Salarios: reparto de la nómina objetivo según valoración (los previos conservan el suyo)
  const peso = j => 0.05 + 0.006 * Math.pow(Math.max(0, j.ovr - 56), 1.9);
  const fijo = js.filter(j => j.previo).reduce((s, j) => s + j.previo.contrato.salario / 1e6, 0);
  const libre = Math.max(pres * NOMINA[liga] - fijo, pres * 0.15), tot = nuevos.reduce((s, j) => s + peso(j), 0);
  nuevos.forEach(j => { j.sal = Math.max(0.04, +(peso(j) / tot * libre).toFixed(2)); j.fin = j.hasta || 2027 + (j.h >>> 13) % 3; });
  salida.push({ id, liga, js });
  console.log(liga.padEnd(8), id.padEnd(16), String(js.length).padStart(2), 'jug, previos', js.filter(j => j.previo).length, ', 8 mejores', (js.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 8).reduce((s, j) => s + j.ovr, 0) / 8).toFixed(1), 'objetivo', T.toFixed(1), ', máx', Math.max(...js.map(j => j.ovr)));
}
if (sinPais.size) console.log('Países sin código:', [...sinPais].join(', '));
traspasos.forEach(t => console.log('Traspaso:', t[1], t[2], '->', t[3]));

// ---- datos_ligas3.js ----
const q = JSON.stringify;
let txt = `/* DATOS: plantillas reales 2026-27 (generado por tools/generar_plantillas.js; no lo edites a mano si vas a regenerarlo).
   Se aplican sobre los clubes de datos_ligas.js, datos_ligas2.js y datos_euroliga.js: sustituyen su plantilla (los de relleno solo completan hasta 12).
   Fuentes (ver docs/FUENTES_DATOS.md): acb.com, legabasket.it, esake.gr y sportschau.de (BBL, Euroliga y EuroCup), consultadas en octubre de 2026.
   Reales: nombre, posición (en BBL, Euroliga y EuroCup solo base/alero/pívot; el reparto entre PG/SG y SF/PF es aproximado), nacionalidad, edad y altura.
   ESTIMADOS: valoración, potencial, perfil, salario y fin de contrato (salvo en la Lega, donde el contrato es el publicado).
   Fila: [nombre, pos, edad, altura|0, nac, ovr, pot, perfil, salario M€, fin contrato]; perfil 0 = el jugador ya existía y conserva sus datos. */
(function () {
  const D = GM.data;
  const traspasos = ${q(traspasos.map(t => t[0]))};
  traspasos.forEach(id => { const j = D.jugadores[id]; if (!j) return; const e = D.equipos[j.equipoId]; if (e) e.plantilla = e.plantilla.filter(x => x !== id); delete D.jugadores[id]; });
  const R = (club, filas) => {
    const e = D.equipos[club]; if (!e) return;
    const antes = e.plantilla.map(i => D.jugadores[i]), relleno = antes.filter(j => j.ficticio).sort((a, b) => b.ovr - a.ovr);
    const nuevos = filas.map((f, i) => {
      const previo = !f[7] && antes.find(j => !j.ficticio && j.nombre === f[0]);
      if (previo) return previo;
      const h = GM.util.hash(f[0]);
      const p = GM.mkJugador(club, 60 + i, f[0], f[1], f[2], f[3] || GM.alturaPos(f[1], h), f[4], GM.pasaporte(f[4]), f[5], f[6], f[7] || 'E', Math.round(f[8] * 1e6), f[9]);
      p.id = club + '-r' + i; return p;
    });
    antes.forEach(j => { if (nuevos.indexOf(j) < 0) delete D.jugadores[j.id]; });
    const extra = relleno.slice(0, Math.max(0, 12 - nuevos.length));
    extra.forEach(j => { D.jugadores[j.id] = j; });
    nuevos.forEach(j => { D.jugadores[j.id] = j; });
    e.plantilla = nuevos.concat(extra).map(j => j.id);
  };
`;
salida.forEach(c => {
  txt += `  // ${c.liga}\n  R(${q(c.id)}, [\n` + c.js.map(j => '    ' + q(j.previo ? [j.previo.nombre, j.previo.pos, j.edad, 0, j.previo.nac, j.ovr, j.pot, 0, 0, 0] : [j.nombre, j.pos, j.edad, j.alt || 0, j.nac, j.ovr, j.pot, j.perfil, j.sal, j.fin])).join(',\n') + '\n  ]);\n';
});
txt += '})();\n';
fs.writeFileSync(path.join(RAIZ, 'datos_ligas3.js'), txt);
console.log('datos_ligas3.js:', salida.length, 'clubes,', salida.reduce((s, c) => s + c.js.length, 0), 'jugadores,', (txt.length / 1024).toFixed(0), 'KB');
