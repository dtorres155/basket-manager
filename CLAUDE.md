# Basket Manager 2026-27 — instrucciones para Claude Code

Juego de gestión de baloncesto para móvil (NBA, Euroliga, EuroCup, Champions League, ACB, Lega, ligas griega, alemana y turca), temporada 2026-27, generado a partir de módulos JS en una carpeta **`dist/` autocontenida** que funciona sin conexión. Uso personal, con nombres reales de clubes y jugadores.

## Sobre el usuario
El usuario escribe en español y catalán. Prefiere respuestas concisas y directas, recomendaciones concretas y que le corrijas con claridad. El juego, los textos y los comentarios están en **español**. Dicta por voz: interpreta sus mensajes con tolerancia.

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
node tools/gente_capturas.js [club]       # gente con nombre en la calle y el pueblo (leyenda, utillero, peña, periodista, entrenador, alcalde) y su ficha
```
**Publicación:** repositorio público `dtorres155/basket-manager`; `.github/workflows/pages.yml` pasa las pruebas y publica `dist/` en **https://dtorres155.github.io/basket-manager/** en cada push a `main`. No subas datos personales del usuario (nombre, pueblo, correo); `PROMPT_CLAUDE_CODE.txt` está en `.gitignore`. Instrucciones para el usuario: `INSTALAR_EN_MOVIL.md`.

**PWA:** `build.js` genera `dist/manifest.webmanifest` y `dist/sw.js`. La versión de la caché es un hash del contenido de `dist/`: cualquier cambio crea una caché nueva y el juego muestra «Nueva versión» (guarda la partida y recarga). Si añades archivos a `dist/`, añádelos a la lista `archivos` de `build.js`.
Three.js 0.186 (paquete propio con GLTFLoader, BufferGeometryUtils, RoundedBoxGeometry y Sky: `npm run vendor:three` a partir de `tools/three_entry.js`; las pruebas usan el mismo con `require("./tools/three_node")`) y las fuentes woff2 (Graduate, Bricolage Grotesque, Doto) están en `vendor/` con sus licencias (ver `CREDITOS.md`). **No añadas dependencias de CDN.** `dist/` no se guarda en git: se genera. Node está en `C:\Program Files\nodejs` (en Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"`). Playwright usa el Edge del sistema (`channel: 'msedge'`); la descarga de Chromium falla en este equipo.

## Reglas de la arquitectura (léelas antes de tocar nada)
- **Sin módulos ES ni bundler.** Cada archivo es una IIFE que cuelga de `window.GM`. El orden de carga está en `build.js` (`const mods=[...]`) y en `load.js` (para pruebas en Node con `vm`).
- **Contrato de módulo:** `GM.register('nombre', api)` → `GM.mods.nombre`. Si define `nuevaPartida(state)`, `core.js` (`newGame`) lo llama; hay que añadirlo a la lista de ese método.
- **Estado único serializable** en `GM.state` (JSON). **Versionado:** `GM.VERSION_ESTADO` (core.js); si cambias la forma del estado, súbela y añade una migración en `MIGRACIONES` de `guardado.js` (nunca borres una). Nada de funciones ni referencias circulares. Se guarda en `localStorage` (`gm1:slot0..2`) **comprimido con LZ-string** (prefijo `LZ1:`, unas 10 veces menos) y se exporta como texto `GM2:` (comprimido) o `GM1:` (antiguo, se sigue importando). El guardado rechaza más de 2,6 M caracteres ya comprimido.
- **Eventos (`GM.bus`):** `dia:avanzado`, `partido:jugado`, `temporada:fin`, `temporada:nueva`, `partida:cargada`, `fichaje:hecho`, `instalacion:mejorada`, `dinero:cambio`, `copa:fin`, `sala:abierta` (al abrir una zona del mundo; sirve a los encargos de gente.js). El orden de los manejadores depende del orden de carga.
- **Azar:** usa `GM.rng` (determinista, con semilla). `GM.util.hash(texto)` devuelve un entero sin signo; **si desplazas bits usa `>>>`, nunca `>>`** (con `>>` salen índices negativos y fallos silenciosos; ya nos pasó varias veces).
- **Cada módulo cuyo estado cambia el club del usuario debe respetar `state.clubId`** y el modo (`gestor`, `presidente`, `entrenador`, `carrera`). En `entrenador` y `carrera` la IA lleva el club del usuario (ver `mercado.js`).
- **Fama del jugador** (`state.carrera.fama`) es un accesor que frena las subidas; tras cargar una partida hay que reinstalarlo (`carrera.js`, evento `partida:cargada`). No lo sustituyas por un número plano.
- **Interfaz:** `ui.js` (núcleo: utilidades, menú, armazón, partido e Inicio) + pantallas en `ui_gestion.js`, `ui_ciudad.js`, `ui_presidente.js`, `ui_carrera.js` y `ui_entrenador.js`, que toman las utilidades de `GM.ui._` y registran sus pantallas con `registerScreen`. Si añades una utilidad al núcleo que necesiten las pantallas, inclúyela en `GM.ui._`. Construye el DOM con `GM.h(tag, attrs, ...hijos)`. Estilos en `estilos.css` («La camiseta»: colores del club por variables CSS `--club`, `--club2`, `--club-ink`). Evita la estética genérica: no uses mayúsculas con etiquetas pequeñas, fuente monoespaciada para metadatos ni puntos medios (·) como separadores; usa comas.
- **3D:** `three_kit.js` (cámara orbital táctil, primitivas) + `campus.js`, `estadio.js`, `ciudad3d.js`, `hogar3d.js`, `pueblo.js` (la escena del pueblo está en `pueblo3d.js`: colina amurallada con estilo regional, texturas de canvas, vegetación instanciada; capturas con `node tools/pueblo_capturas.js`), `directo.js`. Todo es geometría procedural (cajas, cilindros, conos) y canvas para texturas. Hay un modo de calidad (`GM.campus.config.calidad`): «normal» por defecto en pantallas táctiles (sin sombras ni animaciones, resolución 1,5×) y «alta» en ordenador. **Rendimiento:** tras construir un mundo, llama a `GM.kit.fusionar(mundo)` antes de `sombrear` (une la geometría estática por material). Todo lo que se anime, se modifique después o se pueda tocar debe llevar `userData` (por ejemplo `userData.anim`); si no, se fusiona y queda congelado. Mide con `node tools/perfil.js --lento [--calidad=normal|alta]`.

