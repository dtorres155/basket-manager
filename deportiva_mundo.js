/* CIUDAD DEPORTIVA PARA PASEAR (GM.deportivaMundo) — escena 'deportiva' del motor de sede3d.js
   Es el mismo campus que se ve en el menú (ciudadDeportiva.campusEn: entorno, parcelas, edificios por nivel y obras por fases),
   escalado a tamaño real (×4,2: una persona mide lo que mide). Se entra por la puerta del final de la calle central de la ciudad
   (zona del campus en ciudad_barrios.js) o con «Pasear por la ciudad deportiva» en su menú. Todo lo que tiene altura (edificios,
   setos, farolas, árboles) bloquea el paso; delante de cada edificio hay una zona con su panel: estado, construir o mejorar (en los
   modos de gestión) y sus actividades, las mismas que en el menú. Jugadores del club corren por el camino de ronda.
   Expone: construir(S, M, st), poblar(S, M, st), siguiente(S, M, n), ESCALA. */
(function () {
  const U = GM.util, ESCALA = 4.2;
  function construir(S, M, st) {
    const W = S.mundo, id = st.clubId, CD = GM.mods.ciudadDeportiva, club = st.equipos[id];
    const Wc = new THREE.Group(); Wc.scale.setScalar(ESCALA); W.add(Wc);
    const { L, mallas } = CD.campusEn(Wc, st, id);
    const A = L.ancho, B = L.fondo, cz = L.cz, k = ESCALA, gz = (cz + B + 0.4) * k;
    S.scene.background = new THREE.Color(0xa9d6f2); S.scene.fog = new THREE.Fog(0xb9dcf2, 90, 420); S.camera.far = 900; S.camera.updateProjectionMatrix();
    const lim = [-(A + 2) * k, (cz - B - 2) * k, (A + 2) * k, (cz + B + 4) * k], G = M.rejilla({ limites: lim, CELDA: 0.5 }); S.G = G;
    // Fuera del seto no se camina (salvo la puerta, al sur)
    for (let z = lim[1]; z < lim[3]; z += 1) for (let x = lim[0]; x < lim[2]; x += 1) { const e = Math.hypot((x + 0.5) / ((A + 0.4) * k), (z + 0.5 - cz * k) / ((B + 0.4) * k)); if (e > 0.985 && !(Math.abs(x) < 7 && z > gz - 6)) G.bloquea(x, z, x + 1, z + 1); }
    // Lo que tiene altura bloquea: edificios, setos, farolas, árboles, la fuente
    W.updateMatrixWorld(true); const caja = new THREE.Box3();
    Wc.traverse(o => { if (!o.isMesh || o.isInstancedMesh) return; caja.setFromObject(o); if (caja.max.y - caja.min.y < 0.8 || caja.min.y > 1.6 || caja.max.x - caja.min.x > 60 || caja.max.z - caja.min.z > 60) return; const m = 0.15; G.bloquea(caja.min.x + m, caja.min.z + m, caja.max.x - m, caja.max.z - m); });
    // Zonas: una delante de cada edificio (mirando a la plaza central) y la salida
    const modoGestion = st.modo === 'gestor' || st.modo === 'presidente';
    const zonas = []; S.paseoCD = [];
    L.slots.forEach(sl => {
      const dx = 0 - sl.x, dz = cz - sl.z, l = Math.hypot(dx, dz) || 1, zx = (sl.x + dx / l * 3.9) * k, zzz = (sl.z + dz / l * 3.9) * k;
      const sala = { id: 'cd_' + sl.id, nombre: sl.nombre, accion: '', destino: { todos: 'club' }, acciones: s2 => accionesParcela(s2, sl.id, modoGestion) };
      zonas.push([sala, zx, zzz]); S.paseoCD.push([zx, zzz]);
    });
    zonas.push([{ id: 'salir_deportiva', nombre: 'Salir a la ciudad', accion: 'Volver a la calle', destino: {}, irA: 'calle', boton: 'Salir a la calle' }, 0, gz + 4]);
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; S.paseoCD.push([Math.cos(a) * 8.6 * k, (Math.sin(a) * 7.4 + cz) * k]); }
    S.zonas = zonas.map(([sala, x, z]) => M.zona(W, sala, x, z, club));
    S.spawnDeportiva = { x: 0, z: gz - 2, ry: Math.PI };
    S.calleNombre = L.nombre; S.mallasCD = mallas;
    return W;
  }
  // Panel de cada parcela: estado, obra, construir o mejorar (si mandas tú) y actividades
  function accionesParcela(st, slot, gestion) {
    const CD = GM.mods.ciudadDeportiva, id = st.clubId, p = CD.parcelas(st, id).find(x => x.slot === slot); if (!p) return [];
    const out = [{ id: 'info', t: p.nivel ? p.nombre + ', nivel ' + p.nivel + ' de ' + p.nivelMax : p.nombre + ': solar', d: p.actual || p.desc, disponible: false, motivo: p.estado === 'obra' ? 'En obras: ' + p.motivo : p.actual || p.desc, fn: () => ({ ok: false }) }];
    if (p.estado === 'libre' || p.estado === 'mejorable') out.push({ id: 'obra', t: (p.nivel ? 'Mejorar: ' : 'Construir: ') + p.proximo, d: U.eur(p.coste) + ', ' + p.dias + ' días de obra.', disponible: gestion, motivo: gestion ? '' : 'Lo decide la dirección del club', fn: () => { const r = p.nivel ? CD.mejorar(st, id, slot) : CD.construir(st, id, slot); return r.ok ? { ok: true, texto: 'Empiezan las obras' } : r; } });
    (CD.actividades(st, id, slot) || []).forEach(a => out.push({ id: a.id, t: a.t, d: a.coste ? U.eur(a.coste) : 'Sin coste', disponible: a.disponible && (gestion || !a.coste), motivo: a.motivo || 'Lo decide la dirección del club', fn: () => { const r = CD.hacerActividad(st, id, slot, a.id); return r.ok ? { ok: true, texto: a.t } : r; } }));
    return out;
  }
  const PIEL = ['#f1c7a5', '#e0ac85', '#c68863', '#9a6142', '#6e4329'], PELO = ['#1d1510', '#3b2617', '#6a4425', '#a9793e'];
  async function poblar(S, M, st) {
    const club = st.equipos[st.clubId], c1 = club.colores[0], c2 = club.colores[1] || '#222', r = (() => { let a = U.hash(st.fecha + 'cd') >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
    const jug = club.plantilla.map(i => st.jugadores[i]).filter(p => p && p.id !== 'yo').slice(0, 8);
    for (let i = 0; i < jug.length; i++) {
      const j = jug[i], p = await M.personaje({ modelo: ['h-casual_hoodie', 'h-casual_2', 'h-beach'][i % 3], altura: j.altura || 198, piel: PIEL[(U.hash(j.id) >>> 2) % 5], pelo: PELO[(U.hash(j.id) >>> 5) % 4], ropa: [c1, c2] });
      const q = S.paseoCD[(r() * S.paseoCD.length) | 0]; p.obj.position.set(q[0], 0, q[1]); Object.assign(p, { rol: j.nombre, jugador: j.id, r, espera: r() * 3, rapido: i % 2 === 0 });
      p.obj.userData = { npc: S.gente.length }; M.anim(p, 'idle'); S.mundo.add(p.obj); S.gente.push(p);
    }
    for (let i = 0; i < 3; i++) { const p = await M.personaje({ modelo: i % 2 ? 'm-formal' : 'h-worker', altura: 172, piel: PIEL[i + 1], pelo: PELO[i] }); const q = S.paseoCD[i]; p.obj.position.set(q[0], 0, q[1]); Object.assign(p, { rol: i % 2 ? 'Personal del club' : 'Mantenimiento', fijo: true, r, espera: 99 }); p.obj.userData = { npc: S.gente.length }; M.anim(p, i % 2 ? 'idle' : 'interact-right'); S.mundo.add(p.obj); S.gente.push(p); }
  }
  function siguiente(S, M, n) {
    if (n.fijo) { n.espera = 60; return; }
    const q = S.paseoCD[(n.r() * S.paseoCD.length) | 0]; if (!q) { n.espera = 5; return; }
    const ok = M.irA(n, q[0] + (n.r() - 0.5) * 2, q[1] + (n.r() - 0.5) * 2, () => { M.anim(n, 'idle'); n.espera = 2 + n.r() * 5; });
    if (!ok) n.espera = 2;
  }
  GM.deportivaMundo = { construir, poblar, siguiente, ESCALA };
})();
