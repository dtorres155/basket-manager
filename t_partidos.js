const L = require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','partidos']);
const st = GM.newGame('fc-barcelona', 1);
console.log('selfTest', GM.mods.partidos.selfTest());
GM.rng.seed(5);
function run(comp, a, b, n){
  let pa=0,pb=0,wa=0, t0=Date.now(), ot=0;
  for(let i=0;i<n;i++){
    for(const id in st.jugadores){const p=st.jugadores[id];p.estado.fatiga=0;p.estado.lesion=null;}
    const home=i%2?a:b, away=i%2?b:a;
    const r=GM.mods.partidos.simular(st,{comp,local:home,visitante:away});
    const sa=home===a?r.local:r.visitante, sb=home===a?r.visitante:r.local;
    pa+=sa;pb+=sb;if(sa>sb)wa++;ot+=r.ot?1:0;
  }
  console.log(comp,a,'vs',b,'ovr',GM.mods.partidos.ovrEquipo(st,a),GM.mods.partidos.ovrEquipo(st,b),'avg',(pa/n).toFixed(1),(pb/n).toFixed(1),'win%',(wa/n).toFixed(2),'ot%',(ot/n).toFixed(3),'ms/game',((Date.now()-t0)/n).toFixed(2));
}
run('NBA','oklahoma-city-thunder','utah-jazz',300);
run('NBA','boston-celtics','new-york-knicks',300);
run('NBA','los-angeles-lakers','washington-wizards',300);
run('EUROLIGA','real-madrid','besiktas',300);
run('EUROLIGA','fc-barcelona','olympiacos',300);
run('ACB','fc-barcelona','unicaja',300);
run('ACB','unicaja','obradoiro',300);
const r=GM.mods.partidos.simular(st,{comp:'EUROLIGA',local:'fc-barcelona',visitante:'real-madrid'});
console.log(r.local,r.visitante,JSON.stringify(r.cuartos),r.cronica.join(' | '));
