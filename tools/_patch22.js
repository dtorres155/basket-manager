const fs=require('fs');
function ed(f,pairs){ let s=fs.readFileSync(f,'utf8'); for(const [a,b] of pairs){ if(!s.includes(a)) throw new Error(f+' falta '+a.slice(0,50)); s=s.replace(a,()=>b);} fs.writeFileSync(f,s); }
ed('sede3d.js',[
["if (S.bloom) { S.bloom.enabled","if (S.grado) S.grado.uniforms.calido.value = 0.65 * (1 - noche * 0.5);\n    if (S.bloom) { S.bloom.enabled"],
["renderer.toneMappingExposure = 1.05;","renderer.toneMappingExposure = 1.05; if (EXP_PREV) { renderer.toneMappingExposure = EXP_PREV.v * (EXP_PREV.ext === (['sede', 'casa', 'interior'].indexOf(escena || 'sede') < 0) ? 1 : EXP_PREV.ext ? 0.8 : 1.2); }   // el ojo viene adaptado de la escena anterior"],
["      if (S.expObj) { const ex = S.renderer.toneMappingExposure;","      if (S.expObj) { const ex = S.renderer.toneMappingExposure; EXP_PREV = { v: ex, ext: exterior() };"],
["  const HDRI = {};","  let EXP_PREV = null;   // exposición con la que se salió de la escena anterior\n  const HDRI = {};"]]);
