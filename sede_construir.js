/* Construcción de la escena activa de la sede: despacha a calle, casa, interior, deportiva y pueblo, o levanta las salas, muebles y zonas de la sede.
   Se separó de sede3d.js: GM.sedeConstruir({ S: () => escena activa, entorno, textura, sueloMat, plano, pistaTex, mueble, rejilla, irA, zona, motor, decorar, destino, barra, exterior }) devuelve la función construir. */
(function () {
  GM.sedeConstruir = function (ctx) {
    async function construir(st) {
      const S = ctx.S();
      const { entorno, textura, sueloMat, plano, pistaTex, mueble, rejilla, irA, zona, motor, decorar, destino, barra, exterior } = ctx;
      entorno();
      if (S.escena === 'calle') {
        S.redes = [];
        S.mundo = new THREE.Group();
        S.scene.add(S.mundo);
        if (GM.calle.preparar) await GM.calle.preparar(st);
        return GM.calle.construir(S, motor(), st);
      }
      if (S.escena === 'casa') {
        S.redes = [];
        S.mundo = new THREE.Group();
        S.scene.add(S.mundo);
        return GM.casa.construir(S, motor(), st, S.escenaArg);
      }
      if (S.escena === 'interior' && GM.interiores) {
        S.redes = [];
        S.mundo = new THREE.Group();
        S.scene.add(S.mundo);
        return GM.interiores.construir(S, motor(), st, S.escenaArg);
      }
      if (S.escena === 'deportiva' && GM.deportivaMundo) {
        S.redes = [];
        S.mundo = new THREE.Group();
        S.scene.add(S.mundo);
        return GM.deportivaMundo.construir(S, motor(), st);
      }
      if (S.escena === 'pueblo') {
        S.redes = [];
        S.mundo = new THREE.Group();
        S.scene.add(S.mundo);
        S.puertas = {};
        return GM.puebloMundo.construir(S, motor(), st);
      }
      const P = GM.sedePlano,
        club = st.equipos[st.clubId],
        G = rejilla(P),
        W = new THREE.Group();
      S.G = G;
      S.redes = [];
      S.mundo = W;
      S.scene.add(W);
      // Suelos: exterior, pasillo y salas
      W.add(plano(70, 50, new THREE.MeshStandardMaterial({ color: 0x6f8a5a, roughness: 1 }), 0, 0, -0.02, 4));
      const [px0, pz0, px1, pz1] = P.pasillo.rect;
      W.add(plano(px1 - px0, pz1 - pz0, sueloMat('hormigon'), (px0 + px1) / 2, (pz0 + pz1) / 2, 0));
      P.salas.forEach(s => {
        const [x0, z0, x1, z1] = s.rect;
        W.add(plano(x1 - x0, z1 - z0, sueloMat(s.suelo), (x0 + x1) / 2, (z0 + z1) / 2, 0.001));
      });
      // Pista con las líneas y el escudo del club
      const tP = pistaTex(club);
      if (tP) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(20, 12).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tP, roughness: 0.45 }));
        tP.repeat.set(1, 0.6);
        tP.offset.set(0, 0.2);
        m.position.set(-9, 0.01, -6);
        m.receiveShadow = true;
        W.add(m);
      }
      for (const s of [-1, 1]) {
        const x = -9 + s * 9.6,
          g = new THREE.Group();
        const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.05), new THREE.MeshStandardMaterial({ color: 0x333a40 }));
        poste.position.y = 1.52;
        g.add(poste);
        const tab = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.05, 1.8), new THREE.MeshStandardMaterial({ color: 0xf4f4f4 }));
        tab.position.set(-s * 0.35, 3.0, 0);
        g.add(tab);
        const aro = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 20), new THREE.MeshStandardMaterial({ color: 0xe8590c }));
        aro.rotation.x = Math.PI / 2;
        aro.position.set(-s * 0.62, 2.85, 0);
        g.add(aro);
        g.position.set(x, 0, -6);
        g.traverse(n => {
          if (n.isMesh) n.castShadow = true;
        });
        W.add(g);
        G.bloquea(x - 0.3, -6.3, x + 0.3, -5.7);
        const red = new THREE.Mesh(
          new THREE.CylinderGeometry(0.23, 0.14, 0.42, 12, 3, true),
          new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.85 })
        );
        red.position.set(x - s * 0.62, 2.62, -6);
        red.userData = { red: true };
        W.add(red);
        S.redes.push({ obj: red, aro: new THREE.Vector3(x - s * 0.62, 2.85, -6), t: 9 });
      }
      // Muros bajos (vista en corte, como en Big Ambitions): segmentos de 0,5 m sin duplicar, con huecos en las puertas
      const muro = GM.texturas
          ? GM.texturas.aplicar(new THREE.MeshStandardMaterial({ color: 0xf1ede6, roughness: 0.9 }), 'Plaster003', { color: false, escala: 1.6, relieve: 0.8 })
          : new THREE.MeshStandardMaterial({ color: 0xf1ede6, roughness: 0.9 }),
        remate = new THREE.MeshStandardMaterial({ color: 0x2b3038 }),
        segs = new Map();
      const borde = (xa, za, xb, zb) => {
        const n = Math.round(Math.hypot(xb - xa, zb - za) / 0.5);
        for (let k = 0; k < n; k++) {
          const x = xa + ((xb - xa) * (k + 0.5)) / n,
            z = za + ((zb - za) * (k + 0.5)) / n;
          segs.set(x.toFixed(2) + ',' + z.toFixed(2), [x, z, xa === xb]);
        }
      };
      const rectBordes = ([x0, z0, x1, z1]) => {
        borde(x0, z0, x1, z0);
        borde(x0, z1, x1, z1);
        borde(x0, z0, x0, z1);
        borde(x1, z0, x1, z1);
      };
      P.salas.forEach(s => rectBordes(s.rect));
      rectBordes(P.pasillo.rect);
      const hueco = (lado, rect, centro, ancho) => {
        const [x0, z0, x1, z1] = rect;
        segs.forEach((v, k) => {
          const [x, z] = v;
          const enLado = lado === 'n' ? Math.abs(z - z0) < 0.01 : lado === 's' ? Math.abs(z - z1) < 0.01 : lado === 'w' ? Math.abs(x - x0) < 0.01 : Math.abs(x - x1) < 0.01;
          const pos = lado === 'n' || lado === 's' ? x : z;
          if (enLado && Math.abs(pos - centro) < ancho / 2) segs.delete(k);
        });
      };
      P.salas.forEach(s => hueco(s.puerta[0], s.rect, s.puerta[1], s.puerta[2]));
      hueco('s', [2, 5, 10, 14], P.entrada.x, P.entrada.ancho);
      hueco('w', P.pasillo.rect, 3.5, 3);
      hueco('e', P.pasillo.rect, 3.5, 3);
      segs.forEach(([x, z, vertical]) => {
        const w = vertical ? 0.2 : 0.52,
          d = vertical ? 0.52 : 0.2;
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, P.ALTO_MURO, d), muro);
        m.position.set(x, P.ALTO_MURO / 2, z);
        m.castShadow = m.receiveShadow = true;
        W.add(m);
        const r = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.04, d + 0.01), remate);
        r.position.set(x, P.ALTO_MURO + 0.02, z);
        W.add(r);
        G.bloquea(x - w / 2 - 0.05, z - d / 2 - 0.05, x + w / 2 + 0.05, z + d / 2 + 0.05);
      });
      // Panel de la sala de prensa con el escudo repetido (photocall)
      const tF = textura('photocall-' + club.siglas, 512, (x, n) => {
        x.fillStyle = '#f7f7f7';
        x.fillRect(0, 0, n, n);
        x.font = 'bold 44px sans-serif';
        x.textAlign = 'center';
        for (let f = 0; f < 6; f++)
          for (let c = 0; c < 4; c++) {
            x.fillStyle = (f + c) % 2 ? club.colores[0] : club.colores[1] === '#ffffff' ? '#333' : club.colores[1];
            x.fillText(club.siglas, 64 + c * 128, 60 + f * 85);
          }
      });
      const panel = new THREE.Mesh(new THREE.BoxGeometry(6, 2.4, 0.1), new THREE.MeshStandardMaterial({ map: tF, color: tF ? 0xffffff : club.colores[0] }));
      panel.position.set(-14, 1.2, 13.85);
      W.add(panel);
      // Vitrina de trofeos en recepción: una copa por título del palmarés (si no hay, una vacía)
      const titulos = Math.min(12, (st.historial || []).filter(h => h.clubId === st.clubId && h.campeon).length + 1),
        oro = new THREE.MeshStandardMaterial({ color: 0xd4a72c, metalness: 0.9, roughness: 0.3 });
      for (let i = 0; i < titulos; i++) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.28, 10), oro);
        c.position.set(9.2, 0.95 + (i % 2) * 0.55, 8.8 + (i >> 1) * 0.28);
        W.add(c);
      }
      // Máquinas del gimnasio (procedurales)
      const metal = new THREE.MeshStandardMaterial({ color: 0x40464e, metalness: 0.6, roughness: 0.4 }),
        negro = new THREE.MeshStandardMaterial({ color: 0x1d2024 }),
        clubM = new THREE.MeshStandardMaterial({ color: club.colores[0] });
      P.gimnasio.forEach(([tipo, x, z, ry]) => {
        const g = new THREE.Group();
        const B = (w, h, d, m, px, py, pz) => {
          const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
          me.position.set(px, py, pz);
          me.castShadow = true;
          g.add(me);
        };
        if (tipo === 'cinta') {
          B(0.8, 0.18, 1.9, negro, 0, 0.12, 0);
          B(0.06, 1.1, 0.06, metal, -0.38, 0.6, -0.8);
          B(0.06, 1.1, 0.06, metal, 0.38, 0.6, -0.8);
          B(0.8, 0.3, 0.12, clubM, 0, 1.2, -0.8);
          G.bloquea(x - 0.5, z - 1.1, x + 0.5, z + 1.1);
        } else if (tipo === 'bici') {
          B(0.3, 0.5, 1.1, metal, 0, 0.3, 0);
          B(0.35, 0.08, 0.3, negro, 0, 0.75, 0.25);
          B(0.5, 0.06, 0.1, negro, 0, 1.0, -0.45);
          B(0.06, 0.4, 0.06, metal, 0, 0.8, -0.45);
          G.bloquea(x - 0.3, z - 0.6, x + 0.3, z + 0.6);
        } else if (tipo === 'pesas') {
          B(0.5, 1.4, 2.4, metal, 0, 0.7, 0);
          for (let i = 0; i < 6; i++) {
            const d = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 10), negro);
            d.rotation.x = Math.PI / 2;
            d.position.set(0.3, 0.4 + (i % 2) * 0.5, -0.9 + (i >> 1) * 0.9);
            g.add(d);
          }
          G.bloquea(x - 1.3, z - 0.5, x + 1.3, z + 0.5);
        } else if (tipo === 'colchoneta') B(1.6, 0.06, 2.2, clubM, 0, 0.03, 0);
        else if (tipo === 'banco') {
          B(0.4, 0.12, 1.3, clubM, 0, 0.42, 0.1);
          B(0.08, 0.38, 0.08, metal, 0, 0.19, 0.6);
          B(0.08, 0.38, 0.08, metal, 0, 0.19, -0.4);
          B(0.06, 1.15, 0.06, metal, -0.42, 0.57, -0.55);
          B(0.06, 1.15, 0.06, metal, 0.42, 0.57, -0.55);
          const barra = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 8), metal);
          barra.rotation.z = Math.PI / 2;
          barra.position.set(0, 1.12, -0.55);
          g.add(barra);
          for (const sx of [-0.7, 0.7]) {
            const d = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), negro);
            d.rotation.z = Math.PI / 2;
            d.position.set(sx, 1.12, -0.55);
            g.add(d);
          }
          G.bloquea(x - 0.5, z - 0.7, x + 0.5, z + 0.8);
        }
        g.position.set(x, 0, z);
        g.rotation.y = (ry * Math.PI) / 180;
        W.add(g);
      });
      // Muebles de Kenney
      const ms = await Promise.all(P.muebles.map(m => mueble(m[0]).catch(() => null)));
      P.muebles.forEach((m, i) => {
        const o = ms[i];
        if (!o) return;
        o.position.set(m[1], 0, m[2]);
        o.rotation.y = (m[3] * Math.PI) / 180;
        o.traverse(n => {
          if (n.isMesh) {
            n.castShadow = true;
            n.receiveShadow = true;
          }
        });
        W.add(o);
        const t = o.tam,
          e = P.ESCALA_MUEBLES,
          giro = Math.abs(Math.sin(o.rotation.y)) > 0.5,
          w = (giro ? t.z : t.x) * e,
          d = (giro ? t.x : t.z) * e;
        if (!/^rug|^books|^computer|^laptop|^kitchenCoffee/.test(m[0])) G.bloquea(m[1] - w / 2 + 0.1, m[2] - d / 2 + 0.1, m[1] + w / 2 - 0.1, m[2] + d / 2 - 0.1);
      });
      decorar(W, club, G, segs, st);
      GM.kit.fusionar(W);
      // Puntos de interacción de las salas: anillo luminoso y rótulo
      S.zonas = P.salas.map(sa => zona(W, sa, sa.interaccion[0], sa.interaccion[1], club));
      S.zonas.push(
        zona(
          W,
          { id: 'salida', nombre: 'Salida a la calle', accion: 'Pasear por ' + club.ciudad, destino: {}, irA: 'calle', boton: 'Salir a la calle' },
          GM.sedePlano.entrada.x,
          13.3,
          club
        )
      );
      return W;
    }
    return construir;
  };
})();
