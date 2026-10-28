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
- **144. La ciudad sigue más allá** (añadido el 24 oct 2026, a petición tuya): fuera de la zona en la que se puede andar no hay escenario y la ciudad parece pequeña y vacía. Que se vea el resto de la ciudad aunque no se pueda pasear por ella:
  - Anillo lejano en todas las ciudades (hoy solo en unas 60; faltan datos del resto).
  - Más allá, manzanas generadas con baja resolución según la densidad del barrio, hasta 2 o 3 km.
  - Siluetas de los edificios altos y los conocidos de cada ciudad, como imágenes planas que siempre miran a la cámara.
  - Horizonte real: montes y mar a partir del relieve de 15 a 20 km alrededor (en Badalona, la Serralada de Marina y el Mediterráneo).
  - Una bruma atmosférica que lo funda todo con el cielo.
  - Al mirar desde arriba o a pie, ninguna vista debe acabar en un borde gris.
- *Fase hecha cuando* en las 24 vistas no hay nada gris liso, nada repetido a simple vista ni nada puesto sin regla, y tú le das al menos un 4 sobre 5.

### Fase C2. Ciudades de verdad (propuesta del 28 oct 2026, pendiente de tu visto bueno para las descargas)
Lo que falta para que una ciudad se reconozca no sale de OpenStreetMap: alturas exactas, la forma de los tejados, qué hay en cada acera y los sitios que la identifican. Se haría primero en Badalona, con datos oficiales abiertos, y después en el resto según haya datos.
- **145. Alturas y volúmenes exactos:** Catastro (INSPIRE, edificios y partes de edificio con su número de plantas, toda España salvo País Vasco y Navarra) en lugar de las plantas estimadas; en Alemania, Países Bajos, Nueva York y otras ciudades, sus modelos 3D LOD2 abiertos.
- **146. Tejados y suelo de verdad:** modelo 3D de edificios del ICGC (tejados con su forma) y ortofoto (PNOA o ICGC, 25 cm) para el color de cubiertas, patios y solares vistos desde arriba.
- **147. Relieve y arbolado finos:** LiDAR del IGN o el ICGC (relieve de 2 m que llega a varios kilómetros, sin el estirado más allá de 1 km) y los árboles reales con su altura; inventarios municipales de arbolado (especie y posición), farolas y bancos donde los haya.
- **148. Identidad de cada ciudad:** una ficha por ciudad, escrita a mano, con sus lugares conocidos (en Badalona, Dalt la Vila, la Rambla, el Pont del Petroli, la fábrica de Anís del Mono), su pavimento (panot), su mobiliario y sus colores, y los modelos de esos lugares.
- **149. Varias zonas paseables por ciudad:** en lugar de un solo círculo de 300 m, dos o tres zonas detalladas (pabellón, centro y playa o el sitio emblemático) unidas por metro o taxi, cada una con su vida.
- **150. Revisión ciudad por ciudad:** galería por ciudad, tu nota con F8 y una lista de fallos (huecos, explanadas, cosas puestas sin regla) que se cierra antes de pasar a la siguiente.
- Descartado como base: Google Photorealistic 3D Tiles. Es lo más realista, pero necesita tu cuenta de Google Cloud con facturación, no se puede guardar para jugar sin conexión ni modificar, y no se puede entrar ni pasear por ella. Podría servir solo como vista lejana con conexión.

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

