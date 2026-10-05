# Pendiente y deuda técnica (priorizado)

## P0 — Ver lo que se construye
1. ~~Hecho en la fase 0~~ (capturas en `capturas/`). Abrir el juego en un navegador real y en móvil (390×844). Hacer capturas de cada pantalla y escena 3D (campus, pabellón, ciudad, calle, pueblo, casa, directo) y corregir proporciones, solapes, colores y rendimiento. Todo lo visual se ha hecho sin ver el resultado.
2. Medido con CPU limitada (fase 1.3, `capturas/fase1/RENDIMIENTO.md`): 60 fps en calidad normal. Falta confirmarlo en un Android real.
3. Añadir pruebas visuales automáticas (por ejemplo Playwright con capturas) a `npm test`.

## P1 — Salto de calidad visual
- Sustituir la geometría de cajas por **modelos glTF** y texturas reales con licencia libre (edificios, muebles, jugadores, balón, pabellones). Mantener las primitivas como alternativa de baja calidad.
- Jugadores del partido en directo con figuras y animaciones reales (correr, pasar, tirar); jugadas con más sentido táctico que las actuales (hoy las posesiones se representan de forma estilizada a partir de eventos).
- Formas más orgánicas en campus, ciudad y casas: curvas, `LatheGeometry`, `ExtrudeGeometry`, `InstancedMesh`, vegetación y relieve.
- Casas: más personalización (color de paredes y suelos, iluminación), más piezas por habitación, objetos con modelos de mayor detalle.
- Edificios del campus que se pensaron y no están: museo, hotel de concentración, sala de prensa.

## P1 — Distribución
- ~~Dejar de depender de CDN~~: hecho en la fase 1.1 (`vendor/` y `dist/`).
- ~~PWA con modo sin conexión~~: hecho en la fase 1.2 (manifiesto, iconos, service worker con caché versionada y aviso de nueva versión). Publicada por HTTPS (1.5) en https://dtorres155.github.io/basket-manager/ (GitHub Actions publica dist/ en cada push a main).
- ~~Guardado seguro~~: hecho en la fase 1.4 (versión y migraciones, guardado al salir de la app, almacenamiento persistente, copia de seguridad por archivo o compartir y recordatorio semanal).

## P1 — Datos
- Plantillas reales para BBL (alemana), BSL (turca) y el resto de GBL (griega); completar Efes, ASVEL y los clubes de ACB y Lega con relleno.
- Revisar valoraciones (ovr/pot), edades y contratos; hoy son estimaciones.
- Clubes que faltan: BBL tiene 14 de 18, BSL 14 de 16.
- Calendarios con fechas reales (hoy el calendario europeo está comprimido).

## P1 — Equilibrio
- Reputación del jugador (`carrera.js`), progresión, finanzas de los clubes (resultado/presupuesto), efectos de muebles, sueldo y ahorros en los modos no jugador (hoy son estimaciones).
- Comprobar que llegar a la NBA lleve el tiempo esperado en distintos orígenes.
- Revisar si algún efecto antiguo sigue dando mucha fama de golpe.
- **Progresión todavía rápida con entrenamiento intenso:** en `tools/sim_potencial.js`, el perfil disciplinado de cantera pasa de 61 a 77 entre los 19 y los 22 años (el diseño pide 73 a los 23). Ya se limitó la experiencia de la vida social (tope semanal en `social.js`, antes «pedir consejo» al mentor daba más nivel que entrenar). Falta revisar la intensidad (x1,5) y el crecimiento por edad.

## P2 — Funcionalidad que se pidió y no está completa
- Etapa universitaria sin partidos jugados (se resume por curso).
- Pantalla final de retirada («salón de la fama»).
- Modo entrenador más profundo (plantilla propia, rotaciones por rol, rueda de prensa más rica).
- Ciudad que crece también en los modos de gestión (hoy solo crece el pueblo del jugador).
- Más ligas europeas y más copas; Final Four con sede, Supercopa, etc.
- Narración y estadísticas avanzadas en el partido en directo.

## P3 — Deuda técnica
- `ui.js` pesa unos 120 KB y mezcla pantallas de todos los modos: dividirlo por pantallas/modos.
- Las pruebas son scripts que imprimen resultados; convertirlas en pruebas con aserciones (el ejecutor `test_all.js` busca excepciones y marcas de fallo, no valida valores).
- Hay varios parches aplicados por sustitución de texto sobre `ui.js`; conviene ordenar y simplificar.
- El simulador (`partidos.js`) se rehízo por cuartos con eventos para el modo directo; recalibrar y añadir pruebas de resultados medios por liga.
- Estado de ~1,7 MB tras una temporada: valorar comprimirlo, limitar históricos o usar IndexedDB.

## Límites conocidos / avisos
- Los nombres de barrios solo son reales para Badalona, Barcelona y Madrid; el resto de ciudades usa nombres genéricos. El mapa de la ciudad es estilizado.
- Los pabellones y campus de cada club son inspirados, no réplicas; solo la ciudad deportiva del Barça y el pabellón de Joventut se basaron en información real.
- La cantera/universidad no se juega partido a partido.
