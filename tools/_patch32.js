const fs=require('fs'); let s=fs.readFileSync('ui.js','utf8');
const a="style: { textAlign: 'left', marginBottom: '6px' }, onclick: () => { CP.setNivel(n);"; if(!s.includes(a)) throw 1;
s=s.replace(a,"style: { display: 'block', width: '100%', textAlign: 'left', marginBottom: '6px' }, onclick: () => { CP.setNivel(n);");
const b="h('b', null, n.charAt(0).toUpperCase() + n.slice(1)), h('div', { class: 'muted' }, DESC[n])"; if(!s.includes(b)) throw 2;
s=s.replace(b,"h('b', { style: { display: 'block' } }, n.charAt(0).toUpperCase() + n.slice(1)), h('span', { style: { display: 'block', fontSize: '0.85em', opacity: 0.8, fontWeight: 400 } }, DESC[n])");
fs.writeFileSync('ui.js',s);
