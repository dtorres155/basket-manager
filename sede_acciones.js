/* ACCIONES DE LA SEDE (GM.mods.sedeAcciones) — lo que puedes hacer en cada sala sin ir a los menús
   Vestuario: charla motivadora o de exigencia. Gimnasio: sesión de recuperación o de fuerza. Pista: pizarra táctica.
   Enfermería: tratamiento intensivo. Sala de prensa: rueda de prensa con respuestas. Cafetería: invitar a la plantilla.
   Despacho: ordenador con agentes libres, renovaciones y cuentas. Recepción: próximo partido.
   Expone: acciones(st, sala), hacer(st, id), ruedaPrensa(st), responder(st, i), pizarra(st), fijarTactica(st, campo, valor),
   lesionados(st), tratar(st, jugId), ordenador(st), ofrecer(st, jugId), renovar(st, jugId), selfTest.
   Escribe: state.sede.usos (fecha de la última vez de cada acción) y los efectos sobre jugadores, caja y afición. */
(function () {
  const U = GM.util, M = () => GM.mods;
  const eq = st => st.equipos[st.clubId], plantilla = st => eq(st).plantilla.map(i => st.jugadores[i]).filter(p => p && p.id !== 'yo');
  const usos = st => { st.sede = st.sede || { charlas: {} }; st.sede.usos = st.sede.usos || {}; return st.sede.usos; };
  const gestiona = st => st.modo === 'gestor' || st.modo === 'presidente', tactica = st => st.modo === 'gestor' || st.modo === 'entrenador';
  const caja = st => (st.finanzas && st.finanzas[st.clubId] ? st.finanzas[st.clubId].caja : 0);
  // Pagos: en la carrera de jugador salen de tus ahorros (en miles de euros); en el resto, de la caja del club
  function pagar(st, euros, concepto) {
    if (st.modo === 'carrera') { const c = st.carrera; if (c.dinero < euros / 1000) return false; c.dinero -= euros / 1000; return true; }
    if (caja(st) < euros) return false; M().finanzas.registrar(st, st.clubId, concepto, -euros); return true;
  }
  function aficion(st, d) { const c = st.ciudad && st.ciudad[st.clubId]; if (c) c.aficion = U.clamp(c.aficion + d, 0, 100); }
  function opinionPena(st) {
    const ult = (st.calendario || []).filter(x => x.resultado && (x.local === st.clubId || x.visitante === st.clubId)).slice(-3);
    const gan = ult.filter(x => (x.local === st.clubId) === (x.resultado.local > x.resultado.visitante)).length;
    const t = !ult.length ? 'En la peña hay ganas: «Este año vamos a disfrutar».' : gan >= 2 ? 'En la peña están contentos: «Así sí, que siga la racha».' : gan === 1 ? 'En la peña hay dudas: «Falta regularidad, pero hay equipo».' : 'En la peña están mosqueados: «Esto hay que arreglarlo ya».';
    return t + ' Afición +2.';
  }
  const subir = (p, campo, d, min, max) => { p.estado[campo] = U.clamp(p.estado[campo] + d, min || 0, max || 100); };
  // [id, sala, título, descripción, días de espera, coste en euros, quién puede, efecto]
  const DEF = [
    ['charla_animo', 'vestuario', 'Charla motivadora', 'Reúnes al grupo y les recuerdas para qué entrenan. Ánimo +4 a todos.', 7, 0, () => true, st => { plantilla(st).forEach(p => subir(p, 'moral', 4)); return 'El vestuario sale con otra cara. Ánimo +4.'; }],
    ['charla_exigencia', 'vestuario', 'Apretar al grupo', 'Les exiges más. Forma +3, pero ánimo −2.', 7, 0, () => true, st => { plantilla(st).forEach(p => { subir(p, 'forma', 3); subir(p, 'moral', -2); }); return 'Mensaje recibido: forma +3, ánimo −2.'; }],
    ['sesion_recuperacion', 'gimnasio', 'Sesión de recuperación', 'Estiramientos, bici suave y piscina. Fatiga −10.', 1, 0, () => true, st => { plantilla(st).forEach(p => subir(p, 'fatiga', -10)); return 'Piernas frescas: fatiga −10.'; }],
    ['sesion_fuerza', 'gimnasio', 'Sesión de fuerza', 'Pesas y potencia. Forma +2, fatiga +6.', 1, 0, () => true, st => { plantilla(st).forEach(p => { subir(p, 'forma', 2); subir(p, 'fatiga', 6); }); return 'Buen trabajo de fuerza: forma +2, fatiga +6.'; }],
    ['invitar_cafe', 'cafeteria', 'Invitar a la plantilla', 'Café y bocadillos para todos (2.000 €). Ánimo +2.', 7, 2000, () => true, st => { plantilla(st).forEach(p => subir(p, 'moral', 2)); return 'Buen rato en la cafetería. Ánimo +2.'; }],
    ['firmar_tienda', 'tienda', 'Firmar camisetas', 'Se forma cola en la tienda. Afición +1.', 7, 0, () => true, st => { aficion(st, 1); return 'Media hora firmando y fotos con los niños. Afición +1.'; }],
    ['bufanda', 'tienda', 'Comprarte una bufanda del club', '15 €. Sales de la tienda con los colores puestos.', 30, 15, () => true, st => { if (st.modo === 'carrera') st.carrera.moral = U.clamp(st.carrera.moral + 1, 0, 100); return 'Bufanda nueva al cuello. La gente de la calle te sonríe.'; }],
    ['pena', 'pena', 'Tomar algo con la peña', 'Afición +2 y te cuentan qué piensa la grada (30 €).', 7, 30, () => true, st => { aficion(st, 2); return opinionPena(st); }],
    ['alcalde', 'ayuntamiento', 'Reunión con el alcalde', 'Apoyo del ayuntamiento +2.', 14, 0, st => st.modo === 'presidente' || st.modo === 'gestor', st => { const c = st.ciudad && st.ciudad[st.clubId]; if (c) c.apoyoAyuntamiento = U.clamp((c.apoyoAyuntamiento || 50) + 2, 0, 100); return 'El alcalde promete ayudar con las obras. Apoyo +2.'; }],
    ['descansar', 'casa', 'Descansar en casa', 'Cuanto más confort tenga tu casa, mejor descansas.', 1, 0, () => true, st => { const cf = GM.casa ? GM.casa.confort(st) : 10, f = Math.round(6 + cf / 3), m = Math.max(1, Math.round(cf / 10)); if (st.modo === 'carrera') { const y = st.jugadores.yo; if (y) y.estado.fatiga = U.clamp(y.estado.fatiga - f, 0, 100); st.carrera.moral = U.clamp(st.carrera.moral + m, 0, 100); return 'Siesta y sofá (confort ' + cf + '). Fatiga −' + f + ', ánimo +' + m + '.'; } return 'Desconectas un rato en casa (confort ' + cf + '). Mañana, con las pilas cargadas.'; }],
    ['fruta', 'mercado', 'Comprar fruta y charlar', 'Los tenderos te paran para hablar del club (6 €).', 3, 6, () => true, st => { aficion(st, 1); if (st.modo === 'carrera') st.carrera.moral = U.clamp(st.carrera.moral + 1, 0, 100); return ['La frutera: «¡A ver si este año nos dais una alegría!»', 'El de los frutos secos te regala un puñado de almendras.', 'Te reconocen y acabas haciéndote fotos con medio mercado.'][U.hash(st.fecha) % 3] + ' Afición +1.'; }],
    ['canastas', 'parque', 'Echar unas canastas con los chavales', 'Los niños del barrio alucinan. Afición +2.', 7, 0, () => true, st => { aficion(st, 2); if (st.modo === 'carrera') { st.carrera.moral = U.clamp(st.carrera.moral + 2, 0, 100); const y = st.jugadores.yo; if (y) y.estado.fatiga = U.clamp(y.estado.fatiga + 3, 0, 100); } return 'Un chaval te mete un triple en la cara y lo grabará su madre. Afición +2.'; }],
    ['cafe', 'terraza', 'Tomar un café en la terraza', 'Escuchas lo que se dice del club (1,50 €).', 1, 1.5, () => true, st => { if (st.modo === 'carrera') st.carrera.moral = U.clamp(st.carrera.moral + 1, 0, 100); return opinionPena(st).replace('En la peña', 'En la mesa de al lado').replace(' Afición +2.', ''); }],
    ['helado', 'heladeria', 'Tomar un helado', 'De turrón, el de siempre (3 €).', 1, 3, () => true, st => { if (st.modo === 'carrera') st.carrera.moral = U.clamp(st.carrera.moral + 1, 0, 100); return 'Helado de turrón en mano. La vida es esto.'; }],
    ['propina', 'musico', 'Dar una propina', 'Y pedirle una canción (2 €).', 1, 2, () => true, st => { aficion(st, 0); return '«¡Gracias, jefe!» Y se arranca con el himno del ' + st.equipos[st.clubId].siglas + '.'; }],
    // Más vida en cada sala
    ['tiro_extra', 'pista', 'Sesión de tiro extra', 'Cien tiros por cabeza al acabar el entreno. Forma +2, fatiga +3.', 2, 0, () => true, st => { if (st.modo === 'carrera' && st.jugadores.yo) { subir(st.jugadores.yo, 'forma', 3); subir(st.jugadores.yo, 'fatiga', 4); return 'Te quedas solo en la pista hasta meter cien. Forma +3, fatiga +4.'; } plantilla(st).forEach(p => { subir(p, 'forma', 2); subir(p, 'fatiga', 3); }); return 'La pista suena a red durante una hora. Forma +2, fatiga +3.'; }],
    ['partidillo', 'pista', 'Partidillo cinco contra cinco', 'Titulares contra suplentes, a muerte. Forma +2, ánimo +1, fatiga +5.', 3, 0, st => st.modo !== 'presidente', st => { const pl = plantilla(st); pl.forEach(p => { subir(p, 'forma', 2); subir(p, 'moral', 1); subir(p, 'fatiga', 5); }); const g = U.hash(st.fecha + 'partidillo') % 2; return (g ? 'Ganan los suplentes y se nota en el vestuario: hay hambre.' : 'Los titulares imponen su ley, pero con piques.') + ' Forma +2, ánimo +1, fatiga +5.'; }],
    ['musica', 'vestuario', 'Poner música antes del entreno', 'El altavoz del vestuario, a todo volumen. Ánimo +1.', 2, 0, () => true, st => { plantilla(st).forEach(p => subir(p, 'moral', 1)); return ['Suena reguetón y medio vestuario baila.', 'El capitán pone rock de los ochenta. Quejas y risas.', 'Alguien pone el himno del club y todos lo cantan.'][U.hash(st.fecha) % 3] + ' Ánimo +1.'; }],
    ['cena_equipo', 'vestuario', 'Organizar una cena de equipo', 'Restaurante para toda la plantilla (3.000 €). Ánimo +5.', 21, 3000, () => true, st => { plantilla(st).forEach(p => subir(p, 'moral', 5)); return 'Cena larga, anécdotas y un brindis por la temporada. Ánimo +5.'; }],
    ['yoga', 'gimnasio', 'Clase de yoga y movilidad', 'Una hora de estiramientos guiados. Fatiga −5, ánimo +1.', 3, 0, () => true, st => { plantilla(st).forEach(p => { subir(p, 'fatiga', -5); subir(p, 'moral', 1); }); return 'Hasta los pívots tocan el suelo con las manos. Fatiga −5, ánimo +1.'; }],
    ['masaje', 'fisio', 'Sesión de masajes', 'Los fisios descargan piernas a los cinco más cansados (500 €). Fatiga −8.', 2, 500, () => true, st => { const pl = plantilla(st).slice().sort((a, b) => b.estado.fatiga - a.estado.fatiga).slice(0, 5); pl.forEach(p => subir(p, 'fatiga', -8)); return 'Camillas llenas: ' + pl.map(p => p.nombre.split(' ').pop()).join(', ') + '. Fatiga −8.'; }],
    ['prevencion', 'fisio', 'Trabajo de prevención', 'Propiocepción, tobillos y core. Forma +1, fatiga −2.', 7, 0, () => true, st => { plantilla(st).forEach(p => { subir(p, 'forma', 1); subir(p, 'fatiga', -2); }); return 'Media hora de gomas y fitballs. Forma +1, fatiga −2.'; }],
    ['exclusiva', 'prensa', 'Entrevista en exclusiva', 'Un diario quiere una entrevista larga. Afición +2.', 14, 0, () => true, st => { aficion(st, 2); if (st.modo === 'carrera' && st.carrera) st.carrera.fama += 1; const c = st.equipos[st.clubId]; GM.noticia(st, 'Entrevista en exclusiva sobre el ' + c.nombre); return 'Doble página mañana en el periódico. Afición +2.'; }],
    ['nutricion', 'cafeteria', 'Menú de nutricionista', 'Comida equilibrada para todos (1.000 €). Forma +1, fatiga −2.', 3, 1000, () => true, st => { plantilla(st).forEach(p => { subir(p, 'forma', 1); subir(p, 'fatiga', -2); }); return 'Quinoa, salmón y fruta. Hay quejas, pero funciona. Forma +1, fatiga −2.'; }],
    ['tertulia', 'cafeteria', 'Café con los empleados', 'El personal del club te cuenta cómo lo ve (1,20 €).', 1, 1.2, () => true, st => { const ult = (st.calendario || []).filter(x => x.resultado && (x.local === st.clubId || x.visitante === st.clubId)); const v = ult.filter(x => (x.local === st.clubId) === (x.resultado.local > x.resultado.visitante)).length; if (st.modo === 'carrera') st.carrera.moral = U.clamp(st.carrera.moral + 1, 0, 100); return ult.length ? 'El camarero: «' + v + ' ganados y ' + (ult.length - v) + ' perdidos. ' + (v * 2 >= ult.length ? 'Esto va bien, que no se tuerza».' : 'Hay que espabilar».') : 'La recepcionista: «Tengo ganas de que empiece la liga».'; }],
    ['colegio', 'recepcion', 'Recibir la visita de un colegio', 'Treinta niños con la camiseta del club. Afición +2.', 14, 0, () => true, st => { aficion(st, 2); return 'Visita a la pista, fotos en la vitrina y preguntas imposibles. Afición +2.'; }],
    ['analista', 'despacho', 'Ver vídeo del rival con el analista', 'Sus jugadas, al detalle. Forma +1 a todos.', 4, 0, st => st.modo !== 'presidente', st => { const C = M().competiciones, g = C && C.proximoPartido(st, st.clubId), riv = g ? st.equipos[g.local === st.clubId ? g.visitante : g.local] : null; plantilla(st).forEach(p => subir(p, 'forma', 1)); return (riv ? 'Dos horas de vídeo del ' + riv.nombre + ': ya sabéis cómo defienden el bloqueo.' : 'Repasáis vuestras propias jugadas.') + ' Forma +1.'; }],
    ['staff', 'despacho', 'Reunión con el cuerpo técnico', 'Repasáis cargas y rotaciones. Fatiga −3.', 7, 0, st => st.modo !== 'carrera', st => { plantilla(st).forEach(p => subir(p, 'fatiga', -3)); return 'Se reparten mejor los minutos esta semana. Fatiga −3.'; }],
    ['patrocinador', 'despacho', 'Comida con un patrocinador', 'Cuidas la relación con la empresa (300 €). Aporta un bonus de 5.000 €.', 30, 300, gestiona, st => { M().finanzas.registrar(st, st.clubId, 'Bonus de patrocinio', 5000); return 'El patrocinador sale encantado y adelanta un bonus de 5.000 €.'; }],
    ['firmas', 'recepcion', 'Firmar camisetas para la afición', 'Media hora con los aficionados de la entrada. Afición +1.', 7, 0, () => true, st => { const c = st.ciudad && st.ciudad[st.clubId]; if (c) c.aficion = U.clamp(c.aficion + 1, 0, 100); return 'Los aficionados se van encantados. Afición +1.'; }]
  ];
  // Paneles: abren una vista propia dentro de la sede
  const PANELES = {
    vestuario: [['plantilla', 'La plantilla', 'Cómo está cada uno: ánimo, forma y lesiones.']],
    pista: [['pizarra', 'Pizarra táctica', 'Ritmo, defensa y a qué jugáis.']],
    fisio: [['lesionados', 'Parte médico', 'Lesionados y tratamientos.']],
    prensa: [['rueda', 'Rueda de prensa', 'Los periodistas esperan. Lo que digas se nota en la afición y el vestuario.']],
    despacho: [['ordenador', 'Ordenador del despacho', 'Agentes libres, renovaciones y cuentas del club.']],
    recepcion: [['partido', 'Próximo partido', 'Rival, fecha y avanzar el calendario.']],
    pabellon: [['partido', 'Taquillas: próximo partido', 'Rival, fecha y avanzar el calendario.']],
    kiosco: [['noticias', 'Los periódicos de hoy', 'Qué se dice del club.']]
  };
  function espera(st, id, dias) { const u = usos(st)[id]; if (!u) return 0; const d = U.diffDays(u, st.fecha); return d < dias ? dias - d : 0; }
  function acciones(st, sala) {
    const out = [];
    (PANELES[sala] || []).forEach(([id, t, d]) => {
      let motivo = null;
      if (id === 'pizarra' && !tactica(st)) motivo = 'La táctica la decide el entrenador.';
      if (id === 'ordenador' && st.modo !== 'gestor') motivo = 'El ordenador es del director técnico.';
      if (id === 'rueda') { const e = espera(st, 'rueda', 7); if (e) motivo = 'Ya hubo rueda de prensa esta semana (' + e + (e === 1 ? ' día' : ' días') + ').'; }
      out.push({ id, panel: true, t, d, disponible: !motivo, motivo });
    });
    DEF.filter(a => a[1] === sala).forEach(([id, , t, d, dias, coste, puede]) => {
      let motivo = null; const e = espera(st, id, dias);
      if (!puede(st)) motivo = 'No te corresponde.'; else if (e) motivo = 'Disponible en ' + e + (e === 1 ? ' día.' : ' días.');
      else if (coste && (st.modo === 'carrera' ? st.carrera.dinero * 1000 : caja(st)) < coste) motivo = 'No hay dinero suficiente.';
      out.push({ id, t, d, coste, disponible: !motivo, motivo });
    });
    return out;
  }
  function hacer(st, id) {
    const a = DEF.find(x => x[0] === id); if (!a) return { ok: false, motivo: 'Acción desconocida.' };
    const disp = acciones(st, a[1]).find(x => x.id === id); if (!disp.disponible) return { ok: false, motivo: disp.motivo };
    if (a[5] && !pagar(st, a[5], a[2])) return { ok: false, motivo: 'No hay dinero suficiente.' };
    usos(st)[id] = st.fecha; return { ok: true, texto: a[7](st) };
  }
  // ---------- Rueda de prensa ----------
  function ruedaPrensa(st) {
    const C = M().competiciones, g = C && C.proximoPartido(st, st.clubId), riv = g ? st.equipos[g.local === st.clubId ? g.visitante : g.local] : null;
    const ult = (st.calendario || []).filter(x => x.resultado && (x.local === st.clubId || x.visitante === st.clubId)).pop();
    let pregunta, contexto;
    if (ult) { const gan = (ult.local === st.clubId) === (ult.resultado.local > ult.resultado.visitante); contexto = gan ? 'victoria' : 'derrota'; pregunta = gan ? '¿Qué ha cambiado en el equipo para ganar el último partido?' : 'Tras la derrota, ¿está el equipo en crisis?'; }
    else { contexto = 'inicio'; pregunta = '¿Cuál es el objetivo del club esta temporada?'; }
    if (riv && !ult) pregunta += ' Empezáis contra ' + riv.nombre + '.';
    const R = {
      victoria: [['Mérito de los jugadores. Ellos son los protagonistas.', { moral: 3, aficion: 1 }], ['Es el camino. Queremos ganarlo todo.', { moral: 2, aficion: 3, presion: true }], ['Un partido no cambia nada. Humildad.', { moral: 1, aficion: 0 }]],
      derrota: [['Asumo la responsabilidad. El equipo ha competido.', { moral: 3, aficion: -1 }], ['Hay jugadores que tienen que dar más.', { moral: -4, aficion: 2 }], ['Hablaremos del arbitraje otro día.', { moral: 1, aficion: 2, multa: 3000 }]],
      inicio: [['Competir cada partido y crecer con la cantera.', { moral: 2, aficion: 2 }], ['Ganar títulos. Este club no se conforma.', { moral: 1, aficion: 4, presion: true }], ['Paso a paso. Primero, la permanencia.', { moral: 0, aficion: -1 }]]
    }[contexto];
    return { pregunta, respuestas: R.map(r => r[0]), _r: R };
  }
  function responder(st, i) {
    if (espera(st, 'rueda', 7)) return { ok: false, motivo: 'Ya hubo rueda de prensa esta semana.' };
    const rp = ruedaPrensa(st), r = rp._r[i]; if (!r) return { ok: false, motivo: 'Respuesta no válida.' };
    const e = r[1], out = []; usos(st).rueda = st.fecha;
    if (e.moral) { plantilla(st).forEach(p => subir(p, 'moral', e.moral)); out.push('ánimo ' + (e.moral > 0 ? '+' : '') + e.moral); }
    const c = st.ciudad && st.ciudad[st.clubId]; if (c && e.aficion) { c.aficion = U.clamp(c.aficion + e.aficion, 0, 100); out.push('afición ' + (e.aficion > 0 ? '+' : '') + e.aficion); }
    if (e.multa && st.modo !== 'carrera') { M().finanzas.registrar(st, st.clubId, 'Multa por declaraciones', -e.multa); out.push('multa de ' + U.eur(e.multa)); }
    GM.noticia(st, 'Rueda de prensa: «' + r[0] + '»');
    return { ok: true, texto: out.length ? 'Titulares del día: ' + out.join(', ') + '.' + (e.presion ? ' La exigencia sube.' : '') : 'Pasa sin pena ni gloria.' };
  }
  // ---------- Pizarra táctica ----------
  function pizarra(st) { const t = M().partidos.tacticaValida(st, st.clubId); return { ritmo: t.ritmo, defensa: t.defensa, foco: t.foco, quinteto: t.quinteto.map(i => st.jugadores[i]).filter(Boolean) }; }
  function fijarTactica(st, campo, valor) {
    if (!tactica(st)) return { ok: false, motivo: 'La táctica la decide el entrenador.' };
    const t = Object.assign({}, M().partidos.tacticaValida(st, st.clubId));
    if (campo === 'ritmo') t.ritmo = U.clamp(valor, 1, 5); else if (campo === 'defensa' && ['hombre', 'zona', 'mixta'].includes(valor)) t.defensa = valor; else if (campo === 'foco' && ['equilibrado', 'exterior', 'interior'].includes(valor)) t.foco = valor; else return { ok: false, motivo: 'Valor no válido.' };
    eq(st).tactica = t; return { ok: true };
  }
  // ---------- Enfermería ----------
  const COSTE_TRAT = 15000;
  function lesionados(st) { return plantilla(st).concat(st.modo === 'carrera' && st.jugadores.yo && st.jugadores.yo.equipoId === st.clubId ? [st.jugadores.yo] : []).filter(p => p.estado.lesion); }
  function tratar(st, jugId) {
    const p = st.jugadores[jugId], l = p && p.estado.lesion; if (!l) return { ok: false, motivo: 'No está lesionado.' };
    if (l.tratado) return { ok: false, motivo: 'Ya recibe el tratamiento intensivo.' };
    if (!gestiona(st)) return { ok: false, motivo: 'El gasto médico lo aprueba la dirección del club.' };
    if (!pagar(st, COSTE_TRAT, 'Tratamiento intensivo de ' + p.nombre)) return { ok: false, motivo: 'No hay dinero suficiente (' + U.eur(COSTE_TRAT) + ').' };
    const antes = l.dias; l.dias = Math.max(1, Math.ceil(l.dias * 0.7)); l.tratado = true;
    return { ok: true, texto: p.nombre + ' volverá antes: ' + antes + ' → ' + l.dias + ' días.' };
  }
  // ---------- Ordenador del despacho (director técnico) ----------
  function ordenador(st) {
    const Mk = M().mercado, fin = M().finanzas.resumen(st, st.clubId);
    const libres = Mk.libres(st).slice(0, 8).map(p => ({ p, pide: Mk.salarioPedido(st, p.id, st.clubId) }));
    const renov = Mk.expiran(st, st.clubId).filter(p => p.id !== 'yo').slice(0, 8).map(p => ({ p, pide: Math.round(Mk.salarioPedido(st, p.id, st.clubId) * 1.04 / 10000) * 10000 }));
    return { caja: fin.caja, masa: fin.masaSalarial, tope: fin.tope ? fin.tope.tope : 0, libres, renov };
  }
  function ofrecer(st, jugId) { const Mk = M().mercado; return Mk.ofertar(st, jugId, { salario: Mk.salarioPedido(st, jugId, st.clubId), anos: 2 }); }
  function renovar(st, jugId) { const Mk = M().mercado; return Mk.renovar(st, jugId, { salario: Math.round(Mk.salarioPedido(st, jugId, st.clubId) * 1.04 / 10000) * 10000, anos: 2 }); }
  function selfTest() { return DEF.every(a => typeof a[7] === 'function') && Object.keys(PANELES).length === 8; }
  GM.register('sedeAcciones', { acciones, hacer, ruedaPrensa, responder, pizarra, fijarTactica, lesionados, tratar, ordenador, ofrecer, renovar, COSTE_TRAT, selfTest });
})();
