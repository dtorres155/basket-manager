// Relieve (punto 31b): alturas del terreno a partir de las teselas Terrarium de AWS (mezcla de SRTM, Copernicus y fuentes locales; sin límite de peticiones).
// Cuadrícula de 17x17 puntos cada 125 m alrededor del pabellón -> recursos/osm/<id>.dem.json ({ n: 17, paso: 125, h: [metros] }, de oeste a este y de norte a sur).
// Uso: node tools/osm_relieve_teselas.js [id-club ...]   (sin argumentos hace todas las ciudades, también las que ya tenían). Después: node tools/osm_generar.js
const fs = require('fs'), path = require('path'), zlib = require('zlib'); const DIR = path.join(__dirname, '..', 'recursos', 'osm'), N = 17, PASO = 125, Z = 13;
const dormir = ms => new Promise(r => setTimeout(r, ms)), cache = new Map();
// Decodificador mínimo de PNG (8 bits, RGB o RGBA, sin entrelazado): lo que sirve AWS
function png(buf) {
  let p = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p), tipo = buf.toString('ascii', p + 4, p + 8); if (tipo === 'IHDR') { w = buf.readUInt32BE(p + 8); h = buf.readUInt32BE(p + 12); ct = buf[p + 17]; if (buf[p + 16] !== 8 || buf[p + 20] !== 0) throw new Error('PNG no soportado'); } else if (tipo === 'IDAT') idat.push(buf.slice(p + 8, p + 8 + len)); p += 12 + len; }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0; if (!bpp) throw new Error('tipo de color ' + ct);
  const raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(w * h * bpp), fila = w * bpp;
  for (let y = 0; y < h; y++) { const f = raw[y * (fila + 1)], o = y * (fila + 1) + 1;
    for (let i = 0; i < fila; i++) { const a = i >= bpp ? px[y * fila + i - bpp] : 0, b = y ? px[(y - 1) * fila + i] : 0, c = y && i >= bpp ? px[(y - 1) * fila + i - bpp] : 0; let v = raw[o + i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; } px[y * fila + i] = v & 255; } }
  return { w, h, bpp, px };
}
async function tesela(z, x, y) { const k = z + '/' + x + '/' + y; if (cache.has(k)) return cache.get(k); let t = null; for (let i = 0; i < 4 && !t; i++) { try { const r = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${k}.png`, { signal: AbortSignal.timeout(30000) }); if (r.ok) t = png(Buffer.from(await r.arrayBuffer())); else await dormir(1500); } catch (e) { await dormir(1500); } } cache.set(k, t); return t; }
const altura = async (lat, lon) => { const n = 2 ** Z, fx = (lon + 180) / 360 * n, fy = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n, tx = Math.floor(fx), ty = Math.floor(fy), t = await tesela(Z, tx, ty); if (!t) return null;
  const px = Math.min(t.w - 1.001, (fx - tx) * t.w - 0.5), py = Math.min(t.h - 1.001, (fy - ty) * t.h - 0.5), x0 = Math.max(0, Math.floor(px)), y0 = Math.max(0, Math.floor(py)), u = px - x0, v = py - y0, g = (a, b) => { const o = (Math.min(t.h - 1, b) * t.w + Math.min(t.w - 1, a)) * t.bpp; return t.px[o] * 256 + t.px[o + 1] + t.px[o + 2] / 256 - 32768; };
  return (g(x0, y0) * (1 - u) + g(x0 + 1, y0) * u) * (1 - v) + (g(x0, y0 + 1) * (1 - u) + g(x0 + 1, y0 + 1) * u) * v; };
(async () => {
  const sel = process.argv.slice(2), ids = fs.readdirSync(DIR).filter(f => f.endsWith('.json') && !/\.(poi|ring|dem|tr|pl)\.json$/.test(f) && f !== 'clubes.json' && f !== 'centros.json').map(f => f.replace('.json', ''));
  for (const id of ids) {
    if (sel.length && !sel.includes(id)) continue; const c = JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8')), k = 110574, kx = 111320 * Math.cos(c.lat * Math.PI / 180), h = []; let ok = true;
    for (let j = 0; j < N && ok; j++) for (let i = 0; i < N && ok; i++) { const v = await altura(c.lat - (j - (N - 1) / 2) * PASO / k, c.lon + (i - (N - 1) / 2) * PASO / kx); if (v === null) ok = false; else h.push(Math.round(v * 10) / 10); }
    if (!ok) { console.log('SIN DATOS', id); continue; }
    fs.writeFileSync(path.join(DIR, id + '.dem.json'), JSON.stringify({ id, n: N, paso: PASO, h })); console.log(id, 'de ' + Math.min(...h) + ' a ' + Math.max(...h) + ' m');
  }
})();
