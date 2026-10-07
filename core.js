/* NÚCLEO · Basket Manager 26/27
   Expone window.GM: rng, bus de eventos, utilidades, addData, newGame.
   Lee/crea la raíz de GM.state (ver contrato). */
window.GM = window.GM || (function () {
  let s = 123456789;
  const handlers = {};
  const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const util = {
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    hash(str) { let h = 2166136261; str = String(str); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
    addDays(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); },
    diffDays(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); },
    weekday(iso) { return new Date(iso + 'T00:00:00Z').getUTCDay(); },
    eur(n) {
      n = Math.round(n); const a = Math.abs(n), sg = n < 0 ? '-' : '';
      if (a >= 1e6) return sg + (a / 1e6).toFixed(a >= 1e8 ? 0 : 1).replace('.', ',') + ' M€';
      if (a >= 1e3) return sg + Math.round(a / 1e3) + ' k€';
      return sg + a + ' €';
    },
    fecha(iso) { const d = new Date(iso + 'T00:00:00Z'); return DIAS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MESES[d.getUTCMonth()]; },
    fechaLarga(iso) { const d = new Date(iso + 'T00:00:00Z'); return DIAS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MESES[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); },
    clone(o) { return JSON.parse(JSON.stringify(o)); }
  };
  const GM = {
    // Versión del formato de la partida guardada. Si cambias la forma del estado, súbela y añade una migración en guardado.js
    VERSION_ESTADO: 3,
    data: { equipos: {}, jugadores: {}, ligas: {} },
    mods: {},
    ui: { screens: {} },
    state: null,
    util,
    rng: {
      seed(n) { s = (n >>> 0) || 1; },
      next() { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; },
      int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); },
      pick(arr) { return arr[this.int(0, arr.length - 1)]; },
      range(a, b) { return a + this.next() * (b - a); },
      chance(p) { return this.next() < p; },
      normal() { let u = 0; for (let i = 0; i < 6; i++) u += this.next(); return (u - 3) / 0.7071; }
    },
    bus: {
      on(e, f) { (handlers[e] = handlers[e] || []).push(f); },
      emit(e, p) { (handlers[e] || []).slice().forEach(f => f(p)); }
    },
    register(nombre, mod) { this.mods[nombre] = mod; return mod; },
    addData(p) {
      (p.ligas || []).forEach(l => { this.data.ligas[l.id] = l; });
      (p.equipos || []).forEach(e => { this.data.equipos[e.id] = Object.assign({ plantilla: [] }, e); });
      (p.jugadores || []).forEach(j => {
        this.data.jugadores[j.id] = j;
        const e = this.data.equipos[j.equipoId];
        if (e && !e.plantilla.includes(j.id)) e.plantilla.push(j.id);
      });
    },
    noticia(state, texto) {
      state.noticias.unshift({ fecha: state.fecha, texto });
      if (state.noticias.length > 60) state.noticias.length = 60;
    },
    ligasDe(state, clubId) {
      return Object.keys(state.ligas).filter(l => state.ligas[l].equipos.indexOf(clubId) >= 0);
    },
    newGame(clubId, seed, opts) {
      opts = opts || {};
      seed = seed || 20260924;
      this.rng.seed(seed);
      const st = {
        version: GM.VERSION_ESTADO, copia: { creada: Date.now(), ultima: null, avisada: null }, sede: { charlas: {} }, seed, fecha: '2026-09-24', temporada: '2026-27', clubId,
        equipos: util.clone(this.data.equipos), jugadores: util.clone(this.data.jugadores), ligas: util.clone(this.data.ligas),
        modo: opts.modo === 'presidente' ? 'presidente' : opts.modo === 'carrera' ? 'carrera' : opts.modo === 'entrenador' ? 'entrenador' : 'gestor', opciones: opts, personaje: opts.personaje || null,
        calendario: [], clasificaciones: {}, playoffs: {}, estadisticas: {}, historial: [],
        mercado: {}, finanzas: {}, instalaciones: {}, ciudad: {}, cantera: {}, noticias: []
      };
      this.state = st;
      ['partidos', 'mercado', 'finanzas', 'ciudad', 'cantera', 'ciudadDeportiva', 'estadio', 'competiciones', 'legado', 'directiva', 'carrera', 'fans', 'copas', 'rivalidades', 'entrenador', 'social', 'continental', 'pueblo']
        .forEach(n => { const m = this.mods[n]; if (m && m.nuevaPartida) m.nuevaPartida(st); });
      this.noticia(st, 'Empieza la temporada 2026-27. ¡Mucha suerte!');
      return st;
    }
  };
  return GM;
})();
