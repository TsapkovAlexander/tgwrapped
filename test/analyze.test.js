import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyze} from '../app/stats.js';
import {chat,msg,exp,iso} from './fixture.js';

test('меньше 50 сообщений — осмысленная ошибка', () => {
  assert.throws(()=>analyze(exp(chat(49))), /меньше 50 сообщений/);
});

test('один участник — осмысленная ошибка', () => {
  assert.throws(()=>analyze(exp(chat(60,['Лена']))), /один участник/);
});

test('A — тот, кто написал больше, независимо от порядка в файле', () => {
  const m=[...chat(60),...chat(20,['Дима'],'2026-02-01T10:00:00')];
  const S=analyze(exp(m));
  assert.equal(S.names.A,'Дима');            // 30 + 20 = 50
  assert.equal(S.names.M,'Лена');            // 30
  assert.equal(S.per_user.A,50);
  assert.equal(S.per_user.M,30);
  assert.equal(S.total,80);
});

test('имена из opts перекрывают имена из экспорта', () => {
  const S=analyze(exp(chat(60)),{names:{A:'Первый',M:'Второй'}});
  assert.deepEqual(S.names,{A:'Первый',M:'Второй'});
});

test('слова и символы считаются по автору', () => {
  const m=chat(60,['Лена','Дима'],'2026-01-05T10:00:00','два слова');
  const S=analyze(exp(m));
  assert.equal(S.words.A,60);                // 30 сообщений × 2 слова
  assert.equal(S.chars.A,30*'два слова'.length);
});

test('ответ считается только в пределах 4 часов', () => {
  const m=[
    ...chat(50,['Лена','Дима'],'2026-01-05T10:00:00'),
    msg(101,'Лена','2026-01-06T10:00:00','вопрос'),
    msg(102,'Дима','2026-01-06T10:00:30','через 30 сек'),
    msg(103,'Лена','2026-01-07T10:00:00','вопрос'),
    msg(104,'Дима','2026-01-07T15:00:00','через 5 часов — не в счёт'),
  ];
  const S=analyze(exp(m));
  const dima=S.names.A==='Дима'?'A':'M';
  assert.ok(S.resp_median[dima]<=60, `медиана Димы ${S.resp_median[dima]} должна игнорировать пятичасовой ответ`);
});

test('разрыв больше 4 часов начинает новый разговор', () => {
  const m=[
    ...chat(50,['Лена','Дима'],'2026-01-05T10:00:00'),      // один разговор: шаг в минуту
    msg(101,'Дима','2026-01-05T20:00:00','через 9 часов'),  // второй
    msg(102,'Лена','2026-01-05T20:01:00','ответ'),
  ];
  const S=analyze(exp(m));
  assert.equal(S.sessions,2);
  const dima=S.names.A==='Дима'?'A':'M', lena=dima==='A'?'M':'A';
  assert.equal(S.starts[lena],1);   // первый разговор начала Лена
  assert.equal(S.starts[dima],1);   // второй — Дима
  assert.equal(S.ends[lena],1);
});

test('вопрос без ответа находится', () => {
  const m=[...chat(50),msg(101,'Лена','2026-01-08T10:00:00','ты тут?')];
  const S=analyze(exp(m));
  const lena=S.names.A==='Лена'?'A':'M';
  assert.ok(S.unanswered[lena]>=1);
});

test('серия дней подряд считается без разрывов', () => {
  const m=[];
  for(let d=0;d<5;d++)m.push(...chat(12,['Лена','Дима'],iso(new Date(2026,0,5+d,12,0,0))));
  m.push(...chat(12,['Лена','Дима'],'2026-01-20T12:00:00'));   // разрыв
  const S=analyze(exp(m));
  assert.equal(S.streak.n,5);
  assert.equal(S.active_days,6);
});

test('ключевые слова ловятся по подстроке и регистру', () => {
  const m=[...chat(50),
    msg(101,'Лена','2026-01-08T10:00:00','Извини, я поздно'),
    msg(102,'Дима','2026-01-08T10:01:00','СПАСИБО большое'),
    msg(103,'Дима','2026-01-08T10:02:00','спасибо ещё раз')];
  const S=analyze(exp(m));
  const lena=S.names.A==='Лена'?'A':'M', dima=lena==='A'?'M':'A';
  assert.equal(S.kw.sorry[lena],1);
  assert.equal(S.kw.thanks[dima],2);
});

test('текст собирается из массива сущностей, а не только из строки', () => {
  const m=[...chat(50),
    msg(101,'Лена','2026-01-08T10:00:00',['спасибо за ',{type:'link',text:'ссылку'}])];
  const S=analyze(exp(m));
  const lena=S.names.A==='Лена'?'A':'M';
  assert.equal(S.kw.thanks[lena],1);
});

test('звонки берутся из служебных сообщений, а не из messages с from', () => {
  const m=[...chat(50),
    {id:101,type:'service',date:'2026-01-08T10:00:00',actor:'Лена',actor_id:'user_Лена',action:'phone_call',duration_seconds:600,discard_reason:'hangup'}];
  const S=analyze(exp(m));
  assert.equal(S.calls.n,1);
  assert.equal(S.calls.hours,0.2);
  assert.equal(S.calls.longest_min,10);
});
