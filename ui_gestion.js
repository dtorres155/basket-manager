/* INTERFAZ: Pantallas de gestión: plantilla (con táctica y cantera), mercado, calendario y copas, club (3D), finanzas y contratos.
   Separado de ui.js. Usa las utilidades del núcleo de la interfaz a través de GM.ui._ (ver ui.js). */
(function () {
  const { registerScreen, ATT, CORTO, M, POSN, S, U, aviso, barra, carrera, cerrarModales, chip, clip, clsOvr, desmontar, entr, eq, escudo, etqFase, filaResultado, h, lectura, lesionTxt, modal, pestanas, pres, refrescar, seccion, tablaClasif, tacticaOn, toast, ui } = GM.ui._;
  // ---------- Pantalla: Plantilla ----------
  function filaJugador(p, st, alClic) {
    const les = lesionTxt(p), s = st.estadisticas[p.id];
    return h('button', { class: 'jug' + (les ? ' lesion' : ''), onclick: alClic },
      h('span', { class: 'pos' }, p.pos), h('span', { class: 'ct' }, h('b', null, clip(p.nombre, 22)), h('span', { class: 'muted' }, p.edad + ' años, ' + U.eur(p.contrato.salario) + (p.contrato.hasta ? ' hasta ' + p.contrato.hasta : '') + (s ? ', ' + (s.pts / s.pj).toFixed(1) + ' pts' : ''))),
      les ? chip(les, 'mal') : h('span', { class: 'energia' }, barra(100 - p.estado.fatiga, 100, p.estado.fatiga > 60 ? 'rojo' : p.estado.fatiga > 35 ? 'ambar' : 'verde')),
      h('span', { class: 'ovr ' + clsOvr(p.ovr) }, p.ovr));
  }
  function detalleJugador(id) {
    const st = S(), p = st.jugadores[id], M_ = M(), mio = p.equipoId === st.clubId, s = st.estadisticas[id];
    const att = h('div', { class: 'attrs' }, Object.keys(ATT).map(k => h('div', { class: 'at' }, h('span', null, ATT[k]), barra(p.att[k], 99, p.att[k] >= 75 ? 'verde' : p.att[k] >= 55 ? 'ambar' : 'rojo'), h('b', null, p.att[k]))));
    const botones = [];
    if (mio && !p.juvenil && !lectura()) {
      botones.push({ t: 'Renovar', fn: () => { setTimeout(() => dialogoContrato(id, 'renovar'), 0); } });
      botones.push({ t: 'Ofertas de venta', cls: 'btn-sec', fn: () => { setTimeout(() => dialogoVenta(id), 0); } });
      botones.push({ t: 'Liberar', cls: 'btn-sec peligro', fn: () => { setTimeout(() => confirmarLiberar(id), 0); } });
    } else if (lectura()) { } else if (p.libre) botones.push({ t: 'Ofrecer contrato', fn: () => { setTimeout(() => dialogoContrato(id, 'fichar'), 0); } });
    else if (p.equipoId && !mio) botones.push({ t: 'Comprar por ' + U.eur(M_.mercado.precioMinimo(st, id)), fn: () => { setTimeout(() => confirmarCompra(id), 0); } });
    botones.push({ t: 'Cerrar', cls: 'btn-sec' });
    modal(h('div', null, h('div', { class: 'fila' }, h('h3', null, p.nombre), h('span', { class: 'ovr grande ' + clsOvr(p.ovr) }, p.ovr)),
      h('p', { class: 'muted' }, POSN[p.pos] + ', ' + p.edad + ' años, ' + p.altura + ' cm, ' + p.nac + (p.equipoId ? ', ' + eq(p.equipoId).nombre : ', Agente libre') + (p.ficticio ? ', jugador ficticio' : '')),
      h('div', { class: 'chips' }, chip('Potencial ' + p.pot), chip('Forma ' + Math.round(p.estado.forma)), chip('Fatiga ' + Math.round(p.estado.fatiga)), chip('Moral ' + Math.round(p.estado.moral)), p.contrato.salario ? chip(U.eur(p.contrato.salario) + ' hasta ' + p.contrato.hasta) : null, lesionTxt(p) ? chip(p.estado.lesion.tipo + ', ' + p.estado.lesion.dias + ' d', 'mal') : null),
      s ? h('p', null, 'Temporada: ' + s.pj + ' pj, ' + (s.pts / s.pj).toFixed(1) + ' pts, ' + (s.reb / s.pj).toFixed(1) + ' reb, ' + (s.ast / s.pj).toFixed(1) + ' ast, ' + Math.round(s.min / s.pj) + ' min') : null, att), botones, { alta: true });
  }
  function confirmarLiberar(id) {
    const st = S(), p = st.jugadores[id], quedan = Math.max(0, p.contrato.hasta - parseInt(st.temporada)), coste = Math.min(p.contrato.salario * 2, Math.round(p.contrato.salario * 0.5 * quedan));
    modal(h('div', null, h('h3', null, '¿Liberar a ' + p.nombre + '?'), h('p', null, 'Indemnización estimada: ' + U.eur(coste) + '. Dejará el club y pasará a agentes libres.')),
      [{ t: 'Liberar', cls: 'peligro', fn: () => { const r = M().mercado.liberar(st, id); if (!r.ok) { toast(r.motivo); return false; } refrescar(); } }, { t: 'Cancelar', cls: 'btn-sec' }]);
  }
  function confirmarCompra(id) {
    const st = S(), p = st.jugadores[id], pr = M().mercado.precioMinimo(st, id);
    modal(h('div', null, h('h3', null, 'Comprar a ' + p.nombre), h('p', null, 'Su club pide ' + U.eur(pr) + '. Mantiene su contrato (' + U.eur(p.contrato.salario) + ' hasta ' + p.contrato.hasta + ').'), h('p', { class: 'muted' }, 'Tu caja: ' + U.eur(st.finanzas[st.clubId].caja))),
      [{ t: 'Pagar ' + U.eur(pr), fn: () => { const r = M().mercado.comprar(st, id); if (!r.ok) { toast(r.motivo); return false; } toast('Fichaje completado'); refrescar(); } }, { t: 'Cancelar', cls: 'btn-sec' }]);
  }
  function dialogoVenta(id) {
    const st = S(), p = st.jugadores[id], of = M().mercado.ofertasVenta(st, id);
    modal(h('div', null, h('h3', null, 'Ofertas por ' + p.nombre), of.length ? h('div', { class: 'lista' }, of.map(o => h('div', { class: 'item' }, escudo(o.equipoId), h('div', { class: 'ct' }, h('b', null, eq(o.equipoId).nombre), h('span', { class: 'muted' }, 'Ofrece ' + U.eur(o.precio))),
      h('button', { class: 'btn', onclick: () => { const r = M().mercado.vender(st, id, o.equipoId); if (r.ok) { cerrarModales(); toast('Traspaso cerrado'); refrescar(); } else toast(r.motivo); } }, 'Vender')))) : h('p', { class: 'muted' }, 'Ningún club está interesado ahora mismo.')), [{ t: 'Cerrar', cls: 'btn-sec' }]);
  }
  function dialogoContrato(id, tipo) {
    const st = S(), p = st.jugadores[id], Mm = M().mercado, club = st.clubId;
    const pedido = Mm.salarioPedido(st, id, club), ren = tipo === 'renovar';
    const min = Math.round(pedido * 0.7 / 10000) * 10000, max = Math.round(pedido * 1.8 / 10000) * 10000;
    let anos = 2; const sl = h('input', { type: 'range', min, max, step: 10000, value: Math.round(pedido / 10000) * 10000, class: 'rango' });
    const info = h('p', { class: 'muted' }), tp = Mm.topeSalarial(st, club);
    const yb = h('div', { class: 'seg' });
    const upd = () => { const ev = Mm.evaluarOferta(st, id, club, +sl.value, anos, ren); info.textContent = 'Pide unos ' + U.eur(ev.pedido) + '/año, probabilidad de aceptar: ' + Math.round(ev.prob * 100) + ' %'; sal.textContent = U.eur(+sl.value) + ' / año'; yb.innerHTML = ''; [1, 2, 3, 4].forEach(a => yb.append(h('button', { class: 'tab' + (a === anos ? ' on' : ''), onclick: () => { anos = a; upd(); } }, a + (a === 1 ? ' año' : ' años')))); };
    const sal = h('b', { class: 'gran' });
    sl.addEventListener('input', upd);
    modal(h('div', null, h('h3', null, (ren ? 'Renovar a ' : 'Contrato para ') + p.nombre), h('p', { class: 'muted' }, 'Masa salarial ' + U.eur(tp.masa) + ' de ' + U.eur(tp.tope) + ' (' + tp.tipo + ')'), sal, sl, yb, info),
      [{ t: ren ? 'Proponer renovación' : 'Ofrecer contrato', fn: () => { const r = ren ? Mm.renovar(st, id, { salario: +sl.value, anos }) : Mm.ofertar(st, id, { salario: +sl.value, anos }); if (!r.ok) { toast(r.motivo); return false; } toast(ren ? 'Renovación firmada' : 'Fichaje completado'); refrescar(); } }, { t: 'Cancelar', cls: 'btn-sec' }]);
    upd();
  }
  function tabPlantilla(el, st) {
    const club = st.clubId, pl = st.equipos[club].plantilla.map(i => st.jugadores[i]).sort((a, b) => b.ovr - a.ovr);
    el.append(seccion('Primer equipo, ' + pl.length + ' jugadores', h('div', { class: 'lista' }, pl.map(p => filaJugador(p, st, () => detalleJugador(p.id))))));
  }
  function tabTactica(el, st) {
    const club = st.clubId, P = M().partidos, pl = st.equipos[club].plantilla.map(i => st.jugadores[i]).sort((a, b) => b.ovr - a.ovr);
    let t = Object.assign({}, st.equipos[club].tactica || P.tacticaAuto(st, club));
    t.quinteto = (t.quinteto || []).filter(i => st.jugadores[i] && st.jugadores[i].equipoId === club);
    const cont = h('div'), draw = () => {
      cont.innerHTML = '';
      const sel = t.quinteto;
      cont.append(h('p', { class: sel.length === 5 ? 'muted' : 'aviso med' }, 'Quinteto titular: ' + sel.length + '/5. Toca para elegir.'));
      cont.append(h('div', { class: 'lista' }, pl.map(p => h('button', { class: 'jug' + (sel.indexOf(p.id) >= 0 ? ' sel' : '') + (p.estado.lesion ? ' lesion' : ''), onclick: () => { const i = sel.indexOf(p.id); if (i >= 0) sel.splice(i, 1); else if (sel.length < 5) sel.push(p.id); else toast('Ya hay 5 titulares'); draw(); } },
        h('span', { class: 'pos' }, p.pos), h('span', { class: 'ct' }, h('b', null, clip(p.nombre, 22)), h('span', { class: 'muted' }, p.edad + ' años' + (p.estado.lesion ? ', lesionado' : ''))), sel.indexOf(p.id) >= 0 ? chip('Titular', 'ok') : null, h('span', { class: 'ovr ' + clsOvr(p.ovr) }, p.ovr)))));
      const seg = (tit, key, ops) => h('div', { class: 'ajuste' }, h('b', null, tit), h('div', { class: 'seg' }, ops.map(o => h('button', { class: 'tab' + (t[key] === o[0] ? ' on' : ''), onclick: () => { t[key] = o[0]; draw(); } }, o[1]))));
      cont.append(seccion('Estilo', seg('Ritmo', 'ritmo', [[1, 'Muy lento'], [2, 'Lento'], [3, 'Normal'], [4, 'Rápido'], [5, 'Muy rápido']]), seg('Defensa', 'defensa', [['hombre', 'Individual'], ['zona', 'Zona'], ['mixta', 'Mixta']]), seg('Foco ofensivo', 'foco', [['interior', 'Interior'], ['equilibrado', 'Equilibrado'], ['exterior', 'Exterior']])));
      cont.append(h('div', { class: 'par' }, h('button', { class: 'btn', onclick: () => { if (t.quinteto.length !== 5) { toast('Elige 5 titulares'); return; } st.equipos[club].tactica = { quinteto: t.quinteto.slice(), ritmo: t.ritmo, defensa: t.defensa, foco: t.foco }; toast('Táctica guardada'); } }, 'Guardar táctica'),
        h('button', { class: 'btn btn-sec', onclick: () => { t = Object.assign({}, P.tacticaAuto(st, club)); draw(); } }, 'Automática')));
    };
    el.append(cont); draw();
  }
  function tabCantera(el, st) {
    const club = st.clubId, C = M().cantera, c = st.cantera[club];
    if (lectura()) { el.append(seccion('Juveniles (' + c.juveniles.length + ')', h('p', { class: 'muted' }, 'Tu entrenador decide quién sube al primer equipo.'), h('div', { class: 'lista' }, c.juveniles.map(i => st.jugadores[i]).sort((a, b) => b.pot - a.pot).map(p => h('div', { class: 'jug' }, h('span', { class: 'pos' }, p.pos), h('span', { class: 'ct' }, h('b', null, p.nombre), h('span', { class: 'muted' }, p.edad + ' años, potencial ' + p.pot)), h('span', { class: 'ovr ' + clsOvr(p.ovr) }, p.ovr)))))); return; }
    el.append(seccion('Entrenamiento', h('div', { class: 'seg' }, ['equilibrado', 'tiro', 'defensa', 'fisico', 'pase'].map(f => h('button', { class: 'tab' + (c.foco === f ? ' on' : ''), onclick: () => { C.fijarFoco(st, club, f); refrescar(); } }, f.charAt(0).toUpperCase() + f.slice(1)))),
      h('p', { class: 'muted' }, 'El foco decide qué atributos mejoran cada semana. Los lunes se aplica el entrenamiento.')));
    el.append(seccion('Juveniles (' + c.juveniles.length + '/10)', c.juveniles.length ? h('div', { class: 'lista' }, c.juveniles.map(i => st.jugadores[i]).sort((a, b) => b.pot - a.pot).map(p => h('div', { class: 'jug' }, h('span', { class: 'pos' }, p.pos), h('span', { class: 'ct' }, h('b', null, p.nombre), h('span', { class: 'muted' }, p.edad + ' años, potencial ' + p.pot)), h('span', { class: 'par' }, h('button', { class: 'btn peq', onclick: () => { const r = C.subirAlPrimerEquipo(st, p.id); if (!r.ok) toast(r.motivo); else refrescar(); } }, 'Subir'), h('button', { class: 'btn btn-sec peq', onclick: () => { C.soltarJuvenil(st, club, p.id); refrescar(); } }, 'Soltar')), h('span', { class: 'ovr ' + clsOvr(p.ovr) }, p.ovr)))) : h('p', { class: 'muted' }, 'Sin juveniles.')));
    const cont = h('div', { class: 'lista' }, c.prospectos.map(i => st.jugadores[i]).map(p => h('div', { class: 'jug' }, h('span', { class: 'pos' }, p.pos), h('span', { class: 'ct' }, h('b', null, p.nombre), h('span', { class: 'muted' }, p.edad + ' años, ' + p.nac + ', potencial ' + p.pot)), h('button', { class: 'btn peq', onclick: () => { const r = C.ficharJuvenil(st, club, p.id); if (!r.ok) toast(r.motivo); else refrescar(); } }, 'Fichar'), h('span', { class: 'ovr ' + clsOvr(p.ovr) }, p.ovr))));
    el.append(seccion('Ojeadores', h('div', { class: 'seg' }, Object.keys(C.ZONAS).map(z => h('button', { class: 'tab', onclick: () => { const r = C.ojear(st, club, z); if (!r.ok) toast(r.motivo); else { toast('Ojeo hecho por ' + U.eur(r.coste)); refrescar(); } } }, z === 'eeuu' ? 'EE. UU.' : z.charAt(0).toUpperCase() + z.slice(1)))), c.prospectos.length ? cont : h('p', { class: 'muted' }, 'Elige una zona para ver prospectos (cuesta dinero).')));
  }
  function plantilla(el, st) {
    if (lectura() && !tacticaOn() && ui.tab.plantilla === 'tactica') ui.tab.plantilla = 'plantilla';
    if ((carrera() || entr()) && ui.tab.plantilla === 'cantera') ui.tab.plantilla = 'plantilla';
    el.append(pestanas(carrera() ? [['plantilla', 'Plantilla']] : entr() ? [['plantilla', 'Plantilla'], ['tactica', 'Táctica']] : pres() ? [['plantilla', 'Plantilla'], ['cantera', 'Cantera']] : [['plantilla', 'Plantilla'], ['tactica', 'Táctica'], ['cantera', 'Cantera']], ui.tab.plantilla, t => { ui.tab.plantilla = t; refrescar(true); }));
    ({ plantilla: tabPlantilla, tactica: tabTactica, cantera: tabCantera })[ui.tab.plantilla](el, st);
  }

  // ---------- Pantalla: Mercado ----------
  function filaFicha(p, st, extra) {
    return h('button', { class: 'jug', onclick: () => detalleJugador(p.id) }, h('span', { class: 'pos' }, p.pos), h('span', { class: 'ct' }, h('b', null, clip(p.nombre, 22)), h('span', { class: 'muted' }, p.edad + ' años, pot. ' + p.pot + (p.equipoId ? ', ' + eq(p.equipoId).siglas : '') + (extra ? ', ' + extra : ''))), h('span', { class: 'ovr ' + clsOvr(p.ovr) }, p.ovr));
  }
  function mercado(el, st) {
    const Mm = M().mercado, club = st.clubId, tp = Mm.topeSalarial(st, club);
    el.append(pestanas([['libres', 'Libres'], ['clubes', 'Otros clubes'], ['contratos', 'Contratos']], ui.tab.mercado, t => { ui.tab.mercado = t; refrescar(true); }));
    el.append(h('div', { class: 'resumen' }, h('span', null, 'Masa salarial'), h('b', null, U.eur(tp.masa) + ' / ' + U.eur(tp.tope)), barra(tp.masa, tp.tope, tp.margen < 0 ? 'rojo' : 'verde'), h('span', { class: 'muted' }, tp.tipo + ', plantilla ' + st.equipos[club].plantilla.length + '/15')));
    if (ui.tab.mercado === 'libres') {
      const ls = Mm.libres(st).slice(0, 40);
      el.append(seccion('Agentes libres', h('div', { class: 'lista' }, ls.map(p => filaFicha(p, st, 'pide ' + U.eur(Mm.salarioPedido(st, p.id, club)))))));
    } else if (ui.tab.mercado === 'clubes') {
      const f = ui.fil, D = st;
      const lig = h('select', { class: 'sel', onchange: e => { f.liga = e.target.value; f.equipo = ''; refrescar(); } }, h('option', { value: '' }, 'Todas las ligas'), Object.keys(st.ligas).map(l => h('option', { value: l, selected: f.liga === l }, st.ligas[l].nombre)));
      const ids = f.liga ? st.ligas[f.liga].equipos : Object.keys(st.equipos);
      const eqs = h('select', { class: 'sel', onchange: e => { f.equipo = e.target.value; refrescar(); } }, h('option', { value: '' }, 'Todos los clubes'), ids.filter(i => i !== club).sort((a, b) => st.equipos[a].nombre.localeCompare(st.equipos[b].nombre)).map(i => h('option', { value: i, selected: f.equipo === i }, st.equipos[i].nombre)));
      const pos = h('select', { class: 'sel', onchange: e => { f.pos = e.target.value; refrescar(); } }, h('option', { value: '' }, 'Cualquier posición'), ['PG', 'SG', 'SF', 'PF', 'C'].map(x => h('option', { value: x, selected: f.pos === x }, POSN[x])));
      const txt = h('input', { class: 'sel', placeholder: 'Buscar por nombre', value: f.texto }); txt.addEventListener('change', () => { f.texto = txt.value; refrescar(); });
      const res = Mm.buscar(st, { liga: f.liga, equipo: f.equipo, pos: f.pos, texto: f.texto }).slice(0, 40);
      el.append(h('div', { class: 'filtros' }, lig, eqs, pos, txt), seccion('Jugadores de otros clubes', h('div', { class: 'lista' }, res.map(p => filaFicha(p, st, Mm.precioMinimo(st, p.id) ? 'pide ' + U.eur(Mm.precioMinimo(st, p.id)) : '')))));
    } else {
      const pl = st.equipos[club].plantilla.map(i => st.jugadores[i]).sort((a, b) => a.contrato.hasta - b.contrato.hasta || b.ovr - a.ovr);
      el.append(seccion('Contratos de tu plantilla', h('div', { class: 'lista' }, pl.map(p => filaJugador(p, st, () => detalleJugador(p.id))))));
      const dr = st.mercado.ultimoDraft;
      if (dr) el.append(seccion('Último draft NBA (' + dr.temporada + ')', h('div', { class: 'lista' }, dr.picks.filter(k => k.n <= 10 || k.equipoId === club).map(k => h('div', { class: 'item' }, h('span', { class: 'muted f' }, '#' + k.n), escudo(k.equipoId), h('span', { class: 'ct' }, h('b', null, st.jugadores[k.jugadorId] ? st.jugadores[k.jugadorId].nombre : '-'))))))); 
    }
  }

  // ---------- Pantalla: Calendario ----------
  function copasPantalla(el, st) {
    const CP = M().copas, club = st.clubId, mias = GM.ligasDe(st, club);
    const ids = Object.keys(st.copas || {}).sort((a, b) => (mias.indexOf(st.copas[a].liga) < 0) - (mias.indexOf(st.copas[b].liga) < 0));
    ids.forEach(id => {
      const c = CP.copa(st, id), mio = mias.indexOf(c.liga) >= 0;
      const rondas = c.rondas.slice().reverse().map(r => h('div', null, h('h4', null, r.nombre),
        h('div', { class: 'lista' }, r.partidos.map(g => h('div', { class: 'item serie' + (g.local === club || g.visitante === club ? ' mio' : '') }, escudo(g.local), h('b', null, g.resultado ? g.resultado.local : '-'), h('span', { class: 'muted' }, ' '), h('b', null, g.resultado ? g.resultado.visitante : '-'), escudo(g.visitante))))));
      el.append(seccion(c.nombre, h('div', { class: 'tarjeta' },
        c.campeon ? h('div', { class: 'aviso ok' }, '🏆 Campeón: ' + eq(c.campeon).nombre) : h('p', { class: 'muted' }, c.estado === 'pendiente' ? 'Se disputa el ' + U.fechaLarga(c.fecha) + ' entre los 8 primeros de ' + (CORTO[c.liga] || c.liga) + '.' : 'Eliminatoria en curso.'), rondas)));
    });
    const CN = M().continental, mios_ = CN ? CN.de(st, club) : [];
    Object.keys(st.continental || {}).sort((a, b) => (mios_.indexOf(a) < 0) - (mios_.indexOf(b) < 0)).forEach(id => {
      const c = st.continental[id], mio = mios_.indexOf(id) >= 0, G = c.grupos || [];
      const gi = G.findIndex(g => g.equipos.indexOf(club) >= 0), tabla = gi >= 0 ? CN.tablaGrupo(st, id, gi) : null;
      const estTxt = { pendiente: 'Empieza a finales de septiembre.', previa: 'Fase previa en juego.', grupos: 'Fase de grupos en juego.', ko: 'Eliminatorias en juego.', fin: 'Terminada.' }[c.estado];
      const serie = s => h('div', { class: 'item serie' + (s.a === club || s.b === club ? ' mio' : '') }, escudo(s.a), h('b', null, s.g.map(i => { const g = st.calendario.find(x => x.id === i); return g && g.resultado ? (g.local === s.a ? g.resultado.local : g.resultado.visitante) : '-'; }).join('/')), h('span', { class: 'muted' }, ' '), h('b', null, s.g.map(i => { const g = st.calendario.find(x => x.id === i); return g && g.resultado ? (g.local === s.a ? g.resultado.visitante : g.resultado.local) : '-'; }).join('/')), escudo(s.b), s.ganador ? chip(eq(s.ganador).siglas + ' pasa', 'ok') : null);
      el.append(seccion(c.nombre, h('div', { class: 'tarjeta' }, c.campeon ? h('div', { class: 'aviso ok' }, '🏆 Campeón: ' + eq(c.campeon).nombre) : h('p', { class: 'muted' }, estTxt + (mio ? ' Tu club participa.' : '')),
        tabla ? [h('h4', null, 'Tu grupo'), tablaClasif(st, tabla, tabla, club)] : null,
        (c.ko || []).slice().reverse().map(r => h('div', null, h('h4', null, r.nombre), h('div', { class: 'lista' }, r.series.map(serie)))),
        c.previa && c.previa.length && !G.length ? [h('h4', null, 'Fase previa'), h('div', { class: 'lista' }, c.previa.map(serie))] : null)));
    });
    const rv = M().rivalidades.rivalesDe(st, club).slice(0, 8);
    el.append(seccion('Tus rivalidades', rv.length ? h('div', { class: 'lista' }, rv.map(r => h('div', { class: 'item' }, escudo(r.equipoId), h('div', { class: 'ct' }, h('b', null, eq(r.equipoId).nombre), h('span', { class: 'muted' }, r.nombre)), h('b', null, r.hist[club] + '-' + r.hist[r.equipoId]), r.i === 2 ? chip('Clásico', 'ok') : null))) : h('p', { class: 'muted' }, 'Tu club no tiene rivalidades marcadas todavía.')));
  }
  function calendario(el, st) {
    const club = st.clubId, C = M().competiciones, CN = M().continental, conts = Object.keys(st.continental || {}), ligas = Object.keys(st.ligas).concat(conts);
    const esCont = id => conts.indexOf(id) >= 0, nombreComp = id => esCont(id) ? st.continental[id].nombre : st.ligas[id].nombre;
    if (!ui.comp || ligas.indexOf(ui.comp) < 0) ui.comp = GM.ligasDe(st, club)[0] || ligas[0];
    if (carrera() && st.carrera.fase === 'ncaa' && ui.tab.calendario === 'partidos') ui.tab.calendario = 'tabla';
    el.append(pestanas([['partidos', 'Partidos'], ['tabla', 'Clasificación'], ['playoffs', 'Playoffs'], ['copas', 'Copas y derbis'], ['lideres', 'Líderes']], ui.tab.calendario, t => { ui.tab.calendario = t; refrescar(true); }));
    if (ui.tab.calendario === 'copas') { copasPantalla(el, st); return; }
    if (ui.tab.calendario !== 'partidos') el.append(h('div', { class: 'seg compacto' }, ligas.map(l => h('button', { class: 'tab' + (ui.comp === l ? ' on' : ''), onclick: () => { ui.comp = l; refrescar(); } }, CORTO[l] || l))));
    const t = ui.tab.calendario;
    if (t === 'partidos') {
      const todos = C.calendarioClub(st, club), jug = todos.filter(g => g.resultado), prox = todos.filter(g => !g.resultado);
      el.append(seccion('Resultados', h('div', { class: 'lista' }, jug.slice(-8).reverse().map(filaResultado))));
      el.append(seccion('Próximos partidos', h('div', { class: 'lista' }, prox.slice(0, 10).map(g => { const rival = g.local === club ? g.visitante : g.local; return h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(g.fecha)), escudo(rival), h('div', { class: 'ct' }, h('b', null, (g.local === club ? 'vs ' : '@ ') + clip(eq(rival).nombre, 20)), h('span', { class: 'muted' }, (CORTO[g.comp] || g.comp) + etqFase(g, st)))); }))));
    } else if (t === 'tabla') {
      if (ui.comp === 'NBA') ['E', 'O'].forEach(c => { const tb = C.clasificacion(st, 'NBA', c); el.append(seccion('Conferencia ' + (c === 'E' ? 'Este' : 'Oeste'), tablaClasif(st, tb, tb, club))); });
      else if (esCont(ui.comp)) {
        const c = st.continental[ui.comp], G = c.grupos || [];
        if (!G.length) el.append(seccion(c.nombre, h('p', { class: 'muted' }, c.estado === 'previa' ? 'Se juega la fase previa; los grupos empiezan después.' : 'Los grupos todavía no se han sorteado.')));
        G.forEach((g, gi) => { const tb = CN.tablaGrupo(st, ui.comp, gi); el.append(seccion(c.nombre + ', grupo ' + 'ABCDEFGH'[gi], tablaClasif(st, tb, tb, club))); });
      }
      else { const tb = C.clasificacion(st, ui.comp); el.append(seccion(st.ligas[ui.comp].nombre, tablaClasif(st, tb, tb, club))); }
    } else if (t === 'playoffs') {
      if (esCont(ui.comp)) {
        const c = st.continental[ui.comp], serie = s => h('div', { class: 'item serie' + (s.a === club || s.b === club ? ' mio' : '') }, escudo(s.a), h('b', null, s.g.map(i => { const g = st.calendario.find(x => x.id === i); return g && g.resultado ? (g.local === s.a ? g.resultado.local : g.resultado.visitante) + '-' + (g.local === s.a ? g.resultado.visitante : g.resultado.local) : '-'; }).join(', ')), escudo(s.b), s.ganador ? chip(eq(s.ganador).siglas, 'ok') : null);
        if (!(c.ko || []).length) el.append(seccion(c.nombre, h('p', { class: 'muted' }, 'Las eliminatorias empiezan al acabar la fase de grupos.')));
        (c.ko || []).slice().reverse().forEach(r => el.append(seccion(c.nombre + ', ' + r.nombre.toLowerCase(), h('div', { class: 'lista' }, r.series.map(serie)))));
        if (c.campeon) el.append(aviso('🏆 Campeón: ' + eq(c.campeon).nombre, 'ok'));
        return;
      }
      const po = C.playoffs(st, ui.comp);
      if (!po) { el.append(seccion('Playoffs', h('p', { class: 'muted' }, 'Empezarán cuando termine la fase regular.'))); return; }
      if (po.playin && po.fase === 'playin') el.append(seccion('Play-in', po.playin.map(gr => h('div', { class: 'tarjeta' }, h('b', null, gr.conf ? (gr.conf === 'E' ? 'Este' : 'Oeste') : 'Euroliga'), h('p', { class: 'muted' }, 'Del 7º al 10º: ' + gr.seeds.slice(6).map(i => eq(i).siglas).join(', '))))));
      po.rondas.slice().reverse().forEach(r => el.append(seccion(r.nombre + ' (al mejor de ' + r.mejorDe + ')', h('div', { class: 'lista' }, r.series.map(s => h('div', { class: 'item serie' }, escudo(s.a), h('b', null, s.wa), h('span', { class: 'muted' }, '-'), h('b', null, s.wb), escudo(s.b), s.ganador ? chip(eq(s.ganador).siglas + ' pasa', 'ok') : null))))));
      if (po.campeon) el.append(aviso('🏆 Campeón: ' + eq(po.campeon).nombre, 'ok'));
    } else {
      const CATS = [['pts', 'Máximos anotadores', 'puntos'], ['reb', 'Rebotes', 'rebotes'], ['ast', 'Asistencias', 'asistencias'], ['rob', 'Robos', 'robos'], ['tap', 'Tapones', 'tapones']];
      let alguno = false;
      CATS.forEach(([cat, tit, und]) => {
        const l = C.lideres(st, ui.comp, cat, cat === 'pts' ? 10 : 5); if (!l.length) return; alguno = true;
        el.append(seccion(tit + ', ' + nombreComp(ui.comp), h('div', { class: 'lista' }, l.map((x, k) => { const p = st.jugadores[x.id]; return h('button', { class: 'jug' + (p.equipoId === club ? ' mio' : ''), onclick: () => detalleJugador(x.id) }, h('span', { class: 'pos' }, k + 1), escudo(p.equipoId), h('span', { class: 'ct' }, h('b', null, p.nombre), h('span', { class: 'muted' }, x.pj + ' partidos, ' + x.total + ' ' + und + ' en total')), h('b', null, x.media.toFixed(1))); }))));
      });
      if (!alguno) el.append(seccion('Líderes', h('p', { class: 'muted' }, 'Aún no se ha jugado ningún partido de ' + nombreComp(ui.comp) + '.')));
    }
  }

  // ---------- Pantalla: Club (3D) ----------
  function club(el, st) {
    desmontar();
    el.append(pestanas([['cd', 'Ciudad deportiva'], ['est', 'Estadio']], ui.tab.club, t => { ui.tab.club = t; refrescar(true); }));
    const cont = h('div', { class: 'club3d' }); el.append(cont);
    const m = ui.tab.club === 'cd' ? M().ciudadDeportiva : M().estadio;
    if (m && m.mount) m.mount(cont, st); else cont.append(aviso('Módulo no disponible.', 'mal'));
  }

  // ---------- Pantalla: Finanzas ----------
  function finanzasResumen(el, st) {
    const F = M().finanzas, club = st.clubId, r = F.resumen(st, club);
    el.append(seccion('Caja', h('div', { class: 'tarjeta' }, h('div', { class: 'gran ' + (r.caja < 0 ? 'neg' : '') }, U.eur(r.caja)),
      h('div', { class: 'fila' }, h('span', { class: 'muted' }, 'Ingresos de la temporada'), h('b', { class: 'pos-v' }, U.eur(r.ingresosTemp))), h('div', { class: 'fila' }, h('span', { class: 'muted' }, 'Gastos de la temporada'), h('b', { class: 'neg' }, U.eur(r.gastosTemp))),
      h('div', { class: 'fila' }, h('span', { class: 'muted' }, 'Masa salarial'), h('b', null, U.eur(r.masaSalarial) + (r.tope ? ' / ' + U.eur(r.tope.tope) : ''))))));
    r.avisos.forEach(a => el.append(aviso(a, 'med')));
    el.append(seccion('Patrocinadores', h('div', { class: 'lista' }, r.patrocinios.map(p => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, p.nombre), h('b', null, U.eur(p.importeAnual) + '/año')), h('span', { class: 'muted' }, p.tipo + ', hasta ' + p.hasta)))),
      r.ofertas.length ? h('h4', null, 'Ofertas nuevas') : null, h('div', { class: 'lista' }, r.ofertas.map(o => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, o.nombre + ', ' + o.tipo), h('button', { class: 'btn peq', onclick: () => { const x = F.firmarPatrocinio(st, club, o.id); if (!x.ok) toast(x.motivo); else { toast('Patrocinio firmado'); refrescar(); } } }, 'Firmar')), h('span', { class: 'muted' }, U.eur(o.importeAnual) + ' al año durante ' + o.anos + (o.anos === 1 ? ' temporada' : ' temporadas')))))));
    el.append(seccion('Últimos movimientos', h('div', { class: 'lista' }, r.movimientos.slice(0, 14).map(m => h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(m.fecha)), h('span', { class: 'ct' }, m.concepto), h('b', { class: m.importe < 0 ? 'neg' : 'pos-v' }, U.eur(m.importe)))))));
    if (r.historial.length) el.append(seccion('Temporadas anteriores', h('div', { class: 'lista' }, r.historial.map(x => h('div', { class: 'item' }, h('b', null, x.temporada), h('span', { class: 'ct muted' }, 'Ingresos ' + U.eur(x.ingresos) + ', gastos ' + U.eur(x.gastos)), h('b', null, U.eur(x.caja)))))));
  }

  function finanzas(el, st) {
    el.append(pestanas([['resumen', 'Resumen'], ['contratos', 'Contratos']], ui.tab.finanzas, t => { ui.tab.finanzas = t; refrescar(true); }));
    if (ui.tab.finanzas === 'contratos') contratosPantalla(el, st); else finanzasResumen(el, st);
  }
  function contratosPantalla(el, st) {
    const K = M().contratos, perf = K.PERF;
    el.append(h('p', { class: 'muted' }, 'Cada categoría ofrece tres alternativas que se excluyen: al firmar una, las otras desaparecen hasta que el contrato termine. Tus decisiones se recuerdan.'));
    K.categorias(st).forEach(c => {
      const act = c.activo, cuerpo = [h('div', { class: 'fila' }, h('b', null, c.nombre), act ? chip('Activo', 'ok') : chip('Libre'))];
      if (act) {
        cuerpo.push(h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, act.nombre), h('b', null, act.importeAnual ? U.eur(act.importeAnual) + '/año' : 'Sin ingresos')),
          h('span', { class: 'muted' }, (act.perfil ? perf[act.perfil].etq + ', ' : '') + 'hasta ' + act.hasta + (act.rescision ? ', rescisión ' + Math.round(act.rescision * 100) + ' % del resto' : '')),
          h('button', { class: 'btn btn-sec peq', onclick: () => { const q = Math.round((act.rescision || 0.5) * act.importeAnual * Math.max(0.5, act.hasta - parseInt(st.temporada)) / 1000) * 1000; modal(h('div', null, h('h3', null, '¿Rescindir con ' + act.nombre + '?'), h('p', null, 'Penalización estimada: ' + U.eur(q) + '. La afición y el ayuntamiento lo notarán.')), [{ t: 'Rescindir', cls: 'peligro', fn: () => { const r = K.rescindir(st, c.tipo); if (!r.ok) { toast(r.motivo); return false; } refrescar(); } }, { t: 'Cancelar', cls: 'btn-sec' }]); } }, 'Rescindir')));
      }
      if (c.bloqueo) cuerpo.push(h('p', { class: 'muted' }, c.bloqueo));
      c.ofertas.forEach(o => cuerpo.push(h('button', { class: 'item col', style: { textAlign: 'left' }, onclick: () => modal(h('div', null, h('h3', null, o.nombre), h('p', { class: 'muted' }, o.etq + ', ' + c.nombre), h('p', null, o.desc),
        h('div', { class: 'chips' }, chip(o.importeAnual ? U.eur(o.importeAnual) + '/año' : 'Sin ingresos'), chip(o.anos + (o.anos === 1 ? ' temporada' : ' temporadas')), chip('Rescisión ' + Math.round(o.rescision * 100) + ' %')), o.req ? h('p', { class: 'aviso med' }, o.req) : null),
        [{ t: 'Firmar', fn: () => { const r = K.firmar(st, c.tipo, o.id); if (!r.ok) { toast(r.motivo); return false; } toast('Contrato firmado'); refrescar(); } }, { t: 'Cancelar', cls: 'btn-sec' }]) },
        h('div', { class: 'fila' }, h('b', null, o.nombre), h('b', null, o.importeAnual ? U.eur(o.importeAnual) : '—')), h('span', { class: 'muted' }, o.etq + ', ' + o.anos + (o.anos === 1 ? ' temporada' : ' temporadas') + (o.req ? ', ' + o.req : '')))));
      el.append(seccion(null, h('div', { class: 'tarjeta' }, cuerpo)));
    });
  }
  Object.assign(GM.ui._, { filaJugador, detalleJugador, confirmarLiberar, confirmarCompra, dialogoVenta, dialogoContrato, tabPlantilla, tabTactica, tabCantera, plantilla, filaFicha, mercado, copasPantalla, calendario, club, finanzasResumen, finanzas, contratosPantalla });
  registerScreen('plantilla', { titulo: 'Plantilla', icono: 'users', render: plantilla });
  registerScreen('mercado', { titulo: 'Mercado', icono: 'swap', render: mercado });
  registerScreen('calendario', { titulo: 'Calendario', icono: 'cal', render: calendario });
  registerScreen('club', { titulo: 'Club', icono: 'club', render: club });
  registerScreen('finanzas', { titulo: 'Finanzas', icono: 'eur', render: finanzas });
})();
