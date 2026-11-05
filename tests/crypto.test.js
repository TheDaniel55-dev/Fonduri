const test = require('node:test');
const assert = require('node:assert/strict');
const FC = require('../core.js');
function fixture() {
  const s = FC.emptyState(); s.fx.usdRon = 5; s.prices.SOL = {p: 100};
  s.crypto.push({id:'initial',kind:'open',date:'2026-01-01T00:00',coin:'SOL',qty:100,usd:10000,lei:50000});
  return s;
}
const income = s => FC.passiveIncome(s,'2026-01-01','2027-01-01');
test('Average price edit preserves deposits, quantity and active Earn schedule',()=>{
  const s=fixture();FC.earnAdd(s,{coin:'SOL',qty:10,apr:.05,start:'2026-02-01'});
  const before=JSON.stringify(s.earn),pos=FC.cryptoValue(s),q=pos.list[0].qty;
  FC.cryptoFix(s,{coin:'SOL',qty:q,avgUsd:80,priceOnly:true});
  const after=FC.cryptoValue(s);assert.equal(JSON.stringify(s.earn),before);
  assert.equal(after.netInvestedLei,pos.netInvestedLei);assert.equal(after.list[0].qty,q);assert.equal(after.list[0].avgUsd,80);assert.equal(income(s).earnLei,0);
});
test('Earn entry is internal; corrections and transfers never become income', () => {
  const s=fixture(); const e=FC.earnAdd(s,{coin:'SOL',qty:10,apr:0.05,start:'2026-02-01',type:'flexible'});
  FC.earnFix(s,e.id,20,'2026-03-01T12:00','correction');
  FC.earnFix(s,e.id,30,'2026-04-01T12:00','transfer');
  assert.equal(income(s).earnLei,0);
  assert.equal(s.crypto.filter(x=>x.kind==='reward').length,0);
  assert.equal(FC.cryptoHistory(s).filter(x=>x.kind==='earnMove').length,3);
});
test('Confirmed reward counted once, checkpoint uses exact time',()=>{
  const s=fixture(),e=FC.earnAdd(s,{coin:'SOL',qty:10,apr:0.05,start:'2026-02-01'});
  FC.earnFix(s,e.id,11,'2026-03-01T12:00','reward');
  assert.equal(income(s).earnLei,500);
  assert.equal(FC.cryptoReplay(s,'2026-03-01T12:00').coins.SOL.qty,101);
  assert.equal(e.start,'2026-03-01T12:00');
  assert.throws(()=>FC.earnFix(s,e.id,10,'2026-03-02','reward'));
});
test('Old ambiguous rewards excluded until reviewed without changing holdings',()=>{
  const s=fixture();s.crypto.push({id:'old',kind:'reward',earnId:'x',coin:'SOL',qty:1.16,date:'2026-02-01'});
  const before=FC.cryptoReplay(s).coins.SOL.qty;
  assert.equal(income(s).earnLei,0);assert.equal(income(s).reviewCount,1);
  FC.classifyReward(s,'old','correction');assert.equal(income(s).earnLei,0);
  assert.equal(FC.cryptoReplay(s).coins.SOL.qty,before);
  FC.classifyReward(s,'old','reward');assert.equal(income(s).earnLei,580);
});
test('Stop is idempotent and does not pretend to receive estimated rewards',()=>{
  const s=fixture(),e=FC.earnAdd(s,{coin:'SOL',qty:10,apr:0.05,start:'2026-02-01'});
  const past=FC.cryptoReplay(s,'2026-02-15T12:00').coins.SOL.qty;
  FC.earnStop(s,e.id,'2026-03-01T12:00');FC.earnStop(s,e.id,'2026-03-01T12:00');
  assert.equal(income(s).earnLei,0);
  assert.equal(FC.cryptoReplay(s,'2026-02-15T12:00').coins.SOL.qty,past);
  assert.equal(FC.cryptoReplay(s).coins.SOL.qty,100);
  assert.equal(s.crypto.filter(x=>x.action==='stop').length,1);
});
test('Invalid/duplicate allocation rejected atomically',()=>{
  const s=fixture();FC.earnAdd(s,{coin:'SOL',qty:90,apr:0,start:'2026-02-01'});
  assert.throws(()=>FC.earnAdd(s,{coin:'SOL',qty:20,apr:0,start:'2026-02-01'}));
  assert.throws(()=>FC.earnAdd(s,{coin:'SOL',qty:Infinity,apr:0,start:'2026-02-01'}));
  assert.equal(s.earn.length,1);
});
test('Backup roundtrip preserves history and classification',()=>{
  const s=fixture(),e=FC.earnAdd(s,{coin:'SOL',qty:10,apr:0.05,start:'2026-02-01'});
  FC.earnFix(s,e.id,9,'2026-03-01','transfer');
  const reloaded=FC.validateBackup(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(FC.cryptoHistory(reloaded),FC.cryptoHistory(s));
  assert.ok(FC.exportRows(s).Crypto.every(x=>x.Tip));
});
