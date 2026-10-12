const fs=require('fs'); let s=fs.readFileSync('sede3d.js','utf8');
const a="      if (S.composer) S.composer.render(); else renderer.render(scene, camera);";
if(!s.includes(a)) throw 1;
s=s.replace(a,"      // el mapa de sombras se refresca un fotograma de cada dos (la sombra es lo más caro del dibujo); en Ultra, cada uno\n      if (renderer.shadowMap.enabled) { renderer.shadowMap.autoUpdate = false; S.nSombra = ((S.nSombra || 0) + 1) % 2; renderer.shadowMap.needsUpdate = S.nSombra === 0 || nv === 'ultra'; }\n"+a);
fs.writeFileSync('sede3d.js',s);
