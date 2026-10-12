const fs=require('fs'); let s=fs.readFileSync('sede3d.js','utf8');
const r=(a,b)=>{ if(!s.includes(a)) throw new Error('falta '+a.slice(0,50)); s=s.replace(a,()=>b); };
r("sol.shadow.mapSize.set(nv === 'ultra' ? 4096 : 2048, nv === 'ultra' ? 4096 : 2048);","{ const ms = nv === 'ultra' ? 3072 : ['sede', 'casa', 'interior'].indexOf(escena || 'sede') >= 0 ? 1536 : 2048; sol.shadow.mapSize.set(ms, ms); }   // medido con tools/gpu_tiempo.js: la sombra es lo más caro");
r("sol2.shadow.mapSize.set(2048, 2048);","sol2.shadow.mapSize.set(1536, 1536);");
fs.writeFileSync('sede3d.js',s);
