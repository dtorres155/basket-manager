/* PARTIDO EN DIRECTO (GM.mods.directo)
   Pantalla completa con pista 3D: 10 jugadores y balón que reproducen cada posesión del partido (pases, tiros, rebotes, pérdidas y faltas), marcador y reloj.
   El partido se simula cuarto a cuarto con partidos.crearDirecto: entre cuartos (o en pausa) puedes cambiar ritmo, defensa y foco, pedir tiempo muerto
   y hacer cambios; solo afectan a lo que queda por jugar. Sin WebGL funciona igual con el marcador y la narración.
   Expone: abrir(st, partido, { control, onFin }), selfTest. El resultado final se entrega a onFin(res); competiciones.jugarDia lo usa vía st._directo. */
(function () {
  const U = GM.util;
  const L = 11, W = 6, HX = L - 1.3;
  const FRASES = {
    ok3: ['{j} clava un triple', '{j} enchufa desde el arco', '{j} no perdona desde 6,75'], ok2: ['{j} anota de dos', '{j} culmina la jugada', '{j} suma bajo el aro'],
    fallo3: ['{j} falla el triple', '{j} no encuentra el aro desde fuera'], fallo2: ['{j} falla bajo el aro', '{j} no acierta en la media distancia'],
    tov: ['{j} pierde el balón', 'Pérdida de {j}'], falta: ['Falta sobre {j}'], reb: ['Rebote de {j}'], tap: ['¡Tapón de {j}!'], rob: ['Robo de {j}'], ast: ['asistencia de {j}']
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function formacion(ataca, i, fase) {
    const base = [[-8.5, 0], [-6.6, 3.6], [-6.6, -3.6], [-4.4, 4.8], [-3.2, -2.4]][i] || [-5, 0];
    const x = HX + base[0], z = base[1];
    return ataca ? [x, z] : [x + 1.4, z * 0.8];
  }
  function abrir(st, g, opt) {
    opt = opt || {};
    const h = GM.h, P = GM.mods.partidos, D = P.crearDirecto(st, g, true), club = st.clubId, lado = g.local === club ? 'A' : g.visitante === club ? 'B' : null;
    const control = !!opt.control && !!lado, nombre = id => st.jugadores[id] ? st.jugadores[id].nombre.split(' ').slice(-1)[0] : '';
    const col = id => GM.kit.color(st.equipos[id].colores[0] === '#000000' ? '#333333' : st.equipos[id].colores[0]);
    const ES = { fase: 'inicio', vel: 4, pausa: false, t: 0, dur: 600, cola: [], idx: 0, anim: null, marcador: [0, 0], cuarto: 0, ultimo: null, desde: 0 };
    const NAR = GM.narrador ? GM.narrador.nuevo(st, g, D, nombre) : null;   // frases con contexto, estadísticas en vivo, repeticiones, cámaras y ambiente de clásico (punto 68)
    const fondo = h('div', { class: 'directo' });
    const marc = h('div', { class: 'dir-marcador' }), vistaEl = h('div', { class: 'dir-vista' }), tick = h('div', { class: 'dir-ticker' }), ctrl = h('div', { class: 'dir-ctrl' }), panel = h('div', { class: 'dir-panel' });
    const statEl = h('div', { class: 'dir-stats', style: { display: 'none' } }); fondo.append(marc, vistaEl, tick, ctrl, panel); vistaEl.append(statEl); document.body.appendChild(fondo);
    let V = null, jug = null, balon = null, ids = { A: [], B: [] };
    function pintaMarcador() {
      const cu = ES.cuarto, qtxt = cu === 0 ? 'Previa' : cu <= 4 ? 'Cuarto ' + cu : 'Prórroga ' + (cu - 4), rest = Math.max(0, ES.dur - ES.t), mm = Math.floor(rest / 60), ss = Math.floor(rest % 60);
      marc.innerHTML = '';
      marc.append(h('div', { class: 'dir-eq' }, h('b', null, st.equipos[g.local].siglas), h('span', { class: 'muted' }, st.equipos[g.local].nombre)), h('div', { class: 'dir-num' }, h('b', null, ES.marcador[0]), h('i', null, '-'), h('b', null, ES.marcador[1])), h('div', { class: 'dir-eq der' }, h('b', null, st.equipos[g.visitante].siglas), h('span', { class: 'muted' }, st.equipos[g.visitante].nombre)), h('div', { class: 'dir-reloj' }, qtxt + (cu ? '  ' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0') : '')));
    }
    function narra(txt, cls) { const e = h('div', { class: 'dir-linea ' + (cls || '') }, txt); tick.prepend(e); while (tick.children.length > 5) tick.removeChild(tick.lastChild); }
    // ---- 3D ----
    if (GM.kit && GM.kit.disponible()) {
      try {
        V = GM.kit.crear(vistaEl, { radio: window.innerWidth >= 900 ? 24 : 31, theta: 0.0, phi: 0.9, min: 10, max: 48, fondo: 0x10151b, sombras: false });
        const K = GM.kit, W3 = new THREE.Group(); V.scene.add(W3);
        const t = GM.campus && GM.campus.tex && GM.campus.tex('parqdir', 512, 256, (x, w, hh) => { for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#c98d4f' : '#bf8346'; x.fillRect(0, i * 16, w, 16); } x.strokeStyle = '#fff'; x.lineWidth = 3; x.strokeRect(6, 6, w - 12, hh - 12); x.beginPath(); x.moveTo(w / 2, 6); x.lineTo(w / 2, hh - 6); x.stroke(); x.beginPath(); x.arc(w / 2, hh / 2, 34, 0, 6.3); x.stroke(); x.strokeRect(6, hh / 2 - 44, 100, 88); x.strokeRect(w - 106, hh / 2 - 44, 100, 88); });
        const pm = new THREE.Mesh(new THREE.BoxGeometry(2 * L, 0.2, 2 * W), t ? new THREE.MeshLambertMaterial({ map: t }) : K.mat(0xc98d4f)); pm.position.y = -0.1; W3.add(pm);
        if (!t) { W3.add(K.caja(2 * L - 0.3, 0.02, 0.08, 0xffffff, 0, 0.01, 0)); W3.add(K.caja(0.08, 0.02, 2 * W - 0.3, 0xffffff, 0, 0.01, 0)); }
        W3.add(K.caja(2 * L + 6, 0.2, 2 * W + 6, 0x1b2229, 0, -0.35, 0));
        [-1, 1].forEach(s => { W3.add(K.cilindro(0.06, 3, 0x666666, s * (L - 0.3), 0, 0)); W3.add(K.caja(0.08, 1.2, 1.8, 0xf4f4f4, s * (L - 0.6), 2.4, 0)); const aro = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 8, 16), K.mat(0xff6a1a)); aro.rotation.x = Math.PI / 2; aro.position.set(s * HX, 3.0, 0); W3.add(aro); });
        // gradas
        for (let r = 0; r < 4; r++) { [-1, 1].forEach(s => { W3.add(K.caja(2 * L + 4, 0.6, 0.8, r % 2 ? 0x2d3a46 : 0x364654, 0, r * 0.6 - 0.3, s * (W + 1.6 + r * 0.9))); }); }
        jug = { A: [], B: [] };
        ['A', 'B'].forEach(k => { const cid = k === 'A' ? g.local : g.visitante, c = col(cid); for (let i = 0; i < 5; i++) { const gr = new THREE.Group(); gr.add(K.cilindro(0.34, 1.35, c, 0, 0.2, 0, 10)); gr.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), K.mat(0xe4b88f))); gr.children[1].position.y = 1.85; gr.position.set(0, 0, 0); W3.add(gr); jug[k].push({ g: gr, x: 0, z: 0, tx: 0, tz: 0, k, i }); } });
        // Personas de verdad (Quaternius) con la camiseta de cada equipo; los cilindros quedan si no cargan
        if (GM.sede && GM.sede.personaje) ['A', 'B'].forEach(k => { const e = st.equipos[k === 'A' ? g.local : g.visitante], c1 = e.colores[0], c2 = e.colores[1] || '#222'; jug[k].forEach((o, i) => {
          const hsh = U.hash(e.id + i); GM.sede.personaje({ modelo: ['h-casual_hoodie', 'h-casual_2', 'h-beach'][hsh % 3], altura: 196 + hsh % 14, piel: ['#f1c7a5', '#c68863', '#9a6142', '#6e4329', '#e0ac85'][(hsh >>> 3) % 5], pelo: ['#1d1510', '#3b2617', '#a9793e'][(hsh >>> 6) % 3], ropa: [c1, c2], escudo: { siglas: e.siglas, c1, c2, num: 2 + (U.hash(e.id + i) % 30) } }).then(p => {
            if (!V) return; o.g.children.forEach(ch => { ch.visible = false; }); p.obj.scale.multiplyScalar(1.15); o.g.add(p.obj); o.p = p; GM.sede.animar(p, 'idle'); }).catch(() => {}); }); });
        V.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));
        { // Público: personas sentadas instanciadas (GM.kit.publico), 3/4 con los colores del local; al celebrar saltan y alzan los brazos
          const eL = st.equipos[g.local], eV = st.equipos[g.visitante], cols = [eL.colores[0], eL.colores[1] || '#ffffff', eV.colores[0], '#3d4a56', '#d9d9d9', '#7a2f22', '#2f4f6e'];
          const sitios = []; for (let r = 0; r < 4; r++) for (const s of [-1, 1]) for (let x = -L - 1.5; x <= L + 1.5; x += 0.62) { const h0 = U.hash('fan' + r + s + x.toFixed(2)); if (h0 % 10 < 1 && !(NAR && NAR.ambiente >= 2)) continue; sitios.push({ x: x + ((h0 >>> 4) % 10) / 40, y: r * 0.6 + 0.3, z: s * (W + 1.6 + r * 0.9), s, eq: h0 % 100 < (NAR && NAR.ambiente >= 2 ? 58 : 74) ? 'A' : h0 % 100 < 90 ? 'B' : 'N', h0 }); }
          const piel = ['#f1c7a5', '#e0ac85', '#c68863', '#9a6142', '#6e4329'], pelo = ['#1d1510', '#3b2617', '#6a4425', '#a9793e', '#8a8a8a', '#c9a25f'];
          const fans = sitios.map(p => ({ x: p.x, y: p.y, z: p.z, ry: p.s > 0 ? Math.PI : 0, ropa: p.eq === 'A' ? cols[p.h0 % 2] : p.eq === 'B' ? cols[2] : cols[3 + p.h0 % 4], piel: piel[(p.h0 >>> 7) % 5], pelo: pelo[(p.h0 >>> 11) % 6], pantalon: ['#2f3640', '#3c4a5c', '#5a4a3a'][(p.h0 >>> 3) % 3] }));
          const PB = K.publico(fans, 0.82); W3.add(PB.grupo); ES.publico = { sitios, PB };
          if (NAR && NAR.ambiente >= 2) tifoClasico(W3, K, eL, eV, L, W, ES);
          if (false) [-1, 1].forEach(s => { [[-0.55, eL.colores[0]], [0.0, eL.colores[1] || '#ffffff'], [0.55, eL.colores[0]]].forEach(([dx, c]) => W3.add(K.caja(L * 0.5, 1.4, 0.06, c, dx * L * 1.1, 4.0, s * (W + 1.6 + 4 * 0.9 + 0.4)))); W3.add(K.caja(L * 0.9, 1.6, 0.06, eV.colores[0], s * 0 + L * 0.9, 4.0, (W + 6.0))); });   // tifos de clásico
          ES.colocaPublico = (t) => { const C = ES.celebra, act = C && t - C.t0 < 1.4; PB.colocar(i => { const p = sitios[i]; if (!(act && p.eq === C.k)) return null; const f = 1 - (t - C.t0) / 1.4; return { salto: Math.abs(Math.sin((t - C.t0) * 9 + p.h0)) * 0.35 * f, brazos: Math.min(1, f * 1.6) }; }); };
          ES.colocaPublico(0);
        }
        { // Banquillos: banco, cinco suplentes sentados y el entrenador de pie, en la banda de la grada sur
          const banco = (x) => { const b = K.caja(5.4, 0.45, 0.6, 0x2a2f35, x, 0, W + 0.85); W3.add(b); };
          banco(-5); banco(5);
          if (GM.sede && GM.sede.personaje) ['A', 'B'].forEach(k => { const e = st.equipos[k === 'A' ? g.local : g.visitante], c1 = e.colores[0], c2 = e.colores[1] || '#222', bx = k === 'A' ? -5 : 5;
            for (let i = 0; i < 5; i++) { const h0 = U.hash(e.id + 'banco' + i); GM.sede.personaje({ modelo: ['h-casual_hoodie', 'h-casual_2', 'h-beach'][h0 % 3], altura: 194 + h0 % 14, piel: ['#f1c7a5', '#c68863', '#9a6142', '#6e4329'][(h0 >>> 3) % 4], pelo: ['#1d1510', '#3b2617'][(h0 >>> 6) % 2], ropa: [c1, c2] }).then(p => { if (!V) return; p.obj.scale.multiplyScalar(1.15); p.obj.position.set(bx - 2 + i, 0, W + 0.85); p.obj.rotation.y = Math.PI; p.asiento = 0.45; W3.add(p.obj); GM.sede.animar(p, 'sit'); ((ES.suplentes = ES.suplentes || { A: [], B: [] })[k]).push({ p, x: p.obj.position.x, z: p.obj.position.z }); }).catch(() => {}); }
            GM.sede.personaje({ modelo: 'h-suit', altura: 182, piel: '#e0ac85', pelo: '#8a8a8a' }).then(p => { if (!V) return; p.obj.scale.multiplyScalar(1.15); p.obj.position.set(bx + (k === 'A' ? 3.3 : -3.3), 0, W + 0.6); p.obj.rotation.y = Math.PI; W3.add(p.obj); GM.sede.animar(p, 'idle'); ES.entrenadores = (ES.entrenadores || []).concat([p]); }).catch(() => {});
          });
        }
        if (GM.sede && GM.sede.personaje) { ES.arbitros = []; [0, 1].forEach(j => GM.sede.personaje({ modelo: 'h-casual_2', altura: 178, piel: ['#e0ac85', '#c68863'][j], pelo: '#2b2018', ropa: ['#e9c11f', '#1b1b1b'], zapas: '#111111' }).then(p => { if (!V) return; p.obj.scale.multiplyScalar(1.08); W3.add(p.obj); p.obj.position.set(j ? 3 : -3, 0, j ? -W + 1.3 : W - 1.3); GM.sede.animar(p, 'idle'); ES.arbitros.push({ p, g: p.obj, x: p.obj.position.x, z: p.obj.position.z, j }); }).catch(() => { })); }
        balon = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), K.mat(0xe3622b)); balon.position.set(0, 1, 0); W3.add(balon);
        ES.bx = 0; ES.bz = 0; ES.by = 1;
        // posiciones iniciales
        ['A', 'B'].forEach((k, ki) => jug[k].forEach((o, i) => { const f = formacion(k === 'A', i); o.x = o.tx = (k === 'A' ? -1 : 1) * 4 + (ki ? 1 : -1) * (i * 0.8); o.z = o.tz = (i - 2) * 2; }));
        // Qué animación lleva cada jugador: clips puntuales (tiro, mate, pase, rebote), celebración, bote del que lleva el balón, defensa en cuclillas o el paso al ritmo del movimiento
        const nombreAnim = (o, k, i, v) => {
          const ya = performance.now() / 1000, cp = o.clip, S0 = GM.sede;
          if (cp && ya >= cp.t0 && ya < cp.t0 + cp.dur && o.p.acc[cp.nombre]) { S0.animar(o.p, cp.nombre); if (o.p.accion) o.p.accion.timeScale = cp.esc; return; }
          if (cp && ya >= cp.t0 + cp.dur) o.clip = null;
          const att = ES.ataca === k, c = ES.celebra;
          if (c && c.k === k && ya >= c.t0 && ya - c.t0 < 1.4 && v < 1.5) { S0.animar(o.p, c.v || 'celebrar'); if (o.p.accion) o.p.accion.timeScale = 1; return; }
          const n = att && i === 0 ? (v > 2.5 ? 'boteCorriendo' : v > 0.4 ? 'walk' : 'bote') : !att && ES.ataca && v < 0.6 ? 'defensa' : v > 2.5 ? 'sprint' : v > 0.4 ? 'walk' : 'idle';
          S0.animar(o.p, n); if (o.p.accion) o.p.accion.timeScale = n === 'walk' || n === 'sprint' ? Math.min(1.8, Math.max(0.6, v / (n === 'sprint' ? 2.7 : 1.3))) : 1;
        };
        const _hb = new THREE.Vector3();
        V.anim = function (tm) {
          const dt = 0.033; if (ES.tifoAnim) ES.tifoAnim(performance.now() / 1000); if (NAR && ES.cam && ES.cam !== 'general') GM.narrador.camara(V, ES.cam, balon, ES.ataca, window.innerWidth);
          ['A', 'B'].forEach(k => jug[k].forEach(o => { const dx = (o.tx - o.x) * 0.12, dz = (o.tz - o.z) * 0.12; o.x += dx; o.z += dz; o.g.position.set(o.x, 0, o.z); const v = Math.hypot(dx, dz) / dt;
            if (o.p) { if (v > 0.25) { let a = Math.atan2(dx, dz) - o.g.rotation.y; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; o.g.rotation.y += a * 0.25; } else { const hx = (ES.ataca === k ? 1 : -1) * (k === 'A' ? 1 : -1) * HX; o.g.rotation.y += (Math.atan2(hx - o.x, -o.z) - o.g.rotation.y) * 0.08; }
              nombreAnim(o, k, jug[k].indexOf(o), v); o.p.mixer.update(dt);
              if (o.gesto && GM.sede.brazos) { const u = (performance.now() / 1000 - o.gesto.t0) / o.gesto.dur; if (u >= 0 && u <= 1) { const w = Math.sin(u * Math.PI) * o.gesto.w; GM.sede.brazos(o.p, w, new THREE.Vector3(Math.sin(o.g.rotation.y), 0, Math.cos(o.g.rotation.y))); if (o.gesto.salto) o.g.position.y = Math.sin(u * Math.PI) * 0.35; } else if (u > 1) { o.gesto = null; o.g.position.y = 0; } } } }));
          const a = ES.anim, ahora = performance.now() / 1000;
          if (ES.colocaPublico && !(ES.publicoQuieto && !(ES.celebra && ahora - ES.celebra.t0 < 1.4))) ES.colocaPublico(ahora);
          if (ES.entrenadores) ES.entrenadores.forEach(p => p.mixer.update(dt));
          if (ES.arbitros) ES.arbitros.forEach(a => { const tx = balon.position.x * 0.85 + (a.j ? 2.2 : -2.2), tz = a.j ? -W + 1.3 : W - 1.3, dx = (tx - a.x) * 0.07, dz = (tz - a.z) * 0.07, v = Math.hypot(dx, dz) / dt, cp = a.clip; a.x += dx; a.z += dz; a.g.position.set(a.x, 0, a.z); let ang = Math.atan2(balon.position.x - a.x, balon.position.z - a.z) - a.g.rotation.y; while (ang > Math.PI) ang -= 2 * Math.PI; while (ang < -Math.PI) ang += 2 * Math.PI; a.g.rotation.y += ang * 0.12; const ya2 = performance.now() / 1000; if (cp && ya2 >= cp.t0 && ya2 < cp.t0 + cp.dur) GM.sede.animar(a.p, cp.nombre); else { if (cp && ya2 >= cp.t0 + cp.dur) a.clip = null; GM.sede.animar(a.p, v > 0.35 ? 'walk' : 'idle'); if (a.p.accion) a.p.accion.timeScale = v > 0.35 ? Math.min(1.8, Math.max(0.6, v / 1.3)) : 1; } a.p.mixer.update(dt); });
          if (ES.suplentes) ['A', 'B'].forEach(k => { const c = ES.celebra, act = c && c.k === k && performance.now() / 1000 >= c.t0 && performance.now() / 1000 - c.t0 < 1.4; (ES.suplentes[k] || []).forEach(sp => { if (act && !sp.de) { sp.de = true; GM.sede.animar(sp.p, 'celebrar'); } else if (!act && sp.de) { sp.de = false; GM.sede.animar(sp.p, 'sit'); } if (sp.de) sp.p.mixer.update(dt); }); });
          if (a) {
            let u = (ahora - a.t0) / a.dur; if (ES.pausa && !ES.repe) { a.t0 += dt; u = (ahora - a.t0) / a.dur; }
            if (u >= 1) { balon.position.set(a.fin[0], a.fin[1], a.fin[2]); ES.anim = null; if (a.cb) a.cb(); }
            else { const n = a.keys.length - 1, s = Math.min(n - 1, Math.floor(u * n)), v = u * n - s, p0 = a.keys[s], p1 = a.keys[s + 1], arco = a.arco && s === n - 1 ? Math.sin(v * Math.PI) * 2.2 : Math.sin(v * Math.PI) * 0.2; balon.position.set(p0[0] + (p1[0] - p0[0]) * v, p0[1] + (p1[1] - p0[1]) * v + arco, p0[2] + (p1[2] - p0[2]) * v); }
          } else if (ES.fase === 'jugando' || ES.libres) {   // sin jugada en el aire: el balón va en la mano de quien lo lleva (botando si bota)
            const mp = ES.balonDe || (ES.ataca && jug[ES.ataca][0]), B = mp && mp.p && mp.p.huesos && mp.p.huesos.WristR;
            if (B) { mp.p.obj.updateMatrixWorld(true); B.getWorldPosition(_hb); const act = mp.p.actual, drib = act === 'bote' || act === 'boteCorriendo', k = drib && mp.p.accion ? 0.5 + 0.5 * Math.sin(mp.p.accion.time / (mp.p.accion.getClip().duration || 1) * 4 * Math.PI) : 1; balon.position.set(_hb.x, 0.25 + Math.max(0, _hb.y - 0.3) * Math.pow(k, 0.8), _hb.z); }
          }
        };
      } catch (e) { V = null; }
    }
    if (!V) vistaEl.append(h('div', { class: 'vacio' }, 'Sin vista 3D: sigue el partido por la narración y el marcador.'));
    // ---- reproducción ----
    function posJug(k, id) { const i = ids[k].indexOf(id); return i < 0 ? null : jug[k][i]; }
    function colocar(ataca, ev) {
      if (!jug) return;
      ['A', 'B'].forEach((k, ki) => { const off = k === ataca; jug[k].forEach((o, i) => { const f = formacion(off, i); const dir = ataca === 'A' ? 1 : -1; o.tx = f[0] * dir + (off ? 0 : 0); o.tz = f[1] * (ataca === 'A' ? 1 : -1) * (off ? 1 : 1); }); });
    }
    function juega(ev, mudo) {
      ES.marcador = [ev.a, ev.b];
      const k = ev.eq, otro = k === 'A' ? 'B' : 'A', dir = k === 'A' ? 1 : -1;
      ids.A = ev.pista[0]; ids.B = ev.pista[1];
      const nj = nombre(ev.jug), txt = e => e.replace('{j}', nj);
      ES.ataca = k; if (V) colocar(k, ev);
      let frase = '', cls = '';
      if (ev.r === 'ok') { frase = txt(pick(ev.v === 3 ? FRASES.ok3 : FRASES.ok2)) + (ev.ast ? ' (' + FRASES.ast[0].replace('{j}', nombre(ev.ast)) + ')' : '') + '.'; cls = k === lado ? 'bien' : ''; }
      else if (ev.r === 'fallo') frase = txt(pick(ev.v === 3 ? FRASES.fallo3 : FRASES.fallo2)) + (ev.tap ? ' ' + FRASES.tap[0].replace('{j}', nombre(ev.tap)) : '') + (ev.reb ? ' ' + FRASES.reb[0].replace('{j}', nombre(ev.reb)) + '.' : ev.oreb ? ' Rebote ofensivo de ' + nombre(ev.oreb) + '.' : '');
      else if (ev.r === 'tov') frase = txt(pick(FRASES.tov)) + (ev.rob ? ' ' + FRASES.rob[0].replace('{j}', nombre(ev.rob)) + '.' : '.');
      else if (ev.r === 'falta') { frase = txt(pick(FRASES.falta)) + ': ' + ev.ok + '/' + ev.v + ' desde la línea.'; }
      if (NAR) { const x = NAR.evento(ev, frase); if (!mudo) { narra(x.frase, cls); x.extra.forEach(l => narra(l.t, l.cls)); } if (ES.stats) statsPinta(); } else if (!mudo) narra(frase, cls);
      pintaMarcador();
      if (!V || ES.vel >= 16) return;
      const sh = posJug(k, ev.jug), hoop = [dir * HX, 3.0, 0], pase = () => { const o = jug[k][Math.floor(Math.random() * 5)]; return [o.tx, 1.4, o.tz]; };
      const pts = ev.r === 'ok' || ev.r === 'fallo' ? (ev.v === 3 ? 7 : 3.5) : 2;
      ES.libres = null; ES.balonDe = null;
      const cerca2 = !!sh && (ev.r === 'ok' || ev.r === 'fallo') && ev.v === 2 && ES.vel < 16 && !!sh.p, r0 = Math.random(), mate = cerca2 && ev.r === 'ok' && r0 < 0.3 && !!sh.p.acc.mate, bandeja = cerca2 && !mate && r0 > 0.62 && !!sh.p.acc.bandeja, ang = (Math.random() - 0.5) * 2.2, sp = mate ? [dir * (HX - 1.5), 0, (Math.random() - 0.5) * 1.4] : bandeja ? [dir * (HX - 1.4), 0, (Math.random() - 0.5) * 2] : sh ? [dir * (HX - pts * Math.cos(ang)), 0, pts * Math.sin(ang)] : [dir * 3, 0, 0];
      if (sh) { sh.tx = sp[0]; sh.tz = sp[2]; }
      const m0 = jug[k][0], keys = [[m0.x, 1.2, m0.z], pase(), pase(), [sp[0], 1.5, sp[2]]];
      if (ev.r === 'tov') keys.push([jug[otro][0].tx, 1.2, jug[otro][0].tz]);
      else if (ev.r === 'falta') keys.push([sp[0], 1.4, sp[2]]);
      else keys.push(hoop);
      const libres = ev.r === 'falta' && !!sh && !!sh.p && !!sh.p.acc.libre && ES.vel < 8 && ev.v > 0; if (libres) { sh.tx = dir * (HX - 4.6); sh.tz = 0; keys[keys.length - 1] = [sh.tx, 1.4, 0]; }
      const dur = Math.max(0.25, Math.min(1.6, 14 / ES.vel * 0.12));
      { const ahora = performance.now() / 1000, tramo = dur / (keys.length - 1), clips = !!(sh && sh.p && sh.p.acc.tiro);
        [1, 2].forEach(j => { const pasador = jug[k].reduce((b, o) => { const dd = Math.hypot(o.tx - keys[j - 1][0], o.tz - keys[j - 1][2]); return dd < b.d ? { o, d: dd } : b; }, { o: null, d: 9 }).o; if (pasador) { if (pasador.p && pasador.p.acc.pase) pasador.clip = { nombre: 'pase', t0: ahora + tramo * (j - 1), dur: tramo * 0.95, esc: 0.7 / (tramo * 0.95) }; else pasador.gesto = { t0: ahora + tramo * (j - 1), dur: tramo * 0.9, w: 0.55 }; } });
        if (sh && (ev.r === 'ok' || ev.r === 'fallo')) {
          sh.g.rotation.y = Math.atan2(hoop[0] - sp[0], hoop[2] - sp[2]);
          if (clips) { const dp = mate ? Math.max(0.6, tramo * 1.6) : Math.max(0.5, tramo * 1.5), cl = mate ? 1.5 : bandeja ? 1 : 1.2, f = mate ? 0.85 : 0.55, suelta = ahora + tramo * (keys.length - 2); sh.clip = { nombre: mate ? 'mate' : bandeja ? 'bandeja' : 'tiro', t0: suelta - f * dp, dur: dp * 1.1, esc: cl / dp }; }
          else sh.gesto = { t0: ahora + tramo * (keys.length - 2.6), dur: Math.max(0.45, tramo * 1.4), w: 1, salto: true };
        }
        const rb = ev.r === 'fallo' && (ev.reb || ev.oreb) ? posJug(ev.reb ? otro : k, ev.reb || ev.oreb) : null;
        if (rb && rb.p && rb.p.acc.rebote) { rb.tx = hoop[0] - dir * 1.6; rb.tz = (Math.random() - 0.5) * 2; rb.clip = { nombre: 'rebote', t0: ahora + dur * 0.85, dur: 1, esc: 1.2 }; }
        if (ev.r === 'falta' && ES.arbitros && ES.arbitros[0]) ES.arbitros[0].clip = { nombre: 'arbitro', t0: ahora + dur * 0.6, dur: 2, esc: 1 };
        if (ev.tap) { const dfn = posJug(otro, ev.tap); if (dfn && dfn.p && dfn.p.acc.tapon) { dfn.tx = sp[0] + dir * 0.9; dfn.tz = sp[2]; dfn.clip = { nombre: 'tapon', t0: ahora + tramo * (keys.length - 2) - 0.18, dur: 0.9, esc: 1 }; } }
        if (ev.rob && ev.r === 'tov') { const rb2 = posJug(otro, ev.rob); if (rb2 && rb2.p && rb2.p.acc.robo) rb2.clip = { nombre: 'robo', t0: ahora + dur * 0.75, dur: 0.6, esc: 1 }; }
        if (ev.r === 'ok') ES.celebra = { k: k, t0: ahora + dur, v: Math.random() < 0.5 ? 'celebrar' : 'celebrar2' }; }
      ES.anim = { t0: performance.now() / 1000, dur, keys, arco: ev.r === 'ok' || ev.r === 'fallo', fin: ev.r === 'fallo' ? (ev.tap ? [hoop[0] - dir * 3, 0.3, (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2)] : [hoop[0] - dir * 1.2, 0.3, (Math.random() - 0.5) * 3]) : keys[keys.length - 1] };
      if (libres) {   // tiros libres: el lanzador se coloca en la línea y tira uno a uno (el balón espera en su mano hasta soltarlo)
        const tok = ES.libres = {};
        const lanza = i => { if (ES.libres !== tok || !V || i >= ev.v) { if (ES.libres === tok) ES.balonDe = null; return; } ES.balonDe = sh; const hecho = i < ev.ok, T = Math.max(0.6, Math.min(1.4, 4 / ES.vel)); sh.g.rotation.y = Math.atan2(hoop[0] - sh.x, hoop[2] - sh.z); sh.clip = { nombre: 'libre', t0: performance.now() / 1000, dur: 1.7, esc: 1 };
          setTimeout(() => { if (ES.libres !== tok) return; ES.balonDe = null; ES.anim = { t0: performance.now() / 1000, dur: T, keys: [[sh.x + dir * 0.3, 2.0, 0], hoop], arco: true, fin: hecho ? [hoop[0], 0.3, 0] : [hoop[0] - dir * 1.2, 0.3, (Math.random() - 0.5) * 2], cb: () => setTimeout(() => lanza(i + 1), 600) }; }, 790); };
        ES.anim.cb = () => lanza(0);
      }
    }
    let reloj = 0;
    function tick1() {
      reloj = requestAnimationFrame(tick1);
      if (ES.fase !== 'jugando' || ES.pausa) return;
      const ahora = performance.now() / 1000, dt = Math.min(0.1, ahora - (ES.ult || ahora)); ES.ult = ahora;
      ES.t = Math.min(ES.dur, ES.t + dt * ES.vel * 4);
      while (ES.idx < ES.cola.length && ES.cola[ES.idx].t <= ES.t) { if (ES.clave && !ES.clave.hecha && ES.idx === ES.clave.idx) { ES.fase = 'clave'; ES.vel = Math.min(ES.vel, 2); narra('¡Momento decisivo!', 'bien'); controles(); return; } juega(ES.cola[ES.idx++]); }
      pintaMarcador();
      if (ES.t >= ES.dur && ES.idx >= ES.cola.length) finCuarto();
    }
    function empiezaCuarto() {
      const r = D.jugarCuarto(); if (!r) return;
      ES.cuarto = r.cuarto; ES.dur = r.duracion; ES.t = 0; ES.cola = r.eventos; ES.idx = 0; ES.fase = 'jugando'; ES.ult = performance.now() / 1000; ES.pausa = false; ES.cierre = r; ES.clave = buscaClave(r);
      if (ES.cola.length) { ids.A = ES.cola[0].pista[0]; ids.B = ES.cola[0].pista[1]; }
      narra('Empieza el ' + (r.cuarto <= 4 ? r.cuarto + 'º cuarto' : 'la prórroga') + '.'); controles(); paneles(); pintaMarcador();
    }
    function finCuarto() {
      const r = ES.cierre; ES.marcador = r.marcador.slice(); ES.fase = D.terminado ? 'fin' : 'descanso'; ES.t = ES.dur;
      narra((D.terminado ? 'Final del partido: ' : 'Fin del cuarto: ') + r.marcador.join('-') + '.', 'bien'); pintaMarcador(); controles(); paneles();
    }
    // Momento decisivo: en el último cuarto o la prórroga, última posesión de tu equipo en los 30 segundos finales con empate o perdiendo de 1 a 3.
    // En la carrera solo si estás en pista (y el balón es tuyo); en los demás modos el balón es para la estrella que está en pista.
    function buscaClave(r) {
      if (!lado || r.cuarto < 4 || (!control && st.modo !== 'carrera')) return null;
      let mejor = null;
      r.eventos.forEach((ev, i) => {
        if (ev.eq !== lado || ev.t < r.duracion - 30) return;
        const mio = (lado === 'A' ? ev.a : ev.b) - (ev.pts || 0), suyo = lado === 'A' ? ev.b : ev.a, dif = mio - suyo, enP = ev.pista[lado === 'A' ? 0 : 1];
        if (dif > 0 || dif < -3) return; if (st.modo === 'carrera' && enP.indexOf('yo') < 0) return;
        mejor = { idx: i, dif };
      });
      return mejor;
    }
    function pintaClave() {
      const ev = ES.cola[ES.idx], c = ES.clave, quedan = Math.max(1, Math.round(ES.dur - ev.t)), T = lado === 'A' ? D.A : D.B, enP = ev.pista[lado === 'A' ? 0 : 1];
      const pista = T.rot.filter(e => enP.indexOf(e.p.id) >= 0), ejec = st.modo === 'carrera' && enP.indexOf('yo') >= 0 ? 'yo' : (pista.slice().sort((a, b) => b.p.ovr - a.p.ovr)[0] || T.rot[0]).p.id;
      const tirador = pista.filter(e => e.p.id !== ejec).sort((a, b) => b.p.att.tiro3 - a.p.att.tiro3)[0], yoMismo = ejec === 'yo';
      const sit = c.dif === 0 ? 'vais empatados' : 'perdéis de ' + (-c.dif), quien = yoMismo ? 'El balón es tuyo.' : 'El balón es para ' + nombre(ejec) + '.';
      const opc = [['tirar', 'Tirar', c.dif === -3 ? 'Triple para empatar' : 'Tiro en suspensión'], ['pasar', 'Pasar', tirador ? 'Buscar a ' + nombre(tirador.p.id) + ' solo' : 'Buscar al compañero libre'], ['penetrar', 'Penetrar', c.dif === -3 ? 'Canasta rápida y buscar la falta' : 'Atacar el aro y buscar la falta']];
      ctrl.append(h('div', { class: 'dir-clave' }, h('b', null, 'Momento decisivo'), h('p', null, 'Quedan ' + quedan + ' segundos y ' + sit + '. ' + quien + ' ¿Qué haces?'),
        h('div', { class: 'opc' }, opc.map(([id, t, d]) => h('button', { class: 'btn', onclick: () => resolverClave(id, ejec) }, h('b', null, t), h('span', null, d))))));
    }
    function resolverClave(op, ejec) {
      const ev = ES.cola[ES.idx], c = ES.clave, res = D.jugadaClave(lado, op, ev, ejec, c.dif);
      Object.assign(ev, { r: res.r, v: res.v, jug: res.jug, ast: res.ast, ok: res.ok, pts: res.pts, reb: null, oreb: null, tap: null, rob: null });
      for (let j = ES.idx; j < ES.cola.length; j++) { if (lado === 'A') ES.cola[j].a += res.delta; else ES.cola[j].b += res.delta; }
      ES.cierre.marcador = res.marcador; ES.cierre.terminado = res.terminado; c.hecha = true;
      const nj = nombre(res.jug), fin = res.r === 'ok' ? (res.extra ? '¡' + nj + ' anota con falta y adicional!' : '¡' + nj + ' la mete!' + (res.v === 3 ? ' Triple.' : '')) : res.r === 'falta' ? 'Falta sobre ' + nj + ': ' + res.ok + '/2 desde la línea.' : res.r === 'tov' ? 'Balón perdido en la jugada decisiva.' : nj + ' falla.';
      ES.fase = 'jugando'; ES.ult = performance.now() / 1000; juega(ES.cola[ES.idx++], true); narra(fin, res.pts ? 'bien' : ''); controles();
    }
    // Tifo de clásico: un mosaico con los colores y las siglas de cada club sobre la grada alta, banderas que ondean y bengalas; al celebrar el local el mosaico cambia de dibujo
    function tifoClasico(W3, K, eL, eV, L, W, ES) {
      const T3 = THREE, col = e => (e.colores[0] === '#000000' ? '#222222' : e.colores[0]), sec = e => e.colores[1] || '#ffffff', zf = W + 1.6 + 4 * 0.9 + 0.5;
      const lienzo = (e, alt) => { try { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); if (!x) return null; x.fillStyle = alt ? sec(e) : col(e); x.fillRect(0, 0, 256, 64); x.fillStyle = alt ? col(e) : sec(e); for (let i = -2; i < 12; i++) { x.beginPath(); x.moveTo(i * 24, 64); x.lineTo(i * 24 + 12, 64); x.lineTo(i * 24 + 44, 0); x.lineTo(i * 24 + 32, 0); x.closePath(); x.fill(); } x.fillStyle = alt ? sec(e) : col(e); x.fillRect(86, 12, 84, 40); x.fillStyle = alt ? col(e) : sec(e); x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e.siglas, 128, 33); const t = new T3.CanvasTexture(c); return t; } catch (er) { return null; } };
      const planos = []; [[eL, -1], [eV, 1]].forEach(([e, s]) => { const a = lienzo(e, false), b = lienzo(e, true); const m = new T3.Mesh(new T3.PlaneGeometry(L * 1.6, 3.4), a ? new T3.MeshBasicMaterial({ map: a, side: T3.DoubleSide }) : new T3.MeshBasicMaterial({ color: col(e), side: T3.DoubleSide })); m.position.set(0, 4.3, s * zf); m.rotation.y = 0; W3.add(m); planos.push({ m, a, b, e }); });
      const banderas = []; [-1, 1].forEach(s => { for (let i = 0; i < 7; i++) { const e = i % 2 ? eV : eL, g = new T3.Group(), mastil = new T3.Mesh(new T3.CylinderGeometry(0.03, 0.03, 2.2, 6), new T3.MeshBasicMaterial({ color: 0x444444 })); mastil.position.y = 1.1; const tela = new T3.Mesh(new T3.PlaneGeometry(0.9, 0.55, 6, 1), new T3.MeshBasicMaterial({ color: i % 2 ? sec(e) : col(e), side: T3.DoubleSide })); tela.position.set(0.47, 1.9, 0); g.add(mastil, tela); g.position.set(-L + 1.2 + i * (2 * L - 2.4) / 6, 2.4 + (i % 3) * 0.3, s * (zf - 0.7)); W3.add(g); banderas.push({ tela, i }); } });
      const bengalas = []; [-1, 1].forEach(s => { for (let i = 0; i < 6; i++) { const b = new T3.Mesh(new T3.CylinderGeometry(0.05, 0.05, 0.35, 6), new T3.MeshBasicMaterial({ color: 0xff3b1a })); b.position.set(-L + 2 + i * (2 * L - 4) / 5, 3.1, s * (zf - 1.0)); b.visible = false; W3.add(b); bengalas.push(b); } });
      ES.tifoAnim = t => { banderas.forEach(f => { const v = f.tela.geometry.attributes.position; for (let k = 0; k < v.count; k++) { const x0 = v.getX(k) + 0.45; v.setZ(k, Math.sin(t * 5 + x0 * 5 + f.i) * 0.08 * (x0 + 0.1)); } v.needsUpdate = true; });
        const C = ES.celebra, act = C && t - C.t0 < 1.8; planos.forEach((p, i) => { if (p.a && p.b) { const map = act && (C.k === 'A') === (i === 0) ? p.b : p.a; if (p.m.material.map !== map) { p.m.material.map = map; p.m.material.needsUpdate = true; } } }); bengalas.forEach((b, i) => { b.visible = !!act && (i < 6 ? C.k === 'A' : C.k === 'B') ? Math.sin(t * 20 + i) > -0.3 : false; }); };
    }
    // Estadísticas en vivo y repetición de la última jugada notable
    function statsPinta() {
      statEl.style.display = ES.stats ? '' : 'none'; if (!ES.stats || !NAR) return; const s = NAR.estadisticas(); statEl.innerHTML = '';
      ['A', 'B'].forEach(k => { const e = st.equipos[k === 'A' ? g.local : g.visitante]; statEl.append(h('div', { class: 'dir-stat' }, h('b', null, e.siglas + ' ' + s.eq[k].pts + ' pts, ' + s.eq[k].reb + ' reb, ' + s.eq[k].ast + ' ast, ' + s.eq[k].tov + ' per'), s[k].map(x => h('div', { class: 'fila' }, h('span', null, x.nombre), h('span', { class: 'muted' }, x.pts + ' pts, ' + x.reb + ' reb, ' + x.ast + ' ast'))))); });
    }
    function repetir() {
      const ev = NAR && NAR.ultimaNotable(); if (!ev) { narra('Todavía no hay una jugada para repetir.'); return; } if (ES.repe) return; const pausa = ES.pausa, m0 = ES.marcador.slice(), at0 = ES.ataca; ES.repe = true; ES.pausa = true;
      const marca = h('div', { class: 'dir-repe' }, 'REPETICIÓN'); vistaEl.append(marca); narra('Repetición: ' + (ev.r === 'ok' ? nombre(ev.jug) + (ev.v === 3 ? ' desde el triple' : ' anota') : ev.tap ? 'tapón de ' + nombre(ev.tap) : 'la jugada') + '.', 'bien'); juega(ev, true);
      setTimeout(() => { ES.repe = false; ES.pausa = pausa; ES.marcador = m0; ES.ataca = at0; marca.remove(); ES.anim = null; pintaMarcador(); controles(); }, 3800);
    }
    function saltar() { while (ES.idx < ES.cola.length) ES.cola[ES.idx++]; ES.anim = null; finCuarto(); }
    function terminar() {
      cancelAnimationFrame(reloj);
      const res = D.finalizar();
      if (V) V.dispose(); fondo.remove();
      if (opt.onFin) opt.onFin(res);
    }
    function controles() {
      ctrl.innerHTML = '';
      if (ES.fase === 'clave') { pintaClave(); return; }
      if (ES.fase === 'inicio') { ctrl.append(h('button', { class: 'btn grande', onclick: empiezaCuarto }, 'Empezar el partido'), h('button', { class: 'btn btn-sec', onclick: () => { cancelAnimationFrame(reloj); if (V) V.dispose(); fondo.remove(); if (opt.onFin) opt.onFin(P.crearDirecto(st, g, false).finalizar()); } }, 'Simular sin verlo')); return; }
      if (ES.fase === 'jugando') {
        ctrl.append(h('div', { class: 'seg compacto' }, [[1, '×1'], [2, '×2'], [4, '×4'], [16, 'Rápido']].map(o => h('button', { class: 'tab' + (ES.vel === o[0] ? ' on' : ''), onclick: () => { ES.vel = o[0]; controles(); } }, o[1])),
          h('button', { class: 'tab', onclick: () => { ES.pausa = !ES.pausa; paneles(); controles(); } }, ES.pausa ? '▶ Seguir' : '⏸ Pausa'), h('button', { class: 'tab', onclick: saltar }, 'Saltar cuarto'), NAR ? h('button', { class: 'tab', onclick: () => { ES.stats = !ES.stats; statsPinta(); } }, 'Estadísticas') : null, NAR ? h('button', { class: 'tab', onclick: repetir }, 'Repetición') : null, NAR && V ? h('button', { class: 'tab', onclick: () => { const k = Object.keys(GM.narrador.CAMARAS), i = k.indexOf(ES.cam || 'general'); ES.cam = k[(i + 1) % k.length]; if (ES.cam === 'general' && V) { V.__camModo = null; GM.narrador.camara(V, 'general', null, null, window.innerWidth); } controles(); } }, 'Cámara: ' + GM.narrador.CAMARAS[ES.cam || 'general'].n) : null));
        return;
      }
      ctrl.append(D.terminado ? h('button', { class: 'btn grande', onclick: terminar }, 'Terminar el partido') : h('div', { class: 'par' }, h('button', { class: 'btn', onclick: empiezaCuarto }, 'Siguiente cuarto'), h('button', { class: 'btn btn-sec', onclick: terminar }, 'Simular el resto')));
    }
    function paneles() {
      panel.innerHTML = '';
      if (!control) { if (ES.fase === 'descanso') panel.append(h('p', { class: 'muted' }, 'Descanso. Estás viendo el partido: el entrenador lleva el equipo.')); return; }
      if (ES.fase !== 'descanso' && !(ES.fase === 'jugando' && ES.pausa)) return;
      const T = lado === 'A' ? D.A : D.B, seg = (tit, key, ops) => h('div', { class: 'ajuste' }, h('b', null, tit), h('div', { class: 'seg' }, ops.map(o => h('button', { class: 'tab' + (T.tac[key] === o[0] ? ' on' : ''), onclick: () => { D.ajustar(lado, { [key]: o[0] }); narra('Ajuste táctico: ' + tit.toLowerCase() + ' ' + o[1].toLowerCase() + '.'); paneles(); } }, o[1]))));
      if (ES.fase === 'descanso' && D.charlaDescanso && GM.tacticaPlus) panel.append(h('div', { class: 'ajuste' }, h('b', null, 'Charla del descanso' + (T.charlaHecha ? ' (ya dada)' : '')), h('div', { class: 'seg' }, Object.keys(GM.tacticaPlus.CHARLAS).map(k => h('button', { class: 'tab', disabled: !!T.charlaHecha, title: GM.tacticaPlus.CHARLAS[k].d, onclick: () => { const r = D.charlaDescanso(lado, k); narra(r.ok ? 'Charla del descanso: ' + r.texto : r.motivo, r.ok ? 'bien' : undefined); paneles(); } }, GM.tacticaPlus.CHARLAS[k].n)))));
      panel.append(seg('Ritmo', 'ritmo', [[2, 'Lento'], [3, 'Normal'], [4, 'Rápido'], [5, 'Muy rápido']]), seg('Defensa', 'defensa', [['hombre', 'Individual'], ['zona', 'Zona'], ['mixta', 'Mixta']]), seg('Foco', 'foco', [['interior', 'Interior'], ['equilibrado', 'Equilibrado'], ['exterior', 'Exterior']]),
        h('div', { class: 'fila' }, h('b', null, 'Tiempos muertos: ' + D.tm[lado]), h('button', { class: 'btn btn-sec peq', disabled: D.tm[lado] <= 0, onclick: () => { if (D.tiempoMuerto(lado)) { narra('Tiempo muerto de ' + st.equipos[club].nombre + ': el equipo respira.', 'bien'); paneles(); } } }, 'Pedir tiempo muerto')),
        h('b', null, 'Cambios (afectan al siguiente tramo)'), h('div', { class: 'lista' }, T.rot.map(e => { const dentro = ids[lado].indexOf(e.p.id) >= 0; return h('button', { class: 'jug' + (dentro ? ' sel' : ''), onclick: () => { D.ajustar(lado, dentro ? { sacar: e.p.id } : { meter: e.p.id }); narra((dentro ? 'Sale ' : 'Entra ') + e.p.nombre.split(' ').slice(-1)[0] + ' en el próximo tramo.'); paneles(); } }, h('span', { class: 'pos' }, e.p.pos), h('span', { class: 'ct' }, h('b', null, e.p.nombre), h('span', { class: 'muted' }, Math.round(e.s.min) + ' min, fatiga ' + Math.round(e.p.estado.fatiga))), dentro ? h('span', { class: 'chip ok' }, 'En pista') : null, h('span', { class: 'ovr' }, e.p.ovr)); })));
    }
    pintaMarcador(); controles(); paneles(); tick1();
    return { cerrar: () => { cancelAnimationFrame(reloj); if (V) V.dispose(); fondo.remove(); }, D, ES };
  }
  function selfTest() { return typeof abrir === 'function' && formacion(true, 0)[0] < formacion(false, 0)[0] + 5; }
  GM.register('directo', { abrir, selfTest });
})();
