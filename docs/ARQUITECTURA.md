# Arquitectura

Resumen: un núcleo (`core.js`) con RNG, bus de eventos, utilidades y `newGame`; módulos de datos (`datos_*.js`) que rellenan `GM.data`; módulos de lógica y de interfaz que se registran en `GM.mods`; `build.js` concatena todo en `dist/index.html` y copia `vendor/` (Three.js y fuentes) a `dist/`.

## Eventos del bus

| Evento | Quién lo emite | Para qué |
|---|---|---|
| `dia:avanzado` | `competiciones.jugarDia` | tick diario; la mayoría de módulos cuelgan aquí su vida continua |
| `partido:jugado` | `competiciones.jugarDia` | tras simular cada partido (finanzas, ciudad, rivalidades, carrera) |
| `temporada:fin` | `competiciones.finTemporada` | draft, contratos, progresión anual, ofertas |
| `temporada:nueva` | `competiciones.nuevaTemporada` | reinicio de copas, competiciones europeas y calendario |
| `partida:cargada` | `guardado` | reinstalar accesores y refrescar la interfaz |
| `fichaje:hecho`, `instalacion:mejorada`, `dinero:cambio`, `copa:fin` | varios | notificaciones entre módulos |
| `sala:abierta` | `sede3d.abrirSala` | se abre una zona del mundo (encargos de `gente.js`) |
| `evento:elegido` | `carrera.elegirEvento` | una decisión personal resuelta (estilo.js) |
| `social:hecho` | `social.hacer` | una acción de la vida social (estilo.js) |
| `guardado:auto` | `guardado.guardar(0)` | autoguardado hecho (copias.js) |

## Forma del estado (GM.state)

Objeto único y serializable (JSON): se guarda tal cual en localStorage (ranuras gm1:slot0..2) y se exporta como texto con prefijo `GM1:`. No guardes funciones ni referencias circulares en él.

**Modo `gestor`**, claves de primer nivel: `version`, `seed`, `fecha`, `temporada`, `clubId`, `equipos`, `jugadores`, `ligas`, `modo`, `opciones`, `personaje`, `calendario`, `clasificaciones`, `playoffs`, `estadisticas`, `historial`, `mercado`, `finanzas`, `instalaciones`, `ciudad`, `cantera`, `noticias`, `pendReg`, `seq`, `temporadaTerminada`, `fans`, `copas`, `rivalidades`, `continental`.

**Modo `presidente`**, claves de primer nivel: `version`, `seed`, `fecha`, `temporada`, `clubId`, `equipos`, `jugadores`, `ligas`, `modo`, `opciones`, `personaje`, `calendario`, `clasificaciones`, `playoffs`, `estadisticas`, `historial`, `mercado`, `finanzas`, `instalaciones`, `ciudad`, `cantera`, `noticias`, `pendReg`, `seq`, `temporadaTerminada`, `legado`, `directiva`, `fans`, `copas`, `rivalidades`, `continental`.

Claves de `state.legado`: `pilares`, `alma`, `influencia`, `pendientes`, `resueltos`, `historia`, `camisetas`, `mandato`, `ultimo`.

**Modo `entrenador`**, claves de primer nivel: `version`, `seed`, `fecha`, `temporada`, `clubId`, `equipos`, `jugadores`, `ligas`, `modo`, `opciones`, `personaje`, `calendario`, `clasificaciones`, `playoffs`, `estadisticas`, `historial`, `mercado`, `finanzas`, `instalaciones`, `ciudad`, `cantera`, `noticias`, `pendReg`, `seq`, `temporadaTerminada`, `fans`, `copas`, `rivalidades`, `entrenador`, `continental`.

Claves de `state.entrenador`: `fase`, `reputacion`, `confianza`, `objetivo`, `ayudantes`, `historial`, `ofertas`, `pend`, `res`, `hitos`, `ultimoEvento`, `peticiones`, `club`.

**Modo `carrera`**, claves de primer nivel: `version`, `seed`, `fecha`, `temporada`, `clubId`, `equipos`, `jugadores`, `ligas`, `modo`, `opciones`, `personaje`, `calendario`, `clasificaciones`, `playoffs`, `estadisticas`, `historial`, `mercado`, `finanzas`, `instalaciones`, `ciudad`, `cantera`, `noticias`, `pendReg`, `seq`, `temporadaTerminada`, `carrera`, `copas`, `rivalidades`, `continental`.

