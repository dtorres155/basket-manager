// Servidor local mínimo para probar dist/ en el navegador o en el móvil (misma red): npm run build && npm run serve
// Ojo: por HTTP en la red doméstica el móvil NO puede instalar la PWA (hace falta HTTPS); solo sirve para probar.
const http = require('http'), fs = require('fs'), path = require('path'), port = process.env.PORT || 8080;
const DIST = path.join(__dirname, 'dist');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIST, path.normalize(p).replace(/^([/\\])+/, ''));
  if (!f.startsWith(DIST)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { r.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return r.end(fs.existsSync(DIST) ? 'No encontrado' : 'Ejecuta primero: npm run build'); }
    r.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); r.end(d);
  });
}).listen(port, '0.0.0.0', () => console.log('Basket Manager en http://localhost:' + port));
