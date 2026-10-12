const fs=require('fs'); let s=fs.readFileSync('sede3d.js','utf8');
const a="      comp.addPass(ao);"; if(!s.includes(a)) throw 1;
s=s.replace(a,"      // En exteriores el AO repite toda la escena para sacar normales (≈8 ms en una iGPU): solo en Ultra; en interiores, que son pequeños, siempre\n      ao.enabled = ['calle', 'pueblo', 'deportiva'].indexOf(escena || 'sede') < 0 || nv === 'ultra';\n      comp.addPass(ao);");
fs.writeFileSync('sede3d.js',s);
