# Hoja de ruta 2: consolidar, rehacer el aspecto y medir (desde el 24 oct 2026)

Sustituye como guía a `docs/HOJA_DE_RUTA.md` (puntos 1 a 84, cerrados) y a la lista viva de `docs/PENDIENTE.md`. Los pendientes antiguos que siguen vigentes están dentro de esta hoja con «antes N». La numeración sigue desde el 85.

## 1. Diagnóstico

### Lo que se ve (capturas del 22 oct, calidad alta, Badalona y pueblo)
1. **La ciudad son cajas con pegatina.** Las fachadas se pintan en un lienzo (tres variantes con ventanas repetidas) y el material real solo añade relieve: revoque `Plaster003` en todas las ciudades, ladrillo `Bricks085` en EE. UU. Todos los tejados son el mismo hormigón `Concrete034`. El juego entero tiene **15 materiales reales**.
2. **Escalas de textura incoherentes.** Las texturas se proyectan en coordenadas del mundo con una escala puesta a mano en cada llamada: sillares enormes arriba de la muralla del pueblo y diminutos en el lateral; tablas de parqué de casi un metro en el pabellón y en la casa; baldosas de cocina gigantes.
3. **Cosas puestas a voleo.** Manchas marrones sobre el suelo gris junto al pabellón, palmeras y árboles de bola mezclados sin criterio, nubes en franjas bajas que cruzan la vista aérea.
4. **Vacíos.** De media hay 163 edificios por ciudad (Atlanta, 54). Entre manzanas quedan explanadas grises lisas.
5. **Edificios icónicos genéricos.** El Palau Olímpic es una cúpula blanca redonda que no se parece al real.
6. **Interiores mezclados y pobres.** Sofá realista junto a una cama de juguete; tienda hecha de cajas con camisetas planas flotando en la pared; escaleras como bloques negros; sin zócalos, marcos, lámparas ni objetos.
7. **Cámara y lectura.** Vista muy picada y cercana. El recorte de edificios alrededor del personaje es un círculo tramado (antes 77). Cartel 3D y etiqueta repiten el mismo texto. La barra superior del mundo tiene 8 botones.
8. **Tres estilos de persona a la vez:** Quaternius, Mixamo y la multitud lejana.
9. **Interfaz 2D pensada para el móvil:** una sola columna en una pantalla ancha, tablas con columnas vacías (Energía), 8 pestañas en Plantilla.
10. **Datos planos:** en la Penya, siete jugadores tienen 70 de media.

### Rendimiento (tu Intel Iris Xe, `docs/RENDIMIENTO.md`)
- Calle en alto: 46 fps, 5,9 s de carga, 170 llamadas de dibujo. Sede en alto: 37 fps, 693 llamadas y 1,8 millones de triángulos (pesa más que la ciudad). Ultra: 23 fps.
- Cada persona de Mixamo son unas 6 mallas: con 50 en la calle, unas 300 llamadas más. No está medido en tu tarjeta.
- La partida guardada ocupa 3,6 MB sin comprimir (el calendario, cerca de 1 MB).

### Código y forma de trabajar
- 231 archivos JS (4,7 MB), 167 módulos cargados, 190 herramientas y 59 pruebas; 84 puntos en 37 tandas.
- Mucha amplitud y poca profundidad: casi todo funciona y pasa sus pruebas, pero casi nada está pulido, y no hay notas tuyas jugando (`docs/NOTAS_PRUEBA.md` está vacío).
- Conviven dos generaciones de escenas (ver la sección 3). Hay archivos gigantes: `sede3d.js` tiene 3.790 líneas y la ciudad real (`calle_real*`) unas 7.000.

**Causa de fondo:** se ha construido por peticiones sueltas, cada una «terminada» cuando pasaba su prueba, sin una referencia visual fija con la que comparar y sin tus notas de juego. De ahí los bandazos.

## 2. Principios
1. **Profundidad antes que amplitud:** nada de ligas, sistemas ni apps nuevos hasta cerrar las fases A a E.
2. **Rebanada vertical:** primero se llevan a calidad de referencia Badalona (calle, plaza, paseo y pabellón por fuera y por dentro), tu casa, la tienda, la sede y el pueblo. Después se escala con reglas a las otras 119 ciudades.
3. **Reglas, no azar:** cada material, árbol, farola o mancha sale de una regla (tipo de calle, época del edificio, orientación, altura). Nada a voleo.
4. **Escala real en metros:** cada material declara cuánto mide lo que muestra (una tabla, un ladrillo, una baldosa) y cada modelo, su tamaño real.
5. **Un estilo por calidad** (`docs/DIRECCION_ARTE.md`): en alta todo realista, también las personas.
6. **Medir en tu equipo:** cada fase se cierra con capturas antes y después en las mismas vistas y con la medida de rendimiento.
7. **No cambiar de motor:** el problema es de contenido y de reglas, no de Three.js.

