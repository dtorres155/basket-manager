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
    const fondo = h('div', { class: 'directo' });
    const marc = h('div', { class: 'dir-marcador' }), vistaEl = h('div', { class: 'dir-vista' }), tick = h('div', { class: 'dir-ticker' }), ctrl = h('div', { class: 'dir-ctrl' }), panel = h('div', { class: 'dir-panel' });
    fondo.append(marc, vistaEl, tick, ctrl, panel); document.body.appendChild(fondo);
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
        V = GM.kit.crear(vistaEl, { radio: 31, theta: 0.0, phi: 0.95, min: 14, max: 48, fondo: 0x10151b, sombras: false });
        const K = GM.kit, W3 = new THREE.Group(); V.scene.add(W3);
        const t = GM.campus && GM.campus.tex && GM.campus.tex('parqdir', 512, 256, (x, w, hh) => { for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#c98d4f' : '#bf8346'; x.fillRect(0, i * 16, w, 16); } x.strokeStyle = '#fff'; x.lineWidth = 3; x.strokeRect(6, 6, w - 12, hh - 12); x.beginPath(); x.moveTo(w / 2, 6); x.lineTo(w / 2, hh - 6); x.stroke(); x.beginPath(); x.arc(w / 2, hh / 2, 34, 0, 6.3); x.stroke(); x.strokeRect(6, hh / 2 - 44, 100, 88); x.strokeRect(w - 106, hh / 2 - 44, 100, 88); });
        const pm = new THREE.Mesh(new THREE.BoxGeometry(2 * L, 0.2, 2 * W), t ? new THREE.MeshLambertMaterial({ map: t }) : K.mat(0xc98d4f)); pm.position.y = -0.1; W3.add(pm);
        if (!t) { W3.add(K.caja(2 * L - 0.3, 0.02, 0.08, 0xffffff, 0, 0.01, 0)); W3.add(K.caja(0.08, 0.02, 2 * W - 0.3, 0xffffff, 0, 0.01, 0)); }
        W3.add(K.caja(2 * L + 6, 0.2, 2 * W + 6, 0x1b2229, 0, -0.35, 0));
        [-1, 1].forEach(s => { W3.add(K.cilindro(0.06, 3, 0x666666, s * (L - 0.3), 0, 0)); W3.add(K.caja(0.08, 1.2, 1.8, 0xf4f4f4, s * (L - 0.6), 2.4, 0)); const aro = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 8, 16), K.mat(0xff6a1a)); aro.rotation.x = Math.PI / 2; aro.position.set(s * HX, 3.0, 0); W3.add(aro); });
        // gradas
        for (let r = 0; r < 4; r++) { [-1, 1].forEach(s => { W3.add(K.caja(2 * L + 4, 0.6, 0.8, r % 2 ? 0x2d3a46 : 0x364654, 0, r * 0.6 - 0.3, s * (W + 1.6 + r * 0.9))); }); }
        jug = { A: [], B: [] };
        ['A', 'B'].forEach(k => { const cid = k === 'A' ? g.local : g.visitante, c = col(cid); for (let i = 0; i < 5; i++) { const gr = new THREE.Group(); gr.add(K.cilindro(0.34, 1.35, c, 0, 0.2, 0, 10)); gr.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), K.mat(0xe4b88f))); gr.children[1].position.y = 1.85; gr.position.set(0, 0, 0); W3.add(gr); jug[k].push({ g: gr, x: 0, z: 0, tx: 0, tz: 0 }); } });
        balon = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), K.mat(0xe3622b)); balon.position.set(0, 1, 0); W3.add(balon);
        ES.bx = 0; ES.bz = 0; ES.by = 1;
        // posiciones iniciales
        ['A', 'B'].forEach((k, ki) => jug[k].forEach((o, i) => { const f = formacion(k === 'A', i); o.x = o.tx = (k === 'A' ? -1 : 1) * 4 + (ki ? 1 : -1) * (i * 0.8); o.z = o.tz = (i - 2) * 2; }));
        V.anim = function (tm) {
          const dt = 0.033;
          ['A', 'B'].forEach(k => jug[k].forEach(o => { o.x += (o.tx - o.x) * 0.12; o.z += (o.tz - o.z) * 0.12; o.g.position.set(o.x, 0, o.z); o.g.rotation.y = Math.atan2(HX * (o.tx > 0 ? 1 : -1) - o.x, -o.z) * 0; }));
          const a = ES.anim, ahora = performance.now() / 1000;
          if (a) {
            let u = (ahora - a.t0) / a.dur; if (ES.pausa) { a.t0 += dt; u = (ahora - a.t0) / a.dur; }
            if (u >= 1) { balon.position.set(a.fin[0], a.fin[1], a.fin[2]); ES.anim = null; if (a.cb) a.cb(); }
            else { const n = a.keys.length - 1, s = Math.min(n - 1, Math.floor(u * n)), v = u * n - s, p0 = a.keys[s], p1 = a.keys[s + 1], arco = a.arco && s === n - 1 ? Math.sin(v * Math.PI) * 2.2 : Math.sin(v * Math.PI) * 0.2; balon.position.set(p0[0] + (p1[0] - p0[0]) * v, p0[1] + (p1[1] - p0[1]) * v + arco, p0[2] + (p1[2] - p0[2]) * v); }
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
    function juega(ev) {
      ES.marcador = [ev.a, ev.b];
      const k = ev.eq, otro = k === 'A' ? 'B' : 'A', dir = k === 'A' ? 1 : -1;
      ids.A = ev.pista[0]; ids.B = ev.pista[1];
      const nj = nombre(ev.jug), txt = e => e.replace('{j}', nj);
      if (V) colocar(k, ev);
      let frase = '', cls = '';
      if (ev.r === 'ok') { frase = txt(pick(ev.v === 3 ? FRASES.ok3 : FRASES.ok2)) + (ev.ast ? ' (' + FRASES.ast[0].replace('{j}', nombre(ev.ast)) + ')' : '') + '.'; cls = k === lado ? 'bien' : ''; }
      else if (ev.r === 'fallo') frase = txt(pick(ev.v === 3 ? FRASES.fallo3 : FRASES.fallo2)) + (ev.tap ? ' ' + FRASES.tap[0].replace('{j}', nombre(ev.tap)) : '') + (ev.reb ? ' ' + FRASES.reb[0].replace('{j}', nombre(ev.reb)) + '.' : ev.oreb ? ' Rebote ofensivo de ' + nombre(ev.oreb) + '.' : '');
      else if (ev.r === 'tov') frase = txt(pick(FRASES.tov)) + (ev.rob ? ' ' + FRASES.rob[0].replace('{j}', nombre(ev.rob)) + '.' : '.');
      else if (ev.r === 'falta') { frase = txt(pick(FRASES.falta)) + ': ' + ev.ok + '/' + ev.v + ' desde la línea.'; }
      narra(frase, cls);
      pintaMarcador();
      if (!V || ES.vel >= 16) return;
      const sh = posJug(k, ev.jug), hoop = [dir * HX, 3.0, 0], pase = () => { const o = jug[k][Math.floor(Math.random() * 5)]; return [o.tx, 1.4, o.tz]; };
      const pts = ev.r === 'ok' || ev.r === 'fallo' ? (ev.v === 3 ? 7 : 3.5) : 2;
      const ang = (Math.random() - 0.5) * 2.2, sp = sh ? [dir * (HX - pts * Math.cos(ang)), 0, pts * Math.sin(ang)] : [dir * 3, 0, 0];
      if (sh) { sh.tx = sp[0]; sh.tz = sp[2]; }
      const m0 = jug[k][0], keys = [[m0.x, 1.2, m0.z], pase(), pase(), [sp[0], 1.5, sp[2]]];
      if (ev.r === 'tov') keys.push([jug[otro][0].tx, 1.2, jug[otro][0].tz]);
      else if (ev.r === 'falta') keys.push([sp[0], 1.4, sp[2]]);
      else keys.push(hoop);
      const dur = Math.max(0.25, Math.min(1.6, 14 / ES.vel * 0.12));
      ES.anim = { t0: performance.now() / 1000, dur, keys, arco: ev.r === 'ok' || ev.r === 'fallo', fin: ev.r === 'fallo' ? [hoop[0] - dir * 1.2, 0.3, (Math.random() - 0.5) * 3] : keys[keys.length - 1] };
    }
    let reloj = 0;
    function tick1() {
      reloj = requestAnimationFrame(tick1);
      if (ES.fase !== 'jugando' || ES.pausa) return;
      const ahora = performance.now() / 1000, dt = Math.min(0.1, ahora - (ES.ult || ahora)); ES.ult = ahora;
      ES.t = Math.min(ES.dur, ES.t + dt * ES.vel * 4);
      while (ES.idx < ES.cola.length && ES.cola[ES.idx].t <= ES.t) juega(ES.cola[ES.idx++]);
      pintaMarcador();
      if (ES.t >= ES.dur && ES.idx >= ES.cola.length) finCuarto();
    }
    function empiezaCuarto() {
      const r = D.jugarCuarto(); if (!r) return;
      ES.cuarto = r.cuarto; ES.dur = r.duracion; ES.t = 0; ES.cola = r.eventos; ES.idx = 0; ES.fase = 'jugando'; ES.ult = performance.now() / 1000; ES.pausa = false; ES.cierre = r;
      if (ES.cola.length) { ids.A = ES.cola[0].pista[0]; ids.B = ES.cola[0].pista[1]; }
      narra('Empieza el ' + (r.cuarto <= 4 ? r.cuarto + 'º cuarto' : 'la prórroga') + '.'); controles(); paneles(); pintaMarcador();
    }
    function finCuarto() {
      const r = ES.cierre; ES.marcador = r.marcador.slice(); ES.fase = D.terminado ? 'fin' : 'descanso'; ES.t = ES.dur;
      narra((D.terminado ? 'Final del partido: ' : 'Fin del cuarto: ') + r.marcador.join('-') + '.', 'bien'); pintaMarcador(); controles(); paneles();
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
      if (ES.fase === 'inicio') { ctrl.append(h('button', { class: 'btn grande', onclick: empiezaCuarto }, 'Empezar el partido'), h('button', { class: 'btn btn-sec', onclick: () => { cancelAnimationFrame(reloj); if (V) V.dispose(); fondo.remove(); if (opt.onFin) opt.onFin(P.crearDirecto(st, g, false).finalizar()); } }, 'Simular sin verlo')); return; }
      if (ES.fase === 'jugando') {
        ctrl.append(h('div', { class: 'seg compacto' }, [[1, '×1'], [2, '×2'], [4, '×4'], [16, 'Rápido']].map(o => h('button', { class: 'tab' + (ES.vel === o[0] ? ' on' : ''), onclick: () => { ES.vel = o[0]; controles(); } }, o[1])),
          h('button', { class: 'tab', onclick: () => { ES.pausa = !ES.pausa; paneles(); controles(); } }, ES.pausa ? '▶ Seguir' : '⏸ Pausa'), h('button', { class: 'tab', onclick: saltar }, 'Saltar cuarto')));
        return;
      }
      ctrl.append(D.terminado ? h('button', { class: 'btn grande', onclick: terminar }, 'Terminar el partido') : h('div', { class: 'par' }, h('button', { class: 'btn', onclick: empiezaCuarto }, 'Siguiente cuarto'), h('button', { class: 'btn btn-sec', onclick: terminar }, 'Simular el resto')));
    }
    function paneles() {
      panel.innerHTML = '';
      if (!control) { if (ES.fase === 'descanso') panel.append(h('p', { class: 'muted' }, 'Descanso. Estás viendo el partido: el entrenador lleva el equipo.')); return; }
      if (ES.fase !== 'descanso' && !(ES.fase === 'jugando' && ES.pausa)) return;
      const T = lado === 'A' ? D.A : D.B, seg = (tit, key, ops) => h('div', { class: 'ajuste' }, h('b', null, tit), h('div', { class: 'seg' }, ops.map(o => h('button', { class: 'tab' + (T.tac[key] === o[0] ? ' on' : ''), onclick: () => { D.ajustar(lado, { [key]: o[0] }); narra('Ajuste táctico: ' + tit.toLowerCase() + ' ' + o[1].toLowerCase() + '.'); paneles(); } }, o[1]))));
      panel.append(seg('Ritmo', 'ritmo', [[2, 'Lento'], [3, 'Normal'], [4, 'Rápido'], [5, 'Muy rápido']]), seg('Defensa', 'defensa', [['hombre', 'Individual'], ['zona', 'Zona'], ['mixta', 'Mixta']]), seg('Foco', 'foco', [['interior', 'Interior'], ['equilibrado', 'Equilibrado'], ['exterior', 'Exterior']]),
        h('div', { class: 'fila' }, h('b', null, 'Tiempos muertos: ' + D.tm[lado]), h('button', { class: 'btn btn-sec peq', disabled: D.tm[lado] <= 0, onclick: () => { if (D.tiempoMuerto(lado)) { narra('Tiempo muerto de ' + st.equipos[club].nombre + ': el equipo respira.', 'bien'); paneles(); } } }, 'Pedir tiempo muerto')),
        h('b', null, 'Cambios (afectan al siguiente tramo)'), h('div', { class: 'lista' }, T.rot.map(e => { const dentro = ids[lado].indexOf(e.p.id) >= 0; return h('button', { class: 'jug' + (dentro ? ' sel' : ''), onclick: () => { D.ajustar(lado, dentro ? { sacar: e.p.id } : { meter: e.p.id }); narra((dentro ? 'Sale ' : 'Entra ') + e.p.nombre.split(' ').slice(-1)[0] + ' en el próximo tramo.'); paneles(); } }, h('span', { class: 'pos' }, e.p.pos), h('span', { class: 'ct' }, h('b', null, e.p.nombre), h('span', { class: 'muted' }, Math.round(e.s.min) + ' min, fatiga ' + Math.round(e.p.estado.fatiga))), dentro ? h('span', { class: 'chip ok' }, 'En pista') : null, h('span', { class: 'ovr' }, e.p.ovr)); })));
    }
    pintaMarcador(); controles(); paneles(); tick1();
    return { cerrar: () => { cancelAnimationFrame(reloj); if (V) V.dispose(); fondo.remove(); }, D };
  }
  function selfTest() { return typeof abrir === 'function' && formacion(true, 0)[0] < formacion(false, 0)[0] + 5; }
  GM.register('directo', { abrir, selfTest });
})();
