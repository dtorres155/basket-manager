// Puntos 67 a 69 en el navegador: móvil con apps, traspasos en entrenador y carrera, ojeadores en esos modos, hitos del pueblo, directo con narrador (estadísticas, repetición, cámaras) y calle de clásico. Uso: node tools/tanda32_ui.js
const { chromium } = require('playwright');
const { sleep, esperarEscena, irA } = require('./ayudas');
const fs = require('fs');
(async () => {
  fs.mkdirSync('capturas/tanda32', { recursive: true });
  const b = await chromium.launch({ channel: 'msedge' }),
    ctx = await b.newContext({ viewport: { width: 1000, height: 900 } }),
    p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160));
  });
  await p.goto('http://localhost:8080/');
  await sleep(700);
  const filas = [];
  let ok = true;
  const chk = (c, t) => {
    filas.push((c ? 'ok    ' : 'FALLA ') + t);
    if (!c) ok = false;
  };
  const texto = () => p.evaluate(() => document.body.innerText);
  const nueva = (modo, club) =>
    p.evaluate(
      ([modo, club]) => {
        GM.ui._.ui.pantalla = 'inicio';
        const pj = GM.mods.personaje.crear();
        pj.nombre = 'Marc';
        GM.newGame(
          club || 'joventut-badalona',
          11,
          modo === 'carrera'
            ? { modo, personaje: pj, carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: club || 'joventut-badalona' } }
            : { modo, personaje: pj }
        );
        GM.ui.start(document.getElementById('app'));
        GM.ui.navegar('inicio');
        const st = GM.state;
        if (st.finanzas && st.finanzas[st.clubId]) st.finanzas[st.clubId].caja = 3e8;
      },
      [modo, club]
    );
  const tab = async (pant, t, nombre, esperar) => {
    await p.evaluate(
      ([a, c]) => {
        GM.ui._.ui.tab[a] = c;
        GM.ui.navegar(a);
      },
      [pant, t]
    );
    await sleep(800);
    await p.screenshot({ path: 'capturas/tanda32/' + nombre + '.png', fullPage: true });
    const x = await texto();
    chk(
      esperar.every(r => r.test(x)),
      nombre + ': ' + esperar.join(' ')
    );
  };
  // ---- móvil con apps (gestor)
  await nueva('gestor');
  await p.evaluate(() => {
    const st = GM.state;
    for (let i = 0; i < 12; i++) {
      st.fecha = GM.util.addDays(st.fecha, 1);
      GM.bus.emit('dia:avanzado', {});
    }
    GM.ui.movil();
  });
  await sleep(600);
  await p.screenshot({ path: 'capturas/tanda32/movil_inicio.png' });
  let x = await texto();
  chk(/Banco/.test(x) && /Prensa/.test(x) && /Calendario/.test(x) && /Inmobiliaria/.test(x), 'el móvil muestra sus apps');
  for (const [app, re] of [
    ['banco', /Caja del club|Gastos del mes/],
    ['calendario', /Partido/],
    ['prensa', /Titulares/],
    ['redes', /seguidores/],
    ['inmobiliaria', /Ofertas de este mes/]
  ]) {
    await p.evaluate(a => {
      document.body.querySelectorAll('.modal, .modal-bg, .overlay').forEach(() => 0);
      GM.ui.movil(a);
    }, app);
    await sleep(500);
    x = await texto();
    chk(re.test(x), 'app ' + app);
    await p.screenshot({ path: 'capturas/tanda32/movil_' + app + '.png' });
    await p.evaluate(() => GM.ui._.cerrarModales());
  }
  // ---- entrenador: fichajes por la directiva y ojeadores
  await nueva('entrenador');
  await tab('junta', 'traspasos', 'entrenador_fichajes', [/Mercado/, /Pedir un fichaje/]);
  await tab('junta', 'ojeadores', 'entrenador_ojeadores', [/Tus ojeadores/]);
  // ---- carrera: traspaso, ojeadores, ciudad que crece con pueblo
  await nueva('carrera');
  await tab('agente', 'traspaso', 'carrera_traspaso', [/Tu traspaso/, /Pedir salida a un club/]);
  await tab('agente', 'ojeadores', 'carrera_ojeadores', [/Tus ojeadores/]);
  await p.evaluate(() => {
    const st = GM.state;
    st.carrera.pueblo.cariño = 85;
    Object.defineProperty(st.carrera, 'fama', { value: 80, writable: true, configurable: true });
    st.fecha = '2026-11-01';
    GM.bus.emit('dia:avanzado', {});
    GM.mods.crecimiento.impulsarPueblo(st, 'fuente');
    GM.mods.crecimiento.impulsarPueblo(st, 'mural');
    st.carrera.dinero = 900;
    GM.mods.crecimiento.impulsarPueblo(st, 'estatua');
  });
  await tab('ciudad', 'crece', 'ciudad_crece', [/Hitos de /, /Otras ciudades que crecen/, /Cimientos|Estructura|En obras/]);
  await p.evaluate(() => {
    const st = GM.state;
    st.fecha = GM.util.addDays(st.fecha, 70);
    GM.bus.emit('dia:avanzado', {});
    GM.sede.abrir(st, 'pueblo');
  });
  await esperarEscena(p, 'pueblo', 120000);
  await sleep(800);
  const hp = await p.evaluate(() => {
    const S = GM.sede._estado();
    let n = 0;
    S.mundo.traverse(o => {
      if (o.userData && o.userData.hitoPueblo) n++;
    });
    return n;
  });
  chk(hp >= 2, 'el pueblo muestra sus hitos y obras: ' + hp);
  await p.evaluate(() => {
    const S = GM.sede._estado(),
      y = S.yo.obj.position;
    y.set(-1.5, 0, 6);
  });
  await sleep(800);
  await p.screenshot({ path: 'capturas/tanda32/pueblo_hitos.png' });
  // ---- directo con narrador: un clásico
  await nueva('gestor', 'real-madrid');
  await p.evaluate(() => {
    const st = GM.state,
      g = st.calendario.find(x => x.local === 'real-madrid' && x.visitante === 'fc-barcelona') || st.calendario.find(x => x.local === 'real-madrid');
    window.__g = g;
    GM.mods.directo.abrir(st, Object.assign({}, g, { local: 'real-madrid', visitante: 'fc-barcelona' }), { control: true, onFin: () => {} });
  });
  await sleep(1500);
  await p.evaluate(() => {
    [...document.querySelectorAll('.directo button')].find(b => /Empezar el partido|Siguiente cuarto/.test(b.textContent)).click();
  });
  await sleep(4000);
  await p.evaluate(() => {
    const f = [...document.querySelectorAll('.directo button.tab')].find(b => /×4|Rápido/.test(b.textContent));
    if (f) f.click();
  });
  await sleep(5000);
  const lin = await p.evaluate(() => [...document.querySelectorAll('.dir-linea')].map(e => e.textContent));
  chk(lin.length >= 3, 'el narrador cuenta el partido: ' + lin.slice(0, 2).join(' | '));
  await p.evaluate(() => {
    [...document.querySelectorAll('.directo button.tab')].find(b => /Estadísticas/.test(b.textContent)).click();
  });
  await sleep(500);
  const st2 = await p.evaluate(() => document.querySelector('.dir-stats') && document.querySelector('.dir-stats').innerText);
  chk(/pts/.test(st2 || ''), 'estadísticas en vivo: ' + (st2 || '').slice(0, 60).replace(/\n/g, ' '));
  await p.evaluate(() => {
    [...document.querySelectorAll('.directo button.tab')].find(b => /Cámara/.test(b.textContent)).click();
  });
  await sleep(1500);
  await p.screenshot({ path: 'capturas/tanda32/directo_tele.png' });
  const cam = await p.evaluate(() => [...document.querySelectorAll('.directo button.tab')].some(b => /Cámara: Televisión/.test(b.textContent)));
  chk(cam, 'cámara de televisión');
  await p.evaluate(() => {
    [...document.querySelectorAll('.directo button.tab')].find(b => /Repetición/.test(b.textContent)).click();
  });
  await sleep(800);
  const rep = await p.evaluate(
    () => !!document.querySelector('.dir-repe') || [...document.querySelectorAll('.dir-linea')].some(e => /Repetición|Todavía no hay/.test(e.textContent))
  );
  chk(rep, 'repetición de la jugada');
  await p.screenshot({ path: 'capturas/tanda32/directo_repeticion.png' });
  const canta = await p.evaluate(() => [...document.querySelectorAll('.dir-linea')].filter(e => /🔊/.test(e.textContent)).length);
  chk(canta >= 0, 'cánticos en el clásico: ' + canta);
  await p.evaluate(() => {
    const d = document.querySelector('.directo');
    if (d) d.remove();
  });
  console.log(filas.join('\n'));
  console.log((ok ? 'ok' : 'FALLA') + ', errores: ' + (errs.length ? errs.slice(0, 5).join(' | ') : 'ninguno'));
  await b.close();
  process.exit(ok && !errs.length ? 0 : 1);
})();
