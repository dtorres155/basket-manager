// Sol real: posición por latitud y fecha.
const L = require('./load');
L(['core', 'sol']);
const e = GM.mods.sol.selfTest();
const s = GM.mods.sol.salidaPuesta(41.4, '2026-06-21');
console.log(e.length ? 'FALLA sol ' + e.join('; ') : 'ok    sol (verano ' + s.sale.toFixed(1) + ' a ' + s.pone.toFixed(1) + ')');
if (e.length) process.exit(1);
