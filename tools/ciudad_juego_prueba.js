// Encargos y minijuegos en la ciudad real (punto 60): canchas de barrio, anillos de encargos, los minijuegos con cursor (triples, libres, uno contra uno, precisión) y el concurso del All-Star jugable. Capturas en capturas/ciudad_juego/.
// Uso: node tools/ciudad_juego_prueba.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const { sleep, esperarEscena, irA } = require('./ayudas');
const DIR = path.join(__dirname, '..', 'capturas', 'ciudad_juego');
fs.mkdirSync(DIR, { recursive: true });
const CLUB = process.argv[2] || 'joventut-badalona';
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
  await p.evaluate(club => {
    const pj = GM.mods.personaje.crear();
    pj.nombre = 'Marc';
    GM.newGame(club, undefined, { modo: 'carrera', personaje: pj, carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: club } });
    GM.state.carrera.dinero = 50;
    GM.ui.start(document.getElementById('app'));
    GM.sede.abrir(GM.state);
  }, CLUB);
  await esperarEscena(p);
  await irA(p, 'calle', 120000);
  const r1 = await p.evaluate(() => {
    const S = GM.sede._estado(),
      cs = S.zonas.filter(z => /^cancha_/.test(z.sala.id));
    return {
      canchas: cs.length,
      marcas: S.zonas.filter(z => z.sala.encargo).length,
      enc: GM.ciudadJuego.encargos(GM.state).length,
      pos: cs.map(z => [Math.round(z.obj.position.x), Math.round(z.obj.position.z)])
    };
  });
  ok('canchas de barrio y encargos', r1.canchas >= 1 && r1.enc === 4, JSON.stringify(r1));
  // ir a la cancha
  await p.evaluate(() => {
    const S = GM.sede._estado(),
      z = S.zonas.find(q => /^cancha_/.test(q.sala.id));
    S.yo.obj.position.set(z.obj.position.x, 0, z.obj.position.z + 0.3);
    S.zoom = 16;
  });
  await sleep(1800);
  await p.screenshot({ path: path.join(DIR, '1_cancha.png') });
  const r2 = await p.evaluate(() => [...document.querySelectorAll('.sp-accion b')].map(e => e.textContent));
  ok('panel de la cancha con sus actividades', r2.some(t => /triples/i.test(t)) && r2.some(t => /Uno contra uno/i.test(t)) && r2.some(t => /precisi/i.test(t)), JSON.stringify(r2));
  async function jugar(nombre, max) {
    await p.evaluate(n => {
      [...document.querySelectorAll('.sp-accion')].find(b => new RegExp(n, 'i').test(b.textContent)).click();
    }, nombre);
    await sleep(500);
    for (let i = 0; i < max; i++) {
      const hay = await p.evaluate(() => {
        const c = document.querySelector('.pb-cta');
        if (c) {
          c.click();
          return true;
        }
        return false;
      });
      if (!hay) {
        await sleep(500);
        const hay2 = await p.evaluate(() => !!document.querySelector('.pb-cta'));
        if (!hay2) break;
      }
      await sleep(520);
    }
    await sleep(700);
  }
  // triples y precisión
  await jugar('Concurso de triples', 14);
  const t = await p.evaluate(() => ({ rec: GM.ciudadJuego.datos(GM.state).rec, texto: (document.querySelector('.jg-marc') || {}).textContent }));
  ok('concurso de triples jugado', /Resultado/.test(t.texto || ''), JSON.stringify(t));
  await p.screenshot({ path: path.join(DIR, '2_triples.png') });
  await p.evaluate(() => document.querySelectorAll('.fondo').forEach(e => e.remove()));
  await jugar('precisi', 16);
  const pr = await p.evaluate(() => (document.querySelector('.jg-marc') || {}).textContent);
  ok('entreno de precisión jugado', /Resultado/.test(pr || ''), pr);
  await p.evaluate(() => document.querySelectorAll('.fondo').forEach(e => e.remove()));
  // encargo cumplido por un minijuego: se fuerza un encargo de triples con meta 0 y se juega
  const antes = await p.evaluate(() => {
    const st = GM.state,
      J = GM.ciudadJuego;
    J.encargos(st).forEach(e => {
      e.hecho = true;
    });
    J.encargos(st).push({
      id: 'cX',
      tipo: 'triples',
      n: 0,
      texto: 'Encargo de prueba',
      destino: 'cancha',
      hasta: GM.util.addDays(st.fecha, 3),
      premio: { dinero: 1, fama: 0.1, moral: 2, calle: 3 }
    });
    return { d: st.carrera.dinero, calle: J.datos(st).calle };
  });
  await jugar('Concurso de triples', 14);
  const desp = await p.evaluate(() => {
    const st = GM.state;
    return { d: st.carrera.dinero, calle: GM.ciudadJuego.datos(st).calle, hecho: GM.ciudadJuego.encargos(st).find(e => e.id === 'cX').hecho };
  });
  ok('el encargo se cumple y paga', desp.hecho && desp.d > antes.d && desp.calle > antes.calle, JSON.stringify([antes, desp]));
  await p.evaluate(() => document.querySelectorAll('.fondo').forEach(e => e.remove()));
  // visitar un sitio: abrir la zona cumple el encargo
  const v = await p.evaluate(() => {
    const st = GM.state,
      S = GM.sede._estado(),
      z = S.zonas.find(q => /tienda|pena|ayuntamiento/.test(q.sala.id));
    GM.ciudadJuego.encargos(st).push({
      id: 'cV',
      tipo: 'visitar',
      destino: z.sala.id,
      texto: 'Visita de prueba',
      hasta: GM.util.addDays(st.fecha, 3),
      premio: { dinero: 0.5, fama: 0.1, moral: 1, calle: 1 }
    });
    GM.bus.emit('sala:abierta', { id: z.sala.id });
    return GM.ciudadJuego.encargos(st).find(e => e.id === 'cV').hecho;
  });
  ok('visitar un sitio cumple el encargo', v);
  // All-Star jugable
  const as = await p.evaluate(async () => {
    const st = GM.state,
      A = GM.mods.allstar;
    if (!A) return { sin: true };
    const ev = Object.values(A.estado(st).eventos)[0];
    if (!ev) return { sinEvento: true };
    const liga = ev.id;
    A.estado(st).inv[liga] = { triples: 'aceptada' };
    const r = GM.ciudadJuego.jugarAllStar(st, liga, 'triples');
    return { liga, r };
  });
  if (as.r) {
    for (let i = 0; i < 20; i++) {
      const hay = await p.evaluate(() => {
        const c = document.querySelector('.pb-cta');
        if (c) {
          c.click();
          return true;
        }
        return false;
      });
      if (!hay) {
        await sleep(600);
        if (!(await p.evaluate(() => !!document.querySelector('.pb-cta')))) break;
      }
      await sleep(520);
    }
    await sleep(600);
    const j = await p.evaluate(liga => GM.mods.allstar.estado(GM.state).inv[liga].jugado, as.liga);
    ok('el concurso del All-Star se juega y se guarda', !!(j && j.triples && j.triples.length === 3), JSON.stringify(j));
    await p.screenshot({ path: path.join(DIR, '3_allstar.png') });
  } else ok('All-Star no disponible esta temporada', true, JSON.stringify(as));
  console.log('errores: ' + (errs.length ? errs.slice(0, 4).join(' | ') : 'ninguno'));
  await b.close();
  process.exit(errs.length || out.some(x => /^FALLA/.test(x)) ? 1 : 0);
})();
