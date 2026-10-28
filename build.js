// Ensambla el juego en dist/ (autocontenido, funciona sin conexión): index.html + three.min.js + fuentes locales.
const fs = require('fs'),
  path = require('path');
const mods = [
  'core',
  'registro',
  'ligas_config',
  'datos_util',
  'datos_valoraciones',
  'datos_clima',
  'datos_nba_este',
  'datos_nba_oeste',
  'datos_nba_fin',
  'datos_euroliga',
  'datos_ligas',
  'datos_ligas2',
  'datos_movimientos',
  'datos_ligas3',
  'datos_plantillas_extra',
  'datos_ligas_extra',
  'datos_ligas_ascenso',
  'datos_ligas_ascenso2',
  'calidad',
  'three_kit',
  'diseno',
  'i18n_datos',
  'datos_i18n',
  'i18n',
  'controles',
  'accesibilidad',
  'relieve3d',
  'texturas',
  'sol',
  'cielo',
  'horizonte',
  'catalogo_personas',
  'urbano',
  'vehiculos',
  'mobiliario_ciudad',
  'identidad_ciudad',
  'monumentos_ciudad',
  'iconos',
  'sonido',
  'muestras',
  'musica',
  'finanzas',
  'ciudad',
  'campus',
  'contratos',
  'ciudad3d',
  'etiquetas_mapa',
  'ciudad_deportiva',
  'estadio',
  'arbol_instalaciones',
  'progresion',
  'legado',
  'directiva_ia',
  'guardado',
  'copias',
  'partidos',
  'competiciones',
  'mercado',
  'cantera',
  'personaje',
  'carrera',
  'estilo',
  'movil',
  'fans',
  'copas',
  'continental',
  'rivalidades',
  'pretemporada',
  'seleccion_juego',
  'allstar',
  'ojeadores',
  'negociacion',
  'traspasos',
  'traspasos_modos',
  'prensa',
  'tactica',
  'tactica_plus',
  'crecimiento',
  'narrador',
  'directo',
  'rua',
  'entrenador',
  'social',
  'sponsor',
  'pueblo',
  'vida',
  'ascensos',
  'gente',
  'gente_historias',
  'estilos_pueblo',
  'hogar',
  'sede_plano',
  'sede_acciones',
  'nav_worker',
  'multitud_gpu',
  'sede_luz',
  'sede_mapa',
  'sede_decorar',
  'sede_construir',
  'animaciones_codigo',
  'sede_personaje',
  'sede_tiro',
  'sede_paneles',
  'sede_hud',
  'hud_mundo',
  'sede_grupo',
  'sede3d',
  'edificio_kit',
  'calle_vida',
  'vecinos',
  'dialogo',
  'calle3d',
  'ciudad_barrios',
  'interiores_pueblo',
  'interiores_vida',
  'interaccion',
  'casas_realistas',
  'arboles',
  'curvas_pueblo',
  'arquitectura_club',
  'calle_sintetica',
  'calle_real',
  'calle_real_vida',
  'demografia',
  'ciudad_dia',
  'movilidad',
  'calle_real_detalle',
  'pueblo_vida',
  'pueblo_juego',
  'negocios_3d',
  'movil_apps',
  'interiores',
  'deportiva_mundo',
  'pueblo_mundo',
  'casa3d',
  'casa_editor',
  'casas_producto',
  'economia',
  'patrimonio',
  'negocios',
  'pueblo_gestion',
  'ciudad_juego',
  'coleccionables',
  'rutina',
  'logros_eco',
  'decorar_interior',
  'portada3d',
  'ui',
  'ui_gestion',
  'ui_ciudad',
  'ui_presidente',
  'ui_carrera',
  'ui_entrenador',
  'ui_extra',
  'ui_instalaciones',
  'ui_ascensos',
  'ui_muestra',
  'ui_tactica_plus',
  'ui_movil',
  'ui_traspasos',
  'ui_seleccion',
  'ui_patrimonio',
  'ui_negocios',
  'ui_pueblo',
  'ui_rutina',
  'ui_coleccion',
  'ui_tutorial',
  'misiones',
  'avisos_inicio',
  'pruebas_juego',
  'ui_ajustes'
];
const DIST = path.join(__dirname, 'dist'),
  VENDOR = path.join(__dirname, 'vendor');
