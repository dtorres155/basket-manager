// Convierte personajes de Microsoft Rocketbox (MIT, https://github.com/microsoft/Microsoft-Rocketbox) a glb en Edge (FBXLoader + TGALoader +
// GLTFExporter de Three), y pasa las animaciones de Mixamo a su esqueleto (3ds Max Biped: Bip01_…). Punto 107 de la hoja de ruta 2.
// Entrada: recursos/rocketbox/<Personaje>/<Personaje>.fbx con sus texturas *.tga (color, normal y opacidad; tools/rocketbox_descargar.js).
// Salida: recursos/rocketbox/glb/personajes/<id>.glb (piezas cuerpo, cabeza y pelo, cada una con su material; el pelo con la opacidad en
// el alfa de su textura; texturas a 1024; mirando a +Z como los de Mixamo; en metros) y recursos/rocketbox/glb/anim/<clip>.glb (solo el
// esqueleto y la animación, pasadas desde los clips de Mixamo de recursos/pesados/modelos/personas/mixamo/anim con c01 como pose de unión).
// Uso: node tools/rocketbox_convertir.js [Personaje ...]   (sin nombres, todos los que haya; las animaciones se pasan sobre el primero)
const { chromium } = require('playwright');
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const raiz = path.resolve(__dirname, '..'),
  RB = path.join(raiz, 'recursos/rocketbox'),
  MX = path.join(raiz, 'recursos/pesados/modelos/personas/mixamo');
const srv = http
  .createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    if (q.method === 'POST') {
      const ch = [];
      q.on('data', c => ch.push(c));
      return q.on('end', () => {
        const f = path.join(RB, 'glb', u.slice(5));
        fs.mkdirSync(path.dirname(f), { recursive: true });
        fs.writeFileSync(f, Buffer.concat(ch));
        r.end('ok');
      });
    }
    if (u === '/') {
      r.setHeader('content-type', 'text/html');
      return r.end('<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script><body>');
    }
    let f;
    if (u.startsWith('/rb/')) {
      // las texturas se piden con la ruta que trae el FBX: se busca por nombre en la carpeta del personaje
      const partes = u.slice(4).split('/');
      f = path.join(RB, partes[0], partes[partes.length - 1].split('\\').pop());
    } else if (u.startsWith('/mx/')) f = path.join(MX, u.slice(4));
    else f = path.join(raiz, u);
    fs.readFile(f, (e, d) => {
      if (e) {
        r.statusCode = 404;
        return r.end();
      }
      r.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream');
      r.end(d);
    });
  })
  .listen(8097);
