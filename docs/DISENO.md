# Dirección de diseño

## Interfaz: «La camiseta»
La aplicación se viste con los colores del club del usuario. `ui.js` (`aplicaKit`) calcula `--club` (relleno), `--club2` (ribete) y `--club-ink` (texto sobre el relleno) a partir de los dos colores del escudo, cambiando al primario si es demasiado claro. Hay tema claro («calle», hormigón claro) y oscuro («noche»), interruptor en el menú.

- **Tipografía:** Graduate (rotulación de camiseta, títulos), Bricolage Grotesque (texto), Doto (marcador de puntos luminosos, solo para los resultados).
- **Cabecera:** banda del color del club con ribetes dobles como el cuello de una camiseta; el cuerpo de la pantalla queda debajo.
- **Secciones:** títulos en forma de banderín. **Listas:** hojas de plantilla con líneas de puntos. **Próximo partido:** entrada con muescas. **Dorsales de valoración:** forma de escudo. **Marcadores:** puntos luminosos ámbar sobre negro.
- **Evitar:** papel crema + serifa, oscuro con acento ácido, tarjetas de SaaS, etiquetas en mayúsculas pequeñas, fuente monoespaciada para metadatos, puntos medios y flechas como adorno, listas de viñetas con negrita.
- **Móvil:** diseño pensado para 390×844 con zona segura, navegación inferior (6-8 iconos), hojas modales desde abajo. Todo es táctil.

## Escenas 3D
Cámara orbital táctil (un dedo gira, dos dedos acercan, toque = seleccionar). Luz de día, tarde y noche (`GM.campus.ambiente`). Texturas por canvas (fachadas, hierba, parquet, asfalto, rótulos con siglas del club). Animaciones ligeras (banderas, grúa, coches, personas, balón).

Escenas: ciudad deportiva (parcelas fijas por club, obras por fases, edificio emblemático), pabellón (interior evolutivo, iluminación por niveles, formas propias por club), mapa y calle de la ciudad (barrios, lugares interactivos), pueblo natal (pueblo de colina amurallado tipo Monteriggioni con estilo regional español: crece de aldea a ciudad, con arrabal fuera de la muralla y barrio nuevo; mural con tu dorsal, pabellón y hospital con tu apellido), casa del jugador (exterior, edificio y habitaciones con muebles por nivel), partido en directo.

Límite actual: todo son primitivas procedurales y se ha afinado sin ver el resultado. La mejora principal es cargar **modelos glTF y texturas reales** (por ejemplo de Kenney, Quaternius o Poly Haven, con licencia libre) y usar formas orgánicas (LatheGeometry, ExtrudeGeometry, curvas, InstancedMesh).

## Principios de juego
- Tres modos de «gestión» con distinto papel: **presidente** (legado, alma del club, influencia, decisiones), **director técnico** (plantilla y fichajes) y **entrenador** (táctica, vestuario, confianza de la directiva), más **carrera de jugador** (desde cadete, cantera, universidad o liga europea).
- Reputación del jugador de 9 grados, difícil de ganar, con estatus por club (de Recién llegado a Leyenda del club); fichar por un rival cuesta reputación; subir de liga la reduce; un veterano que baja de liga llega como figura.
- Nivel de vida (0-5) según fase y éxito: desbloquea tipos de vivienda y muebles.
- Progresión del jugador deliberadamente lenta (con el máximo potencial: 58 de nivel a los 18, 65 a los 20, 73 a los 23).
- **Potencial dinámico (carrera):** lo que haces mueve tu potencial como mucho ±8 puntos sobre el de partida, hasta los 27 años (`carrera.js`, `ajustarPot`, `c.potencial`). Suben: entrenar intenso, constancia de foco, buen ánimo, el mentor y jugar minutos de joven. Bajan: lesiones, cansancio, noches de fiesta y no jugar. Simulado en 4 temporadas: disciplinado +3, normal 0, juerguista −4 (`tools/sim_potencial.js`). La ficha del jugador muestra los motivos del mes.

## Dirección de arte del mundo 3D (punto 3 de la hoja de ruta)
- **Luz:** suave, cotidiana, de tarde y cálida; sol con sombras largas y blandas, cielo azul lechoso, nunca contrastes duros ni saturación de videojuego. Noche: pocas luces, cálidas (2700 K), con charcos de luz bajo las farolas; ventanas encendidas sin que lo estén todas.
- **Paleta:** tierras, ocres, grises cálidos, verdes apagados; el color vivo solo en rótulos, ropa, coches y el club. Nada de blanco ni negro puros.
- **Materiales:** siempre con rugosidad y relieve (nada plano y brillante); variación a gran escala (manchas, desgaste) para romper repeticiones; suciedad en las esquinas, humedad en la base de los muros.
- **Escala:** 1 unidad = 1 m real. Puertas de 2,1 m, aceras de 2 a 4 m, plantas de 3 m; personas de su altura real.
- **Vida:** ningún espacio vacío; todo sitio tiene huellas de uso (bolsas, bicis, carteles, plantas, ropa tendida). Interiores con desorden cotidiano.
- **Tono:** realista y cotidiano; humor suave, nada épico ni de maqueta.
- **Sí / No:** sí un portal con buzones y una bici atada; no una caja blanca con puerta. Sí asfalto con parches y marcas gastadas; no gris uniforme.
- **Referencias por escena** (a reunir en `docs/referencias/`, 15 por tipo): calle, plaza, interior de vivienda, pueblo, pabellón.
- **Juez:** `node tools/banco.js` produce siempre las mismas vistas para comparar antes y después.

## Guía de interiores (punto 47)
- **Luz:** cálida y suave (focos de techo y lámparas con `PointLight` baratas, ventanas con luz de fuera), sombras de contacto bajo los muebles y rebote de color en el suelo. Nada de una sola luz blanca uniforme.
- **Desorden cotidiano:** cada sala lleva su capa de objetos pequeños (`interiores_vida.js`, `GM.interioresVida.decorar`): tazas, libros, plantas, ropa, mando de la tele en el salón; botellas y toallas en el vestuario; papeles y bandejas en hospital, colegio y estación. Se reparte con semilla fija por sala y sin tapar puertas ni caminos.
- **Gente:** cada tipo tiene su `GENTE` (personal y público) con rutina por hora; ninguna sala con puerta queda vacía.
- **Plantilla:** `TIPOS` en `interiores_pueblo.js` (suelo, muro, piso, anexos por `lista()`, sala principal por `principal()`); el pabellón añade vestuarios, gimnasio, fisio, prensa y VIP.
- **Comprobación:** `node tools/interiores_ciudad.js <club> <tipos>` falla si un interior sale con pocas mallas o sin gente, y deja capturas en `capturas/interiores_ciudad/`.