const LAT = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
// [familia, peso, archivo, rango]
const FUENTES = [
  ['Graduate', '400', 'graduate-latin-400-normal.woff2', LAT],
  ['Bricolage Grotesque', '200 800', 'bricolage-grotesque-latin-opsz-normal.woff2', LAT],
  ['Bricolage Grotesque', '200 800', 'bricolage-grotesque-latin-ext-opsz-normal.woff2', EXT],
  ['Doto', '100 900', 'doto-latin-wght-normal.woff2', LAT],
  ['Doto', '100 900', 'doto-latin-ext-wght-normal.woff2', EXT]
];
const fontFace = FUENTES.map(
  ([f, w, a, r]) => `@font-face{font-family:'${f}';font-style:normal;font-display:swap;font-weight:${w};src:url(fonts/${a}) format('woff2');unicode-range:${r}}`
).join('\n');
const precarga = FUENTES.filter(x => x[3] === LAT)
  .map(x => `<link rel="preload" href="fonts/${x[2]}" as="font" type="font/woff2" crossorigin>`)
  .join('');

const NARANJA = '#e8590c',
  NAVY = '#1c2b3a';
const ICONOS = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
const manifest = {
  name: 'Basket Manager 26/27',
  short_name: 'Basket 26/27',
  description: 'Gestión de baloncesto: NBA, Euroliga y ligas europeas, temporada 2026-27.',
  lang: 'es',
  start_url: './',
  scope: './',
  id: './',
  display: 'standalone',
  orientation: 'portrait',
  background_color: NAVY,
  theme_color: NARANJA,
  categories: ['games', 'sports'],
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
};
// Pantalla de arranque: se ve mientras se interpreta el script (GM.ui.start la sustituye)
const arranque = `<div id="arranque" style="position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:${NAVY};color:#f6efe4;font:600 16px 'Bricolage Grotesque',system-ui,sans-serif"><img src="icons/icon-192.png" width="128" height="128" alt=""><div style="font:400 26px Graduate,serif;letter-spacing:.04em">Basket Manager</div><div style="opacity:.7">Preparando la temporada…</div></div>`;
// Registro del service worker y aviso de nueva versión (solo en HTTPS o localhost)
const registroSW = `
(function(){
  if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || /^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname))) return;
  var actualizar = false, recargando = false; // solo se recarga si el usuario ha pedido actualizar (la primera instalación no recarga)
  navigator.serviceWorker.addEventListener('controllerchange', function () { if (!actualizar || recargando) return; recargando = true; location.reload(); });
  function avisar(w) {
    if (!navigator.serviceWorker.controller || !window.GM || !GM.ui || !GM.ui.modal) return;
    var d = document.createElement('div'); d.innerHTML = '<h3>Nueva versión</h3><p>Hay una versión nueva del juego. Tu partida se guarda antes de actualizar.</p>';
    GM.ui.modal(d, [{ t: 'Actualizar ahora', fn: function () { try { if (GM.state && GM.mods.guardado) GM.mods.guardado.guardar(0); } catch (e) {} actualizar = true; w.postMessage('SKIP_WAITING'); } }, { t: 'Más tarde', cls: 'btn-sec' }]);
  }
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      if (reg.waiting) avisar(reg.waiting);
      reg.addEventListener('updatefound', function () { var w = reg.installing; if (w) w.addEventListener('statechange', function () { if (w.state === 'installed') avisar(w); }); });
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') reg.update().catch(function () {}); });
    }).catch(function (e) { console.warn('Service worker no registrado: ' + e.message); });
  });
})();`;

const css = fs.readFileSync('estilos.css', 'utf8');
// lz-string (MIT, Pieroxy) va delante de los módulos: comprime la partida guardada (guardado.js)
const jsFuente =
  '/* ===== lz-string ===== */\n' +
  fs.readFileSync(path.join(VENDOR, 'lz-string.min.js'), 'utf8') +
  '\n;window.__LZ_SRC=' +
  JSON.stringify(fs.readFileSync(path.join(VENDOR, 'lz-string.min.js'), 'utf8')) +
  ';\n' +
  mods.map(m => '/* ===== ' + m + ' ===== */\n' + fs.readFileSync(m + '.js', 'utf8')).join('\n');
