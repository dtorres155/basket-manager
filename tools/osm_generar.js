// recursos/osm/<id>.json (crudo, de tools/osm_descargar.js) -> vendor/osm/<id>.json (compacto; build.js los copia a dist/osm).
// Datos © colaboradores de OpenStreetMap (ODbL). Coordenadas en decímetros enteros alrededor del pabellón (x al este, z al sur).
// Con recursos/osm/<id>.poi.json (tools/osm_descargar2.js) añade: n (comercios y sitios con nombre: [tipo, nombre, x, z]), t (árboles [x, z]), pt (puntos de calle [clase, x, z]: 0 parada de bus, 1 semáforo, 2 paso de peatones, 3 farola, 4 banco, 5 papelera, 6 aparcabicis, 7 contenedores, 8 otros), k (aparcamientos), u (usos del suelo [tipo, ...]), v (vías de tren), f (vallas y muros [tipo, ...])
// Formato: { s: [textos], g: [latitud, longitud del centro], e: [[plantas, clase, nombre, color, techoYmaterial, x0, z0, x1, z1, ...]],   (color: índice en s del color del edificio o -1; techoYmaterial = forma del tejado (0 sin dato, 1 plano, 2 dos aguas, 3 cuatro aguas, 4 cúpula, 5 pirámide) + 10 por el material (1 ladrillo, 2 piedra, 3 cristal o metal)) c: [[clase, nombre, sentidoUnico, x0, z0, ...]], a: [[tipo, x0, z0, ...]], p: [[tipo, x0, z0, ...]] }
// clase de edificio: 0 otro, 1 vivienda, 2 comercio, 3 oficina, 4 colegio, 5 hospital, 6 ayuntamiento/público, 7 iglesia, 8 hotel, 9 industrial, 10 deporte, 11 quiosco, 12 restauración, 13 estación
// clase de calle: 0 autovía, 1 principal, 2 secundaria, 3 terciaria, 4 residencial, 5 peatonal, 6 servicio
const fs = require('fs'),
  path = require('path');
const DIR = path.join(__dirname, '..', 'recursos', 'osm'),
  OUT = path.join(__dirname, '..', 'vendor', 'osm');
fs.mkdirSync(OUT, { recursive: true });
const CALLE = { motorway: 0, trunk: 0, primary: 1, secondary: 2, tertiary: 3, residential: 4, unclassified: 4, living_street: 5, pedestrian: 5, service: 6 };
const area = p => {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i],
      b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s) / 2;
};
function dp(p, eps) {
  if (p.length < 4) return p;
  const d = (q, a, b) => {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      l = dx * dx + dz * dz || 1e-9,
      t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / l));
    return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dz);
  };
  const rec = (i, j, out) => {
    let m = 0,
      k = -1;
    for (let n = i + 1; n < j; n++) {
      const v = d(p[n], p[i], p[j]);
      if (v > m) {
        m = v;
        k = n;
      }
    }
    if (m > eps) {
      rec(i, k, out);
      out.push(k);
      rec(k, j, out);
    }
  };
  const idx = [0];
  rec(0, p.length - 1, idx);
  idx.push(p.length - 1);
  return idx.map(i => p[i]);
}
function claseEdificio(t) {
  const b = t.building,
    a = t.amenity,
    s = t.shop;
  if (t.leisure === 'stadium' || t.leisure === 'sports_centre' || b === 'stadium' || b === 'sports_hall' || t.sport === 'basketball') return 10;
  if (b === 'hospital' || a === 'hospital' || a === 'clinic') return 5;
  if (b === 'school' || b === 'kindergarten' || b === 'university' || a === 'school' || a === 'kindergarten' || a === 'university' || a === 'college') return 4;
  if (a === 'townhall' || b === 'civic' || b === 'public' || b === 'government' || a === 'courthouse' || a === 'police') return 6;
  if (b === 'church' || b === 'cathedral' || b === 'chapel' || b === 'mosque' || b === 'synagogue' || b === 'temple' || a === 'place_of_worship') return 7;
  if (b === 'hotel' || t.tourism === 'hotel') return 8;
  if (b === 'train_station' || t.railway === 'station' || t.public_transport === 'station') return 13;
  if (s === 'kiosk' || s === 'newsagent' || b === 'kiosk') return 11;
  if (a === 'restaurant' || a === 'cafe' || a === 'bar' || a === 'fast_food' || a === 'pub') return 12;
  if (s || b === 'retail' || b === 'commercial' || b === 'supermarket' || b === 'mall' || a === 'bank' || a === 'theatre' || a === 'cinema') return 2;
  if (b === 'office') return 3;
  if (
    b === 'industrial' ||
    b === 'warehouse' ||
    b === 'garage' ||
    b === 'garages' ||
    b === 'service' ||
    b === 'roof' ||
    b === 'shed' ||
    b === 'carport' ||
    b === 'hangar' ||
    b === 'parking'
  )
    return 9;
  if (b === 'apartments' || b === 'house' || b === 'residential' || b === 'detached' || b === 'terrace' || b === 'semidetached_house' || b === 'dormitory' || b === 'bungalow')
    return 1;
  return 0;
}
const ent = v => Math.round(v * 10);
const NOMBRES_COLOR = {
  white: '#f2efe8',
  grey: '#9a9a96',
  gray: '#9a9a96',
  red: '#a8493a',
  brown: '#7a5a43',
  beige: '#e0d2b4',
  yellow: '#e6cf86',
  orange: '#d98a50',
  pink: '#e0aeb0',
  green: '#8aa078',
  blue: '#8fa5bd',
  cream: '#efe4c8',
  ochre: '#c9a05a',
  sand: '#d9c9a3',
  black: '#4a4a4a',
  salmon: '#e0a58f'
};
const colorDe = v => {
  if (!v) return '';
  v = String(v).toLowerCase().trim();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  return NOMBRES_COLOR[v] || '';
};
const techoDe = t =>
  (({ flat: 1, gabled: 2, hipped: 3, 'half-hipped': 3, gambrel: 2, dome: 4, pyramidal: 5, skillion: 2 })[t['roof:shape']] || 0) +
  10 * ({ brick: 1, stone: 2, sandstone: 2, limestone: 2, concrete: 0, glass: 3, metal: 3, steel: 3 }[t['building:material']] || 0);
