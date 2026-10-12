/* Interfaz del mundo 3D: barra superior (salir, mapa, foto, calidad, sonido, avanzar), teclado y toques/ratón de control del personaje.
   Se separó de sede3d.js: GM.sedeHud({ S: () => escena activa, U, mapa, anim, irA, girar, motor, modoFoto, avanzar, entrar, fichaJugador, estadoDia, abrir, cerrar }) devuelve { hud, controles, teclado }. */
(function () {
  GM.sedeHud = function (ctx) {
    const { U, mapa, anim, irA, girar, motor, modoFoto, avanzar, entrar, fichaJugador, estadoDia, abrir, cerrar } = ctx;
    const S = new Proxy({}, { get: (_, k) => ctx.S()[k], set: (_, k, v) => { ctx.S()[k] = v; return true; } });   // la escena activa cambia al abrir otra: se lee en cada acceso
    function hud(st) {
      const h = GM.h, club = st.equipos[st.clubId];
      S.raiz.querySelectorAll('.sede-hud').forEach(n => n.remove());
      const fecha = h('span', null, U.fechaLarga(st.fecha));
      const top = h('div', { class: 'sede-hud sede-top' },
        h('button', { class: 'btn btn-sec peq', onclick: cerrar }, 'Salir'),
        h('div', { class: 'ct' }, h('b', null, S.escena === 'casa' ? (S.casaNombre || 'Tu casa') : S.escena === 'interior' ? (S.interiorNombre || 'Interior') : S.escena === 'deportiva' ? (S.calleNombre || 'Ciudad deportiva') : S.escena === 'calle' || S.escena === 'pueblo' ? (S.calleNombre || club.ciudad) : club.nombre), S.escena === 'pueblo' ? h('span', null, 'Tu pueblo, ' + U.fechaLarga(st.fecha)) : S.escena === 'calle' ? h('span', null, club.ciudad + ', ' + U.fechaLarga(st.fecha)) : fecha), (S.chipHora = h('button', { class: 'sede-hora', title: 'Pasar una hora', onclick: () => { if (S.hora >= 23) return GM.ui.toast('Es tarde: avanza al día siguiente'); S.hora = Math.min(23, Math.floor(S.hora) + 1); S.tLuz = 0; GM.ui.toast('Pasa una hora: ' + Math.floor(S.hora) + ':00'); } }, '8:00')), (S.chipDia = h('span', { class: 'sede-dia' }, (S.dia || estadoDia(st)).texto)),
        h('button', { class: 'btn btn-sec peq', onclick: () => mapa() }, 'Mapa'),
        h('button', { class: 'btn btn-sec peq', onclick: () => modoFoto() }, 'Foto'),
        h('button', { class: 'btn btn-sec peq', title: 'Calidad gráfica: bajo, medio, alto o ultra (reinicia la escena)', onclick: () => { const N = GM.campus.NIVELES, n = N[(N.indexOf(GM.campus.config.nivel) + 1) % N.length]; GM.campus.setNivel(n); const st = S.st, arg = S.escena + (S.escenaArg ? ':' + S.escenaArg : ''); cerrar(); GM.ui.toast('Calidad ' + n); setTimeout(() => abrir(st, arg), 60); } }, 'Calidad: ' + ((GM.campus && GM.campus.config.nivel) || 'alto')),
        GM.sonido ? h('button', { class: 'btn btn-sec peq', title: 'Activar o silenciar el sonido', onclick: e => { const on = GM.sonido.alternar(); e.currentTarget.textContent = on ? 'Sonido' : 'Sin sonido'; } }, GM.sonido.activo() ? 'Sonido' : 'Sin sonido') : null,
        S.escena === 'pueblo' && GM.puebloJuego ? h('button', { class: 'btn btn-sec peq', onclick: () => GM.puebloJuego.panelEncargos() }, 'Encargos (' + GM.puebloJuego.pendientes(st) + ')') : null,
        st.modo === 'carrera' && GM.mods.movil && GM.ui.movil ? (() => { const n = GM.mods.movil.noLeidos(st); return h('button', { class: 'btn btn-sec peq', onclick: () => GM.ui.movil() }, 'Móvil' + (n ? ' (' + n + ')' : '')); })() : null,
        h('button', { class: 'btn peq', onclick: () => avanzar(() => GM.ui.jugarUnDia()) }, 'Avanzar un día'));
      S.panel = h('div', { class: 'sede-hud sede-sala', style: { display: 'none' } });
      S.ficha = h('div', { class: 'sede-hud sede-ficha', style: { display: 'none' } });
      // Ayuda según el dispositivo; en pantallas táctiles, además, botones para girar y acercar la cámara. Se oculta sola a los 8 s (o al tocarla).
      const tactil = (() => { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
      const ayuda = h('div', { class: 'sede-hud sede-ayuda', onclick: () => ayuda.remove() }, tactil ? 'Toca el reloj para pasar una hora. Toca el suelo para caminar (doble toque para correr) o usa el joystick, arrastra para girar la cámara y pellizca para acercar. Pisa el círculo de una sala para ver qué puedes hacer y toca a una persona para hablar con ella.' : 'Clic en el reloj para pasar una hora. Toca el suelo para caminar (doble clic para correr) o usa WASD (Mayúsculas para correr). Rueda para acercar, Q y E para girar. Pisa el círculo de una sala para ver qué puedes hacer y toca a una persona para hablar con ella.');
      setTimeout(() => { if (ayuda.isConnected) ayuda.classList.add('fuera'); setTimeout(() => ayuda.remove(), 600); }, 8000);
      const ctrl = tactil ? h('div', { class: 'sede-hud sede-ctrl' },
        h('button', { 'aria-label': 'Girar a la izquierda', onclick: () => { S.yawObj += Math.PI / 4; } }, '⟲'), h('button', { 'aria-label': 'Girar a la derecha', onclick: () => { S.yawObj -= Math.PI / 4; } }, '⟳'),
        h('button', { 'aria-label': 'Acercar', onclick: () => { S.zoom = Math.max(8, S.zoom * 0.8); } }, '+'), h('button', { 'aria-label': 'Alejar', onclick: () => { S.zoom = Math.min(42, S.zoom * 1.25); } }, '−')) : null;
      S.raiz.append(top, S.panel, S.ficha, ayuda); if (ctrl) S.raiz.append(ctrl);
      // Joystick táctil: abajo a la izquierda; a fondo, corres. Se mueve en la dirección de la cámara.
      if (tactil) { const pomo = h('div', { class: 'sede-joy-p' }), joy = h('div', { class: 'sede-hud sede-joy', 'aria-label': 'Joystick para caminar' }, pomo); S.joy = { activo: false, x: 0, y: 0 };
        const mover = e => { const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2; let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } S.joy.x = dx; S.joy.y = dy; pomo.style.transform = 'translate(' + dx * R * 0.6 + 'px,' + dy * R * 0.6 + 'px)'; };
        joy.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); joy.setPointerCapture && joy.setPointerCapture(e.pointerId); S.joy.activo = true; mover(e); });
        joy.addEventListener('pointermove', e => { if (S.joy.activo) { e.preventDefault(); mover(e); } });
        const soltar = () => { S.joy.activo = false; S.joy.x = S.joy.y = 0; pomo.style.transform = ''; }; joy.addEventListener('pointerup', soltar); joy.addEventListener('pointercancel', soltar);
        S.raiz.append(joy); }
      if (S.escena === 'casa' && GM.casa) { S.btnConstruir = h('button', { class: 'btn casa-btn', onclick: () => GM.casa.activar(S, motor()) }, S.construccion ? 'Salir del modo construcción' : 'Modo construcción'); S.raiz.append(h('div', { class: 'sede-hud casa-btn-cont' }, S.btnConstruir)); }
    }
    function controles(cv) {
      const ray = new THREE.Raycaster(), suelo = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ptrs = new Map(); let pinza = 0;
      const toque = (cx, cy) => {
        if (!S.yo) return; const r = cv.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), S.camera);
        if (S.construccion && GM.casa) { const pc = new THREE.Vector3(); if (ray.ray.intersectPlane(suelo, pc)) GM.casa.toque(S, motor(), pc, ray); return; }
        const npcs = S.gente.map(n => n.obj), hit = ray.intersectObjects(npcs, true)[0];
        if (hit) { let o = hit.object; while (o && !(o.userData && o.userData.npc !== undefined)) o = o.parent; if (o) { const n = S.gente[o.userData.npc]; fichaJugador(n); const yo = S.yo.obj.position; if (!n.fijo && n.camino) { n.camino = null; anim(n, 'idle'); n.espera = 6; } n.obj.lookAt(yo.x, 0, yo.z); return; } }
        const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(suelo, p)) return;
        { const dur = (ray.intersectObject(S.mundo, true).find(i => i.object.visible && !i.object.isSprite && !(i.object.userData && i.object.userData.etiqueta) && i.object !== S.marcaDestino && i.object.material && !i.object.material.transparent)) || null;
          if (dur && dur.point.y > 0.25 && dur.distance < ray.ray.origin.distanceTo(p)) { const back = new THREE.Vector3(ray.ray.direction.x, 0, ray.ray.direction.z).normalize().multiplyScalar(0.7); p.set(dur.point.x - back.x, 0, dur.point.z - back.z); } }
        { const ahora = Date.now(), prev = S.ultToque; S.yo.rapido = !!(prev && ahora - prev.t < 350 && Math.hypot(prev.x - p.x, prev.z - p.z) < 3); S.ultToque = { t: ahora, x: p.x, z: p.z }; }
        { let mejor = null, dm = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ? 1.4 : 0.9; S.gente.forEach(n => { const d = Math.hypot(n.obj.position.x - p.x, n.obj.position.z - p.z); if (d < dm) { dm = d; mejor = n; } }); if (mejor) { fichaJugador(mejor); if (!mejor.fijo && mejor.camino) { mejor.camino = null; anim(mejor, 'idle'); mejor.espera = 6; } mejor.obj.lookAt(S.yo.obj.position.x, 0, S.yo.obj.position.z); return; } }
        const z = S.zonas && S.zonas.find(z => Math.hypot(z.obj.position.x - p.x, z.obj.position.z - p.z) < 0.9);
        irA(S.yo, p.x, p.z, z ? () => entrar(z.sala) : null);
        const m = S.marcaDestino || (S.marcaDestino = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.25, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }))); m.position.set(p.x, 0.03, p.z); S.scene.add(m);
      };
      cv.addEventListener('pointerdown', e => { cv.setPointerCapture && cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: Date.now() }); if (ptrs.size === 2) { const a = [...ptrs.values()]; pinza = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); } });
      cv.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x; p.x = e.clientX; p.y = e.clientY; if (ptrs.size === 1 && Math.abs(p.x - p.x0) > 8) S.yawObj -= dx * 0.006; else if (ptrs.size === 2) { const a = [...ptrs.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (pinza) S.zoom = Math.max(8, Math.min(42, S.zoom * pinza / d)); pinza = d; } });
      cv.addEventListener('pointerup', e => { const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); pinza = 0; if (p && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 8 && Date.now() - p.t < 450) toque(e.clientX, e.clientY); });
      cv.addEventListener('pointermove', e => { if (!S || !S.construccion || !GM.casa || ptrs.size) return; const r = cv.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), S.camera); const pc = new THREE.Vector3(); if (ray.ray.intersectPlane(suelo, pc)) GM.casa.hover(S, pc); });
      cv.addEventListener('wheel', e => { e.preventDefault(); S.zoom = Math.max(8, Math.min(42, S.zoom * (1 + e.deltaY * 0.001))); }, { passive: false });
      S.onKey = e => { if (!S || S.pausa) return; const k = e.key.toLowerCase(); if (e.type === 'keydown') { if (k === 'q') S.yawObj += Math.PI / 2; if (k === 'e' && S.zonaActual) entrar(S.zonaActual.sala); else if (k === 'e') S.yawObj -= Math.PI / 2; if (k === 'r' && S.construccion && GM.casa) GM.casa.rotar(S); if (k === 'escape') { if (S.construccion && GM.casa) GM.casa.activar(S, motor(), false); else cerrar(); } } S.teclas[k] = e.type === 'keydown'; S.teclas.shift = e.shiftKey; };
      window.addEventListener('keydown', S.onKey); window.addEventListener('keyup', S.onKey);
    }
    function teclado(dt) {
      const k = S.teclas, J = S.joy; let ax = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0), az = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0), corre = !!k.shift, fuerza = 1;
      if (J && J.activo && Math.hypot(J.x, J.y) > 0.15) { ax = J.x; az = J.y; fuerza = Math.min(1, Math.hypot(J.x, J.y)); corre = fuerza > 0.92; }
      if (!ax && !az) { if (S.yo.teclado) { S.yo.teclado = false; anim(S.yo, 'idle'); } return; }
      S.yo.camino = null; S.yo.teclado = true; anim(S.yo, corre ? 'sprint' : 'walk');
      const c = Math.cos(S.yaw), s = Math.sin(S.yaw), dx = ax * c + az * s, dz = -ax * s + az * c, l = Math.hypot(dx, dz), v = (corre ? 4.2 : 2.1 * Math.max(0.5, fuerza)) * (S.yo.bici ? (S.yo.velBici || 2.5) : 1) * dt, o = S.yo.obj.position;
      const nx = o.x + dx / l * v, nz = o.z + dz / l * v, G = S.G, ok = (x, z) => { const [i, j] = G.celda(x, z); return G.libre(i, j); };
      if (ok(nx, nz)) { o.x = nx; o.z = nz; } else if (ok(nx, o.z)) o.x = nx; else if (ok(o.x, nz)) o.z = nz;
      girar(S.yo, Math.atan2(dx, dz), dt);
    }
    return { hud, controles, teclado };
  };
})();
