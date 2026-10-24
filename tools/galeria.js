// Galería de referencia (punto 85): las mismas vistas, en el mismo sitio, a la misma hora y con sol, para comparar tanda a tanda.
// Modo carrera, calidad alta, Badalona y tu pueblo. Uso: node tools/galeria.js [etiqueta] [--solo=calle,pueblo,interiores]   (requiere `npm run serve`)
// Salida: galeria/<etiqueta>/<vista>.png, medidas.json (llamadas de dibujo y triángulos por escena) y galeria/<etiqueta>/index.html,
// que pone cada vista junto a la de la galería anterior. galeria/index.html enlaza todas. La carpeta galeria/ no va a git.
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs'),
  { execSync } = require('child_process');
const { esperarEscena, sleep } = require('./ayudas');
const RAIZ = path.join(__dirname, '..', 'galeria');
const arg = process.argv.slice(2),
  solo = (arg.find(a => a.startsWith('--solo=')) || '').slice(7).split(',').filter(Boolean),
  hash = (() => {
    try {
      return execSync('git rev-parse --short HEAD').toString().trim();
    } catch (e) {
      return 'sin-git';
    }
  })(),
  etiqueta = arg.find(a => !a.startsWith('--')) || new Date().toISOString().slice(0, 10) + '_' + hash,
  DIR = path.join(RAIZ, etiqueta),
  CLUB = 'joventut-badalona',
  HORAS = { dia: 12, tarde: 19.4, noche: 22 };
fs.mkdirSync(DIR, { recursive: true });

// Vista: [nombre, sitio, yaw, zoom, inclinación]. sitio: 'yo' (donde aparece el personaje) o 'zona:<id>' (o una lista de ids, el primero que exista).
// Inclinación: 0,95 es la cámara normal del juego; 0,3 a 0,4 es casi a la altura de los ojos; 1,15 es desde arriba.
const ESCENAS = [
  {
    id: 'calle',
    grupo: 'calle',
    abrir: 'calle',
    horas: {
      dia: [
        ['calle_pie', 'yo', 0.6, 9, 0.32],
        ['calle_juego', 'yo', 0.6, 20, 0.95],
        // cámara automática del punto 103 (inclinación según el zoom): de cerca y a media distancia
        ['calle_cerca', 'yo', 0.6, 4.5, null],
        ['calle_media', 'yo', 2.2, 11, null],
        ['calle_alta', ['zona:pabellon'], 0.5, 70, 1.15],
        ['pabellon_fuera', ['zona:pabellon'], 2.4, 32, 0.3],
        ['plaza_terraza', ['zona:terraza', 'zona:mercado'], 0.9, 14, 0.42],
        ['tienda_fuera', ['zona:tienda'], 0.3, 12, 0.38],
        ['kiosco_calle', ['zona:kiosco', 'zona:metro_centro'], 1.8, 14, 0.4]
      ],
      tarde: [
        ['calle_pie', 'yo', 0.6, 9, 0.32],
        ['calle_alta', ['zona:pabellon'], 0.5, 70, 1.15]
      ],
      noche: [
        ['calle_pie', 'yo', 0.6, 9, 0.32],
        ['calle_alta', ['zona:pabellon'], 0.5, 70, 1.15],
        ['plaza_terraza', ['zona:terraza', 'zona:mercado'], 0.9, 14, 0.42]
      ]
    }
  },
  {
    id: 'pabellon_dentro',
    grupo: 'interiores',
    abrir: 'calle',
    escena: 'interior:pabellon',
    horas: {
      dia: [
        ['pabellon_dentro', 'yo', 0.4, 18, 0.7],
        ['pabellon_dentro_bajo', 'yo', 1.2, 10, 0.3]
      ]
    }
  },
  { id: 'tienda_dentro', grupo: 'interiores', abrir: 'calle', escena: 'interior:tienda', horas: { dia: [['tienda_dentro', 'yo', 0.4, 12, 0.7]] } },
  { id: 'sede', grupo: 'interiores', abrir: 'sede', horas: { dia: [['sede', 'yo', 0.4, 14, 0.8]] } },
  {
    id: 'casa',
    grupo: 'interiores',
    abrir: 'casa',
    horas: {
      dia: [
        ['casa', 'yo', 0.4, 12, 0.8],
        ['casa_baja', 'yo', 1.0, 7, 0.35]
      ]
    }
  },
  {
    id: 'pueblo',
    grupo: 'pueblo',
    abrir: 'pueblo',
    horas: {
      dia: [
        ['pueblo_pie', 'yo', 0.6, 9, 0.32],
        ['pueblo_juego', 'yo', 0.6, 20, 0.95],
        ['pueblo_cerca', 'yo', 0.6, 4.5, null],
        ['pueblo_alto', 'yo', 0.5, 70, 1.15]
      ],
      tarde: [['pueblo_pie', 'yo', 0.6, 9, 0.32]],
      noche: [
        ['pueblo_pie', 'yo', 0.6, 9, 0.32],
        ['pueblo_alto', 'yo', 0.5, 70, 1.15]
      ]
    }
  }
];

