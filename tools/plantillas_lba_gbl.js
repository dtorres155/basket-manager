// Plantillas reales de la Lega (legabasket.it, API pública de la web) y de la liga griega (esake.gr).
// Uso: node tools/plantillas_lba_gbl.js     -> recursos/lega_2026.json y recursos/gbl_2026.json
const https = require('https'), fs = require('fs');
const get = url => new Promise((res, rej) => https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, r => { if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) return get(new URL(r.headers.location, url).href).then(res, rej); let d = ''; r.setEncoding('utf8'); r.on('data', c => d += c); r.on('end', () => res(d)); }).on('error', rej));
const ROL = { Playmaker: 'Base', Guardia: 'Escolta', Ala: 'Alero', 'Ala/Centro': 'Ala-pívot', Centro: 'Pívot' };
(async () => {
  // ---- Lega ----
  const eq = JSON.parse(await get('https://www.legabasket.it/api/teams/get-teams?items=50'));
  const lista = (eq.teams || eq.data || eq).filter ? (eq.teams || eq.data || eq) : [];
  const lega = {};
  for (const t of lista.filter(t => t.year === 2026 || !t.year)) {
    const r = JSON.parse(await get('https://www.legabasket.it/api/teams/get-team-roster?id=' + t.id));
    lega[r.team.name] = { temporada: '2026/2027', entrenador: r.coach ? r.coach.name + ' ' + r.coach.surname : '', jugadores: (r.players || []).map(p => ({ nombre: (p.name + ' ' + p.surname).replace(/\s+/g, ' ').trim(), pos: ROL[p.player_role] || p.player_role, pais: p.country, nacimiento: (p.birth_date || '').split('-').reverse().join('.'), altura: p.height, hasta: (p.end_date || '').slice(0, 4) })) };
    console.log('LBA', r.team.name.padEnd(32), lega[r.team.name].jugadores.length, 'jugadores,', lega[r.team.name].entrenador);
  }
  fs.writeFileSync('recursos/lega_2026.json', JSON.stringify(lega, null, 1));
  // ---- Liga griega ----
  const idx = await get('https://www.esake.gr/el/action/esakeomades'), ids = [...new Set(idx.match(/idteam=[0-9A-F]{8}/g))].map(x => x.slice(7));
  const gbl = {};
  for (const id of ids) {
    const html = await get('https://www.esake.gr/en/action/EsaketeamView?idteam=' + id + '&mode=1');
    const t = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n').split('\n').map(x => x.trim()).filter(Boolean);
    const jug = []; let equipo = '';
    for (let i = 0; i < t.length; i++) {
      if (t[i] === '#' && t[i + 5] === 'TEAM' && t[i + 7] === 'HEIGHT') { equipo = t[i + 6]; const g = k => { const j = t.indexOf(k, i); return j > 0 && j < i + 16 ? t[j + 1] : ''; }; jug.push({ nombre: (t[i + 3] + ' ' + t[i + 2]).replace(/\b(\w)(\w*)/g, (m, a, b) => a + b.toLowerCase()), pos: t[i + 4], pais: g('NATIONALITY'), nacimiento: g('DATE OF BIRTH').replace(/-/g, '.'), altura: Math.round(parseFloat(g('HEIGHT')) * 100) || null }); }
    }
    if (equipo) { gbl[equipo] = { temporada: '2026/2027', idEsake: id, jugadores: jug }; console.log('GBL', equipo.padEnd(34), jug.length, 'jugadores'); }
  }
  fs.writeFileSync('recursos/gbl_2026.json', JSON.stringify(gbl, null, 1));
})();
