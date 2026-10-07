// Descarga plantillas reales de una liga desde sportschau.de (una jornada completa: todos los equipos).
// Uso: node tools/plantillas_sportschau.js <slug-liga> [salida.json]    p. ej.: deutschland-bbl recursos/bbl_2026.json
// Cada jugador: nombre, posición (Guard/Forward/Center), nacionalidad (en alemán) y fecha de nacimiento.
const https = require('https'), fs = require('fs');
const slug = process.argv[2] || 'deutschland-bbl', salida = process.argv[3] || ('recursos/plantillas_' + slug + '.json');
const BASE = 'https://www.sportschau.de/live-und-ergebnisse/basketball/' + slug + '/';
const get = url => new Promise((res, rej) => https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, r => { if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) return get(new URL(r.headers.location, url).href).then(res, rej); let d = ''; r.setEncoding('utf8'); r.on('data', c => d += c); r.on('end', () => res(d)); }).on('error', rej));
const limpia = t => t.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
function plantillas(html) {
  const out = {}, partes = html.split(/Kader ([^<(]+?) \((\d{4}\/\d{4})\)/);
  for (let i = 1; i < partes.length; i += 3) {
    const equipo = partes[i].trim(), cuerpo = partes[i + 2], fin = cuerpo.indexOf('</table>'), tabla = cuerpo.slice(0, fin > 0 ? fin : cuerpo.length);
    let rol = null; const jug = [], cuerpoTecnico = [];
    tabla.split(/<tr/).forEach(tr => {
      const r = tr.match(/class="role">([^<]+)</); if (r) { rol = r[1].trim(); return; }
      const n = tr.match(/class="person-name[^"]*">\s*<a[^>]*>([^<]+)</), pais = tr.match(/class="country-name[^"]*">([^<]*)</), nac = tr.match(/class="person-birthday">([^<]*)</);
      if (!n) return; const x = { nombre: limpia(n[1]), pais: pais ? limpia(pais[1]) : '', nacimiento: nac ? nac[1].trim() : '' };
      if (/Guard|Forward|Center/.test(rol || '')) jug.push(Object.assign({ pos: rol }, x)); else cuerpoTecnico.push(Object.assign({ rol }, x));
    });
    if (jug.length) out[equipo] = { temporada: partes[i + 1], jugadores: jug, staff: cuerpoTecnico };
  }
  return out;
}
(async () => {
  const lista = await get(BASE + 'spiele-und-ergebnisse');
  const partidos = [...new Set((lista.match(new RegExp('/live-und-ergebnisse/basketball/' + slug + '/ma\\d+/[a-z0-9-]+_[a-z0-9-]+', 'g')) || []))];
  console.log(partidos.length, 'partidos en la jornada');
  const todo = {};
  for (const p of partidos) { const html = await get('https://www.sportschau.de' + p + '/spiel-kader'); Object.assign(todo, plantillas(html)); }
  fs.writeFileSync(salida, JSON.stringify(todo, null, 1));
  Object.keys(todo).forEach(e => console.log(e.padEnd(34), todo[e].temporada, todo[e].jugadores.length, 'jugadores,', (todo[e].staff.find(s => /Trainer/i.test(s.rol || '')) || {}).nombre || ''));
})();
