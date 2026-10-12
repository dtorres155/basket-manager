const fs=require('fs'); const L=fs.readFileSync('sede3d.js','utf8').split('\n');
// bloques (1-indexado, inclusive)
const a1=L.findIndex(l=>l.startsWith('  // Entorno (reflejos y luz ambiente')), a2=L.findIndex(l=>l.startsWith('  async function construir(st)'))-1;
const b1=L.findIndex(l=>l.startsWith('  // La luz depende de la hora')); let b2=b1; while(!/^  }$/.test(L[b2])||b2<=b1+3) b2++;
let bloque1=L.slice(a1,a2+1), bloque2=L.slice(b1,b2+1);
let t=[...bloque1,'',...bloque2].join('\n');
t=t.replace("  let EXP_PREV = null;   // exposición con la que se salió de la escena anterior\n","");
// S local en cada función multilínea
t=t.replace(/^(  function (entorno|actualizarCielo|elegirHDRI|aplicarAmbiente)\([^)]*\) \{)$/gm,"$1\n    const S = ctx.S();");
t=t.replace("const pm = new THREE.PMREMGenerator(S ? S.renderer : null)","const pm = new THREE.PMREMGenerator(ctx.S() ? ctx.S().renderer : null)").replace("if (S) S.hdriK = null;","if (ctx.S()) ctx.S().hdriK = null;");
t=t.replace(/\bexterior\(\)/g,'ctx.exterior()');
const out=`/* Luz y ambiente del mundo 3D (sede, calle, pueblo, interiores): cielo de reflejos (procedural o HDRI de Poly Haven, CC0), tono por ciudad,
   sol real (sol.js), hora, clima y exposición. Se separó de sede3d.js: GM.sedeLuz({ S: () => escena activa, exterior: () => bool }) devuelve { entorno, aplicarAmbiente, tonoCiudad, mezcla }. */
(function () {
  GM.sedeLuz = function (ctx) {
${t.split('\n').map(l=>l?'  '+l:l).join('\n')}
    return { entorno, aplicarAmbiente, tonoCiudad, mezcla };
  };
})();
`;
fs.writeFileSync('sede_luz.js',out);
let s=[...L.slice(0,a1),...L.slice(a2+1,b1),...L.slice(b2+1)].join('\n');
s=s.replace("  let S = null; // escena activa\n","  let S = null; // escena activa\n  let EXP_PREV = null;   // exposición con la que se salió de la escena anterior\n  const { entorno, aplicarAmbiente, tonoCiudad, mezcla } = GM.sedeLuz({ S: () => S, exterior: () => ['calle', 'pueblo', 'deportiva'].indexOf(S.escena) >= 0 });   // sede_luz.js\n");
fs.writeFileSync('sede3d.js',s);
console.log(bloque1.length,bloque2.length);
