/* VEHÍCULOS Y MICROMOVILIDAD (punto 76, GM.vehiculos) — catálogo de vehículos con los colores y las marcas de cada ciudad, hechos por código (sin modelos descargados).
   - MARCAS: por país/ciudad, color y nombre de los taxis, los autobuses urbanos y las bicis y patinetes de alquiler (Barcelona: taxi negro y amarillo, Bicing rojo; Madrid: taxi blanco con banda roja, BiciMAD; Atenas, Estambul…: taxi amarillo).
   - crear(tipo, ciudad, opciones) devuelve un grupo de Three listo para la escena. Tipos: turismo, compacto, todoterreno, furgoneta, taxi, policia, ambulancia (los de GM.kit.coche, con el color de la ciudad), autobus (urbano con puertas, ventanas y cartel de línea),
     tranvia (articulado de dos cuerpos con pantógrafo), patinete (eléctrico de alquiler con color de marca), bici_alquiler (bici de GM.urbano con el color de la marca), moto (GM.urbano.moto).
   - tipos(): lista de tipos y su largo en metros; marca(st): marca de la ciudad del club. Todo lo animado lleva userData.coche = true como el resto de vehículos. Expone: MARCAS, tipos, marca, taxiColor, crear, selfTest. */
(function () {
  const MARCAS = {
    ES: { taxi: ['#f4f4f4', '#c8102e'], bus: '#c8102e', bici: ['Bici pública', '#c8102e'], pat: ['Patinete', '#00a3a1'] },
    'ES-CT': { taxi: ['#1d1d1b', '#f2c500'], bus: '#d4202e', bici: ['Bicing', '#d4202e'], pat: ['Patinete', '#1d4f91'] },
    'ES-MD': { taxi: ['#f4f4f4', '#c8102e'], bus: '#1d4f91', bici: ['BiciMAD', '#1d4f91'], pat: ['Patinete', '#fcd116'] },
    GR: { taxi: ['#f2c500', '#1d1d1b'], bus: '#1d4f91', bici: ['Bici pública', '#00a3a1'], pat: ['Patinete', '#00a3a1'] },
    TR: { taxi: ['#f2c500', '#1d1d1b'], bus: '#1d6fb4', bici: ['Bici pública', '#e30613'], pat: ['Patinete', '#7a3fc8'] },
    IT: { taxi: ['#f4f4f4', '#f4f4f4'], bus: '#e30613', bici: ['Bici pública', '#1d4f91'], pat: ['Patinete', '#fcd116'] },
    DE: { taxi: ['#f6e7b4', '#f6e7b4'], bus: '#f2c500', bici: ['Bici pública', '#e30613'], pat: ['Patinete', '#00a3a1'] },
    FR: { taxi: ['#1d1d1b', '#1d1d1b'], bus: '#00a3a1', bici: ['Vélo en libre servicio', '#1d4f91'], pat: ['Patinete', '#e30613'] },
    RS: { taxi: ['#f2c500', '#1d1d1b'], bus: '#d4202e', bici: ['Bici pública', '#2f8f7a'], pat: ['Patinete', '#1d4f91'] },
    US: { taxi: ['#f2c500', '#1d1d1b'], bus: '#1d4f91', bici: ['Bike share', '#1d4f91'], pat: ['Scooter', '#2fa84f'] },
    _: { taxi: ['#f2c500', '#1d1d1b'], bus: '#2f6f9e', bici: ['Bici pública', '#2f8f7a'], pat: ['Patinete', '#00a3a1'] }
  };
  const LARGO = {
    turismo: 4.4,
    compacto: 3.9,
    todoterreno: 4.7,
    furgoneta: 5.4,
    taxi: 4.5,
    policia: 4.5,
    ambulancia: 5.5,
    autobus: 11.5,
    tranvia: 24,
    patinete: 1.1,
    bici_alquiler: 1.8,
    moto: 2
  };
  const tipos = () => Object.keys(LARGO).map(k => ({ tipo: k, largo: LARGO[k] }));
  const CIUDAD = { 'fc-barcelona': 'ES-CT', 'joventut-badalona': 'ES-CT', 'real-madrid': 'ES-MD' };
  function marca(st, ciudad) {
    const e = st && st.equipos && st.equipos[st.clubId],
      id = ciudad || (e && CIUDAD[e.id]) || (e && e.pais) || '_';
    return MARCAS[id] || MARCAS[String(id).slice(0, 2)] || MARCAS._;
  }
  const taxiColor = (st, ciudad) => marca(st, ciudad).taxi[0];
  const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
  const caja = (g, w, h, d, m, x, y, z) => {
    const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    me.position.set(x, y, z);
    me.castShadow = true;
    g.add(me);
    return me;
  };
  const ruedas = (g, pts, r, ancho) =>
    pts.forEach(([x, z]) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, ancho || 0.3, 14), mat('#151515', { roughness: 0.9 }));
      w.rotation.z = Math.PI / 2;
      w.position.set(x, r, z);
      g.add(w);
    });
  function autobus(color, linea) {
    const g = new THREE.Group(),
      L = 11.5,
      cuerpo = mat(color, { roughness: 0.4, metalness: 0.2 }),
      cristal = mat('#22303a', { roughness: 0.1, metalness: 0.5 }),
      blanco = mat('#e9edf0');
    caja(g, 2.5, 2.9, L, cuerpo, 0, 1.75, 0);
    caja(g, 2.52, 0.7, L - 0.4, blanco, 0, 0.95, 0);
    caja(g, 2.54, 1.0, L - 0.6, cristal, 0, 2.15, 0);
    for (let i = 0; i < 4; i++) caja(g, 2.56, 1.0, 0.1, cuerpo, 0, 2.15, -4.2 + i * 2.6); // montantes entre ventanas
    for (const z of [3.4, -1.2]) {
      caja(g, 0.05, 1.8, 1.2, mat('#2c3a44', { roughness: 0.1 }), 1.27, 1.55, z);
      caja(g, 0.05, 1.8, 1.2, mat('#2c3a44', { roughness: 0.1 }), -1.27, 1.55, z);
    } // puertas
    caja(g, 2.4, 0.08, L - 0.2, mat('#c9cdd1'), 0, 3.22, 0);
    caja(g, 1.4, 0.4, 0.06, mat('#111', { emissive: 0xffa000, emissiveIntensity: 0.9 }), 0, 2.95, L / 2 + 0.01); // cartel de destino
    if (linea) {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 64;
      const x = c.getContext('2d');
      if (x) {
        x.fillStyle = '#111';
        x.fillRect(0, 0, 128, 64);
        x.fillStyle = '#ffb000';
        x.font = 'bold 44px sans-serif';
        x.textAlign = 'center';
        x.fillText(String(linea), 64, 48);
        const t = new THREE.CanvasTexture(c);
        const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.34), new THREE.MeshBasicMaterial({ map: t }));
        p.position.set(0, 2.95, L / 2 + 0.05);
        g.add(p);
      }
    }
    ruedas(
      g,
      [
        [-1.1, 3.6],
        [1.1, 3.6],
        [-1.1, -3.4],
        [1.1, -3.4]
      ],
      0.5,
      0.35
    );
    caja(g, 0.5, 0.18, 0.05, mat('#fff6d6', { emissive: 0xfff1c4, emissiveIntensity: 0.6 }), -0.8, 0.8, L / 2 + 0.02);
    caja(g, 0.5, 0.18, 0.05, mat('#fff6d6', { emissive: 0xfff1c4, emissiveIntensity: 0.6 }), 0.8, 0.8, L / 2 + 0.02);
    g.position.y = -0.12;
    return g;
  }
  function tranvia(color) {
    const g = new THREE.Group(),
      cu = mat(color, { roughness: 0.35, metalness: 0.3 }),
      cristal = mat('#22303a', { roughness: 0.1, metalness: 0.5 }),
      gris = mat('#c9cdd1');
    for (const z0 of [-6.1, 6.1]) {
      const v = new THREE.Group();
      caja(v, 2.4, 3.0, 11.8, cu, 0, 1.8, 0);
      caja(v, 2.42, 1.0, 11.4, cristal, 0, 2.2, 0);
      caja(v, 2.4, 0.3, 11.8, mat('#e9edf0'), 0, 0.5, 0);
      caja(v, 2.3, 0.08, 11.6, gris, 0, 3.34, 0);
      ruedas(
        v,
        [
          [-1.0, 3.8],
          [1.0, 3.8],
          [-1.0, -3.8],
          [1.0, -3.8]
        ],
        0.4,
        0.25
      );
      v.position.z = z0;
      g.add(v);
    }
    caja(g, 2.0, 2.6, 0.6, mat('#111', { roughness: 0.8 }), 0, 1.7, 0); // fuelle de unión
    caja(g, 1.4, 0.06, 1.8, mat('#222'), 0, 3.6, 5.5);
    caja(g, 0.06, 0.5, 0.06, mat('#222'), 0, 3.4, 5.5); // pantógrafo
    g.position.y = -0.12;
    return g;
  }
  function patinete(color) {
    const g = new THREE.Group(),
      cu = mat(color, { roughness: 0.4 }),
      neg = mat('#1d2024', { roughness: 0.8 });
    caja(g, 0.18, 0.05, 0.7, cu, 0, 0.12, 0);
    caja(g, 0.04, 0.9, 0.04, neg, 0, 0.55, 0.32);
    caja(g, 0.45, 0.04, 0.04, neg, 0, 1.0, 0.32);
    for (const z of [-0.32, 0.36]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12), neg);
      w.rotation.z = Math.PI / 2;
      w.position.set(0, 0.1, z);
      g.add(w);
    }
    g.userData = { coche: true, tipo: 'patinete', largo: LARGO.patinete };
    return g;
  }
  // ---------- modelos de Kenney (Car Kit, CC0): para la calidad normal y el móvil; se cargan una vez con precargar() ----------
  const KENNEY = {
      turismo: 'sedan',
      compacto: 'hatchback-sports',
      todoterreno: 'suv',
      furgoneta: 'van',
      taxi: 'taxi',
      policia: 'police',
      ambulancia: 'ambulance',
      bomberos: 'firetruck',
      reparto: 'delivery',
      basura: 'garbage-truck',
      camion: 'truck'
    },
    cache = {};
  let cargando = null;
  function precargar() {
    if (cargando) return cargando;
    if (!GM.sede || !GM.sede.modeloReal) return Promise.resolve(0);
    cargando = Promise.all(
      Object.keys(KENNEY).map(t =>
        GM.sede
          .modeloReal(KENNEY[t], 'modelos/vehiculos/' + KENNEY[t] + '.glb')
          .then(sc => {
            cache[t] = sc;
          })
          .catch(() => null)
      )
    ).then(() => Object.keys(cache).length);
    return cargando;
  }
  const LARGO_K = { turismo: 4.4, compacto: 4, todoterreno: 4.7, furgoneta: 5.2, taxi: 4.5, policia: 4.5, ambulancia: 5.5, bomberos: 8, reparto: 5.6, basura: 7, camion: 6.5 };
  // devuelve una copia del modelo de Kenney a escala real y con el morro hacia +z, o null si no está cargado
  function kenney(tipo) {
    const sc = cache[tipo];
    if (!sc) return null;
    const g = new THREE.Group(),
      m = sc.clone(true),
      b = new THREE.Box3().setFromObject(m),
      tam = b.getSize(new THREE.Vector3()),
      largo = Math.max(tam.x, tam.z),
      k = (LARGO_K[tipo] || 4.4) / largo;
    m.scale.setScalar(k);
    if (tam.x > tam.z) m.rotation.y = Math.PI / 2;
    const b2 = new THREE.Box3().setFromObject(m),
      c = b2.getCenter(new THREE.Vector3());
    m.position.set(-c.x, -b2.min.y, -c.z);
    const pv = new THREE.Group();
    pv.rotation.y = ORIENTACION_K;
    pv.add(m);
    g.add(pv);
    m.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    g.userData = { coche: true, tipo, largo: LARGO_K[tipo] || 4.4, kenney: true };
    return g;
  }
  let ORIENTACION_K = 0;
  function crear(tipo, ciudad, op) {
    op = op || {};
    const M = marca(op.st, ciudad);
    let g;
    if (tipo === 'autobus') g = autobus(op.color || M.bus, op.linea);
    else if (tipo === 'tranvia') g = tranvia(op.color || M.bus);
    else if (tipo === 'patinete') g = patinete(op.color || M.pat[1]);
    else if (tipo === 'bici_alquiler') g = GM.urbano && GM.urbano.bici ? GM.urbano.bici(op.color || M.bici[1]) : new THREE.Group();
    else if (tipo === 'moto') g = GM.urbano && GM.urbano.moto ? GM.urbano.moto(op.color) : new THREE.Group();
    else if (tipo === 'taxi') {
      g = GM.kit.coche(M.taxi[0], 'taxi');
      if (M.taxi[1] !== M.taxi[0]) caja(g, 1.85, 0.12, 2.6, mat(M.taxi[1], { roughness: 0.4 }), 0, 0.62, -0.1);
    } else if (tipo === 'policia') g = GM.kit.coche('#f2f4f6', 'turismo');
    else if (op.kenney !== false && KENNEY[tipo] && (op.kenney === true || (GM.campus && GM.campus.config.calidad !== 'alta')) && kenney(tipo)) g = kenney(tipo);
    else g = GM.kit.coche(op.color || '#c8ccd0', tipo || 'turismo');
    g.userData = Object.assign({ coche: true, tipo, largo: LARGO[tipo] || 4.4 }, g.userData || {});
    return g;
  }
  function selfTest() {
    return tipos().length >= 12 && marca(null, 'ES-CT').taxi[0] === '#1d1d1b' && marca(null, 'XX').bus === MARCAS._.bus && taxiColor(null, 'GR') === '#f2c500';
  }
  GM.vehiculos = { precargar, kenney, KENNEY, MARCAS, tipos, marca, taxiColor, crear, selfTest };
  GM.register && GM.register('vehiculos', GM.vehiculos);
})();
