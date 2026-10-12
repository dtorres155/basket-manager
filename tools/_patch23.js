const fs=require('fs');
function ed(f,pairs){ let s=fs.readFileSync(f,'utf8'); for(const [a,b] of pairs){ if(!s.includes(a)) throw new Error(f+' falta '+a.slice(0,50)); s=s.replace(a,()=>b);} fs.writeFileSync(f,s); }
ed('sede3d.js',[
["sol.shadow.blurSamples = 12; scene.add(sol, sol.target);",
"sol.shadow.blurSamples = 12; scene.add(sol, sol.target);\n    // Cascada lejana (solo Ultra): segunda luz solar con un mapa de 260 m que reparte con la cercana, así las sombras llegan a las calles de alrededor\n    let sol2 = null; if (alta && nv === 'ultra') { sol2 = new THREE.DirectionalLight(0xfff1dc, 1); sol2.castShadow = true; sol2.shadow.mapSize.set(2048, 2048); Object.assign(sol2.shadow.camera, { left: -130, right: 130, top: 110, bottom: -110, near: 1, far: 260 }); sol2.shadow.bias = -0.001; sol2.shadow.normalBias = 0.06; sol2.shadow.radius = 3; scene.add(sol2, sol2.target); }"],
["luces: { cielo, sol },","luces: { cielo, sol, sol2 },"],
["    if (S.charcosNoche) S.charcosNoche.opacity = noche * 0.9;","    if (S.luces.sol2) { const l2 = S.luces.sol2; l2.color.copy(S.luces.sol.color); l2.intensity = S.luces.sol.intensity * 0.4; S.luces.sol.intensity *= 0.6; }\n    if (S.charcosNoche) S.charcosNoche.opacity = noche * 0.9;"],
["sol.position.set(fx + d.x * 31, d.y * 31, fz + d.z * 31); sol.target.position.set(fx, 0, fz); sol.target.updateMatrixWorld(); }",
"sol.position.set(fx + d.x * 31, d.y * 31, fz + d.z * 31); sol.target.position.set(fx, 0, fz); sol.target.updateMatrixWorld();\n        const l2 = S.luces.sol2; if (l2) { const q2 = 260 / 2048 * 8, gx = Math.round(S.foco.x / q2) * q2, gz = Math.round(S.foco.z / q2) * q2; l2.position.set(gx + d.x * 120, d.y * 120, gz + d.z * 120); l2.target.position.set(gx, 0, gz); l2.target.updateMatrixWorld(); } }"],
["{ dia: 0.9, nublado: 0.85, tarde: 0.8, noche: 0.5 }","{ dia: 0.9, nublado: 0.85, tarde: 1.1, noche: 0.5 }"],
["if (S.luces && S.luces.sol) S.luces.sol.castShadow = false;","if (S.luces && S.luces.sol) S.luces.sol.castShadow = false; if (S.luces && S.luces.sol2) S.luces.sol2.castShadow = false;"]]);
