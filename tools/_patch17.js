const fs=require('fs'); let s=fs.readFileSync('tools/banco.js','utf8');
const r=(a,b)=>{ if(!s.includes(a)) throw new Error('falta '+a.slice(0,50)); s=s.replace(a,()=>b); };
r("const club = pos[0]","// Escenas: calle, pueblo, sede, interior:pabellon, interior:tienda, interior:pena, interior:ayuntamiento, casa:<id> (los interiores se capturan una vez, sin horas ni vista aérea)\nconst club = pos[0]");
r("ESC = (arg('escenas') || 'calle,pueblo').split(',');","ESC = (arg('escenas') || 'calle,pueblo,interior:pabellon,interior:tienda,sede').split(',');");
r("const vistas = [['1_pie', null], ['2_aerea', [0, 260, 150]], ['3_centro', [40, 70, 60]]];","const ext = esc === 'calle' || esc === 'pueblo', vistas = ext ? [['1_pie', null], ['2_aerea', [0, 260, 150]], ['3_centro', [40, 70, 60]]] : [['1_pie', null]];");
r("for (const [hn, h] of Object.entries(HORAS)) {","for (const [hn, h] of Object.entries(ext ? HORAS : { dia: 11 })) {");
r("`${esc}_${hn}_${vn}.png`","`${esc.replace(':', '-')}_${hn}_${vn}.png`");
r("GM.sede.abrir(GM.state, esc); }","GM.sede.abrir(GM.state, esc.indexOf(':') > 0 ? 'calle' : esc); if (esc.indexOf(':') > 0) setTimeout(() => GM.sede.cambiarEscena ? GM.sede.cambiarEscena(esc) : 0, 9000); }");
fs.writeFileSync('tools/banco.js',s);
