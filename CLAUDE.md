# Basket Manager 2026-27 — instrucciones para Claude Code

Juego de gestión de baloncesto para móvil (NBA, Euroliga, EuroCup, Champions League, ACB, Lega, ligas griega, alemana y turca), temporada 2026-27, generado a partir de módulos JS en una carpeta **`dist/` autocontenida** que funciona sin conexión. Uso personal, con nombres reales de clubes y jugadores.

## Sobre el usuario
El usuario escribe en español y catalán. Prefiere respuestas concisas y directas, recomendaciones concretas y que le corrijas con claridad. El juego, los textos y los comentarios están en **español**. Dicta por voz: interpreta sus mensajes con tolerancia.

## Prioridad: ordenador primero (desde oct 2026)
El objetivo es que el juego se vea y juegue lo mejor posible **en ordenador** (calidad «alta»): modelos y texturas realistas aunque pesen más (muebles de Poly Haven en `vendor/modelos/reales`, texturas de ambientCG). Android sigue siendo jugable pero es secundario: en calidad «normal» usa los recursos ligeros (muebles de Kenney, sin posprocesado) y se le pueden quitar funciones si hace falta. Estilo elegido por el usuario: lo más realista posible (Poly Haven), con las personas estilizadas de Quaternius mientras no haya personas realistas animadas.

## Versión de escritorio (Electron)
`escritorio/` es la versión para ordenador (la principal): `cd escritorio && npm install` (una vez), `npm run probar` (abre el juego en una ventana con herramientas de desarrollo, F12), `npm run instalador` (genera `escritorio/salida/*.exe`), `npm run publicar` (lo sube a Releases de GitHub para las actualizaciones automáticas; necesita `GH_TOKEN`, que se saca con `gh auth token`). `preparar.js` compila el juego, copia `dist/` a `escritorio/app/` y le añade los **recursos pesados** de `recursos/pesados/` (fuera de git, con las mismas rutas que en `dist/`; por ejemplo los árboles realistas en `recursos/pesados/modelos/reales/arboles/*.glb`). La web y el móvil no los tienen y el juego usa la alternativa ligera. `main.js` sirve el juego con el protocolo `app://` (F11, pantalla completa). Prueba automática: `node tools/escritorio_prueba.js`. Los modelos enormes de Poly Haven se simplifican con `recursos/herramientas/node_modules/.bin/gltf-transform weld` + `simplify --ratio 0.012`.

