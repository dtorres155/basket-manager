/* TEXTURAS REALES (GM.texturas) — fotos de materiales CC0 de ambientCG (vendor/texturas, ver CREDITOS.md): color, relieve (normal)
   y rugosidad de 12 materiales (asfalto, adoquines, ladrillo, revoco, hormigón, hierba, tarima, baldosa, tejas, tierra, mármol y
   fachada de cristal). Se proyectan en coordenadas del mundo (por la cara dominante: suelo o pared), así cubren igual cualquier
   pieza aunque la geometría esté fusionada y no hay que ajustar las UV de cada caja. Se cargan una vez (precargar) antes de
   construir la escena; si no se pueden cargar (pruebas en Node, sin red), los materiales se quedan como estaban.
   aplicar(mat, id, { escala, color, relieve, tinte }): escala = metros que ocupa una repetición; color = false conserva el mapa
   de color propio del material (por ejemplo fachadas con ventanas pintadas) y solo añade relieve y rugosidad.
   Expone: precargar, aplicar, material, listo, IDS. */
(function () {
  const IDS = ['Asphalt010', 'PavingStones070', 'Bricks085', 'Plaster003', 'Concrete034', 'Grass004', 'WoodFloor051', 'Tiles074', 'RoofingTiles013A', 'Ground054', 'Marble006', 'Facade006', 'Asphalt031', 'PavingStones150', 'Metal055A'];
  const TX = {}; let promesa = null, ok = false; const mojadoU = { value: 0 }, nieveU = { value: 0 };
  const enNavegador = () => typeof window !== 'undefined' && typeof navigator !== 'undefined' && !/jsdom/i.test(navigator.userAgent || '') && typeof THREE !== 'undefined' && THREE.TextureLoader;
  // Lector de KTX2 compartido (texturas del mundo y de los modelos glTF): se prepara una vez con un renderer propio, de usar y tirar, para saber qué formatos comprimidos admite la tarjeta
  let K2 = undefined;
  function ktx2(renderer) {
    if (K2 !== undefined) return K2; K2 = null; if (!THREE.KTX2Loader || (typeof window !== 'undefined' && window.__sinKTX2)) return K2;
    try { let r = renderer, propio = false; if (!r) { r = new THREE.WebGLRenderer({ canvas: document.createElement('canvas') }); propio = true; } K2 = new THREE.KTX2Loader().setTranscoderPath('basis/').detectSupport(r); if (propio) { r.dispose(); if (r.forceContextLoss) r.forceContextLoss(); } } catch (e) { K2 = null; } return K2;
  }
  function precargar(renderer) {
    if (promesa) return promesa; if (!enNavegador()) return (promesa = Promise.resolve(false));
    const L = new THREE.TextureLoader(); let K = ktx2(renderer);   // KTX2 (Basis): cuatro veces menos memoria de GPU
    const carga = (url, srgb) => new Promise(res => { const fin = t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t); }; if (K) { K.load(url.replace(/\.jpg$/, '.ktx2'), t => { fin(t); }, undefined, () => cargaJpg(url, srgb, res)); } else cargaJpg(url, srgb, res); }), cargaJpg = (url, srgb, res) => { L.load(url, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = GM.campus && GM.campus.config.nivel === 'bajo' ? 1 : 4;
      if (GM.campus && GM.campus.config.nivel === 'bajo' && t.image && t.image.width > 512) { try { const c = document.createElement('canvas'); c.width = c.height = 512; c.getContext('2d').drawImage(t.image, 0, 0, 512, 512); t.image = c; t.needsUpdate = true; } catch (e) { } } if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, () => res(null)); };
    promesa = Promise.race([Promise.all(IDS.map(async id => { const [c, n, r] = await Promise.all([carga('texturas/' + id + '_c.jpg', true), carga('texturas/' + id + '_n.jpg'), carga('texturas/' + id + '_r.jpg')]); if (c && n && r) TX[id] = { c, n, r }; })).then(() => (ok = Object.keys(TX).length > 0)),
      new Promise(res => setTimeout(() => res(false), 8000))]);
    return promesa;
  }
  const VERT_DEC = 'varying vec3 vWPt;\nvarying vec3 vWNt;\n', FRAG_DEC = 'varying vec3 vWPt;\nvarying vec3 vWNt;\nuniform float uMacT;\nuniform float uNieveT;\nfloat hT(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }\nfloat nT(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(mix(hT(i), hT(i + vec3(1,0,0)), f.x), mix(hT(i + vec3(0,1,0)), hT(i + vec3(1,1,0)), f.x), f.y), mix(mix(hT(i + vec3(0,0,1)), hT(i + vec3(1,0,1)), f.x), mix(hT(i + vec3(0,1,1)), hT(i + vec3(1,1,1)), f.x), f.y), f.z); }\nfloat macroT(vec3 p){ return nT(p * 0.045) * 0.5 + nT(p * 0.19) * 0.3 + nT(p * 0.85) * 0.2; }\nfloat cobNT(){ if (vWNt.y < 0.5 || uNieveT <= 0.0) return 0.0; return clamp(uNieveT * (0.6 + 1.2 * (vWNt.y - 0.5)) + (macroT(vWPt * 2.3) - 0.5) * 0.6 * uNieveT, 0.0, 1.0); }\nuniform float uEscT;\nuniform float uRugMinT;\nuniform float uMojadoT;\nuniform float uRelT;\nuniform vec3 uTinT;\nuniform sampler2D tColT;\nuniform sampler2D tNorT;\nuniform sampler2D tRouT;\n';
  // UV en el mundo según la cara dominante, y la base tangente correspondiente
  const UV = `vec3 aN = abs(vWNt); vec2 wuvT; vec3 tT; vec3 bT;
    if (aN.y >= aN.x && aN.y >= aN.z) { wuvT = vWPt.xz; tT = vec3(1.,0.,0.); bT = vec3(0.,0.,sign(vWNt.y)); }
    else if (aN.x >= aN.z) { wuvT = vec2(vWPt.z * sign(vWNt.x), vWPt.y); tT = vec3(0.,0.,sign(vWNt.x)); bT = vec3(0.,1.,0.); }
    else { wuvT = vec2(-vWPt.x * sign(vWNt.z), vWPt.y); tT = vec3(-sign(vWNt.z),0.,0.); bT = vec3(0.,1.,0.); }
    wuvT /= uEscT;`;
  function aplicar(mat, id, o) {
    o = o || {}; const T = TX[id]; if (!ok || !T || !mat || mat.userData.texturaReal) return mat;
    const color = o.color !== false, tinte = new THREE.Color(o.tinte || 0xffffff);
    mat.userData.texturaReal = id; if (color) { mat.color.set(0xffffff); }
    if (o.rugosidad !== undefined) mat.roughness = o.rugosidad; else mat.roughness = Math.max(mat.roughness, 0.85);
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, { uNieveT: nieveU, uMacT: { value: o.macro === undefined ? 1 : o.macro }, uMojadoT: mojadoU, uRugMinT: { value: o.rugMin === undefined ? 0.6 : o.rugMin }, uEscT: { value: o.escala || 2 }, uRelT: { value: o.relieve === undefined ? 1 : o.relieve }, uTinT: { value: tinte }, tColT: { value: T.c }, tNorT: { value: T.n }, tRouT: { value: T.r } });
      sh.vertexShader = VERT_DEC + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWPt = (modelMatrix * vec4(transformed, 1.0)).xyz; vWNt = normalize(mat3(modelMatrix) * objectNormal);');
      let fs = FRAG_DEC + sh.fragmentShader;
      if (color) fs = fs.replace('#include <map_fragment>', '{ ' + UV + ' diffuseColor.rgb *= texture2D(tColT, wuvT).rgb * uTinT; float mcT = macroT(vWPt); diffuseColor.rgb *= mix(1.0, mix(0.82, 1.14, mcT), uMacT); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.94, 0.97), cobNT()); if (vWNt.y < 0.5) diffuseColor.rgb *= mix(1.0, mix(0.74, 1.0, smoothstep(0.0, 2.2, vWPt.y)), uMacT); }');
      fs = fs.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n{ ' + UV + ' roughnessFactor = max(roughnessFactor * texture2D(tRouT, wuvT).g, uRugMinT); roughnessFactor = clamp(roughnessFactor * mix(1.0, mix(0.88, 1.1, macroT(vWPt)), uMacT), 0.04, 1.0); roughnessFactor = mix(roughnessFactor, 0.9, cobNT()); if (vWNt.y > 0.7 && uMojadoT > 0.0) { float charcoT = smoothstep(0.56, 0.68, texture2D(tRouT, wuvT * 0.11 + 0.37).g); roughnessFactor = mix(roughnessFactor, mix(max(roughnessFactor * 0.75, 0.45), 0.06, charcoT), uMojadoT); diffuseColor.rgb *= 1.0 - (0.12 + 0.18 * charcoT) * uMojadoT; } }');
      fs = fs.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n{ ' + UV + ' vec3 nT = texture2D(tNorT, wuvT).xyz * 2.0 - 1.0; nT.xy *= uRelT; vec3 nW = normalize(tT * nT.x + bT * nT.y + normalize(vWNt) * nT.z); normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz); }');
      sh.fragmentShader = fs;
    };
    mat.customProgramCacheKey = () => 'tr-' + id + (color ? 'c' : 'r');
    mat.needsUpdate = true; return mat;
  }
  // Material nuevo con la textura real (o el color de respaldo si no hay texturas)
  function material(id, o) { o = o || {}; const m = new THREE.MeshStandardMaterial({ color: o.respaldo || 0x999999, roughness: 0.9 }); return aplicar(m, id, o); }
  GM.texturas = { ktx2, _TX: TX, nieveU, mojadoU, precargar, aplicar, material, listo: () => ok, IDS };
})();
