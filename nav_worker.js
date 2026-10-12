/* NAVEGACIÓN EN UN HILO APARTE (GM.nav) — la búsqueda de caminos (A* sobre la rejilla de 0,75 m) de las personas del mundo se hace en un Worker para que
   no bloquee el dibujo: antes una sola búsqueda larga costaba entre 5 y 400 ms de CPU en el hilo principal.
   Uso: const nav = GM.nav.crear(G) (G es la rejilla de sede3d.js: { W, H, b, c, x0, z0 }); nav.pedir([x, z], [x2, z2], tope) devuelve una promesa con el camino
   ([[x, z], ...] ya suavizado, con .llega y .truncado) o null si no hay camino; nav.sincronizar() reenvía la rejilla si cambió; nav.cerrar().
   El código del worker es la función `cuerpo` (se serializa a un Blob, así funciona igual en la web, el móvil y la app de escritorio). */
(function () {
  function cuerpo() {
    let W = 0, H = 0, b = null, c = 1, x0 = 0, z0 = 0, A = null;
    const libre = (i, j) => i >= 0 && j >= 0 && i < W && j < H && !b[j * W + i], celda = (x, z) => [Math.floor((x - x0) / c), Math.floor((z - z0) / c)], centro = (i, j) => [x0 + (i + 0.5) * c, z0 + (j + 0.5) * c];
    const DIR = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    const ve = (a, bb) => { const d = Math.hypot(bb[0] - a[0], bb[1] - a[1]), n = Math.ceil(d / 0.2), px = d ? -(bb[1] - a[1]) / d * 0.22 : 0, pz = d ? (bb[0] - a[0]) / d * 0.22 : 0;
      for (let k = 1; k < n; k++) { const x = a[0] + (bb[0] - a[0]) * k / n, z = a[1] + (bb[1] - a[1]) * k / n; for (const s of [0, 1, -1]) { const [i, j] = celda(x + px * s, z + pz * s); if (!libre(i, j)) return false; } } return true; };
    function buscar(desde, hasta, tope) {
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
        for (const [di, dj, cost] of DIR) { const ni = ci + di, nj = cj + dj; if (!libre(ni, nj)) continue; if (di && dj && (!libre(ci + di, cj) || !libre(ci, cj + dj))) continue;
          const n = nj * W + ni, g = A.gS[cur] + cost; if (A.gen[n] !== gen || g < A.gS[n]) { A.gen[n] = gen; A.gS[n] = g; A.de[n] = cur; meter(g + h(ni, nj), n); } }
      }
      const llega = A.gen[fin] === gen && A.de[fin] >= 0 || fin === ini, meta = llega ? fin : mejorN; if (!llega && meta === ini) return null;
      const camino = []; for (let k = meta; k >= 0; k = k === ini ? -1 : A.de[k]) camino.push(centro(k % W, (k / W) | 0)); camino.reverse();
      const out = [camino[0]]; let k = 0; while (k < camino.length - 1) { let l = camino.length - 1; while (l > k + 1 && !ve(camino[k], camino[l])) l--; out.push(camino[l]); k = l; }
      const [ci2, cj2] = celda(hasta[0], hasta[1]), ult = out[out.length - 1]; if (llega && libre(ci2, cj2) && ve(ult, hasta)) out.push([hasta[0], hasta[1]]);
      return { camino: out, llega, truncado: exp > MAX };
    }
    self.onmessage = e => { const m = e.data;
      if (m.t === 'rejilla') { W = m.W; H = m.H; b = m.b; c = m.c; x0 = m.x0; z0 = m.z0; return; }
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
  GM.nav = { crear };
})();
