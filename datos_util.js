/* UTILIDADES DE DATOS
   GM.mkJugador: atributos a partir de posición, ovr y perfil (T tirador, P pasador, D defensor, R reboteador, E equilibrado).
   GM.club(def, filas, opt): define un club y sus jugadores. GM.commitDatos(ligas): vuelca todo a GM.data.
   Las plantillas se completan con jugadores de relleno ficticios (ficticio:true). */
(function () {
  const UE = ['ES', 'FR', 'GR', 'IT', 'DE', 'LT', 'LV', 'SI', 'HR', 'FI', 'PL', 'AT', 'BE', 'NL', 'PT', 'CZ', 'EE', 'SE', 'DK', 'BG', 'HU', 'RO', 'IE', 'CY'];
  const pas = n => n === 'US' ? 'USA' : (UE.indexOf(n) >= 0 ? 'UE' : 'NOUE');
  GM.pasaporte = pas;

  // Atributos y media. La media (ovr) sale de los atributos: ovr = media de los 10 atributos + K de la posición (K = 72 menos la media del
  // perfil base de esa posición, así un jugador de 72 es de 72 en cualquiera). Los perfiles tienen un pico al menos K por encima de su
  // media, de modo que un jugador de media N siempre tiene algún atributo de N o más (los de 92 son especialistas con algo de 92+).
  const KEYS = ['tiro3', 'tiro2', 'tl', 'pase', 'bote', 'reb', 'defInt', 'defPer', 'fisico', 'iq'];
  const BASE = { PG: [70, 62, 70, 80, 82, 40, 35, 70, 55, 75], SG: [78, 64, 72, 66, 70, 42, 38, 68, 58, 68], SF: [76, 66, 68, 58, 64, 52, 48, 70, 64, 64], PF: [58, 70, 66, 52, 52, 70, 62, 58, 74, 62], C: [40, 72, 60, 45, 40, 80, 76, 50, 78, 60] };
  const PERF = { T: [10, 0, 6, 0, 0, 0, 0, 0, 0, 0], P: [0, 0, 0, 10, 8, 0, 0, 0, 0, 8], D: [0, 0, 0, 0, 0, 0, 8, 10, 4, 0], R: [0, 0, 0, 0, 0, 10, 6, 0, 10, 0], E: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
  const KPOS = {}; Object.keys(BASE).forEach(p => { KPOS[p] = 72 - BASE[p].reduce((x, y) => x + y, 0) / 10; });
  const ovrDe = (att, pos) => Math.round(KEYS.reduce((x, k) => x + att[k], 0) / 10 + (KPOS[pos] || 9));
  // Sube o baja atributos de uno en uno (por orden de prioridad, saltando los topados) hasta que la media sea la pedida.
  function ajustaAtt(p, objetivo, prioridad) {
    const orden = (prioridad && prioridad.length ? prioridad : KEYS).concat(KEYS), sube = objetivo > ovrDe(p.att, p.pos);
    let g = 0, i = 0; while (ovrDe(p.att, p.pos) !== objetivo && g++ < 400) {
      const cur = ovrDe(p.att, p.pos); if ((cur < objetivo) !== sube) break;
      const k = orden[i++ % orden.length]; if (sube ? p.att[k] < 99 : p.att[k] > 20) p.att[k] += sube ? 1 : -1;
    }
  }
  // Si ningún atributo llega a la media, el más alto sube hasta ella y los más bajos ceden lo que haga falta (un 92 tiene algo de 92 o más)
  function picoAtt(p) {
    if (p.ovr >= 99) return; const ks = KEYS.slice().sort((a, b) => p.att[b] - p.att[a]), top = ks[0]; if (p.att[top] >= p.ovr) return;
    p.att[top] = p.ovr; const bajos = ks.slice(1).reverse(); let g = 0;
    while (ovrDe(p.att, p.pos) > p.ovr && g++ < 400) { const k = bajos[g % bajos.length]; if (p.att[k] > 20) p.att[k]--; }
    g = 0; while (ovrDe(p.att, p.pos) < p.ovr && g++ < 400) { const k = bajos[g % bajos.length]; if (p.att[k] < p.ovr - 1) p.att[k]++; }
  }
  GM.ovrDe = ovrDe; GM.ajustaAtt = ajustaAtt; GM.picoAtt = picoAtt; GM.KEYS_ATT = KEYS;
  // Cambia la media de un jugador moviendo sus atributos (los que se pasan en prioridad, primero)
  GM.setOvr = function (p, nuevo, prioridad) { nuevo = Math.max(30, Math.min(99, Math.round(nuevo))); p.ovr = nuevo; ajustaAtt(p, nuevo, prioridad); picoAtt(p); };
  // Reparte un poco de ruido entre atributos sin cambiar la media
  GM.ruidoAtt = function (p, n) { for (let i = 0; i < n; i++) { const a = KEYS[GM.rng.int(0, 9)], b = KEYS[GM.rng.int(0, 9)]; if (a !== b && p.att[a] < 99 && p.att[b] > 20) { p.att[a]++; p.att[b]--; } } };

  GM.mkJugador = GM.mkJugador || function (club, n, nombre, pos, edad, altura, nac, pasp, ovr, pot, perfil, salario, hasta) {
    const B = BASE[pos], P = PERF[perfil || 'E'];
    const att = {};
    KEYS.forEach((k, i) => {
      const j = ((n * 31 + i * 17 + ovr) % 9) - 4;
      att[k] = Math.max(20, Math.min(99, Math.round(B[i] + (ovr - 72) + P[i] + j)));
    });
    const ord = KEYS.map((k, i) => [B[i] + P[i], k]).sort((x, y) => y[0] - x[0]).map(x => x[1]);
    const p = {
      id: club + '-' + (n < 10 ? '0' : '') + n, nombre, equipoId: club, edad, pos, altura, nac, pasaporte: pasp, ovr, pot, att,
      contrato: { salario, hasta }, estado: { forma: 80, fatiga: 0, moral: 70, lesion: null }
    };
    ajustaAtt(p, ovr, ord);     // la media sale de los atributos: se afinan los principales hasta que coincidan
    picoAtt(p);
    return p;
  };

  // Nombres por país (para relleno y cantera)
  const POOL = {
    US: ['Marcus,Tyler,Jalen,Darius,Cameron,Isaiah,Malik,Devin,Jordan,Trevon,Caleb,Andre', 'Johnson,Williams,Brooks,Carter,Freeman,Hayes,Mitchell,Parker,Reed,Sanders,Walker,Young'],
    ES: ['Pablo,Álvaro,Sergio,Raúl,Marc,Adrià,Dani,Iván,Jorge,Nacho,Víctor,Hugo', 'García,Martínez,Ruiz,Torres,Serra,Vidal,Navarro,Ortega,Molina,Prats,Casas,Domínguez'],
    FR: ['Lucas,Théo,Mathis,Yanis,Axel,Baptiste,Enzo,Nolan,Hugo,Tidjane,Maxime,Adrien', 'Martin,Dubois,Moreau,Laurent,Fournier,Girard,Bonnet,Lambert,Mercier,Faure,Roux,Colin'],
    GR: ['Nikos,Giorgos,Dimitris,Kostas,Panagiotis,Thanasis,Vasilis,Stefanos,Lefteris,Christos,Manolis,Alexis', 'Papadopoulos,Georgiou,Nikolaou,Pappas,Vlachos,Antoniou,Karras,Mylonas,Sfairopoulos,Lekkas,Kourtis,Zisis'],
    TR: ['Emir,Can,Mert,Burak,Kerem,Yusuf,Onur,Berk,Arda,Tolga,Barış,Cem', 'Yılmaz,Demir,Kaya,Şahin,Çelik,Aydın,Öztürk,Arslan,Koç,Polat,Aksoy,Erdem'],
    RS: ['Nikola,Marko,Stefan,Luka,Filip,Vasilije,Nemanja,Aleksa,Uros,Dusan,Lazar,Petar', 'Jovanović,Petrović,Ilić,Nikolić,Marković,Stojanović,Pavlović,Kostić,Đorđević,Popović,Todorović,Lukić'],
    LT: ['Mantas,Tadas,Rokas,Arnas,Dovydas,Lukas,Edgaras,Justas,Paulius,Deividas,Augustas,Mindaugas', 'Kazlauskas,Petrauskas,Jankauskas,Stankevičius,Butkus,Žukauskas,Paulauskas,Rimkus,Vaitkus,Balčiūnas,Grigas,Sirvydis'],
    IT: ['Marco,Luca,Matteo,Andrea,Federico,Davide,Simone,Riccardo,Nicolò,Alessandro,Gabriele,Tommaso', 'Rossi,Ferrari,Romano,Colombo,Ricci,Marino,Greco,Bruno,Gallo,Conti,Moretti,Barbieri'],
    DE: ['Jonas,Leon,Niklas,Felix,Tim,Moritz,Kilian,Maxi,Lars,Paul,Johannes,Fabian', 'Müller,Schneider,Fischer,Weber,Becker,Hoffmann,Koch,Richter,Wolf,Neumann,Braun,Zimmer'],
    IL: ['Yam,Tomer,Ido,Itay,Roi,Omri,Ben,Guy,Eitan,Amit,Nimrod,Lior', 'Cohen,Levi,Mizrahi,Peretz,Biton,Friedman,Katz,Avraham,Dahan,Shapira,Gold,Azulay'],
    GEN: ['Adam,Jan,Karl,Piotr,Milan,Ivan,Tomás,Oskar,Mikko,Luka,Sven,David', 'Novak,Kowalski,Horvat,Nielsen,Virtanen,Svoboda,Kovač,Larsen,Popescu,Tóth,Marić,Bauer']
  };
  GM.nombreAleatorio = function (pais, h) {
    const p = POOL[pais] || POOL.GEN;
    const f = p[0].split(','), l = p[1].split(',');
    return f[h % f.length] + ' ' + l[Math.floor(h / 7) % l.length];
  };
  const ALTURA = { PG: 187, SG: 195, SF: 202, PF: 207, C: 213 };
  GM.alturaPos = (pos, h) => ALTURA[pos] + (h % 9) - 4;

  GM._pack = { ligas: [], equipos: [], jugadores: [] };

  // def: [id,nombre,siglas,ciudad,pais,colores,reputacion,presupuestoM,pabellon,aforo,ciudadDeportiva?]
  // fila: [nombre,pos,edad,ovr,pot,perfil,salarioM,hasta,nac?]
  GM.club = function (def, filas, opt) {
    opt = opt || {};
    const mult = opt.usd ? 0.92 : 1;
    const eq = {
      id: def[0], nombre: def[1], siglas: def[2], ciudad: def[3], pais: def[4], colores: def[5], reputacion: def[6],
      presupuesto: Math.round(def[7] * 1e6), pabellon: { nombre: def[8], aforo: def[9] }, ciudadDeportiva: def[10] || null
    };
    if (opt.conf) eq.conferencia = opt.conf;
    GM._pack.equipos.push(eq);
    let n = 1; const js = [];
    filas.forEach(f => {
      const nac = f[8] || def[4];
      const h = GM.util.hash(f[0]);
      js.push(GM.mkJugador(eq.id, n++, f[0], f[1], f[2], GM.alturaPos(f[1], h), nac, pas(nac), f[3], f[4], f[5], Math.round(f[6] * mult * 1e6), f[7] === 2027 && h % 100 >= 35 ? 2028 + h % 3 : f[7]));
    });
    const objetivo = opt.plantilla || 13;
    const minOvr = js.length ? Math.min.apply(null, js.map(j => j.ovr)) : (opt.baseOvr || 58);
    const cnt = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 };
    js.forEach(j => cnt[j.pos]++);
    const pais = opt.paisRelleno || def[4];
    const salMin = opt.salMin || (opt.usd ? 2.2 : 0.15);
    const salStep = opt.salStep || (opt.usd ? 0.12 : 0.03);
    const nReal = js.length;
    while (js.length < objetivo) {
      const pos = ['PG', 'SG', 'SF', 'PF', 'C'].sort((a, b) => cnt[a] - cnt[b])[0];
      cnt[pos]++;
      const h = GM.util.hash(eq.id + '#' + js.length);
      const k = js.length - nReal;
      const ovr = Math.max(44, (nReal ? minOvr - 2 : minOvr + 3) - (h % 5) - Math.floor(k / 4) * 2);
      const edad = 19 + (h >>> 3) % 15;
      const sal = Math.round((salMin + Math.max(0, ovr - 55) * salStep) * 1e6);
      const j = GM.mkJugador(eq.id, js.length + 1, GM.nombreAleatorio(pais, h), pos, edad, GM.alturaPos(pos, h), pais, pas(pais), ovr, ovr + (edad < 24 ? 3 + (h >>> 5) % 6 : (h >>> 5) % 2), 'E', sal, 2027 + (h >>> 7) % 3);
      j.ficticio = true;
      js.push(j);
    }
    js.forEach(j => GM._pack.jugadores.push(j));
    return eq;
  };

  GM.commitDatos = function (ligas) {
    (ligas || []).forEach(l => GM._pack.ligas.push(l));
    GM.addData(GM._pack);
    GM._pack = { ligas: [], equipos: [], jugadores: [] };
  };
})();
