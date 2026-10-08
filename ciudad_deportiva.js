/* CIUDAD DEPORTIVA 3D (GM.mods.ciudadDeportiva) — v2 sin cuadrícula
   Cada club tiene un campus con parcelas fijas (GM.campus.layout). Cada parcela admite un tipo de edificio que se construye y mejora por niveles;
   las obras duran días y se ven por fases. Expone: catalogo, parcelas, construir(st,club,slotId), mejorar(st,club,slotId), efectos, mantenimiento, mount, unmount, selfTest.
   Escribe state.instalaciones[clubId].ciudadDeportiva = { edificios: [{ slot, tipo, nivel, obra: null|{inicio,fin,dest} }] }. */
(function () {
  const U = GM.util;
  const CAT = [
    { tipo: 'pista', nombre: 'Pabellón de entrenamiento', coste: 600000, nivelMax: 5, ef: { entrenamiento: 0.05 }, desc: 'Más pistas y mejores canastas: la plantilla progresa más rápido.', niveles: ['Pista básica', 'Pista con vestuarios', 'Pabellón de entrenamiento', 'Pabellón con paneles solares', 'Centro de alto rendimiento'] },
    { tipo: 'gimnasio', nombre: 'Gimnasio y preparación física', coste: 450000, nivelMax: 5, ef: { entrenamiento: 0.03, recuperacion: 0.03 }, desc: 'Fuerza, prevención y mejor recuperación.', niveles: ['Sala de pesas', 'Gimnasio de dos plantas', 'Gimnasio con terraza', 'Pista de atletismo exterior', 'Centro de rendimiento'] },
    { tipo: 'medico', nombre: 'Centro médico', coste: 700000, nivelMax: 5, ef: { recuperacion: 0.07 }, desc: 'Las lesiones duran menos y la fatiga baja antes.', niveles: ['Enfermería', 'Consultas y fisioterapia', 'Clínica con ambulancia', 'Clínica con quirófano', 'Hospital con helipuerto'] },
    { tipo: 'residencia', nombre: 'Residencia de jugadores', coste: 1200000, nivelMax: 4, ef: { cantera: 0.07 }, desc: 'Atrae a mejores promesas de fuera de la ciudad.', niveles: ['Pisos', 'Residencia de tres plantas', 'Residencia con jardín', 'Residencia de cuatro plantas'] },
    { tipo: 'cantera', nombre: 'Academia de cantera', coste: 900000, nivelMax: 5, ef: { cantera: 0.08 }, desc: 'Mejora la calidad de los juveniles que salen cada año.', niveles: ['Casa de formación', 'Ala moderna', 'Pista propia', 'Segundo edificio', 'Academia de referencia'] },
    { tipo: 'tienda', nombre: 'Tienda oficial', coste: 400000, nivelMax: 3, ef: { ingresos: 0.03 }, desc: 'Más ingresos de merchandising en los partidos en casa.', niveles: ['Tienda', 'Tienda ampliada', 'Flagship store'] },
    { tipo: 'parking', nombre: 'Aparcamiento y accesos', coste: 300000, nivelMax: 3, ef: { ciudad: 0.01 }, desc: 'Llegar al pabellón es más fácil: algo más de público.', niveles: ['Aparcamiento', 'Aparcamiento ampliado', 'Aparcamiento con marquesina solar'] },
    { tipo: 'fans', nombre: 'Zona de aficionados', coste: 500000, nivelMax: 3, ef: { ciudad: 0.03 }, desc: 'Un punto de encuentro que alimenta el ambiente.', niveles: ['Plaza con banderas', 'Escenario para actos', 'Mural y espacio de peña'] },
    { tipo: 'oficinas', nombre: 'Oficinas del club', coste: 350000, nivelMax: 3, ef: { ingresos: 0.015 }, desc: 'Mejor gestión comercial.', niveles: ['Oficinas', 'Torre de oficinas', 'Sede corporativa'] },
    { tipo: 'emblema', nombre: 'Edificio emblemático', coste: 500000, nivelMax: 3, ef: { ciudad: 0.04, ingresos: 0.01, cantera: 0.03 }, desc: 'El edificio que representa la historia del club: refuerza el arraigo con la ciudad y da prestigio.', niveles: ['Edificio histórico', 'Edificio rehabilitado', 'Edificio emblemático'] },
    { tipo: 'museo', nombre: 'Museo del club', coste: 650000, nivelMax: 3, ef: { ciudad: 0.02, ingresos: 0.01 }, desc: 'Trofeos, camisetas históricas y la memoria del club: orgullo en la ciudad e ingresos por visitas.', niveles: ['Sala de trofeos', 'Museo del club', 'Museo interactivo'] },
    { tipo: 'hotel', nombre: 'Hotel de concentración', coste: 1000000, nivelMax: 3, ef: { recuperacion: 0.03, entrenamiento: 0.02 }, desc: 'El equipo descansa y se concentra en el propio campus antes de los partidos.', niveles: ['Habitaciones de concentración', 'Hotel del club', 'Hotel con spa'] },
    { tipo: 'prensa', nombre: 'Sala de prensa y medios', coste: 350000, nivelMax: 3, ef: { ingresos: 0.01, ciudad: 0.01 }, desc: 'Ruedas de prensa, entrevistas y el canal del club: mejor imagen y más valor para los patrocinadores.', niveles: ['Sala de prensa', 'Centro de medios', 'Plató del canal del club'] },
  ];
  const DIAS = [0, 12, 18, 25, 34, 45];
  // Actividades de cada edificio: cuestan dinero, tienen enfriamiento y dan efectos temporales o inmediatos.
  const ACT = {
    pista: [{ id: 'abiertas', t: 'Entrenamiento a puerta abierta', coste: 12000, cd: 30, ef: { aficion: 2, buff: ['entrenamiento', 0.08, 21] }, desc: 'La afición ve entrenar al equipo y los jugadores se motivan.' }],
    gimnasio: [{ id: 'campus', t: 'Campus de pretemporada', coste: 25000, cd: 45, ef: { buff: ['recuperacion', 0.1, 30] }, desc: 'Un mes de trabajo físico extra: se recupera mejor.' }],
    medico: [{ id: 'chequeo', t: 'Chequeo completo a la plantilla', coste: 15000, cd: 30, ef: { curar: 0.3 }, desc: 'Reduce un 30 % los días de baja de los lesionados.' }],
    residencia: [{ id: 'jornada', t: 'Jornada de convivencia', coste: 8000, cd: 40, ef: { buff: ['cantera', 0.06, 40], apoyo: 1 }, desc: 'Los jóvenes se integran mejor y las familias confían más.' }],
    cantera: [{ id: 'torneo', t: 'Torneo de jóvenes talentos', coste: 20000, cd: 60, ef: { buff: ['cantera', 0.1, 60], apoyo: 1 }, desc: 'Atrae miradas y mejora la captación durante dos meses.' }],
    tienda: [{ id: 'promo', t: 'Promoción de camisetas', coste: 5000, cd: 30, ef: { ingreso: 0.003, aficion: 0.5 }, desc: 'Un día de descuentos: ingresos extra y buena imagen.' }],
    parking: [{ id: 'bus', t: 'Lanzadera gratuita al pabellón', coste: 9000, cd: 30, ef: { aficion: 1.5, ambiente: 1 }, desc: 'Más gente llega con facilidad al próximo partido.' }],
    fans: [{ id: 'acto', t: 'Acto con las peñas', coste: 8000, cd: 30, ef: { penas: 6, aficion: 1 }, desc: 'Convives con las peñas del club.' }],
    oficinas: [{ id: 'reunion', t: 'Reunión con patrocinadores', coste: 0, cd: 60, ef: { ingreso: 0.004 }, desc: 'Una ronda de contactos que mejora los ingresos comerciales.' }],
    emblema: [{ id: 'visita', t: 'Visita guiada abierta al público', coste: 2000, cd: 20, ef: { aficion: 1.5, ingreso: 0.0015 }, desc: 'La historia del club, abierta a socios y turistas.' }],
    museo: [{ id: 'exposicion', t: 'Exposición temporal', coste: 10000, cd: 45, ef: { ingreso: 0.003, aficion: 1, apoyo: 1 }, desc: 'Una muestra sobre una época dorada del club: visitas, colegios y titulares.' }],
    hotel: [{ id: 'concentracion', t: 'Concentración antes de un partido grande', coste: 14000, cd: 30, ef: { buff: ['recuperacion', 0.08, 14] }, desc: 'Dos noches en el hotel del club: el equipo llega descansado al próximo partido importante.' }],
    prensa: [{ id: 'medios', t: 'Jornada de puertas abiertas a los medios', coste: 6000, cd: 30, ef: { aficion: 1, ingreso: 0.002 }, desc: 'Entrevistas y reportajes con los jugadores: buena prensa durante semanas.' }],
  };
  let V = null;

  const escala = (st, id) => U.clamp(st.equipos[id].presupuesto / 60e6, 0.3, 8);
  const obrasMod = (st, id) => GM.mods.ciudad ? GM.mods.ciudad.modificadores(st, id).obras : 1;
  const info = tipo => CAT.find(c => c.tipo === tipo);
  const lay = (st, id) => GM.campus.layout(st.equipos[id]);

  function cd(st, id) {
    const inst = st.instalaciones[id] = st.instalaciones[id] || {};
    let c = inst.ciudadDeportiva;
    const L = lay(st, id);
    if (!c || !c.edificios.every(b => b.slot)) {            // crear o migrar desde el formato antiguo
      const viejos = c ? c.edificios : [];
      c = inst.ciudadDeportiva = { edificios: [] };
      L.slots.forEach(sl => {
        const lv = viejos.length ? Math.max.apply(null, [0].concat(viejos.filter(b => b.tipo === sl.tipo).map(b => b.nivel))) : (L.inicial[sl.tipo] || 0);
        if (lv > 0) c.edificios.push({ slot: sl.id, tipo: sl.tipo, nivel: Math.min(lv, info(sl.tipo).nivelMax), obra: null });
      });
    }
    return c;
  }
  const bSlot = (c, slot) => c.edificios.find(b => b.slot === slot);
  function costeNivel(st, id, tipo, nivel) { return Math.round(info(tipo).coste * Math.pow(nivel, 1.5) * escala(st, id) * Math.max(0.5, obrasMod(st, id)) / 1000) * 1000; }
  function diasObra(st, id, dest) { return Math.max(5, Math.round(DIAS[dest] * (obrasMod(st, id) < 1 ? 0.85 : 1))); }
  function catalogo() { return CAT.map(c => Object.assign({}, c)); }
  function progreso(st, b) { if (!b.obra) return 1; return U.clamp(U.diffDays(b.obra.inicio, st.fecha) / Math.max(1, U.diffDays(b.obra.inicio, b.obra.fin)), 0, 1); }

  const desbloqueado = st => parseInt(st.temporada.slice(0, 4), 10) > 2026 || !!st.temporadaTerminada;
  function parcelas(st, clubId) {
    const c = cd(st, clubId), L = lay(st, clubId);
    return L.slots.map(sl => {
      const b = bSlot(c, sl.id), t = info(sl.tipo), nivel = b ? b.nivel : 0, dest = nivel + 1;
      let estado = 'libre', motivo = null;
      if (sl.tipo === 'emblema' && nivel === 0 && !desbloqueado(st)) { estado = 'bloqueado'; motivo = 'Se desbloquea al terminar la primera temporada'; }
      else if (b && b.obra) { estado = 'obra'; motivo = Math.round(progreso(st, b) * 100) + ' %, termina el ' + U.fechaLarga(b.obra.fin); }
      else if (nivel >= t.nivelMax) estado = 'max';
      else if (nivel > 0) estado = 'mejorable';
      return { slot: sl.id, tipo: sl.tipo, nombre: sl.nombre || t.nombre, nivel, nivelMax: t.nivelMax, estado, motivo, desc: t.desc, actual: nivel ? t.niveles[nivel - 1] : null, proximo: nivel < t.nivelMax ? t.niveles[nivel] : null, coste: nivel < t.nivelMax ? costeNivel(st, clubId, sl.tipo, dest) : 0, dias: nivel < t.nivelMax ? diasObra(st, clubId, dest) : 0, x: sl.x, z: sl.z };
    });
  }
  function efectos(st, clubId) {
    const e = { entrenamiento: 1, recuperacion: 1, cantera: 1, ciudad: 1, ingresos: 1 };
    if (!st.instalaciones || !st.instalaciones[clubId]) return e;
    cd(st, clubId).edificios.forEach(b => { const t = info(b.tipo); for (const k in t.ef) e[k] += t.ef[k] * b.nivel; });
    (st.instalaciones[clubId].buffs || []).forEach(x => { if (x.hasta >= st.fecha) e[x.k] += x.v; });
    return e;
  }
  function mantenimiento(st, id) {
    if (!st.instalaciones || !st.instalaciones[id]) return 0;
    return Math.round(cd(st, id).edificios.reduce((a, b) => a + b.nivel, 0) * 4000 * escala(st, id));
  }
  function actividades(st, clubId, slotId) {
    const c = cd(st, clubId), b = bSlot(c, slotId); if (!b || !b.nivel || !ACT[b.tipo]) return [];
    const e = escala(st, clubId);
    return ACT[b.tipo].map(a => { const ult = b.act && b.act[a.id], resta = ult ? a.cd - U.diffDays(ult, st.fecha) : 0; return Object.assign({}, a, { coste: Math.round(a.coste * e / 1000) * 1000, disponible: resta <= 0 && !b.obra, motivo: b.obra ? 'En obras' : resta > 0 ? 'Disponible en ' + resta + ' días' : null }); });
  }
  function hacerActividad(st, clubId, slotId, actId) {
    const c = cd(st, clubId), b = bSlot(c, slotId), a = actividades(st, clubId, slotId).find(x => x.id === actId);
    if (!b || !a) return { ok: false, motivo: 'Actividad no disponible.' };
    if (!a.disponible) return { ok: false, motivo: a.motivo };
    const F = GM.mods.finanzas, ci = st.ciudad && st.ciudad[clubId];
    if (F && st.finanzas[clubId].caja < a.coste) return { ok: false, motivo: 'No hay caja para ' + U.eur(a.coste) + '.' };
    if (F && a.coste) F.registrar(st, clubId, a.t, -a.coste);
    const ef = a.ef, out = [];
    if (ef.buff) { const inst = st.instalaciones[clubId]; inst.buffs = (inst.buffs || []).filter(x => x.hasta >= st.fecha); inst.buffs.push({ k: ef.buff[0], v: ef.buff[1], hasta: U.addDays(st.fecha, ef.buff[2]) }); out.push(ef.buff[0] + ' +' + Math.round(ef.buff[1] * 100) + ' % durante ' + ef.buff[2] + ' días'); }
    if (ef.curar) { st.equipos[clubId].plantilla.forEach(i => { const p = st.jugadores[i]; if (p && p.estado.lesion) p.estado.lesion.dias = Math.max(1, Math.ceil(p.estado.lesion.dias * (1 - ef.curar))); }); out.push('menos días de baja'); }
    if (ef.ingreso && F) { const imp = Math.round(st.equipos[clubId].presupuesto * ef.ingreso * b.nivel); F.registrar(st, clubId, a.t + ' (ingresos)', imp); out.push('+' + U.eur(imp)); }
    if (ci) { if (ef.aficion) ci.aficion = U.clamp(ci.aficion + ef.aficion, 0, 100); if (ef.ambiente) ci.ambiente = U.clamp(ci.ambiente + ef.ambiente, 0, 100); if (ef.apoyo) ci.apoyoAyuntamiento = U.clamp(ci.apoyoAyuntamiento + ef.apoyo, 0, 100); }
    if (ef.penas && st.fans) st.fans.penas.forEach(p => { p.animo = U.clamp(p.animo + ef.penas, 0, 100); });
    b.act = b.act || {}; b.act[actId] = st.fecha;
    GM.noticia(st, a.t + ' en ' + info(b.tipo).nombre.toLowerCase() + '.');
    return { ok: true, efectos: out };
  }
  function iniciarObra(st, clubId, slotId, concepto) {
    const c = cd(st, clubId), p = parcelas(st, clubId).find(x => x.slot === slotId);
    if (!p) return { ok: false, motivo: 'Parcela desconocida.' };
    if (p.estado === 'bloqueado') return { ok: false, motivo: p.motivo + '.' };
    if (p.estado === 'obra') return { ok: false, motivo: 'Ya hay una obra en marcha en esta parcela.' };
    if (p.estado === 'max') return { ok: false, motivo: 'Ya está al nivel máximo.' };
    if (c.edificios.filter(b => b.obra).length >= 2) return { ok: false, motivo: 'Solo puedes tener 2 obras a la vez.' };
    const F = GM.mods.finanzas;
    if (F && st.finanzas[clubId].caja < p.coste) return { ok: false, motivo: 'No hay caja para ' + U.eur(p.coste) + '.' };
    if (F) F.registrar(st, clubId, concepto + p.nombre, -p.coste);
    let b = bSlot(c, slotId);
    if (!b) { b = { slot: slotId, tipo: p.tipo, nivel: 0, obra: null }; c.edificios.push(b); }
    b.obra = { inicio: st.fecha, fin: U.addDays(st.fecha, p.dias), dest: b.nivel + 1 };
    if (clubId === st.clubId) GM.noticia(st, 'Empiezan las obras: ' + p.nombre + ' (' + p.dias + ' días).');
    return { ok: true };
  }
  const construir = (st, clubId, slotId) => { const p = parcelas(st, clubId).find(x => x.slot === slotId); return p && p.nivel > 0 ? { ok: false, motivo: 'Ya está construido: mejóralo.' } : iniciarObra(st, clubId, slotId, 'Construcción: '); };
  const mejorar = (st, clubId, slotId) => { const p = parcelas(st, clubId).find(x => x.slot === slotId); return p && p.nivel === 0 ? { ok: false, motivo: 'Primero hay que construirlo.' } : iniciarObra(st, clubId, slotId, 'Mejora: '); };

  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !st.instalaciones) return;
    Object.keys(st.instalaciones).forEach(id => {
      const c = st.instalaciones[id].ciudadDeportiva; if (!c) return;
      c.edificios.forEach(b => {
        if (!b.obra || b.obra.fin > st.fecha) return;
        b.nivel = b.obra.dest; b.obra = null;
        const t = info(b.tipo);
        if (id === st.clubId) GM.noticia(st, 'Obra terminada: ' + t.nombre + ' (' + t.niveles[b.nivel - 1] + ').');
        GM.bus.emit('instalacion:mejorada', { clubId: id, tipo: b.tipo, nivel: b.nivel });
      });
    });
    if (V && V.st === st && V.refrescar) { try { V.refrescar(); } catch (e) { } }
  });
  function nuevaPartida(st) { Object.keys(st.equipos).forEach(id => { st.instalaciones[id] = st.instalaciones[id] || {}; st.instalaciones[id].ciudadDeportiva = null; cd(st, id); }); }

  // ---------- Vista 3D ----------
  function color(hex) { return GM.kit.color(hex); }
  function escena(st, id) {
    const K = GM.kit, v = V.vista, eq = st.equipos[id], L = lay(st, id), c = cd(st, id), CP = GM.campus;
    const S = { c1: color(eq.colores[0] === '#000000' ? '#333333' : eq.colores[0]), c2: color(eq.colores[1] || '#ffffff'), e: CP.estilo(eq), sig: eq.siglas, mascota: st.fans && st.fans.identidad && st.fans.identidad.mascota ? st.fans.identidad.mascota : null };
    v.limpiar(V.mundo);
    CP.entorno(V.mundo, L, id, S);
    V.parcelas = [];
    const ps = parcelas(st, id);
    L.slots.forEach(sl => {
      const b = bSlot(c, sl.id), Sv = Object.assign({}, S, { variante: sl.variante });
      let m;
      if (b && b.obra) m = CP.obra(b.tipo, b.obra.dest, progreso(st, b), b.nivel, Sv);
      else if (b) m = CP.modelo(b.tipo, b.nivel, Sv);
      else m = CP.solar(Sv, sl.nombre, ps.find(x => x.slot === sl.id).estado === 'bloqueado');
      m.position.set(sl.x, 0.02, sl.z); m.rotation.y = sl.rot || 0; m.userData = { slot: sl.id };
      V.mundo.add(m); V.parcelas.push(m);
    });
    if (V.sel) {
      const sl = L.slots.find(x => x.id === V.sel);
      if (sl) { const r = new THREE.Mesh(new THREE.RingGeometry(2.9, 3.1, 4), K.mat(0xffd54a)); r.rotation.x = -Math.PI / 2; r.rotation.z = Math.PI / 4; r.position.set(sl.x, 0.15, sl.z); V.mundo.add(r); }
    }
    CP.vida(V.mundo, L, S);
    K.fusionar(V.mundo);
    if (CP.config.calidad === 'alta') K.sombrear(V.mundo);
    const an = CP.animables(V.mundo);
    v.anim = an.length ? (t => an.forEach(f => f(t))) : null;
    CP.ambiente(v, V.hora);
  }
  function enfocar(x, z, radio, theta) {
    const v = V && V.vista; if (!v) return;
    const x0 = v.target.x, z0 = v.target.z, r0 = v.radio, t0 = v.theta; let i = 0;
    clearInterval(V.tw);
    V.tw = setInterval(() => {
      i++; const k = i / 10, e = k * (2 - k);
      v.target.set(x0 + (x - x0) * e, 0, z0 + (z - z0) * e); v.radio = r0 + (radio - r0) * e; if (theta !== undefined) v.theta = t0 + (theta - t0) * e; v.place();
      if (i >= 10) clearInterval(V.tw);
    }, 30);
  }
  function seleccionar(slot, foco) {
    V.sel = slot; V.refrescar();
    if (foco && slot) { const sl = lay(V.st, V.st.clubId).slots.find(x => x.id === slot); if (sl) enfocar(sl.x, sl.z, 13); }
  }
  function panel(st, id) {
    const h = GM.h, p = V.panel; p.innerHTML = '';
    const L = lay(st, id), ef = efectos(st, id), ps = parcelas(st, id);
    const caja = st.finanzas && st.finanzas[id] ? st.finanzas[id].caja : 0;
    const m = V.msg = h('div', { class: 'aviso', style: { display: 'none' } });
    p.append(h('div', { class: 'fila' }, h('b', null, L.nombre), h('span', { class: 'muted' }, 'Caja ' + U.eur(caja))));
    p.append(h('div', { class: 'chips' }, h('span', { class: 'chip' }, 'Entrenamiento ×' + ef.entrenamiento.toFixed(2)), h('span', { class: 'chip' }, 'Recuperación ×' + ef.recuperacion.toFixed(2)), h('span', { class: 'chip' }, 'Cantera ×' + ef.cantera.toFixed(2)), h('span', { class: 'chip' }, 'Mantenimiento ' + U.eur(mantenimiento(st, id)) + '/mes')));
    if (V.vista) p.append(h('div', { class: 'seg compacto' },
      h('button', { class: 'tab', onclick: () => { V.sel = null; V.refrescar(); enfocar(0, (L.z0 + L.z1) / 2 - 2, 56, 0.7); } }, 'Vista general'),
      h('button', { class: 'tab', onclick: () => enfocar(0, L.z1 - 3, 16, 0) }, 'Entrada'),
      h('button', { class: 'tab', onclick: () => { const o = ps.find(x => x.estado === 'obra'); if (o) seleccionar(o.slot, true); else { m.style.display = 'block'; m.textContent = 'No hay obras en marcha.'; } } }, 'Ver obras')));
    if (V.vista) p.append(h('div', { class: 'seg compacto' },
      [['dia', '☀️ Día'], ['tarde', '🌇 Tarde'], ['noche', '🌙 Noche']].map(o => h('button', { class: 'tab' + (V.hora === o[0] ? ' on' : ''), onclick: () => { V.hora = o[0]; V.refrescar(); } }, o[1])),
      h('button', { class: 'tab', onclick: () => { GM.campus.setCalidad(GM.campus.config.calidad === 'alta' ? 'normal' : 'alta'); const el = V.raiz.parentNode, st0 = V.st; mount(el, st0); } }, 'Calidad: ' + (GM.campus.config.calidad === 'alta' ? 'alta' : 'normal'))));
    p.append(h('div', { class: 'seg compacto' }, ps.map(x => h('button', { class: 'tab' + (V.sel === x.slot ? ' on' : ''), onclick: () => seleccionar(x.slot, true) }, (x.estado === 'obra' ? '🚧 ' : x.estado === 'bloqueado' ? '🔒 ' : '') + x.nombre.split(', ')[0].split(' (')[0] + (x.nivel ? ' ' + x.nivel : '')))));
    const resp = r => { if (!r.ok) { m.style.display = 'block'; m.textContent = r.motivo; } else V.refrescar(); };
    const sel = ps.find(x => x.slot === V.sel);
    if (sel) {
      const cuerpo = [h('b', null, sel.nombre + (sel.nivel ? ', nivel ' + sel.nivel + '/' + sel.nivelMax : ', solar libre')), sel.actual ? h('p', null, sel.actual) : null, h('p', { class: 'muted' }, sel.desc)];
      if (sel.estado === 'bloqueado') cuerpo.push(h('p', { class: 'aviso med' }, '🔒 ' + sel.motivo + '.'));
      else if (sel.estado === 'obra') cuerpo.push(h('p', { class: 'aviso med' }, '🚧 En obras: ' + sel.motivo));
      else if (sel.estado === 'max') cuerpo.push(h('p', null, 'Nivel máximo alcanzado.'));
      if (sel.nivel && sel.estado !== 'obra') { const as = actividades(st, id, sel.slot); if (as.length) { cuerpo.push(h('h4', null, 'Actividades')); as.forEach(a => cuerpo.push(h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, a.t), h('button', { class: 'btn peq', disabled: !a.disponible, onclick: () => { const r = hacerActividad(st, id, sel.slot, a.id); if (!r.ok) { m.style.display = 'block'; m.textContent = r.motivo; } else { if (GM.ui && GM.ui.toast) GM.ui.toast(r.efectos.length ? r.efectos.join(', ') : 'Hecho'); if (GM.ui && GM.ui.cabecera) GM.ui.cabecera(); V.refrescar(); } } }, a.coste ? U.eur(a.coste) : 'Gratis')), h('span', { class: 'muted' }, a.motivo || a.desc)))); } }
      if (sel.estado === 'obra' || sel.estado === 'max' || sel.estado === 'bloqueado') { } else cuerpo.push(h('p', { class: 'muted' }, 'Siguiente: ' + sel.proximo + ', ' + sel.dias + ' días de obra'), h('button', { class: 'btn', onclick: () => resp(sel.nivel ? mejorar(st, id, sel.slot) : construir(st, id, sel.slot)) }, (sel.nivel ? 'Mejorar por ' : 'Construir por ') + U.eur(sel.coste)));
      p.append(h('div', { class: 'tarjeta' }, cuerpo));
    } else p.append(h('p', { class: 'muted' }, V.vista ? 'Toca un edificio o un solar en el campus, o elige uno de la lista.' : 'Elige un edificio de la lista.'));
    p.append(m);
  }
  function mount(el, st) {
    const hora0 = V && V.hora;
    unmount();
    const h = GM.h, id = st.clubId, L = lay(st, id);
    const raiz = h('div', { class: 'c3d' }), vistaEl = h('div', { class: 'vista3d' }), panelEl = h('div', { class: 'panel3d' });
    raiz.append(vistaEl, panelEl); el.appendChild(raiz);
    V = { raiz, panel: panelEl, vista: null, sel: null, mundo: null, st, parcelas: [], hora: hora0 || 'dia' };
    if (GM.kit && GM.kit.disponible()) {
      try {
        V.vista = GM.kit.crear(vistaEl, { radio: 56, theta: 0.7, phi: 0.95, min: 8, max: 95, fondo: 0xa9d6f2, sombras: GM.campus.config.calidad === 'alta' });
        V.vista.target.set(0, 0, (L.z0 + L.z1) / 2 - 2); V.vista.place();
        V.mundo = new THREE.Group(); V.vista.scene.add(V.mundo);
        V.vista.onTap = (cx, cy) => {
          const hits = V.vista.pick(cx, cy, V.parcelas);
          for (const it of hits) { let o = it.object; while (o && !(o.userData && o.userData.slot)) o = o.parent; if (o) { seleccionar(o.userData.slot, true); return; } }
        };
      } catch (e) { V.vista = null; }
    }
    if (!V.vista) vistaEl.append(h('div', { class: 'vacio' }, 'La vista 3D no está disponible en este dispositivo o sin conexión. Gestiona la ciudad deportiva desde la lista.'));
    V.refrescar = () => { if (V.vista) escena(st, id); panel(st, id); };
    V.refrescar();
    return true;
  }
  function unmount() {
    if (!V) return;
    clearInterval(V.tw);
    if (V.vista) V.vista.dispose();
    if (V.raiz && V.raiz.parentNode) V.raiz.parentNode.removeChild(V.raiz);
    V = null;
  }
  function selfTest() {
    if (!GM.campus) return false;
    const eqs = { a: { id: 'a', presupuesto: 60e6, reputacion: 60, ciudadDeportiva: null, plantilla: [], colores: ['#aa0000', '#ffffff'] }, 'joventut-badalona': { id: 'joventut-badalona', presupuesto: 14e6, reputacion: 62, plantilla: [], colores: ['#00a859', '#000000'] } };
    const st = { clubId: 'a', temporada: '2026-27', fecha: '2026-10-01', noticias: [], equipos: eqs, instalaciones: {}, finanzas: { a: { caja: 5e7, movimientos: [], patrocinios: [], temp: { ingresos: 0, gastos: 0 }, historial: [] }, 'joventut-badalona': { caja: 5e6, movimientos: [], patrocinios: [], temp: { ingresos: 0, gastos: 0 }, historial: [] } } };
    nuevaPartida(st);
    const r1 = construir(st, 'a', 'cantera'), r2 = mejorar(st, 'a', 'pista'), r3 = mejorar(st, 'a', 'gimnasio');
    st.fecha = '2026-11-20'; GM.state = st; GM.bus.emit('dia:avanzado', {}); GM.state = null;
    const jv = parcelas(st, 'joventut-badalona');
    return r1.ok && r2.ok && !r3.ok && cd(st, 'a').edificios.every(b => !b.obra) && !!bSlot(cd(st, 'a'), 'cantera') && efectos(st, 'a').entrenamiento > 1.04 && jv.some(p => p.slot === 'emblema' && p.nivel === 1) && jv.find(p => p.slot === 'cantera').nivel === 0 && !construir(st, 'a', 'emblema').ok;
  }
  GM.register('ciudadDeportiva', { actividades, hacerActividad, catalogo, parcelas, construir, mejorar, efectos, mantenimiento, mount, unmount, nuevaPartida, selfTest });
})();
