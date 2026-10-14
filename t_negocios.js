// Negocios propios (punto 55): un bar se abre, se equilibra y se cierra; el precio, la plantilla, el marketing y el barrio mueven la demanda y el beneficio.
global.window = global; global.THREE = require('./tools/three_node'); require('./load.js')(['core', 'datos_util', 'economia', 'hogar', 'casas_producto', 'patrimonio', 'negocios']); const GM = global.GM, N = GM.negocios, assert = require('assert');
assert(N.selfTest(), 'negocios.selfTest');
const mk = () => ({ modo: 'gestor', fecha: '2026-10-01', clubId: 'a', equipos: { a: { id: 'a', ciudad: 'Badalona', pais: 'ES', reputacion: 80, plantilla: [] } }, jugadores: {}, historial: [], noticias: [], hogar: { ahorros: 700, muebles: {} } });
GM.noticia = (st, t) => st.noticias.push(t); GM.mods.mercado = GM.mods.mercado || { ligaDe: () => 'ACB' }; GM.bus = GM.bus || { on() { }, emit() { } };
const corre = (st, dias) => { for (let i = 0; i < dias; i++) { st.fecha = GM.util.addDays(st.fecha, 1); N.dia(st); if (st.patrimonio) GM.patrimonio.dia(st); } };
// 1) abrir: cuesta dinero y no abre hasta que acaba la obra
let st = mk(); GM.state = st; const d0 = GM.mods.hogar.dinero(st), r = N.abrir(st, 'bar', 'Centro'); assert(r.ok && GM.mods.hogar.dinero(st) < d0 - 40, 'abrir cuesta'); assert(!r.negocio.abierto, 'en obras'); corre(st, 40); assert(r.negocio.abierto, 'abre tras la obra');
// 2) un mes entero: hay clientes, ingresos y se liquida el resultado
corre(st, 62); const n = r.negocio; assert(n.hist.length >= 1 && n.hist[0].clientes > 500, 'clientes del mes: ' + JSON.stringify(n.hist[0])); assert(st.patrimonio.libro.some(l => l.c === 'negocio' && /Resultado/.test(l.t)), 'el libro anota el resultado');
// 3) el precio mueve la demanda: caro vende menos clientes, barato más
const demo = (precio, emp) => { const s2 = mk(); GM.state = s2; const o = N.abrir(s2, 'bar', 'Centro').negocio; o.abierto = s2.fecha; o.precio = precio; while (o.empleados.length > emp) o.empleados.pop(); while (o.empleados.length < emp) N.contratar(s2, o.id); let cli = 0; for (let i = 0; i < 28; i++) { s2.fecha = GM.util.addDays(s2.fecha, 1); N.simulaDia(s2, o); cli += o.hoy.clientes; } return { cli, rep: o.reputacion, perd: o.hoy.perdidos }; };
const caro = demo(1.6, 6), normal = demo(1, 6), barato = demo(0.75, 6); assert(barato.cli > normal.cli && normal.cli > caro.cli, 'precio y clientes: ' + [caro.cli, normal.cli, barato.cli]);
// 4) plantilla corta: se pierden clientes y baja la reputación
const corto = demo(1, 1), largo = demo(1, 6); assert(corto.perd > largo.perd && corto.cli < largo.cli, 'plantilla: ' + JSON.stringify([corto, largo])); assert(corto.rep < largo.rep, 'la reputación sufre con colas');
// 5) marketing: más demanda
const mkt = (m) => { const s2 = mk(); GM.state = s2; const o = N.abrir(s2, 'tienda', 'Ensanche').negocio; o.abierto = s2.fecha; o.marketing = m; return Math.round(N.atractivo(s2, o) * 100); }; assert(mkt(3) > mkt(0), 'marketing atrae');
// 6) el barrio importa: el tráfico por barrio y tipo es distinto
assert(new Set(['Centro', 'Ensanche', 'Puerto', 'Colinas', 'Periferia'].map(b => N.trafico(st, 'bar', b))).size >= 4, 'tráfico por barrio');
// 7) cerrar y traspasar
GM.state = st; const cierre = N.cerrar(st, n.id); assert(cierre.ok && cierre.recuperas > 10, 'cerrar'); const s3 = mk(); GM.state = s3; const o3 = N.abrir(s3, 'gimnasio', 'Colinas').negocio; corre(s3, 130); const tr = N.traspasar(s3, o3.id); assert(tr.ok && tr.precio > 0, 'traspasar: ' + JSON.stringify(tr));
console.log('OK t_negocios (bar: ' + normal.cli + ' clientes al mes, caro ' + caro.cli + ', barato ' + barato.cli + ')');
