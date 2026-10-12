// Herramienta de una sola vez: saca funciones de primer nivel de sede3d.js a módulos con fábrica GM.sedeX(ctx).
// Uso: node tools/_sede_dividir.js deps <funcion>
//      node tools/_sede_dividir.js sacar <archivo.js> <GM.nombre> "<descripción>" <funcion1,funcion2,...> [dep1,dep2,... | auto]
const fs = require('fs');
const L0 = fs.readFileSync('sede3d.js', 'utf8').split('\n');
const nombresTop = L => { const t = new Set(); L.forEach(l => { let m = l.match(/^  (?:async )?function ([A-Za-z_0-9]+)/) || l.match(/^  (?:const|let) ([A-Za-z_0-9]+)/); if (m) t.add(m[1]); m = l.match(/^  (?:const|let) \{([^}]*)\} =/); if (m) m[1].split(',').forEach(x => t.add(x.trim())); }); return t; };
const rango = (L, nombre) => { const a = L.findIndex(l => l.startsWith('  function ' + nombre + '(') || l.startsWith('  async function ' + nombre + '(')); if (a < 0) throw new Error('no existe ' + nombre); let b = a; if (!/}\s*$/.test(L[a]) || /^  (async )?function .*\{\s*$/.test(L[a])) { b = a + 1; while (!/^  }$/.test(L[b])) b++; } let c = a; while (L[c - 1] && /^  \/\//.test(L[c - 1])) c--; return [c, a, b]; };
const usa = (cuerpo, n) => new RegExp('(^|[^A-Za-z_0-9.\'"-])' + n + '([^A-Za-z_0-9\'"-]|$)').test(cuerpo);
const [orden, ...args] = process.argv.slice(2);
if (orden === 'deps') { const [c, a, b] = rango(L0, args[0]); const cuerpo = L0.slice(a, b + 1).join('\n'); console.log(args[0], 'líneas', b - a + 1, '->', [...nombresTop(L0)].filter(n => n !== args[0] && usa(cuerpo, n)).join(',')); }
else if (orden === 'sacar') {
  const [archivo, gm, desc, funcs, depsArg = 'auto'] = args, fl = funcs.split(','); let L = L0.slice();
  const tops = nombresTop(L0), bloques = fl.map(f => { const [c, a, b] = rango(L0, f); return { f, c, a, b, txt: L0.slice(a, b + 1) }; });
  const todo = bloques.map(x => x.txt.join('\n')).join('\n');
  const deps = (depsArg === 'auto' ? [...tops].filter(n => !fl.includes(n) && usa(todo, n) && n !== 'S') : depsArg.split(',').filter(Boolean)), conS = usa(todo, 'S');
  const cuerpo = bloques.map(x => x.txt.map(l => l ? '  ' + l : l).join('\n')).join('\n');
  const out = `/* ${desc}\n   Se separó de sede3d.js: ${gm}({ ${[conS ? 'S: () => escena activa' : '', ...deps].filter(Boolean).join(', ')} }) devuelve { ${fl.join(', ')} }. */\n(function () {\n  ${gm} = function (ctx) {\n    const { ${[...deps].join(', ')} } = ctx;${conS ? '\n    const S = new Proxy({}, { get: (_, k) => ctx.S()[k], set: (_, k, v) => { ctx.S()[k] = v; return true; } });   // la escena activa cambia al abrir otra: se lee en cada acceso' : ''}\n${cuerpo}\n    return { ${fl.join(', ')} };\n  };\n})();\n`;
  fs.writeFileSync(archivo, out);
  // se quitan los bloques (de abajo arriba)
  bloques.sort((p, q) => q.c - p.c).forEach(x => { L.splice(x.c, x.b - x.c + 1); });
  let s = L.join('\n');
  s = s.replace('  let EXP_PREV = null;', `  let EXP_PREV = null;\n  let ${fl.map(f => f + ' = () => { }').join(', ')};   // ${archivo}: se enlazan justo antes de GM.sede`);
  s = s.replace('  GM.sede = { arbolesReales,', `  ({ ${fl.join(', ')} } = ${gm}({ ${[conS ? 'S: () => S' : '', ...deps].filter(Boolean).join(', ')} }));\n  GM.sede = { arbolesReales,`);
  fs.writeFileSync('sede3d.js', s); console.log('extraídas', fl.join(','), 'a', archivo, 'deps:', deps.join(','), conS ? '(con S)' : '');
}
