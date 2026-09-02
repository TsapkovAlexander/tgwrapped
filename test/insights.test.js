import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyze} from '../app/stats.js';
import {chat,msg,exp} from './fixture.js';

const base=(extra=[])=>analyze(exp([...chat(50),...extra]));
const who=(S,name)=>S.names.A===name?'A':'M';

test('первое сообщение чата сохраняется целиком', () => {
  const S=analyze(exp([msg(1,'Лена','2026-01-01T09:00:00','ну привет, незнакомец'),...chat(50,['Лена','Дима'],'2026-01-02T10:00:00')]));
  assert.equal(S.first_msg.text,'ну привет, незнакомец');
  assert.equal(S.first_msg.date,'2026-01-01');
  assert.equal(S.first_msg.who,who(S,'Лена'));
});

test('фирменные слова — те, что один говорит, а другой почти нет', () => {
  const extra=[];
  for(let i=0;i<12;i++)extra.push(msg(100+i,'Лена',`2026-02-0${1+i%9}T1${i%10}:00:00`,'короче ситуация такая'));
  for(let i=0;i<12;i++)extra.push(msg(200+i,'Дима',`2026-03-0${1+i%9}T1${i%10}:30:00`,'слушай вообще нормально'));
  const S=base(extra);
  const lena=S.signature[who(S,'Лена')].map(w=>w[0]);
  const dima=S.signature[who(S,'Дима')].map(w=>w[0]);
  assert.ok(lena.includes('короче'),`у Лены нет «короче»: ${lena}`);
  assert.ok(dima.includes('слушай'),`у Димы нет «слушай»: ${dima}`);
  assert.ok(!lena.includes('слушай'),'слово другого не должно попадать в фирменные');
});

test('пинг-понг: самая длинная быстрая перестрелка', () => {
  const extra=[];
  const t=new Date('2026-05-05T20:00:00').getTime();
  for(let i=0;i<9;i++){const d=new Date(t+i*20000);
    extra.push(msg(300+i,i%2?'Дима':'Лена',`2026-05-05T20:${String(Math.floor(i*20/60)).padStart(2,'0')}:${String(i*20%60).padStart(2,'0')}`,'!'))}
  const S=base(extra);
  assert.ok(S.pingpong.n>=9,`перестрелка ${S.pingpong.n} короче ожидаемой`);
  assert.equal(S.pingpong.date,'2026-05-05');
});

test('дожимание: написал ещё раз, не дождавшись ответа', () => {
  const extra=[
    msg(400,'Лена','2026-06-01T10:00:00','ты тут'),
    msg(401,'Лена','2026-06-01T10:30:00','ну ответь'),
    msg(402,'Лена','2026-06-01T11:10:00','ладно'),
    msg(403,'Дима','2026-06-01T12:00:00','я тут'),
  ];
  const S=base(extra);
  assert.ok(S.double[who(S,'Лена')]>=2,`дожиманий у Лены ${S.double[who(S,'Лена')]}, ждали 2+`);
  assert.equal(S.double[who(S,'Дима')],0);
});

test('доля отвеченных вопросов', () => {
  const extra=[
    msg(500,'Лена','2026-07-01T10:00:00','как дела?'),
    msg(501,'Дима','2026-07-01T10:01:00','нормально'),
    msg(502,'Лена','2026-07-02T10:00:00','а это точно?'),
  ];
  const S=base(extra);
  const a=S.answered[who(S,'Лена')];
  assert.ok(a>0&&a<100,`доля ответов ${a} должна быть между 0 и 100`);
});

test('простыни считаются отдельно от коротких реплик', () => {
  const S=base([msg(600,'Дима','2026-08-01T10:00:00','я'.repeat(400))]);
  assert.equal(S.long_msgs[who(S,'Дима')],1);
  assert.equal(S.long_msgs[who(S,'Лена')],0);
});

test('стикеры и медиа считаются по автору', () => {
  const S=base([
    msg(700,'Лена','2026-08-02T10:00:00','',{media_type:'sticker',sticker_emoji:'🔥'}),
    msg(701,'Лена','2026-08-02T10:01:00','',{media_type:'sticker',sticker_emoji:'🔥'}),
    msg(702,'Дима','2026-08-02T10:02:00','',{media_type:'sticker',sticker_emoji:'😎'}),
    msg(703,'Дима','2026-08-02T10:03:00','',{photo:'photo_1.jpg'}),
  ]);
  assert.equal(S.media[who(S,'Лена')].sticker,2);
  assert.equal(S.media[who(S,'Дима')].sticker,1);
  assert.equal(S.media[who(S,'Дима')].photo,1);
  assert.deepEqual(S.stickers.top[0],['🔥',2]);
});

