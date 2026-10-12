const fs=require('fs'); let s=fs.readFileSync('sede3d.js','utf8');
const l="    if (S.luces.sol2) { const l2 = S.luces.sol2; l2.color.copy(S.luces.sol.color); l2.intensity = S.luces.sol.intensity * 0.4; S.luces.sol.intensity *= 0.6; }\n";
if(!s.includes(l)) throw 1; s=s.replace(l,'');
const a="    if (S.chipHora) { const hh = Math.floor(h),";
if(!s.includes(a)) throw 2; s=s.replace(a,l+a); fs.writeFileSync('sede3d.js',s);
