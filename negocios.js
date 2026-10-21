/* NEGOCIOS PROPIOS (punto 55, GM.negocios): un motor de negocio genérico con plantillas por tipo (bar, gimnasio, escuela de baloncesto, tienda, restaurante, academia, hotel, clínica de fisioterapia).
   Se abre en un barrio (en un local alquilado o en uno tuyo de patrimonio.js), con una inversión que depende del barrio y de la economía de la ciudad, y se gestiona: precio, calidad del proveedor, marketing,
   plantilla (cada empleado con su sueldo, habilidad y ánimo), reputación y demanda por barrio, día de la semana y franja horaria (mañana, mediodía, tarde y noche). Cada día se simulan las cuatro franjas:
   clientes que quieren venir x atractivo (reputación, calidad, precio frente a lo que pide el barrio, marketing) frente a lo que la plantilla puede atender; lo que sobra se pierde y daña la reputación.
   Cada día 1 se liquida el mes: beneficio (ingresos menos suministros, sueldos, alquiler y marketing) al libro de cuentas (imponible si es positivo). Se puede cerrar (recuperas parte del equipamiento y pagas
   un mes a cada empleado) o traspasar (varias veces el beneficio mensual). Estado: state.negocios = { lista, seq }. Prueba: t_negocios.js. */
