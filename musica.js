/* MÚSICA DINÁMICA, MEZCLA Y VOCES (punto 80, GM.musica) — música generada por código con Web Audio (sin archivos, funciona sin conexión) que cambia según la escena y la situación.
   - Estados de ánimo: menu (acordes lentos), sede (pad tranquilo), calle (pentatónica alegre), pueblo (arpegios pulsados en modo dórico), casa (notas sueltas muy suaves), pabellon (pulso y bajo) y partido (percusión, bajo y tensión que sube con la intensidad).
     intensidad(v) va de 0 a 1 (en el directo: partido igualado y último cuarto = 1); sting('victoria'|'derrota'|'gol') toca una frase corta.
   - Mezcla (GM.musica.mezcla): niveles de 0 a 1 de general, musica, ambiente, interfaz y voces; se guardan en gm1:mezcla; el ambiente y la interfaz los aplica sonido.js (nivelAmbiente) y la música y las voces, aquí.
   - Voces cortas: voz(texto) usa la síntesis de voz del navegador (idioma del juego) si el jugador las activa (gm1:voces, desactivadas por defecto).
   - Silencio: respeta el interruptor de sonido de siempre (GM.sonido.activo()). Expone: ESTADOS, escena, parar, intensidad, sting, voz, mezcla, setNivel, nivel, voces, setVoces, estado, selfTest. Prueba: tools/audio_prueba.js. */