let total = 0,
  bytes = 0;
for (const f of fs
  .readdirSync(DIR)
  .filter(n => n.endsWith('.json') && n !== 'clubes.json' && n !== 'centros.json' && !/\.(poi|ring|dem|tr|pl|ex|hor|costa)\.json$/.test(n))
  .sort()) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const k = 110574,
    kx = 111320 * Math.cos((j.lat * Math.PI) / 180);
  const pr = g => g.map(q => [(q.lon - j.lon) * kx, -(q.lat - j.lat) * k]);
  const S = [],
    SI = new Map(),
    nom = n => {
      if (!n) return -1;
      n = String(n).slice(0, 40);
      if (!SI.has(n)) {
        SI.set(n, S.length);
        S.push(n);
      }
      return SI.get(n);
    };
  const r = { s: S, g: [+j.lat.toFixed(3), +j.lon.toFixed(3)], e: [], ex: [], c: [], cx: [], a: [], p: [] };
  for (const w of j.el) {
    if (!w.geometry || (w.geometry.length < 3 && !w.tags.highway)) continue;
    const t = w.tags || {};
    let p = pr(w.geometry);
    if (t.building) {
      if (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1]) p.pop();
      if (p.length < 3 || area(p) < 18) continue;
      p = dp(p.concat([p[0]]), 0.9).slice(0, -1);
      if (p.length < 3) continue;
      if (p.length > 18) p = p.filter((_, i) => i % Math.ceil(p.length / 18) === 0);
      const pl = +t['building:levels'] || (t.height ? Math.max(1, Math.round(+t.height / 3.1)) : 0);
      {
        const sd = parseInt(String(t.start_date || t['building:start_date'] || '').slice(0, 4)) || 0,
          mt = String(t['building:material'] || t['building:facade:material'] || t.material || '').toLowerCase(),
          mc = /brick|ladrillo/.test(mt)
            ? 1
            : /stone|sandstone|granite|limestone|marble/.test(mt)
              ? 2
              : /concrete|cement/.test(mt)
                ? 3
                : /glass/.test(mt)
                  ? 4
                  : /wood|timber/.test(mt)
                    ? 5
                    : /metal|steel|aluminium/.test(mt)
                      ? 6
                      : /plaster|stucco/.test(mt)
                        ? 7
                        : 0;
        r.ex.push([sd >= 1000 ? Math.floor(sd / 10) : 0, mc, t.heritage || t['heritage:operator'] || t.historic ? 1 : 0]);
      }
      r.e.push(
        [Math.min(pl, 60) || 0, claseEdificio(t), nom(t.name), nom(colorDe(t['building:colour'] || t['building:facade:colour'])), techoDe(t)].concat(
          ...p.map(q => [ent(q[0]), ent(q[1])])
        )
      );
    } else if (t.highway) {
      if (t.tunnel && t.tunnel !== 'no') continue;
      p = dp(p, 1.2);
      r.c.push([CALLE[t.highway] === undefined ? 6 : CALLE[t.highway], nom(t.name), t.oneway === 'yes' ? 1 : 0].concat(...p.map(q => [ent(q[0]), ent(q[1])])));
      // datos de la vía (punto 31): carriles, firme, puente, carril bici, carril bus, acera, alumbrado y límite de velocidad, en el mismo orden que r.c
      {
        const ci = v => v && v !== 'no' && v !== 'none',
          sf = (t.surface || '').toLowerCase(),
          cic = ci(t.cycleway) || ci(t['cycleway:left']) || ci(t['cycleway:right']) || ci(t['cycleway:both']),
          bus =
            ci(t.busway) ||
            ci(t['busway:left']) ||
            ci(t['busway:right']) ||
            /bus/.test(t['lanes:bus'] || '') ||
            t['bus:lanes'] !== undefined ||
            (t.oneway && /psv|bus/.test(t['cycleway:right'] || '')),
          flags = (ci(t.bridge) ? 1 : 0) | (cic ? 2 : 0) | (bus ? 4 : 0) | (ci(t.sidewalk) ? 8 : 0) | (t.lit === 'yes' ? 16 : 0) | (t.junction === 'roundabout' ? 32 : 0);
        r.cx.push([
          Math.min(+t.lanes || 0, 8),
          /paving|sett|cobble|brick/.test(sf) ? 1 : /concrete/.test(sf) ? 2 : /unpaved|gravel|dirt|ground|sand|grass/.test(sf) ? 3 : 0,
          flags,
          Math.round((parseInt(t.maxspeed) || 0) / 10)
        ]);
      }
    } else if (t.natural === 'water' || t.waterway) {
      p = dp(p, 1.8);
      r.a.push([t.waterway ? 1 : 0].concat(...p.map(q => [ent(q[0]), ent(q[1])])));
    } else if (t.leisure) {
      p = dp(p, 1.8);
      r.p.push([t.leisure === 'pitch' ? 1 : t.leisure === 'garden' ? 2 : 0].concat(...p.map(q => [ent(q[0]), ent(q[1])])));
    }
  }
  const pf = path.join(DIR, j.id + '.poi.json');
  if (fs.existsSync(pf)) {
    const P = JSON.parse(fs.readFileSync(pf, 'utf8'));
    r.n = [];
    r.t = [];
    r.pt = [];
    r.k = [];
    r.u = [];
    r.v = [];
    r.f = [];
    const USO = { grass: 0, forest: 1, residential: 2, commercial: 3, retail: 4, industrial: 5, cemetery: 6, railway: 7, construction: 8, brownfield: 9 },
      PUNTO = { bus_stop: 0, traffic_signals: 1, crossing: 2, street_lamp: 3, bench: 4, waste_basket: 5, bicycle_parking: 6, recycling: 7 };
    const xy = q => [ent((q.lon - j.lon) * kx), ent(-(q.lat - j.lat) * k)];
    for (const w of P.el) {
      const t = w.tags || {};
      if (w.type === 'node') {
        const [x, z] = xy(w);
        if (Math.hypot(x, z) > 3100) continue;
        if (t.natural === 'tree') r.t.push([x, z]);
        else if (t.highway && PUNTO[t.highway] !== undefined) r.pt.push([PUNTO[t.highway], x, z]);
        else if (t.amenity && PUNTO[t.amenity] !== undefined) r.pt.push([PUNTO[t.amenity], x, z]);
        else if (t.amenity && /atm|vending_machine|drinking_water|fountain/.test(t.amenity)) r.pt.push([8, x, z]);
        else if (t.name) r.n.push([t.shop || t.amenity || t.tourism || t.historic || 'x', nom(t.name), x, z]);
      } else if (w.geometry && w.geometry.length >= 2) {
        let p = pr(w.geometry);
        if (t.amenity === 'parking') {
          p = dp(p, 1.2);
          if (p.length >= 3) r.k.push([0].concat(...p.map(q => [ent(q[0]), ent(q[1])])));
        } else if (t.landuse && USO[t.landuse] !== undefined) {
          p = dp(p, 2);
          if (p.length >= 3) r.u.push([USO[t.landuse]].concat(...p.map(q => [ent(q[0]), ent(q[1])])));
        } else if (t.natural) {
          p = dp(p, 2);
          if (p.length >= 3) r.u.push([1].concat(...p.map(q => [ent(q[0]), ent(q[1])])));
        } else if (t.railway) {
          p = dp(p, 1.5);
          r.v.push([0].concat(...p.map(q => [ent(q[0]), ent(q[1])])));
        } else if (t.barrier) {
          p = dp(p, 0.8);
          r.f.push([t.barrier === 'hedge' ? 1 : t.barrier === 'wall' ? 2 : 0].concat(...p.map(q => [ent(q[0]), ent(q[1])])));
        }
      }
    }
  }
  // anillo lejano (tools/osm_descargar3.js): de 300 a 480 m, con la mínima información (metros enteros): l = { e: [[plantas, x0, z0, ...]], c: [[clase, x0, z0, ...]], a: [[tipo, ...]], p: [[...]], v: [[...]] }
  const rf = path.join(DIR, j.id + '.ring.json');
  if (fs.existsSync(rf)) {
    const RG = JSON.parse(fs.readFileSync(rf, 'utf8')),
      L = { e: [], c: [], a: [], p: [], v: [] },
      KH = { motorway: 0, trunk: 0, primary: 1, secondary: 2, tertiary: 3, residential: 4 },
      m = p => p.map(q => [q[0] / 10, q[1] / 10]),
      pl = p => [].concat(...p.map(q => [Math.round(q[0]), Math.round(q[1])]));
    for (const w of RG.el) {
      let p = m(w.g);
      if (w.t === 'b') {
        if (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1]) p.pop();
        if (p.length < 3 || area(p) < 70) continue;
        p = dp(p.concat([p[0]]), 2.2).slice(0, -1);
        if (p.length < 3) continue;
        if (p.length > 8) p = p.filter((_, i) => i % Math.ceil(p.length / 8) === 0);
        L.e.push([Math.min(w.l, 40)].concat(pl(p)));
      } else if (w.t === 'h') {
        p = dp(p, 3);
        L.c.push([KH[w.k] === undefined ? 4 : KH[w.k]].concat(pl(p)));
      } else if (w.t === 'r') {
        p = dp(p, 3);
        L.v.push(pl(p));
      } else if (w.t === 'a') {
        const cerr = w.g.length > 3 && w.g[0][0] === w.g[w.g.length - 1][0] && w.g[0][1] === w.g[w.g.length - 1][1];
        p = dp(p, 3);
        L.a.push([cerr ? 1 : 0].concat(pl(p)));
      } else {
        p = dp(p, 3.5);
        if (p.length >= 3) L.p.push(pl(p));
      }
    }
    r.l = L;
  }
  const tf = path.join(DIR, j.id + '.tr.json');
  if (fs.existsSync(tf)) {
    const TRJ = JSON.parse(fs.readFileSync(tf, 'utf8'));
    r.tr = TRJ.el.map(w =>
      [w.t].concat(
        ...dp(
          w.g.map(q => [q[0] / 10, q[1] / 10]),
          1.5
        ).map(q => [ent(q[0]), ent(q[1])])
      )
    );
  }
  const pf2 = path.join(DIR, j.id + '.pl.json');
  if (fs.existsSync(pf2)) {
    const PJ = JSON.parse(fs.readFileSync(pf2, 'utf8'));
    r.pl = PJ.el
      .map(w => {
        const p = dp(
          w.g.map(q => [q[0] / 10, q[1] / 10]),
          1.2
        );
        return [w.t].concat(...p.map(q => [ent(q[0]), ent(q[1])]));
      })
      .filter(a => a.length >= 7);
  }
  // partes de edificio y rutas de autobús (tools/osm_extra.js)
  const xf = path.join(DIR, j.id + '.ex.json');
  if (fs.existsSync(xf)) {
    const XJ = JSON.parse(fs.readFileSync(xf, 'utf8')),
      ROOF = { flat: 0, gabled: 1, hipped: 2, pyramidal: 3, dome: 4, skillion: 5, round: 4 };
    r.bp = (XJ.bp || [])
      .map(q => {
        const p = dp(
          q.g.map(a => [a[0] / 10, a[1] / 10]),
          0.8
        );
        if (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1]) p.pop();
        const h = q.h || (q.lv ? q.lv * 3.1 : 0),
          mh = q.mh || (q.mlv ? q.mlv * 3.1 : 0);
        if (p.length < 3 || p.length > 24 || !h) return null;
        return [Math.round(h * 10), Math.round(mh * 10), nom(colorDe(q.col)), ROOF[q.roof] === undefined ? 0 : ROOF[q.roof]].concat(...p.map(a => [ent(a[0]), ent(a[1])]));
      })
      .filter(Boolean);
    // cada ruta de autobús: los tramos de sus vías encadenados por los extremos
    r.rb = (XJ.rb || [])
      .map(rt => {
        const ways = rt.ways.map(w => w.map(a => [a[0] / 10, a[1] / 10])),
          usado = new Set();
        if (!ways.length) return null;
        let ch = ways[0].slice();
        usado.add(0);
        const cerca = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 3;
        for (let it = 0; it < ways.length; it++) {
          let hecho = false;
          for (let i = 0; i < ways.length; i++) {
            if (usado.has(i)) continue;
            const w = ways[i],
              fin = ch[ch.length - 1],
              ini = ch[0];
            if (cerca(fin, w[0])) {
              ch = ch.concat(w.slice(1));
            } else if (cerca(fin, w[w.length - 1])) {
              ch = ch.concat(w.slice().reverse().slice(1));
            } else if (cerca(ini, w[w.length - 1])) {
              ch = w.slice(0, -1).concat(ch);
            } else if (cerca(ini, w[0])) {
              ch = w.slice().reverse().slice(0, -1).concat(ch);
            } else continue;
            usado.add(i);
            hecho = true;
          }
          if (!hecho) break;
        }
        let s2 = dp(ch, 3);
        const dentro = s2.map(q => Math.hypot(q[0], q[1]) < 650);
        s2 = s2.filter((q, i) => dentro[i] || dentro[i - 1] || dentro[i + 1]);
        return s2.length >= 2 && s2.some((q, i) => i && Math.hypot(q[0], q[1]) < 650) ? [nom(rt.ref || rt.nom)].concat(...s2.map(a => [ent(a[0]), ent(a[1])])) : null;
      })
      .filter(Boolean)
      .filter((a, i, l) => l.findIndex(b => b[0] === a[0]) === i)
      .slice(0, 10);
  }
  const df = path.join(DIR, j.id + '.dem.json');
  if (fs.existsSync(df)) {
    const DM = JSON.parse(fs.readFileSync(df, 'utf8'));
    r.h = { n: DM.n, p: DM.paso, v: DM.h.map(v => Math.round(v)) };
  }
  // horizonte real (osm_horizonte.js, punto 144): alturas en anillos de 1,5 a 20 km en 72 direcciones
  const hf = path.join(DIR, j.id + '.hor.json');
  if (fs.existsSync(hf)) {
    const HZ = JSON.parse(fs.readFileSync(hf, 'utf8'));
    r.hz = { a: HZ.az, d: HZ.d, v: HZ.h };
  }
  // costa (osm_costa.js, punto 101): los trozos de línea de costa se unen en líneas seguidas (comparten nodos en los extremos) y se
  // simplifican a 3 m; playas y muelles, tal cual (décimas de metro)
  const cf = path.join(DIR, j.id + '.costa.json');
  if (fs.existsSync(cf)) {
    const CO = JSON.parse(fs.readFileSync(cf, 'utf8'));
    if (CO.c.length || CO.p.length || CO.m.length) {
      const lineas = CO.c.map(g => {
        const l = [];
        for (let i = 0; i + 1 < g.length; i += 2) l.push([g[i], g[i + 1]]);
        return l;
      });
      const igual = (a, b) => a[0] === b[0] && a[1] === b[1];
      let unido = true;
      while (unido) {
        unido = false;
        for (let a = 0; a < lineas.length && !unido; a++)
          for (let b = 0; b < lineas.length && !unido; b++) {
            if (a === b || !igual(lineas[a][lineas[a].length - 1], lineas[b][0])) continue;
            lineas[a] = lineas[a].concat(lineas[b].slice(1));
            lineas.splice(b, 1);
            unido = true;
          }
      }
      const simpl = (l, tol) => {
        if (l.length < 3) return l;
        const a = l[0],
          b = l[l.length - 1];
        let mx = -1,
          mi = 0;
        for (let i = 1; i + 1 < l.length; i++) {
          const dx = b[0] - a[0],
            dz = b[1] - a[1],
            L = Math.hypot(dx, dz) || 1,
            d = Math.abs((l[i][0] - a[0]) * dz - (l[i][1] - a[1]) * dx) / L;
          if (d > mx) {
            mx = d;
            mi = i;
          }
        }
        return mx > tol
          ? simpl(l.slice(0, mi + 1), tol)
              .slice(0, -1)
              .concat(simpl(l.slice(mi), tol))
          : [a, b];
      };
      r.co = { c: lineas.map(l => [].concat(...simpl(l, 30))), p: CO.p, m: CO.m };
    }
  }
  const s = JSON.stringify(r);
  fs.writeFileSync(path.join(OUT, j.id + '.json'), s);
  total++;
  bytes += s.length;
}
console.log(total + ' ciudades, ' + Math.round(bytes / 1024) + ' KB en vendor/osm');