(function () {
  const U = GM.util,
    clamp = U.clamp,
    k1 = k => (Math.round(k * 10) / 10).toLocaleString('es-ES');
  const H = () => GM.mods.hogar,
    dinero = st => H().dinero(st),
    pagar = (st, k) => H().gastar(st, k),
    cobrar = (st, k) => H().ingresar(st, k);
  const BLOQUES = ['mañana', 'mediodía', 'tarde', 'noche'];
  // inv: inversión en miles de euros en un barrio medio; alq: alquiler mensual; dem: clientes potenciales al día en un barrio medio; ticket: gasto medio por cliente en euros; cap: clientes que atiende un empleado normal al día;
  // coste: parte del ticket que se va en suministros con el proveedor normal; pesos: cuánto de la demanda cae en cada franja; fin: más gente en fin de semana (1 = igual)
  const TIPOS = {
    bar: { n: 'Bar', inv: 45, alq: 2.2, dem: 100, ticket: 8.5, cap: 40, coste: 0.4, fijo: 0.9, pesos: [0.18, 0.22, 0.25, 0.35], fin: 1.25, emp: 3, ic: 'copa' },
    restaurante: { n: 'Restaurante', inv: 120, alq: 4.5, dem: 50, ticket: 25, cap: 14, coste: 0.38, fijo: 1.8, pesos: [0.03, 0.4, 0.07, 0.5], fin: 1.35, emp: 5, ic: 'plato' },
    tienda: { n: 'Tienda de deporte', inv: 80, alq: 3.2, dem: 40, ticket: 32, cap: 30, coste: 0.55, fijo: 1.0, pesos: [0.15, 0.3, 0.45, 0.1], fin: 1.3, emp: 2, ic: 'bolsa' },
    gimnasio: { n: 'Gimnasio', inv: 260, alq: 6.5, dem: 130, ticket: 9, cap: 80, coste: 0.1, fijo: 4.0, pesos: [0.3, 0.1, 0.4, 0.2], fin: 0.8, emp: 3, ic: 'pesas' },
    escuela: { n: 'Escuela de baloncesto', inv: 90, alq: 3.4, dem: 54, ticket: 11, cap: 24, coste: 0.1, fijo: 1.2, pesos: [0.05, 0.1, 0.8, 0.05], fin: 0.7, emp: 2, ic: 'balon' },
    academia: { n: 'Academia de estudios', inv: 70, alq: 2.8, dem: 56, ticket: 10, cap: 24, coste: 0.08, fijo: 1.0, pesos: [0.1, 0.1, 0.7, 0.1], fin: 0.5, emp: 2, ic: 'libro' },
    hotel: { n: 'Hotel', inv: 900, alq: 14, dem: 26, ticket: 90, cap: 10, coste: 0.25, fijo: 12, pesos: [0.1, 0.1, 0.25, 0.55], fin: 1.2, emp: 7, ic: 'cama' },
    clinica: { n: 'Clínica de fisioterapia', inv: 160, alq: 4.2, dem: 19, ticket: 40, cap: 7, coste: 0.12, fijo: 1.1, pesos: [0.4, 0.15, 0.4, 0.05], fin: 0.4, emp: 2, ic: 'cruz' }
  };
  const PROVEEDORES = {
    barato: { n: 'Proveedor barato', coste: 0.8, calidad: -0.7 },
    normal: { n: 'Proveedor habitual', coste: 1, calidad: 0 },
    premium: { n: 'Proveedor premium', coste: 1.28, calidad: 0.9 }
  };
  const NOMBRES = ['Lucía', 'Marc', 'Aitana', 'Hugo', 'Paula', 'Iván', 'Noa', 'Bruno', 'Sara', 'Pol', 'Irene', 'Dani', 'Carla', 'Álex', 'Nerea', 'Jordi'],
    APELL = ['Serra', 'Mora', 'Vega', 'Ríos', 'Pons', 'Gil', 'Roca', 'Prat', 'Sanz', 'Lara'];
  const nuevaPartida = st => {
    st.negocios = { lista: [], seq: 0 };
  };
  const est = st => st.negocios || (st.negocios = { lista: [], seq: 0 });
  const pais = st => (st.equipos[st.clubId] && st.equipos[st.clubId].pais) || 'ES';
  const ecoSuelo = st => (GM.economia ? GM.economia.indiceSuelo(st) : 1),
    ecoVida = st => (GM.economia ? GM.economia.indiceVida(st) : 1);
  const barrios = st => barriosBase(st);
  function barriosBase(st) {
    try {
      const b = GM.mods.carrera && GM.mods.carrera.barriosVivienda && st.modo === 'carrera' ? GM.mods.carrera.barriosVivienda(st) : null;
      if (b && b.length) return b.map(x => ({ nombre: x.nombre, f: x.precio, prestigio: x.prestigio || 3 }));
    } catch (e) {
      /* sin barrios */
    }
    const ciu = st.equipos[st.clubId].ciudad;
    return ['Centro', 'Ensanche', 'Puerto', 'Colinas', 'Periferia'].map((n, i) => ({
      nombre: n,
      f: Math.round((0.75 + (U.hash(ciu + n) % 60) / 100) * 100) / 100,
      prestigio: 1 + (U.hash(ciu + n + 'p') % 5)
    }));
  }
  // Tráfico del barrio para este tipo de negocio (entre 0,55 y 1,5): cada barrio tiene su vocación
  const trafico = (st, tipo, barrio) => 0.55 + (U.hash(st.equipos[st.clubId].ciudad + barrio + tipo) % 96) / 100;
  const sueldoBase = st => Math.round(1.7 * (GM.economia ? GM.economia.ficha(st).salarioMedio / 28 : 1) * 100) / 100; // miles de euros al mes por empleado
  function nuevoEmpleado(st, n) {
    const h = U.hash(st.fecha + n + est(st).seq) >>> 0;
    est(st).seq++;
    return { nombre: NOMBRES[h % 16] + ' ' + APELL[(h >>> 4) % 10], sueldo: sueldoBase(st), hab: Math.round((0.8 + ((h >>> 8) % 50) / 100) * 100) / 100, animo: 70 };
  }
  // ---------- Abrir, cerrar y traspasar ----------
  function costeApertura(st, tipo, barrio, localPropio) {
    const T = TIPOS[tipo],
      b = barrios(st).find(x => x.nombre === barrio) || { f: 1 },
      f = Math.round(T.inv * (0.7 + 0.3 * b.f) * ecoSuelo(st) * 10) / 10,
      alq = localPropio ? 0 : Math.round(T.alq * b.f * ecoSuelo(st) * 100) / 100;
    return { inversion: f, alquiler: alq, fianza: Math.round(alq * 2 * 10) / 10, total: Math.round((f + alq * 2) * 10) / 10 };
  }
  function localesLibres(st) {
    return GM.patrimonio
      ? GM.patrimonio.est(st).bienes.filter(b => b.tipo === 'local' && !b.alquilado && !b.obra && !est(st).lista.some(n => n.local && n.local.bien === b.id && !n.cerrado))
      : [];
  }
  function abrir(st, tipo, barrio, localId) {
    const T = TIPOS[tipo];
    if (!T) return { ok: false, motivo: 'Negocio desconocido.' };
    const E = est(st);
    if (E.lista.filter(n => !n.cerrado).length >= 6) return { ok: false, motivo: 'Con seis negocios ya no llegas a todo.' };
    const propio = localId ? localesLibres(st).find(b => b.id === localId) : null;
    if (localId && !propio) return { ok: false, motivo: 'Ese local no está disponible.' };
    const c = costeApertura(st, tipo, barrio, !!propio);
    if (dinero(st) < c.total) return { ok: false, motivo: 'Te faltan ' + k1(c.total - dinero(st)) + ' mil €.' };
    pagar(st, c.total);
    const P = GM.patrimonio;
    if (P) P.reg(st, 'negocio', 'Apertura de ' + T.n.toLowerCase() + ' en ' + barrio, -c.total);
    const dias = Math.round(14 + c.inversion / 12),
      n = {
        id: 'n' + ++E.seq,
        tipo,
        nombre: T.n + ' ' + ['Central', 'del Barrio', 'La Esquina', 'Nuevo', 'Olímpico', 'del Puerto'][U.hash(st.fecha + barrio + tipo) % 6],
        barrio,
        local: propio ? { tipo: 'propio', bien: propio.id } : { tipo: 'alquilado', alquiler: c.alquiler },
        inversion: c.inversion,
        abre: U.addDays(st.fecha, dias),
        abierto: null,
        precio: 1,
        calidad: 3,
        prov: 'normal',
        marketing: 0,
        reputacion: 45,
        empleados: [],
        mes: { ing: 0, gas: 0, cli: 0, pot: 0, dias: 0 },
        hist: [],
        hoy: null,
        cerrado: false
      };
    for (let i = 0; i < T.emp; i++) n.empleados.push(nuevoEmpleado(st, tipo + i));
    E.lista.push(n);
    GM.noticia && GM.noticia(st, 'Empiezas la obra de tu ' + T.n.toLowerCase() + ' en ' + barrio + ': abre el ' + U.fecha(n.abre) + '.');
    return { ok: true, negocio: n, coste: c };
  }
  function cerrar(st, id) {
    const n = est(st).lista.find(x => x.id === id && !x.cerrado);
    if (!n) return { ok: false, motivo: 'Ese negocio no existe.' };
    const recup = Math.round(n.inversion * 0.35 * 10) / 10,
      indem = Math.round(n.empleados.reduce((s, e) => s + e.sueldo, 0) * 10) / 10;
    if (dinero(st) + recup < indem) return { ok: false, motivo: 'No puedes pagar las indemnizaciones (' + k1(indem) + ' mil €).' };
    cobrar(st, recup);
    pagar(st, indem);
    n.cerrado = true;
    n.cierre = st.fecha;
    if (GM.patrimonio) {
      GM.patrimonio.reg(st, 'negocio', 'Cierre de ' + n.nombre.toLowerCase() + ': equipamiento', recup);
      GM.patrimonio.reg(st, 'negocio', 'Indemnizaciones de ' + n.nombre.toLowerCase(), -indem);
    }
    return { ok: true, recuperas: recup, indemnizas: indem };
  }
  function valorTraspaso(st, n) {
    const b = n.hist.slice(0, 6),
      media = b.length ? b.reduce((s, x) => s + x.beneficio, 0) / b.length : 0;
    return Math.max(0, Math.round((media * 14 * (0.6 + n.reputacion / 100) + n.inversion * 0.4) * 10) / 10);
  }
  function traspasar(st, id) {
    const n = est(st).lista.find(x => x.id === id && !x.cerrado);
    if (!n) return { ok: false, motivo: 'Ese negocio no existe.' };
    if (!n.abierto) return { ok: false, motivo: 'Aún no ha abierto.' };
    const v = valorTraspaso(st, n);
    cobrar(st, v);
    n.cerrado = true;
    n.cierre = st.fecha;
    n.traspasado = v;
    if (GM.patrimonio) {
      GM.patrimonio.reg(st, 'negocio', 'Traspaso de ' + n.nombre.toLowerCase(), v, null, false);
      GM.patrimonio.est(st).imp.ingresos += Math.max(0, v - n.inversion);
    }
    return { ok: true, precio: v };
  }
  // ---------- Gestión ----------
  function ajustar(st, id, campo, valor) {
    const n = est(st).lista.find(x => x.id === id && !x.cerrado);
    if (!n) return { ok: false, motivo: 'Ese negocio no existe.' };
    if (campo === 'precio') n.precio = clamp(Math.round(valor * 100) / 100, 0.6, 1.8);
    else if (campo === 'marketing') n.marketing = clamp(Math.round(valor * 10) / 10, 0, 8);
    else if (campo === 'prov' && PROVEEDORES[valor]) n.prov = valor;
    else if (campo === 'calidad') n.calidad = clamp(Math.round(valor), 1, 5);
    else return { ok: false, motivo: 'Eso no se ajusta.' };
    return { ok: true };
  }
  function contratar(st, id) {
    const n = est(st).lista.find(x => x.id === id && !x.cerrado);
    if (!n) return { ok: false, motivo: 'Ese negocio no existe.' };
    if (n.empleados.length >= 14) return { ok: false, motivo: 'No cabe más gente.' };
    n.empleados.push(nuevoEmpleado(st, n.tipo + n.empleados.length));
    return { ok: true, empleado: n.empleados[n.empleados.length - 1] };
  }
  function despedir(st, id, i) {
    const n = est(st).lista.find(x => x.id === id && !x.cerrado);
    if (!n || !n.empleados[i]) return { ok: false, motivo: 'No existe.' };
    if (n.empleados.length <= 1) return { ok: false, motivo: 'Necesitas al menos una persona.' };
    const e = n.empleados.splice(i, 1)[0],
      ind = Math.round(e.sueldo * 10) / 10;
    if (dinero(st) >= ind) {
      pagar(st, ind);
      if (GM.patrimonio) GM.patrimonio.reg(st, 'negocio', 'Despido de ' + e.nombre, -ind);
    }
    return { ok: true, indemnizacion: ind };
  }
  function subirSueldos(st, id, pct) {
    const n = est(st).lista.find(x => x.id === id && !x.cerrado);
    if (!n) return { ok: false };
    n.empleados.forEach(e => {
      e.sueldo = Math.round(e.sueldo * (1 + pct) * 100) / 100;
      e.animo = clamp(e.animo + pct * 120, 0, 100);
    });
    return { ok: true };
  }
  // ---------- Simulación de un día ----------
  const DIA = [0.7, 0.9, 0.95, 1, 1.05, 1.3, 1.25]; // domingo a sábado
  function atractivo(st, n) {
    const T = TIPOS[n.tipo],
      b = barrios(st).find(x => x.nombre === n.barrio) || { f: 1 },
      ref = Math.pow(b.f, 0.5),
      rel = n.precio / ref,
      calidad = (n.calidad - 3) * 0.08 + PROVEEDORES[n.prov].calidad * 0.08;
    const mk = 1 + 0.35 * (1 - Math.exp(-n.marketing / 2.5)),
      rep = 0.6 + (n.reputacion / 100) * 0.9,
      precio = Math.pow(1 / rel, 1.3);
    return Math.max(0.1, rep * mk * precio * (1 + calidad));
  }
  function simulaDia(st, n) {
    const T = TIPOS[n.tipo],
      b = barrios(st).find(x => x.nombre === n.barrio) || { f: 1 },
      dow = U.weekday(st.fecha),
      finde = dow === 0 || dow === 6,
      base = T.dem * trafico(st, n.tipo, n.barrio) * (0.8 + 0.2 * b.f) * (finde ? T.fin : 1) * DIA[dow] * (GM.economia ? GM.economia.factorClub(st, st.clubId).taquilla : 1);
    const hoyPartido = st.calendario && st.calendario.some && st.calendario.some(g => g.fecha === st.fecha && g.local === st.clubId) ? 1.3 : 1,
      at = atractivo(st, n),
      capDia = n.empleados.reduce((s, e) => s + T.cap * e.hab * (0.7 + e.animo / 330), 0);
    let ing = 0,
      cli = 0,
      pot = 0,
      perdidos = 0;
    BLOQUES.forEach((bl, i) => {
      const p = base * T.pesos[i] * hoyPartido * at,
        cap = capDia * T.pesos[i] * 1.15,
        serv = Math.min(p, cap);
      pot += p;
      cli += serv;
      perdidos += Math.max(0, p - cap);
    });
    ing = (cli * T.ticket * n.precio) / 1000;
    const gas = (cli * T.ticket * T.coste * PROVEEDORES[n.prov].coste * (1 + (n.calidad - 3) * 0.05)) / 1000;
    // reputación: sube si se atiende bien a un precio justo y baja si hay colas; el ánimo del equipo baja con la sobrecarga y sube con el sueldo
    const sat = pot ? cli / pot : 1,
      justo = Math.min(1.4, Math.max(0.6, 1.1 - n.precio / Math.pow(b.f, 0.5) + (n.calidad - 3) * 0.1));
    n.reputacion = clamp(n.reputacion + (sat - 0.8) * 0.5 + (justo - 0.9) * 0.3 + n.marketing * 0.01 - 0.02, 5, 100);
    const carga = pot ? Math.min(1.5, pot / Math.max(1, capDia)) : 1;
    n.empleados.forEach(e => {
      const mercado = sueldoBase(st);
      e.animo = clamp(e.animo + (e.sueldo >= mercado ? 0.12 : -0.2) - (carga > 1.1 ? 0.25 : -0.05), 0, 100);
    });
    n.mes.ing += ing;
    n.mes.gas += gas;
    n.mes.cli += cli;
    n.mes.pot += pot;
    n.mes.dias++;
    n.hoy = { clientes: Math.round(cli), perdidos: Math.round(perdidos), ingresos: Math.round(ing * 100) / 100, demanda: Math.round(pot) };
  }
  function mes(st, n) {
    const T = TIPOS[n.tipo],
      sueldos = n.empleados.reduce((s, e) => s + e.sueldo, 0),
      alq = n.local.tipo === 'alquilado' ? n.local.alquiler * (GM.economia ? GM.economia.indiceSuelo(st) / Math.max(1, ecoSuelo(st)) : 1) : 0,
      mk = n.marketing,
      m = n.mes;
    const iva = m.ing * 0.13,
      cargas = sueldos * 0.32,
      fijos = T.fijo * (0.7 + 0.3 * ecoVida(st)) + n.inversion * 0.003,
      gastos = Math.round((m.gas + sueldos + cargas + alq + mk + iva + fijos) * 100) / 100,
      ingresos = Math.round(m.ing * 100) / 100,
      beneficio = Math.round((ingresos - gastos) * 100) / 100;
    if (beneficio >= 0) cobrar(st, beneficio);
    else pagar(st, -beneficio);
    if (GM.patrimonio) GM.patrimonio.reg(st, 'negocio', 'Resultado de ' + n.nombre.toLowerCase() + ' (' + st.fecha.slice(0, 7) + ')', beneficio, null, true);
    n.hist.unshift({ f: st.fecha, ingresos, gastos, beneficio, clientes: Math.round(m.cli), reputacion: Math.round(n.reputacion) });
    if (n.hist.length > 36) n.hist.length = 36;
    n.mes = { ing: 0, gas: 0, cli: 0, pot: 0, dias: 0 };
    n.empleados = n.empleados.filter(e => {
      if (e.animo < 12 && n.empleados.length > 1 && U.hash(e.nombre + st.fecha) % 100 < 50) {
        GM.noticia && GM.noticia(st, e.nombre + ' deja ' + n.nombre.toLowerCase() + ': estaba quemado/a.');
        return false;
      }
      return true;
    });
    n.rachaNeg = beneficio < 0 ? (n.rachaNeg || 0) + 1 : 0;
    if (n.rachaNeg === 3 && GM.noticia) GM.noticia(st, 'Llevas tres meses perdiendo dinero en ' + n.nombre.toLowerCase() + ': revisa precios, plantilla y marketing.');
  }
  function dia(st) {
    const E = est(st);
    E.lista.forEach(n => {
      if (n.cerrado) return;
      if (!n.abierto) {
        if (n.abre <= st.fecha) {
          n.abierto = st.fecha;
          GM.noticia && GM.noticia(st, '🎉 Abre ' + n.nombre.toLowerCase() + ' en ' + n.barrio + '.');
        }
        return;
      }
      simulaDia(st, n);
      if (st.fecha.slice(8) === '01') mes(st, n);
    });
    if (st.fecha.slice(8) === '01') E.lista = E.lista.filter(n => !n.cerrado || U.diffDays(n.cierre, st.fecha) < 400);
  }
  GM.bus.on('dia:avanzado', () => {
    const st = GM.state;
    if (st && st.negocios && st.equipos && st.equipos[st.clubId]) {
      try {
        dia(st);
      } catch (e) {
        console.error('negocios', e);
      }
    }
  });
  const activos = st => est(st).lista.filter(n => !n.cerrado),
    tiene = (st, tipo) => activos(st).some(n => n.tipo === tipo);
  function resumen(st) {
    const a = activos(st);
    return {
      n: a.length,
      beneficioMes: Math.round(a.reduce((s, n) => s + (n.hist[0] ? n.hist[0].beneficio : 0), 0) * 10) / 10,
      empleados: a.reduce((s, n) => s + n.empleados.length, 0)
    };
  }
  function selfTest() {
    const prev = GM.state,
      st = {
        modo: 'gestor',
        fecha: '2026-10-01',
        clubId: 'a',
        equipos: { a: { id: 'a', ciudad: 'X', pais: 'ES', reputacion: 80, plantilla: [] } },
        jugadores: {},
        historial: [],
        noticias: [],
        hogar: { ahorros: 500, muebles: {} }
      };
    GM.state = st;
    nuevaPartida(st);
    const r = abrir(st, 'bar', 'Centro');
    if (!r.ok) {
      GM.state = prev;
      return false;
    }
    st.fecha = '2026-12-05';
    for (let i = 0; i < 60; i++) {
      st.fecha = U.addDays(st.fecha, 1);
      dia(st);
    }
    const ok = !!est(st).lista[0].hist.length && cerrar(st, r.negocio.id).ok && !tiene(st, 'bar');
    GM.state = prev;
    return ok;
  }
  GM.negocios = {
    TIPOS,
    PROVEEDORES,
    BLOQUES,
    nuevaPartida,
    est,
    barrios,
    trafico,
    costeApertura,
    localesLibres,
    abrir,
    cerrar,
    traspasar,
    valorTraspaso,
    ajustar,
    contratar,
    despedir,
    subirSueldos,
    atractivo,
    simulaDia,
    dia,
    activos,
    tiene,
    resumen,
    selfTest
  };
  GM.register && GM.register('negocios', GM.negocios);
})();
