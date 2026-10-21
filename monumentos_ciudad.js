/* MODELOS SINGULARES POR CIUDAD (punto 78, GM.monumentos) — un edificio icónico simplificado para las ciudades más grandes, hecho por código: Torre Glòries (Barcelona), Puerta de Alcalá (Madrid), Partenón (Atenas), Torre de Gálata (Estambul),
   Templo de San Sava (Belgrado), Duomo (Milán), Puerta de Brandeburgo (Berlín), Frauenkirche (Múnich), Torre Eiffel (París), torres Azrieli (Tel Aviv), Ciudad de las Artes (Valencia), Due Torri (Bolonia) y Burj Khalifa (Dubái).
   icono(clubId) devuelve el grupo de Three del icono de la ciudad de ese club (o null); arquitectura_club.js lo pone al fondo de la calle en lugar del monumento genérico del país. ICONOS: { clubId: nombre }, NOMBRES: nombre legible.
   Expone: ICONOS, NOMBRES, icono, crear, selfTest. Prueba: node tools/monumentos_capturas.js. */
(function () {
  const ICONOS = {
    'fc-barcelona': 'torre-glories',
    'joventut-badalona': 'torre-glories',
    'real-madrid': 'puerta-alcala',
    olympiacos: 'partenon',
    panathinaikos: 'partenon',
    'aek-atenas': 'partenon',
    peristeri: 'partenon',
    fenerbahce: 'torre-galata',
    'anadolu-efes': 'torre-galata',
    besiktas: 'torre-galata',
    galatasaray: 'torre-galata',
    'crvena-zvezda': 'san-sava',
    partizan: 'san-sava',
    'olimpia-milano': 'duomo',
    'alba-berlin': 'brandeburgo',
    'bayern-munich': 'frauenkirche',
    'paris-basketball': 'eiffel',
    'maccabi-tel-aviv': 'azrieli',
    'hapoel-tel-aviv': 'azrieli',
    'valencia-basket': 'ciudad-artes',
    'virtus-bologna': 'due-torri',
    'dubai-basketball': 'burj'
  };
  const NOMBRES = {
    'torre-glories': 'Torre Glòries',
    'puerta-alcala': 'Puerta de Alcalá',
    partenon: 'Partenón',
    'torre-galata': 'Torre de Gálata',
    'san-sava': 'Templo de San Sava',
    duomo: 'Duomo',
    brandeburgo: 'Puerta de Brandeburgo',
    frauenkirche: 'Frauenkirche',
    eiffel: 'Torre Eiffel',
    azrieli: 'Torres Azrieli',
    'ciudad-artes': 'Ciudad de las Artes',
    'due-torri': 'Due Torri',
    burj: 'Burj Khalifa'
  };
  const T = () => THREE,
    mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0.05 }, o || {}));
  const caja = (g, w, h, d, m, x, y, z) => {
    const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    me.position.set(x, y, z);
    me.castShadow = true;
    g.add(me);
    return me;
  };
  const cil = (g, r0, r1, h, m, x, y, z, seg) => {
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, seg || 16), m);
    me.position.set(x, y + h / 2, z);
    me.castShadow = true;
    g.add(me);
    return me;
  };
  const cono = (g, r, h, m, x, y, z, seg) => {
    const me = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 16), m);
    me.position.set(x, y + h / 2, z);
    me.castShadow = true;
    g.add(me);
    return me;
  };
  const cupula = (g, r, m, x, y, z) => {
    const me = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), m);
    me.position.set(x, y, z);
    me.castShadow = true;
    g.add(me);
    return me;
  };
  const PIEDRA = () => mat('#d8cfbc', { roughness: 0.85 }),
    LADRILLO = () => mat('#a8584a'),
    METAL = () => mat('#8c949c', { metalness: 0.6, roughness: 0.35 }),
    VIDRIO = () => mat('#8fb4cc', { metalness: 0.5, roughness: 0.15 });
  const M = {
    'torre-glories'(g) {
      const m = mat('#b8cde0', { metalness: 0.4, roughness: 0.2 });
      cil(g, 4.2, 4.2, 28, m, 0, 0, 0, 24);
      const c = new THREE.Mesh(new THREE.SphereGeometry(4.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m);
      c.position.y = 28;
      g.add(c);
      for (let i = 0; i < 6; i++) caja(g, 8.6, 0.25, 0.25, mat('#d4202e'), 0, 4 + i * 4, 0).rotation.y = i;
    },
    'puerta-alcala'(g) {
      const p = PIEDRA();
      caja(g, 20, 14, 4, p, 0, 7, 0);
      for (const x of [-7.2, -3.6, 0, 3.6, 7.2]) caja(g, x === 0 ? 3.4 : 2.4, x === 0 ? 8 : 6, 4.2, mat('#2a2a2a'), x, x === 0 ? 4 : 3, 0);
      caja(g, 21, 1.2, 4.6, p, 0, 14.6, 0);
      caja(g, 8, 3, 3, p, 0, 16.4, 0);
      caja(g, 5, 2, 2.4, p, 0, 19, 0);
    },
    partenon(g) {
      const p = PIEDRA();
      caja(g, 22, 1.4, 11, p, 0, 0.7, 0);
      for (let i = 0; i < 8; i++) for (const s of [-1, 1]) cil(g, 0.75, 0.6, 8.5, p, -9.1 + i * 2.6, 1.4, s * 4.4, 14);
      caja(g, 22, 1.3, 11, p, 0, 10.4, 0);
      const sh = new THREE.Shape();
      sh.moveTo(-11, 0);
      sh.lineTo(11, 0);
      sh.lineTo(0, 2.6);
      sh.closePath();
      const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 11, bevelEnabled: false }), p);
      fr.position.set(0, 11, -5.5);
      g.add(fr);
    },
    'torre-galata'(g) {
      const p = mat('#cbbf9f', { roughness: 0.9 });
      cil(g, 4.6, 4, 24, p, 0, 0, 0, 20);
      cil(g, 5.2, 5.2, 1.2, p, 0, 24, 0, 20);
      cil(g, 4, 4, 5, p, 0, 25.2, 0, 20);
      cono(g, 4.6, 7, mat('#6d7a82'), 0, 30.2, 0, 20);
    },
    'san-sava'(g) {
      const p = mat('#efece4', { roughness: 0.8 }),
        c = mat('#6d8a7a', { metalness: 0.3 });
      caja(g, 22, 12, 22, p, 0, 6, 0);
      cil(g, 8, 8, 6, p, 0, 12, 0, 24);
      cupula(g, 8, c, 0, 18, 0);
      cil(g, 0.3, 0.3, 4, mat('#c9a227'), 0, 26, 0, 6);
      caja(g, 0.2, 2, 0.2, mat('#c9a227'), 0, 29, 0);
      for (const [x, z] of [
        [-9, -9],
        [9, -9],
        [-9, 9],
        [9, 9]
      ]) {
        cil(g, 2.2, 2.2, 5, p, x, 12, z, 12);
        cupula(g, 2.2, c, x, 17, z);
      }
    },
    duomo(g) {
      const p = mat('#f1ede4', { roughness: 0.8 });
      caja(g, 26, 14, 12, p, 0, 7, 0);
      const sh = new THREE.Shape();
      sh.moveTo(-13, 0);
      sh.lineTo(13, 0);
      sh.lineTo(0, 9);
      sh.closePath();
      const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 12, bevelEnabled: false }), p);
      fr.position.set(0, 14, -6);
      g.add(fr);
      for (let i = -6; i <= 6; i++) {
        cil(g, 0.45, 0.25, 7 + (Math.abs(i) % 2) * 3, p, i * 2, 14 + (6 - Math.abs(i)) * 0.9, 6.4, 6);
        cono(g, 0.45, 2, p, i * 2, 21 + (6 - Math.abs(i)) * 0.9, 6.4, 6);
      }
      cil(g, 1.2, 0.5, 16, p, 0, 18, -2, 8);
      cono(g, 1.4, 5, mat('#c9a227'), 0, 34, -2, 8);
    },
    brandeburgo(g) {
      const p = mat('#cdbf9a', { roughness: 0.85 });
      caja(g, 26, 2, 11, p, 0, 1, 0);
      for (let i = 0; i < 6; i++) for (const s of [-1, 1]) cil(g, 1.0, 0.9, 12, p, -10.5 + i * 4.2, 2, s * 4, 14);
      caja(g, 26, 3, 11, p, 0, 15.5, 0);
      caja(g, 8, 4, 3, mat('#4f8a5a', { metalness: 0.4 }), 0, 19, 0);
      for (const x of [-2.4, 0, 2.4]) caja(g, 1.6, 2.2, 3.6, mat('#4f8a5a'), x, 22, 0);
    },
    frauenkirche(g) {
      const l = LADRILLO(),
        v = mat('#5f8f7a', { metalness: 0.4 });
      caja(g, 14, 14, 26, l, 0, 7, 0);
      const sh = new THREE.Shape();
      sh.moveTo(-7, 0);
      sh.lineTo(7, 0);
      sh.lineTo(0, 8);
      sh.closePath();
      const t = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 26, bevelEnabled: false }), mat('#b5654a'));
      t.position.set(0, 14, -13);
      g.add(t);
      for (const x of [-5.5, 5.5]) {
        caja(g, 5, 26, 5, l, x, 13, -10);
        cupula(g, 3.4, v, x, 26, -10).scale.set(1, 1.5, 1);
        cono(g, 0.9, 5, v, x, 29, -10, 10);
      }
    },
    eiffel(g) {
      const m = mat('#5b5348', { metalness: 0.5, roughness: 0.6 }),
        pata = (x, z) => {
          const a = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1, 22, 5), m);
          a.position.set(x * 0.62, 11, z * 0.62);
          a.rotation.z = Math.sign(x) * 0.2;
          a.rotation.x = -Math.sign(z) * 0.2;
          g.add(a);
        };
      [
        [-6, -6],
        [6, -6],
        [-6, 6],
        [6, 6]
      ].forEach(([x, z]) => pata(x, z));
      caja(g, 12, 0.6, 12, m, 0, 11, 0);
      cil(g, 4.5, 1.8, 18, m, 0, 11, 0, 6);
      caja(g, 5, 0.5, 5, m, 0, 22, 0);
      cil(g, 1.5, 0.35, 14, m, 0, 22, 0, 6);
      cono(g, 0.35, 4, m, 0, 36, 0, 6);
    },
    azrieli(g) {
      cil(g, 5, 5, 38, VIDRIO(), -9, 0, 0, 28);
      caja(g, 8.5, 34, 8.5, VIDRIO(), 3, 17, 0);
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.lineTo(9, 0);
      sh.lineTo(4.5, 7.8);
      sh.closePath();
      const t = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 30, bevelEnabled: false }), VIDRIO());
      t.rotation.x = -Math.PI / 2;
      t.position.set(10, 30, 4);
      t.rotation.set(-Math.PI / 2, 0, 0);
      g.add(t);
    },
    'ciudad-artes'(g) {
      const b = mat('#f4f4f4', { roughness: 0.4 });
      for (let i = 0; i < 7; i++) {
        const a = new THREE.Mesh(new THREE.TorusGeometry(10 - i * 0.6, 0.4, 6, 20, Math.PI), b);
        a.position.set(-8 + i * 2.7, 0, 0);
        a.rotation.y = Math.PI / 2;
        g.add(a);
      }
      const ag = new THREE.Mesh(new THREE.SphereGeometry(6, 20, 12), mat('#8fc4d8', { metalness: 0.4, roughness: 0.2 }));
      ag.scale.set(1.5, 0.8, 1);
      ag.position.set(0, 4, 13);
      g.add(ag);
      caja(g, 22, 0.6, 14, mat('#7ab4cf', { roughness: 0.1 }), 0, 0.05, 6);
    },
    'due-torri'(g) {
      const l = mat('#b86a4e', { roughness: 0.9 });
      caja(g, 6, 40, 6, l, -6, 20, 0).rotation.z = 0.025;
      caja(g, 6.2, 0.8, 6.2, mat('#8a4a38'), -6.7, 40.4, 0);
      caja(g, 6, 24, 6, l, 6, 12, 0).rotation.z = -0.03;
      caja(g, 6.2, 0.8, 6.2, mat('#8a4a38'), 6.6, 24.4, 0);
    },
    burj(g) {
      const m = mat('#b9c9d6', { metalness: 0.6, roughness: 0.2 });
      cil(g, 7, 5.5, 14, m, 0, 0, 0, 6);
      cil(g, 5.5, 4, 14, m, 0, 14, 0, 6);
      cil(g, 4, 2.6, 14, m, 0, 28, 0, 6);
      cil(g, 2.6, 1.4, 12, m, 0, 42, 0, 6);
      cil(g, 1.4, 0.15, 14, m, 0, 54, 0, 6);
    }
  };
  const crear = nombre => {
    if (!M[nombre]) return null;
    const g = new THREE.Group();
    M[nombre](g);
    g.userData = { icono: nombre };
    return g;
  };
  function icono(clubId) {
    const n = ICONOS[clubId];
    if (!n) return null;
    const g = crear(n);
    if (!g) return null;
    g.scale.setScalar(1.2);
    return g;
  }
  function selfTest() {
    return Object.keys(M).length === Object.keys(NOMBRES).length && Object.values(ICONOS).every(n => M[n]) && Object.keys(M).length >= 10;
  }
  GM.monumentos = { ICONOS, NOMBRES, icono, crear, selfTest };
  GM.register && GM.register('monumentos', GM.monumentos);
})();
