// Версия живёт в package.json, но на статической странице её некому подставить,
// поэтому она продублирована в <meta name="version">. Скрипт стережёт это дублирование.
// Без аргументов — проверка (падает при расхождении), с --write — синхронизация.
import {readFileSync, writeFileSync} from 'node:fs';

const PKG='package.json', HTML='app/index.html', RE=/(<meta name="version" content=")([^"]*)(">)/;
const want=JSON.parse(readFileSync(PKG,'utf8')).version;
const html=readFileSync(HTML,'utf8');
const m=html.match(RE);

if(!m){console.error(`${HTML}: нет <meta name="version">`);process.exit(1)}
if(m[2]===want){console.log(`версия ${want}: package.json и ${HTML} совпадают`);process.exit(0)}

if(process.argv.includes('--write')){
  writeFileSync(HTML,html.replace(RE,`$1${want}$3`));
  console.log(`${HTML}: ${m[2]} → ${want}`);
}else{
  console.error(`расхождение: package.json ${want}, ${HTML} ${m[2]}. Запустите npm run version:sync`);
  process.exit(1);
}