## Comandos
```
npm install        # jsdom, three@0.186, esbuild, playwright y fuentes (solo para pruebas y build)
npm run build      # genera dist/ (index.html, three.min.js, fonts/) a partir de los módulos (node build.js)
npm test           # build + 27 pruebas (test_all.js, incluida t_aserciones.js con comprobaciones de valores); debe terminar con «Todas las pruebas pasan»
npm run test:visual # recorridos en Edge (sin red, sede, calle, barrio, casa); debe terminar con «Todas las pruebas visuales pasan»
node tools/calibrar.js [semilla]          # medias del simulador por liga frente a las reales
npm run serve      # sirve dist/ en http://localhost:8080 (por HTTP el móvil no puede instalar la PWA; solo para probar)
node tools/capturas.js <fase> [--lento]   # capturas 390x844 con Edge en capturas/<fase>/ y fps (--lento: CPU x4)
node tools/sin_red.js                     # comprueba que dist/ carga sin ninguna petición externa
node tools/pwa.js                         # instalable (según Edge), service worker activo y arranque sin red con la partida guardada
node tools/iconos.js                      # regenera vendor/icons/ (escudo con balón) a partir del SVG del script
node tools/perfil.js --lento [--calidad=normal|alta]   # llamadas de dibujo y ms por fotograma de cada escena 3D
node tools/sede_capturas.js [carpeta] [--movil]   # prueba y capturas de la sede 3D (caminar, salas, fichas)
node tools/sim_potencial.js [temporadas]  # carreras con hábitos distintos (perfecto, disciplinado, normal, juerguista) y su draft
node tools/campus_capturas.js [nivel] [club]   # ciudad deportiva con los 13 edificios a un nivel
node tools/hogar_capturas.js              # casa antigua amueblada (modelos de Kenney)
node tools/pueblo_tiempo.js [--lento]     # tiempo de construir el pueblo y si se reconstruye al usar el panel
node tools/generar_plantillas.js          # recursos/*_2026.json -> datos_ligas3.js (plantillas reales; la BSL sale de node tools/plantillas_bsl_wiki.js)
node tools/finanzas_calibrar.js           # resultado económico de una temporada por liga
node tools/sim_fama.js [temporadas] [origen]   # cómo sube la fama del jugador y sus saltos más grandes
node tools/personaje_capturas.js          # tu personaje en 3D con distintos aspectos (complementos, cuerpo, ropa)
node tools/clasif_capturas.js [club] [dias]   # Calendario: clasificaciones (también EuroCup y Champions) y líderes
node tools/pueblo_paseo.js [estilo]       # el pueblo para pasear: vista general, obra con grúa, mapa y avanzar un día
node tools/organico_capturas.js [club]    # ciudad deportiva y mapa de la ciudad (relieve, caminos curvos, formas irregulares)
node tools/edificios_capturas.js [club]   # edificios de la calle con piezas glTF y público en la grada (pabellón y partido en directo)
node tools/valoraciones_stats.js [--descargar]   # valoraciones desde estadísticas reales 2025-26 (NBA, Euroliga, EuroCup) -> datos_valoraciones.js
node tools/tutorial_capturas.js           # tutorial guiado de cada modo y accesibilidad
node tools/copias_prueba.js               # copias automáticas: autoguardado -> IndexedDB -> restaurar
node tools/rendimiento_auto.js [escena] [x]   # calidad adaptable del mundo 3D con la CPU limitada
node tools/movil_capturas.js [dias] [estilo]   # estilo (de chico malo a profesional ejemplar), planes y el móvil con sus chats y decisiones
node tools/ciudad_paseo.js [club]         # ciudad ampliada: barrios, tus viviendas, colegio, hospital, estación; entrar y salir de una casa
node tools/casas_capturas.js              # cada vivienda con su plano (habitaciones, planta de arriba, terraza, jardín o piscina)
node tools/interiores_capturas.js [modo]  # pabellón, tienda, peña y ayuntamiento por dentro
node tools/unmundo_capturas.js            # «Mi pueblo» y el mapa de Ciudad con las escenas que se pasean
node tools/gente_capturas.js [club]       # gente con nombre en la calle y el pueblo (leyenda, utillero, peña, periodista, entrenador, alcalde) y su ficha
node tools/deportiva_paseo.js             # ciudad deportiva para pasear (escena deportiva) y su panel por edificio
node tools/ciudad_reputacion.js           # la ciudad según reputación y afición (comercios, obras, banderines) y la multitud el día de partido
node tools/transporte.js                  # metro entre barrios, bici compartida y autobús ciudad-pueblo
node tools/sede_vida.js                   # acciones nuevas de cada sala de la sede y capturas de los detalles
node tools/momento_clave.js [gestor|carrera]   # momento decisivo del directo (tirar, pasar o penetrar)
node tools/rua.js [club]                  # rúa de campeones en la calle
node tools/vida_prueba.js                 # vida del jugador en Node: una temporada con lesión, redes, logros, familia, mascota y retirada
node tools/movimiento.js [escena] [n]     # caminos al azar: sin camino, cruces de zonas bloqueadas y ms por cálculo
node tools/luz_capturas.js [carpeta] [escenas] [--normal]   # iluminación de cada escena de día y de noche (alta: posprocesado)
node tools/dia_partido.js                 # rutinas por hora y día de partido en casa (previa, cola, autobús del equipo, salida)
node tools/campus_paseo.js [club]         # la ciudad deportiva paseable (vista general, entrada, centro, a pie)
node tools/muebles_reales.js              # cada mueble de Kenney junto a su versión realista (Poly Haven), para orientación y tamaño
node tools/comparacion_estilos.js         # el mismo salón con muebles de Kenney y de Poly Haven
node tools/clima.js                       # el mismo sitio soleado, nublado y con lluvia (suelo mojado), y los coches nuevos
node tools/detalles_calle.js              # carteles, grafitis, gatos y coches de la calle de cerca
node tools/modo_foto.js                   # modo foto: filtros, viñeta, guardar y salir
node tools/locales_urbano.js              # mobiliario urbano y los locales nuevos (restaurante, gimnasio, barbería) con sus acciones
node tools/escenas_todas.js               # entra en todas las escenas e interiores (gestor y carrera) y falla si alguno no carga
node tools/sonido_prueba.js               # sonido ambiente: arranca con el primer clic, mezcla por escena y botón de silencio
node tools/escritorio_escenas.js          # versión de escritorio: árboles reales en ciudad deportiva y pueblo, y persianas en la calle
node tools/palomas.js                     # bandadas de palomas que salen volando al acercarte
node tools/urbano_capturas.js [carpeta]   # pasos de cebra, farolas, aceras, bocas de metro, paradas de bici, plaza y parque (VISTAS='[["nombre",x,z,yaw,zoom]]' o 'zona:<id>' para elegir vistas)
node tools/bici_prueba.js [carpeta]       # ir en bici: sentarse en el sillín, pedalear, ruedas y bajarse
node tools/pueblo_nuevo.js [carpeta] [interior1,…]   # pueblo con todos los edificios (cine, polígono, taller…), la vespa y los interiores con varias estancias
node tools/sim_ligas.js [temporadas] [semilla]   # niveles y potenciales de todas las ligas a lo largo de las temporadas (media/atributos, techos, relevo)
node tools/vida_capturas.js               # vestuario, familia, redes, logros, la casa con vitrina y mascota, tu casa del pueblo y la retirada
```
**Publicación:** repositorio público `dtorres155/basket-manager`; `.github/workflows/pages.yml` pasa las pruebas y publica `dist/` en **https://dtorres155.github.io/basket-manager/** en cada push a `main`. No subas datos personales del usuario (nombre, pueblo, correo); `PROMPT_CLAUDE_CODE.txt` está en `.gitignore`. Instrucciones para el usuario: `INSTALAR_EN_MOVIL.md`.

