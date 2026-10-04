/* UTILIDADES DE DATOS
   GM.mkJugador: atributos a partir de posición, ovr y perfil (T tirador, P pasador, D defensor, R reboteador, E equilibrado).
   GM.club(def, filas, opt): define un club y sus jugadores. GM.commitDatos(ligas): vuelca todo a GM.data.
   Las plantillas se completan con jugadores de relleno ficticios (ficticio:true). */
(function () {
  const UE = ['ES', 'FR', 'GR', 'IT', 'DE', 'LT', 'LV', 'SI', 'HR', 'FI', 'PL', 'AT', 'BE', 'NL', 'PT', 'CZ', 'EE', 'SE', 'DK', 'BG', 'HU', 'RO', 'IE', 'CY'];
  const pas = n => n === 'US' ? 'USA' : (UE.indexOf(n) >= 0 ? 'UE' : 'NOUE');
  GM.pasaporte = pas;

  GM.mkJugador = GM.mkJugador || function (club, n, nombre, pos, edad, altura, nac, pasp, ovr, pot, perfil, salario, hasta) {
    const B = { PG: [70, 62, 70, 80, 82, 40, 35, 70, 55, 75], SG: [78, 64, 72, 66, 70, 42, 38, 68, 58, 68], SF: [68, 66, 68, 60, 64, 55, 50, 66, 64, 64], PF: [58, 70, 66, 52, 52, 68, 62, 58, 72, 62], C: [40, 72, 60, 45, 40, 80, 76, 50, 78, 60] }[pos];
    const P = { T: [10, 0, 6, 0, 0, 0, 0, 0, 0, 0], P: [0, 0, 0, 10, 8, 0, 0, 0, 0, 8], D: [0, 0, 0, 0, 0, 0, 8, 10, 4, 0], R: [0, 0, 0, 0, 0, 10, 6, 0, 10, 0], E: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }[perfil || 'E'];
    const keys = ['tiro3', 'tiro2', 'tl', 'pase', 'bote', 'reb', 'defInt', 'defPer', 'fisico', 'iq'];
    const att = {};
    keys.forEach((k, i) => {
      const j = ((n * 31 + i * 17 + ovr) % 9) - 4;
      att[k] = Math.max(20, Math.min(99, Math.round(B[i] + (ovr - 72) + P[i] + j)));
    });
    return {
      id: club + '-' + (n < 10 ? '0' : '') + n, nombre, equipoId: club, edad, pos, altura, nac, pasaporte: pasp, ovr, pot, att,
      contrato: { salario, hasta }, estado: { forma: 80, fatiga: 0, moral: 70, lesion: null }
    };
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
