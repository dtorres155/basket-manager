/* CIUDAD 3D (GM.mods.ciudad3d) — vista de mapa desde arriba
   Mapa estilizado (no es el plano real) con 6 barrios, calles, manzanas y lugares interactivos (colegio, hospital, plaza, peña, comercios,
   estación, ayuntamiento, pabellón y campus). Las actividades cuestan dinero (o influencia), tienen enfriamiento y modifican la afición de un barrio y
   los medidores del club. Los barrios se llenan de banderas según su afición y muestran pancartas si están descontentos.
   Expone: barrios, lugares, acciones, hacer, mount, unmount, selfTest. Escribe state.ciudad[clubId].mapa = { bonos:[6], lugares:{id:fecha} }. */
(function () {
  const U = GM.util;
  let V = null;
  const NOMBRES = {
    Badalona: ['Dalt de la Vila', 'Centre', 'Llefià', 'Sant Roc', 'Montigalà', 'Casagemes'],
    Barcelona: ['Les Corts', 'Eixample', 'Gràcia', 'Sants', 'Poble-sec', 'Sant Martí'],
    Madrid: ['Centro', 'Chamartín', 'Salamanca', 'Hortaleza', 'Arganzuela', 'Tetuán'],
    // Ciudades de la NBA
    Atlanta: ['Downtown', 'Midtown', 'Buckhead', 'Old Fourth Ward', 'Inman Park', 'West End'],
    Boston: ['Back Bay', 'North End', 'South End', 'Beacon Hill', 'Dorchester', 'Roxbury'],
    Brooklyn: ['Downtown Brooklyn', 'Williamsburg', 'Bushwick', 'Park Slope', 'Bedford-Stuyvesant', 'Crown Heights'],
    Charlotte: ['Uptown', 'South End', 'NoDa', 'Plaza Midwood', 'Dilworth', 'Myers Park'],
    Chicago: ['The Loop', 'West Loop', 'Wicker Park', 'Lincoln Park', 'Bronzeville', 'Pilsen'],
    Cleveland: ['Downtown', 'Ohio City', 'Tremont', 'University Circle', 'Detroit-Shoreway', 'Glenville'],
    Detroit: ['Downtown', 'Midtown', 'Corktown', 'Eastern Market', 'Mexicantown', 'Brush Park'],
    'Indianápolis': ['Downtown', 'Fountain Square', 'Broad Ripple', 'Mass Ave', 'Irvington', 'Fletcher Place'],
    Miami: ['Downtown', 'Brickell', 'Little Havana', 'Wynwood', 'Little Haiti', 'Coconut Grove'],
    Milwaukee: ['Downtown', 'Third Ward', 'Bay View', 'Riverwest', 'Walker\'s Point', 'Sherman Park'],
    'Nueva York': ['Midtown', 'Harlem', 'Upper West Side', 'Greenwich Village', 'Lower East Side', 'Chelsea'],
    Orlando: ['Downtown', 'Thornton Park', 'Mills 50', 'College Park', 'Parramore', 'Baldwin Park'],
    Filadelfia: ['Center City', 'South Philly', 'Fishtown', 'Northern Liberties', 'University City', 'Kensington'],
    Toronto: ['Downtown', 'Kensington Market', 'Scarborough', 'Little Italy', 'Leslieville', 'North York'],
    Washington: ['Downtown', 'Capitol Hill', 'Georgetown', 'U Street', 'Navy Yard', 'Anacostia'],
    Dallas: ['Downtown', 'Deep Ellum', 'Uptown', 'Oak Cliff', 'Bishop Arts', 'Lakewood'],
    Denver: ['LoDo', 'Five Points', 'Capitol Hill', 'RiNo', 'Highland', 'Baker'],
    'San Francisco': ['Mission Bay', 'Mission', 'SoMa', 'Chinatown', 'Haight-Ashbury', 'Sunset'],
    Houston: ['Downtown', 'Midtown', 'Montrose', 'Third Ward', 'The Heights', 'East End'],
    'Los Ángeles': ['Downtown', 'Hollywood', 'Inglewood', 'Koreatown', 'Echo Park', 'Boyle Heights'],
    Memphis: ['Downtown', 'Midtown', 'Cooper-Young', 'Orange Mound', 'Germantown', 'Whitehaven'],
    Minneapolis: ['Downtown', 'North Loop', 'Northeast', 'Uptown', 'Cedar-Riverside', 'Powderhorn'],
    'Nueva Orleans': ['French Quarter', 'Tremé', 'Garden District', 'Marigny', 'Bywater', 'Mid-City'],
    'Oklahoma City': ['Bricktown', 'Midtown', 'Paseo', 'Plaza District', 'Deep Deuce', 'Capitol Hill'],
    Phoenix: ['Downtown', 'Roosevelt Row', 'Arcadia', 'Ahwatukee', 'Maryvale', 'Encanto'],
    Portland: ['Pearl District', 'Rose Quarter', 'Alberta', 'Hawthorne', 'St. Johns', 'Sellwood'],
    Sacramento: ['Downtown', 'Midtown', 'Land Park', 'Oak Park', 'East Sacramento', 'Natomas'],
    'San Antonio': ['Downtown', 'Southtown', 'King William', 'Alamo Heights', 'Pearl', 'Westside'],
    'Salt Lake City': ['Downtown', 'Sugar House', 'The Avenues', 'Liberty Wells', 'Rose Park', 'Glendale'],
    // Ciudades pequeñas de Italia y Alemania
    'Reggio Emilia': ['Centro Storico', 'Santo Stefano', 'Ospizio', 'Pieve Modolena', 'Rosta Nuova', 'Mirabello'],
    Varese: ['Centro', 'Masnago', 'Biumo', 'Sant\'Ambrogio', 'Bizzozero', 'Giubiano'],
    Treviso: ['Centro Storico', 'San Liberale', 'Santa Maria del Rovere', 'Fiera', 'Sant\'Angelo', 'San Zeno'],
    Udine: ['Centro', 'Cussignacco', 'Rizzi', 'Paderno', 'Chiavris', 'San Domenico'],
    Jena: ['Zentrum', 'Lobeda', 'Winzerla', 'Nord', 'West', 'Wenigenjena'],
    Hagen: ['Mitte', 'Haspe', 'Hohenlimburg', 'Eilpe', 'Boele', 'Altenhagen'],
    'Tréveris': ['Altstadt', 'Trier-Süd', 'Pfalzel', 'Ehrang', 'Heiligkreuz', 'Olewig'],
    Tortona: ['Centro', 'San Bernardino', 'Passalacqua', 'Vho', 'Rivalta Scrivia', 'Torre Garofoli'],
    'Cantù': ['Centro', 'Mirabello', 'Vighizzolo', 'Fecchio', 'Asnago', 'Cascina Amata'],
    Scafati: ['Centro', 'San Pietro', 'Bagni', 'Mariconda', 'Sant\'Antonio Vecchio', 'Vitrare'],
    'Weißenfels': ['Altstadt', 'Langendorf', 'Leißling', 'Markwerben', 'Uichteritz', 'Burgwerben'],
    Vechta: ['Innenstadt', 'Oythe', 'Langförden', 'Calveslage', 'Hagen', 'Stoppelmarkt'],
    // Grecia y Turquía (ciudades pequeñas)
    Rodas: ['Ciudad Medieval', 'Mandraki', 'Neochori', 'Rodini', 'Zefyros', 'Monte Smith'],
    Karditsa: ['Centro', 'Varousi', 'Kaminades', 'Karditsomagoula', 'Artesiano', 'Rousso'],
    'Ioánina': ['Kastro', 'Neokaisareia', 'Ampeleia', 'Anatoli', 'Stavraki', 'Perama'],
    'Léucade': ['Centro', 'Kariotes', 'Tsoukalades', 'Apolpaina', 'Lygia', 'Nikiana'],
    'Míkonos': ['Chora', 'Little Venice', 'Ano Mera', 'Ornos', 'Tourlos', 'Platys Gialos'],
    'Aliağa': ['Kültür', 'Yalı', 'Atatürk', 'Siteler', 'Yeni Mahalle', 'Şakran'],
    'Körfez': ['Yeniyalı', 'Kirazlıyalı', 'Şirinyalı', 'Yukarı Hereke', 'İlimtepe', 'Barbaros'],
    'Çayırova': ['Çayırova', 'Akse', 'Şekerpınar', 'Özgürlük', 'İnönü', 'Yenimahalle'],
    'Bandırma': ['Paşakonak', 'Levent', 'Çınarlı', 'İhsaniye', 'Paşabayır', '600 Evler'],
    Trebisonda: ['Ortahisar', 'Boztepe', 'Pazarkapı', 'Kemerkaya', 'Kavala', 'Yalı'],
    // Barrios reales de las demás ciudades con club europeo (todas las ciudades del juego tienen barrios reales)
    "A Coruña": ['Ciudad Vieja', 'Pescadería', 'Monte Alto', 'Os Mallos', 'Riazor', 'Matogrande'],
    "Andorra la Vella": ['Centre històric', 'Santa Coloma', 'La Margineda', 'Prat de la Creu', 'Els Serradells', 'Escaldes'],
    Ankara: ['Çankaya', 'Kızılay', 'Ulus', 'Keçiören', 'Yenimahalle', 'Etimesgut'],
    Atenas: ['Plaka', 'Kolonaki', 'Exarchia', 'Pangrati', 'Kypseli', 'Peristeri'],
    Bamberg: ['Altstadt', 'Gärtnerstadt', 'Bamberg-Ost', 'Gaustadt', 'Bug', 'Wildensorg'],
    Belgrado: ['Stari Grad', 'Vračar', 'Savski Venac', 'Novi Beograd', 'Zemun', 'Zvezdara'],
    Berlín: ['Mitte', 'Kreuzberg', 'Prenzlauer Berg', 'Friedrichshain', 'Charlottenburg', 'Neukölln'],
    Bilbao: ['Casco Viejo', 'Abando', 'Deusto', 'Indautxu', 'San Ignacio', 'Santutxu'],
    Bolonia: ['Centro Storico', 'Bolognina', 'San Donato', 'Santo Stefano', 'Saragozza', 'Navile'],
    Bonn: ['Zentrum', 'Bad Godesberg', 'Beuel', 'Poppelsdorf', 'Endenich', 'Hardtberg'],
    Brunswick: ['Innenstadt', 'Östliches Ringgebiet', 'Westliches Ringgebiet', 'Weststadt', 'Heidberg', 'Lehndorf'],
    Burgos: ['Centro', 'Gamonal', 'San Pedro de la Fuente', 'Fuentecillas', 'Capiscol', 'Villímar'],
    Bursa: ['Osmangazi', 'Nilüfer', 'Yıldırım', 'Görükle', 'Çekirge', 'Setbaşı'],
    Chemnitz: ['Zentrum', 'Kaßberg', 'Sonnenberg', 'Schloßchemnitz', 'Bernsdorf', 'Kappel'],
    Denizli: ['Merkezefendi', 'Pamukkale', 'Çınar', 'Sümer', 'Bağbaşı', 'Kınıklı'],
    Dubái: ['Deira', 'Bur Dubai', 'Downtown', 'Jumeirah', 'Dubai Marina', 'Al Barsha'],
    "El Pireo": ['Kastella', 'Pasalimani', 'Kaminia', 'Neo Faliro', 'Agia Sofia', 'Peiraiki'],
    Esmirna: ['Karşıyaka', 'Alsancak', 'Konak', 'Bornova', 'Buca', 'Bayraklı'],
    Estambul: ['Kadıköy', 'Beşiktaş', 'Beyoğlu', 'Şişli', 'Üsküdar', 'Fatih'],
    Fráncfort: ['Innenstadt', 'Sachsenhausen', 'Bornheim', 'Nordend', 'Bockenheim', 'Höchst'],
    Girona: ['Barri Vell', 'Mercadal', 'Eixample', 'Santa Eugènia', 'Montilivi', 'Sant Narcís'],
    Hamburgo: ['Altona', 'St. Pauli', 'Wilhelmsburg', 'Eimsbüttel', 'Barmbek', 'HafenCity'],
    Kaunas: ['Senamiestis', 'Centras', 'Žaliakalnis', 'Šilainiai', 'Dainava', 'Aleksotas'],
    Lleida: ['Centre Històric', 'Cappont', 'Pardinyes', 'Balàfia', 'Universitat', 'Joc de la Bola'],
    Ludwigsburg: ['Innenstadt', 'Oßweil', 'Eglosheim', 'Grünbühl', 'Hoheneck', 'Neckarweihingen'],
    Lugo: ['Casco Histórico', 'A Milagrosa', 'O Carme', 'Sagrado Corazón', 'Recatelo', 'As Fontiñas'],
    Manresa: ['Centre Històric', 'Carretera de Santpedor', 'Valldaura', 'La Balconada', 'Escodines', 'Les Bases'],
    Milán: ['Centro Storico', 'Brera', 'Navigli', 'Isola', 'Porta Romana', 'San Siro'],
    Murcia: ['Centro', 'Santa Eulalia', 'El Carmen', 'La Flota', 'Vista Alegre', 'Espinardo'],
    Málaga: ['Centro', 'El Palo', 'Huelin', 'La Trinidad', 'Teatinos', 'Carretera de Cádiz'],
    Múnich: ['Altstadt', 'Schwabing', 'Maxvorstadt', 'Haidhausen', 'Sendling', 'Giesing'],
    Nápoles: ['Centro Storico', 'Chiaia', 'Vomero', 'Posillipo', 'Fuorigrotta', 'Barra'],
    Oldemburgo: ['Innenstadt', 'Bürgerfelde', 'Donnerschwee', 'Eversten', 'Kreyenbrück', 'Osternburg'],
    París: ['Le Marais', 'Montmartre', 'Belleville', 'Bercy', 'Batignolles', 'La Chapelle'],
    Patras: ['Centro', 'Agia Sofia', 'Psila Alonia', 'Rio', 'Zarouchleika', 'Akti Dymaion'],
    Roma: ['Centro Storico', 'Trastevere', 'Testaccio', 'EUR', 'San Lorenzo', 'Prati'],
    Rostock: ['Stadtmitte', 'Kröpeliner-Tor-Vorstadt', 'Warnemünde', 'Lütten Klein', 'Südstadt', 'Gehlsdorf'],
    "San Cristóbal de La Laguna": ['Casco Histórico', 'La Cuesta', 'Taco', 'Tejina', 'Bajamar', 'Geneto'],
    "Santiago de Compostela": ['Zona Vella', 'Ensanche', 'Sar', 'Conxo', 'Vite', 'Fontiñas'],
    "Tel Aviv": ['Jaffa', 'Florentin', 'Neve Tzedek', 'Lev HaIr', 'Ramat Aviv', 'Yad Eliyahu'],
    Tesalónica: ['Ladadika', 'Ano Poli', 'Kalamaria', 'Toumba', 'Charilaou', 'Neapoli'],
    Trento: ['Centro Storico', 'Gardolo', 'Povo', 'Mattarello', 'Piedicastello', 'Ravina'],
    Trieste: ['Città Vecchia', 'Borgo Teresiano', 'San Giacomo', 'Barcola', 'Roiano', 'Servola'],
    Ulm: ['Altstadt', 'Söflingen', 'Wiblingen', 'Eselsberg', 'Böfingen', 'Weststadt'],
    Valencia: ['Ciutat Vella', 'Russafa', 'El Cabanyal', 'Benimaclet', 'L\'Eixample', 'Quatre Carreres'],
    Venecia: ['San Marco', 'Cannaregio', 'Castello', 'Dorsoduro', 'Mestre', 'Lido'],
    Verona: ['Città Antica', 'Borgo Trento', 'Veronetta', 'San Zeno', 'Borgo Roma', 'Borgo Venezia'],
    Villeurbanne: ['Gratte-Ciel', 'Charpennes', 'Cusset', 'Croix-Luizet', 'Tonkin', 'Les Buers'],
    "Vitoria-Gasteiz": ['Casco Viejo', 'Ensanche', 'Lakua', 'Zabalgana', 'Salburua', 'Judimendi'],
    Wurzburgo: ['Altstadt', 'Sanderau', 'Frauenland', 'Zellerau', 'Heidingsfeld', 'Grombühl'],
    Zaragoza: ['Casco Histórico', 'Delicias', 'Las Fuentes', 'Actur', 'San José', 'Torrero']
  };
  const GENERICO = ['Centro', 'Casco antiguo', 'Ensanche', 'Barrio del puerto', 'Zona norte', 'Barrio obrero'];
  const REPARTO = [['colegio', 'plaza'], ['hospital', 'comercio'], ['pena', 'colegio'], ['estacion', 'comercio'], ['plaza', 'pena'], ['colegio', 'hospital']];
  const NOM_LUGAR = { colegio: 'Colegio', hospital: 'Hospital', plaza: 'Plaza', pena: 'Peña del club', comercio: 'Comercios', estacion: 'Estación', ayuntamiento: 'Ayuntamiento', pabellon: 'Pabellón', campus: 'Campus del club' };
  const ACC = {
    colegio: [{ id: 'clinic', t: 'Clínic con jugadores', coste: 20000, cd: 30, ef: { barrio: 8, aficion: 1.5, apoyo: 1, pil: { cantera: 1, arraigo: 1 } } }, { id: 'entradas', t: 'Entradas para los alumnos', coste: 6000, cd: 20, ef: { barrio: 5, aficion: 1, apoyo: 1 } }],
    hospital: [{ id: 'visita', t: 'Visita de la plantilla', coste: 3000, cd: 30, ef: { barrio: 4, apoyo: 2, alma: 0.6 } }],
    plaza: [{ id: 'fiesta', t: 'Fiesta del barrio', coste: 35000, cd: 45, ef: { barrio: 10, ambiente: 3, aficion: 1.5 } }],
    pena: [{ id: 'cena', t: 'Cena con la peña', coste: 8000, cd: 30, ef: { barrio: 7, aficion: 2, ambiente: 2 } }, { id: 'bufandas', t: 'Campaña de bufandas', coste: 12000, cd: 40, ef: { barrio: 6, ambiente: 2 } }],
    comercio: [{ id: 'campana', t: 'Campaña con comercios locales', coste: 25000, cd: 40, ef: { barrio: 6, apoyo: 3 } }],
    estacion: [{ id: 'bus', t: 'Campaña de transporte', coste: 15000, cd: 40, ef: { barrio: 4, ambiente: 1.5 } }],
    ayuntamiento: [{ id: 'alcalde', t: 'Reunión con el alcalde', coste: 10000, influencia: 6, cd: 60, ef: { apoyo: 4, pil: { arraigo: 1 } } }],
    pabellon: [{ id: 'abiertas', t: 'Jornada de puertas abiertas', coste: 15000, cd: 45, ef: { barrio: 5, aficion: 3, ambiente: 2 } }],
    campus: [{ id: 'visita', t: 'Visita al campus', coste: 5000, cd: 30, ef: { barrio: 5, aficion: 1, apoyo: 1 } }]
  };
  // Actividades del jugador en la ciudad: coste en miles de euros de ahorros, efectos en fama, moral y cariño del barrio.
  const ACC_J = {
    colegio: [{ id: 'visita', t: 'Visitar el colegio', coste: 0, cd: 20, ef: { barrio: 8, fama: 2, moral: 2 } }, { id: 'clinic', t: 'Dar un clínic a los niños', coste: 2, cd: 35, ef: { barrio: 10, fama: 3, moral: 3 } }],
    hospital: [{ id: 'visita', t: 'Visita solidaria', coste: 0, cd: 30, ef: { barrio: 6, fama: 2, moral: 4 } }],
    plaza: [{ id: 'paseo', t: 'Pasear y firmar autógrafos', coste: 0, cd: 10, ef: { barrio: 5, fama: 1.5, moral: 2 } }],
    pena: [{ id: 'cena', t: 'Cenar con la peña', coste: 0.5, cd: 20, ef: { barrio: 7, fama: 1, moral: 3 } }],
    comercio: [{ id: 'ropa', t: 'Ir de compras', coste: 3, cd: 10, ef: { moral: 3 } }, { id: 'restaurante', t: 'Cenar en un buen restaurante', coste: 1.5, cd: 7, ef: { moral: 2, fama: 0.5 } }],
    estacion: [{ id: 'viaje', t: 'Escapada de fin de semana', coste: 2, cd: 21, ef: { moral: 5 } }],
    ayuntamiento: [{ id: 'reunion', t: 'Reunirte con el concejal de deportes', coste: 0, cd: 60, ef: { fama: 2, barrio: 4 } }],
    pabellon: [{ id: 'canastas', t: 'Tirar unas canastas extra', coste: 0, cd: 7, ef: { xp: 0.08, moral: 1 } }],
    campus: [{ id: 'campus', t: 'Pasar por el campus del club', coste: 0, cd: 14, ef: { moral: 1, barrio: 3 } }]
  };
  const esc = (st, id) => U.clamp(st.equipos[id].presupuesto / 60e6, 0.3, 8);
  const pres = st => st.modo === 'presidente' && st.legado;

  function mapa(st) {
    const c = st.ciudad[st.clubId];
    if (!c.mapa) c.mapa = { bonos: [0, 0, 0, 0, 0, 0], lugares: {} };
    return c.mapa;
  }
  function nombresBarrios(eq) { return NOMBRES[eq.ciudad] || GENERICO; }
  function barrios(st) {
    const eq = st.equipos[st.clubId], c = st.ciudad[st.clubId], m = mapa(st), nom = nombresBarrios(eq);
    return nom.map((n, i) => {
      const off = (U.hash(eq.id + 'b' + i) % 25) - 12;
      return { i, nombre: n, aficion: Math.round(U.clamp(c.aficion + off + m.bonos[i], 0, 100)), bono: m.bonos[i] };
    });
  }
  const R_BARRIO = 7.4;
  function centros(st) {
    const id = st.equipos[st.clubId].id, h = U.hash(id + 'centros');
    return [0, 1, 2, 3, 4, 5].map(i => { const a = i * Math.PI / 3 + 0.3 + (((h >>> i) % 9) - 4) * 0.05, r = 15 + (((h >>> (i + 6)) % 5) - 2) * 1.0; return { x: Math.cos(a) * r * 1.3, z: Math.sin(a) * r * 0.95, a }; });
  }
  function lugares(st) {
    const eq = st.equipos[st.clubId], h = U.hash(eq.id + 'mapa'), cs = centros(st), out = [];
    const colocar = (tipo, i, ang, rad) => { const c = cs[i], x = c.x + Math.cos(ang) * rad, z = c.z + Math.sin(ang) * rad; out.push({ id: tipo + '-' + i, tipo, barrio: i, x, z, rot: Math.atan2(c.x - x, c.z - z), nombre: NOM_LUGAR[tipo] }); return out[out.length - 1]; };
    out.push({ id: 'ayuntamiento-1', tipo: 'ayuntamiento', barrio: 1, x: 0, z: 0, rot: 0, nombre: NOM_LUGAR.ayuntamiento });
    const pi = h % 6, ci = (pi + 2 + (h >>> 7) % 3) % 6, base = i => ((h >>> i) % 6) * 1.05 + 0.8;
    colocar('pabellon', pi, base(pi) + Math.PI / 2, 3.0).nombre = eq.pabellon.nombre;
    colocar('campus', ci, base(ci) + Math.PI / 2, 3.1).nombre = eq.ciudadDeportiva ? eq.ciudadDeportiva.nombre : 'Campus del club';
    REPARTO.forEach((r, i) => r.forEach((t, j) => { if (out.some(o => o.id === t + '-' + i)) return; colocar(t, i, base(i) + (j ? Math.PI : 0) + (i === pi || i === ci ? Math.PI * 0.12 : 0), 3.4); }));
    return out;
  }
  function acciones(st, lugarId) {
    const l = lugares(st).find(x => x.id === lugarId); if (!l) return [];
    const m = mapa(st), e = esc(st, st.clubId), ult = m.lugares[lugarId];
    if (st.modo === 'carrera') {
      return ACC_J[l.tipo].map(a => { const u2 = m.lugares[lugarId + ':' + a.id], resta = u2 ? a.cd - U.diffDays(u2, st.fecha) : 0; return Object.assign({}, a, { coste: a.coste, jugador: true, disponible: resta <= 0 && st.carrera.fase !== 'retirado' && !(a.coste && st.carrera.dinero < a.coste), motivo: resta > 0 ? 'Disponible en ' + resta + ' días' : (a.coste && st.carrera.dinero < a.coste ? 'Te faltan ahorros' : null) }); });
    }
    const extra = (st.fans && st.fans.identidad && st.fans.identidad.mascota && (l.tipo === 'colegio' || l.tipo === 'hospital')) ? [{ id: 'mascota', t: 'Visita de ' + st.fans.identidad.mascota.nombre + ' (la mascota)', coste: 4000, cd: 25, ef: { barrio: 7, aficion: 1, apoyo: 1 } }] : [];
    return ACC[l.tipo].concat(extra).map(a => {
      const resta = ult ? a.cd - U.diffDays(ult, st.fecha) : 0, usaInf = a.influencia && pres(st);
      return Object.assign({}, a, { coste: usaInf ? 0 : Math.round(a.coste * e / 1000) * 1000, usaInfluencia: !!usaInf, disponible: resta <= 0, motivo: resta > 0 ? 'Disponible en ' + resta + ' días' : null });
    });
  }
  function hacer(st, lugarId, accionId) {
    const l = lugares(st).find(x => x.id === lugarId), a = acciones(st, lugarId).find(x => x.id === accionId);
    if (!l || !a) return { ok: false, motivo: 'Actividad no disponible.' };
    if (!a.disponible) return { ok: false, motivo: a.motivo };
    if (st.modo === 'carrera') {
      const c2 = st.carrera, m2 = mapa(st), e2 = a.ef, p2 = st.jugadores.yo;
      if (a.coste) c2.dinero -= a.coste;
      if (e2.barrio) m2.bonos[l.barrio] = U.clamp(m2.bonos[l.barrio] + e2.barrio, -30, 40);
      if (e2.fama) c2.fama = U.clamp(c2.fama + e2.fama, 0, 100);
      if (e2.moral) c2.moral = U.clamp(c2.moral + e2.moral, 0, 100);
      if (e2.xp) p2.xp = (p2.xp || 0) + e2.xp;
      m2.lugares[lugarId + ':' + a.id] = st.fecha;
      GM.noticia(st, a.t + ' (' + nombresBarrios(st.equipos[st.clubId])[l.barrio] + ').');
      return { ok: true };
    }
    const F = GM.mods.finanzas, club = st.clubId, c = st.ciudad[club], m = mapa(st);
    if (a.usaInfluencia) { const g = GM.mods.legado.gastar(st, a.influencia, 'alcalde'); if (!g.ok) return g; }
    else if (a.coste && F) { if (st.finanzas[club].caja < a.coste) return { ok: false, motivo: 'No hay caja para ' + U.eur(a.coste) + '.' }; F.registrar(st, club, a.t + ', ' + l.nombre, -a.coste); }
    const ef = a.ef;
    if (ef.barrio) m.bonos[l.barrio] = U.clamp(m.bonos[l.barrio] + ef.barrio, -30, 40);
    if (ef.aficion) c.aficion = U.clamp(c.aficion + ef.aficion, 0, 100);
    if (ef.ambiente) c.ambiente = U.clamp(c.ambiente + ef.ambiente, 0, 100);
    if (ef.apoyo) c.apoyoAyuntamiento = U.clamp(c.apoyoAyuntamiento + ef.apoyo, 0, 100);
    if (pres(st) && GM.mods.legado.ajustar) GM.mods.legado.ajustar(st, ef.pil || {}, ef.alma || 0);
    m.lugares[lugarId] = st.fecha;
    GM.noticia(st, a.t + ' en ' + nombresBarrios(st.equipos[club])[l.barrio] + '.');
    return { ok: true };
  }
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !st.ciudad || !st.ciudad[st.clubId] || !st.ciudad[st.clubId].mapa) return;
    if (U.weekday(st.fecha) === 1) { const m = st.ciudad[st.clubId].mapa; m.bonos = m.bonos.map(b => Math.abs(b) < 0.3 ? 0 : b * 0.97); }
  });

  // ---------- Vista ----------
  const col = hex => GM.kit.color(hex);
  function modeloLugar(g, tipo, S) {
    const k = GM.kit, B = (w, h, d, c, x, y, z) => g.add(k.caja(w, h, d, c, x, y, z));
    if (tipo === 'colegio') { B(3, 0.9, 1.4, 0xf0c64a, 0, 0, 0); B(3.1, 0.1, 1.5, 0xb5543c, 0, 0.9, 0); B(1.2, 0.03, 1, 0xd9783a, 0, 0, 1.6); }
    else if (tipo === 'hospital') { B(2.6, 1.8, 2.2, 0xf4f6f8, 0, 0, 0); B(0.7, 0.2, 0.05, 0xd62d2d, 0, 1.4, 1.12); B(0.2, 0.7, 0.05, 0xd62d2d, 0, 1.15, 1.12); B(2.7, 0.1, 2.3, 0xcfd6dc, 0, 1.8, 0); }
    else if (tipo === 'plaza') { B(4, 0.04, 4, 0xdcd3bd, 0, 0, 0); g.add(k.cilindro(0.6, 0.25, 0x7fb8d8, 0, 0, 0, 12)); g.add(k.cilindro(0.08, 0.7, 0xdfe3e8, 0, 0.2, 0, 6)); g.add(k.arbol(-1.5, -1.5, 1)); g.add(k.arbol(1.5, 1.5, 1)); g.add(k.arbol(1.5, -1.5, 0.9)); }
    else if (tipo === 'pena') { B(2.2, 0.9, 1.6, S.c1, 0, 0, 0); B(2.4, 0.1, 0.8, S.c2, 0, 0.7, 1.0); B(2.3, 0.1, 1.7, 0x2c3138, 0, 0.9, 0); }
    else if (tipo === 'comercio') { [-1.1, 0, 1.1].forEach((x, i) => { B(0.95, 0.8, 1.4, [0xf2e6d0, 0xe0c9a0, 0xd9c2a0][i], x, 0, 0); B(1.0, 0.08, 0.5, [0xd94f4f, 0x4a90d9, 0x4cc38a][i], x, 0.6, 0.85); }); }
    else if (tipo === 'estacion') { B(3.6, 0.7, 1.4, 0xc9ced6, 0, 0, -0.6); B(3.8, 0.1, 1.6, 0x4b5866, 0, 0.7, -0.6); B(4.2, 0.03, 0.12, 0x333333, 0, 0, 1.0); B(4.2, 0.03, 0.12, 0x333333, 0, 0, 1.4); B(1.5, 0.35, 0.5, S.c1, -0.8, 0.05, 1.2); }
    else if (tipo === 'ayuntamiento') { B(3.2, 1.1, 1.8, 0xe3d9c6, 0, 0, 0); for (let i = 0; i < 5; i++) B(0.14, 1.0, 0.14, 0xf8f9fb, -1.2 + i * 0.6, 0, 1.0); B(0.8, 1.8, 0.8, 0xd9cfba, 0, 1.1, -0.2); B(0.5, 0.5, 0.05, 0xf8f9fb, 0, 2.2, 0.22); B(3.4, 0.1, 2.0, 0x8a7a66, 0, 1.1, 0); }
    else if (tipo === 'pabellon') { B(3.8, 1.0, 3.0, 0xb9c4c9, 0, 0, 0); const r = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3.8, 14, 1, false, 0, Math.PI), k.mat(S.c1)); r.rotation.z = Math.PI / 2; r.position.set(0, 1.0, 0); g.add(r); for (let i = 0; i < 6; i++) B(0.4, 1.0, 0.05, i % 2 ? S.c2 : S.c1, -1.5 + i * 0.6, 0, 1.52); }
    else if (tipo === 'campus') { B(4, 0.04, 4, 0x8cc075, 0, 0, 0); B(1.2, 0.7, 1, 0xdfe3e8, -1, 0, -0.8); B(1.2, 0.5, 1, S.c1, 0.9, 0, -0.8); B(1.4, 0.4, 0.9, 0xc98d4f, 0, 0, 1.1); g.add(k.cilindro(0.03, 1.4, 0xdfe3e8, 1.6, 0, 1.6, 5)); B(0.4, 0.22, 0.02, S.c2, 1.8, 1.1, 1.6); }
  }
  function escenaMapa(st) {
    const K = GM.kit, v = V.vista, eq = st.equipos[st.clubId], CP = GM.campus, c = st.ciudad[st.clubId];
    const S = { c1: col(eq.colores[0] === '#000000' ? '#333333' : eq.colores[0]), c2: col(eq.colores[1] || '#ffffff'), e: CP.estilo(eq) };
    const bar = barrios(st), lug = lugares(st), cs = centros(st), W = V.mundo, hh = U.hash(eq.id + 'ciudad');
    v.limpiar(W); V.lugares = []; V.suelos = [];
    // Terreno: llano donde está la ciudad y junto al río, lomas suaves alrededor (antes, una caja plana)
    const sem = (hh % 97) + 1, zRio = x => 27 + 3.4 * Math.sin(x * 0.2);
    const alt = (x, z) => { const r = Math.hypot(x / 1.25, z), t = Math.min(1, Math.max(0, (r - 30) / 20)), cerca = Math.max(0, 1 - Math.abs(z - zRio(x)) / 7); return -0.05 + t * t * (1 + K.ruido(x * 0.05 + sem, z * 0.05) * 5) * (1 - cerca); };
    W.add(K.relieve(190, 150, 90, alt, (x, z, y) => { const n = K.ruido(x * 0.07 + 3, z * 0.07), b = n > 0.68 ? [0.66, 0.68, 0.43] : n < 0.3 ? [0.4, 0.58, 0.34] : [0.5, 0.69, 0.41], f = 0.93 + K.ruido(x * 0.6, z * 0.6) * 0.14; return [b[0] * f, b[1] * f, b[2] * f]; }));
    // río con meandros al sur, con orillas de arena
    const rio = []; for (let x = -95; x <= 95; x += 6) rio.push([x, zRio(x)]);
    W.add(K.cinta(rio, 6.2, 0xcfc39a, 0.0)); W.add(K.cinta(rio, 3.8, 0x6fb0d4, 0.015));
    // calles: del centro a cada barrio y entre barrios vecinos (sin ángulos rectos)
    const tint = [0xd8d2c0, 0xcfd6c7, 0xd9cdb8, 0xc8d1d6, 0xdad4c6, 0xd0cfc2], heat = V.calor ? (a => a >= 60 ? 0x6fcf97 : a >= 40 ? 0xf2d16b : 0xe27b6c) : null;
    cs.forEach((q, i) => { W.add(K.cinta(K.curvaEntre([0, 0], [q.x, q.z], 0.1, i + sem), 1.9, 0x59616b, 0.03)); const n = cs[(i + 1) % 6]; W.add(K.cinta(K.curvaEntre([q.x, q.z], [n.x, n.z], 0.16, i + 20 + sem), 1.4, 0x6b7480, 0.025)); });
    W.add(K.mancha(4.6, 0xdcd3bd, 0, 0.0, 0, sem, 1, 1, 0.04, 0.08)); CP.disco(W, 1.3, 0x7fb8d8, 0, 0.05, 0, 1, 1, 0.3);
    cs.forEach((q, i) => { const d = K.mancha(R_BARRIO, heat ? heat(bar[i].aficion) : tint[i], q.x, -0.02, q.z, i * 3 + sem, 1, 1, 0.05, 0.16); d.userData = { barrio: i }; W.add(d); V.suelos.push(d); });
    // lugares y sus senderos
    lug.forEach(l => {
      const g = new THREE.Group(); g.position.set(l.x, 0.06, l.z); g.rotation.y = l.rot; modeloLugar(g, l.tipo, S);
      const disp = acciones(st, l.id).some(a => a.disponible), marca = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 4), K.mat(disp ? 0x4cc38a : 0x8a939c)); marca.rotation.x = Math.PI; marca.position.set(0, 3.4, 0); g.add(marca);
      marca.userData.anim = t => { marca.position.y = 3.2 + Math.sin(t * 2 + l.x) * 0.25; marca.rotation.y = t; };
      g.userData = { lugar: l.id }; W.add(g); V.lugares.push(g);
      const c0 = cs[l.barrio]; if (l.id !== 'ayuntamiento-1') W.add(K.cinta(K.curvaEntre([c0.x, c0.z], [l.x, l.z], 0.2, l.x * 7 + l.z), 0.9, 0xd7cdb4, 0.06));
    });
    // casas dispersas, giradas y más altas cerca del centro de cada barrio
    cs.forEach((q, i) => {
      const b = bar[i];
      for (let n = 0; n < 30; n++) {
        const h = U.hash(eq.id + 'ca' + i + '-' + n) >>> 0, a = (h % 628) / 100, rr = 1.7 + ((h >>> 9) % 55) / 10, x = q.x + Math.cos(a) * rr, z = q.z + Math.sin(a) * rr;
        if (lug.some(l => Math.hypot(l.x - x, l.z - z) < 2.7) || Math.hypot(x, z) < 5.4) continue;
        const ht = 0.7 + (R_BARRIO - rr) * 0.16 + ((h >>> 14) % 4) * 0.22, tam = 1.25 + ((h >>> 3) % 6) * 0.1, rot = Math.atan2(q.x - x, q.z - z) + (((h >>> 6) % 5) - 2) * 0.12;
        const g = new THREE.Group(); g.position.set(x, 0.07, z); g.rotation.y = rot; W.add(g);
        g.add(K.caja(tam, ht, tam, S.e.muro[h % 2], 0, 0, 0)); g.add(K.caja(tam + 0.1, 0.1, tam + 0.1, S.e.techo, 0, ht, 0));
        if (((h >>> 5) % 100) < b.aficion * 0.9 - 8) { g.add(K.cilindro(0.025, 0.7, 0xdfe3e8, tam / 2 - 0.1, ht + 0.1, tam / 2 - 0.1, 4)); g.add(K.caja(0.4, 0.22, 0.02, (h >>> 3) % 2 ? S.c1 : S.c2, tam / 2 + 0.1, ht + 0.7, tam / 2 - 0.1)); }
        if (((h >>> 9) % 100) < b.aficion * 0.5 - 14) g.add(K.caja(tam * 0.8, 0.3, 0.03, S.c1, 0, ht * 0.5, tam / 2 + 0.03));
      }
      if (b.aficion < 35) { const p = K.caja(1.8, 0.45, 0.04, 0xd62d2d, q.x, 0.5, q.z + R_BARRIO - 1.2); p.rotation.y = q.a; W.add(p); }
      // parque entre este barrio y el siguiente
      const n2 = cs[(i + 1) % 6], px = (q.x + n2.x) / 2 * 1.35, pz = (q.z + n2.z) / 2 * 1.35;
      W.add(K.mancha(3.0, 0x8cc075, px, -0.01, pz, i + 40 + sem, 1.2, 0.85, 0.06, 0.22)); for (let t = 0; t < 7; t++) W.add(t % 2 ? K.arbol(px + Math.cos(t * 0.9 + i) * 2.0, pz + Math.sin(t * 0.9 + i) * 2.0, 1.0) : K.arbolRedondo(px + Math.cos(t * 0.9 + i) * 2.0, pz + Math.sin(t * 0.9 + i) * 2.0, 1.2));
    });
    // vivienda del jugador
    const viv = st.modo === 'carrera' && st.carrera && st.carrera.vivienda && st.carrera.vivienda.actual;
    if (viv && viv.ciudad === eq.ciudad) { const q = cs[viv.barrio], g = new THREE.Group(); g.position.set(q.x - 1.2, 0.07, q.z + 4.6); g.add(K.caja(1.6, 1.1, 1.4, 0xf2e6d0, 0, 0, 0)); g.add(K.caja(1.8, 0.12, 1.6, S.c1, 0, 1.1, 0)); g.add(K.cilindro(0.03, 1.3, 0xdfe3e8, 0.7, 1.1, 0.6, 4)); g.add(K.caja(0.5, 0.3, 0.02, S.c2, 0.95, 2.1, 0.6)); g.userData = { casa: true }; W.add(g); const m = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 4), K.mat(0xffd54a)); m.rotation.x = Math.PI; m.position.set(0, 3.0, 0); g.add(m); m.userData.anim = t => { m.position.y = 2.9 + Math.sin(t * 2.4) * 0.2; m.rotation.y = t; }; }
    for (let i = 0; i < 110; i++) { const h = U.hash(eq.id + 'ar' + i) >>> 0, a = (h % 628) / 100, rr = 33 + ((h >>> 8) % 26), x = Math.cos(a) * rr * 1.3, z = Math.sin(a) * rr * 0.9; if (Math.abs(z - zRio(x)) < 3.5) continue; const ar = h % 3 ? K.arbol(x, z, 1.3) : K.arbolRedondo(x, z, 1.6, [0x4f8f45, 0x6b9a3e][h % 2]); ar.position.y = alt(x, z); W.add(ar); }
    if (V.sel && V.sel.lugar) { const l = lug.find(x => x.id === V.sel.lugar); if (l) { const r = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.85, 24), K.mat(0xffd54a)); r.rotation.x = -Math.PI / 2; r.position.set(l.x, 0.2, l.z); W.add(r); } }
    K.fusionar(W);
    const an = []; W.traverse(o => { if (o.userData && typeof o.userData.anim === 'function') an.push(o.userData.anim); });
    v.anim = an.length && CP.config.calidad === 'alta' ? (t => an.forEach(f => f(t))) : null;
    if (CP.config.calidad === 'alta') K.sombrear(W);
    CP.ambiente(v, 'dia'); V.pos = { cs };
  }
  // ---------- Vista de calle ----------
  const FRASES = {
    alta: ['¡Este año vamos a por todo!', 'Mi hijo quiere entrar en la cantera.', 'El pabellón está siempre lleno, ¡qué ambiente!', 'Esta camiseta ya es de la familia.'],
    media: ['Hay equipo, pero falta regularidad.', 'Voy a algún partido, no a todos.', 'Si ganan, vuelvo.', 'El club podría hacer más por el barrio.'],
    baja: ['Ya no me siento parte del club.', 'Suben las entradas y no veo al equipo por aquí.', 'Deberíais volver al barrio.', 'Antes esto era otra cosa.']
  };
  function frase(st, b) {
    const base = FRASES[b.aficion >= 65 ? 'alta' : b.aficion >= 40 ? 'media' : 'baja'], club = st.clubId;
    const ult = GM.mods.competiciones.calendarioClub(st, club).filter(g => g.resultado).slice(-1)[0];
    if (ult && GM.rng.next() < 0.4) { const local = ult.local === club, gano = (ult.resultado.local > ult.resultado.visitante) === local; return gano ? '¡Menuda victoria el otro día!' : 'Vaya derrota la del último partido...'; }
    return GM.rng.pick(base);
  }
  function persona(W, S, x, z, col, cam, msg) {
    // Persona real (modelos de la sede) con la figura de cajas mientras carga o si no hay modelos
    const K = GM.kit, prim = new THREE.Group();
    prim.add(K.caja(0.2, 0.34, 0.14, col, 0, 0.16, 0)); prim.add(K.cilindro(0.075, 0.14, 0xe0b48f, 0, 0.5, 0, 8)); prim.add(K.caja(0.18, 0.18, 0.12, 0x2f3a46, 0, 0, 0));
    const g = GM.sede && GM.sede.figura ? GM.sede.figura({ semilla: U.hash('cp' + x + ',' + z + ',' + col + ',' + (V ? V.personas.length : 0)), ropa: [col, 0x2f3a46], suelo: 0.02 }, 0.62, prim, V && V.vista) : prim;
    g.position.set(x, 0.1, z); Object.assign(g.userData, { persona: true, msg }); W.add(g); return g;
  }
  // La calle serpentea: z(x) sinusoidal. Todo se coloca siguiendo su tangente y su normal.
  const curva = x => 3.4 * Math.sin(x * 0.085), pend = x => 3.4 * 0.085 * Math.cos(x * 0.085);
  function marco(x) { const m = pend(x), l = Math.hypot(1, m), tx = 1 / l, tz = m / l; return { x, z: curva(x), tx, tz, nx: -tz, nz: tx }; }
  function escenaCalles(st) {
    const K = GM.kit, v = V.vista, eq = st.equipos[st.clubId], CP = GM.campus, c = st.ciudad[st.clubId], W = V.mundo;
    const S = { c1: col(eq.colores[0] === '#000000' ? '#333333' : eq.colores[0]), c2: col(eq.colores[1] || '#ffffff'), e: CP.estilo(eq) };
    const bi = V.barrio || 0, bar = barrios(st), b = bar[bi], afi = b.aficion, lug = lugares(st).filter(l => l.barrio === bi);
    v.limpiar(W); V.lugares = []; V.suelos = []; V.personas = [];
    W.add(K.caja(160, 0.3, 90, 0x7a8791, 0, -0.34, 0));
    for (let x = -38; x < 38; x += 3) {
      const p = marco(x), q = marco(x + 3);
      CP.camino(W, p.x, p.z, q.x, q.z, 3.6, 0x3d444c, 0.0);
      CP.camino(W, p.x + (q.x - p.x) * 0.2, p.z + (q.z - p.z) * 0.2, p.x + (q.x - p.x) * 0.7, p.z + (q.z - p.z) * 0.7, 0.1, 0xf2f2f2, 0.02);
      [-1, 1].forEach(s => CP.camino(W, p.x + p.nx * s * 2.8, p.z + p.nz * s * 2.8, q.x + q.nx * s * 2.8, q.z + q.nz * s * 2.8, 2.2, 0xb9b3a6, 0.03));
    }
    for (let k = -4; k <= 4; k++) { const f = marco(0); CP.camino(W, f.x - f.tx * 0.1 + f.tx * k * 0.5 - f.nx * 1.7, f.z + f.tz * k * 0.5 - f.nz * 1.7, f.x + f.tx * k * 0.5 + f.nx * 1.7, f.z + f.tz * k * 0.5 + f.nz * 1.7, 0.32, 0xf2f2f2, 0.035); }
    const colA = [0xd94f4f, 0x4a90d9, 0x4cc38a, 0xf2c14e, 0x9b59b6];
    for (const side of [-1, 1]) for (let i = -8; i <= 8; i++) {
      const h = U.hash(eq.id + 'ed' + bi + side + i) >>> 0, xi = i * 4.3 + (((h >>> 20) % 5) - 2) * 0.2, f = marco(xi), alt = 2.2 + (h % 5) * 0.9, gb = new THREE.Group();
      gb.position.set(f.x + f.nx * side * (6.1 + ((h >>> 22) % 3) * 0.35), 0, f.z + f.nz * side * (6.1 + ((h >>> 22) % 3) * 0.35));
      gb.rotation.y = Math.atan2(-side * f.nx, -side * f.nz) + (((h >>> 24) % 5) - 2) * 0.03;
      CP.F(gb, 3.9, alt, 4, (h >>> 4) % 2 ? 'oficina' : 'casa', S.e.muro[(h >>> 3) % 2], 0, 0, 0); gb.add(K.caja(4.0, 0.12, 4.1, S.e.techo, 0, alt, 0));
      gb.add(K.caja(3.2, 0.08, 0.9, colA[(h >>> 7) % 5], 0, 1.25, 2.4)); gb.add(K.caja(3.0, 1.0, 0.05, 0x233447, 0, 0.14, 2.03));
      if (afi >= 60 && (i === -1 || i === 3)) CP.rotulo(gb, eq.siglas, 2.6, 1.3, S.c1, 0xffffff, 0, 2.6, 2.04);
      if (viv(st, bi) && side === 1 && i === 2) { gb.add(K.caja(4.1, 0.2, 0.1, 0xffd54a, 0, alt + 0.2, 2.1)); gb.userData = { casa: true }; }
      W.add(gb);
      if ((h >>> 11) % 3 === 0) { const t = marco(xi + 1.6); W.add(K.arbol(t.x + t.nx * side * 3.2, t.z + t.nz * side * 3.2, 0.9)); }
    }
    for (let i = -9; i <= 9; i += 2) { const f = marco(i * 3.1), s = i % 4 ? 1 : -1; CP.foco(W, f.x + f.nx * s * 2.4, 1.9, f.z + f.nz * s * 2.4); }
    const nB = afi >= 75 ? 5 : afi >= 55 ? 3 : afi >= 40 ? 1 : 0;
    for (let q = 0; q < nB; q++) { const f = marco(-12 + q * 6); CP.camino(W, f.x - f.nx * 5.7, f.z - f.nz * 5.7, f.x + f.nx * 5.7, f.z + f.nz * 5.7, 0.04, 0x888888, 3.2); for (let t = -5; t <= 5; t++) { const bnd = K.caja(0.2, 0.28, 0.01, (t + 9) % 2 ? S.c1 : S.c2, f.x + f.nx * t, 2.92, f.z + f.nz * t); bnd.rotation.y = Math.atan2(f.nx, f.nz); W.add(bnd); } }
    lug.slice(0, 2).forEach((l, j) => {
      const f = marco(j ? 25 : -25), g = new THREE.Group(); g.position.set(f.x, 0.05, f.z); g.rotation.y = Math.atan2(-f.tx * (j ? 1 : -1), -f.tz * (j ? 1 : -1)); g.scale.set(1.5, 1.5, 1.5); modeloLugar(g, l.tipo, S);
      const disp = acciones(st, l.id).some(a => a.disponible), marca = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 4), K.mat(disp ? 0x4cc38a : 0x8a939c));
      marca.rotation.x = Math.PI; g.add(marca); marca.userData.anim = t => { marca.position.y = 3.3 + Math.sin(t * 2 + j) * 0.25; marca.rotation.y = t; };
      g.userData = { lugar: l.id }; W.add(g); V.lugares.push(g);
    });
    [0xd94f4f, 0x4a90d9, 0xeeeeee].forEach((cc, i) => { const g = new THREE.Group(); g.add(K.caja(0.7, 0.26, 1.3, cc, 0, 0.06, 0)); g.add(K.caja(0.6, 0.2, 0.6, 0x24303c, 0, 0.32, -0.05)); W.add(g); const dir = i % 2 ? 1 : -1;
      g.userData.anim = t => { const x = (((t * 2.2 + i * 17) % 70) - 35) * dir, f = marco(x); g.position.set(f.x + f.nx * dir * 0.8, 0, f.z + f.nz * dir * 0.8); g.rotation.y = Math.atan2(f.tx * dir, f.tz * dir); }; });
    const n = 10 + Math.round(c.ambiente / 6) + Math.round(afi / 10), neutros = [0x7a8791, 0x3c5a7a, 0x8a6a4a, 0x5b7f5b, 0xb0a28a, 0x6b4a6b];
    for (let i = 0; i < n; i++) {
      const h = U.hash(eq.id + 'p' + bi + i) >>> 0, hincha = (h % 100) < afi * 0.85, camisa = hincha ? ((h >>> 5) % 2 ? S.c1 : S.c2) : neutros[(h >>> 5) % 6];
      const p = persona(W, S, 0, 0, camisa, null, null), lane = ((h >>> 9) % 2 ? 1 : -1) * (2.2 + ((h >>> 12) % 3) * 0.35), vel = 0.5 + ((h >>> 15) % 5) * 0.12, dir = (h >>> 18) % 2 ? 1 : -1;
      p.userData.msg = null; p.userData.barrio = b;
      p.userData.mover = t => { const x = ((((t * vel * dir + i * 6.3) % 70) + 70) % 70) - 35, f = marco(x); p.position.set(f.x + f.nx * lane, p.userData.real ? 0.02 : 0.1 + Math.abs(Math.sin(t * 6 + i)) * 0.03, f.z + f.nz * lane); p.rotation.y = Math.atan2(f.tx * dir, f.tz * dir); };
      V.personas.push(p);
    }
    if (afi < 35) { const f = marco(-3); for (let i = 0; i < 5; i++) { const px = f.x + f.tx * i * 0.5 + f.nx * 1.2, pz = f.z + f.tz * i * 0.5 + f.nz * 1.2, p = persona(W, S, px, pz, 0xd94f4f, null, null); p.userData.barrio = b; W.add(K.caja(0.5, 0.3, 0.03, 0xd62d2d, px, 0.95, pz)); W.add(K.cilindro(0.015, 0.6, 0xdfe3e8, px, 0.45, pz, 4)); } }
    K.fusionar(W);
    const an = []; W.traverse(o => { if (o.userData && typeof o.userData.anim === 'function') an.push(o.userData.anim); });
    v.anim = t => an.forEach(f => f(t));
    if (CP.config.calidad === 'alta') K.sombrear(W);
    CP.ambiente(v, V.hora || 'dia'); V.pos = null;
  }
  function viv(st, bi) { const x = st.modo === 'carrera' && st.carrera && st.carrera.vivienda && st.carrera.vivienda.actual; return !!x && x.barrio === bi && x.ciudad === st.equipos[st.clubId].ciudad; }
  // Un solo mundo: el mapa es la ciudad que se pasea (calle3d.js + ciudad_barrios.js) vista desde arriba. Cada lugar del mapa lleva una
  // marca sobre su edificio (las mismas actividades que dentro) y cada barrio una superficie que se toca (y se tiñe con la afición).
  const paseable = () => !!(GM.calle && GM.ciudadBarrios && GM.sede && GM.sede.motor);
  const ZONA_LUGAR = { colegio: 'lugar_colegio', hospital: 'lugar_hospital', estacion: 'lugar_estacion', campus: 'lugar_campus', pena: 'pena', ayuntamiento: 'ayuntamiento', pabellon: 'pabellon', plaza: 'mercado', comercio: 'tienda' };
  const RECT_BARRIO = [[-42, -24, 42, 24], [3, -110, 150, -33], [-42, 24, 42, 64], [-150, -27, -42, 24], [42, -27, 150, 24], [-150, -110, -3, -33]];
  function mapaPaseable(st) {
    const K = GM.kit, v = V.vista, W = V.mundo, bar = barrios(st), heat = a => a >= 60 ? 0x6fcf97 : a >= 40 ? 0xf2d16b : 0xe27b6c;
    const clave = [V.calor, bar.map(b => b.aficion).join(','), (GM.mods.hogar && GM.mods.hogar.viviendas ? GM.mods.hogar.viviendas(st).map(x => x.id + x.actual).join(',') : '')].join('|');
    if (V.claveMapa === clave && V.posLugar) { marcarSeleccion(); return; }
    V.claveMapa = clave; v.limpiar(W); V.lugares = []; V.suelos = []; V.posLugar = {};
    const Sx = { mundo: W, scene: v.scene, camera: v.camera, st, dia: { tipo: 'normal', texto: '' } };
    GM.calle.construir(Sx, GM.sede.motor(), st);
    W.traverse(o => { if (o.userData && (o.userData.sala || o.userData.etiqueta)) o.visible = false; });
    v.scene.fog = null; v.camera.far = 1000; v.camera.updateProjectionMatrix();
    RECT_BARRIO.forEach((r, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r[2] - r[0], r[3] - r[1]).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: V.calor ? heat(bar[i].aficion) : 0xffd54a, transparent: true, opacity: V.calor ? 0.38 : 0, depthWrite: false })); m.position.set((r[0] + r[2]) / 2, 0.3, (r[1] + r[3]) / 2); m.userData = { barrio: i }; m.renderOrder = 2; W.add(m); V.suelos.push(m); });
    const zs = Sx.zonas || [], cuenta = {};
    lugares(st).forEach(l => {
      const z = zs.find(q => q.sala.id === ZONA_LUGAR[l.tipo]); if (!z) return; const k = cuenta[l.tipo] = (cuenta[l.tipo] || 0) + 1;
      const x = z.obj.position.x + (k - 1) * 3.2, zz = z.obj.position.z, g = new THREE.Group(); g.position.set(x, 0, zz);
      const disp = acciones(st, l.id).some(a => a.disponible), marca = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 4), K.mat(disp ? 0x4cc38a : 0x8a939c)); marca.rotation.x = Math.PI; marca.position.y = 13; g.add(marca);
      marca.userData.anim = t => { marca.position.y = 12.5 + Math.sin(t * 2 + x) * 0.8; marca.rotation.y = t; };
      g.userData = { lugar: l.id }; W.add(g); V.lugares.push(g); V.posLugar[l.id] = [x, zz];
    });
    const an = []; W.traverse(o => { if (o.userData && typeof o.userData.anim === 'function') an.push(o.userData.anim); });
    v.anim = an.length && GM.campus.config.calidad === 'alta' ? (t => an.forEach(f => f(t))) : null;
    if (GM.campus.config.calidad === 'alta') K.sombrear(W);
    V.pos = { cs: RECT_BARRIO.map(r => ({ x: (r[0] + r[2]) / 2, z: (r[1] + r[3]) / 2 })) };
    marcarSeleccion();
  }
  // Selección sin reconstruir la ciudad: aro sobre el lugar o barrio resaltado, y la cámara se acerca
  function marcarSeleccion() {
    const W = V.mundo; if (V.aro) { W.remove(V.aro); V.aro = null; }
    V.suelos.forEach((m, i) => { if (!V.calor) m.material.opacity = V.sel && V.sel.barrio === i ? 0.22 : 0; });
    if (V.sel && V.sel.lugar && V.posLugar[V.sel.lugar]) { const [x, z] = V.posLugar[V.sel.lugar]; V.aro = new THREE.Mesh(new THREE.RingGeometry(3.4, 4.2, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd54a })); V.aro.position.set(x, 0.4, z); W.add(V.aro); enfocar(x, z, 60); }
    else if (V.sel && V.sel.barrio !== undefined && V.pos) { const c = V.pos.cs[V.sel.barrio]; enfocar(c.x, c.z, 110); }
  }
  function escena(st) { if (V.modo === 'calles') escenaCalles(st); else if (paseable()) { try { mapaPaseable(st); } catch (e) { console.warn('ciudad paseable en el mapa', e); V.claveMapa = null; escenaMapa(st); } } else escenaMapa(st); }
  function camara(modo) {
    const v = V.vista; if (!v) return;
    clearInterval(V.tw);
    if (modo === 'calles') { v.target.set(0, 0.8, 0); v.radio = 15; v.phi = 1.3; v.theta = 0.35; } else if (paseable()) { v.target.set(0, 0, -20); v.radio = 170; v.phi = 0.75; v.theta = 0.5; } else { v.target.set(0, 0, 0); v.radio = 40; v.phi = 0.75; v.theta = 0.5; }
    v.place();
  }
  function enfocar(x, z, radio) {
    const v = V && V.vista; if (!v) return;
    const x1 = v.target.x, z1 = v.target.z, r1 = v.radio; let i = 0; clearInterval(V.tw);
    V.tw = setInterval(() => { i++; const k = i / 10, e = k * (2 - k); v.target.set(x1 + (x - x1) * e, 0, z1 + (z - z1) * e); v.radio = r1 + (radio - r1) * e; v.place(); if (i >= 10) clearInterval(V.tw); }, 30);
  }
  function panel(st) {
    const h = GM.h, P = V.panel; P.innerHTML = '';
    const eq = st.equipos[st.clubId], c = st.ciudad[st.clubId], bar = barrios(st), lug = lugares(st), msg = h('div', { class: 'aviso', style: { display: 'none' } });
    const resp = r => { if (!r.ok) { msg.style.display = 'block'; msg.textContent = r.motivo; } else { GM.ui && GM.ui.toast && GM.ui.toast('Hecho'); V.refrescar(); if (GM.ui && GM.ui.cabecera) GM.ui.cabecera(); } };
    P.append(h('div', { class: 'fila' }, h('b', null, eq.ciudad), h('span', { class: 'muted' }, 'Mapa estilizado')));
    P.append(h('div', { class: 'chips' }, st.modo === 'carrera' ? [h('span', { class: 'chip' }, 'Fama ' + Math.round(st.carrera.fama)), h('span', { class: 'chip' }, 'Moral ' + Math.round(st.carrera.moral)), h('span', { class: 'chip' }, 'Ahorros ' + Math.round(st.carrera.dinero).toLocaleString('es-ES') + ' k€')] : [h('span', { class: 'chip' }, 'Afición ' + Math.round(c.aficion)), h('span', { class: 'chip' }, 'Ambiente ' + Math.round(c.ambiente)), h('span', { class: 'chip' }, 'Ayuntamiento ' + Math.round(c.apoyoAyuntamiento)), h('span', { class: 'chip' }, 'Caja ' + U.eur(st.finanzas[st.clubId].caja))]));
    if (V.vista) P.append(h('div', { class: 'seg compacto' },
      [['mapa', '🗺️ Mapa'], ['calles', '🚶 Calle']].map(o => h('button', { class: 'tab' + (V.modo === o[0] ? ' on' : ''), onclick: () => { V.modo = o[0]; V.claveMapa = null; if (o[0] === 'calles' && V.barrio === undefined) V.barrio = 0; camara(o[0]); V.refrescar(); } }, o[1])),
      V.modo === 'mapa' ? h('button', { class: 'tab' + (V.calor ? ' on' : ''), onclick: () => { V.calor = !V.calor; V.refrescar(); } }, '🔥 Afición') : h('button', { class: 'tab', onclick: () => { V.hora = V.hora === 'noche' ? 'dia' : 'noche'; V.refrescar(); } }, V.hora === 'noche' ? '☀️ Día' : '🌙 Noche')));
    P.append(h('div', { class: 'seg compacto' }, bar.map(b => h('button', { class: 'tab' + (V.sel && V.sel.barrio === b.i ? ' on' : ''), onclick: () => { V.sel = { barrio: b.i }; if (V.modo === 'calles') { V.barrio = b.i; camara('calles'); } V.refrescar(); if (V.vista && V.pos && V.modo === 'mapa') { const q = V.pos.cs[b.i]; enfocar(q.x, q.z, 24); } } }, b.nombre))));
    const sel = V.sel;
    if (sel) {
      const i = sel.barrio !== undefined ? sel.barrio : lug.find(x => x.id === sel.lugar).barrio, b = bar[i];
      const mias = lug.filter(x => x.barrio === i || x.id === sel.lugar);
      P.append(h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, b.nombre), h('b', null, 'Afición ' + b.aficion)), h('span', { class: 'barra ' + (b.aficion >= 60 ? 'verde' : b.aficion >= 35 ? 'ambar' : 'rojo') }, h('i', { style: { width: b.aficion + '%' } })),
        h('p', { class: 'muted' }, b.aficion < 35 ? 'Barrio descontento: hay pancartas de protesta.' : b.aficion >= 60 ? 'Barrio muy volcado con el club: banderas y murales por todas partes.' : 'Barrio con opiniones divididas.')));
      mias.forEach(l => P.append(h('div', { class: 'tarjeta' }, h('b', null, l.nombre), h('div', { class: 'lista' }, acciones(st, l.id).map(a => h('div', { class: 'item' }, h('div', { class: 'ct' }, h('b', null, a.t), h('span', { class: 'muted' }, a.motivo || (a.usaInfluencia ? a.influencia + ' de influencia' : a.jugador ? (a.coste ? a.coste + ' mil €' : 'Gratis') : U.eur(a.coste)))), h('button', { class: 'btn peq', disabled: !a.disponible, onclick: () => resp(hacer(st, l.id, a.id)) }, 'Hacer')))))));
    } else P.append(h('p', { class: 'muted' }, V.vista ? 'Toca un lugar del mapa (los conos verdes tienen actividades disponibles) o elige un barrio.' : 'Elige un barrio para ver sus actividades.'));
    P.append(msg);
  }
  function mount(el, st) {
    unmount();
    const h = GM.h, raiz = h('div', { class: 'c3d' }), vistaEl = h('div', { class: 'vista3d' }), panelEl = h('div', { class: 'panel3d' });
    raiz.append(vistaEl, panelEl); el.appendChild(raiz);
    V = { raiz, panel: panelEl, vista: null, mundo: null, st, sel: null, calor: false, modo: 'mapa', barrio: 0, hora: 'dia', lugares: [], suelos: [], personas: [] };
    if (GM.kit && GM.kit.disponible()) {
      try {
        V.vista = GM.kit.crear(vistaEl, { radio: paseable() ? 170 : 40, theta: 0.5, phi: 0.75, min: 6, max: paseable() ? 320 : 70, fondo: 0xa9d6f2, sombras: GM.campus.config.calidad === 'alta' });
        V.mundo = new THREE.Group(); V.vista.scene.add(V.mundo);
        V.vista.onTap = (cx, cy) => {
          const hits = V.vista.pick(cx, cy, V.mundo.children);
          for (const it of hits) { let o = it.object; while (o && !(o.userData && (o.userData.lugar || o.userData.barrio !== undefined || o.userData.persona || o.userData.casa))) o = o.parent; if (!o) continue; if (o.userData.casa) { if (GM.ui && GM.ui.casa) GM.ui.casa(); return; } if (o.userData.persona) { const msg = frase(st, o.userData.barrio || barrios(st)[V.barrio || 0]); if (GM.ui && GM.ui.toast) GM.ui.toast('💬 ' + msg); return; } V.sel = o.userData.lugar ? { lugar: o.userData.lugar } : { barrio: o.userData.barrio }; V.refrescar(); return; }
        };
      } catch (e) { V.vista = null; }
    }
    if (!V.vista) vistaEl.append(h('div', { class: 'vacio' }, 'La vista 3D no está disponible en este dispositivo o sin conexión. Usa la lista de barrios.'));
    V.refrescar = () => { if (V.vista) escena(st); panel(st); };
    V.refrescar(); return true;
  }
  function unmount() { if (!V) return; clearInterval(V.tw); if (V.vista) V.vista.dispose(); if (V.raiz && V.raiz.parentNode) V.raiz.parentNode.removeChild(V.raiz); V = null; }
  function selfTest() {
    const st = { modo: 'gestor', temporada: '2026-27', fecha: '2026-10-01', clubId: 'joventut-badalona', noticias: [], equipos: { 'joventut-badalona': { id: 'joventut-badalona', ciudad: 'Badalona', presupuesto: 14e6, reputacion: 62, pabellon: { nombre: 'Palau Olímpic', aforo: 12500 }, colores: ['#00a859', '#000000'] } }, ciudad: { 'joventut-badalona': { ambiente: 50, aficion: 50, apoyoAyuntamiento: 50, convenios: [], eventos: [] } }, finanzas: { 'joventut-badalona': { caja: 1e6, movimientos: [], patrocinios: [], temp: { ingresos: 0, gastos: 0 }, historial: [] } } };
    const l = lugares(st), cole = l.find(x => x.tipo === 'colegio'), b0 = barrios(st)[cole.barrio].aficion;
    const r1 = hacer(st, cole.id, 'clinic'), r2 = hacer(st, cole.id, 'clinic');
    return l.length >= 14 && l.every((x, i) => l.every((y, j) => i === j || Math.hypot(x.x - y.x, x.z - y.z) > 2.2)) && r1.ok && !r2.ok && barrios(st)[cole.barrio].aficion > b0 && barrios(st)[0].nombre === 'Dalt de la Vila';
  }
  GM.register('ciudad3d', { frase, barrios, lugares, acciones, hacer, mount, unmount, selfTest });
})();
