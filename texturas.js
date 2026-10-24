/* TEXTURAS REALES (GM.texturas) — fotos de materiales CC0 de ambientCG (vendor/texturas, ver CREDITOS.md): color, relieve (normal)
   y rugosidad de 12 materiales (asfalto, adoquines, ladrillo, revoco, hormigón, hierba, tarima, baldosa, tejas, tierra, mármol y
   fachada de cristal). Se proyectan en coordenadas del mundo (por la cara dominante: suelo o pared), así cubren igual cualquier
   pieza aunque la geometría esté fusionada y no hay que ajustar las UV de cada caja. Se cargan una vez (precargar) antes de
   construir la escena; si no se pueden cargar (pruebas en Node, sin red), los materiales se quedan como estaban.
   aplicar(mat, id, { color, relieve, tinte, escalaMul }): la imagen cubre siempre su MEDIDA real (ancho y alto en metros, de ambientCG o
   contando ladrillos, tablas o losas en la foto); escalaMul solo para escenas dibujadas a otra escala (ciudad deportiva). La antigua opción
   escala (metros a ojo en cada sitio) ya no se usa: daba tablas de 4 cm en un sitio y de 9 cm en otro. color = false conserva el mapa
   de color propio del material (por ejemplo fachadas con ventanas pintadas) y solo añade relieve y rugosidad.
   Expone: precargar, aplicar, material, medida, listo, IDS, MEDIDAS. */
