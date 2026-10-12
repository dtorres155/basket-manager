# Rendimiento por escena y nivel de calidad

Medido el 2026-10-12 con `node tools/informe_rendimiento.js` en una Intel Iris Xe (1280x800, ciudad joventut-badalona). «CPU» es el tiempo de JavaScript por fotograma (ScriptDuration de CDP); «x4» es con la CPU frenada cuatro veces (proxy de un móvil). «GPU» es el tiempo de dibujo esperando a la tarjeta (gl.finish); las sombras se miden forzando su actualización en cada fotograma (en el juego van a ritmo reducido). Los presupuestos están en `docs/PRESUPUESTOS.md`.

| Escena | Nivel | Construcción (s) | fps x1 | CPU x1 (ms) | fps x4 | CPU x4 (ms) | GPU con sombras (ms) | GPU sin sombras (ms) | Llamadas | Triángulos | Nodos | Texturas (MB) | Gente |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| calle | medio | 7.1 | 61 | 5.9 | 30 | 31.62 |  | 3.9 | 116 | 314 k | 5513 | 235 | 53 |
| calle | alto | 8.6 | 48 | 12.41 | 19 | 51.8 | 6.7 | 4.5 | 202 | 712 k | 7524 | 97 | 75 |
| calle | ultra | 9.7 | 28 | 29.46 | 9 | 121.52 | 26.7 | 12.6 | 990 | 2002 k | 8705 | 97 | 92 |
| pueblo | medio | 4.0 | 61 | 6.53 | 25 | 37.06 |  | 3.1 | 149 | 390 k | 1745 | 214 | 9 |
| pueblo | alto | 5.7 | 53 | 12.34 | 16 | 57.07 | 6.9 | 5 | 276 | 803 k | 2080 | 77 | 14 |
| sede | medio | 2.9 | 61 | 6.28 | 30 | 31.32 |  | 3 | 122 | 176 k | 2068 | 210 | 21 |
| sede | alto | 7.7 | 37 | 26.49 | 13 | 79.37 | 16.2 | 9.4 | 699 | 1849 k | 2195 | 434 | 21 |
| pabellón | medio | 13.3 | 61 | 2.2 | 61 | 10.56 |  | 0.8 | 34 | 52 k | 529 | 190 | 6 |
| pabellón | alto | 11.8 | 61 | 2.85 | 50 | 17.9 | 2.5 | 0.9 | 45 | 96 k | 524 | 52 | 6 |

Lectura: el cuello de botella de cada fila es el mayor entre CPU y GPU respecto a 16,7 ms (60 fps) o 33 ms (30 fps). Con la CPU a x4 el tiempo de script se multiplica; si supera 33 ms el juego baja de 30 fps en un móvil de gama media.
