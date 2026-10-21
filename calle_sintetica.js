/* Ciudad inventada con el mismo formato que los datos de OpenStreetMap (punto 36): para los clubes cuya ciudad no se puede cargar (sin datos o sin conexión) se genera un plano
   (calles en cuadrícula con avenida y rotonda, manzanas de ensanche, bloques, casas y naves, parque, plaza, colegio, hospital, estación, ayuntamiento, iglesia y pabellón en el centro)
   y pasa por calle_real.js como una ciudad real: mismas fachadas por tipología, calles con carriles, señales, plazas y vida. GM.calleSintetica.plano(id, pais, ciudad) -> datos.
   Todo en décimas de metro; determinista por club. Prueba: node tools/ciudad_sintetica.js (window.__sinOSM = true fuerza este plano en cualquier club). */
(function () {
  const U = GM.util;
  const CALLES = {
    ES: [
      'Calle Mayor',
      'Avenida de la Constitución',
      'Calle del Mercado',
      'Calle Nueva',
      'Paseo de la Estación',
      'Calle de la Iglesia',
      'Calle del Sol',
      'Calle Real',
      'Calle del Río',
      'Avenida del Deporte'
    ],
    IT: ['Via Roma', 'Corso Italia', 'Via del Mercato', 'Via Nuova', 'Viale della Stazione', 'Via della Chiesa', 'Via Garibaldi', 'Via Mazzini', 'Via dello Sport'],
    GR: ['Odos Athinon', 'Leoforos Irinis', 'Odos Agoras', 'Odos Neas', 'Odos Stathmou', 'Odos Ekklisias', 'Odos Eleftherias', 'Odos Olympionikon'],
    TR: ['Cumhuriyet Caddesi', 'Atatürk Bulvarı', 'Pazar Sokağı', 'Yeni Sokak', 'İstasyon Caddesi', 'Cami Sokağı', 'Gül Sokağı', 'Spor Caddesi'],
    DE: ['Hauptstraße', 'Bahnhofstraße', 'Marktstraße', 'Neue Straße', 'Kirchstraße', 'Schulstraße', 'Gartenstraße', 'Sportallee'],
    FR: ['Rue Principale', 'Avenue de la République', 'Rue du Marché', 'Rue Neuve', 'Avenue de la Gare', "Rue de l'Église", 'Rue des Sports'],
    US: ['Main Street', 'Central Avenue', 'Market Street', 'Park Avenue', 'Station Road', 'Church Street', 'Oak Street', 'Elm Street', 'Arena Drive'],
    GEN: ['Main Street', 'Central Avenue', 'Market Street', 'New Street', 'Station Road', 'Church Street', 'Park Road', 'Sports Avenue']
  };
  const TIENDAS = {
    ES: [
      ['bakery', 'Panadería'],
      ['pharmacy', 'Farmacia'],
      ['books', 'Librería'],
      ['cafe', 'Café'],
      ['hardware', 'Ferretería'],
      ['clothes', 'Moda'],
      ['butcher', 'Carnicería']
    ],
    IT: [
      ['bakery', 'Panificio'],
      ['pharmacy', 'Farmacia'],
      ['books', 'Libreria'],
      ['cafe', 'Caffè'],
      ['clothes', 'Moda']
    ],
    GR: [
      ['bakery', 'Fournos'],
      ['pharmacy', 'Farmakeio'],
      ['cafe', 'Kafeneio'],
      ['clothes', 'Rouha']
    ],
    TR: [
      ['bakery', 'Fırın'],
      ['pharmacy', 'Eczane'],
      ['cafe', 'Kafe'],
      ['clothes', 'Giyim']
    ],
    DE: [
      ['bakery', 'Bäckerei'],
      ['pharmacy', 'Apotheke'],
      ['books', 'Buchhandlung'],
      ['cafe', 'Café']
    ],
    FR: [
      ['bakery', 'Boulangerie'],
      ['pharmacy', 'Pharmacie'],
      ['books', 'Librairie'],
      ['cafe', 'Café']
    ],
    US: [
      ['bakery', 'Bakery'],
      ['pharmacy', 'Pharmacy'],
      ['books', 'Books'],
      ['cafe', 'Coffee'],
      ['clothes', 'Clothing']
    ],
    GEN: [
      ['bakery', 'Bakery'],
      ['pharmacy', 'Pharmacy'],
      ['cafe', 'Café'],
      ['clothes', 'Clothing']
    ]
  };
  function rnd(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function plano(id, pais, ciudad) {
    const r = rnd(U.hash('sint' + id)),
      S = [],
      SI = new Map(),
      nom = n => {
        if (!n) return -1;
        n = String(n).slice(0, 40);
        if (!SI.has(n)) {
          SI.set(n, S.length);
          S.push(n);
        }
        return SI.get(n);
      },
      ent = v => Math.round(v * 10);
    const D = { s: S, e: [], ex: [], c: [], cx: [], a: [], p: [], n: [], t: [], pt: [], k: [], u: [], v: [], f: [], l: { e: [], c: [], a: [], p: [], v: [] }, sintetica: true };
    const calles = (CALLES[pais] || CALLES.GEN).slice(),
      tiendas = TIENDAS[pais] || TIENDAS.GEN,
      pick = a => a[(r() * a.length) | 0],
      barajar = a => {
        for (let i = a.length - 1; i > 0; i--) {
          const j = (r() * (i + 1)) | 0;
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      };
    barajar(calles);
    const pts = p => [].concat(...p.map(q => [ent(q[0]), ent(q[1])]));
    const rect = (x0, z0, x1, z1) => [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1]
    ];
    const LIN = [-250, -150, -50, 50, 150, 250],
      EXT = 340;
    // ---- calles: cuadrícula con una avenida de cuatro carriles (z = 50), una calle ancha (x = -50) y el resto residenciales; una rotonda donde se cruzan las dos principales
    const via = (k, nombre, uno, lanes, flags, p) => {
      D.c.push([k, nom(nombre), uno ? 1 : 0].concat(pts(p)));
      D.cx.push([lanes, 0, flags, k === 1 ? 5 : k === 2 ? 5 : 3]);
    };
    LIN.forEach((z, i) => {
      const principal = z === 50;
      via(principal ? 1 : 4, principal ? calles[0] : calles[(i + 2) % calles.length], !principal && i % 2 === 0, principal ? 4 : 2, 8 | 16 | (principal ? 4 | 2 : 0), [
        [-EXT, z],
        [EXT, z]
      ]);
    });
    LIN.forEach((x, i) => {
      const principal = x === -50;
      via(principal ? 2 : 4, principal ? calles[1] : calles[(i + 3) % calles.length], !principal && i % 2 === 1, principal ? 3 : 2, 8 | 16, [
        [x, -EXT],
        [x, EXT]
      ]);
    });
    {
      const cx = -50,
        cz = 50,
        R0 = 13,
        arco = [];
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        arco.push([cx + Math.cos(a) * R0, cz + Math.sin(a) * R0]);
      }
      via(2, calles[1], true, 2, 32 | 8, arco);
    }
    // ---- manzanas
    const sing = ['colegio', 'hospital', 'estacion', 'civico', 'parque', 'parque', 'nave'];
    barajar(sing);
    const singPos = [
      [-2, -2],
      [2, -2],
      [-2, 2],
      [1, 1],
      [-1, -1],
      [1, -1],
      [2, 2]
    ];
    barajar(singPos);
    const asigna = {};
    singPos.forEach((q, i) => {
      asigna[q[0] + ',' + q[1]] = sing[i];
    });
    const lote = (x0, z0, x1, z1, lv, cl, color) => {
      D.e.push([lv, cl, -1, color || -1, 0].concat(pts(rect(x0, z0, x1, z1))));
      D.ex.push([0, 0, 0]);
    };
    const arbol = (x, z) => {
      if (D.t.length < 520) D.t.push([ent(x), ent(z)]);
    };
    for (let i = -2; i <= 2; i++)
      for (let j = -2; j <= 2; j++) {
        const bx = i * 100,
          bz = j * 100,
          x0 = bx - 42,
          x1 = bx + 42,
          z0 = bz - 42,
          z1 = bz + 42,
          d = Math.max(Math.abs(i), Math.abs(j)),
          tipo = i === 0 && j === 0 ? 'pabellon' : asigna[i + ',' + j] || (d <= 1 ? (r() < 0.7 ? 'ensanche' : 'bloque') : pick(['bloque', 'casas', 'ensanche', 'casas']));
        const avenida = z1 + 8 === 50 || z0 - 8 === 50; // da a la avenida (z = 50)
        if (tipo === 'pabellon') {
          const p = [];
          for (let k = 0; k < 16; k++) p.push([Math.cos((k / 16) * Math.PI * 2) * 27, Math.sin((k / 16) * Math.PI * 2) * 20]);
          D.e.push([0, 10, nom('Pabellón'), -1, 0].concat(pts(p)));
          D.ex.push([0, 0, 0]);
          D.k.push([0].concat(pts(rect(-40, 26, 40, 40))));
          for (let k = -3; k <= 3; k++) arbol(k * 12, -34);
          continue;
        }
        if (tipo === 'parque') {
          D.p.push([0].concat(pts(rect(x0 + 4, z0 + 4, x1 - 4, z1 - 4))));
          for (let k = 0; k < 26; k++) arbol(x0 + 8 + r() * (x1 - x0 - 16), z0 + 8 + r() * (z1 - z0 - 16));
          D.pt.push([4, ent(bx), ent(bz + 10)], [4, ent(bx + 12), ent(bz - 6)]);
          continue;
        }
        if (tipo === 'colegio') {
          lote(bx - 36, bz - 30, bx + 36, bz - 10, 3, 4);
          lote(bx - 36, bz + 10, bx - 8, bz + 36, 2, 4);
          D.p.push([1].concat(pts(rect(bx + 4, bz + 12, bx + 36, bz + 36))));
          continue;
        }
        if (tipo === 'hospital') {
          lote(bx - 38, bz - 34, bx + 38, bz - 8, 6, 5);
          lote(bx - 30, bz + 6, bx + 10, bz + 36, 4, 5);
          continue;
        }
        if (tipo === 'estacion') {
          lote(bx - 38, bz - 12, bx + 38, bz + 12, 2, 13, nom('#d8ccb4'));
          D.v.push(
            [0].concat(
              pts([
                [bx - 150, bz + 26],
                [bx + 150, bz + 26]
              ])
            )
          );
          continue;
        }
        if (tipo === 'civico') {
          lote(bx - 20, bz - 38, bx + 20, bz - 14, 4, 6);
          lote(bx + 22, bz - 6, bx + 40, bz + 26, 1, 7);
          D.pt.push([4, ent(bx - 20), ent(bz + 8)]);
          lote(bx - 40, bz - 4, bx - 22, bz + 22, 3, 2);
          continue;
        }
        if (tipo === 'nave') {
          lote(x0 + 4, z0 + 6, x1 - 4, z1 - 20, 2, 9);
          continue;
        }
        if (tipo === 'bloque') {
          for (let k = 0; k < 2; k++) lote(x0 + 4, z0 + 6 + k * 40, x1 - 4, z0 + 19 + k * 40, 5 + ((r() * 4) | 0), 0);
          for (let k = 0; k < 6; k++) arbol(x0 + 10 + r() * 60, z0 + 24 + r() * 14);
          continue;
        }
        if (tipo === 'casas') {
          for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) lote(x0 + 4 + a * 27, z0 + 6 + b * 44, x0 + 4 + a * 27 + 22, z0 + 6 + b * 44 + 14, 2 + (r() < 0.25 ? 1 : 0), 1);
          for (let k = 0; k < 8; k++) arbol(x0 + 6 + r() * 70, z0 + 22 + r() * 18);
          continue;
        }
        // ensanche: anillo de parcelas alrededor del patio de manzana (planta baja con comercios hacia la avenida)
        const lv0 = d <= 0 ? 6 : d === 1 ? 5 : 4;
        for (const lado of [0, 1, 2, 3]) {
          let t = 0;
          const L = x1 - x0;
          while (t < L - 8) {
            const w = Math.min(L - t, 13 + ((r() * 9) | 0)),
              lv = Math.max(3, lv0 + ((r() * 3) | 0) - 1),
              tienda = avenida && (lado === 0 || lado === 1) && r() < 0.7;
            let a, b, c2, e2;
            if (lado === 0) {
              a = x0 + t;
              b = z0;
              c2 = a + w;
              e2 = z0 + 15;
            } else if (lado === 1) {
              a = x0 + t;
              b = z1 - 15;
              c2 = a + w;
              e2 = z1;
            } else if (lado === 2) {
              a = x0;
              b = z0 + 15 + t;
              c2 = x0 + 15;
              e2 = Math.min(z1 - 15, b + w);
            } else {
              a = x1 - 15;
              b = z0 + 15 + t;
              c2 = x1;
              e2 = Math.min(z1 - 15, b + w);
            }
            if (e2 - b > 6 && c2 - a > 6) {
              lote(a, b, c2, e2, lv, tienda ? 2 : r() < 0.12 ? 3 : 1);
              if (tienda) {
                const [ty, nm] = pick(tiendas);
                D.n.push([ty, nom(nm), ent((a + c2) / 2), ent((b + e2) / 2)]);
              }
            }
            t += w + 0.8;
          }
        }
      }
    // ---- árboles y farolas en las calles, pasos y paradas
    [...LIN.map(z => [[-300, z], [300, z], z === 50]), ...LIN.map(x => [[x, -300], [x, 300], false])].forEach(([a, b, av], idx) => {
      const horiz = idx < LIN.length,
        lado = av ? 9 : 7;
      for (let s = -290; s <= 290; s += 22) {
        const x = horiz ? s : a[0],
          z = horiz ? a[1] : s;
        if (!horiz && false) continue;
        arbol(horiz ? x : x + lado, horiz ? z + lado : z);
        if (D.pt.length < 420 && s % 44 === 0) D.pt.push([3, ent(horiz ? x : x - lado), ent(horiz ? z - lado : z)]);
      }
    });
    LIN.forEach(x =>
      LIN.forEach(z => {
        if (Math.abs(x) < 280 && Math.abs(z) < 280) {
          D.pt.push([2, ent(x + 10), ent(z)], [2, ent(x), ent(z + 10)]);
          if ((x === -50 || z === 50) && D.pt.length < 520) D.pt.push([1, ent(x + 9), ent(z + 9)]);
        }
      })
    );
    [-150, 150].forEach(x => D.pt.push([0, ent(x), ent(58)], [0, ent(x + 40), ent(42)]));
    // ---- anillo lejano (de 300 a 520 m): manzanas simplificadas y las calles principales
    for (let i = -5; i <= 5; i++)
      for (let j = -5; j <= 5; j++) {
        if (Math.max(Math.abs(i), Math.abs(j)) < 3) continue;
        const bx = i * 100,
          bz = j * 100;
        for (let a = 0; a < 2; a++)
          for (let b = 0; b < 2; b++) {
            const x0 = bx - 38 + a * 40,
              z0 = bz - 38 + b * 40;
            D.l.e.push([3 + ((r() * 4) | 0), ent(x0), ent(z0), ent(x0 + 34), ent(z0), ent(x0 + 34), ent(z0 + 34), ent(x0), ent(z0 + 34)]);
          }
      }
    for (let k = -5; k <= 5; k++) {
      D.l.c.push([k === 0 ? 1 : 4, ent(-560), ent(k * 100 + 50), ent(560), ent(k * 100 + 50)]);
      D.l.c.push([k === 0 ? 2 : 4, ent(k * 100 - 50), ent(-560), ent(k * 100 - 50), ent(560)]);
    }
    D.ciudad = ciudad || '';
    return D;
  }
  GM.calleSintetica = { plano };
})();
