// Genera los iconos de la PWA en vendor/icons/ a partir de un SVG propio (escudo con balón).
// Uso: node tools/iconos.js   (usa Edge con Playwright; los PNG se guardan en git)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'vendor', 'icons'); fs.mkdirSync(OUT, { recursive: true });
const fuente = 'data:font/woff2;base64,' + fs.readFileSync(path.join(__dirname, '..', 'vendor', 'fonts', 'graduate-latin-400-normal.woff2')).toString('base64');
const NARANJA = '#e8590c', NAVY = '#1c2b3a', CREMA = '#f6efe4';

// Escudo de camiseta (ribete doble) con un balón y «26/27». Lienzo de 512.
const escudo = `
  <path d="M256 36 L440 92 V250 C440 360 360 432 256 476 C152 432 72 360 72 250 V92 Z" fill="${NAVY}"/>
  <path d="M256 60 L418 109 V250 C418 346 348 410 256 450 C164 410 94 346 94 250 V109 Z" fill="none" stroke="${CREMA}" stroke-width="7"/>
  <path d="M256 76 L404 121 V250 C404 338 340 396 256 432 C172 396 108 338 108 250 V121 Z" fill="none" stroke="${NARANJA}" stroke-width="5"/>
  <g transform="translate(256 228)">
    <circle r="104" fill="${NARANJA}"/>
    <g fill="none" stroke="${NAVY}" stroke-width="9" stroke-linecap="round">
      <path d="M-104 0 H104"/><path d="M0 -104 V104"/>
      <path d="M-72 -75 C-30 -40 -30 40 -72 75"/><path d="M72 -75 C30 -40 30 40 72 75"/>
    </g>
    <circle r="104" fill="none" stroke="${NAVY}" stroke-width="6"/>
  </g>
  <text x="256" y="382" text-anchor="middle" font-family="Graduate" font-size="50" fill="${CREMA}" letter-spacing="2">26/27</text>`;
const svg = (fondo, escala) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${fondo ? `<rect width="512" height="512" fill="${NARANJA}"/>` : ''}
  <g transform="translate(256 256) scale(${escala}) translate(-256 -256)">${escudo}</g></svg>`;

(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await b.newPage();
  const html = s => `<!doctype html><style>@font-face{font-family:Graduate;src:url(${fuente})}html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${s}`;
  const variantes = [
    // [archivo, tamaño, svg, fondo transparente]
    ['icon-192.png', 192, svg(false, 1), true],
    ['icon-512.png', 512, svg(false, 1), true],
    ['icon-maskable-512.png', 512, svg(true, 0.72), false], // zona segura: círculo del 80 %
    ['apple-touch-icon.png', 180, svg(true, 0.8), false]
  ];
  for (const [f, n, s, transp] of variantes) {
    await p.setViewportSize({ width: n, height: n });
    await p.setContent(html(s)); await p.evaluate(() => document.fonts.load('58px Graduate'));
    await p.screenshot({ path: path.join(OUT, f), omitBackground: transp });
    console.log(f, n);
  }
  fs.writeFileSync(path.join(OUT, 'icon.svg'), svg(false, 1));
  await b.close();
})();