Claves de `state.carrera`: `fase`, `origen`, `curso`, `declarado`, `agente`, `entreno`, `dinero`, `fama`, `moral`, `historial`, `hitos`, `ofertas`, `pend`, `res`, `mejor`, `ultimoEvento`, `ncaa`, `fichado`, `vivienda`, `clubes`, `tier`, `_tier`, `social`, `pueblo`.

Desde la versión 4 del estado: `rua` ({ comp, nombre, desde, hasta } o null) y `ruaHist` (cuántos títulos del historial ya se han revisado), de `rua.js`.

Claves de un equipo: plantilla, id, nombre, siglas, ciudad, pais, colores, reputacion, presupuesto, pabellon, ciudadDeportiva.

Claves de un jugador: id, nombre, equipoId, edad, pos, altura, nac, pasaporte, ovr, pot, att, contrato, estado.

Claves de un partido del calendario: id, fecha, comp, fase, jornada, local, visitante, resultado.

Clubes: 110. Jugadores: 1509. Ligas: NBA, EUROLIGA, ACB, LEGA, GBL, BBL, BSL. Tamaño del estado recién creado: 1.12 MB (localStorage admite unos 5 MB; el guardado rechaza más de 2,6 MB).

## Módulos (en orden de carga)

Cada archivo es una IIFE que cuelga de `window.GM`. Los módulos de lógica se registran con `GM.register(nombre, api)` y quedan en `GM.mods.<nombre>`. Si definen `nuevaPartida(state)`, el núcleo la llama al crear partida (lista en `core.js`, `newGame`). La cabecera de cada archivo describe su API y qué parte del estado escribe; esto es un extracto literal.

### `core.js`
NÚCLEO · Basket Manager 26/27 Expone window.GM: rng, bus de eventos, utilidades, addData, newGame. Lee/crea la raíz de GM.state (ver contrato).

### `datos_util.js`
UTILIDADES DE DATOS GM.mkJugador: atributos a partir de posición, ovr y perfil (T tirador, P pasador, D defensor, R reboteador, E equilibrado). GM.club(def, filas, opt): define un club y sus jugadores. GM.commitDatos(ligas): vuelca todo a GM.data. Las plantillas se completan con jugadores de relleno ficticios (ficticio:true).

### `datos_nba_este.js`
DATOS NBA · Conferencia Este (temporada 2026-27, estimaciones sobre la base 2025-26). Fila: [nombre,pos,edad,ovr,pot,perfil,salario M$,fin contrato,nac?]. Plantillas completadas con relleno ficticio.

### `datos_nba_oeste.js`
DATOS NBA · Conferencia Oeste (temporada 2026-27, estimaciones). Mismo formato que el Este.

### `datos_nba_fin.js`
Cierre de datos NBA: define la liga con los 30 equipos cargados antes.

### `datos_euroliga.js`
DATOS EUROLIGA 2026-27 · 20 clubes (alineación oficial confirmada por la ECA: Beşiktaş sustituye al Monaco). Plantillas = estimaciones; en los clubes de los que tengo menos información hay más jugadores de relleno (ficticios). Fila: [nombre,pos,edad,ovr,pot,perfil,salario M€,fin contrato,nac?]

### `datos_ligas.js`
DATOS ACB y LEGA BASKET 2026-27 (Real Madrid, Barça, Baskonia, Valencia, Olimpia y Virtus se definen en datos_euroliga.js). Estimaciones: solo las figuras que conozco con cierta fiabilidad; el resto de la plantilla es relleno ficticio. Edítalo a tu gusto. Fila: [nombre,pos,edad,ovr,pot,perfil,salario M€,fin contrato,nac?]

### `datos_ligas2.js`
LIGAS GRIEGA (GBL), ALEMANA (BBL) Y TURCA (BSL) 2026-27. Los clubes de la Euroliga (Olympiacos, Panathinaikos, Bayern, Fenerbahçe, Efes y Beşiktaş) juegan también su liga nacional. Los clubes propios de cada liga son reales, pero sus plantillas son relleno ficticio y los pabellones y presupuestos, estimaciones.

