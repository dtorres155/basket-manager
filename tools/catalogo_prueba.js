// Catálogo de personas (punto 25): en una plaza de 40 personas no hay dos iguales; reparto de edades, estaciones y complementos. Uso: node tools/catalogo_prueba.js
const fs = require('fs'),
  vm = require('vm');
global.GM = {};
vm.runInThisContext(fs.readFileSync(__dirname + '/../catalogo_personas.js', 'utf8'));
let a = 12345;
const r = () => {
  a = (a * 1664525 + 1013904223) >>> 0;
  return a / 4294967296;
};
let dup = 0,
  total = 0;
const cuenta = {},
  inc = k => {
    cuenta[k] = (cuenta[k] || 0) + 1;
  };
for (let plaza = 0; plaza < 200; plaza++) {
  const l = GM.catalogo.lote(r, 40, { pais: ['ES', 'DE', 'GR', 'TR', 'US'][plaza % 5], mes: 1 + (plaza % 12) });
  const f = new Set(l.map(GM.catalogo.firma));
  dup += 40 - f.size;
  total += 40;
  l.forEach(o => {
    inc(o.edad);
    inc(o.estacion);
    ['gafas', 'barba', 'gorra', 'gorro', 'bufanda', 'mochila', 'bolso', 'tatuaje'].forEach(k => {
      if (o[k]) inc(k);
    });
    if (o.altura < 100 || o.altura > 200) throw new Error('altura rara ' + o.altura);
  });
}
console.log('iguales en una plaza de 40:', dup, 'de', total);
console.log(JSON.stringify(cuenta));
if (dup > 0 || !cuenta.nino || !cuenta.mayor || !cuenta.bufanda || !cuenta.gorra) {
  console.log('FALLA');
  process.exit(1);
}
console.log('OK');