### Fase M. Modelado: la forma de los objetos (añadida el 24 oct 2026, a petición tuya)
Además de texturas bien hechas, los objetos tienen que tener forma de verdad: hoy muchos son cajas, cilindros y conos. Va en paralelo a las fases C y E (el 96 usa el 131, el 99 usa el 133 y el 115 usa el 130).
- **129. Norma de modelado** para todo modelo nuevo o rehecho: escala real, pivote en la base, aristas con bisel (nada de cajas de canto vivo), normales suaves, coordenadas de textura en metros para los materiales reales, tres niveles de detalle y un presupuesto de triángulos por tipo, comprobado en `tools/modelos_presupuesto.js`.
- **130. Fuera las primitivas a la vista:** bancos (hoy cajas amarillas), farolas, papeleras, quioscos, marquesinas, señales, sombrillas (hoy de cartón), mostradores, estanterías y escaleras (hoy bloques negros) pasan a modelos reales (Poly Haven, Kenney, Quaternius) o modelados por código con bisel y detalle.
- **131. Kit de fachada modelado** (lo usa el 96): balcones con barandilla de barrotes, cornisas con molduras, marcos y alféizares con fondo, persianas enrollables, contraventanas, toldos, rótulos con letras en relieve, bajantes y aparatos de aire acondicionado.
- **132. Edificios singulares con su volumen:** el Palau Olímpic, y en el pueblo la iglesia, el ayuntamiento y la muralla (contrafuertes, arcos, almenas con grosor), y los monumentos de Badalona.
- **133. Vegetación modelada:** árboles con tronco y ramas por especie (plátano, palmera, pino, olivo), setos y arbustos que se mueven con el viento.
- **134. Taller de modelado:** Blender por línea de órdenes (gratuito) para generar, simplificar y empaquetar piezas con niveles de detalle. Necesita tu permiso para instalarlo (unos 400 MB); sin él, se modela por código y con modelos CC0 ya hechos.

### Fase V. Gente, vida y vehículos (añadida el 24 oct 2026, a petición tuya)
Profundiza lo que ya existe (`vecinos.js`, `dialogo.js`, `gente.js`, `gente_historias.js`, `vida.js`, `movilidad.js`, `vehiculos.js`, `personaje.js`): que la gente tenga sentido y que montar o conducir se vea bien. Va después de la fase D (necesita las personas nuevas) y junto a la M para los vehículos.
- **135. Vecinos con sentido:** cada persona con nombre tiene oficio, casa, horario y relación contigo; reacciona a tu fama, a cómo va el club, al tiempo y a la hora (saluda, pide una foto, te reprocha la derrota, te ignora). Nada de gente que anda sin destino.
- **136. Interacciones variadas y con consecuencias:** charlar, pedir o dar indicaciones, firmar un autógrafo, hacerse una foto, invitar a algo, discutir, comprar en un comercio o ayudar; cada una cambia algo (ánimo, fama, relación, dinero) y se recuerda (`st.sede.memoria`).
- **137. Diálogos de verdad:** cuadros de diálogo con varias respuestas, tono (amable, seco, gracioso), memoria de lo que dijiste y relaciones que suben o bajan (conocido, amigo, rival, pareja), con una ficha de cada relación.
- **138. Familia con peso:** padres, hermanos, pareja e hijos con visitas, llamadas, comidas, ayudas y conflictos, y efectos claros y visibles en tu ánimo, tu rendimiento y tu dinero; la familia se ve en casa y en la ciudad.
- **139. Montar y conducir bien:** postura real en la bici (pedales, manillar, inclinación), la moto y el coche (sentado al volante, manos en el volante, subir y bajar con su animación), y una cámara de conducción; hoy son poses hechas por código.
- **140. Vehículos que no parezcan de juguete:** coches, motos, bicis, autobuses y tranvía con modelos realistas (carrocería con volumen, cristales, ruedas con llanta, faros), en calidad alta, solo escritorio, con niveles de detalle y los colores de cada ciudad. Modelos CC0 si los hay; si no, de Sketchfab con atribución (vale para uso personal) o hechos con el taller del punto 134.
- **141. Personaje a tu gusto:** cara, peinado, cuerpo, ropa, tatuajes y complementos sobre el modelo realista; armario con la ropa que compras, peluquería en la barbería y la ropa del club que te dan.
- **142. Vida con más prestaciones:** amigos y quedadas, aficiones (gimnasio, cocina, videojuegos, música), citas y pareja, mascota que se ve y pide atención, y la casa que refleja tu vida (trofeos, fotos, desorden según tu estilo).

- **143. Historias que importan** (amplía `gente_historias.js`, hoy cinco personajes con capítulos sencillos): de 10 a 15 personajes originales, con personalidad propia y un arco largo de varias temporadas, con encargos, decisiones que cambian el final y un progreso que se ve en el mundo y en el juego gracias a ti. Ejemplos:
  - Pau, el niño del autógrafo, entra en la cantera, sube al primer equipo y acaba siendo tu compañero (hoy solo llega al juvenil y solo en modo gestor).
  - La camarera que, con tu ayuda, monta su propio bar: aparece en la ciudad, con tu foto en la pared.
  - El músico callejero que acaba tocando el himno en el pabellón.
  - El chaval del pueblo que estudia fisioterapia y termina en tu cuerpo médico.
  - La periodista novata que, gracias a tus exclusivas, llega a la televisión.

  Habrá un panel «Historias» con el punto en que va cada uno, avisos por el móvil cuando pase algo, y sus logros quedarán a la vista: comercios nuevos, carteles, su nombre en la plantilla o en la grada.

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

