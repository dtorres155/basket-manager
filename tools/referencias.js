// Busca fotos de referencia con licencia libre en Wikimedia Commons y las guarda en recursos/referencias/<tema>/ (fuera de git) más docs/referencias/<tema>.md con autor, licencia y enlace.
// Uso: node tools/referencias.js "<tema>" "<búsqueda>" [n]
const fs = require('fs'),
  path = require('path');
const [tema, q, n = 15] = process.argv.slice(2);
(async () => {
  const api =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=' +
    (+n + 10) +
    '&gsrsearch=' +
    encodeURIComponent(q + ' filetype:bitmap') +
    '&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1280';
  const j = await (await fetch(api, { headers: { 'User-Agent': 'basket-manager-personal/1.0' } })).json();
  const pags = Object.values((j.query || {}).pages || {})
    .filter(p => p.imageinfo && p.imageinfo[0].width >= 1200)
    .slice(0, +n);
  const dir = path.join(__dirname, '..', 'recursos', 'referencias', tema);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(__dirname, '..', 'docs', 'referencias'), { recursive: true });
  const md = [
    '# Referencias: ' + tema,
    '',
    'Búsqueda en Wikimedia Commons: `' + q + '`. Las imágenes están en `recursos/referencias/' + tema + '/` (fuera de git); aquí quedan autor, licencia y enlace.',
    ''
  ];
  let i = 0;
  for (const p of pags) {
    const ii = p.imageinfo[0],
      m = ii.extmetadata || {},
      lic = (m.LicenseShortName || {}).value || '?',
      autor = ((m.Artist || {}).value || '?').replace(/<[^>]+>/g, '').slice(0, 80);
    const f = path.join(dir, String(++i).padStart(2, '0') + '.jpg');
    try {
      const r = await fetch(ii.thumburl, { headers: { 'User-Agent': 'basket-manager-personal/1.0' } });
      fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      continue;
    }
    md.push(i + '. ' + p.title.replace('File:', '') + ' (' + autor + ', ' + lic + ') ' + ii.descriptionurl);
  }
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'referencias', tema + '.md'), md.join('\n') + '\n');
  console.log(tema, i, 'imágenes');
})();
