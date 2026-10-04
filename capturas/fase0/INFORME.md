# Fase 0: informe (5 oct 2026)

Entorno: Node 24, Edge con Playwright, 390×844 a 2× con pantalla táctil. Script: `node tools/capturas.js fase0` (y `--lento` para simular CPU 4 veces más lenta). Partidas de prueba: Joventut (ACB) en los cuatro modos, carrera desde cadete y desde liga europea.

- `npm install`, `npm test` (26/26, «Todas las pruebas pasan»), `npm run build` (665 KB) y `npm run serve`: todo correcto.
- **Consola: ningún error ni aviso** en todo el recorrido (73 capturas).

## Rendimiento (`rendimiento.txt` y `rendimiento_cpu4.txt`)
| Escena | CPU normal | CPU ×4 (móvil medio) |
|---|---|---|
| Ciudad deportiva | 60 fps | **10 fps** (fotogramas de 150 ms) |
| Mapa de la ciudad | 60 fps | **8–25 fps** |
| Pueblo | 60 fps | **13–15 fps** |
| Pabellón | 60 fps | 60 fps |
| Casa (3 vistas) | 60 fps | 60 fps |
| Partido en directo (previa) | 60 fps | 60 fps |

La calidad por defecto es «alta». Ciudad deportiva, mapa y pueblo van mal en un móvil medio: los limita la CPU, probablemente por demasiados objetos sueltos y por las animaciones.

## Lo que se ve mal, por prioridad

### P1: errores de juego
1. **Ahorros iniciales de 5000 k€ (5 M€) en cualquier origen.** Afecta también a un cadete de 14 años (`carrera.js:66`, `dinero: 5000`).
2. **El cadete vive en la «residencia universitaria».** Vivienda, Estilo de vida y Vida social están bloqueadas con ese texto, y Mi casa muestra «Habitación de la residencia, Campus, Universidad», aunque esté en la cantera de Badalona (`fase === 'ncaa'` cubre también la etapa de cantera: `ui.js:639`, `hogar.js:73`, `carrera.js:321`).
3. **La partida no se guarda al crearla.** Si cierras el juego el primer día, «Continuar partida» no aparece y se pierde.
4. En el partido en directo, el botón **«Simular sin verlo»** es casi invisible en tema oscuro (texto oscuro sobre negro).

### P2: interfaz
5. **Escudos con siglas cortadas** (TEN, BI, ZA, CO, LL, RMA) y con letra de sustitución con serifa, en la elección de club y en el calendario.
6. **Barra inferior con 8 iconos** (presidente): las etiquetas «Directiva» y «Calendario» se tocan.
7. **Cabecera:** el nombre del club se corta pronto («Asisa Jove…») y en carrera el subtítulo ocupa dos líneas.
8. **Filas de botones que se salen por la derecha** sin pista de que hay más («Calidad: alt…», «Academia…», barrios, «Copas y…», pestañas de Ciudad). En Mi casa del modo DT, la pestaña ya no se ve.
9. **Títulos de sección incoherentes:** «Cambiar de vivienda», «Invitar a casa» e «Infraestructuras» salen en gris sin banderín.
10. **Secciones vacías sin texto:** «Resultados» (calendario) y «Últimos movimientos» (finanzas).
11. Botones que parten el importe en dos líneas («Organizar, 6 / k€»).
12. En la plantilla, la barrita verde junto a la valoración no tiene etiqueta y no se sabe qué indica.

### P3: 3D (calidad visual, para la fase 2)
13. **Ciudad deportiva, mapa de la ciudad y pueblo** tienen trazado radial «de rueda»: círculos planos blancos unidos por radios. Parece un esquema, no un lugar. Los edificios se ven diminutos y la cámara está lejos.
14. **Pueblo:** río y carreteras en escalera (cuadrícula), justo lo que querías evitar.
15. **Pabellón:** público de cubos flotantes y gradas grises lisas. La pista está bien.
16. **Casa:** habitaciones casi vacías («Muebles 0»), personaje diminuto, fondo azul plano. La vista «Fuera» tiene un cielo naranja raro.
17. **Partido en directo:** jugadores en forma de cilindro y pista pequeña y lejana. Debajo queda medio pantallazo negro vacío.

### Datos (para la fase 3)
- Joventut tiene 0 títulos en la sala de historia (tiene Euroliga, ligas y copas reales).
- Ricky Rubio aparece en Joventut con contrato hasta 2030 a los 36 años. Hay que comprobarlo con fuentes.

### Lo que está bien
- «La camiseta» funciona: los colores del club se aplican bien, los banderines y los marcadores Doto tienen personalidad, y el tema oscuro del creador de personaje se lee bien.
- El flujo de creación (modo, personaje, liga, club y pilares) va sin tropiezos en los cuatro modos.
- Las listas, la plantilla, el mercado y la directiva del entrenador son legibles y tienen buen tamaño táctil.