(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const medidas = {},
    errores = [],
    hechas = [];
  for (const E of ESCENAS) {
    if (solo.length && !solo.includes(E.grupo) && !solo.includes(E.id)) continue;
    const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    p.on('pageerror', e => errores.push(E.id + ': ' + e.message));
    p.on('console', m => {
      if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errores.push(E.id + ': ' + m.text().slice(0, 200));
    });
    await p.goto(process.env.URL || 'http://localhost:8080/');
    await p.waitForFunction(() => window.GM && GM.ui && GM.newGame, null, { timeout: 30000 });
    await p.evaluate(
      ([c, a]) => {
        try {
          localStorage.setItem('gm1:novedades', '9.9.999');
        } catch (e) {}
        GM.newGame(c, 7, {
          modo: 'carrera',
          personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }),
          carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 }
        });
        GM.campus.config.calidad = 'alta';
        if (GM.ajustes && GM.ajustes.marcarNovedades) GM.ajustes.marcarNovedades();
        GM.ui.start(document.getElementById('app'));
        let esc = a;
        if (a === 'casa') {
          const v = GM.mods.hogar && GM.mods.hogar.viviendas ? GM.mods.hogar.viviendas(GM.state) : [];
          esc = v.length ? 'casa:' + v[0].id : 'calle';
        }
        GM.sede.abrir(GM.state, esc);
      },
      [CLUB, E.abrir]
    );
    let ok = await esperarEscena(p, null, 150000);
    if (ok && E.escena) {
      await p.evaluate(e => GM.sede._escena(e), E.escena);
      await sleep(300);
      ok = await esperarEscena(p, E.escena, 150000);
    }
    if (!ok) {
      errores.push(E.id + ': la escena no cargó');
      await p.close();
      continue;
    }
    await sleep(2500);
    for (const [hn, vistas] of Object.entries(E.horas)) {
      for (const [n, sitio, yaw, zoom, inc] of vistas) {
        const r = await p.evaluate(
          ([hora, sitio, yaw, zoom, inc]) => {
            const S = GM.sede._estado();
            if (!S || !S.yo) return 'sin escena';
            if (GM.sede._clima) GM.sede._clima('sol');
            S.velTiempo = 0;
            S.hora = hora;
            if (S._yo0 === undefined) S._yo0 = [S.yo.obj.position.x, S.yo.obj.position.z];
            let x = S._yo0[0],
              z = S._yo0[1];
            if (sitio !== 'yo') {
              const q = sitio.map(s => S.zonas.find(q => q.sala && q.sala.id === s.slice(5))).find(Boolean);
              if (!q) return 'sin zona ' + sitio.join('/');
              x = q.obj.position.x;
              z = q.obj.position.z;
            }
            S.yo.camino = null;
            S.yo.obj.position.set(x, S.yo.obj.position.y, z);
            S.foco.set(x, 0, z);
            S.yaw = S.yawObj = yaw;
            S.zoom = zoom;
            S.inc = inc;
            if (S.panel) S.panel.style.display = 'none';
            if (GM.ui._ && GM.ui._.cerrarModales) GM.ui._.cerrarModales();
            document.querySelectorAll('.sede-ayuda, .toast, .hm-notif').forEach(e => e.remove());
            return 'ok';
          },
          [HORAS[hn], sitio === 'yo' ? 'yo' : sitio, yaw, zoom, inc]
        );
        if (r !== 'ok') {
          errores.push(E.id + ' ' + n + ': ' + r);
          continue;
        }
        await sleep(2600);
        const nombre = n + '_' + hn;
        await p.screenshot({ path: path.join(DIR, nombre + '.png') });
        hechas.push(nombre);
        // llamadas de dibujo y triángulos de un fotograma entero (con el posprocesado, la cuenta se reinicia en cada pasada)
        medidas[nombre] = await p.evaluate(
          () =>
            new Promise(ok => {
              const S = GM.sede._estado(),
                inf = S.renderer.info;
              inf.autoReset = false;
              inf.reset();
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  const m = { llamadas: inf.render.calls, tri: inf.render.triangles, geom: inf.memory.geometries, tex: inf.memory.textures, gente: (S.gente || []).length };
                  inf.autoReset = true;
                  ok(m);
                })
              );
            })
        );
      }
    }
    await p.close();
  }
  await b.close();
  fs.writeFileSync(path.join(DIR, 'medidas.json'), JSON.stringify({ etiqueta, hash, fecha: new Date().toISOString(), medidas, errores }, null, 1));
  pagina();
  console.log('galería ' + etiqueta + ': ' + hechas.length + ' vistas');
  console.log('errores: ' + (errores.length ? errores.slice(0, 8).join(' | ') : 'ninguno'));
  console.log('página: ' + path.join(DIR, 'index.html'));
})();

