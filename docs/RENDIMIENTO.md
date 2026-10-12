# Rendimiento por escena y nivel de calidad

Medido el 2026-10-12 con `node tools/informe_rendimiento.js` en una Intel Iris Xe (1280x800, ciudad joventut-badalona). «CPU» es el tiempo de JavaScript por fotograma (ScriptDuration de CDP); «x4» es con la CPU frenada cuatro veces (proxy de un móvil). «GPU» es el tiempo de dibujo esperando a la tarjeta (gl.finish); las sombras se miden forzando su actualización en cada fotograma (en el juego van a ritmo reducido). Los presupuestos están en `docs/PRESUPUESTOS.md`.

| Escena | Nivel | Construcción (s) | fps x1 | CPU x1 (ms) | fps x4 | CPU x4 (ms) | GPU con sombras (ms) | GPU sin sombras (ms) | Llamadas | Triángulos | Nodos | Texturas (MB) | Gente |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| calle | medio | 7.5 | 61 | 6.58 | 26 | 37.11 |  | 3.1 | 117 | 314 k | 5513 | 97 | 53 |
| calle | alto | 8.3 | 47 | 15.24 | 17 | 56.48 | 8.6 | 5.2 | 172 | 732 k | 7524 | 97 | 75 |
| calle | ultra | 12.1 | 19 | 51.39 | 8 | 130.08 | 36.5 | 11.6 | 892 | 1898 k | 8705 | 97 | 92 |
| pueblo | medio | 6.0 | 61 | 6.83 | 28 | 33.14 |  | 3.4 | 151 | 390 k | 1745 | 77 | 9 |
| pueblo | alto | 5.9 | 49 | 13.6 | 17 | 52.73 | 8.6 | 4.3 | 259 | 781 k | 2080 | 77 | 14 |
| sede | medio | 4.4 | 61 | 6.04 | 32 | 29.28 |  | 2.6 | 121 | 176 k | 2068 | 72 | 21 |
| sede | alto | 8.3 | 36 | 27.49 | 12 | 84.01 | 16.5 | 10 | 693 | 1788 k | 2195 | 163 | 21 |
| pabellón | medio | 11.8 | 61 | 2.14 | 60 | 11.24 |  | 0.7 | 35 | 52 k | 529 | 52 | 6 |
| pabellón | alto | 11.6 | 61 | 2.84 | 49 | 18.62 | 2.5 | 1.5 | 45 | 96 k | 524 | 52 | 6 |

Lectura: el cuello de botella de cada fila es el mayor entre CPU y GPU respecto a 16,7 ms (60 fps) o 33 ms (30 fps). Con la CPU a x4 el tiempo de script se multiplica; si supera 33 ms el juego baja de 30 fps en un móvil de gama media.

## Qué dice la tabla (12 oct 2026)

- **Memoria de texturas (GPU):** con KTX2 en el mundo y en los modelos glTF, la calle baja de 235 a 97 MB, el pueblo de 214 a 77, la sede en Medio de 210 a 72 y en Alto de 434 a 163. La sede es la escena que más pesa porque cada mueble de Poly Haven lleva tres texturas de 1K.
- **Construcción:** de 4 a 12 s según la escena (la ciudad real tarda 7 a 8 s; el pabellón 12 s porque incluye cargar antes la calle). Es lo que más se nota en móvil: candidato del punto 18 (ciudad por trozos y en un *worker*).
- **CPU:** Medio va de 2 a 7 ms de JavaScript por fotograma; Alto de 3 a 27 ms. La diferencia no es de lógica de juego: el perfil de pueblo (14 personas) muestra que Alto añade casi 700 ms por cada 5 s en «(program)», o sea tiempo nativo dentro de las llamadas de GL (sombras, pases del posprocesado, objetivos con MSAA). La sede, además, paga el AO (vuelve a dibujar toda la escena y recorre el grafo con `traverse`).
- **GPU:** con sombras, la calle da 8,6 ms, el pueblo 8,6 y la sede 16,5 (ya en el límite de 16,7). Ultra queda en 36 ms por la segunda luz solar y el AO en exteriores: solo para fotos.
- **Móvil (CPU x4):** en Medio la calle y el pueblo rondan 26 a 28 fps y la sede 32: el objetivo de 30 fps está al límite. En Alto con CPU x4 baja a 12 a 17 fps, por eso Alto es solo para ordenador.
- **Medidas de esta tanda:** A* con tablas reutilizadas y tope de nodos para las personas (no para el jugador), sombra solo de quien está a menos de 26 m, esqueletos ocultos sin recalcular matrices, precompilación de shaders y KTX2 también en Medio. Lo que queda es estructural: 4.700 huesos con animación en CPU (punto 20), la ciudad entera en una malla de navegación de 0,75 m (punto 21) y los niveles de detalle (punto 19).
- `docs/RENDIMIENTO_antes.md` guarda la medición anterior a estos cambios, para comparar.

## Tiempo de apertura de la calle real (`node tools/fases_construccion.js`)

| Fase | Antes | Ahora |
|---|---|---|
| Texturas del mundo (KTX2) | 1,2 s | 1,3 s |
| Datos de la ciudad y geometría (edificios, aceras, detalle, fusión) | 1,4 s | 1,4 s (la geometría en sí son 0,6 s) |
| Tu personaje | 4,5 s (en realidad, compilación de shaders con la ciudad ya dibujándose) | 0,4 s |
| Vecinos y vida de la calle | 2,1 s | 2,0 s (primeros 18 vecinos al abrir; el resto, por lotes de 6 en los 2 s siguientes) |
| Compilar shaders | 2,0 s tras quitar la pantalla de carga | 0,4 s antes de quitarla |
| **Total hasta poder jugar** | **11,2 s** | **5,6 s** |

Conclusión: la geometría de la ciudad no era el cuello de botella; lo era dibujar la escena antes de tiempo, con la compilación de shaders bloqueando el primer fotograma. Ahora no se dibuja hasta que la ciudad y las personas están en la escena y sus shaders se compilan en paralelo (`compileAsync`).

## Apertura de cada escena (12 oct 2026, tras el trabajo de la Fase 2)

| Escena | Antes | Ahora | Qué cambió |
|---|---|---|---|
| Calle real | 11,2 s | 5,8 s | sin dibujar hasta compilar los shaders en paralelo; vecinos por lotes; ciudad por trozos |
| Pueblo | 8,0 s (estimado) | 5,3 s | sin dibujar hasta compilar, modelos de personas adelantados |
| Sede | 8,2 s | 5,7 s | además, los muebles se cargan mientras se decodifican las texturas |
| Ciudad deportiva | 6,0 s (estimado) | 4,5 s | sin dibujar hasta compilar |

Medido con `node tools/fases_construccion.js [club] [escena]`.
