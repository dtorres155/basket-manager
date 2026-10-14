// Editor de la casa (punto 50): diseños que se guardan y se leen como texto, plazos de entrega por precio y migración de partidas antiguas.
global.window = global; global.THREE = require('./tools/three_node'); require('./load.js')(['core', 'datos_util', 'casa3d', 'casa_editor']); const CE = global.GM.casaEditor, assert = require('assert');
assert(CE.selfTest(), 'casaEditor.selfTest');
const o = { v: 1, n: 'Prueba', m: [['bedDouble', 1, 2, 90], ['loungeSofa', 3, 4, 0]], mu: [{ a: [0, 0], b: [3, 0], t: 'muro' }], p: 2, s: 1, l: 0, sh: { salon: 3 } };
global.LZString = undefined; const c = CE.codigo(o); assert(/^CASA[01]:/.test(c), 'código'); const b = CE.leerCodigo(c); assert(b && b.m.length === 2 && b.mu.length === 1 && b.sh.salon === 3, 'ida y vuelta del diseño');
assert(CE.leerCodigo('CASA1:no-es-un-codigo') === null && CE.leerCodigo(null) === null, 'código roto');
assert(CE.entrega({ fecha: '2026-10-01' }, { precio: 0.05 }) === undefined && CE.entrega({ fecha: '2026-10-01' }, { precio: 1.5 }) === '2026-10-04', 'plazos');
assert(CE.pendiente({ fecha: '2026-10-02' }, { llega: '2026-10-04' }) && !CE.pendiente({ fecha: '2026-10-04' }, { llega: '2026-10-04' }), 'pendiente');
console.log('OK t_casa_editor');
