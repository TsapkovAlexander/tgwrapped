import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plural,np,fm,hm,pct,DAY} from '../app/format.js';

test('склонение на границах: 1, 2–4, 5–20, 21, 101, 111', () => {
  const f=n=>plural(n,DAY);
  assert.equal(f(1),'день'); assert.equal(f(21),'день'); assert.equal(f(101),'день');
  assert.equal(f(2),'дня'); assert.equal(f(23),'дня'); assert.equal(f(104),'дня');
  assert.equal(f(5),'дней'); assert.equal(f(11),'дней'); assert.equal(f(14),'дней');
  assert.equal(f(111),'дней'); assert.equal(f(0),'дней');
});

test('np склеивает число с формой и разделяет разряды', () => {
  assert.equal(np(1,DAY),'1 день');
  assert.equal(np(933,DAY),'933 дня');
  assert.match(np(1234,DAY),/^1\u00a0234 дня$/);   // разделитель разрядов из ICU — неразрывный пробел
});

test('дробное число согласуется по округлению', () => {
  assert.equal(plural(1.4,DAY),'день');
  assert.equal(plural(2.6,DAY),'дня');
});

test('hm форматирует дробный час в часы:минуты', () => {
  assert.equal(hm(0),'00:00'); assert.equal(hm(9.5),'09:30'); assert.equal(hm(23.25),'23:15');
});

test('pct не делит на ноль', () => {
  assert.equal(pct(0,0),0); assert.equal(pct(1,1),50); assert.equal(pct(3,1),75);
});

test('fm округляет и не теряет знаки', () => {
  assert.equal(fm(0),'0'); assert.match(fm(34727),/^34.727$/);
});
