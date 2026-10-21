// Estimación de la memoria de texturas en GPU de la escena activa (suma de las texturas únicas de los materiales; comprimidas: tamaño real de sus mipmaps; el resto: ancho x alto x 4 bytes x 1,33).
// Uso: node tools/memoria_gpu.js [club] [escena]   (requiere `npm run serve`; compara KTX2 con JPG)
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona',
  esc = process.argv[3] || 'calle';
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  for (const [nombre, pre] of [
    ['KTX2', ''],
    ['JPG', 'window.__sinKTX2 = true;']
  ]) {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await p.addInitScript(pre + 'window.__sinAdaptar = true;');
    await p.goto('http://localhost:8080/');
    await sleep(800);
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
    await sleep(esc === 'calle' ? 15000 : 9000);
    const r = await p.evaluate(() => {
      const S = GM.sede._estado(),
        vistas = new Set();
      let total = 0,
        comp = 0,
        n = 0,
        nc = 0;
      const claves = ['map', 'normalMap', 'roughnessMap', 'emissiveMap', 'aoMap', 'metalnessMap', 'alphaMap', 'bumpMap'];
      const sumar = t => {
        if (!t || vistas.has(t.uuid)) return;
        vistas.add(t.uuid);
        n++;
        let b = 0;
        if (t.isCompressedTexture && t.mipmaps && t.mipmaps.length) {
          t.mipmaps.forEach(m => {
            b += m.data ? m.data.byteLength : 0;
          });
          comp += b;
          nc++;
        } else {
          const im = t.image,
            w = im && (im.width || 0),
            h = im && (im.height || 0);
          b = w * h * 4 * (t.generateMipmaps === false ? 1 : 1.33);
        }
        total += b;
      };
      S.scene.traverse(o => {
        const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        ms.forEach(m => claves.forEach(k => sumar(m[k])));
      });
      Object.values(GM.texturas._TX).forEach(T => {
        sumar(T.c);
        sumar(T.n);
        sumar(T.r);
      }); // las texturas de suelos y fachadas van como uniformes del shader, no como mapas del material
      return { texturas: n, comprimidas: nc, totalMB: +(total / 1048576).toFixed(1), comprimidasMB: +(comp / 1048576).toFixed(1) };
    });
    console.log(nombre.padEnd(5), JSON.stringify(r));
    await p.context().close();
  }
  await b.close();
})();
