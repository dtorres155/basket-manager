/* ESTILOS DEL PUEBLO (GM.estilosPueblo): colores y materiales por región (piedra catalana, ocre castellano, blanco andaluz, toscano)
   y estiloDe(nombre, nac), que elige el estilo del pueblo del jugador. Los usa pueblo_mundo.js. Venía de pueblo3d.js (la maqueta antigua, retirada). */
(function () {
  const ESTILOS = {
    catalan: {
      nombre: 'piedra catalana',
      muros: ['#b8a487', '#a99577', '#c3b192'],
      revoco: ['#dccdb1', '#cfbd9c'],
      piedraFrac: 0.7,
      teja: '#a9583a',
      postigos: ['#5a3c26', '#4b5e3b', '#6d4b2e'],
      pendiente: 0.42,
      torre: 'piramide',
      zocalo: null,
      tierra: '#a89778'
    },
    castellano: {
      nombre: 'ocre castellano',
      muros: ['#d6b47c', '#c9a46a', '#e0c08b'],
      revoco: ['#e6cfa2', '#d9bd88'],
      piedraFrac: 0.25,
      teja: '#b4643d',
      postigos: ['#5a3b22', '#7a2f22', '#3d4f5e'],
      pendiente: 0.36,
      torre: 'campanario',
      zocalo: '#a88a5c',
      tierra: '#b59a6c'
    },
    andaluz: {
      nombre: 'blanco andaluz',
      muros: ['#f4f1ea', '#efebe2', '#f8f6f1'],
      revoco: ['#f4f1ea', '#fbfaf6'],
      piedraFrac: 0,
      teja: '#b86a43',
      postigos: ['#2f6f9e', '#3c7a3a', '#7a2f22'],
      pendiente: 0.26,
      torre: 'blanca',
      zocalo: '#d4a640',
      tierra: '#c2a477'
    },
    toscano: {
      nombre: 'toscano',
      muros: ['#cf9f66', '#c28f58', '#d8ad78'],
      revoco: ['#dcb27e', '#c99a64'],
      piedraFrac: 0.35,
      teja: '#a4502c',
      postigos: ['#3f5f3a', '#5a4630'],
      pendiente: 0.3,
      torre: 'almenada',
      zocalo: null,
      tierra: '#b08d62'
    }
  };
  const POR_NOMBRE = {
    'Vilanova de Sau': 'catalan',
    'Sant Martí del Vall': 'catalan',
    'Torrelles del Monte': 'castellano',
    'Castellar Alto': 'castellano',
    'Fuente Clara': 'castellano',
    'Alcudia de la Sierra': 'andaluz',
    'Pozoblanco Nuevo': 'andaluz'
  };
  const POR_PAIS = { IT: 'toscano', FR: 'catalan', GR: 'andaluz', TR: 'castellano' };
  function estiloDe(nombre, nac) {
    return POR_NOMBRE[nombre] || POR_PAIS[nac] || (nac === 'ES' ? 'castellano' : 'castellano');
  }

  GM.estilosPueblo = { ESTILOS, estiloDe };
})();
