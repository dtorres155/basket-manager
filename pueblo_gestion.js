/* GESTIÓN DEL PUEBLO (punto 56, GM.puebloGestion), modo carrera: sobre el pueblo de pueblo.js (edificios, obras por fases, cariño) añade lo que hace falta para gobernarlo:
   - Presupuesto municipal: cada mes entran impuestos (según la población y la tasa que fijes), donaciones tuyas y subvenciones; se reparten entre seis servicios (colegio, médico, polideportivo, transporte, seguridad y limpieza)
     según los porcentajes que decidas. La calidad de cada servicio sube si le das dinero y baja si no; con la caja en negativo, todos se deterioran.
   - Población que crece (o se va) según la calidad de los servicios, el empleo (edificios y negocios), tu fama y los impuestos. Eso mueve el nivel del pueblo (pueblo.js suma gest.bono a sus puntos), y con él la escena: más casas,
     más edificios, muralla y cartel; en diez temporadas la aldea se convierte en otra cosa.
   - Vecinos con nombre y oficio, con su opinión de ti; piden cosas (material para el colegio, arreglar la carretera, una cancha nueva) y decides si ayudas.
   - Asociaciones (club de baloncesto de base, AMPA, mayores, banda de música, excursionistas, peña) que cuestan al mes y dan cariño, afición y mejores fiestas.
   - Fiestas del año (carnaval, fiesta del baloncesto, fiesta mayor, navidad) con presupuesto: más gasto, más cariño y turismo.
   Estado: state.carrera.pueblo.gest. Expone: gest, resumen, fijarTasa, asignar, donar, subvencion, apoyar, ignorar, fundar, cerrarAsoc, presupuestoFiesta, serie, selfTest. Prueba: t_pueblo_gestion.js. */
