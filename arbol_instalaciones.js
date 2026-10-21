/* ÁRBOL DE INSTALACIONES (punto 62, GM.arbolInst) — una capa de especialización sobre la ciudad deportiva (ciudad_deportiva.js) y el pabellón (estadio.js). Cada edificio tiene ramas de mejoras con requisitos
   (nivel del edificio y mejoras anteriores), coste, obras por fases con días, mantenimiento anual y efectos medibles:
   - Cantera: categorías (infantil, cadete, juvenil, filial) = más juveniles al año y más calidad; entrenadores de cantera = juveniles que progresan más; ojeo local = más prospectos por viaje.
   - Centro médico: prevención (menos lesiones), fisioterapia (se recupera antes), readaptación (menos secuelas) y control de cargas (menos lesiones por sobrecarga, punto 63).
   - Analítica (oficinas): departamento de datos en tres niveles; mejora el informe del rival y los ajustes tácticos (punto 64) y la precisión de los ojeadores.
   - Tienda y museo: tienda en línea, ropa oficial, visitas guiadas y sala histórica: ingresos y arraigo en la ciudad.
   - Pabellón: se muestran las mejoras de estadio.js (aforo, palcos VIP, cubierta, marcador, suelo, luces) con su estado, y se encargan desde aquí.
   Cada mejora acabada cambia un número (efectos()) y un modelo (decorar(): antenas, pistas pequeñas, ambulancia, estatua… y andamios mientras dura la obra, que crece con las fases).
   Estado: state.instalaciones[clubId].arbol = { hechos: { <id>: fecha }, obras: [{ id, inicio, fin }] }. Se suma a ciudadDeportiva.efectos (claves nuevas: prevencion, secuelas, sobrecarga, cupo, ojeo, jprog, analitica)
   y al mantenimiento. Expone: RAMAS, NODOS, nodos, estado, construir, efectos, mantenimiento, fases, decorar, resumen, selfTest. Prueba: t_arbol.js. */
