const fs=require('fs'); let s=fs.readFileSync('sede3d.js','utf8');
const a="comp.addPass(ao);"; if(!s.includes(a)) throw 1;
s=s.replace(a,"{ const set0 = ao.setSize.bind(ao), mitad = nv === 'ultra' ? 0.75 : 0.5; ao.setSize = (w, h) => set0(Math.max(2, Math.round(w * mitad)), Math.max(2, Math.round(h * mitad))); }   // el AO se calcula a menos resolución (es lo más caro del posprocesado)\n      comp.addPass(ao);");
fs.writeFileSync('sede3d.js',s);
