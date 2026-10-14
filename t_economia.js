// Economía basada en datos (punto 57): Boston es más cara que Lleida y se nota en el coste de vida, el alquiler, los sueldos que piden, el precio de la vivienda y los ingresos del club; el ciclo económico cambia por año.
global.window = global; global.THREE = require('./tools/three_node'); require('./load.js')(['core', 'datos_util', 'economia']); const GM = global.GM, E = GM.economia, assert = require('assert');
assert(E.selfTest(), 'economia.selfTest');
const mk = (ciudad, pais, temp) => ({ temporada: temp || '2026-27', seed: 'semilla', clubId: 'c', equipos: { c: { id: 'c', ciudad, pais }, l: { id: 'l', ciudad: 'Lleida', pais: 'ES' }, b: { id: 'b', ciudad: 'Boston', pais: 'US' } } });
const st = mk('Boston', 'US'), c = E.comparar(st, 'b', 'l'); assert(c.vida >= 40 && c.alquiler >= 150 && c.salario >= 150, 'Boston frente a Lleida: ' + JSON.stringify([c.vida, c.alquiler, c.salario]));
assert(E.indiceSuelo(st, 'b') > 2 * E.indiceSuelo(st, 'l'), 'el suelo de Boston cuesta más del doble'); assert(E.factorSalario(st, 'b') > E.factorSalario(st, 'l'), 'los sueldos'); assert(E.factorClub(st, 'b').patrocinio > E.factorClub(st, 'l').patrocinio, 'el club de Boston ingresa más');
// 120 ciudades con ficha y ranking ordenado
const ciudades = Object.keys(E.CIUDAD); assert(ciudades.length >= 100, 'ciudades con dato: ' + ciudades.length); const rk = E.ranking(Object.assign(st, { equipos: Object.fromEntries(ciudades.map((n, i) => ['k' + i, { id: 'k' + i, ciudad: n, pais: i < 17 ? 'ES' : 'US' }])) })); assert(rk.length === ciudades.length && rk[0].vida >= rk[rk.length - 1].vida, 'ranking');
// ciclo e inflación: 2026-27 normal, después hay años buenos y malos, y la inflación acumulada sube con los años
const s0 = mk('Madrid', 'ES'); assert(E.ciclo(s0).id === 'normal', 'el primer año es normal'); const tipos = new Set(); for (let y = 2027; y < 2060; y++) tipos.add(E.ciclo(s0, y).id); assert(tipos.size >= 4, 'ciclos distintos: ' + [...tipos].join());
const a5 = E.inflacion(s0, 'c', 5), a10 = E.inflacion(s0, 'c', 10); assert(a10 > a5 && a5 > 1.05, 'inflación acumulada ' + a5 + ' ' + a10); const tr = mk('Estambul', 'TR'); assert(E.inflacion(tr, 'c', 10) > 2 * a10, 'Turquía tiene inflación alta');
console.log('OK t_economia (Boston/Lleida: vida +' + c.vida + ' %, alquiler +' + c.alquiler + ' %)');