### `datos_movimientos.js`
MOVIMIENTOS DE VERANO 2026 (NBA) — se aplica sobre GM.data después de cargar todas las ligas. Fuentes: listado oficial de NBA.com de traspasos, fichajes y renovaciones (actualizado el 2 de octubre de 2026) y resultados del draft 2026. Los jugadores nuevos que no estaban en la base llevan valoraciones estimadas.

### `datos_ligas3.js`
DATOS: plantillas reales 2026-27 de 60 clubes (ACB, Lega, GBL, BBL, Efes, ASVEL, Tofaş, Türk Telekom y Bahçeşehir), generado por `tools/generar_plantillas.js`. Sustituye la plantilla de cada club; el relleno solo completa hasta 12. Valoraciones, salarios y contratos estimados.

### `three_kit.js`
KIT 3D (GM.kit) Utilidades comunes de los módulos 8 y 9: helper DOM h(), vista Three.js (0.186; intensidades de luz en escala clásica, el kit las multiplica por π) con cámara orbital propia (un dedo gira, dos dedos acercan, toque = selección), primitivas low-poly y liberación de recursos. Si Three.js o WebGL no están disponibles, disponible() devuelve false y los módulos usan su panel de lista.

### `finanzas.js`
FINANZAS (GM.mods.finanzas) Expone: registrar, ingresosPartido, cierreMes, ofertasPatrocinio, firmarPatrocinio, resumen, masaSalarial, selfTest. Escribe state.finanzas[clubId] = { caja, movimientos, patrocinios, temp, historial }. Movimientos detallados solo del club del jugador. Se suscribe a partido:jugado (taquilla), dia:avanzado (cierre el día 1 de cada mes), temporada:fin y temporada:nueva.

### `ciudad.js`
CIUDAD (GM.mods.ciudad) Medidores por club (ambiente, apoyoAyuntamiento, aficion; 0-100), convenios, eventos y sucesos aleatorios. Expone: modificadores, perfil, conveniosDisponibles, firmarConvenio, eventosDisponibles, organizarEvento, selfTest. Escribe state.ciudad[clubId]. Usa finanzas.registrar y ciudadDeportiva.efectos si existen.

### `campus.js`
CAMPUS (GM.campus) v2 Layout por club (todos parten del mismo campus básico), estilo arquitectónico según el país, texturas generadas por canvas, edificios con más detalle por nivel, obras por fases, edificio emblemático por club, vida (banderas, grúa, coches, personas) y luz de día / tarde / noche. Calidad 'alta' (texturas, sombras, animación) o 'normal'. Solo formas de Three.js, sin recursos externos.

### `contratos.js`
CONTRATOS (GM.mods.contratos) Cinco categorías (camiseta, nombre del pabellón, TV, material deportivo, proveedor sanitario). Cada una ofrece 3 alternativas que se excluyen: al firmar una, las otras desaparecen hasta que el contrato termine. Los contratos activos viven en finanzas[club].patrocinios (con perfil, cláusulas y efectos). Expone: categorias, activos, firmar, rescindir, selfTest. Memoria: state.contratosMem = { dinero, local, prestigio } (veces elegidas).

### `ciudad3d.js`
CIUDAD 3D (GM.mods.ciudad3d) — vista de mapa desde arriba Mapa estilizado (no es el plano real) con 6 barrios, calles, manzanas y lugares interactivos (colegio, hospital, plaza, peña, comercios, estación, ayuntamiento, pabellón y campus). Las actividades cuestan dinero (o influencia), tienen enfriamiento y modifican la afición de un barrio y los medidores del club. Los barrios se llenan de banderas según su afición y muestran pancartas si están descontentos. Expone: barrios, lugares, acciones, hacer, mount, unmount, selfTest. Escribe state.ciudad[clubId].mapa = { bonos:[6], lugares:{id:fecha} }.

### `ciudad_deportiva.js`
CIUDAD DEPORTIVA 3D (GM.mods.ciudadDeportiva) — v2 sin cuadrícula Cada club tiene un campus con parcelas fijas (GM.campus.layout). Cada parcela admite un tipo de edificio que se construye y mejora por niveles; las obras duran días y se ven por fases. Expone: catalogo, parcelas, construir(st,club,slotId), mejorar(st,club,slotId), efectos, mantenimiento, mount, unmount, selfTest. Escribe state.instalaciones[clubId].ciudadDeportiva = { edificios: [{ slot, tipo, nivel, obra: null|{inicio,fin,dest} }] }.

