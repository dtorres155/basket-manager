/* Conversaciones con los vecinos (punto 28): preguntas y respuestas con opciones, memoria de lo que dijiste y voz por personalidad.
   GM.dialogo.crear(st, n, S) devuelve { nodo(id) }: cada nodo es { texto, opciones: [{ t, id }], fin }. El nodo 'inicio' ofrece tres temas elegidos según el vecino
   (rol, personalidad y su hash), cada tema pregunta algo y las respuestas del jugador cambian lo que dicen los demás: se guardan en st.sede.memoria.temas
   (postura: 'confiado', 'humilde' o 'neutral') y en st.sede.memoria.vecinos (con quién has hablado hoy). La interfaz está en sede3d.js (dialogoVecino). Prueba: node tools/dialogo_prueba.js. */
(function () {
  const U = GM.util;
  const clamp = U.clamp || ((x, a, b) => Math.max(a, Math.min(b, x)));
  const hs = (a, k) => a[(U.hash(k) >>> 0) % a.length];
  const sit = (st, S) => { const club = st.equipos[st.clubId], C = GM.mods.competiciones, g = C && C.proximoPartido ? C.proximoPartido(st, st.clubId) : null, riv = g ? st.equipos[g.local === st.clubId ? g.visitante : g.local] : null;
    const ult = (st.calendario || []).filter(x => x.resultado && (x.local === st.clubId || x.visitante === st.clubId)).pop(), gan = ult ? (ult.local === st.clubId) === (ult.resultado.local > ult.resultado.visitante) : null;
    return { club, riv, g, ult, gan, clima: (S && S.clima) || {}, hora: (S && S.hora) || 12, ciudad: (st.ciudad && st.ciudad[st.clubId]) || { aficion: 50 } }; };
  const mem = st => { st.sede = st.sede || { charlas: {} }; return st.sede.memoria || (st.sede.memoria = { vecinos: {}, temas: {} }); };
  // Voz por personalidad: cambia el tono de lo que dice el vecino
  function voz(p, t) {
    switch (p) {
      case 'seco': return t.split(/(?<=[.?!])\s/)[0];
      case 'bromista': return t + ' (y no, no te cobro por la charla).';
      case 'timido': return '…' + t.charAt(0).toLowerCase() + t.slice(1);
      case 'hablador': return t + ' Y, bueno, ya sabes cómo es esto, uno habla y habla.';
      default: return t;
    }
  }
  const nombreJ = st => (st.personaje && st.personaje.nombre) || 'amigo';

  // ---- Temas. Cada uno: { cond, pregunta(ctx), respuestas: [{ t, post, dice(ctx), efecto }] }
  const TEMAS = {
    tiempo: {
      pregunta: c => hs(c.clima.tipo === 'lluvia' ? ['Menudo día de lluvia, ¿eh?', 'Con este agua no hay quien salga.', 'Llueve y llueve, y yo sin paraguas.'] : c.clima.tipo === 'nieve' ? ['¡Nieve! Hacía años.', 'Con este frío mejor en casa.'] : (c.clima.temp || 18) >= 27 ? ['Qué calor, por favor.', 'Con este sol se derrite uno.', 'Hoy hace un día de heladería.'] : ['Hoy da gusto salir, ¿verdad?', 'Buen día para dar un paseo.', 'Ni frío ni calor, lo ideal.'], c.k + 't'),
      respuestas: [{ t: 'Sí, da gusto.', post: 'neutral', dice: () => 'Eso digo yo.' }, { t: 'Me da igual, yo entreno igual.', post: 'confiado', dice: () => 'Así se habla, la cabeza en lo suyo.' }, { t: 'Hablemos de otra cosa.', post: 'neutral', dice: () => 'Como quieras.' }]
    },
    equipo: {
      pregunta: c => c.riv ? hs(['¿Y el ' + c.riv.nombre + ' qué tal? ¿Podéis con ellos?', 'Vienen los del ' + c.riv.siglas + ', ¿cómo lo veis?', 'Dicen que el ' + c.riv.siglas + ' llega fuerte.'], c.k + 'e') : hs(['¿Cómo va el equipo?', '¿Se ve buen ambiente en el vestuario?'], c.k + 'e'),
      respuestas: [{ t: 'Los vamos a ganar.', post: 'confiado', dice: c => c.hincha ? '¡Eso quería oír!' : 'Ojalá, ojalá.', efecto: { afi: 0.25 } }, { t: 'Será difícil, hay que respetarlos.', post: 'humilde', dice: c => c.hincha ? 'Con humildad se gana más.' : 'Sensato, sí señor.', efecto: { afi: 0.1 } }, { t: 'Ya veremos.', post: 'neutral', dice: () => 'Prudente, prudente.' }]
    },
    resultado: {
      cond: c => !!c.ult,
      pregunta: c => c.gan ? hs(['¡Qué partidazo el último! Aún lo comento en el bar.', 'Ganasteis el otro día y la ciudad lo notó.', 'Se nota que ganasteis: hay mejor humor en la calle.'], c.k + 'r') : hs(['Lo del último partido dolió…', 'Perdisteis el otro día. ¿Qué pasó?', 'Hay que levantarse tras la derrota, ¿no?'], c.k + 'r'),
      respuestas: [{ t: 'Fue mérito de todo el grupo.', post: 'humilde', dice: () => 'Me gusta que lo digas así.', efecto: { afi: 0.2 } }, { t: 'Es lo mínimo que se espera de nosotros.', post: 'confiado', dice: () => 'Exigente, como debe ser.' }, { t: 'No quiero hablar de eso.', post: 'neutral', dice: () => 'Perdona, no quería molestar.' }]
    },
    barrio: {
      pregunta: c => hs(['¿Has probado alguna vez el mercado de por aquí?', '¿Conoces la terraza de la esquina? Hacen un café buenísimo.', 'Esta zona ha cambiado mucho en diez años.', '¿Vives cerca? Yo llevo toda la vida en el barrio.'], c.k + 'b'),
      respuestas: [{ t: 'Me encanta el barrio.', post: 'neutral', dice: () => 'Y a nosotros que estés por aquí.', efecto: { afi: 0.15 } }, { t: 'Todavía lo estoy descubriendo.', post: 'humilde', dice: () => 'Pues pregunta lo que quieras.' }, { t: 'Paso poco por aquí.', post: 'neutral', dice: () => 'Lástima, es bonito.' }]
    },
    ciudad: {
      cond: c => c.ciudad.aficion > 0,
      pregunta: c => c.ciudad.aficion > 70 ? hs(['El club ha puesto la ciudad de moda.', 'Desde que el equipo va bien hay más comercios y más gente.', 'En el bar solo se habla de baloncesto.'], c.k + 'c') : c.ciudad.aficion < 40 ? hs(['A la gente le cuesta ilusionarse con el equipo.', 'Antes había más ambiente en los partidos.'], c.k + 'c') : hs(['La ciudad va a su ritmo, el equipo también.', 'Hay ganas de ver al equipo arriba.'], c.k + 'c'),
      respuestas: [{ t: 'Haremos que se ilusionen.', post: 'confiado', dice: () => 'Ojalá, lo necesitamos.', efecto: { afi: 0.3 } }, { t: 'Gracias por apoyarnos.', post: 'humilde', dice: () => 'Faltaría más.', efecto: { afi: 0.2 } }, { t: 'Cada cosa a su tiempo.', post: 'neutral', dice: () => 'Eso es verdad.' }]
    },
    personal: {
      pregunta: c => c.modo === 'carrera' ? hs(['Oye, ¿tú no eres ' + c.nom + '? ¡Te he visto jugar!', c.nom + ', ¿verdad? Mi sobrino tiene tu camiseta.', '¿Cómo llevas lo de ser conocido por la calle?'], c.k + 'p') : hs(['¿Usted es de los del club, no? Se le ve la pinta.', '¿Cuándo vais a fichar a alguien bueno?', '¿Es verdad lo que dicen del presupuesto?'], c.k + 'p'),
      respuestas: [{ t: 'Sí, soy yo. Encantado.', post: 'humilde', dice: () => 'El gusto es mío.', efecto: { afi: 0.2 } }, { t: 'Es parte del trabajo.', post: 'neutral', dice: () => 'Claro, claro.' }, { t: 'Prefiero pasar desapercibido.', post: 'neutral', dice: () => 'Lo entiendo, no diré nada.' }]
    },
    rumor: {
      pregunta: c => hs(['Dicen que hay movimientos en el mercado de fichajes.', 'He oído que un jugador del equipo está en la agenda de un grande.', 'En el bar dicen que el míster no tiene el puesto seguro.', 'Se comenta que van a hacer obras en el pabellón.'], c.k + 'm'),
      respuestas: [{ t: 'No me creo los rumores.', post: 'humilde', dice: () => 'Haces bien, la mitad son inventos.' }, { t: 'Algo hay, seguro.', post: 'confiado', dice: () => 'Ya me parecía a mí.' }, { t: 'Yo de eso no hablo.', post: 'neutral', dice: () => 'Discreto, me gusta.' }]
    },
    // Específicos de cada rol
    policia: {
      pregunta: c => c.partido ? 'Hoy hay partido: calles cortadas y mucha gente. Si ves algo raro, avísame.' : hs(['Todo tranquilo por aquí, que es lo que nos gusta.', 'Los días de partido esto se llena. Entre semana, un remanso.', 'Cuidado al cruzar, que los coches no perdonan.'], c.k + 'x'),
      respuestas: [{ t: 'Gracias por vuestro trabajo.', post: 'humilde', dice: () => 'Es lo que toca.', efecto: { afi: 0.1 } }, { t: '¿Algún consejo para llegar al pabellón?', post: 'neutral', dice: () => 'Sigue recto por la avenida, no tiene pérdida.' }, { t: 'Buena guardia.', post: 'neutral', dice: () => 'Igualmente.' }]
    },
    repartidor: {
      pregunta: c => hs(['Perdona, voy con prisa: tres paquetes antes de las dos.', 'Entregar en esta zona es un lío con tanta peatonal.', 'Hoy ya llevo cuarenta paquetes. ¡Cuarenta!'], c.k + 'x'),
      respuestas: [{ t: 'Ánimo con el reparto.', post: 'humilde', dice: () => 'Gracias, hace falta.' }, { t: '¿Te ayudo con algo?', post: 'humilde', dice: () => 'Qué amable, pero es mi ruta.', efecto: { afi: 0.15 } }, { t: 'Corre, corre.', post: 'neutral', dice: () => 'Ya me voy, ya me voy.' }]
    },
    comerciante: {
      pregunta: c => hs(['Los días de partido vendo el doble, que se lo digo a todos.', 'El negocio va como va; la gente viene más cuando el equipo gana.', 'Llevo treinta años con la tienda y nunca había visto tanto ambiente.'], c.k + 'x'),
      respuestas: [{ t: 'Pasaré a comprar algo.', post: 'humilde', dice: () => 'Aquí te atenderé bien.', efecto: { afi: 0.15 } }, { t: 'Nos ayudamos entre todos.', post: 'humilde', dice: () => 'Eso es ciudad.' }, { t: 'Suerte con el negocio.', post: 'neutral', dice: () => 'Gracias.' }]
    },
    turista: {
      pregunta: c => hs(['Disculpa, ¿el pabellón del equipo queda cerca? Es lo que más ganas tengo de ver.', 'Es mi primera vez en la ciudad, ¿qué me recomiendas?', '¿Se puede entrar al pabellón o solo hacerse la foto fuera?'], c.k + 'x'),
      respuestas: [{ t: 'Sigue la avenida, es imposible perderse.', post: 'neutral', dice: () => '¡Mil gracias!', efecto: { afi: 0.2 } }, { t: 'Te recomiendo el mercado.', post: 'neutral', dice: () => 'Apuntado.', efecto: { afi: 0.1 } }, { t: 'Lo siento, no soy de aquí.', post: 'neutral', dice: () => 'No pasa nada.' }]
    },
    jubilado: {
      pregunta: c => hs(['En mis tiempos íbamos al pabellón a pie y con la bufanda hasta las orejas.', 'Yo vi jugar aquí a gente que ahora sale en los libros.', 'Antes el baloncesto se vivía de otra forma. Mejor o peor, no sé.'], c.k + 'x'),
      respuestas: [{ t: 'Cuénteme más.', post: 'humilde', dice: () => 'Hay para rato, siéntate.', efecto: { afi: 0.25 } }, { t: 'Seguro que fueron grandes años.', post: 'humilde', dice: () => 'Lo fueron, hijo, lo fueron.' }, { t: 'Tengo prisa, perdone.', post: 'neutral', dice: () => 'Ve, ve, que la juventud no espera.' }]
    }
  };
  const BASE = ['tiempo', 'equipo', 'barrio', 'ciudad', 'personal', 'rumor', 'resultado'];

  function crear(st, n, S) {
    const c = sit(st, S), M = mem(st), nom = nombreJ(st), h = U.hash(n.idV || n.rol || 'v');
    const ctx = Object.assign(c, { k: n.idV || n.rol || 'v', hincha: !!n.hincha, nom, modo: st.modo, partido: !!(S && S.dia && S.dia.tipo === 'partido' && S.dia.casa) });
    // temas del vecino: uno propio de su rol si lo tiene y dos o tres generales según su hash
    const disp = BASE.filter(t => !TEMAS[t].cond || TEMAS[t].cond(ctx)), mios = [];
    if (n.rolEsp && TEMAS[n.rolEsp]) mios.push(n.rolEsp);
    let i = h >>> 3; while (mios.length < 3 && disp.length) { const t = disp.splice(i % disp.length, 1)[0]; mios.push(t); i = (i >>> 2) + 7; }
    let contado = false; const previo = M.vecinos[n.idV], hablados = new Set(), post = tema => M.temas[tema];
    function saludo() {
      const pers = n.pers || 'amable', ya = previo && previo.n > 0;
      const t = ya ? hs(['Ya nos hemos visto, ' + nom + '. ¿De qué quieres hablar?', 'Otra vez por aquí, ' + nom + '.'], ctx.k + 's') : n.rolEsp === 'policia' ? 'Buenas. ¿Necesita algo?' : n.hincha ? '¡Hombre, ' + nom + '! ¿Qué se cuenta?' : hs(['Hola, buenas.', 'Buenas, ¿qué tal?', 'Hola, ' + nom + ', ¿no?'], ctx.k + 's');
      return voz(pers, t);
    }
    function nodoInicio(extra) {
      const ops = mios.filter(t => !hablados.has(t)).map(t => ({ t: ETQ_TEMA[t] || 'Hablar de otra cosa', id: 'tema:' + t }));
      ops.push({ t: 'Despedirse', id: 'fin' });
      return { texto: (extra ? extra + ' ' : '') + saludo(), opciones: ops, titulo: n.nombre || n.rol };
    }
    function nodo(id) {
      if (!id || id === 'inicio') { if (!contado) { contado = true; M.vecinos[n.idV] = { n: (previo ? previo.n : 0) + 1, ult: st.fecha }; } return nodoInicio(); }
      if (id === 'fin') return { texto: voz(n.pers, hs(['Hasta luego, ' + nom + '.', 'Cuídate.', 'Nos vemos por ahí.'], ctx.k + 'f')), opciones: [], fin: true, titulo: n.nombre || n.rol };
      const [tipo, a, b] = id.split(':'), T = TEMAS[a]; if (!T) return nodo('inicio');
      if (tipo === 'tema') {
        hablados.add(a); let t = voz(n.pers, T.pregunta(ctx));
        // memoria: si ya dijiste algo sobre el equipo, se nota
        if (a === 'equipo' && post('equipo') === 'confiado') t = 'Me han dicho que vas diciendo que ganaréis. ' + t; else if (a === 'equipo' && post('equipo') === 'humilde') t = 'Dicen que eres de los que respetan al rival. ' + t;
        return { texto: t, opciones: T.respuestas.map((r, k) => ({ t: r.t, id: 'resp:' + a + ':' + k })), titulo: n.nombre || n.rol };
      }
      if (tipo === 'resp') {
        const r = T.respuestas[+b], ef = r.efecto || {}; M.temas[a] = r.post;
        if (ef.afi) { const ci = st.ciudad && st.ciudad[st.clubId]; if (ci) ci.aficion = clamp(ci.aficion + ef.afi * (previo && previo.n > 2 ? 0.3 : 1), 0, 100); }
        const resto = mios.filter(t => !hablados.has(t)).map(t => ({ t: ETQ_TEMA[t] || 'Otro tema', id: 'tema:' + t })); resto.push({ t: 'Despedirse', id: 'fin' });
        return { texto: voz(n.pers, r.dice(ctx)), opciones: resto, titulo: n.nombre || n.rol, efecto: ef.afi ? 'afición ' + (ef.afi > 0 ? '+' : '') + ef.afi : '' };
      }
      return nodo('inicio');
    }
    return { nodo, temas: mios };
  }
  const ETQ_TEMA = { tiempo: 'Hablar del tiempo', equipo: 'Hablar del equipo', resultado: 'Hablar del último partido', barrio: 'Preguntar por el barrio', ciudad: 'Cómo ve la ciudad', personal: 'Hablar de ti', rumor: 'Preguntar por los rumores', policia: 'Hablar de la seguridad', repartidor: 'Hablar del reparto', comerciante: 'Preguntar por su negocio', turista: 'Ayudarle con la ciudad', jubilado: 'Escuchar sus recuerdos' };
  GM.dialogo = { crear, TEMAS, voz, ETQ_TEMA };
})();
