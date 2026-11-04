import fs from 'node:fs';import path from 'node:path';
const raw=process.argv[2]||'';const base=raw==='/'?'':raw.replace(/\/$/,'');
if(base&&!/^\/[a-zA-Z0-9_.-]+$/.test(base))throw Error('Unexpected GitHub Pages base path');
fs.mkdirSync('_site',{recursive:true});fs.cpSync('site','_site',{recursive:true});
function walk(dir){for(const x of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,x.name);if(x.isDirectory())walk(p);else if(/\.(html|js|css)$/.test(p)&&base){let s=fs.readFileSync(p,'utf8');s=s.replace(/(["'])\/(?!\/)/g,(_,q)=>q+base+'/');fs.writeFileSync(p,s)}}}
walk('_site');fs.writeFileSync('_site/.nojekyll','');console.log('Prepared GitHub Pages files at base path '+(base||'/'));
