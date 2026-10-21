// Patrimonio (punto 54): mercado de bienes, compra con hipoteca, alquiler, préstamos con cuota, seguros, impuestos por país y patrimonio neto que se mueve con el mercado y con tus decisiones.
global.window = global;
global.THREE = require('./tools/three_node');
require('./load.js')(['core', 'datos_util', 'hogar', 'casas_producto', 'patrimonio']);
const GM = global.GM,
  PT = GM.patrimonio,
  assert = require('assert');
assert(PT.selfTest(), 'patrimonio.selfTest');
const mk = pais => ({
  modo: 'gestor',
  fecha: '2026-10-01',
  clubId: 'a',
  equipos: { a: { id: 'a', ciudad: 'Badalona', pais, reputacion: 80, plantilla: [] } },
  jugadores: {},
  historial: [],
  noticias: [],
  hogar: { ahorros: 900, muebles: {}, propiedades: [] }
});
GM.noticia = (st, t) => st.noticias.push(t);
GM.mods.mercado = GM.mods.mercado || { ligaDe: () => 'ACB' };
const avanza = (st, dias) => {
  for (let i = 0; i < dias; i++) {
    st.fecha = GM.util.addDays(st.fecha, 1);
    GM.bus.emit('dia:avanzado', {});
  }
};
const st = mk('ES');
GM.state = st;
const D = () => GM.mods.hogar.dinero(st);
// mercado del mes: nueve ofertas, estables dentro del mes
const of1 = PT.mercado(st)
    .map(o => o.id)
    .join(),
  of2 = PT.mercado(st)
    .map(o => o.id)
    .join();
assert(of1 === of2 && PT.mercado(st).length === 9, 'ofertas');
// comprar un local con hipoteca (20 % de entrada) y alquilarlo
const loc = PT.mercado(st).find(o => o.tipo === 'local'),
  n0 = PT.neto(st).total,
  r = PT.comprar(st, loc.id, 'hipoteca');
assert(r.ok, 'hipoteca: ' + JSON.stringify(r));
assert(Math.abs(D() - (900 - loc.precio * 0.2)) < 0.2, 'entrada');
assert(PT.est(st).deudas.length === 1, 'deuda');
assert(PT.alquilar(st, r.bien.id, true).alquilado, 'alquilado');
const caja1 = D();
avanza(st, 70);
assert(PT.est(st).libro.some(l => l.c === 'alquiler') && PT.est(st).libro.some(l => l.c === 'prestamo'), 'alquiler y cuotas en el libro');
assert(PT.est(st).deudas[0].restante < loc.precio * 0.8, 'la deuda baja con las cuotas');
// préstamo personal: límite y cuota
const pre = PT.prestamo(st, 20, 24);
assert(pre.ok && pre.deuda.cuota > 0.8, 'préstamo');
assert(!PT.prestamo(st, 99999, 24).ok, 'límite del banco');
const cuota = pre.deuda.cuota;
avanza(st, 35);
assert(PT.est(st).deudas.find(d => d.id === pre.deuda.id).restante < 20, 'amortiza');
assert(PT.amortizar(st, pre.deuda.id).ok && !PT.est(st).deudas.some(d => d.id === pre.deuda.id), 'amortizar del todo');
// seguros: el de lesión paga y el del hogar abarata
assert(PT.contratarSeguro(st, 'hogar', true).activo && PT.factorSeguro(st, 'hogar') < 0.5, 'seguro hogar');
// el mercado mueve el valor
const b = PT.est(st).bienes[0];
const v0 = PT.valorBien(st, b);
st.fecha = '2031-10-01';
assert(PT.valorBien(st, b) !== v0, 'el valor cambia con los años');
st.fecha = '2026-12-05';
// impuestos: cada país tiene su tabla; Turquía y EE UU no pagan lo mismo que España por la misma base
const base = 80,
  pa = ['ES', 'US', 'DE', 'FR', 'IT', 'GR', 'TR'].map(p => [p, Math.round(PT.tramos(PT.PAISES[p].imp, base) * 10) / 10]);
assert(new Set(pa.map(x => x[1])).size >= 5, 'tablas distintas ' + JSON.stringify(pa));
const st2 = mk('US');
GM.state = st2;
assert(PT.factorNeto(st2) > PT.PAISES.DE.neto, 'nómina neta por país');
PT.est(st2).imp.ingresos = 60;
const dec = PT.declaracion(st2);
assert(dec.cuota > 7 && dec.pagado === dec.cuota, 'declaración EE UU: ' + JSON.stringify(dec));
// un año entero: patrimonio neto en la serie y libro con varias categorías
GM.state = st;
avanza(st, 380);
assert(PT.serie(st).length >= 12, 'serie mensual');
const cats = new Set(PT.libro(st).map(l => l.c));
assert(cats.size >= 4, 'categorías del libro: ' + [...cats].join());
assert(PT.vender(st, PT.est(st).bienes[0].id).ok, 'vender');
assert(PT.est(st).deudas.length === 0, 'la venta cancela la hipoteca');
console.log('OK t_patrimonio (neto ' + PT.neto(st).total + ', ' + PT.libro(st).length + ' movimientos)');
