// Informe de rendimiento por escena y nivel de calidad (punto 17 de la hoja de ruta): tiempo de construcción, CPU por fotograma (script, con CPU x1 y x4),
// fotogramas por segundo, GPU de dibujo (gl.finish) con y sin sombras, llamadas, triángulos y memoria de texturas. Escribe docs/RENDIMIENTO.md y capturas/rendimiento.json.
// Uso: node tools/informe_rendimiento.js [club=joventut-badalona] [--rapido]   (requiere `npm run serve`; tarda unos 10 minutos)
const { chromium } = require('playwright');
const fs = require('fs'),
  path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) || 'joventut-badalona',
  rapido = process.argv.includes('--rapido');
const ESCENAS = [
    ['calle', 'calle'],
    ['pueblo', 'pueblo'],
    ['sede', 'sede'],
    ['interior:pabellon', 'pabellón']
  ],
  NIVELES = rapido ? ['alto'] : ['medio', 'alto', 'ultra'];
const metricas = async cdp => {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const o = {};
  metrics.forEach(m => {
    o[m.name] = m.value;
  });
  return o;
};
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    filas = [];
  for (const [esc, nombreEsc] of ESCENAS)
    for (const nivel of NIVELES) {
      if (nivel === 'ultra' && esc !== 'calle') continue;
      const c = await b.newContext({ viewport: { width: 1280, height: 800 } }),
        p = await c.newPage(),
        errs = [];
      p.on('pageerror', e => errs.push(e.message));
      await p.addInitScript('window.__sinAdaptar = true;');
      await p.goto('http://localhost:8080/');
      await p.evaluate(n => localStorage.setItem('gm1:nivel', n), nivel);
      await p.reload();
      await sleep(900);
      const t0 = Date.now();
      await p.evaluate(
        ([c, e]) => {
          GM.newGame(c, undefined, {
            modo: 'carrera',
            personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'M', apellido: 'S' }),
            carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 }
          });
          GM.ui.start(document.getElementById('app'));
          window.__t0 = performance.now();
          GM.sede.abrir(GM.state, e.indexOf(':') > 0 ? 'calle' : e);
        },
        [club, esc]
      );
      const listo = async () => {
        for (let i = 0; i < 120; i++) {
          const ok = await p
            .evaluate(() => {
              const S = GM.sede.activa() && GM.sede._estado();
              return !!(S && S.yo && S.gente && S.gente.length > 0 && !document.querySelector('.sede-cargando'));
            })
            .catch(() => false);
          if (ok) return;
          await sleep(500);
        }
      };
      await listo();
      if (esc.indexOf(':') > 0) {
        await p.evaluate(e => GM.sede._escena(e), esc);
        await sleep(7000);
        await listo();
      }
      const construccion = Date.now() - t0 - 900;
      await sleep(10000);
      const cdp = await c.newCDPSession(p);
      await cdp.send('Performance.enable');
      const medir = async x => {
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: x });
        await sleep(1200);
        const m0 = await metricas(cdp);
        const fps = await p.evaluate(
          () =>
            new Promise(r => {
              let n = 0;
              const t = performance.now();
              (function f() {
                n++;
                if (performance.now() - t > 4000) r(n / 4);
                else requestAnimationFrame(f);
              })();
            })
        );
        const m1 = await metricas(cdp);
        const fr = fps * 4 || 1;
        return {
          fps: +fps.toFixed(0),
          scriptMs: +(((m1.ScriptDuration - m0.ScriptDuration) * 1000) / fr).toFixed(2),
          tareaMs: +(((m1.TaskDuration - m0.TaskDuration) * 1000) / fr).toFixed(2)
        };
      };
      const x1 = await medir(1),
        x4 = await medir(4);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await sleep(500);
      const g = await p.evaluate(() => {
        const S = GM.sede._estado(),
          gl = S.renderer.getContext(),
          dibuja = () => (S.composer ? S.composer.render(0.016) : S.renderer.render(S.scene, S.camera));
        S.pausa = true;
        const med = so => {
          for (const l of [S.luces.sol, S.luces.sol2])
            if (l) {
              l.castShadow = so;
              l.shadow.autoUpdate = true;
            }
          S.scene.traverse(o => {
            if (o.material)
              (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
                m.needsUpdate = true;
              });
          });
          for (let i = 0; i < 6; i++) dibuja();
          gl.finish();
          const t = performance.now();
          for (let i = 0; i < 30; i++) dibuja();
          gl.finish();
          return (performance.now() - t) / 30;
        };
        const con = S.renderer.shadowMap.enabled ? med(true) : null;
        for (const l of [S.luces.sol, S.luces.sol2]) if (l) l.castShadow = S.renderer.shadowMap.enabled;
        const inf = S.renderer.info;
        inf.autoReset = false;
        inf.reset();
        dibuja();
        const r = { calls: inf.render.calls, triangles: inf.render.triangles };
        inf.autoReset = true;
        const sin = med(false);
        const vistas = new Set();
        let tex = 0,
          nodos = 0;
        const sumar = t => {
          if (!t || vistas.has(t.uuid)) return;
          vistas.add(t.uuid);
          if (t.isCompressedTexture && t.mipmaps)
            t.mipmaps.forEach(m => {
              tex += m.data ? m.data.byteLength : 0;
            });
          else tex += (t.image ? (t.image.width || 0) * (t.image.height || 0) : 0) * 4 * 1.33;
        };
        S.scene.traverse(o => {
          nodos++;
          (o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []).forEach(m => ['map', 'normalMap', 'roughnessMap', 'emissiveMap'].forEach(k => sumar(m[k])));
        });
        if (GM.texturas && GM.texturas._TX)
          Object.values(GM.texturas._TX).forEach(T => {
            sumar(T.c);
            sumar(T.n);
            sumar(T.r);
          });
        return {
          llamadas: r.calls,
          tri: r.triangles,
          gpuConSombras: con == null ? null : +con.toFixed(1),
          gpuSinSombras: +sin.toFixed(1),
          nodos,
          texMB: +(tex / 1048576).toFixed(0),
          gente: S.gente.length
        };
      });
      filas.push(Object.assign({ escena: nombreEsc, nivel, construccionMs: construccion, x1, x4, errores: errs.length }, g));
      console.log(nombreEsc.padEnd(9), nivel.padEnd(6), 'construcción', construccion, 'ms | x1', JSON.stringify(x1), '| x4', JSON.stringify(x4), '|', JSON.stringify(g));
      await c.close();
    }
  await b.close();
  fs.mkdirSync(path.join(__dirname, '..', 'capturas'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '..', 'capturas', 'rendimiento.json'), JSON.stringify(filas, null, 1));
  const fecha = new Date().toISOString().slice(0, 10),
    pad = (v, n) => String(v == null ? '-' : v).padEnd(n);
  let md =
    '# Rendimiento por escena y nivel de calidad\n\nMedido el ' +
    fecha +
    ' con `node tools/informe_rendimiento.js` en una Intel Iris Xe (1280x800, ciudad ' +
    club +
    '). «CPU» es el tiempo de JavaScript por fotograma (ScriptDuration de CDP); «x4» es con la CPU frenada cuatro veces (proxy de un móvil). «GPU» es el tiempo de dibujo esperando a la tarjeta (gl.finish); las sombras se miden forzando su actualización en cada fotograma (en el juego van a ritmo reducido). Los presupuestos están en `docs/PRESUPUESTOS.md`.\n\n| Escena | Nivel | Construcción (s) | fps x1 | CPU x1 (ms) | fps x4 | CPU x4 (ms) | GPU con sombras (ms) | GPU sin sombras (ms) | Llamadas | Triángulos | Nodos | Texturas (MB) | Gente |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
  filas.forEach(f => {
    md +=
      '| ' +
      [
        f.escena,
        f.nivel,
        (f.construccionMs / 1000).toFixed(1),
        f.x1.fps,
        f.x1.scriptMs,
        f.x4.fps,
        f.x4.scriptMs,
        f.gpuConSombras,
        f.gpuSinSombras,
        f.llamadas,
        Math.round(f.tri / 1000) + ' k',
        f.nodos,
        f.texMB,
        f.gente
      ].join(' | ') +
      ' |\n';
  });
  md +=
    '\nLectura: el cuello de botella de cada fila es el mayor entre CPU y GPU respecto a 16,7 ms (60 fps) o 33 ms (30 fps). Con la CPU a x4 el tiempo de script se multiplica; si supera 33 ms el juego baja de 30 fps en un móvil de gama media.\n';
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'RENDIMIENTO.md'), md);
  console.log('\n' + md);
})();