### `estadio.js`
ESTADIO 3D (GM.mods.estadio) v2 — pabellón con interior evolutivo Expone: aforo, nivelLuz, mejorasDisponibles, mejorar, efectos, mantenimiento, mount, unmount, selfTest. Escribe state.instalaciones[clubId].pabellon = { aforo (base), mejoras: [ids], obras: [{ id, fin, inicio }] }. Las mejoras se ven en la vista: gradas y segundo anillo, asientos con los colores del club, parquet con escudo, iluminación en 4 niveles (lámparas, LED, haces de luz, espectáculo con pantallas), videomarcador, palcos VIP y cubierta. Los banderines cuelgan según títulos y camisetas retiradas.

### `legado.js`
LEGADO (GM.mods.legado) — modo Presidente Expone: activo, fijarPilares, pilares, alma, influencia, dilemas, resolver, gastar, salaHistoria, retirarCamiseta, elecciones, selfTest. Escribe state.legado = { pilares:{cantera,estilo,arraigo,ambicion} (1 baja, 2 media, 3 alta), alma, influencia, pendientes:[], resueltos:[], historia:[], camisetas:[], mandato:{inicio,proxima,cuenta}, ultimo }. El club se autogestiona (directiva IA); el presidente cuida el alma del club y toma dilemas con consecuencias.

### `directiva_ia.js`
DIRECTIVA IA (GM.mods.directiva) — solo en modo Presidente El director deportivo propone fichajes y renovaciones, el entrenador gestiona alineación y cantera. El presidente puede vetar (cuesta influencia), aprobar al instante, cambiar al entrenador o impulsar una obra. Expone: estado, pendientes, vetar, aprobar, cambiarEntrenador, impulsarObra, selfTest. Escribe state.directiva = { entrenador, director, propuestas, registro }.

### `guardado.js`
GUARDADO (GM.mods.guardado) Expone: guardar, cargar, listar, borrar, exportar, importar, persistente, selfTest. Ranuras gm1:slot0 (autoguardado, cada 7 días de juego y al acabar la temporada), slot1 y slot2 (manuales). Usa localStorage con try/catch; si no está disponible guarda en memoria (se pierde al cerrar) y avisa. Sin PWA.

### `partidos.js`
MOTOR DE PARTIDOS (GM.mods.partidos) Simula por posesiones usando atributos, forma, fatiga y táctica. Expone: ovrEquipo, tacticaAuto, tacticaValida, simular, selfTest. Lee state.equipos/jugadores; modifica estado (fatiga, forma, lesión) de los jugadores tras cada partido. En dia:avanzado recupera fatiga y días de lesión (usa ciudadDeportiva.efectos si existe).

### `competiciones.js`
COMPETICIONES (GM.mods.competiciones) Calendario 2026-27 (NBA 82 partidos + play-in + playoffs al 7; Euroliga 38 jornadas + play-in + playoffs al 5 + Final Four; ACB y Lega a doble vuelta + playoffs). Expone: generarCalendario, proximoPartido, clasificacion, playoffs, jugarDia, avanzarHastaPartido, calendarioClub, finTemporada, nuevaTemporada, selfTest. Escribe state.calendario, clasificaciones, playoffs, estadisticas, historial. Emite partido:jugado, dia:avanzado, temporada:fin.

### `mercado.js`
PLANTILLA Y MERCADO (GM.mods.mercado) Expone: valorJugador, salarioPedido, topeSalarial, evaluarOferta, ofertar, renovar, liberar, precioMinimo, comprar, ofertasVenta, vender, traspasar, draft, expiran, libres, buscar, selfTest. Escribe state.mercado = { libres, seq, ultimoDraft }. NBA: tope blando (140 M€); resto: límite de masa salarial según reputación. La IA mueve el mercado en dia:avanzado; en temporada:fin hace el draft y caducan contratos.

### `cantera.js`
CANTERA Y ENTRENAMIENTO (GM.mods.cantera) Expone: generarJuveniles, ojear, ficharJuvenil, subirAlPrimerEquipo, soltarJuvenil, fijarFoco, progresionDiaria, progresionAnual, selfTest. Escribe state.cantera[clubId] = { juveniles, prospectos, foco, scouts }. Solo el club del jugador tiene juveniles. Entrenamiento semanal (lunes) y progresión anual de todos los jugadores en temporada:fin.

