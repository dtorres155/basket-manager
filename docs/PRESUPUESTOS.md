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