(function () {
  const U = GM.util, clamp = U.clamp;
  // Nodos: id, rama, nombre, desc, req (nivel de un edificio de la ciudad deportiva y/o mejoras anteriores), coste base en euros, días de obra, mantenimiento anual base y efectos (claves aditivas)
  const N = [
    { id: 'cat_infantil', rama: 'cantera', n: 'Categoría infantil', d: 'Un equipo infantil propio: más niños entran en el club.', edif: ['cantera', 1], coste: 180000, dias: 20, mant: 6000, ef: { cupo: 1, cantera: 0.02 }, vis: 'pista' },
    { id: 'cat_cadete', rama: 'cantera', n: 'Categoría cadete', d: 'El siguiente escalón: los chicos de 14 a 16 años compiten en su liga.', edif: ['cantera', 2], req: ['cat_infantil'], coste: 260000, dias: 28, mant: 8000, ef: { cupo: 1, cantera: 0.03 }, vis: 'pista' },
    { id: 'cat_juvenil', rama: 'cantera', n: 'Categoría juvenil', d: 'Equipo juvenil de máxima categoría: los mejores se ven de cerca.', edif: ['cantera', 3], req: ['cat_cadete'], coste: 360000, dias: 35, mant: 11000, ef: { cupo: 1, cantera: 0.03 }, vis: 'pista' },
    { id: 'cat_filial', rama: 'cantera', n: 'Equipo filial', d: 'Un equipo de transición para los que no están listos para el primero.', edif: ['cantera', 4], req: ['cat_juvenil'], coste: 520000, dias: 45, mant: 16000, ef: { cupo: 1, cantera: 0.04, jprog: 0.1 }, vis: 'pista' },
    { id: 'entr_c1', rama: 'cantera', n: 'Entrenadores de cantera (nivel 1)', d: 'Técnicos titulados para los juveniles: aprenden más rápido.', edif: ['cantera', 1], coste: 140000, dias: 15, mant: 9000, ef: { jprog: 0.1 }, vis: 'silbato' },
    { id: 'entr_c2', rama: 'cantera', n: 'Entrenadores de cantera (nivel 2)', d: 'Especialistas por puesto y preparador físico juvenil.', edif: ['cantera', 2], req: ['entr_c1'], coste: 240000, dias: 20, mant: 14000, ef: { jprog: 0.12 }, vis: 'silbato' },
    { id: 'entr_c3', rama: 'cantera', n: 'Entrenadores de cantera (nivel 3)', d: 'El mejor cuerpo técnico formativo de la zona.', edif: ['cantera', 4], req: ['entr_c2'], coste: 380000, dias: 25, mant: 20000, ef: { jprog: 0.15 }, vis: 'silbato' },
    { id: 'ojeo_l1', rama: 'cantera', n: 'Ojeo local (red de colegios)', d: 'Contactos en los colegios y clubes de barrio: un prospecto más por viaje.', edif: ['cantera', 1], coste: 90000, dias: 12, mant: 5000, ef: { ojeo: 1 }, vis: 'mastil' },
    { id: 'ojeo_l2', rama: 'cantera', n: 'Ojeo local (comarca)', d: 'Ojeadores por toda la comarca: otro prospecto y más calidad.', edif: ['cantera', 3], req: ['ojeo_l1'], coste: 170000, dias: 18, mant: 9000, ef: { ojeo: 1, cantera: 0.02 }, vis: 'mastil' },
    { id: 'ojeo_l3', rama: 'cantera', n: 'Ojeo local (base de datos regional)', d: 'Todo el talento de la región fichado desde los 10 años.', edif: ['cantera', 5], req: ['ojeo_l2'], coste: 300000, dias: 25, mant: 14000, ef: { ojeo: 1, cantera: 0.03 }, vis: 'mastil' },
    { id: 'prev1', rama: 'medico', n: 'Prevención de lesiones (nivel 1)', d: 'Calentamientos y pruebas de fuerza: un 10 % menos de lesiones.', edif: ['medico', 1], coste: 150000, dias: 15, mant: 7000, ef: { prevencion: 0.1 }, vis: 'cruz' },
    { id: 'prev2', rama: 'medico', n: 'Prevención de lesiones (nivel 2)', d: 'Pruebas biomecánicas: otro 10 % menos de lesiones.', edif: ['medico', 3], req: ['prev1'], coste: 280000, dias: 22, mant: 11000, ef: { prevencion: 0.1 }, vis: 'cruz' },
    { id: 'prev3', rama: 'medico', n: 'Prevención de lesiones (nivel 3)', d: 'Seguimiento individual: otro 10 % menos de lesiones.', edif: ['medico', 4], req: ['prev2'], coste: 450000, dias: 30, mant: 16000, ef: { prevencion: 0.1 }, vis: 'cruz' },
    { id: 'fisio1', rama: 'medico', n: 'Fisioterapia (nivel 1)', d: 'Sala de fisioterapia propia: se recupera antes.', edif: ['medico', 2], coste: 170000, dias: 18, mant: 8000, ef: { recuperacion: 0.04 }, vis: 'ambulancia' },
    { id: 'fisio2', rama: 'medico', n: 'Fisioterapia (nivel 2)', d: 'Hidroterapia y crioterapia: recuperación más rápida.', edif: ['medico', 3], req: ['fisio1'], coste: 300000, dias: 25, mant: 12000, ef: { recuperacion: 0.05 }, vis: 'ambulancia' },
    { id: 'fisio3', rama: 'medico', n: 'Fisioterapia (nivel 3)', d: 'Un equipo de seis fisios y camas de alto rendimiento.', edif: ['medico', 5], req: ['fisio2'], coste: 460000, dias: 30, mant: 17000, ef: { recuperacion: 0.06 }, vis: 'ambulancia' },
    { id: 'readapt', rama: 'medico', n: 'Readaptación deportiva', d: 'Vuelta progresiva tras una lesión: se reducen las secuelas a la mitad.', edif: ['medico', 3], req: ['prev2', 'fisio1'], coste: 340000, dias: 28, mant: 13000, ef: { secuelas: 0.5, recuperacion: 0.03 }, vis: 'piscina' },
    { id: 'cargas', rama: 'medico', n: 'Control de cargas', d: 'Sensores y GPS en los entrenos: un 25 % menos de lesiones por sobrecarga.', edif: ['medico', 2], req: ['prev1', 'datos1'], coste: 220000, dias: 20, mant: 10000, ef: { sobrecarga: 0.25 }, vis: 'parabola' },
    { id: 'datos1', rama: 'analitica', n: 'Departamento de datos (nivel 1)', d: 'Un analista y vídeo de todos los partidos: informe del rival más fiable.', edif: ['oficinas', 1], coste: 160000, dias: 18, mant: 9000, ef: { analitica: 1 }, vis: 'parabola' },
    { id: 'datos2', rama: 'analitica', n: 'Departamento de datos (nivel 2)', d: 'Modelos propios y seguimiento de cada jugador: ajustes tácticos más finos.', edif: ['oficinas', 2], req: ['datos1'], coste: 320000, dias: 28, mant: 16000, ef: { analitica: 1 }, vis: 'parabola' },
    { id: 'datos3', rama: 'analitica', n: 'Departamento de datos (nivel 3)', d: 'Un laboratorio de análisis avanzado: el mejor informe de la liga.', edif: ['oficinas', 3], req: ['datos2'], coste: 560000, dias: 40, mant: 26000, ef: { analitica: 1 }, vis: 'parabola' },
    { id: 'ropa', rama: 'tienda', n: 'Ropa oficial de entrenamiento', d: 'Una línea de ropa propia para socios: algo más de ingresos.', edif: ['tienda', 1], coste: 120000, dias: 14, mant: 4000, ef: { ingresos: 0.01 }, vis: 'toldo' },
    { id: 'online', rama: 'tienda', n: 'Tienda en línea', d: 'Vendes a toda España y fuera: más ingresos y más afición.', edif: ['tienda', 2], req: ['ropa'], coste: 220000, dias: 20, mant: 7000, ef: { ingresos: 0.02, ciudad: 0.01 }, vis: 'toldo' },
    { id: 'visitas', rama: 'museo', n: 'Visitas guiadas', d: 'Colegios y turistas visitan el museo: ingresos y arraigo.', edif: ['museo', 1], coste: 100000, dias: 12, mant: 4000, ef: { ingresos: 0.01, ciudad: 0.01 }, vis: 'estatua' },
    { id: 'historia', rama: 'museo', n: 'Sala de la historia del club', d: 'Las camisetas históricas y los títulos, contados con pantallas.', edif: ['museo', 2], req: ['visitas'], coste: 210000, dias: 22, mant: 7000, ef: { ingresos: 0.01, ciudad: 0.02 }, vis: 'estatua' }
  ];
  const RAMAS = { pabellon: 'Pabellón', cantera: 'Cantera', medico: 'Centro médico', analitica: 'Analítica', tienda: 'Tienda', museo: 'Museo' };
  const NOMBRE_EF = { cupo: 'juveniles al año', cantera: 'calidad de cantera', jprog: 'progreso de los juveniles', ojeo: 'prospectos por viaje', prevencion: 'lesiones', recuperacion: 'recuperación', secuelas: 'secuelas', sobrecarga: 'lesiones por sobrecarga', analitica: 'nivel de analítica', ingresos: 'ingresos', ciudad: 'arraigo en la ciudad' };
  const escala = (st, id) => clamp(st.equipos[id].presupuesto / 60e6, 0.3, 8);
  const inst = (st, id) => { const i = st.instalaciones && st.instalaciones[id]; return i ? i : null; };
  const est = (st, id) => { const i = inst(st, id); if (!i) return null; return i.arbol || (i.arbol = { hechos: {}, obras: [] }); };
  const nodo = id => N.find(x => x.id === id), nodos = rama => (rama ? N.filter(x => x.rama === rama) : N.slice());
  const nivelEdificio = (st, clubId, tipo) => { const c = GM.mods.ciudadDeportiva && GM.mods.ciudadDeportiva.parcelas ? GM.mods.ciudadDeportiva.parcelas(st, clubId).find(p => p.tipo === tipo) : null; return c ? c.nivel : 0; };
  const costeDe = (st, clubId, n) => Math.round(n.coste * escala(st, clubId) * Math.max(0.5, GM.mods.ciudad ? GM.mods.ciudad.modificadores(st, clubId).obras : 1) / 1000) * 1000;
  const FASES = ['Proyecto y permisos', 'Obra', 'Equipamiento y puesta en marcha'];
  // Fases de una obra: el progreso se reparte 25 % proyecto, 55 % obra y 20 % equipamiento
  function fases(st, o) {
    const p = clamp(U.diffDays(o.inicio, st.fecha) / Math.max(1, U.diffDays(o.inicio, o.fin)), 0, 1), fase = p < 0.25 ? 0 : p < 0.8 ? 1 : 2;
    return { progreso: p, fase, nombre: FASES[fase], pct: Math.round(p * 100) };
  }
  function estado(st, clubId, id) {
    const n = nodo(id), a = est(st, clubId); if (!n || !a) return { estado: 'nada' };
    if (a.hechos[id]) return { estado: 'hecha', fecha: a.hechos[id] };
    const o = a.obras.find(x => x.id === id); if (o) { const f = fases(st, o); return { estado: 'obra', fase: f, motivo: f.nombre + ' (' + f.pct + ' %), termina el ' + U.fechaLarga(o.fin) }; }
    if (n.edif && nivelEdificio(st, clubId, n.edif[0]) < n.edif[1]) return { estado: 'bloqueada', motivo: 'Necesita ' + (GM.mods.ciudadDeportiva.catalogo().find(c => c.tipo === n.edif[0]) || { nombre: n.edif[0] }).nombre.toLowerCase() + ' de nivel ' + n.edif[1] };
    const falta = (n.req || []).find(r => !a.hechos[r]); if (falta) return { estado: 'bloqueada', motivo: 'Primero: ' + nodo(falta).n.toLowerCase() };
    return { estado: 'disponible' };
  }
  const obrasActivas = (st, clubId) => { const c = GM.mods.ciudadDeportiva ? GM.mods.ciudadDeportiva.parcelas(st, clubId).filter(p => p.estado === 'obra').length : 0; return c + est(st, clubId).obras.length; };
  function construir(st, clubId, id) {
    const n = nodo(id), a = est(st, clubId); if (!n || !a) return { ok: false, motivo: 'Mejora desconocida.' }; const s = estado(st, clubId, id); if (s.estado !== 'disponible') return { ok: false, motivo: s.motivo || 'Ya está hecha.' };
    if (obrasActivas(st, clubId) >= 3) return { ok: false, motivo: 'Con tres obras a la vez no hay manera de coordinarlas.' };
    const coste = costeDe(st, clubId, n), F = GM.mods.finanzas; if (F && st.finanzas[clubId].caja < coste) return { ok: false, motivo: 'No hay caja para ' + U.eur(coste) + '.' };
    if (F) F.registrar(st, clubId, 'Obra: ' + n.n, -coste); a.obras.push({ id, inicio: st.fecha, fin: U.addDays(st.fecha, n.dias) }); if (clubId === st.clubId && GM.noticia) GM.noticia(st, 'Empieza el proyecto: ' + n.n.toLowerCase() + ' (' + n.dias + ' días).');
    return { ok: true, coste, dias: n.dias };
  }
  // Suma los efectos del árbol a los de la ciudad deportiva (se llama desde ciudadDeportiva.efectos)
  function sumar(e, st, clubId) {
    const a = inst(st, clubId) && inst(st, clubId).arbol; e.prevencion = 1; e.secuelas = 1; e.sobrecarga = 1; e.cupo = 0; e.ojeo = 0; e.jprog = 0; e.analitica = 0; if (!a) return e;
    let prev = 0;
    Object.keys(a.hechos).forEach(id => { const n = nodo(id); if (!n) return; for (const k in n.ef) { const v = n.ef[k]; if (k === 'prevencion') prev += v; else if (k === 'secuelas') e.secuelas = Math.min(e.secuelas, 1 - v); else if (k === 'sobrecarga') e.sobrecarga = Math.min(e.sobrecarga, 1 - v); else if (k === 'recuperacion' || k === 'cantera' || k === 'ingresos' || k === 'ciudad') e[k] += v; else e[k] = (e[k] || 0) + v; } });
    e.prevencion = clamp(1 - prev, 0.5, 1); return e;
  }
  const efectos = (st, clubId) => (GM.mods.ciudadDeportiva ? GM.mods.ciudadDeportiva.efectos(st, clubId) : sumar({ entrenamiento: 1, recuperacion: 1, cantera: 1, ciudad: 1, ingresos: 1 }, st, clubId));
  function mantenimiento(st, clubId) { const a = inst(st, clubId) && inst(st, clubId).arbol; if (!a) return 0; return Math.round(Object.keys(a.hechos).reduce((s, id) => s + (nodo(id) ? nodo(id).mant : 0), 0) * escala(st, clubId) / 12); }   // se cobra por mes
  GM.bus.on('dia:avanzado', () => {
    const st = GM.state; if (!st || !st.instalaciones) return;
    Object.keys(st.instalaciones).forEach(id => { const a = st.instalaciones[id].arbol; if (!a || !a.obras.length) return; const fin = a.obras.filter(o => o.fin <= st.fecha); fin.forEach(o => { a.hechos[o.id] = st.fecha; const n = nodo(o.id); if (id === st.clubId && GM.noticia) GM.noticia(st, 'Obra terminada: ' + n.n.toLowerCase() + '.'); GM.bus.emit('instalacion:mejorada', { clubId: id, tipo: o.id, nivel: 1 }); }); a.obras = a.obras.filter(o => o.fin > st.fecha); });
  });
  // La lista que ve el jugador: rama por rama, con el pabellón tomado de estadio.js
  function arbol(st, clubId) {
    const out = {}; Object.keys(RAMAS).forEach(r => { out[r] = []; });
    N.forEach(n => out[n.rama].push(Object.assign({ coste: costeDe(st, clubId, n) }, n, estado(st, clubId, n.id), { coste: costeDe(st, clubId, n) })));
    const E = GM.mods.estadio; if (E && E.mejorasDisponibles && inst(st, clubId) && inst(st, clubId).pabellon) E.mejorasDisponibles(st, clubId).forEach(m => out.pabellon.push({ id: 'estadio:' + m.id, rama: 'pabellon', n: m.nombre, d: m.desc, coste: m.coste, dias: m.dias, mant: 0, ef: m.ef, estado: m.estado === 'hecha' ? 'hecha' : m.estado === 'en obras' ? 'obra' : m.estado === 'bloqueada' ? 'bloqueada' : 'disponible', motivo: m.motivo }));
    return out;
  }
  const construirCualquiera = (st, clubId, id) => (/^estadio:/.test(id) ? GM.mods.estadio.mejorar(st, clubId, id.slice(8)) : construir(st, clubId, id));
  function resumen(st, clubId) { const a = est(st, clubId), e = efectos(st, clubId); return { hechas: a ? Object.keys(a.hechos).length : 0, de: N.length, obras: a ? a.obras.length : 0, mantAnual: a ? Math.round(Object.keys(a.hechos).reduce((s, id) => s + nodo(id).mant, 0) * escala(st, clubId)) : 0, efectos: e }; }
  // ---------- Modelos 3D ----------
  // Cada mejora acabada pone una pieza en el solar de su edificio; mientras dura la obra se ve un andamio que sube con las fases
  const PIEZA = {
    pista: (T, g, i, c1) => { const m = new T.Mesh(new T.BoxGeometry(5, 0.06, 3), new T.MeshStandardMaterial({ color: i % 2 ? 0xd8863b : 0x2f6aa8, roughness: 0.9 })); m.position.set(-5.2 + (i % 2) * 5.6, 0.04, 6.5 + Math.floor(i / 2) * 3.4); g.add(m); const l = new T.Mesh(new T.BoxGeometry(5, 0.07, 0.06), new T.MeshBasicMaterial({ color: 0xffffff })); l.position.set(m.position.x, 0.08, m.position.z); g.add(l); },
    silbato: (T, g, i) => { const m = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 0.9, 8), new T.MeshStandardMaterial({ color: 0xe8590c })); m.position.set(3.2 + i * 0.6, 0.45, 7.4); g.add(m); },
    mastil: (T, g, i) => { const p = new T.Mesh(new T.CylinderGeometry(0.07, 0.09, 4.5 + i, 6), new T.MeshStandardMaterial({ color: 0x555a60 })); p.position.set(6.2, (4.5 + i) / 2, 5 - i * 1.2); g.add(p); const b = new T.Mesh(new T.BoxGeometry(1.4, 0.5, 0.05), new T.MeshStandardMaterial({ color: 0x1d4f91 })); b.position.set(6.9, 4.1 + i, 5 - i * 1.2); g.add(b); },
    cruz: (T, g, i) => { const p = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 3.2, 6), new T.MeshStandardMaterial({ color: 0x888d93 })); p.position.set(-6.2, 1.6, 4.5 + i * 1.5); g.add(p); const a = new T.Mesh(new T.BoxGeometry(1.1, 0.35, 0.08), new T.MeshStandardMaterial({ color: 0x1fa05a, emissive: 0x0a4d2a })); a.position.set(-6.2, 3.1, 4.5 + i * 1.5); g.add(a); const b = new T.Mesh(new T.BoxGeometry(0.35, 1.1, 0.08), new T.MeshStandardMaterial({ color: 0x1fa05a, emissive: 0x0a4d2a })); b.position.set(-6.2, 3.1, 4.5 + i * 1.5); g.add(b); },
    ambulancia: (T, g, i) => { const c = new T.Mesh(new T.BoxGeometry(2.6, 1.3, 1.2), new T.MeshStandardMaterial({ color: 0xf4f4f4 })); c.position.set(6.5, 0.7, 5 + i * 1.6); g.add(c); const r = new T.Mesh(new T.BoxGeometry(2.62, 0.2, 1.22), new T.MeshStandardMaterial({ color: 0xc0392b })); r.position.set(6.5, 0.75, 5 + i * 1.6); g.add(r); },
    piscina: (T, g) => { const m = new T.Mesh(new T.BoxGeometry(5, 0.1, 3), new T.MeshStandardMaterial({ color: 0x3fa7d6, roughness: 0.1, metalness: 0.2 })); m.position.set(0, 0.06, 8); g.add(m); },
    parabola: (T, g, i) => { const m = new T.Mesh(new T.SphereGeometry(0.8, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: 0xe9edf0, roughness: 0.4, metalness: 0.4 })); m.position.set(-4 + i * 2.2, 5.6, -1); m.rotation.x = -0.9; g.add(m); const s = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1.6, 6), new T.MeshStandardMaterial({ color: 0x888d93 })); s.position.set(-4 + i * 2.2, 4.9, -1); g.add(s); },
    toldo: (T, g, i, c1) => { for (let k = 0; k < 6; k++) { const m = new T.Mesh(new T.BoxGeometry(0.7, 0.08, 1.6), new T.MeshStandardMaterial({ color: k % 2 ? c1 : 0xffffff })); m.position.set(-2.1 + k * 0.84, 2.7 + i * 0.5, 5.3); m.rotation.x = 0.25; g.add(m); } },
    estatua: (T, g, i) => { const b = new T.Mesh(new T.BoxGeometry(1.2, 1.0, 1.2), new T.MeshStandardMaterial({ color: 0xcfc8b8 })); b.position.set(-5 + i * 2.4, 0.5, 6.5); g.add(b); const f = new T.Mesh(new T.CylinderGeometry(0.25, 0.4, 1.8, 8), new T.MeshStandardMaterial({ color: 0x9a7a3a, metalness: 0.8, roughness: 0.35 })); f.position.set(-5 + i * 2.4, 1.9, 6.5); g.add(f); }
  };
  function decorar(W, st, clubId, L, c1) {
    const a = inst(st, clubId) && inst(st, clubId).arbol, T = THREE; if (!a || !L || !L.slots) return 0; let n = 0; const col = c1 && c1.getHex ? c1.getHex() : 0xc0392b;
    const SLOT = { cantera: 'cantera', medico: 'medico', analitica: 'oficinas', tienda: 'tienda', museo: 'museo' };
    Object.keys(RAMAS).forEach(rama => {
      if (rama === 'pabellon') return; const sl = L.slots.find(s => s.id === SLOT[rama]); if (!sl) return; const g = new T.Group(); g.position.set(sl.x, 0.02, sl.z); g.rotation.y = sl.rot || 0; const cuenta = {};
      nodos(rama).forEach(nd => {
        if (a.hechos[nd.id]) { const i = cuenta[nd.vis] = (cuenta[nd.vis] || 0) + 1; PIEZA[nd.vis](T, g, i - 1, col); n++; }
        else { const o = a.obras.find(x => x.id === nd.id); if (o) { const f = fases(st, o), alto = 1 + f.progreso * 3.2, an = new T.Mesh(new T.BoxGeometry(2.4, alto, 2.4), new T.MeshStandardMaterial({ color: 0xe0a800, wireframe: true })); an.position.set(-6 + (cuenta.obra = (cuenta.obra || 0) + 1) * 2.8, alto / 2, 9.5); g.add(an); n++; } }
      });
      if (g.children.length) W.add(g);
    });
    return n;
  }
  function selfTest() {
    const eqs = { a: { id: 'a', presupuesto: 120e6, reputacion: 60, plantilla: [], colores: ['#aa0000', '#ffffff'], ciudadDeportiva: null } }, st = { clubId: 'a', temporada: '2026-27', fecha: '2026-10-01', noticias: [], equipos: eqs, instalaciones: { a: {} }, finanzas: { a: { caja: 5e8, movimientos: [], patrocinios: [], temp: { ingresos: 0, gastos: 0 } } }, jugadores: {} };
    const prev = GM.state; GM.state = st; try {
      if (!GM.mods.ciudadDeportiva) return false; GM.mods.ciudadDeportiva.nuevaPartida(st); if (!est(st, 'a')) return false;
      if (construir(st, 'a', 'datos3').ok) return false;   // sin requisitos no se puede
      const e = sumar({ recuperacion: 1, cantera: 1, ciudad: 1, ingresos: 1 }, st, 'a'); est(st, 'a').hechos.prev1 = '2026-11-01'; const e2 = sumar({ recuperacion: 1, cantera: 1, ciudad: 1, ingresos: 1 }, st, 'a');
      return e.prevencion === 1 && Math.abs(e2.prevencion - 0.9) < 1e-9 && N.length >= 24 && arbol(st, 'a').cantera.length >= 10;
    } finally { GM.state = prev; }
  }
  GM.arbolInst = { RAMAS, NODOS: N, NOMBRE_EF, FASES, nodos, nodo, estado, construir: construirCualquiera, construirNodo: construir, efectos, sumar, mantenimiento, fases, arbol, resumen, decorar, est, selfTest };
  GM.register && GM.register('arbolInst', GM.arbolInst);
})();
