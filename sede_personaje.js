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
    // los mismos huesos en el esqueleto de Rocketbox (3ds Max Biped)
    const RB_HUESOS = {
      Head: 'Bip01_Head',
      Neck: 'Bip01_Neck',
      Hips: 'Bip01_Pelvis',
      Spine: 'Bip01_Spine',
      UpperArmL: 'Bip01_L_UpperArm',
      UpperArmR: 'Bip01_R_UpperArm',
      UpperLegL: 'Bip01_L_Thigh',
      UpperLegR: 'Bip01_R_Thigh',
      Foot: 'Bip01_L_Foot'
    };
    // Dos familias de personas realistas (solo escritorio): Mixamo y Microsoft Rocketbox (punto 107; MIT; tools/rocketbox_*.js), cada una
    // en su carpeta con su lista.json, sus versiones de media distancia (lod/) y sus animaciones (anim/, las de Rocketbox pasadas desde las
    // de Mixamo a su esqueleto). La gente de la calle sale de las dos; jugadores, policía y equipación, de Mixamo.
    const _listas = {};
    function listaDe(fam) {
      if (!_listas[fam])
        _listas[fam] = fetch('modelos/personas/' + fam + '/lista.json')
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null);
      return _listas[fam];
    }
    const listaMixamo = () => listaDe('mixamo');
    // Una malla por persona (punto 105 de la hoja de ruta 2): los modelos de Mixamo traen de 2 a 9 piezas (cuerpo, camisa, pelo…), cada una
    // con su propia copia recortada del esqueleto (mixamorigHips_1, _2…), que las animaciones no mueven. Se funden una vez por modelo en
    // la plantilla (g.scene, antes de clonarla): una sola malla atada a los huesos que mueven las animaciones (el primero de cada nombre),
    // con las texturas en una lámina de 2 x 2 casillas (color y relieve) y el pelo recortado por transparencia y por las dos caras.
    // De unas 6 llamadas de dibujo por persona (y otras tantas de sombra) a 1. Requiere que la plantilla esté en la pose de unión (lo está).
    // gL (opcional): la versión de media distancia del mismo modelo (punto 106); se funde con la misma lámina en una segunda malla,
    // 'cuerpo_lejos', atada al mismo esqueleto y oculta (personajeMixamo devuelve las dos en p.lod y sede3d.js elige según la distancia)
    // Tinte de la ropa por persona (puntos 107 y 108): cada vértice sabe a qué prenda pertenece (atributo ropa: 0 piel y pelo, 1 arriba,
    // 2 abajo, 3 calzado, 4 medias, 5 cuerpo) y el material lleva un color por prenda (uT1 a uT4: rgb y fuerza) que sustituye el color
    // de la tela conservando sus luces y sombras; uT5 cambia el tono de la piel (solo los texeles de color piel del cuerpo). Todas las
    // personas comparten el programa; cada una con tinte lleva su propio material (las texturas son las mismas).
    function matMixamo(map, normalMap, roughness) {
      const u = {
          uT1: { value: new THREE.Vector4(0, 0, 0, 0) },
          uT2: { value: new THREE.Vector4(0, 0, 0, 0) },
          uT3: { value: new THREE.Vector4(0, 0, 0, 0) },
          uT4: { value: new THREE.Vector4(0, 0, 0, 0) },
          uT5: { value: new THREE.Vector4(1, 1, 1, 0) }
        },
        m = new THREE.MeshStandardMaterial({ map, normalMap, roughness, metalness: 0, alphaTest: 0.5 });
      m.alphaToCoverage = true;
      m.userData.tinte = u;
      m.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, u);
        sh.vertexShader = 'attribute float ropa;\nvarying float vRopa;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vRopa = ropa;');
        sh.fragmentShader =
          'uniform vec4 uT1;\nuniform vec4 uT2;\nuniform vec4 uT3;\nuniform vec4 uT4;\nuniform vec4 uT5;\nvarying float vRopa;\n' +
          sh.fragmentShader.replace(
            '#include <map_fragment>',
            `#include <map_fragment>
{
  vec4 tR = vRopa < 0.5 ? vec4(0.0) : vRopa < 1.5 ? uT1 : vRopa < 2.5 ? uT2 : vRopa < 3.5 ? uT3 : vRopa < 4.5 ? uT4 : vec4(0.0);
  float lR = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  if (tR.a > 0.0) diffuseColor.rgb = mix(diffuseColor.rgb, tR.rgb * clamp(0.3 + lR * 1.6, 0.0, 1.4), tR.a);
  if (vRopa > 4.5 && uT5.a > 0.0) {
    vec3 cR = diffuseColor.rgb;
    float pR = smoothstep(0.015, 0.06, cR.r - cR.b) * step(cR.b, cR.g + 0.02) * step(0.02, cR.r);
    diffuseColor.rgb = mix(cR, cR * uT5.rgb, pR * uT5.a);
  }
}`
          );
      };
      m.customProgramCacheKey = () => 'mixamo-tinte';
      return m;
    }
    // prenda de cada pieza por su nombre (Ch01_Shirt, Ch08_Hoodie, Ch38_Socks…); con traje, la camisa de debajo no se tiñe
    const prendaDe = (nombre, conTraje) =>
      /Suit/.test(nombre)
        ? 1
        : /Shirt/.test(nombre) && conTraje
          ? 0
          : /Shirt|Cloth|Hood|Sweater|Collar/.test(nombre)
            ? 1
            : /Pants|Shorts/.test(nombre)
              ? 2
              : /Sneaker|Shoe|Heels|Boots/.test(nombre)
                ? 3
                : /Socks/.test(nombre)
                  ? 4
                  : /Body/.test(nombre)
                    ? 5
                    : 0;
    function fundirMixamo(g, gL) {
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
      // casilla de cada material (por nombre: la versión de media distancia trae sus propias texturas reducidas)
      const celdaMat = {};
      piezas.forEach(p => (celdaMat[p.material.name] = Math.max(0, mapas.indexOf(p.material.map))));
      const geoDe = (piezas, esc) => {
        esc.updateMatrixWorld(true);
        // geometría: posiciones y normales en el espacio de la plantilla, índices de hueso al esqueleto canónico, UV a su casilla
        const P = [],
          N = [],
          U = [],
          SI = [],
          SW = [],
          RP = [],
          I = [],
          conTraje = piezas.some(p => /Suit/.test(p.name)),
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
            k = celdaMat[p.material.name] !== undefined ? celdaMat[p.material.name] : Math.max(0, mapas.indexOf(p.material.map)),
            cu = k % L,
            cv = Math.floor(k / L),
            mapa = p.skeleton.bones.map(b => (idx.has(base(b.name)) ? idx.get(base(b.name)) : hip)),
            pelo = p.material.transparent || p.material.alphaTest > 0,
            prenda = pelo ? 0 : prendaDe(p.name, conTraje);
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
              RP.push(prenda);
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
        geo.setAttribute('ropa', new THREE.Float32BufferAttribute(RP, 1));
        geo.setIndex(I);
        geo.computeBoundingBox();
        geo.computeBoundingSphere();
        return geo;
      };
      const geo = geoDe(piezas, esc);
      const tC = new THREE.CanvasTexture(cC),
        tN = new THREE.CanvasTexture(cN);
      tC.flipY = tN.flipY = false; // las UV de glTF empiezan arriba
      tC.colorSpace = THREE.SRGBColorSpace;
      tC.anisotropy = tN.anisotropy = 4;
      const m0 = piezas[0].material,
        rug = m0.roughness !== undefined ? m0.roughness : 0.8,
        mat = matMixamo(tC, tN, rug);
      g.nuevoMat = () => matMixamo(tC, tN, rug);
      // tono medio de la piel del modelo (texeles de color piel de la pieza del cuerpo): base para cambiarlo por persona
      {
        const cuerpo = piezas.find(p => /Body/.test(p.name)),
          k = cuerpo ? Math.max(0, mapas.indexOf(cuerpo.material.map)) : -1;
        if (cuerpo && cuerpo.geometry.attributes.uv && k >= 0) {
          const d = xC.getImageData((k % L) * W, Math.floor(k / L) * H, W, H).data,
            uv = cuerpo.geometry.attributes.uv,
            s = [0, 0, 0];
          let n = 0;
          for (let i = 0; i < uv.count; i += 3) {
            const x = Math.min(W - 1, Math.max(0, Math.floor(uv.getX(i) * W))),
              y = Math.min(H - 1, Math.max(0, Math.floor(uv.getY(i) * H))),
              o = (y * W + x) * 4,
              r = d[o] / 255,
              gg = d[o + 1] / 255,
              b = d[o + 2] / 255;
            if (r - b > 0.08 && b <= gg + 0.02 && r > 0.2) {
              s[0] += r;
              s[1] += gg;
              s[2] += b;
              n++;
            }
          }
          if (n > 20) g.pielBase = new THREE.Color().setRGB(s[0] / n, s[1] / n, s[2] / n, THREE.SRGBColorSpace);
        }
      }
      const malla = new THREE.SkinnedMesh(geo, mat);
      malla.name = 'cuerpo';
      esc.add(malla);
      esc.updateMatrixWorld(true);
      const esqueleto = new THREE.Skeleton(huesos);
      malla.bind(esqueleto, malla.matrixWorld);
      let lejos = null;
      if (gL && gL.scene) {
        const pL = [];
        gL.scene.traverse(o => {
          if (o.isSkinnedMesh) pL.push(o);
        });
        if (pL.length) {
          lejos = new THREE.SkinnedMesh(geoDe(pL, gL.scene), mat);
          lejos.name = 'cuerpo_lejos';
          lejos.visible = false;
          esc.add(lejos);
          esc.updateMatrixWorld(true);
          lejos.bind(esqueleto, lejos.matrixWorld);
        }
      }
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
      g.fundido = { piezas: piezas.length, huesos: huesos.length, mapas: mapas.length, sobran: sobran.length, lejos: !!lejos };
      return g.fundido;
    }
    async function personajeMixamo(o) {
      // tu personaje cuando eres jugador (con tu cara propia), los mayores y los niños siguen con Quaternius
      if (!GM.campus || GM.campus.config.calidad !== 'alta' || (o.rostro && o.escudo) || o.sinMixamo || o.edad === 'mayor' || typeof fetch !== 'function') return null;
      const [L0, LR] = await Promise.all([listaMixamo(), listaDe('rocketbox')]),
        L = L0 || { h: [], m: [], n: [], roles: {} };
      if (!L0 && !LR) return null;
      const roles = L.roles || {},
        oscura = c => {
          const k = new THREE.Color(c || '#e0ac85');
          return k.r * 0.3 + k.g * 0.59 + k.b * 0.11 < 0.25;
        };
      let pool;
      // cada candidato es [familia, id]; la gente de la calle y los papeles, de las dos familias
      const de = (fam, ids) => (ids || []).map(id => [fam, id]),
        rRoles = (LR && LR.roles) || {};
      if (o.escudo)
        pool = de('mixamo', o.kit && L.kit && L.kit.length ? L.kit : L.chandal ? L.chandal[oscura(o.piel) ? 'oscuro' : 'claro'] : null); // jugadores (punto 108)
      else if (o.rolV && (roles[o.rolV] || rRoles[o.rolV])) pool = de('rocketbox', rRoles[o.rolV]).concat(de('mixamo', roles[o.rolV]));
      else if (o.rolV === 'policia' || o.rolV === 'obrero')
        return null; // sin modelo para ese papel: el de Quaternius
      else {
        const k = o.proporcion === 'nino' ? 'n' : /^m-/.test(o.modelo || '') || o.sexo === 'm' ? 'm' : 'h';
        pool = de('rocketbox', LR && LR[k]).concat(de('mixamo', L[k]));
      }
      if (!pool || !pool.length) return null;
      const [fam, id] = pool[GM.util.hash(String(o.semilla !== undefined ? o.semilla : [o.modelo, o.altura, o.piel, o.pelo].join('|'))) % pool.length],
        dir = 'modelos/personas/' + fam + '/';
      const { cargar, textura } = ctx,
        nombres = Object.keys(MX_CLIPS);
      const [g, ...an] = await Promise.all([cargar(dir + id + '.glb'), ...nombres.map(n => cargar(dir + 'anim/' + MX_CLIPS[n] + '.glb').catch(() => ({ animations: [] })))]);
      // versión de media distancia (punto 106): si no está (instalaciones antiguas), solo la normal
      const gL = g.fundido === undefined ? await cargar(dir + 'lod/' + id + '.glb').catch(() => null) : null;
      try {
        fundirMixamo(g, gL);
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
        const n = fam === 'rocketbox' ? RB_HUESOS[k] : 'mixamorig' + MX_HUESOS[k];
        if (B[n]) B[k] = B[n];
      });
      const cerca = obj.getObjectByName('cuerpo'),
        lejos = obj.getObjectByName('cuerpo_lejos');
      // tinte de la ropa (puntos 107 y 108): jugadores con los colores del club (chándal o equipación) y la piel de cada uno; aficionados con
      // la camiseta del club; el resto, con los colores de ropa del catálogo (según la estación y el papel) en una parte de las prendas
      if (g.nuevoMat && cerca) {
        const T = [null, null, null, null],
          h = GM.util.hash(String(o.semilla !== undefined ? o.semilla : [o.modelo, o.altura, o.piel].join('|')) + 'tinte');
        let piel = null;
        if (o.escudo) {
          T[0] = [o.escudo.c1, 0.92];
          T[1] = [o.kit ? o.escudo.c1 : o.escudo.c2, 0.88];
          if (o.kit) T[3] = [o.escudo.c2, 0.92];
          if (o.piel && g.pielBase) piel = o.piel;
        } else if (o.hincha && o.ropa) T[0] = [o.ropa[0], 0.9];
        else if (o.ropa) {
          if (h % 100 < 70) T[0] = [o.ropa[0], 0.8];
          if ((h >>> 7) % 100 < 50 && o.ropa[1]) T[1] = [o.ropa[1], 0.75];
        }
        if (T.some(Boolean) || piel) {
          const m = g.nuevoMat(),
            u = m.userData.tinte,
            c = new THREE.Color();
          T.forEach((t, i) => {
            if (t) u['uT' + (i + 1)].value.set(c.set(t[0]).r, c.g, c.b, t[1]);
          });
          if (piel) {
            c.set(piel);
            const b = g.pielBase;
            u.uT5.value.set(Math.min(1.6, c.r / Math.max(0.02, b.r)), Math.min(1.6, c.g / Math.max(0.02, b.g)), Math.min(1.6, c.b / Math.max(0.02, b.b)), 0.9);
          }
          cerca.material = m;
          if (lejos) lejos.material = m;
        }
      }
      return {
        obj,
        mixer,
        acc,
        huesos: B,
        altura: o.altura || 178,
        rangosRopa: null,
        ropa: o.ropa,
        edad: o.edad,
        sexo: o.sexo,
        rolV: o.rolV,
        modelo: o.modelo,
        mixamo: id,
        lod: cerca && lejos ? [cerca, lejos] : null
      };
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
