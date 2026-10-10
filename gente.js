/* GENTE (GM.mods.gente) — personas con nombre con las que hablar por la calle y en tu pueblo
   En la calle del club: una leyenda del club (nombre real en los clubes grandes), el utillero de toda la vida, el presidente
   de la peña y un periodista del diario local. En tu pueblo (modo carrera): tu primer entrenador y el alcalde.
   Cada uno te reconoce según la relación (0-100) y el último resultado, da una charla a la semana con un efecto pequeño
   y te propone encargos (ganar el próximo partido, meter puntos, ir a la peña, empezar una obra) con plazo y premio.
   A los vecinos y aficionados de paso se les puede saludar, firmar un autógrafo o hacerse una foto (hasta 6 al día).
   Famosos de otros mundos (música, cine, cocina, fútbol, empresa, televisión, tenis, redes): ocho personas inventadas por partida que pasan por
   la calle y, en verano, por el pueblo (un par de ellos cada semana, según la fecha). Se les puede charlar, y con buena relación proponerles
   algo (un partido, un vídeo, una cena…) una vez al mes: reputación, ánimo, afición o dinero. Cuando os hacéis amigos te escriben al móvil.
   Estado: state.gente = { rel: {id: n}, charla: {id: fecha}, encargo: {quien, tipo, n, base, hasta} | null, hechos, firmas: {fecha, n} }
   (se crea al usarse). La escena (sede3d.js) coloca a las personas junto a la zona de cada una (`zona`) y pinta la ficha.
   Expone: personas(st, escena), ficha(st, id), casual(st, n), estado(st), selfTest. Emite noticias al cumplir un encargo. */
