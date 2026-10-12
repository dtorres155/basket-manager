# Rendimiento por escena y nivel de calidad

Medido el 2026-10-12 con `node tools/informe_rendimiento.js` en una Intel Iris Xe (1280x800, ciudad joventut-badalona). «CPU» es el tiempo de JavaScript por fotograma (ScriptDuration de CDP); «x4» es con la CPU frenada cuatro veces (proxy de un móvil). «GPU» es el tiempo de dibujo esperando a la tarjeta (gl.finish); las sombras se miden forzando su actualización en cada fotograma (en el juego van a ritmo reducido). Los presupuestos están en `docs/PRESUPUESTOS.md`.

| Escena | Nivel | Construcción (s) | fps x1 | CPU x1 (ms) | fps x4 | CPU x4 (ms) | GPU con sombras (ms) | GPU sin sombras (ms) | Llamadas | Triángulos | Nodos | Texturas (MB) | Gente |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| calle | medio | 4.7 | 60 | 5.24 | 30 | 31.2 |  | 2.8 | 116 | 329 k | 5467 | 97 | 53 |
| calle | alto | 5.9 | 46 | 10.53 | 16 | 58.81 | 8.9 | 4.3 | 170 | 763 k | 7553 | 97 | 75 |
| calle | ultra | 5.7 | 23 | 27.87 | 9 | 117.44 | 27 | 10.4 | 978 | 2042 k | 8718 | 97 | 92 |
| pueblo | medio | 3.0 | 61 | 7.04 | 33 | 27.16 |  | 2.4 | 150 | 390 k | 1745 | 77 | 9 |
| pueblo | alto | 8.9 | 50 | 8.69 | 18 | 51.32 | 8.2 | 4.5 | 262 | 781 k | 2080 | 77 | 14 |
| sede | medio | 3.3 | 61 | 5.98 | 35 | 26.38 |  | 2.6 | 121 | 176 k | 2068 | 72 | 21 |
| sede | alto | 7.9 | 37 | 23.83 | 12 | 82.33 | 15.3 | 9 | 693 | 1788 k | 2195 | 163 | 21 |
| pabellón | medio | 10.5 | 61 | 2.74 | 61 | 9.99 |  | 0.6 | 33 | 52 k | 807 | 52 | 10 |
| pabellón | alto | 10.4 | 61 | 3.81 | 47 | 18.78 | 2.5 | 1.7 | 45 | 96 k | 2320 | 52 | 32 |

Lectura: el cuello de botella de cada fila es el mayor entre CPU y GPU respecto a 16,7 ms (60 fps) o 33 ms (30 fps). Con la CPU a x4 el tiempo de script se multiplica; si supera 33 ms el juego baja de 30 fps en un móvil de gama media.

## Prueba de WebGPU (punto 24, `node tools/webgpu_spike.js`)

Misma escena en WebGL2 y en WebGPU (Three.js 0.186, Intel Iris Xe, Edge con WebGPU disponible): 20.000 cubos instanciados con sombras más cubos sueltos.

| Cubos sueltos | WebGL2 (mediana) | WebGPU (mediana) |
|---|---|---|
| 500 | 6,2 ms (58 fps) | 7,1 ms (49 fps) |
| 3.000 | 29,8 ms (32 fps) | 50,2 ms (17 fps) |

**Decisión: seguir con WebGL2.** En este equipo WebGPU con Three.js es más lento en CPU cuando hay muchas llamadas de dibujo (que es el caso del mundo del juego), el soporte en móviles Android es desigual y exigiría rehacer los shaders con onBeforeCompile (triplanar, interior mapping, multitud) en nodos TSL. Se reabre cuando Three consolide el renderizado por lotes de WebGPU o si la multitud pasa a necesitar *compute shaders*.
