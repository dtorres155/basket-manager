// Interacción con los muebles (punto 51): cada mueble grande del catálogo de la casa ofrece al menos una acción, y las acciones tienen duración y efectos válidos.
global.window = global;
global.THREE = require('./tools/three_node');
require('./load.js')(['core', 'datos_util', 'interaccion', 'hogar']);
const I = global.GM.interaccion,
  assert = require('assert');
assert(I.selfTest(), 'definiciones de interacción');
const src = require('fs').readFileSync(__dirname + '/casa3d.js', 'utf8'),
  nombres = [...src.matchAll(/\['([A-Za-z0-9]+)', '[^']+', [0-9.]+, [0-9]+, '[^']+'/g)].map(m => m[1]).filter(n => !/^_/.test(n));
const sin = nombres.filter(n => !I.defDe(n) && !/^(rug|pillow|plantSmall|trashcan|bear|coatRack)/.test(n));
assert(!sin.length, 'muebles sin acción: ' + sin.join(', ') + ' (de ' + nombres.length + ')');
const st = {
  modo: 'gestor',
  fecha: '2026-10-01',
  clubId: 'a',
  equipos: { a: { id: 'a', ciudad: 'X', reputacion: 80, plantilla: ['p1'] } },
  jugadores: { p1: { id: 'p1', edad: 20, xp: 0, estado: { moral: 50, fatiga: 50 } } },
  historial: [],
  ligas: { ACB: { equipos: ['a'] } }
};
global.GM.mods.mercado = global.GM.mods.mercado || { ligaDe: () => 'ACB' };
const r = global.GM.mods.hogar.aplicar(st, { moral: 2, fat: -10, xp: 0.05 }, 0.01);
assert(r.ok && st.jugadores.p1.estado.moral > 50 && st.jugadores.p1.estado.fatiga < 50, 'efectos');
assert(!global.GM.mods.hogar.puede(st, 99999).ok, 'sin dinero no se puede');
console.log('OK t_interaccion (' + nombres.length + ' muebles con acción)');
