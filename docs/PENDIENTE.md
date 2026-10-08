# Pendiente y deuda técnica (priorizado)

## P0 — Ver lo que se construye
1. ~~Hecho en la fase 0~~ (capturas en `capturas/`). Abrir el juego en un navegador real y en móvil (390×844). Hacer capturas de cada pantalla y escena 3D (campus, pabellón, ciudad, calle, pueblo, casa, directo) y corregir proporciones, solapes, colores y rendimiento. Todo lo visual se ha hecho sin ver el resultado.
2. Medido con CPU limitada (fase 1.3, `capturas/fase1/RENDIMIENTO.md`): 60 fps en calidad normal. Falta confirmarlo en un Android real.
3. ~~Pruebas visuales~~: `npm run test:visual` (en local; no en GitHub Actions porque necesita navegador).

## P1 — Salto de calidad visual
- Sustituir la geometría de cajas por **modelos glTF** y texturas reales con licencia libre (edificios, muebles, jugadores, balón, pabellones). Mantener las primitivas como alternativa de baja calidad.
- ~~Jugadores del partido en directo con figuras reales~~ (hecho: personas, gestos de tiro y pase, grada y banquillos). Falta: jugadas con más sentido táctico, repetición de canastas y cámara que siga la jugada.
- Formas más orgánicas en campus, ciudad y casas: curvas, `LatheGeometry`, `ExtrudeGeometry`, `InstancedMesh`, vegetación y relieve.
- Casas: más personalización (color de paredes y suelos, iluminación), más piezas por habitación, objetos con modelos de mayor detalle.
- ~~Edificios del campus que faltaban~~: museo, hotel de concentración y sala de prensa (catálogo y actividades en ciudad_deportiva.js, dibujo en campus.js; 13 parcelas). Capturas: `node tools/campus_capturas.js [nivel] [club]`.
- Personas y muebles reales en las escenas antiguas: gente de Quaternius en el mapa de la ciudad (vista Calle), el campus, el pabellón (jugadores calentando dentro, aficionados fuera) y tu personaje en la casa antigua (`GM.sede.figura`); muebles de Kenney en la casa antigua con la tela del color elegido (`aModelo` en hogar3d.js; capturas con `node tools/hogar_capturas.js`). Falta: edificios con modelos glTF y el público de la grada (150 figuras: con modelos sería demasiado pesado; habría que usar InstancedMesh).

- ~~Pueblo 3D lento al usar el panel~~: ya solo se reconstruye si cambia algo visible (nivel, estilo, edificios o el cariño de 10 en 10). Construirlo la primera vez tarda 0,1 s en ordenador y 0,4-0,7 s con CPU x4 (`node tools/pueblo_tiempo.js --lento`).

## Mundo explorable (sede, calle, barrio, casa)
- Modo construcción también en el despacho y otras salas del club; paredes interiores, color de paredes y suelos en casa.
- Más ciudad: otros barrios conectados, el pabellón por dentro con esta vista (entrar desde la calle), el campus/ciudad deportiva explorable.
- La ciudad del club cambia con la reputación más allá de banderas/árboles/mural (comercios nuevos, obras, grada de aficionados en la calle).
- Rendimiento en móvil: la calle va a ~25 fps con CPU x4; probar en un Android real y bajar más (instanciar vecinos lejanos, LOD).
- Los coches no esquivan a los peatones fuera de los pasos; el músico usa una postura por código, sin animación propia.
- Adaptar todo el mundo explorable al móvil (controles táctiles, tamaños de paneles); hasta ahora se ha afinado en PC.
- Decisión abierta: si Three.js se queda corto, pasar a Godot 4 (APK) reutilizando modelos y diseño.

## P1 — Distribución
- ~~Dejar de depender de CDN~~: hecho en la fase 1.1 (`vendor/` y `dist/`).
- ~~PWA con modo sin conexión~~: hecho en la fase 1.2 (manifiesto, iconos, service worker con caché versionada y aviso de nueva versión). Publicada por HTTPS (1.5) en https://dtorres155.github.io/basket-manager/ (GitHub Actions publica dist/ en cada push a main).
- ~~Guardado seguro~~: hecho en la fase 1.4 (versión y migraciones, guardado al salir de la app, almacenamiento persistente, copia de seguridad por archivo o compartir y recordatorio semanal).