(function () {
  const U = GM.util, clamp = U.clamp, k1 = k => (Math.round(k * 10) / 10).toLocaleString('es-ES');
  const C = st => st.carrera, P = st => st.carrera && st.carrera.pueblo, act = st => st && st.modo === 'carrera' && !!P(st);
  const SERVICIOS = { colegio: 'Colegio', medico: 'Centro de salud', polideportivo: 'Polideportivo', transporte: 'Transporte', seguridad: 'Seguridad', limpieza: 'Limpieza y alumbrado' };
  const TASAS = { baja: { n: 'Impuestos bajos', f: 0.7, op: 0.15 }, normal: { n: 'Impuestos normales', f: 1, op: 0 }, alta: { n: 'Impuestos altos', f: 1.35, op: -0.3 } };
  const ASOC = { basket: { n: 'Club de baloncesto de base', coste: 9, mes: 0.5, ef: { cariño: 0.25, afi: 0.3, fama: 0.02 }, d: 'Niños y niñas entrenando cada tarde; de vez en cuando sale una promesa.' }, ampa: { n: 'AMPA del colegio', coste: 3, mes: 0.15, ef: { cariño: 0.2, colegio: 0.5 }, d: 'Las familias ayudan al colegio.' },
    mayores: { n: 'Asociación de mayores', coste: 4, mes: 0.2, ef: { cariño: 0.3, medico: 0.3 }, d: 'Cuidan del pueblo y de sus mayores.' }, banda: { n: 'Banda de música', coste: 6, mes: 0.3, ef: { cariño: 0.2, fiesta: 1 }, d: 'Pone música a todas las fiestas.' },
    excursion: { n: 'Club de excursionistas', coste: 2.5, mes: 0.1, ef: { cariño: 0.15, turismo: 0.4 }, d: 'Rutas por la sierra que atraen visitantes.' }, pena: { n: 'Peña del club', coste: 5, mes: 0.2, ef: { cariño: 0.2, afi: 0.5 }, d: 'Se juntan los días de partido y llenan los autobuses.' } };
  const FIESTAS = { carnaval: { n: 'Carnaval', md: '02-14', base: 3 }, baloncesto: { n: 'Fiesta del baloncesto', md: '06-12', base: 5 }, mayor: { n: 'Fiesta mayor', md: '08-15', base: 8 }, navidad: { n: 'Navidad en la plaza', md: '12-23', base: 4 } };
  const OFICIOS = ['panadera', 'agricultor', 'maestro', 'médica', 'taxista', 'tendera', 'albañil', 'cartero', 'camarero', 'jubilado', 'pastelera', 'electricista'], NOMBRES = ['Mari Carmen', 'Paco', 'Luisa', 'Manolo', 'Pepa', 'Andrés', 'Rosa', 'Tomás', 'Conchi', 'Julián', 'Amparo', 'Ramón', 'Nati', 'Fermín'], APELL = ['García', 'Soler', 'Ferrer', 'Puig', 'Roca', 'Vidal', 'Ortega', 'Navarro', 'Campos', 'Ibáñez'];
  const PETICIONES = [
    { id: 'material', t: 'El colegio necesita material', d: 'Ordenadores y libros para el curso.', coste: 4, ef: { colegio: 10, cariño: 3 } }, { id: 'carretera', t: 'Arreglar la carretera del pueblo', d: 'Hay baches y se quejan los camioneros.', coste: 9, ef: { transporte: 12, cariño: 3 } },
    { id: 'cancha', t: 'Una canasta nueva en el patio', d: 'Los chavales quieren jugar como tú.', coste: 3, ef: { polideportivo: 8, cariño: 4 } }, { id: 'medico', t: 'Un médico los fines de semana', d: 'Los mayores van hasta la ciudad.', coste: 6, ef: { medico: 12, cariño: 3 } },
    { id: 'farolas', t: 'Farolas en las calles de arriba', d: 'De noche no se ve nada.', coste: 5, ef: { limpieza: 10, seguridad: 4, cariño: 2 } }, { id: 'ronda', t: 'Una patrulla de vigilancia', d: 'Han robado en un par de casas.', coste: 4, ef: { seguridad: 12, cariño: 2 } }, { id: 'mercado', t: 'Reabrir el mercadillo', d: 'Los puestos llevan años vacíos.', coste: 7, ef: { cariño: 4, turismo: 1 } }
  ];
  // ---------- Estado ----------
  function gest(st) {
    const p = P(st); if (!p) return null; if (!p.gest) { const e = GM.mods.pueblo.estado(st), h = U.hash(p.nombre + 'gestion');
      p.gest = { pob: e.poblacion, caja: 6, tasa: 'normal', asig: { colegio: 22, medico: 20, polideportivo: 12, transporte: 14, seguridad: 12, limpieza: 20 }, cal: { colegio: 55, medico: 50, polideportivo: 45, transporte: 40, seguridad: 55, limpieza: 55 }, asoc: [], fiestas: { carnaval: 1, baloncesto: 1, mayor: 2, navidad: 1 }, peticiones: [], vecinos: [], serie: [], bono: 0, donado: 0, opinion: 60, turismo: 0, ult: null };
      for (let i = 0; i < 10; i++) { const k = U.hash(p.nombre + 'v' + i) >>> 0; p.gest.vecinos.push({ n: NOMBRES[k % 14] + ' ' + APELL[(k >>> 4) % 10], oficio: OFICIOS[(k >>> 8) % 12], edad: 24 + (k >>> 12) % 55, op: 45 + (k >>> 16) % 30 }); } }
    return p.gest;
  }
  const calMedia = g => Object.keys(g.cal).reduce((s, k) => s + g.cal[k], 0) / 6;
  // Población objetivo: sigue a los servicios, al empleo, a la fama y a la satisfacción; los impuestos altos empujan fuera
  function crecimiento(st, g) {
    const p = P(st), c = C(st), eds = p.edificios.filter(b => b.nivel).length, empleo = Math.min(1, eds / 14), fama = c.fama / 100, imp = TASAS[g.tasa].op;
    return clamp(0.0003 + 0.006 * (calMedia(g) - 45) / 55 + 0.004 * empleo + 0.004 * fama + 0.003 * imp + 0.002 * (g.opinion - 50) / 50 + g.turismo * 0.0006, -0.012, 0.016);
  }
  function mes(st) {
    const g = gest(st), p = P(st), c = C(st); if (!g) return;
    const T = TASAS[g.tasa], ing = Math.round(g.pob * 0.12 / 12 * T.f * 100) / 100, subv = Math.round((0.6 + c.fama / 40) * 100) / 100, aso = g.asoc.reduce((s, a) => s + ASOC[a.tipo].mes, 0), total = ing + subv - aso;
    const E = (st.equipos && st.equipos[st.clubId]) || {}; g.turismo = clamp(g.turismo * 0.9 + (g.asoc.some(a => a.tipo === 'excursion') ? 0.5 : 0) + c.fama / 120, 0, 6);
    g.caja = Math.round((g.caja + total) * 100) / 100; const reparto = Math.max(0, g.caja > 0 ? ing * 0.85 : 0); let gastado = 0;
    Object.keys(SERVICIOS).forEach(k => { const parte = reparto * g.asig[k] / 100, nec = g.pob / 50 / 12 * (0.9 + (k === 'polideportivo' ? 0.2 : 0)), obj = clamp(parte / Math.max(0.05, nec) * 55 + (g.asoc.some(a => ASOC[a.tipo].ef[k]) ? 8 : 0), 5, 100); g.cal[k] = clamp(g.cal[k] + (obj - g.cal[k]) * 0.18 - (g.caja < -2 ? 2.5 : 0), 5, 100); gastado += parte; });
    g.caja = Math.round((g.caja - gastado) * 100) / 100; g.opinion = clamp(g.opinion + (calMedia(g) - 50) / 120 + T.op - 0.05, 0, 100);
    const r = crecimiento(st, g); g.pob = Math.max(150, Math.round(g.pob * (1 + r))); g.bono = Math.round((g.pob / 70 + calMedia(g) / 7 + g.asoc.length * 0.8) * 10) / 10;
    p.cariño = clamp(p.cariño + (g.opinion - 55) / 80 + g.asoc.reduce((s, a) => s + ASOC[a.tipo].ef.cariño, 0), 0, 100);
    g.vecinos.forEach(v => { v.op = clamp(v.op + (g.opinion - v.op) * 0.05, 0, 100); });
    if (g.peticiones.length < 2 && U.hash(st.fecha + p.nombre) % 100 < 28) { const q = PETICIONES[U.hash(st.fecha + 'q' + p.nombre) % PETICIONES.length]; if (!g.peticiones.some(x => x.id === q.id)) { const v = g.vecinos[U.hash(st.fecha + 'w') % g.vecinos.length]; g.peticiones.push({ id: q.id, vecino: v.n, oficio: v.oficio, t: q.t, d: q.d, coste: q.coste, ef: q.ef, hasta: U.addDays(st.fecha, 60) }); GM.noticia && GM.noticia(st, v.n + ' (' + v.oficio + ') te pide ayuda en ' + p.nombre + ': ' + q.t.toLowerCase() + '.'); } }
    g.peticiones = g.peticiones.filter(q => { if (q.hasta < st.fecha) { g.opinion = clamp(g.opinion - 1.5, 0, 100); GM.noticia && GM.noticia(st, 'Se te pasó el plazo de la petición de ' + q.vecino + ': ' + q.t.toLowerCase() + '.'); return false; } return true; });
    g.serie.push({ f: st.fecha, pob: g.pob, cal: Math.round(calMedia(g)), caja: g.caja, op: Math.round(g.opinion) }); if (g.serie.length > 150) g.serie.shift(); g.ult = { ing, subv, aso, gastado: Math.round(gastado * 100) / 100, total: Math.round(total * 100) / 100 };
    if (g.caja < -6 && GM.noticia && U.hash(st.fecha) % 3 === 0) GM.noticia(st, 'El ayuntamiento de ' + p.nombre + ' está en números rojos: los servicios se deterioran. Dona o sube los impuestos.');
  }
  // Fiestas del año: el presupuesto sale de la caja municipal; con dinero hay cariño, turismo y un empujón de afición
  function fiesta(st, g, f) { const F = FIESTAS[f], nivel = g.fiestas[f], coste = Math.round(F.base * nivel * 10) / 10, p = P(st), banda = g.asoc.some(a => a.tipo === 'banda') ? 1.3 : 1; if (g.caja < coste) { GM.noticia && GM.noticia(st, 'No hay dinero para el ' + F.n.toLowerCase() + ' de ' + p.nombre + ' y se queda en nada.'); return; }
    g.caja = Math.round((g.caja - coste) * 100) / 100; p.cariño = clamp(p.cariño + nivel * 1.6 * banda, 0, 100); g.turismo = clamp(g.turismo + nivel * 0.4, 0, 6); g.opinion = clamp(g.opinion + nivel * 0.8, 0, 100); C(st).fama += 0.05 * nivel; GM.noticia && GM.noticia(st, p.nombre + ' celebra: ' + F.n.toLowerCase() + (nivel >= 2 ? ' por todo lo alto' : '') + '.'); }
  GM.bus.on('dia:avanzado', () => {
    const st = GM.state; if (!act(st)) return; if (!gest(st)) return; const md = st.fecha.slice(5), g = gest(st);
    if (st.fecha.slice(8) === '15') { try { mes(st); } catch (e) { console.error('puebloGestion', e); } }
    Object.keys(FIESTAS).forEach(f => { if (FIESTAS[f].md === md) fiesta(st, g, f); });
  });
  // ---------- Decisiones ----------
  function fijarTasa(st, t) { const g = gest(st); if (!g || !TASAS[t]) return { ok: false, motivo: 'Esa tasa no existe.' }; g.tasa = t; return { ok: true }; }
  function asignar(st, k, v) {   // reparte el 100 % entre los seis servicios: lo que sube uno se resta proporcionalmente a los demás
    const g = gest(st); if (!g || !SERVICIOS[k]) return { ok: false, motivo: 'Ese servicio no existe.' }; v = clamp(Math.round(v), 0, 60); const resto = Object.keys(g.asig).filter(x => x !== k), suma = resto.reduce((s, x) => s + g.asig[x], 0) || 1, queda = 100 - v;
    resto.forEach(x => { g.asig[x] = Math.round(g.asig[x] * queda / suma); }); g.asig[k] = v; const dif = 100 - Object.keys(g.asig).reduce((s, x) => s + g.asig[x], 0); g.asig[resto[0]] += dif; return { ok: true };
  }
  function donar(st, k) { const c = C(st), g = gest(st); if (!g) return { ok: false, motivo: 'Sin pueblo.' }; if (c.dinero < k) return { ok: false, motivo: 'Te faltan ' + k1(k - c.dinero) + ' mil €.' }; c.dinero -= k; g.caja = Math.round((g.caja + k) * 100) / 100; g.donado += k; P(st).aportado += k * 0.4; P(st).cariño = clamp(P(st).cariño + k / 20, 0, 100); if (GM.patrimonio) GM.patrimonio.reg(st, 'otros', 'Donación al ayuntamiento de ' + P(st).nombre, -k); return { ok: true }; }
  function subvencion(st) { const g = gest(st); if (!g) return { ok: false }; if (g.ultSub && U.diffDays(g.ultSub, st.fecha) < 180) return { ok: false, motivo: 'Ya la pediste hace poco.' }; const k = Math.round((2 + C(st).fama / 12 + g.opinion / 40) * 10) / 10; g.caja = Math.round((g.caja + k) * 100) / 100; g.ultSub = st.fecha; return { ok: true, importe: k }; }
  function apoyar(st, id) { const g = gest(st), q = g && g.peticiones.find(x => x.id === id); if (!q) return { ok: false, motivo: 'Esa petición ya no está.' }; const c = C(st); if (c.dinero < q.coste) return { ok: false, motivo: 'Te faltan ' + k1(q.coste - c.dinero) + ' mil €.' }; c.dinero -= q.coste;
    Object.keys(q.ef).forEach(k => { if (g.cal[k] !== undefined) g.cal[k] = clamp(g.cal[k] + q.ef[k], 5, 100); else if (k === 'cariño') P(st).cariño = clamp(P(st).cariño + q.ef[k], 0, 100); else if (k === 'turismo') g.turismo = clamp(g.turismo + q.ef[k], 0, 6); });
    const v = g.vecinos.find(x => x.n === q.vecino); if (v) v.op = clamp(v.op + 15, 0, 100); g.opinion = clamp(g.opinion + 2, 0, 100); g.peticiones = g.peticiones.filter(x => x !== q); if (GM.patrimonio) GM.patrimonio.reg(st, 'otros', 'Ayuda a ' + q.vecino + ': ' + q.t.toLowerCase(), -q.coste); return { ok: true, texto: q.vecino + ' te da las gracias.' }; }
  function ignorar(st, id) { const g = gest(st), q = g && g.peticiones.find(x => x.id === id); if (!q) return { ok: false }; const v = g.vecinos.find(x => x.n === q.vecino); if (v) v.op = clamp(v.op - 8, 0, 100); g.opinion = clamp(g.opinion - 1, 0, 100); g.peticiones = g.peticiones.filter(x => x !== q); return { ok: true }; }
  function fundar(st, tipo) { const g = gest(st), a = ASOC[tipo]; if (!g || !a) return { ok: false, motivo: 'Esa asociación no existe.' }; if (g.asoc.some(x => x.tipo === tipo)) return { ok: false, motivo: 'Ya existe.' }; const c = C(st); if (c.dinero < a.coste) return { ok: false, motivo: 'Te faltan ' + k1(a.coste - c.dinero) + ' mil €.' }; c.dinero -= a.coste; g.asoc.push({ tipo, desde: st.fecha }); P(st).cariño = clamp(P(st).cariño + 2, 0, 100); return { ok: true }; }
  function cerrarAsoc(st, tipo) { const g = gest(st); if (!g) return { ok: false }; g.asoc = g.asoc.filter(x => x.tipo !== tipo); return { ok: true }; }
  function presupuestoFiesta(st, f, n) { const g = gest(st); if (!g || !FIESTAS[f]) return { ok: false }; g.fiestas[f] = clamp(Math.round(n), 0, 3); return { ok: true }; }
  const serie = st => (gest(st) ? gest(st).serie : []);
  function resumen(st) { const g = gest(st); if (!g) return null; const e = GM.mods.pueblo.estado(st); return { pob: g.pob, nivel: e.nivel, etiqueta: e.etiqueta, caja: g.caja, cal: Math.round(calMedia(g)), opinion: Math.round(g.opinion), crecimiento: Math.round(crecimiento(st, g) * 1000) / 10, turismo: Math.round(g.turismo * 10) / 10, ult: g.ult }; }
  function selfTest() {
    const prev = GM.state, pu = { nombre: 'Villa', nac: 'ES', aportado: 0, cariño: 40, edificios: [{ tipo: 'canasta', nivel: 1 }], hitos: [], cd: {}, nivel: 1, energia: 0 }; const st = { modo: 'carrera', fecha: '2026-10-01', clubId: 'a', equipos: { a: { id: 'a' } }, noticias: [], carrera: { dinero: 100, fama: 30, moral: 60, pueblo: pu, social: null, fase: 'pro' }, jugadores: { yo: { nombre: 'Yo' } } };
    GM.mods.pueblo = GM.mods.pueblo || { estado: () => ({ poblacion: 800, nivel: 1, etiqueta: 'Aldea' }) }; GM.state = st; let ok = !!gest(st); for (let i = 0; i < 24; i++) { st.fecha = U.addDays(st.fecha, 30); mes(st); } ok = ok && gest(st).serie.length === 24 && gest(st).pob > 0 && asignar(st, 'colegio', 40).ok && Object.keys(gest(st).asig).reduce((s, k) => s + gest(st).asig[k], 0) === 100; GM.state = prev; return ok;
  }
  GM.puebloGestion = { SERVICIOS, TASAS, ASOC, FIESTAS, PETICIONES, gest, mes, fiesta, resumen, crecimiento, fijarTasa, asignar, donar, subvencion, apoyar, ignorar, fundar, cerrarAsoc, presupuestoFiesta, serie, selfTest };
  GM.register && GM.register('puebloGestion', GM.puebloGestion);
})();