## 6. Decisiones (respondidas el 24 oct 2026)
1. **Modo principal: carrera.** La profundidad (fase H, interfaz de la fase G, galería y medidas) se centra en el modo carrera; los demás modos se mantienen sin ampliarlos.
2. **Móvil: no se usa.** La calidad normal solo se mantiene para que no se rompa; todo el trabajo visual es para calidad alta en ordenador.
3. **Ciudades:** Badalona y tu pueblo como referencia; después las demás por reglas.
4. **Idiomas:** inglés y catalán congelados (se quedan como están, sin ampliarlos).

## 7. Orden y tamaño
- Tanda 38: fase A.
- Tanda 39: fase B.
- Tandas 40 a 42: fase C.
- Tandas 43 y 44: fase D.
- Tandas 45 y 46: fase E.
- Tanda 47: fase G.
- Fase M (modelado, 129 a 134): en paralelo a C y E, empezando por el 130 (lo más visible) y el 131 (que necesita el 96).
- Fase V (gente, vida y vehículos, 135 a 143): después de la D; el 139 y el 140 van con la M.
- La fase F va dentro de cada tanda; la H, cuando haya notas tuyas.

Versión de escritorio al cerrar cada fase (salvo arreglos urgentes), con la página de la galería de referencia y la medida de rendimiento.

## Estado tras la fase A (24 oct 2026, versión 0.9.132)
- **85 hecho:** `node tools/galeria.js [etiqueta]` saca 24 vistas fijas (modo carrera, calidad alta, con sol y la hora parada) de la calle de Badalona (a pie, de juego y desde arriba; día, tarde y noche), el pabellón por fuera y por dentro, la tienda, la sede, la casa y el pueblo, con las llamadas de dibujo y los triángulos de cada una, y una página que pone cada vista junto a la de la galería anterior (`galeria/<etiqueta>/index.html`, fuera de git). Galerías guardadas: `0_antes_fase_A` y `1_fase_A`.
- **86 y 87 hechos:** Ajustes, Pruebas (`pruebas_juego.js`, `GM.pruebas`): «Medir ahora» recorre la calle, el pabellón, la sede y el pueblo y mide cuándo se ve cada escena, cuándo va fluida y sus fps; F8 en cualquier pantalla guarda captura, frase, nota y contexto. La app de escritorio lo guarda en `DocumentosBasketManager` con un puente seguro (`escritorio/preload.js` y `ipcMain` en `main.js`; solo cuatro carpetas, sin salir de ellas). Pruebas: `node tools/fase_a_ui.js` (navegador) y `node tools/escritorio_puente.js` (app real).
- **88 hecho:** «¿Qué usas?» lista las 12 pestañas añadidas del modo carrera con «Me gusta, Me da igual, Quitar»; las de «Quitar» se ocultan (`GM.ui.ocultas`) y la elección se guarda en `usos/usos_carrera.json`.
- **89 en parte:** fuera `hogar3d.js` (la casa antigua; la pestaña Casa de Ciudad ahora lista tus viviendas con «Entrar» a la casa paseable) y `pueblo3d.js` (la maqueta antigua; sus estilos regionales pasan a `estilos_pueblo.js`): 2.700 líneas menos. La calidad gráfica sale de `campus.js` a `calidad.js` (`GM.calidad`, con `GM.campus.config` como alias). 28 herramientas sin uso archivadas en `tools/archivo`. Quedan para más adelante: partir `sede3d.js` (se hará al rehacer la cámara, punto 103) y retirar las partes antiguas de `ciudad3d.js` y `campus.js`, que siguen siendo la base del mapa de Ciudad y de la ciudad deportiva.
- **90 hecho:** objetivo en `docs/PRESUPUESTOS.md` (exteriores a 50 fps, interiores a 57, fluida en 4 s) y paso «Fase A» en `npm run calidad` (de momento informa, no bloquea).
- **Fallos encontrados al mirar de verdad:** el HUD del mundo (brújula, reloj, flechas de objetivos, tarjeta del sitio, necesidades) y la barra de «Mi día» no se actualizaban nunca, y las acciones con muebles (dormir, tele, cocinar…) se cancelaban al empezar desde el ratón: `sede_hud.js` les pasaba un Proxy de la escena y ellos comparan `GM.sede._estado() === S`. Arreglado. Salir del mundo mientras carga ya no da error.
- **Medida de partida (este equipo, Iris Xe):** calle 12 s hasta verse y 27 s hasta ir fluida, 23 fps; pabellón 41 fps; sede 48; pueblo 52. La calle se queda parada unos 8 s justo después de aparecer: es lo primero de la fase F (punto 117).
- **Visto para la fase C (punto 103):** con el HUD funcionando se ve demasiada información encima de la imagen (etiquetas que pisan la brújula, el nombre del sitio repetido en etiqueta y tarjeta, avisos) y las necesidades salen sin barras.

