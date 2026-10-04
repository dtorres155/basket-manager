# Basket Manager 2026-27 — instrucciones para Claude Code

Juego de gestión de baloncesto para móvil (NBA, Euroliga, EuroCup, Champions League, ACB, Lega, ligas griega, alemana y turca), temporada 2026-27, en **un único `index.html`** generado a partir de módulos JS. Uso personal, con nombres reales de clubes y jugadores.

## Sobre el usuario
El usuario escribe en español y catalán. Prefiere respuestas concisas y directas, recomendaciones concretas y que le corrijas con claridad. El juego, los textos y los comentarios están en **español**. Dicta por voz: interpreta sus mensajes con tolerancia.

## Comandos
```
npm install        # jsdom y three@0.128 (solo para pruebas y build)
npm run build      # ensambla index.html a partir de los módulos (node build.js)
npm test           # build + 26 pruebas (test_all.js); debe terminar con «Todas las pruebas pasan»
npm run serve      # sirve index.html en http://localhost:8080 (también desde el móvil en la misma red)
```
`index.html` carga Three.js r128 desde cdnjs y las fuentes (Graduate, Bricolage Grotesque, Doto) desde Google Fonts. Sin conexión no hay 3D ni tipografías.

## Reglas de la arquitectura (léelas antes de tocar nada)
- **Sin módulos ES ni bundler.** Cada archivo es una IIFE que cuelga de `window.GM`. El orden de carga está en `build.js` (`const mods=[...]`) y en `load.js` (para pruebas en Node con `vm`).
- **Contrato de módulo:** `GM.register('nombre', api)` → `GM.mods.nombre`. Si define `nuevaPartida(state)`, `core.js` (`newGame`) lo llama; hay que añadirlo a la lista de ese método.
- **Estado único serializable** en `GM.state` (JSON). Nada de funciones ni referencias circulares. Se guarda en `localStorage` (`gm1:slot0..2`) y se exporta como texto `GM1:`. El guardado rechaza más de 2,6 MB.
- **Eventos (`GM.bus`):** `dia:avanzado`, `partido:jugado`, `temporada:fin`, `temporada:nueva`, `partida:cargada`, `fichaje:hecho`, `instalacion:mejorada`, `dinero:cambio`, `copa:fin`. El orden de los manejadores depende del orden de carga.
- **Azar:** usa `GM.rng` (determinista, con semilla). `GM.util.hash(texto)` devuelve un entero sin signo; **si desplazas bits usa `>>>`, nunca `>>`** (con `>>` salen índices negativos y fallos silenciosos; ya nos pasó varias veces).
- **Cada módulo cuyo estado cambia el club del usuario debe respetar `state.clubId`** y el modo (`gestor`, `presidente`, `entrenador`, `carrera`). En `entrenador` y `carrera` la IA lleva el club del usuario (ver `mercado.js`).
- **Fama del jugador** (`state.carrera.fama`) es un accesor que frena las subidas; tras cargar una partida hay que reinstalarlo (`carrera.js`, evento `partida:cargada`). No lo sustituyas por un número plano.
- **Interfaz:** `ui.js` construye el DOM con `GM.h(tag, attrs, ...hijos)`. Estilos en `estilos.css` («La camiseta»: colores del club por variables CSS `--club`, `--club2`, `--club-ink`). Evita la estética genérica: no uses mayúsculas con etiquetas pequeñas, fuente monoespaciada para metadatos ni puntos medios (·) como separadores; usa comas.
- **3D:** `three_kit.js` (cámara orbital táctil, primitivas) + `campus.js`, `estadio.js`, `ciudad3d.js`, `hogar3d.js`, `pueblo.js`, `directo.js`. Todo es geometría procedural (cajas, cilindros, conos) y canvas para texturas. Hay un modo de calidad (`GM.campus.config.calidad`).

## Cómo se prueba (y su límite)
Las pruebas (`t_*.js`) usan jsdom con un `WebGLRenderer` simulado: verifican que la lógica, las pantallas y las escenas se construyen sin errores, **pero nadie ha visto nunca el resultado en pantalla**. Es la principal carencia del proyecto: toda la parte visual se ha afinado a ciegas. Lo primero que debes hacer es abrir el juego en un navegador real (idealmente móvil, 390×844) y hacer capturas.

## Datos (qué es real y qué no)
- NBA: base 2025-26 + movimientos de verano 2026 de NBA.com y draft 2026 (`datos_movimientos.js`). Ratings estimados.
- Euroliga: 16 de 20 clubes con plantilla de 2026-27 (BasketNews); Efes y ASVEL, parcial. Ratings estimados.
- ACB y Lega: clubes reales; plantillas parciales (Joventut y Unicaja revisados) y relleno ficticio.
- GBL, BBL y BSL (`datos_ligas2.js`): clubes y pabellones aproximados, casi todo relleno; `datos_ligas3.js` añade jugadores confirmados de Peristeri, Promitheas, Aris y PAOK.
- Los jugadores con `ficticio:true` son relleno. La BBL tiene 14 de 18 clubes y la BSL 14 de 16.

## Aviso sobre el origen del código
En el espacio de trabajo original aparecieron módulos que **no fueron escritos por el asistente en esa conversación** (`continental.js`, `pueblo.js`, `sponsor.js`, `fans.js`, `datos_ligas2.js`, las variantes de casas en `hogar*.js`, el campus «orgánico» y los cambios en `ciudad3d.js`). Pasan las pruebas, pero revísalos antes de apoyarte en ellos.

## Documentación
- `docs/ARQUITECTURA.md`: módulos (extracto de sus cabeceras), forma del estado, eventos.
- `docs/DISENO.md`: dirección visual y decisiones de interfaz.
- `docs/PENDIENTE.md`: lista priorizada de trabajo, límites conocidos y deuda técnica.
- `docs/HISTORIAL_PETICIONES.md`: lo que ha pedido el usuario, en orden.
- `docs/PROMPT_INICIAL.md`: primer mensaje sugerido para empezar.
