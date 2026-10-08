/* HOGAR 3D (GM.mods.hogar3d)
   Tres vistas: «Fuera» (la vivienda y su calle, más pobre o más rica según el tipo y el barrio), «Edificio» (la casa entera como una casa de muñecas con sus habitaciones y tu
   personaje en el salón) y cada «Habitación» (casillas de suelo y pared donde colocar y quitar muebles, cambiar su color). Los muebles disponibles dependen de tu nivel de vida.
   Expone: mount(el, st), unmount(), selfTest. Usa GM.mods.hogar para toda la lógica. */
(function () {
  const U = GM.util;
  let V = null;
  const PAL = [0xc45b45, 0x4b7cb5, 0x5f9a63, 0x8a8f96];
  const SUELO = [0x8b8f93, 0xa8895e, 0xb88a58, 0xc9955b, 0xe4e0d8, 0x2c2c31], PARED = [0xb2ac99, 0xd9d4c3, 0xe8e4d6, 0xf2efe6, 0xe9ecef, 0xdde4ec];
  const col = h => GM.kit.color(h);
  const cx = c => -2.4 + c * 1.2, cz = r => -1.4 + r * 1.4;

  function caja(g, w, h, d, c, x, y, z, op) { return g.add(GM.kit.caja(w, h, d, c, x, y, z, op)); }
  function luz(g, x, y, z, w, h, d, c) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); g.add(m); return m; }
  // ---------- Muebles ----------
  function mueble(it, color, st) {
    const g = new THREE.Group(), C = PAL[color % 4], K = GM.kit, id = it.id, dos = it.tam === 2, W = dos ? 2.1 : 1;
    const dark = 0x2a2f36, wood = 0x8a5a33, white = 0xf0f0ee;
    switch (id) {
      case 'cama1': caja(g, 0.9, 0.35, 1.2, wood, 0, 0, 0); caja(g, 0.84, 0.18, 1.1, C, 0, 0.35, 0.02); caja(g, 0.5, 0.1, 0.25, white, 0, 0.5, -0.4); break;
      case 'cama2': caja(g, 1.9, 0.35, 1.25, wood, 0, 0, 0); caja(g, 1.8, 0.22, 1.15, C, 0, 0.35, 0.03); caja(g, 0.6, 0.12, 0.28, white, -0.45, 0.57, -0.4); caja(g, 0.6, 0.12, 0.28, white, 0.45, 0.57, -0.4); caja(g, 1.9, 0.7, 0.08, wood, 0, 0, -0.6); break;
      case 'cama3': caja(g, 2.1, 0.4, 1.3, 0x3a2a22, 0, 0, 0); caja(g, 2.0, 0.28, 1.2, C, 0, 0.4, 0.03); caja(g, 0.7, 0.14, 0.3, white, -0.5, 0.68, -0.42); caja(g, 0.7, 0.14, 0.3, white, 0.5, 0.68, -0.42); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(q => caja(g, 0.06, 1.8, 0.06, 0xc8a24a, q[0] * 1.0, 0, q[1] * 0.6)); caja(g, 2.1, 0.05, 1.3, 0xf3e7c8, 0, 1.8, 0, 0.55); break;
      case 'sofa1': case 'sofa2': case 'sofa3': { const w = id === 'sofa3' ? 2.1 : 1.9, c = id === 'sofa1' ? 0x7a6a58 : id === 'sofa2' ? C : 0x2f3b4a, c2 = id === 'sofa1' ? 0x8a7a66 : id === 'sofa2' ? 0xd9a066 : 0x3d4d60; caja(g, w, 0.25, 0.9, c, 0, 0.12, 0); caja(g, w, 0.55, 0.2, c, 0, 0.3, -0.38); caja(g, 0.22, 0.5, 0.9, c, -w / 2 + 0.1, 0.12, 0); caja(g, 0.22, 0.5, 0.9, c, w / 2 - 0.1, 0.12, 0);
        for (let i = 0; i < 2; i++) caja(g, (w - 0.5) / 2 - 0.03, 0.14, 0.7, c2, -w / 4 + 0.05 + i * (w / 2 - 0.05), 0.37, 0.05); caja(g, 0.3, 0.3, 0.1, id === 'sofa3' ? 0xd9a066 : 0xf2e6d0, -w / 2 + 0.5, 0.5, -0.2).rotation.z = 0.2; caja(g, 0.28, 0.28, 0.1, 0xd62d6a, w / 2 - 0.5, 0.5, -0.2);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(q => caja(g, 0.06, 0.12, 0.06, id === 'sofa3' ? 0xc8a24a : 0x3a2a20, q[0] * (w / 2 - 0.1), 0, q[1] * 0.4)); break; }
      case 'butaca': caja(g, 0.8, 0.25, 0.8, C, 0, 0.12, 0); caja(g, 0.8, 0.55, 0.18, C, 0, 0.3, -0.32); caja(g, 0.15, 0.4, 0.8, C, -0.33, 0.12, 0); caja(g, 0.15, 0.4, 0.8, C, 0.33, 0.12, 0); caja(g, 0.5, 0.12, 0.55, 0xf2e6d0, 0, 0.37, 0.05); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(q => caja(g, 0.05, 0.12, 0.05, 0x3a2a20, q[0] * 0.33, 0, q[1] * 0.33)); break;
      case 'tv1': caja(g, 0.7, 0.4, 0.5, dark, 0, 0, 0); { const s = luz(g, 0, 0.5, 0, 0.62, 0.38, 0.06, 0x1a2f4a); s.userData.anim = t => { s.material.color.setHex(Math.sin(t * 2) > 0.3 ? 0x2a4f7a : 0x1a2f4a); }; } break;
      case 'tv2': caja(g, 1.9, 0.4, 0.5, 0x3a3f46, 0, 0, 0); caja(g, 1.3, 0.08, 0.12, 0x111, 0, 0.42, 0.18); caja(g, 0.06, 0.4, 0.06, 0x555, -0.8, 0, 0.2); caja(g, 0.06, 0.4, 0.06, 0x555, 0.8, 0, 0.2); caja(g, 1.6, 0.9, 0.07, dark, 0, 0.45, 0); { const s = luz(g, 0, 0.9, 0.05, 1.5, 0.78, 0.04, 0x1a3a5c); s.userData.anim = t => { s.material.color.setHex(Math.sin(t * 1.3) > 0 ? 0x2d5d92 : 0x1b4e3a); }; } caja(g, 0.3, 0.1, 0.25, 0x111, 0.7, 0.4, 0.15); break;
      case 'tv3': caja(g, 2.2, 1.7, 0.1, dark, 0, 0.2, 0); { const s = luz(g, 0, 1.05, 0.06, 2.05, 1.55, 0.04, 0x1a3a5c); s.userData.anim = t => { s.material.color.setHex(Math.sin(t * 0.9) > 0 ? 0x3a78b8 : 0x6a3a8c); }; } caja(g, 2.2, 0.2, 0.5, 0x444, 0, 0, 0.1); break;
      case 'cocina1': caja(g, 2.0, 0.85, 0.7, 0xd8d6d0, 0, 0, 0); caja(g, 2.04, 0.06, 0.74, 0x777, 0, 0.85, 0); caja(g, 0.5, 0.03, 0.4, 0x222, 0.5, 0.92, 0); caja(g, 0.5, 0.03, 0.4, 0xaab, -0.5, 0.92, 0); break;
      case 'mesa1': caja(g, 0.8, 0.05, 0.8, wood, 0, 0.6, 0); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(q => caja(g, 0.05, 0.6, 0.05, 0x555, q[0] * 0.33, 0, q[1] * 0.33)); break;
      case 'mesa2': caja(g, 1.9, 0.07, 0.95, wood, 0, 0.7, 0); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(q => caja(g, 0.08, 0.7, 0.08, 0x5a3a20, q[0] * 0.85, 0, q[1] * 0.4)); [-0.5, 0.5].forEach(x => { caja(g, 0.4, 0.4, 0.4, C, x, 0, 0.75); caja(g, 0.4, 0.5, 0.06, C, x, 0.4, 0.93); caja(g, 0.4, 0.4, 0.4, C, x, 0, -0.75); caja(g, 0.4, 0.5, 0.06, C, x, 0.4, -0.93); }); g.add(K.cilindro(0.1, 0.22, 0xf2e6d0, 0, 0.77, 0, 8)); g.add(K.cono(0.12, 0.2, 0xd62d6a, 0, 0.99, 0, 6)); break;
      case 'nevera': caja(g, 0.8, 1.7, 0.7, 0xdfe3e6, 0, 0, 0); caja(g, 0.04, 0.5, 0.05, 0x777, 0.3, 0.9, 0.36); break;
      case 'isla': caja(g, 2.0, 0.9, 0.9, 0xeceae4, 0, 0, 0); caja(g, 2.1, 0.07, 1.0, 0x30343a, 0, 0.9, 0); [-0.6, 0.6].forEach(x => { caja(g, 0.06, 0.55, 0.06, 0x333, x, 0, 0.7); caja(g, 0.36, 0.05, 0.36, C, x, 0.55, 0.7); }); break;
      case 'escritorio': luz(g, 0.35, 0.78, 0.1, 0.12, 0.06, 0.12, 0xfff0b8); caja(g, 0.95, 0.05, 0.6, wood, 0, 0.7, 0); caja(g, 0.4, 0.5, 0.06, 0x333, 0, 0.45, 0.78); caja(g, 0.06, 0.7, 0.55, 0x555, -0.42, 0, 0); caja(g, 0.06, 0.7, 0.55, 0x555, 0.42, 0, 0); caja(g, 0.5, 0.35, 0.05, dark, 0, 0.78, -0.1); luz(g, 0, 1.0, -0.07, 0.44, 0.28, 0.02, 0x2a5a8a); caja(g, 0.4, 0.45, 0.4, 0x333, 0, 0, 0.55); break;
      case 'pizarra': caja(g, 0.95, 0.65, 0.05, 0xf4f6f2, 0, 0, 0, 1); caja(g, 0.98, 0.04, 0.07, 0x888, 0, -0.02, 0); caja(g, 0.7, 0.02, 0.04, 0x2f7d4a, 0, 0.3, 0.03); caja(g, 0.02, 0.4, 0.04, 0x2f7d4a, 0, 0.12, 0.03); { const a = luz(g, -0.2, 0.3, 0.04, 0.05, 0.05, 0.02, 0xd62d2d); luz(g, 0.2, 0.2, 0.04, 0.05, 0.05, 0.02, 0x2d6ad6); } break;
      case 'video': caja(g, 1.9, 0.05, 0.7, 0x333, 0, 0.7, 0); caja(g, 0.05, 0.7, 0.6, 0x222, -0.9, 0, 0); caja(g, 0.05, 0.7, 0.6, 0x222, 0.9, 0, 0); [-0.5, 0.5].forEach(x => { caja(g, 0.7, 0.45, 0.05, dark, x, 0.8, -0.2); const s = luz(g, x, 1.0, -0.17, 0.62, 0.36, 0.02, 0x2a5a8a); s.userData.anim = t => { s.material.color.setHex(Math.sin(t * 1.5 + x) > 0 ? 0x2a5a8a : 0x3a7d4a); }; }); break;
      case 'pesas': caja(g, 0.5, 0.35, 1.0, dark, 0, 0, 0); caja(g, 1.0, 0.05, 0.05, 0x888, 0, 0.9, 0.3); caja(g, 0.08, 0.5, 0.5, 0x333, -0.5, 0.65, 0.3); caja(g, 0.08, 0.5, 0.5, 0x333, 0.5, 0.65, 0.3); break;
      case 'gym': caja(g, 0.8, 0.3, 1.6, dark, -0.5, 0, 0); caja(g, 0.7, 1.2, 0.06, 0x555, -0.5, 0.3, -0.7); caja(g, 0.6, 1.3, 0.6, 0x666, 0.6, 0, 0); caja(g, 0.8, 0.05, 0.1, 0xd62d2d, 0.6, 1.3, 0.3); break;
      case 'cancha': caja(g, 2.1, 0.03, 1.0, 0xc98d4f, 0, 0, 0); caja(g, 2.0, 0.035, 0.05, 0xffffff, 0, 0, 0); caja(g, 0.06, 1.8, 0.06, 0x555, 0.95, 0, 0); caja(g, 0.5, 0.35, 0.05, white, 0.95, 1.55, 0); { const a = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 6, 12), K.mat(0xff6a1a)); a.rotation.x = Math.PI / 2; a.position.set(0.78, 1.5, 0); g.add(a); } break;
      case 'trofeos': { caja(g, 0.95, 1.1, 0.3, 0x4a3524, 0, 0, 0); caja(g, 0.85, 0.95, 0.04, 0xbfe0f0, 0, 0.07, 0.15, 0.35); const n = Math.min(6, st ? GM.mods.hogar.trofeos(st) : 2); for (let i = 0; i < Math.max(1, n); i++) { const x = -0.3 + (i % 3) * 0.3, y = 0.2 + Math.floor(i / 3) * 0.45; if (i < n || n === 0) { g.add(K.cilindro(0.06, 0.2, 0xe8b923, x, y, 0.05, 8)); g.add(K.cilindro(0.1, 0.06, 0xe8b923, x, y + 0.2, 0.05, 8)); } } break; }
      case 'camisetas': [-0.3, 0.3].forEach(x => { caja(g, 0.5, 0.65, 0.05, 0x2a2f36, x, 0, 0); caja(g, 0.38, 0.5, 0.03, C, x, 0.07, 0.03); caja(g, 0.38, 0.1, 0.035, white, x, 0.3, 0.03); }); break;
      case 'planta': g.add(K.cilindro(0.16, 0.3, 0xa4552e, 0, 0, 0, 8)); caja(g, 0.34, 0.04, 0.34, 0x7a3f20, 0, 0.3, 0); [[0, 0, 0.8, 0x2f8f4f], [0.14, 0.05, 0.55, 0x3fa05a], [-0.14, -0.04, 0.6, 0x2a7d44], [0.02, 0.15, 0.45, 0x52b36a]].forEach(q => { const l = K.cono(0.2, q[2], q[3], q[0], 0.3, q[1], 6); l.rotation.z = q[0] * 0.9; g.add(l); }); break;
      case 'alfombra': caja(g, 1.9, 0.03, 1.1, C, 0, 0, 0); caja(g, 1.5, 0.035, 0.7, 0xf2e6d0, 0, 0, 0); break;
      case 'cuadro': caja(g, 0.8, 0.6, 0.05, 0x3a2a22, 0, 0, 0); caja(g, 0.7, 0.5, 0.03, C, 0, 0.05, 0.03); caja(g, 0.25, 0.2, 0.035, 0xf2c14e, 0.1, 0.15, 0.03); break;
      case 'arte': caja(g, 0.9, 0.9, 0.06, 0xc8a24a, 0, 0, 0); caja(g, 0.8, 0.8, 0.04, 0xf2f2f2, 0, 0.05, 0.03); caja(g, 0.3, 0.7, 0.045, 0xd62d2d, -0.2, 0.1, 0.04); caja(g, 0.35, 0.3, 0.05, 0x1f4fa8, 0.15, 0.4, 0.045); caja(g, 0.2, 0.2, 0.05, 0xe8b923, 0.2, 0.15, 0.05); break;
      case 'lampara': g.add(K.cilindro(0.22, 0.05, 0x333, 0, 0, 0, 12)); g.add(K.cilindro(0.03, 1.5, 0x666, 0, 0.05, 0, 6)); { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.34, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0b8, side: THREE.DoubleSide })); sh.position.y = 1.55; g.add(sh); sh.userData.anim = t => { sh.material.color.setHex(0xfff0b8 - (Math.sin(t * 5) > 0.95 ? 0x101010 : 0)); }; } break;
      case 'musica': caja(g, 0.35, 0.8, 0.35, 0x222, -0.3, 0, 0); caja(g, 0.35, 0.8, 0.35, 0x222, 0.3, 0, 0); caja(g, 0.5, 0.15, 0.3, 0x444, 0, 0, 0.3); break;
      case 'piano': caja(g, 1.9, 0.75, 0.9, 0x15161a, 0, 0.1, 0); caja(g, 1.7, 0.08, 0.3, white, 0, 0.85, 0.5); caja(g, 0.1, 0.1, 0.1, 0x15161a, 0, 0, 0); caja(g, 0.6, 0.4, 0.5, 0x15161a, 0, 0, 0.9); break;
      case 'pecera': caja(g, 0.95, 0.7, 0.4, 0x3a3f46, 0, 0, 0); caja(g, 0.9, 0.5, 0.36, 0x59b4e6, 0, 0.75, 0, 0.55); { const f = luz(g, 0, 1.0, 0, 0.1, 0.06, 0.06, 0xf26b1a); f.userData.anim = t => { f.position.x = Math.sin(t * 1.2) * 0.3; }; } break;
      case 'bar': caja(g, 2.0, 1.0, 0.6, 0x3a2418, 0, 0, 0); caja(g, 2.1, 0.06, 0.7, 0xc9a86a, 0, 1.0, 0); for (let i = 0; i < 5; i++) caja(g, 0.08, 0.26, 0.08, [0x2f7d4a, 0x8a2a2a, 0xc9a86a, 0x2a5a8a, 0x6a3a8c][i], -0.7 + i * 0.35, 1.06, 0); break;
      case 'billar': caja(g, 2.0, 0.12, 1.1, 0x1f6b3a, 0, 0.75, 0); caja(g, 2.1, 0.12, 1.2, 0x3a2418, 0, 0.7, 0, 1); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(q => caja(g, 0.12, 0.7, 0.12, 0x3a2418, q[0] * 0.9, 0, q[1] * 0.5)); luz(g, -0.3, 0.9, 0.1, 0.1, 0.1, 0.1, 0xffffff); luz(g, 0.3, 0.9, -0.1, 0.1, 0.1, 0.1, 0xd62d2d); break;
      case 'perro': { const d = new THREE.Group(); d.add(K.caja(0.5, 0.3, 0.22, 0x9a6a3a, 0, 0.15, 0)); d.add(K.caja(0.2, 0.2, 0.2, 0x9a6a3a, 0.3, 0.25, 0)); const rabo = K.caja(0.18, 0.06, 0.06, 0x7a4f2a, -0.3, 0.3, 0); d.add(rabo); g.add(d); d.userData.anim = t => { d.position.x = Math.sin(t * 0.5) * 0.15; rabo.rotation.z = Math.sin(t * 12) * 0.6; }; break; }
      case 'barbacoa': caja(g, 0.6, 0.6, 0.4, dark, 0, 0, 0); caja(g, 0.7, 0.08, 0.5, 0x555, 0, 0.62, 0); luz(g, 0, 0.7, 0, 0.45, 0.04, 0.3, 0xe8541a); break;
      case 'tumbona': [-0.5, 0.5].forEach(x => { caja(g, 0.7, 0.18, 1.1, white, x, 0.15, 0); caja(g, 0.7, 0.5, 0.1, white, x, 0.2, -0.5); caja(g, 0.7, 0.04, 1.1, C, x, 0.33, 0); }); break;
      case 'jacuzzi': { g.add(K.cilindro(0.95, 0.6, 0xe9eef2, 0, 0, 0, 20)); const a = K.cilindro(0.8, 0.05, 0x59b4e6, 0, 0.58, 0, 20); g.add(a); a.userData.anim = t => { a.scale.x = a.scale.z = 1 + Math.sin(t * 3) * 0.02; }; break; }
      case 'mesaext': caja(g, 0.9, 0.06, 0.9, wood, 0, 0.7, 0); caja(g, 0.08, 0.7, 0.08, 0x555, 0, 0, 0); [[-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.6]].forEach(p => caja(g, 0.35, 0.4, 0.35, C, p[0], 0, p[1])); break;
      case 'arbol': g.add(K.cilindro(0.1, 0.8, 0x6b4a2b, 0, 0, 0, 6)); g.add(K.cono(0.7, 1.4, 0x2f8f4f, 0, 0.7, 0, 7)); for (let i = 0; i < 3; i++) luz(g, Math.sin(i * 2.1) * 0.3, 1.0 + i * 0.15, Math.cos(i * 2.1) * 0.3, 0.08, 0.08, 0.08, 0xe8541a); break;
      default: caja(g, 0.7, 0.7, 0.7, C, 0, 0, 0);
    }
    if (MODELO[id] && GM.sede && GM.sede.modeloMueble && THREE.GLTFLoader && typeof fetch === 'function') aModelo(g, MODELO[id], C);
    return g;
  }
  // Muebles con modelo real (Kenney, CC0, los mismos de la sede): se ajustan a la huella de la versión de cajas y la tela
  // toma el color elegido. Mientras carga (o si falla) se ve la versión de cajas.
  const MODELO = { cama1: 'bedSingle', cama2: 'bedSingle', cama3: 'bedSingle', sofa1: 'loungeSofa', sofa2: 'loungeSofa', sofa3: 'loungeSofa', butaca: 'loungeChair', mesa1: 'tableRound', mesa2: 'table', nevera: 'kitchenFridge', escritorio: 'desk', planta: 'pottedPlant', alfombra: 'rugRectangle', lampara: 'lampRoundFloor' };
  function aModelo(g, nombre, color) {
    const caja0 = new THREE.Box3().setFromObject(g), tam0 = caja0.getSize(new THREE.Vector3()), cen = caja0.getCenter(new THREE.Vector3());
    GM.sede.modeloMueble(nombre).then(m => {
      const t = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()), sx = tam0.x / t.x, sz = tam0.z / t.z;
      m.scale.set(m.scale.x * sx, m.scale.y * Math.min(sx, sz, 1.6), m.scale.z * sz);
      m.traverse(n => { if (n.isMesh && /^carpet/.test(n.material.name || '')) { n.material = n.material.clone(); n.material.color.set(color); if (/Darker/.test(n.material.name)) n.material.color.multiplyScalar(0.7); } });
      while (g.children.length) g.remove(g.children[0]);
      m.position.set(cen.x, 0, cen.z); g.add(m);
      if (V && V.vista) V.vista.need = true;
    }).catch(() => { });
  }
  // ---------- Habitaciones ----------
  function cuarto(hab, lujo, ext, cond, W, D, est) {
    const g = new THREE.Group(), K = GM.kit; est = est || {};
    const s = est.suelo !== undefined ? est.suelo : SUELO[lujo], p = est.pared !== undefined ? est.pared : PARED[lujo];
    if (ext) {
      const piedra = hab === 'jardin' ? 0x6fae5a : 0xcfc7b4;
      caja(g, W, 0.12, D, piedra, 0, -0.12, 0); caja(g, W, 0.5, 0.15, lujo >= 3 ? 0xe8e4d6 : 0x9b9486, 0, 0, -D / 2);
      if (hab === 'piscina') { caja(g, W * 0.68, 0.1, D * 0.56, 0x59b4e6, 0, -0.02, 0.2, 0.7); caja(g, W * 0.7, 0.15, 0.1, 0xf0f0ee, 0, 0, -D * 0.25); caja(g, W * 0.7, 0.15, 0.1, 0xf0f0ee, 0, 0, D * 0.36); }
      for (let i = 0; i < Math.round(W / 1.2); i++) if (lujo >= 3 || i % 3 === 0) g.add(K.arbol(-W / 2 + 0.6 + i * 1.2, -D / 2 + 0.35, 0.9));
      if (lujo >= 4) for (let i = 0; i < Math.round(W / 1.1); i++) caja(g, 0.1, 0.4, 0.1, 0xf3e7c8, -W / 2 + 0.5 + i * 1.1, 0, D / 2 - 0.1);
      return g;
    }
    caja(g, W, 0.12, D, s, 0, -0.12, 0);
    if (lujo >= 4 || est.panel) for (let i = 0; i < Math.round(W / 1.6); i++) caja(g, 0.03, 0.005, D, 0x888, -W / 2 + 0.8 + i * 1.6, 0.01, 0);
    caja(g, W, 3.0, 0.14, p, 0, 0, -D / 2); caja(g, 0.14, 3.0, D, p, -W / 2, 0, 0);
    caja(g, W, 0.12, 0.18, lujo >= 3 ? 0xf3efe6 : 0x8a8478, 0, 0, -D / 2 + 0.1); caja(g, 0.18, 0.12, D, lujo >= 3 ? 0xf3efe6 : 0x8a8478, -W / 2 + 0.1, 0, 0);
    const vw = Math.min(W - 2.2, lujo >= 4 ? 3.2 : lujo >= 2 ? 2.0 : 1.2), vx = Math.max(-W / 2 + vw / 2 + 0.8, W / 2 - vw / 2 - 1.2);
    caja(g, vw + 0.14, 1.3, 0.05, lujo >= 3 ? 0xf5f3ee : 0x777, vx, 1.0, -D / 2 + 0.09); luz(g, vx, 1.1, -D / 2 + 0.12, vw, 1.1, 0.02, 0xa9d6f2);
    if (lujo >= 2) { caja(g, 0.25, 1.9, 0.06, lujo >= 4 ? 0xe8dcc6 : 0xb85a4a, vx - vw / 2 - 0.15, 0.6, -D / 2 + 0.2); caja(g, 0.25, 1.9, 0.06, lujo >= 4 ? 0xe8dcc6 : 0xb85a4a, vx + vw / 2 + 0.15, 0.6, -D / 2 + 0.2); }
    caja(g, 0.06, 2.1, 0.9, lujo >= 3 ? 0xf4f1ea : 0x7a5a3a, W / 2 - 0.03, 0, -0.5, 1);
    if (lujo <= 1) { caja(g, 0.02, 0.5, 0.02, 0x222, 0, 2.5, 0); luz(g, 0, 2.45, 0, 0.14, 0.14, 0.14, 0xfff0a0); }
    else { const nl = lujo >= 4 ? Math.round(W / 1.6) : Math.max(2, Math.round(W / 2.4)); for (let i = 0; i < nl; i++) luz(g, -W / 2 + (i + 0.5) * W / nl, 2.95, 0.4, 0.2, 0.05, 0.2, 0xfff6d0); if (lujo >= 4) luz(g, 0, 2.6, 0, 0.9, 0.2, 0.9, 0xfff6d0); }
    if (lujo <= 1 || cond < 0.45) { caja(g, 0.7, 0.5, 0.02, 0x8a826e, -W * 0.25, 1.8, -D / 2 + 0.09, 0.6); caja(g, 0.04, 0.9, 0.02, 0x555, 0.2, 1.4, -D / 2 + 0.09); caja(g, 0.5, 0.4, 0.02, 0x9a927c, -W / 2 + 0.09, 0.8, 0.8, 0.6); }
    if (est.ladrillo) for (let i = 0; i < 8; i++) { caja(g, W - 0.2, 0.04, 0.02, 0x6e3a2c, 0, 0.3 + i * 0.35, -D / 2 + 0.085); for (let j = 0; j < Math.round(W / 0.8); j++) caja(g, 0.03, 0.31, 0.02, 0x6e3a2c, -W / 2 + 0.5 + j * 0.8 + (i % 2) * 0.4, 0.33 + i * 0.35, -D / 2 + 0.085); }
    if (est.viga) for (let i = 0; i < Math.round(W / 1.8); i++) caja(g, 0.18, 0.18, D, 0x6b4a2b, -W / 2 + 0.9 + i * 1.8, 2.78, 0);
    if (lujo >= 4 || est.panel) { for (let i = 0; i < Math.round(W / 0.7); i++) caja(g, 0.5, 1.1, 0.03, 0x8a6a46, -W / 2 + 0.5 + i * 0.7, 0.4, -D / 2 + 0.1); caja(g, W, 0.1, 0.12, 0xf3efe6, 0, 2.9, -D / 2 + 0.1); }
    if (lujo === 0) { caja(g, 0.5, 0.3, 0.4, 0x6a5a40, W / 2 - 0.8, 0, D / 2 - 0.9); caja(g, 0.35, 0.2, 0.3, 0x5a4a32, W / 2 - 1.2, 0, D / 2 - 0.8); }
    return g;
  }
  function figura(pj, st) {
    const g = new THREE.Group(), K = GM.kit, OP = GM.mods.personaje ? GM.mods.personaje.OPC : null, piel = OP ? OP.piel[(pj && pj.piel) % 5] : '#e4b98f', pelo = OP ? OP.peloColor[(pj && pj.peloColor) % 6] : '#222';
    const c1 = st ? K.color(st.equipos[st.clubId].colores[0] === '#000000' ? '#333333' : st.equipos[st.clubId].colores[0]) : 0xc45b45;
    g.add(K.caja(0.5, 0.75, 0.3, c1, 0, 0.7, 0)); g.add(K.caja(0.2, 0.7, 0.22, 0x2a2f36, -0.12, 0, 0)); g.add(K.caja(0.2, 0.7, 0.22, 0x2a2f36, 0.12, 0, 0));
    g.add(K.caja(0.12, 0.65, 0.14, K.color(piel), -0.34, 0.75, 0)); g.add(K.caja(0.12, 0.65, 0.14, K.color(piel), 0.34, 0.75, 0));
    const cab = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), K.mat(K.color(piel))); cab.position.y = 1.7; g.add(cab);
    const ps = new THREE.Mesh(new THREE.SphereGeometry(0.235, 12, 6, 0, 6.3, 0, 1.4), K.mat(K.color(pelo))); ps.position.y = 1.72; g.add(ps);
    g.userData.anim = t => { g.position.y = Math.abs(Math.sin(t * 1.6)) * 0.02; g.rotation.y = Math.sin(t * 0.5) * 0.4; };
    if (!GM.sede || !GM.sede.figura || !st) return g;
    // Tu personaje real (el mismo modelo que en la sede y la calle); la figura de cajas queda mientras carga
    const asp = Object.assign(GM.sede.aspecto(st), { anim: 'idle' });
    const r = GM.sede.figura(asp, asp.altura / 100, g, V && V.vista);
    r.userData.mover = t => { r.rotation.y = Math.sin(t * 0.5) * 0.4; };
    return r;
  }
  function exterior(casa, st) {
    const g = new THREE.Group(), K = GM.kit, L = casa.lujo, cond = casa.cond, t = casa.tipo, e = (casa.variante && casa.variante.est.ext) || '';
    const sucio = c => cond < 0.5 ? 0x8d8a82 : c;
    caja(g, 40, 0.3, 28, L >= 4 ? 0x7fb069 : 0x7a8791, 0, -0.34, 0); caja(g, 40, 0.05, 5, 0x3d444c, 0, -0.02, 8); caja(g, 40, 0.1, 1.6, 0xb9b3a6, 0, 0, 5);
    for (let i = -8; i <= 8; i += 2) caja(g, 0.9, 0.055, 0.08, 0xf2f2f2, i * 2, 0, 8);
    const ventanas = (n, filas, alto, c, w) => { for (let f = 0; f < filas; f++) for (let i = 0; i < n; i++) luz(g, -(n - 1) * (w || 2.1) / 2 + i * (w || 2.1), 0.6 + f * alto, 2.52, 1.0, 0.8, 0.04, f === 1 && i === 1 ? 0xffe28a : c); };
    if (e === 'loft') {
      caja(g, 11, 4.4, 5, 0xa9604a, 0, 0, 0); for (let i = 0; i < 4; i++) { caja(g, 1.6, 2.4, 0.05, 0x3d3f44, -3.9 + i * 2.6, 0.7, 2.52); luz(g, -3.9 + i * 2.6, 0.8, 2.55, 1.4, 2.2, 0.03, i === 1 ? 0xffe28a : 0x8fb5cf); } caja(g, 1.6, 1.7, 0.08, 0x555, 4.6, 0, 2.53); g.add(K.cilindro(0.45, 5.5, 0x8a4a38, 4.3, 4.4, -1.5, 8)); caja(g, 3.2, 1.2, 0.03, 0xd62d6a, -3.5, 0.3, 2.56, 0.8); caja(g, 2.4, 0.9, 0.03, 0x2d8ad6, 1.0, 3.2, 2.56, 0.7);
      for (let i = 0; i < 5; i++) caja(g, 0.5, 0.5, 0.45, 0x2f5d3a, 5.4 + (i % 2) * 0.55, 0, 3.4 + Math.floor(i / 2) * 0.5); caja(g, 11.2, 0.2, 5.2, 0x3d3f44, 0, 4.4, 0);
    } else if (e === 'buhardilla') {
      caja(g, 9, 4.2, 5, 0xe0d4b8, 0, 0, 0); ventanas(4, 3, 1.3, 0x8fb5cf); const m = K.cono(5.6, 2.6, 0x5a5f66, 0, 4.2, 0, 4); m.rotation.y = Math.PI / 4; m.scale.set(1, 1, 0.62); g.add(m); caja(g, 1.4, 1.2, 0.8, 0xe0d4b8, 0, 4.4, 2.0); luz(g, 0, 4.6, 2.42, 0.9, 0.7, 0.04, 0xffe28a); g.add(K.arbol(-5, 4.4, 0.9)); caja(g, 1.0, 1.4, 0.06, 0x4a3a2a, 0, 0, 2.53);
    } else if (t === 'residencia' || t === 'estudio' || t === 'piso') {
      const alto = t === 'piso' ? 4 : 5, w = 9, c = sucio(e === 'bloque-moderno' ? 0xf0efec : t === 'piso' ? 0xcfc6b2 : 0xb0a994);
      caja(g, w, alto * 1.3, 5, c, 0, 0, 0); ventanas(4, alto, 1.3, e === 'bloque-moderno' ? 0x7fb5d6 : 0x8fb5cf);
      for (let f = 0; f < alto; f++) for (let i = 0; i < 4; i++) { caja(g, 1.3, 0.08, 0.5, e === 'bloque-moderno' ? 0x9ec6dc : 0x777, -3.2 + i * 2.1, 0.4 + f * 1.3, 2.6, e === 'bloque-moderno' ? 0.6 : 1); if (t !== 'piso' && (i + f) % 3 === 0) caja(g, 0.5, 0.35, 0.3, 0xcfcfcf, -3.2 + i * 2.1 + 0.4, 0.2 + f * 1.3, 2.8); }
      if (e === 'bloque-moderno') for (let i = 0; i < 4; i++) caja(g, 0.04, 0.4, 0.04, [0xe8541a, 0x2f7d4a, 0xe8b923, 0x2d6ad6][i], -3.2 + i * 2.1, 2.6, 2.62);
      caja(g, 1.0, 1.4, 0.06, 0x4a3a2a, 0, 0, 2.53); if (cond < 0.5 || t === 'residencia') { caja(g, 2.4, 1.0, 0.03, 0xd62d6a, -2.5, 0.2, 2.53, 0.8); for (let i = 0; i < 4; i++) caja(g, 0.5, 0.6, 0.45, 0x2f5d3a, 3.4 + (i % 2) * 0.55, 0, 3.4 + Math.floor(i / 2) * 0.5); }
      if (t === 'piso') for (let i = 0; i < 3; i++) g.add(K.arbol(-4.8 + i * 4.5, 4.4, 0.9)); caja(g, w + 0.3, 0.2, 5.3, 0x555, 0, alto * 1.3, 0);
    } else if (t === 'reformado') {
      caja(g, 9, 5.2, 5, e === 'bloque-moderno' ? 0xf8f8f6 : 0xf1ede2, 0, 0, 0); ventanas(4, 4, 1.3, 0x9fcde4); for (let f = 0; f < 4; f++) for (let i = 0; i < 4; i++) { caja(g, 1.3, 0.1, 0.5, 0x4a4f55, -3.2 + i * 2.1, 0.4 + f * 1.3, 2.6); g.add(K.cilindro(0.1, 0.18, 0xa4552e, -3.5 + i * 2.1, 0.5 + f * 1.3, 2.75, 6)); g.add(K.cono(0.18, 0.3, 0x2f8f4f, -3.5 + i * 2.1, 0.68 + f * 1.3, 2.75, 6)); }
      caja(g, 1.4, 1.5, 0.08, 0x2a5a8a, 0, 0, 2.52); caja(g, 9.3, 0.2, 5.3, 0x4a4f55, 0, 5.2, 0); g.add(K.arbol(-5, 4.4, 1)); g.add(K.arbol(5, 4.4, 1));
    } else if (t === 'atico') {
      caja(g, 9, 5.2, 5, e === 'rustico' ? 0xd8c9a6 : 0xe9e6dc, 0, 0, 0); ventanas(4, 3, 1.3, 0x9fcde4);
      if (e === 'rustico') { caja(g, 7.4, 2.0, 4.2, 0x8a6a46, 0, 5.2, -0.3); const r = K.cono(5.2, 1.4, 0xa4432e, 0, 7.2, -0.3, 4); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 0.78); g.add(r); luz(g, 0, 5.8, 1.82, 3.4, 1.2, 0.05, 0xb8dcf0); for (let i = 0; i < 5; i++) caja(g, 0.18, 1.8, 0.18, 0x6b4a2b, -3.2 + i * 1.6, 5.2, 1.9); }
      else { caja(g, 7.4, 2.0, 4.2, 0xf4f1ea, 0, 5.2, -0.3); luz(g, 0, 5.8, 1.82, 6.4, 1.3, 0.05, 0xb8dcf0); }
      caja(g, 8.6, 0.12, 0.1, 0x30343a, 0, 5.2, 2.6); for (let i = 0; i < 7; i++) caja(g, 0.06, 0.8, 0.06, 0xcfd6dc, -4.2 + i * 1.4, 5.2, 2.6); for (let i = 0; i < 4; i++) { g.add(K.cilindro(0.2, 0.4, 0xa4552e, -3.3 + i * 2.2, 5.2, 2.2, 8)); g.add(K.cono(0.35, 0.8, 0x2f8f4f, -3.3 + i * 2.2, 5.6, 2.2, 7)); }
      [[-7, 0, 7], [7.5, 0, 9], [-6.5, 0, 4], [7, 0, 5]].forEach((p, k) => caja(g, 3.2, 4 + k * 1.6, 3.2, [0xc9c4b4, 0xb5b0a2, 0xd6d1c3, 0xa9a396][k], p[0] * 1.2, 0, -2 - k * 3));
    } else if (t === 'casa') {
      if (e === 'piedra') {
        caja(g, 7, 3, 5, 0x9a9486, -1, 0, -1); for (let i = 0; i < 10; i++) caja(g, 0.9, 0.3, 0.06, 0x7d786c, -4.2 + i * 0.7, 0.4 + (i % 3) * 0.8, 1.52); const t1 = K.cono(5.4, 2.4, 0x4a4f55, -1, 3, -1, 4); t1.rotation.y = Math.PI / 4; t1.scale.set(1, 1, 0.78); g.add(t1); caja(g, 0.7, 2.2, 0.7, 0x7d786c, 1.6, 3, -1.4); for (let i = 0; i < 3; i++) luz(g, -3 + i * 2, 1.2, 1.52, 0.9, 1.0, 0.04, 0x9fcde4); caja(g, 1.0, 1.9, 0.08, 0x4a3a2a, -1, 0, 1.54); caja(g, 3.0, 2.2, 4.2, 0x8a8478, 4.2, 0, -1); caja(g, 2.6, 1.8, 0.06, 0x555, 4.2, 0, 1.12); for (let i = 0; i < 5; i++) caja(g, 0.5, 2.6, 0.08, 0x3f6e3a, -4.4 + i * 0.35, 0, 1.55, 0.8);
      } else if (e === 'moderna') {
        caja(g, 6, 2.6, 5, 0xf4f4f2, -2, 0, -1); caja(g, 5, 2.4, 4.2, 0xe9e9e6, 1.5, 2.6, -1.3); luz(g, -2, 1.2, 1.52, 5.4, 1.8, 0.05, 0xa9d6f2); luz(g, 1.5, 3.8, 0.82, 4.2, 1.4, 0.05, 0xa9d6f2); for (let i = 0; i < 9; i++) caja(g, 0.1, 2.2, 0.1, 0x8a5a33, -4.6 + i * 0.35, 0, 1.55); caja(g, 6.2, 0.18, 5.2, 0x30343a, -2, 2.6, -1); caja(g, 5.2, 0.18, 4.4, 0x30343a, 1.5, 5.0, -1.3); caja(g, 3.0, 2.0, 4.0, 0xdcd9d0, 5.4, 0, -1); caja(g, 2.6, 1.6, 0.06, 0x30343a, 5.4, 0, 1.0);
      } else {
        caja(g, 7, 3, 5, 0xf3ede0, -1, 0, -1); const t1 = K.cono(5.4, 2.4, 0xa4432e, -1, 3, -1, 4); t1.rotation.y = Math.PI / 4; t1.scale.set(1, 1, 0.78); g.add(t1); for (let i = 0; i < 3; i++) luz(g, -3 + i * 2, 1.2, 1.52, 1.0, 1.0, 0.04, 0x9fcde4); caja(g, 1.0, 1.9, 0.08, 0x6b4a2b, -1, 0, 1.54); caja(g, 3.0, 2.2, 4.2, 0xe4dccb, 4.2, 0, -1); caja(g, 2.6, 1.8, 0.06, 0x8a8f96, 4.2, 0, 1.12);
      }
      caja(g, 1.5, 0.6, 0.8, 0xc45b45, 4.2, 0, 2.5); caja(g, 1.3, 0.35, 0.5, 0x222, 4.2, 0.55, 2.4); [-8, 8].forEach(x => { for (let i = 0; i < 6; i++) caja(g, 0.1, 0.8, 0.1, 0xf3e7c8, x, 0, 1 + i * 0.8); }); caja(g, 16, 0.08, 0.06, 0xf3e7c8, 0, 0.7, 4.3); g.add(K.arbol(-6, 2.5, 1.5)); g.add(K.arbol(7, 3, 1.3));
      for (let i = 0; i < 5; i++) { g.add(K.cilindro(0.15, 0.2, 0xa4552e, -4 + i * 1.2, 0, 2.6, 6)); g.add(K.cono(0.25, 0.4, 0xd62d6a, -4 + i * 1.2, 0.2, 2.6, 6)); }
    } else {
      if (e === 'clasica') {
        caja(g, 10, 3.4, 5.4, 0xe9e0cc, -2, 0, -1); const r1 = K.cono(7.4, 2.4, 0x6b4a3a, -2, 3.4, -1, 4); r1.rotation.y = Math.PI / 4; r1.scale.set(1.1, 1, 0.74); g.add(r1); for (let i = 0; i < 6; i++) { caja(g, 0.3, 3.4, 0.3, 0xf6f0e0, -5.6 + i * 1.6, 0, 2.0); } caja(g, 10.4, 0.25, 0.6, 0xf6f0e0, -2, 3.4, 2.0); luz(g, -2, 1.5, 1.72, 7.5, 1.8, 0.05, 0xa9d6f2); caja(g, 1.4, 2.2, 0.08, 0x4a3a2a, -2, 0, 1.74); g.add(K.cilindro(1.0, 0.3, 0xdcd3bd, -2, 0, 4.2, 14)); g.add(K.cilindro(0.1, 1.0, 0xdfe3e8, -2, 0.3, 4.2, 6)); caja(g, 0.8, 0.12, 0.8, 0x59b4e6, -2, 1.3, 4.2, 0.8);
        caja(g, 6.5, 0.1, 3.4, 0x59b4e6, 7.5, -0.02, 1.2, 0.8); caja(g, 7, 0.12, 3.8, 0xf0f0ee, 7.5, -0.05, 1.2);
      } else if (e === 'villa') {
        caja(g, 8, 3, 5, 0xfaf4e8, -2, 0, -1); caja(g, 5, 2.6, 4.4, 0xfaf4e8, 3.5, 0, -1.4); [[-2, 8, 5.4], [3.5, 5.6, 4.8]].forEach(q => { const r = K.cono(q[1] * 0.78, 1.6, 0xb0502f, q[0], q[0] < 0 ? 3 : 2.6, -1, 4); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 0.72); g.add(r); }); for (let i = 0; i < 4; i++) { caja(g, 1.0, 1.6, 0.06, 0x9fcde4, -4.4 + i * 1.9, 0.3, 1.52); caja(g, 1.2, 0.2, 0.1, 0xe8dcc6, -4.4 + i * 1.9, 1.9, 1.54); }
        caja(g, 6.5, 0.1, 3.4, 0x59b4e6, 7.5, -0.02, 1.2, 0.8); caja(g, 7, 0.12, 3.8, 0xe8c9a0, 7.5, -0.05, 1.2); for (let i = 0; i < 5; i++) { g.add(K.cilindro(0.12, 3.0, 0x7a5a3a, -7 + i * 2.6, 0, 4.2, 6)); g.add(K.cono(0.9, 0.9, 0x2f8f4f, -7 + i * 2.6, 2.8, 4.2, 7)); }
      } else {
        caja(g, 9, 3, 5, 0xfafafa, -2, 0, -1); caja(g, 8, 2.6, 4.8, 0xefefec, -3, 3, -1.4); caja(g, 10, 0.2, 5.6, 0x30343a, -2.5, 2.98, -1); caja(g, 9, 0.2, 5.4, 0x30343a, -3, 5.6, -1.4);
        luz(g, -2, 1.5, 1.52, 7.5, 2.2, 0.05, 0xa9d6f2); luz(g, -3, 4.3, 0.98, 6.6, 1.8, 0.05, 0xa9d6f2); caja(g, 4, 0.12, 2.2, 0xcfd6dc, 3, 3, 1.4); for (let i = 0; i < 7; i++) caja(g, 0.05, 0.7, 0.05, 0xcfd6dc, 1.2 + i * 0.55, 3.1, 2.4);
        caja(g, 6.5, 0.1, 3.4, 0x59b4e6, 7.5, -0.02, 1.2, 0.8); caja(g, 7, 0.12, 3.8, 0xf0f0ee, 7.5, -0.05, 1.2); for (let i = 0; i < 4; i++) caja(g, 0.2, 2.6, 0.2, 0xdfd8c8, 1.5 + i * 1.8, 0, -3.8);
        for (let i = 0; i < 6; i++) { g.add(K.cilindro(0.12, 3.2, 0x7a5a3a, -9 + (i % 3) * 7.2 * (i > 2 ? -1 : 1) * 0.5, 0, 3.5 + (i % 2), 6)); g.add(K.cono(0.9, 0.9, 0x2f8f4f, -9 + (i % 3) * 7.2 * (i > 2 ? -1 : 1) * 0.5, 3.1, 3.5 + (i % 2), 7)); }
      }
      caja(g, 0.8, 2.4, 0.5, 0x30343a, -9, 0, 5); caja(g, 0.8, 2.4, 0.5, 0x30343a, -6.5, 0, 5); caja(g, 4.5, 0.12, 0.5, 0x30343a, -7.75, 2.4, 5); for (let i = 0; i < 4; i++) caja(g, 0.06, 2.0, 0.06, 0xc8a24a, -8.4 + i * 0.5, 0, 5.1); luz(g, -7.75, 2.8, 5.1, 0.3, 0.3, 0.3, 0xfff0a0);
    }
    const nivel = st ? GM.mods.hogar.nivel(st) : 0; let car = st && st.carrera && st.carrera.vivienda && st.carrera.vivienda.coche ? st.carrera.vivienda.coche.id : (nivel >= 5 ? 'lujo' : nivel >= 4 ? 'deportivo' : nivel >= 2 ? 'utilitario' : null);
    if (car) { const c = new THREE.Group(), cc = { utilitario: 0xc45b45, deportivo: 0xf2c14e, lujo: 0x16181c }[car], largo = car === 'lujo' ? 2.4 : 1.8; c.add(K.caja(largo, 0.5, 0.95, cc, 0, 0.1, 0)); c.add(K.caja(largo * 0.5, 0.4, 0.85, 0x24303c, -0.1, 0.55, 0)); c.position.set(-3, 0, 6.3); g.add(c); }
    for (let i = 0; i < (L >= 4 ? 1 : 4); i++) { const p = new THREE.Group(); p.add(K.caja(0.2, 0.4, 0.14, [0x7a8791, 0x3c5a7a, 0x8a6a4a, 0x5b7f5b][i % 4], 0, 0.3, 0)); p.add(K.cilindro(0.08, 0.14, 0xe0b48f, 0, 0.7, 0, 6)); p.userData.anim = tt => { p.position.set(-12 + ((tt * 0.8 + i * 9) % 26), 0.05, 5.1); }; g.add(p); }
    if (L <= 1) for (let i = 0; i < 4; i++) caja(g, 0.5, 0.4, 0.4, [0x4a6a4a, 0x6a5a40, 0x555][i % 3], -9 + i * 2.5, 0, 6); else if (L >= 4) for (let i = 0; i < 6; i++) luz(g, -9 + i * 3.4, 1.6, 6.2, 0.2, 0.2, 0.2, 0xfff0a0);
    return g;
  }
  // ---------- Escena ----------
  const CXr = (c, w) => -w / 2 + 0.6 + c * 1.2, CZr = (r, d) => -d / 2 + 0.7 + r * 1.4;
  function colocaPlano(habs) {
    const pos = {}, plantas = {}; habs.forEach(h => { (plantas[h.planta] = plantas[h.planta] || []).push(h); });
    const anchoMax = Math.max.apply(null, Object.keys(plantas).map(k => plantas[k].reduce((s, h) => s + h.w + 0.6, 0)));
    Object.keys(plantas).forEach(k => { let x = -anchoMax / 2; plantas[k].forEach(h => { pos[h.id] = [x + h.w / 2, +k * 3.6]; x += h.w + 0.6; }); });
    return { pos, ancho: anchoMax };
  }
  function escena(st) {
    const K = GM.kit, v = V.vista, H = GM.mods.hogar, casa = H.casaActual(st), W = V.mundo, CP = GM.campus; v.limpiar(W);
    const cond = casa.cond, L = casa.lujo, habs = H.habitaciones(casa.tipo, casa.variante), est = casa.variante.est, muebles = H.muebles(st);
    V.slots = [];
    const pintaHab = (rm, g, edit) => {
      const hab = rm.id; g.add(cuarto(hab, L, rm.ext, cond, rm.w, rm.d, est));
      muebles.filter(m => m.hab === hab).forEach(m => { const it = H.ITEMS.find(x => x.id === m.item), mb = mueble(it, m.color, st), p = m.slot.split('-'); let x, z, y = 0;
        if (p[0] === 'f') { x = CXr(+p[2], rm.w) + (it.tam === 2 ? 0.6 : 0); z = CZr(+p[1], rm.d); } else { x = CXr(+p[1], rm.w) + (it.tam === 2 ? 0.6 : 0); z = -rm.d / 2 + 0.25; y = 1.4; }
        mb.position.set(x, y, z); mb.userData = { hab, slot: m.slot }; g.add(mb); });
      if (edit) { const oc = ocup(st, hab), sel = (s) => V.sel && V.sel.slot === s && V.sel.hab === hab;
        for (let r = 0; r < rm.rows; r++) for (let c = 0; c < rm.cols; c++) { const s = 'f-' + r + '-' + c; if (!oc[s]) { const m = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.04, 1.28), new THREE.MeshBasicMaterial({ color: sel(s) ? 0xffd54a : 0x4cc38a, transparent: true, opacity: sel(s) ? 0.7 : 0.22, depthWrite: false })); m.position.set(CXr(c, rm.w), 0.04, CZr(r, rm.d)); m.userData = { hab, slot: s }; g.add(m); V.slots.push(m); } }
        if (!rm.ext) for (let c = 0; c < rm.cols; c++) { const s = 'w-' + c; if (!oc[s]) { const m = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.7, 0.04), new THREE.MeshBasicMaterial({ color: sel(s) ? 0xffd54a : 0x59b4e6, transparent: true, opacity: sel(s) ? 0.7 : 0.22, depthWrite: false })); m.position.set(CXr(c, rm.w), 1.55, -rm.d / 2 + 0.3); m.userData = { hab, slot: s }; g.add(m); V.slots.push(m); } } }
    };
    if (V.vista3 === 'fuera') { W.add(exterior(casa, st)); v.target.set(0, 2.2, 0); }
    else if (V.vista3 === 'edificio') {
      const pl = colocaPlano(habs);
      habs.forEach(rm => { const g = new THREE.Group(); g.position.set(pl.pos[rm.id][0], pl.pos[rm.id][1], 0); pintaHab(rm, g, false); g.userData = { hab: rm.id, sala: true }; W.add(g); });
      const r0 = habs.find(h => !h.ext) || habs[0], f = figura(st.personaje, st); f.position.set(pl.pos[r0.id][0] + 0.5, pl.pos[r0.id][1], 1.0); W.add(f);
      W.add(K.caja(pl.ancho + 4, 0.2, 8, 0x59616b, 0, -0.35, 0)); const plantas = Math.max.apply(null, habs.map(h => h.planta)) + 1; v.target.set(0, (plantas - 1) * 1.8 + 1.2, 0); V.ancho = pl.ancho;
    } else {
      const rm = habs.find(h => h.id === V.hab) || habs[0]; V.hab = rm.id; const g = new THREE.Group(); pintaHab(rm, g, true); W.add(g);
      const f = figura(st.personaje, st); f.position.set(rm.w / 2 - 0.9, 0, rm.d / 2 - 0.7); f.scale.set(0.8, 0.8, 0.8); W.add(f); v.target.set(0, 1.0, 0);
    }
    if (CP && CP.config.calidad === 'alta') K.sombrear(W);
    const an = []; W.traverse(o => { if (o.userData && typeof o.userData.anim === 'function') an.push(o.userData.anim); }); v.anim = an.length ? (t => an.forEach(f => f(t))) : null;
    CP.ambiente(v, V.vista3 === 'fuera' ? 'tarde' : 'dia'); v.place();
  }
  function ocup(st, hab) { const o = {}; GM.mods.hogar.muebles(st).filter(m => m.hab === hab).forEach(m => { const it = GM.mods.hogar.ITEMS.find(x => x.id === m.item); o[m.slot] = m; const p = m.slot.split('-'); if (it.tam === 2) o[p[0] === 'f' ? 'f-' + p[1] + '-' + (+p[2] + 1) : 'w-' + (+p[1] + 1)] = m; }); return o; }
  function panel(st) {
    const h = GM.h, P = V.panel, H = GM.mods.hogar, casa = H.casaActual(st), n = H.nivel(st), habs = H.habitaciones(casa.tipo, casa.variante), ef = H.efectos(st); P.innerHTML = '';
    const msg = h('div', { class: 'aviso', style: { display: 'none' } }), resp = r => { if (!r.ok) { msg.style.display = 'block'; msg.textContent = r.motivo; } else { V.refrescar(); if (GM.ui && GM.ui.cabecera) GM.ui.cabecera(); } };
    P.append(h('div', { class: 'fila' }, h('div', { class: 'ct' }, h('b', null, casa.nombre), h('span', { class: 'muted' }, casa.barrioNombre + ', ' + casa.ciudad)), h('b', null, Math.round(H.dinero(st)).toLocaleString('es-ES') + ' k€')));
    P.append(h('div', { class: 'chips' }, h('span', { class: 'chip ok' }, 'Nivel de vida ' + n + '/5, ' + H.etiquetaNivel(st)), h('span', { class: 'chip' }, habs.length + (habs.length === 1 ? ' estancia' : ' estancias')), h('span', { class: 'chip' }, 'Muebles ' + H.muebles(st).length), h('span', { class: 'chip' }, 'Energía en casa ' + H.energiaCasa(st) + '/3'), ef.moral ? h('span', { class: 'chip' }, 'Ánimo +' + ef.moral.toFixed(1)) : null, ef.recup ? h('span', { class: 'chip' }, 'Recuperación +' + ef.recup.toFixed(1)) : null, ef.xp ? h('span', { class: 'chip' }, 'Progresión +' + (ef.xp * 100).toFixed(0) + ' %') : null, ef.conf ? h('span', { class: 'chip' }, 'Confianza +' + ef.conf.toFixed(1)) : null, ef.fama ? h('span', { class: 'chip' }, 'Fama +' + ef.fama.toFixed(2)) : null));
    if (V.vista) P.append(h('div', { class: 'seg compacto' }, [['fuera', 'Fuera'], ['edificio', 'Edificio'], ['sala', 'Habitaciones']].map(o => h('button', { class: 'tab' + (V.vista3 === o[0] ? ' on' : ''), onclick: () => { V.vista3 = o[0]; V.sel = null; V.vista.radio = o[0] === 'fuera' ? 26 : o[0] === 'edificio' ? Math.max(20, (V.ancho || 14) * 1.5) : 12; V.vista.theta = o[0] === 'fuera' ? 0.5 : 0.25; V.vista.phi = o[0] === 'fuera' ? 1.15 : 1.05; V.refrescar(); } }, o[1]))));
    if (!V.vista || V.vista3 !== 'fuera') P.append(h('div', { class: 'seg compacto' }, habs.map(hb => h('button', { class: 'tab' + (V.hab === hb.id && V.vista3 === 'sala' ? ' on' : ''), onclick: () => { V.hab = hb.id; V.vista3 = 'sala'; V.sel = null; if (V.vista) { V.vista.radio = Math.max(10, hb.w * 1.3); V.vista.theta = 0.25; V.vista.phi = 1.05; } V.refrescar(); } }, hb.nombre + ' ' + hb.w + '×' + hb.d))));
    if (V.vista3 === 'sala' || !V.vista) {
      const rm = habs.find(x => x.id === V.hab) || habs[0], hab = rm.id, oc = ocup(st, hab), sel = V.sel && V.sel.hab === hab ? V.sel.slot : null;
      P.append(h('p', { class: 'muted' }, V.vista ? 'Toca una casilla verde (suelo) o azul (pared) para colocar un mueble, o un mueble para usarlo, cambiarlo o quitarlo.' : 'Elige una casilla.'));
      if (!V.vista) P.append(h('div', { class: 'seg' }, Array.from({ length: rm.rows * rm.cols }, (_, i) => 'f-' + Math.floor(i / rm.cols) + '-' + (i % rm.cols)).concat(rm.ext ? [] : Array.from({ length: rm.cols }, (_, i) => 'w-' + i)).map(s => h('button', { class: 'tab' + (sel === s ? ' on' : ''), onclick: () => { V.sel = { hab, slot: s }; panel(st); } }, (oc[s] ? '● ' : '') + (s[0] === 'w' ? 'Pared ' + (+s.split('-')[1] + 1) : 'Suelo ' + (+s.split('-')[1] + 1) + '.' + (+s.split('-')[2] + 1))))));
      if (sel) {
        const m = oc[sel];
        if (m) { const it = H.ITEMS.find(x => x.id === m.item), uso = H.usoDe(m.item); P.append(h('div', { class: 'tarjeta' }, h('b', null, it.n), h('p', { class: 'muted' }, 'Quitarlo te devuelve la mitad: ' + (Math.round(it.p * 5) / 10) + ' k€.'), uso ? h('button', { class: 'btn', onclick: () => { const r = H.usar(st, hab, m.slot); if (r.ok && GM.ui && GM.ui.toast) GM.ui.toast(r.texto + (r.efectos.length ? ': ' + r.efectos.join(', ') : '')); resp(r); } }, uso.texto) : null, h('div', { class: 'par' }, h('button', { class: 'btn btn-sec', onclick: () => resp(H.colorear(st, hab, m.slot)) }, 'Cambiar color'), h('button', { class: 'btn peligro', onclick: () => { V.sel = null; resp(H.quitar(st, hab, m.slot)); } }, 'Quitar')))); }
        else P.append(h('div', { class: 'tarjeta' }, h('b', null, sel[0] === 'w' ? 'Pared libre' : 'Casilla libre'), h('div', { class: 'lista' }, H.catalogo(st, hab, sel).sort((a, b) => a.niv - b.niv || a.p - b.p).map(it => h('button', { class: 'item', disabled: !it.disponible, onclick: () => { const r = H.colocar(st, hab, sel, it.id, 0); if (r.ok) V.sel = null; resp(r); } }, h('div', { class: 'ct' }, h('b', null, (it.disponible ? '' : '🔒 ') + it.n), h('span', { class: 'muted', style: { whiteSpace: 'normal' } }, it.disponible ? efTxt(it) : it.motivo)), h('b', null, it.p + ' k€'))))));
      }
    }
    if (st.modo === 'carrera' && GM.mods.social && GM.mods.social.estado(st)) {
      P.append(h('h4', null, 'Invitar a casa'));
      P.append(h('div', { class: 'seg' }, GM.mods.social.contactos(st).filter(k => k.tipo !== 'rival').slice(0, 6).map(k => h('button', { class: 'tab', onclick: () => { const r = GM.mods.social.invitarACasa(st, k.id); if (r.ok && GM.ui && GM.ui.toast) GM.ui.toast(r.efectos.join(', ')); resp(r); } }, k.nombre.split(' ')[0]))));
    }
    if (st.modo !== 'carrera') {
      P.append(h('h4', null, 'Cambiar de vivienda'));
      const bar = GM.mods.carrera.barriosVivienda(st), bi = casaBarrio(st), b = bar[bi] || bar[1];
      P.append(h('div', { class: 'lista' }, H.tipos(st, bi).map(t => { const pr = Math.round(t.base * (b ? b.precio : 1)), al = Math.max(1, Math.round(pr * 0.005 * 10) / 10); return h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, (t.disponible ? '' : '🔒 ') + t.variante.nombre), h('span', { class: 'muted' }, t.disponible ? pr + ' k€ o ' + al + ' k€ al mes' : t.motivo)), h('span', { class: 'muted' }, H.habitaciones(t.id, t.variante).map(r => r.nombre.toLowerCase()).join(', ')), t.disponible ? h('div', { class: 'par' }, h('button', { class: 'btn peq', onclick: () => resp(H.mudarse(st, bi, t.id, 'compra')) }, 'Comprar'), h('button', { class: 'btn peq btn-sec', onclick: () => resp(H.mudarse(st, bi, t.id, 'hipoteca')) }, 'Hipoteca'), h('button', { class: 'btn peq btn-sec', onclick: () => resp(H.mudarse(st, bi, t.id, 'alquiler')) }, 'Alquilar')) : null); })));
    } else P.append(h('p', { class: 'muted' }, 'Para cambiar de vivienda, ve a la pestaña Vivienda. El nivel de vida sube con tu liga y tu fama.'));
    P.append(msg);
  }
  const HABEXT = hab => !!GM.mods.hogar.EXT[hab];
  const casaBarrio = st => { const c = GM.mods.hogar.casaActual(st); const b = GM.mods.carrera.barriosVivienda(st).find(x => x.nombre === c.barrioNombre); return b ? b.i : 1; };
  function efTxt(it) { const t = []; for (const k in it.ef) t.push({ moral: 'ánimo', recup: 'recuperación', xp: 'progresión', conf: 'confianza', fama: 'fama' }[k] + ' +' + it.ef[k]); return it.tam === 2 ? 'Ocupa 2 casillas' + (t.length ? ', ' + t.join(', ') : '') : (t.join(', ') || 'Decoración'); }
  function mount(el, st) {
    unmount();
    const h = GM.h, raiz = h('div', { class: 'c3d' }), vistaEl = h('div', { class: 'vista3d' }), panelEl = h('div', { class: 'panel3d' });
    raiz.append(vistaEl, panelEl); el.appendChild(raiz);
    V = { raiz, panel: panelEl, vista: null, mundo: null, st, vista3: 'edificio', hab: null, sel: null };
    if (GM.kit && GM.kit.disponible()) {
      try {
        V.vista = GM.kit.crear(vistaEl, { radio: 24, theta: 0.25, phi: 1.05, min: 6, max: 50, fondo: 0xcfe2ee, sombras: GM.campus && GM.campus.config.calidad === 'alta' });
        V.mundo = new THREE.Group(); V.vista.scene.add(V.mundo);
        V.vista.onTap = (cx_, cy) => {
          if (V.vista3 === 'fuera') return;
          const hits = V.vista.pick(cx_, cy, V.mundo.children);
          for (const it of hits) { let o = it.object; while (o && !(o.userData && (o.userData.slot || o.userData.sala))) o = o.parent; if (!o) continue; if (o.userData.sala) { V.hab = o.userData.hab; V.vista3 = 'sala'; V.vista.radio = 12; V.sel = null; V.refrescar(); return; } V.sel = { hab: o.userData.hab, slot: o.userData.slot }; V.refrescar(); return; }
        };
      } catch (e) { V.vista = null; }
    }
    if (!V.vista) { vistaEl.append(h('div', { class: 'vacio' }, 'La vista 3D no está disponible en este dispositivo o sin conexión. Puedes decorar igualmente desde la lista.')); V.vista3 = 'sala'; }
    V.refrescar = () => { if (V.vista) escena(st); panel(st); };
    V.refrescar(); return true;
  }
  function unmount() { if (!V) return; if (V.vista) V.vista.dispose(); if (V.raiz && V.raiz.parentNode) V.raiz.parentNode.removeChild(V.raiz); V = null; }
  function selfTest() { return typeof mueble === 'function' && PAL.length === 4 && SUELO.length === 6; }
  GM.register('hogar3d', { mount, unmount, selfTest });
})();
