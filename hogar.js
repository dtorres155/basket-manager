/* HOGAR (GM.mods.hogar) — todos los modos
   Tu casa y su mobiliario. El «nivel de vida» (0-5) depende de la fase y el éxito: en la carrera, de la liga y la fama; como entrenador, de la reputación y la liga;
   como director técnico o presidente, de la reputación del club. El nivel desbloquea tipos de vivienda y muebles. Cada casa tiene habitaciones con casillas
   de suelo (3x5) y de pared (5); un mueble ocupa 1 o 2 casillas. Los muebles dan efectos pequeños (ánimo, recuperación, progresión, confianza, fama).
   Expone: nivel, etiquetaNivel, dinero, casaActual, tipos, mudarse, habitaciones, catalogo, colocar, quitar, colorear, efectos, trofeos, selfTest.
   Escribe state.hogar = { ahorros, casa, muebles:{ [casaId]: [{ hab, slot, item, color }] } }. */
(function () {
  const U = GM.util, C = st => st.carrera;
  const NIVELES = ['Empezando', 'Estable', 'Acomodado', 'Con éxito', 'De élite', 'Superestrella'];
  const TIPOS = {
    residencia: { nombre: 'Habitación de la residencia', req: 0, base: 0, lujo: 0, hab: ['estudio'] },
    estudio: { nombre: 'Estudio humilde', req: 0, base: 90, lujo: 0, hab: ['estudio'] },
    piso: { nombre: 'Piso pequeño', req: 1, base: 180, lujo: 1, hab: ['salon', 'dormitorio'] },
    reformado: { nombre: 'Piso reformado', req: 2, base: 320, lujo: 2, hab: ['salon', 'dormitorio', 'cocina'] },
    atico: { nombre: 'Ático con terraza', req: 3, base: 650, lujo: 3, hab: ['salon', 'dormitorio', 'cocina', 'terraza'] },
    casa: { nombre: 'Casa con jardín', req: 4, base: 900, lujo: 4, hab: ['salon', 'cocina', 'dormitorio', 'despacho', 'jardin'] },
    mansion: { nombre: 'Mansión con piscina', req: 5, base: 2600, lujo: 5, hab: ['salon', 'cocina', 'dormitorio', 'despacho', 'gimnasio', 'cine', 'piscina'] }
  };
  const V = (id, nombre, est, plano) => ({ id, nombre, est, plano });
  const VARIANTES = {
    residencia: [V('cuarto', 'Habitación de la residencia', { pared: 0xc9c3b0, suelo: 0x9a8f7a, ext: 'residencia' }, [['estudio', 6, 4.2, 0]])],
    estudio: [V('loft', 'Loft industrial', { pared: 0xa9604a, suelo: 0x7d8085, ladrillo: true, ext: 'loft' }, [['estudio', 7.2, 5.6, 0]]), V('buhardilla', 'Buhardilla con vigas', { pared: 0xe3dccb, suelo: 0x9b7a52, viga: true, ext: 'buhardilla' }, [['estudio', 6, 4.2, 0]])],
    piso: [V('clasico', 'Piso clásico', { pared: 0xe3d9bf, suelo: 0xa8895e, ext: 'bloque' }, [['salon', 6, 4.2, 0], ['dormitorio', 4.8, 4.2, 0]]), V('diafano', 'Piso diáfano moderno', { pared: 0xf0f0ee, suelo: 0xb8b2a6, ext: 'bloque-moderno' }, [['salon', 8.4, 5.6, 0], ['dormitorio', 4.8, 4.2, 0]])],
    reformado: [V('barrio', 'Reformado de barrio', { pared: 0xeae4d2, suelo: 0xb88a58, ext: 'bloque' }, [['salon', 6, 4.2, 0], ['cocina', 3.6, 4.2, 0], ['dormitorio', 4.8, 4.2, 0]]), V('minimal', 'Reformado minimalista', { pared: 0xf6f6f4, suelo: 0xcfcac0, ext: 'bloque-moderno' }, [['salon', 7.2, 5.6, 0], ['cocina', 4.8, 4.2, 0], ['dormitorio', 4.8, 4.2, 0]])],
    atico: [V('moderno', 'Ático moderno', { pared: 0xf2efe8, suelo: 0xc9955b, ext: 'moderno' }, [['salon', 7.2, 5.6, 0], ['cocina', 4.8, 4.2, 0], ['dormitorio', 4.8, 4.2, 1], ['terraza', 7.2, 4.2, 1]]), V('rustico', 'Ático rústico', { pared: 0xe8dcc0, suelo: 0x8a6a46, viga: true, ext: 'rustico' }, [['salon', 6.0, 5.6, 0], ['cocina', 4.8, 4.2, 0], ['dormitorio', 6, 4.2, 1], ['terraza', 7.2, 4.2, 1]])],
    casa: [V('mediterranea', 'Casa mediterránea', { pared: 0xf6f1e6, suelo: 0xc98d5a, ext: 'mediterranea' }, [['salon', 7.2, 5.6, 0], ['cocina', 4.8, 4.2, 0], ['dormitorio', 6, 4.2, 1], ['despacho', 3.6, 4.2, 1], ['jardin', 9.6, 5.6, 0]]), V('piedra', 'Casa de piedra', { pared: 0xcfc7b4, suelo: 0x7d6b55, viga: true, ext: 'piedra' }, [['salon', 6, 5.6, 0], ['cocina', 6, 4.2, 0], ['dormitorio', 4.8, 4.2, 1], ['despacho', 4.8, 4.2, 1], ['jardin', 8.4, 5.6, 0]]), V('moderna', 'Casa moderna', { pared: 0xf4f4f2, suelo: 0xd6d1c6, ext: 'moderna' }, [['salon', 9.6, 5.6, 0], ['cocina', 4.8, 4.2, 0], ['dormitorio', 7.2, 4.2, 1], ['despacho', 3.6, 4.2, 1], ['jardin', 8.4, 4.2, 0]])],
    mansion: [V('clasica', 'Mansión clásica', { pared: 0xe9e0cc, suelo: 0xe4e0d8, panel: true, ext: 'clasica' }, [['salon', 9.6, 5.6, 0], ['cocina', 6, 4.2, 0], ['dormitorio', 7.2, 5.6, 1], ['despacho', 4.8, 4.2, 1], ['gimnasio', 6, 4.2, 1], ['cine', 7.2, 4.2, 0], ['piscina', 9.6, 5.6, 0]]), V('moderna', 'Mansión moderna', { pared: 0xf3f5f7, suelo: 0x2c2c31, ext: 'mansion-moderna' }, [['salon', 10.8, 5.6, 0], ['cocina', 6, 5.6, 0], ['dormitorio', 8.4, 5.6, 1], ['despacho', 4.8, 4.2, 1], ['gimnasio', 7.2, 4.2, 1], ['cine', 6, 4.2, 1], ['piscina', 8.4, 5.6, 0]]), V('villa', 'Villa mediterránea', { pared: 0xfaf4e8, suelo: 0xd2a679, panel: false, ext: 'villa' }, [['salon', 8.4, 5.6, 0], ['cocina', 6, 4.2, 0], ['dormitorio', 7.2, 4.2, 1], ['despacho', 4.8, 4.2, 1], ['gimnasio', 4.8, 4.2, 1], ['cine', 6, 4.2, 0], ['piscina', 10.8, 5.6, 0]])]
  };
  const varianteDe = (tipo, clave) => VARIANTES[tipo][U.hash(String(clave) + tipo) % VARIANTES[tipo].length];
  const HABS = { estudio: 'Estudio', salon: 'Salón', dormitorio: 'Dormitorio', cocina: 'Cocina y comedor', despacho: 'Despacho', gimnasio: 'Gimnasio', cine: 'Sala de cine', terraza: 'Terraza', jardin: 'Jardín', piscina: 'Piscina' };
  const EXT = { terraza: 1, jardin: 1, piscina: 1 };
  const I = (id, n, u, niv, p, tam, ef, donde) => ({ id, n, u, niv, p, tam, ef: ef || {}, donde: donde || 'suelo' });
  const ITEMS = [
    I('cama1', 'Cama sencilla', ['dormitorio', 'estudio'], 0, 0.3, 1, { moral: 0.3 }), I('cama2', 'Cama doble', ['dormitorio', 'estudio'], 1, 0.9, 2, { moral: 0.5, recup: 1 }), I('cama3', 'Cama king con dosel', ['dormitorio'], 4, 4, 2, { moral: 0.8, recup: 2 }),
    I('sofa1', 'Sofá de segunda mano', ['salon', 'estudio'], 0, 0.2, 2, { moral: 0.2 }), I('sofa2', 'Sofá cómodo', ['salon', 'estudio', 'cine'], 1, 0.9, 2, { moral: 0.4 }), I('sofa3', 'Sofá de diseño', ['salon', 'cine'], 3, 3, 2, { moral: 0.6, fama: 0.1 }),
    I('butaca', 'Butaca', ['salon', 'despacho', 'dormitorio', 'cine'], 1, 0.35, 1, { moral: 0.1 }),
    I('tv1', 'Televisor pequeño', ['salon', 'estudio', 'dormitorio'], 0, 0.2, 1, { moral: 0.2 }), I('tv2', 'Televisión grande con consola', ['salon', 'estudio', 'cine'], 2, 1.2, 2, { moral: 0.5 }), I('tv3', 'Pantalla gigante de cine', ['cine', 'salon'], 4, 6, 2, { moral: 0.9 }),
    I('cocina1', 'Cocina básica', ['cocina', 'estudio'], 0, 0.4, 2, {}), I('mesa1', 'Mesa plegable', ['cocina', 'salon', 'estudio'], 0, 0.1, 1, {}), I('mesa2', 'Mesa de comedor', ['cocina', 'salon'], 1, 0.8, 2, { moral: 0.2 }),
    I('nevera', 'Nevera grande', ['cocina'], 2, 0.8, 1, { recup: 0.5 }), I('isla', 'Isla de cocina de diseño', ['cocina'], 3, 4, 2, { moral: 0.4, fama: 0.1 }),
    I('escritorio', 'Escritorio con ordenador', ['despacho', 'estudio', 'salon', 'dormitorio'], 1, 0.6, 1, { xp: 0.01, conf: 0.1 }), I('pizarra', 'Pizarra táctica', ['despacho', 'salon', 'estudio'], 1, 0.4, 1, { xp: 0.02, conf: 0.4 }, 'pared'),
    I('video', 'Sala de análisis de vídeo', ['despacho', 'cine'], 2, 2.2, 2, { xp: 0.04, conf: 0.6 }),
    I('pesas', 'Banco y pesas', ['gimnasio', 'estudio', 'jardin'], 1, 0.7, 1, { recup: 1 }), I('gym', 'Máquinas de gimnasio', ['gimnasio', 'salon'], 2, 2.5, 2, { recup: 3 }), I('cancha', 'Mini cancha interior', ['gimnasio'], 4, 12, 2, { xp: 0.06, moral: 0.3 }),
    I('trofeos', 'Vitrina de trofeos', ['salon', 'despacho', 'cine', 'estudio'], 1, 0.9, 1, { fama: 0.15 }, 'pared'), I('camisetas', 'Camisetas enmarcadas', ['salon', 'despacho', 'estudio'], 2, 1.4, 1, { fama: 0.1, moral: 0.2 }, 'pared'),
    I('planta', 'Planta', '*', 0, 0.05, 1, { moral: 0.1 }), I('alfombra', 'Alfombra', '*', 1, 0.3, 2, { moral: 0.1 }), I('cuadro', 'Cuadro', '*', 1, 0.2, 1, { moral: 0.1 }, 'pared'), I('lampara', 'Lámpara de pie', '*', 1, 0.2, 1, { moral: 0.1 }),
    I('arte', 'Obra de arte original', ['salon', 'despacho', 'cine'], 4, 8, 1, { fama: 0.3, moral: 0.2 }, 'pared'), I('musica', 'Equipo de música', ['salon', 'cine', 'gimnasio', 'jardin'], 2, 1, 1, { moral: 0.3 }),
    I('piano', 'Piano de cola', ['salon'], 3, 6, 2, { moral: 0.5, fama: 0.2 }), I('pecera', 'Acuario', ['salon', 'despacho', 'cine'], 3, 2, 1, { moral: 0.4 }), I('bar', 'Barra de bar', ['salon', 'cine', 'terraza', 'jardin'], 4, 5, 2, { moral: 0.4, fama: 0.2 }),
    I('billar', 'Mesa de billar', ['salon', 'cine'], 3, 3, 2, { moral: 0.5 }), I('perro', 'Perro', '*', 1, 0.3, 1, { moral: 0.6 }),
    I('barbacoa', 'Barbacoa', ['terraza', 'jardin'], 2, 0.8, 1, { moral: 0.3 }), I('tumbona', 'Tumbonas', ['terraza', 'jardin', 'piscina'], 2, 0.6, 2, { moral: 0.3 }), I('jacuzzi', 'Jacuzzi', ['terraza', 'jardin', 'piscina', 'gimnasio'], 5, 15, 2, { recup: 4, moral: 0.6 }),
    I('mesaext', 'Mesa de exterior', ['terraza', 'jardin'], 1, 0.4, 1, {}), I('arbol', 'Árbol frutal', ['jardin'], 2, 0.5, 1, { moral: 0.2 })
  ];
  // xp: antes 0,12 al mes (unos +1,4 de nivel al año solo por los muebles, casi como entrenar); ahora ~+0,6
  const TOPES = { moral: 3, recup: 8, xp: 0.05, conf: 1.2, fama: 0.6 };
  // Gastos de vida al mes (miles de euros) según el nivel de vida, en los modos de gestión: antes los ahorros solo subían
  const GASTOS_VIDA = [0.6, 1.0, 1.8, 3.0, 5.0, 8.0];
  const hog = st => (st.hogar = st.hogar || { ahorros: null, casa: null, muebles: {} });
  const club = st => st.equipos[st.clubId];
  const modoCar = st => st.modo === 'carrera' && !!st.carrera;

  function nivel(st) {
    if (modoCar(st)) {
      const c = C(st); if (c.fase === 'ncaa') return 0; if (c.fase === 'retirado') return Math.min(5, Math.floor(c.fama / 25));
      const lg = GM.mods.carrera.liga(st), N = lg ? GM.mods.carrera.NIVEL[lg] : 1;
      return U.clamp(Math.floor((N - 1) + c.fama / 35), 0, 5);
    }
    const rep = st.modo === 'entrenador' && st.entrenador ? st.entrenador.reputacion : club(st).reputacion, lg = GM.mods.mercado.ligaDe(st, st.clubId);
    return U.clamp(Math.floor(rep / 22) + (lg === 'NBA' || lg === 'EUROLIGA' ? 1 : 0), 0, 5);
  }
  const etiquetaNivel = st => NIVELES[nivel(st)];
  function dinero(st) { if (modoCar(st)) return C(st).dinero; const h = hog(st); if (h.ahorros === null) h.ahorros = [20, 45, 110, 260, 600, 1200][nivel(st)]; return h.ahorros; }
  function gastar(st, k) { if (modoCar(st)) C(st).dinero -= k; else hog(st).ahorros -= k; }
  function ingresar(st, k) { gastar(st, -k); }

  function casaActual(st) {
    if (modoCar(st)) {
      const c = C(st), a = c.vivienda && c.vivienda.actual;
      if (c.fase === 'ncaa' && c.etapa === 'cantera') return { id: 'residencia-cantera', tipo: 'residencia', nombre: 'Residencia de la cantera', lujo: 0, modo: 'residencia', barrioNombre: 'Cerca del pabellón', ciudad: club(st).ciudad, cond: 0.5, variante: VARIANTES.residencia[0] };
      if (c.fase === 'ncaa') return { id: 'residencia', tipo: 'residencia', nombre: TIPOS.residencia.nombre, lujo: 0, modo: 'residencia', barrioNombre: 'Campus', ciudad: 'Universidad', cond: 0.5, variante: VARIANTES.residencia[0] };
      if (a) { const v = varianteDe(a.tipo, a.barrioNombre); return { id: a.id, tipo: a.tipo, nombre: v.nombre, lujo: TIPOS[a.tipo].lujo, modo: a.modo, barrioNombre: a.barrioNombre, ciudad: a.ciudad, cond: condicion(st, a.barrio, a.tipo), variante: v }; }
      return { id: 'club-' + st.clubId, tipo: 'estudio', nombre: 'Alojamiento del club', lujo: 0, modo: 'club', barrioNombre: 'Cerca del pabellón', ciudad: club(st).ciudad, cond: 0.4, variante: VARIANTES.estudio[1] };
    }
    const h = hog(st);
    if (!h.casa) { const t = nivel(st) >= 2 ? 'reformado' : 'piso'; h.casa = { id: 'h-' + t, tipo: t, modo: 'alquiler', barrio: 1, barrioNombre: barrios(st)[1] ? barrios(st)[1].nombre : 'Centro', ciudad: club(st).ciudad, precio: TIPOS[t].base }; }
    const a = h.casa, v = varianteDe(a.tipo, a.barrioNombre); return { id: a.id, tipo: a.tipo, nombre: v.nombre, lujo: TIPOS[a.tipo].lujo, modo: a.modo, barrioNombre: a.barrioNombre, ciudad: a.ciudad, cond: condicion(st, a.barrio, a.tipo), variante: v };
  }
  function barrios(st) { try { return GM.mods.carrera && GM.mods.carrera.barriosVivienda ? GM.mods.carrera.barriosVivienda(st) : []; } catch (e) { return []; } }
  function condicion(st, barrio, tipo) { const b = barrios(st)[barrio]; return U.clamp(0.35 + (b ? b.prestigio / 10 : 0.2) + TIPOS[tipo].lujo * 0.08, 0, 1); }
  function tipos(st, bi) {
    const n = nivel(st);
    return Object.keys(TIPOS).filter(k => k !== 'residencia').map(k => { const t = TIPOS[k]; return Object.assign({ id: k }, t, { variante: varianteDe(k, (barrios(st)[bi] || {}).nombre), disponible: n >= t.req, motivo: n < t.req ? 'Requiere nivel de vida ' + t.req + ' (' + NIVELES[t.req] + ')' : null }); });
  }
  function mudarse(st, barrio, tipo, modo) {
    const t = TIPOS[tipo]; if (!t) return { ok: false, motivo: 'Vivienda desconocida.' };
    if (nivel(st) < t.req) return { ok: false, motivo: 'Requiere nivel de vida ' + t.req + ' (' + NIVELES[t.req] + ').' };
    if (modoCar(st)) return GM.mods.carrera.comprarVivienda(st, barrio, tipo, modo);
    const b = barrios(st)[barrio], precio = Math.round(t.base * (b ? b.precio : 1)), alq = Math.max(1, Math.round(precio * 0.005 * 10) / 10), coste = modo === 'compra' ? precio : modo === 'hipoteca' ? Math.round(precio * 0.2) : alq * 2;
    if (dinero(st) < coste) return { ok: false, motivo: 'Te faltan ' + Math.round(coste - dinero(st)) + ' mil € de ahorros.' };
    gastar(st, coste); const h = hog(st), viejo = h.casa;
    h.casa = { id: 'h-' + tipo + '-' + barrio + '-' + st.fecha, tipo, modo, barrio, barrioNombre: b ? b.nombre : 'Centro', ciudad: club(st).ciudad, precio, alquiler: alq, cuota: alq };
    if (viejo && h.muebles[viejo.id] && modo === 'compra') { /* los muebles se quedan en la casa anterior */ }
    GM.noticia(st, 'Nuevo hogar: ' + t.nombre.toLowerCase() + ' en ' + h.casa.barrioNombre + '.');
    return { ok: true };
  }
  function habitaciones(tipo, v) { v = v || VARIANTES[tipo][0]; return v.plano.map(r => ({ id: r[0], nombre: HABS[r[0]], ext: !!EXT[r[0]], w: r[1], d: r[2], planta: r[3], cols: Math.max(3, Math.round(r[1] / 1.2)), rows: Math.max(2, Math.round(r[2] / 1.4)) })); }
  function dims(st, hab) { const c = casaActual(st), r = habitaciones(c.tipo, c.variante).find(x => x.id === hab); return r || { cols: 5, rows: 3, w: 6.2, d: 4.6 }; }
  const lista = (st, casaId) => (hog(st).muebles[casaId] = hog(st).muebles[casaId] || []);
  function ocupadas(st, casaId, hab) { const o = {}; lista(st, casaId).filter(m => m.hab === hab).forEach(m => { const it = ITEMS.find(x => x.id === m.item); o[m.slot] = m; if (it.tam === 2 && m.slot[0] === 'f') { const p = m.slot.split('-'); o['f-' + p[1] + '-' + (+p[2] + 1)] = m; } if (it.tam === 2 && m.slot[0] === 'w') { const p = m.slot.split('-'); o['w-' + (+p[1] + 1)] = m; } }); return o; }
  function catalogo(st, hab, slot) {
    const n = nivel(st), casa = casaActual(st), oc = ocupadas(st, casa.id, hab), pared = slot && slot[0] === 'w';
    return ITEMS.filter(it => (it.u === '*' || it.u.indexOf(hab) >= 0) && (it.donde === 'pared') === !!pared).map(it => {
      let motivo = null; const p = slot ? slot.split('-') : null;
      if (n < it.niv) motivo = 'Requiere nivel de vida ' + it.niv + ' (' + NIVELES[it.niv] + ')';
      else if (dinero(st) < it.p) motivo = 'Te faltan ' + Math.round((it.p - dinero(st)) * 10) / 10 + ' mil €';
      else if (slot && it.tam === 2) { const dm = dims(st, hab), sig = slot[0] === 'f' ? 'f-' + p[1] + '-' + (+p[2] + 1) : 'w-' + (+p[1] + 1); if ((slot[0] === 'f' ? +p[2] >= dm.cols - 1 : +p[1] >= dm.cols - 1) || oc[sig]) motivo = 'No cabe en esa casilla'; }
      if (hab === 'estudio' && n < 1 && ['sofa3', 'tv3', 'cama3', 'piano', 'arte', 'isla'].indexOf(it.id) >= 0) motivo = motivo || 'No encaja en una habitación pequeña';
      return Object.assign({}, it, { disponible: !motivo, motivo });
    });
  }
  function colocar(st, hab, slot, itemId, color) {
    const casa = casaActual(st), it = ITEMS.find(x => x.id === itemId); if (!it) return { ok: false, motivo: 'Mueble desconocido.' };
    const cat = catalogo(st, hab, slot).find(x => x.id === itemId); if (!cat) return { ok: false, motivo: 'Ese mueble no va ahí.' }; if (!cat.disponible) return { ok: false, motivo: cat.motivo };
    const dm = dims(st, hab), pp = slot.split('-'); if (slot[0] === 'f' ? (+pp[1] >= dm.rows || +pp[2] >= dm.cols) : +pp[1] >= dm.cols) return { ok: false, motivo: 'Esa casilla no existe.' };
    const oc = ocupadas(st, casa.id, hab); if (oc[slot]) return { ok: false, motivo: 'La casilla está ocupada.' };
    gastar(st, it.p); lista(st, casa.id).push({ hab, slot, item: itemId, color: color || 0 });
    return { ok: true };
  }
  function quitar(st, hab, slot) {
    const casa = casaActual(st), arr = lista(st, casa.id), m = ocupadas(st, casa.id, hab)[slot]; if (!m) return { ok: false, motivo: 'No hay nada ahí.' };
    const it = ITEMS.find(x => x.id === m.item); ingresar(st, Math.round(it.p * 0.5 * 10) / 10); arr.splice(arr.indexOf(m), 1); return { ok: true };
  }
  function colorear(st, hab, slot) { const casa = casaActual(st), m = ocupadas(st, casa.id, hab)[slot]; if (!m) return { ok: false, motivo: 'No hay nada ahí.' }; m.color = (m.color + 1) % 4; return { ok: true, color: m.color }; }
  const USOS = {
    cama1: ['Echarte una siesta', { fat: -18, moral: 1 }], cama2: ['Echarte una siesta', { fat: -22, moral: 1.5 }], cama3: ['Descansar a cuerpo de rey', { fat: -30, moral: 2.5 }],
    sofa1: ['Tirarte en el sofá', { moral: 1 }], sofa2: ['Descansar en el sofá', { moral: 1.5, fat: -5 }], sofa3: ['Desconectar en el sofá de diseño', { moral: 2.5, fat: -8 }],
    tv1: ['Ver un partido en la tele', { moral: 1, xp: 0.02 }], tv2: ['Ver baloncesto en la tele grande', { moral: 1.5, xp: 0.04 }], tv3: ['Ver una final en la pantalla de cine', { moral: 3, xp: 0.05 }],
    cocina1: ['Cocinar para ti', { moral: 1, coste: 0.05 }], isla: ['Cocinar con calma', { moral: 2.5, coste: 0.1 }], escritorio: ['Estudiar y planificar', { xp: 0.05, conf: 0.6 }],
    pizarra: ['Preparar una jugada', { xp: 0.06, conf: 1 }], video: ['Analizar vídeo', { xp: 0.1, conf: 1.5 }], pesas: ['Entrenar en casa', { fat: 4, xp: 0.06 }], gym: ['Sesión de gimnasio en casa', { fat: 5, xp: 0.09 }], cancha: ['Tirar a canasta', { xp: 0.12, moral: 1.5 }],
    piano: ['Tocar el piano', { moral: 2.5 }], pecera: ['Mirar los peces', { moral: 1 }], perro: ['Sacar al perro', { moral: 2, fat: -3 }], billar: ['Echar una partida de billar', { moral: 2 }], bar: ['Preparar una copa', { moral: 1.5, coste: 0.1 }],
    jacuzzi: ['Darte un baño', { fat: -28, moral: 3 }], barbacoa: ['Hacer una barbacoa', { moral: 2.5, coste: 0.3 }], musica: ['Poner tu música', { moral: 1.5 }], trofeos: ['Mirar tus trofeos', { moral: 2, fama: 0.2, req: 'trofeos' }], camisetas: ['Repasar tus camisetas', { moral: 1.5 }], tumbona: ['Tumbarte al sol', { fat: -12, moral: 1.5 }], arte: ['Contemplar tu obra de arte', { moral: 1.5, fama: 0.1 }]
  };
  function usoDe(itemId) { const u = USOS[itemId]; return u ? { texto: u[0], ef: u[1] } : null; }
  function energiaCasa(st) { const h = hog(st); if (h.energia === undefined || h.semana !== st.fecha.slice(0, 7) + U.weekday(st.fecha)) { /* se rellena los lunes */ } return h.energia === undefined ? 3 : h.energia; }
  function usar(st, hab, slot) {
    const h = hog(st), casa = casaActual(st), m = ocupadas(st, casa.id, hab)[slot]; if (!m) return { ok: false, motivo: 'No hay nada ahí.' };
    const u = USOS[m.item]; if (!u) return { ok: false, motivo: 'Eso es solo decoración.' };
    if (energiaCasa(st) < 1) return { ok: false, motivo: 'Hoy ya has hecho bastante en casa. Los lunes se recupera la energía.' };
    h.cd = h.cd || {}; const k = casa.id + '|' + hab + '|' + slot;
    if (h.cd[k] && U.diffDays(h.cd[k], st.fecha) < 3) return { ok: false, motivo: 'Lo has usado hace poco. Prueba en ' + (3 - U.diffDays(h.cd[k], st.fecha)) + ' días.' };
    const ef = u[1]; if (ef.req === 'trofeos' && trofeos(st) < 1) return { ok: false, motivo: 'Todavía no tienes trofeos que mirar.' };
    if (ef.coste && dinero(st) < ef.coste) return { ok: false, motivo: 'No tienes ahorros para eso.' };
    if (ef.coste) gastar(st, ef.coste); h.energia = energiaCasa(st) - 1; h.cd[k] = st.fecha;
    const out = [];
    if (modoCar(st)) { const c = C(st), p = st.jugadores.yo; if (ef.moral) { c.moral = U.clamp(c.moral + ef.moral, 0, 100); out.push('ánimo +' + ef.moral); } if (ef.fat) { p.estado.fatiga = U.clamp(p.estado.fatiga + ef.fat, 0, 100); out.push(ef.fat < 0 ? 'te recuperas' : 'te cansas un poco'); } if (ef.xp) { p.xp = (p.xp || 0) + ef.xp; out.push('progresión'); } if (ef.fama) c.fama = c.fama + ef.fama; }
    else { const pl = club(st).plantilla.map(i => st.jugadores[i]).filter(Boolean); if (ef.moral) { pl.forEach(p => { p.estado.moral = U.clamp(p.estado.moral + ef.moral * 0.4, 20, 100); }); out.push('el vestuario lo nota'); } if (ef.xp) { pl.slice().sort((a, b) => a.edad - b.edad).slice(0, 3).forEach(p => { p.xp = (p.xp || 0) + ef.xp * 0.5; }); out.push('los jóvenes progresan'); } if (ef.conf && st.modo === 'entrenador' && st.entrenador && st.entrenador.fase === 'activo') { st.entrenador.confianza = U.clamp(st.entrenador.confianza + ef.conf, 0, 100); out.push('confianza +' + ef.conf); } if (ef.fat < 0) pl.forEach(p => { p.estado.fatiga = Math.max(0, p.estado.fatiga + ef.fat * 0.2); }); if (ef.fama && st.modo === 'presidente' && st.legado) st.legado.alma = U.clamp(st.legado.alma + ef.fama, 0, 100); }
    return { ok: true, texto: u[0], efectos: out };
  }
  function muebles(st) { return lista(st, casaActual(st).id).slice(); }
  function efectos(st) {
    const tot = { moral: 0, recup: 0, xp: 0, conf: 0, fama: 0 };
    muebles(st).forEach(m => { const it = ITEMS.find(x => x.id === m.item); for (const k in it.ef) tot[k] += it.ef[k]; });
    for (const k in tot) tot[k] = Math.min(tot[k], TOPES[k]);
    return tot;
  }
  function trofeos(st) {
    if (modoCar(st)) return C(st).historial.filter(h => h.titulo).length;
    return st.historial.filter(h => h.campeon === st.clubId).length;
  }
  function salarioAnual(st) {
    if (st.modo === 'entrenador' && st.entrenador) return 40 + (GM.mods.entrenador.estado ? 60 : 0) * 0 + nivel(st) * 55 + st.entrenador.reputacion * 1.2;
    if (st.modo === 'presidente') return 20 + club(st).reputacion * 1.4;
    return 40 + nivel(st) * 55 + club(st).reputacion * 1.2;
  }
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !st.equipos) return;
    if (U.weekday(st.fecha) === 1 && st.hogar) st.hogar.energia = 3;
    if (st.fecha.slice(8) !== '01') return;
    if (modoCar(st)) { if (C(st).fase === 'retirado') return; } else { ingresar(st, Math.round(salarioAnual(st) / 12 * 10) / 10); gastar(st, GASTOS_VIDA[nivel(st)] || 1); }
    const casa = casaActual(st), e = efectos(st);
    if (!modoCar(st) && (casa.modo === 'alquiler' || casa.modo === 'hipoteca') && hog(st).casa) gastar(st, hog(st).casa.cuota || hog(st).casa.alquiler || Math.max(1, Math.round(hog(st).casa.precio * 0.005 * 10) / 10));
    if (modoCar(st)) {
      const c = C(st), p = st.jugadores.yo; c.moral = U.clamp(c.moral + e.moral * 0.5, 0, 100); c.fama = U.clamp(c.fama + e.fama, 0, 100);
      p.estado.fatiga = Math.max(0, p.estado.fatiga - e.recup * 0.3); p.xp = (p.xp || 0) + e.xp;
    } else {
      const pl = club(st).plantilla.map(i => st.jugadores[i]).filter(Boolean);
      pl.forEach(p => { p.estado.moral = U.clamp(p.estado.moral + e.moral * 0.15, 20, 100); p.estado.fatiga = Math.max(0, p.estado.fatiga - e.recup * 0.1); });
      pl.slice().sort((a, b) => a.edad - b.edad).slice(0, 3).forEach(p => { p.xp = (p.xp || 0) + e.xp * 0.5; });
      if (st.modo === 'entrenador' && st.entrenador && st.entrenador.fase === 'activo') st.entrenador.confianza = U.clamp(st.entrenador.confianza + e.conf * 0.5, 0, 100);
      if (st.modo === 'presidente' && st.legado) st.legado.alma = U.clamp(st.legado.alma + e.fama * 0.4, 0, 100);
    }
  });
  function selfTest() {
    const st = { modo: 'gestor', fecha: '2026-10-01', clubId: 'a', equipos: { a: { id: 'a', ciudad: 'X', reputacion: 80, plantilla: [] } }, jugadores: {}, historial: [], ligas: { ACB: { equipos: ['a'] } } };
    GM.mods.mercado = GM.mods.mercado || { ligaDe: () => 'ACB' }; const ant = GM.mods.carrera;
    const n = nivel(st), d0 = dinero(st), r1 = colocar(st, 'salon', 'f-0-0', 'sofa1'), r2 = colocar(st, 'salon', 'f-0-1', 'sofa1'), r3 = colocar(st, 'salon', 'f-1-0', 'sofa3'), r4 = colocar(st, 'salon', 'w-0', 'cuadro');
    const ok = n >= 3 && r1.ok && !r2.ok && n >= 3 === !!r3.ok && r4.ok && quitar(st, 'salon', 'f-0-0').ok && habitaciones('mansion').length === 7 && efectos(st).moral >= 0;
    return ok && TIPOS.mansion.req === 5 && ITEMS.every(i => i.niv >= 0 && i.niv <= 5);
  }
  GM.register('hogar', { VARIANTES, varianteDe, dims, usoDe, usar, energiaCasa, nivel, etiquetaNivel, dinero, casaActual, tipos, mudarse, habitaciones, catalogo, colocar, quitar, colorear, muebles, efectos, trofeos, selfTest, TIPOS, ITEMS, HABS, NIVELES, EXT });
})();