## Estado tras la fase B (24 oct 2026, versión 0.9.134)
- **91 hecho:** 44 materiales nuevos de ambientCG (CC0; `tools/materiales_descargar.js`, paquetes en `recursos/ambientcg`, fuera de git): 59 en total. Las JPG de ambientCG venían casi sin comprimir (124 MB); `tools/materiales_comprimir.js` las deja en 26 MB a calidad 85 (relieve a 88 sin submuestreo). Versiones KTX2 para el escritorio. Carga bajo demanda (`GM.texturas.pedir`): al abrir una escena se precargan 29 (BASE) y el resto se pide al usarse; la versión web ya no precarga texturas.
- **92 hecho:** `MEDIDAS` en texturas.js con la medida real en metros (de ambientCG o contando piezas); las 70 escalas a mano se quitaron. Tres fotos antiguas estaban deformadas y recuperan su proporción. Suelos reales en casa (los seis del editor), sede y pistas (parqué claro bajo las líneas, `GM.sede.pistaMat`).
- **93 hecho:** los materiales sin piezas se mezclan consigo mismos a otra escala y girados (`uVarT`).
- **94 hecho:** fachadas con el material real bajo las ventanas pintadas (opción `mascara`: se ve la foto donde la fachada dibujada es blanca) con reglas por país y estilo (`REGLAS_FACHADA`, `cubiertaDe`, `tejaDe` en calle_real.js); ladrillo, hormigón y chapa con su color propio. Pueblo: muralla y torres de sillares, casas de revoque pintado, teja con el tono regional y plaza de losas medievales. Ventanas encendidas de noche también en ensanche y bloques.
- **95 hecho:** fuera el relleno al azar (manchas de césped, tierra y grava, arbustos y coches torcidos), las aceras de baldosa de mármol en damero, los árboles de especie al azar (ahora por tramos de 60 m y cipreses y pinos solo donde corresponde) y las nubes por debajo de la cámara.
- **Arreglos de paso:** la tarjeta del sitio cercano escribía «null».
- **Pendiente para las fases C y E:** las paredes de los interiores siguen lisas; la variedad de fachadas es de seis estilos por ciudad (más variedad necesita el kit del punto 96 y 131); los cielos siguen siendo un color con nubes planas (punto 102).

