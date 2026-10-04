/* AFICIÓN E IDENTIDAD (GM.mods.fans) — modos gestor y presidente
   Peñas por barrios (ánimo, miembros, actividades y peticiones), precio de los abonos, tifos, mascota, lema, himno y rival histórico (derbi).
   Expone: estado, penas, accionesPena, hacerPena, peticiones, resolverPeticion, fijarPrecio, fijarIdentidad, rivales, selfTest.
   Escribe state.fans = { penas, abonos:{precio}, identidad:{mascota,lema,himno,rival}, peticiones, tifo, ultima, cd }.
   finanzas.ingresosPartido lee el precio de los abonos, el rival y el tifo. */
(function () {
  const U = GM.util;
  const TIPOS = {
    ultra: { etq: 'Grada de animación', nombres: ['Grada de Animación', 'Los Incondicionales', 'Frente Bufanda'], ef: { ambiente: 4 } },
    familiar: { etq: 'Peña familiar', nombres: ['Peña Familiar', 'Familias del Pabellón', 'Els de Casa'], ef: { aficion: 3 } },
    veterana: { etq: 'Peña de veteranos', nombres: ['Veteranos', 'La Vieja Guardia', 'Socios de Siempre'], ef: { apoyo: 3 } },
    joven: { etq: 'Peña joven', nombres: ['Jóvenes de la Cantera', 'Generación Pabellón', 'Colla Jove'], ef: { aficion: 2, ambiente: 2 } },
    internacional: { etq: 'Peña internacional', nombres: ['Peña Internacional', 'Aficionados del Mundo', 'Club de Expatriados'], ef: { aficion: 2 } }
  };
  const ACC = [
    { id: 'cena', t: 'Cena con la peña', coste: 8000, cd: 20, animo: 10, aficion: 1 },
    { id: 'entradas', t: 'Entradas gratis para el próximo partido', coste: 12000, cd: 14, animo: 6, aficion: 0.5 },
    { id: 'viaje', t: 'Apoyar su desplazamiento a un partido fuera', coste: 25000, cd: 30, animo: 8, ambiente: 2 },
    { id: 'tifo', t: 'Preparar un tifo para el próximo partido en casa', coste: 30000, cd: 40, animo: 8, solo: ['ultra', 'joven'], tifo: true }
  ];
  const PETICIONES = [
    { id: 'bufandas', t: 'Más bufandas y banderas', d: 'Piden que el club regale material para el siguiente partido.', ops: [{ t: 'Aceptar (10 000 €)', coste: 10000, animo: 8, ambiente: 2 }, { t: 'No hay presupuesto', animo: -5 }] },
    { id: 'autobus', t: 'Un autobús para ir al partido de fuera', d: 'La peña quiere acompañar al equipo en su próximo desplazamiento.', ops: [{ t: 'Pagar el autobús (18 000 €)', coste: 18000, animo: 9, ambiente: 2, aficion: 1 }, { t: 'Que se organicen ellos', animo: -3 }] },
    { id: 'precios', t: 'Quejas por los precios', d: 'Dicen que las entradas se han puesto por las nubes.', ops: [{ t: 'Descuento para peñistas', coste: 8000, animo: 8, aficion: 2 }, { t: 'Mantener los precios', animo: -6, aficion: -1 }] },
    { id: 'zona', t: 'Una zona propia en la grada', d: 'Quieren reunirse todos juntos, con su pancarta y su bombo.', ops: [{ t: 'Reservarles la zona', ambiente: 4, animo: 10, apoyo: -1 }, { t: 'No se puede', animo: -4 }] },
    { id: 'homenaje', t: 'Homenaje a un socio histórico', d: 'Un socio de toda la vida cumple 80 años en el club.', ops: [{ t: 'Hacerle un acto (6 000 €)', coste: 6000, animo: 7, aficion: 2, apoyo: 1 }, { t: 'Una felicitación sencilla', animo: 2 }] },
    { id: 'cantico', t: 'Un nuevo cántico', d: 'Han compuesto un cántico y piden que suene en los tiempos muertos.', ops: [{ t: 'Que suene en el pabellón', ambiente: 3, animo: 6 }, { t: 'Mejor la música de siempre', animo: -2 }] },
    { id: 'viajes-jovenes', t: 'Entradas para los más jóvenes', d: 'Proponen un día especial con entradas a mitad de precio para menores.', ops: [{ t: 'Organizar la jornada (9 000 €)', coste: 9000, aficion: 3, animo: 6 }, { t: 'No esta temporada', animo: -2 }] }
  ];
  const ANIMALES = { oso: 'Oso', lobo: 'Lobo', toro: 'Toro', aguila: 'Águila', leon: 'León', gato: 'Gato' };
  const HIMNOS = { clasico: 'Clásico', rock: 'Rock', coral: 'Coral' };
  const yearOf = st => parseInt(st.temporada.slice(0, 4), 10);
  const esc = (st, id) => U.clamp(st.equipos[id].presupuesto / 60e6, 0.3, 8);
  const F = st => st.fans;

  function nuevaPartida(st) {
    if (st.modo === 'carrera') return;
    const id = st.clubId, eq = st.equipos[id], h = U.hash(id + 'penas'), n = 4 + (h % 2), keys = Object.keys(TIPOS), rep = eq.reputacion;
    const nbar = (GM.mods.ciudad3d && GM.mods.ciudad3d.barrios) ? 6 : 6;
    const penas = [];
    for (let i = 0; i < n; i++) {
      const tipo = keys[(i + (h >>> 3)) % keys.length], nom = TIPOS[tipo].nombres[(h >>> (i + 2)) % 3];
      penas.push({ id: 'pn' + i, tipo, nombre: nom, barrio: (h >>> (i + 5)) % nbar, miembros: Math.round(30 + rep * 1.4 + ((h >>> (i + 7)) % 60)), animo: 45 + ((h >>> (i + 9)) % 25), ult: {} });
    }
    st.fans = { penas, abonos: { precio: 1 }, identidad: { mascota: null, lema: '', himno: null, rival: null }, peticiones: [], tifo: null, ultima: st.fecha, res: [] };
  }
  function estado(st) { return st.modo !== 'carrera' ? st.fans || null : null; }
  function nombreBarrio(st, i) { const m = GM.mods.ciudad3d; return m && m.barrios ? (m.barrios(st)[i] || {}).nombre : 'Barrio ' + (i + 1); }
  function penas(st) { return F(st).penas.map(p => Object.assign({}, p, { etq: TIPOS[p.tipo].etq, barrioNombre: nombreBarrio(st, p.barrio) })); }
  function accionesPena(st, id) {
    const p = F(st).penas.find(x => x.id === id), e = esc(st, st.clubId);
    return ACC.filter(a => !a.solo || a.solo.indexOf(p.tipo) >= 0).map(a => { const resta = p.ult[a.id] ? a.cd - U.diffDays(p.ult[a.id], st.fecha) : 0, tifoOcupado = a.tifo && F(st).tifo; return Object.assign({}, a, { coste: Math.round(a.coste * e / 1000) * 1000, disponible: resta <= 0 && !tifoOcupado, motivo: resta > 0 ? 'Disponible en ' + resta + ' días' : tifoOcupado ? 'Ya hay un tifo preparado' : null }); });
  }
  function aplica(st, ef) {
    const c = st.ciudad[st.clubId];
    if (ef.aficion) c.aficion = U.clamp(c.aficion + ef.aficion, 0, 100);
    if (ef.ambiente) c.ambiente = U.clamp(c.ambiente + ef.ambiente, 0, 100);
    if (ef.apoyo) c.apoyoAyuntamiento = U.clamp(c.apoyoAyuntamiento + ef.apoyo, 0, 100);
  }
  function hacerPena(st, penaId, accId) {
    const p = F(st).penas.find(x => x.id === penaId), a = accionesPena(st, penaId).find(x => x.id === accId);
    if (!p || !a) return { ok: false, motivo: 'Actividad no disponible.' };
    if (!a.disponible) return { ok: false, motivo: a.motivo };
    const Fi = GM.mods.finanzas;
    if (Fi && st.finanzas[st.clubId].caja < a.coste) return { ok: false, motivo: 'No hay caja para ' + U.eur(a.coste) + '.' };
    if (Fi && a.coste) Fi.registrar(st, st.clubId, a.t + ': ' + p.nombre, -a.coste);
    p.animo = U.clamp(p.animo + a.animo, 0, 100); p.ult[a.id] = st.fecha;
    aplica(st, { aficion: a.aficion, ambiente: a.ambiente });
    if (a.tifo) { F(st).tifo = { peña: p.id, potencia: 1 + p.miembros / 200 }; GM.noticia(st, p.nombre + ' prepara un tifo para el próximo partido en casa.'); }
    else GM.noticia(st, a.t + ': ' + p.nombre + '.');
    const L = GM.mods.legado; if (L && L.activo(st)) L.ajustar(st, { arraigo: 0.3 }, 0);
    return { ok: true };
  }
  function peticiones(st) { return F(st).peticiones.map(q => { const d = PETICIONES.find(x => x.id === q.id), p = F(st).penas.find(x => x.id === q.peña); return { id: q.id, titulo: d.t, texto: d.d, peña: p.nombre, opciones: d.ops.map((o, i) => ({ i, t: o.t })) }; }); }
  function resolverPeticion(st, id, i) {
    const f = F(st), idx = f.peticiones.findIndex(q => q.id === id), d = PETICIONES.find(x => x.id === id);
    if (idx < 0 || !d || !d.ops[i]) return { ok: false, motivo: 'Petición no disponible.' };
    const o = d.ops[i], p = f.penas.find(x => x.id === f.peticiones[idx].peña), Fi = GM.mods.finanzas;
    if (o.coste) { if (Fi && st.finanzas[st.clubId].caja < o.coste) return { ok: false, motivo: 'No hay caja para ' + U.eur(o.coste) + '.' }; if (Fi) Fi.registrar(st, st.clubId, 'Petición de ' + p.nombre, -o.coste); }
    p.animo = U.clamp(p.animo + (o.animo || 0), 0, 100); aplica(st, o);
    f.peticiones.splice(idx, 1); f.res.push({ id, i, fecha: st.fecha }); if (f.res.length > 30) f.res.shift();
    GM.noticia(st, p.nombre + ': ' + d.t.toLowerCase() + ', ' + o.t.replace(/\s*\(.*\)/, '').toLowerCase() + '.');
    return { ok: true };
  }
  function fijarPrecio(st, x) { F(st).abonos.precio = U.clamp(x, 0.7, 1.4); return { ok: true }; }
  function rivales(st) {
    const id = st.clubId, ligas = GM.ligasDe(st, id), set = {};
    ligas.forEach(l => st.ligas[l].equipos.forEach(e => { if (e !== id) set[e] = 1; }));
    return Object.keys(set).sort((a, b) => st.equipos[b].reputacion - st.equipos[a].reputacion).slice(0, 14).map(e => ({ id: e, nombre: st.equipos[e].nombre }));
  }
  function fijarIdentidad(st, o) {
    const i = F(st).identidad;
    if (o.mascota !== undefined) i.mascota = o.mascota && o.mascota.nombre ? { nombre: String(o.mascota.nombre).slice(0, 20), animal: ANIMALES[o.mascota.animal] ? o.mascota.animal : 'oso', color: o.mascota.color || '#c8553d' } : null;
    if (o.lema !== undefined) i.lema = String(o.lema).slice(0, 44);
    if (o.himno !== undefined) i.himno = HIMNOS[o.himno] ? o.himno : null;
    if (o.rival !== undefined) { i.rival = o.rival; if (o.rival) GM.noticia(st, 'Se declara rival histórico: ' + st.equipos[o.rival].nombre + '.'); }
    return { ok: true };
  }
  GM.bus.on('partido:jugado', function (e) {
    const st = GM.state; if (!st || !st.fans) return;
    const g = e.partido, club = st.clubId, f = F(st);
    if (g.local !== club && g.visitante !== club) return;
    const gano = (g.resultado.local > g.resultado.visitante) === (g.local === club), rival = f.identidad.rival;
    if (g.local === club && f.tifo) {
      const p = f.penas.find(x => x.id === f.tifo.peña), k = f.tifo.potencia;
      aplica(st, { ambiente: 4 * k, aficion: 1.5 * k }); if (p) p.animo = U.clamp(p.animo + 6, 0, 100);
      GM.noticia(st, '¡Gran tifo en el pabellón! La grada no para.'); f.tifo = null;
    }
    if (rival && (g.local === rival || g.visitante === rival)) { aplica(st, gano ? { aficion: 2, ambiente: 2 } : { aficion: -2, ambiente: -2 }); GM.noticia(st, gano ? '¡Derbi ganado ante ' + st.equipos[rival].nombre + '!' : 'Derbi perdido ante ' + st.equipos[rival].nombre + '. Duele.'); }
  });
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !st.fans) return;
    const f = F(st), c = st.ciudad[st.clubId];
    if (st.fecha.slice(8) === '01') {
      f.penas.forEach(p => { p.animo += ((c.aficion + c.ambiente) / 2 - p.animo) * 0.12; p.miembros = Math.max(10, Math.round(p.miembros * (1 + (p.animo - 50) / 2500))); });
      if (f.abonos.precio > 1.15) c.aficion = U.clamp(c.aficion - 0.5, 0, 100); else if (f.abonos.precio < 0.9) c.aficion = U.clamp(c.aficion + 0.35, 0, 100);
    }
    if (U.weekday(st.fecha) === 2 && f.peticiones.length < 2 && GM.rng.next() < 0.12) {
      const usadas = new Set(f.res.slice(-4).map(r => r.id).concat(f.peticiones.map(q => q.id))), lista = PETICIONES.filter(x => !usadas.has(x.id));
      if (lista.length) { const d = GM.rng.pick(lista), p = GM.rng.pick(f.penas); f.peticiones.push({ id: d.id, peña: p.id, fecha: st.fecha }); GM.noticia(st, p.nombre + ' tiene una petición: ' + d.t.toLowerCase() + '.'); }
    }
  });
  function selfTest() {
    const st = { modo: 'gestor', temporada: '2026-27', fecha: '2026-10-01', clubId: 'a', noticias: [], equipos: { a: { id: 'a', presupuesto: 30e6, reputacion: 60 } }, ligas: { L: { equipos: ['a', 'b'] } }, ciudad: { a: { ambiente: 50, aficion: 50, apoyoAyuntamiento: 50 } }, finanzas: { a: { caja: 1e7, movimientos: [], patrocinios: [], temp: { ingresos: 0, gastos: 0 }, historial: [] } } };
    nuevaPartida(st);
    const p = st.fans.penas.find(x => x.tipo === 'ultra' || x.tipo === 'joven') || st.fans.penas[0], a0 = p.animo;
    const r1 = hacerPena(st, p.id, 'cena'), r2 = hacerPena(st, p.id, 'cena');
    fijarPrecio(st, 1.25); fijarIdentidad(st, { mascota: { nombre: 'Bruno', animal: 'oso', color: '#aa3322' }, lema: 'Siempre juntos', himno: 'rock' });
    return st.fans.penas.length >= 4 && r1.ok && !r2.ok && p.animo > a0 && st.fans.abonos.precio === 1.25 && st.fans.identidad.mascota.nombre === 'Bruno';
  }
  GM.register('fans', { estado, penas, accionesPena, hacerPena, peticiones, resolverPeticion, fijarPrecio, fijarIdentidad, rivales, nuevaPartida, selfTest, TIPOS, ANIMALES, HIMNOS });
})();
