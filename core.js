/* Fonduri — logica de bază (fără interfață). Toate calculele pleacă din evenimentele salvate. */
(function (root) {
  'use strict';

  const DEFAULT_FUNDS = [
    { name: 'Cheltuieli', color: '#FF6961', icon: 'cart' }, { name: 'Datorii', color: '#E3B341', icon: 'receipt' },
    { name: 'Achiziție', color: '#F5883F', icon: 'bag' }, { name: 'Investiții', color: '#6FCF97', icon: 'invest' },
    { name: 'Reward', color: '#B768A2', icon: 'gift' }, { name: 'Rezervă', color: '#4B9CD3', icon: 'shield' }
  ];
  const FUNDS = DEFAULT_FUNDS.map((f) => f.name);
  const FUND_COLORS = {}; DEFAULT_FUNDS.forEach((f) => { FUND_COLORS[f.name] = f.color; });
  const PALETTE = ['#FF6961', '#E3B341', '#F5883F', '#6FCF97', '#B768A2', '#4B9CD3', '#4FD1C5', '#8F7CF0', '#F2A0C4', '#C9CCD8'];
  const INCOME_TYPES = ['Salariu', 'Extra'];
  const CATEGORIES = ['Mâncare', 'Ieșiri', 'Transport', 'Casă', 'Facturi', 'Abonamente', 'Sănătate',
    'Haine', 'Echipament', 'Animal de companie', 'Cadouri', 'Altele'];
  const DENOMS = [
    { id: '20lei', label: '20 lei', value: 20, cur: 'RON' },
    { id: '500lei', label: '500 lei', value: 500, cur: 'RON' },
    { id: 'eur', label: 'Euro', value: 1, cur: 'EUR' }
  ];

  function defaultSettings() {
    return {
      splits: {
        'Salariu': { 'Cheltuieli': 0.70, 'Datorii': 0.10, 'Achiziție': 0.10, 'Investiții': 0.10, 'Reward': 0, 'Rezervă': 0 },
        'Extra':   { 'Cheltuieli': 0.50, 'Datorii': 0.10, 'Achiziție': 0.20, 'Investiții': 0.10, 'Reward': 0.10, 'Rezervă': 0 }
      },
      negPriority: 0.5,            // partea din fiecare venit care merge întâi în fondurile pe minus
      categories: CATEGORIES.slice(),
      eurRate: 5,                  // 1 € = 5 lei (regula ta)
      cashOrder: ['Rezervă', 'Achiziție', 'Investiții'],
      binance: { cardFee: 0.036, tradeFee: 0.001, bnbDiscount: 0.25, payFeeInBnb: true, cryptoFund: 'Investiții' },
      savings: { name: 'Cont de economii', apr: 0.0275, tax: 0.10, fund: 'Investiții', payDay: 1 },
      lock: { enabled: false, credId: null },
      discreet: false,
      lastExport: null,
      funds: DEFAULT_FUNDS.map((f) => Object.assign({ archived: false }, f)),
      incomeTypes: INCOME_TYPES.slice(),
      expenseFund: 'Cheltuieli',          // de unde pleacă o cheltuială obișnuită
      denoms: DENOMS.map((d) => Object.assign({}, d)),
      name: '',
      profile: { pet: '', bank: '', exchange: 'Binance' },   // le alegi la prima pornire, le schimbi din Setări
      setupDone: false,
      eurGainType: 'Extra',                // venitul în care intră câștigul de la schimbul de euro
      live: { enabled: true },             // prețuri crypto în timp real
      lockAfterMin: 2,                     // după câte minute în fundal cere Face ID din nou
      exportRemindDays: 7,
      home: { hero: true, negWarn: true, mini: true, month: true, compare: true, goal: true, funds: true, recent: true, recentCount: 6 },
      available: ['Cheltuieli', 'Datorii', 'Achiziție', 'Investiții', 'Reward'],   // „bani disponibili” pe Acasă (Rezerva nu intră)
      monthStart: 1,                       // ziua din lună de la care începe luna ta financiară
      theme: { accent: 'mov', bg: 'denim', size: 'normal' },
      startTab: 'home',
      homeRange: 90
    };
  }

  function emptyState() {
    return {
      v: 1,
      settings: defaultSettings(),
      tx: [],          // mișcări de bani în lei (fonduri)
      crypto: [],      // depuneri, tranzacții, retrageri, recompense, poziții de start
      cash: [],        // bancnote și euro puși deoparte
      savings: [],     // contul de economii
      earn: [],        // poziții Binance Earn
      recurring: [],   // plăți recurente
      shortcuts: [],   // scurtături salvate manual
      goals: [],       // obiective: { id, name, fund, target, by, done }
      hist: {},        // prețuri de închidere pe zile: { SOL: { 'YYYY-MM-DD': 171.2 }, _ts: ... }
      snapshots: {},   // avere netă pe zile: { 'YYYY-MM-DD': lei }
      prices: {},      // { BTC: { p, ch, ts } }
      fx: { usdRon: null, ts: 0, byDate: {} }
    };
  }

  /* ---------- utilitare ---------- */
  let _idc = 0;
  function uid() { return Date.now().toString(36) + (++_idc).toString(36) + Math.random().toString(36).slice(2, 6); }
  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function localISO(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  const dayOf = (iso) => String(iso).slice(0, 10);
  const exName = (state) => ((state.settings.profile || {}).exchange || 'exchange');
  const monthOf = (iso) => String(iso).slice(0, 7);
  /* fondurile vin din setări (le poți redenumi, adăuga, arhiva) */
  const fundNames = (state) => (state.settings.funds || []).map((f) => f.name);
  const activeFunds = (state) => (state.settings.funds || []).filter((f) => !f.archived).map((f) => f.name);
  function fundInfo(state, name) { return (state.settings.funds || []).find((f) => f.name === name) || { name, color: '#C9CCD8', icon: 'funds' }; }
  function zeroFunds(state) { const o = {}; fundNames(state).forEach((f) => { o[f] = 0; }); return o; }
  function byDate(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }

  /* ---------- fonduri ---------- */
  function balances(state, uptoISO) {
    const b = zeroFunds(state);
    state.tx.forEach((t) => {
      if (uptoISO && t.date > uptoISO) return;
      Object.keys(t.alloc || {}).forEach((f) => { if (b[f] !== undefined) b[f] += t.alloc[f]; });
    });
    Object.keys(b).forEach((f) => { b[f] = r2(b[f]); });
    return b;
  }
  function fundsTotal(b) { return r2(Object.keys(b).reduce((s, f) => s + (b[f] || 0), 0)); }

  /* Împarte un venit: întâi partea de prioritate merge în fondurile pe minus (proporțional cu golul),
     restul se împarte după procentele tipului de venit. */
  function incomeAlloc(state, amount, type, atISO) {
    const s = state.settings;
    const split = s.splits[type];
    if (!split) throw new Error('Tip de venit necunoscut: ' + type);
    const b = balances(state, atISO);
    const FUNDS = activeFunds(state);
    const alloc = zeroFunds(state);
    const deficits = FUNDS.filter((f) => b[f] < 0).map((f) => ({ f, gap: -b[f] }));
    let rest = amount;
    if (deficits.length && s.negPriority > 0) {
      const prio = amount * s.negPriority;
      const totalGap = deficits.reduce((x, d) => x + d.gap, 0);
      const usable = Math.min(prio, totalGap);
      deficits.forEach((d) => { alloc[d.f] += usable * (d.gap / totalGap); });
      rest = amount - usable;
    }
    const sum = FUNDS.reduce((x, f) => x + (split[f] || 0), 0) || 1;
    FUNDS.forEach((f) => { alloc[f] += rest * ((split[f] || 0) / sum); });
    // rotunjim, iar diferența de bani mărunți o punem la fondul cel mai mare
    const out = {};
    Object.keys(alloc).forEach((f) => { if (Math.abs(alloc[f]) > 0.0001) out[f] = r2(alloc[f]); });
    const diff = r2(amount - Object.values(out).reduce((x, v) => x + v, 0));
    if (diff !== 0) {
      const big = Object.keys(out).sort((a, c) => out[c] - out[a])[0];
      if (big) out[big] = r2(out[big] + diff);
    }
    return out;
  }

  /* Creează o tranzacție de fond. kind: income | expense | fund | transfer | invest | divest | adjust */
  function makeTx(state, p) {
    const amount = r2(Math.abs(parseFloat(p.amount) || 0));
    if (!(amount > 0) && p.kind !== 'adjust') throw new Error('Suma trebuie să fie mai mare ca 0.');
    const t = {
      id: p.id || uid(), date: p.date || localISO(), kind: p.kind, amount,
      sub: p.sub || null, cat: p.cat || null, fund: p.fund || null, to: p.to || null,
      note: p.note || '', src: p.src || null, link: p.link || null, eur: p.eur || null
    };
    if (p.kind === 'income') t.alloc = p.alloc || incomeAlloc(state, amount, p.sub, t.date);
    else if (p.kind === 'expense') t.alloc = { [p.fund || state.settings.expenseFund || 'Cheltuieli']: -amount };
    else if (p.kind === 'fund' || p.kind === 'invest') t.alloc = { [p.fund]: -amount };
    else if (p.kind === 'divest') t.alloc = { [p.fund]: amount };
    else if (p.kind === 'transfer') {
      if (!p.fund || !p.to || p.fund === p.to) throw new Error('Alege două fonduri diferite.');
      t.alloc = { [p.fund]: -amount, [p.to]: amount };
    } else if (p.kind === 'adjust') t.alloc = p.alloc || {};
    else throw new Error('Tip necunoscut: ' + p.kind);
    if (p.kind === 'expense' && !t.fund) t.fund = state.settings.expenseFund || 'Cheltuieli';
    return t;
  }
  function addTx(state, p) { const t = makeTx(state, p); state.tx.push(t); state.tx.sort(byDate); return t; }

  /* La editare păstrăm aceeași împărțire, doar o scalăm la noua sumă (veniturile nu se recalculează). */
  function updateTx(state, id, patch) {
    const i = state.tx.findIndex((t) => t.id === id);
    if (i < 0) throw new Error('Tranzacția nu mai există.');
    const old = state.tx[i];
    const merged = Object.assign({}, old, patch);
    let t;
    if (old.kind === 'income' && patch.amount != null && (!patch.sub || patch.sub === old.sub)) {
      const k = (parseFloat(patch.amount) || 0) / (old.amount || 1);
      const alloc = {};
      Object.keys(old.alloc).forEach((f) => { alloc[f] = r2(old.alloc[f] * k); });
      t = makeTx(state, Object.assign({}, merged, { alloc }));
    } else if (old.kind === 'income' && patch.sub && patch.sub !== old.sub) {
      state.tx.splice(i, 1);
      t = makeTx(state, Object.assign({}, merged, { alloc: null }));
      state.tx.push(t); state.tx.sort(byDate);
      return t;
    } else {
      t = makeTx(state, Object.assign({}, merged, { alloc: old.kind === 'adjust' ? old.alloc : null }));
    }
    t.id = old.id;
    state.tx[i] = t; state.tx.sort(byDate);
    return t;
  }
  function deleteTx(state, id) {
    const t = state.tx.find((x) => x.id === id);
    if (!t) return;
    if (t.link) {
      // ștergem și evenimentul legat (depunere crypto, economii, schimb euro)
      ['crypto', 'savings', 'cash'].forEach((k) => { state[k] = state[k].filter((e) => e.id !== t.link); });
    }
    state.tx = state.tx.filter((x) => x.id !== id);
  }

  /* ---------- pușculița (bancnote + euro) ---------- */
  function cashSummary(state) {
    const denoms = state.settings.denoms || DENOMS;
    const counts = {}; denoms.forEach((d) => { counts[d.id] = 0; });
    state.cash.forEach((e) => { if (counts[e.denom] !== undefined) counts[e.denom] += e.count; });
    const rate = state.settings.eurRate;
    const items = denoms.map((d) => ({
      id: d.id, label: d.label, cur: d.cur, count: r2(counts[d.id]),
      lei: r2(d.cur === 'EUR' ? counts[d.id] * d.value * rate : counts[d.id] * d.value)
    }));
    const total = r2(items.reduce((x, i) => x + i.lei, 0));
    // Împărțim automat cash-ul pe fonduri: întâi ordinea ta, apoi restul fondurilor (fără Cheltuieli).
    const b = balances(state);
    const act = activeFunds(state);
    const order = state.settings.cashOrder.filter((f) => act.indexOf(f) >= 0)
      .concat(act.filter((f) => f !== state.settings.expenseFund && state.settings.cashOrder.indexOf(f) < 0));
    const perFund = {};
    let left = total;
    order.forEach((f) => {
      if (left <= 0) return;
      const take = Math.min(left, Math.max(0, b[f]));
      if (take > 0) { perFund[f] = r2(take); left -= take; }
    });
    return { items, total, perFund, uncovered: r2(Math.max(0, left)) };
  }
  function addCash(state, denom, count, note, date) {
    const e = { id: uid(), date: date || localISO(), denom, count: parseFloat(count) || 0, note: note || '' };
    state.cash.push(e); return e;
  }
  /* Schimbi euro în lei: diferența față de cursul tău merge la venitul ales în Setări (sau la cheltuieli, dacă pierzi). */
  function exchangeEur(state, eur, leiReceived, date) {
    eur = parseFloat(eur) || 0; leiReceived = parseFloat(leiReceived) || 0;
    const it = cashSummary(state).items.find((i) => i.cur === 'EUR' && i.id === 'eur') || cashSummary(state).items.find((i) => i.cur === 'EUR');
    const held = it ? it.count : 0;
    if (eur <= 0 || eur > held + 1e-9) throw new Error('Ai doar ' + held + ' € în pușculiță.');
    const e = { id: uid(), date: date || localISO(), denom: it.id, count: -eur, note: 'Schimb în lei: ' + leiReceived + ' lei' };
    state.cash.push(e);
    const diff = r2(leiReceived - eur * state.settings.eurRate);
    if (diff > 0) addTx(state, { kind: 'income', sub: state.settings.incomeTypes.indexOf(state.settings.eurGainType) >= 0 ? state.settings.eurGainType : state.settings.incomeTypes[state.settings.incomeTypes.length - 1], amount: diff, date: e.date, note: 'Câștig la schimbul a ' + eur + ' €', src: 'cash', link: e.id });
    else if (diff < 0) addTx(state, { kind: 'expense', cat: 'Altele', amount: -diff, date: e.date, note: 'Pierdere la schimbul a ' + eur + ' €', src: 'cash', link: e.id });
    return { event: e, diff };
  }

  /* ---------- crypto ---------- */
  /* Depunere în Binance: tu scrii $ și lei din SMS; restul se calculează. */
  function cryptoDeposit(state, p) {
    const s = state.settings.binance;
    const usd = parseFloat(p.usd) || 0;
    if (!(usd > 0)) throw new Error('Scrie suma în $.');
    const fee = p.fee != null ? parseFloat(p.fee) : s.cardFee;
    const received = p.received != null && p.received !== '' ? parseFloat(p.received) : r2(usd * (1 - fee) * 1e6) / 1e6;
    let lei = parseFloat(p.lei);
    const ref = p.refRate ? parseFloat(p.refRate) : null;
    let estimated = false;
    if (!(lei > 0)) {
      if (!ref) throw new Error('Scrie suma în lei din SMS (nu am cursul zilei).');
      lei = r2(usd * ref * 1.009); estimated = true;     // marja obișnuită a unei bănci, corectezi oricând
    }
    const e = { id: uid(), kind: 'deposit', date: p.date || localISO(), usd, received, lei: r2(lei), refRate: ref, fee, estimated, note: p.note || '' };
    state.crypto.push(e);
    addTx(state, { kind: 'invest', fund: s.cryptoFund, amount: e.lei, date: e.date, cat: 'Crypto', note: 'Depunere ' + exName(state) + ' ' + usd + ' $', src: 'crypto', link: e.id });
    return e;
  }
  /* Cumpărare / vânzare pe Spot. Fee-ul în BNB se calculează automat dacă nu îl scrii. */
  function cryptoTrade(state, p) {
    const s = state.settings.binance;
    const coin = String(p.coin || '').trim().toUpperCase();
    const qty = parseFloat(p.qty) || 0, usd = parseFloat(p.usd) || 0;
    if (!coin) throw new Error('Alege moneda.');
    if (!(qty > 0) || !(usd > 0)) throw new Error('Scrie cantitatea și suma în $.');
    const feeRate = s.tradeFee * (s.payFeeInBnb ? (1 - s.bnbDiscount) : 1);
    let feeUsd = p.feeUsd != null && p.feeUsd !== '' ? parseFloat(p.feeUsd) : r2(usd * feeRate * 1e6) / 1e6;
    let feeQty = null, feeAsset = s.payFeeInBnb ? 'BNB' : (p.side === 'buy' ? coin : 'USD');
    if (feeAsset === 'BNB') {
      const bnb = p.bnbPrice || (state.prices.BNB && state.prices.BNB.p);
      feeQty = bnb ? feeUsd / bnb : null;
    }
    if (p.side === 'sell') {
      const pos = cryptoReplay(state).coins[coin];
      if (!pos || pos.qty + 1e-12 < qty) throw new Error('Nu ai destul ' + coin + ' (ai ' + (pos ? +pos.qty.toFixed(8) : 0) + ').');
    }
    const e = { id: uid(), kind: 'trade', side: p.side === 'sell' ? 'sell' : 'buy', date: p.date || localISO(), coin, qty, usd, feeUsd, feeQty, feeAsset, note: p.note || '' };
    state.crypto.push(e);
    return e;
  }
  function cryptoWithdraw(state, p) {
    const usd = parseFloat(p.usd) || 0, lei = parseFloat(p.lei) || 0;
    if (!(usd > 0) || !(lei > 0)) throw new Error('Scrie suma în $ și cât a intrat în lei.');
    const e = { id: uid(), kind: 'withdraw', date: p.date || localISO(), usd, lei: r2(lei), fund: p.fund || 'Investiții', note: p.note || '' };
    state.crypto.push(e);
    addTx(state, { kind: 'divest', fund: e.fund, amount: e.lei, date: e.date, cat: 'Crypto', note: 'Retragere din ' + exName(state) + ' ' + usd + ' $', src: 'crypto', link: e.id });
    return e;
  }
  function cryptoReward(state, p) {
    const coin = String(p.coin || '').toUpperCase(), qty = parseFloat(p.qty) || 0;
    if (!coin || !(qty > 0)) throw new Error('Scrie moneda și cantitatea primită.');
    const e = { id: uid(), kind: 'reward', date: p.date || localISO(), coin, qty, note: p.note || 'Earn' };
    state.crypto.push(e); return e;
  }

  /* Reface tot portofoliul din evenimente: cost mediu în $ și în lei (cu toate fee-urile incluse). */
  function cryptoReplay(state, uptoISO) {
    const ev = state.crypto.filter((e) => !uptoISO || e.date <= uptoISO).sort(byDate);
    let stableUsd = 0, stableLei = 0;           // dolari în Binance și cât te-au costat în lei
    let depositedLei = 0, withdrawnLei = 0, realizedUsd = 0;
    const coins = {};
    const fees = [];                            // { date, type, usd, lei }
    const pos = (c) => (coins[c] = coins[c] || { coin: c, qty: 0, costUsd: 0, costLei: 0, earnQty: 0 });
    const leiPerUsd = () => (stableUsd > 1e-9 ? stableLei / stableUsd : (state.fx.usdRon || 4.8));
    ev.forEach((e) => {
      if (e.kind === 'open') {
        const p = pos(e.coin); p.qty += e.qty; p.costUsd += e.usd; p.costLei += e.lei; depositedLei += e.lei;
      } else if (e.kind === 'openStable') {
        stableUsd += e.usd; stableLei += e.lei; depositedLei += e.lei;
      } else if (e.kind === 'deposit') {
        stableUsd += e.received; stableLei += e.lei; depositedLei += e.lei;
        if (e.refRate) {
          const bank = r2(e.lei - e.usd * e.refRate);
          fees.push({ date: e.date, type: 'Marja băncii', usd: null, lei: bank });
          fees.push({ date: e.date, type: 'Fee card ' + exName(state), usd: r2((e.usd - e.received) * 1e4) / 1e4, lei: r2((e.usd - e.received) * e.refRate) });
        } else {
          fees.push({ date: e.date, type: 'Fee card ' + exName(state), usd: r2((e.usd - e.received) * 1e4) / 1e4, lei: r2((e.usd - e.received) * (e.lei / e.usd)) });
        }
      } else if (e.kind === 'trade') {
        const rate = leiPerUsd();
        const p = pos(e.coin);
        if (e.side === 'buy') {
          const leiCost = e.usd * rate;
          stableUsd -= e.usd; stableLei -= leiCost;
          p.qty += e.qty; p.costUsd += e.usd + (e.feeUsd || 0); p.costLei += leiCost + (e.feeUsd || 0) * rate;
        } else {
          const share = p.qty > 0 ? Math.min(1, e.qty / p.qty) : 0;
          const outUsd = p.costUsd * share, outLei = p.costLei * share;
          p.qty -= e.qty; p.costUsd -= outUsd; p.costLei -= outLei;
          const net = e.usd - (e.feeAsset === 'BNB' ? 0 : (e.feeUsd || 0));
          stableUsd += net; stableLei += outLei * (net / (e.usd || 1));
          realizedUsd += net - outUsd - (e.feeAsset === 'BNB' ? (e.feeUsd || 0) : 0);
        }
        if (e.feeAsset === 'BNB' && e.feeQty) {
          const b = pos('BNB');
          const take = Math.min(b.qty, e.feeQty);
          if (b.qty > 0) { const k = take / b.qty; b.costUsd -= b.costUsd * k; b.costLei -= b.costLei * k; }
          b.qty -= take;
        }
        fees.push({ date: e.date, type: 'Fee tranzacționare', usd: e.feeUsd || 0, lei: r2((e.feeUsd || 0) * rate) });
      } else if (e.kind === 'withdraw') {
        const rate = leiPerUsd();
        stableUsd -= e.usd; stableLei -= e.usd * rate; withdrawnLei += e.lei;
      } else if (e.kind === 'reward') {
        const p = pos(e.coin); p.qty += e.qty; p.earnQty += e.qty;
      }
    });
    // recompensele Earn care curg zilnic și n-au fost încă trecute ca sumă reală
    const at = uptoISO ? new Date(uptoISO).getTime() : Date.now();
    (state.earn || []).forEach((e) => {
      if (e.active === false || !e.start || e.start > (uptoISO || '9999')) return;
      const a = earnAccrued(e, at);
      if (a.acc > 0) { const p = pos(e.coin); p.qty += a.acc; p.earnQty += a.acc; p.earnLive = (p.earnLive || 0) + a.acc; }
    });
    Object.keys(coins).forEach((c) => { if (coins[c].qty < 1e-12) { coins[c].qty = 0; } });
    return { coins, stableUsd: Math.max(0, stableUsd), stableLei: Math.max(0, stableLei), depositedLei, withdrawnLei, realizedUsd, fees };
  }

  /* Valoarea portofoliului la prețurile curente. */
  function cryptoValue(state) {
    const rp = cryptoReplay(state);
    const rate = state.fx.usdRon || 4.8;
    let valueUsd = rp.stableUsd, costUsd = 0, costLei = 0, missing = [];
    const list = Object.values(rp.coins).filter((c) => c.qty > 1e-12).map((c) => {
      const pr = c.coin === 'USDT' || c.coin === 'USDC' ? { p: 1, ch: 0 } : state.prices[c.coin];
      const v = pr ? c.qty * pr.p : null;
      if (v == null) missing.push(c.coin);
      // fără preț (monedă delistată / fără pereche USDT): o socotim la cât te-a costat, ca să nu strice totalul
      valueUsd += v != null ? v : c.costUsd; costUsd += c.costUsd; costLei += c.costLei;
      return {
        coin: c.coin, qty: c.qty, avgUsd: c.qty ? c.costUsd / c.qty : 0, avgLei: c.qty ? c.costLei / c.qty : 0,
        price: pr ? pr.p : null, ch: pr ? pr.ch : null, valueUsd: v, costUsd: c.costUsd, costLei: c.costLei,
        plUsd: v != null ? v - c.costUsd : null, plPct: v != null && c.costUsd ? (v - c.costUsd) / c.costUsd : null,
        earnQty: c.earnQty
      };
    }).sort((a, b) => (b.valueUsd || 0) - (a.valueUsd || 0));
    const valueLei = valueUsd * rate;
    const netInvestedLei = rp.depositedLei - rp.withdrawnLei;
    return {
      list, stableUsd: rp.stableUsd, valueUsd, valueLei: r2(valueLei), costUsd, costLei,
      unrealizedUsd: valueUsd - rp.stableUsd - costUsd, realizedUsd: rp.realizedUsd,
      netInvestedLei: r2(netInvestedLei), realPlLei: r2(valueLei - netInvestedLei),
      fees: rp.fees, missing, rate
    };
  }

  /* ---------- Earn ---------- */
  /* Recompensa Earn vine zilnic. Flexible cu auto-subscribe: se adaugă la suma din Earn și produce și ea
     (dobândă la dobândă). Locked: tot zilnic, fără să se adune la suma care produce. */
  function earnAccrued(e, atMs) {
    const start = new Date(e.start).getTime();
    let end = atMs;
    if (e.end && e.type === 'locked') end = Math.min(end, new Date(e.end + 'T23:59').getTime());
    if (e.active === false && e.stoppedAt) end = Math.min(end, new Date(e.stoppedAt).getTime());
    const days = Math.max(0, Math.floor((end - start) / 864e5));   // recompensa vine o dată pe zi
    const r = e.apr / 365;
    const acc = e.type === 'locked' ? e.qty * r * days : e.qty * (Math.pow(1 + r, days) - 1);
    return { days, acc };
  }
  function earnSummary(state) {
    const now = Date.now();
    return state.earn.filter((e) => e.active !== false).map((e) => {
      const end = e.end ? new Date(e.end).getTime() : null;
      const pr = e.coin === 'USDT' || e.coin === 'USDC' ? 1 : (state.prices[e.coin] && state.prices[e.coin].p);
      const rate = state.fx.usdRon || 4.8;
      const a = earnAccrued(e, now);
      const cur = e.qty + (e.type === 'locked' ? 0 : a.acc);         // ce produce acum
      const total = e.qty + a.acc;                                     // ce ai acum în Earn, cu recompensele
      const today = cur * e.apr / 365;
      return Object.assign({}, e, {
        days: a.days, estReward: a.acc, qtyNow: total, todayQty: today,
        daysLeft: end ? Math.max(0, Math.ceil((end - now) / 864e5)) : null,
        price: pr || null, valueUsd: pr ? total * pr : null, valueLei: pr ? total * pr * rate : null,
        rewardUsd: pr ? a.acc * pr : null, rewardLei: pr ? a.acc * pr * rate : null,
        todayUsd: pr ? today * pr : null,
        yearUsd: pr ? cur * pr * (e.type === 'locked' ? e.apr : Math.pow(1 + e.apr / 365, 365) - 1) : null
      });
    });
  }
  /* Pui cifra reală din aplicația exchange-ului: diferența devine recompensă înregistrată, iar estimarea pornește de azi. */
  function earnFix(state, id, actualQty, date) {
    const e = state.earn.find((x) => x.id === id);
    actualQty = parseFloat(actualQty);
    if (!e) throw new Error('Nu găsesc poziția.');
    if (!(actualQty >= 0)) throw new Error('Scrie cantitatea.');
    date = date || localISO();
    const diff = actualQty - e.qty;
    if (Math.abs(diff) > 1e-12) state.crypto.push({ id: uid(), kind: 'reward', date, coin: e.coin, qty: diff, note: 'Earn ' + (e.type === 'locked' ? 'Locked' : 'Flexible'), earnId: e.id });
    e.qty = actualQty; e.start = date.slice(0, 10);
    return diff;
  }
  function earnStop(state, id, date) {
    const e = state.earn.find((x) => x.id === id);
    if (!e) return;
    date = date || localISO();
    const a = earnAccrued(e, new Date(date).getTime());
    if (a.acc > 1e-12) state.crypto.push({ id: uid(), kind: 'reward', date, coin: e.coin, qty: a.acc, note: 'Earn (la retragere)', earnId: e.id });
    e.active = false; e.stoppedAt = date;
  }

  /* ---------- cont de economii ---------- */
  function savingsDeposit(state, amount, date, note) {
    const s = state.settings.savings;
    amount = r2(parseFloat(amount) || 0);
    if (!(amount > 0)) throw new Error('Scrie suma.');
    const e = { id: uid(), kind: 'deposit', date: date || localISO(), amount, note: note || '' };
    state.savings.push(e);
    addTx(state, { kind: 'invest', fund: s.fund, amount, date: e.date, cat: 'Economii', note: 'Depunere ' + s.name, src: 'savings', link: e.id });
    return e;
  }
  function savingsWithdraw(state, amount, fund, date) {
    amount = r2(parseFloat(amount) || 0);
    if (!(amount > 0)) throw new Error('Scrie suma.');
    const e = { id: uid(), kind: 'withdraw', date: date || localISO(), amount };
    state.savings.push(e);
    addTx(state, { kind: 'divest', fund: fund || state.settings.savings.fund, amount, date: e.date, cat: 'Economii', note: 'Retragere ' + state.settings.savings.name, src: 'savings', link: e.id });
    return e;
  }
  function savingsBalance(state, uptoISO) {
    let b = 0;
    state.savings.slice().sort(byDate).forEach((e) => {
      if (uptoISO && e.date > uptoISO) return;
      if (e.kind === 'withdraw') b -= e.amount; else if (e.kind === 'set') b = e.amount; else b += e.amount;
    });
    return r2(b);
  }
  /* Dobânda: anuală ca procent, calculată pe soldul din fiecare zi și plătită lunar, cu impozitul deja reținut.
     Dobânda pentru luna L intră în cont în ziua „payDay” din luna următoare (estimată; o corectezi cu suma reală). */
  function savingsMonthInterest(state, ym) {
    const s = state.settings.savings;
    const [y, m] = ym.split('-').map(Number);
    const dim = new Date(y, m, 0).getDate();
    let sum = 0;
    for (let d = 1; d <= dim; d++) sum += Math.max(0, savingsBalance(state, ym + '-' + pad(d) + 'T23:59'));
    const gross = sum * s.apr / 365;
    return { gross: r2(gross), net: r2(gross * (1 - s.tax)), tax: r2(gross * s.tax) };
  }
  function payDate(state, ym) {
    const [y, m] = ym.split('-').map(Number);
    const dim = new Date(y, m, 0).getDate();
    return ym + '-' + pad(Math.min(dim, Math.max(1, state.settings.savings.payDay || 1))) + 'T09:00';
  }
  function accrueSavings(state, now) {
    now = now || new Date();
    if (!state.savings.length) return 0;
    const nowISO = localISO(now);
    const first = state.savings.slice().sort(byDate)[0];
    let ym = monthOf(first.date);                         // luna pentru care se calculează dobânda
    let added = 0;
    for (let guard = 0; guard < 600; guard++) {
      const [y, m] = ym.split('-').map(Number);
      const nd = new Date(y, m, 1), nextYM = nd.getFullYear() + '-' + pad(nd.getMonth() + 1);
      const when = payDate(state, nextYM);
      if (when > nowISO) break;
      if (!state.savings.some((e) => e.kind === 'interest' && (e.ym === nextYM || e.forYM === ym))) {
        const it = savingsMonthInterest(state, ym);
        if (it.net > 0) {
          state.savings.push({ id: uid(), kind: 'interest', ym: nextYM, forYM: ym, date: when, amount: it.net, gross: it.gross, est: true, note: 'Dobândă netă (estimată)' });
          added++;
        }
      }
      ym = nextYM;
    }
    return added;
  }
  /* Suma reală primită de la bancă înlocuiește estimarea. */
  function setInterestReal(state, id, amount) {
    const e = state.savings.find((x) => x.id === id && x.kind === 'interest');
    amount = r2(parseFloat(amount));
    if (!e) throw new Error('Nu găsesc dobânda.');
    if (!(amount >= 0)) throw new Error('Scrie suma primită.');
    e.amount = amount; e.est = false; e.note = 'Dobândă netă primită';
    return e;
  }
  /* Cât estimez că primești data viitoare: luna în curs, cu soldul de azi pentru zilele rămase. */
  function savingsNext(state, now) {
    now = now || new Date();
    const ym = now.getFullYear() + '-' + pad(now.getMonth() + 1);
    const nd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const it = savingsMonthInterest(state, ym);
    const pendingPrev = payDate(state, ym) > localISO(now);   // dobânda lunii trecute încă n-a venit
    const pd = new Date(now.getFullYear(), now.getMonth() - 1, 1), prevYM = pd.getFullYear() + '-' + pad(pd.getMonth() + 1);
    if (pendingPrev && state.savings.length && monthOf(state.savings.slice().sort(byDate)[0].date) <= prevYM) {
      const p = savingsMonthInterest(state, prevYM);
      return { forYM: prevYM, date: payDate(state, ym), net: p.net, gross: p.gross };
    }
    return { forYM: ym, date: payDate(state, nd.getFullYear() + '-' + pad(nd.getMonth() + 1)), net: it.net, gross: it.gross };
  }

  /* ---------- recurente ---------- */
  function runRecurring(state, now) {
    now = now || new Date();
    let added = 0;
    state.recurring.forEach((r) => {
      if (!r.active) return;
      let ym = r.lastYM || r.startYM || (now.getFullYear() + '-' + pad(now.getMonth() + 1));
      if (!r.lastYM) {   // prima lună: o adăugăm dacă ziua a trecut
        const [y, m] = ym.split('-').map(Number);
        ym = new Date(y, m - 2, 1); ym = ym.getFullYear() + '-' + pad(ym.getMonth() + 1);
      }
      for (let guard = 0; guard < 24; guard++) {
        const [y, m] = ym.split('-').map(Number);
        const nd = new Date(y, m, 1);
        const nYM = nd.getFullYear() + '-' + pad(nd.getMonth() + 1);
        const dim = new Date(nd.getFullYear(), nd.getMonth() + 1, 0).getDate();
        const due = new Date(nd.getFullYear(), nd.getMonth(), Math.min(r.day, dim), 9, 0);
        if (due > now) break;
        addTx(state, { kind: r.kind, sub: r.sub, amount: r.amount, cat: r.cat, fund: r.fund, to: r.to,
          note: (r.note ? r.note + ' ' : '') + '(recurent)', date: localISO(due), src: 'recurring', link: r.id });
        r.lastYM = nYM; ym = nYM; added++;
      }
    });
    return added;
  }

  /* ---------- statistici ---------- */
  const isExpense = (t) => t.kind === 'expense' || (t.kind === 'fund' && t.src !== 'crypto' && t.src !== 'savings');
  function periodStats(state, from, to, opts) {
    opts = opts || {};
    let income = 0, expense = 0, invested = 0, fromFunds = 0;
    const cats = {}, incTypes = {}, days = {};
    state.tx.forEach((t) => {
      if (t.date < from || t.date >= to) return;
      if (t.kind === 'income') { income += t.amount; incTypes[t.sub] = (incTypes[t.sub] || 0) + t.amount; }
      else if (isExpense(t)) {
        const c = t.cat || (t.kind === 'fund' ? 'Din ' + t.fund : 'Altele');
        if (opts.cat && c !== opts.cat) return;
        expense += t.amount; cats[c] = (cats[c] || 0) + t.amount;
        if (t.kind === 'fund') fromFunds += t.amount;
        const d = dayOf(t.date); days[d] = (days[d] || 0) + t.amount;
      } else if (t.kind === 'invest') invested += t.amount;
    });
    const catList = Object.keys(cats).map((k) => ({ name: k, value: r2(cats[k]) })).sort((a, b) => b.value - a.value);
    return { income: r2(income), expense: r2(expense), invested: r2(invested), saved: r2(income - expense),
      fromFunds: r2(fromFunds), fromCheltuieli: r2(expense - fromFunds), cats: catList, incTypes, days };
  }
  function monthRange(ym, start) {
    const [y, m] = ym.split('-').map(Number);
    const sd = Math.min(28, Math.max(1, start || 1));
    const n = new Date(y, m, 1);
    return [ym + '-' + pad(sd) + 'T00:00', n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(sd) + 'T00:00'];
  }
  /* luna financiară în care cade o zi (dacă luna ta începe pe 20, 5 noiembrie e încă „octombrie”) */
  function finYM(d, start) {
    d = d || new Date();
    const sd = Math.min(28, Math.max(1, start || 1));
    const x = d.getDate() < sd ? new Date(d.getFullYear(), d.getMonth() - 1, 1) : d;
    return x.getFullYear() + '-' + pad(x.getMonth() + 1);
  }
  function monthsBack(ym, n) {
    const out = [];
    const [y, m] = ym.split('-').map(Number);
    for (let i = n - 1; i >= 0; i--) { const d = new Date(y, m - 1 - i, 1); out.push(d.getFullYear() + '-' + pad(d.getMonth() + 1)); }
    return out;
  }
  function feeReport(state) {
    const cv = cryptoValue(state);
    const byMonth = {}, byType = {};
    let total = 0;
    cv.fees.forEach((f) => {
      const m = monthOf(f.date);
      byMonth[m] = (byMonth[m] || 0) + f.lei; byType[f.type] = (byType[f.type] || 0) + f.lei; total += f.lei;
    });
    return { total: r2(total), byMonth, byType, pctOfInvested: cv.netInvestedLei > 0 ? total / cv.netInvestedLei : 0 };
  }

  /* ---------- avere netă ---------- */
  function netWorth(state) {
    const b = balances(state);
    const funds = fundsTotal(b);
    const crypto = cryptoValue(state);
    const sav = savingsBalance(state);
    return { funds, crypto: crypto.valueLei, savings: sav, net: r2(funds + crypto.valueLei + sav), balances: b, cryptoDetail: crypto };
  }
  function snapshot(state, now) {
    const d = dayOf(localISO(now || new Date()));
    state.snapshots[d] = netWorth(state).net;
  }
  /* Serie pentru grafic: zilele cu poză reală + în rest fonduri + economii calculate din istoric. */
  function worthSeries(state, days) {
    const out = [];
    const today = new Date();
    const firsts = [state.tx[0], state.savings.slice().sort(byDate)[0]].filter(Boolean).map((e) => dayOf(e.date)).sort();
    const firstDay = firsts[0] || dayOf(localISO(today));
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const key = dayOf(localISO(d));
      if (key < firstDay) continue;              // nu desenăm zilele dinainte să existe date
      let v = state.snapshots[key];
      if (v == null) {
        // fără poză reală: fonduri + economii + ce ai băgat în crypto până atunci (în lei)
        const upto = key + 'T23:59';
        const inCrypto = state.crypto.reduce((s, e) => {
          if (e.date > upto) return s;
          if (e.kind === 'deposit' || e.kind === 'open' || e.kind === 'openStable') return s + e.lei;
          if (e.kind === 'withdraw') return s - e.lei;
          return s;
        }, 0);
        v = r2(fundsTotal(balances(state, upto)) + savingsBalance(state, upto) + inCrypto);
      }
      out.push({ d: key, v });
    }
    return out;
  }

  /* ---------- profil: animalul de companie e o categorie, banca dă numele contului de economii ---------- */
  function setPet(state, name) {
    const s = state.settings, old = s.profile.pet || 'Animal de companie';
    name = String(name || '').trim();
    s.profile.pet = name;
    if (!name) return;
    if (s.categories.indexOf(old) >= 0 && s.categories.indexOf(name) < 0) renameCategory(state, old, name);
    else if (s.categories.indexOf(name) < 0) s.categories.splice(Math.max(0, s.categories.length - 2), 0, name);
  }
  function setBank(state, bank) {
    const s = state.settings, old = s.profile.bank;
    bank = String(bank || '').trim();
    if (s.savings.name === 'Cont de economii' || s.savings.name === 'Economii ' + old) s.savings.name = bank ? 'Economii ' + bank : 'Cont de economii';
    s.profile.bank = bank;
  }

  /* ---------- bani disponibili (Acasă) ---------- */
  function availableFunds(state) {
    const act = activeFunds(state), a = state.settings.available;
    return Array.isArray(a) ? act.filter((f) => a.indexOf(f) >= 0) : act;
  }
  /* Soldul fondurilor alese, zi cu zi (o singură trecere prin tranzacții). */
  function fundSeries(state, days, funds) {
    const set = {}; (funds || availableFunds(state)).forEach((f) => { set[f] = 1; });
    const tx = state.tx.slice().sort(byDate);
    const today = new Date();
    const firstDay = tx.length ? dayOf(tx[0].date) : dayOf(localISO(today));
    const out = [];
    let i = 0, v = 0;
    for (let k = days - 1; k >= 0; k--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - k);
      const key = dayOf(localISO(d)), upto = key + 'T23:59';
      while (i < tx.length && tx[i].date <= upto) { const al = tx[i].alloc || {}; Object.keys(al).forEach((f) => { if (set[f]) v += al[f]; }); i++; }
      if (key < firstDay) continue;
      out.push({ d: key, v: r2(v) });
    }
    return out;
  }

  /* ---------- raport investiții: cât ai băgat și cât valorează ---------- */
  function savingsReport(state, uptoISO) {
    let bal = 0, principal = 0, interest = 0;
    state.savings.slice().sort(byDate).forEach((e) => {
      if (uptoISO && e.date > uptoISO) return;
      if (e.kind === 'deposit') { bal += e.amount; principal += e.amount; }
      else if (e.kind === 'withdraw') { const k = bal > 0 ? Math.min(1, e.amount / bal) : 0; principal -= principal * k; interest -= interest * k; bal -= e.amount; }
      else if (e.kind === 'interest') { bal += e.amount; interest += e.amount; }
      else if (e.kind === 'set') {
        const diff = e.amount - bal;
        if (bal <= 0.005 && principal <= 0.005) principal += diff;   // primul sold: e bani puși de tine
        else interest += diff;                                        // corecturi ulterioare: dobânda reală
        bal = e.amount;
      }
    });
    return { balance: r2(bal), principal: r2(principal), interest: r2(interest) };
  }
  function investReport(state) {
    const cv = cryptoValue(state), sv = savingsReport(state);
    const fr = feeReport(state);
    const invested = cv.netInvestedLei + sv.principal, value = cv.valueLei + sv.balance;
    const pl = value - invested;
    return {
      invested: r2(invested), value: r2(value), pl: r2(pl), plPct: invested > 0 ? pl / invested : 0,
      crypto: { invested: cv.netInvestedLei, value: cv.valueLei, pl: cv.realPlLei, plPct: cv.netInvestedLei > 0 ? cv.realPlLei / cv.netInvestedLei : 0, detail: cv },
      savings: Object.assign({ pl: sv.interest, plPct: sv.principal > 0 ? sv.interest / sv.principal : 0 }, sv),
      fees: fr.total
    };
  }
  /* Monedele deținute vreodată (pentru istoricul de prețuri). */
  function coinsEver(state) {
    const set = {};
    state.crypto.forEach((e) => { if (e.coin && e.coin !== 'USDT' && e.coin !== 'USDC') set[e.coin] = 1; });
    return Object.keys(set);
  }
  /* Valoare portofoliu vs bani băgați, zi cu zi. Prețurile vin din state.hist (închideri zilnice Binance). */
  function portfolioSeries(state, days) {
    const today = new Date();
    const firsts = [state.crypto.slice().sort(byDate)[0], state.savings.slice().sort(byDate)[0]].filter(Boolean).map((e) => dayOf(e.date)).sort();
    if (!firsts.length) return [];
    const rate = state.fx.usdRon || 4.8, hist = state.hist || {};
    const last = {};
    const out = [];
    for (let k = days - 1; k >= 0; k--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - k);
      const key = dayOf(localISO(d));
      Object.keys(hist).forEach((c) => { if (c[0] !== '_' && hist[c][key] != null) last[c] = hist[c][key]; });
      if (key < firsts[0]) continue;
      const upto = key + 'T23:59';
      const rp = cryptoReplay(state, upto), sv = savingsReport(state, upto);
      let usd = rp.stableUsd;
      Object.values(rp.coins).forEach((c) => {
        if (c.qty <= 1e-12) return;
        const p = c.coin === 'USDT' || c.coin === 'USDC' ? 1 : (k === 0 && state.prices[c.coin] ? state.prices[c.coin].p : last[c.coin]);
        usd += p != null ? c.qty * p : c.costUsd;
      });
      out.push({ d: key, value: r2(usd * rate + sv.balance), invested: r2(rp.depositedLei - rp.withdrawnLei + sv.principal) });
    }
    return out;
  }

  /* ---------- obiective ---------- */
  function goalProgress(state, g) {
    const b = balances(state);
    // dacă mai multe obiective sunt pe același fond, banii se dau în ordinea în care le-ai creat
    const same = state.goals.filter((x) => x.fund === g.fund && !x.done);
    let left = Math.max(0, b[g.fund] || 0), have = 0;
    for (const x of same) { const take = Math.min(left, x.target); if (x.id === g.id) { have = take; break; } left -= take; }
    if (g.done) have = g.target;
    let perMonth = null, monthsLeft = null;
    if (g.by && !g.done) {
      const now = new Date(), end = new Date(g.by + 'T12:00');
      monthsLeft = Math.max(0, (end.getFullYear() - now.getFullYear()) * 12 + end.getMonth() - now.getMonth() + (end.getDate() >= now.getDate() ? 0 : -1));
      perMonth = r2(Math.max(0, g.target - have) / Math.max(1, monthsLeft));
    }
    return { have: r2(have), share: g.target > 0 ? Math.min(1, have / g.target) : 0, left: r2(Math.max(0, g.target - have)), perMonth, monthsLeft };
  }

  /* ---------- comparație cu perioada de dinainte, la aceeași zi ---------- */
  function paceCompare(state, start, now) {
    now = now || new Date();
    const ym = finYM(now, start);
    const [from] = monthRange(ym, start);
    const [y, m] = ym.split('-').map(Number);
    const pd = new Date(y, m - 2, 1), prevYM = pd.getFullYear() + '-' + pad(pd.getMonth() + 1);
    const [pFrom, pTo] = monthRange(prevYM, start);
    const elapsed = now.getTime() - new Date(from).getTime();
    const pCut = localISO(new Date(new Date(pFrom).getTime() + elapsed));
    const cur = periodStats(state, from, localISO(now) + ':59').expense;
    const prev = periodStats(state, pFrom, pCut < pTo ? pCut : pTo).expense;
    const prevFull = periodStats(state, pFrom, pTo).expense;
    return { cur, prev, prevFull, prevYM, diffPct: prev > 0 ? (cur - prev) / prev : null };
  }

  /* ---------- setări: fonduri, venituri, categorii, bancnote ---------- */
  function cleanName(n) { n = String(n || '').trim(); if (!n) throw new Error('Scrie un nume.'); return n; }
  function renameFund(state, oldN, newN) {
    newN = cleanName(newN);
    if (oldN === newN) return;
    if (fundNames(state).indexOf(newN) >= 0) throw new Error('Există deja un fond „' + newN + '”.');
    const s = state.settings;
    fundInfo(state, oldN).name = newN;
    const sw = (v) => (v === oldN ? newN : v);
    (state.goals || []).forEach((g) => { g.fund = sw(g.fund); });
    if (Array.isArray(s.available)) s.available = s.available.map(sw);
    state.tx.forEach((t) => {
      if (t.alloc && t.alloc[oldN] !== undefined) { t.alloc[newN] = t.alloc[oldN]; delete t.alloc[oldN]; }
      t.fund = sw(t.fund); t.to = sw(t.to);
    });
    Object.keys(s.splits).forEach((k) => { const sp = s.splits[k]; if (sp[oldN] !== undefined) { sp[newN] = sp[oldN]; delete sp[oldN]; } });
    s.cashOrder = s.cashOrder.map(sw); s.expenseFund = sw(s.expenseFund);
    s.binance.cryptoFund = sw(s.binance.cryptoFund); s.savings.fund = sw(s.savings.fund);
    state.recurring.forEach((r) => { r.fund = sw(r.fund); r.to = sw(r.to); });
    state.crypto.forEach((e) => { e.fund = sw(e.fund); });
    state.shortcuts.forEach((x) => { ['fund', 'fundFrom', 'fundTo'].forEach((k) => { x.preset[k] = sw(x.preset[k]); }); });
  }
  function addFund(state, name, color, icon) {
    name = cleanName(name);
    if (fundNames(state).indexOf(name) >= 0) throw new Error('Există deja un fond „' + name + '”.');
    state.settings.funds.push({ name, color: color || PALETTE[state.settings.funds.length % PALETTE.length], icon: icon || 'funds', archived: false });
    Object.keys(state.settings.splits).forEach((k) => { state.settings.splits[k][name] = 0; });
    if (Array.isArray(state.settings.available)) state.settings.available.push(name);   // un fond nou e bani de folosit
  }
  function setFundArchived(state, name, archived) {
    const s = state.settings;
    if (archived) {
      const bal = balances(state)[name] || 0;
      if (Math.abs(bal) > 0.009) throw new Error('„' + name + '” mai are ' + bal + ' lei. Mută-i întâi în alt fond.');
      if (activeFunds(state).length <= 1) throw new Error('Trebuie să rămână cel puțin un fond.');
      if ([s.expenseFund, s.binance.cryptoFund, s.savings.fund].indexOf(name) >= 0) throw new Error('„' + name + '” e folosit de cheltuieli, crypto sau economii. Alege alt fond acolo întâi.');
      const used = Object.keys(s.splits).filter((k) => (s.splits[k][name] || 0) > 0);
      if (used.length) throw new Error('„' + name + '” primește procente din ' + used.join(', ') + '. Pune 0% acolo întâi.');
    }
    fundInfo(state, name).archived = !!archived;
  }
  function addIncomeType(state, name) {
    name = cleanName(name);
    const s = state.settings;
    if (s.incomeTypes.indexOf(name) >= 0) throw new Error('Există deja „' + name + '”.');
    s.incomeTypes.push(name);
    s.splits[name] = {}; fundNames(state).forEach((f) => { s.splits[name][f] = 0; });
    s.splits[name][s.expenseFund] = 1;          // pornește cu 100% la cheltuieli, apoi îl ajustezi
  }
  function renameIncomeType(state, oldN, newN) {
    newN = cleanName(newN);
    const s = state.settings;
    if (oldN === newN) return;
    if (s.incomeTypes.indexOf(newN) >= 0) throw new Error('Există deja „' + newN + '”.');
    s.incomeTypes = s.incomeTypes.map((t) => (t === oldN ? newN : t));
    s.splits[newN] = s.splits[oldN]; delete s.splits[oldN];
    state.tx.forEach((t) => { if (t.kind === 'income' && t.sub === oldN) t.sub = newN; });
    state.recurring.forEach((r) => { if (r.sub === oldN) r.sub = newN; });
    state.shortcuts.forEach((x) => { if (x.preset.sub === oldN) x.preset.sub = newN; });
  }
  function deleteIncomeType(state, name) {
    const s = state.settings;
    if (state.tx.some((t) => t.kind === 'income' && t.sub === name)) throw new Error('Ai venituri „' + name + '” în istoric. Îl poți doar redenumi.');
    if (s.incomeTypes.length <= 1) throw new Error('Trebuie să rămână cel puțin un tip de venit.');
    s.incomeTypes = s.incomeTypes.filter((t) => t !== name); delete s.splits[name];
  }
  function renameCategory(state, oldN, newN) {
    newN = cleanName(newN);
    const s = state.settings;
    if (oldN === newN) return;
    if (s.categories.indexOf(newN) >= 0) throw new Error('Există deja categoria „' + newN + '”.');
    s.categories = s.categories.map((c) => (c === oldN ? newN : c));
    state.tx.forEach((t) => { if (t.cat === oldN) t.cat = newN; });
    state.recurring.forEach((r) => { if (r.cat === oldN) r.cat = newN; });
    state.shortcuts.forEach((x) => { if (x.preset.cat === oldN) x.preset.cat = newN; if (x.label === oldN) x.label = newN; });
  }
  function addDenom(state, label, value, cur) {
    label = cleanName(label); value = parseFloat(value);
    if (!(value > 0)) throw new Error('Scrie valoarea bancnotei.');
    state.settings.denoms.push({ id: uid(), label, value, cur: cur === 'EUR' ? 'EUR' : 'RON' });
  }
  function deleteDenom(state, id) {
    const it = cashSummary(state).items.find((i) => i.id === id);
    if (it && Math.abs(it.count) > 1e-9) throw new Error('Mai ai ' + it.count + ' × ' + it.label + ' în pușculiță. Scoate-le întâi.');
    state.settings.denoms = state.settings.denoms.filter((d) => d.id !== id);
  }

  /* ---------- import / export ---------- */
  function validateBackup(obj) {
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.tx)) throw new Error('Fișierul nu e un backup Fonduri.');
    const base = emptyState();
    const st = Object.assign(base, obj);
    st.settings = Object.assign(defaultSettings(), obj.settings || {});
    st.settings.binance = Object.assign(defaultSettings().binance, (obj.settings || {}).binance || {});
    st.settings.savings = Object.assign(defaultSettings().savings, (obj.settings || {}).savings || {});
    st.settings.lock = (obj.settings && obj.settings.lock) || { enabled: false, credId: null };
    st.settings.home = Object.assign(defaultSettings().home, (obj.settings || {}).home || {});
    st.settings.live = Object.assign(defaultSettings().live, (obj.settings || {}).live || {});
    st.settings.theme = Object.assign(defaultSettings().theme, (obj.settings || {}).theme || {});
    st.settings.profile = Object.assign(defaultSettings().profile, (obj.settings || {}).profile || {});
    if (st.tx.length || st.crypto.length) st.settings.setupDone = true;   // are deja date: nu mai arătăm ecranul de început
    if (!Array.isArray(st.goals)) st.goals = [];
    if (!st.hist || typeof st.hist !== 'object') st.hist = {};
    // fonduri care apar în tranzacții dar lipsesc din listă (fișiere vechi) se adaugă singure
    const known = st.settings.funds.map((f) => f.name);
    st.tx.forEach((t) => Object.keys(t.alloc || {}).forEach((f) => {
      if (known.indexOf(f) < 0) { known.push(f); st.settings.funds.push({ name: f, color: PALETTE[known.length % PALETTE.length], icon: 'funds', archived: false }); }
    }));
    Object.keys(st.settings.splits).forEach((k) => { if (st.settings.incomeTypes.indexOf(k) < 0) st.settings.incomeTypes.push(k); });
    st.tx.sort(byDate);
    return st;
  }
  function exportRows(state) {
    const tx = state.tx.map((t) => ({
      'Dată': t.date.replace('T', ' '), 'Tip': kindLabel(t), 'Sumă (lei)': t.amount, 'Categorie': t.cat || '',
      'Fond': t.fund || '', 'Fond destinație': t.to || '', 'Notă': t.note || '',
      'Împărțire': Object.keys(t.alloc || {}).map((f) => f + ' ' + t.alloc[f]).join(', ')
    }));
    const crypto = state.crypto.slice().sort(byDate).map((e) => ({
      'Dată': e.date.replace('T', ' '), 'Tip': { deposit: 'Depunere', trade: e.side === 'sell' ? 'Vânzare' : 'Cumpărare', withdraw: 'Retragere', reward: 'Recompensă Earn', open: 'Poziție inițială', openStable: 'Dolari inițiali' }[e.kind],
      'Monedă': e.coin || 'USD', 'Cantitate': e.qty || e.received || e.usd || '', 'Sumă $': e.usd || '', 'Lei': e.lei || '',
      'Fee $': e.feeUsd != null ? e.feeUsd : (e.kind === 'deposit' ? r2((e.usd - e.received) * 1e4) / 1e4 : ''), 'Notă': e.note || ''
    }));
    const b = balances(state);
    const funds = fundNames(state).map((f) => ({ 'Fond': f, 'Sold (lei)': b[f] }));
    const savings = state.savings.slice().sort(byDate).map((e) => ({ 'Dată': e.date.replace('T', ' '), 'Tip': e.kind, 'Sumă': e.amount, 'Notă': e.note || '' }));
    const cash = cashSummary(state).items.map((i) => ({ 'Bancnote': i.label, 'Bucăți': i.count, 'Valoare (lei)': i.lei }));
    const goals = (state.goals || []).map((g) => { const pr = goalProgress(state, g); return { 'Obiectiv': g.name, 'Fond': g.fund, 'Țintă (lei)': g.target, 'Strâns (lei)': pr.have, 'Până la': g.by || '', 'Atins': g.done ? 'da' : '' }; });
    const ir = investReport(state);
    const inv = [
      { 'Ce': 'Crypto', 'Băgat (lei)': ir.crypto.invested, 'Valoare acum (lei)': ir.crypto.value, 'Profit (lei)': ir.crypto.pl },
      { 'Ce': state.settings.savings.name, 'Băgat (lei)': ir.savings.principal, 'Valoare acum (lei)': ir.savings.balance, 'Profit (lei)': ir.savings.interest },
      { 'Ce': 'Total', 'Băgat (lei)': ir.invested, 'Valoare acum (lei)': ir.value, 'Profit (lei)': ir.pl }
    ];
    return { Tranzactii: tx, Crypto: crypto, Fonduri: funds, Economii: savings, Pusculita: cash, Obiective: goals, Investitii: inv };
  }
  function kindLabel(t) {
    return { income: t.sub || 'Venit', expense: 'Cheltuială', fund: 'Din fond', transfer: 'Mutare', invest: 'Investit', divest: 'Retras', adjust: 'Sold inițial' }[t.kind] || t.kind;
  }

  const FC = {
    FUNDS, FUND_COLORS, INCOME_TYPES, CATEGORIES, DENOMS, PALETTE,
    fundNames, activeFunds, fundInfo, renameFund, addFund, setFundArchived,
    addIncomeType, renameIncomeType, deleteIncomeType, renameCategory, addDenom, deleteDenom,
    defaultSettings, emptyState, uid, r2, pad, localISO, dayOf, monthOf, byDate,
    balances, fundsTotal, incomeAlloc, makeTx, addTx, updateTx, deleteTx,
    cashSummary, addCash, exchangeEur,
    cryptoDeposit, cryptoTrade, cryptoWithdraw, cryptoReward, cryptoReplay, cryptoValue,
    earnSummary, savingsDeposit, savingsWithdraw, savingsBalance, accrueSavings,
    runRecurring, periodStats, monthRange, monthsBack, feeReport, isExpense,
    netWorth, snapshot, worthSeries, validateBackup, exportRows, kindLabel,
    exName, setPet, setBank, earnAccrued, earnFix, earnStop, savingsMonthInterest, setInterestReal, savingsNext, finYM, availableFunds, fundSeries, savingsReport, investReport, coinsEver, portfolioSeries, goalProgress, paceCompare
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = FC;
  else root.FC = FC;
})(typeof window !== 'undefined' ? window : globalThis);
