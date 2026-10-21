// Pendientes de los puntos 54 a 61: negocio con interior y plantilla, canchas con jugadores y público, arte colgado en casa, intercambio de cromos y enlace pueblo-ciudad. Uso: node tools/pendientes30_prueba.js
const { chromium } = require('playwright');
const { sleep, esperarEscena, irA } = require('./ayudas');
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('response', r => {
    if (r.status() === 404) console.log('  404:', r.url());
  });
  p.on('console', m => {
    if (m.type() === 'error') errs.push(m.text().slice(0, 140));
  });
  await p.goto('http://localhost:8080/');
  await sleep(700);
  const filas = [];
  let ok = true;
  const chk = (c, t) => {
    filas.push((c ? 'ok    ' : 'FALLA ') + t);
    if (!c) ok = false;
  };
  await p.evaluate(() => {
    const pj = GM.mods.personaje.crear();
    pj.nombre = 'Marc';
    GM.newGame('joventut-badalona', undefined, {
      modo: 'carrera',
      personaje: pj,
      carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: 'joventut-badalona' }
    });
    GM.ui.start(document.getElementById('app'));
  });
  // dinero, un negocio abierto, arte y una colección con repetidas
  await p.evaluate(() => {
    const st = GM.state;
    st.carrera.dinero = 50000;
    const r = GM.negocios.abrir(st, 'bar', 'Centro');
    const n = r.negocio;
    n.abierto = st.fecha;
    n.hoy = { clientes: 60, perdidos: 3, ingresos: 0.6, demanda: 63 };
    const P = GM.patrimonio;
    P.est(st).bienes.push(
      { id: 'arteT', tipo: 'arte', nombre: 'Óleo de paisaje', compra: { precio: 12, fecha: st.fecha }, barrio: 'Subasta' },
      { id: 'arteT2', tipo: 'arte', nombre: 'Escultura de bronce', compra: { precio: 30, fecha: st.fecha }, barrio: 'Subasta' }
    );
    const K = GM.coleccionables,
      L = K.catalogo(st)
        .filter(x => x.tipo === 'cromo')
        .slice(0, 3);
    L.forEach(x => {
      K.otorgar(st, x.id);
      K.otorgar(st, x.id);
      K.otorgar(st, x.id);
    });
  });
  await p.evaluate(() => GM.sede.abrir(GM.state));
  await esperarEscena(p);
  await irA(p, 'calle', 120000);
  const calle = await p.evaluate(() => {
    const S = GM.sede._estado();
    return {
      negocio: S.zonas.filter(z => /^negocio_/.test(z.sala.id)).map(z => z.sala.nombre),
      canchas: (S.canchas || []).length,
      jug: (S.jugadoresCancha || []).length,
      roles: S.gente.filter(g => /Rival|Chaval jugando|Vecino mirando|esperando pista/.test(g.rol || '')).length,
      cartelBus: !!S.zonas.find(z => z.sala.id === 'bus_pueblo')
    };
  });
  chk(calle.negocio.length === 1 && /tuyo/.test(calle.negocio[0]), 'el negocio tiene portal en la ciudad: ' + JSON.stringify(calle.negocio));
  chk(calle.canchas >= 1 && calle.jug >= 2 && calle.roles >= 4, 'canchas con gente: ' + JSON.stringify({ c: calle.canchas, jug: calle.jug, roles: calle.roles }));
  // entrar en el negocio
  await p.evaluate(() => {
    const S = GM.sede._estado(),
      z = S.zonas.find(z => /^negocio_/.test(z.sala.id));
    z.sala.acciones(GM.state)[0].fn();
  });
  await sleep(500);
  await esperarEscena(p, 'interior', 120000);
  const dentro = await p.evaluate(() => {
    const S = GM.sede._estado();
    return {
      tipo: S.interiorTipo,
      nombre: S.interiorNombre,
      empleados: S.gente.filter(g => /camarero/.test(g.rol || '')).map(g => g.rol),
      clientes: S.gente.filter(g => g.rol === 'Cliente').length,
      acc: S.zonas.flatMap(z => (z.sala.acciones ? z.sala.acciones(GM.state).map(a => a.t) : []))
    };
  });
  chk(
    dentro.tipo === 'negocio' && dentro.empleados.length >= 3 && dentro.clientes >= 2,
    'interior del negocio: ' + JSON.stringify({ n: dentro.nombre, emp: dentro.empleados.length, cli: dentro.clientes })
  );
  chk(dentro.acc.length >= 3, 'acciones dentro: ' + dentro.acc.join(' | '));
  await p.screenshot({ path: 'capturas/pendientes30/negocio_interior.png' });
  const mano = await p.evaluate(() => {
    const S = GM.sede._estado(),
      z = S.zonas.find(z => z.sala.acciones && z.sala.acciones(GM.state).some(a => a.id === 'mano'));
    return z.sala
      .acciones(GM.state)
      .find(a => a.id === 'mano')
      .fn();
  });
  chk(mano.ok, 'echar una mano: ' + (mano.texto || mano.motivo));
  // salir y volver a la calle
  await irA(p, 'calle', 120000);
  await p.screenshot({ path: 'capturas/pendientes30/calle_canchas.png' });
  // cancha: captura cerca
  await p.evaluate(() => {
    const S = GM.sede._estado(),
      c = S.canchas[0],
      y = S.yo.obj.position;
    y.set(c.obj.position.x, 0, c.obj.position.z + 1);
    S.foco && S.foco.set(c.obj.position.x, 0, c.obj.position.z - 3);
  });
  await sleep(900);
  await p.screenshot({ path: 'capturas/pendientes30/cancha.png' });
  // casa con arte
  const vid = await p.evaluate(() => (GM.mods.hogar.viviendas(GM.state)[0] || {}).id);
  await irA(p, 'casa:' + vid, 120000);
  const casa = await p.evaluate(() => {
    const S = GM.sede._estado();
    return { arte: S.mundo.children.filter(o => o.userData && o.userData.arte).length, zona: !!S.zonas.find(z => z.sala.id === 'arte_casa') };
  });
  chk(casa.arte === 2 && casa.zona, 'arte colgado en casa: ' + JSON.stringify(casa));
  await p.screenshot({ path: 'capturas/pendientes30/casa_arte.png' });
  // intercambio de cromos
  const tru = await p.evaluate(() => {
    const K = GM.coleccionables,
      st = GM.state,
      o = K.ofertas(st);
    const r = o.length ? K.intercambiar(st, o[0].k) : null;
    const r2 = o.length ? K.intercambiar(st, o[0].k) : null;
    return { n: o.length, r, r2 };
  });
  chk(tru.n >= 1 && tru.r && tru.r.ok && tru.r2 && !tru.r2.ok, 'intercambio de cromos: ' + JSON.stringify(tru.r && (tru.r.texto || tru.r.motivo)));
  // economía: dos clubes de la misma ciudad pagan distinto
  const eco = await p.evaluate(() => {
    const st = GM.state,
      E = GM.economia,
      porCiudad = {};
    Object.keys(st.equipos).forEach(id => {
      const e = st.equipos[id];
      if (e && e.ciudad) (porCiudad[e.ciudad] = porCiudad[e.ciudad] || []).push(id);
    });
    const par = Object.values(porCiudad).find(l => l.length >= 2 && new Set(l.map(id => E.factorSalario(st, id))).size > 1);
    return par ? par.map(id => id + ':' + E.factorSalario(st, id)) : null;
  });
  chk(!!eco, 'sueldos distintos en una misma ciudad: ' + JSON.stringify(eco));
  // pueblo: silueta de la ciudad
  await irA(p, 'pueblo', 120000);
  await p.evaluate(() => {
    const S = GM.sede._estado();
    const g = S.puertas && S.puertas.calle;
    if (g) {
      S.yo.obj.position.set(g.x, 0, g.z + 3);
    }
  });
  await sleep(800);
  await p.screenshot({ path: 'capturas/pendientes30/pueblo_ciudad.png' });
  console.log(filas.join('\n'));
  console.log((ok ? 'ok' : 'FALLA') + ', errores: ' + (errs.length ? errs.slice(0, 4).join(' | ') : 'ninguno'));
  await b.close();
  process.exit(ok && !errs.length ? 0 : 1);
})();