test('голосовые: считается и штука, и суммарное время', () => {
  const S=base([
    msg(800,'Дима','2026-08-03T10:00:00','',{media_type:'voice_message',duration_seconds:65}),
    msg(801,'Дима','2026-08-03T10:05:00','',{media_type:'voice_message',duration_seconds:130}),
  ]);
  assert.equal(S.voice[who(S,'Дима')],2);
  assert.equal(S.voice_secs[who(S,'Дима')],195);
});

test('ритуалы: доброе утро и спокойной ночи', () => {
  const S=base([
    msg(900,'Лена','2026-08-04T08:00:00','Доброе утро!'),
    msg(901,'Дима','2026-08-04T23:30:00','спокойной ночи'),
  ]);
  assert.equal(S.rituals.morning[who(S,'Лена')],1);
  assert.equal(S.rituals.night[who(S,'Дима')],1);
});

test('месяц-рекордсмен и самый тихий месяц', () => {
  const extra=[];
  for(let i=0;i<70;i++)extra.push(msg(1000+i,i%2?'Дима':'Лена',`2026-09-${String(1+i%28).padStart(2,'0')}T12:00:00`,'много'));
  const S=base(extra);
  assert.equal(S.month_top[0],'2026-09');
  assert.ok(S.month_top[1]>=70);
  assert.ok(S.month_low[1]<=S.month_top[1]);
});

test('код и логи не попадают в словарные метрики', () => {
  const extra=[];
  // человек десять раз кинул кусок кода — это не его лексика
  for(let i=0;i<10;i++)extra.push(msg(2000+i,'Лена',`2026-04-${String(1+i).padStart(2,'0')}T10:00:00`,
    [{type:'pre',text:'const secretsUsedInArgoEnv = null; // data line'},{type:'plain',text:' глянь плиз'}]));
  const S=analyze(exp([...chat(50),...extra]));
  const lena=S.names.A==='Лена'?'A':'M';
  const words=[...S.signature[lena].map(w=>w[0]),...S.top_words[lena].map(w=>w[0])];
  for(const junk of ['null','data','line','secretsusedinargoenv'])
    assert.ok(!words.includes(junk),`«${junk}» не должно попадать в словарь: ${words}`);
});

test('слово из одного дня не считается фирменным', () => {
  const extra=[];
  // двадцать раз за один день — это разовый всплеск, а не привычка
  for(let i=0;i<20;i++)extra.push(msg(3000+i,'Дима',`2026-04-20T1${i%10}:0${i%6}:00`,'абракадабра'));
  const S=analyze(exp([...chat(50),...extra]));
  const dima=S.names.A==='Дима'?'A':'M';
  assert.ok(!S.signature[dima].map(w=>w[0]).includes('абракадабра'),'разовый всплеск попал в фирменные');
});

test('слово вроде «constructor» не ломает подсчёт', () => {
  const extra=[];
  for(const w of ['constructor','valueof','tostring','hasownproperty'])
    for(let i=0;i<5;i++)extra.push(msg(4000+extra.length,'Дима',`2026-05-1${i}T10:00:00`,`${w} снова`));
  const S=analyze(exp([...chat(50),...extra]));
  const dima=S.names.A==='Дима'?'A':'M';
  for(const [w,rate,n] of S.signature[dima]){
    assert.equal(typeof rate,'number',`${w}: кратность не число`);
    assert.ok(Number.isFinite(rate)&&Number.isFinite(n),`${w}: получился мусор ${rate}/${n}`);
  }
  assert.ok(S.top_words[dima].every(([,n])=>Number.isFinite(n)),'в топ-словах нечисловые счётчики');
});

test('логи и код обычным текстом тоже не идут в словарь', () => {
  const extra=[];
  const log='ERROR: null data line 42 at handler(request) { return false; }';
  for(let i=0;i<10;i++)extra.push(msg(5000+i,'Лена',`2026-06-${String(10+i).padStart(2,'0')}T10:00:00`,log));
  // а обычная фраза с латинским словом остаться должна
  for(let i=0;i<10;i++)extra.push(msg(5100+i,'Лена',`2026-06-${String(10+i).padStart(2,'0')}T11:00:00`,'скинь плиз ссылку на дизайн'));
  const S=analyze(exp([...chat(50),...extra]));
  const lena=S.names.A==='Лена'?'A':'M';
  const words=[...S.signature[lena].map(w=>w[0]),...S.top_words[lena].map(w=>w[0])];
  for(const junk of ['null','data','line','handler','return','error'])
    assert.ok(!words.includes(junk),`«${junk}» просочилось: ${words}`);
  assert.ok(words.includes('ссылку')||words.includes('дизайн'),`живая речь потерялась: ${words}`);
});

