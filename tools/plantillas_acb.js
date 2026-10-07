// Plantillas reales de la ACB desde acb.com (temporada en curso): nombre, posición, nacionalidad, nacimiento y altura.
// Uso: node tools/plantillas_acb.js [salida.json] [ids de club separados por comas]
const https = require('https'), fs = require('fs');
const salida = process.argv[2] || 'recursos/acb_2026.json';
const IDS = (process.argv[3] || '2,3,4,8,9,10,12,13,14,16,22,25,28,57,549,591,657,658').split(',');
const get = url => new Promise((res, rej) => https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, r => { if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) return get(new URL(r.headers.location, url).href).then(res, rej); let d = ''; r.setEncoding('utf8'); r.on('data', c => d += c); r.on('end', () => res(d)); }).on('error', rej));
(async () => {
  const out = {};
  for (const id of IDS) {
    const html = await get('https://www.acb.com/club/plantilla/id/' + id), equipo = (html.match(/<title>([^|<]+)/) || [])[1].trim();
    const cartas = [...html.matchAll(/<a href="(\/es\/liga\/jugadores\/[a-z0-9-]+-\d+)">[\s\S]*?__name">([^<]+)<\/p><p[^>]*__position">([^<]+)<\/p>/g)];
    const vistos = new Set(), jug = [];
    for (const [, href, nombre, pos] of cartas) {
      if (vistos.has(href)) continue; vistos.add(href);
      const f = (await get('https://www.acb.com' + href)).replace(/\\"/g, '"');
      const g = k => (f.match(new RegExp('"' + k + '":"([^"]*)"')) || [])[1] || '';
      const completo = ((g('firstName') + ' ' + g('lastName')).trim()) || nombre;
      jug.push({ nombre: completo.replace(/&#x27;|&#39;/g, "'"), pos: pos.trim(), pais: g('nationality'), nacimiento: g('birthDate').replace(/-/g, '.'), altura: g('height') });
    }
    out[equipo] = { temporada: '2026/2027', jugadores: jug, staff: [] };
    console.log(String(id).padStart(3), equipo.padEnd(30), jug.length, 'jugadores');
  }
  fs.writeFileSync(salida, JSON.stringify(out, null, 1));
})();
