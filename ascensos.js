/* ASCENSOS, DESCENSOS Y CESIONES (GM.ascensos) — segunda y tercera categoría del baloncesto español (LEB Oro y LEB Plata, datos_ligas_ascenso.js).
   - Ascensos y descensos: al acabar la temporada los dos últimos de la ACB bajan a LEB Oro y los dos primeros de LEB Oro suben; entre LEB Oro y LEB Plata, igual con tres. Se hace sobre st.ligas[liga].equipos antes de generar el calendario de la temporada siguiente
     (si falta alguna de las ligas, no se hace nada). Quedan anotados en st.ascensos.hist y como noticia; subir da reputación y bajar la quita.
   - Cesiones: un club puede ceder a un joven (de la plantilla o de la cantera) a un club de LEB Oro o LEB Plata durante la temporada para que juegue minutos; al acabar la temporada vuelve y mejora según los minutos jugados (hasta +3 de media).
     En el modo carrera, si eres joven y no juegas, el club te propone la cesión por el móvil (decisión «cesion», resuelta en vida.decidir, que llama a ascensos.decidir) y, al acabar la temporada, entre tus ofertas aparece la vuelta al club que te cedió.
   Estado: st.ascensos = { hist: [{ temporada, sube: [], baja: [] }], cesiones: [{ j, de, a, desdeCantera, temporada }] } (se crea al usarlo). Expone: ESCALA, datos, candidatos, destinos, ceder, devolverTodos, aplicarAscensos, proponerCarrera, decidir, selfTest. */
