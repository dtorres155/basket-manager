// Mira los FBX de Mixamo (personajes y animaciones) en Edge con el FBXLoader de Three y cuenta huesos, mallas, triángulos y texturas. Uso: node tools/mixamo_info.js [carpeta]
const { chromium } = require('playwright');
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const carpeta = process.argv[2] || 'C:/Users/Dabvid-/mixamo';
const raiz = path.resolve(__dirname, '..');
const srv = http
  .createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    let f = u.startsWith('/mix/') ? path.join(carpeta, u.slice(5)) : path.join(raiz, u);
    if (u === '/') {
      r.setHeader('content-type', 'text/html');
      return r.end('<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script><body>');
    }
    fs.readFile(f, (e, d) => {
      if (e) {
        r.statusCode = 404;
        return r.end();
      }
      r.setHeader('content-type', f.endsWith('.js') || f.endsWith('.mjs') ? 'text/javascript' : 'application/octet-stream');
      r.end(d);
    });
  })
  .listen(8099);
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await b.newPage();
  p.on('console', m => console.log('console', m.text().slice(0, 200)));
  p.on('pageerror', e => console.log('ERR', e.message.slice(0, 300)));
  await p.goto('http://localhost:8099/');
  const archivos = ['personajes/hombre1.fbx', 'personajes/mujer1.fbx', 'animaciones/walking.fbx', 'animaciones/sitting_idle.fbx'];
  const r = await p.evaluate(async archivos => {
    const THREE = await import('three');
    const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
    const out = [];
    for (const a of archivos) {
      const buf = await (await fetch('/mix/' + a)).arrayBuffer();
      const g = new FBXLoader().parse(buf, '');
      let huesos = 0,
        mallas = 0,
        tris = 0;
      const tex = [],
        hueso0 = [];
      g.traverse(o => {
        if (o.isBone) {
          huesos++;
          if (hueso0.length < 4) hueso0.push(o.name);
        }
        if (o.isMesh) {
          mallas++;
          tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
          [].concat(o.material).forEach(m =>
            ['map', 'normalMap', 'roughnessMap', 'specularMap'].forEach(k => {
              if (m[k] && m[k].image) tex.push(k + ' ' + m[k].image.width + 'x' + m[k].image.height);
            })
          );
        }
      });
      const bb = new THREE.Box3().setFromObject(g),
        s = bb.getSize(new THREE.Vector3());
      out.push({
        a,
        huesos,
        mallas,
        tris: Math.round(tris),
        hueso0,
        tex: tex.slice(0, 8),
        tam: [s.x, s.y, s.z].map(v => +v.toFixed(2)),
        escala: g.scale.x,
        anims: g.animations.map(c => c.name + ' ' + c.duration.toFixed(2) + 's ' + c.tracks.length + ' pistas')
      });
    }
    return out;
  }, archivos);
  console.log(JSON.stringify(r, null, 1));
  await b.close();
  srv.close();
})();
