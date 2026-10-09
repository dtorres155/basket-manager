/* CIUDAD AMPLIADA (GM.ciudadBarrios) — los barrios que rodean el centro de la calle (calle3d.js)
   La avenida se alarga de -150 a 150 m, la calle central sube hacia el norte hasta la ciudad deportiva y una ronda (z = -30) cruza la
   ciudad. Alrededor del centro hay tres barrios con nombre real (ciudad3d.barrios):
   - Oeste (residencial): bloques de pisos, colegio y un parque grande.
   - Este (zona alta): chalets con jardín, mansiones con piscina y la estación de tren.
   - Norte (ensanche): torres con áticos, el hospital y la puerta de la ciudad deportiva.
   Tus viviendas (hogar.viviendas: la que habitas y las que tienes en propiedad) ocupan parcelas de su barrio con una fachada según su
   variante (loft de ladrillo, buhardilla, bloque clásico o moderno, ático con terraza, casa mediterránea, de piedra o moderna, mansión
   clásica, moderna o villa con piscina) y una puerta por la que se entra en ella (escena 'casa:<id>'). Las parcelas libres llevan
   edificios del barrio. Colegio, hospital, estación y campus tienen las actividades del mapa de Ciudad (ciudad3d.acciones/hacer).
   Cada barrio va en su grupo y no se dibuja cuando está lejos (actualizar). Expone: construir(ctx) -> { zonas, salas, paseo, puertas, distritos }, actualizar(S). */
