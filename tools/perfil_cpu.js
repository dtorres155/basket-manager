// Perfil de CPU (CDP) de una escena del mundo 3D con la CPU limitada: funciones con más tiempo propio. Uso: node tools/perfil_cpu.js [club] [escena] [x=4]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona',
  esc = process.argv[3] || 'calle',
  x = +(process.argv[4] || 4); // NIVEL=medio|alto|ultra para elegir la calidad
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    c = await b.newContext({ viewport: { width: 1280, height: 800 } }),
    p = await c.newPage();
  await p.addInitScript('window.__sinAdaptar = true;');
  await p.goto('http://localhost:8080/');
  if (process.env.NIVEL) {
    await p.evaluate(n => localStorage.setItem('gm1:nivel', n), process.env.NIVEL);
    await p.reload();
  }
  await sleep(700);
  await p.evaluate(
    ([c, e]) => {
      GM.newGame(c, undefined, {
        modo: 'carrera',
        personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'M', apellido: 'S' }),
        carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 }
      });
      GM.ui.start(document.getElementById('app'));
      GM.sede.abrir(GM.state, e);
    },
    [club, esc]
  );
  await sleep(esc === 'calle' ? 22000 : 14000);
  const cdp = await c.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: x });
  await sleep(500);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
  await cdp.send('Profiler.start');
  await sleep(5000);
  const { profile } = await cdp.send('Profiler.stop'),
    self = {},
    dt = profile.timeDeltas,
    byId = {};
  profile.nodes.forEach(n => {
    byId[n.id] = n;
  });
  profile.samples.forEach((id, i) => {
    const n = byId[id],
      k = (n.callFrame.functionName || '(anónima)') + ' ' + (n.callFrame.url.split('/').pop() || '') + ':' + n.callFrame.lineNumber;
    self[k] = (self[k] || 0) + (dt[i] || 0);
  });
  const tot = Object.values(self).reduce((a, b) => a + b, 0);
  Object.entries(self)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .forEach(([k, v]) => console.log(((v / tot) * 100).toFixed(1).padStart(5) + '%  ' + (v / 1000).toFixed(0).padStart(6) + ' ms  ' + k));
  await b.close();
})();
