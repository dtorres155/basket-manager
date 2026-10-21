// Ayudas comunes de las pruebas con navegador: esperar a que algo pase en vez de dormir un tiempo fijo (ahorra la mayor parte de cada prueba).
// Uso: const { sleep, esperar, esperarEscena, irA } = require('./ayudas');
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Repite la comprobación (función de la página) hasta que sea verdadera; devuelve true, o false si se acaba el tiempo
async function esperar(p, cond, arg, max) {
  const fin = Date.now() + (max || 60000);
  while (Date.now() < fin) {
    if (await p.evaluate(cond, arg).catch(() => false)) return true;
    await sleep(150);
  }
  return false;
}
// Espera a que el mundo 3D esté construido: hay escena, personaje, no hay pantalla de carga ni cambio en curso (y, si se indica, es esa escena).
// Si pasados 6 s no hay ninguna escena abierta (la herramienta no usa el mundo 3D), devuelve false sin esperar más.
async function esperarEscena(p, escena, max) {
  const base = escena ? String(escena).split(':')[0] : null,
    fin = Date.now() + (max || 90000),
    t0 = Date.now();
  while (Date.now() < fin) {
    const e = await p
      .evaluate(b => {
        const S = GM.sede && GM.sede.activa() && GM.sede._estado();
        if (!S) return 'nada';
        return S.yo && !S.cambiando && !document.querySelector('.sede-cargando') && (!b || S.escena === b) ? 'listo' : 'cargando';
      }, base)
      .catch(() => 'nada');
    if (e === 'listo') {
      await sleep(350);
      return true;
    }
    if (e === 'nada' && Date.now() - t0 > 6000) return false;
    await sleep(150);
  }
  return false;
}
// Cambia de escena (por ejemplo 'calle', 'casa:vtest', 'interior:pabellon') y espera a que cargue
async function irA(p, dest, max) {
  await p.evaluate(d => GM.sede._escena(d), dest);
  await sleep(250);
  return esperarEscena(p, dest, max);
}
module.exports = { sleep, esperar, esperarEscena, irA };
