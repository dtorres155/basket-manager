// Pantallas nuevas de la temporada: pretemporada, All-Star, rivalidades, ojeadores, negociación, rival y cuerpo técnico, prensa y la ciudad que crece.
// Uso: node tools/temporada_ui.js   (requiere `npm run serve`). Capturas en capturas/temporada_ui/.
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'temporada_ui'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }); let mal = 0;
  const caso = async (modo, club, pasos) => {
    const p = await (await b.newContext({ viewport: { width: 430, height: 900 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('http://localhost:8080/'); await sleep(700);
    await p.evaluate(([modo, club]) => { const o = modo === 'carrera' ? { modo, personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }), carrera: { origen: 'europa', clubId: club, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 22 } } : { modo, personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) }; GM.newGame(club, undefined, o); GM.ui.start(document.getElementById('app')); }, [modo, club]);
    await sleep(1500);
    const nav = t => p.evaluate(t => { const b = [...document.querySelectorAll('.navb')].find(x => x.textContent.trim() === t); if (b) b.click(); return !!b; }, t);
    const tab = t => p.evaluate(t => { const b = [...document.querySelectorAll('.tabs .tab')].find(x => x.textContent.trim() === t); if (b) b.click(); return !!b; }, t);
    const clic = t => p.evaluate(t => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith(t) && !x.disabled); if (b) b.click(); return !!b; }, t);
    const cuerpo = () => p.evaluate(() => document.querySelector('main, .main, #app').innerText.length);
    const mira = async (nombre, fn) => { const r = await fn({ nav, tab, clic, p, sleep }); await sleep(500); const len = await cuerpo(); if (r === false) { console.log('  sin', nombre); mal++; } await p.screenshot({ path: path.join(DIR, modo + '_' + nombre + '.png') }); return len; };
    for (const [n, fn] of pasos) await mira(n, fn);
    if (errs.length) { console.log(modo, 'ERRORES', errs.slice(0, 4)); mal++; } else console.log(modo, 'sin errores');
    await p.close();
  };
  const cal = (t, nombre) => [nombre, async x => { await x.nav('Calendario'); await sleep(500); return x.tab(t); }];
  await caso('gestor', 'joventut-badalona', [
    cal('Pretemporada', 'pretemporada'), cal('All-Star', 'allstar'), cal('Rivalidades', 'rivalidades'),
    ['ojeadores', async x => { await x.nav('Mercado'); await sleep(400); const ok = await x.tab('Ojeadores'); await sleep(400); await x.clic('Contratar'); await sleep(400); await x.p.evaluate(() => { const s = document.querySelector('select.sel'); if (s) { s.value = 'ACB'; s.dispatchEvent(new Event('change')); } }); return ok; }],
    ['negociar', async x => { await x.nav('Mercado'); await sleep(400); await x.tab('Libres'); await sleep(400); await x.p.evaluate(() => { const b = document.querySelector('.jug'); if (b) b.click(); }); await sleep(600); const ok = await x.clic('Ofrecer contrato') || await x.clic('Negociar'); await sleep(600); await x.clic('Proponer'); return ok; }],
    ['tactica', async x => { await x.nav('Plantilla'); await sleep(400); return x.tab('Táctica'); }],
    ['rival', async x => { await x.nav('Plantilla'); await sleep(400); return x.tab('Rival'); }], ['staff', async x => { await x.nav('Plantilla'); await sleep(400); const ok = await x.tab('Cuerpo técnico'); await x.clic('Contratar o mejorar'); return ok; }],
    ['prensa', async x => { await x.nav('Club'); await sleep(400); return x.tab('Prensa'); }], ['ciudad_crece', async x => { await x.nav('Ciudad'); await sleep(400); return x.tab('La ciudad crece'); }]
  ]);
  await caso('presidente', 'fc-barcelona', [cal('Pretemporada', 'pretemporada'), ['ojeadores', async x => { await x.nav('Plantilla'); return true; }], ['prensa', async x => { await x.nav('Club'); await sleep(400); return x.tab('Prensa'); }], ['ciudad_crece', async x => { await x.nav('Ciudad'); await sleep(400); return x.tab('La ciudad crece'); }]]);
  await caso('entrenador', 'unicaja', [cal('Rivalidades', 'rivalidades'), ['rival', async x => { await x.nav('Plantilla'); await sleep(400); return x.tab('Rival'); }], ['junta', async x => { await x.nav('Directiva'); return true; }], ['ciudad_crece', async x => { await x.nav('Casa'); await sleep(400); return x.tab('La ciudad crece'); }]]);
  await caso('carrera', 'real-madrid', [cal('All-Star', 'allstar'), cal('Pretemporada', 'pretemporada'), ['trayectoria', async x => { await x.nav('Carrera'); return true; }], ['ciudad_crece', async x => { await x.nav('Ciudad'); await sleep(400); return x.tab('La ciudad crece'); }]]);
  await b.close(); console.log(mal ? 'FALLOS ' + mal : 'pantallas de la temporada correctas');
})();
