// Servidor local mínimo para abrir index.html en el navegador o en el móvil (misma red): npm run build && npm run serve
const http = require('http'), fs = require('fs'), port = process.env.PORT || 8080;
http.createServer((q, r) => { fs.readFile(__dirname + '/index.html', (e, d) => { if (e) { r.writeHead(500); return r.end('Ejecuta primero: npm run build'); } r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(d); }); })
  .listen(port, '0.0.0.0', () => console.log('Basket Manager en http://localhost:' + port));
