/* Editor de construcción de la casa (punto 50), al estilo de Big Ambitions. Se apoya en casa3d.js (GM.casa._i) y añade:
   - muros, puertas y ventanas dibujados sobre la cuadrícula de 0,5 m (state.sede.casas[id].muros), derribo, suelo distinto en cada habitación y techo;
   - deshacer y rehacer (Ctrl+Z, Ctrl+Y), copiar (C), alinear a la pared, vender (Supr);
   - vistas de perspectiva, planta (cenital) y corte (muros a altura completa), y techo opcional;
   - catálogo con búsqueda, orden y filtro de precio, estilos, y una pestaña Biblioteca con los objetos de la biblioteca (tools/ingesta.js) que haya en el juego;
   - presupuesto y pedidos con entrega (cada compra tarda de 0 a 3 días según el precio y mientras tanto se ve la caja), con cancelación;
   - guardar, aplicar, exportar e importar diseños (texto CASA1:..., comprimido) para compartirlos.
   Todo cuesta dinero (hogar.dinero) y es reversible con Deshacer mientras no salgas del modo. Prueba: node tools/casa_editor_prueba.js, t_casa_editor.js. */
(function () {
  const U = GM.util,
    T = THREE;
  const I = () => GM.casa._i,
    PRE = { muro: 0.05, puerta: 0.2, ventana: 0.15 };
  let E = null,
    BIB = null;
  const nuevoE = st => ({
    pila: [],
    rehacer: [],
    planta: 'ambas',
    vista: 'persp',
    techo: false,
    herr: null,
    ini: null,
    prev: null,
    filtro: { q: '', orden: '', barato: false },
    d0: I().dinero(st)
  });
  const ajustar = v => Math.round(v * 2) / 2;
  const euros = k => Math.round(k * 1000).toLocaleString('es-ES') + ' €';
  const toast = t => {
    if (GM.ui && GM.ui.toast) GM.ui.toast(t);
  };
  // ---------- Datos de la vivienda ----------
  function dat(st) {
    const D = I().datos(st);
    D.muros = D.muros || [];
    D.sueloHab = D.sueloHab || {};
    return D;
  }
  const estado = st => {
    const D = dat(st);
    return JSON.stringify({ m: D.muebles, mu: D.muros, p: D.pared, s: D.suelo, l: D.luz, sh: D.sueloHab });
  };
  // ---------- Deshacer y rehacer ----------
  function snap(S) {
    if (!E) return;
    E.pila.push({ e: estado(S.st), d: I().dinero(S.st) });
    if (E.pila.length > 80) E.pila.shift();
    E.rehacer.length = 0;
  }
  async function restaurar(S, M, a) {
    const st = S.st,
      D = dat(st),
      o = JSON.parse(a.e);
    D.muebles = o.m;
    D.muros = o.mu;
    D.pared = o.p;
    D.suelo = o.s;
    D.luz = o.l;
    D.sueloHab = o.sh || {};
    I().gastar(st, I().dinero(st) - a.d);
    await reconstruir(S, M);
  }
  async function deshacer(S, M) {
    if (!E || !E.pila.length) return toast('No hay nada que deshacer');
    const a = E.pila.pop();
    E.rehacer.push({ e: estado(S.st), d: I().dinero(S.st) });
    await restaurar(S, M, a);
    toast('Deshecho');
  }
  async function rehacer(S, M) {
    if (!E || !E.rehacer.length) return toast('No hay nada que rehacer');
    const a = E.rehacer.pop();
    E.pila.push({ e: estado(S.st), d: I().dinero(S.st) });
    await restaurar(S, M, a);
    toast('Rehecho');
  }
  async function reconstruir(S, M) {
    const st = S.st,
      D = dat(st),
      K = S.casaMats,
      i = I();
    i.deseleccionar(S);
    S.mueblesCasa.forEach(o => S.mundo.remove(o));
    S.mueblesCasa = [];
    await Promise.all(D.muebles.map(x => i.colocarObj(S, M, x)));
    K.muro.color.set(i.colorPared(st, D.pared || 0));
    i.ponerSuelo(S, M, D.suelo || 0);
    K.luz.color.setHex(i.LUCES[D.luz || 0][1]);
    if (K.luz2) K.luz2.color.setHex(i.LUCES[D.luz || 0][1]);
    dibujarMuros(S, M);
    aplicarSuelos(S, M);
    vista(S, E.vista, true);
    aplicarPlanta(S);
    i.rehacerRejilla(S, st);
    i.pintarCatalogo(S, M);
  }
  // ---------- Plantas: la de abajo y la de arriba se editan por separado ----------
  const tienePlantaAlta = S => !!(S.casaPlano && S.casaPlano.habs.some(r => r.arriba));
  function plantaDe(S, x, z) {
    const r = S.casaPlano && S.casaPlano.habs.find(q => x >= q.x0 - 0.01 && x <= q.x1 + 0.01 && z >= q.z0 - 0.01 && z <= q.z1 + 0.01);
    return r && r.arriba ? 'arriba' : 'baja';
  }
  const plantaOk = (S, x, z) => !E || E.planta === 'ambas' || plantaDe(S, x, z) === E.planta;
  function aplicarPlanta(S) {
    if (!E) return;
    const st = S.st,
      D = dat(st),
      f = E.planta,
      W = S.mundo;
    if (S.edVelo) {
      W.remove(S.edVelo);
      S.edVelo = null;
    }
    (S.mueblesCasa || []).forEach(o => {
      o.visible = f === 'ambas' || plantaDe(S, o.position.x, o.position.z) === f;
    });
    if (S.edMuros)
      S.edMuros.traverse(o => {
        if (o.userData && o.userData.edMuro !== undefined) {
          const m = D.muros[o.userData.edMuro];
          o.visible = !m || f === 'ambas' || (m.p || 'baja') === f;
        }
      });
    if (f !== 'ambas') {
      const g = (S.edVelo = new T.Group());
      S.casaPlano.habs.forEach(r => {
        if ((r.arriba ? 'arriba' : 'baja') === f) return;
        const p = new T.Mesh(new T.BoxGeometry(r.x1 - r.x0, 0.06, r.z1 - r.z0), new T.MeshBasicMaterial({ color: 0x1d232a, transparent: true, opacity: 0.72 }));
        p.position.set((r.x0 + r.x1) / 2, 1.3, (r.z0 + r.z1) / 2);
        g.add(p);
      });
      W.add(g);
    }
  }
  // ---------- Muros, puertas y ventanas de usuario ----------
  function dibujarMuros(S, M) {
    const st = S.st,
      D = dat(st),
      K = S.casaMats,
      W = S.mundo;
    if (S.edMuros) {
      S.edMuros.traverse(o => {
        if (o.userData && o.userData.malla) {
          const k = S.casaMurosMallas.indexOf(o);
          if (k >= 0) S.casaMurosMallas.splice(k, 1);
        }
      });
      W.remove(S.edMuros);
    }
    if (S.casaMurosEd)
      S.casaMurosEd.forEach(r => {
        const k = S.casaMuros.indexOf(r);
        if (k >= 0) S.casaMuros.splice(k, 1);
      });
    S.casaMurosEd = [];
    const g = (S.edMuros = new T.Group()),
      alto = K.alto,
      mV = new T.MeshStandardMaterial({ color: 0xbfe0f0, transparent: true, opacity: 0.4, roughness: 0.05 }),
      mMarco = new T.MeshStandardMaterial({ color: 0x5b4636, roughness: 0.7 });
    W.add(g);
    const caja = (w, h, d, x, y, z, mat, remate, id) => {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true;
      m.userData = { malla: true, hh: alto, y0: y, remate: !!remate, edMuro: id };
      g.add(m);
      S.casaMurosMallas.push(m);
      return m;
    };
    const col = (xa, za, xb, zb) => {
      const r = [Math.min(xa, xb) - 0.1, Math.min(za, zb) - 0.1, Math.max(xa, xb) + 0.1, Math.max(za, zb) + 0.1];
      S.casaMuros.push(r);
      S.casaMurosEd.push(r);
    };
    D.muros.forEach((m, id) => {
      const [xa, za] = m.a,
        [xb, zb] = m.b,
        horiz = za === zb,
        L = Math.abs(horiz ? xb - xa : zb - za),
        cx = (xa + xb) / 2,
        cz = (za + zb) / 2,
        w = horiz ? L : 0.2,
        d = horiz ? 0.2 : L;
      if (m.t === 'puerta') {
        for (const s of [-1, 1])
          caja(horiz ? 0.08 : 0.2, alto, horiz ? 0.2 : 0.08, horiz ? cx + s * (L / 2 - 0.04) : cx, alto / 2, horiz ? cz : cz + s * (L / 2 - 0.04), mMarco, false, id);
        caja(horiz ? L : 0.2, 0.08, horiz ? 0.2 : L, cx, alto - 0.04, cz, mMarco, false, id);
        const hoja = new T.Mesh(new T.BoxGeometry(L - 0.12, alto - 0.12, 0.04), new T.MeshStandardMaterial({ color: 0xd9c7a8, roughness: 0.6 }));
        hoja.position.set(horiz ? xa + 0.06 : cx, (alto - 0.12) / 2, horiz ? cz : za + 0.06);
        hoja.userData = { malla: true, hh: alto, y0: (alto - 0.12) / 2, edMuro: id };
        hoja.castShadow = true;
        const piv = new T.Group();
        piv.position.set(horiz ? xa : cx, 0, horiz ? cz : za);
        hoja.position.set(horiz ? (L - 0.12) / 2 + 0.06 : 0, (alto - 0.12) / 2, horiz ? 0 : (L - 0.12) / 2 + 0.06);
        piv.add(hoja);
        piv.rotation.y = horiz ? -1.1 : 1.1;
        g.add(piv);
        S.casaMurosMallas.push(hoja);
        return;
      }
      if (m.t === 'ventana') {
        caja(w, 0.45, d, cx, 0.225, cz, K.muro, false, id);
        caja(w, alto - 0.45, horiz ? 0.06 : 0.06, cx, 0.45 + (alto - 0.45) / 2, cz, mV, false, id);
        caja(horiz ? w : 0.22, 0.04, horiz ? 0.22 : d, cx, alto + 0.02, cz, K.remate, true, id);
        col(xa, za, xb, zb);
        return;
      }
      caja(w, alto, d, cx, alto / 2, cz, K.muro, false, id);
      caja(horiz ? w : 0.21, 0.04, horiz ? 0.21 : d, cx, alto + 0.02, cz, K.remate, true, id);
      col(xa, za, xb, zb);
    });
    vista(S, E ? E.vista : 'persp', true);
    aplicarPlanta(S);
  }
  const dentro = (S, x, z) => {
    const [x0, z0, x1, z1] = S.casaRect;
    return x >= x0 - 0.01 && x <= x1 + 0.01 && z >= z0 - 0.01 && z <= z1 + 0.01;
  };
  function estorba(S, st, a, b) {
    const r = [Math.min(a[0], b[0]) - 0.1, Math.min(a[1], b[1]) - 0.1, Math.max(a[0], b[0]) + 0.1, Math.max(a[1], b[1]) + 0.1],
      i = I();
    return dat(st).muebles.some(o => {
      if (o.x === null || o.x === undefined || (i.CAT[o.m] && i.CAT[o.m].pisable)) return false;
      const h = i.huella(o.m, o.x, o.z, o.r);
      return !(h[2] <= r[0] || h[0] >= r[2] || h[3] <= r[1] || h[1] >= r[3]);
    });
  }
  function cobrar(st, k) {
    const i = I();
    if (i.dinero(st) < k) {
      toast('No te llega el dinero');
      return false;
    }
    i.gastar(st, k);
    return true;
  }
  function herramienta(S, M, h) {
    E.herr = E.herr === h ? null : h;
    E.ini = null;
    quitarPrev(S);
    I().cancelarElegido(S);
    I().deseleccionar(S);
    I().pintarCatalogo(S, M);
    if (E.herr)
      toast(
        {
          muro: 'Toca el punto de inicio del muro y luego el final',
          puerta: 'Toca un muro que hayas levantado para abrir una puerta',
          ventana: 'Toca un muro que hayas levantado para abrir una ventana',
          derribar: 'Toca un muro, puerta o ventana para quitarlo'
        }[E.herr]
      );
  }
  function quitarPrev(S) {
    if (E && E.prev) {
      S.mundo.remove(E.prev);
      E.prev = null;
    }
  }
  function nuevoMuro(S, M, a, b, t) {
    const st = S.st,
      D = dat(st),
      L = Math.abs(a[0] === b[0] ? b[1] - a[1] : b[0] - a[0]);
    if (L < 0.5) return false;
    if (!dentro(S, a[0], a[1]) || !dentro(S, b[0], b[1])) {
      toast('Fuera de la casa');
      return false;
    }
    if (estorba(S, st, a, b)) {
      toast('Hay un mueble en medio');
      return false;
    }
    if (!cobrar(st, PRE.muro * L)) return false;
    snap(S);
    D.muros.push({ a, b, t: t || 'muro', p: plantaDe(S, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2) });
    dibujarMuros(S, M);
    I().rehacerRejilla(S, st);
    return true;
  }
  function elemento(S, M, p, t) {
    const st = S.st,
      D = dat(st),
      ancho = t === 'puerta' ? 1 : 1.5;
    let mejor = -1,
      dm = 0.6;
    D.muros.forEach((m, k) => {
      if (m.t !== 'muro') return;
      const horiz = m.a[1] === m.a[1] && m.a[1] === m.b[1],
        lo = horiz ? Math.min(m.a[0], m.b[0]) : Math.min(m.a[1], m.b[1]),
        hi = horiz ? Math.max(m.a[0], m.b[0]) : Math.max(m.a[1], m.b[1]),
        c = horiz ? p.x : p.z,
        perp = horiz ? Math.abs(p.z - m.a[1]) : Math.abs(p.x - m.a[0]);
      if (perp < dm && c > lo && c < hi && hi - lo >= ancho + 0.0) {
        dm = perp;
        mejor = k;
      }
    });
    if (mejor < 0) {
      toast('Toca un muro que hayas levantado');
      return false;
    }
    const m = D.muros[mejor],
      horiz = m.a[1] === m.b[1],
      lo = horiz ? Math.min(m.a[0], m.b[0]) : Math.min(m.a[1], m.b[1]),
      hi = horiz ? Math.max(m.a[0], m.b[0]) : Math.max(m.a[1], m.b[1]);
    let c = ajustar(horiz ? p.x : p.z);
    c = Math.max(lo + ancho / 2, Math.min(hi - ancho / 2, c));
    c = Math.round(c * 2) / 2;
    const a0 = c - ancho / 2,
      a1 = c + ancho / 2;
    if (a0 < lo - 0.01 || a1 > hi + 0.01) {
      toast('No cabe en ese muro');
      return false;
    }
    if (!cobrar(st, PRE[t])) return false;
    snap(S);
    const mk = (u0, u1, tt) => (horiz ? { a: [u0, m.a[1]], b: [u1, m.a[1]], t: tt, p: m.p } : { a: [m.a[0], u0], b: [m.a[0], u1], t: tt, p: m.p }),
      nuevos = [];
    if (a0 - lo > 0.01) nuevos.push(mk(lo, a0, 'muro'));
    nuevos.push(mk(a0, a1, t));
    if (hi - a1 > 0.01) nuevos.push(mk(a1, hi, 'muro'));
    D.muros.splice(mejor, 1, ...nuevos);
    dibujarMuros(S, M);
    I().rehacerRejilla(S, st);
    toast((t === 'puerta' ? 'Puerta' : 'Ventana') + ' abierta (' + euros(PRE[t]) + ')');
    return true;
  }
  function derribar(S, M, ray) {
    const st = S.st,
      D = dat(st),
      hit = S.edMuros
        ? ray.intersectObjects(S.edMuros.children, true).find(h => {
            let o = h.object;
            while (o && !(o.userData && o.userData.edMuro !== undefined)) o = o.parent;
            return !!o;
          })
        : null;
    if (!hit) {
      toast('Toca un muro, una puerta o una ventana');
      return false;
    }
    let o = hit.object;
    while (o && !(o.userData && o.userData.edMuro !== undefined)) o = o.parent;
    const id = o.userData.edMuro,
      m = D.muros[id];
    if (!m) return false;
    snap(S);
    const L = Math.abs(m.a[0] === m.b[0] ? m.b[1] - m.a[1] : m.b[0] - m.a[0]);
    if (m.t === 'muro') {
      D.muros.splice(id, 1);
      I().gastar(st, (-PRE.muro * L) / 2);
      toast('Muro derribado (+' + euros((PRE.muro * L) / 2) + ')');
    } else {
      I().gastar(st, -PRE[m.t] / 2);
      m.t = 'muro';
      toast((m.t === 'puerta' ? 'Puerta' : 'Hueco') + ' tapiado');
    }
    dibujarMuros(S, M);
    I().rehacerRejilla(S, st);
    return true;
  }
  // ---------- Suelo por habitación ----------
  function aplicarSuelos(S, M) {
    const st = S.st,
      D = dat(st),
      W = S.mundo;
    if (S.edSuelos) W.remove(S.edSuelos);
    const g = (S.edSuelos = new T.Group());
    W.add(g);
    Object.keys(D.sueloHab).forEach(id => {
      const r = S.casaPlano.habs.concat(S.casaPlano.ext).find(q => q.id === id && !q.arriba) || S.casaPlano.habs.concat(S.casaPlano.ext).find(q => q.id === id);
      if (!r) return;
      const k = D.sueloHab[id],
        t = M.textura('suelo-casa-' + k, 256, I().dibSuelo(k)),
        mt = new T.MeshStandardMaterial({ roughness: k === 3 ? 0.25 : 0.7 });
      if (t) {
        mt.map = t.clone();
        mt.map.needsUpdate = true;
        mt.map.repeat.set((r.x1 - r.x0) / 3, (r.z1 - r.z0) / 3);
      } else mt.color.set(0xb98e63);
      if (I().sueloReal) I().sueloReal(mt, k);
      const p = new T.Mesh(new T.PlaneGeometry(r.x1 - r.x0 - 0.1, r.z1 - r.z0 - 0.1).rotateX(-Math.PI / 2), mt);
      p.position.set((r.x0 + r.x1) / 2, 0.007, (r.z0 + r.z1) / 2);
      p.receiveShadow = true;
      g.add(p);
    });
  }
  function suelaHab(S, M, id, k) {
    const st = S.st,
      r = S.casaPlano.habs.concat(S.casaPlano.ext).find(q => q.id === id);
    if (!r) return;
    const area = (r.x1 - r.x0) * (r.z1 - r.z0),
      precio = Math.max(0.05, (I().SUELOS[k][2] * area) / (S.casaMats.w * S.casaMats.d));
    if (!cobrar(st, precio)) return;
    snap(S);
    dat(st).sueloHab[id] = k;
    aplicarSuelos(S, M);
    toast('Suelo de ' + (r.nombre || id).toLowerCase() + ': ' + I().SUELOS[k][0].toLowerCase() + ' (' + euros(precio) + ')');
    I().pintarCatalogo(S, M);
  }
  // ---------- Vistas y techo ----------
  function vista(S, tipo, silencio) {
    if (!E) return;
    E.vista = tipo;
    const alto = tipo === 'corte' ? 2.5 : S.casaMats.alto;
    (S.casaMurosMallas || []).forEach(m => {
      const u = m.userData || {};
      if (!u.hh) return;
      const k = alto / u.hh;
      if (u.remate) m.position.y = alto + 0.02;
      else {
        m.scale.y = k;
        m.position.y = (u.y0 || u.hh / 2) * k;
      }
    });
    S.inc = tipo === 'planta' ? 1.53 : tipo === 'corte' ? 0.5 : 1.22;
    if (!silencio) {
      const [x0, z0, x1, z1] = S.casaRect;
      S.foco.set((x0 + x1) / 2, 0, (z0 + z1) / 2 + (tipo === 'planta' ? 0 : (z1 - z0) * 0.32));
    }
    techo(S, E.techo);
    if (!silencio) I().pintarCatalogo(S, GM.sede.motor());
  }
  function techo(S, on) {
    if (S.edTecho) {
      S.mundo.remove(S.edTecho);
      S.edTecho = null;
    }
    if (!on) return;
    const g = (S.edTecho = new T.Group()),
      alto = E && E.vista === 'corte' ? 2.55 : 2.3;
    S.casaPlano.habs.forEach(r => {
      if (r.arriba) return;
      const p = new T.Mesh(
        new T.BoxGeometry(r.x1 - r.x0 + 0.1, 0.08, r.z1 - r.z0 + 0.1),
        new T.MeshStandardMaterial({ color: 0xe8e2d6, transparent: true, opacity: 0.92, roughness: 0.9 })
      );
      p.position.set((r.x0 + r.x1) / 2, alto, (r.z0 + r.z1) / 2);
      g.add(p);
    });
    S.mundo.add(g);
  }
  // ---------- Entregas ----------
  const diasEntrega = precio => (precio < 0.1 ? 0 : precio < 0.4 ? 1 : precio < 1 ? 2 : 3);
  const entrega = (st, c) => {
    const d = diasEntrega(c.precio);
    return d ? U.addDays(st.fecha, d) : undefined;
  };
  const pendiente = (st, x) => !!(x.llega && x.llega > st.fecha);
  function caja3(S, x) {
    const t = I().TAMS[x.m] || [1, 1],
      g = new T.Group(),
      b = new T.Mesh(new T.BoxGeometry(Math.min(t[0], 2.2) * 0.92, 0.7, Math.min(t[1], 2.2) * 0.92), new T.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.85 }));
    b.position.y = 0.35;
    b.castShadow = true;
    g.add(b);
    const c = new T.Mesh(new T.BoxGeometry(0.1, 0.012, Math.min(t[1], 2.2) * 0.94), new T.MeshStandardMaterial({ color: 0xe6d3a8 }));
    c.position.y = 0.706;
    g.add(c);
    g.tam = { x: t[0] / GM.sedePlano.ESCALA_MUEBLES, z: t[1] / GM.sedePlano.ESCALA_MUEBLES };
    return g;
  }
  function cancelarPedido(S, M, x) {
    const st = S.st,
      c = I().CAT[x.m] || { precio: 0 };
    snap(S);
    const D = dat(st),
      k = D.muebles.indexOf(x);
    if (k < 0) return;
    D.muebles.splice(k, 1);
    I().gastar(st, -c.precio);
    const o = S.mueblesCasa.find(q => q.userData.muebleCasa === x);
    if (o) {
      S.mundo.remove(o);
      S.mueblesCasa.splice(S.mueblesCasa.indexOf(o), 1);
    }
    I().rehacerRejilla(S, st);
    toast('Pedido cancelado (+' + euros(c.precio) + ')');
    I().pintarCatalogo(S, M);
  }
  GM.bus.on('dia:avanzado', () => {
    const st = GM.state;
    if (!st || !st.sede || !st.sede.casas) return;
    Object.keys(st.sede.casas).forEach(id =>
      (st.sede.casas[id].muebles || []).forEach(x => {
        if (x.llega && x.llega <= st.fecha) {
          const c = GM.casa._i.CAT[x.m];
          delete x.llega;
          if (c && GM.noticia) GM.noticia(st, 'Te entregan en casa: ' + c.nombre.toLowerCase() + '.');
        }
      })
    );
  });
  // ---------- Copiar y alinear ----------
  function copiar(S, M) {
    const C = I().getC();
    if (!C || !C.sel) return toast('Selecciona un mueble para copiarlo');
    const x = C.sel.userData.muebleCasa,
      r = x.r;
    I().deseleccionar(S);
    I()
      .elegir(S, M, x.m)
      .then(() => {
        C.r = r;
        I().pintarCatalogo(S, M);
      });
  }
  function alinear(S, M) {
    const C = I().getC();
    if (!C || !C.sel) return;
    const o = C.sel,
      x = o.userData.muebleCasa,
      st = S.st,
      i = I();
    let mejor = null;
    for (const [dx, dz] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ]) {
      let n = 0,
        px = x.x,
        pz = x.z;
      while (n < 40 && i.cabe(S, st, x.m, px + dx * 0.5, pz + dz * 0.5, x.r, x)) {
        px += dx * 0.5;
        pz += dz * 0.5;
        n++;
      }
      if (n > 0 && (!mejor || n < mejor.n)) mejor = { n, px, pz };
    }
    if (!mejor) return toast('Ya está pegado a la pared');
    snap(S);
    x.x = mejor.px;
    x.z = mejor.pz;
    o.position.set(x.x, 0, x.z);
    i.rehacerRejilla(S, st);
    toast('Alineado a la pared');
  }
  // ---------- Biblioteca de objetos ----------
  const PRECIO_CAT = {
    asiento: [0.12, 2],
    mueble: [0.3, 2],
    mesa: [0.25, 1],
    iluminación: [0.1, 2],
    decoración: [0.06, 1],
    electrodoméstico: [0.3, 1],
    planta: [0.03, 1],
    baño: [0.25, 1],
    estantería: [0.3, 1]
  };
  const cacheLib = {};
  async function cargaLib(id) {
    if (cacheLib[id]) return cacheLib[id];
    const g = await GM.sede.modeloReal(id, 'modelos/objetos/' + id + '.glb'),
      e = GM.sedePlano.ESCALA_MUEBLES,
      box = new T.Box3().setFromObject(g),
      sz = box.getSize(new T.Vector3()),
      c = box.getCenter(new T.Vector3()),
      k = Math.min(1, 3.2 / Math.max(sz.y, 0.01), 4.5 / Math.max(sz.x, sz.z, 0.01));
    return (cacheLib[id] = { g, box, sz, c, k, e });
  }
  async function tamLib(id) {
    const L = await cargaLib(id);
    return [Math.max(0.3, L.sz.x * L.k), Math.max(0.3, L.sz.z * L.k)];
  }
  async function cargarLib(S, M, id) {
    const L = await cargaLib(id),
      g = new T.Group(),
      c = L.g.clone(true);
    c.position.set(-L.c.x, -L.box.min.y, -L.c.z);
    const w = new T.Group();
    w.add(c);
    w.scale.setScalar(L.k);
    g.add(w);
    w.position.set(-L.c.x * (L.k - 1), 0, -L.c.z * (L.k - 1));
    g.tam = { x: (L.sz.x * L.k) / L.e, z: (L.sz.z * L.k) / L.e };
    return g;
  }
  async function biblioteca(S, M) {
    if (BIB) return BIB;
    BIB = [];
    try {
      const j = await (await fetch('modelos/objetos/catalogo.json')).json(),
        ok = await Promise.all(
          (j.objetos || []).filter(o => o.origen === 'polyhaven' && (o.incluido || (o.pesado && (location.protocol === 'app:' || window.GM_PESADOS))) && PRECIO_CAT[o.categoria])
        );
      ok.forEach(o => {
        const [p, cf] = PRECIO_CAT[o.categoria],
          m = 'lib:' + o.id,
          extra = /sofa|bed|cabinet|shelf|table/i.test(o.id) ? 2.5 : 1,
          nom = o.id
            .replace(/_\d+$/, '')
            .replace(/_/g, ' ')
            .replace(/^./, s => s.toUpperCase());
        I().CAT[m] = { m, nombre: nom, precio: Math.round(p * extra * 100) / 100, confort: cf, cat: 'Biblioteca', pisable: false };
        I().CATALOGO.push([m, nom, Math.round(p * extra * 100) / 100, cf, 'Biblioteca']);
        BIB.push(m);
      });
    } catch (e) {
      /* sin biblioteca */
    }
    return BIB;
  }
  // ---------- Diseños ----------
  const disenos = st => {
    st.sede = st.sede || { charlas: {} };
    return (st.sede.disenos = st.sede.disenos || {});
  };
  function empaquetar(S, nombre) {
    const D = dat(S.st);
    return {
      v: 1,
      n: nombre,
      tipo: S.casaId,
      m: D.muebles.filter(x => x.x !== null && x.x !== undefined).map(x => [x.m, x.x, x.z, x.r]),
      mu: D.muros,
      p: D.pared || 0,
      s: D.suelo || 0,
      l: D.luz || 0,
      sh: D.sueloHab
    };
  }
  const codigo = o =>
    typeof LZString !== 'undefined' ? 'CASA1:' + LZString.compressToBase64(JSON.stringify(o)) : 'CASA0:' + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  function leerCodigo(t) {
    t = String(t || '').trim();
    try {
      const j = t.startsWith('CASA1:') ? LZString.decompressFromBase64(t.slice(6)) : decodeURIComponent(escape(atob(t.slice(6))));
      const o = JSON.parse(j);
      return o && o.v === 1 && Array.isArray(o.m) ? o : null;
    } catch (e) {
      return null;
    }
  }
  async function aplicarDiseno(S, M, o) {
    const st = S.st,
      D = dat(st),
      i = I();
    await Promise.all(o.m.map(([m]) => i.medir(M, m).catch(() => null)));
    const previo = { e: estado(st), d: i.dinero(st) },
      antes = D.muebles,
      antesMu = D.muros,
      refund = antes.reduce((s, x) => s + (i.CAT[x.m] || { precio: 0 }).precio / 2, 0);
    const muros = (o.mu || []).filter(m => m && m.a && m.b && dentro(S, m.a[0], m.a[1]) && dentro(S, m.b[0], m.b[1])),
      nuevos = [];
    let coste = 0,
      fuera = 0,
      sinCat = 0;
    muros.forEach(m => {
      coste += m.t === 'muro' ? PRE.muro * Math.abs(m.a[0] === m.b[0] ? m.b[1] - m.a[1] : m.b[0] - m.a[0]) : PRE[m.t] || 0;
    });
    D.muebles = nuevos;
    i.rehacerRejilla(S, st);
    o.m.forEach(([m, x, z, r]) => {
      const c = i.CAT[m];
      if (!c) {
        sinCat++;
        return;
      }
      const q = { m, x, z, r };
      nuevos.push(q);
      if (!i.cabe(S, st, m, x, z, r, q)) {
        nuevos.pop();
        fuera++;
        return;
      }
      coste += c.precio;
      const l = entrega(st, c);
      if (l) q.llega = l;
    });
    const total = coste - refund;
    if (i.dinero(st) < total) {
      D.muebles = antes;
      D.muros = antesMu;
      i.rehacerRejilla(S, st);
      toast('Te faltan ' + euros(total - i.dinero(st)) + ' para este diseño');
      return false;
    }
    E.pila.push(previo);
    E.rehacer.length = 0;
    D.muros = muros;
    D.pared = o.p;
    D.suelo = o.s;
    D.luz = o.l;
    D.sueloHab = o.sh || {};
    i.gastar(st, total);
    await reconstruir(S, M);
    toast(
      'Diseño aplicado (' +
        (total >= 0 ? euros(total) : '+' + euros(-total)) +
        (fuera ? ', ' + fuera + ' no caben' : '') +
        (sinCat ? ', ' + sinCat + ' piezas no disponibles' : '') +
        ')'
    );
    return true;
  }
  // ---------- Interfaz ----------
  function barra(S, M) {
    const h = GM.h,
      st = S.st,
      i = I(),
      neto = E.d0 - i.dinero(st),
      pend = dat(st).muebles.filter(x => pendiente(st, x)).length;
    return h(
      'div',
      { class: 'ce-barra' },
      h('button', { class: 'btn peq', disabled: !E.pila.length, title: 'Ctrl+Z', onclick: () => deshacer(S, M) }, 'Deshacer'),
      h('button', { class: 'btn peq', disabled: !E.rehacer.length, title: 'Ctrl+Y', onclick: () => rehacer(S, M) }, 'Rehacer'),
      ['persp', 'planta', 'corte'].map(v =>
        h('button', { class: 'btn peq' + (E.vista === v ? '' : ' btn-sec'), onclick: () => vista(S, v) }, { persp: 'Perspectiva', planta: 'Planta', corte: 'Corte' }[v])
      ),
      tienePlantaAlta(S)
        ? [
            ['ambas', 'Las dos plantas'],
            ['baja', 'Planta baja'],
            ['arriba', 'Planta de arriba']
          ].map(([k, t]) =>
            h(
              'button',
              {
                class: 'btn peq' + (E.planta === k ? '' : ' btn-sec'),
                onclick: () => {
                  E.planta = k;
                  aplicarPlanta(S);
                  I().pintarCatalogo(S, M);
                }
              },
              t
            )
          )
        : null,
      h(
        'button',
        {
          class: 'btn peq' + (E.techo ? '' : ' btn-sec'),
          onclick: () => {
            E.techo = !E.techo;
            techo(S, E.techo);
            i.pintarCatalogo(S, M);
          }
        },
        'Techo'
      ),
      h(
        'button',
        {
          class: 'btn peq btn-sec',
          onclick: () => {
            const el = S.raiz.querySelector('.casa-catalogo');
            if (el) el.classList.toggle('cc-min');
          }
        },
        'Ver la casa'
      ),
      h('span', { class: 'ce-pres' }, 'Obra: ' + (neto >= 0 ? '' : '+') + euros(Math.abs(neto)) + (pend ? ', ' + pend + ' pedido' + (pend > 1 ? 's' : '') + ' en camino' : ''))
    );
  }
  function filtros(S, M) {
    const h = GM.h,
      F = E.filtro,
      i = I();
    return h(
      'div',
      { class: 'ce-filtros' },
      h('input', {
        type: 'search',
        placeholder: 'Buscar mueble',
        value: F.q,
        oninput: e => {
          F.q = e.target.value;
          clearTimeout(F.t);
          F.t = setTimeout(() => {
            i.pintarCatalogo(S, M);
            const n = S.raiz.querySelector('.ce-filtros input');
            if (n) {
              n.focus();
              n.setSelectionRange(F.q.length, F.q.length);
            }
          }, 250);
        }
      }),
      h(
        'select',
        {
          onchange: e => {
            F.orden = e.target.value;
            i.pintarCatalogo(S, M);
          }
        },
        [
          ['', 'Orden del catálogo'],
          ['precio', 'Más baratos'],
          ['confort', 'Más confort'],
          ['nombre', 'Por nombre']
        ].map(([v, t]) => h('option', { value: v, selected: F.orden === v }, t))
      ),
      h(
        'label',
        { class: 'ce-chk' },
        h('input', {
          type: 'checkbox',
          checked: F.barato,
          onchange: e => {
            F.barato = e.target.checked;
            i.pintarCatalogo(S, M);
          }
        }),
        ' Solo lo que puedo pagar'
      )
    );
  }
  function filtrar(lista, st) {
    const F = E.filtro,
      q = (F.q || '').toLowerCase().trim();
    let L = lista.filter(c => (!q || c[1].toLowerCase().indexOf(q) >= 0) && (!F.barato || I().dinero(st) >= c[2]));
    if (F.orden === 'precio') L = L.slice().sort((a, b) => a[2] - b[2]);
    else if (F.orden === 'confort') L = L.slice().sort((a, b) => b[3] - a[3]);
    else if (F.orden === 'nombre') L = L.slice().sort((a, b) => a[1].localeCompare(b[1], 'es'));
    return L;
  }
  function cuerpo(cat, S, M) {
    const h = GM.h,
      st = S.st,
      i = I(),
      D = dat(st);
    if (cat === 'Obra') {
      return h(
        'div',
        { class: 'cc-reformas' },
        h(
          'div',
          { class: 'cc-reforma' },
          h('b', null, 'Herramientas de obra'),
          h(
            'div',
            { class: 'cc-items' },
            [
              ['muro', 'Muro', euros(PRE.muro) + ' el metro'],
              ['puerta', 'Puerta', euros(PRE.puerta)],
              ['ventana', 'Ventana', euros(PRE.ventana)],
              ['derribar', 'Derribar', 'Devuelve la mitad']
            ].map(([k, t, d]) => h('button', { class: 'cc-item' + (E.herr === k ? ' on' : ''), onclick: () => herramienta(S, M, k) }, h('b', null, t), h('span', null, d)))
          )
        ),
        h(
          'div',
          { class: 'cc-reforma' },
          h('b', null, 'Piezas de obra'),
          h(
            'div',
            { class: 'cc-items' },
            i.CATALOGO.filter(c => c[4] === 'Obra').map(c =>
              h(
                'button',
                {
                  class: 'cc-item' + (i.getC().elegido === c[0] ? ' on' : ''),
                  disabled: i.dinero(st) < c[2],
                  onclick: () => {
                    E.herr = null;
                    i.elegir(S, M, c[0]);
                  }
                },
                h('b', null, c[1]),
                h('span', null, euros(c[2]))
              )
            )
          )
        ),
        h('p', { class: 'muted' }, 'Los muros se levantan sobre la cuadrícula y no pueden cruzar muebles. Las puertas y las ventanas se abren en un muro que hayas levantado.')
      );
    }
    if (cat === 'Biblioteca') {
      const L = i.CATALOGO.filter(c => c[4] === 'Biblioteca');
      return h(
        'div',
        null,
        filtros(S, M),
        L.length
          ? h(
              'div',
              { class: 'cc-items' },
              filtrar(L, st).map(c =>
                h(
                  'button',
                  {
                    class: 'cc-item' + (i.getC().elegido === c[0] ? ' on' : ''),
                    disabled: i.dinero(st) < c[2],
                    onclick: () => {
                      E.herr = null;
                      i.elegir(S, M, c[0]);
                    }
                  },
                  h('b', null, c[1]),
                  h('span', null, euros(c[2])),
                  h('i', null, '+' + c[3] + ' confort')
                )
              )
            )
          : h('p', { class: 'muted' }, 'Aún no hay objetos de la biblioteca en esta versión (en la de escritorio hay unos 30 muebles realistas más).')
      );
    }
    if (cat === 'Pedidos') {
      const ped = D.muebles.filter(x => pendiente(st, x)),
        inst = D.muebles.filter(x => !pendiente(st, x)),
        valor = inst.reduce((s, x) => s + (i.CAT[x.m] || { precio: 0 }).precio, 0);
      return h(
        'div',
        { class: 'cc-reformas' },
        h(
          'p',
          null,
          'Instalado: ' + inst.length + ' piezas por ' + euros(valor) + ', confort ' + i.confort(st) + '. Gastado en esta obra: ' + euros(Math.max(0, E.d0 - i.dinero(st))) + '.'
        ),
        ped.length
          ? ped.map(x => {
              const c = i.CAT[x.m] || { nombre: x.m, precio: 0 };
              return h(
                'div',
                { class: 'cc-reforma ce-pedido' },
                h('b', null, c.nombre),
                h('span', null, 'Llega el ' + U.fecha(x.llega) + ', ' + euros(c.precio)),
                h('button', { class: 'btn btn-sec peq', onclick: () => cancelarPedido(S, M, x) }, 'Cancelar el pedido')
              );
            })
          : h('p', { class: 'muted' }, 'No tienes pedidos en camino. Lo barato llega al momento; lo caro tarda hasta tres días y mientras tanto verás la caja en su sitio.')
      );
    }
    if (cat === 'Diseños') {
      const DS = disenos(st),
        nom = h('input', { type: 'text', placeholder: 'Nombre del diseño', maxlength: 28 }),
        imp = h('textarea', { placeholder: 'Pega aquí un código CASA1:...', rows: 2 });
      return h(
        'div',
        { class: 'cc-reformas' },
        h(
          'div',
          { class: 'cc-reforma' },
          h('b', null, 'Guardar este diseño'),
          h(
            'div',
            { class: 'ce-fila' },
            nom,
            h(
              'button',
              {
                class: 'btn peq',
                onclick: () => {
                  const n = (nom.value || '').trim() || 'Diseño ' + (Object.keys(DS).length + 1);
                  DS[n] = empaquetar(S, n);
                  toast('Diseño guardado: ' + n);
                  i.pintarCatalogo(S, M);
                }
              },
              'Guardar'
            )
          )
        ),
        Object.keys(DS).map(n =>
          h(
            'div',
            { class: 'cc-reforma ce-pedido' },
            h('b', null, n),
            h('span', null, DS[n].m.length + ' piezas, ' + (DS[n].mu || []).length + ' muros'),
            h(
              'div',
              { class: 'ce-fila' },
              h('button', { class: 'btn peq', onclick: () => aplicarDiseno(S, M, DS[n]) }, 'Aplicar'),
              h(
                'button',
                {
                  class: 'btn btn-sec peq',
                  onclick: () => {
                    const c = codigo(DS[n]);
                    if (navigator.clipboard)
                      navigator.clipboard.writeText(c).then(
                        () => toast('Código copiado, ya puedes compartirlo'),
                        () => toast(c.slice(0, 60) + '...')
                      );
                    else toast(c.slice(0, 60) + '...');
                  }
                },
                'Copiar código'
              ),
              h(
                'button',
                {
                  class: 'btn btn-sec peq',
                  onclick: () => {
                    delete DS[n];
                    i.pintarCatalogo(S, M);
                  }
                },
                'Borrar'
              )
            )
          )
        ),
        h(
          'div',
          { class: 'cc-reforma' },
          h('b', null, 'Importar un diseño'),
          imp,
          h(
            'button',
            {
              class: 'btn peq',
              onclick: () => {
                const o = leerCodigo(imp.value);
                if (!o) return toast('Ese código no es válido');
                DS[o.n || 'Importado'] = o;
                toast('Diseño importado: ' + (o.n || 'Importado'));
                i.pintarCatalogo(S, M);
              }
            },
            'Importar'
          )
        )
      );
    }
    return null;
  }
  function seleccion(S, M) {
    const h = GM.h;
    return [h('button', { class: 'btn btn-sec peq', onclick: () => copiar(S, M) }, 'Copiar'), h('button', { class: 'btn btn-sec peq', onclick: () => alinear(S, M) }, 'Alinear')];
  }
  function reformasExtra(S, M) {
    const h = GM.h,
      st = S.st,
      D = dat(st),
      hab = S.casaPlano.habs.concat(S.casaPlano.ext).filter(r => !r.arriba || true);
    return h(
      'div',
      { class: 'cc-reforma' },
      h('b', null, 'Suelo de una habitación'),
      hab.map(r =>
        h(
          'div',
          { class: 'ce-fila' },
          h('span', { class: 'ce-hab' }, r.nombre + (r.arriba ? ' (arriba)' : '')),
          h(
            'select',
            {
              onchange: e => {
                if (e.target.value !== '') suelaHab(S, M, r.id, +e.target.value);
              }
            },
            [h('option', { value: '' }, D.sueloHab[r.id] !== undefined ? I().SUELOS[D.sueloHab[r.id]][0] : 'Como el resto')].concat(
              I().SUELOS.map((s, k) =>
                h('option', { value: String(k) }, s[0] + ' (' + euros(Math.max(0.05, (s[2] * ((r.x1 - r.x0) * (r.z1 - r.z0))) / (S.casaMats.w * S.casaMats.d))) + ')')
              )
            )
          )
        )
      )
    );
  }
  // ---------- Eventos del modo ----------
  function toque(S, M, p, ray) {
    if (!E || !E.herr) return false;
    const st = S.st,
      x = ajustar(p.x),
      z = ajustar(p.z);
    if (E.herr === 'muro') {
      if (!E.ini) {
        E.ini = [x, z];
        toast('Ahora el punto final');
      } else {
        const ini = E.ini,
          dx = x - ini[0],
          dz = z - ini[1],
          b = Math.abs(dx) >= Math.abs(dz) ? [x, ini[1]] : [ini[0], z];
        if (nuevoMuro(S, M, ini, b)) E.ini = b;
        quitarPrev(S);
      }
      I().pintarCatalogo(S, M);
      return true;
    }
    if (E.herr === 'puerta' || E.herr === 'ventana') {
      elemento(S, M, p, E.herr);
      I().pintarCatalogo(S, M);
      return true;
    }
    if (E.herr === 'derribar') {
      derribar(S, M, ray);
      I().pintarCatalogo(S, M);
      return true;
    }
    return false;
  }
  function hover(S, p) {
    if (!E || !E.herr) return false;
    if (E.herr === 'muro' && E.ini) {
      const x = ajustar(p.x),
        z = ajustar(p.z),
        ini = E.ini,
        dx = x - ini[0],
        dz = z - ini[1],
        b = Math.abs(dx) >= Math.abs(dz) ? [x, ini[1]] : [ini[0], z],
        L = Math.max(0.1, Math.abs(b[0] - ini[0]) + Math.abs(b[1] - ini[1])),
        horiz = b[1] === ini[1];
      if (!E.prev) {
        E.prev = new T.Mesh(new T.BoxGeometry(1, 0.3, 1), new T.MeshBasicMaterial({ color: 0x4cd07d, transparent: true, opacity: 0.6, depthWrite: false }));
        S.mundo.add(E.prev);
      }
      E.prev.scale.set(horiz ? L : 0.2, 1, horiz ? 0.2 : L);
      E.prev.position.set((b[0] + ini[0]) / 2, 0.15, (b[1] + ini[1]) / 2);
      E.prev.material.color.setHex(dentro(S, b[0], b[1]) && !estorba(S, S.st, ini, b) ? 0x4cd07d : 0xe0533d);
    }
    return true;
  }
  function tecla(S, e) {
    if (!E) return false;
    const k = e.key.toLowerCase(),
      M = GM.sede.motor();
    if ((e.ctrlKey || e.metaKey) && k === 'z' && !e.shiftKey) {
      deshacer(S, M);
      return true;
    }
    if ((e.ctrlKey || e.metaKey) && (k === 'y' || (k === 'z' && e.shiftKey))) {
      rehacer(S, M);
      return true;
    }
    if (!e.ctrlKey && !e.metaKey && k === 'c') {
      copiar(S, M);
      return true;
    }
    if (k === 'delete' && I().getC() && I().getC().sel) {
      I().venderSel(S, M);
      return true;
    }
    return false;
  }
  function escapar(S) {
    if (!E) return false;
    if (E.herr) {
      E.herr = null;
      E.ini = null;
      quitarPrev(S);
      I().pintarCatalogo(S, GM.sede.motor());
      return true;
    }
    return false;
  }
  async function alConstruir(S, M, st) {
    S.casaMurosMallas = S.casaMurosMallas || [];
    S.casaMurosEd = [];
    dibujarMuros(S, M);
    aplicarSuelos(S, M);
    I().rehacerRejilla(S, st);
  }
  function entrar(S, M) {
    E = nuevoE(S.st);
    biblioteca(S, M).then(l => {
      if (S.construccion && l.length) I().pintarCatalogo(S, M);
    });
  }
  function salir(S, M) {
    if (!E) return;
    quitarPrev(S);
    if (E.vista !== 'persp') {
      E.vista = 'persp';
      vista(S, 'persp', true);
    }
    techo(S, false);
    E = null;
  }
  function soltarHerr() {
    if (E) {
      E.herr = null;
      E.ini = null;
    }
  }
  function selfTest() {
    return (
      diasEntrega(0.05) === 0 &&
      diasEntrega(0.3) === 1 &&
      diasEntrega(0.7) === 2 &&
      diasEntrega(2) === 3 &&
      leerCodigo('basura') === null &&
      typeof codigo({ v: 1, m: [] }) === 'string'
    );
  }
  GM.casaEditor = {
    plantaOk,
    plantaDe,
    aplicarPlanta,
    alConstruir,
    entrar,
    salir,
    snap,
    barra,
    filtros,
    filtrar,
    cuerpo,
    seleccion,
    reformasExtra,
    toque,
    hover,
    tecla,
    escape: escapar,
    soltarHerr,
    entrega,
    pendiente,
    caja: caja3,
    cargarLib,
    tamLib,
    deshacer,
    rehacer,
    vista,
    copiar,
    alinear,
    codigo,
    leerCodigo,
    empaquetar,
    aplicarDiseno,
    nuevoMuro,
    estado: () => E,
    selfTest
  };
  GM.register && GM.register('casaEditor', { selfTest });
})();
