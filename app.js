/* Fonduri — interfața. Datele stau doar pe telefon (localStorage). */
(function () {
  'use strict';
  const FC = window.FC;
  const KEY = 'fonduri.data.v1';
  const $app = document.getElementById('app');

  /* ================= date ================= */
  let S = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return FC.validateBackup(JSON.parse(raw));
    } catch (e) { console.error(e); }
    return FC.emptyState();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('Nu am putut salva pe telefon: ' + e.message, true); }
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  /* ================= stare interfață ================= */
  const now0 = new Date();
  const UI = {
    tab: S.settings.startTab || 'home', page: null, sheet: null, args: {},
    range: S.settings.homeRange || 90, invSeg: 'report', repRange: 90, statsMode: 'luna',
    statsYM: FC.finYM(now0, S.settings.monthStart), statsCat: null,
    histQ: '', histF: 'all', histCat: '', openCoin: null, add: null, form: {}, openSet: {}, editFund: null, chartRange: '1L'
  };

  /* ================= formatare ================= */
  const nf = {};
  function fmt(n, d) {
    const k = d == null ? 'a' : d;
    if (!nf[k]) nf[k] = d == null
      ? new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
      : new Intl.NumberFormat('ro-RO', { minimumFractionDigits: d, maximumFractionDigits: d });
    return nf[k].format(n || 0);
  }
  const lei = (n, d) => fmt(n, d) + ' lei';
  const usd = (n) => '$' + fmt(n, Math.abs(n) >= 1 || n === 0 ? 2 : 4);
  function qty(n) { return n == null ? '—' : (+n.toFixed(8)).toLocaleString('ro-RO', { maximumFractionDigits: 8 }); }
  function sign(n, f) { return (n > 0 ? '+' : n < 0 ? '−' : '') + (f || fmt)(Math.abs(n)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
  const MSHORT = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'noi', 'dec'];
  const DAYS = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'];
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function dayLabel(iso) {
    const d = new Date(iso.slice(0, 10) + 'T12:00');
    const t = new Date(); t.setHours(12, 0, 0, 0);
    const diff = Math.round((t - d) / 864e5);
    if (diff === 0) return 'Azi';
    if (diff === 1) return 'Ieri';
    return cap(DAYS[d.getDay()]) + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
  }
  const timeOf = (iso) => iso.slice(11, 16);
  function ymLabel(ym) { const [y, m] = ym.split('-').map(Number); return cap(MONTHS[m - 1]) + ' ' + y; }
  function daysSince(iso) { return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : null; }
  /* luna financiară (poate începe în altă zi decât 1, din Setări) */
  const MS = () => S.settings.monthStart || 1;
  const mr = (ym) => FC.monthRange(ym, MS());
  const curYM = () => FC.finYM(new Date(), MS());
  function spanLabel(ym) {
    if (MS() === 1) return '';
    const [a, b] = mr(ym), e = new Date(new Date(b).getTime() - 864e5);
    return (+a.slice(8, 10)) + ' ' + MSHORT[+a.slice(5, 7) - 1] + ' – ' + e.getDate() + ' ' + MSHORT[e.getMonth()];
  }

  /* ================= aspect (culori, fundal, mărime text) ================= */
  const THEMES = {
    mov: { name: 'Mov', violet: '#645394', act: '#6F5ADC', actTxt: '#B4A7FF', chart: '#8F7CF0' },
    albastru: { name: 'Albastru', violet: '#2E5C8A', act: '#3A78C9', actTxt: '#9CC3F5', chart: '#5E9BE0' },
    smarald: { name: 'Smarald', violet: '#1E6A57', act: '#1F8F6E', actTxt: '#8FE3C4', chart: '#3FC499' },
    pruna: { name: 'Prună', violet: '#74395F', act: '#A8487F', actTxt: '#F0A6D3', chart: '#D27AB0' },
    chihlimbar: { name: 'Chihlimbar', violet: '#7A5520', act: '#A86B12', actTxt: '#F2C879', chart: '#E3A846' },
    grafit: { name: 'Grafit', violet: '#3A3F52', act: '#555C7A', actTxt: '#C9CCD8', chart: '#9EA3B5' }
  };
  const BGS = {
    denim: { name: 'Black Denim', bg: '#191C27', deep: '#11131B', surf: '#222636', surf2: '#2C3144' },
    ardezie: { name: 'Ardezie', bg: '#1E2229', deep: '#15181D', surf: '#272C35', surf2: '#323843' },
    oled: { name: 'Negru complet', bg: '#000000', deep: '#000000', surf: '#14151C', surf2: '#20222D' }
  };
  const SIZES = { normal: ['Normal', 1], mare: ['Mare', 1.08], xl: ['Foarte mare', 1.16] };
  function applyTheme() {
    const t = S.settings.theme || {}, a = THEMES[t.accent] || THEMES.mov, b = BGS[t.bg] || BGS.denim;
    const r = document.documentElement.style;
    r.setProperty('--violet', a.violet); r.setProperty('--act', a.act); r.setProperty('--actTxt', a.actTxt); r.setProperty('--chart', a.chart);
    r.setProperty('--bg', b.bg); r.setProperty('--deep', b.deep); r.setProperty('--surf', b.surf); r.setProperty('--surf2', b.surf2);
    document.body.style.zoom = (SIZES[t.size] || SIZES.normal)[1];
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', b.bg);
  }

  /* ================= iconițe ================= */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    funds: '<path d="M12 3 2 8l10 5 10-5-10-5z"/><path d="m2 13 10 5 10-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    invest: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    stats: '<path d="M5 20V11M12 20V5M19 20v-6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 5.1A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.2-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    down: '<path d="M12 3v12M7 10l5 5 5-5M4 19h16"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M4 5h16"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    cart: '<path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2"/><circle cx="9.5" cy="20" r="1.2"/><circle cx="17" cy="20" r="1.2"/>',
    inc: '<path d="M17 7 7 17M7 9v8h8"/>',
    out: '<path d="M7 7l10 10M17 9v8H9"/>',
    swap: '<path d="M4 8h14l-4-4M20 16H6l4 4"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    gift: '<path d="M4 10h16v10H4z"/><path d="M3 7h18v3H3zM12 7v13"/><path d="M12 7c-2-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3-2-5 1"/>',
    shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/>',
    repeat: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    piggy: '<path d="M19 9c1 .6 2 1.8 2 3.5 0 1.6-.8 2.6-2 3.2V19h-3v-2h-5v2H8v-2.5A6 6 0 0 1 5 11c0-3.3 3.1-6 7-6 1.7 0 3.2.5 4.4 1.3L19 5z"/><circle cx="15.5" cy="10.5" r=".8"/>',
    face: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 9v1M15 9v1M12 9v4h-1M9.5 15.5c1.4 1 3.6 1 5 0"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>'
  };
  function ic(name, size, sw) {
    return '<svg aria-hidden="true" width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.8) + '" stroke-linecap="round" stroke-linejoin="round">' + P[name] + '</svg>';
  }
  /* fondurile, veniturile și bancnotele vin din Setări */
  const FUNDS = () => FC.activeFunds(S);
  const fcol = (f) => FC.fundInfo(S, f).color;
  const ficon = (f) => (P[FC.fundInfo(S, f).icon] ? FC.fundInfo(S, f).icon : 'funds');
  const EXP = () => S.settings.expenseFund;
  const EXCH = () => S.settings.profile.exchange || 'exchange';
  const BANK = () => S.settings.profile.bank || 'bancă';
  const INC = () => S.settings.incomeTypes;
  const BANKS = ['BT', 'ING', 'BCR', 'BRD', 'Raiffeisen', 'CEC', 'UniCredit', 'Revolut', 'Salt Bank'];
  const EXCHS = ['Binance', 'Revolut', 'Coinbase', 'Kraken', 'Bybit', 'OKX', 'Bitget'];
  const ICON_CHOICES = ['cart', 'receipt', 'bag', 'invest', 'gift', 'shield', 'piggy', 'home', 'funds', 'repeat', 'swap', 'stats'];
  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function fundBadge(f) { const c = fcol(f); return '<span class="badge" style="background:' + rgba(c, 0.16) + ';color:' + c + '">' + ic(ficon(f), 20) + '</span>'; }

  /* ================= notificări ================= */
  let toastT;
  function toast(msg, err) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const d = document.createElement('div');
    d.className = 'toast' + (err ? ' err' : ''); d.setAttribute('role', 'status'); d.textContent = msg;
    document.body.appendChild(d);
    clearTimeout(toastT); toastT = setTimeout(() => d.remove(), err ? 4200 : 2400);
  }
  /* întrebare de confirmare în aplicație (dialogul nativ al browserului nu merge peste tot) */
  function ask(msg, yes, onYes) {
    const d = document.createElement('div');
    d.className = 'ask';
    d.innerHTML = '<div class="ask-box" role="alertdialog" aria-modal="true" aria-labelledby="askMsg"><p id="askMsg">' + esc(msg) + '</p>' +
      '<div class="grid2"><button class="btn" data-x="no">Renunță</button><button class="btn ' + (/terge/.test(yes) ? 'danger' : 'primary') + '" data-x="yes">' + esc(yes) + '</button></div></div>';
    document.body.appendChild(d);
    d.querySelector('[data-x="yes"]').focus();
    d.addEventListener('click', (ev) => {
      const x = ev.target.closest('[data-x]');
      if (ev.target === d || (x && x.dataset.x === 'no')) { d.remove(); return; }
      if (x && x.dataset.x === 'yes') { d.remove(); guard(onYes)(); }
    });
  }
  function guard(fn) {
    return function () {
      try { return fn.apply(this, arguments); }
      catch (e) { toast(e.message || String(e), true); }
    };
  }

  /* ================= grafice mici ================= */
  function areaChart(series, w, h) {
    if (series.length < 2) return '';
    const vals = series.map((p) => p.v);
    let min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (max - min < 1) { max += 1; min -= 1; }
    const x = (i) => (i / (series.length - 1)) * (w - 6) + 1;
    const y = (v) => h - 6 - ((v - min) / (max - min)) * (h - 14);
    let d = '';
    series.forEach((p, i) => { d += (i ? ' L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1); });
    const last = series[series.length - 1];
    return '<svg role="img" aria-label="Evoluția banilor disponibili" width="100%" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="display:block;margin-top:14px">' +
      '<path d="' + d + ' L' + x(series.length - 1).toFixed(1) + ' ' + h + ' L' + x(0).toFixed(1) + ' ' + h + ' Z" fill="rgba(255,255,255,.10)"/>' +
      '<path d="' + d + '" fill="none" stroke="#F8F7F4" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
      '<circle cx="' + x(series.length - 1).toFixed(1) + '" cy="' + y(last.v).toFixed(1) + '" r="4" fill="#F8F7F4"/></svg>';
  }
  function donut(parts, size) {
    const r = size / 2 - 14, c = 2 * Math.PI * r, total = parts.reduce((s, p) => s + Math.max(0, p.v), 0);
    let off = 0, out = '';
    if (total <= 0) return '<svg width="' + size + '" height="' + size + '" aria-hidden="true"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="20"/></svg>';
    parts.forEach((p) => {
      if (p.v <= 0) return;
      const len = (p.v / total) * c, dash = Math.max(0.5, len - (parts.length > 1 ? 4 : 0));
      out += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke="' + p.c + '" stroke-dasharray="' + dash.toFixed(2) + ' ' + c.toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"/>';
      off += len;
    });
    return '<svg role="img" aria-label="Împărțirea banilor pe fonduri" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '"><g transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')" fill="none" stroke-width="20">' + out + '</g></svg>';
  }
  function ring(share, color) {
    const r = 14, c = 2 * Math.PI * r, len = Math.max(1.5, Math.min(1, share) * c);
    return '<svg aria-hidden="true" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="5"/><circle cx="18" cy="18" r="14" fill="none" stroke="' + color + '" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + len.toFixed(2) + ' ' + c.toFixed(2) + '" transform="rotate(-90 18 18)"/></svg>';
  }

  /* ================= rânduri de tranzacții ================= */
  function txVisual(t) {
    if (t.kind === 'income') return { c: '#6FCF97', icon: 'inc', title: t.sub, sub: t.eur ? fmt(t.eur) + ' € · împărțit în fonduri' : 'Împărțit în fonduri' };
    if (t.kind === 'expense') return { c: '#FF6961', icon: t.src === 'recurring' ? 'repeat' : 'cart', title: t.note || t.cat || 'Cheltuială', sub: t.note ? (t.cat || '') : 'Din ' + (t.fund || EXP()) };
    if (t.kind === 'fund') return { c: fcol(t.fund), icon: 'bag', title: t.note || ('Din ' + t.fund), sub: 'Din ' + t.fund + (t.cat ? ', ' + t.cat : '') };
    if (t.kind === 'transfer') return { c: '#4B9CD3', icon: 'swap', title: t.fund + ' → ' + t.to, sub: t.note || 'Mutare între fonduri' };
    if (t.kind === 'invest') return { c: '#9C8CF0', icon: 'invest', title: t.note || 'Investit', sub: 'Din ' + t.fund };
    if (t.kind === 'divest') return { c: '#9C8CF0', icon: 'inc', title: t.note || 'Retras', sub: 'În ' + t.fund };
    return { c: '#9EA3B5', icon: 'funds', title: t.note || 'Ajustare', sub: 'Sold' };
  }
  function txAmount(t) {
    if (t.kind === 'income' || t.kind === 'divest') return '<span class="v green m">+' + fmt(t.amount, 2) + '</span>';
    if (t.kind === 'transfer' || t.kind === 'adjust') return '<span class="v soft m">' + fmt(t.amount, 2) + '</span>';
    return '<span class="v m">−' + fmt(t.amount, 2) + '</span>';
  }
  function txRow(t, showDay) {
    const v = txVisual(t);
    const when = showDay ? dayLabel(t.date) + ', ' + timeOf(t.date) : timeOf(t.date);
    return '<button class="list-row" data-a="editTx" data-id="' + t.id + '">' +
      '<span class="badge" style="background:' + rgba(v.c, 0.16) + ';color:' + v.c + '">' + ic(v.icon, 20) + '</span>' +
      '<span class="grow"><span class="t">' + esc(v.title) + '</span><span class="s">' + esc(v.sub ? v.sub + ', ' + when : when) + '</span></span>' +
      txAmount(t) + '</button>';
  }

  /* ================= ECRAN: Acasă ================= */
  function homeScreen() {
    const b = FC.balances(S), avail = FC.availableFunds(S);
    const now = avail.reduce((x, f) => x + (b[f] || 0), 0);
    const series = FC.fundSeries(S, UI.range, avail);
    if (!series.length) series.push({ d: FC.dayOf(FC.localISO()), v: now });
    series[series.length - 1].v = now;
    const delta = now - series[0].v;
    const spanTxt = series.length < UI.range ? 'de pe ' + (+series[0].d.slice(8)) + ' ' + MSHORT[+series[0].d.slice(5, 7) - 1]
      : 'în ' + (UI.range === 30 ? '30 de zile' : UI.range === 90 ? '3 luni' : 'un an');
    const ym = curYM();
    const cur = FC.periodStats(S, ...mr(ym));
    const pace = FC.paceCompare(S, MS());
    const expDays = daysSince(S.settings.lastExport);
    const exportChip = (expDays == null || expDays >= S.settings.exportRemindDays)
      ? '<button class="chip" data-a="sheet" data-s="export" style="border-color:rgba(227,179,65,.4)">' + ic('down', 16, 2) + (expDays == null ? 'Niciun export' : 'Export: acum ' + expDays + ' zile') + '</button>'
      : '';
    const cash = FC.cashSummary(S);
    const cashIn = avail.reduce((x, f) => x + (cash.perFund[f] || 0), 0);
    const tot = Math.max(1, avail.reduce((x, f) => x + Math.max(0, b[f]), 0));
    const H = S.settings.home;
    const recent = S.tx.slice(-(H.recentCount || 6)).reverse();
    const d = new Date();
    const neg = FUNDS().filter((f) => b[f] < 0);
    const allF = avail.length === FUNDS().length;
    return '<main class="screen">' +
      '<header class="row between"><div class="col" style="gap:2px"><span class="small muted">' + cap(DAYS[d.getDay()]) + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + '</span><span class="disp" style="font-size:26px;font-weight:600">Bună' + (S.settings.name ? ', ' + esc(S.settings.name) : '') + '</span></div>' +
      '<div class="row" style="gap:8px">' +
      '<button class="icon-btn" data-a="discreet" aria-label="' + (S.settings.discreet ? 'Arată sumele' : 'Ascunde sumele') + '">' + ic(S.settings.discreet ? 'eyeOff' : 'eye', 20) + '</button>' +
      '<button class="icon-btn" data-a="page" data-p="settings" aria-label="Setări">' + ic('gear', 20) + '</button></div></header>' +
      (exportChip ? '<div class="row">' + exportChip + '</div>' : '') +
      (H.hero ? '<section class="hero">' +
      '<svg class="dial" aria-hidden="true" width="260" height="260" viewBox="0 0 260 260"><circle cx="130" cy="130" r="124" fill="none" stroke="rgba(255,255,255,.10)"/><circle cx="130" cy="130" r="96" fill="none" stroke="rgba(255,255,255,.10)"/><circle cx="130" cy="130" r="110" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="6" stroke-dasharray="1.5 9"/><circle cx="130" cy="130" r="68" fill="none" stroke="rgba(255,255,255,.08)"/></svg>' +
      '<span class="small" style="color:rgba(248,247,244,.78)">Bani disponibili' + (allF ? '' : ', ' + avail.length + ' fonduri') + '</span>' +
      '<span class="big m" style="font-size:48px">' + fmt(Math.round(now)) + '<span style="font-size:22px;font-weight:500;color:rgba(248,247,244,.72);letter-spacing:-.01em"> lei</span></span>' +
      '<span class="pill ' + (delta >= 0 ? 'up' : 'down') + ' m" style="margin-top:6px">' + sign(Math.round(delta)) + ' lei ' + spanTxt + '</span>' +
      areaChart(series, 300, 84) +
      '<div class="seg" style="grid-template-columns:repeat(3,1fr);margin-top:10px">' +
      [[30, '1 lună'], [90, '3 luni'], [365, '1 an']].map((r) => '<button class="' + (UI.range === r[0] ? 'on' : '') + '" data-a="range" data-v="' + r[0] + '">' + r[1] + '</button>').join('') + '</div>' +
      '</section>' : '') +
      (H.negWarn && neg.length ? '<div class="warn">' + neg.map((f) => '<b>' + f + '</b> e pe minus (' + lei(b[f], 2) + ')').join(', ') + '. Următoarele încasări merg întâi acolo (' + Math.round(S.settings.negPriority * 100) + '%).</div>' : '') +
      (H.mini ? '<div class="grid3">' +
      miniStat('În bancă', lei(Math.round(now - cashIn)), 'funds') +
      miniStat('Cash', lei(Math.round(cashIn)), 'funds') +
      miniStat('De cheltuit', lei(Math.round(b[EXP()] || 0)), 'funds') + '</div>' : '') +
      (H.month ? '<section class="card col" style="gap:12px"><div class="row between"><h2 style="font-size:16px">' + ymLabel(ym).split(' ')[0] + (MS() > 1 ? ' <span class="small muted" style="font-weight:400">' + spanLabel(ym) + '</span>' : '') + '</h2><button class="link" data-a="tab" data-t="stats">Statistici</button></div>' +
      '<div class="grid3"><div class="col"><span class="tiny muted">Venituri</span><span class="m" style="font-size:16px;font-weight:600">' + fmt(Math.round(cur.income)) + '</span></div>' +
      '<div class="col"><span class="tiny muted">Cheltuieli</span><span class="m red" style="font-size:16px;font-weight:600">' + fmt(Math.round(cur.expense)) + '</span></div>' +
      '<div class="col"><span class="tiny muted">Rămas</span><span class="m ' + (cur.saved >= 0 ? 'green' : 'red') + '" style="font-size:16px;font-weight:600">' + sign(Math.round(cur.saved)) + '</span></div></div>' +
      (cur.income + cur.expense > 0 ? '<div class="bar"><div style="flex:' + cur.expense + ' 1 0;background:var(--red)"></div><div style="flex:' + Math.max(0, cur.saved) + ' 1 0;background:var(--green)"></div></div>' : '') +
      (H.compare && pace.diffPct != null ? '<span class="small soft" style="line-height:1.45">Până azi ai cheltuit <b class="' + (pace.diffPct <= 0 ? 'green' : 'red') + '">' + (pace.diffPct <= 0 ? fmt(Math.abs(pace.diffPct * 100), 0) + '% mai puțin' : fmt(pace.diffPct * 100, 0) + '% mai mult') + '</b> decât în ' + MONTHS[+pace.prevYM.slice(5) - 1] + ' la aceeași zi (' + fmt(Math.round(pace.prev)) + ' lei).</span>' : '') +
      '</section>' : '') +
      (H.goal ? goalHome() : '') +
      (H.funds ? '<section class="col" style="gap:12px"><div class="row between"><h2>Fonduri</h2><button class="link" data-a="tab" data-t="funds">Toate</button></div>' +
      '<div class="hscroll">' + avail.map((f) => '<button class="fund-mini" data-a="tab" data-t="funds">' + ring(Math.max(0, b[f]) / tot, fcol(f)) +
      '<span class="col" style="gap:2px"><span class="small soft">' + f + '</span><span class="disp m ' + (b[f] < 0 ? 'red' : '') + '" style="font-size:18px;font-weight:600">' + fmt(Math.round(b[f])) + ' lei</span></span></button>').join('') + '</div></section>' : '') +
      (H.recent ? '<section class="col" style="gap:4px"><div class="row between"><h2>Recente</h2><button class="link" data-a="page" data-p="history">Tot istoricul</button></div>' +
      (recent.length ? '<div class="card tight">' + recent.map((t) => txRow(t, true)).join('') + '</div>'
        : '<div class="card empty">Nicio tranzacție încă. Apasă + ca să adaugi prima, sau importă datele din Setări.</div>') +
      '</section>' : '') + '</main>';
  }
  /* obiectivul cel mai aproape de atins */
  function goalHome() {
    const list = (S.goals || []).filter((g) => !g.done).map((g) => ({ g, p: FC.goalProgress(S, g) })).sort((a, b) => b.p.share - a.p.share);
    if (!list.length) return '';
    const { g, p } = list[0], c = fcol(g.fund), by = g.by ? new Date(g.by + 'T12:00') : null;
    return '<button class="card col" data-a="tab" data-t="funds" style="border:0;text-align:left;color:var(--txt);gap:10px">' +
      '<div class="row between" style="width:100%"><span class="row" style="gap:10px"><span class="badge" style="background:' + rgba(c, 0.16) + ';color:' + c + '">' + ic('flag', 20) + '</span><span class="col" style="gap:2px"><span class="tiny muted">Cel mai aproape</span><span style="font-weight:600">' + esc(g.name) + '</span></span></span>' +
      '<span class="disp m" style="font-size:20px;font-weight:600">' + Math.round(p.share * 100) + '%</span></div>' +
      '<div class="track"><div style="width:' + Math.round(p.share * 100) + '%;background:' + c + '"></div></div>' +
      '<span class="tiny muted m">' + fmt(Math.round(p.have)) + ' din ' + fmt(g.target) + ' lei' + (p.share >= 1 ? ', <span class="green">ai strâns tot</span>' : ', mai ai ' + fmt(Math.round(p.left)) + (by ? ', ' + fmt(Math.ceil(p.perMonth)) + ' lei pe lună până în ' + MONTHS[by.getMonth()] : '')) + (list.length > 1 ? '. Încă ' + (list.length - 1) + ' la Fonduri' : '') + '</span></button>';
  }
  function miniStat(label, value, go) {
    return '<button class="card col" data-a="tab" data-t="' + go + '" style="border:0;text-align:left;color:var(--txt);padding:14px;gap:4px"><span class="tiny muted">' + label + '</span><span class="disp m" style="font-size:16px;font-weight:600">' + value + '</span></button>';
  }

  /* ================= ECRAN: Fonduri ================= */
  function fundsScreen() {
    const b = FC.balances(S), total = FC.fundsTotal(b);
    const cash = FC.cashSummary(S);
    const [from, to] = mr(curYM());
    const ir = FC.investReport(S);
    const flows = {}; FUNDS().forEach((f) => { flows[f] = { in: 0, out: 0 }; });
    S.tx.forEach((t) => {
      if (t.date < from || t.date >= to || t.kind === 'adjust') return;
      Object.keys(t.alloc || {}).forEach((f) => { if (!flows[f]) return; const v = t.alloc[f]; if (v > 0) flows[f].in += v; else flows[f].out -= v; });
    });
    return '<main class="screen">' +
      '<header class="row between"><h1>Fonduri</h1><button class="icon-btn" data-a="page" data-p="settings" aria-label="Setări procente">' + ic('gear', 20) + '</button></header>' +
      '<div class="grid2">' +
      '<div class="card col" style="gap:3px;padding:14px 16px"><span class="tiny muted">Total fonduri</span><span class="disp m" style="font-size:22px;font-weight:600">' + fmt(Math.round(total)) + ' <span class="small muted">lei</span></span><span class="tiny soft">' + FUNDS().length + ' fonduri, cash inclus</span></div>' +
      '<button class="card col" data-a="invSeg" data-v="report" style="border:0;text-align:left;color:var(--txt);gap:3px;padding:14px 16px"><span class="tiny muted">Total investiții</span><span class="disp m" style="font-size:22px;font-weight:600">' + fmt(Math.round(ir.value)) + ' <span class="small muted">lei</span></span><span class="tiny m ' + (ir.pl >= 0 ? 'green' : 'red') + '">' + sign(Math.round(ir.pl)) + ' lei (' + sign(ir.plPct * 100, (n) => fmt(n, 1)) + '%)</span></button></div>' +
      '<div class="card row between" style="padding:12px 16px"><span class="small soft">Avere totală (fonduri + investiții)</span><span class="m" style="font-weight:600">' + lei(Math.round(total + ir.value)) + '</span></div>' +
      '<div style="position:relative;width:220px;height:220px;align-self:center">' + donut(FUNDS().map((f) => ({ v: b[f], c: fcol(f) })), 220) +
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px"><span class="small muted">Total</span><span class="big m" style="font-size:30px">' + fmt(Math.round(total)) + '</span><span class="small muted">lei</span></div></div>' +
      '<div class="grid2"><button class="btn primary" data-a="add" data-k="transfer">' + ic('swap', 18, 2) + 'Mută bani</button><button class="btn" data-a="add" data-k="income">' + ic('plus', 18, 2) + 'Adaugă venit</button></div>' +
      '<div class="col" style="gap:10px">' + FUNDS().map((f) => {
        const fl = flows[f], c = cash.perFund[f];
        return '<div class="card col" style="gap:10px;padding:14px 16px"><div class="row">' + fundBadge(f) +
          '<div class="col grow" style="flex:1;min-width:0;gap:2px"><span style="font-size:16px;font-weight:600">' + f + '</span><span class="small muted">' + (total > 0 ? Math.round(Math.max(0, b[f]) / total * 100) + '% din total' : '') + (c ? ', din care cash ' + fmt(c) + ' lei' : '') + '</span></div>' +
          '<span class="disp m ' + (b[f] < 0 ? 'red' : '') + '" style="font-size:19px;font-weight:600">' + fmt(b[f], 2) + '</span></div>' +
          '<div class="row small" style="gap:14px;padding-left:52px"><span class="green m">+' + fmt(Math.round(fl.in)) + ' intrat</span><span class="red m">−' + fmt(Math.round(fl.out)) + ' ieșit</span><span class="muted">luna asta</span></div></div>';
      }).join('') + '</div>' +
      goalsCard() + piggyCard(cash) + '</main>';
  }
  /* --- obiective: pentru ce strângi banii dintr-un fond --- */
  function goalsCard() {
    const list = S.goals || [];
    const open = list.filter((g) => !g.done), done = list.filter((g) => g.done);
    return '<section class="card col" style="gap:14px"><div class="row between"><div class="row" style="gap:10px"><span class="badge" style="background:color-mix(in srgb,var(--act) 22%,transparent);color:var(--actTxt)">' + ic('flag', 20) + '</span><div class="col" style="gap:2px"><h2 style="font-size:17px">Obiective</h2><span class="small muted">Pentru ce strângi bani</span></div></div>' +
      '<button class="icon-btn" data-a="sheet" data-s="goalEdit" aria-label="Obiectiv nou" style="background:var(--surf2)">' + ic('plus', 18, 2) + '</button></div>' +
      (open.length ? open.map((g) => {
        const p = FC.goalProgress(S, g), c = fcol(g.fund);
        const by = g.by ? new Date(g.by + 'T12:00') : null;
        return '<button class="col" data-a="sheet" data-s="goalEdit" data-id="' + g.id + '" style="background:none;border:0;padding:0;color:inherit;text-align:left;gap:6px">' +
          '<div class="row between" style="width:100%"><span style="font-weight:600">' + esc(g.name) + '</span><span class="small m soft">' + fmt(Math.round(p.have)) + ' / ' + fmt(g.target) + ' lei</span></div>' +
          '<div class="track"><div style="width:' + Math.round(p.share * 100) + '%;background:' + c + '"></div></div>' +
          '<span class="tiny muted">' + (p.share >= 1 ? '<span class="green">Ai strâns tot în ' + esc(g.fund) + '.</span> Apasă ca să-l marchezi atins.'
            : 'Din ' + esc(g.fund) + ', mai ai ' + fmt(Math.round(p.left)) + ' lei' + (by ? ', adică ' + fmt(Math.ceil(p.perMonth)) + ' lei pe lună până în ' + MONTHS[by.getMonth()] + ' ' + by.getFullYear() : '')) + '</span></button>';
      }).join('') : '<span class="small muted" style="line-height:1.5">De exemplu „Dronă nouă, 4.000 lei din Achiziție, până în iunie”. Aplicația îți arată cât ai strâns și cât trebuie să pui pe lună.</span>') +
      (done.length ? '<span class="tiny muted">Atinse: ' + done.map((g) => esc(g.name)).join(', ') + '</span>' : '') + '</section>';
  }
  function piggyCard(cash) {
    return '<section class="card col" style="gap:14px"><div class="row between"><div class="row" style="gap:10px"><span class="badge" style="background:rgba(227,179,65,.16);color:var(--amber)">' + ic('piggy', 20) + '</span><div class="col" style="gap:2px"><h2 style="font-size:17px">Pușculița</h2><span class="small muted">Bancnote și euro puși deoparte</span></div></div>' +
      '<span class="disp m" style="font-size:19px;font-weight:600">' + fmt(cash.total) + ' lei</span></div>' +
      cash.items.map((i) => '<div class="row between"><div class="col" style="gap:2px"><span style="font-weight:500">' + i.label + '</span><span class="small muted m">' + qty(i.count) + (i.id === 'eur' ? ' €' : ' buc.') + ' = ' + fmt(i.lei) + ' lei</span></div>' +
        '<div class="row" style="gap:8px"><button class="icon-btn" data-a="cash" data-d="' + i.id + '" data-n="-1" aria-label="Scoate ' + i.label + '" style="background:var(--surf2)">−</button><button class="icon-btn" data-a="cash" data-d="' + i.id + '" data-n="1" aria-label="Adaugă ' + i.label + '" style="background:var(--surf2)">+</button></div></div>').join('') +
      (Object.keys(cash.perFund).length ? '<div class="small soft" style="line-height:1.5">Stă în: ' + Object.keys(cash.perFund).map((f) => f + ' ' + fmt(cash.perFund[f]) + ' lei').join(', ') + '</div>' : '') +
      (cash.uncovered ? '<div class="warn">' + fmt(cash.uncovered) + ' lei din pușculiță nu mai încap în fonduri. Fondurile au mai puțini bani decât ai pus deoparte fizic.</div>' : '') +
      '<div class="grid2"><button class="btn" data-a="sheet" data-s="cashAdd">Adaugă mai multe</button><button class="btn" data-a="sheet" data-s="eurExchange">Schimbă euro</button></div></section>';
  }

  /* ================= ECRAN: Investiții ================= */
  function investScreen() {
    const ir = FC.investReport(S);
    const seg = '<div class="seg" style="grid-template-columns:repeat(4,1fr)">' +
      [['report', 'Raport'], ['crypto', 'Crypto'], ['earn', 'Earn'], ['savings', 'Economii']].map((s) => '<button class="' + (UI.invSeg === s[0] ? 'on' : '') + '" data-a="invSeg" data-v="' + s[0] + '">' + s[1] + '</button>').join('') + '</div>';
    const head = '<section class="card col" style="gap:4px;border-radius:28px;padding:18px 20px;background:linear-gradient(160deg,color-mix(in srgb,var(--violet) 55%,var(--surf)),var(--surf) 70%)">' +
      '<span class="small muted">Total investiții</span><span class="big m" style="font-size:40px">' + fmt(Math.round(ir.value)) + '<span style="font-size:20px;color:var(--muted)"> lei</span></span>' +
      '<span class="row" style="gap:8px;flex-wrap:wrap"><span class="pill ' + (ir.pl >= 0 ? 'up' : 'down') + ' m">' + sign(Math.round(ir.pl)) + ' lei, ' + sign(ir.plPct * 100, (n) => fmt(n, 1)) + '%</span><span class="small soft m">din ' + lei(Math.round(ir.invested)) + ' băgați</span></span></section>';
    let body = '';
    if (UI.invSeg === 'report') body = reportBody(ir);
    else if (UI.invSeg === 'crypto') body = cryptoBody();
    else if (UI.invSeg === 'earn') body = earnBody();
    else body = savingsBody();
    return '<main class="screen"><header class="row between"><h1>Investiții</h1>' +
      (UI.invSeg !== 'savings' ? '<button class="icon-btn" data-a="refresh" aria-label="Actualizează prețurile">' + ic('refresh', 20) + '</button>' : '') + '</header>' + head + seg + body + '</main>';
  }
  /* --- raport: cât ai băgat, cât valorează, pe plus sau pe minus --- */
  function reportBody(ir) {
    loadHist(false);
    const first = [S.crypto.slice().sort(FC.byDate)[0], S.savings.slice().sort(FC.byDate)[0]].filter(Boolean).map((e) => e.date).sort()[0];
    const allDays = first ? Math.min(1000, Math.ceil((Date.now() - new Date(first).getTime()) / 864e5) + 1) : 30;
    const days = UI.repRange === 'all' ? allDays : UI.repRange;
    const ser = FC.portfolioSeries(S, days);
    const cv = ir.crypto.detail;
    const block = (title, inv, val, pl, plPct, extra) => '<div class="col" style="gap:6px;background:var(--bg);border-radius:18px;padding:12px 14px">' +
      '<div class="row between"><span style="font-weight:600">' + title + '</span><span class="m ' + (pl >= 0 ? 'green' : 'red') + '" style="font-weight:600">' + sign(Math.round(pl)) + ' lei <span class="small">(' + sign(plPct * 100, (n) => fmt(n, 1)) + '%)</span></span></div>' +
      kv('Băgat', lei(Math.round(inv))) + kv('Valorează acum', lei(Math.round(val))) + (extra || '') + '</div>';
    const coins = cv.list.filter((c) => c.plUsd != null).slice().sort((a, b) => b.plUsd - a.plUsd);
    return '<section class="card col" style="gap:10px"><div class="row between"><h2 style="font-size:17px">În timp</h2><div class="row tiny soft" style="gap:10px"><span class="row" style="gap:5px"><span style="width:12px;height:3px;border-radius:2px;background:var(--actTxt)"></span>valoare</span><span class="row" style="gap:5px"><span style="width:12px;border-top:2px dashed var(--muted)"></span>băgat</span></div></div>' +
      dualChart(ser) +
      '<div class="seg" style="grid-template-columns:repeat(4,1fr)">' + [[30, '1 lună'], [90, '3 luni'], [365, '1 an'], ['all', 'Tot']].map((r) => '<button class="' + (UI.repRange === r[0] ? 'on' : '') + '" data-a="repRange" data-v="' + r[0] + '">' + r[1] + '</button>').join('') + '</div>' +
      '<span class="tiny muted" style="line-height:1.5">' + (S.hist && S.hist._ts ? 'Valoarea din trecut e calculată cu prețul de închidere al fiecărei zile și cursul dolarului de azi.' : 'Istoricul prețurilor se încarcă de pe internet; până atunci zilele trecute sunt socotite la cost.') + '</span></section>' +
      '<section class="card col" style="gap:10px"><h2 style="font-size:17px">Pe fiecare investiție</h2>' +
      block('Crypto (' + esc(EXCH()) + ')', ir.crypto.invested, ir.crypto.value, ir.crypto.pl, ir.crypto.plPct, kv('Din care Earn', 'inclus în monede') + kv('Fee-uri plătite', lei(ir.fees, 2))) +
      block(esc(S.settings.savings.name), ir.savings.principal, ir.savings.balance, ir.savings.interest, ir.savings.plPct, kv('Dobândă netă primită', lei(ir.savings.interest, 2))) + '</section>' +
      (coins.length ? '<section class="card col" style="gap:8px"><div class="row between"><h2 style="font-size:17px">Monede, de la cea mai bună</h2><span class="small muted">în $</span></div>' +
        coins.map((c) => '<div class="row between"><span class="row" style="gap:8px"><b>' + esc(c.coin) + '</b><span class="small muted m">' + usd(c.costUsd) + ' → ' + usd(c.valueUsd) + '</span></span><span class="m ' + (c.plUsd >= 0 ? 'green' : 'red') + '" style="font-weight:600">' + sign(c.plUsd, (n) => usd(n)) + ' <span class="small">' + sign(c.plPct * 100, (n) => fmt(n, 1)) + '%</span></span></div>').join('') + '</section>' : '');
  }
  function dualChart(ser) {
    if (ser.length < 2) return '<div class="small muted" style="height:120px;display:flex;align-items:center;justify-content:center;text-align:center">Graficul apare după ce ai cel puțin două zile de date.</div>';
    const W = 320, Hh = 150, pT = 12, pB = 18;
    const vals = ser.map((p) => p.value).concat(ser.map((p) => p.invested));
    let mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    if (mx - mn < 1) { mx += 1; mn -= 1; }
    const X = (i) => 2 + i / (ser.length - 1) * (W - 4);
    const Y = (v) => pT + (1 - (v - mn) / (mx - mn)) * (Hh - pT - pB);
    const path = (k) => ser.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p[k]).toFixed(1)).join(' ');
    const last = ser[ser.length - 1], up = last.value >= last.invested;
    const dd = (key) => (+key.slice(8)) + ' ' + MSHORT[+key.slice(5, 7) - 1];
    return '<svg role="img" aria-label="Valoarea investițiilor față de banii băgați" width="100%" viewBox="0 0 ' + W + ' ' + Hh + '" style="display:block">' +
      '<path d="' + path('value') + ' L' + X(ser.length - 1).toFixed(1) + ' ' + (Hh - pB) + ' L' + X(0).toFixed(1) + ' ' + (Hh - pB) + ' Z" style="fill:color-mix(in srgb,var(--actTxt) 14%,transparent)"/>' +
      '<path d="' + path('invested') + '" fill="none" stroke="#9EA3B5" stroke-width="1.6" stroke-dasharray="5 4" stroke-linejoin="round"/>' +
      '<path d="' + path('value') + '" fill="none" style="stroke:var(--actTxt)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + X(ser.length - 1).toFixed(1) + '" cy="' + Y(last.value).toFixed(1) + '" r="4" fill="' + (up ? '#6FCF97' : '#FF6961') + '"/>' +
      '<text x="2" y="' + (Hh - 4) + '" fill="#9EA3B5" font-size="10">' + dd(ser[0].d) + '</text><text x="' + (W - 2) + '" y="' + (Hh - 4) + '" fill="#9EA3B5" font-size="10" text-anchor="end">azi</text>' +
      '<text x="' + (W - 2) + '" y="10" fill="#9EA3B5" font-size="10" text-anchor="end">max ' + fmt(Math.round(mx)) + ' lei</text></svg>';
  }
  function cryptoBody() {
    const cv = FC.cryptoValue(S);
    const fr = FC.feeReport(S);
    const upd = isLive() ? '● Prețuri live' : S.fx.ts ? 'Prețuri ' + new Date(Math.max(...Object.values(S.prices).map((p) => p.ts || 0), 0) || S.fx.ts).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : 'Prețuri neîncărcate';
    return '<section class="card col" style="gap:14px;border-radius:28px;padding:20px">' +
      '<div class="col" style="gap:2px"><span class="small muted">Valoare totală în ' + esc(EXCH()) + '</span><span class="big m" style="font-size:42px">' + usd(cv.valueUsd) + '</span><span class="small soft m">≈ ' + lei(Math.round(cv.valueLei)) + ', curs ' + fmt(cv.rate, 3) + '</span></div>' +
      '<div class="grid2"><div class="col" style="background:var(--bg);border-radius:16px;padding:10px 12px;gap:2px"><span class="tiny muted">Câștig real în lei</span><span class="m ' + (cv.realPlLei >= 0 ? 'green' : 'red') + '" style="font-size:17px;font-weight:600">' + sign(Math.round(cv.realPlLei)) + ' lei</span><span class="tiny soft">față de ' + fmt(Math.round(cv.netInvestedLei)) + ' lei băgați</span></div>' +
      '<div class="col" style="background:var(--bg);border-radius:16px;padding:10px 12px;gap:2px"><span class="tiny muted">Profit pe monede</span><span class="m ' + (cv.unrealizedUsd >= 0 ? 'green' : 'red') + '" style="font-size:17px;font-weight:600">' + sign(cv.unrealizedUsd, (n) => usd(n)) + '</span><span class="tiny soft">încasat: ' + usd(cv.realizedUsd) + '</span></div></div>' +
      (cv.stableUsd > 0.009 ? '<div class="kv"><span>Dolari liberi (USD/USDC)</span><span class="m">' + usd(cv.stableUsd) + '</span></div>' : '') +
      (cv.list.length ? '<div class="bar" style="height:10px">' + cv.list.map((c, i) => '<div style="flex:' + (c.valueUsd || 0) + ' 1 0;background:' + coinColor(i) + '"></div>').join('') + '</div>' : '') +
      '<div class="grid2"><button class="btn primary" data-a="sheet" data-s="deposit">Depunere</button><button class="btn" data-a="sheet" data-s="trade" data-side="buy">Cumpără</button>' +
      '<button class="btn" data-a="sheet" data-s="trade" data-side="sell">Vinde</button><button class="btn" data-a="sheet" data-s="withdraw">Retrage în lei</button></div>' +
      '<span class="tiny muted">' + upd + (cv.missing.length ? '. Fără preț live: ' + cv.missing.join(', ') + ' (socotite la cât te-au costat)' : '') + '</span></section>' +
      '<section class="col" style="gap:8px"><div class="row between"><h2>Monedele tale</h2><span class="small muted">24h</span></div>' +
      (cv.list.length ? '<div class="card tight">' + cv.list.map((c, i) => coinRow(c, i)).join('') + '</div>' : '<div class="card empty">Nu ai monede încă.</div>') + '</section>' +
      '<section class="card col" style="gap:10px"><div class="row between"><h2 style="font-size:17px">Fee-uri plătite</h2><span class="disp m" style="font-size:18px;font-weight:600">' + lei(fr.total, 2) + '</span></div>' +
      (fr.total > 0 ? Object.keys(fr.byType).map((k) => '<div class="kv"><span>' + k + '</span><span class="m">' + lei(fr.byType[k], 2) + '</span></div>').join('') +
        '<div class="small soft">Asta e ' + fmt(fr.pctOfInvested * 100, 2) + '% din banii băgați în crypto.</div>' : '<div class="small muted">Apar aici după prima depunere sau tranzacție înregistrată în aplicație.</div>') + '</section>';
  }
  const COIN_COLORS = ['#F5883F', '#8F7CF0', '#4FD1C5', '#E3B341', '#4B9CD3', '#C9CCD8', '#FF6961', '#6FCF97', '#B768A2'];
  const coinColor = (i) => COIN_COLORS[i % COIN_COLORS.length];
  function coinRow(c, i) {
    const col = coinColor(i), open = UI.openCoin === c.coin;
    const up = c.price != null && c.price >= c.avgUsd;
    return '<div><button class="list-row" data-a="coin" data-c="' + c.coin + '" aria-expanded="' + open + '">' +
      '<span class="badge" style="background:' + rgba(col, 0.16) + ';color:' + col + '">' + esc(c.coin.slice(0, 4)) + '</span>' +
      '<span class="grow"><span class="t">' + esc(c.coin) + (c.ch != null ? ' <span class="tiny ' + (c.ch >= 0 ? 'green' : 'red') + '">' + sign(c.ch, (n) => fmt(n, 1)) + '% 24h</span>' : '') + '</span>' +
      '<span class="s m">medie ' + usd(c.avgUsd) + ' <span class="' + (c.price == null ? '' : up ? 'green' : 'red') + '">→ acum ' + (c.price != null ? usd(c.price) : '—') + '</span></span></span>' +
      '<span class="col" style="align-items:flex-end;gap:2px"><span class="v m">' + (c.price != null ? usd(c.valueUsd) : '—') + '</span>' +
      (c.plPct != null ? '<span class="small m ' + (c.plPct >= 0 ? 'green' : 'red') + '" style="font-weight:600">' + sign(c.plPct * 100, (n) => fmt(n, 1)) + '%</span>' : '') + '</span></button>' +
      (open ? '<div style="margin:0 14px 12px;background:var(--bg);border-radius:16px;padding:12px" class="col">' + coinChart(c) +
        kv('Cantitate', qty(c.qty) + (c.earnQty ? ' (din Earn ' + qty(c.earnQty) + ')' : '')) +
        kv('Preț mediu (cu fee-uri)', usd(c.avgUsd)) + kv('Preț mediu în lei', lei(c.avgLei, 2)) + kv('Preț acum', c.price != null ? usd(c.price) : '—') +
        kv('Valoare acum', c.price != null ? usd(c.valueUsd) + ' ≈ ' + lei(Math.round(c.valueUsd * (S.fx.usdRon || 4.8))) : '—') +
        kv('Te-a costat', lei(Math.round(c.costLei))) +
        kv('Profit', c.plUsd != null ? sign(c.plUsd, (n) => usd(n)) : '—') + '</div>' : '') + '</div>';
  }
  /* --- grafic istoric preț (Binance), cu linia prețului tău mediu și punctele unde ai cumpărat --- */
  const KL = {};
  const KRANGES = [['1Z', '1h', 24], ['1S', '4h', 42], ['1L', '1d', 30], ['3L', '1d', 90], ['1A', '1w', 52]];
  function coinChart(c) {
    const r = KRANGES.find((x) => x[0] === UI.chartRange) || KRANGES[2];
    const key = c.coin + r[0], data = KL[key];
    if (!data || Date.now() - data.ts > 300000) loadKlines(c.coin, r);
    const tabs = '<div class="seg" style="grid-template-columns:repeat(5,1fr);margin-bottom:10px">' + KRANGES.map((x) => '<button class="' + (x[0] === r[0] ? 'on' : '') + '" data-a="chartRange" data-v="' + x[0] + '">' + x[0] + '</button>').join('') + '</div>';
    if (!data || !data.pts.length) return tabs + '<div class="small muted" style="height:150px;display:flex;align-items:center;justify-content:center;text-align:center">' + (data && data.err ? 'Graficul are nevoie de internet.' : 'Se încarcă graficul…') + '</div>';
    const pts = data.pts.slice();
    if (c.price != null) pts.push([Date.now(), c.price]);
    const W = 320, Hh = 150, padL = 4, padR = 4, padT = 14, padB = 18;
    const vals = pts.map((p) => p[1]).concat(c.avgUsd > 0 ? [c.avgUsd] : []);
    let mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    if (mx - mn < mx * 0.002) { mx *= 1.01; mn *= 0.99; }
    const t0 = pts[0][0], t1 = pts[pts.length - 1][0];
    const X = (t) => padL + (t - t0) / ((t1 - t0) || 1) * (W - padL - padR);
    const Y = (v) => padT + (1 - (v - mn) / (mx - mn)) * (Hh - padT - padB);
    let d = ''; pts.forEach((p, i) => { d += (i ? ' L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); });
    const upC = pts[pts.length - 1][1] >= pts[0][1] ? '#6FCF97' : '#FF6961';
    const buys = S.crypto.filter((e) => (e.kind === 'trade' && e.coin === c.coin) || (e.kind === 'open' && e.coin === c.coin && e.qty > 0))
      .map((e) => ({ t: new Date(e.date).getTime(), p: e.usd / e.qty, side: e.side || 'buy' })).filter((b) => b.t >= t0 && b.t <= t1);
    const avgY = Y(c.avgUsd);
    const fmtD = (t) => { const x = new Date(t); return r[1] === '1h' ? FC.pad(x.getHours()) + ':00' : x.getDate() + ' ' + MSHORT[x.getMonth()]; };
    const change = (pts[pts.length - 1][1] / pts[0][1] - 1) * 100;
    return tabs + '<div class="row between small" style="margin-bottom:4px"><span class="muted">' + r[0] + ': <span class="' + (change >= 0 ? 'green' : 'red') + '">' + sign(change, (n) => fmt(n, 1)) + '%</span></span><span class="muted">max ' + usd(mx) + '</span></div>' +
      '<svg role="img" aria-label="Prețul ' + esc(c.coin) + ' în ultima perioadă, cu prețul tău mediu" width="100%" viewBox="0 0 ' + W + ' ' + Hh + '" style="display:block">' +
      '<path d="' + d + ' L' + X(t1).toFixed(1) + ' ' + (Hh - padB) + ' L' + X(t0).toFixed(1) + ' ' + (Hh - padB) + ' Z" fill="' + rgba(upC, 0.12) + '"/>' +
      '<path d="' + d + '" fill="none" stroke="' + upC + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      (c.avgUsd > 0 ? '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + avgY.toFixed(1) + '" y2="' + avgY.toFixed(1) + '" style="stroke:var(--actTxt)" stroke-width="1.4" stroke-dasharray="5 4"/>' +
        '<text x="' + (W - padR) + '" y="' + (avgY - 5).toFixed(1) + '" style="fill:var(--actTxt)" font-size="10" text-anchor="end">medie ' + esc(usd(c.avgUsd)) + '</text>' : '') +
      buys.map((b) => '<circle cx="' + X(b.t).toFixed(1) + '" cy="' + Y(b.p).toFixed(1) + '" r="4" fill="' + (b.side === 'sell' ? '#FF6961' : '#F8F7F4') + '" stroke="#191C27" stroke-width="1.5"/>').join('') +
      '<text x="' + padL + '" y="' + (Hh - 4) + '" fill="#9EA3B5" font-size="10">' + fmtD(t0) + '</text><text x="' + (W - padR) + '" y="' + (Hh - 4) + '" fill="#9EA3B5" font-size="10" text-anchor="end">acum</text></svg>' +
      '<div class="row tiny muted" style="gap:12px;margin:6px 0 8px"><span class="row" style="gap:5px"><span style="width:14px;border-top:2px dashed var(--actTxt)"></span>prețul tău mediu</span>' + (buys.length ? '<span class="row" style="gap:5px"><span style="width:8px;height:8px;border-radius:50%;background:#F8F7F4"></span>cumpărări</span>' : '') + '</div>';
  }
  async function loadKlines(coin, r) {
    const key = coin + r[0];
    if (KL[key] && KL[key].loading) return;
    KL[key] = Object.assign(KL[key] || { pts: [] }, { loading: true });
    try {
      const rows = await fetchJSON('https://data-api.binance.vision/api/v3/klines?symbol=' + coin + 'USDT&interval=' + r[1] + '&limit=' + r[2], 9000);
      KL[key] = { ts: Date.now(), pts: rows.map((k) => [k[0], parseFloat(k[4])]) };
    } catch (e) { KL[key] = { ts: Date.now() - 240000, pts: KL[key].pts || [], err: true }; }
    if (UI.openCoin === coin && !UI.sheet) render();
  }
  /* istoric zilnic de prețuri pentru raport (o dată la 6 ore, păstrat pe telefon ca să meargă și offline) */
  let histLoading = false;
  async function loadHist(force) {
    if (histLoading) return;
    const h = S.hist || (S.hist = {});
    if (!force && h._ts && Date.now() - h._ts < 6 * 3600e3) return;
    if (!force && h._fail && Date.now() - h._fail < 120000) return;
    const coins = FC.coinsEver(S);
    const first = S.crypto.slice().sort(FC.byDate)[0];
    if (!coins.length || !first) return;
    const days = Math.min(1000, Math.max(30, Math.ceil((Date.now() - new Date(first.date).getTime()) / 864e5) + 2));
    histLoading = true;
    let ok = 0;
    await Promise.all(coins.map(async (c) => {
      try {
        const rows = await fetchJSON('https://data-api.binance.vision/api/v3/klines?symbol=' + c + 'USDT&interval=1d&limit=' + days, 12000);
        const m = {}; rows.forEach((k) => { m[FC.dayOf(FC.localISO(new Date(k[0])))] = parseFloat(k[4]); });
        h[c] = m; ok++;
      } catch (e) { /* monedă fără pereche USDT sau fără internet */ }
    }));
    histLoading = false;
    if (ok) { h._ts = Date.now(); delete h._fail; save(); } else h._fail = Date.now();
    if (UI.tab === 'invest' && UI.invSeg === 'report' && !UI.page && !UI.sheet) render();
  }
  function kv(k, v) { return '<div class="kv"><span>' + k + '</span><span class="m">' + v + '</span></div>'; }
  function earnBody() {
    const list = FC.earnSummary(S);
    const sum = (k) => list.reduce((x, e) => x + (e[k] || 0), 0);
    const totUsd = sum('valueUsd'), totLei = sum('valueLei'), yearUsd = sum('yearUsd'), rewUsd = sum('rewardUsd'), todayUsd = sum('todayUsd');
    const tile = (label, val, sub) => '<div class="col" style="background:var(--bg);border-radius:16px;padding:10px 12px;gap:2px"><span class="tiny muted">' + label + '</span><span class="m green" style="font-size:17px;font-weight:600">' + val + '</span>' + (sub ? '<span class="tiny soft m">' + sub + '</span>' : '') + '</div>';
    return '<section class="card col" style="gap:12px;border-radius:28px;padding:20px"><span class="small muted">Valoare în Earn, cu recompensele</span><span class="big m" style="font-size:40px">' + usd(totUsd) + '</span><span class="small soft m">≈ ' + lei(Math.round(totLei)) + '</span>' +
      '<div class="grid2">' + tile('Câștigat până acum', '+' + usd(rewUsd), '≈ ' + lei(rewUsd * (S.fx.usdRon || 4.8), 2)) + tile('Primești azi', '+' + usd(todayUsd), 'într-un an ≈ +' + usd(yearUsd)) + '</div>' +
      '<div class="grid2"><button class="btn primary" data-a="sheet" data-s="earnAdd">Pun în Earn</button><button class="btn" data-a="sheet" data-s="reward">Altă recompensă</button></div>' +
      '<span class="tiny muted" style="line-height:1.5">Recompensa vine în fiecare zi. La Flexible se adaugă singură la suma din Earn și produce și ea, iar valoarea intră automat în totalul investițiilor. Dacă suma din ' + esc(EXCH()) + ' e alta, apasă pe poziție și scrie cifra reală.</span></section>' +
      (list.length ? '<div class="card tight">' + list.map((e) => '<button class="list-row" data-a="sheet" data-s="earnFix" data-id="' + e.id + '"><span class="badge" style="background:color-mix(in srgb,var(--act) 22%,transparent);color:var(--actTxt)">' + esc(e.coin.slice(0, 4)) + '</span>' +
        '<span class="grow"><span class="t">' + qty(+e.qtyNow.toFixed(8)) + ' ' + esc(e.coin) + '</span><span class="s">' + (e.type === 'locked' ? 'Locked' + (e.daysLeft != null ? ', mai sunt ' + e.daysLeft + ' zile' : '') : 'Flexible') + ', APR ' + fmt(e.apr * 100, 2) + '%, azi +' + qty(+e.todayQty.toFixed(8)) + '</span>' +
        '<span class="s m">' + (e.valueUsd != null ? usd(e.valueUsd) + ' ≈ ' + lei(Math.round(e.valueLei)) : 'fără preț acum') + '</span></span>' +
        '<span class="col" style="align-items:flex-end;gap:2px"><span class="v green m">+' + qty(+e.estReward.toFixed(8)) + '</span><span class="tiny muted m">' + (e.rewardUsd != null ? '≈ ' + usd(e.rewardUsd) + ', ' : '') + e.days + ' zile</span></span></button>').join('') + '</div>'
        : '<div class="card empty">Nimic în Earn încă.</div>');
  }
  function savingsBody() {
    const s = S.settings.savings, bal = FC.savingsBalance(S);
    const proj = (yrs) => bal * Math.pow(1 + s.apr * (1 - s.tax) / 12, yrs * 12);
    const nx = FC.savingsNext(S);
    const nd = new Date(nx.date);
    const ints = S.savings.filter((e) => e.kind === 'interest');
    const yearAgo = FC.localISO(new Date(Date.now() - 365 * 864e5));
    const last12 = ints.filter((e) => e.date >= yearAgo).reduce((x, e) => x + e.amount, 0);
    const pendingEst = ints.filter((e) => e.est).length;
    const ev = S.savings.slice().sort(FC.byDate).reverse().slice(0, 30);
    const label = (e) => e.kind === 'interest' ? 'Dobândă ' + (e.forYM ? MONTHS[+e.forYM.slice(5) - 1] : '') : { deposit: 'Depunere', withdraw: 'Retragere', set: 'Sold corectat' }[e.kind];
    return '<section class="card col" style="gap:12px;border-radius:28px;padding:20px"><span class="small muted">' + esc(s.name) + '</span><span class="big m" style="font-size:42px">' + fmt(bal, 2) + '<span style="font-size:20px;color:var(--muted)"> lei</span></span>' +
      '<span class="small soft" style="line-height:1.5">Dobândă ' + fmt(s.apr * 100, 2) + '% pe an, primită lunar pe ' + (s.payDay || 1) + ', cu impozitul de ' + Math.round(s.tax * 100) + '% deja reținut de bancă.</span>' +
      '<div class="col" style="background:var(--bg);border-radius:16px;padding:12px 14px;gap:4px"><span class="tiny muted">Următoarea dobândă, pentru ' + MONTHS[+nx.forYM.slice(5) - 1] + '</span>' +
      '<span class="row between"><span class="m green" style="font-size:20px;font-weight:600">≈ +' + fmt(nx.net, 2) + ' lei</span><span class="small soft">pe ' + nd.getDate() + ' ' + MONTHS[nd.getMonth()] + '</span></span>' +
      '<span class="tiny muted m">brut ' + fmt(nx.gross, 2) + ' lei, impozit ' + fmt(nx.gross - nx.net, 2) + ' lei</span></div>' +
      '<div class="grid3"><div class="col"><span class="tiny muted">Primit în 12 luni</span><span class="m green" style="font-weight:600">+' + fmt(last12, 2) + '</span></div><div class="col"><span class="tiny muted">Peste 1 an</span><span class="m" style="font-weight:600">' + fmt(Math.round(proj(1))) + '</span></div><div class="col"><span class="tiny muted">Peste 5 ani</span><span class="m" style="font-weight:600">' + fmt(Math.round(proj(5))) + '</span></div></div>' +
      '<div class="grid3"><button class="btn primary" data-a="sheet" data-s="savDep">Depun</button><button class="btn" data-a="sheet" data-s="savWd">Retrag</button><button class="btn" data-a="sheet" data-s="savSet">Corectez</button></div>' +
      '<span class="tiny muted" style="line-height:1.5">Dobânda se calculează pe soldul din fiecare zi și apare singură în ziua plății, ca estimare.' + (pendingEst ? ' Când vezi suma reală în aplicația băncii, apasă pe ea în listă și scrie cifra.' : '') + ' Proiecția nu include depunerile viitoare.</span></section>' +
      (ev.length ? '<div class="card tight">' + ev.map((e) => {
        const isInt = e.kind === 'interest';
        return '<div class="list-row"' + (isInt ? ' data-a="sheet" data-s="savInt" data-id="' + e.id + '" role="button" tabindex="0" style="cursor:pointer"' : '') + '><span class="badge" style="background:rgba(75,156,211,.16);color:#6FB3E2">' + ic(isInt ? 'plus' : e.kind === 'withdraw' ? 'out' : e.kind === 'set' ? 'funds' : 'inc', 18) + '</span>' +
          '<span class="grow"><span class="t">' + label(e) + '</span><span class="s">' + dayLabel(e.date) + (isInt ? (e.est ? ', <span style="color:var(--amber)">estimată, apasă ca să pui suma reală</span>' : ', primită') : e.note ? ', ' + esc(e.note) : '') + '</span></span>' +
          '<span class="v m ' + (e.kind === 'withdraw' ? '' : 'green') + '">' + (e.kind === 'withdraw' ? '−' : e.kind === 'set' ? '' : '+') + fmt(e.amount, 2) + '</span>' +
          (!isInt ? '<button class="icon-btn" data-a="savDel" data-id="' + e.id + '" aria-label="Șterge" style="width:36px;height:36px">' + ic('trash', 16) + '</button>' : '') + '</div>';
      }).join('') + '</div>'
        : '<div class="card empty">Pune soldul actual cu „Corectez”, apoi adaugă depunerile pe măsură ce le faci.</div>');
  }

  /* ================= ECRAN: Statistici ================= */
  function statsScreen() {
    const year = UI.statsYM.slice(0, 4);
    const isYear = UI.statsMode === 'an';
    const range = isYear ? [year + '-01-01T00:00', (+year + 1) + '-01-01T00:00'] : mr(UI.statsYM);
    const st = FC.periodStats(S, range[0], range[1], { cat: UI.statsCat });
    const all = FC.periodStats(S, range[0], range[1]);
    const label = isYear ? year : ymLabel(UI.statsYM) + (MS() > 1 ? '<span class="small muted" style="display:block;text-align:center;font-weight:400">' + spanLabel(UI.statsYM) + '</span>' : '');
    const months = isYear ? Array.from({ length: 12 }, (_, i) => year + '-' + FC.pad(i + 1)) : FC.monthsBack(UI.statsYM, 6);
    const mdata = months.map((m) => { const p = FC.periodStats(S, ...mr(m), { cat: UI.statsCat }); return { m, i: p.income, e: p.expense }; });
    const max = Math.max(1, ...mdata.map((x) => Math.max(x.i, x.e)));
    const fr = FC.feeReport(S);
    const feeKeys = Object.keys(fr.byMonth).sort().slice(-6);
    return '<main class="screen"><header class="row between"><h1>Statistici</h1><div class="seg" style="grid-template-columns:1fr 1fr">' +
      [['luna', 'Lună'], ['an', 'An']].map((x) => '<button class="' + (UI.statsMode === x[0] ? 'on' : '') + '" data-a="statsMode" data-v="' + x[0] + '" style="min-width:56px">' + x[1] + '</button>').join('') + '</div></header>' +
      '<div class="row between"><button class="icon-btn" data-a="statsNav" data-d="-1" aria-label="Perioada anterioară">' + ic('left', 20) + '</button><span class="disp" style="font-size:18px;font-weight:600">' + label + '</span><button class="icon-btn" data-a="statsNav" data-d="1" aria-label="Perioada următoare">' + ic('right', 20) + '</button></div>' +
      (UI.statsCat ? '<button class="chip on" data-a="statsCat" data-c="">' + esc(UI.statsCat) + ' ' + ic('close', 14, 2) + '</button>' : '') +
      '<div class="grid2">' +
      statTile('Venituri', all.income, 'green') + statTile(UI.statsCat ? 'Cheltuit pe ' + UI.statsCat : 'Cheltuieli', st.expense, 'red') + '</div>' +
      (!UI.statsCat ? '<div class="card col" style="gap:6px">' + kv('Rămas după cheltuieli', '<span class="' + (all.saved >= 0 ? 'green' : 'red') + '">' + sign(Math.round(all.saved)) + ' lei</span>') +
        kv('Din fondul ' + EXP(), lei(Math.round(all.fromCheltuieli))) + kv('Din alte fonduri', lei(Math.round(all.fromFunds))) + kv('Investit (crypto, economii)', lei(Math.round(all.invested))) +
        Object.keys(all.incTypes).map((k) => kv(k, '<span class="green">+' + fmt(Math.round(all.incTypes[k])) + '</span>')).join('') + '</div>' : '') +
      '<section class="card col" style="gap:14px"><div class="row between"><h2 style="font-size:17px">' + (isYear ? 'Pe luni' : 'Ultimele 6 luni') + '</h2><div class="row tiny soft" style="gap:10px"><span class="row" style="gap:5px"><span style="width:8px;height:8px;border-radius:2px;background:var(--green)"></span>Venit</span><span class="row" style="gap:5px"><span style="width:8px;height:8px;border-radius:2px;background:var(--red)"></span>Cheltuit</span></div></div>' +
      '<div class="bars" role="img" aria-label="Venituri și cheltuieli pe luni">' + mdata.map((x) => '<button class="m" data-a="statsYM" data-v="' + x.m + '" style="background:none;border:0;padding:0;color:inherit"><div class="pair"><div style="height:' + Math.round(x.i / max * 116) + 'px;background:var(--green)"></div><div style="height:' + Math.round(x.e / max * 116) + 'px;background:var(--red)"></div></div><span class="tiny" style="color:' + (x.m === UI.statsYM ? 'var(--txt);font-weight:600' : 'var(--muted)') + '">' + MSHORT[+x.m.slice(5) - 1] + '</span></button>').join('') + '</div></section>' +
      (!isYear ? heatmap(st, range) : '') +
      '<section class="card col" style="gap:14px"><h2 style="font-size:17px">Pe ce s-au dus banii</h2>' +
      (all.cats.length ? all.cats.map((c) => '<button data-a="statsCat" data-c="' + esc(c.name) + '" style="background:none;border:0;padding:0;color:inherit;text-align:left" class="col"><div class="row between small" style="width:100%"><span style="font-size:13px">' + esc(c.name) + '</span><span class="soft m">' + fmt(Math.round(c.value)) + ' lei <span class="muted">(' + Math.round(c.value / all.expense * 100) + '%)</span></span></div><div class="track" style="margin-top:6px"><div style="width:' + Math.round(c.value / all.cats[0].value * 100) + '%;background:' + (UI.statsCat === c.name ? 'var(--txt)' : 'var(--chart)') + '"></div></div></button>').join('')
        : '<span class="small muted">Nicio cheltuială în perioada asta.</span>') + '</section>' +
      (fr.total > 0 ? '<section class="card col" style="gap:8px"><div class="row between"><h2 style="font-size:17px">Fee-uri crypto</h2><span class="m soft">' + lei(fr.total, 2) + ' în total</span></div>' + feeKeys.map((k) => kv(ymLabel(k), lei(fr.byMonth[k], 2))).join('') + '</section>' : '') +
      '</main>';
  }
  function statTile(label, v, cls) { return '<div class="card col" style="gap:4px;padding:14px 16px"><span class="small muted">' + esc(label) + '</span><span class="big m ' + cls + '" style="font-size:26px">' + fmt(Math.round(v)) + '</span><span class="tiny muted">lei</span></div>'; }
  function heatmap(st, range) {
    const first = new Date(range[0]), endT = new Date(range[1]).getTime();
    const lead = (first.getDay() + 6) % 7;
    const vals = Object.values(st.days), max = Math.max(1, ...vals);
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<div></div>';
    for (let x = new Date(first); x.getTime() < endT; x.setDate(x.getDate() + 1)) {
      const d = x.getDate(), v = st.days[FC.dayOf(FC.localISO(x))] || 0;
      const k = v / max;
      const bg = v === 0 ? 'rgba(255,255,255,.04)' : 'color-mix(in srgb,var(--chart) ' + (k < 0.25 ? 24 : k < 0.5 ? 46 : k < 0.8 ? 72 : 100) + '%,transparent)';
      cells += '<div title="' + d + ': ' + fmt(Math.round(v)) + ' lei" style="background:' + bg + ';color:' + (k >= 0.5 ? '#fff' : 'var(--soft)') + '">' + d + '</div>';
    }
    return '<section class="card col" style="gap:12px"><div class="row between"><h2 style="font-size:17px">Zi cu zi</h2><span class="small muted">cu cât mai închis, cu atât mai mult</span></div>' +
      '<div class="heat tiny muted" style="text-align:center"><span>L</span><span>Ma</span><span>Mi</span><span>J</span><span>V</span><span>S</span><span>D</span></div><div class="heat" role="img" aria-label="Cheltuieli pe zile">' + cells + '</div></section>';
  }

  /* ================= PAGINĂ: Istoric ================= */
  function historyPage() {
    const q = UI.histQ.trim().toLowerCase();
    const F = UI.histF, C = UI.histCat;
    const list = S.tx.filter((t) => {
      if (F === 'exp' && !FC.isExpense(t)) return false;
      if (F === 'inc' && t.kind !== 'income') return false;
      if (F === 'tr' && t.kind !== 'transfer') return false;
      if (F === 'inv' && t.kind !== 'invest' && t.kind !== 'divest') return false;
      if (C && t.cat !== C) return false;
      if (q) { const v = txVisual(t); if ((v.title + ' ' + v.sub + ' ' + (t.cat || '') + ' ' + t.amount).toLowerCase().indexOf(q) < 0) return false; }
      return true;
    }).slice().reverse();
    const groups = [];
    list.slice(0, 400).forEach((t) => { const d = FC.dayOf(t.date); let g = groups[groups.length - 1]; if (!g || g.d !== d) { g = { d, items: [], sum: 0 }; groups.push(g); } g.items.push(t); if (FC.isExpense(t)) g.sum += t.amount; });
    const total = list.filter(FC.isExpense).reduce((s, t) => s + t.amount, 0);
    return '<main class="screen"><header class="col" style="gap:4px"><button class="link row" data-a="page" data-p="" style="gap:2px;align-self:flex-start">' + ic('back', 18, 2) + 'Înapoi</button><h1>Istoric</h1></header>' +
      '<div class="field"><label for="q">Caută</label><input id="q" class="input" type="search" placeholder="Lidl, salariu' + (S.settings.profile.pet ? ', ' + esc(S.settings.profile.pet) : '') + '" value="' + esc(UI.histQ) + '" data-bind="histQ" data-live="1"></div>' +
      '<div class="chips" role="group" aria-label="Filtre">' + [['all', 'Toate'], ['exp', 'Cheltuieli'], ['inc', 'Venituri'], ['tr', 'Mutări'], ['inv', 'Investiții']].map((x) => '<button class="chip ' + (F === x[0] ? 'on' : '') + '" data-a="histF" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
      '<div class="chips">' + S.settings.categories.map((c) => '<button class="chip ' + (C === c ? 'on' : '') + '" data-a="histCat" data-v="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' +
      ((q || C || F !== 'all') && total ? '<div class="card row between" style="padding:12px 16px"><span class="small soft">Cheltuit în total' + (C ? ' pe ' + esc(C) : '') + '</span><span class="m" style="font-weight:600">' + lei(total, 2) + '</span></div>' : '') +
      (groups.length ? groups.map((g) => '<section class="col" style="gap:8px"><div class="row between small muted" style="padding:0 4px"><span class="soft" style="font-weight:600">' + dayLabel(g.d) + '</span>' + (g.sum ? '<span class="m">−' + fmt(g.sum, 2) + '</span>' : '') + '</div><div class="card tight">' + g.items.map((t) => txRow(t, false)).join('') + '</div></section>').join('')
        : '<div class="card empty">Nicio tranzacție pentru filtrele alese.</div>') + '</main>';
  }

  /* ================= PAGINĂ: Început (prima pornire) ================= */
  function setupPage() {
    const P = S.settings.profile;
    return '<main class="screen" style="padding-bottom:calc(var(--safe-bot) + 40px)">' +
      '<section class="hero" style="gap:8px"><svg class="dial" aria-hidden="true" width="260" height="260" viewBox="0 0 260 260"><circle cx="130" cy="130" r="124" fill="none" stroke="rgba(255,255,255,.10)"/><circle cx="130" cy="130" r="110" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="6" stroke-dasharray="1.5 9"/></svg>' +
      '<span class="disp" style="font-size:30px;font-weight:600;line-height:1.1">Bun venit în Fonduri</span><span style="color:rgba(248,247,244,.82);line-height:1.5">Patru întrebări și ești gata. Le poți schimba oricând din Setări → Profil.</span></section>' +
      '<form class="col" data-form="setup" style="gap:14px">' +
      field('Cum te cheamă?', 'name', S.settings.name, 'autocomplete="given-name" required') +
      field('Ai un animal de companie? Cum îl cheamă?', 'pet', P.pet, 'placeholder="opțional, devine categorie de cheltuieli"') +
      '<div class="field"><label for="f_bank">La ce bancă ai contul de economii?</label><input id="f_bank" class="input" name="bank" list="banks" value="' + esc(P.bank) + '" placeholder="BT, ING, BCR"><datalist id="banks">' + BANKS.map((b) => '<option value="' + b + '">').join('') + '</datalist></div>' +
      '<div class="field"><label for="f_ex">Ce exchange folosești pentru crypto?</label><input id="f_ex" class="input" name="exchange" list="exchs" value="' + esc(P.exchange) + '"><datalist id="exchs">' + EXCHS.map((b) => '<option value="' + b + '">').join('') + '</datalist></div>' +
      '<button class="btn primary block" type="submit" style="min-height:56px;font-size:16px">Începe</button></form>' +
      '<div class="card col" style="gap:10px"><span style="font-weight:600">Ai deja un backup?</span><span class="small muted" style="line-height:1.5">Importă-l și aplicația își ia singură numele, procentele și toate datele.</span>' +
      '<label class="btn block" style="cursor:pointer">' + ic('upload', 18, 2) + 'Importă un fișier<input type="file" accept=".json,application/json" data-a2="import" hidden></label></div></main>';
  }

  /* ================= PAGINĂ: Setări ================= */
  function settingsPage() {
    const s = S.settings;
    const pct = (v) => Math.round((v || 0) * 1000) / 10;
    const allF = s.funds, act = FUNDS();
    const opt = (list, sel) => list.map((x) => '<option ' + (x === sel ? 'selected' : '') + '>' + esc(x) + '</option>').join('');
    const grp = (id, title, sub, body) => '<details class="card set" data-set="' + id + '"' + (UI.openSet[id] ? ' open' : '') + '><summary><span class="col" style="gap:2px"><span class="disp" style="font-size:17px;font-weight:600">' + title + '</span>' + (sub ? '<span class="small muted">' + sub + '</span>' : '') + '</span>' + ic('right', 18, 2) + '</summary><div class="col" style="gap:12px;padding-top:14px">' + body + '</div></details>';
    const lbl = (text, inner) => '<label class="col" style="gap:6px"><span class="small muted">' + text + '</span>' + inner + '</label>';
    const H = s.home;
    const ef = UI.editFund && allF.find((f) => f.name === UI.editFund);

    const fundsBody = allF.map((f) => '<button class="list-row" data-a="editFund" data-f="' + esc(f.name) + '" style="padding:6px 0;min-height:52px' + (f.archived ? ';opacity:.5' : '') + '">' + fundBadge(f.name) +
        '<span class="grow"><span class="t">' + esc(f.name) + '</span><span class="s">' + (f.archived ? 'arhivat' : 'sold ' + fmt(FC.balances(S)[f.name] || 0, 2) + ' lei') + '</span></span>' + ic('right', 18, 2) + '</button>' +
        (ef && ef.name === f.name ? fundEditor(f) : '')).join('') +
      '<form class="row" data-form="fundAdd" style="gap:8px"><input class="input" name="n" placeholder="Fond nou, de ex. Vacanță" aria-label="Nume fond nou"><button class="btn primary" type="submit">Adaugă</button></form>' +
      lbl('Fondul din care pleacă cheltuielile obișnuite', '<select class="input" data-a2="role" data-k="expenseFund">' + opt(act, s.expenseFund) + '</select>') +
      lbl('Fondul pentru depunerile în ' + esc(EXCH()), '<select class="input" data-a2="role" data-k="cryptoFund">' + opt(act, s.binance.cryptoFund) + '</select>') +
      lbl('Fondul pentru contul de economii', '<select class="input" data-a2="role" data-k="savingsFund">' + opt(act, s.savings.fund) + '</select>');

    const incBody = INC().map((t) => {
      const sum = act.reduce((x, f) => x + (s.splits[t][f] || 0), 0);
      return '<div class="col" style="gap:8px;padding-bottom:6px;border-bottom:1px solid var(--line)"><div class="row" style="gap:8px"><input class="input" style="flex:1" value="' + esc(t) + '" data-a2="incName" data-t="' + esc(t) + '" aria-label="Nume venit">' +
        '<span class="small ' + (Math.abs(sum - 1) < 0.001 ? 'green' : 'red') + '" style="min-width:52px;text-align:right">' + pct(sum) + '%</span><button class="icon-btn" data-a="incDel" data-t="' + esc(t) + '" aria-label="Șterge ' + esc(t) + '">' + ic('trash', 16) + '</button></div><div class="grid3">' +
        act.map((f) => '<label class="col" style="gap:4px"><span class="tiny muted">' + esc(f) + '</span><input class="input" style="height:42px;font-size:15px" inputmode="decimal" value="' + pct(s.splits[t][f]) + '" data-a2="split" data-t="' + esc(t) + '" data-f="' + esc(f) + '"></label>').join('') + '</div></div>';
    }).join('') +
      '<form class="row" data-form="incAdd" style="gap:8px"><input class="input" name="n" placeholder="Venit nou, de ex. DSL" aria-label="Tip de venit nou"><button class="btn primary" type="submit">Adaugă</button></form>' +
      lbl('Cât merge întâi într-un fond pe minus, din fiecare venit (%)', '<input class="input" inputmode="decimal" value="' + pct(s.negPriority) + '" data-a2="negPriority">');

    const catBody = s.categories.map((c) => '<div class="row" style="gap:8px"><input class="input" style="flex:1" value="' + esc(c) + '" data-a2="catName" data-c="' + esc(c) + '" aria-label="Categorie"><button class="icon-btn" data-a="catDel" data-c="' + esc(c) + '" aria-label="Șterge ' + esc(c) + '">' + ic('trash', 16) + '</button></div>').join('') +
      '<form class="row" data-form="catAdd" style="gap:8px"><input class="input" name="c" placeholder="Categorie nouă" aria-label="Categorie nouă"><button class="btn primary" type="submit">Adaugă</button></form>';

    const cashBody = '<span class="small soft" style="line-height:1.5">Cash-ul se împarte singur pe fonduri, în ordinea asta. Când un fond nu mai are bani, trece la următorul.</span>' +
      s.cashOrder.filter((f) => act.indexOf(f) >= 0).map((f, i, arr) => '<div class="row between"><span>' + (i + 1) + '. ' + esc(f) + '</span><div class="row" style="gap:6px"><button class="icon-btn" data-a="cashOrd" data-f="' + esc(f) + '" data-d="-1" aria-label="Mută mai sus" ' + (i === 0 ? 'disabled' : '') + '>↑</button><button class="icon-btn" data-a="cashOrd" data-f="' + esc(f) + '" data-d="1" aria-label="Mută mai jos" ' + (i === arr.length - 1 ? 'disabled' : '') + '>↓</button><button class="icon-btn" data-a="cashOrdDel" data-f="' + esc(f) + '" aria-label="Scoate din listă">' + ic('close', 16) + '</button></div></div>').join('') +
      (act.filter((f) => s.cashOrder.indexOf(f) < 0 && f !== s.expenseFund).length ? lbl('Adaugă în listă', '<select class="input" data-a2="cashOrdAdd"><option value="">alege un fond</option>' + opt(act.filter((f) => s.cashOrder.indexOf(f) < 0 && f !== s.expenseFund), '') + '</select>') : '') +
      lbl('Curs euro (lei pentru 1 €)', '<input class="input" inputmode="decimal" value="' + s.eurRate + '" data-a2="eurRate">') +
      lbl('Câștigul la schimbul de euro intră la venitul', '<select class="input" data-a2="eurGain">' + opt(INC(), s.eurGainType) + '</select>') +
      '<h3>Bancnote</h3>' + s.denoms.map((d) => '<div class="row between"><span>' + esc(d.label) + ' <span class="small muted">(' + fmt(d.value) + ' ' + (d.cur === 'EUR' ? '€' : 'lei') + ')</span></span><button class="icon-btn" data-a="denomDel" data-id="' + esc(d.id) + '" aria-label="Șterge ' + esc(d.label) + '">' + ic('trash', 16) + '</button></div>').join('') +
      '<form class="col" data-form="denomAdd" style="gap:8px"><div class="grid3"><input class="input" name="label" placeholder="Nume, ex. 100 lei" aria-label="Nume bancnotă"><input class="input" name="value" inputmode="decimal" placeholder="Valoare" aria-label="Valoare"><select class="input" name="cur" aria-label="Monedă"><option value="RON">lei</option><option value="EUR">€</option></select></div><button class="btn" type="submit">Adaugă bancnotă</button></form>';

    const cryptoBody = '<label class="switch"><span>Prețuri în timp real</span><input type="checkbox" ' + (s.live.enabled ? 'checked' : '') + ' data-a2="live"></label>' +
      lbl('Fee depunere cu card / Apple Pay (%)', '<input class="input" inputmode="decimal" value="' + pct(s.binance.cardFee) + '" data-a2="bin" data-k="cardFee">') +
      lbl('Fee tranzacționare Spot (%)', '<input class="input" inputmode="decimal" value="' + pct(s.binance.tradeFee) + '" data-a2="bin" data-k="tradeFee">') +
      lbl('Reducere când plătești fee-ul cu BNB (%)', '<input class="input" inputmode="decimal" value="' + pct(s.binance.bnbDiscount) + '" data-a2="bin" data-k="bnbDiscount">') +
      '<label class="switch"><span>Plătesc fee-ul cu BNB</span><input type="checkbox" ' + (s.binance.payFeeInBnb ? 'checked' : '') + ' data-a2="binBnb"></label>';

    const savBody = lbl('Nume cont', '<input class="input" value="' + esc(s.savings.name) + '" data-a2="sav" data-k="name">') +
      '<div class="grid2">' + lbl('Dobândă pe an (%)', '<input class="input" inputmode="decimal" value="' + pct(s.savings.apr) + '" data-a2="sav" data-k="apr">') + lbl('Impozit (%)', '<input class="input" inputmode="decimal" value="' + pct(s.savings.tax) + '" data-a2="sav" data-k="tax">') + '</div>' +
      lbl('Ziua din lună în care primești dobânda', '<input class="input" inputmode="numeric" value="' + (s.savings.payDay || 1) + '" data-a2="payDay">') +
      '<span class="small muted" style="line-height:1.5">Dobânda e anuală, dar banca o plătește lunar, calculată pe soldul din fiecare zi, cu impozitul deja reținut. Aplicația o adaugă singură, ca estimare, în ziua plății.</span>';

    const recBody = (S.recurring.length ? S.recurring.map((r) => '<button class="list-row" data-a="sheet" data-s="recEdit" data-id="' + r.id + '" style="padding:6px 0"><span class="badge" style="background:rgba(255,105,97,.15);color:var(--red)">' + ic('repeat', 18) + '</span><span class="grow"><span class="t">' + esc(r.note || r.cat) + '</span><span class="s">în fiecare lună pe ' + r.day + (r.active ? '' : ', oprită') + '</span></span><span class="v m">' + fmt(r.amount, 2) + '</span></button>').join('') : '<span class="small muted">Nicio plată recurentă.</span>') +
      '<button class="btn block" data-a="sheet" data-s="recEdit">' + ic('plus', 18, 2) + 'Adaugă plată recurentă</button>';

    const scBody = S.shortcuts.length ? S.shortcuts.map((x) => '<div class="row" style="gap:8px"><input class="input" style="flex:1" value="' + esc(x.label) + '" data-a2="scName" data-id="' + x.id + '" aria-label="Nume scurtătură"><button class="icon-btn" data-a="scDel" data-id="' + x.id + '" aria-label="Șterge scurtătura">' + ic('trash', 16) + '</button></div>').join('')
      : '<span class="small muted" style="line-height:1.5">Le creezi din ecranul de adăugare, cu „Salvează ca scurtătură”.</span>';

    const P = s.profile;
    const profBody = lbl('Numele tău', '<input class="input" value="' + esc(s.name) + '" data-a2="name" autocomplete="given-name">') +
      lbl('Animalul de companie (devine categorie de cheltuieli)', '<input class="input" value="' + esc(P.pet) + '" data-a2="pet" placeholder="opțional">') +
      lbl('Banca (contul de economii, SMS-urile de la depuneri)', '<input class="input" value="' + esc(P.bank) + '" data-a2="bank" list="banks" placeholder="BT, ING, BCR"><datalist id="banks">' + BANKS.map((b) => '<option value="' + b + '">').join('') + '</datalist>') +
      lbl('Exchange-ul pentru crypto', '<input class="input" value="' + esc(P.exchange) + '" data-a2="exchange" list="exchs"><datalist id="exchs">' + EXCHS.map((b) => '<option value="' + b + '">').join('') + '</datalist>') +
      '<span class="small muted" style="line-height:1.5">Prețurile live vin mereu din datele publice Binance, oricare ar fi exchange-ul tău; diferențele de preț între exchange-uri sunt de obicei foarte mici.</span>';
    const avail = FC.availableFunds(S);
    const homeBody = '<h3>Ce înseamnă „bani disponibili”</h3><span class="small soft" style="line-height:1.5">Fondurile bifate se adună în suma mare de pe Acasă. Debifează ce nu vrei să vezi ca bani de folosit (de exemplu Rezervă).</span>' +
      act.map((f) => '<label class="switch"><span class="row" style="gap:8px"><span class="dot" style="width:10px;height:10px;border-radius:4px;background:' + fcol(f) + '"></span>' + esc(f) + '</span><input type="checkbox" ' + (avail.indexOf(f) >= 0 ? 'checked' : '') + ' data-a2="avail" data-f="' + esc(f) + '"></label>').join('') +
      '<h3>Secțiuni</h3>' +
      [['hero', 'Bani disponibili și grafic'], ['negWarn', 'Avertisment fond pe minus'], ['mini', 'În bancă, cash, de cheltuit'], ['month', 'Luna curentă'], ['compare', 'Comparație cu luna trecută'], ['goal', 'Obiectivul cel mai aproape'], ['funds', 'Fondurile'], ['recent', 'Tranzacții recente']]
        .map((x) => '<label class="switch"><span>' + x[1] + '</span><input type="checkbox" ' + (H[x[0]] ? 'checked' : '') + ' data-a2="home" data-k="' + x[0] + '"></label>').join('') +
      lbl('Câte tranzacții recente', '<input class="input" inputmode="numeric" value="' + (H.recentCount || 6) + '" data-a2="recentCount">') +
      lbl('Graficul pornește pe', '<select class="input" data-a2="homeRange">' + [[30, '1 lună'], [90, '3 luni'], [365, '1 an']].map((r) => '<option value="' + r[0] + '" ' + (+s.homeRange === r[0] ? 'selected' : '') + '>' + r[1] + '</option>').join('') + '</select>');

    const th = s.theme || {};
    const swatch = (key, t) => '<button class="col" data-a="theme" data-k="accent" data-v="' + key + '" aria-pressed="' + (th.accent === key) + '" style="background:none;border:0;padding:0;color:inherit;align-items:center;gap:6px"><span style="width:44px;height:44px;border-radius:15px;background:linear-gradient(135deg,' + t.violet + ',' + t.act + ');' + (th.accent === key ? 'outline:2px solid var(--txt);outline-offset:3px' : '') + '"></span><span class="tiny ' + (th.accent === key ? '' : 'muted') + '">' + t.name + '</span></button>';
    const lookBody = '<span class="small muted">Culoarea principală</span><div class="grid3" style="row-gap:14px">' + Object.keys(THEMES).map((k) => swatch(k, THEMES[k])).join('') + '</div>' +
      '<span class="small muted">Fundal</span><div class="seg" style="grid-template-columns:repeat(3,1fr)">' + Object.keys(BGS).map((k) => '<button class="' + (th.bg === k ? 'on' : '') + '" data-a="theme" data-k="bg" data-v="' + k + '">' + BGS[k].name + '</button>').join('') + '</div>' +
      '<span class="small muted">Mărimea textului</span><div class="seg" style="grid-template-columns:repeat(3,1fr)">' + Object.keys(SIZES).map((k) => '<button class="' + (th.size === k ? 'on' : '') + '" data-a="theme" data-k="size" data-v="' + k + '">' + SIZES[k][0] + '</button>').join('') + '</div>' +
      lbl('Ecranul cu care pornește aplicația', '<select class="input" data-a2="startTab">' + [['home', 'Acasă'], ['funds', 'Fonduri'], ['invest', 'Investiții'], ['stats', 'Statistici']].map((x) => '<option value="' + x[0] + '" ' + (s.startTab === x[0] ? 'selected' : '') + '>' + x[1] + '</option>').join('') + '</select>');

    const monthBody = '<span class="small soft" style="line-height:1.5">Dacă salariul vine pe 20, pune 20: „octombrie” va fi 20 octombrie – 19 noiembrie, la statistici, pe Acasă și la Fonduri.</span>' +
      lbl('Luna mea începe în ziua', '<input class="input" inputmode="numeric" value="' + (s.monthStart || 1) + '" data-a2="monthStart">');

    const privBody = '<label class="switch"><span>Deblocare cu Face ID</span><input type="checkbox" ' + (s.lock.enabled ? 'checked' : '') + ' data-a2="lock"></label>' +
      lbl('Cere Face ID din nou după (minute în fundal)', '<input class="input" inputmode="numeric" value="' + s.lockAfterMin + '" data-a2="lockAfterMin">') +
      '<label class="switch"><span>Ascunde sumele (mod discret)</span><input type="checkbox" ' + (s.discreet ? 'checked' : '') + ' data-a2="discreet"></label>';

    const dataBody = '<span class="small soft" style="line-height:1.5">Datele stau doar pe telefonul ăsta. Exportă-le din când în când în Drive.</span>' +
      lbl('Amintește-mi de export după (zile)', '<input class="input" inputmode="numeric" value="' + s.exportRemindDays + '" data-a2="exportRemindDays">') +
      '<button class="btn primary block" data-a="sheet" data-s="export">' + ic('down', 18, 2) + 'Exportă</button>' +
      '<label class="btn block" style="cursor:pointer">' + ic('upload', 18, 2) + 'Importă un fișier<input type="file" accept=".json,application/json" data-a2="import" hidden></label>' +
      '<button class="btn danger block" data-a="wipe">Șterge toate datele</button>';

    return '<main class="screen"><header class="col" style="gap:4px"><button class="link row" data-a="page" data-p="" style="gap:2px;align-self:flex-start">' + ic('back', 18, 2) + 'Înapoi</button><h1>Setări</h1></header>' +
      grp('prof', 'Profil', [s.name, P.pet, P.bank, P.exchange].filter(Boolean).map(esc).join(', ') || 'nume, animal, bancă, exchange', profBody) +
      grp('funds', 'Fonduri', act.length + ' active', fundsBody) +
      grp('inc', 'Venituri și împărțire', INC().join(', '), incBody) +
      grp('cat', 'Categorii', s.categories.length + ' categorii', catBody) +
      grp('cash', 'Pușculița', 'ordinea fondurilor, bancnote, curs euro', cashBody) +
      grp('crypto', 'Crypto și ' + esc(EXCH()), 'prețuri live, fee-uri', cryptoBody) +
      grp('sav', 'Economii', esc(s.savings.name), savBody) +
      grp('rec', 'Plăți recurente', S.recurring.length + ' plăți', recBody) +
      grp('sc', 'Scurtături', S.shortcuts.length + ' salvate', scBody) +
      grp('home', 'Ecranul Acasă', 'bani disponibili, secțiuni', homeBody) +
      grp('look', 'Aspect', (THEMES[th.accent] || THEMES.mov).name + ', ' + (BGS[th.bg] || BGS.denim).name + ', text ' + (SIZES[th.size] || SIZES.normal)[0].toLowerCase(), lookBody) +
      grp('month', 'Luna financiară', (s.monthStart || 1) === 1 ? 'de pe 1 până la sfârșitul lunii' : 'începe pe ' + s.monthStart, monthBody) +
      grp('priv', 'Confidențialitate', 'Face ID, mod discret', privBody) +
      grp('data', 'Date', 'export, import', dataBody) +
      '<p class="tiny muted" style="text-align:center">Fonduri 1.4</p></main>';
  }
  function fundEditor(f) {
    return '<div class="col" style="gap:12px;background:var(--bg);border-radius:18px;padding:14px;margin-bottom:8px">' +
      '<label class="col" style="gap:6px"><span class="small muted">Nume</span><input class="input" value="' + esc(f.name) + '" data-a2="fundName" data-f="' + esc(f.name) + '"></label>' +
      '<span class="small muted">Culoare</span><div class="row" style="flex-wrap:wrap;gap:8px">' + FC.PALETTE.map((c) => '<button class="icon-btn" data-a="fundColor" data-f="' + esc(f.name) + '" data-c="' + c + '" aria-label="Culoare ' + c + '" style="width:36px;height:36px;border-radius:12px;background:' + c + ';' + (f.color === c ? 'outline:2px solid var(--txt);outline-offset:2px' : '') + '"></button>').join('') + '</div>' +
      '<span class="small muted">Iconiță</span><div class="row" style="flex-wrap:wrap;gap:8px">' + ICON_CHOICES.map((i) => '<button class="icon-btn" data-a="fundIcon" data-f="' + esc(f.name) + '" data-i="' + i + '" aria-label="Iconiță ' + i + '" style="' + (f.icon === i ? 'background:var(--act);color:#fff' : 'background:var(--surf2)') + '">' + ic(i, 18) + '</button>').join('') + '</div>' +
      '<button class="btn ' + (f.archived ? '' : 'danger') + ' block" data-a="fundArchive" data-f="' + esc(f.name) + '">' + (f.archived ? 'Scoate din arhivă' : 'Arhivează fondul') + '</button></div>';
  }

  /* ================= FOI ================= */
  function sheetWrap(title, body, opts) {
    opts = opts || {};
    const st = UI.stay ? ' stay' : '';
    return '<div class="scrim' + st + '" data-a="close"></div><div class="sheet' + st + '" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="grab"></div>' +
      '<div class="sheet-head"><button class="link" data-a="close" style="min-width:72px;text-align:left">' + (opts.cancel || 'Anulează') + '</button><span class="ttl">' + esc(title) + '</span><span style="min-width:72px;text-align:right">' + (opts.right || '') + '</span></div>' + body + '</div>';
  }
  function field(label, name, val, attrs) {
    return '<div class="field"><label for="f_' + name + '">' + label + '</label><input id="f_' + name + '" class="input" name="' + name + '" value="' + esc(val == null ? '' : val) + '" ' + (attrs || '') + '></div>';
  }
  const dateField = (val) => field('Data', 'date', val || FC.localISO(), 'type="datetime-local"');

  /* --- adăugare tranzacție --- */
  function newAdd(kind, preset) {
    return Object.assign({ kind: kind || 'expense', amount: '0', cat: S.settings.categories[0], fund: EXP(), fundFrom: FUNDS()[FUNDS().length - 1], fundTo: FUNDS().find((f) => f !== EXP()) || FUNDS()[0], sub: INC()[0], eur: false, keepEur: false, note: '', date: FC.localISO(), saveSc: false, editId: null }, preset || {});
  }
  function addSheet() {
    const a = UI.add;
    const num = parseFloat(String(a.amount).replace(',', '.')) || 0;
    const parts = String(a.amount).split(',');
    const shown = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (parts.length > 1 ? ',' + parts[1] : '');
    const leiAmt = a.kind === 'income' && a.eur ? num * S.settings.eurRate : num;
    const types = [['expense', 'Cheltuială'], ['income', 'Venit'], ['fund', 'Din fond'], ['transfer', 'Mutare']];
    let extra = '';
    if (a.kind === 'expense' || a.kind === 'fund') {
      if (a.kind === 'fund') extra += '<div class="chips">' + FUNDS().map((f) => chipFund(f, a.fund === f, 'fund')).join('') + '</div>';
      extra += '<div class="chips">' + S.settings.categories.map((c) => '<button class="chip ' + (a.cat === c ? 'on' : '') + '" data-a="addSet" data-k="cat" data-v="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>';
    } else if (a.kind === 'income') {
      let prev = {};
      try { prev = leiAmt > 0 ? FC.incomeAlloc(S, leiAmt, a.sub) : {}; } catch (e) { prev = {}; }
      extra += '<div class="seg" style="grid-template-columns:repeat(' + INC().length + ',minmax(0,1fr))">' + INC().map((t) => '<button class="' + (a.sub === t ? 'on' : '') + '" data-a="addSet" data-k="sub" data-v="' + t + '">' + t + '</button>').join('') + '</div>' +
        '<label class="switch"><span>Primit în euro (' + S.settings.eurRate + ' lei/€)</span><input type="checkbox" ' + (a.eur ? 'checked' : '') + ' data-a2="addEur"></label>' +
        (a.eur ? '<label class="switch"><span>Îi păstrez cash în pușculiță</span><input type="checkbox" ' + (a.keepEur ? 'checked' : '') + ' data-a2="addKeep"></label>' : '') +
        '<div class="card col" style="gap:10px;padding:12px 14px"><div class="bar">' + FUNDS().filter((f) => prev[f] > 0).map((f) => '<div style="flex:' + prev[f] + ' 1 0;background:' + fcol(f) + '"></div>').join('') + '</div><div class="split-grid">' +
        FUNDS().filter((f) => prev[f]).map((f) => '<div class="row small" style="gap:8px"><span style="width:8px;height:8px;border-radius:3px;background:' + fcol(f) + '"></span><span class="soft" style="flex:1">' + f + '</span><span style="font-weight:600">' + fmt(prev[f], 2) + '</span></div>').join('') + '</div></div>';
    } else if (a.kind === 'transfer') {
      extra += '<span class="small muted">Din</span><div class="chips">' + FUNDS().map((f) => chipFund(f, a.fundFrom === f, 'fundFrom')).join('') + '</div>' +
        '<span class="small muted">În</span><div class="chips">' + FUNDS().map((f) => chipFund(f, a.fundTo === f, 'fundTo')).join('') + '</div>';
    }
    const sub = a.kind === 'expense' ? a.cat + ', din ' + EXP() : a.kind === 'fund' ? a.cat + ', din ' + a.fund : a.kind === 'income' ? (a.eur ? '= ' + lei(leiAmt, 2) + ', se împarte automat' : 'Se împarte automat în fonduri') : a.fundFrom + ' → ' + a.fundTo;
    const sc = !a.editId && S.shortcuts.length ? '<div class="chips">' + S.shortcuts.map((x) => '<button class="chip" data-a="useSc" data-id="' + x.id + '" style="border-style:dashed">' + esc(x.label) + '</button>').join('') + '</div>' : '';
    const ki = types.findIndex((t) => t[0] === a.kind);
    const fromI = UI.slideFrom != null ? UI.slideFrom : ki;
    const body = sc +
      '<div class="seg glide" style="grid-template-columns:repeat(4,1fr);--n:4;--i:' + ki + ';--from:' + fromI + '"><span class="ind" aria-hidden="true"></span>' + types.map((t) => '<button class="' + (a.kind === t[0] ? 'on' : '') + '" data-a="addSet" data-k="kind" data-v="' + t[0] + '" ' + (a.editId ? 'disabled' : '') + '>' + t[1] + '</button>').join('') + '</div>' +
      '<div class="kpane' + (UI.slideFrom != null && UI.slideFrom !== ki ? (ki > UI.slideFrom ? ' from-r' : ' from-l') : '') + '" data-swipe="kind">' +
      '<div class="amount"><span class="n ' + (a.kind === 'income' ? 'green' : '') + '">' + (a.kind === 'income' ? '+' : '') + shown + '<span class="u"> ' + (a.kind === 'income' && a.eur ? '€' : 'lei') + '</span></span><span class="small muted">' + esc(sub) + '</span></div>' +
      extra + '</div>' +
      '<div class="keypad">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'].map((k) => '<button data-a="key" data-k="' + k + '" aria-label="' + (k === 'del' ? 'Șterge cifra' : k) + '">' + (k === 'del' ? '⌫' : k) + '</button>').join('') + '</div>' +
      '<div class="field"><label for="f_note">Notă</label><input id="f_note" class="input" value="' + esc(a.note) + '" data-bind="add.note" placeholder="opțional"></div>' +
      '<div class="field"><label for="f_date">Data</label><input id="f_date" class="input" type="datetime-local" value="' + esc(a.date) + '" data-bind="add.date"></div>' +
      (!a.editId ? '<label class="switch"><span>Salvează ca scurtătură</span><input type="checkbox" ' + (a.saveSc ? 'checked' : '') + ' data-a2="addSc"></label>' : '') +
      '<button class="btn primary block" data-a="saveAdd" style="min-height:56px;font-size:16px">' + (a.editId ? 'Salvează modificarea' : 'Salvează ' + shown + ' ' + (a.kind === 'income' && a.eur ? '€' : 'lei')) + '</button>' +
      (a.editId ? '<button class="btn danger block" data-a="delTx" data-id="' + a.editId + '">' + ic('trash', 18) + 'Șterge tranzacția</button>' : '');
    return sheetWrap(a.editId ? 'Modifică' : 'Tranzacție nouă', body);
  }
  const ADD_KINDS = ['expense', 'income', 'fund', 'transfer'];
  function chipFund(f, on, key) {
    return '<button class="chip ' + (on ? 'on' : '') + '" data-a="addSet" data-k="' + key + '" data-v="' + f + '"><span class="dot" style="background:' + fcol(f) + '"></span>' + f + '</button>';
  }
  function editInfoSheet(t) {
    const v = txVisual(t);
    const rows = Object.keys(t.alloc || {}).map((f) => kv(f, '<span class="' + (t.alloc[f] >= 0 ? 'green' : 'red') + '">' + sign(t.alloc[f], (n) => fmt(n, 2)) + '</span>')).join('');
    return sheetWrap(v.title, '<div class="card col" style="gap:6px">' + kv('Data', dayLabel(t.date) + ', ' + timeOf(t.date)) + kv('Tip', FC.kindLabel(t)) + kv('Sumă', lei(t.amount, 2)) + (t.note ? kv('Notă', esc(t.note)) : '') + '</div>' +
      (rows ? '<div class="card col" style="gap:6px"><h3>Efect pe fonduri</h3>' + rows + '</div>' : '') +
      '<span class="small muted" style="line-height:1.5">' + (t.link ? 'Face parte dintr-o operațiune ' + (t.src === 'crypto' ? 'crypto' : t.src === 'savings' ? 'de economii' : 'din pușculiță') + '. Dacă o ștergi, se șterge și operațiunea.' : 'Soldul inițial importat din Google Sheets.') + '</span>' +
      '<button class="btn danger block" data-a="delTx" data-id="' + t.id + '">' + ic('trash', 18) + 'Șterge</button>', { cancel: 'Închide' });
  }

  /* --- formulare simple --- */
  function formSheet(title, inner, submitLabel, formName) {
    return sheetWrap(title, '<form class="col" style="gap:14px" data-form="' + formName + '">' + inner + '<button class="btn primary block" type="submit" style="min-height:54px">' + submitLabel + '</button></form>');
  }
  function sheetHTML() {
    const s = UI.sheet, A = UI.args || {}, F = UI.form;
    if (!s) return '';
    if (s === 'add') return addSheet();
    if (s === 'txInfo') { const t = S.tx.find((x) => x.id === A.id); return t ? editInfoSheet(t) : ''; }
    if (s === 'deposit') {
      const ref = F.ref, usdV = parseFloat(F.usd) || 0, leiV = parseFloat(String(F.lei || '').replace(',', '.')) || 0;
      const fee = S.settings.binance.cardFee, rec = usdV * (1 - fee);
      let prev = '';
      if (usdV > 0) {
        prev = '<div class="card col" style="gap:6px">' + kv('Intră în ' + esc(EXCH()), usd(rec)) + kv('Fee ' + esc(EXCH()) + ' (' + fmt(fee * 100, 1) + '%)', usd(usdV - rec)) +
          (ref ? kv('Curs BCE din ziua aleasă', fmt(ref, 4) + ' lei/$') : kv('Curs BCE', F.refLoading ? 'se încarcă…' : 'indisponibil acum')) +
          (ref && leiV ? kv('Banca a luat', lei(leiV - usdV * ref, 2) + ' (' + fmt((leiV / (usdV * ref) - 1) * 100, 2) + '%)') + kv('Cost total real', lei(leiV - rec * ref, 2) + ' (' + fmt((1 - rec * ref / leiV) * 100, 2) + '%)') : '') + '</div>';
      }
      return formSheet('Depunere în ' + EXCH(),
        '<div class="grid2">' + field('Sumă trimisă ($)', 'usd', F.usd || '', 'inputmode="decimal" data-live="usd" required') + field('Lei plecați din ' + esc(BANK()) + ' (din SMS)', 'lei', F.lei || '', 'inputmode="decimal" data-live="lei" placeholder="opțional"') + '</div>' +
        '<div class="field"><label for="f_date">Data</label><input id="f_date" class="input" type="datetime-local" name="date" value="' + esc(F.date || FC.localISO()) + '" data-live="date"></div>' + prev +
        '<span class="small muted" style="line-height:1.5">Banii pleacă din fondul ' + S.settings.binance.cryptoFund + '. Dacă nu scrii lei, îi estimez după cursul BCE; corectezi oricând.</span>', 'Salvează depunerea', 'deposit');
    }
    if (s === 'trade') {
      const side = F.side || A.side || 'buy';
      const cv = FC.cryptoReplay(S);
      const held = Object.keys(cv.coins).filter((c) => cv.coins[c].qty > 1e-12);
      const usdV = parseFloat(F.usd) || 0, b = S.settings.binance;
      const feeRate = b.tradeFee * (b.payFeeInBnb ? 1 - b.bnbDiscount : 1);
      return formSheet(side === 'buy' ? 'Cumpărare' : 'Vânzare',
        '<div class="seg" style="grid-template-columns:1fr 1fr"><button type="button" class="' + (side === 'buy' ? 'on' : '') + '" data-a="formSet" data-k="side" data-v="buy">Cumpăr</button><button type="button" class="' + (side === 'sell' ? 'on' : '') + '" data-a="formSet" data-k="side" data-v="sell">Vând</button></div>' +
        '<div class="field"><label for="f_coin">Moneda</label><input id="f_coin" class="input" name="coin" list="coins" autocapitalize="characters" value="' + esc(F.coin || '') + '" data-live="coin" placeholder="BTC, ETH, LINK" required><datalist id="coins">' + held.map((c) => '<option value="' + c + '">').join('') + '</datalist></div>' +
        '<div class="grid2">' + field('Cantitate', 'qty', F.qty || '', 'inputmode="decimal" data-live="qty" required') + field(side === 'buy' ? 'Total plătit ($)' : 'Total primit ($)', 'usd', F.usd || '', 'inputmode="decimal" data-live="usd" required') + '</div>' +
        (usdV ? '<div class="card col" style="gap:6px">' + kv('Fee (' + fmt(feeRate * 100, 3) + '%' + (b.payFeeInBnb ? ', în BNB' : '') + ')', usd(usdV * feeRate)) + (F.qty ? kv('Preț pe bucată', usd(usdV / parseFloat(F.qty))) : '') + '</div>' : '') +
        '<div class="field"><label for="f_date">Data</label><input id="f_date" class="input" type="datetime-local" name="date" value="' + esc(F.date || FC.localISO()) + '" data-live="date"></div>', 'Salvează', 'trade');
    }
    if (s === 'withdraw') return formSheet('Retragere în lei', '<div class="grid2">' + field('Dolari scoși ($)', 'usd', '', 'inputmode="decimal" required') + field('Lei intrați în ' + esc(BANK()), 'lei', '', 'inputmode="decimal" required') + '</div>' +
      '<div class="field"><label for="f_fund">În fondul</label><select id="f_fund" class="input" name="fund">' + FUNDS().map((f) => '<option ' + (f === S.settings.binance.cryptoFund ? 'selected' : '') + '>' + f + '</option>').join('') + '</select></div>' + dateField(), 'Salvează retragerea', 'withdraw');
    if (s === 'earnFix') {
      const e = FC.earnSummary(S).find((x) => x.id === A.id); if (!e) return '';
      return formSheet(e.coin + ' în Earn', '<div class="card col" style="gap:6px">' + kv('Pus inițial / la ultima corectură', qty(e.qty)) + kv('Estimat acum', qty(+e.qtyNow.toFixed(8))) + kv('Recompense de la ' + e.start.split('-').reverse().join('.'), '+' + qty(+e.estReward.toFixed(8))) + '</div>' +
        field('Cât ai acum în Earn (din aplicația ' + esc(EXCH()) + ')', 'qty', '', 'inputmode="decimal" required placeholder="' + (+e.qtyNow.toFixed(8)) + '"') +
        '<span class="small muted" style="line-height:1.5">Diferența față de ce ai pus se salvează ca recompensă primită, iar estimarea zilnică pornește din nou de azi.</span>' +
        '<input type="hidden" name="id" value="' + esc(e.id) + '">' +
        '<button type="button" class="btn danger block" data-a="earnStop" data-id="' + e.id + '">Am scos tot din Earn</button>', 'Salvează suma reală', 'earnFix');
    }
    if (s === 'reward') return formSheet('Altă recompensă (airdrop, Launchpool)', '<div class="grid2">' + field('Moneda', 'coin', '', 'autocapitalize="characters" required') + field('Cantitate primită', 'qty', '', 'inputmode="decimal" required') + '</div>' + dateField(), 'Adaugă', 'reward');
    if (s === 'earnAdd') return formSheet('Pun în Earn', '<div class="grid2">' + field('Moneda', 'coin', '', 'autocapitalize="characters" required') + field('Cantitate', 'qty', '', 'inputmode="decimal" required') + '</div>' +
      '<div class="field"><label for="f_type">Tip</label><select id="f_type" class="input" name="type"><option value="flexible">Flexible</option><option value="locked">Locked</option></select></div>' +
      '<div class="grid2">' + field('APR (%)', 'apr', '', 'inputmode="decimal" required') + field('Până la (doar Locked)', 'end', '', 'type="date"') + '</div>' + field('Din data', 'start', FC.localISO().slice(0, 10), 'type="date"'), 'Salvează', 'earnAdd');
    if (s === 'savDep') return formSheet('Depun în economii', field('Sumă (lei)', 'amount', '', 'inputmode="decimal" required') + dateField() + '<span class="small muted">Banii pleacă din fondul ' + S.settings.savings.fund + '.</span>', 'Depun', 'savDep');
    if (s === 'savWd') return formSheet('Retrag din economii', field('Sumă (lei)', 'amount', '', 'inputmode="decimal" required') +
      '<div class="field"><label for="f_fund">În fondul</label><select id="f_fund" class="input" name="fund">' + FUNDS().map((f) => '<option ' + (f === S.settings.savings.fund ? 'selected' : '') + '>' + f + '</option>').join('') + '</select></div>' + dateField(), 'Retrag', 'savWd');
    if (s === 'savInt') {
      const e = S.savings.find((x) => x.id === A.id); if (!e) return '';
      return formSheet('Dobânda pentru ' + (e.forYM ? MONTHS[+e.forYM.slice(5) - 1] : 'luna trecută'), '<span class="small soft" style="line-height:1.5">' + (e.est ? 'Am estimat ' + lei(e.amount, 2) + ' net. ' : '') + 'Scrie suma netă care a intrat în cont (după impozit), din aplicația băncii.</span>' +
        field('Dobândă primită (lei, net)', 'amount', e.est ? '' : e.amount, 'inputmode="decimal" required placeholder="' + fmt(e.amount, 2) + '"') +
        '<input type="hidden" name="id" value="' + esc(e.id) + '">', 'Salvează', 'savInt');
    }
    if (s === 'savSet') return formSheet('Soldul real din cont', field('Sold acum (lei)', 'amount', FC.savingsBalance(S) || '', 'inputmode="decimal" required') + '<span class="small muted" style="line-height:1.5">Pui cifra din aplicația băncii. Nu mută bani din fonduri, doar corectează soldul.</span>', 'Salvează', 'savSet');
    if (s === 'cashAdd') return formSheet('Pușculița', '<div class="field"><label for="f_d">Ce pui</label><select id="f_d" class="input" name="denom">' + S.settings.denoms.map((d) => '<option value="' + d.id + '">' + d.label + '</option>').join('') + '</select></div>' +
      '<div class="grid2">' + field('Câte (sau câți €)', 'count', '', 'inputmode="decimal" required') + '<div class="field"><label for="f_dir">Operație</label><select id="f_dir" class="input" name="dir"><option value="1">Pun deoparte</option><option value="-1">Scot</option></select></div></div>' +
      '<span class="small muted" style="line-height:1.5">Nu schimbă soldul fondurilor. Aplicația împarte singură cash-ul: întâi ' + S.settings.cashOrder.join(', apoi ') + '.</span>', 'Salvează', 'cashAdd');
    if (s === 'eurExchange') { const eurIt = FC.cashSummary(S).items.find((i) => i.cur === 'EUR'); const held = eurIt ? eurIt.count : 0; return formSheet('Schimb euro în lei', '<span class="small soft">Ai ' + fmt(held) + ' € în pușculiță.</span><div class="grid2">' + field('Euro schimbați', 'eur', held || '', 'inputmode="decimal" required') + field('Lei primiți', 'lei', '', 'inputmode="decimal" required') + '</div><span class="small muted" style="line-height:1.5">Diferența față de ' + S.settings.eurRate + ' lei/€ intră la ' + esc(S.settings.eurGainType) + '.</span>', 'Schimb', 'eurExchange'); }
    if (s === 'recEdit') {
      const r = S.recurring.find((x) => x.id === A.id) || { day: 1, amount: '', cat: 'Abonamente', note: '', active: true };
      return formSheet(A.id ? 'Plată recurentă' : 'Plată recurentă nouă', field('Nume', 'note', r.note, 'required placeholder="YouTube Premium"') +
        '<div class="grid2">' + field('Sumă (lei)', 'amount', r.amount, 'inputmode="decimal" required') + field('Ziua din lună', 'day', r.day, 'inputmode="numeric" required') + '</div>' +
        '<div class="field"><label for="f_cat">Categorie</label><select id="f_cat" class="input" name="cat">' + S.settings.categories.map((c) => '<option ' + (c === r.cat ? 'selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></div>' +
        '<label class="switch"><span>Activă</span><input type="checkbox" name="active" ' + (r.active ? 'checked' : '') + '></label>' +
        '<input type="hidden" name="id" value="' + esc(A.id || '') + '">' + (A.id ? '<button type="button" class="btn danger block" data-a="recDel" data-id="' + A.id + '">Șterge plata</button>' : ''), 'Salvează', 'recEdit');
    }
    if (s === 'goalEdit') {
      const g = (S.goals || []).find((x) => x.id === A.id) || { name: '', target: '', fund: FUNDS().find((f) => /chizi/.test(f)) || FUNDS()[0], by: '' };
      const pr = A.id ? FC.goalProgress(S, g) : null;
      return formSheet(A.id ? 'Obiectiv' : 'Obiectiv nou', field('Ce vrei', 'name', g.name, 'required placeholder="Dronă nouă"') +
        '<div class="grid2">' + field('Cât costă (lei)', 'target', g.target, 'inputmode="decimal" required') + field('Până când (opțional)', 'by', g.by || '', 'type="date"') + '</div>' +
        '<div class="field"><label for="f_gf">Din fondul</label><select id="f_gf" class="input" name="fund">' + FUNDS().map((f) => '<option ' + (f === g.fund ? 'selected' : '') + '>' + esc(f) + '</option>').join('') + '</select></div>' +
        (pr ? '<div class="card col" style="gap:6px">' + kv('Strâns', lei(pr.have, 2)) + kv('Mai ai de strâns', lei(pr.left, 2)) + (pr.perMonth != null ? kv('Pe lună', lei(Math.ceil(pr.perMonth))) : '') + '</div>' : '') +
        '<span class="small muted" style="line-height:1.5">Progresul vine din soldul fondului. Dacă ai mai multe obiective pe același fond, banii merg întâi la primul creat.</span>' +
        '<input type="hidden" name="id" value="' + esc(A.id || '') + '">' +
        (A.id ? '<button type="button" class="btn block" data-a="goalDone" data-id="' + A.id + '">' + (g.done ? 'Nu e încă atins' : 'L-am atins / l-am cumpărat') + '</button><button type="button" class="btn danger block" data-a="goalDel" data-id="' + A.id + '">Șterge obiectivul</button>' : ''), 'Salvează', 'goalEdit');
    }
    if (s === 'export') {
      const d = daysSince(S.settings.lastExport);
      return sheetWrap('Export', '<span class="small soft" style="line-height:1.5">' + (d == null ? 'Nu ai făcut încă niciun export.' : 'Ultimul export acum ' + d + ' zile.') + ' Din fereastra care se deschide alegi „Salvează în Fișiere” sau Google Drive.</span>' +
        '<button class="btn primary block" data-a="exportEnc">' + ic('shield', 18, 2) + 'Backup cu parolă (recomandat)</button>' +
        '<button class="btn block" data-a="exportJson">' + ic('down', 18, 2) + 'Backup fără parolă</button>' +
        '<button class="btn block" data-a="exportXlsx">' + ic('down', 18, 2) + 'Excel (de citit pe PC, fără parolă)</button>' +
        '<span class="tiny muted" style="line-height:1.5">Backup-ul cu parolă e criptat pe telefon (AES-256) înainte să plece spre Drive. Fără parolă nu-l poate citi nimeni, nici tu: dacă o uiți, fișierul nu mai poate fi deschis.</span>', { cancel: 'Închide' });
    }
    return '';
  }

  /* ================= randare ================= */
  function tabbar() {
    const t = (id, label, icon) => '<button class="' + (UI.tab === id && !UI.page ? 'on' : '') + '" data-a="tab" data-t="' + id + '"' + (UI.tab === id && !UI.page ? ' aria-current="page"' : '') + '>' + ic(icon) + label + '</button>';
    return '<nav class="tabbar" aria-label="Navigare">' + t('home', 'Acasă', 'home') + t('funds', 'Fonduri', 'funds') +
      '<button class="plus" data-a="add" aria-label="Adaugă tranzacție">' + ic('plus', 24, 2.2) + '</button>' + t('invest', 'Investiții', 'invest') + t('stats', 'Statistici', 'stats') + '</nav>';
  }
  let lastKey = '', lastSheetName = null;
  function render() {
    applyTheme();
    document.body.classList.toggle('discreet', !!S.settings.discreet);
    const key = UI.page || UI.tab;
    const oldSheet = document.querySelector('.sheet');
    const sheetScroll = oldSheet ? oldSheet.scrollTop : 0;
    const active = document.activeElement && document.activeElement.id;
    const y = window.scrollY;
    let main;
    if (!S.settings.setupDone) main = setupPage();
    else if (UI.page === 'history') main = historyPage();
    else if (UI.page === 'settings') main = settingsPage();
    else if (UI.tab === 'funds') main = fundsScreen();
    else if (UI.tab === 'invest') main = investScreen();
    else if (UI.tab === 'stats') main = statsScreen();
    else main = homeScreen();
    UI.stay = !!(oldSheet && lastSheetName === UI.sheet);
    $app.innerHTML = main + (S.settings.setupDone ? tabbar() : '') + sheetHTML();
    lastSheetName = UI.sheet; UI.slideFrom = null; UI.stay = false;
    if (key !== lastKey) window.scrollTo(0, 0); else window.scrollTo(0, y);
    lastKey = key;
    const ns = document.querySelector('.sheet');
    if (ns && oldSheet) ns.scrollTop = sheetScroll;
    if (active && (active === 'q')) { const el = document.getElementById(active); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
  }

  /* ================= acțiuni ================= */
  function openSheet(name, args) { UI.sheet = name; UI.args = args || {}; UI.form = Object.assign({}, args || {}); render(); }
  function closeSheet() { UI.sheet = null; UI.args = {}; UI.add = null; UI.form = {}; render(); }
  function commit(msg) { save(); FC.snapshot(S); save(); if (msg) toast(msg); }

  const actions = {
    tab: (d) => { UI.tab = d.t; UI.page = null; render(); },
    page: (d) => { UI.page = d.p || null; render(); },
    range: (d) => { UI.range = +d.v; render(); },
    repRange: (d) => { UI.repRange = d.v === 'all' ? 'all' : +d.v; render(); },
    theme: (d) => { S.settings.theme[d.k] = d.v; save(); render(); },
    goalDone: (d) => { const g = S.goals.find((x) => x.id === d.id); if (g) { g.done = !g.done; closeSheet(); commit(g.done ? 'Felicitări! Obiectiv atins' : 'Salvat'); } },
    goalDel: (d) => ask('Ștergi obiectivul? Banii rămân în fond.', 'Șterge', () => { S.goals = S.goals.filter((x) => x.id !== d.id); closeSheet(); commit('Șters'); }),
    discreet: () => { S.settings.discreet = !S.settings.discreet; save(); render(); },
    invSeg: (d) => { UI.tab = 'invest'; UI.page = null; UI.invSeg = d.v; render(); },
    coin: (d) => { UI.openCoin = UI.openCoin === d.c ? null : d.c; render(); },
    chartRange: (d) => { UI.chartRange = d.v; render(); },
    refresh: () => { refreshMarket(true); if (UI.invSeg === 'report') loadHist(true); },
    statsMode: (d) => { UI.statsMode = d.v; render(); },
    statsNav: (d) => {
      const [y, m] = UI.statsYM.split('-').map(Number);
      const n = UI.statsMode === 'an' ? new Date(y + (+d.d), m - 1, 1) : new Date(y, m - 1 + (+d.d), 1);
      UI.statsYM = n.getFullYear() + '-' + FC.pad(n.getMonth() + 1); render();
    },
    statsYM: (d) => { UI.statsYM = d.v; UI.statsMode = 'luna'; render(); },
    statsCat: (d) => { UI.statsCat = d.c && UI.statsCat !== d.c ? d.c : null; render(); },
    histF: (d) => { UI.histF = d.v; render(); },
    histCat: (d) => { UI.histCat = UI.histCat === d.v ? '' : d.v; render(); },
    sheet: (d) => openSheet(d.s, { id: d.id, side: d.side }),
    close: closeSheet,
    add: (d) => { UI.add = newAdd(d.k || 'expense'); openSheet('add'); },
    addSet: (d) => { if (d.k === 'kind') UI.slideFrom = ADD_KINDS.indexOf(UI.add.kind); UI.add[d.k] = d.v; if (d.k === 'kind' && d.v === 'expense') UI.add.fund = EXP(); if (d.k === 'kind' && d.v === 'fund' && UI.add.fund === EXP()) UI.add.fund = FUNDS().find((f) => f !== EXP()) || EXP(); render(); },
    key: (d) => {
      let a = String(UI.add.amount);
      if (d.k === 'del') a = a.length > 1 ? a.slice(0, -1) : '0';
      else if (d.k === ',') { if (a.indexOf(',') < 0) a += ','; }
      else if (a === '0') a = d.k;
      else if (a.split(',')[1] && a.split(',')[1].length >= 2) { /* maxim 2 zecimale */ }
      else if (a.replace(',', '').length < 9) a += d.k;
      UI.add.amount = a; render();
    },
    useSc: (d) => { const x = S.shortcuts.find((s) => s.id === d.id); if (x) { Object.assign(UI.add, x.preset, { date: FC.localISO() }); render(); } },
    saveAdd: guard(() => {
      const a = UI.add;
      const num = parseFloat(String(a.amount).replace(',', '.')) || 0;
      if (!(num > 0)) throw new Error('Scrie suma.');
      const date = a.date || FC.localISO();
      if (a.editId) {
        const patch = { amount: a.kind === 'income' && a.eur ? num * S.settings.eurRate : num, note: a.note, date };
        if (a.kind === 'expense' || a.kind === 'fund') { patch.cat = a.cat; if (a.kind === 'fund') patch.fund = a.fund; }
        if (a.kind === 'transfer') { patch.fund = a.fundFrom; patch.to = a.fundTo; }
        FC.updateTx(S, a.editId, patch);
        closeSheet(); commit('Modificat');
        return;
      }
      let p;
      if (a.kind === 'expense') p = { kind: 'expense', amount: num, cat: a.cat, note: a.note, date };
      else if (a.kind === 'fund') p = { kind: 'fund', amount: num, fund: a.fund, cat: a.cat, note: a.note, date };
      else if (a.kind === 'transfer') p = { kind: 'transfer', amount: num, fund: a.fundFrom, to: a.fundTo, note: a.note, date };
      else p = { kind: 'income', sub: a.sub, amount: a.eur ? num * S.settings.eurRate : num, eur: a.eur ? num : null, note: a.note, date };
      const t = FC.addTx(S, p);
      if (a.kind === 'income' && a.eur && a.keepEur) { const ed = S.settings.denoms.find((x) => x.cur === 'EUR'); if (ed) FC.addCash(S, ed.id, num / (ed.value || 1), 'Din ' + a.sub, date); }
      if (a.saveSc) {
        const label = a.note || (a.kind === 'income' ? a.sub : a.cat);
        S.shortcuts.push({ id: FC.uid(), label, preset: { kind: a.kind, cat: a.cat, fund: a.fund, fundFrom: a.fundFrom, fundTo: a.fundTo, sub: a.sub, note: a.note, eur: a.eur } });
      }
      closeSheet(); commit(t.kind === 'income' ? 'Venit împărțit în fonduri' : 'Salvat');
    }),
    editTx: (d) => {
      const t = S.tx.find((x) => x.id === d.id); if (!t) return;
      if (t.link || t.kind === 'adjust' || t.kind === 'invest' || t.kind === 'divest') { openSheet('txInfo', { id: t.id }); return; }
      UI.add = newAdd(t.kind, {
        editId: t.id, amount: String(t.eur || t.amount).replace('.', ','), eur: !!t.eur, cat: t.cat || S.settings.categories[0],
        fund: t.fund || EXP(), fundFrom: t.fund || FUNDS()[0], fundTo: t.to || FUNDS()[1], sub: t.sub || INC()[0], note: t.note, date: t.date
      });
      openSheet('add');
    },
    delTx: (d) => ask('Ștergi tranzacția?', 'Șterge', () => { FC.deleteTx(S, d.id); closeSheet(); commit('Șters'); }),
    cash: guard((d) => {
      const n = +d.n, item = FC.cashSummary(S).items.find((i) => i.id === d.d);
      if (n < 0 && item.count < 1) throw new Error('Nu mai ai ' + item.label + ' în pușculiță.');
      FC.addCash(S, d.d, n); commit((n > 0 ? '+1 ' : '−1 ') + item.label);
      render();
    }),
    earnStop: (d) => { const e = S.earn.find((x) => x.id === d.id); if (e) ask('Ai scos ' + e.coin + ' din Earn? Recompensele de până azi rămân în portofoliu.', 'Da, l-am scos', () => { FC.earnStop(S, d.id); closeSheet(); commit('Scos din Earn'); }); },
    savDel: (d) => ask('Ștergi operațiunea?', 'Șterge', () => { const tx = S.tx.find((t) => t.link === d.id); if (tx) FC.deleteTx(S, tx.id); else S.savings = S.savings.filter((e) => e.id !== d.id); commit('Șters'); render(); }),
    formSet: (d) => { UI.form[d.k] = d.v; render(); },
    catDel: (d) => ask('Ștergi categoria „' + d.c + '”? Tranzacțiile vechi o păstrează.', 'Șterge', () => { S.settings.categories = S.settings.categories.filter((c) => c !== d.c); commit(); render(); }),
    cashOrd: (d) => { const o = S.settings.cashOrder, i = o.indexOf(d.f), j = i + (+d.d); if (i < 0 || j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; commit(); render(); },
    cashOrdDel: (d) => { S.settings.cashOrder = S.settings.cashOrder.filter((f) => f !== d.f); commit(); render(); },
    editFund: (d) => { UI.editFund = UI.editFund === d.f ? null : d.f; render(); },
    fundColor: (d) => { FC.fundInfo(S, d.f).color = d.c; commit(); render(); },
    fundIcon: (d) => { FC.fundInfo(S, d.f).icon = d.i; commit(); render(); },
    fundArchive: guard((d) => { const f = FC.fundInfo(S, d.f); FC.setFundArchived(S, d.f, !f.archived); UI.editFund = null; commit(f.archived ? 'Fond arhivat' : 'Fond activ din nou'); render(); }),
    incDel: (d) => ask('Ștergi tipul de venit „' + d.t + '”?', 'Șterge', () => { FC.deleteIncomeType(S, d.t); commit('Șters'); render(); }),
    denomDel: guard((d) => { FC.deleteDenom(S, d.id); commit('Ștearsă'); render(); }),
    scDel: (d) => { S.shortcuts = S.shortcuts.filter((x) => x.id !== d.id); commit(); render(); },
    recDel: (d) => ask('Ștergi plata recurentă?', 'Șterge', () => { S.recurring = S.recurring.filter((r) => r.id !== d.id); closeSheet(); commit('Ștearsă'); }),
    exportJson: () => exportFile('json'),
    exportEnc: () => askPass('Alege o parolă pentru backup', true, (pw) => exportFile('enc', pw)),
    exportXlsx: () => exportFile('xlsx'),
    wipe: () => ask('Ștergi TOATE datele de pe telefon? Nu se poate anula, așa că fă un export înainte.', 'Șterge tot', () => { S = FC.emptyState(); save(); UI.page = null; render(); toast('Date șterse'); })
  };

  const forms = {
    setup: (f) => {
      const name = f.name.value.trim();
      if (!name) throw new Error('Scrie-ți numele.');
      S.settings.name = name;
      FC.setPet(S, f.pet.value); FC.setBank(S, f.bank.value);
      S.settings.profile.exchange = f.exchange.value.trim() || 'Binance';
      S.settings.setupDone = true; UI.tab = 'home'; UI.page = null;
      commit('Gata, ' + name + '!'); render();
    },
    fundAdd: (f) => { FC.addFund(S, f.n.value); UI.openSet.funds = true; commit('Fond adăugat. Setează-i procentele la Venituri.'); render(); },
    incAdd: (f) => { FC.addIncomeType(S, f.n.value); UI.openSet.inc = true; commit('Adăugat. Pornește cu 100% la ' + EXP() + '; ajustează procentele.'); render(); },
    denomAdd: (f) => { FC.addDenom(S, f.label.value, num(f.value), f.cur.value); commit('Bancnotă adăugată'); render(); },
    catAdd: (f) => { const c = f.c.value.trim(); if (!c) return; if (S.settings.categories.indexOf(c) < 0) S.settings.categories.push(c); commit('Categorie adăugată'); render(); },
    deposit: (f) => { FC.cryptoDeposit(S, { usd: num(f.usd), lei: num(f.lei), refRate: UI.form.ref, date: f.date.value }); closeSheet(); commit('Depunere salvată'); },
    trade: (f) => {
      const side = UI.form.side || UI.args.side || 'buy';
      FC.cryptoTrade(S, { side, coin: f.coin.value, qty: num(f.qty), usd: num(f.usd), date: f.date.value });
      closeSheet(); commit(side === 'buy' ? 'Cumpărare salvată' : 'Vânzare salvată'); refreshMarket(false).then(startLive);
    },
    withdraw: (f) => { FC.cryptoWithdraw(S, { usd: num(f.usd), lei: num(f.lei), fund: f.fund.value, date: f.date.value }); closeSheet(); commit('Retragere salvată'); },
    earnFix: (f) => { const d = FC.earnFix(S, f.id.value, num(f.qty)); closeSheet(); commit(d >= 0 ? 'Salvat: +' + qty(+d.toFixed(8)) + ' recompensă' : 'Salvat'); },
    reward: (f) => { FC.cryptoReward(S, { coin: f.coin.value, qty: num(f.qty), date: f.date.value }); closeSheet(); commit('Recompensă adăugată'); },
    earnAdd: (f) => {
      const apr = num(f.apr) / 100;
      if (!f.coin.value.trim() || !(num(f.qty) > 0) || !(apr > 0)) throw new Error('Completează moneda, cantitatea și APR-ul.');
      S.earn.push({ id: FC.uid(), coin: f.coin.value.trim().toUpperCase(), qty: num(f.qty), type: f.type.value, apr, start: f.start.value || FC.localISO().slice(0, 10), end: f.end.value || null, active: true });
      closeSheet(); commit('Salvat în Earn'); refreshMarket(false).then(startLive);
    },
    savDep: (f) => { FC.savingsDeposit(S, num(f.amount), f.date.value); closeSheet(); commit('Depus în economii'); },
    savWd: (f) => { FC.savingsWithdraw(S, num(f.amount), f.fund.value, f.date.value); closeSheet(); commit('Retras din economii'); },
    savInt: (f) => { FC.setInterestReal(S, f.id.value, num(f.amount)); closeSheet(); commit('Dobândă salvată'); },
    savSet: (f) => { const v = num(f.amount); if (!(v >= 0)) throw new Error('Scrie soldul.'); S.savings.push({ id: FC.uid(), kind: 'set', date: FC.localISO(), amount: FC.r2(v), note: 'din aplicația băncii' }); closeSheet(); commit('Sold actualizat'); },
    cashAdd: (f) => {
      const n = num(f.count) * (+f.dir.value);
      if (!n) throw new Error('Scrie câte.');
      const it = FC.cashSummary(S).items.find((i) => i.id === f.denom.value);
      if (n < 0 && it.count + n < -1e-9) throw new Error('Ai doar ' + it.count + '.');
      FC.addCash(S, f.denom.value, n); closeSheet(); commit('Pușculița actualizată');
    },
    eurExchange: (f) => { const r = FC.exchangeEur(S, num(f.eur), num(f.lei)); closeSheet(); commit(r.diff > 0 ? '+' + fmt(r.diff, 2) + ' lei la ' + S.settings.eurGainType : r.diff < 0 ? 'Pierdere ' + fmt(-r.diff, 2) + ' lei' : 'Schimb salvat'); },
    goalEdit: (f) => {
      const target = num(f.target), name = f.name.value.trim();
      if (!name || !(target > 0)) throw new Error('Scrie ce vrei și cât costă.');
      const data = { name, target: FC.r2(target), fund: f.fund.value, by: f.by.value || null };
      const id = f.id.value;
      if (id) Object.assign(S.goals.find((g) => g.id === id), data); else S.goals.push(Object.assign({ id: FC.uid(), done: false, created: FC.localISO() }, data));
      closeSheet(); commit('Obiectiv salvat');
    },
    recEdit: (f) => {
      const id = f.id.value, amount = num(f.amount), day = Math.min(31, Math.max(1, parseInt(f.day.value, 10) || 1));
      if (!(amount > 0) || !f.note.value.trim()) throw new Error('Completează numele și suma.');
      const now = new Date();
      const thisYM = now.getFullYear() + '-' + FC.pad(now.getMonth() + 1);
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevYM = prev.getFullYear() + '-' + FC.pad(prev.getMonth() + 1);
      const data = { note: f.note.value.trim(), amount, day, cat: f.cat.value, active: f.active.checked, kind: 'expense', fund: EXP() };
      if (id) Object.assign(S.recurring.find((r) => r.id === id), data);
      else S.recurring.push(Object.assign({ id: FC.uid(), lastYM: day <= now.getDate() ? thisYM : prevYM }, data));   // nu dublează luna curentă dacă ai plătit deja
      closeSheet(); commit('Salvat');
    }
  };
  function num(v) { const s = v && v.value !== undefined ? v.value : v; return parseFloat(String(s == null ? '' : s).replace(/\s/g, '').replace(',', '.')); }

  /* --- setări care se schimbă direct din câmp --- */
  function onSettingInput(el) {
    const s = S.settings, k = el.dataset.a2, v = num(el.value);
    if (k === 'split') { if (v >= 0 && v <= 100) s.splits[el.dataset.t][el.dataset.f] = v / 100; }
    else if (k === 'negPriority') { if (v >= 0 && v <= 100) s.negPriority = v / 100; }
    else if (k === 'eurRate') { if (v > 0) s.eurRate = v; }
    else if (k === 'bin') { if (v >= 0) s.binance[el.dataset.k] = v / 100; }
    else if (k === 'sav') { if (el.dataset.k === 'name') s.savings.name = el.value; else if (v >= 0) s.savings[el.dataset.k] = v / 100; }
    else if (k === 'name') s.name = el.value;
    else if (k === 'recentCount') { if (v >= 1 && v <= 30) s.home.recentCount = Math.round(v); }
    else if (k === 'lockAfterMin') { if (v >= 0) s.lockAfterMin = v; }
    else if (k === 'exportRemindDays') { if (v >= 1) s.exportRemindDays = Math.round(v); }
    else if (k === 'payDay') { if (v >= 1 && v <= 31) s.savings.payDay = Math.round(v); else return false; }
    else if (k === 'monthStart') { if (v >= 1 && v <= 28) { s.monthStart = Math.round(v); UI.statsYM = curYM(); } else return false; }
    else return false;
    save(); return true;
  }

  /* ================= export / import ================= */
  async function shareOrDownload(blob, name) {
    const file = new File([blob], name, { type: blob.type });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return true; }
    } catch (e) { if (e && e.name === 'AbortError') return false; }
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  }
  async function exportFile(kind, pw) {
    const day = FC.localISO().slice(0, 10);
    let ok;
    if (kind === 'json' || kind === 'enc') {
      const data = Object.assign({}, S, { exportedAt: new Date().toISOString(), app: 'Fonduri' });
      data.settings = Object.assign({}, S.settings, { lock: { enabled: false, credId: null } });   // cheia Face ID ține de telefonul ăsta
      let out = data;
      if (kind === 'enc') { toast('Criptez…'); out = await encryptBackup(data, pw); }
      ok = await shareOrDownload(new Blob([JSON.stringify(out)], { type: 'application/json' }), 'fonduri-backup-' + day + (kind === 'enc' ? '-parola' : '') + '.json');
    } else {
      if (!window.XLSX) { toast('Biblioteca Excel nu s-a încărcat.', true); return; }
      const rows = FC.exportRows(S), wb = XLSX.utils.book_new();
      Object.keys(rows).forEach((k) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows[k].length ? rows[k] : [{ '': 'gol' }]), k));
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      ok = await shareOrDownload(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'fonduri-' + day + '.xlsx');
    }
    if (ok) { S.settings.lastExport = new Date().toISOString(); save(); closeSheet(); toast('Export gata'); }
  }
  function importFile(file) {
    const rd = new FileReader();
    rd.onload = guard(() => {
      const obj = JSON.parse(rd.result);
      if (obj && obj.enc) {
        askPass('Parola backup-ului', false, async (pw) => {
          try { proceedImport(await decryptBackup(obj, pw)); }
          catch (e) { toast('Parolă greșită sau fișier stricat.', true); }
        });
        return;
      }
      proceedImport(obj);
    });
    rd.readAsText(file);
  }
  function proceedImport(obj) {
    guard(() => {
      const st = FC.validateBackup(obj);
      const n = st.tx.length;
      ask('Import ' + n + ' tranzacții. Datele de acum de pe telefon se înlocuiesc.', 'Importă', () => {
      const keepLock = S.settings.lock;
      if (obj.fonduriImport) st.settings = Object.assign(st.settings, { discreet: S.settings.discreet });
      st.settings.lock = keepLock;
      S = st; FC.runRecurring(S); FC.accrueSavings(S); commit('Import reușit: ' + n + ' tranzacții');
      UI.page = null; UI.tab = 'home'; render(); refreshMarket(false);
      });
    })();
  }

  /* ================= backup criptat (PBKDF2 + AES-GCM, direct în browser) ================= */
  const ITER = 310000;
  function bytesB64(buf) {
    const u = new Uint8Array(buf); let s = '';
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }
  async function passKey(pw, salt, iter) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encryptBackup(obj, pw) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await passKey(pw, salt, ITER);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
    return { app: 'Fonduri', enc: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iter: ITER, salt: bytesB64(salt), iv: bytesB64(iv), data: bytesB64(ct), exportedAt: new Date().toISOString() };
  }
  async function decryptBackup(o, pw) {
    const key = await passKey(pw, unb64(o.salt), o.iter || ITER);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv) }, key, unb64(o.data));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  /* cere parola în aplicație (o dată la import, de două ori la export) */
  function askPass(title, twice, onOk) {
    const d = document.createElement('div');
    d.className = 'ask';
    d.innerHTML = '<form class="ask-box col" style="gap:12px" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><p style="margin:0;font-weight:600">' + esc(title) + '</p>' +
      '<input class="input" type="password" name="p1" autocomplete="' + (twice ? 'new-password' : 'current-password') + '" placeholder="Parola" aria-label="Parola" required minlength="' + (twice ? 6 : 1) + '">' +
      (twice ? '<input class="input" type="password" name="p2" autocomplete="new-password" placeholder="Încă o dată" aria-label="Parola încă o dată" required><span class="tiny muted" style="line-height:1.5">Minim 6 caractere. Ține-o într-un loc sigur: fără ea backup-ul nu se mai poate deschide.</span>' : '') +
      '<span class="tiny red" data-err></span><div class="grid2"><button type="button" class="btn" data-x="no">Renunță</button><button type="submit" class="btn primary">' + (twice ? 'Exportă' : 'Deschide') + '</button></div></form>';
    document.body.appendChild(d);
    const f = d.querySelector('form'); f.p1.focus();
    d.addEventListener('click', (ev) => { if (ev.target === d || (ev.target.closest('[data-x="no"]'))) d.remove(); });
    f.addEventListener('submit', (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      if (twice && f.p1.value !== f.p2.value) { d.querySelector('[data-err]').textContent = 'Parolele nu sunt la fel.'; return; }
      const pw = f.p1.value; d.remove(); onOk(pw);
    });
  }

  /* ================= prețuri + curs ================= */
  const BIN = 'https://data-api.binance.vision/api/v3/ticker/24hr';
  const FX = 'https://api.frankfurter.dev/v1/';
  async function fetchJSON(url, ms) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), ms || 9000);
    try { const r = await fetch(url, { signal: c.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    finally { clearTimeout(t); }
  }
  /* prețuri în timp real: flux WebSocket de la Binance; dacă nu merge, reîncărcăm la fiecare minut */
  let ws = null, liveDirty = false, wsRetry = null;
  function liveCoins() {
    const rp = FC.cryptoReplay(S);
    const set = {};
    Object.keys(rp.coins).forEach((c) => { if (rp.coins[c].qty > 1e-12) set[c] = 1; });
    S.earn.forEach((e) => { if (e.active !== false) set[e.coin] = 1; });
    set.BNB = 1; delete set.USDT; delete set.USDC;
    return Object.keys(set);
  }
  function startLive() {
    try { if (ws) { ws.onclose = null; ws.close(); } } catch (e) { /* deja închis */ }
    ws = null; clearTimeout(wsRetry);
    if (!S.settings.live.enabled || document.hidden || !('WebSocket' in window)) return;
    const coins = liveCoins();
    if (!coins.length) return;
    try {
      ws = new WebSocket('wss://data-stream.binance.vision/stream?streams=' + coins.map((c) => c.toLowerCase() + 'usdt@miniTicker').join('/'));
    } catch (e) { ws = null; return; }
    ws.onmessage = (m) => {
      try {
        const d = JSON.parse(m.data).data; if (!d || !d.s) return;
        const c = parseFloat(d.c), o = parseFloat(d.o);
        S.prices[d.s.replace(/USDT$/, '')] = { p: c, ch: o ? (c - o) / o * 100 : 0, ts: Date.now() };
        liveDirty = true;
      } catch (e) { /* mesaj greșit, îl ignorăm */ }
    };
    ws.onclose = () => { ws = null; if (S.settings.live.enabled && !document.hidden) wsRetry = setTimeout(startLive, 8000); };
  }
  const isLive = () => !!(ws && ws.readyState === 1);
  setInterval(() => {
    if (!liveDirty || document.hidden || UI.sheet || UI.page || document.querySelector('.ask')) return;
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT')) return;
    if (UI.tab !== 'invest' && UI.tab !== 'home') return;
    liveDirty = false; render();
  }, 2000);
  setInterval(() => { if (!document.hidden) { if (!isLive() && S.settings.live.enabled) refreshMarket(false); else { save(); } } }, 60000);
  let refreshing = false;
  async function refreshMarket(manual) {
    if (refreshing) return; refreshing = true;
    const rp = FC.cryptoReplay(S);
    const coins = Object.keys(rp.coins).filter((c) => rp.coins[c].qty > 1e-12 && c !== 'USDT' && c !== 'USDC');
    if (coins.indexOf('BNB') < 0) coins.push('BNB');
    let ok = 0, fail = 0;
    try {
      const fx = await fetchJSON(FX + 'latest?base=USD&symbols=RON');
      if (fx && fx.rates && fx.rates.RON) { S.fx.usdRon = fx.rates.RON; S.fx.ts = Date.now(); }
    } catch (e) { fail++; }
    const put = (t) => { S.prices[t.symbol.replace(/USDT$/, '')] = { p: parseFloat(t.lastPrice), ch: parseFloat(t.priceChangePercent), ts: Date.now() }; ok++; };
    try {
      const data = await fetchJSON(BIN + '?symbols=' + encodeURIComponent(JSON.stringify(coins.map((c) => c + 'USDT'))));
      data.forEach(put);
    } catch (e) {
      // o monedă fără pereche USDT strică cererea comună: le luăm pe rând
      await Promise.all(coins.map(async (c) => { try { put(await fetchJSON(BIN + '?symbol=' + c + 'USDT', 7000)); } catch (er) { fail++; } }));
    }
    refreshing = false;
    save(); FC.snapshot(S); save();
    if (manual) toast(ok ? 'Prețuri actualizate' : 'Nu am putut lua prețurile acum. Încearcă din nou.', !ok);
    if (!UI.sheet || manual) render();
  }
  async function loadRefRate(dateStr) {
    const d = (dateStr || FC.localISO()).slice(0, 10);
    if (S.fx.byDate[d]) { UI.form.ref = S.fx.byDate[d]; return; }
    UI.form.refLoading = true;
    try {
      const fx = await fetchJSON(FX + d + '?base=USD&symbols=RON');
      if (fx && fx.rates && fx.rates.RON) { S.fx.byDate[d] = fx.rates.RON; UI.form.ref = fx.rates.RON; save(); }
    } catch (e) { UI.form.ref = null; }
    UI.form.refLoading = false;
    if (UI.sheet === 'deposit') render();
  }

  /* ================= Face ID (passkey local) ================= */
  const b64 = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));
  async function enableLock() {
    if (!window.PublicKeyCredential) throw new Error('Telefonul nu permite Face ID aici.');
    const cred = await navigator.credentials.create({ publicKey: {
      challenge: rnd(32), rp: { name: 'Fonduri', id: location.hostname },
      user: { id: rnd(16), name: 'fonduri', displayName: 'Fonduri' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' }, timeout: 60000
    } });
    S.settings.lock = { enabled: true, credId: b64(cred.rawId) }; save();
  }
  let unlocked = false, hiddenAt = 0;
  async function unlock() {
    const btn = document.getElementById('unlockBtn');
    try {
      await navigator.credentials.get({ publicKey: {
        challenge: rnd(32), rpId: location.hostname, userVerification: 'required', timeout: 60000,
        allowCredentials: [{ type: 'public-key', id: unb64(S.settings.lock.credId) }]
      } });
      unlocked = true; fails = 0; document.querySelector('.lock') && document.querySelector('.lock').remove();
      afterUnlock();
    } catch (e) {
      fails++;
      if (btn) btn.textContent = 'Încearcă din nou';
      // portiță: dacă cheia Face ID s-a pierdut (ex. iPhone resetat), nu rămâi blocat pe dinafară
      if (fails >= 3 && !document.getElementById('lockOff')) {
        const a = document.createElement('button');
        a.id = 'lockOff'; a.className = 'link'; a.textContent = 'Nu mai merge Face ID? Oprește blocarea';
        a.addEventListener('click', () => {
          ask('Oprești blocarea cu Face ID? O poți porni din nou din Setări.', 'Oprește', () => {
            S.settings.lock = { enabled: false, credId: null }; save();
            document.querySelector('.lock').remove(); afterUnlock();
          });
        });
        document.querySelector('.lock').appendChild(a);
      }
    }
  }
  let fails = 0;
  function showLock() {
    unlocked = false;
    if (document.querySelector('.lock')) return;
    const d = document.createElement('div');
    d.className = 'lock';
    d.innerHTML = '<span class="badge" style="width:72px;height:72px;border-radius:24px;background:var(--violet);color:#fff">' + ic('face', 36) + '</span><h1 style="font-size:26px">Fonduri e blocat</h1><button id="unlockBtn" class="btn primary" style="min-width:220px">Deblochează cu Face ID</button>';
    document.body.appendChild(d);
    d.querySelector('button').addEventListener('click', unlock);
    unlock();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); save(); startLive(); }
    else if (unlocked || !S.settings.lock.enabled) { startLive(); refreshMarket(false); }
    if (document.hidden) return;
    else if (S.settings.lock.enabled && hiddenAt && Date.now() - hiddenAt > (S.settings.lockAfterMin || 0) * 60000) showLock();
  });

  /* ================= evenimente ================= */
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-a]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.a];
    if (fn) { ev.preventDefault(); fn(el.dataset, el); }
  });
  /* glisezi stânga / dreapta pe sumă ca să schimbi tipul tranzacției */
  let sw0 = null;
  document.addEventListener('touchstart', (ev) => {
    const p = ev.target.closest('[data-swipe="kind"]');
    sw0 = p && !ev.target.closest('.chips') && UI.add && !UI.add.editId ? { x: ev.touches[0].clientX, y: ev.touches[0].clientY } : null;
  }, { passive: true });
  document.addEventListener('touchend', (ev) => {
    if (!sw0) return;
    const t = ev.changedTouches[0], dx = t.clientX - sw0.x, dy = t.clientY - sw0.y; sw0 = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > 40) return;
    const i = ADD_KINDS.indexOf(UI.add.kind), j = i + (dx < 0 ? 1 : -1);
    if (j < 0 || j >= ADD_KINDS.length) return;
    actions.addSet({ k: 'kind', v: ADD_KINDS[j] });
  }, { passive: true });
  document.addEventListener('toggle', (ev) => {
    const d = ev.target; if (d && d.dataset && d.dataset.set) UI.openSet[d.dataset.set] = d.open;
  }, true);
  document.addEventListener('submit', (ev) => {
    const f = ev.target.closest('[data-form]'); if (!f) return;
    ev.preventDefault();
    guard(forms[f.dataset.form])(f.elements);
  });
  document.addEventListener('input', (ev) => {
    const el = ev.target;
    if (el.dataset.bind) {
      const path = el.dataset.bind.split('.');
      if (path[0] === 'add') UI.add[path[1]] = el.value; else UI[path[0]] = el.value;
      if (el.dataset.live) render();
      return;
    }
    if (el.dataset.live) {
      UI.form[el.dataset.live] = el.value;
      if (UI.sheet === 'deposit' && el.dataset.live === 'date') { UI.form.ref = null; loadRefRate(el.value); }
      clearTimeout(window._lt); window._lt = setTimeout(() => {
        const pos = el.selectionStart, id = el.id; render();
        const n = document.getElementById(id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* date */ } }
      }, 350);
      return;
    }
    if (el.dataset.a2 && el.type !== 'checkbox' && el.type !== 'file') onSettingInput(el);
  });
  document.addEventListener('change', guard(async (ev) => {
    const el = ev.target, k = el.dataset.a2;
    if (!k) return;
    if (k === 'import') { if (el.files[0]) importFile(el.files[0]); el.value = ''; return; }
    if (k === 'addEur') { UI.add.eur = el.checked; render(); return; }
    if (k === 'addKeep') { UI.add.keepEur = el.checked; return; }
    if (k === 'addSc') { UI.add.saveSc = el.checked; return; }
    if (k === 'binBnb') { S.settings.binance.payFeeInBnb = el.checked; save(); return; }
    if (k === 'live') { S.settings.live.enabled = el.checked; save(); startLive(); return; }
    if (k === 'home') { S.settings.home[el.dataset.k] = el.checked; save(); return; }
    if (k === 'pet') { FC.setPet(S, el.value); commit('Salvat'); render(); return; }
    if (k === 'bank') { FC.setBank(S, el.value); commit('Salvat'); render(); return; }
    if (k === 'exchange') { S.settings.profile.exchange = el.value.trim() || 'Binance'; commit('Salvat'); render(); return; }
    if (k === 'eurGain') { S.settings.eurGainType = el.value; commit('Salvat'); return; }
    if (k === 'avail') {
      const cur = FC.availableFunds(S).filter((f) => f !== el.dataset.f);
      if (el.checked) cur.push(el.dataset.f);
      if (!cur.length) { el.checked = true; throw new Error('Lasă cel puțin un fond bifat.'); }
      S.settings.available = FUNDS().filter((f) => cur.indexOf(f) >= 0); save(); return;
    }
    if (k === 'homeRange') { S.settings.homeRange = +el.value; UI.range = +el.value; save(); return; }
    if (k === 'startTab') { S.settings.startTab = el.value; save(); toast('Data viitoare pornește pe ' + el.options[el.selectedIndex].text); return; }
    if (k === 'fundName') { FC.renameFund(S, el.dataset.f, el.value); UI.editFund = el.value.trim(); commit('Fond redenumit'); render(); return; }
    if (k === 'incName') { FC.renameIncomeType(S, el.dataset.t, el.value); commit('Redenumit'); render(); return; }
    if (k === 'catName') { FC.renameCategory(S, el.dataset.c, el.value); commit('Categorie redenumită'); render(); return; }
    if (k === 'scName') { const x = S.shortcuts.find((y) => y.id === el.dataset.id); if (x && el.value.trim()) { x.label = el.value.trim(); commit(); } return; }
    if (k === 'cashOrdAdd') { if (el.value) { S.settings.cashOrder.push(el.value); commit(); render(); } return; }
    if (k === 'role') {
      if (el.dataset.k === 'expenseFund') S.settings.expenseFund = el.value;
      else if (el.dataset.k === 'cryptoFund') S.settings.binance.cryptoFund = el.value;
      else S.settings.savings.fund = el.value;
      commit('Salvat'); render(); return;
    }
    if (k === 'discreet') { S.settings.discreet = el.checked; save(); render(); return; }
    if (k === 'lock') {
      if (el.checked) { try { await enableLock(); toast('Face ID activat'); } catch (e) { el.checked = false; throw new Error(e.message && e.name !== 'NotAllowedError' ? e.message : 'Face ID nu a fost activat.'); } }
      else { S.settings.lock = { enabled: false, credId: null }; save(); toast('Face ID oprit'); }
      return;
    }
    if (onSettingInput(el)) render();
  }));
  // la deschiderea foii de depunere încărcăm cursul BCE
  const _open = openSheet;
  openSheet = function (name, args) { _open(name, args); if (name === 'deposit') loadRefRate(UI.form.date); };

  /* ================= pornire ================= */
  function afterUnlock() {
    unlocked = true;
    const a = FC.runRecurring(S), b = FC.accrueSavings(S);
    commit(a ? a + (a === 1 ? ' plată recurentă adăugată' : ' plăți recurente adăugate') : null);
    if (b) toast('Dobânda la economii a fost adăugată');
    render();
    refreshMarket(false).then(startLive);
  }
  render();
  if (S.settings.lock.enabled && S.settings.lock.credId) showLock(); else afterUnlock();

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