// Página de comparación: cada vista junto a la misma vista de la galería anterior (por orden de nombre de carpeta)
function pagina() {
  const sets = fs
    .readdirSync(RAIZ)
    .filter(d => fs.existsSync(path.join(RAIZ, d, 'medidas.json')))
    .sort();
  const i = sets.indexOf(etiqueta),
    ant = i > 0 ? sets[i - 1] : null;
  const leer = d => {
    try {
      return JSON.parse(fs.readFileSync(path.join(RAIZ, d, 'medidas.json'), 'utf8')).medidas;
    } catch (e) {
      return {};
    }
  };
  const mA = ant ? leer(ant) : {},
    mN = leer(etiqueta);
  const fotos = fs
    .readdirSync(DIR)
    .filter(f => f.endsWith('.png'))
    .sort();
  const dato = m => (m ? m.llamadas + ' llamadas, ' + Math.round(m.tri / 1000) + ' mil triángulos' : '');
  const filas = fotos
    .map(f => {
      const n = f.replace('.png', ''),
        hayAnt = ant && fs.existsSync(path.join(RAIZ, ant, f));
      return `<section><h2>${n}</h2><div class="par">${
        hayAnt ? `<figure><img src="../${ant}/${f}" loading="lazy"><figcaption>Antes (${ant}) ${dato(mA[n])}</figcaption></figure>` : ''
      }<figure><img src="${f}" loading="lazy"><figcaption>Ahora (${etiqueta}) ${dato(mN[n])}</figcaption></figure></div></section>`;
    })
    .join('\n');
  const css =
    'body{font-family:system-ui,sans-serif;background:#111;color:#eee;margin:16px}h1{font-size:20px}h2{font-size:15px;margin:22px 0 6px}.par{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:10px}img{width:100%;display:block;border-radius:6px}figcaption{font-size:12px;color:#aaa;margin-top:4px}a{color:#7fd}';
  fs.writeFileSync(
    path.join(DIR, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>Galería ${etiqueta}</title><style>${css}</style><h1>Galería ${etiqueta}${ant ? ' frente a ' + ant : ''}</h1><p><a href="../index.html">Todas las galerías</a></p>${filas}`
  );
  fs.writeFileSync(
    path.join(RAIZ, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>Galerías</title><style>${css}</style><h1>Galerías de referencia</h1><ul>${sets
      .slice()
      .reverse()
      .map(s => `<li><a href="${s}/index.html">${s}</a></li>`)
      .join('')}</ul>`
  );
}
