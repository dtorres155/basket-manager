// Puntos 62 y 63 en el navegador: pestaña «Árbol de mejoras» (Club) y «Entrenamiento» (Plantilla) en modo gestor, y el campus con las piezas de las mejoras. Uso: node tools/instalaciones_prueba.js
const { chromium } = require('playwright');
const { sleep, esperarEscena, irA } = require('./ayudas');
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1000, height: 900 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text().slice(0, 140));
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
    GM.newGame('joventut-badalona', 11, { modo: 'gestor', personaje: GM.mods.personaje.crear() });
    GM.ui.start(document.getElementById('app'));
  });
  await p.evaluate(() => {
    const st = GM.state,
      id = st.clubId;
    st.finanzas[id].caja = 5e8;
    const CD = GM.mods.ciudadDeportiva;
    ['cantera', 'medico', 'oficinas', 'tienda', 'museo'].forEach(sl => {
      const pa = CD.parcelas(st, id).find(x => x.slot === sl);
      if (pa && pa.estado !== 'bloqueado') {
        const l = pa.nivel;
        const t = pa.nivelMax;
        for (let k = l; k < Math.min(t, 3); k++) {
          const e = st.instalaciones[id].ciudadDeportiva.edificios.find(b => b.slot === sl);
          if (e) {
            e.nivel = Math.max(e.nivel, k + 1);
            e.obra = null;
          } else st.instalaciones[id].ciudadDeportiva.edificios.push({ slot: sl, tipo: pa.tipo, nivel: 1, obra: null });
        }
      }
    });
    ['cat_infantil', 'cat_cadete', 'ojeo_l1', 'prev1', 'fisico', 'fisio1', 'datos1', 'ropa', 'visitas'].forEach(n => {
      const a = GM.arbolInst.est(st, id);
      if (GM.arbolInst.nodo(n)) a.hechos[n] = st.fecha;
    });
    GM.arbolInst.construir(st, id, 'prev2');
  });
  const r = await p.evaluate(() => {
    GM.ui._.ui.tab.club = 'arbol';
    GM.ui.navegar('club');
    return document.body.innerText.length;
  });
  await sleep(900);
  await p.screenshot({ path: 'capturas/instalaciones/arbol.png', fullPage: true });
  const txt = await p.evaluate(() => document.body.innerText);
  chk(/Árbol de mejoras/.test(txt) && /Cantera \(/.test(txt) && /Centro médico \(/.test(txt) && /Analítica \(/.test(txt), 'la pestaña del árbol muestra las ramas');
  chk(/Proyecto y permisos|Obra, /.test(txt), 'hay una obra por fases en la lista');
  await p.evaluate(() => {
    GM.ui._.ui.tab.plantilla = 'entrenamiento';
    GM.ui.navegar('plantilla');
  });
  await sleep(800);
  await p.screenshot({ path: 'capturas/instalaciones/entrenamiento.png', fullPage: true });
  const t2 = await p.evaluate(() => document.body.innerText);
  chk(/Entrenamiento colectivo/.test(t2) && /Carga/.test(t2), 'la pestaña de entrenamiento carga');
  await p.evaluate(() => {
    const st = GM.state,
      j = st.equipos[st.clubId].plantilla.map(i => st.jugadores[i])[0];
    j.estado.carga = 80;
    GM.progresion.fijarIndividual(st, j.id, 'mentalidad', 2);
    GM.ui.navegar('plantilla');
  });
  await sleep(500);
  await p.evaluate(() => {
    const b = [...document.querySelectorAll('b')].find(
      x => /Decisivo|Atleta|Tirador|Defensor|Pasador|Rebotero|Líder|Resiliente|Frágil/.test(x.textContent) || x.style.cursor === 'pointer'
    );
    if (b) b.click();
  });
  await sleep(500);
  await p.screenshot({ path: 'capturas/instalaciones/ficha_jugador.png' });
  const mod = await p.evaluate(() => /Atributos ocultos/.test(document.body.innerText));
  chk(mod, 'la ficha del jugador se abre');
  await p.evaluate(() => {
    document.querySelector('.modal .cerrar, .modal button') && document.querySelector('.modal .cerrar, .modal button').click();
  });
  await p.evaluate(() => GM.sede.abrir(GM.state, 'deportiva'));
  await esperarEscena(p, 'deportiva', 120000);
  await sleep(1200);
  const piezas = await p.evaluate(() => {
    const S = GM.sede._estado();
    let n = 0;
    S.mundo.traverse(o => {
      if (o.isMesh && o.parent && o.parent.isGroup && o.parent.children.length > 1) n++;
    });
    return n;
  });
  chk(piezas > 10, 'el campus tiene piezas de mejoras: ' + piezas);
  await p.evaluate(() => {
    const S = GM.sede._estado(),
      z = S.zonas.find(z => /cantera|medico/.test(z.sala.id));
    if (z) S.yo.obj.position.set(z.obj.position.x, 0, z.obj.position.z + 4);
  });
  await sleep(900);
  await p.screenshot({ path: 'capturas/instalaciones/campus.png' });
  console.log(filas.join('\n'));
  console.log((ok ? 'ok' : 'FALLA') + ', errores: ' + (errs.length ? errs.slice(0, 4).join(' | ') : 'ninguno'));
  await b.close();
  process.exit(ok && !errs.length ? 0 : 1);
})();