### `personaje.js`
PERSONAJE (GM.mods.personaje) Avatar vectorial (SVG en línea) personalizable: piel, peinado y color, barba, gafas y vestimenta. Se viste con los colores del club mediante las variables CSS --club, --club2 y --club-ink. Expone: crear, avatar(pj, opciones), nombre, OPC, aleatorio, selfTest. Se guarda en state.personaje = { nombre, apellido, piel, pelo, peloColor, barba, gafas, ropa }.

### `carrera.js`
CARRERA DE JUGADOR (GM.mods.carrera) — modo 'carrera' Tú eres un jugador (id 'yo') dentro del mundo simulado. Orígenes: cantera europea, universidad de EE. UU. (camino al draft NBA) o liga europea modesta. El club lo lleva la IA. Tú decides: entrenamiento personal, representante, ofertas (renovar, cambiar de club o de liga, draft NBA, contrato de dos vías, fichaje NBA), eventos personales y cuándo retirarte. Expone: estado, stats, rol, ofertas, aceptar, entrenar, declararse, mock, eventos, elegirEvento, retirarse, retrato, selfTest. Escribe state.carrera = { fase:'ncaa'|'pro'|'libre'|'retirado', origen, curso, declarado, agente, entreno, dinero, fama, moral, historial, hitos, ofertas, pend, res, mejor }.

### `fans.js`
AFICIÓN E IDENTIDAD (GM.mods.fans) — modos gestor y presidente Peñas por barrios (ánimo, miembros, actividades y peticiones), precio de los abonos, tifos, mascota, lema, himno y rival histórico (derbi). Expone: estado, penas, accionesPena, hacerPena, peticiones, resolverPeticion, fijarPrecio, fijarIdentidad, rivales, selfTest. Escribe state.fans = { penas, abonos:{precio}, identidad:{mascota,lema,himno,rival}, peticiones, tifo, ultima, cd }. finanzas.ingresosPartido lee el precio de los abonos, el rival y el tifo.

### `copas.js`
COPAS (GM.mods.copas) Cada liga nacional tiene su copa de eliminatoria única entre los 8 mejores clasificados en la fecha de la competición: Copa del Rey (ACB), NBA Cup, Copa de Grecia, BBL-Pokal, Coppa Italia y Copa de Turquía. Cuartos, semifinales y final con el mejor clasificado como local. Expone: estado, copa, partidosClub, selfTest. Escribe state.copas[id] = { nombre, liga, estado, rondas:[{nombre,partidos:[ids]}], campeon }. Los partidos son entradas del calendario con fase 'copa' (no puntúan en la liga). El campeón se añade a state.historial.

### `continental.js`
COMPETICIONES CONTINENTALES (GM.mods.continental) EuroCup y Basketball Champions League para los clubes que no están en la Euroliga, por reputación. Cada una tiene: fase previa (eliminatorias a doble partido), fase de grupos (ida y vuelta), eliminatorias a doble partido y final a partido único. Expone: estado, competicion, tablaGrupo, de(st, clubId), selfTest. Escribe state.continental[id] = { nombre, estado, participantes, previa, grupos, ko, campeon }. Los partidos son entradas del calendario con fase 'continental' (no puntúan en las ligas). El campeón se añade a state.historial.

### `rivalidades.js`
RIVALIDADES (GM.mods.rivalidades) Derbis y rivalidades históricas. Un partido entre rivales sube la asistencia (finanzas), mueve la afición y el ánimo de la plantilla (por victoria o derrota) y se anuncia en el próximo partido. Se añade como rival «tu gran rival» el elegido en Afición > Identidad (state.fans.identidad.rival). Expone: derbi(st,a,b), rivalesDe(st,club), historial(st,a,b), selfTest. Escribe state.rivalidades = { h2h:{ 'a|b': {a:n, b:n} } }.

### `directo.js`
PARTIDO EN DIRECTO (GM.mods.directo) Pantalla completa con pista 3D: 10 jugadores y balón que reproducen cada posesión del partido (pases, tiros, rebotes, pérdidas y faltas), marcador y reloj. El partido se simula cuarto a cuarto con partidos.crearDirecto: entre cuartos (o en pausa) puedes cambiar ritmo, defensa y foco, pedir tiempo muerto y hacer cambios; solo afectan a lo que queda por jugar. Sin WebGL funciona igual con el marcador y la narración. Expone: abrir(st, partido, { control, onFin }), selfTest. El resultado final se entrega a onFin(res); competiciones.jugarDia lo usa vía st._directo.

