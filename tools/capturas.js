// Capturas a 390x844 en un navegador real (Playwright + Edge del sistema).
// Uso: node tools/capturas.js [fase] [--lento]   (requiere `npm run serve` en marcha)
// --lento: simula un móvil de gama media (CPU x4) para medir fotogramas por segundo.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const fase = process.argv[2] || 'fase0', LENTO = process.argv.includes('--lento');
const DIR = path.join(__dirname, '..', 'capturas', fase); fs.mkdirSync(DIR, { recursive: true });
const URL = process.env.URL || 'http://localhost:8080/';
const log = [], perf = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ channel: process.env.CANAL || 'msedge', args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-ES' });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') log.push('[' + m.type() + '] ' + m.text()); });
  page.on('pageerror', e => log.push('[pageerror] ' + e.message));
  let n = 0;
  const shot = async (nombre) => { n++; const f = String(n).padStart(2, '0') + '_' + nombre + '.png'; await page.screenshot({ path: path.join(DIR, f) }); console.log('captura', f); };
  const clic = async (sel, txt) => { const ok = await page.evaluate(([s, t]) => { const b = [...document.querySelectorAll(s)].find(x => x.textContent.includes(t) && !x.disabled); if (b) { b.click(); return true; } return false; }, [sel, txt]); if (!ok) log.push('[script] no encontrado: ' + sel + ' "' + txt + '"'); await sleep(250); return ok; };
  const fps = async (escena, ms = 3000) => {
    const r = await page.evaluate(ms => new Promise(res => { let f = 0, t0 = performance.now(), peor = 0, prev = t0; function tick(t) { f++; peor = Math.max(peor, t - prev); prev = t; if (t - t0 < ms) requestAnimationFrame(tick); else res({ fps: f * 1000 / (t - t0), peor, mem: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null }); } requestAnimationFrame(tick); }), ms);
    perf.push(escena + ': ' + r.fps.toFixed(0) + ' fps, peor fotograma ' + r.peor.toFixed(0) + ' ms, heap ' + (r.mem ? r.mem.toFixed(0) + ' MB' : '?'));
  };
  const nav = async id => { await page.evaluate(id => GM.ui.navegar(id), id); await sleep(600); };
  const tabs = async () => page.evaluate(() => [...document.querySelectorAll('.cuerpo .tab')].map(b => b.textContent.trim()));
  // Recorre las pantallas de navegación y las pestañas de cada una
  const recorrer = async (pref, ids, tres) => {
    for (const id of ids) {
      await nav(id); await shot(pref + '_' + id);
      const largo = await page.evaluate(() => { const c = document.querySelector('.cuerpo'); return c ? c.scrollHeight > c.clientHeight + 40 : false; });
      if (largo) { await page.evaluate(() => { const c = document.querySelector('.cuerpo'); c.scrollTop = c.scrollHeight; }); await sleep(200); await shot(pref + '_' + id + '_abajo'); }
      if (tres[id]) for (const t of tres[id]) {
        if (!(await clic('.cuerpo .tab', t))) continue;
        await sleep(2500); await shot(pref + '_' + id + '_' + t.replace(/\W+/g, '').toLowerCase());
        if (await page.$('.cuerpo canvas')) await fps(pref + ' ' + id + ' ' + t);
      }
    }
  };
  const nueva = async (modoTxt, liga, clubTxt, extra) => {
    await page.goto(URL); await page.evaluate(() => { localStorage.clear(); }); await page.reload(); await sleep(800);
    await clic('button', 'Nueva partida'); await clic('.hoja .liga', modoTxt);
    await page.fill('.hoja input[placeholder="Nombre"]', 'Marc'); await page.fill('.hoja input[placeholder="Apellido"]', 'Soler');
    if (extra && extra.alCrear) await extra.alCrear();
    await clic('.hoja button', 'Continuar');
    if (extra && extra.carrera) await extra.carrera();
    if (liga) { await clic('.liga', liga); if (extra && extra.alListar) await extra.alListar(); await clic('.club', clubTxt); await clic('.hoja button', modoTxt.startsWith('Carrera') ? 'Empezar aquí' : 'Dirigir'); }
    if (extra && extra.pilares) { await page.evaluate(() => [...document.querySelectorAll('.hoja .item')].slice(0, 2).forEach(b => b.click())); await clic('.hoja button', 'Empezar'); }
    await sleep(2500);
  };

  if (LENTO) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }

  // 1) Menú, elección de modo y creación de personaje
  await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await sleep(1200);
  await shot('menu');
  await clic('button', 'Nueva partida'); await shot('modos');
  await clic('.hoja .liga', 'Director técnico'); await shot('personaje');
  await page.evaluate(() => { document.documentElement.setAttribute('data-tema', 'noche'); }); await sleep(200); await shot('personaje_oscuro');
  await page.evaluate(() => { document.documentElement.setAttribute('data-tema', 'dia'); });

  // 2) Director técnico (Joventut, ACB)
  await nueva('Director técnico', 'ACB', 'Joventut', { alListar: () => shot('elegir_club') });
  await recorrer('dt', ['inicio', 'plantilla', 'mercado', 'calendario', 'club', 'ciudad', 'finanzas'], { club: ['Ciudad deportiva', 'Estadio'], ciudad: ['Mapa 3D', 'Afición', 'Identidad', 'Mi casa'] });
  // Partido en directo: el próximo partido del club
  const hay = await page.evaluate(() => { const st = GM.state, g = st.calendario.find(x => !x.resultado && (x.local === st.clubId || x.visitante === st.clubId)); if (!g) return false; GM.mods.directo.abrir(st, g, { control: true, onFin: () => {} }); return true; });
  if (hay) { await sleep(3000); await shot('directo'); await fps('directo'); await sleep(8000); await shot('directo_avanzado'); }
  await page.evaluate(() => document.documentElement.setAttribute('data-tema', 'noche')); await page.goto(URL); await sleep(1500);
  await page.evaluate(() => { document.documentElement.setAttribute('data-tema', 'noche'); GM.ui.navegar('inicio'); }); await sleep(500); await shot('dt_inicio_oscuro');

  // 3) Presidente
  await nueva('Presidente', 'ACB', 'Joventut', { pilares: true });
  const navP = await page.evaluate(() => [...document.querySelectorAll('.nav .navb')].map(b => b.getAttribute('data-id')));
  await recorrer('pres', navP, {});

  // 4) Entrenador
  await nueva('Entrenador', 'ACB', 'Joventut');
  await recorrer('entr', ['inicio', 'plantilla', 'junta', 'calendario', 'ciudad', 'trayectoria'], { ciudad: ['Mi casa'] });

  // 5) Carrera desde cadete (Joventut)
  await nueva('Carrera de jugador', 'ACB', 'Joventut', { carrera: async () => { await shot('carrera_opciones'); await clic('.hoja .item', 'Cadete'); await clic('.hoja button', 'Continuar'); } });
  await recorrer('car', ['inicio', 'jugador', 'agente', 'plantilla', 'ciudad', 'calendario', 'trayectoria'], { ciudad: ['Mapa 3D', 'Mi casa', 'Mi pueblo', 'Vivienda', 'Estilo de vida', 'Vida social'] });

  // 6) Carrera en liga europea (ya con casa propia): casa con sus vistas
  await nueva('Carrera de jugador', 'ACB', 'Joventut', { carrera: async () => { await clic('.hoja .item', 'Liga europea'); await clic('.hoja button', 'Continuar'); } });
  await nav('ciudad'); await clic('.cuerpo .tab', 'Mi casa'); await sleep(2500); await shot('eur_casa');
  const vistas = await page.evaluate(() => [...document.querySelectorAll('.cuerpo button')].map(b => b.textContent.trim()).filter(t => t && t.length < 30));
  log.push('[info] botones en Mi casa: ' + vistas.join(' | '));
  for (const v of ['Fuera', 'Exterior', 'Edificio', 'Dentro', 'Interior', 'Habitaciones']) if (vistas.includes(v)) { await clic('.cuerpo button', v); await sleep(2000); await shot('eur_casa_' + v.toLowerCase()); await fps('casa ' + v); }
  await clic('.cuerpo .tab', 'Mi pueblo'); await sleep(2500); await shot('eur_pueblo'); if (await page.$('.cuerpo canvas')) await fps('pueblo');

  fs.writeFileSync(path.join(DIR, 'consola.txt'), log.join('\n') + '\n');
  fs.writeFileSync(path.join(DIR, 'rendimiento.txt'), (LENTO ? 'CPU x4\n' : 'CPU normal\n') + perf.join('\n') + '\n');
  console.log('\n--- consola ---\n' + log.join('\n') + '\n--- rendimiento ---\n' + perf.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
