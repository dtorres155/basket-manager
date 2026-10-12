const fs = require('fs');
// ---- negociacion: opciones del club calculadas al momento
let n = fs.readFileSync('negociacion.js', 'utf8');
const rn = (a, b) => { if (!n.includes(a)) throw new Error('falta: ' + a.slice(0, 80)); n = n.replace(a, () => b); };
rn("  function opcionesClub(st) { return estado(st).opcionesClub.filter(x => st.jugadores[x.jugId]); }",
  "  function opcionesClub(st) { const y = yearOf(st) + 1; return st.equipos[st.clubId].plantilla.map(i => st.jugadores[i]).filter(p => p && p.contrato && p.contrato.opcion === 'club' && p.contrato.hasta <= y && !p.contrato.opcionUsada).map(p => ({ jugId: p.id, salario: p.contrato.salario })); }");
rn("      } else if (st.modo === 'gestor' || st.modo === 'presidente') E.opcionesClub.push({ jugId: p.id, salario: p.contrato.salario });\n      else { p.contrato.hasta += 1; p.contrato.opcionUsada = true; }",
  "      } else { p.contrato.opcionUsada = true; if (p.ovr >= 60) { p.contrato.hasta += 1; GM.noticia(st, 'El club ejerce la opción de ' + p.nombre + ': un año más.'); } }");
rn("    const E = estado(st), i = E.opcionesClub.findIndex(x => x.jugId === jugId), p = st.jugadores[jugId]; if (i < 0 || !p) return { ok: false, motivo: 'No hay opción pendiente.' };",
  "    const E = estado(st), p = st.jugadores[jugId]; if (!p || !opcionesClub(st).some(x => x.jugId === jugId)) return { ok: false, motivo: 'No hay opción pendiente.' };");
rn("else GM.noticia(st, 'No ejerces la opción de ' + p.nombre + '.'); E.opcionesClub.splice(i, 1); return { ok: true };", "else GM.noticia(st, 'No ejerces la opción de ' + p.nombre + '.'); return { ok: true };");
rn("    const E = estado(st), club = st.clubId, y = yearOf(st) + 1; E.opcionesClub = [];", "    const club = st.clubId, y = yearOf(st) + 1;");
fs.writeFileSync('negociacion.js', n);
// ---- ui.js: pestañas extra por pantalla
let u = fs.readFileSync('ui.js', 'utf8');
const ru = (a, b) => { if (!u.includes(a)) throw new Error('falta: ' + a.slice(0, 80)); u = u.replace(a, () => b); };
ru("  function registerScreen(id, def) { screens[id] = def; GM.ui.screens[id] = def; }",
  `  function registerScreen(id, def) { screens[id] = def; GM.ui.screens[id] = def; }
  // Pestañas que añaden otros módulos a una pantalla (ui_extra.js): addTab(pantalla, id, título, render(el, st), visible(st)), tabsExtra(pantalla, st) y tabExtra(pantalla, id)
  const extras = {};
  function addTab(pantalla, id, titulo, render, visible) { (extras[pantalla] = extras[pantalla] || []).push({ id, titulo, render, visible }); }
  function tabsExtra(pantalla, st) { return (extras[pantalla] || []).filter(e => !e.visible || e.visible(st)).map(e => [e.id, e.titulo]); }
  function tabExtra(pantalla, id) { return (extras[pantalla] || []).find(e => e.id === id) || null; }
  GM.ui.addTab = addTab; GM.ui.tabsExtra = tabsExtra; GM.ui.tabExtra = tabExtra;`);
