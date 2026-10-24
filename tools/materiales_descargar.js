// Descarga materiales CC0 de ambientCG (paquete 1K-JPG) a recursos/ambientcg/ (fuera de git) y copia color, relieve (NormalGL) y
// rugosidad a vendor/texturas/<id>_c.jpg, _n.jpg y _r.jpg, sin cambiar su proporción. Después: node recursos/herramientas/ktx2.mjs
// sobre las nuevas para la versión comprimida. Uso: node tools/materiales_descargar.js [id…]   (sin ids, la lista de la fase B)
const fs = require('fs'),
  path = require('path'),
  { execFileSync } = require('child_process');
const RAIZ = path.join(__dirname, '..'),
  REC = path.join(RAIZ, 'recursos', 'ambientcg'),
  VEN = path.join(RAIZ, 'vendor', 'texturas');
const LISTA = [
  // fachadas
  'Bricks105',
  'Bricks113A',
  'PaintedPlaster017',
  'Plaster007',
  'PaintedPlaster006',
  'Concrete046',
  'Concrete045',
  'Concrete048',
  'Concrete036',
  'Facade018A',
  'Facade020A',
  // tejados
  'RoofingTiles014A',
  'RoofingTiles003',
  'RoofingTiles006',
  'RoofingTiles015A',
  'Gravel040',
  'CorrugatedSteel009',
  // calle
  'Asphalt033',
  'PavingStones138',
  'PavingStones136',
  'PavingStones142',
  'PavingStones146',
  'Ground109',
  'Gravel043',
  'Grass001',
  'ScatteredLeaves009',
  // interior
  'WoodFloor040',
  'WoodFloor043',
  'WoodFloor064',
  'WoodFloor062',
  'WoodFloor007',
  'Tiles107',
  'Tiles139',
  'Tiles133A',
  'Tiles110',
  'Terrazzo019L',
  'Carpet016',
  'Carpet012',
  'Marble012',
  'Marble014',
  'Travertine009',
  // metal y madera
  'Metal049A',
  'Metal046B',
  'Planks021'
];
(async () => {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : LISTA;
  fs.mkdirSync(path.join(REC, 'zip'), { recursive: true });
  const medidas = {};
  let bajado = 0;
  for (const id of ids) {
    const zip = path.join(REC, 'zip', id + '_1K-JPG.zip'),
      dir = path.join(REC, id);
    // medida real (cm) que publica ambientCG, para texturas.js
    try {
      const r = await fetch('https://ambientcg.com/api/v2/full_json?type=Material&limit=1&id=' + id);
      const a = (await r.json()).foundAssets[0];
      medidas[id] = a ? [a.dimensionX, a.dimensionY] : null;
    } catch (e) {
      medidas[id] = null;
    }
    if (!fs.existsSync(zip)) {
      const r = await fetch('https://ambientcg.com/get?file=' + id + '_1K-JPG.zip');
      if (!r.ok) {
        console.log('FALLA', id, r.status);
        continue;
      }
      const b = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(zip, b);
      bajado += b.length;
    }
    fs.mkdirSync(dir, { recursive: true });
    execFileSync('unzip', ['-o', '-q', zip, '-d', dir]);
    const busca = suf => fs.readdirSync(dir).find(f => f.endsWith('_' + suf + '.jpg'));
    const c = busca('Color'),
      n = busca('NormalGL'),
      ru = busca('Roughness');
    if (!c || !n || !ru) {
      console.log('FALTA MAPA', id, c, n, ru);
      continue;
    }
    fs.copyFileSync(path.join(dir, c), path.join(VEN, id + '_c.jpg'));
    fs.copyFileSync(path.join(dir, n), path.join(VEN, id + '_n.jpg'));
    fs.copyFileSync(path.join(dir, ru), path.join(VEN, id + '_r.jpg'));
    console.log('ok', id.padEnd(20), medidas[id] ? medidas[id].join('x') + ' cm' : 'sin medida');
  }
  fs.writeFileSync(path.join(REC, 'medidas_fase_b.json'), JSON.stringify(medidas, null, 1));
  console.log('descargado ' + Math.round(bajado / 1e6) + ' MB; medidas en recursos/ambientcg/medidas_fase_b.json');
})();
