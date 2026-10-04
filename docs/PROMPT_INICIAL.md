# Primer mensaje para Claude Code

Copia esto en la primera sesión (con la carpeta `basket-manager` abierta):

---
Lee `CLAUDE.md` y `docs/` completos. Ejecuta `npm install` y `npm test` y confirma que pasan las 26 pruebas.

Después abre el juego en un navegador real (`npm run build && npm run serve`), con una ventana de 390×844, y haz capturas de cada pantalla y escena 3D: inicio, plantilla, mercado, calendario, club (ciudad deportiva y estadio), ciudad (mapa y calle), pueblo, casa (fuera, edificio y habitaciones), partido en directo y el modo carrera desde cadete. Dime qué ves mal (proporciones, solapes, colores, rendimiento) antes de cambiar nada.

Objetivo de esta fase: mejorar la calidad visual del 3D y de la interfaz sin romper la lógica. Propón un plan en pasos pequeños (empezando por la ciudad deportiva y la casa), usa modelos glTF y texturas libres donde convenga, mantén las primitivas como modo de baja calidad, y verifica cada paso con capturas. Al final de cada paso, ejecuta `npm test`.

Reglas: respeta el contrato de módulos de `CLAUDE.md`, escribe todo el texto del juego en español, y respóndeme de forma breve y directa.
---

## Sesiones sugeridas
1. Captura y diagnóstico visual (sin cambios).
2. Campus y pabellón con modelos reales y mejor luz.
3. Casa y muebles (modelos, color de paredes y suelos, más piezas).
4. Ciudad, calle y pueblo (relieve, vegetación, edificios).
5. Partido en directo: jugadores con figura y animaciones.
6. Distribución: sin CDN, PWA/Android, rendimiento en un móvil real.
7. Datos: plantillas de BBL, BSL y GBL; equilibrio.
