/* OJEADORES POR EL MUNDO (GM.mods.ojeadores) — modos gestor y presidente
   Puedes contratar hasta tres ojeadores (según la reputación del club). Cada uno tiene un nivel (1 a 5), una especialidad y un sueldo anual, y se envía a una zona:
   una liga (NBA, Euroliga, ACB, Lega, liga griega, Bundesliga, liga turca), los agentes libres o la clase del próximo draft. Cada lunes revisa a unos jugadores jóvenes de su
   zona y deja un informe con rangos de media y de potencial: cuanto mejor el ojeador, más estrecho el rango. Verlo varias veces afina el informe. Los ojeadores de nivel 3
   o más pueden destapar «joyas ocultas» (el talento tardío que cantera.js esconde en algunos jugadores jóvenes: explotan si juegan).
   Los informes se pueden seguir (lista de seguimiento) o descartar; desde ellos se abre la ficha del jugador para ofertar o comprar.
   Expone: estado, candidatos, contratar, despedir, asignar, informes, seguir, descartar, destinos, maximo, selfTest.
   Escribe state.ojeadores = { equipo, informes, vistos, seq, cand: { temp, lista } }. Sueldos: el día 1 de cada mes por finanzas.registrar. */
(function () {
  const U = GM.util, M = () => GM.mods.mercado, F = () => GM.mods.finanzas;
  const NIVELES = ['', 'Aprendiz', 'Correcto', 'Fiable', 'Experto', 'Leyenda'];
  const ESPEC = { NBA: 'Universidad y Norteamérica', EUROLIGA: 'Europa del Este', ACB: 'Península Ibérica', LEGA: 'Italia y Balcanes', GBL: 'Mediterráneo oriental', BBL: 'Centroeuropa', BSL: 'Turquía y Oriente Medio' };
  const NOMLIGA = { NBA: 'NBA', EUROLIGA: 'Euroliga', ACB: 'Liga Endesa', LEGA: 'Lega Basket', GBL: 'Liga griega', BBL: 'Bundesliga', BSL: 'Liga turca', LIBRES: 'Agentes libres', DRAFT: 'Clase del draft' };
  const disponible = st => st.modo === 'gestor' || st.modo === 'presidente';
  function estado(st) { return st.ojeadores || (st.ojeadores = { equipo: [], informes: [], vistos: {}, seq: 0, cand: { temp: null, lista: [] } }); }
  const maximo = st => Math.max(1, Math.min(3, 1 + Math.floor(st.equipos[st.clubId].reputacion / 40)));
  const sueldoDe = n => 18000 * n * n;
  function destinos(st) { return Object.keys(NOMLIGA).filter(l => l === 'LIBRES' || l === 'DRAFT' || st.ligas[l]).map(l => ({ id: l, nombre: NOMLIGA[l] })); }
  function candidatos(st) {
    const E = estado(st); if (E.cand.temp === st.temporada && E.cand.lista.length) return E.cand.lista;
    const ligas = Object.keys(ESPEC).filter(l => st.ligas[l]), paises = ['ES', 'FR', 'IT', 'GR', 'DE', 'TR', 'RS', 'US', 'LT', 'SI'];
    E.cand = { temp: st.temporada, lista: Array.from({ length: 6 }, (_, i) => { const h = U.hash(st.seed + st.temporada + 'oj' + i), n = 1 + (h % 100 < 30 ? 0 : h % 100 < 62 ? 1 : h % 100 < 84 ? 2 : h % 100 < 95 ? 3 : 4), pa = paises[h % paises.length], esp = ligas[(h >>> 4) % Math.max(1, ligas.length)] || 'ACB'; return { id: 'oc' + i, nombre: GM.nombreAleatorio ? GM.nombreAleatorio(pa, h) : 'Ojeador ' + (i + 1), nivel: Math.min(5, n), espec: esp, sueldo: sueldoDe(Math.min(5, n)) }; }) };
    return E.cand.lista;
  }
  function contratar(st, candId) {
    if (!disponible(st)) return { ok: false, motivo: 'Este modo no gestiona ojeadores.' }; const E = estado(st);
    if (E.equipo.length >= maximo(st)) return { ok: false, motivo: 'Tu club solo puede mantener ' + maximo(st) + (maximo(st) === 1 ? ' ojeador.' : ' ojeadores.') };
    const c = candidatos(st).find(x => x.id === candId); if (!c) return { ok: false, motivo: 'Ese ojeador ya no está disponible.' };
    if (F() && st.finanzas[st.clubId].caja < c.sueldo / 12) return { ok: false, motivo: 'No hay caja para pagarle el primer mes.' };
    E.equipo.push({ id: 'o' + (++E.seq), nombre: c.nombre, nivel: c.nivel, espec: c.espec, sueldo: c.sueldo, destino: null, desde: st.fecha, vistos: 0 }); E.cand.lista = E.cand.lista.filter(x => x.id !== candId);
    GM.noticia(st, 'Ojeador nuevo: ' + c.nombre + ' (' + NIVELES[c.nivel] + ').'); return { ok: true };
  }
  function despedir(st, id) { const E = estado(st), i = E.equipo.findIndex(o => o.id === id); if (i < 0) return { ok: false, motivo: 'No existe.' }; const o = E.equipo[i]; E.equipo.splice(i, 1); GM.noticia(st, o.nombre + ' deja el servicio de ojeadores.'); return { ok: true }; }
  function asignar(st, id, destino) { const E = estado(st), o = E.equipo.find(x => x.id === id); if (!o) return { ok: false, motivo: 'No existe.' }; if (!destinos(st).some(d => d.id === destino)) return { ok: false, motivo: 'Zona desconocida.' }; o.destino = destino; return { ok: true }; }
  const chispa = p => (U.hash('chispa' + p.id) % 1000) / 1000;
  function pool(st, destino) {
    const club = st.clubId; let L;
    if (destino === 'LIBRES') L = (st.mercado.libres || []).map(i => st.jugadores[i]).filter(Boolean).filter(p => p.edad <= 27);
    else if (destino === 'DRAFT') { if (!st._draftOjeo || st._draftOjeo.temp !== st.temporada) st._draftOjeo = { temp: st.temporada, l: M().claseDraft(st).map(p => ({ id: p.id, nombre: p.nombre, edad: p.edad, pos: p.pos, nac: p.nac, ovr: p.ovr, pot: p.pot, draft: true })) }; L = st._draftOjeo.l; }
    else L = (st.ligas[destino] ? st.ligas[destino].equipos : []).filter(e => e !== club).reduce((a, e) => a.concat(st.equipos[e].plantilla.map(i => st.jugadores[i]).filter(Boolean)), []).filter(p => p.edad <= 24);
    return L;
  }
  function informar(st, o, p) {
    const E = estado(st), v = E.vistos[p.id] = (E.vistos[p.id] || 0) + 1, err = Math.max(1, (8.5 - o.nivel * 1.3) * Math.pow(0.82, v - 1)), r = GM.rng;
    const lo = Math.round(r.range(0.3, 1) * err), hi = Math.round(err - lo + 1), pl = Math.round(r.range(0.3, 1) * (err + 2)), ph = Math.round(err + 2 - pl + 1);
    const joya = !p.draft && p.edad <= 23 && chispa(p) > 0.92 && o.nivel >= 3 && r.next() < 0.3 + o.nivel * 0.12;
    const at = p.att || null; let fuerte = ''; if (at) { const k = Object.keys(at).sort((a, b) => at[b] - at[a])[0]; fuerte = { tiro3: 'el triple', tiro2: 'el tiro de media', tl: 'el tiro libre', pase: 'la visión de juego', bote: 'el manejo', reb: 'el rebote', defInt: 'la defensa interior', defPer: 'la defensa exterior', fisico: 'el físico', iq: 'la lectura del juego' }[k] || k; }
    const club = p.equipoId && st.equipos[p.equipoId] ? st.equipos[p.equipoId].nombre : p.draft ? 'Universitario o europeo (draft)' : 'Sin club';
    return { id: 'i' + (++E.seq), jugadorId: p.draft ? null : p.id, nombre: p.nombre, edad: p.edad, pos: p.pos, nac: p.nac, club, fecha: st.fecha, ojeador: o.nombre, nivel: o.nivel, ovr: [Math.max(35, p.ovr - lo), Math.min(99, p.ovr + hi)], pot: [Math.max(40, p.pot - pl), Math.min(99, p.pot + ph)], vistas: v, joya, fuerte, seguido: false, draft: !!p.draft };
  }
  function semana(st) {
    const E = estado(st); if (!disponible(st)) return;
    E.equipo.forEach(o => {
      if (!o.destino) return; const L = pool(st, o.destino); if (!L.length) return;
      const n = o.nivel >= 4 ? 3 : 2, bonus = o.espec === o.destino ? 1 : 0; let hechos = 0;
      const orden = L.slice().map(p => ({ p, w: (p.pot - p.ovr) * 0.9 + (p.pot - 60) * 0.5 + (chispa(p) > 0.92 ? 4 + o.nivel : 0) + GM.rng.next() * 18 - (E.vistos[p.id] || 0) * 3 })).sort((a, b) => b.w - a.w).slice(0, n + bonus);
      orden.forEach(x => { const inf = informar(st, o, x.p), previo = E.informes.findIndex(i => i.nombre === inf.nombre && i.edad === inf.edad); if (previo >= 0) { inf.seguido = E.informes[previo].seguido; E.informes.splice(previo, 1); } E.informes.unshift(inf); hechos++; if (inf.joya) GM.noticia(st, '🔎 ' + o.nombre + ' cree haber encontrado una joya: ' + inf.nombre + ' (' + inf.edad + ' años, ' + inf.club + ').'); });
      o.vistos += hechos;
    });
    if (E.informes.length > 80) E.informes.length = 80;
  }
  function informes(st) { return estado(st).informes; }
  function seguir(st, id) { const i = estado(st).informes.find(x => x.id === id); if (!i) return { ok: false, motivo: 'No existe.' }; i.seguido = !i.seguido; return { ok: true, seguido: i.seguido }; }
  function descartar(st, id) { const E = estado(st); E.informes = E.informes.filter(x => x.id !== id); return { ok: true }; }
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !st.ojeadores || !disponible(st)) return;
    if (U.weekday(st.fecha) === 1) semana(st);
    if (st.fecha.slice(8, 10) === '01' && F()) st.ojeadores.equipo.forEach(o => F().registrar(st, st.clubId, 'Ojeador ' + o.nombre, -Math.round(o.sueldo / 12)));
  });
  function nuevaPartida(st) { st.ojeadores = { equipo: [], informes: [], vistos: {}, seq: 0, cand: { temp: null, lista: [] } }; }
  function selfTest() {
    const st = { modo: 'gestor', clubId: 'a', temporada: '2026-27', seed: 5, fecha: '2026-10-05', noticias: [], equipos: { a: { reputacion: 80, plantilla: [] }, b: { reputacion: 60, plantilla: [] } }, ligas: { ACB: { equipos: ['a', 'b'] } }, jugadores: {}, mercado: { libres: [] }, finanzas: { a: { caja: 1e7 } } };
    for (let i = 0; i < 12; i++) { const id = 'p' + i; st.jugadores[id] = { id, nombre: 'P' + i, equipoId: 'b', edad: 19 + (i % 5), pos: 'SG', nac: 'ES', ovr: 60 + i, pot: 70 + i, att: { tiro3: 60 + i, pase: 55, reb: 50 } }; st.equipos.b.plantilla.push(id); }
    const F0 = GM.mods.finanzas; GM.mods.finanzas = null;
    estado(st); const c = candidatos(st), r = contratar(st, c[0].id); if (!r.ok) { GM.mods.finanzas = F0; return false; }
    const E = estado(st); asignar(st, E.equipo[0].id, 'ACB'); semana(st); semana(st); GM.mods.finanzas = F0;
    const inf = E.informes[0]; return maximo(st) >= 2 && E.informes.length >= 2 && inf.ovr[0] <= inf.ovr[1] && inf.pot[0] <= inf.pot[1] && sueldoDe(3) === 162000;
  }
  GM.register('ojeadores', { estado, disponible, candidatos, contratar, despedir, asignar, informes, seguir, descartar, destinos, maximo, nuevaPartida, selfTest, NIVELES, NOMLIGA, ESPEC, semana });
})();