## Estado tras la fase C (28 oct 2026, versión 0.9.147)
- **96 en parte:** de día las ventanas se ven como cristal (habitación en penumbra y reflejo de cielo que no depende de la luz de la fachada); alféizares y dinteles en 3D en las ventanas sin balcón de las fachadas que dan a la calle. Falta el kit de piezas de fachada (puntos 96 y 131: planta baja, marcos con profundidad, portales) para que cada tipología tenga su relieve.
- **97 hecho:** huecos de calle rellenos con hileras continuas a la altura del barrio; explanadas que dan a la calle pavimentadas como plaza (árboles en el borde con alcorque, bancos, papeleras y farolas; el centro de las grandes queda abierto). Los patios cerrados no se tocan.
- **98 hecho:** bordillo de granito en 3D cortado en los cruces, en los pasos de cebra (vado) y dentro de las plazas; pasos con el ancho real de la calzada.
- **99 en parte:** árboles de alineación por calle (a los dos lados cada 8 m, en alcorque, lejos de los cruces); palmeras solo en las ciudades de palmeras. Los modelos de árbol realistas en la ciudad quedan para la fase M (130).
- **100 hecho:** el pabellón de la ciudad real tiene fachada y cubierta propias que siguen su planta de OpenStreetMap: cúpula rebajada ajustada al contorno (Palau Olímpic), bóveda si la planta es rectangular, plana si es muy irregular.
- **101 hecho:** costa de OpenStreetMap (`tools/osm_costa.js`): mar, playas, espigones y muelles, con el Pont del Petroli en Badalona. El paseo marítimo de Badalona queda a 1,2 km del pabellón, fuera de la zona en la que se puede andar: se ve de lejos.
- **102 hecho:** cielo calculado con el sol real y nubes según el tiempo (calidad alta).
- **103 hecho:** cámara que baja a la altura de los ojos y no se mete en los edificios, etiquetas a media distancia, barra superior con «Más». Queda separar la cámara de sede3d.js (orden interno).
- **104 hecho:** gente que espera en el bordillo de los pasos con semáforo y cruza cuando los coches tienen rojo (`tools/semaforos_prueba.js`); terrazas, persianas por horario, perros y coches que paran en rojo ya estaban.
- **144 hecho:** horizonte con el relieve real de 1,5 a 20 km en 72 direcciones (`tools/osm_horizonte.js`, Open-Meteo; en las direcciones con mar no hay montes ni ciudad), manzanas lejanas generadas hasta 2,6 km (orientación de las calles, altura del barrio, nunca en el mar ni en laderas), bruma de 200 a 1.700 m. Open-Meteo deja unas 7 ciudades por hora: las que falten se completan repitiendo `node tools/osm_horizonte.js` y `node tools/osm_generar.js`.
- **Arreglos de paso:** los comercios de cadena genéricos tenían escaparate, persiana y rótulo en NaN (no se veían); el mar quedaba tapado por el suelo más allá de la cuadrícula de relieve (va 3 m por encima).

## Estado tras la fase C2 (28 oct 2026, versión 0.9.152)
Badalona es la ciudad piloto; lo de abajo vale para cualquier ciudad española con los mismos comandos.
- **145 hecho:** Catastro (`tools/catastro.js` baja el ZIP INSPIRE del municipio, `tools/catastro_fusion.js` lo mezcla en `osm_generar.js`): cada edificio de OSM con partes del Catastro pasa a esas partes con sus plantas reales (en Badalona, 90 manzanas se convierten en 1.269 partes) y el anillo lejano usa los edificios del Catastro (7.502). Los singulares y los que tienen nombre se quedan como en OSM.
- **146 hecho:** ortofoto del PNOA (`tools/ortofoto.js`, 4 x 4 km a 1 m): color real de cada tejado (y teja solo donde desde el aire se ve rojiza) y foto aérea en el suelo a partir de 400 m.
- **147 hecho:** MDT del IGN (`tools/mdt.js`, 50 m en 6,8 km, solo el suelo: Copernicus contaba los tejados y daba la ciudad de 5 a 13 m más alta); árboles reales detectados en la ortofoto (`tools/arboles_orto.js`; Badalona no publica su inventario de arbolado). Queda el LiDAR (árboles con su altura) para cuando haga falta más.
- **148 hecho en parte:** `identidad_ciudad.js` con fichas por región: panot gris en las aceras de Barcelona y su área, senyeras en algunos balcones, palmeras a menos de 140 m de la costa. Faltan los modelos de los lugares conocidos (Anís del Mono, Santa Maria, Dalt la Vila) y fichas de más ciudades.
- **149 hecho:** zonas paseables con datos propios (`vendor/osm/<club>~<zona>.json`, `ZONAS` en calle_real.js; se generan añadiendo la zona a `recursos/osm/clubes.json` y `centros.json` y pasando las mismas herramientas) unidas por taxi. Badalona: el pabellón, el paseo marítimo con el Pont del Petroli y Dalt la Vila. Prueba: `node tools/zonas_prueba.js`.
- **150 hecho para Badalona:** revisión de las tres zonas; arreglados la arena de playa (antes plaza con farolas) y los comercios de cadena invisibles (escaparate en NaN). Sigue pendiente de tu nota con F8.
- **Datos:** `node tools/osm_horizonte.js` sigue completando el relieve lejano (unas 7 ciudades por hora) y la costa está en 87 ciudades.