### `entrenador.js`
MODO ENTRENADOR (GM.mods.entrenador) — modo 'entrenador' Eres el entrenador de un club (lo gestiona la IA: tú pones la táctica y el vestuario). La directiva te fija un objetivo según el nivel del club y mide su confianza en ti: resultados, derbis, copas y decisiones. Puedes pedir fichajes (la directiva decide), contratar ayudantes, gestionar eventos de prensa y de vestuario. Si la confianza se hunde te despiden; si lo haces bien, llegan ofertas de clubes mejores. Expone: estado, objetivo, rango, pedirFichaje, candidatosFichaje, ayudantes, contratar, eventos, elegirEvento, ofertas, aceptar, selfTest. Escribe state.entrenador = { fase, reputacion, confianza, objetivo, ayudantes, historial, ofertas, pend, res, hitos, ultimoEvento, club }.

### `social.js`
VIDA SOCIAL (GM.mods.social) — modo carrera Contactos con relación 0-100: familia, amigo de la infancia, pareja (puede nacer, crecer, casarse y tener hijos), compañeros de equipo, mentor y rival. Cada semana tienes 3 de energía social para gastarla en acciones (llamar, visitar, cenar, entrenar juntos…). La relación se enfría si la descuidas. Efectos: ánimo (moral), progresión extra con el mentor y los compañeros, fama y ahorros. Si cambias de ciudad, la pareja lo nota. Expone: estado, contactos, acciones, hacer, selfTest. Escribe state.carrera.social = { contactos, energia, pareja, eventos }.

### `sponsor.js`
PATROCINADORES PERSONALES (GM.mods.sponsor) — modo carrera Marcas que te patrocinan a ti, no al club. Cada categoría (calzado, ropa, bebidas, tecnología, lujo) se abre con un grado de reputación y ofrece tres alternativas excluyentes: global (más dinero), local (más cercanía) y con causa (valores). Al firmar una, las otras desaparecen hasta que acabe el contrato. Cláusulas de rendimiento (puntos, títulos) y rescisión. Ingresos mensuales en tus ahorros. Expone: categorias, activos, firmar, rescindir, selfTest. Escribe state.carrera.sponsors = [{ cat, marca, perfil, importe, hasta, rescision, ef }].

### `sede_plano.js` y `sede3d.js`
SEDE DEL CLUB EN 3D (GM.sedePlano, GM.sede): plano de la sede (pista, gimnasio, enfermería, vestuario, sala de prensa, cafetería, recepción con vitrina y despacho) y escena explorable. Tu personaje camina (toque o WASD), la plantilla y el personal se mueven por las salas según una rutina (los lesionados van al fisio), tocar a un jugador abre su ficha y permite charlar (+3 de ánimo, una vez por semana: `state.sede.charlas`) y cada sala abre la pantalla del juego que le corresponde según el modo.

### `casa3d.js`
TU CASA Y MODO CONSTRUCCIÓN (GM.casa): piso al que se entra por el portal de la calle; tamaño según el nivel de vida. Modo construcción con catálogo por categorías (muebles Kenney), cuadrícula de 0,5 m, fantasma verde o rojo, R para girar, seleccionar para girar, mover o vender (50 %). Paga con tus ahorros (hogar.dinero). El confort (suma del catálogo) mejora «Descansar en casa». Guarda `state.sede.casa.muebles` [{ m, x, z, r }].

### `calle3d.js`
LA CALLE (GM.calle): cruce de la ciudad del club al que se sale desde la sede. Avenida y calle con aceras de panot, pasos de peatones elevados (únicas zonas de la calzada que se pueden pisar), semáforos y coches que paran en rojo y guardan distancia. Edificios: pabellón (con el nombre real), sede del club (cristal, escudo), tienda oficial, bar de la peña, ayuntamiento, quiosco, tu edificio y comercios. La ciudad refleja al club: banderas según la afición, más árboles y mural con más reputación, fachadas según el país. Vecinos (más con los colores del club cuanto más afición; riada al pabellón el día de partido) y aficionados que reconocen a tu personaje según el modo. Al sur del cruce, un barrio peatonal: plaza con fuente y palomas que vuelan al acercarte, mercado municipal con puestos, parque con canasta (chavales jugando), columpios y tobogán, comercios con terraza (clientes sentados), músico callejero, vecinos con perro y banderines del club si hay afición. Quien queda lejos de la cámara no se dibuja ni se anima (`n.oculto` para los que se han ido a casa). Capturas: `node tools/barrio_capturas.js`. No escribe en el estado.

