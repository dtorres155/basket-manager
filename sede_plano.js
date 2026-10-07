/* PLANO DE LA SEDE DEL CLUB (GM.sedePlano) — solo datos, sin Three.js
   Lo usan sede3d.js (Three.js) y, exportado a JSON con tools/exportar_plano.js, el prototipo de Godot (godot/).
   Unidades en metros. x hacia el este, z hacia el sur. El edificio va de x -20..20 y z -14..14, con un pasillo en z 2..5.
   Cada sala: rect [x0, z0, x1, z1], suelo, puerta (lado y centro), punto de interacción y destino (pantalla del juego por modo).
   muebles: [modelo, x, z, rotY en grados]. puntos: sitios donde los personajes hacen algo [x, z, animación, rotY].
   Los modelos de Kenney (CC0) miden la mitad de lo real: el motor los escala (ESCALA_MUEBLES). */
(function () {
  const P = {
    ESCALA_MUEBLES: 2, ESCALA_PERSONAJES: 1.95, ALTO_MURO: 1.15, CELDA: 0.5,
    limites: [-20, -14, 20, 14],
    pasillo: { rect: [-20, 2, 20, 5], suelo: 'hormigon' },
    entrada: { x: 6, z: 14, ancho: 2.4 },
    salas: [
      { id: 'pista', nombre: 'Pista de entrenamiento', rect: [-20, -14, 2, 2], suelo: 'parquet', puerta: ['s', -9, 3.2],
        interaccion: [-9, 0.6], destino: { gestor: 'plantilla', entrenador: 'plantilla', presidente: 'plantilla', carrera: 'jugador' }, accion: 'Táctica y entrenamiento' },
      { id: 'gimnasio', nombre: 'Gimnasio', rect: [2, -14, 11, 2], suelo: 'caucho', puerta: ['s', 6.5, 1.8],
        interaccion: [6.5, 0.6], destino: { gestor: 'club', entrenador: 'plantilla', presidente: 'club', carrera: 'jugador' }, accion: 'Preparación física' },
      { id: 'fisio', nombre: 'Enfermería y fisio', rect: [11, -14, 20, -6], suelo: 'baldosa', puerta: ['w', -9, 1.6],
        interaccion: [12.2, -9], destino: { todos: 'lesionados' }, accion: 'Ver lesionados' },
      { id: 'vestuario', nombre: 'Vestuario', rect: [11, -6, 20, 2], suelo: 'baldosa', puerta: ['s', 15.5, 1.8],
        interaccion: [15.5, 0.6], destino: { gestor: 'plantilla', entrenador: 'plantilla', presidente: 'plantilla', carrera: 'plantilla' }, accion: 'Hablar con la plantilla' },
      { id: 'prensa', nombre: 'Sala de prensa', rect: [-20, 5, -8, 14], suelo: 'moqueta', puerta: ['n', -14, 1.8],
        interaccion: [-14, 6.4], destino: { todos: 'noticias' }, accion: 'Noticias y prensa' },
      { id: 'cafeteria', nombre: 'Cafetería', rect: [-8, 5, 2, 14], suelo: 'madera', puerta: ['n', -3, 2.4],
        interaccion: [-3, 6.4], destino: { gestor: 'ciudad', entrenador: 'ciudad', presidente: 'ciudad', carrera: 'ciudad' }, accion: 'Afición y ciudad' },
      { id: 'recepcion', nombre: 'Recepción y vitrina', rect: [2, 5, 10, 14], suelo: 'marmol', puerta: ['n', 6, 2.4],
        interaccion: [6, 8.5], destino: { todos: 'inicio' }, accion: 'Calendario y próximo partido' },
      { id: 'despacho', nombre: 'Despacho', rect: [10, 5, 20, 14], suelo: 'madera_oscura', puerta: ['n', 13, 1.6],
        interaccion: [13, 6.6], destino: { gestor: 'mercado', entrenador: 'junta', presidente: 'directiva', carrera: 'agente' }, accion: 'Fichajes y contratos' }
    ],
    muebles: [
      // Vestuario: taquillas, bancos, duchas
      ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => ['bookcaseClosedDoors', 11.8 + i * 0.82, -5.5, 0]),
      ['benchCushion', 13.5, -3, 0], ['benchCushion', 15.5, -3, 0], ['benchCushion', 17.5, -3, 0], ['benchCushion', 13.5, -1, 180], ['benchCushion', 15.5, -1, 180], ['benchCushion', 17.5, -1, 180],
      ['shower', 19.4, -2.4, 270], ['shower', 19.4, -0.6, 270], ['bathroomSink', 11.6, -2, 90], ['coatRackStanding', 11.6, 0.8, 0], ['trashcan', 19.4, 1.4, 0],
      // Enfermería
      ['bedSingle', 15, -13, 0], ['bedSingle', 17.5, -13, 0], ['sideTable', 13.6, -13.2, 0], ['kitchenCabinet', 19.3, -9, 270], ['pottedPlant', 19.3, -7, 0], ['chair', 15.5, -8, 0], ['chair', 16.5, -8, 0], ['desk', 13, -7.4, 180], ['chairDesk', 13, -8.4, 0],
      // Despacho
      ['desk', 16, 11.6, 0], ['chairDesk', 16, 12.8, 180], ['computerScreen', 16, 11.5, 0], ['computerKeyboard', 16, 11.1, 0], ['chair', 15.4, 10.2, 0], ['chair', 16.6, 10.2, 0],
      ['bookcaseOpen', 12, 13.5, 0], ['bookcaseOpen', 13, 13.5, 0], ['books', 12, 13.4, 0], ['loungeSofa', 19.3, 8.6, 270], ['tableCoffee', 18, 8.6, 90], ['rugRectangle', 16, 11, 0], ['pottedPlant', 19.4, 13.4, 0], ['lampSquareFloor', 10.6, 13.4, 0],
      // Recepción
      ['kitchenBar', 5, 11, 0], ['kitchenBar', 6, 11, 0], ['kitchenBarEnd', 7, 11, 0], ['chairDesk', 6, 12.2, 180], ['laptop', 6, 10.9, 180], ['loungeSofa', 2.7, 8, 90], ['pottedPlant', 2.6, 6, 0], ['pottedPlant', 9.4, 6, 0], ['rugRound', 6, 8.3, 0],
      ['bookcaseOpen', 9.4, 9, 270], ['bookcaseOpen', 9.4, 10, 270],
      // Cafetería
      ['kitchenBar', -7.2, 13.3, 0], ['kitchenBar', -6.2, 13.3, 0], ['kitchenBar', -5.2, 13.3, 0], ['kitchenCoffeeMachine', -5.2, 13.3, 0], ['kitchenFridge', -4, 13.4, 0],
      ['stoolBar', -7.2, 12.3, 0], ['stoolBar', -6.2, 12.3, 0], ['stoolBar', -5.2, 12.3, 0],
      ['tableRound', -6, 8.6, 0], ['chair', -6, 7.7, 0], ['chair', -6, 9.5, 180], ['tableRound', -2.6, 8.6, 0], ['chair', -2.6, 7.7, 0], ['chair', -2.6, 9.5, 180],
      ['loungeSofaCorner', 1.2, 13.2, 0], ['tableCoffee', 0, 11.5, 0], ['televisionModern', -0.2, 5.4, 180], ['cabinetTelevision', -0.2, 5.5, 180], ['plantSmall1', -7.6, 5.6, 0],
      // Sala de prensa: mesa de comparecencia, sillas del público, panel con el escudo
      ['table', -14, 12.4, 0], ['chair', -14.8, 13.2, 180], ['chair', -13.2, 13.2, 180], ['speaker', -17.5, 13.3, 0], ['speaker', -10.5, 13.3, 0],
      ...[0, 1, 2, 3].flatMap(f => [0, 1, 2, 3, 4, 5].map(c => ['chairModernCushion', -17 + c * 1.2, 7 + f * 1.25, 0])),
      // Pista: banquillos
      ...[0, 1, 2, 3, 4, 5].map(i => ['chair', -16 + i * 0.7, 1.3, 180]), ...[0, 1, 2, 3, 4, 5].map(i => ['chair', -6 + i * 0.7, 1.3, 180]), ['cardboardBoxClosed', -19.2, 1.2, 0], ['trashcan', 1.4, 1.4, 0],
      // Gimnasio (las máquinas son procedurales en sede3d.js; aquí lo de Kenney)
      ['speaker', 10.4, -13.4, 0], ['pottedPlant', 10.4, 1.2, 0], ['washer', 2.6, -13.4, 0],
      // Pasillo
      ['pottedPlant', -19.4, 2.6, 0], ['pottedPlant', 19.4, 2.6, 0], ['trashcan', 2.3, 4.6, 0]
    ],
    // Máquinas del gimnasio (procedurales): tipo, x, z, rotY
    gimnasio: [['cinta', 4, -6, 0], ['cinta', 6, -6, 0], ['cinta', 8, -6, 0], ['pesas', 9.8, -9, 90], ['bici', 4, -2, 0], ['bici', 6, -2, 0], ['colchoneta', 9.2, -2.4, 0], ['banco', 4, -11.6, 0], ['banco', 6, -11.6, 0], ['banco', 8, -11.6, 0]],
    // Puntos de actividad para los personajes que se mueven solos
    puntos: {
      pista: [[-14.6, -6, 'tiro', 0], [-15.2, -3.2, 'tiro', 0], [-15.3, -8.9, 'tiro', 0], [-12.2, -6.4, 'tiro', 0], [-3.4, -6, 'tiro', 0], [-3.1, -3.4, 'tiro', 0], [-3.6, -8.8, 'tiro', 0], [-6, -5.6, 'tiro', 0], [-15, -8, 'interact-right', 90], [-12, -4, 'idle', 0], [-9, -10, 'sprint', 0], [-6, -6, 'interact-left', 270], [-3, -9, 'idle', 180], [-14, -1, 'idle', 0], [-9, -6, 'emote-yes', 0]],
      gimnasio: [[4, -6.1, 'walk', 180], [6, -6.1, 'walk', 180], [8, -6.1, 'walk', 180], [4, -11.3, 'sit', 180], [6, -11.3, 'sit', 180], [9.2, -2.4, 'crouch', 0], [4, -1.85, 'sit', 180], [6, -1.85, 'sit', 180]],
      vestuario: [[13.5, -3, 'sit', 0], [15.5, -3, 'sit', 0], [17.5, -3, 'sit', 0], [13.5, -1, 'sit', 180], [15.5, -1, 'sit', 180], [12.6, -4.6, 'interact-right', 180]],
      fisio: [[15, -11.75, 'sit', 0, 0.72], [17.5, -11.75, 'sit', 0, 0.72], [15.5, -8, 'sit', 0], [16.5, -8, 'sit', 0]],
      cafeteria: [[-6, 7.7, 'sit', 0], [-6, 9.5, 'sit', 180], [-2.6, 7.7, 'sit', 0], [-6.2, 12.3, 'sit', 0], [-7.2, 12.3, 'sit', 0], [0.6, 12.4, 'sit', 180], [-1, 9, 'idle', 0]],
      prensa: [[-14.8, 13.2, 'sit', 180], [-13.2, 13.2, 'sit', 180], [-15.8, 8.25, 'sit', 0], [-12.2, 9.5, 'sit', 0], [-11, 7, 'sit', 0]],
      charla: [[-11.6, 3.5, 'charla', 90], [-10.4, 3.5, 'charla', 270], [-11, 4.35, 'charla', 180], [12.3, 3.3, 'charla', 90], [13.5, 3.3, 'charla', 270], [-17.5, -0.3, 'charla', 90], [-16.4, -0.5, 'charla', 270]],
      pasillo: [[-16, 3.5, 'idle', 90], [-2, 3.5, 'idle', 270], [9, 3.5, 'emote-no', 0], [17, 3.5, 'idle', 180]]
    },
    // Personal fijo: rol, sala, x, z, animación, rotY
    personal: [['Recepcionista', 'recepcion', 6, 12.2, 'sit', 180], ['Fisioterapeuta', 'fisio', 13, -8.4, 'sit', 0], ['Camarero', 'cafeteria', -6.2, 13.9, 'idle', 180], ['Preparador físico', 'gimnasio', 7, -9, 'emote-yes', 270], ['Jefe de prensa', 'prensa', -18.5, 12.6, 'idle', 90]]
  };
  if (typeof GM !== 'undefined') GM.sedePlano = P;
  if (typeof module !== 'undefined' && module.exports) module.exports = P;
})();