**PWA:** `build.js` genera `dist/manifest.webmanifest` y `dist/sw.js`. La versión de la caché es un hash del contenido de `dist/`: cualquier cambio crea una caché nueva y el juego muestra «Nueva versión» (guarda la partida y recarga). Si añades archivos a `dist/`, añádelos a la lista `archivos` de `build.js`.
Three.js 0.186 (paquete propio con GLTFLoader, BufferGeometryUtils, RoundedBoxGeometry y Sky: `npm run vendor:three` a partir de `tools/three_entry.js`; las pruebas usan el mismo con `require("./tools/three_node")`) y las fuentes woff2 (Graduate, Bricolage Grotesque, Doto) están en `vendor/` con sus licencias (ver `CREDITOS.md`). **No añadas dependencias de CDN.** `dist/` no se guarda en git: se genera. Node está en `C:\Program Files\nodejs` (en Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"`). Playwright usa el Edge del sistema (`channel: 'msedge'`); la descarga de Chromium falla en este equipo.

## Reglas de la arquitectura (léelas antes de tocar nada)
- **Sin módulos ES ni bundler.** Cada archivo es una IIFE que cuelga de `window.GM`. El orden de carga está en `build.js` (`const mods=[...]`) y en `load.js` (para pruebas en Node con `vm`).
- **Contrato de módulo:** `GM.register('nombre', api)` → `GM.mods.nombre`. Si define `nuevaPartida(state)`, `core.js` (`newGame`) lo llama; hay que añadirlo a la lista de ese método.
- **Estado único serializable** en `GM.state` (JSON). **Versionado:** `GM.VERSION_ESTADO` (core.js); si cambias la forma del estado, súbela y añade una migración en `MIGRACIONES` de `guardado.js` (nunca borres una). Nada de funciones ni referencias circulares. Se guarda en `localStorage` (`gm1:slot0..2`) **comprimido con LZ-string** (prefijo `LZ1:`, unas 10 veces menos) y se exporta como texto `GM2:` (comprimido) o `GM1:` (antiguo, se sigue importando). El guardado rechaza más de 2,6 M caracteres ya comprimido.
- **Eventos (`GM.bus`):** `dia:avanzado` (rua.js detecta con él los títulos nuevos), `partido:jugado`, `temporada:fin`, `temporada:nueva`, `partida:cargada`, `fichaje:hecho`, `instalacion:mejorada`, `dinero:cambio`, `copa:fin`, `sala:abierta` (al abrir una zona del mundo; sirve a los encargos de gente.js), `evento:elegido` y `social:hecho` (estilo.js). El orden de los manejadores depende del orden de carga.
- **Azar:** usa `GM.rng` (determinista, con semilla). `GM.util.hash(texto)` devuelve un entero sin signo; **si desplazas bits usa `>>>`, nunca `>>`** (con `>>` salen índices negativos y fallos silenciosos; ya nos pasó varias veces).
- **Cada módulo cuyo estado cambia el club del usuario debe respetar `state.clubId`** y el modo (`gestor`, `presidente`, `entrenador`, `carrera`). En `entrenador` y `carrera` la IA lleva el club del usuario (ver `mercado.js`).
- **Vida del jugador (`vida.js`):** vestuario, lesiones, redes, familia, retirada, logros y mascota. Para pedir una decisión por el móvil usa `movil.enviar(st, quien, texto, { tipo: 'vida', que, ops, def })` y resuélvela en `vida.decidir`.
- **Estilo y móvil (modo carrera):** `estilo.js` (`state.carrera.estilo.v` de -100 a 100; las sanciones van en `jugadores.yo.estado.sancion` y `partidos.js` deja fuera al sancionado) y `movil.js` (`state.carrera.movil.chats`; para avisar de algo al jugador usa `GM.mods.movil.enviar(st, quien, texto, decision)`).
- **Fama del jugador** (`state.carrera.fama`) es un accesor que frena las subidas; tras cargar una partida hay que reinstalarlo (`carrera.js`, evento `partida:cargada`). No lo sustituyas por un número plano.
- **Interfaz:** `ui.js` (núcleo: utilidades, menú, armazón, partido e Inicio) + pantallas en `ui_gestion.js`, `ui_ciudad.js`, `ui_presidente.js`, `ui_carrera.js` y `ui_entrenador.js`, que toman las utilidades de `GM.ui._` y registran sus pantallas con `registerScreen`. Si añades una utilidad al núcleo que necesiten las pantallas, inclúyela en `GM.ui._`. Construye el DOM con `GM.h(tag, attrs, ...hijos)`. Estilos en `estilos.css` («La camiseta»: colores del club por variables CSS `--club`, `--club2`, `--club-ink`). Evita la estética genérica: no uses mayúsculas con etiquetas pequeñas, fuente monoespaciada para metadatos ni puntos medios (·) como separadores; usa comas.
- **Texturas reales e iluminación:** `texturas.js` (`GM.texturas.aplicar(material, id, { escala, color, relieve, tinte, rugMin })`, materiales CC0 de `vendor/texturas`, proyectados en coordenadas del mundo; se precargan al abrir el mundo). En sede3d.js: reflejos de entorno (`entorno()`), tono por país (`tonoCiudad`) y, en calidad alta, posprocesado (GTAO, bloom de noche, OutputPass) con el `EffectComposer` del paquete propio de Three.
- **Urbanismo (`urbano.js`, `GM.urbano`):** piezas compartidas por la calle y los barrios: `cebra`, `posiciones` y `farola`, `bordillo`, `bocaMetro`, `paradaBici`, `bici`, `arbusto`, `parterre` y `parche`/`anillo`/`disco` (suelos con texturas reales pegados al suelo). Todo lo que se pega a una superficie coplanar lleva `GM.urbano.deco(material)` (polygonOffset) para que no parpadee. Se carga después de `texturas` en `build.js`; las pruebas de Node no lo necesitan (no construyen la calle).
- **Media y atributos (`datos_util.js`):** `ovr` sale de los atributos (`GM.ovrDe(att, pos)` = media de los 10 + un ajuste por posición); no toques `p.ovr` ni `p.att` por separado: usa `GM.setOvr(p, nuevo, atributosPrioritarios)` (y `GM.ruidoAtt` para repartir ruido sin cambiar la media). Los perfiles tienen picos para que un 92 tenga algún atributo de 92 o más (`picoAtt`). **Potencial y relevo (`cantera.js`):** `potAnual` limita el techo según la edad y lo frena por encima de 86; `renovarLigas` retira a los de 34+ y mete jóvenes de cada país. **Interiores:** `interiores.js` (salas de siempre) + `interiores_pueblo.js` (estancias anexas con hueco de puerta y los interiores de los edificios del pueblo; el nivel del edificio añade estancias).
- **3D:** `three_kit.js` (cámara orbital táctil, primitivas) + `campus.js`, `estadio.js`, `ciudad3d.js`, `hogar3d.js`, `pueblo.js` (la escena del pueblo está en `pueblo3d.js`: colina amurallada con estilo regional, texturas de canvas, vegetación instanciada; capturas con `node tools/pueblo_capturas.js`), `directo.js`. Todo es geometría procedural (cajas, cilindros, conos) y canvas para texturas; formas orgánicas con `GM.kit.relieve`, `kit.cinta`, `kit.curvaEntre` y `kit.mancha`; público de grada con `GM.kit.publico` (instanciado); edificios con piezas glTF del Building Kit con `GM.edificioKit.cuerpo` (`edificio_kit.js`). Hay un modo de calidad (`GM.campus.config.calidad`): «normal» por defecto en pantallas táctiles (sin sombras ni animaciones, resolución 1,5×) y «alta» en ordenador. **Rendimiento:** tras construir un mundo, llama a `GM.kit.fusionar(mundo)` antes de `sombrear` (une la geometría estática por material). Todo lo que se anime, se modifique después o se pueda tocar debe llevar `userData` (por ejemplo `userData.anim`); si no, se fusiona y queda congelado. Mide con `node tools/perfil.js --lento [--calidad=normal|alta]`.

## Sede del club en 3D (prototipo «en el mundo», estilo Big Ambitions)
`sede_plano.js` (solo datos: salas, puertas, muebles, puntos de actividad, destino de cada sala por modo) + `sede3d.js` (escena a pantalla completa: cámara que sigue al personaje, caminos A* en cuadrícula de 0,5 m, personas de Quaternius con proporciones reales: los jugadores con su altura, piel y la sudadera del club; postura sentada hecha por código en `sentar()` porque las animaciones no la traen). Cada sala abre un **panel propio dentro del mundo** (`sede_acciones.js`: charlas, sesiones, pizarra táctica, parte médico, rueda de prensa, ordenador del despacho, próximo partido), con efectos flotando sobre los jugadores y un enlace a la pantalla clásica. Para regenerar las personas: `node tools/preparar_personas.mjs` (lee `recursos/quaternius_*`). Se entra desde Inicio. **La calle** (`calle3d.js`) usa el mismo motor (`motor()` en sede3d.js y `cambiarEscena`): se sale por la puerta de la sede y hay pabellón, tienda, peña, ayuntamiento, quiosco y tu casa, con tráfico, semáforos, vecinos y aficionados; los edificios que tapan al personaje se vuelven transparentes (`S.oclusores`). Prueba: `node tools/calle_capturas.js [--partido]`. **El pueblo** (`pueblo_mundo.js`, escena `pueblo`, se abre con `GM.sede.abrir(st, 'pueblo')`): parcelas con obras por fases (pueblo.js guarda `obras` con inicio y fin) y zonas con acciones propias (`sala.acciones(st)` en `abrirSala`). **Gente con nombre** (`gente.js`: leyenda, utillero, peña, periodista; en el pueblo, primer entrenador y alcalde) con charlas y encargos; `conNombre()` en sede3d.js los coloca junto a su zona y `fichaGente()` pinta su ficha. **Mapa** (`mapa()` en sede3d.js) para cualquier escena a partir de `S.G` y `S.zonas`. **Escenas con parámetro:** `GM.sede.abrir(st, 'casa:<id>')`, `cambiarEscena('interior:pena')`; al volver a la calle se aparece en su puerta (`S.puertas`). **La ciudad ampliada** (`ciudad_barrios.js`, llamada desde calle3d): barrios con parcelas para tus viviendas (`hogar.viviendas(st)`, todas las que tienes) y edificios públicos con las actividades de ciudad3d. **Interiores** (`interiores.js`): pabellón, tienda, peña y ayuntamiento. **La casa** (`casa3d.js`, modo construcción) se construye con el plano de la variante de cada vivienda (`hogar.VARIANTES`) y guarda muebles y reformas por vivienda en `st.sede.casas[id]`; se prueba con `node tools/casa_capturas.js`. **Un solo mundo:** «Mi pueblo» y el mapa 3D de Ciudad construyen la escena paseable (con `GM.sede.motor()`) vista desde arriba. **Rendimiento del mundo:** cada persona se funde en una sola malla con color por vértice (`personaje()`; los petos recolorean `rangosRopa`); quien está lejos no se dibuja y se anima a la mitad; en calidad «normal» no hay sombras en tiempo real (sombra pintada bajo los pies). Mide con `node tools/perf_mundo.js --lento [--calidad=normal]`. Los modelos glb (CC0) están en `vendor/modelos/` y `build.js` los copia a `dist/modelos` y los añade a la caché sin conexión. Los paquetes originales descargados están en `recursos/` (fuera de git). Godot 4 se valoró como alternativa; el usuario decidió seguir con Three.js por ahora.

## Cómo se prueba (y su límite)
Las pruebas (`t_*.js`) usan jsdom con un `WebGLRenderer` simulado: verifican que la lógica, las pantallas y las escenas se construyen sin errores, **pero nadie ha visto nunca el resultado en pantalla**. Es la principal carencia del proyecto: toda la parte visual se ha afinado a ciegas. Lo primero que debes hacer es abrir el juego en un navegador real (idealmente móvil, 390×844) y hacer capturas.

## Datos (qué es real y qué no)
- **Valoraciones con estadísticas reales:** `datos_valoraciones.js` (generado por `tools/valoraciones_stats.js`, se carga justo después de `datos_util`) envuelve `GM.mkJugador` y corrige el nivel de 504 jugadores de la NBA, la Euroliga y la EuroCup según su producción de 2025-26.
- NBA: base 2025-26 + movimientos de verano 2026 de NBA.com y draft 2026 (`datos_movimientos.js`). Ratings estimados.
- Euroliga: 18 clubes con plantilla de 2026-27 de BasketNews; Efes y ASVEL, de sportschau.de. Ratings estimados.
- ACB (18), Lega (16), GBL (14), BBL (18) y BSL (16): los clubes de 2026-27. Plantillas reales de todos (Çayırova, de Flashscore con posiciones y alturas estimadas) en `datos_ligas3.js`, generado por `node tools/generar_plantillas.js` a partir de `recursos/*_2026.json` (descargados con `tools/plantillas_*.js`; `recursos/` no se sube). Nombre, posición, nacionalidad, edad y altura son reales; valoración, potencial, salario y contrato, estimados. Fuentes en `docs/FUENTES_DATOS.md`.
- Fechas de 2026-27: Euroliga y ACB oficiales; el resto aproximadas (`FECHAS` en `competiciones.js`).
- Los jugadores con `ficticio:true` son relleno.
- **Potencial:** el del jugador del usuario se mueve ±15 según sus decisiones (`carrera.js`); el de todos los menores de 25, según minutos, club y un talento tardío oculto (`potAnual` en cantera.js). Draft con aviso el 15 de abril (19 a 22 años, desde la universidad o Europa).
- **Estadísticas por competición:** `st.estComp[comp][jugador] = [pj, min, pts, reb, ast, rob, tap]` (se reinicia cada temporada); `C.lideres(st, comp, cat)` en competiciones.js.
- **Aspecto del personaje en 3D:** `GM.sede.aspecto(st)` traduce `st.personaje` (y el modo) a las opciones del modelo: modelo según ropa y cuerpo, altura, pelo oculto si es rapado o calvo, complexión y complementos pegados a los huesos (`complementos` en sede3d.js).
- **Escenas antiguas con modelos:** `GM.sede.figura(o, alto, primitiva, vista)` pone una persona real (con la figura de cajas mientras carga) y `GM.sede.modeloMueble(nombre)` un mueble de Kenney.

## Aviso sobre el origen del código
En el espacio de trabajo original aparecieron módulos que **no fueron escritos por el asistente en esa conversación** (`continental.js`, `pueblo.js`, `sponsor.js`, `fans.js`, `datos_ligas2.js`, las variantes de casas en `hogar*.js`, el campus «orgánico» y los cambios en `ciudad3d.js`). Pasan las pruebas, pero revísalos antes de apoyarte en ellos.

## Documentación
- `docs/ARQUITECTURA.md`: módulos (extracto de sus cabeceras), forma del estado, eventos.
- `docs/DISENO.md`: dirección visual y decisiones de interfaz.
- `docs/PENDIENTE.md`: lista priorizada de trabajo, límites conocidos y deuda técnica.
- `docs/HISTORIAL_PETICIONES.md`: lo que ha pedido el usuario, en orden.
- `docs/PROMPT_INICIAL.md`: primer mensaje sugerido para empezar.