### `sede_acciones.js`
ACCIONES DE LA SEDE (GM.mods.sedeAcciones): lo que se hace en cada sala sin menús (charla motivadora o de exigencia, sesiones de recuperación o fuerza, invitar a la plantilla, firmar camisetas, rueda de prensa con tres respuestas, pizarra táctica, tratamiento intensivo, ordenador con agentes libres y renovaciones). Límites por días en `state.sede.usos`. Pagos de la caja del club (o de tus ahorros en la carrera).

### `pueblo3d.js`
PUEBLO 3D (GM.pueblo3d): escena del pueblo natal. Colina con relieve y campos, olivos y cipreses instanciados, río con puente, camino a la puerta, muralla con torres (desde villa), plaza mayor con fuente, iglesia y ayuntamiento con soportales, torre del homenaje, calles empedradas y casas texturizadas (teja árabe, postigos, balcones con macetas, banderas del club según el cariño). Estilo por región (`estiloDe`): piedra catalana, ocre castellano, blanco andaluz, toscano. Las infraestructuras del jugador tienen modelo propio (mural con su dorsal, pabellón y hospital con su apellido) y llevan `userData.tipo`. Azar local con semilla: no usa `GM.rng`. No escribe en el estado.

### `edificio_kit.js`
EDIFICIOS CON MODELOS (GM.edificioKit) — fachadas montadas con piezas glTF del Building Kit de Kenney (CC0): paredes de 2 m con ventana o puerta, columnas y cornisa, escaladas al ancho y a la altura de planta; repinta la celda de los muros de la paleta con el color pedido y fusiona todo. Expone: cuerpo(opciones) -> Promise<Group|null>.

### `ciudad_barrios.js`
CIUDAD AMPLIADA (GM.ciudadBarrios): barrios oeste, este y norte alrededor del centro de la calle, parcelas para tus viviendas con fachada según su variante, colegio, hospital, estación y puerta de la ciudad deportiva con las actividades de ciudad3d; los barrios lejanos no se dibujan. Expone: construir(ctx), actualizar(S), LOTES.

### `vida.js`
VIDA DEL JUGADOR (GM.mods.vida): vestuario (química, capitán y rival), lesiones con decisión en el móvil y fisio en la sede, redes sociales, familia que evoluciona, salidas tras la retirada (cambia `st.modo`), logros y retos, y la mascota (todos los modos; `state.sede.mascota`, modelo en la casa 3D). Escribe `state.carrera.vida` (se crea al usarse). Las decisiones llegan al móvil como mensajes `{ tipo: 'vida', que, ops, def }` que resuelve `vida.decidir`.

### `rua.js`
RÚA DE CAMPEONES (GM.mods.rua): al ganar un título, dos días de rúa en la calle (autobús descapotable con la plantilla y el trofeo, multitud y confeti; la escena está en calle3d.js). Expone: activa, revisar, nuevaPartida, selfTest. Escribe state.rua y state.ruaHist.

### `deportiva_mundo.js`
CIUDAD DEPORTIVA PARA PASEAR (GM.deportivaMundo): escena `deportiva`, el mismo campus del menú (ciudadDeportiva.campusEn) a escala ×4,2, con un panel por edificio. Expone: construir, poblar, siguiente, ESCALA.

### `interiores.js`
INTERIORES (GM.interiores): pabellón, tienda, peña y ayuntamiento por dentro, y en el pueblo el bar y las casas de tus padres y tus amigos (escena interior:<tipo>), con su panel, las actividades de ciudad3d y gente. Expone: construir, poblar, siguiente, actualizar.

### `copias.js`
COPIAS AUTOMÁTICAS (GM.mods.copias): con cada autoguardado (evento `guardado:auto` de guardado.js) guarda una copia GM2: en IndexedDB (las 10 últimas) y, si se eligió, en una carpeta del ordenador (File System Access). Expone: copiar, listar, restaurar, carpeta, carpetaEstado, reactivar, hayCarpeta.

