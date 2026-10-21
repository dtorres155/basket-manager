/* Decoración exterior de la sede (suelos, fachada, jardín y detalles) a partir del plano y el club.
   Se separó de sede3d.js: GM.sedeDecorar({ U, textura, rnd }) devuelve la función decorar. */
(function () {
  GM.sedeDecorar = function (ctx) {
    function decorar(W, club, G, segs, st) {
      const { U, textura, rnd } = ctx;
      const c1 = club.colores[0],
        c2 = club.colores[1] || '#ffffff',
        oscuro = c1 === '#000000' ? '#222222' : c1;
      const M = {};
      const mat = (hex, o) => {
        const k = hex + JSON.stringify(o || {});
        return M[k] || (M[k] = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.7 }, o || {})));
      };
      const caja = (w, h, d, m, x, y, z, ry) => {
        const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m);
        me.position.set(x, y + h / 2, z);
        if (ry) me.rotation.y = ry;
        me.castShadow = true;
        me.receiveShadow = true;
        W.add(me);
        return me;
      };
      const cil = (r, h, m, x, y, z, seg) => {
        const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 12), typeof m === 'string' ? mat(m) : m);
        me.position.set(x, y + h / 2, z);
        me.castShadow = true;
        W.add(me);
        return me;
      };
      const esfera = (r, m, x, y, z) => {
        const me = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), typeof m === 'string' ? mat(m) : m);
        me.position.set(x, y, z);
        me.castShadow = true;
        W.add(me);
        return me;
      };
      // Cuadros y carteles en las paredes (la cara mira hacia ry)
      const cuadro = (w, h, tex, x, y, z, ry, marco) => {
        const g = new THREE.Group();
        if (marco) {
          const mq = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.04), mat(marco));
          g.add(mq);
        }
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), tex ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }) : mat('#cccccc'));
        p.position.z = 0.025;
        g.add(p);
        g.position.set(x, y, z);
        g.rotation.y = ry;
        W.add(g);
        return g;
      };
      const lienzo = (clave, w, h, dib) =>
        textura(clave, 512, (x, n) => {
          x.save();
          x.scale(n / w, n / h);
          dib(x, w, h);
          x.restore();
        });
      // Texturas propias del club
      const tCartel = lienzo('cartel-' + club.siglas, 300, 420, (x, w, h) => {
        const g = x.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, oscuro);
        g.addColorStop(1, '#111');
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
        x.fillStyle = c2 === '#ffffff' ? '#fff' : c2;
        x.font = 'bold 34px sans-serif';
        x.textAlign = 'center';
        x.fillText('TEMPORADA', w / 2, 70);
        x.fillText('2026-27', w / 2, 110);
        x.font = 'bold 120px sans-serif';
        x.fillText(club.siglas, w / 2, 280);
        x.font = '24px sans-serif';
        x.fillText(club.nombre.toUpperCase().slice(0, 18), w / 2, 360);
      });
      const tAficion = lienzo('aficion-' + club.siglas, 300, 420, (x, w, h) => {
        x.fillStyle = '#f4f1e8';
        x.fillRect(0, 0, w, h);
        x.fillStyle = oscuro;
        x.fillRect(0, 0, w, 120);
        x.fillStyle = '#fff';
        x.font = 'bold 40px sans-serif';
        x.textAlign = 'center';
        x.fillText('SOMOS', w / 2, 75);
        x.fillStyle = oscuro;
        x.font = 'bold 54px sans-serif';
        x.fillText(club.siglas, w / 2, 230);
        x.font = '22px sans-serif';
        x.fillText('Abonos 2026-27', w / 2, 320);
        x.fillText('a la venta en recepción', w / 2, 352);
      });
      const tTablon = lienzo('tablon', 400, 280, (x, w, h) => {
        x.fillStyle = '#b98a55';
        x.fillRect(0, 0, w, h);
        const r = rnd(9);
        for (let i = 0; i < 7; i++) {
          x.save();
          x.translate(30 + (i % 4) * 92, 30 + Math.floor(i / 4) * 120);
          x.rotate((r() - 0.5) * 0.15);
          x.fillStyle = ['#fbf8f1', '#fff4a8', '#cfe8ff'][i % 3];
          x.fillRect(0, 0, 78, 96);
          x.fillStyle = 'rgba(0,0,0,.35)';
          for (let k = 0; k < 6; k++) x.fillRect(8, 16 + k * 12, 40 + r() * 22, 3);
          x.fillStyle = '#c8402f';
          x.beginPath();
          x.arc(39, 6, 5, 0, 6.3);
          x.fill();
          x.restore();
        }
      });
      const tMarcador = lienzo('marcador-' + club.siglas, 480, 160, (x, w, h) => {
        x.fillStyle = '#111';
        x.fillRect(0, 0, w, h);
        x.fillStyle = '#ffb81c';
        x.font = 'bold 72px monospace';
        x.textAlign = 'center';
        x.fillText('00', 110, 110);
        x.fillText('00', 370, 110);
        x.fillStyle = '#ff4a3a';
        x.font = 'bold 44px monospace';
        x.fillText('24', 240, 70);
        x.fillStyle = '#ddd';
        x.font = 'bold 26px sans-serif';
        x.fillText(club.siglas, 110, 40);
        x.fillText('INVIT.', 370, 40);
        x.fillText('10:00', 240, 130);
      });
      const tMenu = lienzo('menu', 360, 260, (x, w, h) => {
        x.fillStyle = '#20302a';
        x.fillRect(0, 0, w, h);
        x.fillStyle = '#f4f1e8';
        x.font = 'bold 30px sans-serif';
        x.textAlign = 'center';
        x.fillText('MENÚ DEL DÍA', w / 2, 46);
        x.font = '22px sans-serif';
        ['Crema de calabaza', 'Pasta con pollo', 'Fruta o yogur', 'Café: 1,20 €'].forEach((t, i) => x.fillText(t, w / 2, 100 + i * 38));
      });
      const tEscudo = lienzo('escudo-' + club.siglas, 400, 460, (x, w, h) => {
        x.clearRect(0, 0, w, h);
        x.beginPath();
        x.moveTo(20, 20);
        x.lineTo(w - 20, 20);
        x.lineTo(w - 20, 250);
        x.quadraticCurveTo(w - 20, 400, w / 2, h - 20);
        x.quadraticCurveTo(20, 400, 20, 250);
        x.closePath();
        x.fillStyle = oscuro;
        x.fill();
        x.lineWidth = 14;
        x.strokeStyle = c2;
        x.stroke();
        x.save();
        x.clip();
        x.fillStyle = c2;
        x.beginPath();
        x.moveTo(w / 2, 20);
        x.lineTo(w - 20, 20);
        x.lineTo(w - 20, 250);
        x.lineTo(w / 2, h);
        x.fill();
        x.restore();
        x.fillStyle = '#fff';
        x.strokeStyle = '#111';
        x.lineWidth = 6;
        x.font = 'bold 110px sans-serif';
        x.textAlign = 'center';
        x.strokeText(club.siglas, w / 2, 230);
        x.fillText(club.siglas, w / 2, 230);
      });
      const tCamiseta = lienzo('camiseta-' + club.siglas, 300, 340, (x, w, h) => {
        x.fillStyle = '#f2efe8';
        x.fillRect(0, 0, w, h);
        x.fillStyle = oscuro;
        x.beginPath();
        x.moveTo(70, 40);
        x.lineTo(110, 30);
        x.quadraticCurveTo(150, 60, 190, 30);
        x.lineTo(230, 40);
        x.lineTo(230, 300);
        x.lineTo(70, 300);
        x.closePath();
        x.fill();
        x.fillStyle = c2;
        x.fillRect(70, 40, 18, 260);
        x.fillRect(212, 40, 18, 260);
        x.fillStyle = '#fff';
        x.font = 'bold 90px sans-serif';
        x.textAlign = 'center';
        x.fillText(String(4 + (U.hash(club.id) % 20)), 150, 200);
      });
      // Sombras de contacto al pie de los muros (degradado en el suelo): dan profundidad a las salas
      const tSombra = textura('sombra-muro', 64, (x, n) => {
        const g = x.createLinearGradient(0, 0, 0, n);
        g.addColorStop(0, 'rgba(0,0,0,0.42)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g;
        x.fillRect(0, 0, n, n);
      });
      const mSombra = new THREE.MeshBasicMaterial({ map: tSombra, transparent: true, depthWrite: false });
      segs.forEach(([x, z, vertical]) => {
        for (const sgn of [-1, 1]) {
          const p = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.55).rotateX(-Math.PI / 2), mSombra);
          if (vertical) {
            p.rotation.y = sgn > 0 ? -Math.PI / 2 : Math.PI / 2;
            p.position.set(x + sgn * 0.37, 0.012, z);
          } else {
            p.rotation.y = sgn > 0 ? Math.PI : 0;
            p.position.set(x, 0.012, z + sgn * 0.37);
          }
          p.renderOrder = 1;
          W.add(p);
        }
      });
      // Charcos de luz (luz cálida de lámparas y focos, en aditivo)
      const tLuz = textura('charco-luz', 128, (x, n) => {
        const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
        g.addColorStop(0, 'rgba(255,236,200,0.34)');
        g.addColorStop(1, 'rgba(255,236,200,0)');
        x.fillStyle = g;
        x.fillRect(0, 0, n, n);
      });
      const mLuz = new THREE.MeshBasicMaterial({ map: tLuz, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      [
        [-14, -9, 7],
        [-4, -3, 7],
        [6.5, -8, 6],
        [15.5, -2, 5],
        [15.5, -10, 5],
        [-14, 10, 6],
        [-3, 9.5, 6],
        [6, 9.5, 5],
        [15, 10.5, 5],
        [-12, 3.5, 4],
        [0, 3.5, 4],
        [12, 3.5, 4]
      ].forEach(([x, z, r]) => {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(r, r).rotateX(-Math.PI / 2), mLuz);
        p.position.set(x, 0.015, z);
        p.renderOrder = 2;
        W.add(p);
      });
      // Pasillo: carteles y tablón
      [
        [-17, 2.12, 0, tCartel],
        [-12.5, 2.12, 0, tAficion],
        [-4, 2.12, 0, tCartel],
        [1, 2.12, 0, tAficion],
        [9, 2.12, 0, tCartel],
        [18.2, 2.12, 0, tAficion]
      ].forEach(([x, z, ry, t]) => cuadro(0.75, 1.0, t, x, 0.62, z + 0.0, ry, '#2a2a2a'));
      cuadro(1.6, 1.1, tTablon, -6.6, 0.62, 4.88, Math.PI, '#6b4b2e');
      cuadro(0.75, 1.0, tCartel, 10.4, 0.62, 4.88, Math.PI, '#2a2a2a');
      cuadro(0.75, 1.0, tAficion, 16.6, 0.62, 4.88, Math.PI, '#2a2a2a');
      // Pista: marcador, carros de balones, conos y botellas
      cuadro(3.2, 1.05, tMarcador, -9, 0.62, -13.88, 0, '#333');
      const naranja = mat('#d9692b', { roughness: 0.8 });
      for (const xr of [-19.2, 1.2]) {
        caja(0.5, 0.06, 1.1, '#333a40', xr, 0.35, -2.2);
        caja(0.05, 0.5, 1.1, '#333a40', xr - 0.22, 0, -2.2);
        caja(0.05, 0.5, 1.1, '#333a40', xr + 0.22, 0, -2.2);
        for (let i = 0; i < 6; i++) esfera(0.12, naranja, xr + ((i % 2) - 0.5) * 0.24, 0.55, -2.6 + Math.floor(i / 2) * 0.38);
      }
      [
        [-12, -9],
        [-11, -9.6],
        [-10, -9],
        [-9, -9.6],
        [-8, -9]
      ].forEach(([x, z]) => {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 10), mat('#ff7a1a'));
        c.position.set(x, 0.14, z);
        W.add(c);
      });
      for (let i = 0; i < 6; i++) {
        cil(0.04, 0.22, mat(i % 2 ? oscuro : '#e8eef2'), -15.9 + i * 0.7, 0, 0.75);
        cil(0.04, 0.22, mat(i % 2 ? oscuro : '#e8eef2'), -5.9 + i * 0.7, 0, 0.75);
      }
      // Gimnasio: espejo, franja del club, mancuernas y kettlebells
      caja(6.5, 1.0, 0.04, mat('#c8dbe6', { metalness: 0.9, roughness: 0.08 }), 6.5, 0.1, -13.86);
      caja(8.6, 0.12, 0.03, oscuro, 6.5, 1.0, -13.85);
      caja(1.4, 0.06, 0.4, '#333a40', 3.2, 0.5, -9.5, Math.PI / 2);
      for (let i = 0; i < 5; i++) {
        const y = 0.6,
          z = -10.1 + i * 0.3;
        cil(0.06, 0.08, mat('#1d2024'), 3.1, y, z);
        cil(0.06, 0.08, mat('#1d2024'), 3.35, y, z);
        caja(0.25, 0.03, 0.03, '#888', 3.22, y + 0.03, z);
      }
      for (let i = 0; i < 4; i++) {
        esfera(0.11, mat('#1d2024'), 8.6 + i * 0.32, 0.11, -0.8);
      }
      // Vestuario: escudo pintado en el suelo y toallas en los bancos
      if (tEscudo) {
        const e = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.8).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tEscudo, transparent: true, roughness: 0.6 }));
        e.position.set(15.5, 0.013, -2);
        W.add(e);
      }
      [
        [13.2, -3],
        [15.9, -3],
        [17.2, -1],
        [13.8, -1]
      ].forEach(([x, z], i) => caja(0.35, 0.05, 0.25, i % 2 ? oscuro : '#f2f2f2', x, 0.47, z));
      // Enfermería: bañeras de hielo y armario de vendas
      for (const x of [18.6, 17.2]) {
        cil(0.55, 0.7, mat('#c9d3d6', { metalness: 0.5, roughness: 0.3 }), x, 0, -10.6, 20);
        cil(0.5, 0.02, mat('#7fc6e8', { roughness: 0.1 }), x, 0.66, -10.6, 20);
      }
      // Sala de prensa: micrófonos, cámaras en trípode y focos
      for (const x of [-14.8, -14, -13.2]) {
        cil(0.012, 0.25, '#222', x, 0.66, 12.2);
        esfera(0.035, mat('#222'), x, 0.93, 12.15);
      }
      for (const x of [-17.5, -10.5]) {
        const g = new THREE.Group();
        for (let k = 0; k < 3; k++) {
          const l = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.3), mat('#222'));
          const a = k * 2.1;
          l.position.set(Math.cos(a) * 0.2, 0.62, Math.sin(a) * 0.2);
          l.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
          g.add(l);
        }
        const cam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.5), mat('#1a1a1a'));
        cam.position.y = 1.35;
        g.add(cam);
        g.position.set(x, 0, 5.8);
        g.lookAt(-14, 0, 12.4);
        W.add(g);
      }
      for (const x of [-18.6, -9.4]) {
        cil(0.02, 1.9, '#333', x, 0, 13.2);
        const f = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.25, 12), mat('#222'));
        f.position.set(x, 1.95, 13.1);
        f.rotation.x = 0.6;
        W.add(f);
      }
      // Cafetería: pizarra del menú y tazas
      cuadro(1.8, 1.3, tMenu, -6.6, 0.65, 5.12, 0, '#6b4b2e');
      [
        [-6, 8.6],
        [-2.6, 8.6],
        [-5.9, 8.7],
        [0, 11.5]
      ].forEach(([x, z]) => cil(0.05, 0.08, mat('#f4f1e8'), x + 0.15, 0.62, z));
      // Despacho: camiseta enmarcada, bandera y portátil
      cuadro(1.0, 1.15, tCamiseta, 16, 0.65, 13.88, Math.PI, '#3a2a1a');
      cil(0.025, 2.2, '#bfa36a', 19.4, 0, 12.6);
      {
        const b = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshStandardMaterial({ color: c1, side: THREE.DoubleSide }));
        b.position.set(19.4, 1.9, 12.15);
        b.rotation.y = Math.PI / 2;
        W.add(b);
      }
      // Recepción: gran escudo del club y camisetas enmarcadas
      if (tEscudo) {
        const e = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.75), new THREE.MeshStandardMaterial({ map: tEscudo, transparent: true }));
        e.position.set(2.13, 1.0, 11.6);
        e.rotation.y = Math.PI / 2;
        W.add(e);
      }
      cuadro(0.8, 0.95, tCamiseta, 2.13, 0.62, 9.6, Math.PI / 2, '#3a2a1a');
      // Datos vivos en las paredes: pantalla de recepción con el próximo partido, pizarra del despacho con el quinteto y la clasificación
      const C = GM.mods.competiciones,
        prox = C && C.proximoPartido ? C.proximoPartido(st, st.clubId) : null,
        riv = prox ? st.equipos[prox.local === st.clubId ? prox.visitante : prox.local] : null;
      const tProx = lienzo('prox-' + club.siglas + (riv ? riv.siglas : '') + (prox ? prox.fecha : ''), 480, 270, (x, w, h) => {
        x.fillStyle = '#0d1117';
        x.fillRect(0, 0, w, h);
        x.fillStyle = oscuro;
        x.fillRect(0, 0, w, 52);
        x.fillStyle = '#fff';
        x.font = 'bold 28px sans-serif';
        x.textAlign = 'center';
        x.fillText('Próximo partido', w / 2, 36);
        x.font = 'bold 46px sans-serif';
        x.fillText(club.siglas, w / 4, 140);
        x.fillText(riv ? riv.siglas : '...', (w * 3) / 4, 140);
        x.fillStyle = '#ffb81c';
        x.font = 'bold 34px sans-serif';
        x.fillText('vs', w / 2, 140);
        x.fillStyle = '#c9d1d9';
        x.font = '24px sans-serif';
        x.fillText(riv ? riv.nombre : 'Sin partidos', w / 2, 200);
        x.fillText(prox ? U.fecha(prox.fecha) : '', w / 2, 238);
      });
      {
        const tv = caja(1.7, 1.0, 0.06, '#111', 9.92, 1.3, 7.2, Math.PI / 2);
        void tv;
        const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), new THREE.MeshBasicMaterial({ map: tProx }));
        p.position.set(9.88, 1.8, 7.2);
        p.rotation.y = -Math.PI / 2;
        W.add(p);
      }
      const quinteto = (() => {
        try {
          return GM.mods.partidos
            .tacticaValida(st, st.clubId)
            .quinteto.map(i => st.jugadores[i])
            .filter(Boolean);
        } catch (e) {
          return [];
        }
      })();
      const tabla = (() => {
        try {
          const ks = Object.keys(st.clasificaciones || {}).filter(k => st.clasificaciones[k].some(r => r.equipoId === st.clubId)),
            comp = ks.find(k => !/euro|champ/i.test(st.ligas[k] ? st.ligas[k].formato : k)) || ks[0];
          return comp ? C.clasificacion(st, comp).slice(0, 6) : [];
        } catch (e) {
          return [];
        }
      })();
      const tPizarra = lienzo('pizarra-' + club.siglas + quinteto.map(p => p.id).join() + tabla.map(r => r.equipoId + r.g).join(), 520, 300, (x, w, h) => {
        x.fillStyle = '#f7f8f6';
        x.fillRect(0, 0, w, h);
        x.strokeStyle = '#9aa3a8';
        x.lineWidth = 6;
        x.strokeRect(3, 3, w - 6, h - 6);
        x.fillStyle = '#1d4f91';
        x.font = 'bold 24px sans-serif';
        x.fillText('Quinteto', 22, 38);
        x.fillStyle = '#c0392b';
        x.fillText('Clasificación', 280, 38);
        x.font = '20px sans-serif';
        quinteto.slice(0, 5).forEach((p, i) => {
          x.fillStyle = '#1d2024';
          x.fillText((p.pos || '') + '  ' + p.nombre.split(' ').pop(), 22, 76 + i * 40);
        });
        tabla.forEach((r, i) => {
          const e = st.equipos[r.equipoId];
          x.fillStyle = r.equipoId === st.clubId ? '#c0392b' : '#1d2024';
          x.fillText(i + 1 + '. ' + (e ? e.siglas : '') + '  ' + (r.g || 0) + '-' + (r.p || 0), 280, 76 + i * 34);
        });
        x.strokeStyle = '#1d4f91';
        x.lineWidth = 3;
        x.beginPath();
        x.moveTo(20, 280);
        x.quadraticCurveTo(130, 230, 240, 280);
        x.stroke();
      });
      cuadro(2.2, 1.27, tPizarra, 10.13, 0.6, 11.2, Math.PI / 2, '#9aa3a8');
      // Pista: pizarra con ruedas junto al banquillo, nevera de bebidas y dispensador de agua
      {
        const g = new THREE.Group();
        const B = (w, h, d, m, px, py, pz) => {
          const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m);
          me.position.set(px, py, pz);
          me.castShadow = true;
          g.add(me);
        };
        B(1.5, 1.0, 0.04, '#f7f8f6', 0, 1.2, 0);
        B(0.05, 1.7, 0.05, '#888', -0.72, 0.85, 0);
        B(0.05, 1.7, 0.05, '#888', 0.72, 0.85, 0);
        B(1.6, 0.05, 0.4, '#888', 0, 0.05, 0);
        const tX = lienzo('jugada', 300, 200, (x, w, h) => {
          x.fillStyle = '#f7f8f6';
          x.fillRect(0, 0, w, h);
          x.strokeStyle = '#222';
          x.lineWidth = 3;
          x.beginPath();
          x.arc(w / 2, 0, 70, 0, Math.PI);
          x.stroke();
          x.font = 'bold 26px sans-serif';
          x.fillStyle = '#1d4f91';
          [
            [60, 150],
            [150, 170],
            [240, 150],
            [90, 70],
            [210, 70]
          ].forEach(([a, b], i) => x.fillText(String(i + 1), a, b));
          x.strokeStyle = '#c0392b';
          x.setLineDash([8, 6]);
          x.beginPath();
          x.moveTo(70, 140);
          x.quadraticCurveTo(120, 90, 200, 80);
          x.stroke();
        });
        const cara = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 0.94), new THREE.MeshStandardMaterial({ map: tX }));
        cara.position.set(0, 1.2, 0.03);
        g.add(cara);
        g.position.set(0.3, 0, -0.4);
        g.rotation.y = -Math.PI / 2;
        W.add(g);
        G.bloquea(0, -1.2, 0.6, 0.4);
      }
      caja(0.6, 1.5, 0.5, '#e8eef2', 1.4, 0, -13.3);
      G.bloquea(1.1, -13.6, 1.7, -13);
      caja(0.5, 0.9, 0.02, mat('#9fd0ea', { transparent: true, opacity: 0.6 }), 1.4, 0.4, -13.04);
      for (let i = 0; i < 6; i++) cil(0.035, 0.2, mat(i % 2 ? oscuro : '#ffb81c'), 1.25 + (i % 3) * 0.15, 0.55 + Math.floor(i / 3) * 0.4, -13.1);
      cil(0.16, 0.9, '#e8eef2', -19.4, 0, -13.4);
      cil(0.15, 0.4, mat('#7fc6e8', { transparent: true, opacity: 0.7 }), -19.4, 0.9, -13.4);
      // Vestuario: cesto de ropa, balones y la camiseta de cada uno en su taquilla
      cil(0.35, 0.6, '#c9b48a', 12.3, 0, 1.2);
      G.bloquea(12, 0.9, 12.6, 1.5);
      for (let i = 0; i < 3; i++) esfera(0.12, naranja, 12.2 + i * 0.1, 0.65, 1.15 + (i % 2) * 0.1);
      for (let i = 0; i < 10; i++) caja(0.4, 0.5, 0.02, i % 2 ? oscuro : c2, 11.8 + i * 0.82, 0.9, -5.08);
      // Enfermería: cartel anatómico y camilla de masajes
      const tAnat = lienzo('anatomia', 200, 320, (x, w, h) => {
        x.fillStyle = '#f4f1e8';
        x.fillRect(0, 0, w, h);
        x.strokeStyle = '#c0392b';
        x.lineWidth = 6;
        x.beginPath();
        x.arc(w / 2, 50, 26, 0, 7);
        x.moveTo(w / 2, 76);
        x.lineTo(w / 2, 190);
        x.moveTo(50, 110);
        x.lineTo(150, 110);
        x.moveTo(w / 2, 190);
        x.lineTo(65, 300);
        x.moveTo(w / 2, 190);
        x.lineTo(135, 300);
        x.stroke();
      });
      cuadro(0.7, 1.1, tAnat, 19.88, 0.7, -12.4, -Math.PI / 2, '#ddd');
      caja(0.7, 0.08, 1.9, '#2e86c1', 12.6, 0.7, -12.2);
      caja(0.6, 0.7, 0.06, '#888', 12.6, 0, -11.4);
      caja(0.6, 0.7, 0.06, '#888', 12.6, 0, -13);
      G.bloquea(12.2, -13.2, 13, -11.2);
      // Pasillo: reloj, fuente de agua y máquina de vending
      {
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 24), mat('#f4f1e8'));
        r.rotation.x = Math.PI / 2;
        r.position.set(-9, 2.5, 4.86);
        W.add(r);
        const ag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.02), mat('#111'));
        ag.position.set(-9, 2.56, 4.83);
        ag.rotation.z = -0.9;
        W.add(ag);
      }
      caja(0.9, 1.9, 0.7, oscuro, 0.4, 0, 4.5);
      caja(0.6, 1.1, 0.02, mat('#c8dbe6', { transparent: true, opacity: 0.55 }), 0.4, 0.6, 4.14);
      G.bloquea(-0.1, 4.1, 0.9, 4.9);
      // Exterior: acera, marquesina de la entrada, mástiles con banderas y árboles
      const acera = new THREE.Mesh(new THREE.PlaneGeometry(46, 34).rotateX(-Math.PI / 2), mat('#a7a39b', { roughness: 0.95 }));
      acera.position.set(0, -0.005, 0);
      acera.receiveShadow = true;
      W.add(acera);
      caja(3.0, 0.08, 1.1, oscuro, 6, 2.6, 14.9);
      cil(0.05, 2.4, '#555', 4.6, 0, 16.2);
      cil(0.05, 2.4, '#555', 7.4, 0, 16.2);
      [
        [2.5, 0],
        [4, 1],
        [8, 0],
        [9.5, 1]
      ].forEach(([x, k]) => {
        cil(0.04, 4.2, '#d7d7d7', x, 0, 16.6);
        const b = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), new THREE.MeshStandardMaterial({ color: k ? c2 : c1, side: THREE.DoubleSide }));
        b.position.set(x + 0.58, 3.8, 16.6);
        W.add(b);
      });
      const tronco = mat('#6b5136'),
        copa = mat('#4f7f3a', { roughness: 0.9 });
      [
        [-22, -12],
        [-22, -2],
        [-22, 8],
        [22, -12],
        [22, 0],
        [22, 10],
        [-14, 17.5],
        [-4, 17.5],
        [14, 17.5],
        [-12, -16.5],
        [0, -16.5],
        [12, -16.5]
      ].forEach(([x, z], i) => {
        cil(0.12, 1.4, tronco, x, 0, z, 6);
        const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 + (i % 3) * 0.2, 1), copa);
        c.position.set(x, 2.1, z);
        c.castShadow = true;
        W.add(c);
      });
    }
    return decorar;
  };
})();
