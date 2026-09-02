// Проставляет адрес сайта в абсолютные ссылки OG-разметки.
// Facebook и X принимают og:image только абсолютным, а домен у проекта меняется,
// поэтому адрес живёт в одном месте и переставляется одной командой:
//   node scripts/set-site.mjs https://tgwrapped.ru
import {readFileSync, writeFileSync} from 'node:fs';

const origin = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https?:\/\/[^/]+$/.test(origin)) {
  console.error('нужен адрес вида https://example.ru');
  process.exit(1);
}
const FILE = 'app/index.html';
let html = readFileSync(FILE, 'utf8');
const before = html;

const set = (re, value) => { html = html.replace(re, value); };
set(/(<link rel="canonical" href=")[^"]*(">)/, `$1${origin}/$2`);
set(/(<meta property="og:url" content=")[^"]*(">)/, `$1${origin}/$2`);
set(/(<meta property="og:image" content=")[^"]*(">)/, `$1${origin}/og.png$2`);
set(/(<meta name="twitter:image" content=")[^"]*(">)/, `$1${origin}/og.png$2`);

if (html === before) { console.error('в разметке не нашлось ни одного тега для подстановки'); process.exit(1); }
writeFileSync(FILE, html);
for (const m of html.matchAll(/<(?:link rel="canonical"|meta (?:property|name)="(?:og:url|og:image|twitter:image)")[^>]*>/g))
  console.log(m[0]);
