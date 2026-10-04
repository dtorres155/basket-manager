const L=require('./load');
L(['core','datos_util','datos_nba_este','datos_nba_oeste','datos_nba_fin','datos_euroliga','datos_ligas','datos_ligas2','datos_movimientos','datos_ligas3','finanzas','ciudad','partidos','competiciones','mercado','cantera','personaje','carrera','social','sponsor','pueblo','hogar','hogar3d']);
console.log('selfTest',GM.mods.social.selfTest());
GM.rng.seed(11); const st=GM.newGame('unicaja',4,{modo:'carrera',personaje:{nombre:'Marc',apellido:'Soler'},carrera:{origen:'europa',clubId:'unicaja',pos:'SG',perfil:'tirador',nac:'ES',agente:'leal'}});
const S=GM.mods.social, C=GM.mods.competiciones; st.carrera.dinero=200;
console.log('contactos',S.contactos(st).map(c=>c.tipo+':'+c.nombre.split(' ')[0]).join(', '));
let pasos=0;
for(let d=0;d<300;d++){ C.jugarDia(st); if(st.fecha.slice(8)==='02'||true){ const s=S.estado(st); if(st.carrera.social.energia>0&&d%7===1){ S.contactos(st).forEach(k=>{ const a=S.acciones(st,k.id).filter(x=>x.disponible); if(a.length&&st.carrera.social.energia>0){ const r=S.hacer(st,k.id,a[a.length-1].id); if(r.ok&&a[a.length-1].id==='paso') pasos++; } }); } } }
const s=st.carrera.social; console.log('pareja',JSON.stringify(s.pareja),'rel pareja',(S.contactos(st).find(c=>c.tipo==='pareja')||{}).rel,'pasos',pasos,'moral',Math.round(st.carrera.moral));
console.log('relaciones',S.contactos(st).map(c=>c.tipo[0]+Math.round(c.rel)).join(' '));
console.log('hitos',st.carrera.hitos.slice(0,4).map(h=>h.texto).join(' | '));
