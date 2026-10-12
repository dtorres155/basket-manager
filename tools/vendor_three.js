// Genera vendor/three.min.js (Three.js + complementos, global THREE) con esbuild. Uso: npm run vendor:three
const esbuild = require('esbuild'), path = require('path'), fs = require('fs');
const raiz = path.join(__dirname, '..');
esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'three_entry.js')], bundle: true, minify: true, format: 'iife', target: ['es2020'], define: { 'import.meta.url': '"http://localhost/three/"' },   // KTX2Loader construye URL con import.meta.url al cargarse; no se usa (el transcodificador va por setTranscoderPath)
  
  outfile: path.join(raiz, 'vendor', 'three.min.js'), legalComments: 'none',
  banner: { js: '/* Three.js ' + JSON.parse(fs.readFileSync(path.join(raiz, 'node_modules', 'three', 'package.json'), 'utf8')).version + ' (MIT, Three.js Authors) + complementos: GLTFLoader, BufferGeometryUtils, RoundedBoxGeometry, Sky, SkeletonUtils, EffectComposer, RenderPass, OutputPass, UnrealBloomPass, GTAOPass, RoomEnvironment */' }
});
fs.copyFileSync(path.join(raiz, 'node_modules', 'three', 'LICENSE'), path.join(raiz, 'vendor', 'three.LICENSE'));
console.log('vendor/three.min.js', (fs.statSync(path.join(raiz, 'vendor', 'three.min.js')).size / 1024).toFixed(0), 'KB');
