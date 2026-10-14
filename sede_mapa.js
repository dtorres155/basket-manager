/* Mapa de las escenas paseables (calle, pueblo, ciudad deportiva, casa): plano vectorial de la ciudad real o cuadrícula de obstáculos, con zoom, arrastre, nombres por zoom y viaje a un lugar.
   Se separó de sede3d.js: GM.sedeMapa({ S: () => escena activa, irA, entrar, aEstrella, anim }) devuelve mapa(), que abre o cierra la capa del mapa. */
(function () {
  GM.sedeMapa = function (ctx) {
    function mapa() {
      const S = ctx.S(), { irA, entrar, aEstrella, anim } = ctx;
      if (!S || !S.G) return; const prev = S.raiz.querySelector('.sede-mapa'); if (prev) { prev.remove(); return; }
      const h = GM.h, G = S.G, club = S.st.equipos[S.st.clubId], cv = h('canvas', { class: 'mapa-cv' }), x = cv.getContext && cv.getContext('2d'); if (!x) return;
      const VEC = S.mapaVec || null;   // plano vectorial de la ciudad real (calle_real.js); sin él se pinta la cuadrícula de obstáculos
      let base = null;                 // la cuadrícula, una vez, en un lienzo aparte
      if (!VEC) { base = document.createElement('canvas'); base.width = G.W; base.height = G.H; const b = base.getContext('2d'); b.fillStyle = '#e9e4d6'; b.fillRect(0, 0, G.W, G.H); b.fillStyle = '#6d6a62'; for (let j = 0; j < G.H; j++) for (let i = 0; i < G.W; i++) if (G.b[G.idx(i, j)]) b.fillRect(i, j, 1, 1); }
      const lim = { x0: G.x0, z0: G.z0, x1: G.x0 + G.W * G.c, z1: G.z0 + G.H * G.c };
      const Vw = { cx: S.yo.obj.position.x, cz: S.yo.obj.position.z, s: VEC ? 2.6 : 1, w: 600, h: 400 };
      const sMin = () => Math.min(Vw.w / (lim.x1 - lim.x0), Vw.h / (lim.z1 - lim.z0)) * 0.9, sMax = () => (VEC ? 22 : 12);
      if (!VEC) Vw.s = Math.max(sMin(), Math.min(sMax(), Math.min(Vw.w / (lim.x1 - lim.x0), Vw.h / (lim.z1 - lim.z0))));
      const aPx = (wx, wz) => [(wx - Vw.cx) * Vw.s + Vw.w / 2, (wz - Vw.cz) * Vw.s + Vw.h / 2], aMundo = (px, py) => [Vw.cx + (px - Vw.w / 2) / Vw.s, Vw.cz + (py - Vw.h / 2) / Vw.s];
      const COL = { parque: '#cfe3b4', pista: '#e3c9b8', agua: '#a9cde6', suelo: '#ece7da', calleBorde: '#c7bfae', calle: '#ffffff', calleMayor: '#fbf3d6', edif: '#c9c1b0', edifBorde: '#a39b8a', tienda: '#e2c4a2', publico: '#c3d0dc' };
      const ANCHO = [16, 12, 10, 8.5, 7, 5.5, 4];
      let pendiente = false; const pide = () => { if (pendiente) return; pendiente = true; requestAnimationFrame(() => { pendiente = false; pinta(); }); };
      const poli = (p, cierra) => { x.beginPath(); p.forEach((q, i) => { const [a, b] = aPx(q[0], q[1]); if (i) x.lineTo(a, b); else x.moveTo(a, b); }); if (cierra) x.closePath(); };
      const visible = bb => { const [a, b] = aPx(bb[0], bb[1]), [c, d] = aPx(bb[2], bb[3]); return c > -20 && a < Vw.w + 20 && d > -20 && b < Vw.h + 20; };
      function pinta() {
        const dpr = cv.width / Math.max(1, Vw.w); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = COL.suelo; x.fillRect(0, 0, Vw.w, Vw.h);
        if (VEC) {
          x.lineJoin = 'round'; x.lineCap = 'round';
          VEC.P.forEach(q => { if (!visible(q.bb)) return; poli(q.p, true); x.fillStyle = q.t === 1 ? COL.pista : COL.parque; x.fill(); });
          VEC.A.forEach(q => { if (!visible(q.bb)) return; if (q.t === 1) { poli(q.p, false); x.strokeStyle = COL.agua; x.lineWidth = 9 * Vw.s; x.stroke(); } else { poli(q.p, true); x.fillStyle = COL.agua; x.fill(); } });
          for (const pasada of [0, 1]) VEC.C.forEach(c => { if (!visible(c.bb)) return; const w = Math.max(c.k >= 5 ? 1.4 : 2, (ANCHO[c.k] || 4) * Vw.s * (pasada ? 0.78 : 1)); poli(c.p, false); x.strokeStyle = pasada ? (c.k <= 2 ? COL.calleMayor : COL.calle) : COL.calleBorde; x.lineWidth = w; x.stroke(); });
          VEC.B.forEach(b => { if (!visible(b.bb)) return; poli(b.p, true); x.fillStyle = b.cl === 2 || b.cl === 12 || b.cl === 11 ? COL.tienda : b.cl === 4 || b.cl === 5 || b.cl === 6 ? COL.publico : COL.edif; x.fill(); if (Vw.s > 1.4) { x.strokeStyle = COL.edifBorde; x.lineWidth = Math.min(1.2, Vw.s * 0.2); x.stroke(); } });
        } else { x.imageSmoothingEnabled = false; const [a, b] = aPx(lim.x0, lim.z0); x.drawImage(base, a, b, (lim.x1 - lim.x0) * Vw.s, (lim.z1 - lim.z0) * Vw.s); }
        x.textAlign = 'center'; x.textBaseline = 'middle';
        const rotulo = (txt, px, py, tam, fondo, color, giro) => { x.save(); x.translate(px, py); if (giro) x.rotate(giro); x.font = '600 ' + tam + 'px sans-serif'; x.lineWidth = 3.2; x.strokeStyle = fondo; x.strokeText(txt, 0, 0); x.fillStyle = color; x.fillText(txt, 0, 0); x.restore(); };
        if (VEC && Vw.s >= 1.5) {   // nombres de las calles, a lo largo de su tramo más largo
          const hechos = {};
          VEC.C.forEach(c => { if (!c.nom || !visible(c.bb) || hechos[c.nom]) return; const [a, b] = aPx(c.mx, c.mz); if (a < 30 || a > Vw.w - 30 || b < 20 || b > Vw.h - 20) return; let ang = c.ang; if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI; if (c.len * Vw.s < c.nom.length * 5.6) return; hechos[c.nom] = 1; rotulo(c.nom, a, b, Math.min(15, 9 + Vw.s * 0.7), 'rgba(255,255,255,.85)', '#5a5648', ang); });
        }
        if (VEC && Vw.s >= 4.5) VEC.B.forEach(b => { if (!b.nom || !visible(b.bb)) return; const [a, c] = aPx(b.cx, b.cz); rotulo(b.nom.length > 24 ? b.nom.slice(0, 23) + '…' : b.nom, a, c, Math.min(13, 8 + Vw.s * 0.35), 'rgba(255,255,255,.8)', '#4a4639'); });
        if (VEC && VEC.N && Vw.s >= 5.5) VEC.N.forEach(n => { const [a, c] = aPx(n.x, n.z); if (a < 20 || a > Vw.w - 20 || c < 14 || c > Vw.h - 14) return; x.fillStyle = '#7a6a52'; x.beginPath(); x.arc(a, c, 2.6, 0, 6.3); x.fill(); rotulo(n.nom.length > 22 ? n.nom.slice(0, 21) + '…' : n.nom, a, c - 8, 10.5, 'rgba(255,255,255,.85)', '#5a4f3d'); });
        (S.zonas || []).forEach(z => {
          const [px, py] = aPx(z.obj.position.x, z.obj.position.z); if (px < -30 || px > Vw.w + 30 || py < -30 || py > Vw.h + 30) return; const r = Math.max(5, Math.min(9, 4 + Vw.s * 0.6));
          x.fillStyle = z.sala.irA ? '#e8a400' : club.colores[0] === '#ffffff' ? '#e8590c' : club.colores[0]; x.beginPath(); x.arc(px, py, r, 0, 6.3); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke(); if (z.sala.encargo) { x.strokeStyle = '#ffc83a'; x.lineWidth = 3; x.beginPath(); x.arc(px, py, r + 4, 0, 6.3); x.stroke(); }
          const tx = z.sala.nombre.length > 22 ? z.sala.nombre.slice(0, 21) + '…' : z.sala.nombre; if (!VEC || Vw.s >= 1.1 || z.sala.irA) rotulo(tx, px, py - r - 8, 12, 'rgba(255,255,255,.92)', '#1c2b3a');
        });
        const [yx, yz] = aPx(S.yo.obj.position.x, S.yo.obj.position.z); x.fillStyle = '#2f80ed'; x.beginPath(); x.arc(yx, yz, 7, 0, 6.3); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 3; x.stroke();
        const m = [10, 20, 50, 100, 200].find(v => v * Vw.s >= 60) || 200; x.fillStyle = '#3a3a34'; x.fillRect(12, Vw.h - 18, m * Vw.s, 3); x.font = '600 11px sans-serif'; x.textAlign = 'left'; x.fillText(m + ' m', 12, Vw.h - 26); x.textAlign = 'center';
      }
      const visto = (S.st.sede && S.st.sede.visitadas && S.st.sede.visitadas[S.escena + (S.escenaArg ? ':' + S.escenaArg : '')]) || {};
      const lista = h('div', { class: 'mapa-lista' }, (S.zonas || []).map(z => visto[z.sala.id] ? h('span', { class: 'mapa-par' }, h('button', { class: 'btn btn-sec peq', onclick: () => ir(z) }, z.sala.nombre), h('button', { class: 'btn peq mapa-ya', title: 'Cómo ir: a pie, transporte o taxi, con tiempos y precios', onclick: () => elegir(z) }, 'Cómo ir')) : h('button', { class: 'btn btn-sec peq', onclick: () => ir(z) }, z.sala.nombre)));
      const capa = h('div', { class: 'sede-hud sede-mapa' }, h('div', { class: 'mapa-cab' }, h('b', null, 'Mapa'), h('span', null, 'Toca un punto o un nombre para ir andando; «Cómo ir» compara a pie, transporte y taxi.' + (S.demo && GM.demografia ? ' Zona de unos ' + GM.demografia.resumen(S).residentes.toLocaleString('es-ES') + ' vecinos y ' + GM.demografia.resumen(S).empleos.toLocaleString('es-ES') + ' puestos de trabajo.' : '')), h('button', { class: 'sp-cerrar', onclick: () => capa.remove() }, '×')), h('div', { class: 'mapa-lienzo' }, cv, h('div', { class: 'mapa-zoom' }, h('button', { title: 'Acercar', onclick: () => zoom(1.6, Vw.w / 2, Vw.h / 2) }, '+'), h('button', { title: 'Alejar', onclick: () => zoom(1 / 1.6, Vw.w / 2, Vw.h / 2) }, '−'), h('button', { title: 'Centrar en ti', onclick: () => { Vw.cx = S.yo.obj.position.x; Vw.cz = S.yo.obj.position.z; pide(); } }, '◎'))), lista);
      function ir(z) { capa.remove(); irA(S.yo, z.obj.position.x, z.obj.position.z, () => entrar(z.sala)); }
      function elegir(z) { if (GM.movilidad && S.real && !S.conduciendo) { capa.remove(); GM.movilidad.panel(S, S.st, z, { ir: () => irA(S.yo, z.obj.position.x, z.obj.position.z, () => entrar(z.sala)), saltar: () => saltar(z) }); } else saltar(z); }
      function saltar(z) { capa.remove(); const velo = h('div', { class: 'sede-velo' }); S.raiz.append(velo);
        setTimeout(() => { const zx = z.obj.position.x, zz = z.obj.position.z, cs = aEstrella(S.G, [zx, zz + 1.2], [zx, zz]), q = cs && cs.length ? cs[0] : [zx, zz]; S.yo.camino = null; S.yo.obj.position.set(q[0], 0, q[1]); S.foco.set(q[0], 0, q[1]); anim(S.yo, 'idle'); velo.classList.add('fuera'); setTimeout(() => velo.remove(), 450); entrar(z.sala); }, 300); }
      // zoom y desplazamiento: rueda, pellizco, arrastre, doble toque y botones
      const zoom = (f, px, py) => { const [wx, wz] = aMundo(px, py); Vw.s = Math.max(sMin(), Math.min(sMax(), Vw.s * f)); Vw.cx = wx - (px - Vw.w / 2) / Vw.s; Vw.cz = wz - (py - Vw.h / 2) / Vw.s; pide(); };
      const lugar = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      const ptrs = new Map(); let moved = 0, d0 = 0;
      cv.addEventListener('wheel', e => { e.preventDefault(); const [px, py] = lugar(e); zoom(Math.exp(-e.deltaY * 0.0016), px, py); }, { passive: false });
      cv.addEventListener('pointerdown', e => { cv.setPointerCapture && cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, lugar(e)); moved = 0; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
      cv.addEventListener('pointermove', e => {
        if (!ptrs.has(e.pointerId)) return; const [px, py] = lugar(e), [qx, qy] = ptrs.get(e.pointerId);
        if (ptrs.size === 1) { Vw.cx -= (px - qx) / Vw.s; Vw.cz -= (py - qy) / Vw.s; moved += Math.abs(px - qx) + Math.abs(py - qy); ptrs.set(e.pointerId, [px, py]); pide(); }
        else if (ptrs.size === 2) { ptrs.set(e.pointerId, [px, py]); const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d0 > 0) zoom(d / d0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); d0 = d; moved += 9; }
      });
      cv.addEventListener('pointerup', e => { const p = ptrs.get(e.pointerId) || lugar(e), eraUno = ptrs.size === 1; ptrs.delete(e.pointerId); if (eraUno && moved <= 6) clic(p[0], p[1]); });
      cv.addEventListener('pointercancel', e => ptrs.delete(e.pointerId));
      cv.addEventListener('dblclick', e => { const [px, py] = lugar(e); zoom(2, px, py); });
      function clic(px, py) {
        const [wx, wz] = aMundo(px, py), z = (S.zonas || []).map(q => { const [a, b] = aPx(q.obj.position.x, q.obj.position.z); return { z: q, d: Math.hypot(a - px, b - py) }; }).sort((a, b) => a.d - b.d)[0];
        if (z && z.d < 20) return ir(z.z);
        capa.remove(); irA(S.yo, wx, wz, null);
      }
      const ajusta = () => { const lz = cv.parentNode; if (!lz) return; const r = lz.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); Vw.w = Math.max(200, r.width); Vw.h = Math.max(160, r.height); cv.width = Math.round(Vw.w * dpr); cv.height = Math.round(Vw.h * dpr); pide(); };
      S.raiz.append(capa); ajusta(); if (window.ResizeObserver) new ResizeObserver(ajusta).observe(capa.querySelector('.mapa-lienzo'));
    }
    return mapa;
  };
})();