### `ui_tutorial.js`
TUTORIAL GUIADO (GM.ui.tutorial): pasos por modo que señalan partes de la pantalla; la primera vez de cada modo (localStorage gm1:tutorial:<modo>) y desde el menú.

### `datos_valoraciones.js`
VALORACIONES DESDE LAS ESTADÍSTICAS DE 2025-26 (generado): GM.VALORACIONES y envoltorio de GM.mkJugador.

### `estilo.js`
ESTILO DE VIDA (GM.mods.estilo) — modo carrera: valor de -100 (chico malo) a +100 (profesional ejemplar) que mueven el entreno, las fiestas, las decisiones y 12 planes; consecuencias semanales en las dos direcciones (fama, patrocinios, multas, sanciones, lesiones, potencial, confianza). Expone: estado, etiqueta, mover, planes, hacer, PLANES. Escribe state.carrera.estilo y jugadores.yo.estado.sancion.

### `movil.js`
TU MÓVIL (GM.mods.movil) — modo carrera: chats con representante, entrenador, club, prensa, peña, familia, amigos y pareja; mensajes con decisiones (eventos personales, fiestas, patrocinios, entrevistas) que caducan a los 5 días. Expone: enviar, chats, chat, leer, contestar, noLeidos. Escribe state.carrera.movil.

### `gente.js`
GENTE (GM.mods.gente) — personas con nombre con las que hablar por la calle y en tu pueblo: leyenda del club, utillero, peña y periodista; en el pueblo, primer entrenador y alcalde. Saludo según la relación y el último partido, charla semanal con un efecto pequeño y encargos con plazo (ganar, ganar en casa, meter puntos, ir a la peña, empezar una obra). Vecinos y aficionados: saludar y autógrafos. Expone: personas, ficha, casual, estado, selfTest. Escribe state.gente = { rel, charla, encargo, hechos, firmas } (se crea al usarse).

### `pueblo.js`
TU PUEBLO (GM.mods.pueblo) — modo carrera Tu pueblo natal crece con tu reputación y con lo que inviertas: de aldea a ciudad del baloncesto. Con más nivel, más casas, mejores edificios y nuevas infraestructuras interactivas (canasta, polideportivo, escuela, ambulatorio, mural y estatua, bar de la peña, tienda, hotel, pabellón con tu nombre). Acciones: visitar, fiesta en tu honor, clínic con los niños e inversiones. Los edificios dan renta, cariño y reputación cada mes. Expone: estado, nivel, edificios, invertir, visitar, fiesta, clinic, mount, unmount, selfTest. Escribe state.carrera.pueblo.

### `hogar.js`
HOGAR (GM.mods.hogar) — todos los modos Tu casa y su mobiliario. El «nivel de vida» (0-5) depende de la fase y el éxito: en la carrera, de la liga y la fama; como entrenador, de la reputación y la liga; como director técnico o presidente, de la reputación del club. El nivel desbloquea tipos de vivienda y muebles. Cada casa tiene habitaciones con casillas de suelo (3x5) y de pared (5); un mueble ocupa 1 o 2 casillas. Los muebles dan efectos pequeños (ánimo, recuperación, progresión, confianza, fama). Expone: nivel, etiquetaNivel, dinero, casaActual, tipos, mudarse, habitaciones, catalogo, colocar, quitar, colorear, efectos, trofeos, selfTest. Escribe state.hogar = { ahorros, casa, muebles:{ [casaId]: [{ hab, slot, item, color }] } }.

### `hogar3d.js`
HOGAR 3D (GM.mods.hogar3d) Tres vistas: «Fuera» (la vivienda y su calle, más pobre o más rica según el tipo y el barrio), «Edificio» (la casa entera como una casa de muñecas con sus habitaciones y tu personaje en el salón) y cada «Habitación» (casillas de suelo y pared donde colocar y quitar muebles, cambiar su color). Los muebles disponibles dependen de tu nivel de vida. Expone: mount(el, st), unmount(), selfTest. Usa GM.mods.hogar para toda la lógica.

### `ui.js`
INTERFAZ MÓVIL (GM.mods.ui y GM.ui) Expone: start(raiz), navegar(id), refrescar, toast, modal, registerScreen. Pantallas: inicio, plantilla, mercado, calendario, club, ciudad, finanzas. Menú de arranque (nueva partida por liga y club, continuar, cargar, importar). Usa solo funciones del contrato y comprueba que existan.

