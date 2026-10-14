// Reproduce errores al acabar la primera temporada en modo carrera: juega días hasta pasar de temporada y pinta Inicio en cada paso, mostrando la pila de la excepción.
// Uso: node tools/error_temporada.js [club] [origen]
const { chromium } = require('playwright'); const { sleep } = require('./ayudas');
(async () => {
  const club = process.argv[2] || 'utah-jazz', origen = process.argv[3] || 'europa', b = await chromium.launch({ channel: 'msedge' }), p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message + '\n' + e.stack)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 600)); });
  await p.goto('http://localhost:8080/'); await sleep(700);
  const r = await p.evaluate(async ([club, origen]) => {
    const pj = GM.mods.personaje.crear(); pj.nombre = 'johannes'; pj.apellido = 'mbouma'; GM.newGame(club, undefined, { modo: 'carrera', personaje: pj, carrera: { pos: 'PF', perfil: 'rebotero', nac: 'US', origen, agente: 'equilibrado', clubId: club } }); GM.ui.start(document.getElementById('app'));
    const st = GM.state; let i = 0, t0 = st.temporada, fallo = null;
    while (i++ < 420) { try { GM.ui.jugarUnDia(); } catch (e) { fallo = { dia: i, fecha: st.fecha, e: e.stack }; break; }
      const err = document.querySelector('.err, .error'); const txt = document.body.innerText; if (/Error al mostrar la pantalla/.test(txt)) { fallo = { dia: i, fecha: st.fecha, pantalla: txt.match(/Error al mostrar la pantalla[^\n]*/)[0] }; break; }
      if (st.temporada !== t0 && i > 5) { i = 999; } }
    // el torneo de selecciones de verano guarda su campeón como «pais:XX»: Inicio al acabar la temporada no debe fallar
    st.historial.push({ temporada: st.temporada, comp: 'MUNDIAL', campeon: 'pais:ES' }); st.temporadaTerminada = true; GM.ui.refrescar(); const txt2 = document.body.innerText, falla = /Error al mostrar la pantalla.*/.exec(txt2), cronica = /Mundial: .*/.exec(txt2);
    return { fecha: st.fecha, temporada: st.temporada, fase: st.carrera && st.carrera.fase, fallo, errorInicio: falla && falla[0], cronica: cronica && cronica[0] };
  }, [club, origen]);
  console.log(JSON.stringify(r, null, 1)); console.log(errs.slice(0, 3).join('\n---\n') || 'sin errores de consola'); await b.close();
})();
