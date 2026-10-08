// Plantillas de la liga turca (BSL) desde las plantillas «current roster» de la Wikipedia en inglés (la web de la federación
// está tras Cloudflare). De cada jugador con artículo se leen nacimiento, posición, nacionalidad y altura de su ficha.
// Uso: node tools/plantillas_bsl_wiki.js   -> recursos/bsl_2026.json (mismo formato que los demás plantillas_*.js)
const https = require('https'), fs = require('fs');
const API = 'https://en.wikipedia.org/w/api.php?format=json&';
const get1 = url => new Promise((res, rej) => https.get(url, { headers: { 'User-Agent': 'basket-manager-datos/1.0 (https://github.com/dtorres155/basket-manager; uso personal)' } }, r => { let d = ''; r.setEncoding('utf8'); r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(new Error(d.slice(0, 200))); } }); }).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Respeta los límites de la API: 2 s entre peticiones y, si pide calma, espera 30 s y lo vuelve a intentar
async function get(url) { for (let k = 0; k < 4; k++) { try { const r = await get1(url); await sleep(2000); return r; } catch (e) { if (!/too many requests/i.test(e.message)) throw e; console.log('La API pide calma: espero 30 s'); await sleep(30000); } } throw new Error('API saturada'); }
async function contenidos(titulos) {   // hasta 50 páginas por petición, siguiendo redirecciones
  const out = {};
  for (let i = 0; i < titulos.length; i += 50) {
    const j = await get(API + 'action=query&redirects=1&prop=revisions&rvprop=content|timestamp&rvslots=main&titles=' + encodeURIComponent(titulos.slice(i, i + 50).join('|')));
    const red = {}; (j.query.redirects || []).forEach(r => { red[r.to] = r.from; }); (j.query.normalized || []).forEach(r => { red[r.to] = red[r.to] || r.from; });
    Object.values(j.query.pages).forEach(p => { if (p.revisions) { const t = p.revisions[0].slots.main['*']; out[p.title] = t; if (red[p.title]) out[red[p.title]] = t; if (red[red[p.title]]) out[red[red[p.title]]] = t; } });
  }
  return out;
}
const campo = (t, k) => { const m = new RegExp('\\|\\s*' + k + '\\s*=\\s*([^\\n]*)').exec(t); return m ? m[1].trim() : ''; };
const limpia = s => s.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/\{\{[^}]*\}\}/g, '').replace(/<[^>]+>/g, '').replace(/'''?/g, '').trim();
const POS = [[/point guard/i, 'PG'], [/shooting guard/i, 'SG'], [/small forward/i, 'SF'], [/power forward/i, 'PF'], [/center|centre/i, 'C'], [/guard/i, 'SG'], [/forward/i, 'SF']];
(async () => {
  const cat = await get(API + 'action=query&list=categorymembers&cmlimit=100&cmtitle=' + encodeURIComponent('Category:Turkish Basketball League current roster navigational boxes'));
  const plantillas = cat.query.categorymembers.map(m => m.title).filter(t => /^Template:/.test(t));
  console.log(plantillas.length, 'plantillas en la categoría');
  const tx = await contenidos(plantillas), out = {};
  for (const t of plantillas) {
    const w = tx[t]; if (!w) continue;
    const equipo = limpia(campo(w, 'teamname')) || t.replace(/^Template:/, '').replace(/ current roster$/, '');
    const bloque = (w.split(/\|\s*(?:players|list1)\s*=/)[1] || '').split(/\|\s*list2\s*=/)[0];
    const jug = [...bloque.matchAll(/^\*\s*(\d+)?\s*(?:\[\[([^\]|]+)(?:\|[^\]]*)?\]\]|([^(\n[]+))/gm)].map(m => ({ art: m[2] ? m[2].trim() : null, nombre: (m[2] || m[3] || '').replace(/\s*\(basketball\)|\s*\(basketball player\)/, '').trim() })).filter(x => x.nombre);
    out[equipo] = { temporada: '2026/2027', plantilla: t, editado: null, jugadores: jug };
  }
  // Fichas de los jugadores con artículo
  const arts = [...new Set(Object.values(out).flatMap(e => e.jugadores.filter(j => j.art).map(j => j.art)))];
  const fichas = await contenidos(arts);
  for (const e of Object.values(out)) {
    e.jugadores = e.jugadores.map(j => {
      const f = j.art && fichas[j.art] ? fichas[j.art] : '';
      const bd = /birth[_ ]date[^|]*\|(?:\s*df=\w+\s*\|)?\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/i.exec(f);
      const pos = limpia(campo(f, 'position')), nat = limpia(campo(f, 'nationality')), hm = parseFloat(campo(f, 'height_m')), hcm = parseFloat(campo(f, 'height_cm')), hft = parseFloat(campo(f, 'height_ft')), hin = parseFloat(campo(f, 'height_in')) || 0;
      const altura = hcm || (hm ? Math.round(hm * 100) : hft ? Math.round((hft * 12 + hin) * 2.54) : null);
      const lugar = limpia(campo(f, 'birth_place')).split(',').pop().trim();   // si no hay nacionalidad, el país de nacimiento
      return { nombre: j.nombre, pos: (POS.find(p => p[0].test(pos)) || [null, ''])[1], pais: nat.replace(/^South /, 'South_').split(/[\s/,]+/)[0].replace('_', ' ') || lugar || '', nacimiento: bd ? String(bd[3]).padStart(2, '0') + '.' + String(bd[2]).padStart(2, '0') + '.' + bd[1] : '', altura };
    });
    console.log(e.plantilla.replace(/^Template:/, '').padEnd(60), e.jugadores.length, 'jugadores,', e.jugadores.filter(j => j.nacimiento).length, 'con ficha');
  }
  fs.writeFileSync('recursos/bsl_2026.json', JSON.stringify(out, null, 1));
})();