## 3. Revisión: lo mal hecho o sin valor

| Qué | Problema | Propuesta |
|---|---|---|
| `hogar3d.js` (1.266 líneas) | Casa antigua de Kenney que sigue montada en la pantalla Ciudad; duplica `casa3d.js` | Quitarla; Ciudad abre la casa nueva |
| Escenas de la primera generación (`ciudad3d.js`, la escena de `campus.js`, `pueblo3d.js`, la escena de `estadio.js`) | El mundo paseable ya las sustituye; se mantienen por inercia | Retirarlas y sacar `GM.campus.config` (calidad y nivel) a un módulo `calidad.js` |
| Calle inventada (`calle3d.js` sintética, `calle_sintetica.js`) | Solo hace falta para clubes sin datos (antes 74) | Dejarla como respaldo mínimo; no se mejora |
| Personas: Quaternius con poses por código (`sentar()`, bici), Mixamo y multitud en la GPU | Tres estilos y dos esqueletos | Mixamo para todos en alta (también los jugadores con la camiseta), impostores para la multitud; Quaternius solo en normal |
| Música: sintética, 4 bucles reales y voces del navegador | Las voces suenan robóticas | Bucles reales y efectos; quitar las voces sintéticas |
| Traducción al inglés (80 %) | Sin valor si juegas tú en español | Congelarla |
| Accesibilidad completa (lector de pantalla, mando, teclas, daltonismo) | Para uso personal sobra mantenerla | Dejarla como está, sin ampliarla |
| Vida y economía (patrimonio, negocios, gestión del pueblo, rutina, coleccionables, logros económicos, encargos y minijuegos, apps del móvil) | Mucha superficie, poco enlazada entre sí y con el baloncesto; nadie la ha jugado una temporada | Decides tú con la pantalla «¿Qué usas?» (punto 88); lo que no uses se oculta y deja de mantenerse |
| `fans.js`, `sponsor.js`, `continental.js`, `directiva_ia.js` (origen dudoso) | Solo se enganchan por eventos; posible solape con rivalidades, prensa y competiciones | Revisarlos y fusionarlos o quitarlos |
| Ligas con plantillas ficticias (LEB Oro y Plata, segundas de Italia, Alemania, Francia y Grecia, 14 clubes sin plantilla real) | Relleno sin datos | Dejarlas; no añadir más ligas |
| 190 herramientas | Muchas sirvieron para una sola tanda | Archivar en `tools/archivo`; dejar unas 25 vivas |
| `sede3d.js` | Demasiado grande para tocarlo con seguridad | Partirlo (cámara, personas, salas, bucle) |
| Recorte circular tramado (antes 77) | Se ve como un agujero | Que la fachada que tapa se desvanezca entera, o cortar por plantas |
| Etiquetas repetidas | Cartel y etiqueta dicen lo mismo | Etiqueta solo si no hay cartel, y al acercarse |
| Cúpula genérica del pabellón | No se reconoce ningún pabellón | Planta real de OpenStreetMap y modelo propio para tu club (antes 38) |

## 4. Fases y puntos

### Fase A. Base para trabajar con criterio (1 tanda)
- **85. Galería de referencia:** 24 vistas fijas generadas solas, de día, tarde y noche: calle a pie y aérea, plaza, paseo, pabellón por fuera y por dentro, tienda, sede, casa, y en el pueblo la plaza, la puerta y una calle. Una página antes y después para comparar tanda a tanda. *Hecho cuando* cada tanda visual deja su página.
- **86. Medir rendimiento dentro del juego:** botón en Ajustes que hace un recorrido de 30 s por la calle, la sede y el pabellón y guarda el informe en `Documentos\BasketManager`, donde lo leo yo. Sin consola ni herramientas.
- **87. Notas de prueba dentro del juego:** tecla F8 (y un botón) en cualquier pantalla: guarda captura, texto o dictado y una nota del 1 al 5 en la misma carpeta. Tus pruebas me llegan sin copiar nada.
- **88. Pantalla «¿Qué usas?»:** lista de sistemas con tres opciones: me gusta, me da igual, quitar. Decide qué se mantiene y qué se oculta.
- **89. Limpieza sin cambios visibles:** quitar `hogar3d` y las escenas de la primera generación, crear `calidad.js`, archivar herramientas y partir `sede3d.js`.
- **90. Presupuesto en tu equipo:** calle en alto a 50 fps o más en 1280×800 (o 1080p con resolución dinámica), carga de 4 s o menos e interiores a 60 fps. El build falla si se supera.

