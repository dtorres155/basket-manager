const fs=require('fs'); let s=fs.readFileSync('tools/banco.js','utf8');
const r=(a,b)=>{ if(!s.includes(a)) throw new Error('falta '+a.slice(0,50)); s=s.replace(a,()=>b); };
r(" if (esc.indexOf(':') > 0) setTimeout(() => GM.sede.cambiarEscena ? GM.sede.cambiarEscena(esc) : 0, 9000); }","}");
r("    await p.evaluate(() => { const S = GM.sede._estado(); if (S.panel)","    if (esc.indexOf(':') > 0) { await p.evaluate(e => GM.sede._escena(e), esc); await sleep(6000); }\n    await p.evaluate(() => { const S = GM.sede._estado(); if (S.panel)");
fs.writeFileSync('tools/banco.js',s);
