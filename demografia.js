/* Demografía de la ciudad (punto 43): a partir de los edificios de OpenStreetMap (superficie x plantas x uso) se estiman, por celdas de 100 m, los residentes, los puestos de trabajo y la actividad comercial,
   y de ahí cuánta gente hay en la calle de cada zona a cada hora (modelo gravitatorio sencillo: de casa al trabajo por la mañana, comercio a mediodía y por la tarde, paseo y regreso al anochecer).
   GM.demografia.construir(S, X) -> S.demo; presencia(S, h, x, z, dow); elegir(S, lista, h, r, dow) escoge un destino de la lista con probabilidad proporcional a la presencia; resumen(S).
   No hay datos de población reales descargados (WorldPop, INE...): la distribución sale de los usos de los edificios, que ya son reales. Prueba: node tools/demografia_prueba.js y t_demografia.js. */
(function () {
  const CEL = 100, bump = (h, c, a) => Math.exp(-((h - c) * (h - c)) / (2 * a * a));
  // Cuánto sale a la calle según la hora: residentes (salida al trabajo, vuelta y paseo), trabajadores (llegada y comida) y comercio/ocio (mediodía y tarde)
  const cRes = (h, fs) => 0.04 + 1.0 * bump(h, 8.0, 0.9) + (fs ? 0.9 : 0.8) * bump(h, 19.3, 1.9) + (fs ? 0.9 : 0.25) * bump(h, 12.2, 1.2) + (fs ? 0.7 : 0) * bump(h, 11, 2);
  const cEmp = (h, fs) => (fs ? 0.1 : 1) * (0.05 + 0.5 * bump(h, 8.8, 0.9) + 0.75 * bump(h, 14.2, 1.1) + 0.5 * bump(h, 18.2, 1.4));
  const cCom = (h, fs) => (fs ? 1.3 : 1) * (0.04 + 0.75 * bump(h, 11.2, 1.8) + 1.0 * bump(h, 18.0, 2.2) + 0.45 * bump(h, 21.3, 1.2));
  function construir(S, X) {
    const R = (S.RW || 300) + 40, N = Math.ceil(R * 2 / CEL), cel = [], idx = (x, z) => { const i = Math.floor((x + R) / CEL), j = Math.floor((z + R) / CEL); return i < 0 || j < 0 || i >= N || j >= N ? -1 : j * N + i; };
    for (let k = 0; k < N * N; k++) cel.push({ res: 0, emp: 0, com: 0 });
    const poli = p => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
    const sumar = (x, z, ar, lv, cl) => { const k = idx(x, z); if (k < 0) return; const c = cel[k], m2 = ar * Math.max(1, lv);
      if (cl === 0 || cl === 1 || cl === 8) c.res += m2 * (cl === 8 ? 0.4 : 0.8) / 42;   // 42 m2 construidos por habitante
      else if (cl === 2 || cl === 11 || cl === 12) { c.com += m2 / 18; c.emp += m2 / 45; }
      else if (cl === 3) c.emp += m2 / 14; else if (cl === 9) c.emp += m2 / 70; else if (cl === 4) { c.emp += m2 / 40; c.com += m2 / 60; } else if (cl === 5 || cl === 6) { c.emp += m2 / 25; c.com += m2 / 50; } else if (cl === 10) c.com += m2 / 25; else if (cl === 13) c.com += m2 / 20; else if (cl === 7) c.com += m2 / 80; };
    (X.B || []).forEach(b => sumar(b.cx, b.cz, b.ar || poli(b.p), b.lv || 3, b.cl));
    if (X.L && X.L.e) X.L.e.forEach(e => { const p = []; for (let i = 1; i + 1 < e.length; i += 2) p.push([e[i], e[i + 1]]); if (p.length < 3) return; let cx = 0, cz = 0; p.forEach(q => { cx += q[0]; cz += q[1]; }); sumar(cx / p.length, cz / p.length, poli(p), e[0] || 4, 0); });
    (X.N || []).forEach(n => { const k = idx(n.x, n.z); if (k >= 0) { cel[k].com += 6; cel[k].emp += 2; } });
    let res = 0, emp = 0, com = 0; cel.forEach(c => { res += c.res; emp += c.emp; com += c.com; });
    S.demo = { R, N, cel, idx, res: Math.round(res), emp: Math.round(emp), com: Math.round(com) }; return S.demo;
  }
  function presencia(S, h, x, z, dow) {
    const D = S.demo; if (!D) return 1; const k = D.idx(x, z); if (k < 0) return 0.02; const c = D.cel[k], fs = dow === 0 || dow === 6;
    // los vecinos de las celdas de alrededor también pasan por aquí (suavizado de 3x3 con peso 0,35 a los vecinos)
    let r = c.res, e = c.emp, m = c.com, i = k % D.N, j = (k / D.N) | 0; for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { if (!di && !dj) continue; const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= D.N || jj >= D.N) continue; const o = D.cel[jj * D.N + ii]; r += o.res * 0.12; e += o.emp * 0.12; m += o.com * 0.12; }
    return r * cRes(h, fs) + e * cEmp(h, fs) + m * cCom(h, fs) * 1.4;
  }
  function elegir(S, lista, h, r, dow) {
    if (!S.demo || !lista.length) return lista[(r() * lista.length) | 0]; let tot = 0; const w = lista.map(q => { const v = presencia(S, h, q[0], q[1], dow) + 4; tot += v; return v; }); let x = r() * tot; for (let i = 0; i < lista.length; i++) { x -= w[i]; if (x <= 0) return lista[i]; } return lista[lista.length - 1];
  }
  const resumen = S => S.demo ? { residentes: S.demo.res, empleos: S.demo.emp, comercio: S.demo.com } : null;
  // reparto de la presencia total entre el centro (menos de 150 m del pabellón), el resto y la periferia (más de 400 m) para una hora
  function perfil(S, h, dow) { const D = S.demo, o = { centro: 0, medio: 0, periferia: 0 }; if (!D) return o; let tot = 0; for (let j = 0; j < D.N; j++) for (let i = 0; i < D.N; i++) { const x = (i + 0.5) * CEL - D.R, z = (j + 0.5) * CEL - D.R, d = Math.hypot(x, z), p = presencia(S, h, x, z, dow); tot += p; (d < 150 ? o : d > 400 ? o : o); if (d < 150) o.centro += p; else if (d > 400) o.periferia += p; else o.medio += p; } if (tot) { o.centro /= tot; o.medio /= tot; o.periferia /= tot; } return o; }
  function selfTest() { const S = {}; construir(S, { B: [{ cx: 0, cz: 0, ar: 400, lv: 5, cl: 1, p: [] }, { cx: 500, cz: 0, ar: 600, lv: 6, cl: 0, p: [] }, { cx: 20, cz: 10, ar: 900, lv: 3, cl: 2, p: [] }] }); return S.demo.res > 100 && presencia(S, 8, 500, 0, 2) > presencia(S, 13, 500, 0, 2) * 0.9 && presencia(S, 18, 20, 10, 2) > 0; }
  GM.demografia = { construir, presencia, elegir, resumen, perfil, selfTest };
  GM.register && GM.register('demografia', { selfTest });
})();
