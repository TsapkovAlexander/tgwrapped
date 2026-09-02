// Собирает правдоподобный экспорт Telegram для витрины на главной.
// Витрина должна быть посчитана настоящим анализатором, но не показывать
// ничью настоящую переписку: репозиторий публичный.
//   node scripts/make-fixture.mjs > /tmp/demo-chat.json
const A = 'Лена Соколова', M = 'Дима Орлов';
let seed = 20260902;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = a => a[Math.floor(rnd() * a.length)];
const chance = p => rnd() < p;

const COMMON = 'ага да ок хорошо понял слушай смотри давай ладно сейчас потом завтра сегодня вечером утром думаю кажется наверное конечно точно';
const HERS = ['короче', 'слушай', 'обнимаю', 'солнце', 'спасибо', 'пожалуйста', 'кстати'];
const HIS = ['ща', 'норм', 'погнали', 'сорян', 'ясно', 'падажжи', 'угу'];
const NOUNS = 'дом работа кофе ужин планы дорога магазин квартира отпуск встреча звонок фильм сериал прогулка погода поезд самолёт кот';
const VERBS = 'приеду позвоню закину куплю посмотрю сделаю успею проверю напишу заберу';
const EMOJI = ['😂', '❤', '🙈', '🔥', '😅', '🥰', '👍'];
const LINKS = ['https://youtube.com/watch?v=x1', 'https://music.yandex.ru/album/22', 'https://kinopoisk.ru/film/42', 'https://t.me/durov/1'];

const words = s => s.split(' ');
function phrase(mine) {
  const n = 1 + Math.floor(rnd() * 9);
  const bag = [...words(COMMON), ...words(NOUNS), ...words(VERBS), ...mine, ...mine];
  const out = [];
  for (let i = 0; i < n; i++) out.push(pick(bag));
  let t = out.join(' ');
  if (chance(0.12)) t += '?';
  if (chance(0.08)) t = 'спасибо, ' + t;
  if (chance(0.05)) t = 'прости, ' + t;
  if (chance(0.06)) t += ' ' + pick(EMOJI);
  if (chance(0.05)) t += ' ахаха';
  return t;
}

const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const messages = [];
let id = 1;
const start = new Date(2024, 1, 12, 0, 5, 0);   // раньше любой сессии: это первое сообщение чата
const days = 933;
messages.push({id: id++, type: 'message', date: iso(start), from: M, from_id: 'user2',
  text: 'привет! это Дима с той конференции, лови мой тг'});

for (let d = 0; d < days; d++) {
  const day = new Date(start.getTime() + d * 864e5);
  if (chance(0.17)) continue;                                   // день молчания
  const sessions = 1 + Math.floor(rnd() * 3);
  for (let s = 0; s < sessions; s++) {
    let hour = [8, 12, 19, 22, 23][Math.floor(rnd() * 5)];
    if (chance(0.06)) hour = 1;                                  // ночной заход
    const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, Math.floor(rnd() * 60));
    let who = chance(0.52) ? A : M;
    const len = 3 + Math.floor(rnd() * 34);
    for (let i = 0; i < len; i++) {
      const mine = who === A ? HERS : HIS;
      const m = {id: id++, type: 'message', date: iso(t), from: who, from_id: who === A ? 'user1' : 'user2'};
      if (chance(0.015)) { m.media_type = 'sticker'; m.sticker_emoji = pick(EMOJI); m.text = ''; }
      else if (chance(0.005)) { m.media_type = 'voice_message'; m.duration_seconds = 5 + Math.floor(rnd() * 90); m.text = ''; }
      else if (chance(0.02)) { m.photo = 'photos/p.jpg'; m.text = ''; }
      else if (chance(0.03)) m.text = pick(LINKS) + ' глянь';
      else m.text = phrase(mine);
      if (chance(0.04)) m.edited = iso(t);
      if (chance(0.06)) m.reply_to_message_id = m.id - 1;
      if (chance(0.02)) m.reactions = [{type: 'emoji', emoji: pick(EMOJI), count: 1,
        recent: [{from: who === A ? M : A, from_id: who === A ? 'user2' : 'user1', date: iso(t)}]}];
      messages.push(m);
      // живой ритм: обычно отвечают за десятки секунд, изредка отходят
      const gap = chance(0.72) ? 8 + Math.floor(rnd() * 70)
                : chance(0.85) ? 90 + Math.floor(rnd() * 800)
                : 900 + Math.floor(rnd() * 3600);
      t.setSeconds(t.getSeconds() + gap);
      if (chance(0.62)) who = who === A ? M : A;                 // иначе — сообщение вдогонку
    }
    if (chance(0.04)) messages.push({id: id++, type: 'service', date: iso(t), actor: chance(0.5) ? A : M,
      actor_id: 'user1', action: 'phone_call', duration_seconds: 60 + Math.floor(rnd() * 3000),
      discard_reason: chance(0.15) ? 'missed' : 'hangup'});
  }
}
messages.push({id: id++, type: 'message', date: iso(new Date(start.getTime() + (days - 1) * 864e5 + 82800000)),
  from: A, from_id: 'user1', text: 'ну всё, до завтра тогда'});

process.stdout.write(JSON.stringify({name: 'Дима', type: 'personal_chat', id: 1, messages}));
