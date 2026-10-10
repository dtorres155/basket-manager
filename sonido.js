/* SONIDO AMBIENTE (GM.sonido) — todo hecho por código con Web Audio (sin archivos, funciona sin conexión).
   Capas que se mezclan según la escena, la hora, el clima y el día: tráfico, viento, lluvia, pájaros (de día), grillos (de noche
   en el pueblo), campanas a cada hora en el pueblo, grada y cánticos con palmas (día de partido y pabellón), murmullo y vasos
   (bar, restaurante, peña) y botes de balón (pistas, sede, gimnasio). Clic suave en los botones de la interfaz.
   Se activa con el primer gesto del usuario (los navegadores lo exigen). Preferencia en el dispositivo: gm1:sonido ('1' o '0').
   Expone: escena(tipo, arg), estado({ hora, clima, partido, previa }), alternar(), activo(), selfTest. */
(function () {
  let ctx = null, maestro = null, ruido = null, capas = {}, esc = null, arg = null, est = { hora: 9, clima: 'sol', partido: false, previa: false }, temporizadores = [], ultimaHora = -1;
  const pref = () => { try { return localStorage.getItem('gm1:sonido') !== '0'; } catch (e) { return true; } };
  function iniciar() {
    if (ctx || typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext)) return !!ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
    maestro = ctx.createGain(); maestro.gain.value = pref() ? 0.9 : 0; maestro.connect(ctx.destination);
    const n = ctx.sampleRate * 3, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); let ult = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; ult = (ult + 0.02 * w) / 1.02; d[i] = w * 0.6 + ult * 2.4; }   // ruido blanco con algo de «marrón»
    ruido = b; montarCapas(); return true;
  }
  // una fuente de ruido filtrada con su ganancia (capa continua)
  function capaRuido(tipo, f, q, destino) { const s = ctx.createBufferSource(); s.buffer = ruido; s.loop = true; s.playbackRate.value = 0.8 + Math.random() * 0.4; const fl = ctx.createBiquadFilter(); fl.type = tipo; fl.frequency.value = f; fl.Q.value = q || 0.7; const g = ctx.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(destino || maestro); s.start(); return { s, fl, g }; }
  function montarCapas() {
    capas.trafico = capaRuido('lowpass', 320, 0.5); capas.viento = capaRuido('bandpass', 520, 0.4); capas.lluvia = capaRuido('highpass', 1100, 0.3); capas.lluviaB = capaRuido('lowpass', 700, 0.5);
    capas.grada = capaRuido('bandpass', 950, 0.6); capas.murmullo = capaRuido('bandpass', 480, 0.9);
    // olas lentas de tráfico (coches que pasan) y rachas de viento
    const lfo = (capa, f, a) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.value = a; o.connect(g); g.connect(capa.g.gain); o.start(); capa.lfo = g; };
    lfo(capas.trafico, 0.13, 0); lfo(capas.viento, 0.07, 0); lfo(capas.grada, 0.21, 0);
  }
  const suave = (p, v, t) => { if (!ctx) return; p.cancelScheduledValues(ctx.currentTime); p.setTargetAtTime(v, ctx.currentTime, t || 0.8); };
  // ---------- sonidos sueltos ----------
  function pio(t0, f0) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * 1.6, t0 + 0.05); o.frequency.exponentialRampToValueAtTime(f0 * 1.1, t0 + 0.09); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.1); o.connect(g); g.connect(maestro); o.start(t0); o.stop(t0 + 0.12); }
  function pajaro() { const t = ctx.currentTime, f = 2200 + Math.random() * 1800, n = 2 + (Math.random() * 4 | 0); for (let i = 0; i < n; i++) pio(t + i * (0.11 + Math.random() * 0.05), f * (0.9 + Math.random() * 0.2)); }
  function grillo() { const t = ctx.currentTime; for (let i = 0; i < 3; i++) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = 4400; g.gain.setValueAtTime(0, t + i * 0.07); g.gain.linearRampToValueAtTime(0.008, t + i * 0.07 + 0.01); g.gain.linearRampToValueAtTime(0, t + i * 0.07 + 0.04); o.connect(g); g.connect(maestro); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.05); } }
  function bote() { const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.12); g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(g); g.connect(maestro); o.start(t); o.stop(t + 0.2); }
  function palma(t0, v) { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = ruido; f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.9; g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09); s.connect(f); f.connect(g); g.connect(maestro); s.start(t0, Math.random()); s.stop(t0 + 0.1); }
  function cantico(v) { const t = ctx.currentTime; [0, 0.5, 1.0, 1.25, 1.5].forEach(d => palma(t + d, v)); [2.4, 2.9, 3.4, 3.65, 3.9].forEach(d => palma(t + d, v)); }
  function vaso() { const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 2600 + Math.random() * 1400; g.gain.setValueAtTime(0.025, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.35); o.connect(g); g.connect(maestro); o.start(t); o.stop(t + 0.4); }
  function campana(veces) { for (let i = 0; i < veces; i++) { const t = ctx.currentTime + i * 1.6; [1, 2.76, 5.4].forEach((m, k) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 330 * m; g.gain.setValueAtTime(0.09 / (k + 1), t); g.gain.exponentialRampToValueAtTime(0.0005, t + 2.6); o.connect(g); g.connect(maestro); o.start(t); o.stop(t + 2.7); }); } }
  function clic() { if (!ctx || !pref()) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 1300; g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.04); o.connect(g); g.connect(maestro); o.start(t); o.stop(t + 0.05); }
  // ---------- programación según la escena ----------
  const repetir = (fn, min, max) => { const t = () => { if (!ctx) return; try { fn(); } catch (e) { } temporizadores.push(setTimeout(t, (min + Math.random() * (max - min)) * 1000)); }; temporizadores.push(setTimeout(t, Math.random() * min * 1000)); };
  function mezclar() {
    if (!ctx) return; const ext = ['calle', 'pueblo', 'deportiva'].indexOf(esc) >= 0, dentro = !!esc && !ext, h = est.hora || 9, noche = h >= 21 || h < 7, llueve = est.clima === 'lluvia';
    const bar = esc === 'interior' && /pena|bar_pueblo|restaurante/.test(arg || ''), pab = esc === 'interior' && arg === 'pabellon';
    suave(capas.trafico.g.gain, esc === 'calle' ? (noche ? 0.05 : 0.13) : esc === 'deportiva' ? 0.03 : dentro && esc !== 'casa' ? 0.012 : 0); capas.trafico.lfo.gain.value = esc === 'calle' ? 0.06 : 0;
    suave(capas.viento.g.gain, ext ? (esc === 'pueblo' ? 0.07 : 0.035) : 0); capas.viento.lfo.gain.value = ext ? 0.03 : 0;
    suave(capas.lluvia.g.gain, llueve ? (ext ? 0.16 : 0.0) : 0); suave(capas.lluviaB.g.gain, llueve ? (ext ? 0.12 : 0.05) : 0);
    const grada = pab ? (est.partido ? 0.2 : 0.03) : esc === 'calle' && est.previa ? 0.09 : 0; suave(capas.grada.g.gain, grada); capas.grada.lfo.gain.value = grada * 0.5;
    suave(capas.murmullo.g.gain, bar ? 0.06 : esc === 'interior' && /tienda|ayuntamiento|gimnasio/.test(arg || '') ? 0.02 : 0);
  }
  function programar() {
    temporizadores.forEach(clearTimeout); temporizadores = []; if (!ctx || !esc) return; const ext = ['calle', 'pueblo', 'deportiva'].indexOf(esc) >= 0;
    if (ext) repetir(() => { const h = est.hora || 9; if (h >= 7 && h < 20.5 && est.clima !== 'lluvia') pajaro(); }, 1.5, 5);
    if (esc === 'pueblo') repetir(() => { const h = est.hora || 9; if (h >= 21 || h < 6) grillo(); }, 0.5, 1.4);
    if (esc === 'sede' || esc === 'deportiva' || (esc === 'interior' && /pabellon|gimnasio/.test(arg || ''))) repetir(() => bote(), 0.45, 1.3);
    if ((esc === 'interior' && arg === 'pabellon') || esc === 'calle') repetir(() => { if (esc === 'calle' ? est.previa : est.partido || Math.random() < 0.2) cantico(esc === 'calle' ? 0.05 : 0.09); }, 6, 11);
    if (esc === 'interior' && /pena|bar_pueblo|restaurante/.test(arg || '')) repetir(() => vaso(), 1.5, 4);
  }
  function escena(tipo, a) { if (!iniciar()) { esc = tipo; arg = a; return; } esc = tipo || null; arg = a || null; ultimaHora = -1; mezclar(); programar(); if (!tipo) ['trafico', 'viento', 'lluvia', 'lluviaB', 'grada', 'murmullo'].forEach(k => suave(capas[k].g.gain, 0, 0.3)); }
  function estado(o) {
    Object.assign(est, o || {}); if (!ctx) return; mezclar();
    const h = Math.floor(est.hora || 9); if (esc === 'pueblo' && ultimaHora >= 0 && h !== ultimaHora && h >= 8 && h <= 22) campana(((h - 1) % 12) + 1); ultimaHora = h;
  }
  function activo() { return pref(); }
  function alternar() { const on = !pref(); try { localStorage.setItem('gm1:sonido', on ? '1' : '0'); } catch (e) { } iniciar(); if (maestro) suave(maestro.gain, on ? 0.9 : 0, 0.15); return on; }
  // el contexto de audio solo arranca tras un gesto; también el clic de los botones
  if (typeof document !== 'undefined') {
    const gesto = () => { if (iniciar()) { if (ctx.state === 'suspended') ctx.resume(); if (esc) { mezclar(); programar(); } } };
    document.addEventListener('pointerdown', gesto, true); document.addEventListener('keydown', gesto, true);
    document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('button')) clic(); }, true);
  }
  function selfTest() { return typeof escena === 'function' && typeof estado === 'function'; }
  GM.sonido = { escena, estado, alternar, activo, selfTest, _ctx: () => ctx };
})();
