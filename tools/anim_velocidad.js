// Velocidad real de los clips de andar y correr (punto 26): en la fase de apoyo el pie va hacia atrás a la velocidad a la que se mueve el cuerpo. Uso: node tools/anim_velocidad.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 800, height: 600 } })).newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8080/');
  await sleep(800);
  const r = await p.evaluate(async () => {
    const out = {};
    const q = await GM.sede.personaje({ modelo: 'h-casual_2', altura: 180, piel: '#e0ac85', pelo: '#3b2617', ropa: ['#2d6a4f', '#333'] });
    const esc = q.obj.scale.x;
    for (const nm of ['walk', 'sprint']) {
      const a = q.acc[nm];
      a.reset().play();
      const c = a.getClip(),
        d = c.duration,
        n = 60,
        zs = [],
        ys = [];
      const pie = q.huesos.FootL,
        v = new THREE.Vector3(),
        root = q.obj;
      for (let i = 0; i <= n; i++) {
        a.time = (d * i) / n;
        q.mixer.update(0);
        root.updateMatrixWorld(true);
        pie.getWorldPosition(v);
        zs.push(v.z);
        ys.push(v.y);
      }
      const vel = [];
      for (let i = 1; i <= n; i++) {
        const dz = (zs[i] - zs[i - 1]) / (d / n);
        vel.push([ys[i], dz]);
      }
      const bajos = vel
        .filter(x => x[0] < Math.min(...ys) + 0.025)
        .map(x => -x[1])
        .sort((x, y) => x - y);
      out[nm] = {
        dur: +d.toFixed(3),
        apoyoMediana: +bajos[bajos.length >> 1].toFixed(2),
        max: +bajos[bajos.length - 1].toFixed(2),
        q75: +bajos[Math.floor(bajos.length * 0.75)].toFixed(2),
        n: bajos.length,
        escala: esc
      };
    }
    return out;
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
