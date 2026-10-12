const fs=require('fs'); let s=fs.readFileSync('sede3d.js','utf8');
const r=(a,b)=>{ if(!s.includes(a)) throw new Error('falta '+a.slice(0,60)); s=s.replace(a,()=>b); };
r("S.renderer.toneMappingExposure = T0.exp * (1 - noche * 0.12);",
"S.expObj = T0.exp * (1 - noche * 0.12) * (S.solElev < 0.15 && !noche ? 1 + (0.15 - S.solElev) * 0.5 : 1);   // el ojo se adapta: la exposición se acerca poco a poco a este valor");
r("S.tLuz = (S.tLuz || 0) - dt; if (S.tLuz <= 0) { S.tLuz = 0.5; aplicarAmbiente(); }",
"S.tLuz = (S.tLuz || 0) - dt; if (S.tLuz <= 0) { S.tLuz = 0.5; aplicarAmbiente(); }\n      if (S.expObj) { const ex = S.renderer.toneMappingExposure; S.renderer.toneMappingExposure = Math.abs(ex - S.expObj) < 0.002 ? S.expObj : ex + (S.expObj - ex) * Math.min(1, dt * 1.5); }");
fs.writeFileSync('sede3d.js',s);
