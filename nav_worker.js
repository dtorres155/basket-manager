/* NAVEGACIÓN EN UN HILO APARTE (GM.nav) — la búsqueda de caminos (A* sobre la rejilla de 0,75 m) de las personas del mundo se hace en un Worker para que
   no bloquee el dibujo: antes una sola búsqueda larga costaba entre 5 y 400 ms de CPU en el hilo principal.
   Uso: const nav = GM.nav.crear(G) (G es la rejilla de sede3d.js: { W, H, b, c, x0, z0 }); nav.pedir([x, z], [x2, z2], tope) devuelve una promesa con el camino
   ([[x, z], ...] ya suavizado, con .llega y .truncado) o null si no hay camino; nav.sincronizar() reenvía la rejilla si cambió; nav.cerrar().
   El código del worker es la función `cuerpo` (se serializa a un Blob, así funciona igual en la web, el móvil y la app de escritorio). */
(function () {
  function cuerpo() {
    let W = 0, H = 0, b = null, c = 1, x0 = 0, z0 = 0, A = null, BW = 0, BH = 0, grueso = null; const cache = new Map(), campos = new Map(), conteo = new Map();   // campos: campos de flujo (distancia a un destino frecuente desde cada celda); conteo: cuántas veces se ha pedido cada destino. grueso: rejilla de bloques de 8x8 celdas (6 m) para trazar un corredor; cache: caminos ya calculados
    const libre = (i, j) => i >= 0 && j >= 0 && i < W && j < H && !b[j * W + i], celda = (x, z) => [Math.floor((x - x0) / c), Math.floor((z - z0) / c)], centro = (i, j) => [x0 + (i + 0.5) * c, z0 + (j + 0.5) * c];
    const DIR = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    const ve = (a, bb) => { const d = Math.hypot(bb[0] - a[0], bb[1] - a[1]), n = Math.ceil(d / 0.2), px = d ? -(bb[1] - a[1]) / d * 0.22 : 0, pz = d ? (bb[0] - a[0]) / d * 0.22 : 0;
      for (let k = 1; k < n; k++) { const x = a[0] + (bb[0] - a[0]) * k / n, z = a[1] + (bb[1] - a[1]) * k / n; for (const s of [0, 1, -1]) { const [i, j] = celda(x + px * s, z + pz * s); if (!libre(i, j)) return false; } } return true; };
    // Búsqueda en dos niveles: A* sobre bloques de 8x8 celdas (transitable si tiene 16 celdas libres o más) da un corredor de bloques y la búsqueda fina solo expande dentro de él (más un bloque de margen)
    function corredor(si, sj, ti, tj) {
      const sb = (sj >> 3) * BW + (si >> 3), tb = (tj >> 3) * BW + (ti >> 3); if (!grueso[sb] || !grueso[tb]) return null; const N = BW * BH, g = new Float32Array(N).fill(Infinity), de = new Int32Array(N).fill(-1), cer = new Uint8Array(N), hf = [], hn = [], th = Math.floor(tb / BW), tw = tb % BW;
      const meter = (f, n) => { hf.push(f); hn.push(n); let i = hf.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= hf[i]) break; [hf[p], hf[i]] = [hf[i], hf[p]]; [hn[p], hn[i]] = [hn[i], hn[p]]; i = p; } };
      const sacar = () => { const n0 = hn[0], f = hf.pop(), n = hn.pop(); if (hf.length) { hf[0] = f; hn[0] = n; let i = 0; for (;;) { let cc = 2 * i + 1; if (cc >= hf.length) break; if (cc + 1 < hf.length && hf[cc + 1] < hf[cc]) cc++; if (hf[cc] >= hf[i]) break; [hf[cc], hf[i]] = [hf[i], hf[cc]]; [hn[cc], hn[i]] = [hn[i], hn[cc]]; i = cc; } } return n0; };
      g[sb] = 0; meter(0, sb); let ok = false;
      while (hf.length) { const cur = sacar(); if (cur === tb) { ok = true; break; } if (cer[cur]) continue; cer[cur] = 1; const ci = cur % BW, cj = (cur / BW) | 0;
        for (const [di, dj, cost] of DIR) { const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= BW || nj >= BH) continue; const n = nj * BW + ni; if (!grueso[n]) continue; const gg = g[cur] + cost; if (gg < g[n]) { g[n] = gg; de[n] = cur; meter(gg + Math.hypot(ni - tw, nj - th), n); } } }
      if (!ok) return null; const mask = new Uint8Array(N); for (let k = tb; k >= 0; k = de[k]) { const ci = k % BW, cj = (k / BW) | 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ni = ci + di, nj = cj + dj; if (ni >= 0 && nj >= 0 && ni < BW && nj < BH) mask[nj * BW + ni] = 1; } }
      return mask;
    }
    // Campos de flujo para destinos frecuentes: a la tercera petición hacia la misma celda se calcula (Dijkstra desde el destino) la distancia de todas las celdas a ella y desde entonces cada camino a ese
    // destino cuesta lo que mide (se baja por la pendiente de distancias); se guardan los 10 últimos destinos usados (Uint16, 1,3 MB cada uno).
    const cercaLibre = (i, j, ri, rj) => { if (libre(i, j)) return [i, j]; let mejor = null, md = Infinity;
      for (let r = 1; r <= 60; r++) { if (mejor && r > Math.sqrt(md) + 1) break;
        for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r || !libre(i + di, j + dj)) continue; const d = di * di + dj * dj + (ri === undefined ? 0 : Math.hypot(i + di - ri, j + dj - rj) * 2); if (d < md) { md = d; mejor = [i + di, j + dj]; } } }
      return mejor; };
    function construirCampo(ti, tj) {
      const N = W * H, d = new Uint16Array(N).fill(65535), hf = [], hn = [];
      const meter = (f, n) => { let i = hf.length; hf.push(f); hn.push(n); while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; hf[i] = hf[p]; hn[i] = hn[p]; i = p; } hf[i] = f; hn[i] = n; };
      const sacar = () => { const n0 = hn[0], f = hf.pop(), n = hn.pop(); if (hf.length) { let i = 0; const L = hf.length; for (;;) { let cc = 2 * i + 1; if (cc >= L) break; if (cc + 1 < L && hf[cc + 1] < hf[cc]) cc++; if (hf[cc] >= f) break; hf[i] = hf[cc]; hn[i] = hn[cc]; i = cc; } hf[i] = f; hn[i] = n; } return n0; };
      const ini = tj * W + ti; d[ini] = 0; meter(0, ini);
      while (hf.length) { const f = hf[0], cur = sacar(); if (f > d[cur]) continue; const ci = cur % W, cj = (cur / W) | 0;
        for (const [di, dj] of DIR) { const ni = ci + di, nj = cj + dj; if (!libre(ni, nj)) continue; if (di && dj && (!libre(ci + di, cj) || !libre(ci, cj + dj))) continue; const g = f + (di && dj ? 6 : 4); if (g < 65535 && g < d[nj * W + ni]) { d[nj * W + ni] = g; meter(g, nj * W + ni); } } }
      return d;
    }
    function rutaCampo(d, desde, hasta, ti, tj) {
      let [si, sj] = celda(desde[0], desde[1]); const s = cercaLibre(si, sj, ti, tj); if (!s) return null; [si, sj] = s; if (d[sj * W + si] === 65535) return null;
      const camino = [centro(si, sj)]; let ci = si, cj = sj, pasos = 0;
      while ((ci !== ti || cj !== tj) && pasos++ < 6000) { let mejor = d[cj * W + ci], bi = -1, bj = -1;
        for (const [di, dj] of DIR) { const ni = ci + di, nj = cj + dj; if (!libre(ni, nj)) continue; if (di && dj && (!libre(ci + di, cj) || !libre(ci, cj + dj))) continue; const v = d[nj * W + ni]; if (v < mejor) { mejor = v; bi = ni; bj = nj; } }
        if (bi < 0) return null; ci = bi; cj = bj; camino.push(centro(ci, cj)); }
      if (ci !== ti || cj !== tj) return null;
      const out = [camino[0]]; let k = 0; while (k < camino.length - 1) { let l = camino.length - 1; while (l > k + 1 && !ve(camino[k], camino[l])) l--; out.push(camino[l]); k = l; }
      const [ci2, cj2] = celda(hasta[0], hasta[1]), ult = out[out.length - 1]; if (libre(ci2, cj2) && ve(ult, hasta)) out.push([hasta[0], hasta[1]]);
      return { camino: out, llega: true, truncado: false, campo: true };
    }
    function buscar(desde, hasta, tope) {
      const [s0, s1] = celda(desde[0], desde[1]), [t0, t1] = celda(hasta[0], hasta[1]), clave = s0 + ',' + s1 + ',' + t0 + ',' + t1; if (cache.has(clave)) return cache.get(clave);
      if (libre(t0, t1) && s0 >= 0 && s1 >= 0 && s0 < W && s1 < H && Math.hypot(s0 - t0, s1 - t1) > 30) { const kt = t1 * W + t0, u = (conteo.get(kt) || 0) + 1; conteo.set(kt, u);
        if (u >= 3) { let f = campos.get(kt); if (!f) { f = construirCampo(t0, t1); if (campos.size >= 10) campos.delete(campos.keys().next().value); } else campos.delete(kt); campos.set(kt, f);
          const rc = rutaCampo(f, desde, hasta, t0, t1); if (rc) { if (cache.size > 600) cache.delete(cache.keys().next().value); cache.set(clave, rc); return rc; } } }
      let mask = null; if (grueso && Math.hypot(s0 - t0, s1 - t1) > 45 && s0 >= 0 && s1 >= 0 && t0 >= 0 && t1 >= 0 && s0 < W && s1 < H && t0 < W && t1 < H) mask = corredor(s0, s1, t0, t1);
      let r = buscarFino(desde, hasta, tope, mask); if (mask && (!r || !r.llega)) r = buscarFino(desde, hasta, tope, null);   // si el corredor no basta se busca sin límite
      if (cache.size > 600) cache.delete(cache.keys().next().value); cache.set(clave, r); return r;
    }
    function buscarFino(desde, hasta, tope, mask) {
      let [si, sj] = celda(desde[0], desde[1]), [ti, tj] = celda(hasta[0], hasta[1]);
      const cerca = (i, j, ri, rj) => { if (libre(i, j)) return [i, j]; let mejor = null, md = Infinity;
        for (let r = 1; r <= 60; r++) { if (mejor && r > Math.sqrt(md) + 1) break;
          for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r || !libre(i + di, j + dj)) continue; const d = di * di + dj * dj + (ri === undefined ? 0 : Math.hypot(i + di - ri, j + dj - rj) * 2); if (d < md) { md = d; mejor = [i + di, j + dj]; } } }
        return mejor; };
      const s = cerca(si, sj), t = cerca(ti, tj, si, sj); if (!s || !t) return null; [si, sj] = s; [ti, tj] = t;
      const N = W * H; if (!A || A.N !== N) A = { N, gS: new Float32Array(N), de: new Int32Array(N), gen: new Uint32Array(N), cer: new Uint32Array(N), cur: 0 }; const gen = ++A.cur;
      const h = (i, j) => Math.hypot(i - ti, j - tj), ini = sj * W + si, fin = tj * W + ti, hf = [], hn = [];
      const meter = (f, n) => { let i = hf.length; hf.push(f); hn.push(n); while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; hf[i] = hf[p]; hn[i] = hn[p]; i = p; } hf[i] = f; hn[i] = n; };
      const sacar = () => { const n0 = hn[0], f = hf.pop(), n = hn.pop(); if (hf.length) { let i = 0; const L = hf.length; for (;;) { let cc = 2 * i + 1; if (cc >= L) break; if (cc + 1 < L && hf[cc + 1] < hf[cc]) cc++; if (hf[cc] >= f) break; hf[i] = hf[cc]; hn[i] = hn[cc]; i = cc; } hf[i] = f; hn[i] = n; } return n0; };
      A.gen[ini] = gen; A.gS[ini] = 0; A.de[ini] = -1; meter(h(si, sj), ini); let mejorN = ini, mejorH = h(si, sj), exp = 0; const MAX = tope || Infinity;
      while (hf.length) {
        if (++exp > MAX) break; const cur = sacar(); if (cur === fin) break; if (A.cer[cur] === gen) continue; A.cer[cur] = gen;
        const ci = cur % W, cj = (cur / W) | 0; { const hh = h(ci, cj); if (hh < mejorH) { mejorH = hh; mejorN = cur; } }
        for (const [di, dj, cost] of DIR) { const ni = ci + di, nj = cj + dj; if (!libre(ni, nj)) continue; if (mask && !mask[(nj >> 3) * BW + (ni >> 3)]) continue; if (di && dj && (!libre(ci + di, cj) || !libre(ci, cj + dj))) continue;
          const n = nj * W + ni, g = A.gS[cur] + cost; if (A.gen[n] !== gen || g < A.gS[n]) { A.gen[n] = gen; A.gS[n] = g; A.de[n] = cur; meter(g + h(ni, nj), n); } }
      }
      const llega = A.gen[fin] === gen && A.de[fin] >= 0 || fin === ini, meta = llega ? fin : mejorN; if (!llega && meta === ini) return null;
      const camino = []; for (let k = meta; k >= 0; k = k === ini ? -1 : A.de[k]) camino.push(centro(k % W, (k / W) | 0)); camino.reverse();
      const out = [camino[0]]; let k = 0; while (k < camino.length - 1) { let l = camino.length - 1; while (l > k + 1 && !ve(camino[k], camino[l])) l--; out.push(camino[l]); k = l; }
      const [ci2, cj2] = celda(hasta[0], hasta[1]), ult = out[out.length - 1]; if (llega && libre(ci2, cj2) && ve(ult, hasta)) out.push([hasta[0], hasta[1]]);
      return { camino: out, llega, truncado: exp > MAX };
    }
    self.onmessage = e => { const m = e.data;
      if (m.t === 'rejilla') { W = m.W; H = m.H; b = m.b; c = m.c; x0 = m.x0; z0 = m.z0; cache.clear(); campos.clear(); conteo.clear(); BW = Math.ceil(W / 8); BH = Math.ceil(H / 8); grueso = new Uint8Array(BW * BH); const cnt = new Uint8Array(BW * BH); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (!b[j * W + i]) cnt[(j >> 3) * BW + (i >> 3)]++; for (let k = 0; k < cnt.length; k++) grueso[k] = cnt[k] >= 16 ? 1 : 0; return; }
      if (m.t === 'buscar') { let r = null; try { r = buscar(m.desde, m.hasta, m.tope); } catch (er) { r = null; } self.postMessage({ id: m.id, r }); } };
  }
  function crear(G) {
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return null;
    let w; try { w = new Worker(URL.createObjectURL(new Blob(['(' + cuerpo.toString() + ')()'], { type: 'text/javascript' }))); } catch (e) { return null; }
    let id = 0, vivo = true; const pend = new Map(), enviar = () => { w.postMessage({ t: 'rejilla', W: G.W, H: G.H, b: G.b.slice(), c: G.c, x0: G.x0, z0: G.z0 }); G.sucia = false; };
    w.onmessage = e => { const f = pend.get(e.data.id); if (f) { pend.delete(e.data.id); f(e.data.r); } };
    w.onerror = () => { vivo = false; pend.forEach(f => f(null)); pend.clear(); };
    enviar();
    return {
      pedir(desde, hasta, tope) { if (!vivo) return Promise.resolve(undefined); return new Promise(res => { const n = ++id; pend.set(n, res); w.postMessage({ t: 'buscar', id: n, desde, hasta, tope }); }); },
      sincronizar() { if (G.sucia && vivo) enviar(); }, pendientes: () => pend.size, activo: () => vivo,
      cerrar() { vivo = false; pend.forEach(f => f(null)); pend.clear(); try { w.terminate(); } catch (e) { } }
    };
  }
  // ---- Grafo de calles (punto 21d): nodos en los cruces y extremos de las calles reales, aristas a lo largo de cada calle ----
  // grafo(vias): vias = [{ p: [[x, z], ...] }]. rutaGrafo(g, desde, hasta) -> lista de puntos [x, z] (A* sobre el grafo, un par de ms para una ruta de 1 km)
  function grafo(vias) {
    const nodos = [], ady = [], H = new Map(), C = 40, SNAP = 1.5;
    const clave = (x, z) => Math.floor(x / C) + ',' + Math.floor(z / C);
    const nodo = (x, z) => {   // reutiliza un nodo a menos de SNAP metros
      const cx = Math.floor(x / C), cz = Math.floor(z / C); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = H.get((cx + i) + ',' + (cz + j)); if (l) for (const k of l) if (Math.hypot(nodos[k][0] - x, nodos[k][1] - z) < SNAP) return k; }
      const k = nodos.length; nodos.push([x, z]); ady.push([]); const kk = clave(x, z); if (!H.has(kk)) H.set(kk, []); H.get(kk).push(k); return k;
    };
    const segs = []; vias.forEach((v, vi) => { for (let i = 0; i + 1 < v.p.length; i++) segs.push({ vi, i, ax: v.p[i][0], az: v.p[i][1], bx: v.p[i + 1][0], bz: v.p[i + 1][1], cortes: [] }); });
    // cruces entre calles distintas: cada segmento se compara con los de su celda
    const G2 = new Map(); segs.forEach((sg, k) => { const x0 = Math.floor(Math.min(sg.ax, sg.bx) / C), x1 = Math.floor(Math.max(sg.ax, sg.bx) / C), z0 = Math.floor(Math.min(sg.az, sg.bz) / C), z1 = Math.floor(Math.max(sg.az, sg.bz) / C); for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const kk = i + ',' + j; if (!G2.has(kk)) G2.set(kk, []); G2.get(kk).push(k); } });
    const visto = new Set();
    G2.forEach(l => { for (let p = 0; p < l.length; p++) for (let q = p + 1; q < l.length; q++) { const A = segs[l[p]], B = segs[l[q]]; if (A.vi === B.vi) continue; const id = l[p] < l[q] ? l[p] + '_' + l[q] : l[q] + '_' + l[p]; if (visto.has(id)) continue; visto.add(id);
      const rx = A.bx - A.ax, rz = A.bz - A.az, sx = B.bx - B.ax, sz = B.bz - B.az, den = rx * sz - rz * sx; if (Math.abs(den) < 1e-9) continue; const t = ((B.ax - A.ax) * sz - (B.az - A.az) * sx) / den, u = ((B.ax - A.ax) * rz - (B.az - A.az) * rx) / den;
      if (t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999) { const x = A.ax + rx * t, z = A.az + rz * t; A.cortes.push([t, x, z]); B.cortes.push([u, x, z]); } } });
    // aristas: a lo largo de cada segmento pasando por sus cortes; los extremos de calles que se tocan se unen por SNAP
    const arista = (a, b) => { if (a === b) return; const d = Math.hypot(nodos[a][0] - nodos[b][0], nodos[a][1] - nodos[b][1]); ady[a].push([b, d]); ady[b].push([a, d]); };
    segs.forEach(sg => { let prev = nodo(sg.ax, sg.az); sg.cortes.sort((x, y) => x[0] - y[0]).forEach(c => { const k = nodo(c[1], c[2]); arista(prev, k); prev = k; }); arista(prev, nodo(sg.bx, sg.bz)); });
    return { nodos, ady, H, C };
  }
  function nodoCercano(g, x, z) { let m = -1, d = 1e12; const cx = Math.floor(x / g.C), cz = Math.floor(z / g.C); for (let r = 0; r <= 6 && m < 0; r++) { for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) { if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue; const l = g.H.get((cx + i) + ',' + (cz + j)); if (l) for (const k of l) { const dd = (g.nodos[k][0] - x) ** 2 + (g.nodos[k][1] - z) ** 2; if (dd < d) { d = dd; m = k; } } } } return m; }
  function rutaGrafo(g, desde, hasta) {
    const a = nodoCercano(g, desde[0], desde[1]), b = nodoCercano(g, hasta[0], hasta[1]); if (a < 0 || b < 0) return null; if (a === b) return [g.nodos[a]];
    const N = g.nodos.length, gs = new Float64Array(N).fill(Infinity), de = new Int32Array(N).fill(-1), cerrado = new Uint8Array(N), h = k => Math.hypot(g.nodos[k][0] - g.nodos[b][0], g.nodos[k][1] - g.nodos[b][1]), pila = [[h(a), a]]; gs[a] = 0;
    const push = e => { pila.push(e); let i = pila.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (pila[p][0] <= pila[i][0]) break; [pila[p], pila[i]] = [pila[i], pila[p]]; i = p; } };
    const pop = () => { const t = pila[0], u = pila.pop(); if (pila.length) { pila[0] = u; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < pila.length && pila[l][0] < pila[m][0]) m = l; if (r < pila.length && pila[r][0] < pila[m][0]) m = r; if (m === i) break; [pila[m], pila[i]] = [pila[i], pila[m]]; i = m; } } return t; };
    while (pila.length) { const [, k] = pop(); if (cerrado[k]) continue; cerrado[k] = 1; if (k === b) break; for (const [j, d] of g.ady[k]) { const ng = gs[k] + d; if (ng < gs[j]) { gs[j] = ng; de[j] = k; push([ng + h(j), j]); } } }
    if (de[b] < 0) return null; const out = []; for (let k = b; k >= 0; k = de[k]) out.push(g.nodos[k]); return out.reverse();
  }
  GM.nav = { crear, grafo, rutaGrafo };
})();