(function () {
  const U = GM.util;
  const CLASE = { residencia: 'bloque', loft: 'bloque', buhardilla: 'bloque', bloque: 'bloque', 'bloque-moderno': 'bloque', moderno: 'atico', rustico: 'atico', mediterranea: 'casa', piedra: 'casa', moderna: 'casa', clasica: 'mansion', 'mansion-moderna': 'mansion', villa: 'mansion' };
  // Distrito de cada barrio (índice de ciudad3d.barrios): 0 y 2 son el centro (la avenida y la plaza)
  const DIST_BARRIO = ['centro', 'norte', 'centro', 'oeste', 'este', 'oeste'];
  // Parcelas: [distrito, clase, rect [x0, z0, x1, z1], lado de la fachada ('n' mira a -z, 's' a +z)]
  const LOTES = [
    ['centro', 'bloque', [-39, 6.5, -24, 17], 's'],                 // el antiguo «Portal 7»
    ['oeste', 'bloque', [-88, 7, -74, 19], 'n'], ['oeste', 'bloque', [-72, 7, -58, 19], 'n'], ['oeste', 'bloque', [-88, -21, -74, -7], 's'], ['oeste', 'atico', [-72, -22, -58, -7], 's'],
    ['oeste', 'casa', [-108, 7, -93, 22], 'n'],
    ['este', 'casa', [48, 7, 63, 22], 'n'], ['este', 'casa', [67, 7, 82, 22], 'n'], ['este', 'casa', [48, -22, 63, -7], 's'],
    ['este', 'mansion', [86, 6, 108, 23], 'n'], ['este', 'mansion', [86, -24, 108, -7], 's'], ['este', 'mansion', [112, -24, 134, -7], 's'],
    ['norte', 'atico', [8, -56, 24, -36], 's'], ['norte', 'atico', [27, -56, 42, -36], 's'], ['norte', 'bloque', [-150, -52, -132, -36], 's'], ['norte', 'casa', [48, -52, 63, -36], 's']
  ];
  const DISTRITOS = { centro: { x: 0, z: 10, r: 60 }, oeste: { x: -98, z: -10, r: 70 }, este: { x: 98, z: -10, r: 70 }, norte: { x: 0, z: -70, r: 95 } };

  function construir(ctx) {
    const { S, M, W, G, T, E, r, club, st, c1, c2, afi, h: H } = ctx, { caja, cil, plano, letrero, edificio, ocluye, mat } = H;
    const bar = (GM.mods.ciudad3d && GM.mods.ciudad3d.barrios ? GM.mods.ciudad3d.barrios(st).map(b => b.nombre) : []);
    const nomDist = { oeste: bar[3] || 'Oeste', este: bar[4] || 'Este', norte: bar[1] || 'Norte', centro: bar[0] || club.ciudad };
    const out = { zonas: {}, salas: {}, paseo: [], puertas: {}, distritos: [] };
    const grupos = {}; Object.keys(DISTRITOS).forEach(k => { if (k === 'centro') return; const g = new THREE.Group(); g.userData = { distrito: k }; W.add(g); grupos[k] = g; out.distritos.push({ g, d: DISTRITOS[k] }); });
    const enG = k => grupos[k] || W;
    // ---- Suelo: asfalto bajo toda la ciudad, aceras por manzanas, avenida, calle central, ronda y pasos de peatones ----
    const asf = new THREE.Mesh(new THREE.PlaneGeometry(300, 140).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: T.asfalto, roughness: 0.95 })); H.uvM(asf.geometry, 4, 4); asf.position.set(0, -0.125, -43); asf.receiveShadow = true; W.add(asf);
    const mAcera = new THREE.MeshStandardMaterial({ map: T.acera, roughness: 0.9 });
    const acera = (x0, z0, x1, z1, g) => { const geo = new THREE.BoxGeometry(x1 - x0, 0.12, z1 - z0); H.uvM(geo, 1.5, 1.5); const me = new THREE.Mesh(geo, mAcera); me.position.set((x0 + x1) / 2, -0.06, (z0 + z1) / 2); me.receiveShadow = true; (g || W).add(me); };
    acera(-150, 3, -42, 24, grupos.oeste); acera(42, 3, 150, 24, grupos.este); acera(-150, -27, -42, -3, grupos.oeste); acera(42, -27, 150, -3, grupos.este);
    acera(-42, -27, -3, -24); acera(3, -27, 42, -24); acera(-150, -110, -3, -33, grupos.norte); acera(3, -110, 150, -33, grupos.norte);
    // la calzada no se pisa salvo en los pasos; la ronda (sin coches) sí
    G.bloquea(-150, -3, -42, 3); G.bloquea(42, -3, 150, 3); G.bloquea(-3, -100, 3, -24);
    const blanco = mat('#f2f2ee');
    const paso = (x0, z0, x1, z1, eje) => { acera(x0, z0, x1, z1); for (let i = 0; i < 6; i++) { if (eje === 'x') caja(W, 0.45, 0.01, z1 - z0, blanco, x0 + (i + 0.5) * (x1 - x0) / 6, 0, (z0 + z1) / 2, 0, false); else caja(W, x1 - x0, 0.01, 0.45, blanco, (x0 + x1) / 2, 0, z0 + (i + 0.5) * (z1 - z0) / 6, 0, false); } };
    [-120, -66, 66, 120].forEach(x => paso(x - 1.5, -3, x + 1.5, 3, 'z'));
    [-30, -70].forEach(z => paso(-3, z - 1.5, 3, z + 1.5, 'x'));
    for (let x = -148; x < 148; x += 4) if (Math.abs(x) > 44 && !([-120, -66, 66, 120].some(p => Math.abs(x + 1 - p) < 3))) caja(W, 2, 0.01, 0.15, blanco, x + 1, -0.115, 0, 0, false);
    for (let z = -98; z < -26; z += 4) caja(W, 0.15, 0.01, 2, blanco, 0, -0.115, z + 1, 0, false);
    // Placas de los barrios
    [['oeste', -46, 5.8], ['este', 46, 5.8], ['norte', 5, -36]].forEach(([k, x, z]) => { cil(W, 0.05, 2.9, '#2a2f35', x, 0, z); letrero(W, T.letrero('Barrio de ' + nomDist[k], '#1d4f91', '#fff', 'bar-' + k), 3.8, 0.7, x, 2.7, z + 0.05, 0); });
    // ---- Árboles en las aceras de la avenida y de la ronda, y farolas ----
    const tronco = mat('#6b5136'), copas = [mat('#4f7f3a'), mat('#5d8c41'), mat('#476f34')];
    const arbol = (x, z, g, k) => { cil(g, 0.14, 2.2, tronco, x, 0, z, 6); const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 1), copas[((k % 3) + 3) % 3]); c.position.set(x, 3.0, z); c.scale.y = 0.9; c.castShadow = true; g.add(c); G.bloquea(x - 0.3, z - 0.3, x + 0.3, z + 0.3); };
    for (let x = -146; x <= 146; x += 13) { if (Math.abs(x) < 46 || [-120, -66, 66, 120].some(p => Math.abs(x - p) < 4)) continue; const g = enG(x < 0 ? 'oeste' : 'este'); arbol(x, -4.4, g, (x / 13) | 0); arbol(x + 6, 4.4, g, 1 + (x / 13) | 0); }
    for (let x = -146; x <= 146; x += 16) { if (Math.abs(x) < 5) continue; arbol(x, -34.6, grupos.norte, (x / 16) | 0); }
    const farola = (x, z, g) => { cil(g, 0.07, 4.6, '#2a2f35', x, 0, z, 8); const l = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.3), S.farolas || mat('#fff6d6')); l.position.set(x, 4.5, z); g.add(l); G.bloquea(x - 0.15, z - 0.15, x + 0.15, z + 0.15); };
    for (let x = -144; x <= 144; x += 18) { if (Math.abs(x) < 46) continue; farola(x, -3.4, enG(x < 0 ? 'oeste' : 'este')); farola(x + 9, 3.4, enG(x < 0 ? 'oeste' : 'este')); }
    for (let z = -96; z <= -38; z += 14) { farola(-3.4, z, grupos.norte); farola(3.4, z + 7, grupos.norte); }
    // ---- Parcelas: tus viviendas en su barrio; las demás, edificios del barrio ----
    const vivs = GM.mods.hogar && GM.mods.hogar.viviendas ? GM.mods.hogar.viviendas(st) : [], usados = new Set();
    vivs.forEach(v => {
      const cl = CLASE[v.ext] || 'bloque', dist = DIST_BARRIO[v.barrio % 6] || 'oeste';
      let i = LOTES.findIndex((l, k) => !usados.has(k) && l[0] === dist && l[1] === cl); if (i < 0) i = LOTES.findIndex((l, k) => !usados.has(k) && l[1] === cl); if (i < 0) return;
      usados.add(i); v.lote = i;
    });
    LOTES.forEach((l, i) => {
      const [dist, cl, rect, lado] = l, g = enG(dist), v = vivs.find(x => x.lote === i);
      const fz = lado === 'n' ? rect[1] : rect[3], sgn = lado === 'n' ? -1 : 1, cx = (rect[0] + rect[2]) / 2, puerta = [cx, fz + sgn * 1.4];
      if (v) {
        fachada(ctx, g, v.ext, rect, lado, v, H);
        const id = 'casa_' + v.id.replace(/[^a-zA-Z0-9]/g, '');
        out.salas[id] = { id, nombre: v.nombre + (v.actual ? ' (vives aquí)' : ' (tuya)'), accion: v.barrioNombre ? 'Tu casa en ' + v.barrioNombre : 'Tu casa', destino: {}, irA: 'casa:' + v.id, boton: 'Entrar en casa' };
        out.zonas[id] = puerta; out.puertas['casa:' + v.id] = { x: puerta[0], z: puerta[1] + sgn * 0.6, ry: lado === 'n' ? Math.PI : 0 };
        if (v.actual) out.puertas.casa = out.puertas['casa:' + v.id];
      } else generico(ctx, g, cl, rect, lado, i, H);
      out.paseo.push(puerta);
    });
    // ---- Edificios públicos con las actividades del mapa de Ciudad ----
    const C3 = GM.mods.ciudad3d, lugar = tipo => { const l = C3 && C3.lugares ? C3.lugares(st).find(x => x.tipo === tipo) : null; return l ? l.id : null; };
    const salaLugar = (id, nombre, tipo, pos) => {
      const lid = lugar(tipo);
      out.salas[id] = { id, nombre, accion: '', destino: {}, acciones: s2 => { if (!lid) return [{ id: 'nada', t: nombre, d: '', disponible: false, motivo: 'Sin actividades', fn: () => ({ ok: false }) }]; const L = C3.acciones(s2, lid); return L.length ? L.map(a => ({ id: a.id, t: a.t, d: (a.coste ? (a.jugador ? a.coste + ' mil €' : U.eur(a.coste)) : 'Gratis') + (a.ef && a.ef.barrio ? ', cariño del barrio' : ''), disponible: a.disponible, motivo: a.motivo || 'No disponible', fn: () => { const r2 = C3.hacer(s2, lid, a.id); return r2.ok ? { ok: true, texto: a.t } : r2; } })) : [{ id: 'nada', t: nombre, d: '', disponible: false, motivo: 'Sin actividades', fn: () => ({ ok: false }) }]; } };
      out.zonas[id] = pos; out.paseo.push(pos);
    };
    // Colegio (oeste): dos plantas, patio con pista y valla
    { const g = grupos.oeste; edificio(g, G, T, E, r, [-150, 9, -112, 22], 2, 'n', { colorBajo: '#c9733f', letrero: { txt: 'COLEGIO ' + nomDist.oeste.toUpperCase(), fondo: '#f4efe3', letra: '#2a2a2a', clave: 'cole', ancho: 12 } });
      const pista = caja(g, 14, 0.04, 6, '#2f6f9e', -131, 0.02, 6, 0, false); void pista; salaLugar('lugar_colegio', 'Colegio ' + nomDist.oeste, 'colegio', [-131, 4.8]); }
    // Parque grande del oeste
    { const g = grupos.oeste, cesped = new THREE.Mesh(new THREE.PlaneGeometry(54, 18).rotateX(-Math.PI / 2), mat('#6f9a4a', { roughness: 1 })); cesped.position.set(-122, 0.005, -16); cesped.receiveShadow = true; g.add(cesped);
      caja(g, 54, 0.01, 2, '#c9b89a', -122, 0.01, -16, 0, false); for (let k = 0; k < 9; k++) arbol(-146 + k * 6, k % 2 ? -10 : -22, g, k);
      for (const x of [-136, -122, -108]) { caja(g, 1.6, 0.45, 0.45, '#7a5638', x, 0, -14.6); G.bloquea(x - 0.8, -14.9, x + 0.8, -14.3); }
      letrero(g, T.letrero('PARQUE DE ' + nomDist.oeste.toUpperCase(), '#2e5d3a', '#fff', 'parq-o'), 4.4, 0.8, -122, 2.4, -7.3, 0); cil(g, 0.05, 2.6, '#2a2f35', -124.4, 0, -7.3); cil(g, 0.05, 2.6, '#2a2f35', -119.6, 0, -7.3); }
    // Hospital (norte): bloque blanco con la cruz roja
    { const g = grupos.norte; edificio(g, G, T, E, r, [-40, -62, -8, -38], 5, 's', { cristal: true, colorBajo: '#e9edf1', letrero: { txt: 'HOSPITAL ' + nomDist.norte.toUpperCase(), fondo: '#ffffff', letra: '#c0392b', clave: 'hosp', ancho: 12 } });
      caja(g, 3, 1, 0.3, '#d62d2d', -24, 18, -37.7); caja(g, 1, 3, 0.3, '#d62d2d', -24, 17, -37.7); salaLugar('lugar_hospital', 'Hospital ' + nomDist.norte, 'hospital', [-24, -35.6]); }
    // Bloques y oficinas del norte
    [[-150, -82, -120, -62], [-112, -58, -84, -38], [-80, -58, -46, -38], [48, -82, 80, -62], [84, -58, 116, -38], [120, -58, 150, -38], [-40, -100, -8, -70], [8, -100, 40, -66]].forEach((rc, k) => { const g = grupos.norte; edificio(g, G, T, E, r, rc, 4 + (k % 4), 's', { kit: k % 3 === 0 ? true : k % 3 === 1 ? 'arcos' : false, cristal: k % 4 === 3, banderas: Math.round(afi / 30), c1, c2, letrero: k % 2 ? { txt: ['BANCO', 'SUPERMERCADO', 'GIMNASIO', 'ÓPTICA'][k % 4], fondo: ['#1d4f91', '#c0392b', '#2e5d3a', '#6b3a7a'][k % 4], letra: '#fff', clave: 'n' + k, ancho: 5 } : null }); });
    // Puerta de la ciudad deportiva al final de la calle central
    { const g = grupos.norte; for (const s of [-1, 1]) caja(g, 1.6, 7, 1.6, c1, s * 6, 0, -104); caja(g, 13.6, 1.6, 1.6, c2 === '#ffffff' ? '#e8eef2' : c2, 0, 7, -104);
      letrero(g, T.letrero((club.ciudadDeportiva && club.ciudadDeportiva.nombre ? club.ciudadDeportiva.nombre : 'Ciudad deportiva').toUpperCase(), c1, '#ffffff', 'cdep'), 11, 1.4, 0, 7.8, -103.15, 0);
      G.bloquea(-7, -105, -5, -103); G.bloquea(5, -105, 7, -103); G.bloquea(-150, -110, 150, -105); salaLugar('lugar_campus', club.ciudadDeportiva && club.ciudadDeportiva.nombre ? club.ciudadDeportiva.nombre : 'Ciudad deportiva', 'campus', [0, -100]); }
    // Estación de tren (este)
    { const g = grupos.este; edificio(g, G, T, E, r, [124, 9, 150, 22], 2, 'n', { colorBajo: '#8a6d3b', letrero: { txt: 'ESTACIÓN ' + club.ciudad.toUpperCase(), fondo: '#2a2f35', letra: '#f2d27a', clave: 'esta', ancho: 10 } });
      cil(g, 0.9, 0.12, '#f4f1e8', 137, 9.6, 8.94).rotation.x = Math.PI / 2; caja(g, 26, 0.12, 3.4, '#5d6b78', 137, 3.6, 7.2); for (const x of [126, 137, 148]) cil(g, 0.08, 3.6, '#2a2f35', x, 0, 5.8);
      salaLugar('lugar_estacion', 'Estación de ' + club.ciudad, 'estacion', [137, 4.6]); }
    // Paseo de los vecinos por los barrios nuevos
    for (let x = -146; x <= 146; x += 6) if (Math.abs(x) > 44) out.paseo.push([x, -4.8], [x, 4.8]);
    for (let x = -146; x <= 146; x += 8) out.paseo.push([x, -26], [x, -35]);
    for (let z = -98; z <= -30; z += 6) out.paseo.push([-4.8, z], [4.8, z]);
    return out;
  }
  // ---- Fachadas de tus viviendas según su variante ----
  function fachada(ctx, g, ext, rect, lado, v, H) {
    const { G, T, E, r, c1, c2 } = ctx, { caja, cil, edificio, ocluye, mat } = H, [x0, z0, x1, z1] = rect, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, sgn = lado === 'n' ? -1 : 1, fz = lado === 'n' ? z0 : z1;
    const cartel = (txt, col) => { const t = T.letrero(txt, '#1b2027', col || '#f2d27a', 'casa-' + v.id); H.letrero(g, t, 4, 0.75, cx, 2.9, fz + sgn * 0.06, lado === 'n' ? Math.PI : 0); };
    const cl = CLASE[ext] || 'bloque';
    if (cl === 'bloque' || cl === 'atico') {
      const opt = { loft: { colorMuro: '#a9604a', kit: true, pisos: 3 }, buhardilla: { pisos: 4, kit: 'arcos' }, bloque: { pisos: 5, kit: 'arcos' }, 'bloque-moderno': { pisos: 6, cristal: true }, residencia: { pisos: 3 }, moderno: { pisos: 7, cristal: true }, rustico: { pisos: 6, kit: 'arcos' } }[ext] || { pisos: 5 };
      const e = edificio(g, G, T, E, r, rect, opt.pisos, lado, { kit: opt.kit, cristal: opt.cristal, colorMuro: opt.colorMuro, colorBajo: '#2a2f35', banderas: 2, c1, c2 });
      const alto = e && e.alto ? e.alto : 3.4 + opt.pisos * 3.2;
      if (ext === 'buhardilla') { const tj = new THREE.Mesh(new THREE.CylinderGeometry(0.01, (x1 - x0) * 0.62, 3, 4, 1), mat('#5a4a44')); tj.rotation.y = Math.PI / 4; tj.scale.z = (z1 - z0) / (x1 - x0); tj.position.set(cx, alto + 1.5, cz); g.add(tj); }
      if (cl === 'atico') {   // ático: planta retranqueada de cristal, terraza con barandilla y plantas
        const w = (x1 - x0) * 0.6, d = (z1 - z0) * 0.55, bg = new THREE.Group(); g.add(bg); ocluye(bg);
        caja(bg, w, 3, d, ext === 'rustico' ? '#d8c3a0' : mat('#9fc4dc', { roughness: 0.1, metalness: 0.3 }), cx, alto, cz - sgn * 1); caja(bg, w + 0.4, 0.2, d + 0.4, '#2a2f35', cx, alto + 3, cz - sgn * 1);
        caja(bg, x1 - x0 - 0.4, 1, 0.08, mat('#bfe0f0', { transparent: true, opacity: 0.45 }), cx, alto, fz - sgn * 0.3);
        for (let k = 0; k < 4; k++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), mat('#4f8f45')); p.position.set(x0 + 1.2 + k * (x1 - x0 - 2.4) / 3, alto + 0.6, fz - sgn * 1.2); bg.add(p); }
      }
      cartel(v.nombre.toUpperCase(), v.actual ? '#7fe0a0' : '#f2d27a');
      return;
    }
    // Casas y mansiones: parcela con césped, valla, camino a la puerta y la casa en medio
    const bg = new THREE.Group(); g.add(bg); ocluye(bg);
    const cesped = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), mat('#6f9a4a', { roughness: 1 })); cesped.position.set(cx, 0.006, cz); cesped.receiveShadow = true; g.add(cesped);
    const valla = ext === 'piedra' ? '#a39380' : ext === 'clasica' ? '#e9e0cc' : ext === 'moderna' || ext === 'mansion-moderna' ? '#3b4148' : '#f2efe8', hv = cl === 'mansion' ? 1.8 : 0.9;
    for (const [a, b, c, d] of [[x0, z0, x1, z0 + 0.25], [x0, z1 - 0.25, x1, z1], [x0, z0, x0 + 0.25, z1], [x1 - 0.25, z0, x1, z1]]) {
      const frente = (lado === 'n' && b === z0 && d === z0 + 0.25) || (lado === 's' && b === z1 - 0.25);
      if (frente) { caja(g, cx - 1.2 - a, hv, d - b, valla, (a + cx - 1.2) / 2, 0, (b + d) / 2); caja(g, c - cx - 1.2, hv, d - b, valla, (cx + 1.2 + c) / 2, 0, (b + d) / 2); G.bloquea(a, b, cx - 1.2, d); G.bloquea(cx + 1.2, b, c, d); }
      else { caja(g, c - a, hv, d - b, valla, (a + c) / 2, 0, (b + d) / 2); G.bloquea(a, b, c, d); }
    }
    const W2 = cl === 'mansion' ? (x1 - x0) * 0.62 : (x1 - x0) * 0.6, D2 = cl === 'mansion' ? (z1 - z0) * 0.42 : (z1 - z0) * 0.45, hz = cz - sgn * (z1 - z0) * 0.12, pisos = 2, hP = 3;
    const muro = { mediterranea: '#f6f1e6', piedra: '#b8ab94', moderna: '#f4f4f2', clasica: '#e9e0cc', 'mansion-moderna': '#f3f5f7', villa: '#faf4e8' }[ext] || '#efe8da';
    caja(bg, W2, pisos * hP, D2, muro, cx, 0, hz); G.bloquea(cx - W2 / 2, hz - D2 / 2, cx + W2 / 2, hz + D2 / 2);
    // ventanas y puerta en la fachada
    const fzc = hz + sgn * D2 / 2;
    for (let p = 0; p < pisos; p++) for (let k = 0; k < 4; k++) { const x = cx - W2 / 2 + (k + 0.5) * W2 / 4; if (p === 0 && k === 1) continue; caja(bg, ext === 'moderna' || ext === 'mansion-moderna' ? W2 / 4 - 0.4 : 1.1, ext === 'moderna' || ext === 'mansion-moderna' ? 2 : 1.4, 0.08, mat('#2d3b46'), x, 0.8 + p * hP, fzc + sgn * 0.02); if (ext === 'mediterranea' || ext === 'villa') { caja(bg, 0.3, 1.4, 0.06, '#3f6e8a', x - 0.75, 0.8 + p * hP, fzc + sgn * 0.05); caja(bg, 0.3, 1.4, 0.06, '#3f6e8a', x + 0.75, 0.8 + p * hP, fzc + sgn * 0.05); } }
    caja(bg, 1.3, 2.3, 0.1, ext === 'moderna' || ext === 'mansion-moderna' ? '#1d2024' : '#6b4a2b', cx - W2 / 4 + W2 / 8 - W2 / 8, 0, fzc + sgn * 0.04);
    // tejado: a dos aguas (teja o pizarra) o plano con pérgola
    if (ext === 'moderna' || ext === 'mansion-moderna') { caja(bg, W2 + 0.6, 0.25, D2 + 0.6, '#2a2f35', cx, pisos * hP, hz); caja(bg, W2 * 0.4, 0.1, 2.4, '#8a6a46', cx + W2 * 0.25, hP, fzc + sgn * 1.2); }
    else { const s = new THREE.Shape(); s.moveTo(-D2 / 2 - 0.4, 0); s.lineTo(D2 / 2 + 0.4, 0); s.lineTo(0, 2.2); s.lineTo(-D2 / 2 - 0.4, 0); const geo = new THREE.ExtrudeGeometry(s, { depth: W2 + 0.6, bevelEnabled: false }); geo.translate(0, 0, -(W2 + 0.6) / 2); geo.rotateY(Math.PI / 2); const t = new THREE.Mesh(geo, mat(ext === 'piedra' ? '#5a4a44' : '#b4643d')); t.position.set(cx, pisos * hP, hz); t.castShadow = true; bg.add(t); }
    if (ext === 'piedra') for (const s2 of [-1, 1]) caja(bg, 0.5, pisos * hP, 0.5, '#8f8170', cx + s2 * (W2 / 2 - 0.2), 0, fzc - sgn * 0.2);
    if (ext === 'clasica') for (let k = 0; k < 4; k++) cil(bg, 0.25, hP * 2, '#f4f1ea', cx - 2.4 + k * 1.6, 0, fzc + sgn * 1.2, 12);
    // camino, árboles y, en las mansiones, piscina
    caja(g, 1.6, 0.02, Math.abs(fz - fzc), '#cfc6b4', cx, 0.012, (fz + fzc) / 2, 0, false);
    for (const s2 of [-1, 1]) { const ax = cx + s2 * ((x1 - x0) / 2 - 1.6), az = fz - sgn * 2; cil(g, 0.14, 2.2, '#6b5136', ax, 0, az, 6); const c = new THREE.Mesh(ext === 'villa' ? new THREE.ConeGeometry(1.4, 1, 7) : new THREE.IcosahedronGeometry(1.2, 1), mat(ext === 'villa' ? '#3f7a3a' : '#4f8f45')); c.position.set(ax, ext === 'villa' ? 3.4 : 2.9, az); g.add(c); G.bloquea(ax - 0.3, az - 0.3, ax + 0.3, az + 0.3); }
    if (cl === 'mansion') { const pw = (x1 - x0) * 0.4, pd = (z1 - z0) * 0.22, pz = hz - sgn * (D2 / 2 + pd / 2 + 1.2), ag = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd).rotateX(-Math.PI / 2), mat('#3ea6d6', { roughness: 0.08, metalness: 0.2 })); ag.position.set(cx, 0.03, pz); g.add(ag); caja(g, pw + 0.6, 0.05, pd + 0.6, '#f4f1ea', cx, 0, pz, 0, false); }
    H.letrero(g, T.letrero(v.nombre.toUpperCase(), '#1b2027', v.actual ? '#7fe0a0' : '#f2d27a', 'casa-' + v.id), 3.2, 0.6, cx + 2.6, 1.0, fz + sgn * 0.2, lado === 'n' ? Math.PI : 0);
  }
  // ---- Edificios del barrio en las parcelas que no son tuyas ----
  function generico(ctx, g, cl, rect, lado, i, H) {
    const { G, T, E, r, c1, c2, afi } = ctx, [x0, z0, x1, z1] = rect;
    if (cl === 'casa' || cl === 'mansion') {   // chalet ajeno: más sencillo, con seto
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, cesped = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), H.mat('#76a050', { roughness: 1 })); cesped.position.set(cx, 0.006, cz); g.add(cesped);
      const w = (x1 - x0) * 0.5, d = (z1 - z0) * 0.4, bg = new THREE.Group(); g.add(bg); H.ocluye(bg); H.caja(bg, w, 5.6, d, E.muros[i % E.muros.length], cx, 0, cz); H.caja(bg, w + 0.6, 0.3, d + 0.6, '#8a4a34', cx, 5.6, cz); G.bloquea(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2);
      for (const [a, b, c, dd] of [[x0, z0, x1, z0 + 0.6], [x0, z1 - 0.6, x1, z1], [x0, z0, x0 + 0.6, z1], [x1 - 0.6, z0, x1, z1]]) { H.caja(g, c - a, 1.1, dd - b, '#3f6e33', (a + c) / 2, 0, (b + dd) / 2); G.bloquea(a, b, c, dd); }
      return;
    }
    H.edificio(g, G, T, E, r, rect, 4 + (i % 4), lado, { kit: i % 2 ? true : 'arcos', banderas: Math.round(afi / 25), c1, c2, letrero: i % 3 === 0 ? { txt: ['FARMACIA', 'PANADERÍA', 'FRUTERÍA', 'BAR CENTRAL', 'FERRETERÍA'][i % 5], fondo: ['#1f8f5f', '#f4efe3', '#2e5d3a', '#5a3b26', '#c9733f'][i % 5], letra: i % 5 === 1 ? '#5a3b26' : '#fff', clave: 'g' + i, ancho: 5 } : null });
  }
  // Los barrios lejanos no se dibujan (cada medio segundo)
  function actualizar(S, dt) {
    if (!S.distritos) return; S.tDist = (S.tDist || 0) - dt; if (S.tDist > 0) return; S.tDist = 0.5;
    const f = S.foco; S.distritos.forEach(({ g, d }) => { g.visible = Math.hypot(f.x - d.x, f.z - d.z) < d.r + 75; });
  }
  GM.ciudadBarrios = { construir, actualizar, LOTES, CLASE, DIST_BARRIO };
})();
