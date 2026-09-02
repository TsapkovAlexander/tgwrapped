// Пересобирает app/demo.json настоящим анализатором из экспорта Telegram.
// demo.json — витрина на лендинге, поэтому имена заменяются на вымышленные,
// а тексты первого и последнего сообщения по умолчанию вычищаются: чат живой и личный.
//   node scripts/make-demo.mjs <path/to/result.json> [--names Лена,Дима] [--keep-quotes]
import {readFileSync, writeFileSync} from 'node:fs';
import {analyze} from '../app/stats.js';

const [src, ...rest] = process.argv.slice(2);
if (!src) { console.error('укажите путь к result.json'); process.exit(1); }
const namesArg = rest.includes('--names') ? rest[rest.indexOf('--names') + 1] : 'Лена,Дима';
const [A, M] = namesArg.split(',');
const keepQuotes = rest.includes('--keep-quotes');

const S = analyze(JSON.parse(readFileSync(src, 'utf8')), {names: {A, M}});
if (!keepQuotes) {
  S.first_msg.text = 'привет! это ' + M + ' с той конференции, лови мой тг';
  S.last_msg.text = 'ну всё, до завтра тогда';
}
writeFileSync('app/demo.json', JSON.stringify(S) + '\n');

const kb = (JSON.stringify(S).length / 1024).toFixed(1);
console.log(`app/demo.json: ${Object.keys(S).length} полей, ${kb} КБ`);
console.log(`${S.total} сообщений · ${S.days} дней · имена: ${S.names.A} и ${S.names.M}`);
console.log(`цитаты: ${keepQuotes ? 'РЕАЛЬНЫЕ из переписки' : 'заменены'}`);
console.log(`фирменные ${S.names.A}: ${S.signature.A.map(w => w[0]).join(', ') || '—'}`);
console.log(`фирменные ${S.names.M}: ${S.signature.M.map(w => w[0]).join(', ') || '—'}`);
console.log(`домены: ${S.domains.slice(0, 5).map(d => d[0]).join(', ')}`);
