/* MOTOR DE PARTIDOS (GM.mods.partidos)
   Simula por posesiones usando atributos, forma, fatiga y táctica. Expone: ovrEquipo, tacticaAuto, tacticaValida, simular, selfTest.
   Lee state.equipos/jugadores; modifica estado (fatiga, forma, lesión) de los jugadores tras cada partido.
   En dia:avanzado recupera fatiga y días de lesión (usa ciudadDeportiva.efectos si existe). */
(function () {
  const U = GM.util, R = () => GM.rng.next();
  const TIPOS_LESION = ['Esguince de tobillo', 'Sobrecarga muscular', 'Rotura fibrilar', 'Contusión en la rodilla', 'Molestias en la espalda', 'Fractura en un dedo', 'Esguince de rodilla'];

  function cfg(comp) {
    return comp === 'NBA'
      ? { q: 12, pace: 96, p3: 0.40, m3: 0.366, m2: 0.542, ast: 0.62, ha: 0.008 }
      : { q: 10, pace: comp === 'ACB' ? 73.8 : 72, p3: 0.345, m3: 0.343, m2: 0.506, ast: 0.56, ha: 0.011 };   // la ACB juega algo más rápido (unos 83 puntos)
  }
  const effF = p => (0.75 + 0.25 * p.estado.forma / 100) * (1 - 0.16 * p.estado.fatiga / 100);
  const lesionado = p => p.estado.lesion && p.estado.lesion.dias > 0;
  const esG = pos => pos === 'PG' || pos === 'SG';
  const esB = pos => pos === 'PF' || pos === 'C';

  function plantilla(state, eqId) {
    const ids = state.equipos[eqId].plantilla;
    const todos = ids.map(i => state.jugadores[i]).filter(Boolean);
    const sanos = todos.filter(p => !lesionado(p));
    return sanos.length >= 5 ? sanos : todos.slice().sort((a, b) => (a.estado.lesion ? a.estado.lesion.dias : 0) - (b.estado.lesion ? b.estado.lesion.dias : 0));
  }
  function mejorQuinteto(pl) {
    const s = pl.slice().sort((a, b) => b.ovr - a.ovr);
    const q = s.slice(0, 5);
    const arregla = (cond, minimo) => {
      let n = q.filter(p => cond(p.pos)).length;
      while (n < minimo) {
        const cand = s.find(p => cond(p.pos) && q.indexOf(p) < 0);
        if (!cand) break;
        const out = q.slice().reverse().find(p => !cond(p.pos));
        if (!out) break;
        q[q.indexOf(out)] = cand; n++;
      }
    };
    arregla(esG, 2); arregla(esB, 1);
    return q;
  }
  function ovrEquipo(state, eqId) {
    const w = [1.2, 1.1, 1, 0.95, 0.9, 0.7, 0.6, 0.4];
    const o = plantilla(state, eqId).map(p => p.ovr * effF(p) / 0.95).sort((a, b) => b - a).slice(0, 8);
    let s = 0, t = 0;
    o.forEach((v, i) => { s += v * w[i]; t += w[i]; });
    return t ? Math.round(s / t * 10) / 10 : 0;
  }
  function tacticaAuto(state, eqId) {
    const q = mejorQuinteto(plantilla(state, eqId));
    return { quinteto: q.map(p => p.id), ritmo: 2 + (U.hash(eqId) % 3), defensa: 'hombre', foco: 'equilibrado' };
  }
  function tacticaValida(state, eqId) {
    let t = state.equipos[eqId].tactica;
    const pl = plantilla(state, eqId);
    const ids = pl.map(p => p.id);
    if (!t || !t.quinteto || t.quinteto.length !== 5) { t = tacticaAuto(state, eqId); return t; }
    const q = t.quinteto.filter(i => ids.indexOf(i) >= 0 && !lesionado(state.jugadores[i]));
    if (q.length < 5) {
      const resto = pl.filter(p => q.indexOf(p.id) < 0 && !lesionado(p)).sort((a, b) => b.ovr - a.ovr);
      while (q.length < 5 && resto.length) q.push(resto.shift().id);
      t = Object.assign({}, t, { quinteto: q });
    }
    return t;
  }

  const FRAC = [0.80, 0.78, 0.74, 0.70, 0.66, 0.55, 0.46, 0.36, 0.24, 0.12, 0.05];
  function mkTeam(state, eqId, tac, gmin) {
    const pl = plantilla(state, eqId);
    const byId = {}; pl.forEach(p => { byId[p.id] = p; });
    const start = tac.quinteto.map(i => byId[i]).filter(Boolean);
    const resto = pl.filter(p => start.indexOf(p) < 0).sort((a, b) => b.ovr - a.ovr);
    const lista = start.concat(resto).slice(0, 12);
    const n = Math.min(lista.length, FRAC.length);
    let sum = 0; for (let i = 0; i < n; i++) sum += FRAC[i];
    const sc = 5 / sum;
    const rot = lista.map((p, i) => ({
      p, f: effF(p), played: 0, jit: 0, target: (i < n ? Math.min(0.92, FRAC[i] * sc) : 0.02) * gmin,
      s: { min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fal: 0 }
    }));
    return { id: eqId, tac, rot, score: 0, rm: 1 + (tac.ritmo - 3) * 0.035 };
  }
  function elige(team, first) {
    const rot = team.rot;
    if (first) return rot.slice(0, 5);
    rot.forEach(e => { e.jit = R() * 0.9; });
    const need = e => e.target - e.played + e.jit;
    const s = rot.slice().sort((a, b) => need(b) - need(a));
    const L = s.slice(0, 5);
    const fix = (cond, min) => {
      let c = L.filter(e => cond(e.p.pos)).length;
      while (c < min) {
        const cand = s.find(e => cond(e.p.pos) && L.indexOf(e) < 0);
        if (!cand) break;
        const out = L.slice().reverse().find(e => !cond(e.p.pos));
        if (!out) break;
        L[L.indexOf(out)] = cand; c++;
      }
    };
    fix(esG, 1); fix(esB, 1);
    return L;
  }
  function agg(L, tac) {
    const a = { L, t3: 0, t2: 0, tl: 0, pase: 0, bote: 0, reb: 0, dI: 0, dP: 0, fis: 0, wUse: [], wTov: [], wAst: [], wReb: [], wStl: [], wBlk: [], wFou: [], tac };
    L.forEach(e => {
      const at = e.p.att, f = e.f;
      a.t3 += at.tiro3 * f / 5; a.t2 += at.tiro2 * f / 5; a.tl += at.tl * f / 5; a.pase += at.pase * f / 5; a.bote += at.bote * f / 5;
      a.reb += (at.reb * 0.7 + at.fisico * 0.3) * f / 5; a.dI += at.defInt * f / 5; a.dP += at.defPer * f / 5; a.fis += at.fisico * f / 5;
      const b = (0.5 * e.p.ovr + 0.25 * at.tiro2 + 0.25 * at.tiro3) * f;
      a.wUse.push(b * b); a.wTov.push(at.bote * 0.5 + (100 - at.iq) * 0.2 + 20);
      a.wAst.push(Math.pow(at.pase * f, 2)); a.wReb.push(Math.pow((at.reb * 0.7 + at.fisico * 0.3) * f, 2.2));
      a.wStl.push(Math.pow(at.defPer * f, 3) / 1e3); a.wBlk.push(Math.pow(at.defInt * f, 3) / 1e3); a.wFou.push(at.fisico + at.defInt + 20);
    });
    return a;
  }
  function wp(ws, skip) {
    let t = 0; for (let i = 0; i < ws.length; i++) if (i !== skip) t += ws[i];
    let r = R() * t;
    for (let i = 0; i < ws.length; i++) { if (i === skip) continue; r -= ws[i]; if (r <= 0) return i; }
    return ws.length - 1;
  }

  // Una posesión de O contra D. Devuelve puntos.
  function posesion(O, D, c) {
    const cf = c.cf;
    const pTov = U.clamp(0.125 + (D.dP - 60) / 950 - ((O.bote + O.pase) / 2 - 60) / 1100 + (D.tac.defensa === 'mixta' ? 0.012 : 0), 0.08, 0.2);
    if (R() < pTov) {
      const ti = wp(O.wTov); O.L[ti].s.tov++;
      let rob = null; if (R() < 0.55) { const si = wp(D.wStl); D.L[si].s.stl++; rob = D.L[si].p.id; }
      if (c.ev) c.last = { r: 'tov', jug: O.L[ti].p.id, rob };
      return 0;
    }
    let pts = 0;
    for (let chain = 0; chain < 4; chain++) {
      const si = wp(O.wUse), sh = O.L[si], at = sh.p.att, f = sh.f;
      let p3 = cf.p3 + (at.tiro3 - at.tiro2) / 300; if (c.triple) p3 = 0.9;   // perdiendo de 3 al final: a por el triple
      if (O.tac.foco === 'exterior') p3 += 0.06; else if (O.tac.foco === 'interior') p3 -= 0.06;
      if (D.tac.defensa === 'zona') p3 += 0.025;
      const is3 = R() < U.clamp(p3, 0.12, 0.55);
      const pFoul = U.clamp(0.105 + (at.fisico * f - D.fis) / 1000, 0.06, 0.17);
      if (R() < pFoul) {
        D.L[wp(D.wFou)].s.fal++;
        const n = is3 ? 3 : 2;
        const pft = U.clamp(0.45 + at.tl * f / 190, 0.5, 0.93);
        let last = false;
        let oks = 0;
        for (let k = 0; k < n; k++) { last = R() < pft; if (last) { pts++; sh.s.pts++; oks++; } }
        if (c.ev) c.last = { r: 'falta', jug: sh.p.id, v: n, ok: oks };
        if (last) return pts;
      } else {
        let pm = is3 ? cf.m3 : cf.m2;
        pm += ((is3 ? at.tiro3 : at.tiro2) * f - 65) / (is3 ? 520 : 470); // sensibilidad al talento (recalibrada: antes 400/360 daba demasiadas palizas)
        pm -= ((is3 ? D.dP : D.dI * 0.6 + D.dP * 0.4) - 60) / (is3 ? 680 : 600);
        pm += (O.pase - 62) / 1400 + c.ha;
        if (D.tac.defensa === 'zona') pm += is3 ? 0.008 : -0.012;
        if (O.tac.ritmo >= 4) pm -= 0.006;
        pm = U.clamp(pm, 0.22, 0.72);
        if (R() < pm) {
          const v = is3 ? 3 : 2;
          pts += v; sh.s.pts += v;
          let ast = null; if (R() < cf.ast) { const ai = wp(O.wAst, si); O.L[ai].s.ast++; ast = O.L[ai].p.id; }
          if (c.ev) c.last = { r: 'ok', v, jug: sh.p.id, ast };
          return pts;
        }
        let tap = null; if (!is3 && R() < 0.055 * D.dI / 65) { const bi = wp(D.wBlk); D.L[bi].s.blk++; tap = D.L[bi].p.id; }
        if (c.ev) c.last = { r: 'fallo', v: is3 ? 3 : 2, jug: sh.p.id, tap };
      }
      // tiro fallado o último tiro libre fallado: rebote
      const pOff = U.clamp(0.255 + (O.reb - D.reb) / 1600, 0.17, 0.34);
      if (R() < pOff) { const ri = wp(O.wReb); O.L[ri].s.reb++; if (c.ev && c.last) c.last.oreb = O.L[ri].p.id; continue; }
      const ri = wp(D.wReb); D.L[ri].s.reb++; if (c.ev && c.last) c.last.reb = D.L[ri].p.id;
      return pts;
    }
    return pts;
  }

  // Partido por cuartos. Con ev=true cada posesión queda registrada para poder verlo (modo directo).
  function crearDirecto(state, partido, ev) {
    const comp = partido.comp, cf = cfg(comp), gmin = cf.q * 4;
    const tacL = partido.local === state.clubId ? tacticaValida(state, partido.local) : tacticaAuto(state, partido.local);
    const tacV = partido.visitante === state.clubId ? tacticaValida(state, partido.visitante) : tacticaAuto(state, partido.visitante);
    const A = mkTeam(state, partido.local, tacL, gmin), B = mkTeam(state, partido.visitante, tacV, gmin);
    const N = cf.pace * (A.rm + B.rm) / 2 * (0.95 + 0.1 * R());
    const stintMin = cf.q / 3, qs = cf.q * 60;
    const D = { state, partido, cf, A, B, cuartos: [], q: 0, ot: 0, terminado: false, tm: { A: 3, B: 3 }, enPista: { A: [], B: [] }, eventos: [], prevA: 0, prevB: 0 };
    const jugarStint = (first, minutos, nPos, base, dur, evs) => {
      const LA = elige(A, first), LB = elige(B, first);
      D.enPista.A = LA.map(e => e.p.id); D.enPista.B = LB.map(e => e.p.id);
      const aA = agg(LA, A.tac), aB = agg(LB, B.tac);
      LA.forEach(e => { e.played += minutos; e.s.min += minutos; });
      LB.forEach(e => { e.played += minutos; e.s.min += minutos; });
      const cA = { cf, ha: cf.ha, ev: !!evs, last: null }, cB = { cf, ha: -cf.ha, ev: !!evs, last: null };
      const n = Math.max(1, Math.floor(nPos + R()));
      for (let i = 0; i < n; i++) {
        const t0 = base + (i + 0.25) / n * dur, t1 = base + (i + 0.75) / n * dur;
        // En la segunda parte, quien gana de mucho se relaja (suplentes, menos intensidad) y quien pierde aprieta: acerca los marcadores como en la realidad
        { const dif = A.score - B.score, k = D.q >= 2 ? Math.min(0.07, Math.max(0, Math.abs(dif) - 9) * 0.006) : 0; cA.ha = cf.ha - Math.sign(dif) * k; cB.ha = -cf.ha + Math.sign(dif) * k * 0.7;
          // Final apretado (último tramo del último cuarto o de la prórroga): quien pierde de 1 a 5 arriesga y quien gana se protege; da prórrogas como en la realidad (5-6 %)
          const final = (D.q === 3 ? base >= dur * 2 - 1 : D.q >= 4) && i >= n * (D.q === 3 ? 0.4 : 0.6);
          cA.triple = cB.triple = false;
          if (final && Math.abs(dif) >= 1 && Math.abs(dif) <= 5) { const gana = dif > 0 ? cA : cB, pierde = dif > 0 ? cB : cA; gana.ha -= 0.05; pierde.ha += 0.14; pierde.triple = Math.abs(dif) === 3; } }
        const pa = posesion(aA, aB, cA); A.score += pa;
        if (evs && cA.last) evs.push(Object.assign({ eq: 'A', t: Math.round(t0), pts: pa, a: A.score, b: B.score, pista: [D.enPista.A.slice(), D.enPista.B.slice()] }, cA.last));
        const pb = posesion(aB, aA, cB); B.score += pb;
        if (evs && cB.last) evs.push(Object.assign({ eq: 'B', t: Math.round(t1), pts: pb, a: A.score, b: B.score, pista: [D.enPista.A.slice(), D.enPista.B.slice()] }, cB.last));
      }
    };
    D.jugarCuarto = function () {
      if (D.terminado) return null;
      const evs = ev ? [] : null, enOT = D.q >= 4;
      if (!enOT) {
        for (let s = 0; s < 3; s++) jugarStint((D.q === 0 || D.q === 2) && s === 0, stintMin, N / 12, s * qs / 3, qs / 3, evs);
        D.q++;
      } else {
        D.ot++;
        A.rot.forEach(e => { e.played = 0; e.target = e.target / gmin * 5 * 1.0; });
        jugarStint(true, 5, cf.pace * 5 / gmin, 0, 300, evs);
        D.q++;
      }
      D.cuartos.push([A.score - D.prevA, B.score - D.prevB]); D.prevA = A.score; D.prevB = B.score;
      if (D.q >= 4 && (A.score !== B.score || D.ot >= 4)) { if (A.score === B.score) A.score++; D.terminado = true; }
      if (evs) D.eventos.push(...evs);
      return { cuarto: D.q, duracion: enOT ? 300 : qs, eventos: evs || [], marcador: [A.score, B.score], terminado: D.terminado };
    };
    // Ajustes a mitad de partido (solo afectan a lo que queda por jugar)
    D.ajustar = function (lado, o) {
      const T = lado === 'A' ? A : B; if (!o) return;
      if (o.ritmo) { T.tac = Object.assign({}, T.tac, { ritmo: U.clamp(o.ritmo, 1, 5) }); T.rm = 1 + (T.tac.ritmo - 3) * 0.035; }
      if (o.defensa) T.tac = Object.assign({}, T.tac, { defensa: o.defensa });
      if (o.foco) T.tac = Object.assign({}, T.tac, { foco: o.foco });
      if (o.meter) { const e = T.rot.find(x => x.p.id === o.meter); if (e) e.target = e.played + 8; }
      if (o.sacar) { const e = T.rot.find(x => x.p.id === o.sacar); if (e) e.target = e.played - 8; }
    };
    D.tiempoMuerto = function (lado) {
      if (D.tm[lado] <= 0) return false; D.tm[lado]--;
      (lado === 'A' ? A : B).rot.forEach(e => { e.f = Math.min(1, e.f * 1.03); });
      return true;
    };
    D.finalizar = function () {
      while (!D.terminado) D.jugarCuarto();
      const stats = {}, lesiones = [];
      [A, B].forEach(t => {
        const gano = t.score > (t === A ? B.score : A.score);
        t.rot.forEach(e => {
          if (e.s.min <= 0) return;
          const p = e.p, m = e.s.min;
          e.s.min = Math.round(m);
          stats[p.id] = e.s;
          p.estado.fatiga = Math.min(100, p.estado.fatiga + m * 0.33);
          p.estado.moral = U.clamp(p.estado.moral + (gano ? 1 : -1), 20, 100);
          if (R() < 0.0035 * (m / 30) * (1 + p.estado.fatiga / 80)) {
            const r = R(); const dias = r < 0.6 ? GM.rng.int(3, 10) : r < 0.9 ? GM.rng.int(11, 30) : GM.rng.int(31, 90);
            const tipo = GM.rng.pick(TIPOS_LESION);
            p.estado.lesion = { tipo, dias };
            lesiones.push({ jugadorId: p.id, tipo, dias });
          }
        });
      });
      const res = { local: A.score, visitante: B.score, cuartos: D.cuartos, stats, lesiones, cronica: [], ot: D.ot };
      res.cronica = cronica(state, partido, A, B, res);
      return res;
    };
    return D;
  }
  function simular(state, partido) { return crearDirecto(state, partido, false).finalizar(); }

  function cronica(state, partido, A, B, res) {
    const nom = id => state.equipos[id].nombre;
    const gL = res.local > res.visitante;
    const W = gL ? A : B, L = gL ? B : A;
    const ws = Math.max(res.local, res.visitante), ls = Math.min(res.local, res.visitante), diff = ws - ls;
    const out = [];
    const adv = res.ot ? ' tras la prórroga' : diff <= 4 ? ' en un final de infarto' : diff >= 20 ? ' con una victoria contundente' : diff >= 12 ? ' con autoridad' : '';
    out.push(nom(W.id) + ' gana a ' + nom(L.id) + ' por ' + ws + '-' + ls + adv + '.');
    const top = t => t.rot.slice().sort((a, b) => b.s.pts - a.s.pts)[0];
    const tw = top(W), tl = top(L);
    out.push(tw.p.nombre + ' lideró a ' + nom(W.id) + ' con ' + tw.s.pts + ' puntos' + (tw.s.reb >= 9 ? ' y ' + tw.s.reb + ' rebotes' : tw.s.ast >= 7 ? ' y ' + tw.s.ast + ' asistencias' : '') + '.');
    out.push(tl.p.nombre + ' firmó ' + tl.s.pts + ' puntos en la derrota de ' + nom(L.id) + '.');
    let q = 0, best = -1;
    res.cuartos.slice(0, 4).forEach((c, i) => { const d = Math.abs(c[0] - c[1]); if (d > best) { best = d; q = i; } });
    const cq = res.cuartos[q];
    out.push('El ' + (q + 1) + 'º cuarto marcó el partido (' + cq[0] + '-' + cq[1] + ').');
    const all = A.rot.concat(B.rot);
    const rb = all.slice().sort((a, b) => b.s.reb - a.s.reb)[0];
    if (rb.s.reb >= 10) out.push(rb.p.nombre + ' dominó el rebote con ' + rb.s.reb + ' capturas.');
    const as = all.slice().sort((a, b) => b.s.ast - a.s.ast)[0];
    if (as.s.ast >= 9) out.push(as.p.nombre + ' repartió ' + as.s.ast + ' asistencias.');
    res.lesiones.forEach(l => out.push(state.jugadores[l.jugadorId].nombre + ' se lesionó (' + l.tipo.toLowerCase() + ', ' + l.dias + ' días).'));
    return out.slice(0, 8);
  }

  // Recuperación diaria
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st) return;
    const M = GM.mods;
    const recUser = M.ciudadDeportiva && M.ciudadDeportiva.efectos ? M.ciudadDeportiva.efectos(st, st.clubId).recuperacion : 1;
    for (const id in st.jugadores) {
      const p = st.jugadores[id], e = p.estado;
      const rec = p.equipoId === st.clubId ? recUser : 1;
      if (e.fatiga > 0) e.fatiga = Math.max(0, e.fatiga - 9 * rec);
      if (e.lesion) { e.lesion.dias -= 1 + (R() < rec - 1 ? 1 : 0); if (e.lesion.dias <= 0) e.lesion = null; }
      e.forma = U.clamp(e.forma + (e.fatiga < 25 ? 0.6 : -0.4), 55, 100);
    }
  });

  function selfTest() {
    const mk = (id, ovr) => {
      const js = {}, ids = [];
      ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SG', 'SF', 'PF', 'C', 'SF', 'PF'].forEach((pos, i) => {
        const o = ovr - i * 2;
        const j = GM.mkJugador ? GM.mkJugador(id, i + 1, id + i, pos, 26, 200, 'ES', 'UE', o, o, 'E', 1e6, 2027) : null;
        js[j.id] = j; ids.push(j.id);
      });
      return { js, ids };
    };
    const a = mk('fa', 78), b = mk('fb', 70);
    const st = { clubId: 'x', equipos: { fa: { id: 'fa', nombre: 'A', plantilla: a.ids }, fb: { id: 'fb', nombre: 'B', plantilla: b.ids } }, jugadores: Object.assign({}, a.js, b.js) };
    const rs = GM.rng; rs.seed(99);
    let w = 0, pts = 0, n = 200;
    for (let i = 0; i < n; i++) {
      Object.values(st.jugadores).forEach(p => { p.estado.fatiga = 0; p.estado.lesion = null; });
      const home = i % 2 ? 'fa' : 'fb', away = i % 2 ? 'fb' : 'fa';
      const r = simular(st, { comp: 'EUROLIGA', local: home, visitante: away });
      const sa = home === 'fa' ? r.local : r.visitante, sb = home === 'fa' ? r.visitante : r.local;
      if (sa > sb) w++;
      pts += sa + sb;
    }
    const wp_ = w / n, avg = pts / n / 2;
    return wp_ >= 0.6 && wp_ <= 0.85 && avg >= 75 && avg <= 120;
  }

  GM.register('partidos', { crearDirecto, ovrEquipo, tacticaAuto, tacticaValida, simular, selfTest, cfg, nuevaPartida() { } });
})();
