/* Casas como producto (punto 52): una vivienda que compras es una inversión que cuida y se revaloriza o se estropea.
   Cada vivienda guarda p.prod = { estado 0-100, compraFecha, precioCompra, invertido, fachada { color }, extras { jardin, piscina, garaje, eficiencia }, mejoras [], obras [], averias [], vecinos [] }
   (en el modo carrera dentro de state.carrera.vivienda.actual / propiedades; en los demás modos en state.hogar.casa / propiedades).
   - Valor: precio de compra x índice de precios del barrio (cada año sube o baja según el barrio) x estado de conservación, más las mejoras que has hecho; vender cobra el valor menos el 3 % y las deudas.
   - Reformas por fases con obras visibles en la casa (andamios, vallas y conos en la zona afectada): cocina, baño, fachada, jardín, piscina, garaje, aislamiento y estructura. Duran días y molestan mientras duran.
   - Mantenimiento mensual, desgaste y averías (fontanería, caldera, humedades, tejado, electricidad) que hay que reparar; si no, empeoran y bajan el valor.
   - Vecinos (3 por casa, con carácter): ruidosos, amables, aficionados y cotillas; un café los hace amigos y cambia su efecto.
   GM.casasProd: panel(st, id, repintar) (modal), acciones(st, id) (panel de la casa en 3D), valor, vender, encargar, reparar, obraVisible, visitaVecino, extrasHabs, fachadaColor, selfTest. Prueba: t_casas_producto.js. */
