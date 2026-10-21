// Calendario de la ciudad (punto 42): busca un día de cada evento (fiestas patronales, maratón, concierto, manifestación, festivo, domingo) y los saca a su hora. Uso: node tools/ciudad_dia_prueba.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona',
  DIR = path.join(__dirname, '..', 'capturas', 'ciudad_dia');
fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error') errs.push(m.text());
  });
  await p.goto('http://localhost:8080/');
  await sleep(800);
  const fechas = await p.evaluate(c => {
    GM.newGame(c);
    const st = GM.state,
      out = {};
    for (let d = 0; d < 400; d++) {
      const f = GM.util.addDays('2026-10-01', d);
      st.fecha = f;
      const H = GM.ciudadDia.hoy(st);
      H.eventos.forEach(e => {
        if (e.id !== 'mercadillo' && !out[e.id + (e.ultimo ? '_fin' : '')]) out[e.id + (e.ultimo ? '_fin' : '')] = [f, e.h0, e.h1, e.nombre];
      });
      if (H.festivo && !out.festivo) out.festivo = [f, 11, 12, H.festivo.nombre];
    }
    return out;
  }, club);
  console.log(JSON.stringify(fechas));
  for (const [k, [f, h0, h1, nom]] of Object.entries(fechas)) {
    if (!['patronal_fin', 'maraton', 'concierto', 'manifestacion', 'festivo'].includes(k)) continue;
    await p.evaluate(
      ([c, f]) => {
        GM.newGame(c, undefined, {
          modo: 'carrera',
          personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'M', apellido: 'S' }),
          carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 }
        });
        GM.state.fecha = f;
        GM.ui.start(document.getElementById('app'));
        GM.sede.abrir(GM.state, 'calle');
      },
      [club, f]
    );
    await sleep(17000);
    const info = await p.evaluate(
      ([h0, h1]) => {
        const S = GM.sede._estado();
        GM.sede._clima('sol');
        S.hora = Math.min(h1 - 0.3, h0 + 0.5);
        const ev = S.eventosHoy || [];
        return {
          eventos: ev.map(e => e.e.id + ' gente ' + (e.gente.length + (e.corredores ? e.corredores.length : 0))),
          festivo: S.festivo && S.festivo.nombre,
          chip: S.chipDia && S.chipDia.textContent,
          tiendasCerradas: (S.tiendas || []).filter(t => t.pr.visible).length + '/' + (S.tiendas || []).length
        };
      },
      [h0, h1]
    );
    await sleep(2500);
    console.log(k, f, JSON.stringify(info));
    const foco = await p.evaluate(() => {
      const S = GM.sede._estado(),
        ev = (S.eventosHoy || [])[0];
      if (!ev) return null;
      let x, z;
      if (ev.corredores && ev.via) {
        const q = S.punto(ev.via, ev.corredores[0].s === undefined ? ev.corredores[0].s0 : ev.corredores[0].s);
        x = q[0];
        z = q[1];
      } else {
        const q = (S.plazas || [])[0];
        x = q ? q[0] : 0;
        z = q ? q[1] : 0;
      }
      return [x, z];
    });
    if (foco) {
      await p.evaluate(([x, z]) => {
        const S = GM.sede._estado();
        S.foco.set(x, 0, z);
        S.yo.obj.position.set(x + 6, 0, z + 6);
        S.zoom = 30;
      }, foco);
      await sleep(3500);
    }
    await p.screenshot({ path: path.join(DIR, k + '.png') });
  }
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
