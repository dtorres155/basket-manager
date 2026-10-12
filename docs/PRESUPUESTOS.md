# Presupuestos de rendimiento y perfiles de calidad

Medidos con `node tools/banco.js` (llamadas y triángulos tras construir la escena; la prueba falla si se superan) y `tools/real_fps.js` (fps con la CPU x4).

| Perfil | Dónde | fps objetivo | Llamadas | Triángulos | Memoria | Descarga web |
|---|---|---|---|---|---|---|
| Bajo | móvil flojo | 30 (CPU x4) | 300 | 0,8 M | 400 MB | 25 MB |
| Medio (`normal`) | móvil / PC modesto | 30 móvil, 60 PC | 400 | 1,2 M | 600 MB | 25 MB |
| Alto (`alta`) | PC | 60 | 1.500 | 3 M | 1,5 GB | escritorio: sin límite |
| Ultra | PC, fotos | 30 | sin límite | sin límite | 3 GB | solo escritorio |

Qué enciende cada perfil (hoy `normal` y `alta`; Bajo y Ultra, punto 2 de la hoja de ruta, se añaden al implementar luz y posprocesado):
- Bajo: sin sombras, sin posprocesado, 100 peatones, sin árboles reales, texturas 512.
- Medio: sin sombras en tiempo real (sombra pintada), muebles de Kenney, 1,5x de resolución.
- Alto: sombras, GTAO, bloom nocturno, muebles de Poly Haven, árboles realistas, recursos pesados.
- Ultra: Alto + cascadas de sombra largas, reflejos en pantalla, profundidad de campo en modo foto.

Reglas: si algo rompe una columna no se publica; lo caro va detrás de un perfil; se mide con la ciudad piloto (joventut-badalona) y con la más pesada del barrido.

## Medidas de GPU (Intel Iris Xe, 1280x800, `node tools/gpu_tiempo.js [club] [escena] [niveles]`)
Tiempo de dibujo por fotograma esperando a la GPU. La medida varía un 20 a 40 % entre ejecuciones (temperatura y reloj del equipo): leer como orden de magnitud.

| Escena | Nivel | Total | Coste de las sombras |
|---|---|---|---|
| Calle (Badalona) | Medio | 2,9 ms | 0 |
| Calle | Alto (antes: con AO en exteriores) | 19 ms | 6 ms |
| Calle | Alto (ahora: sin AO en exteriores) | 8 ms | 3 ms |
| Calle | Ultra | 39 a 44 ms | 23 a 31 ms |
| Pueblo | Alto | 9 ms | 5 ms |
| Sede (interior, 1,1 M triángulos) | Alto | 16 a 27 ms | 9 a 19 ms |

Decisiones tomadas con estas medidas: el AO (GTAO) repite toda la escena para sacar normales (≈8 ms), así que en exteriores solo va en Ultra y en interiores siempre; el mapa de sombras se refresca un fotograma de cada dos (cada uno en Ultra); en interiores el mapa es de 1536 y en Ultra de 3072 (más una segunda luz de 1536 para lejos). Pendiente: la sede (1,1 M triángulos) pasa del presupuesto de 16 ms en Alto; hace falta reducir sus triángulos o hacer que la sombra solo dibuje lo cercano.