test('самый тихий месяц ищется среди полных, а не среди огрызков', () => {
  const extra=[];
  // чат начался 28 февраля — в феврале всего пара сообщений, это не «тихий месяц»
  extra.push(msg(6000,'Лена','2026-02-28T22:00:00','стартуем'),msg(6001,'Дима','2026-02-28T22:01:00','ага'));
  for(let d=1;d<=20;d++)extra.push(msg(6100+d,d%2?'Лена':'Дима',`2026-03-${String(d).padStart(2,'0')}T12:00:00`,'март'));
  for(let d=1;d<=5;d++)extra.push(msg(6200+d,d%2?'Лена':'Дима',`2026-04-${String(d).padStart(2,'0')}T12:00:00`,'апрель'));
  for(let d=1;d<=15;d++)extra.push(msg(6300+d,d%2?'Лена':'Дима',`2026-05-${String(d).padStart(2,'0')}T12:00:00`,'май'));
  const S=analyze(exp(extra.concat(chat(50,['Лена','Дима'],'2026-05-20T10:00:00'))));
  assert.notEqual(S.month_low[0],'2026-02','первый неполный месяц не может быть самым тихим');
  assert.equal(S.month_low[0],'2026-04');
});

test('кратность фирменного слова остаётся правдоподобной', () => {
  const extra=[];
  // у второго слова нет совсем: без сглаживания кратность улетает в сотни
  for(let i=0;i<30;i++){
    extra.push(msg(7000+i,'Лена',`2026-07-${String(1+i%28).padStart(2,'0')}T12:00:00`,'кулебяка снова'));
    extra.push(msg(7100+i,'Дима',`2026-07-${String(1+i%28).padStart(2,'0')}T13:00:00`,'ладно посмотрим завтра'));
  }
  const S=analyze(exp([...chat(50),...extra]));
  const lena=S.names.A==='Лена'?'A':'M';
  const w=S.signature[lena].find(x=>x[0]==='кулебяка');
  assert.ok(w,`слово не попало в фирменные: ${S.signature[lena].map(x=>x[0])}`);
  assert.ok(w[1]>2.5&&w[1]<=50,`кратность ${w[1]} вне разумных границ`);
});

test('ключевые слова ловятся в кириллице: \\b в JS работает только по ASCII', () => {
  const cases=[
    ['me','я сделаю это сам'],
    ['we','мы уже решили'],
    ['swear','ну блин опять'],
    ['promise','сделаю к утру'],
    ['promise','скину файлы вечером'],
    ['money','это тыс пятьдесят'],
    ['ai','ии сейчас всё умеет'],
    ['thanks','спасибо большое'],
    ['sorry','прости, я проспал'],
    ['laugh','ахаха ну ты даёшь'],
  ];
  const extra=cases.map(([,text],i)=>msg(8000+i*10,'Лена',`2026-08-${String(1+i).padStart(2,'0')}T10:00:00`,text));
  const S=analyze(exp([...chat(50),...extra]));
  const lena=S.names.A==='Лена'?'A':'M';
  for(const [key,text] of cases)
    assert.ok(S.kw[key][lena]>0,`«${key}» не поймано во фразе «${text}»`);
});

test('«я» не срабатывает внутри других слов', () => {
  const extra=[];
  for(let i=0;i<6;i++)extra.push(msg(8500+i,'Дима',`2026-08-1${i}T10:00:00`,'моя семья явно яркая'));
  const S=analyze(exp([...chat(50),...extra]));
  const dima=S.names.A==='Дима'?'A':'M';
  assert.equal(S.kw.me[dima],0,'«я» поймано внутри «моя», «семья», «явно»');
});

