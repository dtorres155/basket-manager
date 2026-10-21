// Conversaciones con vecinos (punto 28): 10 vecinos distintos dicen 10 cosas distintas, la memoria cambia lo que dicen y todo flujo termina. Uso: node tools/dialogo_prueba.js
const fs = require('fs'),
  vm = require('vm');
global.GM = {};
const cargar = f => vm.runInThisContext(fs.readFileSync(__dirname + '/../' + f, 'utf8'), { filename: f });
GM.util = {
  hash: s => {
    let h = 2166136261;
    for (const c of String(s)) {
      h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    }
    return h >>> 0;
  },
  clamp: (x, a, b) => Math.max(a, Math.min(b, x))
};
GM.mods = {};
GM.nombreAleatorio = (p, h) => 'Vecino' + (h % 100);
cargar('dialogo.js');
const st = {
  fecha: '2026-11-03',
  clubId: 'x',
  modo: 'carrera',
  personaje: { nombre: 'Marc' },
  carrera: { fama: 40 },
  equipos: { x: { nombre: 'Club X', siglas: 'X', ciudad: 'Villa', pais: 'ES' }, y: { nombre: 'Rival Y', siglas: 'RY' } },
  ciudad: { x: { aficion: 60 } },
  calendario: [{ local: 'x', visitante: 'y', resultado: { local: 80, visitante: 70 } }],
  sede: { charlas: {} }
};
GM.mods.competiciones = { proximoPartido: () => ({ local: 'x', visitante: 'y' }) };
const S = { clima: { tipo: 'sol', temp: 22 }, hora: 11, dia: { tipo: 'normal' } },
  roles = ['', 'policia', 'repartidor', 'comerciante', 'turista', 'jubilado', '', '', '', ''],
  pers = ['amable', 'seco', 'bromista', 'timido', 'hablador'];
const primeros = new Set(),
  preguntas = new Set();
let nodos = 0;
for (let i = 0; i < 10; i++) {
  const n = { idV: 'v' + i * 7919, rol: 'Vecino', rolEsp: roles[i], pers: pers[i % 5], hincha: i % 3 === 0 };
  const d = GM.dialogo.crear(st, n, S);
  let nd = d.nodo('inicio');
  primeros.add(nd.texto);
  for (const o of nd.opciones.filter(o => o.id !== 'fin')) {
    const q = d.nodo(o.id);
    preguntas.add(q.texto);
    q.opciones.forEach(r => {
      const rr = d.nodo(r.id);
      nodos++;
      if (!rr.texto) throw new Error('nodo vacío');
    });
  }
  if (!d.nodo('fin').fin) throw new Error('sin fin');
}
console.log('saludos distintos:', primeros.size, '| preguntas distintas:', preguntas.size, '| nodos recorridos:', nodos);
// memoria: tras decir «los vamos a ganar», otro vecino lo menciona
const n1 = { idV: 'a1', rol: 'Vecino', pers: 'amable' },
  d1 = GM.dialogo.crear(st, n1, S);
d1.nodo('inicio');
d1.nodo('tema:equipo');
d1.nodo('resp:equipo:0');
const n2 = { idV: 'a2', rol: 'Vecino', pers: 'amable' },
  d2 = GM.dialogo.crear(st, n2, S),
  q = d2.nodo('tema:equipo').texto;
console.log('memoria:', q.slice(0, 60));
if (preguntas.size < 10 || (!/ganar/.test(q) && !/ganaréis/.test(q))) {
  console.log('FALLA');
  process.exit(1);
}
console.log('OK');