(function () {
  const clamp = GM.util.clamp;
  const ESCALA = [['ACB', 'LEBORO', 2], ['LEBORO', 'LEBPLATA', 3]];
  const BAJAS = ['LEBORO', 'LEBPLATA'], MAX_PLANTILLA = 16, EDAD_MAX = 23;
  const datos = st => (st.ascensos = st.ascensos || { hist: [], cesiones: [] });
  const tabla = (st, comp) => { const C = GM.mods.competiciones; return C && st.clasificaciones && st.clasificaciones[comp] ? C.clasificacion(st, comp).map(r => r.equipoId) : null; };
  function aplicarAscensos(st) {
    const out = [], nombre = i => (st.equipos[i] || {}).nombre || i;
    ESCALA.forEach(([alta, baja, n]) => {
      const A = st.ligas && st.ligas[alta], B = st.ligas && st.ligas[baja]; if (!A || !B) return;
      const ta = tabla(st, alta), tb = tabla(st, baja); if (!ta || !tb) return;
      const bajan = ta.slice(-n), suben = tb.slice(0, n); if (bajan.length < n || suben.length < n) return;
      A.equipos = A.equipos.filter(i => bajan.indexOf(i) < 0).concat(suben); B.equipos = B.equipos.filter(i => suben.indexOf(i) < 0).concat(bajan);
      suben.forEach(i => { const e = st.equipos[i]; if (e) e.reputacion = clamp((e.reputacion || 40) + 3, 1, 100); });
      bajan.forEach(i => { const e = st.equipos[i]; if (e) e.reputacion = clamp((e.reputacion || 40) - 3, 1, 100); });
      out.push({ alta, baja, sube: suben, desciende: bajan });
      GM.noticia(st, 'Ascienden a ' + (A.nombre || alta) + ': ' + suben.map(nombre).join(' y ') + '. Descienden a ' + (B.nombre || baja) + ': ' + bajan.map(nombre).join(' y ') + '.');
      if (suben.indexOf(st.clubId) >= 0) GM.noticia(st, nombre(st.clubId) + ' asciende a ' + (A.nombre || alta) + '.'); else if (bajan.indexOf(st.clubId) >= 0) GM.noticia(st, nombre(st.clubId) + ' desciende a ' + (B.nombre || baja) + '.');
    });
    if (out.length) datos(st).hist.push({ temporada: st.temporada, sube: [].concat(...out.map(o => o.sube)), baja: [].concat(...out.map(o => o.desciende)) });
    return out;
  }
  // ---------- cesiones ----------
  function candidatos(st, clubId) {
    const e = st.equipos[clubId]; if (!e) return []; const D = datos(st), cedidos = new Set(D.cesiones.map(c => c.j)), r = [];
    e.plantilla.forEach(i => { const p = st.jugadores[i]; if (p && !p.esYo && p.edad <= EDAD_MAX && !cedidos.has(i)) r.push({ p, desdeCantera: false }); });
    ((st.cantera && st.cantera[clubId] && st.cantera[clubId].juveniles) || []).forEach(i => { const p = st.jugadores[i]; if (p && p.edad >= 15 && !cedidos.has(i)) r.push({ p, desdeCantera: true }); });
    return r.sort((a, b) => b.p.pot - a.p.pot);
  }
  function destinos(st) {
    const r = []; BAJAS.forEach(l => { if (st.ligas[l]) st.ligas[l].equipos.forEach(i => { if (i !== st.clubId && st.equipos[i]) r.push({ id: i, liga: l, e: st.equipos[i] }); }); });
    return r.sort((a, b) => (b.e.reputacion || 0) - (a.e.reputacion || 0));
  }
  function ceder(st, jugId, destId) {
    const p = st.jugadores[jugId], dest = st.equipos[destId], D = datos(st); if (!p || !dest) return { ok: false, motivo: 'No existe.' };
    const origen = st.equipos[p.equipoId]; if (!origen) return { ok: false, motivo: 'El jugador no pertenece a ningún club.' };
    if (D.cesiones.some(c => c.j === jugId)) return { ok: false, motivo: 'Ya está cedido.' };
    if (dest.plantilla.length >= MAX_PLANTILLA) return { ok: false, motivo: dest.nombre + ' no tiene sitio en la plantilla.' };
    const jv = st.cantera && st.cantera[origen.id] && st.cantera[origen.id].juveniles, enCantera = !!jv && jv.indexOf(jugId) >= 0;
    if (enCantera) st.cantera[origen.id].juveniles = jv.filter(i => i !== jugId); else origen.plantilla = origen.plantilla.filter(i => i !== jugId);
    dest.plantilla.push(jugId); p.equipoId = dest.id; p.cesionDe = origen.id; p.libre = false; origen.tactica = null; dest.tactica = null;
    D.cesiones.push({ j: jugId, de: origen.id, a: dest.id, desdeCantera: enCantera, temporada: st.temporada });
    GM.noticia(st, p.nombre + ' se marcha cedido a ' + dest.nombre + ' hasta final de temporada.'); return { ok: true };
  }
  // al acabar la temporada vuelven todos; los minutos jugados dan progreso extra
  function devolverTodos(st) {
    const D = st.ascensos; if (!D || !D.cesiones.length) return 0; let n = 0;
    D.cesiones.forEach(c => {
      const p = st.jugadores[c.j], de = st.equipos[c.de], a = st.equipos[c.a]; if (!p || !de || p.esYo) return;
      if (a) a.plantilla = a.plantilla.filter(i => i !== c.j);
      const min = ((st.estadisticas || {})[c.j] || {}).min || 0, mejora = Math.min(3, Math.round(min / 450)); p.cesionDe = null;
      if (mejora > 0 && GM.setOvr) GM.setOvr(p, Math.min(p.pot, p.ovr + mejora));
      p.equipoId = de.id; if (c.desdeCantera && st.cantera && st.cantera[de.id]) st.cantera[de.id].juveniles.push(c.j); else de.plantilla.push(c.j);
      GM.noticia(st, p.nombre + ' vuelve a ' + de.nombre + ' tras su cesión' + (mejora > 0 ? ' (+' + mejora + ' de media, ' + Math.round(min) + ' minutos)' : '') + '.'); n++;
    });
    D.cesiones = D.cesiones.filter(c => c.j === 'yo'); return n;
  }
  // ---------- modo carrera ----------
  const enCarrera = st => st.modo === 'carrera' && st.carrera && st.carrera.fase === 'pro' && st.jugadores.yo;
  function proponerCarrera(st) {
    if (!enCarrera(st) || !st.ligas.LEBORO) return false; const p = st.jugadores.yo, c = st.carrera; if (p.cesionDe || c.cesion || p.edad > 22) return false;
    const club = st.equipos[p.equipoId]; if (!club || st.ligas.LEBORO.equipos.indexOf(club.id) >= 0 || (st.ligas.LEBPLATA && st.ligas.LEBPLATA.equipos.indexOf(club.id) >= 0)) return false;
    const orden = club.plantilla.map(i => st.jugadores[i]).filter(x => x && !x.esYo).sort((a, b) => b.ovr - a.ovr), noveno = orden[8] ? orden[8].ovr : 55;
    if (p.ovr >= noveno || !GM.mods.movil || !GM.mods.movil.enviar) return false;
    const cand = destinos(st).filter(d => d.liga === 'LEBORO' && d.e.plantilla.length < MAX_PLANTILLA).slice(0, 6); if (!cand.length) return false; const d = cand[GM.util.hash(st.temporada + p.id) % cand.length];
    GM.mods.movil.enviar(st, 'agente', 'El club te propone ceder un año a ' + d.e.nombre + ' (LEB Oro) para que juegues minutos. Volverías a ' + club.nombre + ' al acabar. ¿Qué dices?', { tipo: 'vida', que: 'cesion', ops: ['Acepto la cesión', 'Prefiero quedarme'], def: 1, club: d.id });
    return true;
  }
  function decidir(st, d, i) {
    if (i !== 0) return { ok: true, efectos: ['Sigues en el club'] };
    const p = st.jugadores.yo, c = st.carrera, dest = st.equipos[d.club]; if (!dest || !GM.mods.carrera || !GM.mods.carrera.aceptar) return { ok: false, motivo: 'Ya no es posible.' };
    const de = p.equipoId, antes = c.ofertas;
    c.ofertas = [{ id: 'oCes', clubId: d.club, liga: GM.mods.mercado.ligaDe(st, d.club), tipo: 'Cesión', rol: 'Titular', salario: (p.contrato && p.contrato.salario) || 60000, anos: 1, nota: 'Cedido para jugar minutos.' }];
    const r = GM.mods.carrera.aceptar(st, 'oCes'); c.ofertas = antes;
    if (r && r.ok) { p.cesionDe = de; c.cesion = { de, a: d.club, temporada: st.temporada }; datos(st).cesiones.push({ j: 'yo', de, a: d.club, desdeCantera: false, temporada: st.temporada }); return { ok: true, efectos: ['Cedido a ' + dest.nombre] }; }
    return { ok: false, motivo: (r && r.motivo) || 'No se pudo.' };
  }
  function volverCarrera(st) {
    if (!enCarrera(st)) return; const p = st.jugadores.yo, c = st.carrera; if (!p.cesionDe || !st.equipos[p.cesionDe]) return;
    const de = st.equipos[p.cesionDe], donde = (st.equipos[p.equipoId] || {}).nombre || '';
    c.ofertas = [{ id: 'oVuelta', clubId: de.id, liga: GM.mods.mercado.ligaDe(st, de.id), tipo: 'Vuelta de cesión', rol: 'Rotación', salario: (p.contrato && p.contrato.salario) || 80000, anos: 2, nota: 'Tu club te espera tras la cesión.' }].concat(c.ofertas || []);
    c.hitos.unshift({ fecha: st.fecha, texto: 'Termina tu cesión en ' + donde + '.' }); p.cesionDe = null; c.cesion = null; const D = datos(st); D.cesiones = D.cesiones.filter(x => x.j !== 'yo');
  }
  GM.bus.on('temporada:fin', () => { const st = GM.state; if (!st || !st.ligas) return; devolverTodos(st); if (st.modo === 'carrera') volverCarrera(st); aplicarAscensos(st); });
  GM.bus.on('temporada:nueva', () => { const st = GM.state; if (st && st.modo === 'carrera') proponerCarrera(st); });
  function selfTest() { return ESCALA.length === 2 && Array.isArray(candidatos({ equipos: {}, cantera: {}, ascensos: { hist: [], cesiones: [] } }, 'x')); }
  GM.register('ascensos', { ESCALA, datos, candidatos, destinos, ceder, devolverTodos, aplicarAscensos, proponerCarrera, decidir, selfTest });
})();