(function () {
  const IDS = [
    'Asphalt010',
    'PavingStones070',
    'Bricks085',
    'Plaster003',
    'Concrete034',
    'Grass004',
    'WoodFloor051',
    'Tiles074',
    'RoofingTiles013A',
    'Ground054',
    'Marble006',
    'Facade006',
    'Asphalt031',
    'PavingStones150',
    'Metal055A'
  ];
  // Medida real de cada imagen en metros [ancho, alto] (punto 92). Bricks085 y Concrete034 vienen aplastadas en una imagen cuadrada
  // y PavingStones150 estirada: con su medida real recuperan la proporción.
  const MEDIDAS = {
    Asphalt010: [3, 3],
    PavingStones070: [1.15, 1.15],
    Bricks085: [2.4, 1.2],
    Plaster003: [2, 2],
    Concrete034: [1.1, 0.55],
    Grass004: [1.4, 1.4],
    WoodFloor051: [1.8, 1.8],
    Tiles074: [2.1, 2.1],
    RoofingTiles013A: [2.9, 2.9],
    Ground054: [3.5, 3.5],
    Marble006: [2.4, 2.4],
    Facade006: [25.6, 25.6],
    Asphalt031: [2.5, 2.5],
    PavingStones150: [3.6, 1.8],
    Metal055A: [1, 1]
  };
  const medida = id => MEDIDAS[id] || [2, 2];
  // Materiales sin dibujo regular: se mezclan consigo mismos a otra escala y girados (punto 93) para que no se vea el mosaico.
  // Los de piezas (ladrillo, baldosa, tablas, adoquín, tejas) no: cambiaría el tamaño de las piezas.
  const SIN_PIEZAS = /^(Asphalt|Grass|Ground|Gravel|Concrete|Plaster|PaintedPlaster|Rock|ScatteredLeaves|Carpet|Marble|Travertine|Metal0)/;
  const mezclable = id => SIN_PIEZAS.test(id);
  const TX = {};
  let promesa = null,
    ok = false;
  const mojadoU = { value: 0 },
    nieveU = { value: 0 };
  const enNavegador = () =>
    typeof window !== 'undefined' && typeof navigator !== 'undefined' && !/jsdom/i.test(navigator.userAgent || '') && typeof THREE !== 'undefined' && THREE.TextureLoader;
  // Lector de KTX2 compartido (texturas del mundo y de los modelos glTF): se prepara una vez con un renderer propio, de usar y tirar, para saber qué formatos comprimidos admite la tarjeta
  let K2 = undefined;
  function ktx2(renderer) {
    if (K2 !== undefined) return K2;
    K2 = null;
    if (!THREE.KTX2Loader || (typeof window !== 'undefined' && window.__sinKTX2)) return K2;
    try {
      let r = renderer,
        propio = false;
      if (!r) {
        r = new THREE.WebGLRenderer({ canvas: document.createElement('canvas') });
        propio = true;
      }
      K2 = new THREE.KTX2Loader().setTranscoderPath('basis/').detectSupport(r);
      if (propio) {
        r.dispose();
        if (r.forceContextLoss) r.forceContextLoss();
      }
    } catch (e) {
      K2 = null;
    }
    return K2;
  }
  // Carga bajo demanda (punto 91): cada material tiene unos uniformes compartidos (color, relieve, rugosidad) que empiezan con un tono neutro
  // y se rellenan al llegar la imagen; todos los materiales que lo usan se actualizan solos. precargar() trae los de BASE antes de construir.
  const UNI = {};
  let L = null,
    K = null,
    NEUTRO = null;
  const BASE = IDS.slice();
  function neutros() {
    if (NEUTRO) return NEUTRO;
    const px = (r, g, b, srgb) => {
      const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.needsUpdate = true;
      return t;
    };
    return (NEUTRO = { c: px(186, 186, 186, true), n: px(128, 128, 255), r: px(255, 255, 255) });
  }
  const cargaJpg = (url, srgb, res) => {
    L.load(
      url,
      t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = GM.campus && GM.campus.config.nivel === 'bajo' ? 1 : 4;
        if (GM.campus && GM.campus.config.nivel === 'bajo' && t.image && t.image.width > 512) {
          try {
            const c = document.createElement('canvas');
            c.width = c.height = 512;
            c.getContext('2d').drawImage(t.image, 0, 0, 512, 512);
            t.image = c;
            t.needsUpdate = true;
          } catch (e) {}
        }
        if (srgb) t.colorSpace = THREE.SRGBColorSpace;
        res(t);
      },
      undefined,
      () => res(null)
    );
  };
  // KTX2 (Basis) primero, cuatro veces menos memoria de GPU; si no hay, el JPG
  const carga = (url, srgb) =>
    new Promise(res => {
      if (K)
        K.load(
          url.replace(/\.jpg$/, '.ktx2'),
          t => {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.anisotropy = 4;
            if (srgb) t.colorSpace = THREE.SRGBColorSpace;
            res(t);
          },
          undefined,
          () => cargaJpg(url, srgb, res)
        );
      else cargaJpg(url, srgb, res);
    });
  function pedir(id) {
    if (UNI[id]) return UNI[id];
    const N = neutros(),
      u = (UNI[id] = { c: { value: N.c }, n: { value: N.n }, r: { value: N.r }, estado: 'cargando', promesa: null });
    u.promesa = Promise.all([carga('texturas/' + id + '_c.jpg', true), carga('texturas/' + id + '_n.jpg'), carga('texturas/' + id + '_r.jpg')]).then(([c, n, r]) => {
      if (c && n && r) {
        u.c.value = c;
        u.n.value = n;
        u.r.value = r;
        TX[id] = { c, n, r };
        u.estado = 'listo';
      } else u.estado = 'falta';
      return u.estado === 'listo';
    });
    return u;
  }
  function precargar(renderer) {
    if (promesa) return promesa;
    if (!enNavegador()) return (promesa = Promise.resolve(false));
    L = new THREE.TextureLoader();
    K = ktx2(renderer);
    ok = true;
    promesa = Promise.race([Promise.all(BASE.map(id => pedir(id).promesa)).then(() => true), new Promise(res => setTimeout(() => res(true), 8000))]);
    return promesa;
  }
  // Un material está disponible si viene con el juego (IDS) y no ha fallado su carga
  const tiene = id => IDS.indexOf(id) >= 0 && !(UNI[id] && UNI[id].estado === 'falta');
  const VERT_DEC = 'varying vec3 vWPt;\nvarying vec3 vWNt;\n',
    FRAG_DEC =
      'varying vec3 vWPt;\nvarying vec3 vWNt;\nuniform float uMacT;\nuniform float uNieveT;\nfloat hT(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }\nfloat nT(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(mix(hT(i), hT(i + vec3(1,0,0)), f.x), mix(hT(i + vec3(0,1,0)), hT(i + vec3(1,1,0)), f.x), f.y), mix(mix(hT(i + vec3(0,0,1)), hT(i + vec3(1,0,1)), f.x), mix(hT(i + vec3(0,1,1)), hT(i + vec3(1,1,1)), f.x), f.y), f.z); }\nfloat macroT(vec3 p){ return nT(p * 0.045) * 0.5 + nT(p * 0.19) * 0.3 + nT(p * 0.85) * 0.2; }\nfloat cobNT(){ if (vWNt.y < 0.5 || uNieveT <= 0.0) return 0.0; return clamp(uNieveT * (0.6 + 1.2 * (vWNt.y - 0.5)) + (macroT(vWPt * 2.3) - 0.5) * 0.6 * uNieveT, 0.0, 1.0); }\nuniform vec2 uEscT;\nuniform float uRugMinT;\nuniform float uVarT;\nuniform float uMojadoT;\nuniform float uRelT;\nuniform vec3 uTinT;\nuniform sampler2D tColT;\nuniform sampler2D tNorT;\nuniform sampler2D tRouT;\n';
  // UV en el mundo según la cara dominante, y la base tangente correspondiente
  const UV = `vec3 aN = abs(vWNt); vec2 wuvT; vec3 tT; vec3 bT;
    if (aN.y >= aN.x && aN.y >= aN.z) { wuvT = vWPt.xz; tT = vec3(1.,0.,0.); bT = vec3(0.,0.,sign(vWNt.y)); }
    else if (aN.x >= aN.z) { wuvT = vec2(vWPt.z * sign(vWNt.x), vWPt.y); tT = vec3(0.,0.,sign(vWNt.x)); bT = vec3(0.,1.,0.); }
    else { wuvT = vec2(-vWPt.x * sign(vWNt.z), vWPt.y); tT = vec3(-sign(vWNt.z),0.,0.); bT = vec3(0.,1.,0.); }
    wuvT /= uEscT;`;
  const NL = '\n';
  function aplicar(mat, id, o) {
    o = o || {};
    if (!ok || !mat || mat.userData.texturaReal || !tiene(id)) return mat;
    const T = pedir(id);
    const mascara = !!o.mascara,
      color = o.color !== false,
      tinte = new THREE.Color(o.tinte || 0xffffff);
    mat.userData.texturaReal = id;
    if (color && !mascara) {
      mat.color.set(0xffffff);
    }
    if (o.rugosidad !== undefined) mat.roughness = o.rugosidad;
    else mat.roughness = Math.max(mat.roughness, 0.85);
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, {
        uNieveT: nieveU,
        uMacT: { value: o.macro === undefined ? 1 : o.macro },
        uVarT: { value: mezclable(id) ? 0.85 : 0 },
        uMojadoT: mojadoU,
        uRugMinT: { value: o.rugMin === undefined ? 0.6 : o.rugMin },
        uEscT: { value: new THREE.Vector2(medida(id)[0] * (o.escalaMul || 1), medida(id)[1] * (o.escalaMul || 1)) },
        uRelT: { value: o.relieve === undefined ? 1 : o.relieve },
        uTinT: { value: tinte },
        tColT: T.c,
        tNorT: T.n,
        tRouT: T.r
      });
      sh.vertexShader =
        VERT_DEC +
        sh.vertexShader.replace(
          '#include <worldpos_vertex>',
          '#include <worldpos_vertex>\n vWPt = (modelMatrix * vec4(transformed, 1.0)).xyz; vWNt = normalize(mat3(modelMatrix) * objectNormal);'
        );
      let fs = FRAG_DEC + sh.fragmentShader;
      // parT: 1 donde se ve el material real; con «mascara», 0 en lo que el mapa propio no tiene en blanco (ventanas pintadas de las fachadas)
      const MASC = mascara
        ? '#ifdef USE_MAP' + NL + ' parT = smoothstep(0.86, 0.97, min(sampledDiffuseColor.r, min(sampledDiffuseColor.g, sampledDiffuseColor.b)));' + NL + '#endif' + NL
        : '';
      if (!color) fs = fs.replace('#include <map_fragment>', '#include <map_fragment>' + NL + ' float parT = 1.0;');
      else
        fs = fs.replace(
          '#include <map_fragment>',
          (mascara ? '#include <map_fragment>' + NL : '') +
            ' float parT = 1.0;' +
            NL +
            MASC +
            '{ ' +
            UV +
            ' vec3 c1T = texture2D(tColT, wuvT).rgb; if (uVarT > 0.0) { vec2 uv2T = mat2(0.8, -0.6, 0.6, 0.8) * wuvT * 0.41 + 0.31; c1T = mix(c1T, texture2D(tColT, uv2T).rgb, smoothstep(0.3, 0.7, nT(vWPt * 0.21)) * uVarT); } vec3 pT = diffuseColor.rgb * c1T * uTinT; float mcT = macroT(vWPt); pT *= mix(1.0, mix(0.82, 1.14, mcT), uMacT); pT = mix(pT, vec3(0.92, 0.94, 0.97), cobNT()); if (vWNt.y < 0.5) pT *= mix(1.0, mix(0.74, 1.0, smoothstep(0.0, 2.2, vWPt.y)), uMacT); diffuseColor.rgb = mix(diffuseColor.rgb, pT, parT); }'
        );
      fs = fs.replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\n{ ' +
          UV +
          ' float rf0T = roughnessFactor; roughnessFactor = max(roughnessFactor * texture2D(tRouT, wuvT).g, uRugMinT); roughnessFactor = clamp(roughnessFactor * mix(1.0, mix(0.88, 1.1, macroT(vWPt)), uMacT), 0.04, 1.0); roughnessFactor = mix(roughnessFactor, 0.9, cobNT()); if (vWNt.y > 0.7 && uMojadoT > 0.0) { float charcoT = smoothstep(0.56, 0.68, texture2D(tRouT, wuvT * 0.11 + 0.37).g); roughnessFactor = mix(roughnessFactor, mix(max(roughnessFactor * 0.75, 0.45), 0.06, charcoT), uMojadoT); diffuseColor.rgb *= 1.0 - (0.12 + 0.18 * charcoT) * uMojadoT; } roughnessFactor = mix(rf0T, roughnessFactor, parT); }'
      );
      fs = fs.replace(
        '#include <normal_fragment_maps>',
        '#include <normal_fragment_maps>\n{ ' +
          UV +
          ' vec3 nT = texture2D(tNorT, wuvT).xyz * 2.0 - 1.0; nT.xy *= uRelT; vec3 nW = normalize(tT * nT.x + bT * nT.y + normalize(vWNt) * nT.z); normal = normalize(mix(normal, normalize((viewMatrix * vec4(nW, 0.0)).xyz), parT)); }'
      );
      sh.fragmentShader = fs;
    };
    mat.customProgramCacheKey = () => 'tr-' + id + (color ? 'c' : 'r') + (mascara ? 'm' : '');
    mat.needsUpdate = true;
    return mat;
  }
  // Material nuevo con la textura real (o el color de respaldo si no hay texturas)
  function material(id, o) {
    o = o || {};
    const m = new THREE.MeshStandardMaterial({ color: o.respaldo || 0x999999, roughness: 0.9 });
    return aplicar(m, id, o);
  }
  GM.texturas = { ktx2, _TX: TX, nieveU, mojadoU, precargar, aplicar, material, medida, tiene, pedir, listo: () => ok, IDS, MEDIDAS };
})();
