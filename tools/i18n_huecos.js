// Lista los textos cortos de pantalla que siguen en español con el idioma elegido (para ampliar i18n_datos.js). Uso: node tools/i18n_huecos.js [ca|en]
const { chromium } = require('playwright');
const { sleep } = require('./ayudas');
(async () => {
  const idi = process.argv[2] || 'ca',
    b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1000, height: 900 } })).newPage();
  await p.goto('http://localhost:8080/');
  await sleep(700);
  const cuenta = {};
  for (const modo of ['gestor', 'carrera']) {
    await p.evaluate(m => {
      const pj = GM.mods.personaje.crear();
      pj.nombre = 'Marc';
      GM.newGame(
        'joventut-badalona',
        11,
        m === 'carrera'
          ? { modo: m, personaje: pj, carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: 'joventut-badalona' } }
          : { modo: m, personaje: pj }
      );
      GM.ui.start(document.getElementById('app'));
      GM.i18n.setIdioma('es');
    }, modo);
    const pantallas = await p.evaluate(() => GM.ui._.NAV_ACTUAL().map(n => n[0]));
    for (const pa of pantallas) {
      const tabs = await p.evaluate(a => {
        GM.ui.navegar(a);
        return [...document.querySelectorAll('.tabs .tab')].map(t => t.textContent);
      }, pa);
      await sleep(250);
      for (let i = -1; i < tabs.length; i++) {
        if (i >= 0)
          await p.evaluate(
            ([a, n]) => {
              [...document.querySelectorAll('.tabs .tab')][n].click();
            },
            [pa, i]
          );
        await sleep(250);
        const t = await p.evaluate(() => {
          const o = [];
          const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let n;
          while ((n = w.nextNode())) {
            const v = n.nodeValue.trim();
            if (v.length > 2 && v.length < 70 && /[a-záéíóúñ]{3}/i.test(v) && !/^[\d\s.,%€+\-–:/()]+$/.test(v)) o.push(v);
          }
          return o;
        });
        const trad = await p.evaluate(
          ([l, ts]) =>
            ts
              .filter(s => {
                const a = GM.i18n.idioma;
                return true;
              })
              .map(s => s),
          [idi, t]
        );
        const sin = await p.evaluate(
          async ([l, ts]) => {
            const out = [];
            GM.i18n.setIdioma(l);
            ts.forEach(s => {
              if (GM.i18n.t(s) === s) out.push(s);
            });
            GM.i18n.setIdioma('es');
            return out;
          },
          [idi, t]
        );
        sin.forEach(s => {
          cuenta[s] = (cuenta[s] || 0) + 1;
        });
      }
    }
  }
  const l = Object.entries(cuenta).sort((a, b) => b[1] - a[1]);
  console.log(l.length + ' textos sin traducir');
  console.log(
    l
      .slice(0, 250)
      .map(x => x[1] + ' ' + x[0])
      .join('\n')
  );
  await b.close();
})();
