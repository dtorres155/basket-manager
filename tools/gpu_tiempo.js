// Tiempo real de dibujo por fotograma (ms, con gl.finish para esperar a la GPU) de la escena activa en cada nivel de calidad.
// Uso: node tools/gpu_tiempo.js [club] [escena] [niveles=medio,alto,ultra]   (requiere `npm run serve`)
// Compara con el presupuesto: Alto <= 16 ms (60 fps), sombras <= 3 ms. Imprime también las llamadas y triángulos.
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona',
  esc = process.argv[3] || 'calle',
  niveles = (process.argv[4] || 'medio,alto,ultra').split(',');
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  for (const nivel of niveles) {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await p.goto('http://localhost:8080/');
    await p.evaluate(n => {
      localStorage.setItem('gm1:nivel', n);
      window.__sinAdaptar = true;
    }, nivel);
    await p.reload();
    await sleep(700);
    await p.evaluate(
      ([c, e]) => {
        window.__sinAdaptar = true;
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
    await sleep(esc === 'calle' ? 15000 : 9000);
    const r = await p.evaluate(() => {
      const S = GM.sede._estado(),
        gl = S.renderer.getContext(),
        dibuja = () => (S.composer ? S.composer.render(0.016) : S.renderer.render(S.scene, S.camera));
      S.pausa = true;
      for (const l of [S.luces.sol, S.luces.sol2]) if (l) l.shadow.autoUpdate = true;
      const med = sombras => {
        for (const l of [S.luces.sol, S.luces.sol2]) if (l) l.castShadow = sombras;
        S.scene.traverse(o => {
          if (o.material)
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
              m.needsUpdate = true;
            });
        });
        for (let i = 0; i < 8; i++) dibuja();
        gl.finish();
        const t = performance.now();
        for (let i = 0; i < 40; i++) dibuja();
        gl.finish();
        return (performance.now() - t) / 40;
      };
      const con = med(true),
        sin = med(false),
        i = S.renderer.info.render;
      return {
        conSombras: +con.toFixed(2),
        sinSombras: +sin.toFixed(2),
        costeSombras: +(con - sin).toFixed(2),
        llamadas: i.calls,
        tri: i.triangles,
        composer: !!S.composer,
        calidad: GM.campus.config.nivel
      };
    });
    console.log(nivel.padEnd(6), esc, JSON.stringify(r));
    await p.context().close();
  }
  await b.close();
})();
