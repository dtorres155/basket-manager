/* PATRIMONIO (punto 54, GM.patrimonio) — todos los modos (el modo carrera es el protagonista).
   Un libro de cuentas con todos los movimientos, un patrimonio neto que sube y baja con tus decisiones y con el mercado, y los bienes y deudas que lo forman:
   - Bienes: solares, locales, aparcamientos, coches de colección y obras de arte, además de tus casas (casas_producto.js). Cada mes salen ofertas en cada barrio con precios que se mueven
     (cada año el barrio sube o baja, el arte da saltos por trimestre y los coches clásicos se revalorizan). Comprar al contado o con hipoteca, vender (comisión del 3 %), alquilar locales y plazas, edificar un solar.
   - Préstamos: se piden con un tipo según el país y tu patrimonio, se pagan en cuotas fijas cada mes y se pueden amortizar. Las hipotecas de los bienes son préstamos con su cuota.
   - Seguros: de la casa (las reparaciones cuestan un tercio), del coche y de lesión (cobras un tanto al mes mientras estás lesionado).
   - Impuestos por país: la declaración anual (rentas del capital, alquileres, negocios y plusvalías, con tramos de cada país) y un impuesto sobre los bienes en otoño. La nómina ya llega neta (factorNeto).
   Estado: state.patrimonio = { libro, serie, bienes, deudas, seguros, ofertas, imp, reg0, ultCaja, seq } (se crea al usarse). Expone: reg, neto, mercado (ofertas), comprar, vender, alquilar, edificar, prestamo, amortizar, contratarSeguro,
   declaracion, valorBien, factorNeto, libro, serie, factorSeguro, selfTest. Prueba: t_patrimonio.js. */
