const test = require('node:test');
const assert = require('node:assert');
const FC = require('../core.js');
const base = { apr: 0.0275, tax: 0.1, payDay: 1, from: '2026-11-23' };

test('Calculatorul arată câștigul net pe zi, lună și an', () => {
  const r = FC.savCalcEarn(500, 0.0275, 0.1);
  assert.ok(Math.abs(r.day - 500 * 0.0275 * 0.9 / 365) < 1e-9);
  assert.ok(Math.abs(r.month - 500 * 0.0275 * 0.9 / 12) < 1e-9);
  assert.ok(r.year > r.month * 12 && r.yearGross > r.year);
});

test('Depunerile lunare: 24 de depuneri în 2 ani, sold = depus + dobândă', () => {
  const r = FC.savCalcRun(Object.assign({ start: 0, dep: 50, freq: 'm', months: 24 }, base));
  assert.strictEqual(r.nDep, 24);
  assert.strictEqual(r.deposits, 1200);
  assert.ok(r.interest > 25 && r.interest < 35);
  assert.ok(Math.abs(r.final - (r.start + r.deposits + r.interest)) < 1e-6);
  assert.strictEqual(r.series.length, 25);
});

test('Fără dobândă soldul rămâne cât ai depus', () => {
  const r = FC.savCalcRun({ start: 1000, dep: 10, freq: 'w', months: 3, apr: 0, tax: 0.1, payDay: 19, from: '2026-01-31' });
  assert.strictEqual(r.final, 1000 + r.deposits);
  assert.strictEqual(r.interest, 0);
});

test('Ținta de sumă dă depunerea minimă care ajunge la sumă', () => {
  const g = FC.savCalcGoal(Object.assign({ start: 0, target: 5000, freq: 'm', months: 24 }, base));
  assert.ok(g.run.final >= 5000);
  const less = FC.savCalcRun(Object.assign({ start: 0, dep: g.dep - 0.05, freq: 'm', months: 24 }, base));
  assert.ok(less.final < 5000);
  assert.ok(FC.savCalcGoal(Object.assign({ start: 6000, target: 5000, freq: 'm', months: 24 }, base)).already);
});

test('Ținta de venit: suma necesară produce exact venitul cerut', () => {
  const need = FC.savCalcNeeded(50, 'week', 0.0275, 0.1);
  assert.ok(Math.abs(FC.savCalcEarn(need, 0.0275, 0.1).week - 50) < 1e-9);
  assert.strictEqual(FC.savCalcNeeded(50, 'week', 0, 0.1), Infinity);
});
