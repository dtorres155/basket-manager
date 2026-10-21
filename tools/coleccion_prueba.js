// Coleccionables (punto 61): la vitrina de casa con camisetas, balones y cromos; las acciones del quiosco (comprar y abrir sobres); el museo del club con piezas enmarcadas; y la pestaña Colección. Capturas en capturas/coleccion/.
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const { sleep, esperarEscena, irA } = require('./ayudas');
const DIR = path.join(__dirname, '..', 'capturas', 'coleccion');
fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(),
    errs = [],
    out = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error') errs.push(m.text().slice(0, 160));
  });
  const ok = (n, c, x) => {
    const l = (c ? 'ok    ' : 'FALLA ') + n + (x ? ' ' + x : '');
    out.push(l);
    console.log(l);
  };
  await p.goto('http://localhost:8080/');
  await sleep(700);
  await p.evaluate(() => {
    const pj = GM.mods.personaje.crear();
    pj.nombre = 'Marc';
    GM.newGame('joventut-badalona', undefined, {
      modo: 'carrera',
      personaje: pj,
      carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: 'joventut-badalona' }
    });
    const st = GM.state,
      K = GM.coleccionables;
    st.carrera.dinero = 400;
    st.carrera.vivienda.actual = {
      id: 'vtest',
      barrio: 0,
      barrioNombre: 'Centro',
      tipo: 'mansion',
      modo: 'compra',
      precio: 2600,
      alquiler: 1,
      cuota: 1,
      ciudad: 'Badalona',
      desde: st.fecha,
      comodidad: 3,
      transporte: 3,
      ruido: 2,
      prestigio: 4
    };
    K.comprarSobre(st, 40);
    for (let i = 0; i < 40; i++) K.abrirSobre(st);
    Object.keys(st.equipos)
      .slice(0, 14)
      .forEach(id => K.otorgar(st, 'camiseta:' + id, 'prueba'));
    ['final', 'campeon', 'allstar', 'noche'].forEach(k => K.otorgar(st, 'balon:' + k, 'prueba'));
    GM.ui.start(document.getElementById('app'));
    GM.sede.abrir(st);
  });
  await esperarEscena(p);
  await irA(p, 'calle');
  await irA(p, 'casa:vtest');
  const r1 = await p.evaluate(() => {
    const S = GM.sede._estado();
    return { zona: !!S.zonas.find(z => z.sala.id === 'coleccion'), total: GM.coleccionables.total(GM.state) };
  });
  ok('la casa tiene la vitrina de la colección', r1.zona && r1.total > 30, JSON.stringify(r1));
  await p.evaluate(() => {
    const S = GM.sede._estado(),
      z = S.zonas.find(q => q.sala.id === 'coleccion');
    S.yo.obj.position.set(z.obj.position.x, 0, z.obj.position.z + 0.2);
    S.zoom = 9;
  });
  await sleep(1800);
  await p.screenshot({ path: path.join(DIR, '1_vitrina.png') });
  await irA(p, 'calle');
  const k = await p.evaluate(() => {
    const S = GM.sede._estado(),
      z = S.zonas.find(q => q.sala.id === 'kiosco');
    return z ? { acc: z.sala.acciones(GM.state).map(a => a.t) } : null;
  });
  ok('el quiosco vende sobres', !!k && k.acc.some(t => /sobre/i.test(t)), JSON.stringify(k));
  await irA(p, 'interior:museo');
  const mu = await p.evaluate(() => {
    const S = GM.sede._estado();
    return { marcos: S.mundo.userData.piezas || 0, escena: S.escena };
  });
  ok('el museo expone piezas', mu.escena === 'interior' && mu.marcos >= 8, JSON.stringify(mu));
  await p.evaluate(() => {
    const S = GM.sede._estado();
    S.zoom = 17;
  });
  await sleep(1200);
  await p.screenshot({ path: path.join(DIR, '2_museo.png') });
  console.log('errores: ' + (errs.length ? errs.slice(0, 4).join(' | ') : 'ninguno'));
  await b.close();
  process.exit(errs.length || out.some(x => /^FALLA/.test(x)) ? 1 : 0);
})();
