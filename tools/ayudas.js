// Ayudas comunes de las pruebas con navegador: esperar a que algo pase en vez de dormir un tiempo fijo (ahorra la mayor parte de cada prueba).
// Uso: const { sleep, esperar, esperarEscena, irA } = require('./ayudas');
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Repite la comprobación (función de la página) hasta que sea verdadera; devuelve true, o false si se acaba el tiempo
async function esperar(p, cond, arg, max) { const fin = Date.now() + (max || 60000); while (Date.now() < fin) { if (await p.evaluate(cond, arg).catch(() => false)) return true; await sleep(150); } return false; }
// Espera a que el mundo 3D esté construido: hay escena, personaje, no hay pantalla de carga ni cambio en curso (y, si se indica, es esa escena)
function esperarEscena(p, escena, max) {
  return esperar(p, base => { const S = GM.sede.activa() && GM.sede._estado(); return !!(S && S.yo && !S.cambiando && !document.querySelector('.sede-cargando') && (!base || S.escena === base)); }, escena ? String(escena).split(':')[0] : null, max || 90000).then(async ok => { await sleep(350); return ok; });
}
// Cambia de escena (por ejemplo 'calle', 'casa:vtest', 'interior:pabellon') y espera a que cargue
async function irA(p, dest, max) { await p.evaluate(d => GM.sede._escena(d), dest); await sleep(250); return esperarEscena(p, dest, max); }
module.exports = { sleep, esperar, esperarEscena, irA };
