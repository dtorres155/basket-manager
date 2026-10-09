/* DATOS: plantillas reales 2026-27 (generado por tools/generar_plantillas.js; no lo edites a mano si vas a regenerarlo).
   Se aplican sobre los clubes de datos_ligas.js, datos_ligas2.js y datos_euroliga.js: sustituyen su plantilla (los de relleno solo completan hasta 12).
   Fuentes (ver docs/FUENTES_DATOS.md): acb.com, legabasket.it, esake.gr, sportschau.de (BBL, Euroliga y EuroCup) y la Wikipedia en inglés (liga turca), consultadas en octubre de 2026.
   Reales: nombre, posición (en BBL, Euroliga y EuroCup solo base/alero/pívot; el reparto entre PG/SG y SF/PF es aproximado), nacionalidad, edad y altura.
   ESTIMADOS: valoración, potencial, perfil, salario y fin de contrato (salvo en la Lega, donde el contrato es el publicado).
   Fila: [nombre, pos, edad, altura|0, nac, ovr, pot, perfil, salario M€, fin contrato]; perfil 0 = el jugador ya existía y conserva sus datos. */
(function () {
  const D = GM.data;
  const traspasos = ["houston-rockets-11"];
  traspasos.forEach(id => { const j = D.jugadores[id]; if (!j) return; const e = D.equipos[j.equipoId]; if (e) e.plantilla = e.plantilla.filter(x => x !== id); delete D.jugadores[id]; });
  const R = (club, filas) => {
    const e = D.equipos[club]; if (!e) return;
    const antes = e.plantilla.map(i => D.jugadores[i]), relleno = antes.filter(j => j.ficticio).sort((a, b) => b.ovr - a.ovr);
    const nuevos = filas.map((f, i) => {
      const previo = !f[7] && antes.find(j => !j.ficticio && j.nombre === f[0]);
      if (previo) return previo;
      const h = GM.util.hash(f[0]);
      const p = GM.mkJugador(club, 60 + i, f[0], f[1], f[2], f[3] || GM.alturaPos(f[1], h), f[4], GM.pasaporte(f[4]), f[5], f[6], f[7] || 'E', Math.round(f[8] * 1e6), f[9]);
      p.id = club + '-r' + i; return p;
    });
    antes.forEach(j => { if (nuevos.indexOf(j) < 0) delete D.jugadores[j.id]; });
    const extra = relleno.slice(0, Math.max(0, 12 - nuevos.length));
    extra.forEach(j => { D.jugadores[j.id] = j; });
    nuevos.forEach(j => { D.jugadores[j.id] = j; });
    e.plantilla = nuevos.concat(extra).map(j => j.id);
  };
  // ACB
  R("leyma-coruna", [
    ["Dídac Cuevas","PG",26,0,"ES",66,66,0,0,0],
    ["Alonzo Verge Jr","PG",27,0,"US",68,68,"P",0.71,2028],
    ["George Conditt IV","C",26,0,"US",68,68,"R",0.71,2028],
    ["Guillem Jou","SF",29,0,"ES",64,64,"T",0.35,2029],
    ["Paul Jorgensen","SG",30,0,"IT",63,63,"T",0.29,2028],
    ["Dino Radoncic","PF",27,0,"RS",62,62,"E",0.23,2028],
    ["Lukas Uleckas","SF",27,0,"LT",61,61,"T",0.17,2029],
    ["Dmytro Skapintsev","C",28,0,"UA",61,61,"D",0.17,2029],
    ["Caio De Souza","PG",27,0,"PT",58,58,"P",0.07,2028],
    ["Karlis Silins","C",29,0,"LV",57,57,"E",0.05,2028],
    ["Tomas Dimsa","SG",32,0,"LT",55,55,"D",0.05,2027],
    ["Jacobo Díaz","SF",30,0,"ES",54,54,"D",0.05,2028]
  ]);
  // ACB
  R("girona", [
    ["Aljaž Kunc","PF",27,0,"SI",68,68,0,0,0],
    ["Andrzej Pluta","SG",26,0,"PL",68,68,0,0,0],
    ["David N'Guessan","PF",26,0,"NL",68,68,"E",0.78,2027],
    ["Stanley Whittaker Jr","PG",31,0,"US",68,68,"T",0.78,2029],
    ["Dominykas Stenionis","PG",24,0,"LT",66,68,"P",0.57,2027],
    ["Martinas Geben","C",31,0,"LT",66,66,"D",0.57,2029],
    ["Nikola Maric","PF",27,0,"BA",66,66,"D",0.57,2029],
    ["Máximo Fjellerup","SG",28,0,"AR",63,63,"E",0.32,2028],
    ["Sergi Martínez","SF",27,0,"ES",62,62,"T",0.25,2029],
    ["Josep Busquets","SG",27,0,"ES",60,60,"T",0.14,2028],
    ["Matthew McClung","PG",27,0,"US",60,60,"E",0.14,2028],
    ["Jassel Perez","SF",25,0,"DO",59,62,"E",0.11,2027],
    ["Khory Rosembert Brunot","SF",20,0,"FR",51,61,"D",0.05,2028],
    ["Enric Sanmartín","SG",19,0,"ES",50,62,"T",0.05,2028]
  ]);
  // ACB
  R("hiopos-lleida", [
    ["Kur Kuath","C",28,0,"US",69,69,"D",0.75,2027],
    ["John Shurna","PF",36,0,"LT",66,66,"E",0.48,2029],
    ["James Batemon","SG",29,0,"US",65,65,"D",0.4,2028],
    ["Melvin Ejim","PF",35,0,"NG",64,64,"D",0.33,2027],
    ["Mark Hughes","SG",29,0,"US",64,64,"T",0.33,2028],
    ["Daniel García","PG",28,0,"ES",63,63,"T",0.26,2028],
    ["Adrià Rodriguez i","PG",23,0,"ES",62,69,"T",0.21,2029],
    ["Darius McGhee","PG",27,0,"AM",60,60,"P",0.12,2027],
    ["Oriol Paulí","SF",32,0,"ES",60,60,"T",0.12,2027],
    ["Mikel Sanz","SF",27,0,"ES",58,58,"E",0.07,2029],
    ["Zacharie Perrin","C",22,0,"FR",55,63,"D",0.05,2027],
    ["Pau Torrens","PG",18,0,"ES",48,64,"E",0.05,2029]
  ]);
  // ACB
  R("burgos", [
    ["Chase Audige","SG",27,0,"US",70,70,0,0,0],
    ["Žiga Samar","SG",25,0,"SI",66,66,0,0,0],
    ["Christian Sengfelder","PF",31,0,"DE",65,65,"R",0.53,2027],
    ["Sekou Doumbouya","PF",25,0,"FR",65,66,"D",0.53,2028],
    ["Balsa Koprivica","C",26,0,"RS",63,63,"R",0.35,2027],
    ["Raúl Lobaco","SG",25,0,"ES",63,66,"T",0.35,2028],
    ["Danny Steward","PG",24,0,"US",63,67,"P",0.35,2027],
    ["Dusan Radosavljevic","SF",24,0,"RS",62,67,"D",0.28,2027],
    ["Retin Obasohan","PG",33,0,"BE",61,61,"P",0.21,2028],
    ["Pablo Almazán","SF",37,0,"ES",58,58,"E",0.09,2027],
    ["Rubén Guerrero","C",30,0,"ES",58,58,"R",0.09,2029],
    ["Daniel Díez","PF",33,0,"ES",57,57,"E",0.07,2027],
    ["Joaquín Taboada","SG",19,0,"UY",48,60,"D",0.06,2027]
  ]);
  // ACB
  R("ucam-murcia", [
    ["Michael Forrest","PG",26,0,"JM",69,69,"P",0.83,2028],
    ["Emanuel-Ion Cate","C",29,0,"RO",68,68,"R",0.72,2029],
    ["Juan Marcos","PG",26,0,"IT",67,67,"P",0.62,2029],
    ["Wilhelm Falk","SG",23,0,"SE",67,74,"T",0.62,2029],
    ["Toni Nakic","SF",27,0,"HR",67,67,"E",0.62,2027],
    ["Marcis Steinbergs","PF",25,0,"LV",64,67,"R",0.36,2027],
    ["Souleymane Boum","PG",27,0,"GN",63,63,"P",0.29,2027],
    ["Sander Raieste","SF",27,0,"EE",63,63,"E",0.29,2028],
    ["Cheikh Diagné","C",32,0,"ES",63,63,"R",0.29,2028],
    ["Jonah Radebaugh","PG",29,0,"ME",60,60,"T",0.13,2028],
    ["Jean-Marc Pansa","C",29,0,"FR",60,60,"R",0.13,2027],
    ["Dylan Howell","SG",34,0,"RS",56,56,"D",0.05,2029]
  ]);
  // ACB
  R("bilbao-basket", [
    ["Bastien Vautier","SG",27,0,"FR",66,66,0,0,0],
    ["Tryggvi Hlinason","C",28,0,"IS",69,69,"R",0.77,2029],
    ["Harald Frey","PG",29,0,"NO",68,68,"T",0.67,2028],
    ["Dan Duscak","PG",24,0,"SI",66,70,"P",0.49,2027],
    ["Martin Krampelj","PF",31,0,"SI",66,66,"R",0.49,2029],
    ["Luke Petrasek","PF",31,0,"PL",66,66,"R",0.49,2028],
    ["Darrun Hilliard II","SG",33,0,"US",66,66,"T",0.49,2029],
    ["Nathan Darling","SG",28,0,"CA",65,65,"E",0.41,2028],
    ["Adam Somogyi","PG",26,0,"HU",65,65,"T",0.41,2027],
    ["Margiris Normantas","SG",29,0,"LT",62,62,"T",0.21,2029],
    ["Aleix Font","SG",28,0,"ES",61,61,"D",0.16,2029],
    ["Manex Ansorregi","SF",24,0,"ES",57,62,"E",0.05,2029]
  ]);
  // ACB
  R("zaragoza", [
    ["Guillem Vives","PG",33,0,"ES",72,72,0,0,0],
    ["Caleb Homesley","SG",29,0,"US",69,69,"T",0.97,2028],
    ["Laurynas Birutis","C",29,0,"LT",68,68,"R",0.84,2029],
    ["Sergi García","PG",29,0,"ES",65,65,"P",0.51,2027],
    ["Miguel González","SG",27,0,"ES",64,64,"D",0.42,2028],
    ["Nicolás Brussino","SF",33,0,"IT",64,64,"T",0.42,2029],
    ["Justin Jaworski","SG",27,0,"US",62,62,"T",0.27,2027],
    ["Roberts Blumbergs","PF",28,0,"LV",61,61,"E",0.21,2029],
    ["Trae Bell-Haynes","PG",31,0,"JM",57,57,"P",0.07,2028],
    ["Jaime Fernández","PF",26,0,"ES",57,57,"R",0.07,2029],
    ["Abodunrin Olaseni","C",34,0,"GB",53,53,"D",0.06,2027],
    ["Matija Lukic","SG",16,0,"NL",48,65,"E",0.06,2027]
  ]);
  // ACB
  R("andorra", [
    ["James Olusiji Akinjo","PG",25,0,"US",68,70,"P",0.65,2027],
    ["Lazar Mutic","SF",27,0,"BA",67,67,"D",0.56,2028],
    ["Kassius Robertson","SG",32,0,"JM",67,67,"E",0.56,2027],
    ["Rati Andronikashvili","PG",25,0,"GE",67,71,"P",0.56,2029],
    ["Owen Aquino","PF",23,0,"ES",66,73,"R",0.48,2029],
    ["Wesley De-Shaun Iwundu","SF",31,0,"NG",66,66,"E",0.48,2029],
    ["Artem Pustovyi","C",34,0,"UA",63,63,"D",0.26,2027],
    ["José Ortega","SG",29,0,"ES",61,61,"E",0.16,2027],
    ["Kyle Kuric","SG",37,0,"SK",59,59,"E",0.09,2028],
    ["Leon Radosevic","C",36,0,"HR",59,59,"D",0.09,2028],
    ["Rafael Luz","PG",34,0,"ES",58,58,"P",0.07,2027],
    ["Aaron Best","SG",34,0,"BB",54,54,"T",0.05,2028],
    ["Luka Bottiroli","PG",17,0,"ES",48,64,"E",0.05,2027]
  ]);
  // ACB
  R("breogan", [
    ["Tevin Brown","SG",28,0,"US",68,68,0,0,0],
    ["Aleksa Ilić","PG",30,0,"RS",66,66,0,0,0],
    ["Josep Peris","SF",26,0,"ES",66,66,0,0,0],
    ["Aleksandar Aranitovic","SF",28,0,"HR",65,65,"D",0.6,2028],
    ["Mihajlo Andrić","PF",32,0,"RS",65,65,"R",0.6,2029],
    ["Francisco Alonso","SG",30,0,"ES",62,62,"T",0.31,2027],
    ["Jonathan Kasibabu Martín","C",30,0,"ES",62,62,"D",0.31,2027],
    ["Rasir Bolton","PG",27,0,"US",62,62,"P",0.31,2027],
    ["Anderson Mejia","PF",26,0,"DO",60,60,"R",0.18,2029],
    ["Danko Brankovic","C",25,0,"HR",60,62,"R",0.18,2029],
    ["Dominik Mavra","PG",32,0,"HR",58,58,"P",0.1,2029],
    ["Erik Quintela","PG",35,0,"ES",58,58,"P",0.1,2029]
  ]);
  // ACB
  R("obradoiro", [
    ["Alexander Barcello","SG",28,0,"US",68,68,"D",0.65,2028],
    ["Diogo De Sousa","SF",29,0,"PT",66,66,"T",0.47,2027],
    ["Yunio Barrueta","SF",33,0,"US",65,65,"T",0.4,2029],
    ["Caleb Apochi Agada","SG",32,0,"NG",65,65,"E",0.4,2028],
    ["Brandon Childress","PG",29,0,"US",64,64,"P",0.32,2029],
    ["Alejandro Galan","PF",27,0,"ES",63,63,"D",0.26,2027],
    ["Felipe Dos Anjos","C",28,0,"ES",61,61,"D",0.16,2027],
    ["Efemena Abogidi","PF",24,0,"NG",60,65,"R",0.12,2028],
    ["Joel Soriano","C",26,0,"DO",60,60,"R",0.12,2028],
    ["Alonso Faure","C",24,0,"ES",60,63,"D",0.12,2028],
    ["Leonardo Meindl","SF",33,0,"IT",58,58,"D",0.07,2027],
    ["Sergio Quintela","SG",30,0,"ES",58,58,"T",0.07,2028]
  ]);
  // ACB
  R("manresa", [
    ["Lucas Beaufort","C",24,0,"FR",70,70,0,0,0],
    ["Michael Enabulele","PF",20,0,"US",66,66,0,0,0],
    ["Janaud Notae","SG",27,0,"US",68,68,"T",0.74,2027],
    ["Eric Vila","PF",28,0,"ES",66,66,"E",0.54,2027],
    ["Chibuzo Agbo","SF",24,0,"NG",66,71,"E",0.54,2028],
    ["Yordan Minchev","PF",27,0,"BG",63,63,"E",0.3,2027],
    ["Lukasz Kolenda","SG",27,0,"PL",62,62,"E",0.24,2027],
    ["Hugo Benitez","PG",25,0,"FR",60,62,"P",0.14,2029],
    ["Timothy Allen","PF",26,0,"US",60,60,"E",0.14,2029],
    ["Lononga mangwangi Ongendangenda","C",26,0,"ZA",59,59,"R",0.1,2028],
    ["Ferran Bassas","PG",34,0,"ES",58,58,"E",0.07,2027],
    ["Pablo Tamba","SF",23,0,"ES",57,62,"T",0.06,2028],
    ["Rafael Villar","PG",22,0,"ES",50,58,"E",0.05,2027]
  ]);
  // ACB
  R("tenerife", [
    ["Kyle Guy","SG",29,0,"US",70,70,"D",0.83,2028],
    ["Itan Hap","C",30,0,"MK",70,70,"R",0.83,2028],
    ["Aaron Doornekamp","PF",40,0,"NL",70,70,"D",0.83,2027],
    ["Giorgi Shermadini","C",37,0,"GE",68,68,"R",0.63,2028],
    ["Arturs Kurucs","PG",26,0,"LV",67,67,"T",0.54,2029],
    ["Timothy Abromaitis","PF",37,0,"US",66,66,"R",0.46,2027],
    ["Vincent Hunter","C",32,0,"US",65,65,"D",0.38,2027],
    ["Bruno Fitipaldo","PG",35,0,"IT",64,64,"P",0.32,2027],
    ["Xabier López-Arostegui","SF",29,0,"ES",64,64,"E",0.32,2027],
    ["Marcelo Tieppo","PG",43,0,"IT",63,63,"P",0.25,2027],
    ["Héctor Alderete","SF",24,0,"ES",63,65,"T",0.25,2028],
    ["Jaime Fernández","SG",33,0,"ES",62,62,"E",0.2,2029]
  ]);
  // EUROLIGA
  R("anadolu-efes", [
    ["Mike James","PG",36,0,"US",76,76,0,0,0],
    ["Georgios Papagiannis","C",29,0,"GR",74,74,0,0,0],
    ["Isaia Cordinier","SG",29,0,"FR",72,72,0,0,0],
    ["P.J. Dozier","SG",29,0,"US",72,72,"D",1.66,2028],
    ["Fatts Russell","SG",28,0,"US",72,72,"D",1.66,2027],
    ["Collin Malcolm","PF",29,0,"US",72,72,"R",1.66,2028],
    ["Matthew Strazel","PG",24,0,"FR",70,72,"T",1.31,2027],
    ["Ercan Osmani","SF",28,0,"TR",68,68,"E",0.99,2028],
    ["Santiago Yusta","SF",29,0,"ES",68,68,"T",0.99,2027],
    ["Bruno Fernando","C",28,0,"AO",68,68,"R",0.99,2027],
    ["Erkan Yilmaz","SF",28,0,"TR",66,66,"E",0.72,2029],
    ["Dario Šarić","PF",32,0,"HR",64,64,"D",0.5,2028],
    ["David Mutaf","PG",24,0,"TR",62,65,"P",0.32,2028],
    ["Jordan Loyd","SG",33,0,"PL",61,61,"T",0.24,2028],
    ["Burak Yıldızlı","PF",32,0,"TR",61,61,"D",0.24,2029]
  ]);
  // EUROLIGA
  R("asvel", [
    ["Jae Crowder","PF",36,0,"US",72,72,"D",1.17,2028],
    ["Mathis Dossou-Yovo","C",25,0,"FR",71,74,"R",1.04,2028],
    ["Tremont Waters","PG",28,0,"US",70,70,"P",0.92,2027],
    ["TyTy Washington","SG",24,0,"US",69,74,"T",0.81,2028],
    ["David Lighty","SF",38,0,"US",69,69,"D",0.81,2027],
    ["Bodian Massa","PF",28,0,"FR",69,69,"D",0.81,2028],
    ["Yves Pons","SF",27,0,"FR",69,69,"T",0.81,2027],
    ["Nate Sestina","PF",29,0,"US",68,68,"R",0.7,2028],
    ["Hugo Besson","PG",25,0,"FR",67,69,"T",0.6,2028],
    ["Myles Cale","SF",27,0,"US",67,67,"E",0.6,2028],
    ["Both Gach","SF",27,0,"US",65,65,"T",0.43,2028],
    ["Joel Bolomboy","C",32,0,"US",64,64,"R",0.35,2027],
    ["Patrick Mills","PG",38,0,"AU",63,63,"E",0.28,2029],
    ["Edwin Jackson","PF",37,0,"FR",62,62,"E",0.22,2028],
    ["Marc Fodzo Dada","SG",19,0,"FR",57,71,"E",0.05,2028]
  ]);
  // BBL
  R("bonn", [
    ["Grayson Murphy","PG",27,0,"US",67,67,"P",0.54,2028],
    ["John-Michael Wright","PG",26,0,"US",66,66,"T",0.46,2028],
    ["Marcus Foster","PF",24,0,"US",66,69,"E",0.46,2027],
    ["Aleksa Kovačević","SG",24,0,"RS",65,67,"T",0.39,2028],
    ["Mychael Paulo","PF",28,0,"CA",65,65,"R",0.39,2027],
    ["Joel-Sadu Aminu","PG",29,0,"DE",64,64,"E",0.32,2028],
    ["Jeffery Garrett","SF",31,0,"US",63,63,"E",0.26,2028],
    ["Sahmi Willoughby","PF",25,0,"US",63,66,"D",0.26,2029],
    ["Alijah Comithier","SF",25,0,"US",62,66,"E",0.2,2029],
    ["Michael Kessens","C",35,0,"DE",61,61,"R",0.16,2029],
    ["Benjamin Sadikovic","C",23,0,"DE",61,65,"R",0.16,2029],
    ["Tylan Birts","SF",29,0,"US",61,61,"E",0.16,2029],
    ["Justin Onyejiaka","SG",22,0,"PL",60,66,"T",0.12,2028],
    ["Leon Kratzer","C",29,0,"DE",60,60,"R",0.12,2029],
    ["Melvin Jostmann","SF",26,0,"DE",59,59,"D",0.09,2027]
  ]);
  // BBL
  R("jena", [
    ["Tanner Stuckman","PF",29,0,"US",67,67,"D",0.5,2028],
    ["Sacar Anim","PG",29,0,"US",65,65,"T",0.35,2028],
    ["Jemarl Baker, Jr.","PG",28,0,"US",64,64,"T",0.29,2029],
    ["Terrence Edwards Jr.","SF",24,0,"US",63,68,"D",0.23,2027],
    ["Isaiah Moses","SG",24,0,"US",61,65,"E",0.14,2028],
    ["Pierre Brooks","SF",23,0,"US",61,67,"T",0.14,2028],
    ["Ira Lee","PF",28,0,"US",57,57,"E",0.04,2029],
    ["Alex Herrera","C",34,0,"US",57,57,"E",0.04,2028],
    ["Kristofer Krause","PG",26,0,"DE",57,57,"T",0.04,2028],
    ["Lorenz Bank","SF",25,0,"DE",52,56,"E",0.04,2027],
    ["Robin Christen","PF",35,0,"DE",52,52,"E",0.04,2027],
    ["Raphael Falkenthal","SG",21,0,"DE",49,58,"E",0.04,2028],
    ["Christian Skladanowski","SF",22,0,"DE",49,57,"D",0.04,2029],
    ["Daniel Biel","PF",19,0,"DE",48,63,"R",0.04,2029],
    ["Maxim Bader","SG",18,0,"DE",48,62,"T",0.04,2028]
  ]);
  // BBL
  R("chemnitz", [
    ["Nighael Ceaser","C",26,0,"US",70,70,"D",0.69,2028],
    ["Mateo Seric","PF",27,0,"DE",66,66,"E",0.38,2029],
    ["Stefan Smith","SG",27,0,"CA",63,63,"T",0.21,2027],
    ["Phlandrous Fleming","SG",27,0,"US",62,62,"E",0.17,2029],
    ["Cobe Williams","SF",26,0,"US",62,62,"T",0.17,2027],
    ["Yohan Choupas","PG",26,0,"FR",62,62,"P",0.17,2027],
    ["Ben Burnham","SF",24,0,"US",61,66,"T",0.13,2027],
    ["Darion Atkins","C",34,0,"US",58,58,"D",0.05,2029],
    ["Elias Roedl","PF",24,0,"DE",58,61,"D",0.05,2027],
    ["Alexander Richardson","C",23,0,"DE",58,62,"R",0.05,2029],
    ["Urald King","PF",36,0,"US",56,56,"R",0.04,2027],
    ["Jannis Seckendorff","SF",23,0,"DE",55,61,"E",0.04,2028],
    ["Luca Kellig","PG",20,0,"DE",51,62,"E",0.04,2029],
    ["Alfons Milatz","SF",19,0,"DE",49,63,"D",0.04,2029],
    ["Anton Wilhelm Bock","C",17,0,"DE",48,64,"R",0.04,2028]
  ]);
  // BBL
  R("rostock", [
    ["Johnathan Stove","PG",30,0,"US",69,69,"T",0.68,2029],
    ["Isayah Owens","SG",24,0,"US",65,67,"D",0.36,2028],
    ["Todd Withers","SF",30,0,"US",65,65,"T",0.36,2029],
    ["Zach Copeland","SG",29,0,"US",61,61,"E",0.14,2029],
    ["T.J. Crockett","PG",27,0,"US",61,61,"T",0.14,2029],
    ["Robin Amaize","SF",32,0,"DE",61,61,"T",0.14,2029],
    ["Artur Konontsuk","SF",26,0,"EE",61,61,"E",0.14,2027],
    ["Dominic Lockhart","SF",32,0,"DE",60,60,"T",0.11,2028],
    ["Owen Klassen","C",34,0,"CA",60,60,"R",0.11,2028],
    ["DeAndre Lansdowne","SG",37,0,"US",59,59,"T",0.08,2029],
    ["Elias Baggette","PG",24,0,"DE",56,59,"E",0.04,2027],
    ["Philipp Hartwich","C",31,0,"DE",56,56,"R",0.04,2029],
    ["Benedict Baumgarth","PF",20,0,"DE",54,64,"E",0.04,2027],
    ["Bent Leuchten","C",23,0,"DE",54,59,"R",0.04,2027],
    ["Matthes Tilsen","PF",20,0,"DE",52,62,"R",0.04,2027]
  ]);
  // BBL
  R("wuerzburg", [
    ["Eddie Colbert III","SF",25,0,"US",66,70,"D",0.47,2029],
    ["Marvin Ogunsipe","PF",30,0,"DE",65,65,"D",0.39,2029],
    ["Sam Griffin","PG",25,0,"US",64,68,"P",0.32,2029],
    ["Kenny Dye","PF",26,0,"US",64,64,"D",0.32,2027],
    ["Calvin Wishart","SG",27,0,"US",63,63,"D",0.26,2028],
    ["Lukas Roth","SG",24,0,"DE",62,67,"D",0.2,2029],
    ["Charles Thompson","C",25,0,"US",60,62,"R",0.12,2029],
    ["David Gerhard","SF",22,0,"DE",60,67,"E",0.12,2029],
    ["Alen Pjanic","SF",29,0,"DE",60,60,"E",0.12,2029],
    ["Brandon Tischler","SF",26,0,"DE",60,60,"D",0.12,2028],
    ["Max Jones","PG",24,0,"US",59,63,"P",0.09,2029],
    ["Lukas Herzog","SG",25,0,"DE",57,59,"T",0.05,2027],
    ["Leo Saffer","C",26,0,"DE",56,56,"R",0.04,2029],
    ["Lon Lican","SG",21,0,"SI",54,63,"T",0.04,2029],
    ["Aaron Kayser","C",27,0,"DE",54,54,"D",0.04,2029]
  ]);
  // BBL
  R("bamberg", [
    ["Brendan Terry","PF",23,0,"US",70,77,"D",0.92,2028],
    ["Mylik Wilson","SG",26,0,"US",69,69,"T",0.8,2029],
    ["Trevon Scott","SF",29,0,"US",69,69,"T",0.8,2028],
    ["Jordan Jones","SG",24,0,"US",65,70,"T",0.42,2028],
    ["Daniel Keppeler","C",29,0,"DE",64,64,"D",0.35,2027],
    ["Jordan Wright","PG",26,0,"US",63,63,"P",0.28,2029],
    ["Jonathan Baehre","SF",30,0,"DE",63,63,"E",0.28,2028],
    ["Hason Ward","C",26,0,"BB",62,62,"R",0.22,2028],
    ["Richard Bálint","PG",23,0,"CZ",60,65,"E",0.13,2029],
    ["Joshua Obiesie","PG",26,0,"DE",59,59,"T",0.09,2027],
    ["Yuval Hochstadter","PF",21,0,"IL",55,64,"D",0.05,2027],
    ["Benjamin Koppke","C",21,0,"DE",54,62,"R",0.05,2027],
    ["Jakob Lang","SF",21,0,"DE",52,60,"E",0.05,2027],
    ["Jonas Mendl","PF",18,0,"AT",49,64,"D",0.05,2029]
  ]);
  // BBL
  R("weissenfels", [
    ["Collin Welp","PF",27,0,"US",66,66,"D",0.47,2028],
    ["Vuk Radojicic","SG",25,0,"RS",64,68,"T",0.33,2029],
    ["Anthony Gaines","PF",28,0,"US",64,64,"R",0.33,2028],
    ["Kris Clyburn","PG",30,0,"US",62,62,"P",0.21,2029],
    ["Krešimir Nikić","C",27,0,"HR",62,62,"R",0.21,2027],
    ["DeLonnie Hunt","SG",24,0,"US",61,65,"T",0.16,2029],
    ["Spencer Reaves","PG",30,0,"US",61,61,"P",0.16,2029],
    ["Boriša Simanić","SF",28,0,"RS",60,60,"E",0.12,2028],
    ["Jure Planinić","C",26,0,"HR",59,59,"R",0.09,2028],
    ["Kostja Mushidi","PG",28,0,"DE",55,55,"T",0.05,2029],
    ["Jose Gabriel de Oliveira Neto","SF",28,0,"DE",55,55,"T",0.05,2029],
    ["Abdul Wasay Wafa","PG",18,0,"AF",48,63,"P",0.05,2027],
    ["Mika Siegert","SG",18,0,"DE",48,62,"D",0.05,2028]
  ]);
  // BBL
  R("oldenburg", [
    ["Ja'Qualyn Gilbreath","PG",28,0,"US",67,67,"E",0.51,2027],
    ["Tylan James Pope","SF",25,0,"US",66,70,"E",0.43,2027],
    ["Jeremy Roach","SG",24,0,"US",64,67,"D",0.3,2027],
    ["Seth Hinrichs","PF",33,0,"US",63,63,"R",0.24,2029],
    ["Demajeo Wiggins","C",29,0,"US",63,63,"E",0.24,2029],
    ["Nicholas Tischler","PF",26,0,"DE",62,62,"E",0.19,2029],
    ["Le'Tre Darthard","SF",26,0,"US",62,62,"E",0.19,2028],
    ["Nate Johnson","SG",28,0,"US",60,60,"E",0.11,2029],
    ["Kyle Gruhler","PF",24,0,"US",60,65,"R",0.11,2029],
    ["Joel Harms","C",23,0,"DE",60,65,"R",0.11,2028],
    ["Marcel Keßen","C",29,0,"DE",59,59,"D",0.08,2029],
    ["Zachary Ensminger","PG",25,0,"US",58,62,"P",0.06,2027],
    ["Stefan Momirov","PF",26,0,"RS",56,56,"R",0.04,2027],
    ["Oré Ewert","SG",20,0,"DE",53,65,"T",0.04,2029],
    ["Johann Helwig","SF",20,0,"DE",53,66,"T",0.04,2029]
  ]);
  // BBL
  R("hagen", [
    ["Tyler Polley","SF",27,0,"US",65,65,"E",0.33,2028],
    ["Jan Razdevšek","SG",25,0,"SI",64,65,"D",0.27,2027],
    ["Trenton Gibson","PG",26,0,"US",63,63,"E",0.22,2027],
    ["C.J. Anderson","PG",30,0,"US",61,61,"T",0.13,2029],
    ["Bjarne Kraushaar","PG",27,0,"DE",60,60,"P",0.1,2027],
    ["Fabian Bleck","SF",33,0,"DE",60,60,"E",0.1,2027],
    ["Marvin Omuvwie","SF",29,0,"DE",60,60,"T",0.1,2029],
    ["Cameron Krutwig","C",27,0,"US",59,59,"D",0.07,2028],
    ["Anthony Polite","PF",29,0,"CH",57,57,"R",0.04,2027],
    ["Adam Kunkel","SG",26,0,"US",57,57,"D",0.04,2029],
    ["Marcus Graves","SG",30,0,"US",55,55,"D",0.04,2028],
    ["Tim Uhlemann","SF",27,0,"DE",55,55,"T",0.04,2029],
    ["Patrico Garino","PF",33,0,"AR",54,54,"D",0.04,2027],
    ["Luis Ohrmann","PG",18,0,"DE",48,62,"P",0.04,2027],
    ["Finn Drescher","SG",19,0,"DE",48,61,"T",0.04,2027]
  ]);
  // BBL
  R("trier", [
    ["Austin Matthew Crowley","SF",26,0,"US",68,68,"E",0.44,2029],
    ["Justin Simon","PF",30,0,"US",66,66,"R",0.32,2029],
    ["Behnam Yakhchali","SG",31,0,"IR",66,66,"D",0.32,2029],
    ["Eli Brooks","PG",27,0,"US",61,61,"P",0.11,2029],
    ["Evans Rapieque","SG",24,0,"DE",60,63,"E",0.08,2027],
    ["Jordan Roland","PG",29,0,"US",57,57,"E",0.04,2029],
    ["Clayton Guillozet","PF",29,0,"US",57,57,"R",0.04,2028],
    ["Ej Onu","C",27,0,"US",57,57,"R",0.04,2027],
    ["Edney Francisco Manuel","SF",21,0,"NL",56,65,"E",0.04,2029],
    ["Marco Hollersbacher","SF",25,0,"DE",55,56,"E",0.04,2027],
    ["Marten Linßen","C",28,0,"DE",55,55,"E",0.04,2027],
    ["Bennet Hundt","SG",28,0,"DE",53,53,"D",0.04,2029],
    ["Moritz Krimmer","PF",26,0,"DE",53,53,"E",0.04,2027],
    ["Emanuel Mpacko","PG",21,0,"DE",50,58,"T",0.04,2027],
    ["Maik Zirbes","C",36,0,"DE",50,50,"D",0.04,2028]
  ]);
  // BBL
  R("alba-berlin", [
    ["Brandon Angel","SF",24,0,"US",73,76,"E",1.54,2027],
    ["Justin Bean","PF",29,0,"US",73,73,"E",1.54,2028],
    ["Samuel Griesel","SF",26,0,"US",73,73,"D",1.54,2027],
    ["Joe Wieskamp","PF",27,0,"US",71,71,"D",1.22,2029],
    ["Julius Böhmer","PG",24,0,"DE",70,75,"E",1.08,2028],
    ["Malte Delow","PF",25,0,"DE",69,73,"D",0.95,2028],
    ["Martin Hermannsson","PG",32,0,"IS",66,66,"T",0.6,2028],
    ["Jordan Ford","SG",28,0,"US",65,65,"D",0.5,2027],
    ["Jonas Mattisseck","PG",26,0,"DE",63,63,"P",0.33,2029],
    ["Norris Agbakoko","C",26,0,"DE",63,63,"R",0.33,2027],
    ["Richard Schmitt","SF",19,0,"DE",56,71,"E",0.06,2027],
    ["Nevio Bennefeld","C",19,0,"DE",56,69,"E",0.06,2027],
    ["Jack Kayil","SG",20,0,"DE",53,66,"T",0.06,2028],
    ["Anton Nufer","SG",20,0,"DE",50,60,"E",0.06,2028],
    ["Fin Borczanowski","SF",17,0,"DE",48,65,"E",0.06,2028]
  ]);
  // BBL
  R("vechta", [
    ["Armaan Franklin","PG",25,0,"US",67,70,"P",0.48,2029],
    ["Justin Edler-Davis","SF",28,0,"US",67,67,"T",0.48,2029],
    ["D'Mitrik Trice","SG",30,0,"US",66,66,"T",0.41,2027],
    ["Kihei Clark","PG",26,0,"US",62,62,"T",0.18,2027],
    ["Tommy Kuhse","PG",28,0,"US",62,62,"T",0.18,2027],
    ["Matt Lewis","PG",27,0,"US",60,60,"P",0.1,2029],
    ["Peter Hemschemeier","SG",23,0,"DE",58,62,"T",0.06,2027],
    ["Lamin Sabally","PG",24,0,"DE",58,60,"P",0.06,2028],
    ["Philipp Herkenhoff","PF",27,0,"DE",58,58,"R",0.06,2027],
    ["Timo Lanmüller","SG",25,0,"AT",57,59,"T",0.04,2027],
    ["Nelson Weidemann","PG",27,0,"DE",57,57,"P",0.04,2029],
    ["Tibor Pleiss","C",36,0,"DE",57,57,"E",0.04,2027],
    ["Lloyd Pandi","SG",26,0,"CA",56,56,"T",0.04,2027],
    ["Linus Trettin","PF",21,0,"DE",56,67,"R",0.04,2029],
    ["Lars Thiemann","C",26,0,"DE",56,56,"R",0.04,2029]
  ]);
  // BBL
  R("ulm", [
    ["Jaylen Sims","PG",27,0,"US",71,71,"T",1.08,2028],
    ["Devin Schmidt","SG",31,0,"US",70,70,"E",0.96,2028],
    ["Ibi Watson","PF",28,0,"US",67,67,"D",0.62,2029],
    ["Marvin Heckel","SG",29,0,"DE",65,65,"T",0.44,2027],
    ["Armel Traore","SF",23,0,"FR",65,69,"D",0.44,2029],
    ["Christopher Anthony Jr.","PG",24,0,"US",65,68,"T",0.44,2028],
    ["Lucas Fischer","PG",22,0,"FR",64,72,"P",0.36,2029],
    ["Simisola Shittu","C",26,0,"CA",64,64,"R",0.36,2029],
    ["Dwayne Koroma","PF",25,0,"DE",63,67,"D",0.29,2027],
    ["Michael Rataj","PF",22,0,"DE",60,69,"E",0.13,2029],
    ["Nil Failenschmid","PF",20,0,"DE",56,66,"D",0.05,2027],
    ["Mohamed Diakite","SF",20,0,"FR",54,67,"E",0.05,2028],
    ["Zoran Milicic","SG",19,0,"PL",52,65,"D",0.05,2029],
    ["Yanu Slingerland","SG",18,0,"NL",52,66,"D",0.05,2027],
    ["Lenny Liedtke","SF",22,0,"DE",51,57,"T",0.05,2027]
  ]);
  // BBL
  R("braunschweig", [
    ["Sheldon Edwards","SG",26,0,"US",69,69,"T",0.65,2028],
    ["Chip Flanigan","SF",30,0,"US",65,65,"T",0.34,2028],
    ["Devin Askew","PG",24,0,"US",63,68,"P",0.23,2029],
    ["Andre Fox","PG",30,0,"US",62,62,"P",0.18,2028],
    ["Gian Aydinoglu","SG",23,0,"DE",61,66,"T",0.14,2028],
    ["DeJour Reaves","SG",24,0,"US",59,61,"E",0.08,2028],
    ["Tajh Green","PF",28,0,"US",59,59,"R",0.08,2028],
    ["Ferdinand Zylka","SG",28,0,"DE",58,58,"T",0.06,2029],
    ["Felipe Haase","SF",28,0,"CL",57,57,"T",0.04,2027],
    ["Benjamin Schröder","PF",23,0,"DE",57,63,"E",0.04,2029],
    ["Zaba Bangala","C",24,0,"SE",57,60,"E",0.04,2029],
    ["Romario Holloway","PF",21,0,"DE",54,65,"R",0.04,2029],
    ["Eddy Edigin","C",30,0,"DE",54,54,"D",0.04,2029],
    ["Luca Joe Ewelt","PF",22,0,"DE",50,58,"E",0.04,2027],
    ["Noah Eklou","SF",17,0,"DE",48,64,"E",0.04,2028]
  ]);
  // BBL
  R("ludwigsburg", [
    ["Darius Perry","SG",27,0,"US",69,69,"T",0.81,2029],
    ["David Joplin","PF",23,0,"US",67,71,"E",0.6,2027],
    ["Keeshawn Kellman","C",26,0,"US",67,67,"D",0.6,2029],
    ["Patrick Cartier","SF",26,0,"US",66,66,"D",0.51,2028],
    ["Elijah Hughes","SF",28,0,"US",66,66,"E",0.51,2028],
    ["Ishmael Leggett","PG",25,0,"US",64,67,"E",0.35,2027],
    ["Thomas Rutherford","C",29,0,"US",64,64,"E",0.35,2028],
    ["Oshane Drews","PF",25,0,"DE",61,62,"E",0.17,2028],
    ["Maxwell Temoka","PF",23,0,"DE",61,67,"R",0.17,2028],
    ["Justin Kier","SG",28,0,"US",60,60,"D",0.13,2027],
    ["Lino Duarte","PG",21,0,"DE",58,69,"P",0.07,2028],
    ["Yorman Polas Bartolo","PF",41,0,"CU",57,57,"E",0.05,2029],
    ["Lukas Modic","SF",21,0,"DE",55,64,"E",0.05,2027],
    ["Daniel Mack","C",21,0,"DE",55,63,"R",0.05,2027],
    ["Jonas Wohlfarth-Bottermann","C",36,0,"DE",55,55,"E",0.05,2028]
  ]);
  // BBL
  R("frankfurt", [
    ["Nahiem Alleyne","PG",25,0,"US",67,69,"T",0.46,2027],
    ["William Christmas","SG",29,0,"US",65,65,"T",0.32,2027],
    ["Race Thompson","PF",27,0,"US",65,65,"R",0.32,2029],
    ["Florian Dietrich","C",25,0,"DE",65,69,"R",0.32,2027],
    ["Jacob Knauf","C",29,0,"DE",65,65,"E",0.32,2028],
    ["Ryan Arcidiacono","SG",32,0,"US",63,63,"E",0.22,2027],
    ["Isaiah Swope","SG",23,0,"DE",61,65,"T",0.13,2028],
    ["Moses Poelking","C",28,0,"DE",61,61,"R",0.13,2027],
    ["Philip Hecker","SG",24,0,"DE",60,64,"D",0.1,2027],
    ["Radii Caisin","SF",25,0,"DE",60,62,"E",0.1,2028],
    ["Till Pape","PF",28,0,"DE",60,60,"R",0.1,2029],
    ["Judah Mintz","SG",23,0,"US",58,63,"T",0.05,2027],
    ["Roman Bedime","C",24,0,"DE",57,60,"R",0.04,2029],
    ["Alvin Onyia","SG",25,0,"DE",54,58,"E",0.04,2027],
    ["Thomas Klepeisz","PG",35,0,"AT",53,53,"P",0.04,2028]
  ]);
  // BBL
  R("hamburg", [
    ["Rich Igbineweka","SG",28,0,"NG",67,67,"D",0.61,2027],
    ["Zakai Zeigler","SG",24,0,"FR",67,72,"D",0.61,2027],
    ["Trey Wade","SF",28,0,"US",65,65,"D",0.43,2028],
    ["Noah Thomasson","PG",25,0,"US",64,68,"T",0.36,2029],
    ["Jamil Muttilib","SG",22,0,"US",63,72,"T",0.29,2027],
    ["Niki Krause","SG",24,0,"DE",61,64,"T",0.17,2027],
    ["Nicolas Pavrette","C",24,0,"FR",61,65,"D",0.17,2029],
    ["Kenneth Ogbe","SF",31,0,"DE",60,60,"E",0.13,2028],
    ["Mathys Kangudia","PG",22,0,"FR",58,66,"P",0.07,2027],
    ["David Muenkat","PF",26,0,"CA",57,57,"D",0.06,2027],
    ["Sid-Marlon Theis","PF",33,0,"DE",56,56,"E",0.05,2029],
    ["Emil Marshall","SF",26,0,"DE",54,54,"D",0.05,2028],
    ["Nelson Martin","PG",20,0,"DE",52,65,"E",0.05,2027],
    ["Martin Breunig","C",34,0,"DE",50,50,"R",0.05,2028],
    ["Fiete Meinberg","C",16,0,"DE",48,64,"E",0.05,2027]
  ]);
  // LEGA
  R("cantu", [
    ["Semaj Christon","PG",33,191,"US",70,70,"P",0.93,2027],
    ["Savion Flagg","SF",27,201,"US",66,66,"D",0.51,2027],
    ["Chad Brown","C",30,206,"US",65,65,"E",0.43,2027],
    ["Isaiah Miles","SF",32,203,"US",63,63,"T",0.29,2027],
    ["Leonardo Okeke","C",23,213,"IT",63,70,"E",0.29,2027],
    ["Hassani Gravett","SG",30,188,"US",62,62,"D",0.23,2027],
    ["Riccardo Moraschini","SG",35,194,"IT",61,61,"D",0.17,2027],
    ["Davide Moretti","PG",28,191,"IT",59,59,"T",0.1,2027],
    ["Matteo Parravicini","PG",25,187,"IT",57,58,"T",0.05,2027],
    ["Andrejs Grazulis","SF",33,202,"LV",57,57,"D",0.05,2027],
    ["Liam Udom","SG",26,199,"IT",56,56,"E",0.05,2027],
    ["Simone Ventura","SG",17,196,"IT",48,64,"T",0.05,2027]
  ]);
  // LEGA
  R("udine", [
    ["Skylar Spencer","C",32,205,"US",67,67,"R",0.72,2027],
    ["Andrea Calzavara","PG",24,195,"IT",66,70,"E",0.61,2027],
    ["Raequan Battle","SF",25,196,"US",63,65,"D",0.34,2027],
    ["Nick McGlynn","C",29,206,"US",63,63,"R",0.34,2027],
    ["Eimantas Bendzius","SF",36,207,"LT",62,62,"E",0.27,2027],
    ["Zan Sisko","PG",29,191,"SI",61,61,"P",0.21,2027],
    ["Matteo Cavallero","SF",23,203,"IT",61,65,"E",0.21,2027],
    ["Joseph Mobio","SF",28,199,"IT",60,60,"T",0.16,2027],
    ["Denzel Valentine","SG",32,198,"US",59,59,"T",0.11,2027],
    ["Lorenzo Bucarelli","SG",28,198,"IT",56,56,"D",0.06,2027],
    ["Alessandro Pavan","SF",18,201,"IT",49,63,"E",0.06,2027],
    ["Mattia Grassi","SF",18,200,"IT",48,62,"T",0.06,2027]
  ]);
  // LEGA
  R("bc-roma", [
    ["Paul Watson","SG",31,198,"US",67,67,"T",0.69,2027],
    ["Mike Iuzzolino","SG",24,185,"US",66,69,"T",0.58,2027],
    ["Corey Davis","PG",29,185,"US",64,64,"P",0.4,2027],
    ["Erik Stevenson","PG",27,193,"US",64,64,"P",0.4,2027],
    ["Gerald Ayayi","PG",25,190,"FR",64,67,"T",0.4,2027],
    ["Giovanni Emejuru","C",23,208,"IT",60,67,"E",0.15,2027],
    ["Arturs Strautins","SF",27,198,"IT",60,60,"E",0.15,2027],
    ["Marko Simonovic","C",26,213,"ME",59,59,"R",0.11,2027],
    ["Niccolò Mannion","PG",25,190,"IT",56,59,"E",0.06,2027],
    ["Andrea Mezzanotte","SF",28,207,"IT",56,56,"E",0.06,2027],
    ["Riccardo Tavernelli","PG",35,188,"IT",53,53,"P",0.06,2027],
    ["Trentyn Flowers","SF",21,206,"US",53,61,"T",0.06,2027],
    ["Giannis Odzebe","SF",17,196,"CD",48,64,"T",0.06,2027]
  ]);
  // LEGA
  R("tortona", [
    ["Aljami Durham","PG",28,193,"US",68,68,"E",0.79,2027],
    ["Giordano Bortolani","SG",25,194,"IT",64,66,"T",0.4,2027],
    ["Amar Alibegovic","SF",31,206,"IT",63,63,"E",0.32,2027],
    ["Paul Eboua","PF",26,203,"IT",63,63,"D",0.32,2027],
    ["Prentiss Hubb","PG",27,190,"US",62,62,"E",0.25,2027],
    ["Dominik Olejniczak","C",30,213,"PL",62,62,"D",0.25,2027],
    ["Karim Jallow","SF",29,198,"DE",62,62,"E",0.25,2027],
    ["Andrea Pecchia","SF",28,197,"IT",60,60,"E",0.15,2027],
    ["Justin Gorham","SF",28,201,"US",60,60,"T",0.15,2027],
    ["Dante Maddox","SG",24,188,"US",58,63,"T",0.08,2027],
    ["Giulio Gazzotti","C",35,202,"IT",58,58,"R",0.08,2027],
    ["Edoardo Di Meo","SG",18,190,"IT",48,62,"T",0.05,2027],
    ["Gabriele Furfaro","PF",16,0,"IT",48,65,"D",0.05,2027]
  ]);
  // LEGA
  R("trento", [
    ["Darius Brown","PG",27,188,"US",70,70,"P",1.11,2027],
    ["Charles Brown","SF",29,198,"US",68,68,"E",0.84,2027],
    ["Quincy Olivari","SG",25,190,"US",66,67,"T",0.61,2027],
    ["Isaiah Bigelow","SF",26,201,"US",66,66,"E",0.61,2027],
    ["Selom Mawugbe","C",28,207,"US",63,63,"D",0.34,2027],
    ["Jordan Bayehe","C",26,204,"IT",62,62,"R",0.27,2027],
    ["Alessandro Bertini","SG",23,194,"IT",61,66,"D",0.21,2027],
    ["Toto Forray","PG",40,187,"IT",60,60,"T",0.16,2027],
    ["Antonio Barra","SF",18,0,"IT",52,67,"E",0.06,2027],
    ["Giulio Vergnaghi","PF",18,0,"IT",51,65,"D",0.06,2027],
    ["Josè Alfred Medina Bouza","SG",19,0,"CU",49,61,"E",0.06,2027],
    ["Patrick Hassan","PG",19,185,"IT",49,63,"E",0.06,2027],
    ["Cheickh Niang","SF",18,196,"IT",48,62,"E",0.06,2027],
    ["Federico Cattapan","PF",18,0,"IT",48,63,"E",0.06,2027]
  ]);
  // LEGA
  R("scafati", [
    ["Brandon Johnson","PF",24,203,"US",66,69,"D",0.55,2027],
    ["Charlie Edward Moore","PG",28,180,"US",64,64,"P",0.38,2027],
    ["Garrett Nevels","PG",33,188,"US",64,64,"E",0.38,2027],
    ["Ze'Rik Onyema","C",24,206,"US",64,66,"D",0.38,2027],
    ["Ithiel Horton","PG",26,196,"US",64,64,"E",0.38,2027],
    ["Antonio Iannuzzi","C",35,205,"IT",61,61,"R",0.19,2027],
    ["Mezie Offurum","SF",26,203,"US",60,60,"E",0.14,2027],
    ["Alessandro Lever","PF",27,208,"IT",58,58,"E",0.08,2027],
    ["Bruno Mascolo","PG",30,186,"IT",58,58,"T",0.08,2027],
    ["Rodney McGruder","SG",35,193,"US",57,57,"D",0.06,2027],
    ["Marco Ceron","SG",34,196,"IT",51,51,"T",0.05,2027],
    ["Francesco Spinelli","SF",21,0,"IT",48,59,"D",0.05,2027]
  ]);
  // LEGA
  R("maxima-roma", [
    ["Aaron Holiday","PG",30,183,"US",71,71,"P",1.18,2027],
    ["Matt Ryan","SF",29,201,"US",68,68,"T",0.79,2027],
    ["Brynton Lemar","SG",31,193,"US",65,65,"E",0.48,2027],
    ["Hunter Tyson","SF",26,203,"US",63,63,"D",0.32,2027],
    ["Mirza Alibegovic","SG",34,195,"IT",62,62,"D",0.25,2027],
    ["Giovanni Veronesi","SG",28,196,"IT",62,62,"E",0.25,2027],
    ["Carl Wheatle","SF",28,200,"IT",62,62,"T",0.25,2027],
    ["Gora Camara","C",25,214,"IT",62,63,"E",0.25,2027],
    ["Xavier Moon","SG",31,183,"US",62,62,"T",0.25,2027],
    ["John Brown","PF",34,203,"US",60,60,"D",0.15,2027],
    ["Federico Bonacini","SG",27,190,"IT",60,60,"D",0.15,2027],
    ["Francesco Carnevale","PF",24,0,"IT",57,59,"D",0.06,2027],
    ["Miro Bilan","C",37,213,"HR",56,56,"D",0.05,2027],
    ["Andrea Bresciani","SF",18,0,"IT",48,62,"D",0.05,2027]
  ]);
  // LEGA
  R("napoli-basket", [
    ["Zac Seljaas","SF",29,200,"US",68,68,"E",0.79,2027],
    ["Jahmi'us Ramsey","SG",25,191,"US",68,71,"T",0.79,2027],
    ["Jeff Dowtin","PG",29,191,"US",66,66,"P",0.57,2027],
    ["Leonardo Totè","PF",29,212,"IT",65,65,"R",0.48,2027],
    ["Kaleb Tarczewski","C",33,212,"US",63,63,"D",0.32,2027],
    ["Guglielmo Caruso","C",27,208,"IT",61,61,"R",0.19,2027],
    ["Jack White","SF",29,200,"AU",59,59,"D",0.11,2027],
    ["Markel Brown","SG",34,191,"US",58,58,"D",0.08,2027],
    ["Marco Spissu","PG",31,185,"IT",57,57,"P",0.06,2027],
    ["John Petrucelli","SG",33,193,"IT",57,57,"T",0.06,2027],
    ["Andrej Jakimovski","SF",25,201,"IT",56,58,"E",0.05,2027],
    ["Leonardo Faggian","SG",22,195,"IT",55,63,"T",0.05,2027],
    ["Assane Sankare","SF",19,204,"IT",48,61,"E",0.05,2027]
  ]);
  // LEGA
  R("treviso", [
    ["Ed Croswell","C",27,203,"US",69,69,"R",0.92,2027],
    ["DeWayne Russell","PG",32,180,"US",68,68,"T",0.79,2027],
    ["Chico Carter","SG",25,191,"US",66,68,"D",0.58,2027],
    ["Jp Macura","SG",31,196,"US",64,64,"D",0.4,2027],
    ["Alessandro Cappelletti","PG",30,186,"IT",63,63,"P",0.32,2027],
    ["Brekkott Chapman","SF",30,206,"US",61,61,"T",0.19,2027],
    ["Federico Miaschi","PG",26,200,"IT",61,61,"E",0.19,2027],
    ["Ike Anigbogu","C",27,206,"NG",61,61,"R",0.19,2027],
    ["Matteo Chillo","SF",33,203,"IT",59,59,"D",0.11,2027],
    ["Valentine Chery","C",29,201,"FR",59,59,"E",0.11,2027],
    ["Gregorio Allinei","SG",22,194,"IT",58,65,"T",0.08,2027],
    ["Alessandro Vettori","SG",18,188,"IT",48,62,"E",0.05,2027],
    ["Antonio Iaquinta","SG",18,0,"IT",48,65,"E",0.05,2027],
    ["Alessandro Manfredotti","SG",17,192,"IT",48,62,"D",0.05,2027]
  ]);
  // LEGA
  R("varese", [
    ["Ismael Kamagate","C",25,211,"FR",69,72,"D",0.91,2027],
    ["Nate Renfro","C",29,203,"US",67,67,"R",0.68,2027],
    ["Isaiah Roby","SF",28,203,"US",67,67,"T",0.68,2027],
    ["William McDowell-White","PG",28,196,"AU",66,66,"P",0.58,2027],
    ["David Duke","SG",26,193,"US",64,64,"T",0.4,2027],
    ["Maximilian Ladurner","C",24,207,"IT",61,65,"R",0.19,2027],
    ["Hunter Hale","SG",29,191,"US",60,60,"E",0.15,2027],
    ["Stefan Nikolic","SF",29,203,"IT",59,59,"D",0.11,2027],
    ["Davide Alviti","SF",29,200,"IT",58,58,"E",0.08,2027],
    ["Amedeo Della Valle","SG",33,194,"IT",56,56,"D",0.05,2027],
    ["Matteo Librizzi","PG",24,180,"IT",56,60,"T",0.05,2027],
    ["Mauro Villa","SG",22,194,"AR",54,63,"T",0.05,2027],
    ["Iris Ikangi","SF",32,200,"IT",54,54,"T",0.05,2027],
    ["Robert Kangur","SG",17,0,"IT",48,63,"T",0.05,2027]
  ]);
  // LEGA
  R("trieste", [
    ["Colbey Ross","PG",27,185,"US",70,70,"T",1.01,2027],
    ["Sean McDermott","SF",29,198,"US",66,66,"T",0.56,2027],
    ["Abramo Canka","SG",24,198,"IT",65,67,"D",0.47,2027],
    ["Luka Brajkovic","C",27,208,"AT",65,65,"R",0.47,2027],
    ["Langston Galloway","SG",34,188,"US",65,65,"D",0.47,2027],
    ["Francesco Candussi","C",32,211,"IT",61,61,"R",0.19,2027],
    ["Lodovico Deangeli","SG",26,205,"IT",59,59,"T",0.1,2027],
    ["Michele Ruzzier","PG",33,183,"IT",57,57,"P",0.06,2027],
    ["Davide Paiano","SF",21,199,"IT",56,64,"E",0.05,2027],
    ["Lajae Jones","SG",22,201,"US",55,61,"T",0.05,2027],
    ["Emanuele Martucci","SF",19,0,"IT",51,65,"E",0.05,2027],
    ["Mattia Cossutta","SF",19,0,"IT",48,61,"E",0.05,2027],
    ["Lorenzo Bregant","PF",18,0,"IT",48,63,"D",0.05,2027]
  ]);
  // LEGA
  R("verona", [
    ["Izaiah Brockington","SF",27,195,"US",68,68,"E",0.79,2027],
    ["Andrew Andrews","PG",33,188,"US",66,66,"T",0.57,2027],
    ["Federico Zampini","PG",27,191,"IT",64,64,"P",0.39,2027],
    ["C.J. Massinburg","SG",29,192,"US",62,62,"T",0.25,2027],
    ["Federico Poser","C",27,203,"IT",62,62,"R",0.25,2027],
    ["Mike Tobey","C",31,213,"SI",62,62,"E",0.25,2027],
    ["Lorenzo Ambrosin","SG",28,195,"IT",60,60,"T",0.15,2027],
    ["Jermaine Samuels","SF",27,198,"US",60,60,"E",0.15,2027],
    ["Rj Melendez","SF",23,210,"IT",58,65,"E",0.08,2027],
    ["Filippo Pantano","SG",24,0,"IT",57,61,"D",0.06,2027],
    ["Matteo Zumerle","SF",24,0,"IT",55,59,"E",0.05,2027],
    ["Andrea Loro","SF",23,202,"IT",54,61,"E",0.05,2027],
    ["Malick Mane El Hadji Maodo","C",18,211,"SN",48,64,"E",0.05,2027],
    ["Matteo Oliveri","SG",19,191,"IT",48,62,"T",0.05,2027]
  ]);
  // LEGA
  R("reyer-venezia", [
    ["Ky Bowman","PG",29,188,"US",71,71,"P",1.23,2027],
    ["Kyle Wiltjer","SF",33,204,"CA",70,70,"D",1.09,2027],
    ["Glynn Watson","PG",29,185,"US",68,68,"E",0.83,2027],
    ["Louis Olinde","SF",28,203,"DE",66,66,"D",0.6,2027],
    ["Sir'Jabari Rice","SG",27,198,"US",65,65,"D",0.5,2027],
    ["Enoch Boakye","C",23,213,"CA",64,69,"R",0.41,2027],
    ["Giga Janelidze","SF",31,201,"IT",64,64,"E",0.41,2027],
    ["Sasha Grant","SF",24,198,"IT",64,68,"E",0.41,2027],
    ["Giovanni De Nicolao","PG",30,185,"IT",63,63,"P",0.33,2027],
    ["Amedeo Tessitori","C",31,208,"IT",63,63,"R",0.33,2027],
    ["Jordan Parks","SF",32,198,"US",62,62,"T",0.26,2027],
    ["Octavio Maretto","SG",22,186,"IT",62,69,"T",0.26,2027],
    ["Leonardo Candi","PG",29,186,"IT",62,62,"P",0.26,2027],
    ["Erick Green","PG",34,191,"US",61,61,"E",0.2,2027],
    ["Gabriele Turconi","PF",18,0,"IT",49,66,"D",0.06,2027]
  ]);
  // LEGA
  R("reggio-emilia", [
    ["Jaylen Barford","SG",30,191,"US",69,69,"T",0.97,2027],
    ["Rob Edwards","SG",29,196,"US",67,67,"T",0.72,2027],
    ["Riccardo Visconti","SG",27,197,"IT",64,64,"D",0.42,2027],
    ["Derek Ogbeide","C",29,206,"NG",64,64,"R",0.42,2027],
    ["Jt Thor","SF",24,208,"US",63,68,"E",0.34,2027],
    ["Riccardo Rossato","PG",30,190,"IT",63,63,"P",0.34,2027],
    ["Jaime Echenique","C",29,211,"CO",61,61,"D",0.21,2027],
    ["Speedy Smith","PG",33,191,"US",61,61,"P",0.21,2027],
    ["Lorenzo Uglietti","PG",32,192,"IT",59,59,"P",0.11,2027],
    ["Luca Severini","SF",30,204,"IT",58,58,"D",0.08,2027],
    ["Tomas Woldetensae","SF",28,196,"IT",56,56,"E",0.06,2027],
    ["Elhadji Fainke","C",21,203,"IT",52,61,"R",0.06,2027],
    ["Luca Manfredotti","SF",18,198,"IT",48,64,"E",0.06,2027],
    ["Arseniy Hadzhyiev","SG",18,0,"IT",48,63,"T",0.06,2027]
  ]);
  // GBL
  R("vikos", [
    ["Ansley Almonor","PF",24,200,"US",64,68,"E",0.29,2028],
    ["Will Mcnair","C",26,210,"US",62,62,"D",0.18,2027],
    ["Keshawn Justice","SF",26,200,"US",62,62,"T",0.18,2028],
    ["Jordan Floyd","PG",29,188,"US",60,60,"P",0.11,2028],
    ["Giannis Agravanis","C",27,198,"GR",59,59,"R",0.08,2028],
    ["Aris Sotiriou","PF",25,203,"GR",59,61,"E",0.08,2028],
    ["Nic Pozoglou","SG",24,198,"GR",59,61,"D",0.08,2027],
    ["Vasilis Patras","SF",31,195,"GR",58,58,"E",0.06,2029],
    ["Kostas Gontikas","C",32,206,"GR",58,58,"R",0.06,2028],
    ["Allerik Freeman","SG",31,191,"US",57,57,"T",0.04,2029],
    ["Shannon Bogues","PG",29,187,"US",56,56,"E",0.04,2027],
    ["Dimitris Georgiou","PG",27,193,"GR",55,55,"P",0.04,2028],
    ["Giannis Karakostas","SG",22,190,"GR",48,57,"T",0.04,2029],
    ["Kostas Chantzis","SG",20,191,"GR",48,60,"D",0.04,2029],
    ["Andreas Patrikis","PF",19,202,"GR",48,62,"E",0.04,2029]
  ]);
  // GBL
  R("aek-atenas", [
    ["Lukas Lekavicius","PG",32,180,"LT",70,70,"T",1.48,2029],
    ["Ii Landers Nolley","SF",26,201,"US",68,68,"E",1.12,2028],
    ["Nelly Joseph","C",24,205,"US",68,70,"R",1.12,2029],
    ["Derrick Williams","PF",35,203,"US",67,67,"E",0.96,2029],
    ["Deandre Pinckney","PF",26,202,"US",67,67,"E",0.96,2029],
    ["Frank Bartley","PG",32,191,"US",66,66,"T",0.82,2027],
    ["Dimitris Flionis","PG",29,188,"GR",65,65,"E",0.68,2029],
    ["Gaios Skordilis","C",38,208,"GR",64,64,"E",0.56,2029],
    ["Dimitris Katsivelis","PG",35,196,"GR",63,63,"T",0.45,2027],
    ["Giannoulis Larentzakis","SG",33,196,"GR",60,60,"T",0.21,2027],
    ["Giorgos Tsalmpouris","C",30,217,"GR",60,60,"R",0.21,2028],
    ["Thomas Heurtel","PG",37,189,"FR",60,60,"P",0.21,2029],
    ["Vasilis Chartonas","PG",24,195,"GR",59,62,"P",0.15,2029],
    ["Stavros Gymnopoulos","PG",18,193,"GR",52,69,"P",0.08,2027]
  ]);
  // GBL
  R("aris", [
    ["Adam Mokoka","PG",28,195,"FR",69,69,"P",0.93,2027],
    ["Jeremiah Robinson-Earl","PF",25,206,"US",67,71,"E",0.69,2028],
    ["Nenad Dimitrijevic","PG",28,188,"MK",66,66,"P",0.59,2027],
    ["Eleftherios Bochoridis","PG",32,193,"GR",66,66,"P",0.59,2028],
    ["E.J. Liddell","PF",25,200,"US",65,68,"R",0.49,2028],
    ["Vasilis Toliopoulos","PG",30,188,"GR",65,65,"P",0.49,2027],
    ["Giorgos Tanoulis","C",24,210,"GR",65,70,"E",0.49,2027],
    ["Stelios Poulianitis","SG",31,187,"GR",62,62,"D",0.26,2027],
    ["Matt Morgan","PG",28,188,"US",61,61,"P",0.2,2027],
    ["Vasilis Charalampopoulos","PF",29,202,"GR",61,61,"R",0.2,2027],
    ["Thanasis Antetokounmpo","PF",34,201,"GR",61,61,"R",0.2,2028],
    ["Khem Birch","C",34,206,"CA",58,58,"D",0.08,2029],
    ["Elijah Long","PG",29,185,"GR",58,58,"P",0.08,2029],
    ["Stefan Jovic","PG",35,198,"RS",57,57,"T",0.06,2027],
    ["Kostas Antetokounmpo","C",28,208,"GR",57,57,"E",0.06,2029]
  ]);
  // GBL
  R("doxa-lefkadas", [
    ["Denver Jones","PG",25,194,"US",66,70,"P",0.4,2029],
    ["Josh Sharma","C",31,213,"US",63,63,"E",0.22,2029],
    ["Marios Poulianitis","PG",26,193,"GR",61,61,"T",0.13,2028],
    ["Jakeenan Gant","PF",30,203,"US",60,60,"R",0.1,2028],
    ["Giannis Chatzinikolas","SG",30,193,"GR",60,60,"D",0.1,2029],
    ["Tilemachos Vissariou","SG",24,197,"GR",60,62,"T",0.1,2029],
    ["De’Vion Harmon","SG",25,186,"US",58,62,"E",0.05,2029],
    ["Trey Robinson","SF",24,198,"US",57,62,"T",0.04,2029],
    ["Micah Parrish","SF",25,197,"US",57,58,"E",0.04,2028],
    ["Michalis Tsairelis","PF",38,208,"GR",56,56,"R",0.04,2029],
    ["Giannis Fytros","SG",22,197,"GR",56,64,"E",0.04,2029],
    ["Nikos Arsenopoulos","PG",26,196,"GR",53,53,"E",0.04,2029],
    ["Giannis Sachpatzidis","C",33,208,"GR",51,51,"D",0.04,2028]
  ]);
  // GBL
  R("iraklis", [
    ["Jalen Lecque","PG",26,193,"US",67,67,"P",0.47,2027],
    ["Noah Horchler","PF",28,204,"US",65,65,"E",0.34,2029],
    ["Vasilis Mouratos","PG",28,193,"GR",63,63,"P",0.22,2028],
    ["Hassan Diarra","SG",25,187,"US",62,64,"T",0.18,2029],
    ["Jacob Hutson","C",24,211,"US",61,63,"R",0.14,2027],
    ["Sarantis Mastrogiannopoulos","PG",28,190,"GR",59,59,"T",0.08,2028],
    ["Dontrez Styles","SF",24,198,"US",58,60,"D",0.06,2029],
    ["Giorgos Arnokouros","SF",25,201,"GR",58,62,"D",0.06,2028],
    ["Cole Syllas","SF",26,196,"GR",56,56,"T",0.04,2027],
    ["Diamantis Slaftsakis","PF",32,201,"GR",54,54,"R",0.04,2027],
    ["Cleveland Melvin","PF",35,203,"US",53,53,"R",0.04,2029],
    ["Tasos Cook","PG",23,188,"GR",50,55,"T",0.04,2029],
    ["Sotiris Stavrakopoulos","PF",21,203,"GR",50,60,"R",0.04,2028],
    ["Alexandros Komnianidis","SG",18,192,"GR",48,64,"T",0.04,2027],
    ["Marios Giannikos","PF",19,202,"GR",48,60,"R",0.04,2028]
  ]);
  // GBL
  R("karditsa", [
    ["K.J. Jackson","PG",28,198,"US",67,67,"P",0.49,2028],
    ["Jordan Mcrae","SF",35,198,"US",62,62,"E",0.18,2027],
    ["Chris Smith","PF",26,206,"US",60,60,"D",0.11,2027],
    ["Kostas Kampouridis","PF",27,202,"GR",60,60,"R",0.11,2029],
    ["Justin Turner","PG",28,192,"US",59,59,"T",0.08,2029],
    ["Ja’Vier Francis","C",22,203,"US",59,68,"E",0.08,2028],
    ["Nikos Gkikas","PG",35,185,"GR",58,58,"P",0.06,2028],
    ["Andreas Petropoulos","SG",32,196,"GR",58,58,"D",0.06,2029],
    ["Francis Okoro","C",26,206,"NG",56,56,"R",0.04,2028],
    ["Apostolos Roumoglou","SF",23,201,"GR",55,62,"T",0.04,2028],
    ["Kostas Bilalis","PG",22,185,"GR",48,56,"E",0.04,2028],
    ["Manolis Pasagiannis","PF",20,198,"GR",48,60,"R",0.04,2029],
    ["Thanasis Batategas","C",-1,205,"GR",48,65,"R",0.04,2028]
  ]);
  // GBL
  R("kolossos", [
    ["Ezra Manjon","PG",25,180,"US",66,70,"T",0.48,2029],
    ["Jackson Kreuser","PF",27,208,"US",66,66,"E",0.48,2027],
    ["Jordan Barnett","SF",30,201,"US",65,65,"D",0.4,2029],
    ["Cj Harris","SG",35,191,"US",62,62,"T",0.21,2029],
    ["Giorgos Kamperidis","SG",27,201,"GR",62,62,"T",0.21,2027],
    ["Devonte Upson","C",33,206,"US",60,60,"E",0.12,2027],
    ["Zois Karampelas","PG",25,186,"GR",59,60,"P",0.09,2028],
    ["Payton Willis","SG",28,193,"US",57,57,"T",0.05,2028],
    ["Tyler Stevenson","SF",26,202,"US",56,56,"E",0.05,2027],
    ["Nikos Tsiakmas","PG",26,188,"GR",54,54,"T",0.05,2029],
    ["Vasilis Christidis","C",28,207,"GR",54,54,"R",0.05,2028],
    ["Giannis Eustathiadis","PF",23,197,"GR",52,59,"E",0.05,2029],
    ["Alexandros Kalaitzakis","SF",23,200,"GR",50,56,"D",0.05,2028]
  ]);
  // GBL
  R("maroussi", [
    ["Jordan Walker","PG",27,179,"US",65,65,"P",0.34,2028],
    ["Zeb Jackson","PG",24,195,"US",65,70,"P",0.34,2029],
    ["Lance Ware","C",25,206,"US",64,65,"D",0.28,2028],
    ["Kuany Kuany","PF",26,205,"AU",62,62,"R",0.18,2029],
    ["Christos Iordanou","SF",27,196,"GR",62,62,"D",0.18,2028],
    ["Michalis Lountzis","PG",28,198,"GR",61,61,"P",0.14,2028],
    ["Sousa Silvio De","C",27,206,"AO",58,58,"R",0.06,2029],
    ["Maksim Salash","PF",30,208,"BY",55,55,"E",0.04,2029],
    ["Antonis Koniaris","PG",29,193,"GR",52,52,"T",0.04,2029],
    ["Nikos Touliatos","PF",21,203,"GR",52,63,"R",0.04,2027],
    ["Leonidas Kaselakis","PF",36,201,"GR",52,52,"D",0.04,2028],
    ["Antonis Kalavros","PG",20,183,"GR",50,62,"E",0.04,2028],
    ["Giorgos Tsakiris","PG",19,192,"GR",48,63,"E",0.04,2028],
    ["Christos Venetidis","PG",18,197,"GR",48,64,"T",0.04,2027]
  ]);
  // GBL
  R("mykonos", [
    ["Elijah Childs","PF",27,201,"US",62,62,"R",0.22,2029],
    ["Kyriakos Petanidis","C",25,204,"GR",62,65,"R",0.22,2028],
    ["Devin Cannady","PG",30,188,"US",61,61,"P",0.17,2027],
    ["Filippos Tigkas","PG",23,183,"GR",60,65,"E",0.13,2028],
    ["Giannis Sidiroilias","SF",24,201,"GR",60,63,"E",0.13,2028],
    ["Vasilis Tolias","PG",23,195,"GR",60,67,"T",0.13,2027],
    ["Ronnie Harrell","SF",30,201,"US",60,60,"E",0.13,2027],
    ["D.J. Funderburk","C",29,208,"US",58,58,"R",0.07,2029],
    ["Aggelos Lagios","PF",23,202,"GR",58,64,"R",0.07,2028],
    ["Vaggelis Mantzaris","PG",36,196,"GR",58,58,"T",0.07,2028],
    ["Tyree Appleby","SG",28,185,"US",57,57,"E",0.05,2029],
    ["Vasilis Kavvadas","C",34,205,"GR",56,56,"D",0.05,2027],
    ["Kostas Iatridis","PF",24,206,"GR",55,60,"D",0.05,2029],
    ["Jermaine Love","PG",37,191,"US",54,54,"T",0.05,2027],
    ["Dionysis Skoulidas","SF",29,201,"GR",54,54,"E",0.05,2028]
  ]);
  // GBL
  R("paok", [
    ["Marcus Foster","PG",31,191,"US",69,69,"E",1.1,2027],
    ["Kyle Alexander","PF",24,212,"CA",69,73,"D",1.1,2029],
    ["Breein Tyree","PG",28,188,"US",68,68,"P",0.95,2027],
    ["Cedi Osman","SF",31,201,"TR",67,67,"T",0.82,2028],
    ["Trevor Hudgins","PG",24,180,"US",67,71,"T",0.82,2029],
    ["Nikos Persidis","PF",31,200,"GR",65,65,"R",0.58,2029],
    ["Raiquan Gray","PF",27,201,"US",64,64,"D",0.48,2029],
    ["Clifford Omoruyi","C",24,210,"NG",63,66,"R",0.38,2029],
    ["Ben Moore","C",31,203,"US",63,63,"E",0.38,2029],
    ["Dimitris Kaklamanakis","C",32,206,"GR",62,62,"E",0.3,2027],
    ["Giorgos Fillios","SG",24,196,"GR",62,65,"T",0.3,2028],
    ["Naz Mitrou-Long","PG",33,193,"GR",60,60,"T",0.18,2028],
    ["Nikos Chougkaz","PF",25,208,"GR",58,60,"R",0.1,2027],
    ["Thanasis Bazinas","PG",22,194,"GR",58,66,"T",0.1,2027],
    ["Christos Manthopoulos","PF",20,203,"GR",56,66,"E",0.07,2028]
  ]);
  // GBL
  R("peristeri", [
    ["Jalen Finch","PG",27,184,"US",71,71,"T",1.08,2029],
    ["John Ittounas","SF",24,191,"GR",66,68,"D",0.53,2027],
    ["Alexandros Nikolaidis","PG",24,190,"GR",66,71,"T",0.53,2028],
    ["Kostas Papadakis","PG",28,191,"GR",64,64,"T",0.36,2028],
    ["Omar Payne","C",25,208,"US",64,65,"R",0.36,2028],
    ["Noah Freidel","SG",26,192,"US",62,62,"T",0.23,2029],
    ["Will Carius","PF",28,200,"US",62,62,"E",0.23,2029],
    ["Tytan Anderson","SF",24,197,"US",61,66,"E",0.18,2028],
    ["Ty Nichols","SG",29,191,"US",61,61,"D",0.18,2028],
    ["Joe Petrakis","C",25,211,"GR",60,64,"R",0.13,2027],
    ["Giorgos Gkiouzelis","PF",30,206,"GR",56,56,"R",0.05,2028],
    ["Manolis Chatzidakis","C",26,208,"GR",56,56,"R",0.05,2028],
    ["Tasos Kamateros","PF",26,202,"GR",56,56,"E",0.05,2028],
    ["Dimitris Papageorgiou","PG",19,183,"GR",50,62,"E",0.05,2029],
    ["Christos Gavriilidis","C",19,209,"GR",48,63,"D",0.05,2029]
  ]);
  // GBL
  R("promitheas", [
    ["Adonis Arms","SF",28,198,"US",69,69,"D",0.83,2029],
    ["Kendal Coleman","PF",24,203,"US",65,69,"E",0.44,2027],
    ["Arnoldas Kulboka","PF",28,208,"LT",65,65,"R",0.44,2029],
    ["Jakob Forrester","C",27,207,"US",64,64,"D",0.36,2027],
    ["Nikos Diplaros","PG",29,190,"GR",63,63,"T",0.29,2028],
    ["Shannon Evans","PG",32,185,"US",63,63,"P",0.29,2027],
    ["New Williams","SG",29,184,"US",63,63,"T",0.29,2027],
    ["Giorgos Kalaitzakis","SF",27,202,"GR",60,60,"D",0.13,2027],
    ["Periklis Kouroupakis","C",24,204,"GR",60,62,"R",0.13,2029],
    ["Alex Antetokounmpo","SF",25,203,"GR",60,63,"T",0.13,2028],
    ["Evdoxios Kapetakis","SF",21,195,"GR",52,62,"D",0.05,2027],
    ["Charis Paraskevopoulos","PG",21,198,"GR",50,60,"T",0.05,2029],
    ["Giannis Rallis","PF",18,195,"GR",49,63,"E",0.05,2028],
    ["Apostolos Nikolaidis","PG",20,190,"GR",48,60,"P",0.05,2027],
    ["Dimitris Poulos","SG",18,186,"GR",48,65,"D",0.05,2027]
  ]);
  // BSL
  R("tofas", [
    ["Shavar Reynolds","SG",28,0,"US",68,68,"T",0.69,2028],
    ["Gabe Brown","SF",26,0,"US",68,68,"D",0.69,2027],
    ["Tre'Shawn Thurman","SF",30,0,"US",68,68,"E",0.69,2028],
    ["Terrell Carter","C",30,0,"US",68,68,"R",0.69,2029],
    ["Bryce Jones","PG",31,0,"US",67,67,"P",0.59,2028],
    ["Zach Nutall","SG",26,0,"US",65,65,"D",0.42,2029],
    ["Sadik Kabaca","SF",25,0,"TR",63,66,"E",0.28,2029],
    ["Jamuni McNeace","C",30,0,"US",60,60,"R",0.13,2029],
    ["Yigitcan Saybir","SF",27,0,"TR",57,57,"E",0.05,2027],
    ["Leon Apaydın","PG",27,0,"TR",56,56,"T",0.05,2028],
    ["Efe Postel","PG",20,0,"TR",52,64,"P",0.05,2028],
    ["Emirhan Serbest","PF",19,0,"TR",50,62,"D",0.05,2028],
    ["Berkay Gonul","PF",19,0,"TR",49,61,"R",0.05,2027],
    ["Poyraz Pasaoglu","PF",18,0,"TR",48,63,"D",0.05,2029],
    ["Kerem Corumlular","SG",18,0,"TR",48,65,"T",0.05,2029]
  ]);
  // BSL
  R("turk-telekom", [
    ["Jerrick Harding","PG",28,0,"US",68,68,"E",0.61,2029],
    ["Shaquielle McKissic","PG",36,0,"US",67,67,"P",0.52,2027],
    ["Doğuş Özdemiroğlu","SG",30,0,"TR",66,66,"D",0.44,2029],
    ["Ismaël Bako","C",30,0,"BE",66,66,"E",0.44,2027],
    ["Anthony Lamb","SF",28,0,"US",65,65,"E",0.37,2027],
    ["Uroš Trifunović","SF",25,0,"RS",65,66,"E",0.37,2029],
    ["Emircan Koşut","C",31,0,"TR",65,65,"D",0.37,2027],
    ["Ata Kahraman","SG",27,0,"TR",63,63,"T",0.25,2029],
    ["Tim Schneider","PF",29,0,"DE",63,63,"R",0.25,2028],
    ["Kris Bankston","PF",27,0,"US",61,61,"R",0.15,2029],
    ["Göktuğ Baş","SF",25,0,"TR",59,63,"E",0.08,2027],
    ["Mete Tekçevik","SG",25,0,"TR",58,59,"D",0.06,2027],
    ["Tony Taylor","PG",36,0,"US",56,56,"P",0.04,2027],
    ["Aniil Alyanak","SF",18,0,"TR",48,63,"D",0.04,2028],
    ["Omer Can","PF",18,0,"TR",48,63,"D",0.04,2028]
  ]);
  // BSL
  R("bahcesehir", [
    ["Marcquise Reed","SG",31,0,"US",69,69,"T",0.79,2027],
    ["Tyler Cavanaugh","SF",32,0,"US",67,67,"T",0.59,2028],
    ["Isiaha Mike","SF",29,0,"CA",67,67,"E",0.59,2029],
    ["Damien Inglis","C",31,0,"FR",65,65,"R",0.42,2027],
    ["Malachi Flynn","PG",28,0,"US",64,64,"E",0.34,2027],
    ["David DiLeo","PF",29,0,"US",64,64,"R",0.34,2029],
    ["Aleksa Avramović","SG",31,0,"RS",63,63,"T",0.28,2028],
    ["Ismet Akpinar","PG",31,0,"DE",62,62,"E",0.22,2027],
    ["Kenan Sipahi","PG",31,0,"TR",62,62,"T",0.22,2029],
    ["Trevion Williams","C",26,0,"US",60,60,"D",0.13,2029],
    ["Mateusz Ponitka","SF",33,0,"PL",56,56,"E",0.05,2027],
    ["Can Mutaf","PF",35,0,"TR",55,55,"R",0.05,2028],
    ["Furkan Haltali","C",23,0,"TR",55,61,"E",0.05,2027]
  ]);
  // BSL
  R("galatasaray", [
    ["Vrenz Bleijenbergh","SF",25,211,"BE",71,75,"D",1.08,2029],
    ["Alen Smailagić","PF",26,208,"RS",68,68,"R",0.73,2027],
    ["Nikola Ivanović","PG",32,190,"ME",68,68,"P",0.73,2029],
    ["Dyshawn Pierre","SF",32,198,"CA",68,68,"E",0.73,2029],
    ["Jerome Robinson","SG",29,193,"US",67,67,"T",0.62,2028],
    ["Chimezie Metu","PF",29,208,"NG",67,67,"D",0.62,2027],
    ["Buğrahan Tuncer","PG",33,193,"TR",67,67,"P",0.62,2029],
    ["Zekeriya Yiğit Tekin","SF",24,0,"TR",65,68,"E",0.44,2027],
    ["Berkan Durmaz","PF",29,206,"TR",64,64,"E",0.36,2029],
    ["Şehmus Hazer","PG",27,191,"TR",61,61,"P",0.18,2028],
    ["Can Korkmaz","PG",33,188,"TR",61,61,"P",0.18,2028],
    ["Oumar Ballo","C",24,213,"ML",61,64,"R",0.18,2027],
    ["Aleksej Nikolić","PG",31,191,"SI",60,60,"P",0.13,2027],
    ["Efe Şekeroğlu","PF",24,0,"TR",60,63,"R",0.13,2029]
  ]);
  // BSL
  R("karsiyaka", [
    ["Rashard Kelly","SF",31,201,"US",71,71,"D",0.91,2029],
    ["Markel Starks","PG",24,188,"US",69,73,"P",0.71,2027],
    ["Xavier Munford","PG",34,193,"US",67,67,"P",0.53,2029],
    ["Brianté Weber","PG",33,188,"US",63,63,"T",0.25,2028],
    ["Steven Enoch","C",29,208,"US",63,63,"D",0.25,2028],
    ["Kendall Munson","SG",24,0,"TR",63,68,"T",0.25,2028],
    ["Ishmael El-Amin","PG",27,189,"US",62,62,"T",0.2,2028],
    ["Eylem Eminoğlu","PF",24,0,"TR",61,65,"E",0.15,2027],
    ["Hakan Sayılı","SF",24,0,"TR",60,63,"T",0.11,2027],
    ["Muhaymin Mustafa","SG",26,201,"SD",59,59,"T",0.08,2027],
    ["Yalın Yıldız","PF",24,0,"TR",59,63,"E",0.08,2028],
    ["Yavuz Gültekin","SF",24,0,"TR",59,62,"E",0.08,2027]
  ]);
  // BSL
  R("merkezefendi", [
    ["Victor Bailey Jr.","SG",28,193,"US",69,69,"T",0.6,2029],
    ["Brae Ivey","PF",24,0,"TR",64,69,"R",0.26,2028],
    ["Mahir Agva","C",30,206,"TR",64,64,"R",0.26,2028],
    ["Özolcay","SF",24,0,"TR",64,69,"E",0.26,2027],
    ["Erten Gazi","SG",29,191,"TR",61,61,"T",0.13,2028],
    ["Egemen Güven","C",30,213,"TR",61,61,"R",0.13,2027],
    ["Head coach: Aktaş","SG",24,0,"TR",60,65,"T",0.1,2029],
    ["Denizli Basket#Current roster","PF",24,0,"TR",60,64,"E",0.1,2027],
    ["John Meeks","SF",27,198,"US",60,60,"E",0.1,2029],
    ["Marko Pecarski","PF",26,208,"RS",59,59,"E",0.07,2028],
    ["Yaman Alişan","SF",24,0,"TR",59,62,"T",0.07,2029],
    ["Mustapha Amzil","PF",25,208,"FI",59,62,"D",0.07,2028],
    ["Jhonathan Dunn","SG",24,0,"TR",56,61,"T",0.04,2027],
    ["Assistant coaches: Yetim","PF",24,0,"TR",56,61,"R",0.04,2028],
    ["Horuz","SG",24,0,"TR",56,60,"T",0.04,2029]
  ]);
  // BSL
  R("aliaga", [
    ["Nathan Mensah","C",28,210,"GH",66,66,"R",0.41,2027],
    ["Chris Horton","PF",32,203,"US",63,63,"R",0.23,2029],
    ["Max Abmas","PG",25,180,"US",63,67,"P",0.23,2029],
    ["Olivier Hanlan","PG",33,193,"CA",62,62,"P",0.18,2029],
    ["Keandre Cook","SG",29,196,"US",62,62,"T",0.18,2027],
    ["Yusuf Gündüz","PF",24,0,"TR",61,63,"R",0.14,2029],
    ["Tibet Görener","SF",24,0,"TR",60,62,"T",0.1,2029],
    ["Yiğit Onan","SF",24,208,"TR",60,62,"E",0.1,2029],
    ["Khyri Thomas","SG",30,191,"US",58,58,"T",0.06,2028],
    ["Jarrod Uthoff","PF",33,206,"US",58,58,"E",0.06,2028],
    ["Ozan Yılmaz","PF",24,0,"TR",56,60,"R",0.04,2028],
    ["Anžejs Pasečņiks","PF",30,216,"LV",56,56,"E",0.04,2029],
    ["Thomas Akyazılı","SG",24,0,"TR",54,59,"T",0.04,2027]
  ]);
  // BSL
  R("bursaspor", [
    ["Buğra Çal","SG",24,0,"TR",66,68,"E",0.37,2029],
    ["Brandon Taylor (basketball, born January 1994)","PG",32,178,"US",65,65,"E",0.31,2027],
    ["Leyton Hammonds","SF",24,0,"TR",65,69,"E",0.31,2027],
    ["Javon Freeman-Liberty","PG",26,191,"US",63,63,"E",0.21,2027],
    ["Nate Watson","C",27,208,"US",63,63,"R",0.21,2029],
    ["Mike Moore","PF",24,203,"US",60,63,"D",0.09,2029],
    ["Warren Washington","SG",24,0,"TR",60,65,"T",0.09,2028],
    ["Mete Paçacı","SF",24,0,"TR",58,61,"E",0.05,2028],
    ["Loïc Schwartz","SG",33,198,"BE",57,57,"D",0.04,2029],
    ["Yağız Baykurt","PF",24,0,"TR",57,60,"R",0.04,2027],
    ["Ergi Tırpancı","SF",26,201,"TR",56,56,"E",0.04,2027],
    ["Ömercan İlyasoğlu","PG",25,193,"TR",56,58,"T",0.04,2027]
  ]);
  // BSL
  R("korfez", [
    ["Boo Buie","PG",26,188,"US",65,65,"T",0.29,2029],
    ["Oscar Cluff","C",24,211,"AU",64,68,"R",0.24,2028],
    ["Alex Reese","PF",27,206,"US",63,63,"D",0.19,2027],
    ["Johnny Davis (basketball, born 2002)","SG",24,193,"US",62,66,"T",0.15,2029],
    ["Matt Mitchell","SF",27,198,"US",62,62,"E",0.15,2027],
    ["Efe Sarıca","SF",24,0,"TR",60,64,"D",0.09,2027],
    ["Paulius Danusevičius","PF",25,206,"LT",60,64,"E",0.09,2027],
    ["Mert Akay","PG",26,196,"TR",59,59,"E",0.06,2027],
    ["Assistant coaches: * Ateşdağlı","SF",24,0,"TR",59,61,"T",0.06,2029],
    ["Türel","SG",24,0,"TR",59,63,"D",0.06,2027],
    ["Altan Çamoğlu","SG",24,0,"TR",58,62,"T",0.05,2028],
    ["Berk Akın","SF",24,0,"TR",56,60,"T",0.04,2029],
    ["Head coach: Kavut","PF",24,0,"TR",56,59,"R",0.04,2028],
    ["Mert Emre Ekşioğlu","SG",24,188,"TR",54,58,"T",0.04,2028],
    ["Filip Barna","PF",24,0,"TR",52,55,"R",0.04,2028]
  ]);
  // BSL
  R("bandirma", [
    ["Damien Jefferson","SF",28,196,"US",64,64,"D",0.22,2028],
    ["Zach Hankins","C",30,211,"US",64,64,"R",0.22,2028],
    ["Q. J. Peterson","PG",24,183,"US",64,68,"P",0.22,2028],
    ["Ty Gordon","PG",27,185,"US",63,63,"E",0.18,2027],
    ["Alex Pérez","PG",33,191,"US",63,63,"T",0.18,2029],
    ["Boubacar Toure","C",30,213,"SN",62,62,"R",0.14,2027],
    ["Peyton Aldridge","PF",30,203,"US",61,61,"R",0.11,2028],
    ["Berkay Sinirlioğlu","SG",24,0,"TR",61,63,"T",0.11,2029],
    ["Okben Ulubay","SF",30,200,"TR",59,59,"E",0.06,2029],
    ["Edon Maxhuni","PG",28,188,"FI",59,59,"P",0.06,2027],
    ["Akın Kandemir","SF",24,0,"TR",59,61,"D",0.06,2028],
    ["Berk Demir","PF",31,203,"TR",59,59,"D",0.06,2028],
    ["Özgür Şahin","SG",24,0,"TR",59,61,"T",0.06,2028],
    ["Yıldırım","PF",24,0,"TR",59,61,"R",0.06,2027],
    ["Mehmet Kızıl","PF",24,0,"TR",58,60,"R",0.04,2027]
  ]);
  // BSL
  R("erokspor", [
    ["Jordan Usher","SF",24,201,"US",66,69,"E",0.4,2028],
    ["Kevin Yebo","PF",29,202,"DE",64,64,"R",0.27,2029],
    ["Errick McCollum","PG",24,188,"US",63,67,"T",0.22,2029],
    ["Yunus Emre Sonsırma","PG",33,192,"TR",63,63,"E",0.22,2027],
    ["Metehan Akyel","C",30,206,"TR",63,63,"R",0.22,2028],
    ["Amadou Sow","SG",24,0,"TR",61,66,"D",0.13,2028],
    ["Dallas Moore","PG",31,185,"US",61,61,"P",0.13,2029],
    ["Mike Davis Jr.","SF",24,0,"TR",60,64,"D",0.1,2027],
    ["Keye van der Vuurst","PG",24,191,"NL",59,63,"T",0.07,2028],
    ["Egehan Arna","SF",29,203,"TR",59,59,"T",0.07,2029],
    ["James Webb III","SF",33,206,"US",58,58,"E",0.05,2029],
    ["Muhsin Yaşar","C",30,208,"TR",56,56,"R",0.04,2028],
    ["Ataberk Aksu","SG",24,0,"TR",55,59,"D",0.04,2028],
    ["Melih Tunca","SG",24,0,"TR",55,60,"T",0.04,2029]
  ]);
  // BSL
  R("trabzonspor", [
    ["Marcus Keene","PG",31,175,"US",65,65,"P",0.31,2029],
    ["Xavier Tillman","PF",27,203,"US",65,65,"R",0.31,2027],
    ["Akwasi Yeboah","SF",29,198,"GB",65,65,"T",0.31,2027],
    ["Shaquille Harrison","PG",32,193,"US",64,64,"P",0.25,2028],
    ["Troy Caupain","PG",30,193,"US",63,63,"T",0.2,2029],
    ["Emanuel Terry","PF",30,206,"US",63,63,"D",0.2,2027],
    ["Isaiah Canaan","SG",35,183,"US",62,62,"E",0.16,2029],
    ["Yiğit Arslan","SG",30,193,"TR",61,61,"T",0.12,2029],
    ["Brady Manek","PF",28,206,"US",60,60,"D",0.09,2029],
    ["İsmail Cem Ulusoy","PG",29,183,"TR",60,60,"T",0.09,2029],
    ["Rıdvan Öncel","PG",29,191,"TR",58,58,"E",0.05,2029],
    ["Batu Bircan","PF",24,0,"TR",56,59,"E",0.04,2028],
    ["Yiğit Hamza Mestoğlu","SF",22,203,"TR",56,64,"E",0.04,2028],
    ["Tolga Geçim","SF",30,206,"TR",53,53,"E",0.04,2029],
    ["Ege Arar","PF",30,208,"TR",52,52,"R",0.04,2028]
  ]);
  // BSL
  R("cayirova", [
    ["Rasheed Sulaimon","SG",32,196,"US",65,65,"T",0.29,2028],
    ["Jeremy Simmons","PF",37,206,"US",65,65,"R",0.29,2027],
    ["Michał Sokołowski","SF",33,198,"PL",64,64,"E",0.24,2027],
    ["Berkay Candan","C",33,208,"TR",63,63,"D",0.19,2027],
    ["Gani Gülaslan","PF",32,203,"TR",63,63,"E",0.19,2027],
    ["Nysier Brooks","C",29,208,"US",61,61,"R",0.12,2029],
    ["Roberto Gallinat","SG",29,193,"DE",59,59,"E",0.06,2027],
    ["Jordon Crawford","PG",36,185,"US",58,58,"E",0.05,2029],
    ["Kartal Özmızrak","PG",31,190,"TR",56,56,"P",0.04,2028],
    ["Canberk Kuş","PF",30,203,"TR",56,56,"R",0.04,2027],
    ["Ömer Al","SG",28,195,"TR",56,56,"E",0.04,2027],
    ["Enes Taşkıran","SF",29,200,"TR",55,55,"E",0.04,2028],
    ["Muhammed Kara","SF",20,200,"TR",55,67,"E",0.04,2029]
  ]);
})();