### Fase B. Materiales y texturas (1 o 2 tandas)
- **91. Biblioteca de materiales:** de 15 a unos 60 materiales PBR de ambientCG (CC0): unos 15 de fachada, 8 de tejado, 12 de suelo exterior (panot, adoquín, asfalto con parches, tierra, césped, losas), 15 de interior (parqués, gres, terrazo, moqueta, azulejo de cocina y de baño), metales y maderas. En KTX2 para el escritorio y una versión ligera para normal.
- **92. Escala real por material:** cada material dice cuánto mide su imagen (por ejemplo, 7 cm por tabla de parqué). Edificios y objetos llevan coordenadas de textura por cara en metros; la proyección en el mundo queda solo para los suelos grandes. Corrige la muralla, el parqué y las baldosas.
- **93. Sin repetición visible:** mezcla de dos escalas y variación de tono a gran escala, suciedad por altura (zócalo, churretones bajo las ventanas) y oscurecido en esquinas (antes 64).
- **94. Reglas de asignación:** el material sale de la tipología y la época del edificio, que ya vienen en los datos (`tipo`, `ex`). Casco antiguo: piedra o revoque. Ensanche: ladrillo con balcones. Bloques de los años 60 y 70: obra vista. Moderno: hormigón y vidrio. Industrial: chapa. Una tabla por país.
- **95. Fuera lo puesto a voleo:** quitar las manchas del suelo, los árboles y palmeras sin regla y las nubes bajas; las calcomanías solo donde tienen sentido.

### Fase C. Badalona de referencia (2 o 3 tandas)
- **96. Fachadas con relieve:** un kit de piezas montado por reglas según la tipología: planta baja comercial (persianas, rótulos, toldos), balcones con barandilla, marcos y alféizares con profundidad, cornisas y portales. Las ventanas ya tienen interior simulado de noche; falta que se vea también de día (antes 63).
- **97. Manzanas completas:** rellenar los huecos con edificios coherentes con el barrio, patios de manzana, solares vallados y aparcamientos. Ninguna explanada gris (antes 70).
- **98. Calles de verdad:** bordillo en 3D, alcorques, vados, alcantarillas, pasos de cebra en los cruces, señales y semáforos de peatones por regla, asfalto con parches y marcas viales (antes 65).
- **99. Vegetación por regla y especie:** plátanos en alcorque en las aceras anchas, palmeras solo en el paseo marítimo, parques con césped, setos y caminos; árboles con modelo real en alta.
- **100. Pabellones reconocibles:** el Palau Olímpic con su forma real; para los demás clubes, el pabellón sale de su planta en OpenStreetMap con tejado y fachada según el tipo (antes 38).
- **101. Personalidad de ciudad:** paseo marítimo, playa, el Pont del Petroli y la Rambla en Badalona, como ejemplo de lo que tendrá cada ciudad (antes 68).
- **102. Cielo, luz y clima:** nubes altas de verdad, niebla calibrada, suelo mojado con reflejos cuando llueve, farolas que iluminan el suelo de noche.
- **103. Cámara:** tercera persona más baja, con zoom libre hasta la altura de los ojos. Los edificios que tapan se desvanecen por fachada en vez del círculo tramado. Etiquetas solo al acercarse y nunca encima de un cartel. Barra superior con 3 botones y el resto en un menú (antes 77).
- **104. Vida con sentido:** terrazas con gente sentada, comercios que abren y cierran la persiana, coches aparcados, gente que espera en el semáforo, repartidores, perros (antes 67 y 69).
- *Fase hecha cuando* en las 24 vistas no hay nada gris liso, nada repetido a simple vista ni nada puesto sin regla, y tú le das al menos un 4 sobre 5.

### Fase D. Personas (1 o 2 tandas)
- **105. Una malla por persona:** la conversión de Mixamo rehace un esqueleto común y funde las piezas: de 6 llamadas de dibujo a 1, con las texturas en un atlas KTX2 de 1024.
- **106. Niveles de detalle:** 8.000 triángulos cerca, 2.000 a media distancia e impostor (una imagen) lejos. La multitud lejana usa los mismos modelos.
- **107. Variedad:** de 40 a 60 personajes (mayores, gente de trabajo: policía, camarero, repartidor) y recoloreado de la ropa por máscara para que no se repitan.
- **108. Jugadores con la camiseta del club:** modelo atlético de Mixamo con la equipación generada con los colores y el dorsal. Quaternius queda solo para calidad normal.
- **109. Animaciones:** unas 25 (sentarse en banco y en silla, hablar por el móvil, beber, aplaudir, celebrar, botar, tirar, entrenar, barrer, pasear al perro). Sustituyen a las poses hechas por código.
- **110. Tu personaje:** el aspecto que eliges (cara, pelo, ropa) sobre el modelo de Mixamo.

