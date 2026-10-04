/* LEGADO (GM.mods.legado) — modo Presidente
   Expone: activo, fijarPilares, pilares, alma, influencia, dilemas, resolver, gastar, salaHistoria, retirarCamiseta, elecciones, selfTest.
   Escribe state.legado = { pilares:{cantera,estilo,arraigo,ambicion} (1 baja, 2 media, 3 alta), alma, influencia, pendientes:[], resueltos:[], historia:[],
   camisetas:[], mandato:{inicio,proxima,cuenta}, ultimo }.
   El club se autogestiona (directiva IA); el presidente cuida el alma del club y toma dilemas con consecuencias. */
(function () {
  const U = GM.util;
  const yearOf = st => parseInt(st.temporada.slice(0, 4), 10);
  const PIL = { cantera: 'Cantera', estilo: 'Estilo de juego', arraigo: 'Arraigo a la ciudad', ambicion: 'Ambición' };
  const L = st => st.legado;
  const F = () => GM.mods.finanzas;
  const activo = st => !!st && st.modo === 'presidente' && !!st.legado;

  // Cada opción: ef = { dinero, influencia, ambiente, aficion, apoyo, alma, pil:{pilar:±n}, contrato:{nombre,tipo,importeAnual,anos}, nota }
  const DILEMAS = [
    { id: 'patro-principal', min: 0, t: 'Patrocinador principal', d: 'Tres empresas quieren su nombre en la camiseta. Solo puedes elegir una.', ops: [
      { t: 'Banco internacional', d: 'Mucho dinero, poco arraigo.', ef: { alma: -2, pil: { arraigo: -2, ambicion: 1 }, contrato: { nombre: 'Banco Atlántico', tipo: 'Camiseta', frac: 0.1, anos: 3 } } },
      { t: 'Marca local', d: 'Menos dinero, la afición lo agradece.', ef: { aficion: 4, apoyo: 3, alma: 2, pil: { arraigo: 2 }, contrato: { nombre: 'Cooperativa del barrio', tipo: 'Camiseta', frac: 0.065, anos: 2 } } },
      { t: 'Empresa sanitaria', d: 'Imagen de salud y compromiso con la ciudad.', ef: { apoyo: 4, alma: 1, pil: { arraigo: 1 }, contrato: { nombre: 'Clínica Mediterrània', tipo: 'Camiseta', frac: 0.08, anos: 3 } } }] },
    { id: 'naming', min: 0, t: 'Nombre del pabellón', d: 'Una multinacional ofrece dinero por llamar al pabellón con su marca.', ops: [
      { t: 'Vender el nombre', d: 'Ingresos hoy, la afición protesta.', ef: { dinero: 0.12, aficion: -5, ambiente: -3, alma: -4, pil: { arraigo: -3 }, contrato: { nombre: 'Naming del pabellón', tipo: 'Pabellón (naming)', frac: 0.07, anos: 4 } } },
      { t: 'Mantener el nombre histórico', d: 'Sin dinero extra, más alma.', ef: { aficion: 3, alma: 3, pil: { arraigo: 2 } } }] },
    { id: 'estrella', min: 4, t: 'Estrella mediática', d: 'Un jugador muy famoso quiere venir. Llenaría el pabellón y vendería camisetas, pero choca con la cantera.', ops: [
      { t: 'Aceptar', d: 'Más ingresos y atención. Cuesta influencia con la cantera.', ef: { dinero: 0.05, aficion: 4, alma: -1, pil: { ambicion: 2, cantera: -2 } } },
      { t: 'Rechazar', d: 'Apuestas por tu gente.', ef: { alma: 2, influencia: 4, pil: { cantera: 2 } } }] },
    { id: 'ayto-suelo', min: 3, t: 'Ampliar el campus', d: 'El ayuntamiento ofrece suelo para ampliar la ciudad deportiva a cambio de entradas gratuitas para colegios.', ops: [
      { t: 'Aceptar', d: 'Las obras serán más baratas; un poco menos de taquilla.', ef: { apoyo: 5, alma: 2, pil: { arraigo: 2 }, convenio: 'ayto-suelo' } },
      { t: 'Rechazar', d: 'No te condiciona nadie.', ef: { apoyo: -2 } }] },
    { id: 'penyas', min: 2, t: 'Grada de animación', d: 'Las peñas piden una zona de animación con bombo y bufandas.', ops: [
      { t: 'Apoyar', d: 'Más ambiente, algunos vecinos se quejarán del ruido.', ef: { ambiente: 6, aficion: 4, apoyo: -2, alma: 2, pil: { arraigo: 1 } } },
      { t: 'Posponer', d: 'Sin cambios.', ef: { aficion: -2 } }] },
    { id: 'tv', min: 5, t: 'Derechos de televisión', d: 'Dos ofertas para emitir los partidos.', ops: [
      { t: 'Canal autonómico en abierto', d: 'Más afición, menos dinero.', ef: { aficion: 4, apoyo: 2, alma: 2, pil: { arraigo: 1 }, contrato: { nombre: 'Televisión autonómica', tipo: 'TV', frac: 0.04, anos: 2 } } },
      { t: 'Plataforma de pago', d: 'Más dinero, menos alcance.', ef: { aficion: -2, alma: -1, pil: { ambicion: 1 }, contrato: { nombre: 'Plataforma de pago', tipo: 'TV', frac: 0.06, anos: 2 } } }] },
    { id: 'apuestas', min: 6, t: 'Casa de apuestas', d: 'Una casa de apuestas ofrece una cifra muy alta por patrocinar al club.', ops: [
      { t: 'Aceptar', d: 'Dinero fácil, mala imagen.', ef: { dinero: 0.1, apoyo: -6, aficion: -3, alma: -5, pil: { arraigo: -2 }, contrato: { nombre: 'Casa de apuestas', tipo: 'Cantera y formación', frac: 0.07, anos: 2 } } },
      { t: 'Rechazar', d: 'Defiendes los valores del club.', ef: { apoyo: 3, alma: 3, influencia: 3 } }] },
    { id: 'colegio', min: 1, t: 'Colegios del barrio', d: 'Varios colegios piden clínics y entradas para sus alumnos.', ops: [
      { t: 'Firmar el programa escolar', d: 'Más afición joven y cantera.', ef: { dinero: -0.01, aficion: 5, apoyo: 3, alma: 2, pil: { cantera: 1, arraigo: 1 }, convenio: 'colegios' } },
      { t: 'No es el momento', d: '', ef: {} }] },
    { id: 'prensa', min: 5, t: 'Polémica en prensa', d: 'Un artículo critica el rumbo del club y la afición lo comenta mucho.', ops: [
      { t: 'Dar la cara', d: 'Rueda de prensa del presidente. Cuesta influencia.', ef: { influencia: -5, apoyo: 3, aficion: 3 } },
      { t: 'Dejarlo pasar', d: 'Se enfría solo, o no.', ef: { aficion: -3, apoyo: -1 } }] },
    { id: 'mudanza', min: 24, t: 'Oferta de mudanza', d: 'Otro municipio ofrece un pabellón nuevo y suelo para el club si se traslada allí.', ops: [
      { t: 'Estudiar la oferta', d: 'Más dinero y ambición, pero se pierde parte del arraigo.', ef: { dinero: 0.15, alma: -8, apoyo: -8, aficion: -6, pil: { arraigo: -4, ambicion: 2 } } },
      { t: 'Rechazar', d: 'Te quedas en casa.', ef: { alma: 4, aficion: 4, apoyo: 4, pil: { arraigo: 3 } } }] },
    { id: 'leyenda', min: 8, t: 'Homenaje a una leyenda', d: 'La afición pide homenajear a una leyenda del club.', ops: [
      { t: 'Retirar una camiseta', d: 'Un acto emotivo que queda para siempre.', ef: { aficion: 6, ambiente: 4, alma: 4, pil: { arraigo: 2 }, camiseta: true } },
      { t: 'Acto sencillo en un partido', d: 'Menos coste, menos efecto.', ef: { aficion: 3, alma: 1 } }] },
    { id: 'entrenador-vet', min: 7, t: 'Peticiones del entrenador', d: 'Tu entrenador pide un jugador veterano de nivel alto para ganar ya.', ops: [
      { t: 'Apoyarle', d: 'La directiva gastará dinero en un fichaje.', ef: { dinero: -0.04, alma: -1, pil: { ambicion: 2, cantera: -1 } } },
      { t: 'Decirle que confíe en la cantera', d: 'El plan sigue igual.', ef: { alma: 2, pil: { cantera: 2 }, influencia: -2 } }] }
  ];
  DILEMAS.push(
    { id: 'veterano-adios', min: 10, t: 'Despedida del capitán', d: 'El capitán anuncia que se retira al acabar la temporada y pide despedirse en casa.', ops: [
      { t: 'Homenaje en el pabellón', d: 'Un acto grande, con la grada entera.', ef: { dinero: -0.01, aficion: 4, ambiente: 3, alma: 2, pil: { arraigo: 1 } } },
      { t: 'Una nota en la web', d: 'Rápido y sin gastos.', ef: { aficion: -1 } }] },
    { id: 'derbi', min: 3, t: 'Derbi caliente', d: 'La peña rival provoca por redes y la grada pide una campaña a la altura.', ops: [
      { t: 'Campaña «Aquí se gana»', d: 'Más ambiente, algo más de crispación.', ef: { ambiente: 5, aficion: 3, apoyo: -1, pil: { ambicion: 1 } } },
      { t: 'Pedir deportividad', d: 'Mensaje de respeto en todos los canales.', ef: { apoyo: 3, alma: 2, pil: { arraigo: 1 } } }] },
    { id: 'camiseta-retro', min: 6, t: 'Equipación retro', d: 'Un fabricante propone una camiseta retro para el aniversario del club.', ops: [
      { t: 'Lanzarla', d: 'Ingresos extra y mucha nostalgia.', ef: { dinero: 0.02, aficion: 3, alma: 1 } },
      { t: 'No tocar la tradición', d: 'La camiseta de siempre y punto.', ef: { alma: 2 } }] },
    { id: 'cantera-extranjero', min: 9, t: 'Talento de fuera', d: 'Un joven talento extranjero quiere entrar en la academia, pero ocuparía la plaza de un chico del barrio.', ops: [
      { t: 'Fichar al talento', d: 'Más techo deportivo, menos arraigo.', ef: { pil: { ambicion: 2, cantera: 1, arraigo: -1 } } },
      { t: 'Priorizar al chico del barrio', d: 'La ciudad se siente reconocida.', ef: { aficion: 2, pil: { arraigo: 2, cantera: 1 } } }] },
    { id: 'concierto-pab', min: 4, t: 'Festival en el pabellón', d: 'Una promotora quiere alquilar el pabellón para un festival en plena temporada.', ops: [
      { t: 'Aceptar', d: 'Dinero fácil, el parquet sufre y los vecinos se quejan.', ef: { dinero: 0.04, ambiente: -2, apoyo: -1 } },
      { t: 'Rechazar', d: 'El pabellón es del baloncesto.', ef: { alma: 1 } }] },
    { id: 'solidaria', min: 5, t: 'Partido solidario', d: 'Una desgracia local conmueve a la ciudad. El club puede organizar un partido benéfico.', ops: [
      { t: 'Partido benéfico', d: 'Toda la recaudación va a las familias afectadas.', ef: { dinero: -0.01, apoyo: 5, aficion: 4, alma: 3, pil: { arraigo: 2 } } },
      { t: 'Donación discreta', d: 'Ayudas sin ruido.', ef: { apoyo: 2, alma: 1 } }] },
    { id: 'prensa-venta', min: 8, t: 'Rumor de venta', d: 'Un periódico asegura que quieres vender al jugador más querido por la grada.', ops: [
      { t: 'Desmentirlo con firmeza', d: 'Cuesta algo de influencia.', ef: { aficion: 2, influencia: -3 } },
      { t: 'Dejar que corra', d: 'El rumor se alimenta solo.', ef: { aficion: -3, apoyo: -1 } }] },
    { id: 'abonos', min: 3, t: 'Precio de los abonos', d: 'Gerencia propone subir los abonos para pagar las nuevas incorporaciones.', ops: [
      { t: 'Subir un 10 %', d: 'Más ingresos, menos afición contenta.', ef: { dinero: 0.03, aficion: -4, alma: -2, pil: { arraigo: -1 } } },
      { t: 'Congelar los precios', d: 'La grada lo agradece.', ef: { dinero: -0.01, aficion: 3, alma: 2, pil: { arraigo: 1 } } }] },
    { id: 'vestuario', min: 7, t: 'Tensión en el vestuario', d: 'Dos jugadores clave discuten tras una derrota y el ambiente se enrarece.', ops: [
      { t: 'Mediar tú mismo', d: 'Hablas con ambos. Cuesta influencia.', ef: { influencia: -4, alma: 1 } },
      { t: 'Que lo resuelva el entrenador', d: 'Se confía en su criterio.', ef: { influencia: 1, aficion: -1 } }] },
    { id: 'pabellon-escolar', min: 12, t: 'Pabellón para los colegios', d: 'El ayuntamiento quiere usar el pabellón para un torneo escolar durante dos semanas.', ops: [
      { t: 'Ceder el pabellón', d: 'La ciudad lo recuerda.', ef: { apoyo: 5, aficion: 2, alma: 1, pil: { arraigo: 1 } } },
      { t: 'No hay hueco', d: 'La agenda está llena.', ef: { apoyo: -2 } }] },
    { id: 'gira', min: 14, t: 'Gira internacional', d: 'Una peña del extranjero ofrece organizar una gira y vender camisetas.', ops: [
      { t: 'Aceptar', d: 'Más ingresos y proyección.', ef: { dinero: 0.02, pil: { ambicion: 1 } } },
      { t: 'Priorizar a los socios de aquí', d: 'Primero la gente de casa.', ef: { pil: { arraigo: 1 }, alma: 1 } }] },
    { id: 'leyenda-asesor', min: 16, t: 'Una leyenda quiere volver', d: 'Una leyenda del club quiere regresar como asesor de la cantera.', ops: [
      { t: 'Contratarle', d: 'Un símbolo para los chicos.', ef: { dinero: -0.01, alma: 2, pil: { cantera: 2 } } },
      { t: 'Agradecer y declinar', d: 'Cada uno en su sitio.', ef: {} }] }
  );
  const VOZ = {
    'patro-principal': ['gerente', 'Tres marcas quieren la camiseta y solo cabe una. Piense en cómo se verá dentro de cinco años.'],
    'naming': ['gerente', 'Con ese dinero arreglaríamos la grada. Pero el nombre del pabellón es de todos.'],
    'estrella': ['director', 'Presidente, nos llama el jugador del momento. Llenaría el pabellón, pero a la cantera no le hará gracia.'],
    'ayto-suelo': ['alcalde', 'Tenemos un solar municipal que podría ser vuestro. A cambio, que los colegios vean partidos.'],
    'penyas': ['pena', 'Pedimos una zona con bombo y bufandas. Si el pabellón suena, el equipo juega con una marcha más.'],
    'tv': ['gerente', 'Dos cadenas, dos maneras de salir en pantalla. Una paga mejor; la otra llega a más gente.'],
    'apuestas': ['gerente', 'La cifra es muy alta, Presidente. Y sabe que no será la última vez que llamen.'],
    'colegio': ['alcalde', 'Los directores de los colegios os esperan. Un clínic con los jugadores lo recordarán años.'],
    'prensa': ['prensa', 'Dicen que el club ha perdido el rumbo. Quiero su versión antes de publicar.'],
    'mudanza': ['alcalde', 'Otro municipio le ofrece un pabellón nuevo. Piénselo: aquí están sus raíces.'],
    'leyenda': ['socio', 'Esa camiseta merece colgar del techo. Medio pabellón lo lleva pidiendo años.'],
    'entrenador-vet': ['entrenador', 'Necesito un veterano de nivel para ganar ya. Con lo que tengo, me quedo corto.'],
    'veterano-adios': ['entrenador', 'Nos deja el capitán. Se merece que el pabellón entero se levante.'],
    'derbi': ['pena', 'Los de enfrente se han pasado de listos. Si no respondemos, lo harán otra vez.'],
    'camiseta-retro': ['gerente', 'Hay un diseño de los noventa que ha vuelto a ser moda. Se vendería solo.'],
    'cantera-extranjero': ['director', 'Este chico es distinto a todo lo que he visto. Pero la plaza era para uno de aquí.'],
    'concierto-pab': ['gerente', 'Pagan bien y por adelantado. Eso sí: habrá que proteger el parquet.'],
    'solidaria': ['alcalde', 'La ciudad está dolida. Si el club da el primer paso, el resto vendrá detrás.'],
    'prensa-venta': ['prensa', 'Fuentes del club dicen que su estrella está en venta. ¿Lo confirma?'],
    'abonos': ['gerente', 'Si no tocamos los abonos, no cuadran los números. Es lo que hay.'],
    'vestuario': ['entrenador', 'Se han dicho cosas feas. Puedo arreglarlo yo, pero si interviene usted pesará más.'],
    'pabellon-escolar': ['alcalde', 'Dos semanas de torneo escolar. Los niños se acordarán de quién les abrió la puerta.'],
    'gira': ['gerente', 'Quieren camisetas y fotos con los jugadores. Hay dinero, pero también ruido.'],
    'leyenda-asesor': ['socio', 'Que vuelva a casa. Los chicos tienen que ver de dónde venimos.']
  };
  const ROL = { gerente: 'Gerente del club', director: 'Director deportivo', entrenador: 'Entrenador', alcalde: 'Alcaldía', pena: 'Presidente de la peña', prensa: 'Periodista deportivo', socio: 'Socio de toda la vida' };
  function voz(st, quien) {
    const d = st.directiva;
    if (quien === 'director' && d) return { nombre: d.director.nombre, rol: ROL.director };
    if (quien === 'entrenador' && d) return { nombre: d.entrenador.nombre, rol: ROL.entrenador };
    const h = U.hash(st.clubId + quien + 'voz'), pais = st.equipos[st.clubId].pais || 'ES';
    return { nombre: GM.nombreAleatorio(pais, h), rol: ROL[quien] || 'Colaborador' };
  }
  const PILAR_PESO = { 1: 0.5, 2: 1, 3: 1.7 };

  function aplicar(st, ef, nombreDil) {
    const l = L(st), c = st.ciudad[st.clubId], f = F(), eq = st.equipos[st.clubId], out = [];
    if (ef.dinero && f) { const v = Math.round(ef.dinero * eq.presupuesto); f.registrar(st, st.clubId, nombreDil, v); out.push((v >= 0 ? '+' : '') + U.eur(v)); }
    ['ambiente', 'aficion'].forEach(k => { if (ef[k]) { c[k] = U.clamp(c[k] + ef[k], 0, 100); out.push(k + (ef[k] > 0 ? ' +' : ' ') + ef[k]); } });
    if (ef.apoyo) { c.apoyoAyuntamiento = U.clamp(c.apoyoAyuntamiento + ef.apoyo, 0, 100); out.push('ayuntamiento ' + (ef.apoyo > 0 ? '+' : '') + ef.apoyo); }
    let alma = ef.alma || 0;
    if (ef.pil) for (const k in ef.pil) { alma += ef.pil[k] * PILAR_PESO[l.pilares[k] || 2] * 0.8; }
    if (alma) { l.alma = U.clamp(l.alma + alma, 0, 100); out.push('alma ' + (alma > 0 ? '+' : '') + alma.toFixed(1)); }
    if (ef.influencia) { l.influencia = U.clamp(l.influencia + ef.influencia, 0, 100); out.push('influencia ' + (ef.influencia > 0 ? '+' : '') + ef.influencia); }
    if (ef.contrato && f) {
      const k = ef.contrato, imp = Math.round(eq.presupuesto * k.frac / 1000) * 1000;
      const fin = st.finanzas[st.clubId];
      fin.patrocinios = fin.patrocinios.filter(p => p.tipo !== k.tipo);
      fin.patrocinios.push({ id: 'dil-' + st.fecha + '-' + k.nombre, nombre: k.nombre, tipo: k.tipo, importeAnual: imp, anos: k.anos, hasta: yearOf(st) + k.anos });
      out.push('contrato ' + U.eur(imp) + '/año');
    }
    if (ef.convenio && GM.mods.ciudad) { const r = GM.mods.ciudad.firmarConvenio(st, st.clubId, ef.convenio); if (r.ok) out.push('convenio firmado'); }
    if (ef.camiseta) retirarCamiseta(st);
    return out;
  }
  function retirarCamiseta(st) {
    const l = L(st), pl = st.equipos[st.clubId].plantilla.map(i => st.jugadores[i]).filter(Boolean).sort((a, b) => b.ovr - a.ovr)[0];
    const num = [4, 7, 9, 10, 11, 14, 15, 5, 8, 12][l.camisetas.length % 10];
    l.camisetas.push({ numero: num, nombre: 'Leyenda del club', temporada: st.temporada });
    l.historia.unshift({ temporada: st.temporada, fecha: st.fecha, tipo: 'camiseta', texto: 'Se retira el dorsal ' + num + ' en homenaje a una leyenda del club.' });
  }
  function disponibles(st) {
    const l = L(st), mes = Math.max(0, Math.round(U.diffDays('2026-09-24', st.fecha) / 30));
    const vistos = new Set(l.resueltos.map(r => r.id));
    return DILEMAS.filter(d => mes >= d.min && (!vistos.has(d.id) || (['prensa', 'leyenda', 'penyas', 'derbi', 'vestuario', 'abonos'].indexOf(d.id) >= 0) && l.resueltos.filter(r => r.id === d.id).length < 3));
  }
  function nuevoDilema(st) {
    const l = L(st);
    if (l.pendientes.length >= 2) return;
    const lista = disponibles(st).filter(d => !l.pendientes.some(p => p.id === d.id));
    if (!lista.length) return;
    const d = GM.rng.pick(lista);
    l.pendientes.push({ id: d.id, fecha: st.fecha });
    GM.noticia(st, 'Decisión pendiente en la presidencia: ' + d.t + '.');
  }
  function dilemas(st) { return L(st).pendientes.map(p => { const d = DILEMAS.find(x => x.id === p.id), v = VOZ[d.id]; return { id: d.id, titulo: d.t, texto: d.d, desde: p.fecha, voz: v ? voz(st, v[0]) : null, cita: v ? v[1] : null, opciones: d.ops.map((o, i) => ({ i, t: o.t, d: o.d })) }; }); }
  function resolver(st, id, i) {
    const l = L(st), idx = l.pendientes.findIndex(p => p.id === id), d = DILEMAS.find(x => x.id === id);
    if (idx < 0 || !d || !d.ops[i]) return { ok: false, motivo: 'Decisión no disponible.' };
    const op = d.ops[i], ef = Object.assign({}, op.ef);
    const res = aplicar(st, ef, d.t + ': ' + op.t);
    l.pendientes.splice(idx, 1);
    l.resueltos.push({ id, i, fecha: st.fecha });
    if (l.resueltos.length > 60) l.resueltos.shift();
    l.historia.unshift({ temporada: st.temporada, fecha: st.fecha, tipo: 'decision', texto: d.t + ': ' + op.t + '.' });
    GM.noticia(st, 'Decisión tomada — ' + d.t + ': ' + op.t + '.');
    return { ok: true, efectos: res };
  }
  function gastar(st, coste, motivo) {
    const l = L(st);
    if (l.influencia < coste) return { ok: false, motivo: 'Te falta influencia (' + Math.round(l.influencia) + '/' + coste + ').' };
    l.influencia -= coste; return { ok: true };
  }
  function elecciones(st) {
    const l = L(st), c = st.ciudad[st.clubId];
    const titulos = st.historial.filter(h => h.campeon === st.clubId && h.temporada === st.temporada).length;
    const score = l.alma * 0.35 + c.aficion * 0.25 + c.apoyoAyuntamiento * 0.15 + c.ambiente * 0.1 + Math.min(15, titulos * 8) + (resultadoEq(st) - 50) * 0.3;
    const gana = score >= 45 || GM.rng.next() < 0.1;
    l.mandato.ultima = { temporada: st.temporada, score: Math.round(score), gana };
    if (gana) { l.influencia = U.clamp(l.influencia + 20, 0, 100); l.historia.unshift({ temporada: st.temporada, fecha: st.fecha, tipo: 'mandato', texto: 'Los socios renuevan tu mandato (apoyo estimado ' + Math.round(score) + ' %).' }); GM.noticia(st, 'Elecciones de socios: ¡renuevas el mandato!'); }
    else { l.influencia = Math.max(0, l.influencia - 25); l.alma = Math.max(0, l.alma - 6); l.historia.unshift({ temporada: st.temporada, fecha: st.fecha, tipo: 'mandato', texto: 'Mandato muy cuestionado en las elecciones (apoyo ' + Math.round(score) + ' %): pierdes influencia.' }); GM.noticia(st, 'Elecciones de socios: el mandato queda muy debilitado.'); }
    l.mandato.cuenta++;
    return l.mandato.ultima;
  }
  function resultadoEq(st) {
    const lg = GM.ligasDe(st, st.clubId)[0], t = lg && st.clasificaciones[lg]; if (!t) return 50;
    const r = GM.mods.competiciones.clasificacion(st, lg).findIndex(x => x.equipoId === st.clubId);
    return U.clamp(100 - r / Math.max(1, t.length - 1) * 100, 0, 100);
  }
  function ajustar(st, pil, alma) {
    const lg = L(st); let a = alma || 0;
    for (const k in (pil || {})) a += pil[k] * PILAR_PESO[lg.pilares[k] || 2] * 0.8;
    lg.alma = U.clamp(lg.alma + a, 0, 100);
  }
  function pilares(st) { return Object.keys(PIL).map(k => ({ id: k, nombre: PIL[k], nivel: L(st).pilares[k] })); }
  function fijarPilares(st, altos) {
    const l = L(st); Object.keys(PIL).forEach(k => { l.pilares[k] = altos.indexOf(k) >= 0 ? 3 : 2; });
    const bajo = Object.keys(PIL).find(k => altos.indexOf(k) < 0); if (altos.length === 2) Object.keys(PIL).filter(k => altos.indexOf(k) < 0).forEach(k => { l.pilares[k] = 1; });
  }
  function salaHistoria(st) {
    const l = L(st), titulos = st.historial.filter(h => h.campeon === st.clubId);
    const out = titulos.map(h => ({ temporada: h.temporada, tipo: 'titulo', texto: 'Campeón de ' + GM.compNombre(st, h.comp) + '.' }));
    return { titulos: titulos.length, camisetas: l.camisetas, hitos: out.concat(l.historia).sort((a, b) => (a.fecha || a.temporada) < (b.fecha || b.temporada) ? 1 : -1).slice(0, 60) };
  }

  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!activo(st)) return;
    const l = L(st);
    if (U.weekday(st.fecha) === 1) {
      l.influencia = U.clamp(l.influencia + 0.8 + (l.alma - 50) / 50 + (st.ciudad[st.clubId].apoyoAyuntamiento - 50) / 80, 0, 100);
      l.alma += (50 - l.alma) * 0.004;
    }
    if (U.diffDays(l.ultimo, st.fecha) >= 6 && GM.rng.next() < 0.18) { l.ultimo = st.fecha; nuevoDilema(st); }
    // efemérides
    if (st.clubId === 'joventut-badalona' && st.fecha === '2030-03-30') { st.ciudad[st.clubId].ambiente = Math.min(100, st.ciudad[st.clubId].ambiente + 12); l.alma = Math.min(100, l.alma + 6); l.historia.unshift({ temporada: st.temporada, fecha: st.fecha, tipo: 'hito', texto: 'La Penya celebra su centenario (1930-2030).' }); GM.noticia(st, '¡La Penya cumple 100 años!'); }
  });
  GM.bus.on('temporada:fin', function () {
    const st = GM.state; if (!activo(st)) return;
    const l = L(st);
    const mios = st.historial.filter(h => h.temporada === st.temporada && h.campeon === st.clubId);
    mios.forEach(h => l.historia.unshift({ temporada: st.temporada, fecha: st.fecha, tipo: 'titulo', texto: '🏆 Campeón de ' + GM.compNombre(st, h.comp) + '.' }));
    if (mios.length) l.alma = Math.min(100, l.alma + 4 * mios.length);
    if (l.mandato.cuenta === 0 || (yearOf(st) - l.mandato.inicio) % 2 === 1) elecciones(st);
  });

  function nuevaPartida(st) {
    if (st.modo !== 'presidente') return;
    st.legado = { pilares: { cantera: 2, estilo: 2, arraigo: 2, ambicion: 2 }, alma: 50, influencia: 30, pendientes: [], resueltos: [], historia: [], camisetas: [], mandato: { inicio: 2026, cuenta: 0, ultima: null }, ultimo: st.fecha };
    st.legado.historia.unshift({ temporada: st.temporada, fecha: st.fecha, tipo: 'hito', texto: 'Empieza tu presidencia.' });
  }
  function selfTest() {
    const st = { modo: 'presidente', temporada: '2026-27', fecha: '2026-11-01', clubId: 'a', noticias: [], historial: [], ligas: {}, clasificaciones: {}, equipos: { a: { id: 'a', presupuesto: 20e6, plantilla: [] } }, jugadores: {}, ciudad: { a: { ambiente: 50, aficion: 50, apoyoAyuntamiento: 50, convenios: [], eventos: [] } }, finanzas: { a: { caja: 1e7, movimientos: [], patrocinios: [], temp: { ingresos: 0, gastos: 0 }, historial: [] } } };
    nuevaPartida(st);
    fijarPilares(st, ['cantera', 'arraigo']);
    st.legado.pendientes.push({ id: 'patro-principal', fecha: st.fecha });
    const r = resolver(st, 'patro-principal', 1), l = st.legado;
    const g = gastar(st, 50, 'x'), g2 = gastar(st, 10, 'x');
    return r.ok && l.alma > 50 && st.finanzas.a.patrocinios.length === 1 && !g.ok && g2.ok && l.pilares.cantera === 3 && l.pilares.estilo === 1 && l.pendientes.length === 0;
  }
  GM.register('legado', { voz, ajustar, activo, fijarPilares, pilares, dilemas, resolver, gastar, salaHistoria, retirarCamiseta, elecciones, nuevaPartida, selfTest, PIL });
})();
