/* Calendario de la ciudad (punto 42): festivos nacionales reales por país (con Semana Santa y Pascua calculadas), fiestas patronales de cada ciudad (tres días, viernes a domingo, entre mayo y septiembre),
   maratón, conciertos en la plaza, manifestaciones y mercadillo. GM.ciudadDia.hoy(st) -> { dow, festivo, patronal, eventos: [{ id, nombre, h0, h1 }] }.
   poblar(S, M, st) pinta lo de hoy (escenario y público del concierto, puestos y gente de las fiestas, corredores del maratón, pancartas de la manifestación) y actualizar(S, M, dt) lo enciende
   y apaga por horas; también marca S.festivo (los comercios cierran y el tráfico baja como un domingo) y pone un rótulo «Hoy: …» en la calle. Prueba: node tools/ciudad_dia_prueba.js y t_ciudad_dia.js. */
(function () {
  const U = GM.util;
  const FEST = {
    ES: [
      [1, 1, 'Año Nuevo'],
      [1, 6, 'Reyes'],
      [5, 1, 'Día del Trabajo'],
      [8, 15, 'La Asunción'],
      [10, 12, 'Fiesta Nacional'],
      [11, 1, 'Todos los Santos'],
      [12, 6, 'Día de la Constitución'],
      [12, 8, 'La Inmaculada'],
      [12, 25, 'Navidad']
    ],
    IT: [
      [1, 1, 'Capodanno'],
      [1, 6, 'Epifanía'],
      [4, 25, 'Liberación'],
      [5, 1, 'Día del Trabajo'],
      [6, 2, 'Fiesta de la República'],
      [8, 15, 'Ferragosto'],
      [11, 1, 'Todos los Santos'],
      [12, 8, 'Inmaculada'],
      [12, 25, 'Navidad'],
      [12, 26, 'San Esteban']
    ],
    GR: [
      [1, 1, 'Año Nuevo'],
      [1, 6, 'Epifanía'],
      [3, 25, 'Día de la Independencia'],
      [5, 1, 'Día del Trabajo'],
      [8, 15, 'La Dormición'],
      [10, 28, 'Día del Ohi'],
      [12, 25, 'Navidad'],
      [12, 26, 'Sinaxis']
    ],
    TR: [
      [1, 1, 'Año Nuevo'],
      [4, 23, 'Día de la Soberanía Nacional'],
      [5, 1, 'Día del Trabajo'],
      [5, 19, 'Día de la Juventud'],
      [7, 15, 'Día de la Democracia'],
      [8, 30, 'Día de la Victoria'],
      [10, 29, 'Día de la República']
    ],
    DE: [
      [1, 1, 'Año Nuevo'],
      [5, 1, 'Día del Trabajo'],
      [10, 3, 'Día de la Unidad'],
      [12, 25, 'Navidad'],
      [12, 26, 'San Esteban']
    ],
    FR: [
      [1, 1, 'Año Nuevo'],
      [5, 1, 'Día del Trabajo'],
      [5, 8, 'Victoria 1945'],
      [7, 14, 'Fiesta Nacional'],
      [8, 15, 'La Asunción'],
      [11, 1, 'Todos los Santos'],
      [11, 11, 'Armisticio'],
      [12, 25, 'Navidad']
    ],
    US: [
      [1, 1, 'Año Nuevo'],
      [7, 4, 'Día de la Independencia'],
      [11, 11, 'Día de los Veteranos'],
      [12, 25, 'Navidad']
    ],
    GEN: [
      [1, 1, 'Año Nuevo'],
      [5, 1, 'Día del Trabajo'],
      [12, 25, 'Navidad']
    ]
  };
  const SEMANA_SANTA = { ES: ['Jueves Santo', 'Viernes Santo'], IT: [null, 'Viernes Santo'], DE: [null, 'Viernes Santo'], FR: [], GR: [], TR: [], US: [] },
    LUNES_PASCUA = { IT: 'Lunes de Pascua', DE: 'Lunes de Pascua', FR: 'Lunes de Pascua' };
  const WEEKDAY = f => new Date(String(f).slice(0, 10) + 'T12:00:00Z').getUTCDay();
  function pascua(y) {
    const a = y % 19,
      b = Math.floor(y / 100),
      c = y % 100,
      d = Math.floor(b / 4),
      e = b % 4,
      f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30,
      i = Math.floor(c / 4),
      k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7,
      m = Math.floor((a + 11 * h + 22 * l) / 451),
      mes = Math.floor((h + l - 7 * m + 114) / 31),
      dia = ((h + l - 7 * m + 114) % 31) + 1;
    return y + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
  }
  function festivo(st) {
    const f = String(st.fecha).slice(0, 10),
      y = +f.slice(0, 4),
      md = f.slice(5),
      pais = (st.equipos[st.clubId] || {}).pais,
      lista = FEST[pais] || FEST.GEN;
    for (const [m, d, n] of lista) if (md === String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0')) return { nombre: n, nacional: true };
    const P = pascua(y),
      ss = SEMANA_SANTA[pais] || [];
    if (ss[0] && f === U.addDays(P, -3)) return { nombre: ss[0], nacional: true };
    if (ss[1] && f === U.addDays(P, -2)) return { nombre: ss[1], nacional: true };
    if (LUNES_PASCUA[pais] && f === U.addDays(P, 1)) return { nombre: LUNES_PASCUA[pais], nacional: true };
    return null;
  }
  // Fiestas patronales: tres días de viernes a domingo, la fecha sale del club (entre mayo y septiembre)
  function patronal(st) {
    const f = String(st.fecha).slice(0, 10),
      y = +f.slice(0, 4),
      c = st.equipos[st.clubId],
      h = U.hash(c.id + 'patronal'),
      mes = 5 + (h % 5),
      dia = 3 + ((h >>> 3) % 20);
    let ini = y + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
    while (WEEKDAY(ini) !== 5) ini = U.addDays(ini, 1);
    const fin = U.addDays(ini, 2);
    return f >= ini && f <= fin ? { nombre: 'Fiestas de ' + c.ciudad, dia: U.diffDays(ini, f) + 1, ultimo: f === fin, ini, fin } : null;
  }
  function maraton(st) {
    const f = String(st.fecha).slice(0, 10),
      y = +f.slice(0, 4),
      c = st.equipos[st.clubId],
      h = U.hash(c.id + 'maraton'),
      mes = [3, 4, 10, 11][h % 4];
    let d = y + '-' + String(mes).padStart(2, '0') + '-' + String(8 + ((h >>> 4) % 14)).padStart(2, '0');
    while (WEEKDAY(d) !== 0) d = U.addDays(d, 1);
    return f === d ? { nombre: 'Maratón de ' + c.ciudad } : null;
  }
  function hoy(st) {
    const f = String(st.fecha).slice(0, 10),
      dow = WEEKDAY(f),
      c = st.equipos[st.clubId],
      fe = festivo(st),
      pa = patronal(st),
      ev = [],
      h = U.hash(f + c.id);
    if (pa) ev.push({ id: 'patronal', nombre: pa.nombre + (pa.ultimo ? ', fin de fiestas con fuegos' : ''), h0: 11, h1: 24, ultimo: pa.ultimo });
    const mar = maraton(st);
    if (mar) ev.push({ id: 'maraton', nombre: mar.nombre, h0: 8.5, h1: 13 });
    const m = +f.slice(5, 7);
    if (dow === 6 && m >= 6 && m <= 9 && h % 4 === 0 && !pa) ev.push({ id: 'concierto', nombre: 'Concierto en la plaza', h0: 21, h1: 23.6 });
    if (dow >= 2 && dow <= 4 && h % 19 === 0 && !fe) ev.push({ id: 'manifestacion', nombre: 'Manifestación por el centro', h0: 18.6, h1: 20.2 });
    if (dow === 6) ev.push({ id: 'mercadillo', nombre: 'Mercadillo en la plaza', h0: 9, h1: 14 });
    return { fecha: f, dow, festivo: fe, patronal: pa, eventos: ev, cierra: !!fe || dow === 0 };
  }
  // ---------------------------------------------------------------- escena
  const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85 }, o || {}));
  const rnd = seed => {
    let a = seed >>> 0;
    return () => {
      a = (a * 1664525 + 1013904223) >>> 0;
      return a / 4294967296;
    };
  };
  function plazaDe(S) {
    const p = (S.plazas || [])[0];
    if (p) return { x: p[0], z: p[1], r: p[2] };
    const q = (S.paseoBase || [])[5] || [0, 20];
    return { x: q[0], z: q[1], r: 8 };
  }
  async function gente(S, M, st, n, r, ropaClub) {
    const club = st.equipos[st.clubId];
    const out = [];
    for (let i = 0; i < n; i++) {
      const cg = GM.catalogo
        ? GM.catalogo.generar(r, { pais: club.pais, mes: +String(st.fecha).slice(5, 7), temp: S.clima && S.clima.temp, club, hincha: ropaClub && r() < 0.5 })
        : { modelo: 'h-casual_2', altura: 172 };
      out.push(await M.personaje(cg));
    }
    return out;
  }
  function poner(S, p, x, z, ry, anim) {
    p.obj.position.set(x, 0, z);
    p.obj.rotation.y = ry;
    p.fijo = true;
    p.rol = p.rol || 'Asistente';
    p.obj.userData = { npc: S.gente.length };
    GM.sede.animar(p, anim || 'idle');
    S.mundo.add(p.obj);
    S.gente.push(p);
  }
  function pancarta(M, txt, ancho) {
    const t = M.textura('pancarta-' + txt, 512, (c, n) => {
      c.fillStyle = '#f4efe3';
      c.fillRect(0, 0, n, n / 4);
      c.fillStyle = '#b3261e';
      c.fillRect(0, 0, n, 8);
      c.fillRect(0, n / 4 - 8, n, 8);
      c.fillStyle = '#22262b';
      let fs = 62;
      c.font = 'bold ' + fs + 'px sans-serif';
      while (c.measureText(txt).width > n * 0.92 && fs > 18) {
        fs -= 4;
        c.font = 'bold ' + fs + 'px sans-serif';
      }
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(txt, n / 2, n / 8 + 2);
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho / 4), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
  }
  async function poblar(S, M, st) {
    S.eventosHoy = [];
    S.festivo = null;
    const H = hoy(st);
    S.diaCiudad = H;
    S.festivo = H.festivo || (H.dow === 0 ? { nombre: 'Domingo' } : null);
    if (!S.real || !S.G) return;
    const r = rnd(U.hash(H.fecha + st.clubId + 'ev')),
      club = st.equipos[st.clubId],
      pz = plazaDe(S);
    for (const e of H.eventos) {
      if (e.id === 'mercadillo') continue;
      const g = new THREE.Group();
      g.visible = false;
      S.mundo.add(g);
      const ev = { e, g, gente: [], t: 0 };
      S.eventosHoy.push(ev);
      if (e.id === 'concierto' || e.id === 'patronal') {
        // escenario junto al borde de la plaza con altavoces, pantalla y focos; el público mira hacia él
        const ang = 0.6,
          ex = pz.x + Math.cos(ang) * (pz.r + 1.5),
          ez = pz.z + Math.sin(ang) * (pz.r + 1.5),
          ry = Math.atan2(pz.x - ex, pz.z - ez);
        const esc = new THREE.Group();
        esc.position.set(ex, 0, ez);
        esc.rotation.y = ry;
        g.add(esc);
        const B = (w, h, d, m, x, y, z) => {
          const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
          me.position.set(x, y, z);
          me.castShadow = true;
          esc.add(me);
          return me;
        };
        B(9, 1.0, 5.4, mat(0x2b2f35), 0, 0.5, 0);
        B(0.3, 5.2, 0.3, mat(0x555a60, { metalness: 0.6 }), -4.4, 2.6, -2.4);
        B(0.3, 5.2, 0.3, mat(0x555a60, { metalness: 0.6 }), 4.4, 2.6, -2.4);
        B(9, 0.4, 0.4, mat(0x555a60, { metalness: 0.6 }), 0, 5.2, -2.4);
        const pant = B(6.4, 3.2, 0.12, new THREE.MeshBasicMaterial({ color: e.id === 'patronal' ? 0xf2a54a : 0x5a8fe8 }), 0, 3.0, -2.6);
        S.pantallaEv = pant;
        [-3.6, 3.6].forEach(x => B(1.2, 2.2, 1.0, mat(0x1a1c1f), x, 2.1, 1.8));
        for (let i = 0; i < 6; i++) {
          const f = B(0.5, 0.5, 0.5, new THREE.MeshBasicMaterial({ color: [0xff5a5a, 0x5affc8, 0xffd75a][i % 3] }), -4 + i * 1.6, 5.0, -1.2);
          void f;
        }
        S.G.bloquea(ex - 4.8, ez - 4.8, ex + 4.8, ez + 4.8);
        const crowd = await gente(S, M, st, e.id === 'patronal' ? 12 : 16, r, true);
        crowd.forEach((p, i) => {
          const a = (i / crowd.length) * 2.6 - 1.3 + (r() - 0.5) * 0.3,
            rr = 4.5 + r() * 5.5,
            x = ex - Math.sin(ry) * -rr * 0 + Math.sin(ry + a) * rr,
            z = ez + Math.cos(ry + a) * rr;
          p.rol = 'Público del ' + (e.id === 'patronal' ? 'baile' : 'concierto');
          poner(S, p, x, z, Math.atan2(ex - x, ez - z), 'idle');
          ev.gente.push(p);
          p.obj.visible = false;
        });
      }
      if (e.id === 'patronal') {
        // puestos de feria por la plaza y fuegos al acabar
        const cols = ['#c0392b', '#2f6f9e', '#f39c12', '#2e7d32', '#8e44ad'];
        if (GM.puebloVida && GM.puebloVida.puestoMercado)
          for (let i = 0; i < 5; i++) {
            const a = 3 + i * 0.7,
              x = pz.x + Math.cos(a) * (pz.r - 1.8),
              z = pz.z + Math.sin(a) * (pz.r - 1.8);
            if (!S.G.libre(...S.G.celda(x, z))) continue;
            GM.puebloVida.puestoMercado(g, M, x, z, a + Math.PI / 2, cols[i], r, i);
          }
        const luces = [];
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * 6.283,
            x = pz.x + Math.cos(a) * (pz.r + 0.6),
            z = pz.z + Math.sin(a) * (pz.r + 0.6),
            l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), new THREE.MeshBasicMaterial({ color: [0xffd75a, 0xff7a5a, 0x7ad7ff, 0xa5ff7a][i % 4] }));
          l.position.set(x, 3.4 + Math.sin(i * 1.7) * 0.3, z);
          g.add(l);
          luces.push(l);
        }
        if (e.ultimo && GM.arquitectura && GM.arquitectura.fuegos) GM.arquitectura.fuegos(S, g, [club.colores[0], club.colores[1] || '#ffffff', '#ffd75a'], r, false, pz.x, pz.z);
        const bailar = await gente(S, M, st, 8, r, true);
        bailar.forEach((p, i) => {
          const a = (i / bailar.length) * 6.283,
            x = pz.x + Math.cos(a) * 2.2,
            z = pz.z + Math.sin(a) * 2.2;
          if (!S.G.libre(...S.G.celda(x, z))) {
            p.obj.visible = false;
            return;
          }
          p.rol = 'Vecino de fiesta';
          poner(S, p, x, z, a + Math.PI, 'celebrar');
          ev.gente.push(p);
          p.obj.visible = false;
        });
      }
      if (e.id === 'maraton' || e.id === 'manifestacion') {
        const vias = (S.viasCoche || []).filter(v => v.L > 160),
          via = vias.sort((a, b) => b.Lin - a.Lin)[0];
        if (!via) {
          S.eventosHoy.pop();
          continue;
        }
        ev.via = via;
        ev.corredores = await gente(S, M, st, e.id === 'maraton' ? 14 : 12, r, false);
        ev.n = ev.corredores.length;
        ev.vel = e.id === 'maraton' ? 3.2 : 1.3;
        ev.corredores.forEach((p, i) => {
          p.fijo = true;
          p.rol = e.id === 'maraton' ? 'Corredor del maratón' : 'Manifestante';
          p.s0 = (i * (e.id === 'maraton' ? 6 : 2.1) + r() * 3) % via.L;
          p.lat = (r() - 0.5) * (e.id === 'maraton' ? 6 : 4);
          p.obj.userData = { npc: S.gente.length };
          S.mundo.add(p.obj);
          S.gente.push(p);
          p.obj.visible = false;
        });
        if (e.id === 'manifestacion') {
          const lemas = ['Más autobuses', 'Alquiler justo', 'Salvemos el parque', 'Sanidad pública'];
          ev.pancartas = [0, 1].map(i => {
            const pc = pancarta(M, lemas[(r() * 4) | 0], 3.2);
            pc.position.y = 2.1;
            g.add(pc);
            return pc;
          });
        } else {
          const meta = pancarta(M, 'META ' + club.ciudad.toUpperCase().slice(0, 14), 6);
          meta.position.set(0, 3.4, 0);
          g.add(meta);
          ev.meta = meta;
        }
      }
    }
    if (H.festivo || H.eventos.some(x => x.id !== 'mercadillo')) {
      const txt = [
        H.festivo && H.festivo.nombre + ', los comercios cierran',
        ...H.eventos.filter(x => x.id !== 'mercadillo').map(x => x.nombre + ' (' + Math.floor(x.h0) + ':' + String(Math.round((x.h0 % 1) * 60)).padStart(2, '0') + ')')
      ]
        .filter(Boolean)
        .join('. ');
      chip(S, 'Hoy: ' + txt);
    } else chip(S, null);
  }
  function chip(S, txt) {
    if (S.chipHoy) {
      S.chipHoy.remove();
      S.chipHoy = null;
    }
    if (!txt || !S.raiz) return;
    S.chipHoy = GM.h('div', { class: 'sede-hud dia-chip' }, txt);
    S.raiz.append(S.chipHoy);
  }
  function actualizar(S, M, dt) {
    if (!S.eventosHoy || !S.eventosHoy.length) return;
    const h = S.hora || 12,
      t = performance.now() / 1000;
    S.eventosHoy.forEach(ev => {
      const on = h >= ev.e.h0 && h < ev.e.h1;
      if (ev.g.visible !== on) {
        ev.g.visible = on;
        ev.gente.forEach(p => {
          p.obj.visible = on;
        });
        if (ev.corredores)
          ev.corredores.forEach(p => {
            p.obj.visible = on;
          });
      }
      if (ev.e.id === 'maraton' && ev.via) ev.via.cerrada = on;
      if (!on) return;
      if (S.pantallaEv && ev.e.id !== 'maraton') S.pantallaEv.material.color.setHSL((t * 0.15) % 1, 0.7, 0.55);
      if (ev.corredores && ev.via) {
        const via = ev.via,
          mar = ev.e.id === 'maraton';
        ev.corredores.forEach(p => {
          p.s = ((p.s === undefined ? p.s0 : p.s) + ev.vel * dt * (p.rapidez || (p.rapidez = 0.85 + Math.random() * 0.3))) % via.L;
          const q = S.punto ? S.punto(via, p.s) : null;
          if (!q) return;
          const [x, z, ux, uz] = q;
          p.obj.position.set(x - uz * p.lat, 0, z + ux * p.lat);
          p.obj.rotation.y = Math.atan2(ux, uz);
          GM.sede.animar(p, mar ? 'sprint' : 'walk');
          if (p.accion) p.accion.timeScale = mar ? 1.15 : 0.9;
          p.mixer.update(dt);
        });
        if (ev.pancartas)
          ev.pancartas.forEach((pc, i) => {
            const p = ev.corredores[i * 5 + 1],
              q = p && S.punto ? S.punto(via, p.s) : null;
            if (q) {
              pc.position.set(q[0] + 0, 2.1, q[1]);
              pc.rotation.y = Math.atan2(q[2], q[3]) + Math.PI / 2;
            }
          });
        if (ev.meta && S.punto) {
          const q = S.punto(via, via.L * 0.4);
          ev.meta.position.set(q[0], 3.4, q[1]);
          ev.meta.rotation.y = Math.atan2(q[2], q[3]) + Math.PI / 2;
        }
      }
      ev.gente.forEach(p => {
        if (p.mixer && S.yo && Math.hypot(p.obj.position.x - S.yo.obj.position.x, p.obj.position.z - S.yo.obj.position.z) < 30) p.mixer.update(dt);
      });
    });
  }
  function selfTest() {
    const st = { fecha: '2026-12-25', clubId: 'x', equipos: { x: { id: 'x', pais: 'ES', ciudad: 'Villa' } } };
    return !!festivo(st) && pascua(2026) === '2026-04-05' && !festivo(Object.assign({}, st, { fecha: '2026-12-11' })) && hoy(st).cierra;
  }
  GM.ciudadDia = { hoy, festivo, patronal, maraton, pascua, poblar, actualizar, selfTest };
  GM.register && GM.register('ciudadDia', { selfTest });
})();
