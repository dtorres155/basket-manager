/* Persona 3D del mundo: modelo de Quaternius con piel, pelo y ropa recoloreados, complementos pegados a los huesos, una sola malla fundida con color por vértice y sombra bajo los pies.
   Se separó de sede3d.js: GM.sedePersonaje({ cargar, ANIM, textura, complementos }) devuelve la función personaje. */
(function () {
  GM.sedePersonaje = function (ctx) {
    let _mSombra = null;
    // Personas realistas de Mixamo (solo ordenador, calidad alta): modelos y clips en modelos/personas/mixamo/ (recursos/pesados, ver tools/mixamo_instalar.js).
    // Sin esa carpeta (web y móvil) todo sigue con las personas de Quaternius. lista.json: { h: [ids], m: [ids], n: [ids] }.
    const MX_CLIPS = { idle: 'idle', walk: 'walking', sprint: 'running', sit: 'sitting_idle', talk: 'talking', dribble: 'dribble' };
    const MX_ANIM = {
      idle: 'idle',
      walk: 'walk',
      sprint: 'sprint',
      sit: 'sit',
      'interact-right': 'talk',
      'interact-left': 'talk',
      'emote-yes': 'talk',
      'emote-no': 'idle',
      crouch: 'idle',
      dribble: 'dribble'
    };
    const MX_HUESOS = {
      Head: 'Head',
      Neck: 'Neck',
      Hips: 'Hips',
      Spine: 'Spine',
      UpperArmL: 'LeftArm',
      UpperArmR: 'RightArm',
      UpperLegL: 'LeftUpLeg',
      UpperLegR: 'RightUpLeg',
      Foot: 'LeftFoot'
    };
    let _lista = null;
    function listaMixamo() {
      if (!_lista)
        _lista = fetch('modelos/personas/mixamo/lista.json')
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null);
      return _lista;
    }
    // Una malla por persona (punto 105 de la hoja de ruta 2): los modelos de Mixamo traen de 2 a 9 piezas (cuerpo, camisa, pelo…), cada una
    // con su propia copia recortada del esqueleto (mixamorigHips_1, _2…), que las animaciones no mueven. Se funden una vez por modelo en
    // la plantilla (g.scene, antes de clonarla): una sola malla atada a los huesos que mueven las animaciones (el primero de cada nombre),
    // con las texturas en una lámina de 2 x 2 casillas (color y relieve) y el pelo recortado por transparencia y por las dos caras.
    // De unas 6 llamadas de dibujo por persona (y otras tantas de sombra) a 1. Requiere que la plantilla esté en la pose de unión (lo está).
    function fundirMixamo(g) {
      if (g.fundido !== undefined || typeof document === 'undefined' || window.__sinFundir) return g.fundido;
      g.fundido = false;
      const esc = g.scene;
      esc.updateMatrixWorld(true);
      const piezas = [];
      esc.traverse(o => {
        if (o.isSkinnedMesh) piezas.push(o);
      });
      if (piezas.length < 2) return false;
      const base = n => n.replace(/_\d+$/, ''),
        canon = new Map();
      esc.traverse(o => {
        if (o.isBone && o.name === base(o.name) && !canon.has(o.name)) canon.set(o.name, o);
      });
      const huesos = [...canon.values()],
        idx = new Map(huesos.map((b, i) => [b.name, i])),
        hip = idx.has('mixamorigHips') ? idx.get('mixamorigHips') : 0;
      // lámina de texturas: una casilla por mapa de color distinto
      const mapas = [];
      piezas.forEach(p => {
        if (p.material.map && mapas.indexOf(p.material.map) < 0) mapas.push(p.material.map);
      });
      if (!mapas.length || mapas.length > 4 || !mapas[0].image) return false;
      const L = mapas.length > 1 ? 2 : 1,
        W = mapas[0].image.width || 1024,
        H = mapas[0].image.height || 1024,
        lienzo = () => {
          const c = document.createElement('canvas');
          c.width = W * L;
          c.height = H * L;
          return c;
        },
        cC = lienzo(),
        cN = lienzo(),
        xC = cC.getContext('2d'),
        xN = cN.getContext('2d');
      xN.fillStyle = 'rgb(128,128,255)'; // relieve plano donde no hay mapa
      xN.fillRect(0, 0, cN.width, cN.height);
      const normales = mapas.map(() => null);
      piezas.forEach(p => {
        const k = mapas.indexOf(p.material.map);
        if (k >= 0 && p.material.normalMap && !normales[k]) normales[k] = p.material.normalMap;
      });
      mapas.forEach((m, k) => {
        const x = (k % L) * W,
          y = Math.floor(k / L) * H;
        xC.drawImage(m.image, x, y, W, H);
        if (normales[k] && normales[k].image) xN.drawImage(normales[k].image, x, y, W, H);
      });
      // geometría: posiciones y normales en el espacio de la plantilla, índices de hueso al esqueleto canónico, UV a su casilla
      const P = [],
        N = [],
        U = [],
        SI = [],
        SW = [],
        I = [],
        inv = new THREE.Matrix4().copy(esc.matrixWorld).invert(),
        M = new THREE.Matrix4(),
        NM = new THREE.Matrix3(),
        v = new THREE.Vector3();
      piezas.forEach(p => {
        const geo = p.geometry,
          pos = geo.attributes.position,
          nor = geo.attributes.normal,
          uv = geo.attributes.uv,
          si = geo.attributes.skinIndex,
          sw = geo.attributes.skinWeight,
          k = Math.max(0, mapas.indexOf(p.material.map)),
          cu = k % L,
          cv = Math.floor(k / L),
          mapa = p.skeleton.bones.map(b => (idx.has(base(b.name)) ? idx.get(base(b.name)) : hip)),
          pelo = p.material.transparent || p.material.alphaTest > 0;
        M.multiplyMatrices(inv, p.matrixWorld);
        NM.getNormalMatrix(M);
        const caras = pelo ? [1, -1] : [1]; // el pelo y las pestañas, por las dos caras (una copia con el giro y la normal al revés)
        caras.forEach(lado => {
          const b0 = P.length / 3;
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(M);
            P.push(v.x, v.y, v.z);
            if (nor) {
              v.fromBufferAttribute(nor, i).applyMatrix3(NM).normalize().multiplyScalar(lado);
              N.push(v.x, v.y, v.z);
            } else N.push(0, 1, 0);
            const u0 = uv ? Math.min(0.999, Math.max(0.001, uv.getX(i))) : 0.5,
              v0 = uv ? Math.min(0.999, Math.max(0.001, uv.getY(i))) : 0.5;
            U.push((u0 + cu) / L, (v0 + cv) / L);
            for (let c = 0; c < 4; c++) {
              SI.push(si ? mapa[si.getComponent(i, c)] || hip : hip);
              SW.push(sw ? sw.getComponent(i, c) : c === 0 ? 1 : 0);
            }
          }
          const ind = geo.index;
          const n = ind ? ind.count : pos.count;
          for (let t = 0; t < n; t += 3) {
            const a = ind ? ind.getX(t) : t,
              b = ind ? ind.getX(t + 1) : t + 1,
              c = ind ? ind.getX(t + 2) : t + 2;
            if (lado > 0) I.push(b0 + a, b0 + b, b0 + c);
            else I.push(b0 + a, b0 + c, b0 + b);
          }
        });
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
      geo.setIndex(I);
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      const tC = new THREE.CanvasTexture(cC),
        tN = new THREE.CanvasTexture(cN);
      tC.flipY = tN.flipY = false; // las UV de glTF empiezan arriba
      tC.colorSpace = THREE.SRGBColorSpace;
      tC.anisotropy = tN.anisotropy = 4;
      const m0 = piezas[0].material,
        mat = new THREE.MeshStandardMaterial({ map: tC, normalMap: tN, roughness: m0.roughness !== undefined ? m0.roughness : 0.8, metalness: 0, alphaTest: 0.5 });
      mat.alphaToCoverage = true;
      const malla = new THREE.SkinnedMesh(geo, mat);
      malla.name = 'cuerpo';
      esc.add(malla);
      esc.updateMatrixWorld(true);
      malla.bind(new THREE.Skeleton(huesos), malla.matrixWorld);
      piezas.forEach(p => p.parent && p.parent.remove(p));
      // las cadenas de huesos copiados ya no las usa nadie: fuera (menos nodos que recorrer cada fotograma)
      const sobran = [];
      esc.traverse(o => {
        if (o.isBone && !canon.has(o.name) && o.parent && !(o.parent.isBone && !canon.has(o.parent.name))) sobran.push(o);
      });
      sobran.forEach(o => {
        let usa = false;
        o.traverse(q => {
          if (canon.has(q.name) || q.isMesh) usa = true;
        });
        if (!usa) o.parent.remove(o);
      });
      g.fundido = { piezas: piezas.length, huesos: huesos.length, mapas: mapas.length, sobran: sobran.length };
      return g.fundido;
    }
    async function personajeMixamo(o) {
      if (!GM.campus || GM.campus.config.calidad !== 'alta' || o.escudo || o.hincha || o.rolV || o.sinMixamo || o.edad === 'mayor' || typeof fetch !== 'function') return null;
      const L = await listaMixamo();
      if (!L) return null;
      const pool = o.proporcion === 'nino' ? L.n : /^m-/.test(o.modelo || '') || o.sexo === 'm' ? L.m : L.h;
      if (!pool || !pool.length) return null;
      const id = pool[GM.util.hash(String(o.semilla !== undefined ? o.semilla : [o.modelo, o.altura, o.piel, o.pelo].join('|'))) % pool.length];
      const { cargar, textura } = ctx,
        nombres = Object.keys(MX_CLIPS);
      const [g, ...an] = await Promise.all([cargar('modelos/personas/mixamo/' + id + '.glb'), ...nombres.map(n => cargar('modelos/personas/mixamo/anim/' + MX_CLIPS[n] + '.glb'))]);
      try {
        fundirMixamo(g);
      } catch (e) {
        g.fundido = false;
        if (GM.registro && GM.registro.anotar) GM.registro.anotar('fundir Mixamo ' + id + ': ' + e.message);
      }
      const obj = THREE.clonarEsqueleto(g.scene);
      if (!g.altoBase) g.altoBase = new THREE.Box3().setFromObject(g.scene).getSize(new THREE.Vector3()).y;
      obj.scale.setScalar((o.altura || 178) / 100 / g.altoBase);
      obj.traverse(n => {
        if (n.isMesh) {
          n.castShadow = true;
          n.frustumCulled = false;
        }
      });
      const mixer = new THREE.AnimationMixer(obj),
        clips = {};
      nombres.forEach((n, i) => {
        if (an[i].animations[0]) clips[n] = mixer.clipAction(an[i].animations[0]);
      });
      const acc = {};
      Object.keys(MX_ANIM).forEach(k => {
        if (clips[MX_ANIM[k]]) acc[k] = clips[MX_ANIM[k]];
      });
      const B = {};
      obj.traverse(n => {
        if (n.isBone) B[n.name] = n;
      });
      Object.keys(MX_HUESOS).forEach(k => {
        if (B['mixamorig' + MX_HUESOS[k]]) B[k] = B['mixamorig' + MX_HUESOS[k]];
      });
      return { obj, mixer, acc, huesos: B, altura: o.altura || 178, rangosRopa: null, ropa: o.ropa, edad: o.edad, sexo: o.sexo, rolV: o.rolV, modelo: o.modelo, mixamo: id };
    }
    async function personaje(o) {
      try {
        const m = await personajeMixamo(o);
        if (m) return m;
      } catch (e) {
        if (typeof console !== 'undefined') console.error('personaje Mixamo: ' + e.message + ' ' + String(e.stack).split('\n').slice(1, 4).join(' | '));
      }
      const { cargar, ANIM, textura, complementos } = ctx;
      const [g, an] = await Promise.all([cargar('modelos/personas/' + o.modelo + '.glb'), cargar('modelos/personas/animaciones.glb')]);
      const obj = THREE.clonarEsqueleto(g.scene);
      if (!g.altoBase) g.altoBase = new THREE.Box3().setFromObject(g.scene).getSize(new THREE.Vector3()).y;
      obj.scale.setScalar((o.altura || 178) / 100 / g.altoBase);
      // Rendimiento: todas las piezas (piel, pelo, ropa, ojos...) se funden en UNA malla con el color en los vértices.
      // Antes eran ~11 mallas por persona (y el doble con sombras). Se guardan los tramos de ropa para los petos.
      const color = n => {
        const nm = n.material.name || '';
        if (o.piel && /^Skin/.test(nm)) return o.piel;
        if (o.pelo && /Hair|Eyebrows|Moustache/.test(nm)) return o.pelo;
        if (o.ojos && /^Eye$/.test(nm)) return o.ojos;
        if (o.ropa && /^(Purple|Red_Dark|LightBrown)$/.test(nm)) return o.ropa[0];
        if (o.ropa && /^(LightBlue)$/.test(nm)) return o.ropa[1];
        return '#' + n.material.color.getHexString();
      };
      const piezas = [];
      obj.traverse(n => {
        if (n.isSkinnedMesh) piezas.push(n);
      });
      const hi = piezas[0] ? piezas[0].skeleton.bones.findIndex(b => b.name === 'Head') : -1;
      // quita los triángulos de la piel que cuelgan de la cabeza (para poner la cabeza propia)
      const sinCabeza = (g, hi) => {
        const P = g.attributes.position,
          N = g.attributes.normal,
          SI = g.attributes.skinIndex,
          SW = g.attributes.skinWeight,
          nt = P.count / 3,
          keep = [];
        for (let t = 0; t < nt; t++) {
          let w = 0;
          for (let v = 0; v < 3; v++) for (let k = 0; k < 4; k++) if (SI.getComponent(t * 3 + v, k) === hi) w += SW.getComponent(t * 3 + v, k);
          if (w / 3 < 0.5) keep.push(t);
        }
        if (!keep.length) return null;
        const c = keep.length * 3,
          pp = new Float32Array(c * 3),
          nn = new Float32Array(c * 3),
          si = new Float32Array(c * 4),
          sw = new Float32Array(c * 4);
        keep.forEach((t, j) => {
          for (let v = 0; v < 3; v++) {
            const a = t * 3 + v,
              b = j * 3 + v;
            for (let k = 0; k < 3; k++) {
              pp[b * 3 + k] = P.getComponent(a, k);
              nn[b * 3 + k] = N.getComponent(a, k);
            }
            for (let k = 0; k < 4; k++) {
              si[b * 4 + k] = SI.getComponent(a, k);
              sw[b * 4 + k] = SW.getComponent(a, k);
            }
          }
        });
        const r = new THREE.BufferGeometry();
        r.setAttribute('position', new THREE.BufferAttribute(pp, 3));
        r.setAttribute('normal', new THREE.BufferAttribute(nn, 3));
        r.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
        r.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
        return r;
      };
      const pies = new Set();
      if (o.zapas && piezas[0])
        piezas[0].skeleton.bones.forEach((b, i) => {
          if (/^(Foot|PT)/.test(b.name)) pies.add(i);
        });
      const ccZ = new THREE.Color(o.zapas || '#ffffff');
      let rangosRopa = [];
      try {
        const geos = [],
          cc = new THREE.Color();
        let base = 0;
        piezas.forEach(n => {
          if (o.sinPelo && /^Hair/.test(n.material.name || '')) {
            n.visible = false;
            return;
          }
          if (o.cabezaHD && hi >= 0 && /^(Eye|Eyebrows)$/.test(n.material.name || '')) return; // la cara propia sustituye a los ojos y las cejas del modelo
          let g0 = n.geometry.index ? n.geometry.toNonIndexed() : n.geometry.clone();
          if (o.cabezaHD && hi >= 0 && /^Skin/.test(n.material.name || '')) {
            g0 = sinCabeza(g0, hi);
            if (!g0) return;
          }
          if (o.cabezaHD && hi >= 0 && /^Hair/.test(n.material.name || '')) {
            const P0 = g0.attributes.position,
              N0 = g0.attributes.normal;
            for (let i = 0; i < P0.count; i++) P0.setXYZ(i, P0.getX(i) + N0.getX(i) * 0.012, P0.getY(i) + N0.getY(i) * 0.012, P0.getZ(i) + N0.getZ(i) * 0.012);
          }
          // el pelo se separa un poco para que no quede dentro de la cabeza propia
          const cnt = g0.attributes.position.count,
            g1 = new THREE.BufferGeometry();
          g1.setAttribute('position', g0.attributes.position);
          g1.setAttribute('normal', g0.attributes.normal);
          const si = g0.attributes.skinIndex,
            sw = g0.attributes.skinWeight,
            si2 = new Uint16Array(cnt * 4),
            sw2 = new Float32Array(cnt * 4);
          for (let i = 0; i < cnt; i++)
            for (let k = 0; k < 4; k++) {
              si2[i * 4 + k] = si.getComponent(i, k);
              sw2[i * 4 + k] = sw.getComponent(i, k);
            }
          g1.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si2, 4));
          g1.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw2, 4));
          cc.set(color(n));
          const cols = new Float32Array(cnt * 3),
            zap = pies.size && !/^Skin/.test(n.material.name || '');
          for (let i = 0; i < cnt; i++) {
            let c = cc;
            if (zap) {
              let mx = 0,
                hb = -1;
              for (let k = 0; k < 4; k++)
                if (sw2[i * 4 + k] > mx) {
                  mx = sw2[i * 4 + k];
                  hb = si2[i * 4 + k];
                }
              if (pies.has(hb) && mx > 0.5) c = ccZ;
            }
            cols[i * 3] = c.r;
            cols[i * 3 + 1] = c.g;
            cols[i * 3 + 2] = c.b;
          }
          g1.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
          if (/^(Purple|Red_Dark|LightBrown)$/.test(n.material.name || '')) rangosRopa.push([base, cnt]);
          base += cnt;
          geos.push(g1);
        });
        const fundida = THREE.mergeGeometries(geos);
        if (!fundida) throw new Error('no fusiona');
        const m0 = piezas[0],
          malla = new THREE.SkinnedMesh(fundida, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
        malla.bind(m0.skeleton, m0.bindMatrix);
        malla.castShadow = true;
        malla.frustumCulled = false;
        malla.name = 'persona';
        m0.parent.add(malla);
        piezas.forEach(n => n.parent && n.parent.remove(n));
      } catch (e) {
        // si algo falla, se queda como antes (piezas separadas), pero se anota en el registro de errores
        if (typeof console !== 'undefined') console.error('personaje fusionado: ' + e.message);
        rangosRopa = null;
        const tinta = (m, hex) => {
          const c = m.clone();
          c.color.set(hex);
          return c;
        };
        piezas.forEach(n => {
          n.castShadow = true;
          n.frustumCulled = false;
          n.material = tinta(n.material, color(n));
        });
      }
      const mixer = new THREE.AnimationMixer(obj),
        acc = {};
      Object.keys(ANIM).forEach(k => {
        const c = an.animations.find(a => a.name === ANIM[k]);
        if (c) acc[k] = mixer.clipAction(c);
      });
      const B = {};
      obj.traverse(n => {
        if (n.isBone) B[n.name] = n;
      });
      if (GM.animCodigo) GM.animCodigo.instalar({ mixer, acc, obj }, o.modelo, an, ANIM);
      if (GM.campus && GM.campus.config.calidad !== 'alta') {
        // sombra pintada bajo los pies
        if (!_mSombra) {
          const t = textura('sombra-pies', 64, (x, n) => {
            const g2 = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
            g2.addColorStop(0, 'rgba(0,0,0,0.45)');
            g2.addColorStop(1, 'rgba(0,0,0,0)');
            x.fillStyle = g2;
            x.fillRect(0, 0, n, n);
          });
          _mSombra = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
        }
        const sb = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), _mSombra);
        sb.position.y = 0.02 / obj.scale.x;
        sb.scale.setScalar(1 / obj.scale.x);
        sb.renderOrder = 1;
        obj.add(sb);
      }
      if (o.ancho) {
        obj.scale.x *= o.ancho;
        obj.scale.z *= o.ancho;
      }
      if (o.proporcion === 'nino') {
        ['UpperLegL', 'UpperLegR'].forEach(b => B[b] && B[b].scale.setScalar(0.84));
        ['UpperArmL', 'UpperArmR'].forEach(b => B[b] && B[b].scale.setScalar(0.88));
        if (B.Head) B.Head.scale.multiplyScalar(1.16);
      }
      if (o.complexion !== undefined) {
        const k = [0.93, 1, 1.08][o.complexion] || 1;
        obj.scale.x *= k;
        obj.scale.z *= k;
      }
      if (o.cara && B.Head) {
        const e = [null, [1.07, 0.95, 1.04], [0.94, 1.07, 0.98], [1.09, 1.0, 1.03]][o.cara];
        if (e) B.Head.scale.set(e[0], e[1], e[2]);
      }
      if (o.cabeza && B.Head) B.Head.scale.multiplyScalar(o.cabeza);
      complementos(obj, B, o);
      return { obj, mixer, acc, huesos: B, altura: o.altura || 178, rangosRopa, ropa: o.ropa, edad: o.edad, sexo: o.sexo, rolV: o.rolV, modelo: o.modelo };
    }
    return personaje;
  };
})();
