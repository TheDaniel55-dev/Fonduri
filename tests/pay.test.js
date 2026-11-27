const test = require('node:test');
const assert = require('node:assert');
const FC = require('../core.js');
function st() { const s = FC.emptyState(); s.settings.pay.mainCard = 'Visa 1234'; return s; }
const bal = (s, f) => FC.balances(s)[f];

test('Suma din Wallet se citește în orice format', () => {
  assert.deepStrictEqual(FC.payAmount('12,50 RON'), { amount: 12.5, cur: 'RON' });
  assert.deepStrictEqual(FC.payAmount('1.234,56 lei'), { amount: 1234.56, cur: 'RON' });
  assert.deepStrictEqual(FC.payAmount('18,00 US$'), { amount: 18, cur: 'USD' });
  assert.deepStrictEqual(FC.payAmount('€5.00'), { amount: 5, cur: 'EUR' });
  assert.strictEqual(FC.payAmount('1,234.5').amount, 1234.5);
});

test('Cardul principal + comerciant cu regulă intră direct ca cheltuială', () => {
  const s = st(); const c0 = bal(s, 'Cheltuieli');
  const r = FC.payIngest(s, [{ id: 'w-000001', merchant: 'Lidl', card: 'Visa 1234', amount: '98,10 RON', date: '2026-11-24T18:00' }]);
  assert.strictEqual(r.auto.length, 1); assert.strictEqual(s.inbox.length, 0);
  assert.strictEqual(r.auto[0].cat, 'Mâncare'); assert.strictEqual(r.auto[0].src, 'wallet');
  assert.ok(Math.abs(bal(s, 'Cheltuieli') - (c0 - 98.1)) < 1e-9);
});

test('Alt card, comerciant necunoscut sau altă monedă așteaptă aprobarea', () => {
  const s = st();
  const r = FC.payIngest(s, [
    { id: 'w-000002', merchant: 'Lidl', card: 'Mastercard 9999', amount: '10 RON' },
    { id: 'w-000003', merchant: 'Magazin Nou', card: 'Visa 1234', amount: '5 RON' },
    { id: 'w-000004', merchant: 'Binance', card: 'Visa 1234', amount: '18,00 US$' }]);
  assert.strictEqual(r.auto.length, 0); assert.strictEqual(s.inbox.length, 3);
  assert.deepStrictEqual(s.inbox.map((x) => x.why).sort(), ['card', 'cur', 'new']);
  assert.strictEqual(s.inbox.find((x) => x.id === 'w-000002').cat, 'Mâncare');
  assert.deepStrictEqual(s.settings.pay.cards.sort(), ['Mastercard 9999', 'Visa 1234']);
});

test('Aceeași plată nu intră de două ori', () => {
  const s = st(); const p = { id: 'w-000005', merchant: 'Kaufland', card: 'Visa 1234', amount: '20 RON' };
  FC.payIngest(s, [p]); const r = FC.payIngest(s, [p]);
  assert.strictEqual(r.skipped, 1); assert.strictEqual(s.tx.filter((t) => t.src === 'wallet').length, 1);
});

test('Aprob mereu: plata trece din fondul ales, iar următoarea intră singură în același fond', () => {
  const s = st();
  FC.payIngest(s, [{ id: 'w-000006', merchant: 'Pet Shop X', card: 'Visa 1234', amount: '45 RON' }]);
  const t = FC.payApprove(s, 'w-000006', { cat: 'Animal de companie', fund: 'Achiziție', remember: true });
  assert.strictEqual(t.fund, 'Achiziție'); assert.strictEqual(s.inbox.length, 0);
  const r = FC.payIngest(s, [{ id: 'w-000007', merchant: 'PET SHOP X', card: 'Visa 1234', amount: '30 RON' }]);
  assert.strictEqual(r.auto.length, 1); assert.strictEqual(r.auto[0].fund, 'Achiziție'); assert.strictEqual(r.auto[0].cat, 'Animal de companie');
  assert.throws(() => FC.payApprove(s, 'nu-exista', { cat: 'Altele', fund: 'Cheltuieli' }));
});

test('Plata adăugată deja de mână e semnalată, iar cele vechi apar ca întârziate', () => {
  const s = st();
  FC.addTx(s, { kind: 'expense', cat: 'Mâncare', amount: 33.55, date: '2026-11-22T10:00' });
  FC.payIngest(s, [{ id: 'w-000008', merchant: 'Carrefour Market', card: 'Mastercard 9999', amount: '33,55 RON', date: '2026-11-22T12:00' }]);
  assert.strictEqual(s.inbox[0].dup, true);
  s.inbox[0].got = '2026-11-01T10:00';
  assert.strictEqual(FC.payOverdue(s).length, 1);
});

test('Backup-urile vechi primesc regulile de început', () => {
  const old = FC.emptyState(); delete old.settings.pay; delete old.inbox; delete old.paySeen;
  const s = FC.validateBackup(JSON.parse(JSON.stringify(old)));
  assert.ok(s.settings.pay.rules.length > 10); assert.deepStrictEqual(s.inbox, []); assert.strictEqual(s.settings.pay.warnDays, 3);
});