(function () {
  const U = GM.util, modoCar = st => st.modo === 'carrera' && !!st.carrera;
  const euros = k => Math.round(k * 1000).toLocaleString('es-ES') + ' €', k1 = k => (Math.round(k * 10) / 10).toLocaleString('es-ES');
  const COLORES = [['Blanco roto', '#f4efe3'], ['Arena', '#e6d3b3'], ['Terracota', '#c98a6b'], ['Verde salvia', '#b9c9b0'], ['Azul cielo', '#b7cfe0'], ['Gris piedra', '#a9a9a4']];
  // pct: coste como fracción del precio de la vivienda, min en miles de euros; valor: parte del coste que se queda en el valor; dias de obra
  const REFORMAS = {
    cocina: { n: 'Cocina nueva', d: 'Muebles, encimera y electrodomésticos nuevos.', pct: 0.035, min: 6, dias: 14, valor: 0.75, estado: 6, fases: ['Demolición', 'Fontanería y electricidad', 'Montaje de muebles', 'Acabados'], zona: 'cocina' },
    bano: { n: 'Baño reformado', d: 'Plato de ducha, sanitarios y alicatado.', pct: 0.025, min: 4, dias: 10, valor: 0.65, estado: 5, fases: ['Demolición', 'Fontanería', 'Alicatado', 'Sanitarios'], zona: 'dormitorio' },
    fachada: { n: 'Fachada nueva', d: 'Revoco y pintura del color que elijas.', pct: 0.03, min: 5, dias: 12, valor: 0.5, estado: 8, fases: ['Andamio', 'Revoco', 'Pintura', 'Retirada del andamio'], zona: 'puerta' },
    jardin: { n: 'Jardín', d: 'Césped, arbolado y riego.', pct: 0.05, min: 8, dias: 12, valor: 0.8, estado: 0, ext: 'jardin', fases: ['Movimiento de tierras', 'Riego y plantación', 'Césped y arbolado'], zona: 'ext' },
    piscina: { n: 'Piscina', d: 'Piscina con depuradora, la tumbona va aparte.', pct: 0.08, min: 20, dias: 25, valor: 0.75, estado: 0, ext: 'piscina', fases: ['Excavación', 'Estructura y revestimiento', 'Depuradora', 'Llenado'], zona: 'ext' },
    garaje: { n: 'Garaje', d: 'Plaza cubierta para guardar tu coche y protegerlo.', pct: 0.04, min: 6, dias: 12, valor: 0.7, estado: 0, ext: 'garaje', fases: ['Cimentación', 'Estructura', 'Puerta y acabado'], zona: 'ext' },
    eficiencia: { n: 'Aislamiento y paneles solares', d: 'Baja el mantenimiento un 25 %.', pct: 0.03, min: 5, dias: 12, valor: 0.6, estado: 4, ext: 'eficiencia', fases: ['Aislamiento', 'Ventanas', 'Paneles'], zona: 'puerta' },
    estructura: { n: 'Reparar la estructura', d: 'Devuelve la casa a un estado impecable.', pct: 0.05, min: 6, dias: 18, valor: 0, estado: 100, fases: ['Apuntalado', 'Refuerzos', 'Acabados'], zona: 'puerta' }
  };
  const AVERIAS = [['Fuga de agua', 0.006], ['Caldera averiada', 0.008], ['Humedades en la pared', 0.01], ['Goteras en el tejado', 0.012], ['Instalación eléctrica', 0.007]];
  const NOMBRES = ['Alicia', 'Bruno', 'Carmen', 'Dani', 'Elena', 'Fausto', 'Gloria', 'Héctor', 'Inés', 'Joaquín', 'Lola', 'Mateo', 'Nuria', 'Óscar', 'Pilar', 'Rafa'], APELL = ['García', 'Soler', 'Ferrer', 'Puig', 'Roca', 'Vidal', 'Ortega', 'Navarro', 'Campos', 'Ibáñez'];
  const RASGOS = { amable: ['Amable', 'Te saluda siempre y te sube pan caliente.', 0.3, 0], ruidoso: ['Ruidoso', 'Música alta y obras los sábados.', -0.5, 1], aficionado: ['Aficionado al club', 'Va a todos los partidos y presume de ti.', 0.2, 0], cotilla: ['Cotilla', 'Lo sabe todo del edificio y de ti.', -0.1, 0], reservado: ['Reservado', 'Apenas lo ves.', 0, 0] };
  // ---------- Acceso a las viviendas ----------
  function lista(st) { const o = []; if (modoCar(st)) { const v = st.carrera.vivienda || {}; if (v.actual) o.push(v.actual); (v.propiedades || []).forEach(p => o.push(p)); } else if (st.hogar) { if (st.hogar.casa) o.push(st.hogar.casa); (st.hogar.propiedades || []).forEach(p => o.push(p)); } return o; }
  const buscar = (st, id) => lista(st).find(p => p.id === id) || null, esActual = (st, p) => modoCar(st) ? !!(st.carrera.vivienda.actual && st.carrera.vivienda.actual.id === p.id) : !!(st.hogar.casa && st.hogar.casa.id === p.id);
  const duena = p => p.modo === 'compra' || p.modo === 'hipoteca';
  const H = () => GM.mods.hogar, dinero = st => H().dinero(st);
  function pagar(st, k) { H().gastar(st, k); } function cobrar(st, k) { H().ingresar(st, k); }
  function ini(st, p) {
    if (p.prod) return p.prod; const r = U.hash(String(p.barrioNombre || '') + (p.tipo || '') + (st.clubId || ''));
    const vecinos = [0, 1, 2].map(i => { const h = U.hash(String(r) + 'v' + i), rasgo = Object.keys(RASGOS)[h % 5]; return { n: NOMBRES[h % 16] + ' ' + APELL[(h >>> 4) % 10], rasgo, rel: 10 + (h >>> 8) % 25 }; });
    return p.prod = { estado: 82 + r % 14, compraFecha: p.desde || st.fecha, precioCompra: p.precio || 0, invertido: 0, fachada: { color: '#f4efe3' }, extras: {}, mejoras: [], obras: [], averias: [], vecinos, reparado: 0 };
  }
  // ---------- Valor ----------
  function tasaAnual(st, p, anio) { return ((U.hash((p.ciudad || '') + '|' + (p.barrioNombre || '') + '|' + anio) % 1000) / 1000) * 0.11 - 0.03; }
  function indice(st, p) {
    const P = ini(st, p), t0 = P.compraFecha || st.fecha, meses = Math.max(0, Math.min(240, Math.round(U.diffDays(t0, st.fecha) / 30.4))); let f = 1;
    for (let m = 1; m <= meses; m++) { const d = U.addDays(t0, Math.round(m * 30.4)); f *= 1 + tasaAnual(st, p, +d.slice(0, 4)) / 12; }
    return f;
  }
  function valor(st, id) {
    const p = typeof id === 'object' ? id : buscar(st, id); if (!p) return 0; const P = ini(st, p), idx = indice(st, p), mejoras = P.mejoras.reduce((s, m) => s + m.valor, 0), deuda = P.averias.reduce((s, a) => s + a.coste, 0);
    return Math.max(1, Math.round(((P.precioCompra * (0.65 + 0.35 * P.estado / 100) + mejoras) * idx - deuda) * 10) / 10);
  }
  function mantenimiento(st, p) { const P = ini(st, p); return Math.max(0.3, Math.round(P.precioCompra * 0.0005 * (P.extras.eficiencia ? 0.75 : 1) * (1 + (P.extras.piscina ? 0.35 : 0) + (P.extras.jardin ? 0.15 : 0)) * 10) / 10); }
  function deudaHipoteca(st, p) { if (p.modo !== 'hipoteca') return 0; const m = Math.max(0, Math.round(U.diffDays(ini(st, p).compraFecha, st.fecha) / 30.4)); return Math.round(p.precio * 0.8 * Math.max(0, 1 - m / 300) * 10) / 10; }
  function ventaNeta(st, p) { const v = valor(st, p), bruto = Math.round(v * 0.97 * 10) / 10; return { bruto, deuda: deudaHipoteca(st, p), neto: Math.round((bruto - deudaHipoteca(st, p)) * 10) / 10 }; }
  function resultado(st, p) { const P = ini(st, p), vn = ventaNeta(st, p); return Math.round((vn.bruto - P.precioCompra - P.invertido) * 10) / 10; }
  function vender(st, id) {
    const p = buscar(st, id); if (!p) return { ok: false, motivo: 'Propiedad no encontrada.' }; if (!duena(p)) return { ok: false, motivo: 'Solo puedes vender lo que has comprado.' }; const P = ini(st, p), vn = ventaNeta(st, p), res = resultado(st, p);
    if (P.obras.length) return { ok: false, motivo: 'No se puede vender con una obra en marcha.' };
    cobrar(st, vn.neto); const c = modoCar(st) ? st.carrera.vivienda : st.hogar;
    if (modoCar(st)) { if (c.actual && c.actual.id === id) c.actual = null; else c.propiedades = c.propiedades.filter(x => x.id !== id); st.carrera.hitos.unshift({ fecha: st.fecha, texto: 'Vendes tu vivienda en ' + p.barrioNombre + ' por ' + k1(vn.bruto) + ' mil € (' + (res >= 0 ? 'ganas ' : 'pierdes ') + k1(Math.abs(res)) + ' mil €).' }); }
    else { if (c.casa && c.casa.id === id) { c.casa = null; } else c.propiedades = (c.propiedades || []).filter(x => x.id !== id); }
    if (GM.noticia) GM.noticia(st, 'Vendes tu vivienda en ' + p.barrioNombre + ' por ' + k1(vn.bruto) + ' mil €: ' + (res >= 0 ? 'beneficio de ' : 'pérdida de ') + k1(Math.abs(res)) + ' mil €.');
    return { ok: true, precio: vn.neto, bruto: vn.bruto, resultado: res };
  }
  // ---------- Obras ----------
  const coste = (p, R) => Math.max(R.min, Math.round((p.precio || 100) * R.pct * 10) / 10);
  function motivoNo(st, p, id) {
    const R = REFORMAS[id], P = ini(st, p); if (!R) return 'Obra desconocida.'; if (!duena(p)) return 'Solo se reforma lo que es tuyo.'; if (P.obras.length) return 'Ya hay una obra en marcha.';
    if (R.ext && R.ext !== 'eficiencia' && P.extras[R.ext]) return 'Ya lo tienes.'; if (R.ext === 'eficiencia' && P.extras.eficiencia) return 'Ya está hecho.'; if (id === 'estructura' && P.estado > 80) return 'La estructura está bien.';
    if (dinero(st) < coste(p, R)) return 'Te faltan ' + k1(coste(p, R) - dinero(st)) + ' mil €.'; return null;
  }
  function encargar(st, id, obra, opc) {
    const p = buscar(st, id), R = REFORMAS[obra]; if (!p) return { ok: false, motivo: 'Propiedad no encontrada.' }; const m = motivoNo(st, p, obra); if (m) return { ok: false, motivo: m };
    const P = ini(st, p), c = coste(p, R); pagar(st, c); P.invertido += c; P.obras.push({ id: obra, ini: st.fecha, fin: U.addDays(st.fecha, R.dias), coste: c, color: opc && opc.color || null });
    if (GM.noticia) GM.noticia(st, 'Empieza la obra: ' + R.n.toLowerCase() + ' en tu casa de ' + p.barrioNombre + ' (' + R.dias + ' días).'); return { ok: true, fin: P.obras[0].fin, coste: c };
  }
  function avance(st, o) { const R = REFORMAS[o.id], t = Math.max(0, Math.min(1, U.diffDays(o.ini, st.fecha) / Math.max(1, U.diffDays(o.ini, o.fin)))); return { t, fase: R.fases[Math.min(R.fases.length - 1, Math.floor(t * R.fases.length))], dias: Math.max(0, U.diffDays(st.fecha, o.fin)) }; }
  function terminarObras(st, p) {
    const P = ini(st, p); P.obras = P.obras.filter(o => {
      if (o.fin > st.fecha) return true; const R = REFORMAS[o.id]; P.mejoras.push({ id: o.id, fecha: st.fecha, valor: Math.round(o.coste * R.valor * 10) / 10 }); if (R.ext) P.extras[R.ext] = true; if (o.id === 'fachada' && o.color) P.fachada.color = o.color; P.estado = Math.min(100, R.estado === 100 ? 100 : P.estado + R.estado);
      if (GM.noticia) GM.noticia(st, 'Termina la obra: ' + R.n.toLowerCase() + ' en tu casa de ' + p.barrioNombre + '. Su valor sube ' + k1(Math.round(o.coste * R.valor * 10) / 10) + ' mil €.'); return false; });
  }
  // ---------- Averías y vecinos ----------
  function reparar(st, id, aid) {
    const p = buscar(st, id), P = p && ini(st, p), a = P && P.averias.find(x => x.id === aid); if (!a) return { ok: false, motivo: 'Esa avería no existe.' }; if (dinero(st) < a.coste) return { ok: false, motivo: 'Te faltan ' + k1(a.coste - dinero(st)) + ' mil €.' };
    pagar(st, a.coste); P.invertido += a.coste; P.averias = P.averias.filter(x => x !== a); P.estado = Math.min(100, P.estado + 4); return { ok: true, coste: a.coste };
  }
  function cafe(st, id, i) {
    const p = buscar(st, id), v = p && ini(st, p).vecinos[i]; if (!v) return { ok: false, motivo: 'Ese vecino no existe.' }; if (dinero(st) < 0.05) return { ok: false, motivo: 'No tienes ahorros para eso.' };
    if (v.cd && U.diffDays(v.cd, st.fecha) < 7) return { ok: false, motivo: 'Ya os tomasteis un café esta semana.' }; pagar(st, 0.05); v.cd = st.fecha; v.rel = Math.min(100, v.rel + 15); H().aplicar(st, { moral: 0.6 }); return { ok: true, texto: v.n + ' y tú os lleváis mejor (' + v.rel + '/100).' };
  }
  function efectoVecino(v) { const r = RASGOS[v.rasgo], f = v.rel >= 60 ? (r[2] < 0 ? 0.3 : 1.8) : v.rel >= 35 ? (r[2] < 0 ? 0.7 : 1) : (r[2] < 0 ? 1 : 0.6); return r[2] * f; }
  // ---------- Paso del tiempo ----------
  function dia(st) {
    lista(st).forEach(p => {
      const P = ini(st, p); if (P.obras.length) { terminarObras(st, p); if (esActual(st, p) && P.obras.length) H().aplicar(st, { moral: -0.12 }); }
    });
    if (st.fecha.slice(8) !== '01') return;
    lista(st).forEach((p, k) => {
      const P = ini(st, p); if (!duena(p) && p.modo !== 'alquiler') return; if (!duena(p)) { P.estado = Math.max(40, P.estado - 0.3); return; }
      const antig = Math.max(0, U.diffDays(P.compraFecha, st.fecha) / 365), desgaste = 0.8 + Math.min(1, antig * 0.06) + (P.extras.piscina ? 0.35 : 0) + (P.averias.length ? 1.5 : 0) + GM.rng.next() * 0.6;
      pagar(st, mantenimiento(st, p) * (esActual(st, p) ? 1 : 0.5)); P.estado = Math.max(0, Math.round((P.estado - desgaste) * 10) / 10);
      if (P.averias.length) H().aplicar(st, { moral: -0.5 * Math.min(2, P.averias.length) });
      const prob = Math.max(0.02, Math.min(0.4, (80 - P.estado) / 140 + 0.03));
      if (P.averias.length < 2 && !P.obras.length && GM.rng.next() < prob) { const [n, f] = AVERIAS[Math.floor(GM.rng.next() * AVERIAS.length)], c = Math.max(0.4, Math.round(P.precioCompra * f * (0.7 + GM.rng.next() * 0.8) * 10) / 10); P.averias.push({ id: 'a' + st.fecha + k, n, fecha: st.fecha, coste: c }); if (GM.noticia) GM.noticia(st, n + ' en tu casa de ' + p.barrioNombre + ': repararla cuesta ' + k1(c) + ' mil €.'); }
      if (esActual(st, p)) P.vecinos.forEach(v => { const e = efectoVecino(v); if (e) H().aplicar(st, { moral: e }); if (v.rasgo === 'cotilla' && GM.rng.next() < 0.06 && GM.noticia) GM.noticia(st, v.n + ' ha contado por el barrio lo que hace el club.'); });
    });
  }
  GM.bus.on('dia:avanzado', () => { const st = GM.state; if (st && st.equipos) { try { dia(st); } catch (e) { console.error('casasProd', e); } } });
  // ---------- La casa en 3D: extras y obras visibles ----------
  function extrasHabs(viv, habs) {
    const p = viv && buscar(GM.state, viv.id), P = p && p.prod; if (!P) return []; const ya = id => habs.some(h => h.id === id), o = [];
    if (P.extras.jardin && !ya('jardin')) o.push({ id: 'jardin', nombre: 'Jardín', ext: true, w: 6, d: 4.2, planta: 0 });
    if (P.extras.piscina && !ya('piscina')) o.push({ id: 'piscina', nombre: 'Piscina', ext: true, w: 6, d: 4.2, planta: 0 });
    if (P.extras.garaje && !ya('garaje')) o.push({ id: 'garaje', nombre: 'Garaje', ext: true, w: 4.8, d: 4.2, planta: 0 });
    return o;
  }
  function obraVisible(S, M, st, viv, PL) {
    S.casaObras = []; const p = buscar(st, viv.id); if (!p) return; const P = ini(st, p); if (!P.obras.length) return; const W = S.mundo, T = THREE, todas = PL.habs.concat(PL.ext), matV = new T.MeshStandardMaterial({ color: 0xe8b84a, roughness: 0.8 }), matC = new T.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.6 });
    P.obras.forEach(o => {
      const R = REFORMAS[o.id], av = avance(st, o); let r = todas.find(q => q.id === R.zona) || (R.zona === 'ext' ? PL.ext[PL.ext.length - 1] : null) || PL.habs[0]; if (R.zona === 'puerta' || !r) r = { x0: PL.puertaX - 2, x1: PL.puertaX + 2, z0: PL.front - 0.2, z1: PL.front + 2.2, id: 'puerta' };
      const g = new T.Group(); g.userData = { obra: true };
      const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, w = r.x1 - r.x0, d = r.z1 - r.z0;
      const lona = new T.Mesh(new T.PlaneGeometry(w - 0.3, d - 0.3).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0xd9d4c4, transparent: true, opacity: 0.55, roughness: 0.9 })); lona.position.set(cx, 0.02, cz); g.add(lona);
      for (const [px, pz] of [[r.x0 + 0.25, r.z0 + 0.25], [r.x1 - 0.25, r.z0 + 0.25], [r.x0 + 0.25, r.z1 - 0.25], [r.x1 - 0.25, r.z1 - 0.25]]) { const poste = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 2.2, 6), matV); poste.position.set(px, 1.1, pz); poste.castShadow = true; g.add(poste); }
      for (let i = 0; i < 3; i++) { const barra = new T.Mesh(new T.BoxGeometry(w - 0.4, 0.05, 0.05), matV); barra.position.set(cx, 0.6 + i * 0.7, r.z1 - 0.25); g.add(barra); }
      for (let i = 0; i < 3; i++) { const cono = new T.Mesh(new T.ConeGeometry(0.14, 0.4, 8), matC); cono.position.set(r.x0 + 0.7 + i * (w - 1.4) / 2, 0.2, r.z1 - 0.7); cono.castShadow = true; g.add(cono); }
      for (let i = 0; i < 4; i++) { const saco = new T.Mesh(new T.BoxGeometry(0.5, 0.18, 0.32), new T.MeshStandardMaterial({ color: 0xb9ab95 })); saco.position.set(cx - 0.6 + (i % 2) * 0.55, 0.09 + Math.floor(i / 2) * 0.18, cz + 0.2); saco.rotation.y = i * 0.5; g.add(saco); }
      const et = M.etiqueta('En obras: ' + R.n.toLowerCase() + ', ' + av.dias + ' d'); et.scale.multiplyScalar(0.7); et.position.set(cx, 2.4, cz); et.userData = { etiqueta: true, rotulo: true }; g.add(et);
      W.add(g); S.casaObras = (S.casaObras || []).concat([g]); if (S.casaMuros && r.id !== 'puerta') S.casaMuros.push([r.x0 + 0.3, r.z0 + 0.3, r.x1 - 0.3, r.z1 - 0.3]);
    });
  }
  // Un vecino con el que te llevas bien (relación de 60 o más) te visita en el salón: se sienta en el sofá y charla (con su nombre sobre la cabeza)
  async function visitaVecino(S, M, st, viv, salon) {
    const p = buscar(st, viv.id); if (!p || !p.prod || !esActual(st, p)) return; const v = p.prod.vecinos.find(x => x.rel >= 60); if (!v || !salon) return;
    const MOD = ['h-casual_2', 'm-casual', 'h-casual_hoodie', 'm-formal'], h = U.hash(v.n), pe = await M.personaje({ modelo: MOD[h % MOD.length], altura: 158 + h % 28, piel: ['#f1c7a5', '#e0ac85', '#c68863'][h % 3], pelo: ['#1d1510', '#6a4425', '#8a8a8a'][(h >>> 3) % 3] });
    pe.rol = v.n; pe.fijo = true; pe.espera = 0; pe.obj.userData = { npc: S.gente.length }; pe.obj.position.set(salon.x1 - 1.6, 0, (salon.z0 + salon.z1) / 2); pe.obj.rotation.y = -Math.PI / 2; M.anim(pe, 'idle'); S.mundo.add(pe.obj); S.gente.push(pe);
    const et = M.etiqueta(v.n); et.scale.multiplyScalar(0.55); et.position.set(pe.obj.position.x, 2.2, pe.obj.position.z); et.userData = { etiqueta: true, rotulo: true }; S.mundo.add(et);
  }
  const fachadaColor = (st, v) => { const p = v && buscar(st, v.id); return (p && p.prod && p.prod.fachada && p.prod.fachada.color) || '#f4efe3'; }, fachadaPropia = (st, v) => fachadaColor(st, v) !== '#f4efe3';
  // ---------- Interfaz ----------
  function ficha(st, p) {
    const P = ini(st, p), v = valor(st, p), vn = ventaNeta(st, p), idx = indice(st, p);
    return { valor: v, estado: P.estado, compra: P.precioCompra, invertido: P.invertido, indice: Math.round((idx - 1) * 1000) / 10, mantenimiento: mantenimiento(st, p), neto: vn.neto, deuda: vn.deuda, resultado: resultado(st, p) };
  }
  function acciones(st, id) {
    const p = buscar(st, id); if (!p) return [{ id: 'nada', t: 'Sin datos de esta vivienda', d: '', disponible: false, motivo: 'No es tuya', fn: () => ({ ok: false }) }];
    const P = ini(st, p), f = ficha(st, p), out = [], A = (id2, t, d, disponible, motivo, fn) => out.push({ id: id2, t, d, disponible, motivo: motivo || d, fn });
    A('estado', 'Estado de la casa: ' + Math.round(f.estado) + ' %, valor ' + k1(f.valor) + ' mil €', 'Compraste por ' + k1(f.compra) + ' mil €, invertido ' + k1(f.invertido) + ' mil €, barrio ' + (f.indice >= 0 ? '+' : '') + f.indice + ' %. Mantenimiento ' + k1(f.mantenimiento) + ' mil €/mes.', false, null, () => ({ ok: false }));
    P.obras.forEach(o => { const av = avance(st, o); A('obra' + o.id, 'En obras: ' + REFORMAS[o.id].n.toLowerCase(), 'Fase ' + av.fase.toLowerCase() + ', terminan en ' + av.dias + ' días.', false, null, () => ({ ok: false })); });
    P.averias.forEach(a => A('rep' + a.id, 'Reparar: ' + a.n.toLowerCase(), 'Cuesta ' + k1(a.coste) + ' mil €. Si esperas, empeora.', dinero(st) >= a.coste, 'Te faltan ' + k1(a.coste - dinero(st)) + ' mil €', () => { const r = reparar(st, id, a.id); return r.ok ? { ok: true, texto: 'Reparado por ' + euros(r.coste) } : r; }));
    Object.keys(REFORMAS).forEach(oid => { const R = REFORMAS[oid], m = motivoNo(st, p, oid); if (m === 'Ya lo tienes.' || m === 'Ya está hecho.' || m === 'La estructura está bien.') return; A('obra_' + oid, R.n + ' (' + k1(coste(p, R)) + ' mil €)', R.d + ' Dura ' + R.dias + ' días y sube el valor ' + k1(Math.round(coste(p, R) * R.valor * 10) / 10) + ' mil €.', !m, m, () => { const r = encargar(st, id, oid, oid === 'fachada' ? { color: COLORES[(U.hash(st.fecha) >>> 0) % COLORES.length][1] } : null); return r.ok ? { ok: true, texto: 'Obra encargada, terminan el ' + U.fecha(r.fin) } : r; }); });
    P.vecinos.forEach((v, i) => A('vec' + i, 'Café con ' + v.n + ' (' + RASGOS[v.rasgo][0].toLowerCase() + ', ' + v.rel + '/100)', RASGOS[v.rasgo][1] + ' Invitarle cuesta 50 €.', !(v.cd && U.diffDays(v.cd, st.fecha) < 7), 'Ya os tomasteis un café esta semana', () => cafe(st, id, i)));
    if (duena(p)) A('vender', 'Vender la casa por ' + k1(f.neto) + ' mil €', (f.resultado >= 0 ? 'Ganarías ' : 'Perderías ') + k1(Math.abs(f.resultado)) + ' mil € respecto a lo que pusiste' + (f.deuda ? ', y quedan ' + k1(f.deuda) + ' mil € de hipoteca' : '') + '. Comisión del 3 %.', !P.obras.length, 'Hay una obra en marcha', () => { const r = vender(st, id); return r.ok ? { ok: true, texto: 'Vendida: cobras ' + k1(r.precio) + ' mil € (' + (r.resultado >= 0 ? 'beneficio ' : 'pérdida ') + k1(Math.abs(r.resultado)) + ' mil €)' } : r; });
    return out;
  }
  function panel(st, id, repintar) {
    const h = GM.h, p = buscar(st, id); if (!p) return h('p', null, 'Esa vivienda ya no es tuya.'); const P = ini(st, p), f = ficha(st, p), hecho = r => { GM.ui.toast(r.ok ? r.texto || 'Hecho' : r.motivo || 'No se puede'); if (repintar) repintar(); };
    const barra = (t, v) => h('div', { class: 'sp-barra-mini' }, h('span', null, t), h('i', null, h('u', { style: { width: Math.round(v) + '%' } })));
    let confirmar = false; const botonVenta = h('button', { class: 'btn btn-sec', onclick: () => { if (!confirmar) { confirmar = true; botonVenta.textContent = 'Confirmar: vender por ' + k1(f.neto) + ' mil €'; return; } hecho((r => r.ok ? { ok: true, texto: 'Vendida por ' + k1(r.precio) + ' mil €, ' + (r.resultado >= 0 ? 'ganas ' : 'pierdes ') + k1(Math.abs(r.resultado)) + ' mil €' } : r)(vender(st, id))); } }, 'Vender la casa');
    return h('div', { class: 'cp-panel' }, h('h3', null, (H().varianteDe ? H().varianteDe(p.tipo, p.barrioNombre).nombre : 'Tu vivienda') + ', ' + p.barrioNombre), barra('Estado de conservación', f.estado),
      h('div', { class: 'chips' }, [['Valor ' + k1(f.valor) + ' mil €'], ['Compra ' + k1(f.compra) + ' mil €'], ['Invertido ' + k1(f.invertido) + ' mil €'], ['Barrio ' + (f.indice >= 0 ? '+' : '') + f.indice + ' %'], ['Mantenimiento ' + k1(f.mantenimiento) + ' mil €/mes']].map(c => h('span', { class: 'chip' }, c[0]))),
      Object.keys(P.extras).length ? h('p', { class: 'muted' }, 'Extras: ' + Object.keys(P.extras).filter(k => P.extras[k]).map(k => ({ jardin: 'jardín', piscina: 'piscina', garaje: 'garaje', eficiencia: 'aislamiento y paneles' }[k] || k)).join(', ') + '.') : null,
      P.obras.map(o => { const av = avance(st, o), R = REFORMAS[o.id]; return h('div', { class: 'tarjeta' }, h('b', null, 'Obra en marcha: ' + R.n.toLowerCase()), barra('Fase: ' + av.fase, av.t * 100), h('span', { class: 'muted' }, 'Terminan en ' + av.dias + ' días.')); }),
      P.averias.length ? h('div', null, h('h4', null, 'Averías'), P.averias.map(a => h('div', { class: 'item' }, h('div', { class: 'ct' }, h('b', null, a.n), h('span', { class: 'muted' }, 'Desde el ' + U.fecha(a.fecha))), h('button', { class: 'btn peq', onclick: () => hecho(reparar(st, id, a.id)) }, 'Reparar ' + k1(a.coste) + ' mil €')))) : null,
      h('h4', null, 'Reformas'), duena(p) ? h('div', { class: 'lista' }, Object.keys(REFORMAS).map(oid => { const R = REFORMAS[oid], m = motivoNo(st, p, oid), hecho2 = m === 'Ya lo tienes.' || m === 'Ya está hecho.'; return h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, R.n), h('span', { class: 'muted' }, k1(coste(p, R)) + ' mil €, ' + R.dias + ' días')), h('span', { class: 'muted' }, R.d + ' Vale ' + k1(Math.round(coste(p, R) * R.valor * 10) / 10) + ' mil € más.'),
        oid === 'fachada' ? h('div', { class: 'seg' }, COLORES.map(c => h('button', { class: 'tab', style: { background: c[1], minWidth: '38px' }, 'aria-label': c[0], disabled: !!m, onclick: () => hecho(encargar(st, id, 'fachada', { color: c[1] })) }, ''))) : h('button', { class: 'btn peq', disabled: !!m, onclick: () => hecho(encargar(st, id, oid)) }, hecho2 ? 'Hecho' : m ? m : 'Encargar la obra')); })) : h('p', { class: 'muted' }, 'No puedes reformar una vivienda alquilada.'),
      h('h4', null, 'Vecinos'), h('div', { class: 'lista' }, P.vecinos.map((v, i) => h('div', { class: 'item' }, h('div', { class: 'ct' }, h('b', null, v.n), h('span', { class: 'muted' }, RASGOS[v.rasgo][0] + ', relación ' + v.rel + '/100. ' + RASGOS[v.rasgo][1])), h('button', { class: 'btn peq btn-sec', onclick: () => hecho(cafe(st, id, i)) }, 'Invitar a un café')))),
      duena(p) ? h('div', null, h('p', { class: 'muted' }, (f.resultado >= 0 ? 'Si vendes hoy ganas ' : 'Si vendes hoy pierdes ') + k1(Math.abs(f.resultado)) + ' mil € respecto a lo que pusiste (comisión del 3 %).' + (f.deuda ? ' Quedan ' + k1(f.deuda) + ' mil € de hipoteca.' : '')), botonVenta) : null);
  }
  function selfTest() {
    const st = { modo: 'gestor', fecha: '2026-10-01', clubId: 'a', equipos: { a: { id: 'a', ciudad: 'X', reputacion: 80, plantilla: [] } }, jugadores: {}, historial: [], hogar: { ahorros: 500, casa: { id: 'h1', tipo: 'casa', modo: 'compra', barrio: 1, barrioNombre: 'Centro', ciudad: 'X', precio: 900, desde: '2026-10-01' }, muebles: {} } };
    const p = st.hogar.casa, v0 = valor(st, p); if (!(v0 > 800 && v0 < 1000)) return false; st.fecha = '2028-10-01'; const v1 = valor(st, p); if (!(v1 > 500 && v1 < 1500) || v1 === v0) return false;
    st.fecha = '2026-10-01'; ini(st, p).estado = 40; const v2 = valor(st, p); return v2 < v0 && !motivoNo(st, p, 'cocina') && Object.keys(REFORMAS).every(k => REFORMAS[k].fases.length >= 3);
  }
  GM.casasProd = { REFORMAS, COLORES, RASGOS, lista, buscar, ini, valor, ficha, vender, encargar, reparar, cafe, avance, coste, motivoNo, acciones, panel, obraVisible, visitaVecino, extrasHabs, fachadaColor, fachadaPropia, mantenimiento, indice, dia, selfTest };
  GM.register && GM.register('casasProd', { selfTest });
})();