(function () {
  const U = GM.util;
  // Leyendas reales de algunos clubes (en el resto, una antigua gloria con nombre del país)
  const LEYENDAS = {
    'joventut-badalona': 'Jordi Villacampa', 'fc-barcelona': 'Juan Carlos Navarro', 'real-madrid': 'Felipe Reyes', baskonia: 'Pablo Prigioni',
    unicaja: 'Berni Rodríguez', 'valencia-basket': 'Rafa Martínez', tenerife: 'Javi Beirán', olympiacos: 'Vassilis Spanoulis', panathinaikos: 'Dimitris Diamantidis',
    fenerbahce: 'Ömer Onan', 'anadolu-efes': 'Kerem Tunçeri', 'maccabi-tel-aviv': 'Tal Burstein', 'zalgiris-kaunas': 'Arvydas Sabonis', 'crvena-zvezda': 'Igor Rakočević',
    partizan: 'Vlade Divac', 'virtus-bologna': 'Saša Danilović', 'olimpia-milano': 'Dino Meneghin', 'alba-berlin': 'Henrik Rödl', asvel: 'Tony Parker',
    'los-angeles-lakers': 'Magic Johnson', 'boston-celtics': 'Larry Bird', 'chicago-bulls': 'Scottie Pippen', 'san-antonio-spurs': 'Tim Duncan',
    'dallas-mavericks': 'Dirk Nowitzki', 'new-york-knicks': 'Patrick Ewing', 'miami-heat': 'Udonis Haslem', 'golden-state-warriors': 'Chris Mullin'
  };
  // Por país: [nombres de hombre, nombres de mujer, apellidos]
  const NOMBRES = {
    ES: [['Paco', 'Manolo', 'Josep', 'Toni', 'Jordi', 'Luis'], ['Mari Carmen', 'Pilar', 'Montse', 'Rosa', 'Núria', 'Lola'], ['García', 'Puig', 'Fernández', 'Martí', 'López', 'Serra', 'Romero', 'Vidal']],
    IT: [['Franco', 'Giuseppe', 'Marco', 'Paolo', 'Enzo', 'Luca'], ['Lucia', 'Giulia', 'Carla', 'Anna', 'Paola', 'Rita'], ['Rossi', 'Bianchi', 'Esposito', 'Ferrari', 'Colombo', 'Ricci', 'Greco', 'Conti']],
    GR: [['Giorgos', 'Nikos', 'Kostas', 'Yannis', 'Spyros', 'Petros'], ['Eleni', 'Maria', 'Dimitra', 'Sofia', 'Katerina', 'Anna'], ['Papadopoulos', 'Nikolaidis', 'Georgiou', 'Pappas', 'Vlachos', 'Ioannou', 'Makris', 'Antoniou']],
    TR: [['Mehmet', 'Ahmet', 'Mustafa', 'Emre', 'Hakan', 'Murat'], ['Ayşe', 'Fatma', 'Zeynep', 'Elif', 'Emine', 'Selin'], ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Aydın', 'Öztürk', 'Arslan']],
    DE: [['Klaus', 'Jürgen', 'Thomas', 'Uwe', 'Stefan', 'Frank'], ['Sabine', 'Petra', 'Anke', 'Monika', 'Heike', 'Birgit'], ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Wagner', 'Becker', 'Hoffmann']],
    FR: [['Jean', 'Michel', 'Pierre', 'Alain', 'Didier', 'Éric'], ['Nathalie', 'Sylvie', 'Claire', 'Isabelle', 'Sophie', 'Martine'], ['Martin', 'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Girard', 'Roux', 'Fournier']],
    US: [['Mike', 'Earl', 'Ray', 'Tony', 'Willie', 'Dave'], ['Linda', 'Donna', 'Carol', 'Pam', 'Denise', 'Gloria'], ['Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Jackson']],
    LT: [['Jonas', 'Rimas', 'Darius', 'Tomas', 'Mindaugas', 'Saulius'], ['Rūta', 'Asta', 'Inga', 'Jurgita', 'Laima', 'Daiva'], ['Kazlauskas', 'Petrauskas', 'Jankauskas', 'Stankevičius', 'Vasiliauskas', 'Žukauskas', 'Butkus', 'Paulauskas']],
    RS: [['Dragan', 'Milan', 'Zoran', 'Nenad', 'Goran', 'Dejan'], ['Jelena', 'Vesna', 'Ivana', 'Milica', 'Snežana', 'Dragana'], ['Jovanović', 'Petrović', 'Nikolić', 'Marković', 'Đorđević', 'Stojanović', 'Ilić', 'Pavlović']],
    IL: [['Moshe', 'Yossi', 'Avi', 'Eli', 'Shlomo', 'Dudi'], ['Rina', 'Dana', 'Noa', 'Michal', 'Orit', 'Yael'], ['Cohen', 'Levi', 'Mizrahi', 'Peretz', 'Biton', 'Dahan', 'Friedman', 'Azulay']]
  };
  // mujer: true/false; el apellido cambia con el hash para que no se repitan entre personas del mismo sitio
  const nombreDe = (pais, h, mujer) => { const L = NOMBRES[pais] || NOMBRES.ES; return L[mujer ? 1 : 0][h % 6] + ' ' + L[2][(h >>> 4) % 8]; };
  const esMujer = (h, k) => ((h >>> (k * 3)) & 7) < 3;   // alrededor de un 40 %
  const G = st => st.gente || (st.gente = { rel: {}, charla: {}, encargo: null, hechos: 0, firmas: { fecha: '', n: 0 } });
  const rel = (st, id) => { const g = G(st); return g.rel[id] === undefined ? 40 : g.rel[id]; };
  const subeRel = (st, id, d) => {
    const g = G(st), antes = rel(st, id); g.rel[id] = U.clamp(antes + d, 0, 100);
    // Un famoso con el que ya tienes confianza (60) te escribe al móvil
    if (id.indexOf('f_') === 0 && antes < 60 && g.rel[id] >= 60 && st.modo === 'carrera' && GM.mods.movil && GM.mods.movil.enviar) { const f = buscar(st, id) || ESPECIALES.map(e => famoso(st, e)).find(e => e.id === id); if (f) GM.mods.movil.enviar(st, 'amigos', f.nombre + ' (' + f.rol.toLowerCase() + '): «Oye, me caes genial. Si un día te pasas por mi mundo, avísame.»'); }
  };
  const carrera = st => st.modo === 'carrera' && !!st.carrera;
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const dia = iso => +iso.slice(8) + ' de ' + MESES[+iso.slice(5, 7) - 1];
  const elige = (st, id, lista) => lista[(U.hash(st.fecha + id) >>> 0) % lista.length];

  // Quién hay en cada escena. zona: id de la sala junto a la que se coloca; aspecto: opciones del modelo 3D
  function personasBase(st, escena) {
    const club = st.equipos[st.clubId], h = U.hash(st.clubId + 'gente') >>> 0, nom = (k, m) => nombreDe(club.pais, (h + k * 977) >>> 0, m), c1 = club.colores[0], c2 = club.colores[1] || '#222222';
    const mP = esMujer(h, 1), mR = esMujer(h, 2);
    if (escena === 'calle') return [
      { id: 'leyenda', nombre: LEYENDAS[st.clubId] || nom(1, false), rol: 'Leyenda del ' + club.siglas, zona: 'pabellon', aspecto: { modelo: 'h-suit', altura: 198, piel: '#e0ac85', pelo: '#8a8a8a' } },
      { id: 'utillero', nombre: nom(2, false), rol: 'Utillero de toda la vida', zona: 'sede_calle', aspecto: { modelo: 'h-casual_hoodie', altura: 170, piel: '#f1c7a5', pelo: '#bdbdbd', ropa: [c1, c2] } },
      { id: 'pena', nombre: nom(3, mP), rol: (mP ? 'Presidenta' : 'Presidente') + ' de la peña', zona: 'pena', aspecto: { modelo: mP ? 'm-casual' : 'h-casual_2', altura: 176, piel: '#c68863', pelo: '#1d1510', ropa: [c1, c2] } },
      { id: 'periodista', nombre: nom(4, mR), rol: 'Periodista del Diario de ' + club.ciudad, zona: 'kiosco', aspecto: { modelo: mR ? 'm-formal' : 'h-casual_2', altura: 168, piel: '#f1c7a5', pelo: '#3b2617' } }
    ];
    if (escena === 'pueblo' && carrera(st) && st.carrera.pueblo) { const p = st.carrera.pueblo, hp = U.hash(p.nombre + 'gente') >>> 0, nac = p.nac === 'ES' || !p.nac ? 'ES' : p.nac, mE = esMujer(hp, 1), mA = esMujer(hp, 2);
      return [
        { id: 'mister', nombre: nombreDe(nac, hp, mE), rol: mE ? 'Tu primera entrenadora' : 'Tu primer entrenador', zona: 'pueblo_canasta', aspecto: { modelo: mE ? 'm-casual' : 'h-casual_2', altura: 180, piel: '#e0ac85', pelo: '#bdbdbd' } },
        { id: 'alcalde', nombre: nombreDe(nac, (hp + 3121) >>> 0, mA), rol: (mA ? 'Alcaldesa' : 'Alcalde') + ' de ' + p.nombre, zona: 'pueblo_plaza', aspecto: { modelo: mA ? 'm-suit' : 'h-suit', altura: 172, piel: '#f1c7a5', pelo: '#6a4425' } }
      ]; }
    return [];
  }
  // ---------- Famosos ----------
  const ESPECIALES = [
    { id: 'f_musica', rol: 'Cantante de éxito', ambito: 'música', zona: 'terraza', mujer: true, modelo: 'm-casual', altura: 168, pelo: '#7a1f3d',
      acc: { t: 'Invitarle a un partido', d: 'Sale en las redes con la camiseta del club', carrera: [['fama', 1.2], ['moral', 3]], gestor: [['aficion', 2.5]], texto: 'Se hace una foto contigo desde el palco y la sube a sus redes.' } },
    { id: 'f_cine', rol: 'Actor de cine', ambito: 'cine', zona: 'heladeria', mujer: false, modelo: 'h-suit', altura: 183, pelo: '#2a1d14',
      acc: { t: 'Pedirle consejo sobre la fama', d: 'Aprendes a llevar la atención', carrera: [['moral', 4], ['fama', 0.5]], gestor: [['ambiente', 2]], texto: 'Te da un par de trucos para que la fama no te coma: «Di que no a la mitad».' } },
    { id: 'f_cocina', rol: 'Chef con tres estrellas', ambito: 'cocina', zona: 'mercado', mujer: false, modelo: 'h-casual_2', altura: 175, pelo: '#d8d8d8',
      acc: { t: 'Cena en su restaurante', d: 'Un menú pensado para deportistas', carrera: [['moral', 6], ['forma', 6]], gestor: [['vestuario', 4]], texto: 'Te prepara un menú de cinco platos «para competir» y te enseña a cocinar arroz como Dios manda.' } },
    { id: 'f_futbol', rol: 'Futbolista internacional', ambito: 'fútbol', zona: 'parque', mujer: false, modelo: 'h-casual_hoodie', altura: 181, pelo: '#101010',
      acc: { t: 'Entrenar juntos una mañana', d: 'Un día de trabajo físico distinto', carrera: [['xp', 0.15], ['moral', 2]], gestor: [['vestuario', 2]], texto: 'Sudáis juntos una mañana entera: él te enseña a repartir esfuerzos y tú le haces probar un par de tiros.' } },
    { id: 'f_empresa', rol: 'Empresaria tecnológica', ambito: 'empresa', zona: 'tienda', mujer: true, modelo: 'm-formal', altura: 172, pelo: '#3b2617',
      acc: { t: 'Pedirle consejo de negocios', d: 'Un buen contacto', carrera: [['dinero', 40]], gestor: [['caja', 60000]], texto: 'Te explica cómo invertir con cabeza y te presenta a un contacto que te hace ganar algo de dinero.' } },
    { id: 'f_tele', rol: 'Presentador de televisión', ambito: 'televisión', zona: 'kiosco', mujer: false, modelo: 'h-suit', altura: 177, pelo: '#4a3a2a',
      acc: { t: 'Salir en su programa', d: 'Una noche de audiencia', carrera: [['fama', 2], ['moral', 2]], gestor: [['aficion', 3]], texto: 'Pasas por su programa de la noche: la gente del barrio te para por la calle al día siguiente.' } },
    { id: 'f_tenis', rol: 'Tenista del top 10', ambito: 'tenis', zona: 'parque', mujer: true, modelo: 'm-casual', altura: 176, pelo: '#c9a24b',
      acc: { t: 'Partido de exhibición', d: 'Un rato de competición amistosa', carrera: [['fama', 1], ['moral', 3]], gestor: [['ambiente', 2]], texto: 'Jugáis una exhibición de tenis contra baloncesto, con medio pueblo mirando. Gana ella, claro.' } },
    { id: 'f_redes', rol: 'Creadora de contenido', ambito: 'redes', zona: 'terraza', mujer: true, modelo: 'm-casual', altura: 165, pelo: '#a83a8c',
      acc: { t: 'Hacer un vídeo juntos', d: 'Más seguidores', carrera: [['fama', 1.5], ['moral', 1]], gestor: [['ambiente', 2]], texto: 'Grabáis un reto de triples que en dos días tiene un millón de visitas.' } }
  ];
  const famoso = (st, e) => {
    const h = U.hash(st.clubId + e.id + 'famoso') >>> 0, pais = (st.equipos[st.clubId] || {}).pais || 'ES', L = NOMBRES[pais] || NOMBRES.ES;
    return Object.assign({}, e, { famoso: true, nombre: L[e.mujer ? 1 : 0][h % 6] + ' ' + L[2][(h >>> 4) % 8], aspecto: { modelo: e.modelo, altura: e.altura, piel: ['#f1c7a5', '#e0ac85', '#c68863', '#8d5a3b'][(h >>> 8) % 4], pelo: e.pelo } });
  };
  // Quién pasa hoy por la escena: en la calle, ~una de cada cuatro semanas cada uno (máximo dos a la vez); en el pueblo, uno en verano
  function famososHoy(st, escena) {
    const sem = Math.floor(U.diffDays('2026-01-01', st.fecha) / 7), mes = +st.fecha.slice(5, 7);
    if (escena === 'calle') return ESPECIALES.filter(e => (U.hash(e.id + sem + st.clubId) >>> 0) % 4 === 0).slice(0, 2).map(e => famoso(st, e));
    if (escena === 'pueblo' && carrera(st) && (mes === 7 || mes === 8)) { const e = ESPECIALES[(U.hash('pueblo' + sem + st.clubId) >>> 0) % ESPECIALES.length]; return [Object.assign(famoso(st, e), { zona: 'pueblo_plaza' })]; }
    return [];
  }
  const personas = (st, escena) => personasBase(st, escena).concat(famososHoy(st, escena).map(f => ({ id: f.id, nombre: f.nombre, rol: f.rol, zona: f.zona, aspecto: f.aspecto, famoso: true, ambito: f.ambito })));
  const buscar = (st, id) => personas(st, 'calle').concat(personas(st, 'pueblo')).find(p => p.id === id);

  // Último partido del club del usuario (para comentarlo)
  function ultimo(st) {
    let g = null; st.calendario.forEach(x => { if (x.resultado && (x.local === st.clubId || x.visitante === st.clubId) && (!g || x.fecha > g.fecha)) g = x; });
    if (!g) return null; const loc = g.local === st.clubId, nos = loc ? g.resultado.local : g.resultado.visitante, ellos = loc ? g.resultado.visitante : g.resultado.local;
    return { gana: nos > ellos, nos, ellos, rival: st.equipos[loc ? g.visitante : g.local], fecha: g.fecha };
  }
  // Lo que te dice al acercarte: depende de quién es, la relación y el último partido
  function saludo(st, d) {
    const r = rel(st, d.id), u = ultimo(st), yo = carrera(st), riv = u && u.rival ? u.rival.siglas : '', c = st.equipos[st.clubId];
    const frio = r < 20, amigo = r >= 65;
    const T = {
      leyenda: frio ? ['Ya nos veremos.', 'Tengo prisa, perdona.'] : u && !u.gana ? ['Contra el ' + riv + ' faltó carácter. Esto es el ' + c.siglas + ', aquí no se regala nada.', 'Yo también perdí partidos así. Se aprende más de estas.'] : amigo ? ['¡Hombre! Siéntate, que te cuento cómo ganamos la primera liga.', 'Me recuerdas a mí de joven. No lo estropees.'] : ['Este escudo pesa. Llévalo con orgullo.', yo ? 'Te he visto jugar. Tienes manos, pero hay que defender.' : 'Cuida la cantera. Ahí está todo.'],
      utillero: frio ? ['Hoy no tengo el día.', 'Las zapatillas no se lavan solas…'] : amigo ? ['Te he guardado las toallas buenas.', 'Treinta años en este vestuario y como tú, pocos.'] : ['Si necesitas algo del vestuario, aquí estoy.', u && u.gana ? '¡Qué alegría ganar al ' + riv + '! El vestuario estaba como loco.' : 'Ánimo, que esto es muy largo.'],
      pena: frio ? ['La peña está mosqueada contigo.', 'Ya hablaremos…'] : u && !u.gana ? ['La gente está calentita después de lo del ' + riv + '.', 'Hay que darle una alegría a la afición.'] : ['¡Nuestro ídolo! Pásate por el bar cuando quieras.', 'Este año vamos a llenar el pabellón.'],
      periodista: frio ? ['Sin comentarios, ¿no? Ya escribiré lo que vea.', 'Mi diario no olvida.'] : ['¿Tienes un minuto para el Diario?', u ? (u.gana ? 'Gran victoria ante el ' + riv + '. ¿Qué cambió?' : '¿Qué pasó contra el ' + riv + '?') : '¿Cómo ves la temporada?'],
      mister: amigo ? ['Cuando te veo por la tele se me cae la lágrima.', 'Siempre supe que llegarías lejos.'] : ['¿Te acuerdas de cuando no llegabas al aro?', 'Sigue trabajando el tiro, como te enseñé.'],
      alcalde: amigo ? ['Eres el mejor embajador que ha tenido este pueblo.', 'El pueblo entero te sigue.'] : ['Hay proyectos para el pueblo, si quieres ayudar.', 'A ver si un día nos haces una visita oficial.']
    };
    if (d.famoso) return frio ? (((U.hash(st.fecha + d.id) >>> 0) % 2) ? '¿Nos conocemos?' : 'Perdona, tengo prisa.') : amigo ? '¡Qué alegría verte! ¿Tomamos algo?' : u && u.gana ? '¡Enhorabuena por el partido contra el ' + riv + '!' : '¡Hombre, un deportista de la ciudad! Encantado.';
    return elige(st, d.id, T[d.id] || ['Hola.']);
  }

  // Encargos: uno activo cada vez, con plazo
  const TIPOS = {
    ganar: { t: 'Ganad el próximo partido', dias: 10 },
    casa: { t: 'Ganad el próximo partido en casa', dias: 21 },
    puntos: { t: n => 'Mete ' + n + ' puntos o más en el próximo partido', dias: 10 },
    pena: { t: 'Pásate por el bar de la peña esta semana', dias: 7 },
    obra: { t: 'Empieza una obra en el pueblo este mes', dias: 30 }
  };
  function encargoDe(st, id) {
    const yo = st.jugadores.yo;
    const media = () => { const e = st.estadisticas && st.estadisticas.yo; return e && e.pj ? e.pts / e.pj : 6; };
    switch (id) {
      case 'leyenda': return carrera(st) && yo ? { tipo: 'puntos', n: Math.max(8, Math.round(media() + 4)) } : { tipo: 'ganar' };
      case 'utillero': return { tipo: 'casa' };
      case 'pena': return { tipo: 'pena' };
      case 'mister': return carrera(st) ? { tipo: 'puntos', n: Math.max(6, Math.round(media() + 2)) } : null;
      case 'alcalde': return carrera(st) ? { tipo: 'obra' } : null;
      default: return null;
    }
  }
  const textoEnc = e => { const T = TIPOS[e.tipo]; return typeof T.t === 'function' ? T.t(e.n) : T.t; };
  const obrasPueblo = st => { const p = st.carrera && st.carrera.pueblo; return p ? (p.obras || []).length + p.edificios.reduce((a, b) => a + b.nivel, 0) : 0; };

  // Efecto de una charla o de un encargo cumplido (k: 1 charla, 4 encargo)
  function premio(st, id, k) {
    const ef = [];
    if (id.indexOf('f_') === 0) { if (carrera(st)) { st.carrera.fama = st.carrera.fama + 0.05 * k; st.carrera.moral = U.clamp(st.carrera.moral + 0.5 * k, 0, 100); ef.push('reputación'); } return ef; }
    if (carrera(st)) {
      const c = st.carrera;
      if (id === 'leyenda' || id === 'mister') { st.jugadores.yo.xp = (st.jugadores.yo.xp || 0) + 0.01 * k; c.moral = U.clamp(c.moral + k, 0, 100); ef.push('progresión', 'ánimo'); }
      if (id === 'utillero') { c.moral = U.clamp(c.moral + 2 * k, 0, 100); ef.push('ánimo'); }
      if (id === 'pena' || id === 'periodista') { c.fama = c.fama + 0.15 * k; ef.push('reputación'); }
      if (id === 'alcalde' && c.pueblo) { c.pueblo.cariño = U.clamp(c.pueblo.cariño + 1.5 * k, 0, 100); ef.push('cariño del pueblo'); }
    } else {
      const ci = st.ciudad && st.ciudad[st.clubId];
      if (ci) { if (id === 'pena' || id === 'leyenda') { ci.aficion = U.clamp(ci.aficion + 0.8 * k, 0, 100); ef.push('afición'); } if (id === 'periodista') { ci.ambiente = U.clamp((ci.ambiente || 50) + 0.8 * k, 0, 100); ef.push('ambiente'); } }
      if (id === 'utillero') { const eq = st.equipos[st.clubId]; eq.plantilla.forEach(pid => { const p = st.jugadores[pid]; if (p && p.estado) p.estado.moral = Math.min(100, p.estado.moral + 0.5 * k); }); ef.push('ánimo del vestuario'); }
    }
    return ef;
  }

  // Ficha de una persona: texto y acciones { t, d, disponible, motivo, fn } (fn devuelve { ok, texto })
  function ficha(st, id) {
    const d = buscar(st, id); if (!d) return null;
    const g = G(st), r = rel(st, id), ult = g.charla[id], puede = !ult || U.diffDays(ult, st.fecha) >= 7, enc = g.encargo, mio = enc && enc.quien === id;
    const acciones = [{ t: 'Charlar', d: 'Una vez por semana: mejora la relación', disponible: puede, motivo: 'Ya habéis hablado esta semana',
      fn: () => { g.charla[id] = st.fecha; subeRel(st, id, 6); const ef = premio(st, id, 1); return { ok: true, texto: charla(st, d), efectos: ef }; } }];
    if (id === 'periodista') acciones.push({ t: 'Darle una exclusiva', d: 'Más reputación, pero al vestuario no le gustan las filtraciones', disponible: puede, motivo: 'Vuelve la semana que viene',
      fn: () => { g.charla[id] = st.fecha; subeRel(st, id, 12); if (carrera(st)) { st.carrera.fama = st.carrera.fama + 0.5; st.carrera.moral = U.clamp(st.carrera.moral - 2, 0, 100); } else { const ci = st.ciudad && st.ciudad[st.clubId]; if (ci) ci.aficion = U.clamp(ci.aficion + 2, 0, 100); } subeRel(st, 'utillero', -4); return { ok: true, texto: 'Mañana sales en portada del Diario.' }; } });
    if (d.famoso) acciones.push(especial(st, d, r));
    else {
      const nuevo = !enc && encargoDe(st, id);
      if (mio) acciones.push({ t: 'Encargo: ' + textoEnc(enc), d: 'Plazo hasta el ' + dia(enc.hasta), disponible: false, motivo: 'En marcha: plazo hasta el ' + dia(enc.hasta), fn: () => ({ ok: false }) });
      else if (nuevo && r >= 25) acciones.push({ t: 'Aceptar encargo: ' + textoEnc(nuevo), d: 'Si lo cumples, mejora mucho la relación y hay premio', disponible: true,
        fn: () => { g.encargo = Object.assign({ quien: id, hasta: U.addDays(st.fecha, TIPOS[nuevo.tipo].dias), base: nuevo.tipo === 'obra' ? obrasPueblo(st) : 0 }, nuevo); return { ok: true, texto: '¡Trato hecho!' }; } });
      else if (enc && !mio) acciones.push({ t: 'Tiene algo que pedirte', d: '', disponible: false, motivo: 'Termina antes el encargo de ' + ((buscar(st, enc.quien) || {}).nombre || 'otra persona'), fn: () => ({ ok: false }) });
      else if (nuevo) acciones.push({ t: 'Tiene algo que pedirte', d: '', disponible: false, motivo: 'Todavía no hay confianza: charlad un poco más', fn: () => ({ ok: false }) });
    }
    return { nombre: d.nombre, rol: d.rol, rel: r, relTexto: r >= 80 ? 'Te adora' : r >= 60 ? 'Buena relación' : r >= 35 ? 'Cordial' : r >= 20 ? 'Distante' : 'Mosqueado', texto: saludo(st, d), acciones };
  }
  // Acción propia de cada famoso: hace falta buena relación (45) y vale una vez al mes
  function especial(st, d, r) {
    const g = G(st), e = ESPECIALES.find(x => x.id === d.id), ult = (g.especial || (g.especial = {}))[d.id], libre = !ult || U.diffDays(ult, st.fecha) >= 30, a = e.acc;
    return { t: a.t, d: a.d, disponible: r >= 45 && libre, motivo: r < 45 ? 'Todavía no hay confianza: charlad un poco más' : 'Ya lo habéis hecho este mes',
      fn: () => {
        g.especial[d.id] = st.fecha; subeRel(st, d.id, 10); const ef = [];
        if (carrera(st)) {
          const c = st.carrera, p = st.jugadores.yo;
          a.carrera.forEach(([k, v]) => {
            if (k === 'fama') c.fama = c.fama + v; else if (k === 'moral') c.moral = U.clamp(c.moral + v, 0, 100); else if (k === 'dinero') c.dinero += v;
            else if (k === 'forma') p.estado.forma = Math.min(100, p.estado.forma + v); else if (k === 'xp') p.xp = (p.xp || 0) + v;
            ef.push(k === 'fama' ? 'reputación' : k === 'moral' ? 'ánimo' : k === 'dinero' ? 'dinero' : k === 'forma' ? 'forma' : 'progresión');
          });
        } else {
          const ci = st.ciudad && st.ciudad[st.clubId], eq = st.equipos[st.clubId];
          a.gestor.forEach(([k, v]) => {
            if (k === 'aficion' && ci) { ci.aficion = U.clamp(ci.aficion + v, 0, 100); ef.push('afición'); }
            else if (k === 'ambiente' && ci) { ci.ambiente = U.clamp((ci.ambiente || 50) + v, 0, 100); ef.push('ambiente'); }
            else if (k === 'vestuario') { eq.plantilla.forEach(pid => { const p = st.jugadores[pid]; if (p && p.estado) p.estado.moral = Math.min(100, p.estado.moral + v); }); ef.push('ánimo del vestuario'); }
            else if (k === 'caja' && GM.mods.finanzas) { GM.mods.finanzas.registrar(st, st.clubId, 'Mecenazgo de ' + d.nombre, v); ef.push('caja'); }
          });
        }
        return { ok: true, texto: a.texto, efectos: ef };
      } };
  }
  const CHARLA_FAMOSO = {
    música: ['Te cuenta cómo se prepara un concierto de estadio.', 'Te canta dos versos de su próximo disco.'], cine: ['Te cuenta una anécdota de un rodaje en la nieve.', 'Te pregunta cómo se aprende a tirar de tres.'],
    cocina: ['Te explica por qué el arroz necesita reposo.', 'Te habla de la disciplina de una cocina de noche.'], fútbol: ['Compara la presión de un Mundial con la de un último tiro.', 'Te pregunta por los entrenamientos de baloncesto.'],
    empresa: ['Te habla de cómo decidir con poca información.', 'Te cuenta cómo empezó con tres empleados.'], televisión: ['Te cuenta lo que pasa detrás de las cámaras.', 'Te ofrece venir a su programa algún día.'],
    tenis: ['Compara el tenis y el baloncesto: «el tuyo es de equipo».', 'Te cuenta cómo lleva viajar once meses al año.'], redes: ['Te enseña cómo se cuenta una historia en quince segundos.', 'Te pide un reto de triples para su canal.']
  };
  function charla(st, d) {
    if (d.famoso) return elige(st, d.id + 'c', CHARLA_FAMOSO[d.ambito] || ['Charláis un rato.']);
    const L = {
      leyenda: ['Te cuenta la final que ganó en el último segundo.', 'Te enseña un truco para leer el bloqueo directo.', 'Te habla de la presión de ganar en esta ciudad.'],
      utillero: ['Te cuenta anécdotas del vestuario de hace veinte años.', 'Te enseña la camiseta firmada que guarda en el almacén.', 'Te recomienda unas plantillas para los tobillos.'],
      pena: ['Te invita a una caña y te enseña el tifo del próximo partido.', 'Te cuenta cómo viajan en autobús a los partidos fuera.', 'Te pide un saludo en vídeo para la cena de la peña.'],
      periodista: ['Charláis de baloncesto sin grabadora.', 'Te cuenta los rumores del mercado.', 'Te pregunta por tu infancia para un reportaje.'],
      mister: ['Recordáis el primer partido que ganaste de pequeño.', 'Te corrige la mecánica de tiro como cuando tenías diez años.', 'Te cuenta cómo van los chavales del equipo del pueblo.'],
      alcalde: ['Te enseña los planos del pueblo.', 'Te cuenta qué piden los vecinos.', 'Te invita a las fiestas mayores.']
    }[d.id] || ['Charláis un rato.'];
    return elige(st, d.id + 'c', L);
  }

  // Vecinos y aficionados de paso: saludar, autógrafo o foto (máximo 6 al día)
  function casual(st, n) {
    const g = G(st), hoy = st.fecha; if (g.firmas.fecha !== hoy) g.firmas = { fecha: hoy, n: 0 };
    const quedan = 6 - g.firmas.n, club = st.equipos[st.clubId], yo = carrera(st);
    const sal = n.hincha ? ['¡Vamos ' + club.siglas + '!', '¡Eres de los nuestros!', '¡Este año sí!'] : ['Buenos días.', '¡Qué buen tiempo hace hoy!', 'Saludos a la familia.'];
    const acc = [{ t: 'Saludar', d: '', disponible: true, fn: () => ({ ok: true, texto: sal[(Math.random() * sal.length) | 0], bocadillo: true }) }];
    if (n.hincha || n.vecino) acc.push({ t: yo ? 'Firmar un autógrafo' : 'Hacerse una foto', d: yo ? 'Un poco de reputación' : 'Un poco de afición', disponible: quedan > 0, motivo: 'Por hoy ya has firmado bastante',
      fn: () => { g.firmas.n++; if (yo) { st.carrera.fama = st.carrera.fama + 0.03; st.carrera.moral = U.clamp(st.carrera.moral + 0.5, 0, 100); if (n.vecino && st.carrera.pueblo) st.carrera.pueblo.cariño = U.clamp(st.carrera.pueblo.cariño + 0.3, 0, 100); } else { const ci = st.ciudad && st.ciudad[st.clubId]; if (ci) ci.aficion = U.clamp(ci.aficion + 0.2, 0, 100); } return { ok: true, texto: '¡Muchas gracias! Esto lo enmarco.', bocadillo: true }; } });
    return acc;
  }

  // Resolver encargos: partidos del club, visita a la peña, obras del pueblo y plazos
  function cumplir(st, ok) {
    const g = G(st), e = g.encargo; if (!e) return; const d = buscar(st, e.quien) || { nombre: 'Alguien' };
    g.encargo = null;
    if (ok) { g.hechos++; subeRel(st, e.quien, 18); const ef = premio(st, e.quien, 4); GM.noticia && GM.noticia(st, d.nombre + ' te da las gracias: cumpliste el encargo («' + textoEnc(e).toLowerCase() + '»). ' + (ef.length ? 'Sube ' + ef.join(', ') + '.' : '')); }
    else { subeRel(st, e.quien, -8); GM.noticia && GM.noticia(st, d.nombre + ' se queda con las ganas: no cumpliste el encargo («' + textoEnc(e).toLowerCase() + '»).'); }
  }
  GM.bus.on('partido:jugado', ({ partido: p }) => {
    const st = GM.state; if (!st || !st.gente || !st.gente.encargo || !p.resultado) return; const e = st.gente.encargo;
    if (p.local !== st.clubId && p.visitante !== st.clubId) return;
    const gana = (p.local === st.clubId) === (p.resultado.local > p.resultado.visitante);
    if (e.tipo === 'ganar') cumplir(st, gana);
    else if (e.tipo === 'casa' && p.local === st.clubId) cumplir(st, gana);
    else if (e.tipo === 'puntos') { const s = p.resultado.stats && p.resultado.stats.yo; if (s && s.min > 0) cumplir(st, s.pts >= e.n); }
  });
  GM.bus.on('sala:abierta', ({ id }) => { const st = GM.state; if (st && st.gente && st.gente.encargo && st.gente.encargo.tipo === 'pena' && id === 'pena') cumplir(st, true); });
  GM.bus.on('dia:avanzado', () => {
    const st = GM.state; if (!st || !st.gente || !st.gente.encargo) return; const e = st.gente.encargo;
    if (e.tipo === 'obra' && obrasPueblo(st) > e.base) return cumplir(st, true);
    if (st.fecha > e.hasta) cumplir(st, false);
  });
  function estado(st) { const g = G(st); return { encargo: g.encargo ? Object.assign({ texto: textoEnc(g.encargo), de: (buscar(st, g.encargo.quien) || {}).nombre }, g.encargo) : null, hechos: g.hechos, rel: Object.assign({}, g.rel) }; }

  function selfTest() {
    const st = { modo: 'gestor', clubId: 'x', fecha: '2026-10-01', calendario: [], estadisticas: {}, jugadores: {}, equipos: { x: { siglas: 'X', ciudad: 'Villa', pais: 'ES', colores: ['#123456', '#ffffff'], plantilla: [] } }, ciudad: { x: { aficion: 50, ambiente: 50 } } };
    const ps = personas(st, 'calle'), f = ficha(st, 'pena');
    return ps.filter(q => !q.famoso).length === 4 && f && f.acciones.length >= 2 && f.acciones[0].fn().ok && !ficha(st, 'pena').acciones[0].disponible;
  }
  GM.register('gente', { personas, famososHoy, ficha, casual, estado, selfTest });
})();
