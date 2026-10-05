// Three.js para las pruebas en Node: el mismo paquete que usa el juego (tools/three_entry.js), compilado al vuelo.
// Uso en las pruebas: global.THREE = require('./tools/three_node');
const esbuild = require('esbuild'), path = require('path');
if (!globalThis.__THREE_JUEGO) {
  const r = esbuild.buildSync({ entryPoints: [path.join(__dirname, 'three_entry.js')], bundle: true, format: 'iife', write: false, platform: 'neutral', mainFields: ['module', 'main'] });
  const previo = globalThis.THREE;
  new Function(r.outputFiles[0].text)();
  globalThis.__THREE_JUEGO = globalThis.THREE; globalThis.THREE = previo;
}
module.exports = globalThis.__THREE_JUEGO;
