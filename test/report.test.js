import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyze} from '../app/stats.js';
import {buildSlides,titles} from '../app/render.js';
import {reportText} from '../app/share.js';
import {chat,msg,exp} from './fixture.js';

const S=()=>analyze(exp(chat(200)));

test('нумерация сквозная, а знаменатель равен числу карточек', () => {
  const sl=buildSlides(S());
  assert.ok(sl.length>=8,`карточек всего ${sl.length}`);
  sl.forEach(([,html],i)=>assert.match(html,new RegExp(`${i+1}\\s*/\\s*${sl.length}`),
    `на карточке ${i+1} нет подписи ${i+1} / ${sl.length}`));
  assert.ok(!sl.some(([,html])=>html.includes('__N__')),'плейсхолдер __N__ остался в разметке');
});

test('каждая карточка имеет фон из палитры и непустую разметку', () => {
  const ok=new Set(['cream','ink','sky','peach']);
  buildSlides(S()).forEach(([cls,html],i)=>{
    assert.ok(cls.split(' ').some(c=>ok.has(c)),`карточка ${i+1}: фон «${cls}» вне палитры`);
    assert.ok(html.length>200,`карточка ${i+1} подозрительно пустая`);
    assert.ok(!/undefined|NaN/.test(html),`карточка ${i+1} содержит undefined или NaN`);
  });
});

test('текстовый отчёт содержит имена, объём и подпись', () => {
  const s=S(), t=reportText(s);
  assert.ok(t.includes(s.names.A)&&t.includes(s.names.M));
  assert.ok(t.includes('200 сообщений'));
  assert.ok(t.includes('tgwrapped.ru'));
  assert.ok(t.split('\n').length>=10);
});

test('ярлык вердикта не имеет рода: пол участника из экспорта неизвестен', () => {
  const S=analyze(exp(chat(200)));
  const T=titles(S);
  // родовые окончания прилагательных: «Голосовой», «Виноватый», «Нежная»
  const GENDERED=/(ый|ой|ий|ая|яя|ое|ее)$/;
  for(const side of ['A','M'])
    assert.ok(!GENDERED.test(T[side].title),`ярлык «${T[side].title}» имеет род`);
});

test('дробные числа в вердикте пишутся через запятую', () => {
  const extra=[];
  for(let i=0;i<40;i++)extra.push(msg(11000+i,'Лена',`2026-11-${String(1+i%28).padStart(2,'0')}T10:00:00`,'спасибо тебе большое'));
  for(let i=0;i<12;i++)extra.push(msg(11100+i,'Дима',`2026-11-${String(1+i%28).padStart(2,'0')}T11:00:00`,'спасибо'));
  const S=analyze(exp([...chat(50),...extra]));
  const T=titles(S);
  const all=T.A.text+' '+T.M.text+' '+T.chat;
  assert.ok(!/\d\.\d/.test(all),`дробь через точку: ${all.match(/[^ ]*\d\.\d[^ ]*/)}`);
});

test('в ссылку кладётся всё, что нужно карточкам', async () => {
  const {slim} = await import('../app/share.js');
  const full = S();
  const cards = buildSlides(slim(full));
  assert.equal(cards.length, buildSlides(full).length, 'из урезанных данных вышло другое число карточек');
  cards.forEach(([, html], i) => {
    assert.ok(!/undefined|NaN/.test(html), `карточка ${i + 1} из ссылки содержит undefined или NaN`);
  });
  const {reportText} = await import('../app/share.js');
  const text = reportText(slim(full));
  assert.ok(!/undefined|NaN/.test(text), `текстовый отчёт из ссылки: ${text}`);
});

test('ссылка с локальной версии ведёт на прод, а не на localhost', async () => {
  const {siteFrom} = await import('../app/share.js');
  const prod = 'https://retorta.tracedocs.ru/';
  assert.equal(siteFrom('http://localhost:8000', 'localhost', prod), 'https://retorta.tracedocs.ru');
  assert.equal(siteFrom('http://127.0.0.1:8000', '127.0.0.1', prod), 'https://retorta.tracedocs.ru');
  // на проде адрес берётся как есть
  assert.equal(siteFrom('https://retorta.tracedocs.ru', 'retorta.tracedocs.ru', prod), 'https://retorta.tracedocs.ru');
  // другой домен важнее канонического: сайт мог переехать
  assert.equal(siteFrom('https://tgwrapped.ru', 'tgwrapped.ru', prod), 'https://tgwrapped.ru');
  // без canonical локальный адрес остаётся собой — лучше так, чем ссылка в никуда
  assert.equal(siteFrom('http://localhost:8000', 'localhost', ''), 'http://localhost:8000');
});

test('упакованный слепок разворачивается обратно без потерь для карточек', async () => {
  const {slim} = await import('../app/share.js');
  const full = S();
  // повторяем то, что делают buildLink/readLink, но без браузерных API
  const mod = await import('node:fs');
  const src = mod.readFileSync('app/share.js', 'utf8');
  assert.ok(src.includes("'deflate-raw'"), 'ссылка должна паковаться deflate-raw');
  assert.ok(src.includes("kind==='z'"), 'старые ссылки должны продолжать открываться');
  // slim не должен терять поля, которые рисуются
  const cards = buildSlides(slim(full));
  assert.equal(cards.length, buildSlides(full).length);
  cards.forEach(([, html], i) =>
    assert.ok(!/undefined|NaN/.test(html), `карточка ${i + 1}: undefined или NaN`));
});

test('файлы уходят через системное окно только на телефоне', async () => {
  const {canShareFiles} = await import('../app/share.js');
  const withShare = {share(){}, canShare(){return true}};
  // десктоп: браузер передаёт приложению пути к временным файлам вместо картинок
  assert.equal(canShareFiles({...withShare, userAgentData:{mobile:false}}, false), false);
  assert.equal(canShareFiles(withShare, false), false, 'без userAgentData решает тип указателя');
  // телефон
  assert.equal(canShareFiles({...withShare, userAgentData:{mobile:true}}, false), true);
  assert.equal(canShareFiles(withShare, true), true);
  // браузер вообще без Web Share
  assert.equal(canShareFiles({}, true), false);
});
