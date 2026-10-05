// Ensambla el juego en dist/ (autocontenido, funciona sin conexión): index.html + three.min.js + fuentes locales.
const fs = require('fs'), path = require('path');
const mods = ['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','three_kit','finanzas','ciudad','campus','contratos','ciudad3d','ciudad_deportiva','estadio','legado','directiva_ia','guardado','partidos','competiciones','mercado','cantera','personaje','carrera','fans','copas','continental','rivalidades','directo','entrenador','social','sponsor','pueblo','hogar','hogar3d','ui'];
const DIST = path.join(__dirname, 'dist'), VENDOR = path.join(__dirname, 'vendor');
const LAT = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
// [familia, peso, archivo, rango]
const FUENTES = [
  ['Graduate', '400', 'graduate-latin-400-normal.woff2', LAT],
  ['Bricolage Grotesque', '200 800', 'bricolage-grotesque-latin-opsz-normal.woff2', LAT],
  ['Bricolage Grotesque', '200 800', 'bricolage-grotesque-latin-ext-opsz-normal.woff2', EXT],
  ['Doto', '100 900', 'doto-latin-wght-normal.woff2', LAT],
  ['Doto', '100 900', 'doto-latin-ext-wght-normal.woff2', EXT]
];
const fontFace = FUENTES.map(([f, w, a, r]) => `@font-face{font-family:'${f}';font-style:normal;font-display:swap;font-weight:${w};src:url(fonts/${a}) format('woff2');unicode-range:${r}}`).join('\n');
const precarga = FUENTES.filter(x => x[3] === LAT).map(x => `<link rel="preload" href="fonts/${x[2]}" as="font" type="font/woff2" crossorigin>`).join('');

const css = fs.readFileSync('estilos.css', 'utf8');
const js = mods.map(m => '/* ===== ' + m + ' ===== */\n' + fs.readFileSync(m + '.js', 'utf8')).join('\n');
const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1">
<meta name="theme-color" content="#e8590c">
<title>Basket Manager 2026-27</title>
${precarga}
<style>
${fontFace}
${css}</style></head>
<body><div id="app"></div>
<script src="three.min.js"></script>
<script>
try{
${js}
}catch(e){document.getElementById('app').innerHTML='<pre style="padding:16px;color:#ffb4a8;white-space:pre-wrap">Error al cargar: '+e.message+'</pre>';throw e;}
</script>
<script>
(function(){var a=document.getElementById('app');
try{ if(!window.GM) throw new Error('GM no cargado'); GM.ui.start(a);}catch(e){a.innerHTML='<pre style="padding:16px;color:#ffb4a8;white-space:pre-wrap">Error al arrancar: '+e.message+'</pre>';}
})();
</script></body></html>`;

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'fonts'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), html);
fs.copyFileSync(path.join(VENDOR, 'three.min.js'), path.join(DIST, 'three.min.js'));
FUENTES.forEach(x => fs.copyFileSync(path.join(VENDOR, 'fonts', x[2]), path.join(DIST, 'fonts', x[2])));
console.log('dist/index.html', (html.length / 1024).toFixed(0), 'KB');
