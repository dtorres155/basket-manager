// Actualiza las plantillas reales de las ligas añadidas con datos (LNB, LKL, ABA, Israel…) desde la Wikipedia inglesa (API oficial, 1 petición por segundo con tu agente de usuario).
// Para cada club busca la página (título conocido o búsqueda por nombre), lee la tabla «Current roster» (posición, nacionalidad, nombre, altura y fecha de nacimiento), la convierte a CSV en recursos/plantillas_extra/<id>.csv
// y al terminar ejecuta tools/importar_plantillas_extra.js para regenerar datos_plantillas_extra.js. Hacer una vez al empezar cada temporada (y después de los fichajes de verano).
// Uso: node tools/actualizar_plantillas.js [--seco] [idClub ...]    (sin clubes, todos los de las ligas nuevas; --seco no escribe nada y solo informa)
// Un club se deja como está si la tabla trae menos de 8 jugadores (página sin plantilla o desactualizada). Las valoraciones, potenciales y sueldos los estima el importador; lo único real son nombre, posición, edad, altura y nacionalidad.
const fs = require('fs'),
  path = require('path'),
  { spawnSync } = require('child_process');
const RAIZ = path.join(__dirname, '..'),
  DIR = path.join(RAIZ, 'recursos', 'plantillas_extra');