## Sede del club en 3D (prototipo «en el mundo», estilo Big Ambitions)
`sede_plano.js` (solo datos: salas, puertas, muebles, puntos de actividad, destino de cada sala por modo) + `sede3d.js` (escena a pantalla completa: cámara que sigue al personaje, caminos A* en cuadrícula de 0,5 m, personas de Quaternius con proporciones reales: los jugadores con su altura, piel y la sudadera del club; postura sentada hecha por código en `sentar()` porque las animaciones no la traen). Cada sala abre un **panel propio dentro del mundo** (`sede_acciones.js`: charlas, sesiones, pizarra táctica, parte médico, rueda de prensa, ordenador del despacho, próximo partido), con efectos flotando sobre los jugadores y un enlace a la pantalla clásica. Para regenerar las personas: `node tools/preparar_personas.mjs` (lee `recursos/quaternius_*`). Se entra desde Inicio. **La calle** (`calle3d.js`) usa el mismo motor (`motor()` en sede3d.js y `cambiarEscena`): se sale por la puerta de la sede y hay pabellón, tienda, peña, ayuntamiento, quiosco y tu casa, con tráfico, semáforos, vecinos y aficionados; los edificios que tapan al personaje se vuelven transparentes (`S.oclusores`). Prueba: `node tools/calle_capturas.js [--partido]`. **El pueblo** (`pueblo_mundo.js`, escena `pueblo`, se abre con `GM.sede.abrir(st, 'pueblo')`): parcelas con obras por fases (pueblo.js guarda `obras` con inicio y fin) y zonas con acciones propias (`sala.acciones(st)` en `abrirSala`). **Gente con nombre** (`gente.js`: leyenda, utillero, peña, periodista; en el pueblo, primer entrenador y alcalde) con charlas y encargos; `conNombre()` en sede3d.js los coloca junto a su zona y `fichaGente()` pinta su ficha. **Mapa** (`mapa()` en sede3d.js) para cualquier escena a partir de `S.G` y `S.zonas`. **La casa** (`casa3d.js`, modo construcción) se prueba con `node tools/casa_capturas.js`. **Rendimiento del mundo:** cada persona se funde en una sola malla con color por vértice (`personaje()`; los petos recolorean `rangosRopa`); quien está lejos no se dibuja y se anima a la mitad; en calidad «normal» no hay sombras en tiempo real (sombra pintada bajo los pies). Mide con `node tools/perf_mundo.js --lento [--calidad=normal]`. Los modelos glb (CC0) están en `vendor/modelos/` y `build.js` los copia a `dist/modelos` y los añade a la caché sin conexión. Los paquetes originales descargados están en `recursos/` (fuera de git). Godot 4 se valoró como alternativa; el usuario decidió seguir con Three.js por ahora.

## Cómo se prueba (y su límite)
Las pruebas (`t_*.js`) usan jsdom con un `WebGLRenderer` simulado: verifican que la lógica, las pantallas y las escenas se construyen sin errores, **pero nadie ha visto nunca el resultado en pantalla**. Es la principal carencia del proyecto: toda la parte visual se ha afinado a ciegas. Lo primero que debes hacer es abrir el juego en un navegador real (idealmente móvil, 390×844) y hacer capturas.

## Datos (qué es real y qué no)
- NBA: base 2025-26 + movimientos de verano 2026 de NBA.com y draft 2026 (`datos_movimientos.js`). Ratings estimados.
- Euroliga: 18 clubes con plantilla de 2026-27 de BasketNews; Efes y ASVEL, de sportschau.de. Ratings estimados.
- ACB (18), Lega (16), GBL (14), BBL (18) y BSL (16): los clubes de 2026-27. Plantillas reales de todos salvo Çayırova (BSL, relleno) en `datos_ligas3.js`, generado por `node tools/generar_plantillas.js` a partir de `recursos/*_2026.json` (descargados con `tools/plantillas_*.js`; `recursos/` no se sube). Nombre, posición, nacionalidad, edad y altura son reales; valoración, potencial, salario y contrato, estimados. Fuentes en `docs/FUENTES_DATOS.md`.
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
