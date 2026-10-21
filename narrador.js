/* NARRADOR DEL DIRECTO (punto 68 y ambiente del clásico del 67, GM.narrador) — acompaña a directo.js con el contexto del partido:
   - Frases dinámicas: según lo que pasa y cómo va el partido (parciales, cambios de líder, empates, jugadores calientes, hitos de puntos, últimos minutos, estrellas que se apagan) elige entre varias plantillas;
     nunca repite la misma frase seguida.
   - Estadísticas en vivo: puntos, rebotes y asistencias de cada jugador y de cada equipo según lo ocurrido hasta ese momento (no lo que ya está simulado del cuarto).
   - Repeticiones: guarda las jugadas notables (triples, tapones, mates y canastas que cambian el partido) para que el directo las repita.
   - Cámara de televisión: tres modos (general, tele lateral que sigue el balón y baja detrás del aro) con el movimiento de cada una.
   - Ambiente del clásico: en los derbis (rivalidades.ambiente) la grada se llena, hay tifos en los colores de cada equipo y cánticos en la narración.
   Expone: nuevo(st, g, D, nombre), CAMARAS, camara, canto, selfTest. Prueba: t_narrador.js. */
(function () {
  const U = GM.util;
  const T = {
    ok3: ['{j} clava un triple', '{j} enchufa desde el arco', '{j} no perdona desde 6,75', 'Triple de {j}, sin tocar aro', '{j} se levanta y la mete de tres'],
    ok2: ['{j} anota de dos', '{j} culmina la jugada', '{j} suma bajo el aro', '{j} castiga en la media distancia', 'Bandeja de {j}'],
    fallo3: ['{j} falla el triple', '{j} no encuentra el aro desde fuera', 'Triple de {j} que se queda corto'],
    fallo2: ['{j} falla bajo el aro', '{j} no acierta en la media distancia', 'El tiro de {j} sale rechazado'],
    tov: ['{j} pierde el balón', 'Pérdida de {j}', 'Se le va el balón a {j}'],
    falta: ['Falta sobre {j}', '{j} fuerza la falta'],
    reb: ['Rebote de {j}'],
    tap: ['¡Tapón de {j}!', '¡Gorra de {j}!'],
    rob: ['Robo de {j}', '{j} se lo quita de las manos'],
    corrida: ['{e} encadena un parcial de {n}-0', '{e} aprieta: ya van {n} puntos seguidos', 'Parcial de {n}-0 de {e}'],
    cambio: ['¡Cambio de líder! {e} pasa a mandar', '{e} se pone por delante'],
    empate: ['Todo igualado: {a}-{b}', 'Empate a {a}'],
    hito: ['{j} ya suma {p} puntos', '{j} está en racha: {p} puntos', 'Partidazo de {j}: {p} puntos'],
    caliente: ['{j} no falla: tercera canasta seguida del equipo', '{j} está on fire'],
    final: ['Final de infarto: {d} de diferencia', 'Se acaba el tiempo con el partido abierto ({d})'],
    paliza: ['{e} está dominando: {d} arriba', 'El partido se escapa: {d} de ventaja de {e}'],
    remontada: ['¡{e} remonta! Ya solo pierde de {d}', '{e} se acerca: {d} abajo'],
    triplo: ['{j} ya tiene {p} puntos y {r} rebotes', '{j} cerca del doble-doble: {p} puntos y {r} rebotes']
  };
  const elige = (arr, sem, ctx) => {
    let i = (U.hash(String(sem)) >>> 0) % arr.length;
    if (ctx && ctx.ultFrase === arr[i]) i = (i + 1) % arr.length;
    return arr[i];
  };
  const rell = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (o[k] === undefined ? '' : o[k]));
  // ---------- Cantos de la grada en los clásicos ----------
  const CANTOS = {
    local: ['¡{c}, {c}, {c}!', '¡Aúpa {c}!', '¡Que se oiga, que se oiga!', '¡Hoy se gana, hoy se gana!', '¡{c}, {c}, campeón!'],
    rival: ['¡Fuera de aquí, fuera de aquí!', '¡Cómo se nota el miedo!', '¡Vamos, vamos, que se acaban!'],
    pitada: ['Pitada enorme a {r}', 'La grada silba cada balón de {r}'],
    silencio: ['Silencio en la grada: se oye al banquillo', 'El pabellón contiene la respiración']
  };
  function canto(st, g, ctx, ev, ambiente) {
    if (!ambiente || ambiente < 2) return null;
    const c = st.equipos[g.local].siglas,
      r = st.equipos[g.visitante].nombre,
      anota = ev.r === 'ok';
    if (ctx.cantos >= 5 + ambiente * 2 || (U.hash(g.id + ev.t + 'canto') >>> 0) % 100 > 22 + ambiente * 6) return null;
    ctx.cantos++;
    const sem = g.id + ev.t;
    if (anota && ev.eq === 'A') return elige(CANTOS.local, sem).replace(/\{c\}/g, c);
    if (anota && ev.eq === 'B') return elige(CANTOS.silencio, sem);
    if (ev.r === 'tov' && ev.eq === 'B') return elige(CANTOS.rival, sem);
    if (ev.eq === 'B') return elige(CANTOS.pitada, sem).replace('{r}', r);
    return elige(CANTOS.local, sem).replace(/\{c\}/g, c);
  }
  // ---------- Contexto de un partido ----------
  function nuevo(st, g, D, nombre) {
    const ctx = {
      pts: {},
      reb: {},
      ast: {},
      stl: {},
      blk: {},
      tov: {},
      eq: { A: { pts: 0, reb: 0, ast: 0, tov: 0 }, B: { pts: 0, reb: 0, ast: 0, tov: 0 } },
      corrida: { eq: null, n: 0 },
      lider: null,
      ultFrase: null,
      notables: [],
      cantos: 0,
      seguidas: { eq: null, n: 0 },
      ev: 0
    };
    const amb = GM.mods.rivalidades && GM.mods.rivalidades.ambiente ? GM.mods.rivalidades.ambiente(st, g.local, g.visitante) : 0,
      nomEq = k => st.equipos[k === 'A' ? g.local : g.visitante].nombre;
    ctx.ambiente = amb;
    const sumaEq = (k, campo, d) => {
      ctx.eq[k][campo] += d;
    };
    // Procesa un evento de la jugada y devuelve { frase, extra:[{t, cls}] } con el contexto
    ctx.evento = function (ev, base) {
      ctx.ev++;
      const k = ev.eq,
        o = k === 'A' ? 'B' : 'A',
        nj = ev.jug ? nombre(ev.jug) : '',
        extra = [];
      let frase = base || '';
      const antes = { a: ev.a - (k === 'A' ? ev.pts || 0 : 0), b: ev.b - (k === 'B' ? ev.pts || 0 : 0) },
        liderAntes = antes.a > antes.b ? 'A' : antes.b > antes.a ? 'B' : null,
        liderAhora = ev.a > ev.b ? 'A' : ev.b > ev.a ? 'B' : null,
        dif = Math.abs(ev.a - ev.b);
      if (ev.r === 'ok' || ev.r === 'falta') {
        const p = ev.r === 'ok' ? ev.v : ev.ok || 0;
        if (ev.jug) ctx.pts[ev.jug] = (ctx.pts[ev.jug] || 0) + p;
        sumaEq(k, 'pts', p);
        if (ctx.corrida.eq === k) ctx.corrida.n += p;
        else ctx.corrida = { eq: k, n: p };
        if (ev.ast) {
          ctx.ast[ev.ast] = (ctx.ast[ev.ast] || 0) + 1;
          sumaEq(k, 'ast', 1);
        }
      } else if (ev.r === 'tov') {
        if (ev.jug) ctx.tov[ev.jug] = (ctx.tov[ev.jug] || 0) + 1;
        sumaEq(k, 'tov', 1);
        if (ev.rob) ctx.stl[ev.rob] = (ctx.stl[ev.rob] || 0) + 1;
      }
      if (ev.reb) {
        ctx.reb[ev.reb] = (ctx.reb[ev.reb] || 0) + 1;
        sumaEq(o, 'reb', 1);
      }
      if (ev.oreb) {
        ctx.reb[ev.oreb] = (ctx.reb[ev.oreb] || 0) + 1;
        sumaEq(k, 'reb', 1);
      }
      if (ev.tap) ctx.blk[ev.tap] = (ctx.blk[ev.tap] || 0) + 1;
      const sem = (g.id || '') + ev.t + ctx.ev,
        vars = { j: nj, e: nomEq(k), a: ev.a, b: ev.b, d: dif, n: ctx.corrida.n, p: ctx.pts[ev.jug] || 0, r: ctx.reb[ev.jug] || 0 };
      let contexto = null;
      if (ev.r === 'ok') {
        if (ctx.corrida.n >= 8 && ctx.corrida.eq === k && ctx.corrida.n % 2 === 0) contexto = 'corrida';
        else if (liderAhora && liderAhora !== liderAntes && ctx.ev > 6) contexto = 'cambio';
        else if (!liderAhora && ctx.ev > 6) contexto = 'empate';
        else if ((ctx.pts[ev.jug] || 0) >= 10 && [10, 20, 30, 40].some(x => (ctx.pts[ev.jug] || 0) >= x && (ctx.pts[ev.jug] || 0) - ev.v < x)) contexto = 'hito';
        else if ((ctx.pts[ev.jug] || 0) >= 14 && (ctx.reb[ev.jug] || 0) >= 7 && (ctx.reb[ev.jug] || 0) - 0 === 7) contexto = 'triplo';
        else if (dif >= 18 && liderAhora === k && ev.t > 300) contexto = 'paliza';
        else if (liderAntes && liderAntes !== k && dif <= 6 && ctx.ultDif >= 14) contexto = 'remontada';
        else if (dif <= 4 && ev.t > 500 && ev.eq) contexto = 'final';
      }
      if (contexto) {
        const txt = rell(elige(T[contexto], sem, ctx), vars);
        frase = (frase ? frase.replace(/\.$/, '') + '. ' : '') + txt + '.';
      }
      ctx.ultDif = dif;
      ctx.ultFrase = base || frase;
      // jugadas para repetir: triples, tapones y canastas que cambian el líder o cierran un parcial
      if (ev.tap || (ev.r === 'ok' && (ev.v === 3 || contexto === 'cambio' || contexto === 'corrida'))) {
        ctx.notables.push(ev);
        if (ctx.notables.length > 6) ctx.notables.shift();
      }
      const c = canto(st, g, ctx, ev, amb);
      if (c) extra.push({ t: '🔊 ' + c, cls: 'grada' });
      return { frase, extra, contexto };
    };
    ctx.ultimaNotable = () => ctx.notables[ctx.notables.length - 1] || null;
    ctx.estadisticas = function () {
      const arma = (k, ids) =>
        ids
          .map(id => ({
            id,
            nombre: nombre(id),
            pts: ctx.pts[id] || 0,
            reb: ctx.reb[id] || 0,
            ast: ctx.ast[id] || 0,
            stl: ctx.stl[id] || 0,
            blk: ctx.blk[id] || 0,
            tov: ctx.tov[id] || 0
          }))
          .filter(x => x.pts + x.reb + x.ast + x.stl + x.blk > 0)
          .sort((a, b) => b.pts + b.reb * 0.4 + b.ast * 0.5 - (a.pts + a.reb * 0.4 + a.ast * 0.5))
          .slice(0, 5);
      const ids = k => (D[k].rot || []).map(e => e.p.id);
      return { A: arma('A', ids('A')), B: arma('B', ids('B')), eq: ctx.eq };
    };
    return ctx;
  }
  // ---------- Cámaras de televisión ----------
  const CAMARAS = {
    general: { n: 'General', radio: 24, phi: 0.9, theta: 0 },
    tele: { n: 'Televisión', radio: 17, phi: 1.18, theta: 0, sigue: true },
    aro: { n: 'Detrás del aro', radio: 14, phi: 1.1, theta: 1.57, aro: true }
  };
  // Aplica la cámara a la vista del kit; en cada fotograma sigue el balón y la dirección del ataque
  function camara(V, modo, balon, ataca, ancho) {
    const c = CAMARAS[modo] || CAMARAS.general;
    if (!V) return;
    if (V.__camModo !== modo) {
      V.__camModo = modo;
      V.radio = modo === 'general' && ancho < 900 ? 31 : c.radio;
      V.phi = c.phi;
      V.theta = c.theta;
    }
    if (c.sigue && balon) {
      V.target.x += (balon.position.x - V.target.x) * 0.06;
      V.target.z += (0 - V.target.z) * 0.1;
    } else if (c.aro && balon) {
      const lado = ataca === 'B' ? -1 : 1;
      V.target.x += (lado * 7 - V.target.x) * 0.04;
      V.theta += ((lado > 0 ? 1.57 : -1.57) - V.theta) * 0.04;
      V.target.z += (0 - V.target.z) * 0.1;
    } else {
      V.target.x += (0 - V.target.x) * 0.1;
      V.target.z += (0 - V.target.z) * 0.1;
    }
    if (V.place) V.place();
  }
  function selfTest() {
    const st = { equipos: { a: { nombre: 'A', siglas: 'AAA' }, b: { nombre: 'B', siglas: 'BBB' } }, jugadores: {} },
      g = { id: 'g1', local: 'a', visitante: 'b' },
      D = { A: { rot: [{ p: { id: 'x' } }] }, B: { rot: [{ p: { id: 'y' } }] } },
      nom = id => id.toUpperCase();
    const ctx = nuevo(st, g, D, nom);
    let a = 0,
      b = 0,
      t = 0,
      frases = new Set();
    for (let i = 0; i < 40; i++) {
      const eq = i < 14 ? 'A' : i % 3 ? 'B' : 'A',
        v = i % 4 ? 2 : 3;
      if (eq === 'A') a += v;
      else b += v;
      t += 12;
      const r = ctx.evento({ r: 'ok', eq, v, jug: eq === 'A' ? 'x' : 'y', a, b, t, pts: v, pista: [[], []] }, 'Base');
      frases.add(r.frase);
    }
    const s = ctx.estadisticas();
    return frases.size > 4 && s.A.length === 1 && s.A[0].pts > 20 && s.eq.A.pts === a && s.eq.B.pts === b && !!ctx.ultimaNotable() && Object.keys(CAMARAS).length === 3;
  }
  GM.narrador = { nuevo, CAMARAS, camara, canto, T, CANTOS, selfTest };
  GM.register && GM.register('narrador', GM.narrador);
})();
