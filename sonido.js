/* SONIDO AMBIENTE (GM.sonido) — todo hecho por código con Web Audio (sin archivos, funciona sin conexión).
   Capas que se mezclan según la escena, la hora, el clima y el día: tráfico, viento, lluvia, pájaros (de día), grillos (de noche
   en el pueblo), campanas a cada hora en el pueblo, grada y cánticos con palmas (día de partido y pabellón), murmullo y vasos
   (bar, restaurante, peña) y botes de balón (pistas, sede, gimnasio). Clic suave en los botones de la interfaz.
   Se activa con el primer gesto del usuario (los navegadores lo exigen). Preferencia en el dispositivo: gm1:sonido ('1' o '0').
   Expone: escena(tipo, arg), estado({ hora, clima, partido, previa }), alternar(), activo(), selfTest. */
(function () {
  let ctx = null,
    maestro = null,
    analizador = null,
    ruido = null,
    capas = {},
    esc = null,
    arg = null,
    est = { hora: 9, clima: 'sol', partido: false, previa: false },
    temporizadores = [],
    ultimaHora = -1,
    nivAmb = 1,
    nivUi = 1;
  const pref = () => {
    try {
      return localStorage.getItem('gm1:sonido') !== '0';
    } catch (e) {
      return true;
    }
  };
  function iniciar() {
    if (ctx || typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext)) return !!ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return false;
    }
    maestro = ctx.createGain();
    maestro.gain.value = pref() ? 0.9 * nivAmb : 0;
    maestro.connect(ctx.destination);
    analizador = ctx.createAnalyser();
    analizador.fftSize = 2048;
    maestro.connect(analizador);
    const n = ctx.sampleRate * 3,
      b = ctx.createBuffer(1, n, ctx.sampleRate),
      d = b.getChannelData(0);
    let ult = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      ult = (ult + 0.02 * w) / 1.02;
      d[i] = w * 0.6 + ult * 2.4;
    } // ruido blanco con algo de «marrón»
    ruido = b;
    montarCapas();
    return true;
  }
  // una fuente de ruido filtrada con su ganancia (capa continua)
  function capaRuido(tipo, f, q, destino) {
    const s = ctx.createBufferSource();
    s.buffer = ruido;
    s.loop = true;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const fl = ctx.createBiquadFilter();
    fl.type = tipo;
    fl.frequency.value = f;
    fl.Q.value = q || 0.7;
    const g = ctx.createGain();
    g.gain.value = 0;
    s.connect(fl);
    fl.connect(g);
    g.connect(destino || maestro);
    s.start();
    return { s, fl, g };
  }
  function montarCapas() {
    capas.trafico = capaRuido('lowpass', 320, 0.5);
    capas.viento = capaRuido('bandpass', 520, 0.4);
    capas.lluvia = capaRuido('highpass', 1100, 0.3);
    capas.lluviaB = capaRuido('lowpass', 700, 0.5);
    capas.grada = capaRuido('bandpass', 950, 0.6);
    capas.murmullo = capaRuido('bandpass', 480, 0.9);
    capas.gente = capaRuido('bandpass', 760, 0.8);
    capas.fuente = capaRuido('highpass', 2800, 0.5);
    capas.musica = tonal();
    capas.sirena = tonal(true);
    // olas lentas de tráfico (coches que pasan) y rachas de viento
    const lfo = (capa, f, a) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.frequency.value = f;
      g.gain.value = a;
      o.connect(g);
      g.connect(capa.g.gain);
      o.start();
      capa.lfo = g;
    };
    lfo(capas.trafico, 0.13, 0);
    lfo(capas.viento, 0.07, 0);
    lfo(capas.grada, 0.21, 0);
  }
  // Capa tonal (música lejana de bares y fiestas: acorde de tres triangulares; o sirena: onda que sube y baja)
  function tonal(sirena) {
    const g = ctx.createGain(),
      f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = sirena ? 2400 : 900;
    g.gain.value = 0;
    f.connect(g);
    g.connect(maestro);
    const os = (sirena ? [700] : [220, 277.2, 329.6]).map(fr => {
      const o = ctx.createOscillator();
      o.type = sirena ? 'sawtooth' : 'triangle';
      o.frequency.value = fr;
      o.connect(f);
      o.start();
      return o;
    });
    if (sirena) {
      const lf = ctx.createOscillator(),
        lg = ctx.createGain();
      lf.frequency.value = 0.8;
      lg.gain.value = 280;
      lf.connect(lg);
      lg.connect(os[0].frequency);
      lf.start();
    }
    return { g: { gain: g.gain }, os, lfo: { gain: { value: 0 } } };
  }
  const suave = (p, v, t) => {
    if (!ctx) return;
    p.cancelScheduledValues(ctx.currentTime);
    p.setTargetAtTime(v, ctx.currentTime, t || 0.8);
  };
  // ---------- sonidos sueltos ----------
  function pio(t0, f0) {
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.6, t0 + 0.05);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.1, t0 + 0.09);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.05, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.1);
    o.connect(g);
    g.connect(maestro);
    o.start(t0);
    o.stop(t0 + 0.12);
  }
  function pajaro() {
    const t = ctx.currentTime,
      f = 2200 + Math.random() * 1800,
      n = 2 + ((Math.random() * 4) | 0);
    for (let i = 0; i < n; i++) pio(t + i * (0.11 + Math.random() * 0.05), f * (0.9 + Math.random() * 0.2));
  }
  function grillo() {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = 4400;
      g.gain.setValueAtTime(0, t + i * 0.07);
      g.gain.linearRampToValueAtTime(0.008, t + i * 0.07 + 0.01);
      g.gain.linearRampToValueAtTime(0, t + i * 0.07 + 0.04);
      o.connect(g);
      g.connect(maestro);
      o.start(t + i * 0.07);
      o.stop(t + i * 0.07 + 0.05);
    }
  }
  function bote() {
    if (GM.muestras && GM.muestras.tocar('bote', { canal: 'ambiente', vol: 0.45, variacion: 0.25 })) return;
    const t = ctx.currentTime,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g);
    g.connect(maestro);
    o.start(t);
    o.stop(t + 0.2);
  }
  function palma(t0, v) {
    const s = ctx.createBufferSource(),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    s.buffer = ruido;
    f.type = 'bandpass';
    f.frequency.value = 1500;
    f.Q.value = 0.9;
    g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
    s.connect(f);
    f.connect(g);
    g.connect(maestro);
    s.start(t0, Math.random());
    s.stop(t0 + 0.1);
  }
  function cantico(v) {
    const t = ctx.currentTime;
    [0, 0.5, 1.0, 1.25, 1.5].forEach(d => palma(t + d, v));
    [2.4, 2.9, 3.4, 3.65, 3.9].forEach(d => palma(t + d, v));
  }
  function vaso() {
    const t = ctx.currentTime,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.frequency.value = 2600 + Math.random() * 1400;
    g.gain.setValueAtTime(0.025, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.35);
    o.connect(g);
    g.connect(maestro);
    o.start(t);
    o.stop(t + 0.4);
  }
  function campana(veces) {
    if (GM.muestras && GM.muestras.listo()) {
      for (let i = 0; i < veces; i++) setTimeout(() => GM.muestras.tocar('campana', { canal: 'ambiente', vol: 0.5 * ((paisaje.iglesia || 0.4) + 0.2) }), i * 1600);
      return;
    }
    return campanaSintetica(veces);
  }
  function campanaSintetica(veces) {
    for (let i = 0; i < veces; i++) {
      const t = ctx.currentTime + i * 1.6;
      [1, 2.76, 5.4].forEach((m, k) => {
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.frequency.value = 330 * m;
        g.gain.setValueAtTime(0.09 / (k + 1), t);
        g.gain.exponentialRampToValueAtTime(0.0005, t + 2.6);
        o.connect(g);
        g.connect(maestro);
        o.start(t);
        o.stop(t + 2.7);
      });
    }
  }
  function clic() {
    if (!ctx || !pref()) return;
    if (GM.muestras && GM.muestras.listo()) return; // los clics reales los toca diseno.js con muestras.js
    const t = ctx.currentTime,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.frequency.value = 1300;
    g.gain.setValueAtTime(0.03 * nivUi, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.04);
    o.connect(g);
    g.connect(maestro);
    o.start(t);
    o.stop(t + 0.05);
  }
  // ---------- programación según la escena ----------
  const repetir = (fn, min, max) => {
    const t = () => {
      if (!ctx) return;
      try {
        fn();
      } catch (e) {}
      temporizadores.push(setTimeout(t, (min + Math.random() * (max - min)) * 1000));
    };
    temporizadores.push(setTimeout(t, Math.random() * min * 1000));
  };
  // Paisaje sonoro por zona (punto 44): la calle del juego calcula cuánto de cada cosa hay cerca del jugador (0 a 1) y aquí se mezcla; _mezcla guarda lo último para las pruebas
  let paisaje = {},
    ultimaMezcla = {};
  function mezclar() {
    if (!ctx) return;
    const ext = ['calle', 'pueblo', 'deportiva'].indexOf(esc) >= 0,
      dentro = !!esc && !ext,
      h = est.hora || 9,
      noche = h >= 21 || h < 7,
      llueve = est.clima === 'lluvia';
    const bar = esc === 'interior' && /pena|bar_pueblo|restaurante/.test(arg || ''),
      pab = esc === 'interior' && arg === 'pabellon';
    suave(capas.trafico.g.gain, esc === 'calle' ? (noche ? 0.05 : 0.13) : esc === 'deportiva' ? 0.03 : dentro && esc !== 'casa' ? 0.012 : 0);
    capas.trafico.lfo.gain.value = esc === 'calle' ? 0.06 : 0;
    suave(capas.viento.g.gain, ext ? (esc === 'pueblo' ? 0.07 : 0.035) : 0);
    capas.viento.lfo.gain.value = ext ? 0.03 : 0;
    suave(capas.lluvia.g.gain, llueve ? (ext ? 0.16 : 0.0) : 0);
    suave(capas.lluviaB.g.gain, llueve ? (ext ? 0.12 : 0.05) : 0);
    const grada = pab ? (est.partido ? 0.2 : 0.03) : esc === 'calle' && est.previa ? 0.09 : 0;
    suave(capas.grada.g.gain, grada);
    capas.grada.lfo.gain.value = grada * 0.5;
    suave(capas.murmullo.g.gain, bar ? 0.06 : esc === 'interior' && /tienda|ayuntamiento|gimnasio/.test(arg || '') ? 0.02 : 0);
    const P = esc === 'calle' ? paisaje : {},
      v = k => Math.max(0, Math.min(1, P[k] || 0)),
      mc = Math.max(v('terraza'), v('mercado'), v('fiesta'));
    if (esc === 'calle') {
      const trafico = (noche ? 0.03 : 0.045) + 0.17 * v('avenida') * (1 - 0.75 * v('plaza')),
        gente = 0.012 + 0.11 * v('gente') + 0.09 * v('colegio') + 0.05 * v('fiesta'),
        fuente = 0.085 * v('fuente'),
        murmullo = 0.012 + 0.07 * mc,
        musica = 0.05 * Math.max(v('musica'), v('fiesta')) * (noche ? 1 : 0.6),
        sirena = 0.05 * v('sirena');
      suave(capas.trafico.g.gain, trafico);
      capas.trafico.lfo.gain.value = 0.07 * v('avenida');
      suave(capas.gente.g.gain, gente);
      suave(capas.fuente.g.gain, fuente);
      suave(capas.murmullo.g.gain, murmullo);
      suave(capas.musica.g.gain, musica);
      suave(capas.sirena.g.gain, sirena, 0.3);
      ultimaMezcla = { trafico, gente, fuente, murmullo, musica, sirena, obras: v('obras'), tranvia: v('tranvia'), iglesia: v('iglesia') };
    } else {
      suave(capas.gente.g.gain, 0);
      suave(capas.fuente.g.gain, 0);
      suave(capas.musica.g.gain, 0);
      suave(capas.sirena.g.gain, 0);
      ultimaMezcla = {};
    }
  }
  function golpeObra() {
    const t = ctx.currentTime,
      s = ctx.createBufferSource(),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    s.buffer = ruido;
    f.type = 'bandpass';
    f.frequency.value = 1900;
    f.Q.value = 3;
    for (let i = 0; i < 5; i++) {
      g.gain.setValueAtTime(0.0001, t + i * 0.07);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.18 * (paisaje.obras || 0)), t + i * 0.07 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0003, t + i * 0.07 + 0.06);
    }
    s.connect(f);
    f.connect(g);
    g.connect(maestro);
    s.start(t);
    s.stop(t + 0.5);
  }
  function pregon() {
    const t = ctx.currentTime,
      o = ctx.createOscillator(),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(190 + Math.random() * 90, t);
    o.frequency.linearRampToValueAtTime(150 + Math.random() * 60, t + 0.7);
    f.type = 'bandpass';
    f.frequency.value = 900;
    f.Q.value = 4;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06 * (paisaje.mercado || 0), t + 0.12);
    g.gain.linearRampToValueAtTime(0, t + 0.8);
    o.connect(f);
    f.connect(g);
    g.connect(maestro);
    o.start(t);
    o.stop(t + 0.9);
  }
  function timbreTranvia() {
    const t = ctx.currentTime;
    [0, 0.32].forEach((d, i) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.frequency.value = i ? 880 : 1175;
      g.gain.setValueAtTime(Math.max(0.0002, 0.12 * (paisaje.tranvia || 0)), t + d);
      g.gain.exponentialRampToValueAtTime(0.0005, t + d + 0.3);
      o.connect(g);
      g.connect(maestro);
      o.start(t + d);
      o.stop(t + d + 0.35);
    });
  }
  function claxon() {
    const t = ctx.currentTime;
    [330, 415].forEach(fr => {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = fr;
      g.gain.setValueAtTime(Math.max(0.0002, 0.03 * (paisaje.avenida || 0)), t);
      g.gain.setValueAtTime(0.0001, t + 0.35);
      o.connect(g);
      g.connect(maestro);
      o.start(t);
      o.stop(t + 0.4);
    });
  }
  function programar() {
    temporizadores.forEach(clearTimeout);
    temporizadores = [];
    if (!ctx || !esc) return;
    const ext = ['calle', 'pueblo', 'deportiva'].indexOf(esc) >= 0;
    if (ext)
      repetir(
        () => {
          const h = est.hora || 9;
          if (h >= 7 && h < 20.5 && est.clima !== 'lluvia') pajaro();
        },
        1.5,
        5
      );
    if (esc === 'pueblo')
      repetir(
        () => {
          const h = est.hora || 9;
          if (h >= 21 || h < 6) grillo();
        },
        0.5,
        1.4
      );
    if (esc === 'sede' || esc === 'deportiva' || (esc === 'interior' && /pabellon|gimnasio/.test(arg || ''))) repetir(() => bote(), 0.45, 1.3);
    if ((esc === 'interior' && arg === 'pabellon') || esc === 'calle')
      repetir(
        () => {
          if (esc === 'calle' ? est.previa : est.partido || Math.random() < 0.2) cantico(esc === 'calle' ? 0.05 : 0.09);
        },
        6,
        11
      );
    if (esc === 'interior' && /pena|bar_pueblo|restaurante/.test(arg || '')) repetir(() => vaso(), 1.5, 4);
    if (esc === 'calle') {
      repetir(
        () => {
          if ((paisaje.obras || 0) > 0.08 && !(est.hora < 8 || est.hora >= 19)) golpeObra();
        },
        0.9,
        2.4
      );
      repetir(
        () => {
          if ((paisaje.mercado || 0) > 0.08) pregon();
        },
        2,
        5
      );
      repetir(
        () => {
          if ((paisaje.terraza || 0) > 0.1) vaso();
        },
        1.2,
        3.5
      );
      repetir(
        () => {
          if ((paisaje.tranvia || 0) > 0.1) timbreTranvia();
        },
        9,
        18
      );
      repetir(
        () => {
          if ((paisaje.avenida || 0) > 0.5 && Math.random() < 0.4) claxon();
        },
        6,
        14
      );
    }
  }
  function escena(tipo, a) {
    if (!iniciar()) {
      esc = tipo;
      arg = a;
      return;
    }
    esc = tipo || null;
    arg = a || null;
    ultimaHora = -1;
    mezclar();
    programar();
    if (!tipo) ['trafico', 'viento', 'lluvia', 'lluviaB', 'grada', 'murmullo', 'gente', 'fuente', 'musica', 'sirena'].forEach(k => suave(capas[k].g.gain, 0, 0.3));
  }
  function estado(o) {
    Object.assign(est, o || {});
    if (!ctx) return;
    mezclar();
    const h = Math.floor(est.hora || 9);
    if (esc === 'calle' && ultimaHora >= 0 && h !== ultimaHora && h >= 8 && h <= 21 && (paisaje.iglesia || 0) > 0.15) campana(((h - 1) % 12) + 1);
    if (esc === 'pueblo' && ultimaHora >= 0 && h !== ultimaHora && h >= 8 && h <= 22) campana(((h - 1) % 12) + 1);
    ultimaHora = h;
  }
  function activo() {
    return pref();
  }
  // mezcla (punto 80, musica.js): nivel del ambiente y de los sonidos de interfaz, de 0 a 1
  function nivelAmbiente(amb, ui) {
    nivAmb = amb === undefined ? nivAmb : amb;
    nivUi = ui === undefined ? nivUi : ui;
    if (maestro) suave(maestro.gain, pref() ? 0.9 * nivAmb : 0, 0.1);
  }
  function alternar() {
    const on = !pref();
    try {
      localStorage.setItem('gm1:sonido', on ? '1' : '0');
    } catch (e) {}
    iniciar();
    if (maestro) suave(maestro.gain, on ? 0.9 * nivAmb : 0, 0.15);
    return on;
  }
  // el contexto de audio solo arranca tras un gesto; también el clic de los botones
  if (typeof document !== 'undefined') {
    const gesto = () => {
      if (iniciar()) {
        if (ctx.state === 'suspended') ctx.resume();
        if (GM.muestras) GM.muestras.cargar();
        if (esc) {
          mezclar();
          programar();
        }
      }
    };
    document.addEventListener('pointerdown', gesto, true);
    document.addEventListener('keydown', gesto, true);
    document.addEventListener(
      'click',
      e => {
        if (e.target && e.target.closest && e.target.closest('button')) clic();
      },
      true
    );
  }
  function selfTest() {
    return typeof escena === 'function' && typeof estado === 'function';
  }
  function pais(p) {
    Object.assign(paisaje, p || {});
    if (ctx) mezclar();
  }
  // Análisis de lo que suena (para las pruebas): nivel RMS y energía en graves (<300 Hz), medios y agudos (>2 kHz)
  function analisis() {
    if (!ctx || !analizador) return null;
    const t = new Float32Array(analizador.fftSize);
    analizador.getFloatTimeDomainData(t);
    let r = 0;
    for (let i = 0; i < t.length; i++) r += t[i] * t[i];
    const f = new Uint8Array(analizador.frequencyBinCount);
    analizador.getByteFrequencyData(f);
    const hz = ctx.sampleRate / analizador.fftSize,
      b = [0, 0, 0];
    f.forEach((v, i) => {
      const fr = i * hz;
      b[fr < 300 ? 0 : fr < 2000 ? 1 : 2] += v * v;
    });
    const tot = b[0] + b[1] + b[2] || 1;
    return { rms: Math.sqrt(r / t.length), graves: b[0] / tot, medios: b[1] / tot, agudos: b[2] / tot };
  }
  GM.sonido = { nivelAmbiente, analisis, paisaje: pais, _mezcla: () => ultimaMezcla, _paisaje: () => paisaje, escena, estado, alternar, activo, selfTest, _ctx: () => ctx };
})();
