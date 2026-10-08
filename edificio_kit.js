/* EDIFICIOS CON MODELOS (GM.edificioKit) — fachadas montadas con piezas glTF del Building Kit de Kenney (CC0)
   Cada pieza mide 2 m de ancho y 2,4 m de alto (pared lisa, con ventana cuadrada o de medio punto, puerta, columna de esquina
   y cornisa). Se escalan para encajar en el ancho y la altura de planta de cada escena. El color de las paredes se cambia
   repintando la celda de la paleta (colormap) que usan los muros, así ventanas y marcos siguen blancos.
   Expone: cuerpo(opciones) -> Promise<Group|null> (null si no cargan los modelos: la escena deja su caja), PIEZAS. */
(function () {
  const PIEZAS = ['wall', 'wall-window-square-detailed', 'wall-window-round-detailed', 'wall-doorway-square', 'wall-doorway-round', 'wall-corner-column', 'border'];
  const cache = {}, mats = {};
  const cargar = n => cache[n] || (cache[n] = new THREE.GLTFLoader().loadAsync('modelos/edificio/' + n + '.glb').then(g => g.scene));
  // Material con la paleta repintada: celdas 8-9 de la fila inferior (muros) del color pedido; 4-5 (zócalos), algo más oscuro
  function material(base, color) {
    const k = (base.name || 'colormap') + color; if (mats[k]) return mats[k];
    let m = base;
    try {
      const img = base.map && base.map.image, c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const W = c.width / 16, H = c.height / 4, col = new THREE.Color(color), osc = col.clone().multiplyScalar(0.78), css = q => '#' + q.getHexString();
      const g = x.createLinearGradient(0, H * 3, 0, H * 4); g.addColorStop(0, css(col.clone().multiplyScalar(1.04))); g.addColorStop(1, css(col.clone().multiplyScalar(0.9))); x.fillStyle = g; x.fillRect(W * 8, H * 3, W * 2, H);
      x.fillStyle = css(osc); x.fillRect(W * 4, H * 3, W * 2, H);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = base.map.flipY; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
      m = base.clone(); m.map = t; m.needsUpdate = true;
    } catch (e) { m = base; }
    return (mats[k] = m);
  }
  // Copia plana de una pieza: el cristal cuelga de la pared en el glb y así no se fusionaría; se sacan todas las mallas a un grupo
  function copia(escena, color, vidrio) {
    const out = new THREE.Group(); escena.updateMatrixWorld(true);
    escena.traverse(n => { if (!n.isMesh) return; const m = new THREE.Mesh(n.geometry, /glass/i.test(n.material.name || '') ? (vidrio || n.material) : material(n.material, color || '#a0a8c8')); n.matrixWorld.decompose(m.position, m.quaternion, m.scale); m.castShadow = m.receiveShadow = true; out.add(m); });
    return out;
  }
  // o: { ancho, fondo, plantas, altoPlanta (m), color, puerta: true|false, ventanas: 'cuadradas'|'arcos', vidrio: material opcional, cornisa: true }
  // El grupo tiene el frente hacia +z y la base en y = 0 (la escena lo coloca encima de su planta baja si hace falta).
  async function cuerpo(o) {
    let esc; try { esc = await Promise.all(PIEZAS.map(cargar)); } catch (e) { return null; }
    const P = {}; PIEZAS.forEach((n, i) => { P[n] = esc[i]; });
    const g = new THREE.Group(), nx = Math.max(1, Math.round(o.ancho / 2)), nz = Math.max(1, Math.round(o.fondo / 2)), sx = o.ancho / (nx * 2), sz = o.fondo / (nz * 2), hP = o.altoPlanta || 2.4, sy = hP / 2.4;
    const ven = o.ventanas === 'arcos' ? 'wall-window-round-detailed' : 'wall-window-square-detailed';
    // pieza en el lado: 'f' frente (+z), 'b' fondo, 'd' derecha (+x), 'i' izquierda; t: posición a lo largo del lado
    const poner = (nombre, lado, t, y, escala) => {
      const p = copia(P[nombre], o.color, o.vidrio), ry = { f: -Math.PI / 2, b: Math.PI / 2, d: 0, i: Math.PI }[lado];
      p.rotation.y = ry; p.scale.set(1, sy, escala);
      if (lado === 'f') p.position.set(t, y, o.fondo / 2); else if (lado === 'b') p.position.set(t, y, -o.fondo / 2); else if (lado === 'd') p.position.set(o.ancho / 2, y, t); else p.position.set(-o.ancho / 2, y, t);
      g.add(p); return p;
    };
    for (let piso = 0; piso < o.plantas; piso++) {
      const y = piso * hP;
      for (let i = 0; i < nx; i++) { const t = -o.ancho / 2 + sx * (1 + 2 * i), centro = i === Math.floor(nx / 2); poner(piso === 0 && o.puerta && centro ? (o.ventanas === 'arcos' ? 'wall-doorway-round' : 'wall-doorway-square') : ven, 'f', t, y, sx); poner(i % 2 ? ven : 'wall', 'b', t, y, sx); }
      for (let i = 0; i < nz; i++) { const t = -o.fondo / 2 + sz * (1 + 2 * i); poner(i % 2 ? 'wall' : ven, 'd', t, y, sz); poner(i % 2 ? ven : 'wall', 'i', t, y, sz); }
      for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const c = copia(P['wall-corner-column'], o.color); c.position.set(cx * o.ancho / 2, y, cz * o.fondo / 2); c.scale.set(1, sy, 1); g.add(c); }
    }
    if (o.cornisa !== false) { const y = o.plantas * hP - 0.3; for (let i = 0; i < nx; i++) { const t = -o.ancho / 2 + sx * (1 + 2 * i); poner('border', 'f', t, y, sx).scale.y = 1; poner('border', 'b', t, y, sx).scale.y = 1; } for (let i = 0; i < nz; i++) { const t = -o.fondo / 2 + sz * (1 + 2 * i); poner('border', 'd', t, y, sz).scale.y = 1; poner('border', 'i', t, y, sz).scale.y = 1; } }
    const techo = new THREE.Mesh(new THREE.BoxGeometry(o.ancho - 0.1, 0.12, o.fondo - 0.1), new THREE.MeshStandardMaterial({ color: 0x7d7a76, roughness: 1 })); techo.position.y = o.plantas * hP - 0.06; g.add(techo);
    if (GM.kit && GM.kit.fusionar) GM.kit.fusionar(g);   // cientos de piezas -> una malla por material
    return g;
  }
  GM.edificioKit = { cuerpo, PIEZAS };
})();
