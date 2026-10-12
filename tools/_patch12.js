const fs=require('fs'); let s=fs.readFileSync('sede3d.js','utf8');
const r=(a,b)=>{ if(!s.includes(a)) throw new Error('falta '+a.slice(0,60)); s=s.replace(a,()=>b); };
r("const h = S.hora || 9, tarde = Math.max(0, Math.min(1, (h - 17.5) / 2.5)), noche = Math.max(0, Math.min(1, (h - 19.5) / 1.5)),",
"const h = S.hora || 9, SO = GM.mods.sol, hs = SO ? SO.horaSolar(S.st, h) : h, sp = SO ? SO.salidaPuesta(SO.latitud(S.st), S.st.fecha) : { sale: 7, pone: 20 }, tarde = Math.max(0, Math.min(1, (hs - (sp.pone - 2.5)) / 2.5)), noche = Math.max(0, Math.min(1, Math.max((hs - (sp.pone - 0.5)) / 1.5, (sp.sale + 0.5 - hs) / 1.2))),");
r("S.luces.sol.intensity = (2.6 * (1 - noche) + 0.7 * noche) * triste;",
"S.solElev = SO ? SO.posicion(SO.latitud(S.st), S.st.fecha, hs).elev : 0.9;   // altura real del sol: baja en invierno y al caer la tarde\n    S.luces.sol.intensity = (2.6 * (1 - noche) + 0.7 * noche) * triste * (SO ? Math.max(0.55, Math.min(1, (S.solElev + 0.04) / 0.45)) : 1);");
r("{ const sol = S.luces.sol; sol.position.set(S.foco.x - 14, 26, S.foco.z + 12);",
"{ const sol = S.luces.sol, SO = GM.mods.sol, d = SO && S.st ? SO.direccion(SO.latitud(S.st), S.st.fecha, SO.horaSolar(S.st, S.hora || 9), 0.3) : { x: -0.45, y: 0.84, z: 0.39 }; sol.position.set(S.foco.x + d.x * 31, d.y * 31, S.foco.z + d.z * 31);");
fs.writeFileSync('sede3d.js',s);
