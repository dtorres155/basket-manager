/* MUESTRAS DE SONIDO (GM.muestras) — efectos reales cortos (Kenney, CC0, en vendor/audio, formato ogg) que sustituyen a los pitidos sintéticos: clics de la interfaz, pasos según el suelo, botes de balón, campana y frases de victoria, derrota y canasta.
   Se cargan la primera vez que el audio está activo (el contexto de audio lo crea sonido.js tras el primer gesto), se decodifican una vez y se tocan con volumen y tono ligeramente variados para que no suenen repetidos.
   Todo respeta el interruptor de sonido y la mezcla de musica.js (canal 'interfaz', 'ambiente' o 'musica'). Si un archivo no carga, tocar() devuelve false y quien llama usa el sonido sintético de siempre.
   Expone: NOMBRES, cargar, tocar, paso, listo, selfTest. Prueba: tools/audio_prueba.js. */
(function () {
  const NOMBRES = {
    clic: ['ui_click_001', 'ui_click_003'],
    tic: ['ui_tick_001'],
    seleccionar: ['ui_select_001'],
    confirmar: ['ui_confirmation_001'],
    error: ['ui_error_001'],
    abrir: ['ui_open_001'],
    cerrar: ['ui_close_001'],
    volver: ['ui_back_001'],
    interruptor: ['ui_switch_001', 'ui_toggle_001'],
    campana: ['impactBell_heavy_000'],
    cristal: ['impactGlass_light_000'],
    golpe: ['impactPunch_medium_000'],
    bote: ['impactWood_medium_000', 'impactWood_medium_001', 'impactSoft_medium_000', 'impactSoft_medium_001'],
    madera: ['impactWood_light_000', 'impactPlank_medium_000'],
    paso_cemento: ['footstep_concrete_000', 'footstep_concrete_001', 'footstep_concrete_002'],
    paso_hierba: ['footstep_grass_000', 'footstep_grass_001', 'footstep_grass_002'],
    paso_madera: ['footstep_wood_000', 'footstep_wood_001', 'footstep_wood_002'],
    paso_moqueta: ['footstep_carpet_000', 'footstep_carpet_001', 'footstep_carpet_002'],
    victoria: ['jingle_victoria'],
    derrota: ['jingle_derrota'],
    gol: ['jingle_gol']
  };
  const buffers = {};
  let cargando = null;
  const activo = () => !GM.sonido || GM.sonido.activo();
  const ctxDe = () => (GM.sonido && GM.sonido._ctx ? GM.sonido._ctx() : null);
  function cargar() {
    const ctx = ctxDe();
    if (!ctx || typeof fetch === 'undefined') return Promise.resolve(0);
    if (cargando) return cargando;
    const archivos = [].concat(...Object.keys(NOMBRES).map(k => NOMBRES[k])).filter((f, i, a) => a.indexOf(f) === i);
    cargando = Promise.all(
      archivos.map(f =>
        fetch('audio/' + f + '.ogg')
          .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
          .then(b => new Promise((res, rej) => ctx.decodeAudioData(b, res, rej)))
          .then(buf => {
            buffers[f] = buf;
          })
          .catch(() => null)
      )
    ).then(() => Object.keys(buffers).length);
    return cargando;
  }
  const listo = () => Object.keys(buffers).length > 0;
  // canal: 'interfaz' (por defecto), 'ambiente' o 'musica'; vol de 0 a 1; rate: tono (1 = normal); variacion: cuánto se varía al azar
  function tocar(nombre, op) {
    op = op || {};
    const ctx = ctxDe();
    if (!ctx || !activo()) return false;
    if (!cargando) {
      cargar();
      return false;
    }
    const lista = (NOMBRES[nombre] || []).filter(f => buffers[f]);
    if (!lista.length) return false;
    const f = lista[Math.floor(Math.random() * lista.length)],
      src = ctx.createBufferSource(),
      g = ctx.createGain(),
      canal = op.canal || 'interfaz',
      nivel = GM.musica ? GM.musica.nivel('general') * (GM.musica.nivel(canal) === undefined ? 1 : GM.musica.nivel(canal)) : 1,
      v = (op.vol === undefined ? 0.5 : op.vol) * nivel * (1 - (op.variacion === undefined ? 0.12 : op.variacion) * Math.random());
    src.buffer = buffers[f];
    src.playbackRate.value = (op.rate || 1) * (1 + (op.variacion === undefined ? 0.12 : op.variacion) * (Math.random() - 0.5));
    g.gain.value = v;
    src.connect(g);
    g.connect(ctx.destination);
    src.start();
    return true;
  }
  const SUELO = { calle: 'paso_cemento', deportiva: 'paso_hierba', pueblo: 'paso_hierba', casa: 'paso_moqueta', sede: 'paso_moqueta', interior: 'paso_madera' };
  function paso(escena, corre) {
    return tocar(SUELO[escena] || 'paso_cemento', { canal: 'ambiente', vol: corre ? 0.22 : 0.15, rate: corre ? 1.1 : 1 });
  }
  function selfTest() {
    return Object.keys(NOMBRES).length >= 15 && paso('calle') === false && SUELO.interior === 'paso_madera';
  }
  GM.muestras = { NOMBRES, cargar, tocar, paso, listo, selfTest };
  GM.register && GM.register('muestras', GM.muestras);
})();
