// Vuelve a comprimir las JPG de vendor/texturas que pesen más de 400 KB (los paquetes de ambientCG vienen casi sin compresión):
// calidad 85, croma 4:2:0, mozjpeg, misma resolución y proporción. Uso: node tools/materiales_comprimir.js [--seco]
const sharp = require('../recursos/herramientas/node_modules/sharp');
const fs = require('fs'),
  path = require('path');
const DIR = path.join(__dirname, '..', 'vendor', 'texturas'),
  seco = process.argv.includes('--seco');
(async () => {
  let antes = 0,
    despues = 0,
    n = 0;
  for (const f of fs.readdirSync(DIR).filter(f => /_(c|n|r)\.jpg$/.test(f))) {
    const p = path.join(DIR, f),
      b = fs.readFileSync(p);
    if (b.length <= 400 * 1024) continue;
    // el relieve (normal) pierde menos con 4:4:4: el croma es la propia dirección
    const normal = /_n\.jpg$/.test(f),
      out = await sharp(b)
        .jpeg({ quality: normal ? 88 : 85, chromaSubsampling: normal ? '4:4:4' : '4:2:0', mozjpeg: true })
        .toBuffer();
    if (out.length >= b.length) continue;
    antes += b.length;
    despues += out.length;
    n++;
    if (!seco) fs.writeFileSync(p, out);
  }
  console.log(n + ' imágenes: ' + (antes / 1048576).toFixed(1) + ' MB -> ' + (despues / 1048576).toFixed(1) + ' MB' + (seco ? ' (sin escribir)' : ''));
})();