ru("GM.ui._ = { accesModal,", "GM.ui._ = { addTab, tabsExtra, tabExtra, accesModal,");
// contratos con opción del club: decidir antes de empezar la temporada
ru("    const go = () => { M_.competiciones.nuevaTemporada(st);", `    { const op = M_.negociacion && !carrera() && !entr() ? M_.negociacion.opcionesClub(st) : [];
      if (op.length) { const p = st.jugadores[op[0].jugId]; modal(h('div', null, h('h3', null, 'Opción del club: ' + p.nombre), h('p', null, 'Su contrato acaba y tienes una opción para un año más a ' + U.eur(p.contrato.salario) + '. ' + (op.length > 1 ? 'Quedan ' + (op.length - 1) + ' decisiones más.' : ''))),
        [{ t: 'Ejercer la opción', fn: () => { M_.negociacion.decidirOpcionClub(st, p.id, true); setTimeout(nuevaTemporada, 0); } }, { t: 'No ejercerla', cls: 'btn-sec', fn: () => { M_.negociacion.decidirOpcionClub(st, p.id, false); setTimeout(nuevaTemporada, 0); } }]); return; } }
    const go = () => { M_.competiciones.nuevaTemporada(st);`);
fs.writeFileSync('ui.js', u);
// ---- ui_gestion.js: pestañas extra y negociación
let g = fs.readFileSync('ui_gestion.js', 'utf8');
const rg = (a, b) => { if (!g.includes(a)) throw new Error('falta: ' + a.slice(0, 80)); g = g.replace(a, () => b); };
rg("  function dialogoContrato(id, tipo) {\n    const st = S(), p = st.jugadores[id], Mm = M().mercado, club = st.clubId;", "  function dialogoContrato(id, tipo) {\n    if (M().negociacion && GM.ui._.dialogoNegociacion) return GM.ui._.dialogoNegociacion(id, tipo);   // negociación con agente, cláusulas, opciones y bonus (ui_extra.js)\n    const st = S(), p = st.jugadores[id], Mm = M().mercado, club = st.clubId;");
rg("    el.append(pestanas(carrera() ? [['plantilla', 'Plantilla']] : entr() ? [['plantilla', 'Plantilla'], ['tactica', 'Táctica']] : pres() ? [['plantilla', 'Plantilla'], ['cantera', 'Cantera']] : [['plantilla', 'Plantilla'], ['tactica', 'Táctica'], ['cantera', 'Cantera']], ui.tab.plantilla,", "    el.append(pestanas((carrera() ? [['plantilla', 'Plantilla']] : entr() ? [['plantilla', 'Plantilla'], ['tactica', 'Táctica']] : pres() ? [['plantilla', 'Plantilla'], ['cantera', 'Cantera']] : [['plantilla', 'Plantilla'], ['tactica', 'Táctica'], ['cantera', 'Cantera']]).concat(GM.ui.tabsExtra('plantilla', st)), ui.tab.plantilla,");
rg("    ({ plantilla: tabPlantilla, tactica: tabTactica, cantera: tabCantera })[ui.tab.plantilla](el, st);", "    const ex = GM.ui.tabExtra('plantilla', ui.tab.plantilla); if (ex) { ex.render(el, st); return; }\n    ({ plantilla: tabPlantilla, tactica: tabTactica, cantera: tabCantera })[ui.tab.plantilla](el, st);");
rg("    el.append(pestanas([['libres', 'Libres'], ['clubes', 'Otros clubes'], ['contratos', 'Contratos']], ui.tab.mercado, t => { ui.tab.mercado = t; refrescar(true); }));", "    el.append(pestanas([['libres', 'Libres'], ['clubes', 'Otros clubes'], ['contratos', 'Contratos']].concat(GM.ui.tabsExtra('mercado', st)), ui.tab.mercado, t => { ui.tab.mercado = t; refrescar(true); }));\n    { const ex = GM.ui.tabExtra('mercado', ui.tab.mercado); if (ex) { ex.render(el, st); return; } }");
rg("    el.append(pestanas([['partidos', 'Partidos'], ['tabla', 'Clasificación'], ['playoffs', 'Playoffs'], ['copas', 'Copas y derbis'], ['lideres', 'Líderes']], ui.tab.calendario, t => { ui.tab.calendario = t; refrescar(true); }));", "    el.append(pestanas([['partidos', 'Partidos'], ['tabla', 'Clasificación'], ['playoffs', 'Playoffs'], ['copas', 'Copas y derbis'], ['lideres', 'Líderes']].concat(GM.ui.tabsExtra('calendario', st)), ui.tab.calendario, t => { ui.tab.calendario = t; refrescar(true); }));\n    { const ex = GM.ui.tabExtra('calendario', ui.tab.calendario); if (ex) { ex.render(el, st); return; } }");
rg("    el.append(pestanas([['cd', 'Ciudad deportiva'], ['est', 'Estadio']], ui.tab.club, t => { ui.tab.club = t; refrescar(true); }));", "    el.append(pestanas([['cd', 'Ciudad deportiva'], ['est', 'Estadio']].concat(GM.ui.tabsExtra('club', st)), ui.tab.club, t => { ui.tab.club = t; refrescar(true); }));\n    { const ex = GM.ui.tabExtra('club', ui.tab.club); if (ex) { ex.render(el, st); return; } }");
// tabTactica: nuevos campos y guardado completo
rg("seg('Foco ofensivo', 'foco', [['interior', 'Interior'], ['equilibrado', 'Equilibrado'], ['exterior', 'Exterior']])));", "seg('Foco ofensivo', 'foco', [['interior', 'Interior'], ['equilibrado', 'Equilibrado'], ['exterior', 'Exterior']])));\n      cont.append(seccion('Sistema de juego', seg('Esquema de ataque', 'ataque', [['equilibrado', 'Equilibrado'], ['pick', 'Pick and roll'], ['aislamiento', 'Aislamientos'], ['movimiento', 'Mover el balón'], ['poste', 'Poste']]), seg('Presión defensiva', 'presion', [['ninguna', 'Ninguna'], ['media', 'Media'], ['alta', 'Alta']]), seg('Rebote', 'rebote', [['equilibrado', 'Equilibrado'], ['ofensivo', 'Ofensivo'], ['retorno', 'Volver a defender']]), seg('Rotación', 'rotacion', [['corta', 'Corta'], ['normal', 'Normal'], ['larga', 'Larga']]), h('p', { class: 'muted' }, 'Cada ajuste tiene un coste: la presión cansa, la rotación corta fatiga a tus mejores y los esquemas rinden más con un buen ayudante (pestaña Cuerpo técnico).')));");
rg("st.equipos[club].tactica = { quinteto: t.quinteto.slice(), ritmo: t.ritmo, defensa: t.defensa, foco: t.foco };", "st.equipos[club].tactica = { quinteto: t.quinteto.slice(), ritmo: t.ritmo, defensa: t.defensa, foco: t.foco, ataque: t.ataque || 'equilibrado', presion: t.presion || 'ninguna', rebote: t.rebote || 'equilibrado', rotacion: t.rotacion || 'normal' };");
fs.writeFileSync('ui_gestion.js', g);
// ---- ui_ciudad.js: pestañas extra
let c = fs.readFileSync('ui_ciudad.js', 'utf8');
const rc = (a, b) => { if (!c.includes(a)) throw new Error('falta: ' + a.slice(0, 80)); c = c.replace(a, () => b); };
rc("    if (!tabs.some(t => t[0] === ui.tab.ciudad)) ui.tab.ciudad = tabs[0][0];", "    tabs.push(...GM.ui.tabsExtra('ciudad', st));\n    if (!tabs.some(t => t[0] === ui.tab.ciudad)) ui.tab.ciudad = tabs[0][0];");
rc("    else if (t === 'social') socialTab(el, st);", "    else if (GM.ui.tabExtra('ciudad', t)) GM.ui.tabExtra('ciudad', t).render(el, st);\n    else if (t === 'social') socialTab(el, st);");
fs.writeFileSync('ui_ciudad.js', c);
console.log('ok');