const UA = 'BasketManagerBot/1.0 (proyecto personal; datos de plantillas)';
const HOY = new Date('2026-10-21');
const IOC = {
  FRA: 'FR',
  USA: 'US',
  ESP: 'ES',
  LTU: 'LT',
  SRB: 'RS',
  CRO: 'HR',
  HRV: 'HR',
  SLO: 'SI',
  SVN: 'SI',
  BIH: 'BA',
  MNE: 'ME',
  ISR: 'IL',
  GER: 'DE',
  DEU: 'DE',
  ITA: 'IT',
  GRE: 'GR',
  GRC: 'GR',
  TUR: 'TR',
  LAT: 'LV',
  LVA: 'LV',
  EST: 'EE',
  FIN: 'FI',
  SWE: 'SE',
  NOR: 'NO',
  DEN: 'DK',
  DNK: 'DK',
  POL: 'PL',
  CZE: 'CZ',
  SVK: 'SK',
  HUN: 'HU',
  ROU: 'RO',
  ROM: 'RO',
  BUL: 'BG',
  BGR: 'BG',
  UKR: 'UA',
  RUS: 'RU',
  GEO: 'GE',
  ARM: 'AM',
  NED: 'NL',
  NLD: 'NL',
  BEL: 'BE',
  SUI: 'CH',
  CHE: 'CH',
  AUT: 'AT',
  GBR: 'GB',
  IRL: 'IE',
  ISL: 'IS',
  CAN: 'CA',
  ARG: 'AR',
  BRA: 'BR',
  URU: 'UY',
  PUR: 'PR',
  DOM: 'DO',
  NGR: 'NG',
  NGA: 'NG',
  SEN: 'SN',
  MLI: 'ML',
  CMR: 'CM',
  CIV: 'CI',
  GUI: 'GN',
  COD: 'CD',
  CGO: 'CG',
  ANG: 'AO',
  AGO: 'AO',
  EGY: 'EG',
  TUN: 'TN',
  ALG: 'DZ',
  DZA: 'DZ',
  MAR: 'MA',
  GHA: 'GH',
  GAM: 'GM',
  CPV: 'CV',
  SSD: 'SS',
  JAM: 'JM',
  GUY: 'GY',
  HAI: 'HT',
  PAN: 'PA',
  VEN: 'VE',
  COL: 'CO',
  MEX: 'MX',
  NZL: 'NZ',
  AUS: 'AU',
  JPN: 'JP',
  CHN: 'CN',
  KOS: 'XK',
  MKD: 'MK',
  ALB: 'AL',
  LBN: 'LB',
  IRI: 'IR',
  IRN: 'IR',
  CAF: 'CF',
  MAD: 'MG',
  MDG: 'MG',
  GBS: 'GW',
  KAZ: 'KZ',
  LUX: 'LU',
  BLR: 'BY',
  MDA: 'MD',
  CYP: 'CY',
  MLT: 'MT',
  SUI2: 'CH',
  KHM: 'KH',
  CAM: 'KH'
};
// títulos de la Wikipedia que la búsqueda por nombre no encuentra bien
const TITULOS = {
  monaco: 'AS Monaco Basket',
  'le-mans': 'Le Mans Sarthe Basket',
  'le-portel': 'ESSM Le Portel',
  'rytas-vilnius': 'BC Rytas',
  lietkabelis: 'BC Lietkabelis',
  neptunas: 'BC Neptūnas',
  siauliai: 'BC Šiauliai',
  mazeikiai: 'BC Mažeikiai',
  dubrovnik: 'KK Dubrovnik',
  split: 'KK Split',
  zadar: 'KK Zadar',
  'mega-basket': 'KK Mega Basket',
  vojvodina: 'KK Vojvodina',
  'spartak-subotica': 'KK Spartak Subotica',
  'hapoel-jerusalem': 'Hapoel Jerusalem B.C.',
  'maccabi-rishon': 'Maccabi Rishon LeZion B.C.',
  'hapoel-beer-sheva': "Hapoel Be'er Sheva B.C.",
  'maccabi-haifa': 'Maccabi Haifa B.C.',
  'hapoel-gilboa': 'Hapoel Gilboa Galil B.C.'
};
// clubes que ya vienen de otras fuentes (Euroliga y EuroCup, con su plantilla propia): no se tocan
const EXCLUIR = ['asvel', 'paris-basketball', 'zalgiris-kaunas', 'crvena-zvezda', 'partizan', 'maccabi-tel-aviv', 'hapoel-tel-aviv'];
const pausa = ms => new Promise(r => setTimeout(r, ms));
async function api(params, intentos = 4) {
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams(Object.assign({ format: 'json', formatversion: '2', redirects: '1' }, params));
  for (let i = 0; i < intentos; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.status === 429 || r.status >= 500) {
      await pausa(3000 * (i + 1));
      continue;
    }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  throw new Error('demasiadas peticiones');
}
const limpia = h =>
  h
    .replace(/<[^>]*>/g, '')
    .replace(/&#160;|&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
function posicion(txt, altura) {
  const t = txt.replace(/\s+/g, '').toUpperCase();
  if (/^(PG|SG|SF|PF|C)$/.test(t)) return t;
  if (t === 'G') return altura && altura < 190 ? 'PG' : 'SG';
  if (/^(G\/F|F\/G|SWINGMAN)$/.test(t)) return 'SF';
  if (t === 'F') return 'SF';
  if (/^(F\/C|C\/F)$/.test(t)) return 'PF';
  if (/^G/.test(t)) return 'SG';
  return 'SF';
}
function nombreOrdenado(n) {
  const m = /^([^,]+),\s*(.+)$/.exec(n);
  if (!m) return n;
  let ap = m[1].trim(),
    no = m[2].trim();
  const suf = /\s(Jr\.?|Sr\.?|II|III|IV)$/i.exec(ap);
  if (suf) {
    ap = ap.slice(0, suf.index);
    no += ' ' + suf[1];
  }
  return no + ' ' + ap;
}
function leerTabla(html) {
  const i = Math.max(html.indexOf('id="Current_roster"'), html.indexOf('id="Roster"'), html.indexOf('id="Current_squad"'));
  const desde = i >= 0 ? i : 0;
  const t = html.indexOf('<table class="sortable"', desde);
  if (t < 0) return [];
  const fin = html.indexOf('</table>', t),
    cuerpo = html.slice(t, fin),
    filas = cuerpo.split('<tr>').slice(2),
    out = [];
  filas.forEach(f => {
    const td = (f.match(/<td[\s\S]*?<\/td>/g) || []).map(x => x);
    if (td.length < 7) return;
    const posTxt = limpia(td[0]);
    const cod = (/data-sort-value="([A-Z]{3})/.exec(td[2]) || [])[1],
      alt = (/<img alt="([^"]+)"/.exec(td[2]) || [])[1];
    const nombre = limpia(td[3]),
      alt_m = /([\d.]+)\s*m/.exec(limpia(td[4])),
      altura = alt_m ? Math.round(parseFloat(alt_m[1]) * 100) : 0,
      bday = (/class="bday">(\d{4}-\d{2}-\d{2})/.exec(td[6]) || [])[1];
    if (!nombre || !bday) return;
    const edad = Math.floor((HOY - new Date(bday)) / (365.25 * 86400000));
    out.push({ nombre: nombreOrdenado(nombre), pos: posicion(posTxt, altura), edad, altura, nac: IOC[cod] || (alt ? alt.slice(0, 2).toUpperCase() : 'ES') });
  });
  return out;
}
async function pagina(titulo, nombreClub) {
  try {
    const j = await api({ action: 'parse', page: titulo, prop: 'text' });
    if (j.parse && j.parse.text) return { titulo: j.parse.title, html: j.parse.text };
  } catch (e) {
    /* se busca por nombre */
  }
  await pausa(1000);
  const s = await api({ action: 'query', list: 'search', srsearch: nombreClub + ' basketball club', srlimit: '3' });
  for (const r of (s.query && s.query.search) || []) {
    await pausa(1000);
    const j = await api({ action: 'parse', page: r.title, prop: 'text' });
    if (j.parse && /basketball/i.test(j.parse.text.slice(0, 20000))) return { titulo: j.parse.title, html: j.parse.text };
  }
  return null;
}
(async () => {
  const args = process.argv.slice(2),
    seco = args.includes('--seco'),
    pedidos = args.filter(a => !a.startsWith('--'));
  require(path.join(RAIZ, 'load'))([
    'core',
    'ligas_config',
    'datos_util',
    'datos_valoraciones',
    'datos_nba_este',
    'datos_nba_oeste',
    'datos_nba_fin',
    'datos_euroliga',
    'datos_ligas',
    'datos_ligas2',
    'datos_movimientos',
    'datos_ligas3',
    'datos_ligas_extra',
    'finanzas',
    'ciudad',
    'contratos',
    'partidos',
    'competiciones',
    'mercado',
    'cantera',
    'copas',
    'continental',
    'personaje'
  ]);
  const st = GM.newGame('joventut-badalona', 1, { modo: 'gestor', personaje: GM.mods.personaje.crear() }),
    clubes = [];
  ['LNB', 'LKL', 'ABA', 'ISR'].forEach(l => st.ligas[l].equipos.forEach(id => EXCLUIR.indexOf(id) < 0 && clubes.push({ id, nombre: st.equipos[id].nombre })));
  const lista = pedidos.length ? clubes.filter(c => pedidos.includes(c.id)) : clubes;
  fs.mkdirSync(DIR, { recursive: true });
  let hechos = 0;
  for (const c of lista) {
    try {
      const titulo = TITULOS[c.id] || c.nombre.replace(/ /g, '_');
      const p = await pagina(titulo, c.nombre);
      await pausa(1500);
      const filas = p ? leerTabla(p.html) : [];
      if (filas.length < 8) {
        console.log('sin plantilla  ' + c.id.padEnd(24) + (p ? p.titulo + ': ' + filas.length + ' jugadores' : 'página no encontrada'));
        continue;
      }
      console.log('ok             ' + c.id.padEnd(24) + p.titulo + ': ' + filas.length + ' jugadores');
      hechos++;
      if (!seco)
        fs.writeFileSync(path.join(DIR, c.id + '.csv'), 'nombre,pos,edad,altura,nac\n' + filas.map(f => [f.nombre, f.pos, f.edad, f.altura, f.nac].join(',')).join('\n') + '\n');
    } catch (e) {
      console.log('error          ' + c.id + ': ' + e.message);
    }
  }
  console.log(hechos + ' plantillas ' + (seco ? 'leídas (modo seco)' : 'escritas'));
  if (!seco && hechos) spawnSync(process.execPath, [path.join(__dirname, 'importar_plantillas_extra.js')], { stdio: 'inherit' });
})();
