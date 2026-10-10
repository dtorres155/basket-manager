/* JUEGO EN EL PUEBLO (GM.puebloJuego) — encargos, minijuegos y fiesta mayor (modo carrera)
   - Encargos del pueblo (state.carrera.pueblo.encargos): hasta tres semanales y uno diario con plazo, premio (cariño, reputación, ánimo,
     dinero) y marca en el mapa (anillo dorado en la zona del edificio). Tipos: visitar un edificio, ganar el concurso de triples,
     ganar un uno contra uno, o llegar a una puntuación en los tiros libres.
   - Minijuegos con un cursor de precisión (se pulsa «Tirar» o la barra espaciadora cuando pasa por la zona verde; su tamaño depende
     de tu atributo): concurso de triples de la plaza (10 tiros), tiros libres con la canasta y uno contra uno con los chavales
     (primero a 5; mezcla tu media, tu forma y la suerte; el cursor decide el tiro).
   - Fiesta mayor (14-16 de agosto y 8 de diciembre): guirnaldas de banderines, farolillos y fuegos artificiales de noche.
   Expone: encargos(st), generar(st), acciones(st, tipo), panelEncargos(), triples(st), unoContraUno(st), esFiesta(st), fuegos(S, W). */
(function () {
  const U = GM.util, T = THREE;
  const C = st => st.carrera, P = st => st.carrera && st.carrera.pueblo;
  const act = st => st && st.modo === 'carrera' && !!P(st);
  const NOM = { canasta: 'la canasta de la plaza', bar: 'el bar de la peña', escuela: 'la escuela', biblioteca: 'la biblioteca', tienda: 'la tienda de deportes', plaza: 'la plaza mayor', parque: 'el parque', panaderia: 'la panadería', cine: 'el cine', centrodia: 'el centro de día', casapadres: 'la casa de tus padres', polideportivo: 'el polideportivo', taller: 'el taller', restaurantep: 'el restaurante', hotel: 'el hotel', ambulatorio: 'el centro de salud', industrial: 'el polígono' };
  const fmt = k => GM.mods.pueblo ? GM.mods.pueblo.fmtK(k) : k + ' mil €';

  // ---------- Encargos ----------
  function lista(st) { const p = P(st); return p.encargos || (p.encargos = []); }
  function nuevo(st, diario, usados) {
    const p = P(st), eds = GM.mods.pueblo.edificios(st).filter(b => b.nivel && NOM[b.tipo]), h = U.hash(st.fecha + (diario ? 'd' : 'w') + usados.length) >>> 0, k = h % 4, nv = GM.mods.pueblo.nivel(st);
    const pr = (c, f, m, d) => ({ cariño: c, fama: f, moral: m, dinero: Math.round(d * (1 + nv * 0.5)) });
    if (k === 1 && st.jugadores.yo) return { tipo: 'triples', n: 4 + (h >>> 3) % 3, texto: 'Mete ' + (4 + (h >>> 3) % 3) + ' triples de 10 en el concurso de la plaza', premio: pr(5, 0.4, 4, 2) };
    if (k === 2) return { tipo: 'uno', texto: 'Gana un uno contra uno a los chavales de la canasta', premio: pr(4, 0.3, 5, 1) };
    if (k === 3 && eds.length > 1) { const b = eds[(h >>> 5) % eds.length]; if (!usados.some(u => u.tipo === 'visitar' && u.edificio === b.tipo)) return { tipo: 'visitar', edificio: b.tipo, texto: 'Pasa por ' + NOM[b.tipo] + ' a saludar', premio: pr(3, 0.2, 3, 1) }; }
    return { tipo: 'libres', n: 7 + (h >>> 7) % 2, texto: 'Anota ' + (7 + (h >>> 7) % 2) + ' de 10 tiros libres en la canasta', premio: pr(3, 0.2, 3, 1) };
  }
  function generar(st) {
    if (!act(st)) return; const L = lista(st), hoy = st.fecha;
    for (let i = L.length - 1; i >= 0; i--) if (L[i].hasta < hoy && !L[i].hecho) { const e = L.splice(i, 1)[0]; P(st).cariño = U.clamp(P(st).cariño - 1, 0, 100); GM.noticia && GM.noticia(st, 'Se te pasó el plazo de un encargo del pueblo: ' + e.texto.toLowerCase() + '.'); } else if (L[i].hecho && L[i].hasta < hoy) L.splice(i, 1);
    const sem = L.filter(e => !e.diario && !e.hecho), dia = L.filter(e => e.diario && !e.hecho);
    while (sem.length < 3) { const e = nuevo(st, false, L); e.id = 'e' + (++P(st).encSeq || (P(st).encSeq = 1)); e.hasta = U.addDays(hoy, 7); L.push(e); sem.push(e); }
    if (!dia.length) { const e = nuevo(st, true, L); e.id = 'e' + (++P(st).encSeq); e.diario = true; e.hasta = U.addDays(hoy, 1); L.push(e); }
  }
  function cobrar(st, e) {
    const c = C(st), p = P(st), pr = e.premio; e.hecho = true; p.cariño = U.clamp(p.cariño + pr.cariño, 0, 100); c.fama = c.fama + pr.fama; c.moral = U.clamp(c.moral + pr.moral, 0, 100); c.dinero += pr.dinero;
    GM.noticia && GM.noticia(st, 'Encargo cumplido en ' + p.nombre + ': ' + e.texto.toLowerCase() + '. Cariño +' + pr.cariño + (pr.dinero ? ', ' + fmt(pr.dinero) : '') + '.');
    if (GM.ui && GM.ui.toast) GM.ui.toast('Encargo cumplido: ' + e.texto);
  }
  function completa(st, f) { if (!act(st)) return; lista(st).forEach(e => { if (!e.hecho && f(e)) cobrar(st, e); }); }
  GM.bus.on('sala:abierta', ({ id }) => { const st = GM.state; if (!act(st) || !id) return; const m = /^pueblo_(.+)$/.exec(id); if (m) completa(st, e => e.tipo === 'visitar' && e.edificio === m[1]); });
  GM.bus.on('dia:avanzado', () => { const st = GM.state; if (act(st)) generar(st); });
  GM.bus.on('partida:cargada', () => { const st = GM.state; if (act(st)) generar(st); });

  // ---------- Cursor de precisión ----------
  // Devuelve una promesa con true/false. zona: fracción de la barra que cuenta (0.12 a 0.5); vel: vueltas por segundo
  function cursor(cont, zona, vel, etiqueta) {
    return new Promise(res => {
      const h = GM.h, barra = h('div', { class: 'jg-barra' }), verde = h('div', { class: 'jg-zona' }), aguja = h('div', { class: 'jg-aguja' }); barra.append(verde, aguja);
      const x0 = 0.1 + Math.random() * (0.8 - zona); verde.style.left = x0 * 100 + '%'; verde.style.width = zona * 100 + '%';
      const btn = h('button', { class: 'pb-cta' }, etiqueta || 'Tirar'); cont.append(barra, btn);
      let t0 = performance.now(), vivo = true, pos = 0;
      const fin = () => { if (!vivo) return; vivo = false; document.removeEventListener('keydown', tecla); barra.remove(); btn.remove(); res(pos >= x0 && pos <= x0 + zona); };
      const tecla = e => { if (e.code === 'Space') { e.preventDefault(); fin(); } };
      document.addEventListener('keydown', tecla); btn.addEventListener('click', fin);
      (function paso() { if (!vivo) return; const k = ((performance.now() - t0) / 1000 * vel) % 2; pos = k < 1 ? k : 2 - k; aguja.style.left = pos * 100 + '%'; requestAnimationFrame(paso); })();
    });
  }
  function ventana(titulo) {
    const h = GM.h, cont = h('div', { class: 'jg' }), cab = h('div', { class: 'jg-cab' }, h('b', null, titulo)), marcador = h('div', { class: 'jg-marc' }), msg = h('div', { class: 'jg-msg' }), zona = h('div', { class: 'jg-zonaBtn' });
    cont.append(cab, marcador, msg, zona); let cerrar = null; const cb = []; const m = GM.ui.modal(cont, [{ t: 'Cerrar', cls: 'btn-sec', fn: () => { cb.forEach(f => f()); } }], { alta: false }); cerrar = m;
    return { cont, marcador, msg, zona, cerrar, alCerrar: f => cb.push(f) };
  }
  const att = (st, k) => { const p = st.jugadores.yo; return p && p.att ? p.att[k] : 60; };
  const forma = st => { const p = st.jugadores.yo; return p && p.estado ? (p.estado.forma || 80) / 100 : 0.8; };
  async function ronda(st, v, titulo, n, atributo, vel, texto, onFin) {
    let aciertos = 0; const A = att(st, atributo), zona = Math.max(0.12, Math.min(0.46, 0.1 + (A - 40) / 150 * forma(st)));
    v.msg.textContent = texto; let vivo = true; v.alCerrar(() => { vivo = false; });
    for (let i = 1; i <= n && vivo; i++) { v.marcador.innerHTML = '<span>Tiro ' + i + ' de ' + n + '</span><b>' + aciertos + ' dentro</b>'; const ok = await cursor(v.zona, zona, vel + i * 0.04, 'Tirar'); if (!vivo) return; if (ok) aciertos++; v.msg.textContent = ok ? '¡Dentro!' : 'Fallado.'; await new Promise(r => setTimeout(r, 420)); }
    if (vivo) onFin(aciertos);
  }
  // Bolera de la ciudad: diez lanzamientos; cada acierto tira de 5 a 10 bolos según la fuerza (físico) y tu amigo compite si hay
  function bolos(st, amigo) {
    const c = C(st) || {}, v = ventana('Bolera Strike'); let tot = 0, vivo = true; v.alCerrar(() => { vivo = false; });
    (async () => { const A = att(st, 'fisico'), zona = Math.max(0.14, Math.min(0.44, 0.12 + (A - 40) / 170 * forma(st)));
      for (let i = 1; i <= 10 && vivo; i++) { v.marcador.innerHTML = '<span>Lanzamiento ' + i + ' de 10</span><b>' + tot + ' bolos</b>'; const ok = await cursor(v.zona, zona, 0.8 + i * 0.05, 'Lanzar'); if (!vivo) return; const q = ok ? 8 + ((Math.random() * 3) | 0) : 2 + ((Math.random() * 5) | 0); tot += Math.min(10, q); v.msg.textContent = q >= 10 ? '¡PLENO!' : q + ' bolos.'; await new Promise(r => setTimeout(r, 450)); }
      if (!vivo) return; const rival = amigo ? Math.round(60 + Math.random() * 28) : 0; v.marcador.innerHTML = '<span>Resultado</span><b>' + tot + ' puntos' + (amigo ? ' contra ' + rival : '') + '</b>';
      if (c) { c.moral = U.clamp((c.moral || 50) + (tot >= 70 ? 4 : 2), 0, 100); if (amigo) amigo.rel = Math.min(100, amigo.rel + (tot > rival ? 3 : 5)); }
      v.msg.textContent = (tot >= 80 ? '¡Una partida de campeonato! ' : tot >= 55 ? 'Buena partida. ' : 'A ver si mejoras la próxima. ') + (amigo ? (tot > rival ? 'Le has ganado a ' + amigo.nombre + '.' : amigo.nombre + ' te gana esta vez.') : ''); })();
  }
  function triples(st) {
    if (!act(st)) return { ok: false, motivo: 'No disponible.' }; const c = C(st);
    const v = ventana('Concurso de triples'); ronda(st, v, 'Concurso de triples', 10, 'tiro3', 0.9, 'Tira cuando el cursor pase por la zona verde (o pulsa la barra espaciadora).', n => {
      const premio = n >= 8 ? { cariño: 4, fama: 0.5, dinero: 3 } : n >= 5 ? { cariño: 2, fama: 0.2, dinero: 1 } : { cariño: 0.6, fama: 0, dinero: 0 };
      c.moral = U.clamp(c.moral + (n >= 5 ? 3 : 1), 0, 100); P(st).cariño = U.clamp(P(st).cariño + premio.cariño, 0, 100); c.fama += premio.fama; c.dinero += premio.dinero; if (st.jugadores.yo) st.jugadores.yo.xp = (st.jugadores.yo.xp || 0) + 0.02 * n / 10;
      completa(st, e => e.tipo === 'triples' && n >= e.n); P(st).recordTriples = Math.max(P(st).recordTriples || 0, n);
      v.marcador.innerHTML = '<span>Resultado</span><b>' + n + ' de 10</b>'; v.msg.textContent = (n >= 8 ? '¡Los chavales aplauden! ' : n >= 5 ? 'Buen concurso. ' : 'Hoy no es tu día. ') + 'Cariño +' + premio.cariño + (premio.dinero ? ', ' + fmt(premio.dinero) : '') + '. Tu récord: ' + P(st).recordTriples + '.';
    }); return { ok: true, texto: 'Empieza el concurso' };
  }
  function libres(st) {
    if (!act(st)) return { ok: false, motivo: 'No disponible.' }; const c = C(st), v = ventana('Tiros libres');
    ronda(st, v, 'Tiros libres', 10, 'tl', 0.75, 'La zona es más ancha que en el triple. Concéntrate.', n => { c.moral = U.clamp(c.moral + (n >= 7 ? 2 : 0.5), 0, 100); P(st).cariño = U.clamp(P(st).cariño + n * 0.15, 0, 100); completa(st, e => e.tipo === 'libres' && n >= e.n); v.marcador.innerHTML = '<span>Resultado</span><b>' + n + ' de 10</b>'; v.msg.textContent = n >= 8 ? 'Casi perfecto.' : 'A seguir entrenando.'; });
    return { ok: true, texto: 'A la línea de tiros libres' };
  }
  async function unoContraUno(st) {
    if (!act(st)) return { ok: false, motivo: 'No disponible.' }; const c = C(st), p = st.jugadores.yo, v = ventana('Uno contra uno');
    const rival = 52 + GM.mods.pueblo.nivel(st) * 3 + Math.round(Math.random() * 6), yo = (p ? p.ovr : 60) + (forma(st) - 0.8) * 20; let a = 0, b = 0, vivo = true; v.alCerrar(() => { vivo = false; });
    v.msg.textContent = 'Primero a 5. Tú atacas: acierta con el cursor para anotar; defiendes con tu media.';
    while (vivo && a < 5 && b < 5) {
      v.marcador.innerHTML = '<span>Tú ' + a + '</span><b>' + b + ' Chavales</b>';
      const ok = await cursor(v.zona, Math.max(0.14, Math.min(0.46, 0.12 + (att(st, 'tiro2') - 40) / 160)), 1.0 + (a + b) * 0.06, 'Atacar'); if (!vivo) return;
      if (ok || Math.random() < 0.15) { a++; v.msg.textContent = '¡Canasta tuya!'; } else { v.msg.textContent = 'Tiro fallado.'; }
      await new Promise(r => setTimeout(r, 450)); if (!vivo || a >= 5) break;
      const pr = 0.34 + (rival - yo) / 160; if (Math.random() < pr) { b++; v.msg.textContent = 'Anotan ellos.'; } else v.msg.textContent = '¡Buena defensa!'; await new Promise(r => setTimeout(r, 450));
    }
    if (!vivo) return { ok: true }; const gana = a > b;
    v.marcador.innerHTML = '<span>Final</span><b>' + a + ' - ' + b + '</b>'; c.moral = U.clamp(c.moral + (gana ? 4 : 1), 0, 100); P(st).cariño = U.clamp(P(st).cariño + (gana ? 3 : 1), 0, 100); if (p) p.estado.fatiga = Math.min(100, (p.estado.fatiga || 0) + 4);
    v.msg.textContent = gana ? '¡Les has ganado! Los chavales quieren la revancha.' : 'Esta vez ganan ellos. Vuelve cuando quieras.'; if (gana) completa(st, e => e.tipo === 'uno'); return { ok: true };
  }

  // ---------- Fiesta mayor ----------
  function esFiesta(st) { const md = String(st.fecha).slice(5); return (md >= '08-14' && md <= '08-16') || md === '12-08' || md === '12-07'; }
  // Guirnaldas de banderines sobre las calles y farolillos; de noche, fuegos artificiales en la plaza
  function fiesta(S, W, st, club, calles, rnd) {
    if (!esFiesta(st)) return; const cols = [club.colores[0], club.colores[1] || '#ffffff', '#f1c40f', '#e84393', '#2f6f9e'], g = new T.Group(); W.add(g);
    const geo = new T.BufferGeometry(), pos = [], col = [], cc = new T.Color();
    calles.forEach(c => { for (let i = 0; i < c.p.length - 1; i++) { const [ax, az] = c.p[i], [bx, bz] = c.p[i + 1], l = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / l, nz = (bx - ax) / l, n = Math.floor(l / 7); for (let k = 0; k < n; k++) { const t0 = (k + 0.5) / n, cx = ax + (bx - ax) * t0, cz = az + (bz - az) * t0, xa = cx + nx * (c.w / 2 + 0.5), za = cz + nz * (c.w / 2 + 0.5), xb = cx - nx * (c.w / 2 + 0.5), zb = cz - nz * (c.w / 2 + 0.5), N = 14; for (let q = 0; q < N; q++) { const t = (q + 0.5) / N, x = xa + (xb - xa) * t, z = za + (zb - za) * t, y = 5.2 - Math.sin(t * Math.PI) * 0.9, w = 0.22; pos.push(x - nx * w * 0, y, z, x + (bx - ax) / l * w, y, z + (bz - az) / l * w, x, y - 0.4, z); cc.set(cols[(q + k) % cols.length]); for (let r = 0; r < 3; r++) col.push(cc.r, cc.g, cc.b); } } } });
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.add(new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide })));
    // fuegos: ráfagas de partículas en la plaza cuando es de noche
    const N = 5, R = 90, pts = [], mt = new T.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true });
    for (let b = 0; b < N; b++) { const gg = new T.BufferGeometry(), p = new Float32Array(R * 3), c = new Float32Array(R * 3), cl = new T.Color(cols[b % cols.length]); for (let i = 0; i < R; i++) { c[i * 3] = cl.r; c[i * 3 + 1] = cl.g; c[i * 3 + 2] = cl.b; } gg.setAttribute('position', new T.BufferAttribute(p, 3)); gg.setAttribute('color', new T.BufferAttribute(c, 3)); const pt = new T.Points(gg, mt); pt.frustumCulled = false; pt.userData = { fuego: { b, t0: b * 1.7, cx: (rnd() - 0.5) * 24, cz: (rnd() - 0.5) * 18, dirs: Array.from({ length: R }, () => { const a = rnd() * 6.283, e = Math.acos(2 * rnd() - 1); return [Math.sin(e) * Math.cos(a), Math.cos(e), Math.sin(e) * Math.sin(a)]; }) } }; W.add(pt); pts.push(pt); }
    S.puebloAnim.push(t => { const noche = S.noche || 0; pts.forEach(pt => { const u = pt.userData.fuego, ciclo = 9, k = ((t + u.t0) % ciclo) / ciclo, a = pt.geometry.attributes.position; pt.visible = noche > 0.3 && k < 0.55; if (!pt.visible) return; const e = k / 0.55, r = Math.pow(e, 0.6) * 11, y0 = 18 + Math.min(1, e * 3) * 14 - e * e * 9; for (let i = 0; i < R; i++) { const d = u.dirs[i]; a.setXYZ(i, u.cx + d[0] * r, y0 + d[1] * r, u.cz + d[2] * r); } a.needsUpdate = true; pt.material.opacity = 1 - e * 0.9; }); });
    S.enFiesta = true;
  }

  // ---------- Panel de encargos ----------
  function panelEncargos() {
    const st = GM.state; if (!act(st)) return; generar(st); const h = GM.h, I = (n, t) => GM.iconos.el(n, t), L = lista(st), S = GM.sede._estado && GM.sede._estado();
    const fila = e => { const dias = Math.max(0, U.diffDays(st.fecha, e.hasta)), dest = e.tipo === 'visitar' ? 'pueblo_' + e.edificio : e.tipo === 'uno' || e.tipo === 'libres' ? 'pueblo_canasta' : 'pueblo_plaza';
      return h('div', { class: 'pb-acc', style: { cursor: 'default', opacity: e.hecho ? 0.55 : 1 } }, h('div', { class: 'ic' }, I(e.hecho ? 'check' : e.diario ? 'reloj' : 'estrella', 20)), h('div', null, h('b', null, e.texto), h('span', null, (e.hecho ? 'Cumplido' : e.diario ? 'Hoy' : 'Quedan ' + dias + ' días') + '. Premio: cariño +' + e.premio.cariño + ', reputación +' + e.premio.fama + (e.premio.dinero ? ', ' + fmt(e.premio.dinero) : ''))),
        !e.hecho && S ? h('button', { class: 'btn peq', onclick: () => { const z = S.zonas && S.zonas.find(q => q.sala.id === dest) || S.zonas.find(q => q.sala.id === 'pueblo_plaza'); if (z) GM.sede._motor().irA(S.yo, z.obj.position.x, z.obj.position.z, () => {}); document.querySelectorAll('.fondo').forEach(f => f.click()); } }, 'Ir') : null); };
    const w = h('div', { class: 'pb' }, h('div', { class: 'pb-hero' }, h('div', { class: 'pb-ic' }, I('estrella', 30)), h('div', null, h('h3', null, 'Encargos del pueblo'), h('p', null, 'Ayuda a tus vecinos y gana cariño, reputación y algo de dinero.'))), L.length ? L.map(fila) : h('p', null, 'Hoy no hay encargos.'));
    GM.ui.modal(w, [{ t: 'Cerrar', cls: 'btn-sec' }]);
  }
  function pendientes(st) { return act(st) ? lista(st).filter(e => !e.hecho).length : 0; }
  // Anillos dorados sobre las zonas con un encargo pendiente (se llama al construir la escena)
  function marcas(S, W, st) {
    if (!act(st)) return; generar(st); const objetivos = new Set(); lista(st).forEach(e => { if (e.hecho) return; objetivos.add(e.tipo === 'visitar' ? 'pueblo_' + e.edificio : e.tipo === 'uno' || e.tipo === 'libres' ? 'pueblo_canasta' : 'pueblo_plaza'); });
    const aros = []; (S.zonas || []).forEach(z => { if (!objetivos.has(z.sala.id)) return; const g = new T.Mesh(new T.RingGeometry(0.75, 0.95, 28).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0xffc83a, transparent: true, opacity: 0.9, depthWrite: false })); g.position.set(z.obj.position.x, 0.07, z.obj.position.z); W.add(g); const st2 = new T.Mesh(new T.ConeGeometry(0.28, 0.6, 4).rotateX(Math.PI), new T.MeshBasicMaterial({ color: 0xffc83a })); st2.position.set(z.obj.position.x, 3.2, z.obj.position.z); st2.userData = { marca: true }; W.add(st2); aros.push(g, st2); });
    S.puebloAnim.push(t => { aros.forEach((m, i) => { if (m.userData && m.userData.marca) { m.position.y = 3.2 + Math.sin(t * 2.4) * 0.25; m.rotation.y = t * 1.6; } else m.scale.setScalar(1 + Math.sin(t * 3) * 0.12); }); });
  }
  // Acciones que se añaden a la ficha de la canasta y de la plaza
  function acciones(st, tipo) {
    const out = []; if (!act(st)) return out;
    if (tipo === 'canasta') out.push({ ico: 'balon', t: 'Concurso de triples', d: '10 tiros con el cursor. Premio según los que metas.', disponible: true, fn: () => triples(st) }, { ico: 'balon', t: 'Tiros libres', d: '10 tiros más fáciles. Sube el ánimo.', disponible: true, fn: () => libres(st) }, { ico: 'persona', t: 'Uno contra uno con los chavales', d: 'Primero a 5. Cansa un poco.', disponible: true, fn: () => { unoContraUno(st); return { ok: true, texto: 'Los chavales te retan' }; } });
    if (tipo === 'plaza') out.push({ ico: 'estrella', t: 'Encargos del pueblo (' + pendientes(st) + ')', d: 'Tus vecinos te piden cosas con premio.', disponible: true, fn: () => { panelEncargos(); return { ok: true, texto: 'Encargos' }; } });
    return out;
  }
  GM.puebloJuego = { bolos, encargos: lista, generar, acciones, panelEncargos, pendientes, marcas, fiesta, esFiesta, triples, libres, unoContraUno };
})();