// Solo se quitan espacios y comentarios (los nombres se conservan para poder depurar con F12); SIN_MINIFICAR=1 deja el código tal cual
const js = process.env.SIN_MINIFICAR ? jsFuente : require('esbuild').transformSync(jsFuente, { minifyWhitespace: true, target: 'es2022', loader: 'js' }).code;
const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, interactive-widget=resizes-content">
<meta name="theme-color" content="#e8590c">
<title>Basket Manager 2026-27</title>
<meta name="description" content="${manifest.description}">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Basket 26/27">
${precarga}
<style>
${fontFace}
${css}</style></head>
<body><div id="app">${arranque}</div>
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
${registroSW}
</script></body></html>`;

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'fonts'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), html);
fs.copyFileSync(path.join(VENDOR, 'three.min.js'), path.join(DIST, 'three.min.js'));
FUENTES.forEach(x => fs.copyFileSync(path.join(VENDOR, 'fonts', x[2]), path.join(DIST, 'fonts', x[2])));
fs.mkdirSync(path.join(DIST, 'icons'));
ICONOS.forEach(f => fs.copyFileSync(path.join(VENDOR, 'icons', f), path.join(DIST, 'icons', f)));
// Modelos 3D (glb y texturas, CC0): vendor/modelos -> dist/modelos (las licencias .txt no se publican)
const MODELOS = [];
(function copia(rel) {
  const src = path.join(VENDOR, 'modelos', rel);
  fs.readdirSync(src, { withFileTypes: true }).forEach(e => {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) {
      fs.mkdirSync(path.join(DIST, 'modelos', r), { recursive: true });
      copia(r);
    } else if (!/.txt$/.test(e.name)) {
      fs.copyFileSync(path.join(src, e.name), path.join(DIST, 'modelos', r));
      if (!/^reales\//.test(r)) MODELOS.push('modelos/' + r);
    }
  });
})('');
// Sonidos (ogg, CC0, Kenney): vendor/audio -> dist/audio
const AUDIO = [];
if (fs.existsSync(path.join(VENDOR, 'audio'))) {
  fs.mkdirSync(path.join(DIST, 'audio'), { recursive: true });
  fs.readdirSync(path.join(VENDOR, 'audio')).forEach(f => {
    if (/.ogg$/.test(f)) {
      fs.copyFileSync(path.join(VENDOR, 'audio', f), path.join(DIST, 'audio', f));
      AUDIO.push('audio/' + f);
    }
  });
}
// Texturas reales (CC0, ambientCG): vendor/texturas -> dist/texturas
const TEXTURAS = [];
fs.mkdirSync(path.join(DIST, 'texturas'), { recursive: true });
fs.readdirSync(path.join(VENDOR, 'texturas'))
  .filter(f => /\.jpg$/.test(f))
  .forEach(f => {
    fs.copyFileSync(path.join(VENDOR, 'texturas', f), path.join(DIST, 'texturas', f));
    TEXTURAS.push('texturas/' + f);
  });
// Transcodificador Basis (KTX2) y texturas KTX2: vendor/basis -> dist/basis, vendor/texturas_ktx2 -> dist/texturas (se piden por fetch en calidad alta; las JPG quedan de respaldo)
if (fs.existsSync(path.join(VENDOR, 'basis'))) {
  fs.mkdirSync(path.join(DIST, 'basis'), { recursive: true });
  fs.readdirSync(path.join(VENDOR, 'basis')).forEach(f => fs.copyFileSync(path.join(VENDOR, 'basis', f), path.join(DIST, 'basis', f)));
}
if (fs.existsSync(path.join(VENDOR, 'texturas_ktx2')))
  fs.readdirSync(path.join(VENDOR, 'texturas_ktx2'))
    .filter(f => /\.ktx2$/.test(f))
    .forEach(f => fs.copyFileSync(path.join(VENDOR, 'texturas_ktx2', f), path.join(DIST, 'texturas', f)));
// Cielos HDRI (Poly Haven, CC0): vendor/hdri -> dist/hdri; se piden por fetch en calidad alta y no van a la caché de arranque
if (fs.existsSync(path.join(VENDOR, 'hdri'))) {
  fs.mkdirSync(path.join(DIST, 'hdri'), { recursive: true });
  fs.readdirSync(path.join(VENDOR, 'hdri'))
    .filter(f => /.hdr$/.test(f))
    .forEach(f => fs.copyFileSync(path.join(VENDOR, 'hdri', f), path.join(DIST, 'hdri', f)));
}
// Ortofotos (PNOA, IGN, CC BY 4.0 scne.es; tools/ortofoto.js): vendor/orto -> dist/orto; el suelo lejano de la ciudad real (horizonte.js) las pide por fetch
if (fs.existsSync(path.join(VENDOR, 'orto'))) {
  fs.mkdirSync(path.join(DIST, 'orto'), { recursive: true });
  fs.readdirSync(path.join(VENDOR, 'orto'))
    .filter(f => /.jpg$/.test(f))
    .forEach(f => fs.copyFileSync(path.join(VENDOR, 'orto', f), path.join(DIST, 'orto', f)));
}
// Ciudades reales (OpenStreetMap, ODbL): vendor/osm -> dist/osm (calle_real.js las pide por fetch)
const OSM = [];
fs.mkdirSync(path.join(DIST, 'osm'), { recursive: true });
if (fs.existsSync(path.join(VENDOR, 'osm')))
  fs.readdirSync(path.join(VENDOR, 'osm'))
    .filter(f => /.json$/.test(f))
    .forEach(f => {
      fs.copyFileSync(path.join(VENDOR, 'osm', f), path.join(DIST, 'osm', f));
      OSM.push('osm/' + f);
    });
fs.writeFileSync(path.join(DIST, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

// Service worker: precarga todo dist/. La versión es un hash del contenido, así que cada cambio crea una caché nueva
// y el juego ofrece actualizar (ver registroSW). Estrategia: primero caché, red como respaldo.
const archivos = ['./', 'index.html', 'three.min.js', 'manifest.webmanifest'].concat(
  FUENTES.map(x => 'fonts/' + x[2]),
  ICONOS.map(f => 'icons/' + f),
  MODELOS,
  AUDIO
); // las texturas (JPG y KTX2; se piden bajo demanda desde la fase B, son 59 materiales), las ciudades (osm/), los cielos HDRI, el transcodificador Basis y los modelos realistas se piden la primera vez y se guardan en la caché (ya no se descargan las 120 ciudades al instalar)
const hash = require('crypto').createHash('sha1');
archivos
  .concat(TEXTURAS)
  .filter(f => f !== './')
  .forEach(f => hash.update(fs.readFileSync(path.join(DIST, f)))); // las texturas cuentan para la versión aunque no se precarguen
const VERSION = hash.digest('hex').slice(0, 10);
const sw = `// Generado por build.js. No editar a mano.
const VERSION = 'bm-${VERSION}';
const ARCHIVOS = ${JSON.stringify(archivos)};
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('bm-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (r.mode === 'navigate') { e.respondWith(caches.match('index.html').then(x => x || fetch(r))); return; }
  if (['/modelos/reales/', '/osm/', '/orto/', '/hdri/', '/basis/'].some(p => r.url.indexOf(p) >= 0) || r.url.indexOf('.ktx2') >= 0) { e.respondWith(caches.open('reales-v1').then(c => c.match(r).then(x => x || fetch(r).then(res => { if (res.ok) { c.put(r, res.clone()); c.keys().then(ks => { if (ks.length > 500) ks.slice(0, ks.length - 500).forEach(k => c.delete(k)); }); } return res; })))); return; }
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(x => x || fetch(r)));
});
`;
fs.writeFileSync(path.join(DIST, 'sw.js'), sw);
console.log('dist/index.html', (html.length / 1024).toFixed(0), 'KB, versión', VERSION);
// Punto 79: aviso si algún modelo de vendor/modelos supera su presupuesto (node tools/modelos_presupuesto.js --optimizar lo arregla); con MODELOS_ESTRICTO=1 el build falla
try {
  const fuera = require('./tools/modelos_presupuesto')
    .revisar()
    .filter(x => x.error || !x.pasa);
  if (fuera.length) {
    console.log('AVISO: ' + fuera.length + ' modelos fuera de presupuesto (node tools/modelos_presupuesto.js)');
    if (process.env.MODELOS_ESTRICTO) process.exit(1);
  }
} catch (e) {
  console.log('presupuesto de modelos no comprobado: ' + e.message);
}