// huesos de Mixamo -> Biped (los dedos: pulgar 0, índice 1, corazón 2, anular 3, meñique 4)
const MAPA = { Bip01: 'Hips', Bip01_Spine: 'Spine', Bip01_Spine1: 'Spine1', Bip01_Spine2: 'Spine2', Bip01_Neck: 'Neck', Bip01_Head: 'Head' };
for (const [l, L] of [
  ['L', 'Left'],
  ['R', 'Right']
]) {
  Object.assign(MAPA, {
    ['Bip01_' + l + '_Clavicle']: L + 'Shoulder',
    ['Bip01_' + l + '_UpperArm']: L + 'Arm',
    ['Bip01_' + l + '_Forearm']: L + 'ForeArm',
    ['Bip01_' + l + '_Hand']: L + 'Hand',
    ['Bip01_' + l + '_Thigh']: L + 'UpLeg',
    ['Bip01_' + l + '_Calf']: L + 'Leg',
    ['Bip01_' + l + '_Foot']: L + 'Foot',
    ['Bip01_' + l + '_Toe0']: L + 'ToeBase'
  });
  ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].forEach((d, k) => {
    MAPA['Bip01_' + l + '_Finger' + k] = L + 'Hand' + d + '1';
    MAPA['Bip01_' + l + '_Finger' + k + '1'] = L + 'Hand' + d + '2';
    MAPA['Bip01_' + l + '_Finger' + k + '2'] = L + 'Hand' + d + '3';
  });
}
(async () => {
  const sel = process.argv.slice(2),
    pjs = fs
      .readdirSync(RB)
      .filter(d => d !== 'glb' && fs.existsSync(path.join(RB, d, d + '.fbx')))
      .filter(d => !sel.length || sel.includes(d)),
    clips = fs
      .readdirSync(path.join(MX, 'anim'))
      .filter(f => f.endsWith('.glb'))
      .map(f => f.replace('.glb', ''));
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message.slice(0, 300)));
  await p.goto('http://localhost:8097/');
  if (process.env.DEPURAR) await p.evaluate(() => (window.__depurar = true));
  const r = await p.evaluate(
    async ([pjs, clips, MAPA]) => {
      const THREE = await import('three');
      const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
      const { TGALoader } = await import('three/addons/loaders/TGALoader.js');
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
      const out = [];
      // imagen de una textura (DataTexture de TGA o imagen) en un lienzo de como mucho max px
      const lienzo = (tex, max) => {
        const im = tex.image,
          c = document.createElement('canvas');
        c.width = im.width;
        c.height = im.height;
        const x = c.getContext('2d');
        if (im.data) {
          const d = new ImageData(im.width, im.height);
          if (im.data.length === im.width * im.height * 4) d.data.set(im.data);
          else for (let i = 0, j = 0; i < im.width * im.height; i++, j += 3) d.data.set([im.data[j], im.data[j + 1], im.data[j + 2], 255], i * 4);
          x.putImageData(d, 0, 0);
        } else if (im instanceof HTMLImageElement || im instanceof HTMLCanvasElement || im instanceof ImageBitmap) x.drawImage(im, 0, 0);
        else
          throw new Error('imagen rara: ' + Object.prototype.toString.call(im) + ' ' + Object.keys(im).join(',') + ' ' + (im.data ? Object.prototype.toString.call(im.data) : ''));
        if (im.width <= max) return c;
        const c2 = document.createElement('canvas');
        c2.width = c2.height = max;
        c2.getContext('2d').drawImage(c, 0, 0, max, max);
        return c2;
      };
      const texDe = (c, tex, srgb) => {
        const t = new THREE.CanvasTexture(c);
        t.flipY = tex.flipY;
        t.wrapS = tex.wrapS;
        t.wrapT = tex.wrapT;
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        return t;
      };
      // esqueleto de Mixamo en la pose de unión (c01) y sus clips
      const gl = new GLTFLoader(),
        cargar = u => new Promise((ok, ko) => gl.load(u, ok, undefined, ko)),
        src = await cargar('/mx/c01.glb'),
        srcB = {};
      src.scene.traverse(o => {
        if (o.isBone && !srcB[o.name]) srcB[o.name] = o;
      });
      src.scene.updateMatrixWorld(true);
      const anims = {};
      for (const c of clips) anims[c] = (await cargar('/mx/anim/' + c + '.glb')).animations[0];
      const delante = (B, pie, punta) => {
        const a = new THREE.Vector3(),
          b = new THREE.Vector3();
        B[pie].getWorldPosition(a);
        B[punta].getWorldPosition(b);
        return b.sub(a).setY(0).normalize();
      };
      const fSrc = delante(srcB, 'mixamorigLeftFoot', 'mixamorigLeftToeBase');
      let animsHechas = false;
      for (const pj of pjs) {
        const man = new THREE.LoadingManager();
        man.addHandler(/\.tga$/i, new TGALoader(man));
        const buf = await (await fetch('/rb/' + pj + '/' + pj + '.fbx')).arrayBuffer();
        const g = new FBXLoader(man).parse(buf, '/rb/' + pj + '/');
        // espera a las texturas
        for (let i = 0; i < 200; i++) {
          let falta = false;
          g.traverse(o => {
            if (o.isMesh)
              [].concat(o.material).forEach(m =>
                ['map', 'normalMap', 'alphaMap'].forEach(k => {
                  if (m[k] && !(m[k].image && m[k].image.width > 1 && (m[k].image.data || !('data' in m[k].image)))) falta = true;
                })
              );
          });
          if (!falta) break;
          await new Promise(ok => setTimeout(ok, 100));
        }
        // la pose en la que se ató la piel (la de reposo del archivo es otra: los brazos se metían en el cuerpo); antes de escalar, porque
        // las matrices de unión están en las unidades del FBX
        {
          g.updateMatrixWorld(true);
          let err = 0;
          g.traverse(o => {
            if (!o.isSkinnedMesh) return;
            o.skeleton.bones.forEach((bo, i) => {
              const M = new THREE.Matrix4().multiplyMatrices(bo.matrixWorld, o.skeleton.boneInverses[i]);
              M.elements.forEach((v, k) => (err = Math.max(err, Math.abs(v - [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1][k]))));
            });
          });
          g.traverse(o => {
            if (o.isSkinnedMesh) o.skeleton.pose();
          });
          g.updateMatrixWorld(true);
          out.push(pj + ': diferencia entre reposo y unión ' + err.toFixed(3));
        }
        g.scale.setScalar(0.01);
        g.updateMatrixWorld(true);
        const B = {};
        g.traverse(o => {
          if (o.isBone) B[o.name] = o;
        });
        // que mire a +Z como los de Mixamo
        const fT = delante(B, 'Bip01_L_Foot', 'Bip01_L_Toe0');
        const giro = Math.atan2(fSrc.x, fSrc.z) - Math.atan2(fT.x, fT.z);
        g.rotation.y = Math.round(giro / (Math.PI / 2)) * (Math.PI / 2);
        g.updateMatrixWorld(true);
        // una pieza por material (cuerpo, cabeza, pelo), con la opacidad del pelo en el alfa de su textura
        const mallas = [];
        g.traverse(o => {
          if (o.isSkinnedMesh) mallas.push(o);
        });
        for (const m of mallas) {
          const mats = [].concat(m.material),
            geo = m.geometry;
          mats.forEach((mat, mi) => {
            const grupos = geo.groups.length
              ? geo.groups.filter(gr => gr.materialIndex === mi)
              : [{ start: 0, count: geo.index ? geo.index.count : geo.attributes.position.count }];
            if (!grupos.length) return;
            const ng = new THREE.BufferGeometry();
            for (const k of Object.keys(geo.attributes)) {
              const a = geo.attributes[k],
                arr = [];
              for (const gr of grupos)
                for (let i = gr.start; i < gr.start + gr.count; i++) {
                  const v = geo.index ? geo.index.getX(i) : i;
                  for (let c = 0; c < a.itemSize; c++) arr.push(a.array[v * a.itemSize + c]);
                }
              ng.setAttribute(k, new THREE.BufferAttribute(new a.array.constructor(arr), a.itemSize, a.normalized));
            }
            const nm = new THREE.MeshStandardMaterial({ name: mat.name, roughness: 0.75, metalness: 0 });
            if (mat.map && mat.map.image) {
              const c = lienzo(mat.map, 1024);
              if (mat.alphaMap && mat.alphaMap.image) {
                const ca = lienzo(mat.alphaMap, c.width),
                  x = c.getContext('2d'),
                  d = x.getImageData(0, 0, c.width, c.height),
                  da = ca.getContext('2d').getImageData(0, 0, c.width, c.height);
                for (let i = 0; i < d.data.length; i += 4) d.data[i + 3] = da.data[i];
                x.putImageData(d, 0, 0);
                nm.transparent = true;
                nm.alphaTest = 0.5;
                nm.side = THREE.DoubleSide;
              }
              nm.map = texDe(c, mat.map, true);
            }
            if (mat.normalMap && mat.normalMap.image) nm.normalMap = texDe(lienzo(mat.normalMap, 1024), mat.normalMap, false);
            const pieza = new THREE.SkinnedMesh(ng, nm);
            pieza.name = pj + '_' + (/opacity/i.test(mat.name) ? 'Hair' : /head/i.test(mat.name) ? 'Head' : 'Body');
            pieza.position.copy(m.position);
            pieza.quaternion.copy(m.quaternion);
            pieza.scale.copy(m.scale);
            m.parent.add(pieza);
            pieza.bind(m.skeleton, m.bindMatrix);
          });
          m.parent.remove(m);
        }
        g.name = pj;
        g.animations = [];
        g.updateMatrixWorld(true);
        // animaciones de Mixamo pasadas a este esqueleto (sobre el primer personaje: todos los de Rocketbox comparten esqueleto)
        if (!animsHechas) {
          animsHechas = true;
          const qSB = {},
            qTB = {},
            orden = [];
          g.traverse(o => {
            if (o.isBone && MAPA[o.name] && srcB['mixamorig' + MAPA[o.name]]) orden.push(o);
          });
          orden.forEach(t => {
            qSB[t.name] = srcB['mixamorig' + MAPA[t.name]].getWorldQuaternion(new THREE.Quaternion());
            qTB[t.name] = t.getWorldQuaternion(new THREE.Quaternion());
          });
          // Las dos poses de unión no son iguales (Mixamo, brazos abajo; Rocketbox, en T): se lleva la de Mixamo a la de Rocketbox girando
          // cada hueso para que apunte hacia su siguiente hueso como en Rocketbox (qSR), y la animación se copia respecto a esa pose
          const SIG = { Bip01_Spine: 'Bip01_Spine1', Bip01_Spine1: 'Bip01_Spine2', Bip01_Spine2: 'Bip01_Neck', Bip01_Neck: 'Bip01_Head' };
          ['L', 'R'].forEach(l => {
            const k = 'Bip01_' + l + '_';
            Object.assign(SIG, {
              [k + 'Clavicle']: k + 'UpperArm',
              [k + 'UpperArm']: k + 'Forearm',
              [k + 'Forearm']: k + 'Hand',
              [k + 'Hand']: k + 'Finger2',
              [k + 'Thigh']: k + 'Calf',
              [k + 'Calf']: k + 'Foot',
              [k + 'Foot']: k + 'Toe0'
            });
            for (let d = 0; d < 5; d++) Object.assign(SIG, { [k + 'Finger' + d]: k + 'Finger' + d + '1', [k + 'Finger' + d + '1']: k + 'Finger' + d + '2' });
          });
          const qSR = {},
            pos = o => o.getWorldPosition(new THREE.Vector3());
          orden.forEach(t => {
            const sig = SIG[t.name];
            qSR[t.name] = qSB[t.name].clone();
            if (!sig || !B[sig] || !MAPA[sig] || !srcB['mixamorig' + MAPA[sig]]) return;
            const ds = pos(srcB['mixamorig' + MAPA[sig]])
                .sub(pos(srcB['mixamorig' + MAPA[t.name]]))
                .normalize(),
              dt = pos(B[sig]).sub(pos(t)).normalize();
            qSR[t.name] = new THREE.Quaternion().setFromUnitVectors(ds, dt).multiply(qSB[t.name]);
          });
          const loc0 = {};
          g.traverse(o => {
            if (o.isBone) loc0[o.name] = [o.position.clone(), o.quaternion.clone()];
          });
          const hS = srcB.mixamorigHips.getWorldPosition(new THREE.Vector3()),
            hT = B.Bip01.getWorldPosition(new THREE.Vector3()),
            razon = hT.y / Math.max(0.01, hS.y);
          for (const nombre of clips) {
            const clip = anims[nombre];
            if (!clip) continue;
            const mixer = new THREE.AnimationMixer(src.scene),
              act = mixer.clipAction(clip);
            act.play();
            const fps = 30,
              n = Math.max(2, Math.round(clip.duration * fps) + 1),
              tiempos = [],
              Q = {},
              Ppos = [],
              q = new THREE.Quaternion(),
              qp = new THREE.Quaternion(),
              v = new THREE.Vector3();
            orden.forEach(t => (Q[t.name] = []));
            for (let i = 0; i < n; i++) {
              const t = Math.min(clip.duration, i / fps);
              tiempos.push(t);
              act.time = t;
              mixer.update(0);
              src.scene.updateMatrixWorld(true);
              // giro en el mundo respecto a la pose de unión, copiado hueso a hueso (padres antes que hijos)
              for (const tb of orden) {
                const sb = srcB['mixamorig' + MAPA[tb.name]];
                sb.getWorldQuaternion(q);
                q.multiply(qSR[tb.name].clone().invert()).multiply(qTB[tb.name]);
                tb.parent.getWorldQuaternion(qp);
                tb.quaternion.copy(qp.invert().multiply(q));
                tb.updateMatrixWorld(true);
                Q[tb.name].push(...tb.quaternion.toArray());
              }
              // posición de la cadera: el desplazamiento de la de Mixamo a la escala de este esqueleto
              srcB.mixamorigHips.getWorldPosition(v);
              v.sub(hS).multiplyScalar(razon).add(hT);
              B.Bip01.parent.worldToLocal(v);
              Ppos.push(v.x, v.y, v.z);
              B.Bip01.position.copy(v);
              B.Bip01.updateMatrixWorld(true);
              if (window.__depurar && nombre === 'idle' && i === 30) {
                const dir = (a, b2) => b2.getWorldPosition(new THREE.Vector3()).sub(a.getWorldPosition(new THREE.Vector3())).normalize();
                for (const [s1, s2, t1, t2] of [
                  ['LeftArm', 'LeftForeArm', 'Bip01_L_UpperArm', 'Bip01_L_Forearm'],
                  ['LeftForeArm', 'LeftHand', 'Bip01_L_Forearm', 'Bip01_L_Hand'],
                  ['LeftUpLeg', 'LeftLeg', 'Bip01_L_Thigh', 'Bip01_L_Calf'],
                  ['LeftShoulder', 'LeftArm', 'Bip01_L_Clavicle', 'Bip01_L_UpperArm']
                ]) {
                  const ds = dir(srcB['mixamorig' + s1], srcB['mixamorig' + s2]),
                    dt = dir(B[t1], B[t2]);
                  out.push(s1 + ' mixamo ' + ds.toArray().map(x => x.toFixed(2)) + ' rocketbox ' + dt.toArray().map(x => x.toFixed(2)));
                }
                // en la pose de unión
                out.push(
                  'padres: ' +
                    ['mixamorigLeftArm', 'mixamorigLeftShoulder'].map(n => n + '<-' + srcB[n].parent.name).join(' ') +
                    ' | ' +
                    ['Bip01_L_UpperArm', 'Bip01_L_Clavicle'].map(n => n + '<-' + B[n].parent.name).join(' ')
                );
              }
            }
            const pistas = orden
                .map(tb => new THREE.QuaternionKeyframeTrack(tb.name + '.quaternion', tiempos, Q[tb.name]))
                .concat([new THREE.VectorKeyframeTrack('Bip01.position', tiempos, Ppos)]),
              rclip = new THREE.AnimationClip(nombre, clip.duration, pistas);
            // a la pose de unión antes de exportar el esqueleto
            g.traverse(o => {
              if (o.isBone && loc0[o.name]) {
                o.position.copy(loc0[o.name][0]);
                o.quaternion.copy(loc0[o.name][1]);
              }
            });
            g.updateMatrixWorld(true);
            const esq = g.clone(true);
            const quita = [];
            esq.traverse(o => {
              if (o.isMesh) quita.push(o);
            });
            quita.forEach(o => o.parent.remove(o));
            esq.name = 'Armature';
            const glb = await new GLTFExporter().parseAsync(esq, { binary: true, animations: [rclip], onlyVisible: false });
            await fetch('/glb/anim/' + nombre + '.glb', { method: 'POST', body: glb });
            out.push('anim/' + nombre + '.glb ' + (glb.byteLength / 1024).toFixed(0) + ' KB ' + clip.duration.toFixed(2) + ' s');
          }
        }
        const glb = await new GLTFExporter().parseAsync(g, { binary: true, animations: [], onlyVisible: false, maxTextureSize: 1024 });
        await fetch('/glb/personajes/' + pj + '.glb', { method: 'POST', body: glb });
        out.push('personajes/' + pj + '.glb ' + (glb.byteLength / 1048576).toFixed(2) + ' MB, giro ' + Math.round((g.rotation.y * 180) / Math.PI) + ' grados');
      }
      return out;
    },
    [pjs, clips, MAPA]
  );
  console.log(r.join('\n'));
  await b.close();
  srv.close();
})();
