// Movilidad (puntos 38 a 41): densidad por horas, estado y selfTest. Las escenas 3D se prueban con tools/movilidad_prueba.js
global.window = global; const GM = require('./load.js')(['core', 'datos_util', 'movilidad']); const M = GM.movilidad || (GM.mods && GM.mods.movilidad);
const assert = require('assert'); const mv = global.GM.movilidad; assert(mv, 'sin módulo');
assert(mv.densidad(8, 2) === 1 && mv.densidad(3, 2) < 0.3 && mv.densidad(11, 2) < 1 && mv.densidad(8, 0) < 1, 'densidad por horas');
assert(mv.factorVel(8, 2) < 1 && mv.factorVel(11, 2) === 1, 'hora punta más lenta');
assert(mv.MODELOS.length === 4 && mv.MODELOS.every(m => m.precio > 0), 'modelos');
const st = { modo: 'carrera', carrera: { dinero: 20 }, clubId: 'x', fecha: '2026-10-14', equipos: { x: {} } }; const m = mv.mem(st); assert(m.tarjeta === 0 && Array.isArray(m.multas));
const S = { st, hora: 12 }; const ac = mv.accionesConcesionario(S, st); assert(ac.find(a => a.id === 'c_moto').disponible && !ac.find(a => a.id === 'c_turismo').disponible, 'precios: con 20.000 € alcanza la moto y no la berlina');
const r = ac.find(a => a.id === 'c_moto').fn(); assert(r.ok && Math.abs(st.carrera.dinero - 16.2) < 1e-9 && m.coche.modelo === 'moto', 'compra');
console.log('OK t_movilidad');