## P1 — Datos
- ~~Plantillas reales~~ de BBL, GBL, Lega, ACB, Efes, ASVEL y tres clubes turcos (`tools/generar_plantillas.js`). Falta la BSL: tbf.org.tr está tras Cloudflare; los otros 10 clubes turcos siguen con relleno.
- Valoraciones: estimadas por reputación del club, edad y si es extranjero; no hay minutos ni estadísticas. Mejorarlas con estadísticas de 2025-26 si se encuentra una fuente abierta.
- ~~Clubes que faltan~~: hecho (BBL 18, BSL 16, GBL 14, Lega 16). Pabellones y presupuestos de los recién llegados, aproximados.
- ~~Fechas reales~~: Euroliga y ACB oficiales (Copa del Rey del 18 al 21 de febrero); BBL, Lega, GBL y BSL aproximadas. La EuroCup real acaba la fase regular el 13 de enero; aquí se alarga.

## P1 — Equilibrio
- Reputación del jugador (`carrera.js`), progresión, finanzas de los clubes (resultado/presupuesto), efectos de muebles, sueldo y ahorros en los modos no jugador (hoy son estimaciones).
- Comprobar que llegar a la NBA lleve el tiempo esperado en distintos orígenes.
- Revisar si algún efecto antiguo sigue dando mucha fama de golpe.
- ~~Progresión del jugador~~: rehecha. El margen del potencial es de ±15 (máximo 99) y lo que subes cada verano depende de la calidad de tu temporada (intensidad, constancia, ánimo, minutos, mentor; `progresoAnual` en carrera.js). En `node tools/sim_potencial.js 9`: perfil perfecto 97-99 a los 25-27 (europa, 89), normal 79-90, juerguista 74-83.
- Potencial dinámico de todos los jugadores hasta los 24 años (`potAnual` en cantera.js): minutos por partido, instalaciones o reputación del club y un «talento tardío» oculto (8 %) que puede convertir a un segunda ronda en estrella si juega. Los jóvenes de la IA crecen según su margen: los primeros del draft rondan 87-90 a los 25. Seis temporadas simuladas: el top 10 de la liga se mantiene en 90-91.
- Draft: elegible de 19 a 22 años desde la universidad o desde Europa; aviso el 15 de abril con la proyección (top 3, lotería, primera, segunda o sin elegir). Si no te eligen desde Europa, sigues en tu club. Falta: que te elijan y te dejen en Europa un año («stash»), y entrevistas o pruebas previas al draft.

## P2 — Funcionalidad que se pidió y no está completa
- Etapa universitaria sin partidos jugados (se resume por curso).
- Pantalla final de retirada («salón de la fama»).
- Modo entrenador más profundo (plantilla propia, rotaciones por rol, rueda de prensa más rica).
- Ciudad que crece también en los modos de gestión (hoy solo crece el pueblo del jugador).
- Más ligas europeas y más copas; Final Four con sede, Supercopa, etc.
- Narración y estadísticas avanzadas en el partido en directo.

## P3 — Deuda técnica
- ~~Dividir `ui.js`~~: hecho (núcleo + ui_gestion, ui_ciudad, ui_presidente, ui_carrera, ui_entrenador).
- Pruebas con aserciones: hecho en `t_aserciones.js` (estado, resultados, clasificación, medias por liga, guardado, migraciones, acciones, casa, potencial). Las demás pruebas siguen siendo de humo; ampliar aserciones poco a poco.
- Hay varios parches aplicados por sustitución de texto sobre `ui.js`; conviene ordenar y simplificar.
- ~~Recalibrar el simulador~~: hecho (`tools/calibrar.js`): NBA 115 pts, Euroliga 83, diferencia 10-12, local 55-59 %. Prórrogas aún algo bajas (2-4 % frente a 5-6 %); la ACB da ~80 pts (real ~83).
- ~~Tamaño del guardado~~: hecho, comprimido con LZ-string (1,7 MB -> ~0,17 MB).

## Límites conocidos / avisos
- Los nombres de barrios solo son reales para Badalona, Barcelona y Madrid; el resto de ciudades usa nombres genéricos. El mapa de la ciudad es estilizado.
- Los pabellones y campus de cada club son inspirados, no réplicas; solo la ciudad deportiva del Barça y el pabellón de Joventut se basaron en información real.
- La cantera/universidad no se juega partido a partido.