(function () {
  const ESTADOS = {
    menu: { bpm: 60, raiz: 48, escala: [0, 4, 7, 11, 14], tipo: 'pad', vol: 0.5 },
    sede: { bpm: 66, raiz: 45, escala: [0, 3, 7, 10, 12], tipo: 'pad', vol: 0.4 },
    calle: { bpm: 96, raiz: 55, escala: [0, 2, 4, 7, 9, 12], tipo: 'melodia', vol: 0.35 },
    pueblo: { bpm: 84, raiz: 50, escala: [0, 2, 3, 7, 9, 10], tipo: 'pulsado', vol: 0.4 },
    casa: { bpm: 54, raiz: 52, escala: [0, 4, 7, 9], tipo: 'sueltas', vol: 0.3 },
    pabellon: { bpm: 108, raiz: 43, escala: [0, 3, 5, 7, 10], tipo: 'pulso', vol: 0.4 },
    partido: { bpm: 120, raiz: 40, escala: [0, 3, 5, 7, 10], tipo: 'pulso', vol: 0.5 }
  };
  const DEF = { general: 0.9, musica: 0.6, ambiente: 1, interfaz: 1, voces: 0.9 },
    KM = 'gm1:mezcla',
    KV = 'gm1:voces';
  let niveles = Object.assign({}, DEF);
  try {
    Object.assign(niveles, JSON.parse(localStorage.getItem(KM) || '{}'));
  } catch (e) {
    /* sin guardado */
  }
  let vocesOn = false;
  try {
    vocesOn = localStorage.getItem(KV) === '1';
  } catch (e) {
    /* sin guardado */
  }
  let ctx = null,
    bus = null,
    actual = null,
    inten = 0,
    tiempoSig = 0,
    paso = 0,
    timer = null,
    parado = true,
    filtro = null;
  const hz = n => 440 * Math.pow(2, (n - 69) / 12),
    activo = () => !GM.sonido || GM.sonido.activo();
  const volumen = () => niveles.general * niveles.musica;
  function contexto() {
    if (ctx) return ctx;
    const c = GM.sonido && GM.sonido._ctx && GM.sonido._ctx();
    if (!c) return null;
    ctx = c;
    bus = ctx.createGain();
    bus.gain.value = 0;
    filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 2400;
    filtro.connect(bus);
    bus.connect(ctx.destination);
    return ctx;
  }
  function nota(t, f, dur, tipo, v, destino) {
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = tipo;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + Math.min(0.05, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(destino || filtro);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function golpe(t, tipo, v) {
    if (tipo === 'bombo') {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g);
      g.connect(filtro);
      o.start(t);
      o.stop(t + 0.2);
      return;
    }
    const n = ctx.sampleRate * 0.06,
      b = ctx.createBuffer(1, n, ctx.sampleRate),
      d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    s.buffer = b;
    f.type = 'highpass';
    f.frequency.value = tipo === 'caja' ? 1800 : 6000;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    s.connect(f);
    f.connect(g);
    g.connect(filtro);
    s.start(t);
  }
  const grado = (E, k) => E.raiz + E.escala[((k % E.escala.length) + E.escala.length) % E.escala.length] + 12 * Math.floor(k / E.escala.length);
  function compas(E, t0, p) {
    // un paso = una corchea
    const dur = 60 / E.bpm / 2,
      t = t0,
      acorde = [0, 2, 4, 3][Math.floor(p / 8) % 4],
      v = E.vol * volumen();
    if (E.tipo === 'pad') {
      if (p % 8 === 0) [0, 2, 4].forEach(k => nota(t, hz(grado(E, acorde + k)), dur * 8.5, 'sine', v * 0.22));
      if (p % 4 === 2 && Math.random() < 0.5) nota(t, hz(grado(E, 7 + (p % 5))), dur * 3, 'triangle', v * 0.1);
    } else if (E.tipo === 'melodia') {
      if (p % 2 === 0 || Math.random() < 0.25) nota(t, hz(grado(E, 5 + [0, 2, 1, 3, 4, 2, 1, 0][p % 8] + (Math.random() < 0.2 ? 1 : 0))), dur * 1.6, 'triangle', v * 0.2);
      if (p % 8 === 0) nota(t, hz(grado(E, acorde) - 12), dur * 7, 'sine', v * 0.25);
    } else if (E.tipo === 'pulsado') {
      if (p % 2 === 0) nota(t, hz(grado(E, [0, 2, 4, 2][Math.floor(p / 2) % 4] + 3)), dur * 2, 'triangle', v * 0.25);
      if (p % 8 === 0) nota(t, hz(grado(E, acorde) - 12), dur * 6, 'sine', v * 0.25);
    } else if (E.tipo === 'sueltas') {
      if (Math.random() < 0.18) nota(t, hz(grado(E, 4 + ((Math.random() * 5) | 0))), dur * 4, 'sine', v * 0.22);
    } else {
      // pulso: bombo en los tiempos, caja a contratiempo, hi-hat con la intensidad, bajo y tensión
      const i = inten;
      if (p % 4 === 0) golpe(t, 'bombo', v * (0.5 + i * 0.4));
      if (p % 8 === 4) golpe(t, 'caja', v * 0.22 * (0.5 + i));
      if (i > 0.35 && p % 2 === 1) golpe(t, 'hat', v * 0.08 * i);
      if (i > 0.7 && p % 4 === 3) golpe(t, 'hat', v * 0.1);
      if (p % 2 === 0) nota(t, hz(grado(E, [0, 0, 2, 0, 3, 0, 2, 4][Math.floor(p / 2) % 8] - 5)), dur * 1.8, 'sawtooth', v * 0.12 * (0.6 + i));
      if (i > 0.5 && p % 8 === 0) [0, 2, 4].forEach(k => nota(t, hz(grado(E, acorde + k + 5)), dur * 6, 'square', v * 0.04 * i));
    }
  }
  function bucle() {
    if (parado || !ctx || !actual) return;
    const E = ESTADOS[actual],
      dur = (60 / E.bpm / 2) * (1 - (actual === 'partido' || actual === 'pabellon' ? inten * 0.12 : 0));
    if (activo() && ctx.state === 'running') {
      while (tiempoSig < ctx.currentTime + 0.4) {
        if (tiempoSig < ctx.currentTime) tiempoSig = ctx.currentTime + 0.05;
        compas(E, tiempoSig, paso);
        tiempoSig += dur;
        paso++;
      }
    } else tiempoSig = ctx.currentTime;
    timer = setTimeout(bucle, 120);
  }
  function aplicarVolumen(t) {
    if (bus) {
      bus.gain.cancelScheduledValues(ctx.currentTime);
      bus.gain.setTargetAtTime(actual && activo() ? 1 : 0, ctx.currentTime, t || 0.6);
    }
  }
  function escena(tipo, arg) {
    const mapa = {
        sede: 'sede',
        calle: 'calle',
        pueblo: 'pueblo',
        deportiva: 'pueblo',
        casa: 'casa',
        interior: arg === 'pabellon' ? 'pabellon' : /pena|bar|restaurante|gimnasio/.test(arg || '') ? 'calle' : 'sede',
        menu: 'menu',
        partido: 'partido'
      },
      est = tipo ? mapa[tipo] || null : null;
    if (est === actual) return;
    if (!contexto()) {
      actual = est;
      return;
    }
    actual = est;
    clearTimeout(timer);
    if (!est) {
      aplicarVolumen(0.4);
      parado = true;
      return;
    }
    parado = false;
    paso = 0;
    tiempoSig = ctx.currentTime + 0.1;
    inten = est === 'partido' ? 0.3 : 0.2;
    aplicarVolumen(1.2);
    bucle();
  }
  function parar() {
    escena(null);
  }
  function intensidad(v) {
    inten = Math.max(0, Math.min(1, v || 0));
    if (filtro && ctx) filtro.frequency.setTargetAtTime(1600 + 3200 * inten, ctx.currentTime, 0.4);
  }
  function sting(tipo) {
    if (GM.muestras && activo() && GM.muestras.tocar(tipo === 'victoria' ? 'victoria' : tipo === 'derrota' ? 'derrota' : 'gol', { canal: 'musica', vol: 0.7, variacion: 0 }))
      return; // frase real si está cargada
    if (!contexto() || !activo()) return;
    const t = ctx.currentTime + 0.05,
      v = 0.3 * volumen() * 2,
      seq = tipo === 'victoria' ? [0, 4, 7, 12] : tipo === 'derrota' ? [7, 3, 0, -5] : [0, 7];
    seq.forEach((n, i) => nota(t + i * 0.16, hz(60 + n), 0.9, tipo === 'derrota' ? 'triangle' : 'square', v * 0.5, filtro));
    if (bus) bus.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
  }
  // ---------- mezcla ----------
  function setNivel(k, v) {
    if (!(k in DEF)) return;
    niveles[k] = Math.max(0, Math.min(1, +v));
    try {
      localStorage.setItem(KM, JSON.stringify(niveles));
    } catch (e) {
      /* sin guardado */
    }
    if (GM.sonido && GM.sonido.nivelAmbiente) GM.sonido.nivelAmbiente(niveles.general * niveles.ambiente, niveles.general * niveles.interfaz);
    aplicarVolumen(0.1);
  }
  const nivel = k => niveles[k];
  const mezcla = () => Object.assign({}, niveles);
  // ---------- voces ----------
  const setVoces = on => {
    vocesOn = !!on;
    try {
      localStorage.setItem(KV, on ? '1' : '0');
    } catch (e) {
      /* sin guardado */
    }
  };
  function voz(texto) {
    if (!vocesOn || !activo() || typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined' || !texto) return false;
    try {
      const u = new SpeechSynthesisUtterance(GM.i18n ? GM.i18n.t(texto) : texto),
        l = GM.i18n ? GM.i18n.idioma() : 'es';
      u.lang = l === 'ca' ? 'ca-ES' : l === 'en' ? 'en-GB' : 'es-ES';
      u.volume = niveles.general * niveles.voces;
      u.rate = 1.05;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      return true;
    } catch (e) {
      return false;
    }
  }
  const estado = () => ({ actual, intensidad: inten, parado, contexto: !!ctx, corriendo: !!ctx && ctx.state === 'running', voces: vocesOn });
  function selfTest() {
    return (
      Object.keys(ESTADOS).length === 7 &&
      nivel('general') >= 0 &&
      typeof escena === 'function' &&
      grado({ raiz: 40, escala: [0, 3, 5, 7, 10] }, 5) === 52 &&
      grado({ raiz: 40, escala: [0, 3, 5, 7, 10] }, -1) === 38
    );
  }
  GM.musica = { ESTADOS, escena, parar, intensidad, sting, voz, mezcla, setNivel, nivel, voces: () => vocesOn, setVoces, estado, selfTest };
  GM.register && GM.register('musica', GM.musica);
})();