(function () {
  const U = GM.util, clamp = U.clamp, modoCar = st => st.modo === 'carrera' && !!st.carrera;
  const H = () => GM.mods.hogar, dinero = st => H().dinero(st), pagar = st => k => H().gastar(st, k), cobrar = (st, k) => H().ingresar(st, k);
  const k1 = k => (Math.round(k * 10) / 10).toLocaleString('es-ES'), eur = k => Math.round(k * 1000).toLocaleString('es-ES') + ' €';
  const pais = st => { const e = st.equipos && st.equipos[st.clubId]; return (e && e.pais) || 'ES'; };
  // Tipos de interés anuales de los préstamos, nómina neta (proporción de lo bruto), tramos del impuesto (en miles de euros) y fecha de la declaración
  const PAISES = {
    ES: { tipo: 0.036, neto: 0.62, imp: [[6, .19], [50, .21], [200, .23], [300, .27], [1e9, .28]], dia: '06-30', ibi: 0.0045 }, US: { tipo: 0.065, neto: 0.68, imp: [[11, .10], [45, .12], [95, .22], [182, .24], [231, .32], [578, .35], [1e9, .37]], dia: '04-15', ibi: 0.011 },
    DE: { tipo: 0.038, neto: 0.58, imp: [[11.6, 0], [17, .14], [66, .24], [278, .42], [1e9, .45]], dia: '07-31', ibi: 0.0035 }, FR: { tipo: 0.034, neto: 0.60, imp: [[11, 0], [29, .11], [83, .30], [181, .41], [1e9, .45]], dia: '06-30', ibi: 0.012 },
    IT: { tipo: 0.036, neto: 0.59, imp: [[28, .23], [50, .35], [1e9, .43]], dia: '06-30', ibi: 0.0076 }, GR: { tipo: 0.032, neto: 0.66, imp: [[10, .09], [20, .22], [30, .28], [40, .36], [1e9, .44]], dia: '07-31', ibi: 0.0025 },
    TR: { tipo: 0.30, neto: 0.72, imp: [[15, .15], [40, .20], [100, .27], [1e9, .35]], dia: '03-31', ibi: 0.002 }, DEF: { tipo: 0.045, neto: 0.62, imp: [[10, .15], [50, .25], [1e9, .35]], dia: '06-30', ibi: 0.006 }
  };
  const P = st => PAISES[pais(st)] || PAISES.DEF;
  const factorNeto = st => P(st).neto;
  function tramos(imp, base) { let t = 0, ant = 0; imp.forEach(([lim, r]) => { if (base > ant) t += (Math.min(base, lim) - ant) * r; ant = lim; }); return t; }
  const GASTOS_VIDA = [0.6, 1.0, 1.8, 3.0, 5.0, 8.0];
  const BARRIOS0 = ['Centro', 'Ensanche', 'Puerto', 'Colinas', 'Periferia'];
  function barrios(st) { try { const b = GM.mods.carrera && GM.mods.carrera.barriosVivienda && modoCar(st) ? GM.mods.carrera.barriosVivienda(st) : null; if (b && b.length) return b.map(x => ({ nombre: x.nombre, f: x.precio })); } catch (e) { /* sin barrios */ } const ciu = st.equipos[st.clubId].ciudad; return BARRIOS0.map((n, i) => ({ nombre: n, f: Math.round((0.75 + (U.hash(ciu + n) % 60) / 100) * 100) / 100 })); }
  const eco = st => (GM.economia ? GM.economia.indicePrecios(st) : 1);
  // ---------- Estado y libro ----------
  function est(st) {
    if (!st.patrimonio) st.patrimonio = { libro: [], serie: [], bienes: [], deudas: [], seguros: { hogar: false, coche: false, lesion: false }, ofertas: { mes: '', lista: [] }, imp: { anio: +st.fecha.slice(0, 4), ingresos: 0, retenido: 0, pagado: [] }, reg0: 0, ultCaja: null, seq: 0 };
    const e = st.patrimonio; if (e.ultCaja === null) e.ultCaja = dinero(st); return e;
  }
  const CATS = { trabajo: 'Nómina', vivienda: 'Vivienda', bienes: 'Bienes', alquiler: 'Alquileres', negocio: 'Negocios', prestamo: 'Préstamos', seguro: 'Seguros', impuesto: 'Impuestos', vida: 'Vida diaria', otros: 'Otros' };
  // Anota un movimiento (importe en miles de euros, positivo entra y negativo sale). Cuenta como ingreso imponible si lo dices (imponible: true)
  function reg(st, cat, texto, v, bien, imponible) {
    const e = est(st); e.libro.unshift({ f: st.fecha, c: cat, t: texto, v: Math.round(v * 100) / 100, b: bien || null }); if (e.libro.length > 600) e.libro.length = 600; e.reg0 += v;
    if (imponible && v > 0) e.imp.ingresos += v; return v;
  }
  function conciliar(st) {   // lo que ha cambiado en la caja sin que nadie lo anotara se anota como «otros»
    const e = est(st), caja = dinero(st), otros = (caja - e.ultCaja) - e.reg0; if (Math.abs(otros) >= 0.05) e.libro.unshift({ f: st.fecha, c: otros >= 0 ? 'otros' : 'vida', t: otros >= 0 ? 'Ingresos varios' : 'Gastos varios', v: Math.round(otros * 100) / 100, b: null });
    if (e.libro.length > 600) e.libro.length = 600; e.ultCaja = caja; e.reg0 = 0;
  }
  // ---------- Valor de los bienes ----------
  const TIPOS = {
    solar: { n: 'Solar', base: 140, tasa: [0.01, 0.07], renta: 0 }, local: { n: 'Local comercial', base: 260, tasa: [-0.02, 0.06], renta: 0.0055 }, aparcamiento: { n: 'Plaza de aparcamiento', base: 22, tasa: [0.0, 0.04], renta: 0.0065 },
    coche: { n: 'Coche de colección', base: 90, tasa: [-0.06, 0.12], renta: 0 }, arte: { n: 'Obra de arte', base: 60, tasa: [-0.15, 0.25], renta: 0 }
  };
  const COCHES = ['Seat 600 restaurado', 'Mini Cooper clásico', 'Porsche 911 de los 80', 'Ford Mustang del 67', 'Mercedes 300 SL', 'Alfa Romeo Giulia', 'Citroën DS', 'Jaguar E-Type'], ARTE = ['Óleo de paisaje', 'Grabado numerado', 'Escultura de bronce', 'Lienzo abstracto', 'Fotografía firmada', 'Acuarela del puerto', 'Mural enmarcado', 'Dibujo a carboncillo'];
  function tasaAnual(st, b, anio) { const T = TIPOS[b.tipo], h = (U.hash((b.barrio || b.nombre) + '|' + b.tipo + '|' + anio) % 1000) / 1000; return T.tasa[0] + (T.tasa[1] - T.tasa[0]) * h; }
  function indice(st, b, fecha) {
    const t0 = b.compra.fecha, meses = Math.max(0, Math.min(300, Math.round(U.diffDays(t0, fecha || st.fecha) / 30.4))); let f = 1;
    for (let m = 1; m <= meses; m++) { const d = U.addDays(t0, Math.round(m * 30.4)), tr = Math.floor((+d.slice(5, 7) - 1) / 3), anio = +d.slice(0, 4); let paso = tasaAnual(st, b, anio) / 12;
      if (b.tipo === 'arte') paso += ((U.hash(b.id + '|' + anio + 'T' + tr) % 200) - 90) / 1000 * (m % 3 === 0 ? 1 : 0); if (b.tipo === 'coche' && b.clasico === false) paso = -0.012; f *= 1 + paso; }
    return Math.max(0.2, f);
  }
  function valorBien(st, b) { if (b.obra && b.obra.fin > st.fecha) return Math.round(b.compra.precio * 1000) / 1000; return Math.round(b.compra.precio * indice(st, b) * (b.mejora || 1) * 10) / 10; }
  // ---------- Mercado: ofertas del mes ----------
  function mercado(st) {
    const e = est(st), mes = st.fecha.slice(0, 7); if (e.ofertas.mes === mes) return e.ofertas.lista; const bs = barrios(st), lista = [], rr = U.hash(st.clubId + mes) >>> 0;
    ['solar', 'solar', 'local', 'local', 'aparcamiento', 'aparcamiento', 'coche', 'arte', 'arte'].forEach((tipo, i) => {
      const h = U.hash(rr + tipo + i) >>> 0, b = bs[h % bs.length], T = TIPOS[tipo], nombre = tipo === 'coche' ? COCHES[h % COCHES.length] : tipo === 'arte' ? ARTE[h % ARTE.length] : T.n + ' en ' + b.nombre;
      const f = tipo === 'coche' || tipo === 'arte' ? 0.7 + ((h >>> 5) % 90) / 100 : b.f, tam = 0.6 + ((h >>> 9) % 100) / 100, precio = Math.round(T.base * f * tam * eco(st) * (0.92 + ((h >>> 13) % 17) / 100) * 10) / 10;
      lista.push({ id: 'o' + mes + i, tipo, nombre, barrio: tipo === 'coche' || tipo === 'arte' ? 'Subasta' : b.nombre, precio, renta: T.renta ? Math.round(precio * T.renta * 100) / 100 : 0, m2: tipo === 'solar' ? Math.round(120 * tam) : tipo === 'local' ? Math.round(70 * tam) : tipo === 'aparcamiento' ? 12 : 0, clasico: tipo === 'coche' ? (h >>> 3) % 4 !== 0 : undefined });
    }); e.ofertas = { mes, lista }; return lista;
  }
  // ---------- Compra y venta ----------
  function limiteCredito(st) { const n = neto(st).total, sal = modoCar(st) && st.jugadores.yo && st.jugadores.yo.contrato ? st.jugadores.yo.contrato.salario / 1000 : 120; return Math.max(0, Math.round((0.6 * Math.max(0, n) + 3 * sal) * 10) / 10); }
  function deudaTotal(st) { return est(st).deudas.reduce((s, d) => s + d.restante, 0); }
  function comprar(st, ofertaId, modo) {
    const e = est(st), o = mercado(st).find(x => x.id === ofertaId); if (!o) return { ok: false, motivo: 'Esa oferta ya no está.' }; modo = modo || 'contado'; const entrada = modo === 'hipoteca' ? Math.round(o.precio * 0.2 * 10) / 10 : o.precio;
    if (modo === 'hipoteca' && (o.tipo === 'coche' || o.tipo === 'arte')) return { ok: false, motivo: 'Eso solo se compra al contado.' };
    if (dinero(st) < entrada) return { ok: false, motivo: 'Te faltan ' + k1(entrada - dinero(st)) + ' mil €.' };
    if (modo === 'hipoteca' && o.precio * 0.8 > limiteCredito(st) - deudaTotal(st)) return { ok: false, motivo: 'El banco solo te presta ' + k1(Math.max(0, limiteCredito(st) - deudaTotal(st))) + ' mil € más.' };
    pagar(st)(entrada); const b = { id: 'b' + (++e.seq), tipo: o.tipo, nombre: o.nombre, barrio: o.barrio, m2: o.m2, compra: { fecha: st.fecha, precio: o.precio }, renta: o.renta, alquilado: false, mejora: 1, clasico: o.clasico, estado: 100 };
    e.bienes.push(b); reg(st, 'bienes', 'Compra: ' + o.nombre, -entrada, b.id);
    if (modo === 'hipoteca') { const d = nuevaDeuda(st, 'hipoteca', Math.round(o.precio * 0.8 * 10) / 10, 300, 'Hipoteca de ' + o.nombre, b.id); b.deuda = d.id; }
    e.ofertas.lista = e.ofertas.lista.filter(x => x.id !== ofertaId); return { ok: true, bien: b };
  }
  function vender(st, id) {
    const e = est(st), i = e.bienes.findIndex(b => b.id === id); if (i < 0) return { ok: false, motivo: 'No tienes eso.' }; const b = e.bienes[i]; if (b.obra && b.obra.fin > st.fecha) return { ok: false, motivo: 'Hay una obra en marcha.' };
    const bruto = Math.round(valorBien(st, b) * 0.97 * 10) / 10, deuda = e.deudas.find(d => d.bien === id), debe = deuda ? deuda.restante : 0; if (deuda) { e.deudas = e.deudas.filter(d => d !== deuda); reg(st, 'prestamo', 'Cancelas ' + deuda.nombre.toLowerCase(), -debe, id); }
    const neto0 = Math.round((bruto - debe) * 10) / 10, gan = Math.max(0, bruto - b.compra.precio); cobrar(st, bruto); reg(st, 'bienes', 'Venta: ' + b.nombre, bruto, id, false); if (gan > 0) e.imp.ingresos += gan;   // la plusvalía tributa en la declaración
    if (debe) { pagar(st)(debe); } e.bienes.splice(i, 1); return { ok: true, precio: neto0, bruto, ganancia: Math.round((bruto - b.compra.precio) * 10) / 10 };
  }
  function alquilar(st, id, on) { const b = est(st).bienes.find(x => x.id === id); if (!b) return { ok: false, motivo: 'No tienes eso.' }; if (!b.renta) return { ok: false, motivo: 'Eso no se alquila.' }; b.alquilado = on === undefined ? !b.alquilado : !!on; return { ok: true, alquilado: b.alquilado }; }
  function edificar(st, id) {
    const e = est(st), b = e.bienes.find(x => x.id === id); if (!b || b.tipo !== 'solar') return { ok: false, motivo: 'Solo se edifica un solar.' }; if (b.obra) return { ok: false, motivo: 'Ya hay una obra.' };
    const coste = Math.round(valorBien(st, b) * 0.7 * 10) / 10; if (dinero(st) < coste) return { ok: false, motivo: 'Te faltan ' + k1(coste - dinero(st)) + ' mil €.' }; pagar(st)(coste); reg(st, 'bienes', 'Obra en el solar de ' + b.barrio, -coste, id);
    b.obra = { fin: U.addDays(st.fecha, 90), coste }; b.compra.precio = valorBien(st, b) + coste; b.compra.fecha = st.fecha; return { ok: true, fin: b.obra.fin, coste };
  }
  function terminarObras(st) { est(st).bienes.forEach(b => { if (b.obra && b.obra.fin <= st.fecha) { b.tipo = 'local'; b.nombre = 'Local nuevo en ' + b.barrio; b.renta = Math.round(b.compra.precio * TIPOS.local.renta * 100) / 100 * 1.15; b.mejora = 1.15; b.obra = null; GM.noticia && GM.noticia(st, 'Terminan las obras: tu solar de ' + b.barrio + ' es ahora un local que puedes alquilar.'); } }); }
  // ---------- Préstamos ----------
  function nuevaDeuda(st, tipo, importe, meses, nombre, bien) {
    const e = est(st), r = P(st).tipo + (tipo === 'hipoteca' ? 0 : 0.025), m = r / 12, cuota = m ? importe * m / (1 - Math.pow(1 + m, -meses)) : importe / meses, d = { id: 'd' + (++e.seq), tipo, nombre, principal: importe, restante: importe, tasa: r, cuota: Math.round(cuota * 100) / 100, meses, ini: st.fecha, bien: bien || null }; e.deudas.push(d); return d;
  }
  function prestamo(st, importe, meses) {
    importe = Math.round(importe * 10) / 10; meses = clamp(Math.round(meses), 6, 240); if (importe < 1) return { ok: false, motivo: 'El importe mínimo es de mil euros.' }; const lim = limiteCredito(st) - deudaTotal(st); if (importe > lim) return { ok: false, motivo: 'El banco solo te presta ' + k1(Math.max(0, lim)) + ' mil € más.' };
    const d = nuevaDeuda(st, 'prestamo', importe, meses, 'Préstamo personal'); cobrar(st, importe); reg(st, 'prestamo', 'Préstamo de ' + k1(importe) + ' mil € a ' + meses + ' meses', importe, d.id); return { ok: true, deuda: d };
  }
  function amortizar(st, id, importe) {
    const e = est(st), d = e.deudas.find(x => x.id === id); if (!d) return { ok: false, motivo: 'Esa deuda no existe.' }; importe = Math.min(d.restante, importe === undefined ? d.restante : importe); if (dinero(st) < importe) return { ok: false, motivo: 'Te faltan ' + k1(importe - dinero(st)) + ' mil €.' };
    pagar(st)(importe); d.restante = Math.round((d.restante - importe) * 100) / 100; reg(st, 'prestamo', 'Amortizas ' + d.nombre.toLowerCase(), -importe, id); if (d.restante <= 0.01) { e.deudas = e.deudas.filter(x => x !== d); GM.noticia && GM.noticia(st, 'Has terminado de pagar: ' + d.nombre.toLowerCase() + '.'); } return { ok: true };
  }
  // ---------- Seguros ----------
  const SEGUROS = { hogar: { n: 'Seguro del hogar', d: 'Las reparaciones de tu casa cuestan un tercio.', cuota: 0.0004 }, coche: { n: 'Seguro del coche', d: 'Los daños del coche los paga la aseguradora.', cuota: 0.25 }, lesion: { n: 'Seguro de lesión', d: 'Cobras un fijo al mes mientras estás lesionado.', cuota: 0.35 } };
  function cuotaSeguro(st, k) { if (k !== 'hogar') return SEGUROS[k].cuota; const cs = GM.casasProd ? GM.casasProd.lista(st).filter(p => p.modo === 'compra' || p.modo === 'hipoteca') : []; return Math.max(0.15, Math.round(cs.reduce((s, p) => s + GM.casasProd.valor(st, p), 0) * SEGUROS.hogar.cuota * 100) / 100); }
  function contratarSeguro(st, k, on) { const e = est(st); if (!SEGUROS[k]) return { ok: false, motivo: 'Seguro desconocido.' }; e.seguros[k] = on === undefined ? !e.seguros[k] : !!on; return { ok: true, activo: e.seguros[k], cuota: cuotaSeguro(st, k) }; }
  const factorSeguro = (st, k) => (est(st).seguros[k] ? (k === 'hogar' ? 0.34 : 0.1) : 1);
  // ---------- Patrimonio neto ----------
  function neto(st) {
    const e = est(st), caja = dinero(st), casas = GM.casasProd ? GM.casasProd.lista(st).filter(p => p.modo === 'compra' || p.modo === 'hipoteca').reduce((s, p) => s + GM.casasProd.valor(st, p) - (GM.casasProd.ficha ? GM.casasProd.ficha(st, p).deuda : 0), 0) : 0;
    const bienes = e.bienes.reduce((s, b) => s + valorBien(st, b), 0), deudas = deudaTotal(st); return { caja: Math.round(caja * 10) / 10, casas: Math.round(casas * 10) / 10, bienes: Math.round(bienes * 10) / 10, deudas: Math.round(deudas * 10) / 10, total: Math.round((caja + casas + bienes - deudas) * 10) / 10 };
  }
  // ---------- Impuestos ----------
  function declaracion(st) {
    const e = est(st), pa = P(st), base = Math.max(0, Math.round(e.imp.ingresos * 10) / 10), cuota = Math.round(tramos(pa.imp, base) * 10) / 10; let pagado = 0;
    if (cuota > 0) { pagado = Math.min(cuota, Math.max(0, dinero(st))); if (pagado > 0) pagar(st)(pagado); reg(st, 'impuesto', 'Declaración de ' + e.imp.anio + ': base de ' + k1(base) + ' mil €', -pagado); }
    e.imp.pagado.unshift({ anio: e.imp.anio, base, cuota, pagado }); if (e.imp.pagado.length > 10) e.imp.pagado.length = 10; e.imp.anio = +st.fecha.slice(0, 4); e.imp.ingresos = 0;
    if (cuota > 0 && GM.noticia) GM.noticia(st, 'Declaración de la renta: ' + k1(pagado) + ' mil € de impuestos sobre ' + k1(base) + ' mil € de rentas y plusvalías' + (pagado < cuota ? ' (te falta dinero para pagarlo entero)' : '') + '.'); return { base, cuota, pagado };
  }
  // ---------- El tiempo ----------
  function dia(st) {
    const e = est(st), f = st.fecha, md = f.slice(5); terminarObras(st);
    if (md === P(st).dia) declaracion(st);
    if (f.slice(8) === '01') {
      conciliar(st);
      e.bienes.forEach(b => { if (b.renta && (b.tipo === 'local' || b.tipo === 'aparcamiento')) { const g = Math.round(valorBien(st, b) * 0.0007 * 100) / 100; if (g > 0.01 && dinero(st) >= g) { pagar(st)(g); reg(st, 'bienes', 'Comunidad y mantenimiento de ' + b.nombre.toLowerCase(), -g, b.id); } } if (b.alquilado && b.renta) { if (U.hash(b.id + f) % 100 < 90) { const r = Math.round(b.renta * (b.mejora || 1) * 100) / 100; cobrar(st, r); reg(st, 'alquiler', 'Alquiler de ' + b.nombre.toLowerCase(), r, b.id, true); } } if (b.tipo === 'coche' && b.clasico === false) b.estado = Math.max(20, b.estado - 1); });
      e.deudas.slice().forEach(d => { const m = d.tasa / 12, interes = d.restante * m, amort = Math.min(d.restante, d.cuota - interes), pago = Math.min(d.restante + interes, d.cuota);
        if (dinero(st) >= pago) { pagar(st)(pago); d.restante = Math.round((d.restante - amort) * 100) / 100; reg(st, 'prestamo', 'Cuota de ' + d.nombre.toLowerCase(), -pago, d.id); d.imp = (d.imp || 0) + 1; if (d.restante <= 0.01) { e.deudas = e.deudas.filter(x => x !== d); GM.noticia && GM.noticia(st, 'Terminas de pagar: ' + d.nombre.toLowerCase() + '.'); } }
        else { d.impagos = (d.impagos || 0) + 1; d.restante = Math.round((d.restante + interes) * 100) / 100; if (GM.noticia) GM.noticia(st, 'No has podido pagar la cuota de ' + d.nombre.toLowerCase() + ': se suma a la deuda con recargo.'); if (modoCar(st)) st.carrera.moral = clamp(st.carrera.moral - 2, 0, 100); } });
      if (modoCar(st) && st.carrera.fase !== 'ncaa' && !(st.carrera.fase === 'pro' && st.carrera.etapa === 'cantera')) { const nv = H().nivel ? H().nivel(st) : 1, g = Math.round(GASTOS_VIDA[clamp(nv, 0, 5)] * 0.55 * (GM.economia ? GM.economia.indiceVida(st) : 1) * 100) / 100; if (g > 0) { pagar(st)(g); reg(st, 'vida', 'Gastos de vida en ' + st.equipos[st.clubId].ciudad, -g); } }
      Object.keys(SEGUROS).forEach(k => { if (!e.seguros[k]) return; if (k === 'coche' && !(st.carrera && st.carrera.vivienda && st.carrera.vivienda.coche) && !e.bienes.some(b => b.tipo === 'coche')) return; const c = cuotaSeguro(st, k); if (dinero(st) >= c) { pagar(st)(c); reg(st, 'seguro', SEGUROS[k].n, -c); } else { e.seguros[k] = false; GM.noticia && GM.noticia(st, 'Se cancela ' + SEGUROS[k].n.toLowerCase() + ' por falta de pago.'); } });
      if (e.seguros.lesion && modoCar(st) && st.jugadores.yo && st.jugadores.yo.estado && st.jugadores.yo.estado.lesion) { cobrar(st, 1.5); reg(st, 'seguro', 'Cobro del seguro de lesión', 1.5, null, false); }
      if (md === '10-01' || (+f.slice(5, 7) === 10 && f.slice(8) === '01')) { /* el impuesto sobre los bienes va en otoño, más abajo */ }
      const m = +f.slice(5, 7); if (m === 10) { const base = e.bienes.reduce((s, b) => s + valorBien(st, b), 0) + (GM.casasProd ? GM.casasProd.lista(st).filter(p => p.modo === 'compra' || p.modo === 'hipoteca').reduce((s, p) => s + GM.casasProd.valor(st, p), 0) : 0), t = Math.round(base * P(st).ibi * 10) / 10; if (t > 0.1) { pagar(st)(t); reg(st, 'impuesto', 'Impuesto sobre los bienes (' + (P(st).ibi * 100).toFixed(2).replace('.', ',') + ' %)', -t); } }
      e.serie.push({ f, caja: Math.round(dinero(st) * 10) / 10, neto: neto(st).total }); if (e.serie.length > 180) e.serie.shift();
      if (e.ofertas.mes !== f.slice(0, 7)) mercado(st);
    }
  }
  GM.bus.on('dia:avanzado', () => { const st = GM.state; if (st && st.equipos && st.equipos[st.clubId]) { try { dia(st); } catch (er) { console.error('patrimonio', er); } } });
  GM.bus.on('partida:cargada', () => { const st = GM.state; if (st && st.patrimonio) st.patrimonio.ultCaja = dinero(st), st.patrimonio.reg0 = 0; });
  function selfTest() {
    const st = { modo: 'gestor', fecha: '2026-10-01', clubId: 'a', equipos: { a: { id: 'a', ciudad: 'X', pais: 'ES', reputacion: 80, plantilla: [] } }, jugadores: {}, historial: [], hogar: { ahorros: 600, muebles: {} } };
    GM.mods.mercado = GM.mods.mercado || { ligaDe: () => 'ACB' }; const of = mercado(st); if (of.length !== 9 || !of.every(o => o.precio > 0)) return false;
    const sol = of.find(o => o.tipo === 'solar'), r = comprar(st, sol.id, 'contado'); if (!r.ok || dinero(st) >= 600) return false; const b = r.bien; st.fecha = '2030-10-01'; const v = valorBien(st, b); if (!(v > 0 && v !== sol.precio)) return false;
    const p = prestamo(st, 50, 60); if (!p.ok || deudaTotal(st) <= 0) return false; if (tramos(PAISES.ES.imp, 60) < 9 || tramos(PAISES.ES.imp, 0) !== 0) return false; return !!neto(st).total && vender(st, b.id).ok && Math.abs(factorNeto(st) - 0.62) < 1e-9;
  }
  GM.patrimonio = { PAISES, TIPOS, SEGUROS, CATS, reg, conciliar, neto, mercado, comprar, vender, alquilar, edificar, prestamo, amortizar, contratarSeguro, cuotaSeguro, factorSeguro, declaracion, valorBien, factorNeto, est, libro: st => est(st).libro, serie: st => est(st).serie, limiteCredito, deudaTotal, tramos, dia, selfTest };
  GM.register && GM.register('patrimonio', GM.patrimonio);
})();