### Fase E. Interiores (1 o 2 tandas)
- **111. Un solo estilo:** en alta, todo con objetos reales (Poly Haven y la biblioteca); Kenney solo en normal.
- **112. Kit de interior:** zócalos, marcos de puerta, ventanas con luz de fuera, lámparas que iluminan, techo visible al acercar la cámara, alfombras, cuadros, enchufes y radiadores.
- **113. Habitaciones por plantilla:** salón, cocina, dormitorio, baño y despacho se amueblan por reglas (el sofá frente a la tele, la mesa con sus sillas…), con el desorden cotidiano que ya existe (`interiores_vida.js`).
- **114. Pabellón por dentro:** graderío con asientos reales, marcador colgado con pantalla, canastas reales, parqué de tablas a escala, banquillos y mesa de anotadores.
- **115. Tienda, sede y casa con el kit:** estanterías con productos, perchas con camisetas, maniquíes y mostrador; vestuario, despacho y sala de prensa de la sede.

### Fase F. Rendimiento (en paralelo, en cada tanda)
- **116. Instanciar lo repetido** (farolas, bancos, árboles, ventanas) con `BatchedMesh` y un atlas de texturas de fachada.
- **117. Carga progresiva:** lo cercano en 1 o 2 s y el resto mientras caminas.
- **118. Sede en alto** (693 llamadas, 37 fps): fundir y quitar lo que sobra.
- **119. Partida más pequeña:** calendario jugado resumido y atributos en listas, de 3,6 MB a unos 1,5 MB.
- **120. Calidad dinámica con Mixamo:** cuántas personas se dibujan según los fps.

### Fase G. Interfaz para ordenador (1 tanda)
- **121. Diseño de escritorio:** dos o tres columnas en Inicio, Plantilla y Mercado, tablas densas con más datos, paneles laterales en vez de cambiar de pantalla y atajos de teclado. El móvil conserva la columna única.
- **122. Menos pestañas:** agrupar las 8 de Plantilla (y las de Club y Ciudad) según lo que decidas en «¿Qué usas?».
- **123. Directo del partido:** revisarlo con tus notas (no está visto en esta revisión).
- **124. Pasada de textos y coherencia:** tamaños, iconos y avisos de ayuda que no se repitan.

### Fase H. Juego y datos (después, con tus notas)
- **125. Valoraciones con más dispersión** dentro de cada plantilla y revisión con las estadísticas reales.
- **126. Una temporada jugada por ti** en tu modo principal, con notas (F8), y arreglo de lo que salga.
- **127. Equilibrio a largo plazo** con varias semillas: talento y economía (pendiente de la tanda 37).
- **128. Escalar a las demás ciudades:** aplicar las reglas de B y C a las 120 ciudades y pasar el barrido (antes 75).

## 5. Lo que te toca a ti (lo mínimo)
**Una vez, al empezar**
- Responder las cuatro decisiones de la sección 6.
- En la fase D, abrir Mixamo en el navegador de la app e iniciar sesión cuando te lo pida; yo elijo y descargo.
- Aprobar en el chat cada lote de descargas (te digo qué es, de dónde viene y cuánto pesa).

**En cada versión**
- Instalarla (se actualiza sola al abrir la app).
- Jugar un rato normal y, cuando algo te chirríe, pulsar F8 y decir una frase. Nada más.
- Si quieres, «Medir rendimiento» en Ajustes (un clic, 30 s).

Fuera de la app no tienes que hacer nada más.

## 6. Decisiones que necesito (con mi recomendación)
1. **Modo principal:** ¿cuál juegas de verdad (gestor, presidente, entrenador o carrera)? Recomiendo centrar la profundidad en uno y mantener los demás tal cual.
2. **Móvil:** ¿lo sigues usando? Si no, la calidad normal deja de recibir mejoras y solo se vigila que no se rompa.
3. **Ciudades:** Badalona y tu pueblo como referencia, y después las demás por reglas (recomendado).
4. **Idiomas:** congelar el inglés. ¿Catalán sí o no?

## 7. Orden y tamaño
- Tanda 38: fase A.
- Tanda 39: fase B.
- Tandas 40 a 42: fase C.
- Tandas 43 y 44: fase D.
- Tandas 45 y 46: fase E.
- Tanda 47: fase G.
- La fase F va dentro de cada tanda; la H, cuando haya notas tuyas.

Versión de escritorio al cerrar cada fase (salvo arreglos urgentes), con la página de la galería de referencia y la medida de rendimiento.
