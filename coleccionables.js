/* COLECCIONABLES (punto 61, GM.coleccionables) — modo carrera. Un catálogo con rareza y lugar de aparición, y una vitrina que se va llenando con el tiempo:
   - Camisetas de los rivales (una por club): te las cambias con el rival después de jugar contra él (a veces) y las más raras salen de los títulos.
   - Cromos de jugadores (todos los de las ligas con valoración 62 o más): se compran en sobres de cinco en el quiosco y en la tienda del club, y a veces te regalan uno al cumplir un encargo.
   - Balones firmados: del All-Star, de los títulos, de las finales y de tus mejores noches (y de los concursos de la cancha).
   Cada pieza tiene rareza (común, rara, épica, legendaria) y puede repetirse; con tres repetidas del mismo tipo cambias por un sobre. La vitrina de tu casa muestra tus camisetas, balones y cromos más raros, y el museo del club las expone.
   Estado: state.carrera.colec = { items: { <id>: { n, f, de } }, sobres, abiertos }. Expone: catalogo, tiene, total, progreso, otorgar, comprarSobre, abrirSobre, cambiarRepes, vitrina, exhibicion, acciones, selfTest. Prueba: t_coleccionables.js. */
(function () {
  const U = GM.util,
    clamp = U.clamp,
    C = st => st.carrera,
    act = st => st && st.modo === 'carrera' && !!st.carrera;
  const RAREZAS = ['comun', 'rara', 'epica', 'legendaria'],
    NOM = { comun: 'Común', rara: 'Rara', epica: 'Épica', legendaria: 'Legendaria' },
    COLOR = { comun: '#9aa3ab', rara: '#3a7bd5', epica: '#8e44ad', legendaria: '#e8a52e' },
    PESO = { comun: 62, rara: 25, epica: 10, legendaria: 3 };
  const PRECIO_SOBRE = 0.2;
  let cache = { clave: '', lista: null, mapa: null };
  const rarezaJug = ovr => (ovr >= 84 ? 'legendaria' : ovr >= 78 ? 'epica' : ovr >= 70 ? 'rara' : 'comun');
  const rarezaClub = (st, e) => {
    const l = GM.mods.mercado && st.ligas ? GM.mods.mercado.ligaDe(st, e.id) : null;
    return e.reputacion >= 88 ? 'legendaria' : e.reputacion >= 78 ? 'epica' : e.reputacion >= 62 || l === 'NBA' || l === 'EUROLIGA' ? 'rara' : 'comun';
  };
  // El catálogo sale de los equipos y jugadores de la partida (no se guarda: se recalcula con la misma semilla)
  function catalogo(st) {
    const clave = st.seed + '|' + Object.keys(st.equipos).length + '|' + Object.keys(st.jugadores).length;
    if (cache.clave === clave && cache.lista) return cache.lista;
    const L = [];
    Object.keys(st.equipos).forEach(id => {
      const e = st.equipos[id];
      if (!e || !e.nombre) return;
      L.push({
        id: 'camiseta:' + id,
        tipo: 'camiseta',
        nombre: 'Camiseta del ' + e.nombre,
        club: id,
        rareza: rarezaClub(st, e),
        colores: e.colores || ['#cccccc', '#333333'],
        lugar: 'Se cambia con el rival después de jugar contra ' + e.siglas + '.'
      });
    });
    Object.keys(st.jugadores).forEach(id => {
      const j = st.jugadores[id];
      if (!j || id === 'yo' || j.ficticio || !j.ovr || j.ovr < 62 || !j.nombre) return;
      L.push({
        id: 'cromo:' + id,
        tipo: 'cromo',
        nombre: 'Cromo de ' + j.nombre,
        jugador: id,
        club: j.equipoId,
        rareza: rarezaJug(j.ovr),
        lugar: 'Sobres de cromos del quiosco y de la tienda del club.'
      });
    });
    const bal = [
      ['final', 'Balón de una final', 'epica', 'Se gana al ser campeón de un título.'],
      ['campeon', 'Balón del campeonato', 'legendaria', 'Se gana al ganar una liga con tu club.'],
      ['allstar', 'Balón del All-Star', 'epica', 'Se consigue al jugar un All-Star.'],
      ['triples', 'Balón firmado del concurso de triples', 'rara', 'Premio de los mejores concursos de triples de la cancha.'],
      ['noche', 'Balón de tu mejor noche', 'rara', 'Se te regala tras anotar 30 puntos o más.'],
      ['pueblo', 'Balón firmado por tu pueblo', 'rara', 'Se regala en la fiesta de tu pueblo.'],
      ['debut', 'Balón de tu debut', 'comun', 'Tu primer partido como profesional.'],
      ['mvp', 'Balón de máximo anotador', 'epica', 'Acaba una temporada como máximo anotador.']
    ];
    bal.forEach(([k, n, r, lugar]) => L.push({ id: 'balon:' + k, tipo: 'balon', nombre: n, rareza: r, lugar }));
    cache = { clave, lista: L, mapa: Object.fromEntries(L.map(x => [x.id, x])) };
    return L;
  }
  const item = (st, id) => {
    catalogo(st);
    return cache.mapa[id] || null;
  };
  const col = st => {
    const c = C(st);
    return c.colec || (c.colec = { items: {}, sobres: 0, abiertos: 0 });
  };
  const tiene = (st, id) => !!(act(st) && col(st).items[id]),
    copias = (st, id) => (act(st) && col(st).items[id] ? col(st).items[id].n : 0);
  const total = st => (act(st) ? Object.keys(col(st).items).length : 0),
    repetidas = st => Object.keys(col(st).items).reduce((s, k) => s + col(st).items[k].n - 1, 0);
  function progreso(st) {
    const L = catalogo(st),
      c = col(st),
      por = t => ({ tengo: L.filter(x => x.tipo === t && c.items[x.id]).length, hay: L.filter(x => x.tipo === t).length });
    return { total: total(st), hay: L.length, camiseta: por('camiseta'), cromo: por('cromo'), balon: por('balon'), repetidas: repetidas(st), sobres: c.sobres };
  }
  function otorgar(st, id, de) {
    if (!act(st)) return null;
    const it = item(st, id);
    if (!it) return null;
    const c = col(st),
      nuevo = !c.items[id];
    if (nuevo) c.items[id] = { n: 1, f: st.fecha, de: de || '' };
    else c.items[id].n++;
    if (nuevo && (it.rareza === 'epica' || it.rareza === 'legendaria' || it.tipo !== 'cromo'))
      GM.noticia && GM.noticia(st, '🏆 Nueva pieza de colección (' + NOM[it.rareza].toLowerCase() + '): ' + it.nombre.toLowerCase() + '.');
    GM.bus.emit('coleccion:nueva', { id, nuevo });
    return { it, nuevo };
  }
  // ---------- Sobres ----------
  function elegir(st, r) {
    const L = catalogo(st).filter(x => x.tipo === 'cromo');
    if (!L.length) return null;
    let t = r() * 100,
      rz = 'comun';
    for (const k of RAREZAS) {
      t -= PESO[k];
      if (t <= 0) {
        rz = k;
        break;
      }
    }
    let pool = L.filter(x => x.rareza === rz);
    if (!pool.length) pool = L;
    return pool[Math.floor(r() * pool.length) % pool.length];
  }
  function comprarSobre(st, cant) {
    if (!act(st)) return { ok: false, motivo: 'Solo en el modo carrera.' };
    cant = cant || 1;
    const coste = PRECIO_SOBRE * cant;
    if (GM.mods.hogar.dinero(st) < coste) return { ok: false, motivo: 'Te faltan ' + Math.round((coste - GM.mods.hogar.dinero(st)) * 100) / 100 + ' mil €.' };
    GM.mods.hogar.gastar(st, coste);
    if (GM.patrimonio) GM.patrimonio.reg(st, 'vida', 'Sobres de cromos', -coste);
    col(st).sobres += cant;
    return { ok: true, sobres: col(st).sobres };
  }
  function abrirSobre(st) {
    const c = col(st);
    if (!act(st) || c.sobres < 1) return { ok: false, motivo: 'No tienes sobres.' };
    c.sobres--;
    c.abiertos++;
    const r = () => GM.rng.next(),
      sacados = [];
    for (let i = 0; i < 5; i++) {
      const it = elegir(st, r);
      if (!it) break;
      const o = otorgar(st, it.id, 'sobre');
      sacados.push({ id: it.id, nombre: it.nombre, rareza: it.rareza, nuevo: o.nuevo });
    }
    return { ok: true, sacados };
  }
  function cambiarRepes(st) {
    const c = col(st);
    let n = 0;
    Object.keys(c.items).forEach(k => {
      const x = c.items[k];
      if (x.n >= 4 && item(st, k) && item(st, k).tipo === 'cromo') {
        const dar = Math.floor((x.n - 1) / 3);
        x.n -= dar * 3;
        n += dar;
      }
    });
    if (!n) return { ok: false, motivo: 'Necesitas un cromo con al menos cuatro copias (tres repetidas cambian por un sobre).' };
    c.sobres += n;
    return { ok: true, sobres: n };
  }
  // ---------- Intercambio con vecinos ----------
  // Cada semana tres vecinos coleccionistas te ofrecen cambiar una de tus repetidas por una pieza que no tienes (de rareza igual, o una menos si es de las altas).
  const VECINOS = [
    ['Marta', 'del tercero'],
    ['Jaume', 'de la panadería'],
    ['Rosa', 'del quiosco de enfrente'],
    ['Toni', 'del bloque de al lado'],
    ['Elena', 'del colegio'],
    ['Pau', 'del club de ajedrez'],
    ['Nuria', 'de la peña'],
    ['Quim', 'del taller']
  ];
  const semana = st => U.addDays(st.fecha, -U.weekday(st.fecha));
  function ofertas(st) {
    if (!act(st)) return [];
    const c = col(st),
      sem = semana(st);
    if (!c.tru || c.tru.sem !== sem) c.tru = { sem, hechos: [] };
    const L = catalogo(st),
      orden = { comun: 0, rara: 1, epica: 2, legendaria: 3 },
      mias = Object.keys(c.items)
        .filter(k => c.items[k].n >= 2 && item(st, k))
        .sort(),
      out = [],
      usados = new Set();
    for (let k = 0; k < 3; k++) {
      const h0 = U.hash(sem + 'tru' + k + st.seed) >>> 0,
        v = VECINOS[(h0 >>> 3) % VECINOS.length];
      let quiere = null,
        da = null;
      if (mias.length) {
        quiere = item(st, mias[(h0 >>> 5) % mias.length]);
        const r = orden[quiere.rareza],
          objetivo = r >= 2 && (h0 >>> 9) % 3 === 0 ? r - 1 : r,
          pool = L.filter(x => orden[x.rareza] === objetivo && !c.items[x.id] && x.id !== quiere.id && !usados.has(x.id));
        if (pool.length) da = pool[(h0 >>> 11) % pool.length];
      }
      if (!da) {
        quiere = { id: 'sobre', nombre: 'un sobre de cromos sin abrir', rareza: 'comun' };
        const pool = L.filter(x => x.rareza === 'rara' && x.tipo === 'cromo' && !c.items[x.id] && !usados.has(x.id));
        if (!pool.length || c.sobres < 1) {
          if (!pool.length) continue;
        }
        da = pool[(h0 >>> 11) % pool.length];
      }
      usados.add(da.id);
      out.push({
        k,
        vecino: v[0],
        de: v[1],
        quiere: { id: quiere.id, nombre: quiere.nombre, rareza: quiere.rareza },
        da: { id: da.id, nombre: da.nombre, rareza: da.rareza },
        hecho: c.tru.hechos.indexOf(k) >= 0
      });
    }
    return out;
  }
  function intercambiar(st, k) {
    const o = ofertas(st).find(x => x.k === k);
    if (!o) return { ok: false, motivo: 'Esa oferta ya no está.' };
    if (o.hecho) return { ok: false, motivo: 'Ya habéis cambiado esta semana.' };
    const c = col(st);
    if (o.quiere.id === 'sobre') {
      if (c.sobres < 1) return { ok: false, motivo: 'No tienes ningún sobre sin abrir para cambiar.' };
      c.sobres--;
    } else {
      const x = c.items[o.quiere.id];
      if (!x || x.n < 2) return { ok: false, motivo: 'Ya no tienes esa repetida.' };
      x.n--;
    }
    const r = otorgar(st, o.da.id, 'intercambio con ' + o.vecino);
    c.tru.hechos.push(k);
    const so = st.carrera.social;
    if (so && so.contactos) {
      const ami = so.contactos.find(q => q.tipo === 'amigo');
      if (ami && GM.rng.next() < 0.3) ami.rel = clamp(ami.rel + 1, 0, 100);
    }
    return { ok: true, texto: o.vecino + ' ' + o.de + ' te da ' + o.da.nombre.toLowerCase() + (r && r.nuevo ? ' (¡nueva en tu colección!)' : '') + '.' };
  }
  // ---------- De dónde salen ----------
  GM.bus.on('partido:jugado', ({ partido: g }) => {
    const st = GM.state;
    if (!act(st) || !g || !g.resultado) return;
    const c = C(st),
      yo = st.jugadores.yo,
      id = yo && yo.equipoId;
    if (!id || (g.local !== id && g.visitante !== id)) return;
    const rival = g.local === id ? g.visitante : g.local,
      s = g.resultado.stats && g.resultado.stats.yo;
    if (s && s.min >= 10 && GM.rng.next() < 0.28) {
      const o = otorgar(st, 'camiseta:' + rival, 'partido');
      if (o && o.nuevo && GM.ui && GM.ui.toast) GM.ui.toast('Cambias la camiseta con el rival: ' + o.it.nombre);
    }
    if (s && s.pts >= 30) otorgar(st, 'balon:noche', 'partido');
    if (c.vida && c.vida.logros && c.vida.logros.pj === 1) otorgar(st, 'balon:debut', 'debut');
  });
  GM.bus.on('copa:fin', e => {
    const st = GM.state;
    if (!act(st)) return;
    const id = e && (e.campeon || (e.copa && e.copa.campeon));
    if (id && st.jugadores.yo && st.jugadores.yo.equipoId === id) otorgar(st, 'balon:final', 'título');
  });
  GM.bus.on('temporada:fin', () => {
    const st = GM.state;
    if (!act(st)) return;
    const yo = st.jugadores.yo,
      h = st.historial.filter(x => x.temporada === st.temporada && x.campeon === (yo && yo.equipoId));
    if (h.length) otorgar(st, 'balon:campeon', 'título');
    h.forEach(x => otorgar(st, 'camiseta:' + x.campeon, 'título'));
  });
  GM.bus.on('allstar:fin', () => {
    const st = GM.state;
    if (!act(st)) return;
    const ev = Object.values((st.allstar && st.allstar.eventos) || {}).find(e => e.mio && (e.mio.seleccionado || e.mio.triples || e.mio.mates));
    if (ev) otorgar(st, 'balon:allstar', 'All-Star');
  });
  GM.bus.on('encargo:hecho', () => {
    const st = GM.state;
    if (act(st) && GM.rng.next() < 0.25) col(st).sobres += 1;
  });
  GM.bus.on('dia:avanzado', () => {
    const st = GM.state;
    if (!act(st)) return;
    const md = st.fecha.slice(5);
    if (md === '08-15' && st.carrera.pueblo) otorgar(st, 'balon:pueblo', 'fiesta');
    const g = st.carrera.cjuego;
    if (g && g.rec && g.rec.triples >= 8) otorgar(st, 'balon:triples', 'cancha');
    const L = st.carrera.vida && st.carrera.vida.logros;
    if (L && L.hechos && L.hechos.mvp) otorgar(st, 'balon:mvp', 'logro');
  });
  // ---------- La vitrina de casa y el museo ----------
  function seleccion(st, n) {
    const L = catalogo(st),
      c = col(st),
      orden = { legendaria: 0, epica: 1, rara: 2, comun: 3 };
    const mios = L.filter(x => c.items[x.id]).sort((a, b) => orden[a.rareza] - orden[b.rareza] || a.nombre.localeCompare(b.nombre));
    return {
      camisetas: mios.filter(x => x.tipo === 'camiseta').slice(0, n.camisetas),
      balones: mios.filter(x => x.tipo === 'balon').slice(0, n.balones),
      cromos: mios.filter(x => x.tipo === 'cromo').slice(0, n.cromos)
    };
  }
  function vitrina(S, st, W, x, z, ry) {
    if (!act(st)) return null;
    const T = THREE,
      g = new T.Group(),
      madera = new T.MeshStandardMaterial({ color: 0x4a3322, roughness: 0.6 }),
      cristal = new T.MeshStandardMaterial({ color: 0xbfe0f0, transparent: true, opacity: 0.25, roughness: 0.05 }),
      B = (w, h, d, px, py, pz, m) => {
        const me = new T.Mesh(new T.BoxGeometry(w, h, d), m);
        me.position.set(px, py, pz);
        g.add(me);
        return me;
      };
    B(1.8, 0.08, 0.45, 0, 0.04, 0, madera);
    B(1.8, 0.06, 0.45, 0, 1.75, 0, madera);
    B(0.06, 1.75, 0.45, -0.87, 0.9, 0, madera);
    B(0.06, 1.75, 0.45, 0.87, 0.9, 0, madera);
    B(1.8, 1.75, 0.04, 0, 0.9, -0.2, madera);
    for (let i = 1; i <= 3; i++) B(1.7, 0.03, 0.4, 0, i * 0.43, 0, cristal);
    B(1.76, 1.7, 0.02, 0, 0.9, 0.22, cristal);
    const s = seleccion(st, { camisetas: 6, balones: 4, cromos: 8 });
    s.camisetas.forEach((it, i) => {
      const col1 = new T.Color(it.colores[0]),
        col2 = new T.Color(it.colores[1] || '#222'),
        cx = -0.68 + (i % 3) * 0.34,
        cy = 1.1 + Math.floor(i / 3) * 0.4;
      const cuerpo = new T.Mesh(new T.PlaneGeometry(0.26, 0.3), new T.MeshStandardMaterial({ color: col1, side: T.DoubleSide }));
      cuerpo.position.set(cx, cy, 0.03);
      g.add(cuerpo);
      const man = new T.Mesh(new T.PlaneGeometry(0.4, 0.1), new T.MeshStandardMaterial({ color: col1, side: T.DoubleSide }));
      man.position.set(cx, cy + 0.12, 0.03);
      g.add(man);
      const cu = new T.Mesh(new T.PlaneGeometry(0.1, 0.06), new T.MeshStandardMaterial({ color: col2, side: T.DoubleSide }));
      cu.position.set(cx, cy + 0.17, 0.035);
      g.add(cu);
    });
    s.balones.forEach((it, i) => {
      const b = new T.Mesh(
        new T.SphereGeometry(0.1, 14, 10),
        new T.MeshStandardMaterial({ color: COLOR[it.rareza] === '#9aa3ab' ? 0xd9692b : new T.Color(COLOR[it.rareza]), roughness: 0.7 })
      );
      b.position.set(-0.6 + i * 0.4, 0.52, 0.02);
      g.add(b);
      const lin = new T.Mesh(new T.TorusGeometry(0.1, 0.006, 6, 16), new T.MeshBasicMaterial({ color: 0x1a1a1a }));
      lin.position.copy(b.position);
      g.add(lin);
    });
    s.cromos.forEach((it, i) => {
      const cr = new T.Mesh(new T.PlaneGeometry(0.15, 0.21), new T.MeshStandardMaterial({ color: new T.Color(COLOR[it.rareza]), side: T.DoubleSide }));
      cr.position.set(-0.7 + (i % 8) * 0.2, 0.27, 0.02);
      g.add(cr);
      const ret = new T.Mesh(new T.PlaneGeometry(0.1, 0.1), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
      ret.position.set(-0.7 + (i % 8) * 0.2, 0.3, 0.025);
      g.add(ret);
    });
    g.position.set(x, 0, z);
    g.rotation.y = ry || 0;
    W.add(g);
    return g;
  }
  // En el museo del club: camisetas y cromos raros enmarcados en la pared del fondo
  function exhibicion(W, st, x0, x1, z0) {
    if (!act(st)) return 0;
    const T = THREE,
      s = seleccion(st, { camisetas: 6, balones: 0, cromos: 6 }),
      marco = new T.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.6 });
    let k = 0;
    s.camisetas.concat(s.cromos).forEach((it, i) => {
      const cam = it.tipo === 'camiseta',
        w = cam ? 0.7 : 0.45,
        h = cam ? 0.85 : 0.62,
        px = x0 + 1.2 + i * ((x1 - x0 - 2.4) / 11),
        m = new T.Mesh(new T.BoxGeometry(w + 0.1, h + 0.1, 0.05), marco);
      m.position.set(px, 1.2, z0 + 0.1);
      W.add(m);
      const f = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ color: new T.Color(cam ? it.colores[0] : COLOR[it.rareza]) }));
      f.position.set(px, 1.2, z0 + 0.14);
      W.add(f);
      k++;
    });
    return k;
  }
  function acciones(st) {
    if (!act(st)) return [];
    const c = col(st),
      p = progreso(st),
      tru = ofertas(st).map(o => ({
        id: 'trueque' + o.k,
        t: 'Cambiar con ' + o.vecino + ': ' + o.quiere.nombre.toLowerCase() + ' por ' + o.da.nombre.toLowerCase(),
        d: o.vecino + ' ' + o.de + '. Una vez a la semana con cada uno.',
        disponible: !o.hecho,
        motivo: 'Ya habéis cambiado esta semana',
        fn: () => intercambiar(st, o.k)
      }));
    return tru.concat([
      {
        id: 'sobre',
        t: 'Comprar un sobre de cromos (' + Math.round(PRECIO_SOBRE * 1000) + ' €)',
        d: 'Cinco cromos al azar. Tienes ' + c.sobres + ' sobre' + (c.sobres === 1 ? '' : 's') + ' sin abrir.',
        disponible: GM.mods.hogar.dinero(st) >= PRECIO_SOBRE,
        motivo: 'No tienes ahorros para eso',
        fn: () => {
          const r = comprarSobre(st);
          return r.ok ? { ok: true, texto: 'Compras un sobre' } : r;
        }
      },
      {
        id: 'abrir',
        t: 'Abrir un sobre',
        d: 'Rasga el sobre y mira qué ha salido (' + c.sobres + ' en la mochila).',
        disponible: c.sobres > 0,
        motivo: 'No tienes sobres',
        fn: () => {
          const r = abrirSobre(st);
          if (!r.ok) return r;
          if (GM.ui && GM.ui.modal) mostrarSacados(r.sacados);
          return { ok: true, texto: 'Abres un sobre: ' + r.sacados.filter(x => x.nuevo).length + ' nuevos' };
        }
      },
      {
        id: 'estado',
        t: 'Colección: ' + p.total + ' de ' + p.hay,
        d: p.camiseta.tengo + ' camisetas, ' + p.cromo.tengo + ' cromos, ' + p.balon.tengo + ' balones. Repetidas: ' + p.repetidas + '.',
        disponible: false,
        motivo: '',
        fn: () => ({ ok: false })
      }
    ]);
  }
  function mostrarSacados(s) {
    const h = GM.h;
    GM.ui.modal(
      h(
        'div',
        null,
        h('h3', null, 'Tu sobre'),
        h(
          'div',
          { class: 'lista' },
          s.map(x =>
            h(
              'div',
              { class: 'item' },
              h(
                'div',
                { class: 'ct' },
                h('b', { style: { color: COLOR[x.rareza] } }, x.nombre),
                h('span', { class: 'muted' }, NOM[x.rareza] + (x.nuevo ? ', ¡nueva!' : ', repetida'))
              )
            )
          )
        )
      ),
      [{ t: 'Guardar', cls: 'btn-sec' }]
    );
  }
  function selfTest() {
    const st = {
      seed: 'a',
      modo: 'carrera',
      fecha: '2026-10-01',
      equipos: { a: { id: 'a', nombre: 'Club A', siglas: 'A', reputacion: 90, colores: ['#c00', '#fff'] }, b: { id: 'b', nombre: 'Club B', siglas: 'B', reputacion: 50 } },
      jugadores: { x: { nombre: 'Uno', ovr: 88, equipoId: 'a' }, y: { nombre: 'Dos', ovr: 66, equipoId: 'b' }, z: { nombre: 'Tres', ovr: 50, equipoId: 'b' } },
      carrera: { dinero: 5 },
      noticias: [],
      hogar: { ahorros: 5 }
    };
    const L = catalogo(st);
    return (
      L.filter(x => x.tipo === 'camiseta').length === 2 &&
      L.filter(x => x.tipo === 'cromo').length === 2 &&
      L.find(x => x.id === 'cromo:x').rareza === 'legendaria' &&
      L.find(x => x.id === 'camiseta:a').rareza === 'legendaria' &&
      RAREZAS.length === 4
    );
  }
  GM.coleccionables = {
    RAREZAS,
    NOM,
    COLOR,
    PRECIO_SOBRE,
    catalogo,
    item,
    tiene,
    copias,
    total,
    progreso,
    otorgar,
    comprarSobre,
    abrirSobre,
    cambiarRepes,
    ofertas,
    intercambiar,
    vitrina,
    exhibicion,
    seleccion,
    acciones,
    selfTest,
    col
  };
  GM.register && GM.register('coleccionables', GM.coleccionables);
})();
