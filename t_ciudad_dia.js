// Calendario de la ciudad (punto 42): festivos por país, Pascua, fiestas patronales (viernes a domingo) y maratón en domingo.
global.window = global; require('./load.js')(['core', 'datos_util', 'ciudad_dia']); const mod = global.GM.ciudadDia, assert = require('assert');
const st = f => ({ fecha: f, clubId: 'x', equipos: { x: { id: 'x', pais: 'ES', ciudad: 'Villa' } } });
assert(mod.festivo(st('2026-12-25')) && mod.festivo(st('2026-10-12')).nombre === 'Fiesta Nacional' && !mod.festivo(st('2026-10-13')), 'festivos ES');
assert(mod.pascua(2026) === '2026-04-05' && mod.festivo(st('2026-04-03')).nombre === 'Viernes Santo', 'Semana Santa');
assert(mod.festivo(Object.assign(st('2026-04-06'), { equipos: { x: { id: 'x', pais: 'DE', ciudad: 'V' } } })).nombre === 'Lunes de Pascua', 'DE');
let dias = 0, ult = 0, wk = new Set(); for (let d = 0; d < 365; d++) { const f = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10), p = mod.patronal(st(f)); if (p) { dias++; wk.add(new Date(f + 'T12:00:00Z').getUTCDay()); if (p.ultimo) ult++; } }
assert(dias === 3 && ult === 1 && [...wk].sort().join() === '0,5,6', 'patronal de tres días, viernes a domingo: ' + dias + ' ' + [...wk]);
let mar = 0; for (let d = 0; d < 365; d++) { const f = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10); if (mod.maraton(st(f))) { mar++; assert(new Date(f + 'T12:00:00Z').getUTCDay() === 0, 'maratón en domingo'); } }
assert(mar === 1, 'un maratón al año'); console.log('OK t_ciudad_dia');
