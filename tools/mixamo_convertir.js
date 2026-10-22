// Convierte los FBX de Mixamo a glb en Edge (FBXLoader + GLTFExporter de Three): personajes con piel (texturas a 1024) y una animación por archivo. Uso: node tools/mixamo_convertir.js [carpeta]
// Entrada: <carpeta>/personajes/*.fbx y <carpeta>/animaciones/*.fbx. Salida: <carpeta>/glb/personajes/*.glb y <carpeta>/glb/animaciones/*.glb (fuera de git).
const { chromium } = require('playwright');
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const carpeta = process.argv[2] || 'C:/Users/Dabvid-/mixamo';
const raiz = path.resolve(__dirname, '..');
const srv = http
  .createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    if (q.method === 'POST') {
      const ch = [];
      q.on('data', c => ch.push(c));
      return q.on('end', () => {
        const f = path.join(carpeta, 'glb', u.slice(5));
        fs.mkdirSync(path.dirname(f), { recursive: true });
        fs.writeFileSync(f, Buffer.concat(ch));
        r.end('ok');
      });
    }
    if (u === '/') {
      r.setHeader('content-type', 'text/html');
      return r.end('<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script><body>');
    }
    const f = u.startsWith('/mix/') ? path.join(carpeta, u.slice(5)) : path.join(raiz, u);
    fs.readFile(f, (e, d) => {
      if (e) {
        r.statusCode = 404;
        return r.end();
      }
      r.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream');
      r.end(d);
    });
  })
  .listen(8099);
(async () => {
  const lista = d =>
    fs
      .readdirSync(path.join(carpeta, d))
      .filter(f => f.endsWith('.fbx'))
      .map(f => d + '/' + f);
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message.slice(0, 300)));
  await p.goto('http://localhost:8099/');
  const r = await p.evaluate(
    async archivos => {
      const THREE = await import('three');
      const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
      const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
      const nombre = a => a.split('/').pop().replace('.fbx', '');
      const out = [];
      function reducir(img, max) {
        if (!img || !img.width || img.width <= max) return img;
        const c = document.createElement('canvas'),
          k = max / Math.max(img.width, img.height);
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        return c;
      }
      for (const a of archivos) {
        const esAnim = a.startsWith('animaciones');
        const buf = await (await fetch('/mix/' + a)).arrayBuffer();
        const g = new FBXLoader().parse(buf, '');
        const n = nombre(a);
        const clip = g.animations.find(c => c.tracks.length) || null;
        g.name = esAnim ? 'Armature' : n;
        if (esAnim) {
          // solo esqueleto y clip
          const quita = [];
          g.traverse(o => {
            if (o.isMesh) quita.push(o);
          });
          quita.forEach(o => o.parent.remove(o));
        } else {
          const MAPAS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'specularMap', 'bumpMap'];
          for (let i = 0; i < 100; i++) {
            let falta = false;
            g.traverse(o => {
              if (o.isMesh)
                [].concat(o.material).forEach(m =>
                  MAPAS.forEach(k => {
                    if (m[k] && !(m[k].image && m[k].image.width)) falta = true;
                  })
                );
            });
            if (!falta) break;
            await new Promise(r => setTimeout(r, 100));
          }
          g.traverse(o => {
            if (!o.isMesh) return;
            [].concat(o.material).forEach(m => {
              MAPAS.forEach(k => {
                if (m[k] && !(m[k].image && m[k].image.width)) m[k] = null;
                if (m[k] && m[k].image) {
                  const im = reducir(m[k].image, 1024);
                  if (im !== m[k].image) {
                    const t = new THREE.CanvasTexture(im);
                    t.colorSpace = m[k].colorSpace;
                    t.flipY = m[k].flipY;
                    t.wrapS = m[k].wrapS;
                    t.wrapT = m[k].wrapT;
                    m[k] = t;
                  }
                }
              });
            });
          });
        }
        // los huesos salen como mixamorig7Hips, mixamorig12Hips...: se unifican para que cualquier animación sirva a cualquier personaje
        g.traverse(o => {
          o.name = o.name.replace(/^mixamorig\d*/, 'mixamorig');
        });
        if (clip) {
          clip.name = n;
          clip.tracks.forEach(t => {
            t.name = t.name.replace(/^mixamorig\d*/, 'mixamorig');
          });
        }
        g.scale.setScalar(0.01);
        g.updateMatrixWorld(true);
        const exp = new GLTFExporter();
        const glb = await exp.parseAsync(g, { binary: true, animations: esAnim && clip ? [clip] : [], onlyVisible: false, maxTextureSize: 1024 });
        const dest = (esAnim ? 'animaciones/' : 'personajes/') + n + '.glb';
        await fetch('/glb/' + dest, { method: 'POST', body: glb });
        out.push(dest + ' ' + (glb.byteLength / 1048576).toFixed(2) + ' MB' + (clip ? ' ' + clip.duration.toFixed(2) + 's' : ''));
      }
      return out;
    },
    [...lista('personajes'), ...lista('animaciones')]
  );
  console.log(r.join('\n'));
  await b.close();
  srv.close();
})();