test('пересланные посты не считаются речью человека', () => {
  const extra=[];
  for(let i=0;i<12;i++)extra.push(msg(9000+i,'Лена',`2026-09-${String(1+i).padStart(2,'0')}T10:00:00`,
    'сегодня в эфире разбираем подписку и продвижение канала',{forwarded_from:'Какой-то канал'}));
  const S=analyze(exp([...chat(50),...extra]));
  const lena=S.names.A==='Лена'?'A':'M';
  const words=[...S.signature[lena].map(w=>w[0]),...S.top_words[lena].map(w=>w[0])];
  for(const junk of ['эфире','подписку','продвижение','канала'])
    assert.ok(!words.includes(junk),`«${junk}» из репоста попало в словарь: ${words}`);
});

test('ссылки не разбираются на слова', () => {
  const extra=[];
  for(let i=0;i<12;i++)extra.push(msg(9100+i,'Дима',`2026-09-${String(1+i).padStart(2,'0')}T11:00:00`,
    'глянь https://youtube.com/watch?v=abcdef и www.notion.so/roadmap'));
  const S=analyze(exp([...chat(50),...extra]));
  const dima=S.names.A==='Дима'?'A':'M';
  const words=[...S.signature[dima].map(w=>w[0]),...S.top_words[dima].map(w=>w[0])];
  for(const junk of ['https','youtube','watch','abcdef','notion','roadmap'])
    assert.ok(!words.includes(junk),`«${junk}» из ссылки попало в словарь: ${words}`);
  assert.ok(words.includes('глянь'),`живое слово потерялось: ${words}`);
  // при этом домены по-прежнему собираются
  assert.ok(S.domains.some(([d])=>d==='youtube.com'),'домены перестали считаться');
});

test('имена участников не считаются их фирменными словами', () => {
  const extra=[];
  for(let i=0;i<15;i++){
    extra.push(msg(9500+i,'Лена',`2026-10-${String(1+i).padStart(2,'0')}T10:00:00`,'дима привет посмотри пожалуйста'));
    extra.push(msg(9600+i,'Дима',`2026-10-${String(1+i).padStart(2,'0')}T11:00:00`,'лена спасибо огромное тебе'));
  }
  const S=analyze(exp([...chat(50),...extra]));
  const all=[...S.signature.A,...S.signature.M,...S.top_words.A,...S.top_words.M].map(w=>w[0]);
  assert.ok(!all.includes('дима'),`имя «дима» попало в словарь: ${all}`);
  assert.ok(!all.includes('лена'),`имя «лена» попало в словарь: ${all}`);
});

test('тихий месяц ищется в живой период, а не в раскачке', () => {
  const extra=[];
  // первые месяцы — по одному сообщению, чат ещё не завёлся
  extra.push(msg(9800,'Лена','2026-01-15T10:00:00','как-то так'));
  extra.push(msg(9801,'Дима','2026-02-10T10:00:00','ага'));
  const put=(month,n)=>{for(let i=0;i<n;i++)extra.push(
    msg(9900+extra.length,i%2?'Дима':'Лена',`2026-${month}-${String(1+i%28).padStart(2,'0')}T12:00:00`,'живой месяц'))};
  put('03',60); put('04',25); put('05',80); put('06',60);
  const S=analyze(exp(extra));
  assert.equal(S.month_low[0],'2026-04',`тихим назван ${S.month_low[0]} (${S.month_low[1]})`);
});

test('кто открывает и кто закрывает день', () => {
  const extra=[];
  // три дня подряд: утро начинает Лена, вечер закрывает Дима
  for(let d=1;d<=3;d++){
    extra.push(msg(12000+d*10,'Лена',`2026-12-0${d}T08:00:00`,'подъём'));
    extra.push(msg(12001+d*10,'Дима',`2026-12-0${d}T09:00:00`,'иду'));
    extra.push(msg(12002+d*10,'Дима',`2026-12-0${d}T23:30:00`,'всё, спать'));
  }
  const S=analyze(exp([...chat(50,['Лена','Дима'],'2026-11-01T10:00:00'),...extra]));
  const lena=S.names.A==='Лена'?'A':'M', dima=lena==='A'?'M':'A';
  assert.ok(S.day_first[lena]>=3,`Лена открыла ${S.day_first[lena]} дней, ждали минимум 3`);
  assert.ok(S.day_last[dima]>=3,`Дима закрыл ${S.day_last[dima]} дней, ждали минимум 3`);
  assert.equal(S.day_first[dima],0,'Дима не открывал ни одного дня в этой фикстуре');
  assert.equal(S.day_first[lena]+S.day_first[dima],S.active_days,'сумма открытых дней не равна числу активных дней');
  assert.equal(S.day_last[lena]+S.day_last[dima],S.active_days,'сумма закрытых дней не равна числу активных дней');
});
