(function () {
  'use strict';

  const R = window.MT_RATES;
  const COV = window.MT_COVERAGE;
  const AGENT = window.MT_AGENT;
  const BRANDS = window.MT_BRANDS.map((b) => ({
    ...b,
    models: b.models.map(([name, kind, from, to]) => ({ name, kind, from, to })),
  }));
  const THIS_YEAR = new Date().getFullYear();
  const OLDEST_YEAR = THIS_YEAR - 30;
  const STORE_KEY = 'mt-quote-state-v2';
  const TOP_MODELS = 8;
  const TOP_YEARS = 6;
  const MAX_PICKS = 4; // จำนวนแผนสูงสุดต่อใบเสนอราคา (ให้ตารางเปรียบเทียบยังอยู่ใน A4 หน้าเดียว)
  const PAGE_W = 794; // A4 ที่ 96dpi
  const PAGE_H = 1122;

  const KINDS = {
    car: { label: 'รถเก๋ง / SUV / PPV', short: 'เก๋ง / SUV' },
    pickup: { label: 'รถกระบะ (ไม่เกิน 4 ตัน)', short: 'กระบะ' },
    van: { label: 'รถตู้ (ไม่เกิน 15 ที่นั่ง)', short: 'รถตู้' },
    truck6: { label: 'รถบรรทุก 6 ล้อ (ไม่เกิน 12 ตัน)', short: 'บรรทุก 6 ล้อ' },
    truck10: { label: 'รถบรรทุก 10 ล้อ (เกิน 12 ตัน)', short: 'บรรทุก 10 ล้อ' },
  };
  const BODY_LABEL = {
    standard: 'กระบะทั่วไป',
    fridge: 'ต่อเติมตู้ทึบ/ตู้แห้ง/ตู้เย็น',
    plain: 'ไม่มีอุปกรณ์พิเศษ',
    equip: 'มีอุปกรณ์พิเศษ',
  };
  const TIER_TH = { PLATINUM: 'แพลทินัม', GOLD: 'โกลด์', SILVER: 'ซิลเวอร์' };
  const CLS_CLASS = { '2+': 'c2p', '3+': 'c3p', 3: 'c3' };
  const CLS_ORDER = { '2+': 0, '3+': 1, 3: 2 };
  const TIER_ORDER = { PLATINUM: 0, GOLD: 1, SILVER: 2 };

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const round2 = (n) => Math.round(n * 100) / 100;
  const money = (n) => {
    n = round2(n);
    return n.toLocaleString('th-TH', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
  };
  const signed = (n) => `${n < 0 ? '-' : '+'}${money(Math.abs(n))}`;
  const yearLabel = (y) => `${y} (${y + 543})`;
  // รับได้ทั้ง ISO timestamp และ YYYY-MM-DD (อย่างหลังต้องแยกเองไม่ให้เพี้ยนตาม timezone)
  const thDate = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const ICONS = {
    check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    x: '<path d="M7 7l10 10M17 7L7 17"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    camera: '<path d="M4 8.5h3.2L9 6h6l1.8 2.5H20V19H4z"/><circle cx="12" cy="13.3" r="3.2"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.2M12 17.2v.1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.1"/>',
    share: '<circle cx="17.5" cy="5.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/><path d="M8.7 10.7l6.6-3.9M8.7 13.3l6.6 3.9"/>',
    print: '<path d="M7 9V4h10v5"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
    doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    table: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 10h17M3.5 14.5h17M9.5 5v14"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.7"/><path d="M20.5 16l-5-5-9 8.5"/>',
    car: '<path d="M3.5 16.5v-4.2L5.8 7h12.4l2.3 5.3v4.2z"/><path d="M3.5 12.3h17"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>',
    truck: '<path d="M2.5 6.5h11v10h-11zM13.5 10h4.5l3.5 3.5v3h-8z"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z"/><path d="M8.7 12l2.3 2.3 4.3-4.6"/>',
    refresh: '<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 5v6h-6"/>',
    phone: '<path d="M5.5 3.5h3.2l1.8 4.6-2.2 1.4a11.5 11.5 0 006.2 6.2l1.4-2.2 4.6 1.8v3.2a2 2 0 01-2.1 2A16.5 16.5 0 013.5 5.6a2 2 0 012-2.1z"/>',
  };
  const icon = (name, cls = '') =>
    `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

  // ---------- state ----------
  const initialState = () => ({
    view: 'search',
    brandId: null,
    customBrand: '',
    modelName: null,
    customModel: false,
    customModelName: '',
    customKind: null,
    year: null,
    body: null,
    usage: 'personal',
    deduct: true,
    filter: 'all',
    sums: { plus2: 100000, plus3: 100000, dealer: 100000 },
    // แผนที่เลือกลงใบเสนอราคา: { key, sum (เฉพาะ 2+/3+), deduct (null = ไม่มีตัวเลือก Deduct) }
    picks: [],
    picksSig: null,
    addons: { cmi: false },
    customer: { name: '', phone: '' },
    quote: null,
    covGroup: 0,
    // ใบแจ้งออกกรมธรรม์: pick = แผนที่ลูกค้าตกลงทำ (pickId), no/date ออกตอนสร้างเอกสาร
    issue: {
      pick: null, no: null, date: null,
      idNo: '', birthDate: '', email: '',
      plate: '', province: '', chassis: '', engine: '', color: '',
      startDate: '', address: '', note: '',
    },
  });

  let state = initialState();

  const ATTACH_GROUPS = [
    { id: 'book', label: 'สำเนาเล่มทะเบียนรถ', hint: 'หน้าที่มีเลขทะเบียนและชื่อผู้ครอบครอง' },
    { id: 'idcard', label: 'สำเนาบัตรประชาชน', hint: 'ถ่ายให้เห็นชัดทั้งใบ' },
    { id: 'other', label: 'เอกสารอื่นๆ', hint: 'เช่น ใบขับขี่ กรมธรรม์เดิม แบบฟอร์มอุปกรณ์ต่อเติม' },
  ];
  // รูปแนบเก็บในหน่วยความจำเท่านั้น — ใหญ่เกินโควตา sessionStorage
  const emptyAttachments = () => ({ book: [], idcard: [], other: [] });
  let attachments = emptyAttachments();
  let attachSeq = 0;
  let attachPending = 0;
  const attachItems = () => ATTACH_GROUPS.flatMap((g) => attachments[g.id].map((a) => ({ ...a, label: g.label })));
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null');
    if (saved) state = { ...state, ...saved };
  } catch (e) { /* storage unavailable */ }

  const save = () => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  };

  function getBrand() {
    if (state.brandId === 'other') {
      return { id: 'other', name: state.customBrand || 'ยี่ห้ออื่นๆ', th: '', group: 'other', models: [] };
    }
    return BRANDS.find((b) => b.id === state.brandId) || null;
  }

  function getModel() {
    const brand = getBrand();
    if (!brand) return null;
    if (state.customModel) return { name: state.customModelName.trim(), kind: state.customKind, custom: true };
    return brand.models.find((m) => m.name === state.modelName) || null;
  }

  function yearsFor(model) {
    const from = Math.max(model && model.from ? model.from : OLDEST_YEAR, OLDEST_YEAR);
    const to = Math.min(model && model.to ? model.to : THIS_YEAR, THIS_YEAR);
    const ys = [];
    for (let y = to; y >= from; y--) ys.push(y);
    return ys;
  }

  const needsBody = (kind) => kind === 'pickup' || kind === 'truck6' || kind === 'truck10';

  function isComplete() {
    const m = getModel();
    return !!(getBrand() && m && m.kind && state.year && (!needsBody(m.kind) || state.body));
  }

  const carSig = () => JSON.stringify([state.brandId, state.customBrand, state.modelName, state.customModel, state.customKind, state.year, state.body]);

  function vehicle() {
    const brand = getBrand();
    const model = getModel();
    const kind = model.kind;
    const code = kind === 'car' ? (state.usage === 'commercial' ? '120' : '110') : kind === 'van' ? '210' : '320';
    return {
      brand,
      model,
      kind,
      code,
      year: state.year,
      age: THIS_YEAR - state.year,
      body: needsBody(kind) ? state.body : null,
      name: [brand.name, model.name].filter(Boolean).join(' '),
    };
  }

  // ---------- premium engine ----------
  function plusBlockReason(v) {
    if (v.kind !== 'car' && v.kind !== 'pickup') return 'ป.2+ และ ป.3+ รับเฉพาะรถเก๋ง (รหัส 110) และรถกระบะไม่เกิน 4 ตัน (รหัส 320)';
    if (v.kind === 'car' && state.usage === 'commercial') return 'ป.2+ และ ป.3+ รับเฉพาะรถใช้ส่วนบุคคล';
    if (v.brand.group === 'luxury') return `${v.brand.name} ไม่อยู่ในตารางเบี้ย ป.2+ / ป.3+ (รับเฉพาะรถญี่ปุ่นและรถตลาด) หากต้องการให้สอบถามฝ่ายรับประกันภัย`;
    if (v.brand.group === 'super') return `${v.brand.name} เป็นรถกลุ่ม Super Car ไม่สามารถซื้อตามตารางเบี้ยได้ กรุณาติดต่อฝ่ายรับประกันภัย`;
    return null;
  }

  const plusGroup = (v) => (v.kind === 'pickup' && v.body === 'fridge' ? 'fridge' : 'standard');
  const isPlusStd = (o) => o.type === 'plus' && o.pid !== 'dealer';
  const hasCompRows = (o) => o.pid === 'plus2' || o.pid === 'dealer';

  // กลุ่มราคา ป.2+ ซ่อมห้าง ของรถคันนี้ (null = ไม่อยู่ในรายชื่อรุ่นที่รับ)
  function dealerGroup(v) {
    const d = R.dealer;
    if (v.kind !== 'car' || v.code !== '110' || v.age > d.maxAge || !v.model || v.model.custom) return null;
    return Object.keys(d.models).find((g) => (d.models[g][v.brand.id] || []).includes(v.model.name)) || null;
  }

  // opts.sums / opts.deduct ใช้คำนวณแผนที่เลือกไว้แล้ว ถ้าไม่ส่งมาจะใช้ค่าที่แสดงอยู่ในหน้ารายการแผน
  function buildOffers(v, opts) {
    const sums = (opts && opts.sums) || state.sums;
    const deduct = opts && 'deduct' in opts ? opts.deduct : state.deduct;
    const offers = [];

    if (!plusBlockReason(v)) {
      const group = plusGroup(v);
      ['plus2', 'plus3'].forEach((pid) => {
        const p = R.plus[pid];
        const sum = p.sums.includes(sums[pid]) ? sums[pid] : p.sums[0];
        const i = p.sums.indexOf(sum);
        Object.keys(p.rates[group]).forEach((tier) => {
          const table = p.rates[group][tier];
          const fixedDeduct = !table.noDeduct;
          const useDeduct = deduct || fixedDeduct;
          offers.push({
            key: `${pid}.${tier}`,
            type: 'plus',
            pid,
            group,
            tier,
            cls: p.cls,
            product: p.name,
            planTh: `แผน ${TIER_TH[tier]}`,
            sum,
            sums: p.sums,
            deductible: useDeduct ? p.deductible : 0,
            deductAmount: p.deductible,
            fixedDeduct,
            tppdDeductible: group === 'fridge' ? R.plusRules.fridge.tppdDeductible : 0,
            price: table[useDeduct ? 'deduct' : 'noDeduct'][i],
            cov: p.coverage[tier],
          });
        });
      });

      const dg = dealerGroup(v);
      if (dg) {
        const d = R.dealer;
        const sum = d.sums.includes(sums.dealer) ? sums.dealer : d.sums[0];
        const i = d.sums.indexOf(sum);
        Object.keys(d.rates[dg]).forEach((tier) => {
          offers.push({
            key: `dealer.${tier}`,
            type: 'plus',
            pid: 'dealer',
            group: 'dealer',
            tier,
            cls: d.cls,
            product: d.name,
            planTh: `แผน ${TIER_TH[tier]}`,
            sum,
            sums: d.sums,
            deductible: 0,
            deductAmount: 0,
            fixedDeduct: true,
            tppdDeductible: 0,
            price: d.rates[dg][tier][i],
            cov: d.coverage[tier],
          });
        });
      }
    }

    if ((v.kind === 'car' || v.kind === 'pickup' || v.kind === 'van') && v.brand.group !== 'super') {
      const t = R.tawikoon;
      const rates = t.rates[v.code] || {};
      Object.keys(rates).forEach((plan) => {
        offers.push({
          key: `tawikoon.${plan}`,
          type: 'tawikoon',
          cls: t.cls,
          product: t.name,
          planTh: t.plans[plan].label,
          price: rates[plan],
          cov: t.plans[plan].coverage,
        });
      });
    }

    if (v.kind === 'truck6' || v.kind === 'truck10') {
      const t = R.truck;
      const size = t.sizes[v.kind === 'truck6' ? 'le12' : 'gt12'];
      const table = size.rates[v.body === 'equip' ? 'equip' : 'plain'][deduct ? 'deduct' : 'noDeduct'];
      t.tppdOptions.forEach((tppd, i) => {
        offers.push({
          key: `truck.${i}`,
          type: 'truck',
          cls: t.cls,
          product: `${t.name} ${size.label}`,
          planTh: `ทรัพย์สินคู่กรณี ${money(tppd)}`,
          price: table[i],
          deductible: deduct ? size.deductible : 0,
          deductAmount: size.deductible,
          tppdDeductible: deduct ? size.deductible : 0,
          cov: { ...t.coverage, tppd, bail: size.bail },
        });
      });
    }

    return offers.sort((a, b) => a.price - b.price);
  }

  // ---------- picks (หลายแผนในใบเสนอราคาเดียว) ----------
  const pickFromOffer = (o) => ({
    key: o.key,
    sum: o.type === 'plus' ? o.sum : null,
    deduct: o.type === 'tawikoon' ? null : o.deductible > 0,
  });
  const pickId = (p) => `${p.key}|${p.sum || ''}|${p.deduct === null ? '' : p.deduct ? 1 : 0}`;

  function resolvePick(v, p) {
    const sums = p.sum ? { plus2: p.sum, plus3: p.sum, dealer: p.sum } : state.sums;
    const o = buildOffers(v, { sums, deduct: p.deduct !== false }).find((x) => x.key === p.key);
    if (!o || (o.type === 'plus' && o.sum !== p.sum)) return null;
    return o;
  }

  const planOrder = (a, b) =>
    CLS_ORDER[a.cls] - CLS_ORDER[b.cls] ||
    (a.tier in TIER_ORDER ? TIER_ORDER[a.tier] : 9) - (b.tier in TIER_ORDER ? TIER_ORDER[b.tier] : 9) ||
    a.price - b.price;

  function pickedOffers(v) {
    return state.picks
      .map((p, i) => {
        const o = resolvePick(v, p);
        return o && { ...o, pickIndex: i };
      })
      .filter(Boolean)
      .sort(planOrder);
  }

  const isPicked = (o) => state.picks.some((p) => pickId(p) === pickId(pickFromOffer(o)));

  const shortName = (o) => `ชั้น ${o.cls} ${o.tier || (o.type === 'truck' ? 'รถบรรทุก' : 'ทวีคูณ')}`;

  function pickDetail(o) {
    const d = o.deductible ? `Deduct ${money(o.deductible)}` : 'ไม่มี Deduct';
    if (o.type === 'plus') return `ทุน ${money(o.sum)} · ${d}`;
    if (o.type === 'truck') return `ทรัพย์สิน ${money(o.cov.tppd)} · ${d}`;
    return o.planTh;
  }

  // ---------- coverage & pricing ----------
  function seatsFor(o, v) {
    if (o.type === 'plus') return v.code === '320' ? 3 : 5;
    if (o.type === 'truck') return 3;
    return null;
  }

  const COVERAGE_ROWS = [
    { id: 'own', label: 'ความเสียหายต่อตัวรถ', plusSub: 'เฉพาะชนกับยานพาหนะทางบก' },
    { id: 'theft', label: 'รถยนต์สูญหาย / ไฟไหม้' },
    { id: 'tpbi', label: 'ชีวิต ร่างกาย บุคคลภายนอก' },
    { id: 'tppd', label: 'ทรัพย์สินบุคคลภายนอก' },
    { id: 'pa', label: 'อุบัติเหตุส่วนบุคคล', sub: 'ผู้ขับขี่และผู้โดยสาร' },
    { id: 'med', label: 'ค่ารักษาพยาบาล' },
    { id: 'bail', label: 'ประกันตัวผู้ขับขี่' },
    { id: 'natural', label: 'ภัยธรรมชาติ', sub: 'น้ำท่วม ลมพายุ ลูกเห็บ แผ่นดินไหว', dealerOnly: true },
    { id: 'daily', label: 'เงินชดเชยรายได้', sub: 'นอนโรงพยาบาล สูงสุด 30 วัน/คน ไม่เกิน 7 คน', plus2Only: true },
    { id: 'travel', label: 'ค่าเดินทางระหว่างรถเข้าซ่อม', sub: 'ไม่เกิน 3 ครั้ง/ปี', plus2Only: true },
  ];

  // ค่าความคุ้มครองของแผน (HTML) — null = ไม่คุ้มครอง
  function coverageValue(id, o, v) {
    const c = o.cov;
    const seats = seatsFor(o, v);
    const seatTxt = seats ? `<br><small>ไม่เกิน ${seats} ที่นั่ง</small>` : '';
    switch (id) {
      case 'own': return o.type === 'plus' ? `ตามทุน ${money(o.sum)}` : null;
      case 'theft': return o.type === 'plus' && c.theftFire ? `ตามทุน ${money(o.sum)}` : null;
      case 'tpbi': return `${money(c.tpbiPerson)} /คน<br>${money(c.tpbiTime)} /ครั้ง`;
      case 'tppd': return `${money(c.tppd)} /ครั้ง` + (o.tppdDeductible ? `<br><small>ค่าเสียหายส่วนแรก ${money(o.tppdDeductible)}</small>` : '');
      case 'pa': return c.pa ? `${money(c.pa)} /คน${seatTxt}` : null;
      case 'med': return c.med ? `${money(c.med)} /คน${seatTxt}` : null;
      case 'bail': return `${money(c.bail)} /ครั้ง`;
      case 'natural': return c.natural ? `${money(c.natural)} /ครั้ง` : null;
      case 'daily': return c.dailyComp ? `${money(c.dailyComp)} /วัน` : null;
      case 'travel': return c.travelComp ? `${money(c.travelComp)} /ครั้ง` : null;
      default: return null;
    }
  }

  function rowLabel(row, offers) {
    const sub = row.plusSub ? (offers.some((o) => o.type === 'plus') ? row.plusSub : '') : row.sub;
    return `${row.label}${sub ? `<small>${sub}</small>` : ''}`;
  }

  function rowsFor(offers) {
    return COVERAGE_ROWS.filter((r) =>
      (!r.plus2Only || offers.some(hasCompRows)) && (!r.dealerOnly || offers.some((o) => o.pid === 'dealer')));
  }

  function highlights(o) {
    const c = o.cov;
    if (o.type === 'plus') {
      const list = [
        [true, `ชนกับยานพาหนะทางบก ซ่อมรถคุณตามทุน ${money(o.sum)}${o.pid === 'dealer' ? ' (ซ่อมห้าง)' : ''}`],
        c.theftFire ? [true, 'รถหาย / ไฟไหม้ คุ้มครองตามทุน'] : [false, 'ไม่คุ้มครองรถหาย / ไฟไหม้'],
        [true, `ทรัพย์สินคู่กรณี ${money(c.tppd)} บาท`],
      ];
      if (c.natural) list.push([true, `ภัยธรรมชาติ ${money(c.natural)} บาท`]);
      if (c.dailyComp) list.push([true, `ชดเชยรายได้ ${money(c.dailyComp)} บาท/วัน + ค่าเดินทาง`]);
      return list;
    }
    if (o.type === 'tawikoon') {
      return [
        [false, 'ไม่คุ้มครองความเสียหายของรถคุณ'],
        [true, `ทรัพย์สินคู่กรณี ${money(c.tppd)} บาท`],
        c.pa ? [true, `อุบัติเหตุส่วนบุคคล / ค่ารักษา ${money(c.pa)} บาท`] : [false, 'ไม่มีอุบัติเหตุส่วนบุคคล (PA)'],
      ];
    }
    return [
      [false, 'ไม่คุ้มครองความเสียหายของรถคุณ'],
      [true, `ทรัพย์สินคู่กรณี ${money(c.tppd)} บาท`],
      [true, `ประกันตัวผู้ขับขี่ ${money(c.bail)} บาท`],
    ];
  }

  function offerNotes(o, v) {
    const notes = [];
    if (o.type !== 'tawikoon') notes.push({ icon: 'camera', text: 'ราคาสำหรับรถที่ติดกล้องติดรถยนต์' });
    if (isPlusStd(o) && v.age > R.plusRules.maxAge) {
      notes.push({ icon: 'alert', warn: true, text: `รถอายุ ${v.age} ปี (เกิน ${R.plusRules.maxAge} ปี) ต้องส่งพิจารณาอนุมัติ` });
    }
    if (o.group === 'standard') {
      const nc = R.plusRules.newCustomer;
      notes.push({ icon: 'info', text: `${nc.label} รวมส่วนลดไม่มีเคลมล่วงหน้า ${money(nc.advanceNcd)} บาทแล้ว` });
    }
    if (o.group === 'fridge') {
      notes.push({ icon: 'info', text: 'ไม่คุ้มครองอุปกรณ์ต่อเติมตู้ทึบ/ตู้แห้ง/ตู้เย็น' });
      notes.push({ icon: 'info', text: `ค่าเสียหายส่วนแรกต่อทรัพย์สินบุคคลภายนอก ${money(o.tppdDeductible)} บาท` });
    }
    if (o.group === 'dealer') {
      notes.push({ icon: 'info', text: `ซ่อมห้าง ไม่มีค่าเสียหายส่วนแรก · คุ้มครองอุปกรณ์ตกแต่ง ${money(R.dealer.accessories)} บาท` });
    }
    return notes;
  }

  function cmiAmount(o, v) {
    return o.type === 'truck' ? 0 : R.compulsory[v.code] || 0;
  }

  // เบี้ยของแต่ละแผน แยกเป็นรายการ (ส่วนลด/ความคุ้มครองเพิ่ม/พ.ร.บ. ใช้ร่วมกันทุกแผน)
  function pricing(o, v) {
    const p = { premium: o.price, cmi: state.addons.cmi ? cmiAmount(o, v) : 0 };
    p.total = round2(p.premium + p.cmi);
    return p;
  }

  function quoteConditions(v, offers) {
    const plus = offers.some(isPlusStd);
    const dealer = offers.some((o) => o.pid === 'dealer');
    const truck = offers.some((o) => o.type === 'truck');
    const mixed = plus && offers.some((o) => !isPlusStd(o));
    const scope = mixed ? 'ชั้น 2+ / 3+ ' : '';
    const max = R.plusRules.maxAge;
    const list = [];
    if (plus) {
      list.push(`${scope}สำหรับรถใช้ส่วนบุคคล เฉพาะรถญี่ปุ่นและรถตลาด (รหัส 110) และรถปิคอัพไม่เกิน 4 ตัน (รหัส 320) อายุรถไม่เกิน ${max} ปีนับจากปีจดทะเบียน`
        + (v.age > max ? ` — รถคันนี้อายุ ${v.age} ปี ต้องส่งฝ่ายรับประกันภัยพิจารณาอนุมัติ` : ''));
      if (plusGroup(v) === 'standard') {
        const nc = R.plusRules.newCustomer;
        list.push(`${scope}${nc.label} (${nc.period}) รวมส่วนลดไม่มีเคลมล่วงหน้า ${money(nc.advanceNcd)} บาทแล้ว — ลูกค้าใหม่คือ ${nc.definition}`);
      }
      if (v.body === 'fridge') {
        const f = R.plusRules.fridge;
        list.push(`${scope}ไม่คุ้มครองอุปกรณ์ต่อเติมตู้ทึบ/ตู้แห้ง/ตู้เย็น ลูกค้าต้องกรอกแบบฟอร์มรับผิดชอบอุปกรณ์ต่อเติมเอง`);
        list.push(`${scope}มีค่าเสียหายส่วนแรกต่อทรัพย์สินของบุคคลภายนอก ${money(f.tppdDeductible)} บาท`);
        list.push(`${scope}ไม่รับประกันภัย${f.exclusions.join(', ')}`);
      }
    }
    if (dealer) {
      const d = R.dealer;
      list.push(`ชั้น 2+ ซ่อมห้าง (${d.period}) เฉพาะรถเก๋งส่วนบุคคล รหัส 110 รุ่นที่ระบุในตาราง อายุรถไม่เกิน ${d.maxAge} ปี ไม่มีค่าเสียหายส่วนแรก ทุกระดับพฤติกรรมการขับขี่ คุ้มครองอุปกรณ์ตกแต่งไม่เกิน ${money(d.accessories)} บาท ไม่รับรถ Load เตี้ย / Skirt งานปั้น`);
    }
    if (truck) list.push('ส่วนลดประวัติพิจารณาตามนโยบายของบริษัทฯ ไม่มีการให้ส่วนลดกลุ่ม');
    if (plus || dealer || truck) list.push(`อัตราเบี้ย${scope ? `${scope.trim()} ` : ''}สำหรับรถที่ติดตั้งกล้องติดรถยนต์ที่บันทึกภาพเคลื่อนไหวได้`);
    list.push('คำนวณจากตารางอัตราเบี้ยของบริษัทฯ รวมภาษีมูลค่าเพิ่มและอากรแสตมป์แล้ว บริษัทฯ ขอสงวนสิทธิ์ในการพิจารณารับประกันภัยและเปลี่ยนแปลงอัตราเบี้ยโดยไม่ต้องแจ้งให้ทราบล่วงหน้า');
    return list;
  }

  // ---------- navigation ----------
  const depth = () => (history.state && history.state.depth) || 0;
  const PARENT = { plans: 'search', checkout: 'plans', quote: 'checkout', issue: 'quote', issuedoc: 'issue', coverage: 'search' };

  function canShow(view) {
    if (view === 'search' || view === 'coverage') return true;
    if (!isComplete()) return false;
    if (view === 'plans') return true;
    const n = pickedOffers(vehicle()).length;
    if (view === 'checkout') return n > 0;
    const quoteOk = n > 0 && !!state.quote && !!state.customer.name.trim();
    if (view === 'quote' || view === 'issue') return quoteOk;
    if (view === 'issuedoc') return quoteOk && !!state.issue.no && !!state.issue.address.trim();
    return false;
  }

  function go(view) {
    state.view = view;
    history.pushState({ view, depth: depth() + 1 }, '', `#${view}`);
    render();
    window.scrollTo(0, 0);
  }

  function goBack() {
    if (depth() > 0) {
      history.back();
    } else {
      state.view = PARENT[state.view] || 'search';
      history.replaceState({ view: state.view, depth: 0 }, '', `#${state.view}`);
      render();
      window.scrollTo(0, 0);
    }
  }

  // ---------- views ----------
  const app = $('#app');

  function render() {
    let view = state.view;
    while (!canShow(view)) view = PARENT[view] || 'search';
    if (view !== state.view) {
      state.view = view;
      history.replaceState({ view, depth: depth() }, '', `#${view}`);
    }
    if (view !== 'search' && view !== 'coverage') {
      const v = vehicle();
      state.picks = state.picks.filter((p) => resolvePick(v, p));
    }
    document.body.dataset.view = view;
    $('#backBtn').hidden = view === 'search';
    const views = { search: renderSearch, plans: renderPlans, checkout: renderCheckout, quote: renderQuote, issue: renderIssue, issuedoc: renderIssueDoc, coverage: renderCoverage };
    app.innerHTML = views[view]();
    if (view === 'quote' || view === 'issuedoc') layoutPages();
    if (view === 'coverage') {
      const t = $('.cov-tabs .tab.is-on');
      if (t) t.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    save();
  }

  function stepHead(num, title, done) {
    return `<div class="step-head"><span class="step-num ${done ? 'is-done' : ''}">${done ? icon('check') : num}</span><h3>${title}</h3></div>`;
  }

  function renderSearch() {
    const brand = getBrand();
    const model = getModel();
    const modelOk = !!(model && model.kind);
    const bodyNeeded = modelOk && needsBody(model.kind);
    const total = bodyNeeded ? 4 : 3;
    const done = [!!brand, modelOk, !!state.year, bodyNeeded && !!state.body].filter(Boolean).length;
    const complete = isComplete();

    return `
      <section class="hero">
        <p class="hero-kicker">${icon('shield')} มิตรแท้ประกันภัย</p>
        <h1>เช็คเบี้ยประกันรถยนต์<br><span>รู้ราคาทันที พร้อมใบเสนอราคา</span></h1>
        <div class="hero-classes"><span>ชั้น 2+</span><span>ชั้น 3+</span><span>ชั้น 3</span></div>
      </section>
      <section class="card finder">
        <div class="progress" aria-hidden="true"><i style="width:${Math.round((done / total) * 100)}%"></i></div>
        <h2 class="finder-title">ค้นหาแผนประกันรถยนต์</h2>
        ${stepBrand(brand)}
        ${brand ? stepModel(brand, model) : ''}
        ${modelOk ? stepYear(model) : ''}
        ${bodyNeeded && state.year ? stepBody(model.kind) : ''}
        <button class="btn btn-primary btn-block see-plans" id="seePlans" data-action="see-plans" ${complete ? '' : 'disabled'}>ดูแผนประกันเลย</button>
      </section>
      <button class="btn btn-ghost btn-block cov-link" data-action="to-coverage">${icon('table')}ตารางเงื่อนไขความคุ้มครอง<small>ป.1 · ป.2 · ป.3 ทุกรหัสรถ</small></button>
      ${agentCard()}
      <p class="page-note">เบี้ยประกันจากตารางอัตราเบี้ยมิตรแท้ประกันภัย รวมภาษีมูลค่าเพิ่มและอากรแสตมป์แล้ว</p>`;
  }

  // ---------- ตารางเงื่อนไขความคุ้มครอง ----------
  function renderCoverage() {
    const gi = Math.min(state.covGroup, COV.groups.length - 1);
    const g = COV.groups[gi];
    const rows = COV.rows.map((r, i) => `
      ${r.section ? `<tr class="grp"><td colspan="${g.plans.length + 1}">${esc(r.section)}</td></tr>` : ''}
      <tr>
        <th>${esc(r.label)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</th>
        ${g.plans.map((p) => {
          const val = p.values[i] == null ? '' : String(p.values[i]);
          const no = /^(-|ไม่มี|ไม่คุ้มครอง|0)$/.test(val.trim());
          return `<td class="${no ? 'no' : ''}">${esc(val)}</td>`;
        }).join('')}
      </tr>`).join('');

    return `
      <div class="section-head">
        <h2>ตารางเงื่อนไขความคุ้มครอง</h2>
        <p>${icon('table')} เลือกกลุ่มรถ แล้วเลื่อนตารางไปทางขวาเพื่อดูทุกแผน</p>
      </div>
      <div class="cov-tabs" role="tablist">
        ${COV.groups.map((x, i) => `<button role="tab" class="tab ${i === gi ? 'is-on' : ''}" data-action="cov-group" data-value="${i}" aria-selected="${i === gi}">${esc(x.title)}</button>`).join('')}
      </div>
      <section class="card cov-card">
        <div class="cov-scroll">
          <table class="cov-table">
            <thead><tr><th>ความคุ้มครอง</th>${g.plans.map((p) => `<th>${esc(p.name)}</th>`).join('')}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        ${g.note ? `<p class="cov-note">${icon('info')}${esc(g.note)}</p>` : ''}
      </section>
      ${agentCard()}
      <p class="page-note">อ้างอิงตารางเงื่อนไขความคุ้มครองของบริษัทฯ · บริษัทฯ ขอสงวนสิทธิ์ในการเปลี่ยนแปลงโดยไม่ต้องแจ้งให้ทราบล่วงหน้า</p>`;
  }

  function agentCard() {
    return `
      <a class="agent-card" href="tel:${AGENT.phone.replace(/[^\d+]/g, '')}">
        <span class="agent-ico">${icon('phone')}</span>
        <span class="agent-text"><small>${esc(AGENT.office)}</small><b>${esc(AGENT.name)}</b><span>โทร ${esc(AGENT.phone)}</span></span>
        <span class="agent-call">โทรเลย</span>
      </a>`;
  }

  function stepBrand(brand) {
    const popular = BRANDS.filter((b) => b.popular);
    const inGrid = brand && popular.some((p) => p.id === brand.id);
    return `
      <div class="step" id="step-brand">
        ${stepHead(1, 'เลือกยี่ห้อรถ', !!brand)}
        <div class="brand-grid">
          ${popular.map((p) => `
            <button class="brand-tile ${brand && brand.id === p.id ? 'is-on' : ''}" data-action="brand" data-value="${p.id}" aria-pressed="${!!brand && brand.id === p.id}">
              <span class="wm ${p.name.length > 7 ? 'long' : ''}" style="color:${p.color}">${esc(p.name.toUpperCase())}</span>
              <small>${esc(p.th)}</small>
            </button>`).join('')}
        </div>
        <button class="select-btn ${brand && !inGrid ? 'is-on' : ''}" data-action="brand-more">
          <span>${brand && !inGrid ? esc(brand.name) : 'เลือกยี่ห้ออื่นๆ'}</span>${icon('chev')}
        </button>
      </div>`;
  }

  function stepModel(brand, model) {
    const hasList = brand.models.length > 0;
    const top = brand.models.slice(0, TOP_MODELS);
    if (model && !model.custom && !top.includes(model)) top.push(model);
    const kindChips = Object.keys(KINDS).map((k) => `
      <button class="chip ${state.customKind === k ? 'is-on' : ''}" data-action="kind" data-value="${k}" aria-pressed="${state.customKind === k}">${KINDS[k].label}</button>`).join('');

    return `
      <div class="step" id="step-model">
        ${stepHead(2, 'เลือกรุ่นรถ', !!(model && model.kind))}
        ${hasList ? `
          <div class="chip-grid">
            ${top.map((m) => `<button class="chip ${model === m ? 'is-on' : ''}" data-action="model" data-value="${esc(m.name)}" aria-pressed="${model === m}">${esc(m.name)}</button>`).join('')}
          </div>
          <button class="select-btn ${state.customModel ? 'is-on' : ''}" data-action="model-more">
            <span>${state.customModel ? 'ไม่พบรุ่นรถ (ระบุเอง)' : brand.models.length > TOP_MODELS ? `ค้นหารุ่นอื่นๆ (${brand.models.length} รุ่น)` : 'ไม่พบรุ่นรถ'}</span>${icon('chev')}
          </button>` : ''}
        ${state.customModel ? `
          <div class="custom-box">
            <label class="field">
              <span>ชื่อรุ่นรถ <small>(ไม่บังคับ)</small></span>
              <input id="customModelName" type="text" value="${esc(state.customModelName)}" placeholder="เช่น Corolla Altis" autocomplete="off" maxlength="40">
            </label>
            <p class="field-label">ประเภทรถ</p>
            <div class="chip-grid one-col">${kindChips}</div>
          </div>` : ''}
      </div>`;
  }

  function stepYear(model) {
    const ys = yearsFor(model);
    const top = ys.slice(0, TOP_YEARS);
    if (state.year && !top.includes(state.year)) top.push(state.year);
    return `
      <div class="step" id="step-year">
        ${stepHead(3, 'เลือกปีรถยนต์', !!state.year)}
        <div class="chip-grid">
          ${top.map((y) => `<button class="chip ${state.year === y ? 'is-on' : ''}" data-action="year" data-value="${y}" aria-pressed="${state.year === y}">${yearLabel(y)}</button>`).join('')}
        </div>
        ${ys.length > TOP_YEARS ? `<button class="select-btn" data-action="year-more"><span>เลือกปีอื่นๆ</span>${icon('chev')}</button>` : ''}
      </div>`;
  }

  function stepBody(kind) {
    const pickup = kind === 'pickup';
    const opts = pickup
      ? [['standard', 'กระบะทั่วไป', 'ไม่ได้ต่อเติมตู้'], ['fridge', 'ต่อเติมตู้', 'ตู้ทึบ / ตู้แห้ง / ตู้เย็น']]
      : [['plain', 'ไม่มีอุปกรณ์พิเศษ', 'ตัวรถมาตรฐาน'], ['equip', 'มีอุปกรณ์พิเศษ', 'ติดตั้งอุปกรณ์พิเศษเพิ่มบนตัวรถ']];
    return `
      <div class="step" id="step-body">
        ${stepHead(4, pickup ? 'ลักษณะรถกระบะ' : 'อุปกรณ์พิเศษ', !!state.body)}
        <div class="option-list">
          ${opts.map(([val, title, desc]) => `
            <button class="option ${state.body === val ? 'is-on' : ''}" data-action="body" data-value="${val}" aria-pressed="${state.body === val}">
              <span class="radio"></span><span><b>${title}</b><small>${desc}</small></span>
            </button>`).join('')}
        </div>
      </div>`;
  }

  function carSummary(v) {
    const meta = [`ปี ${yearLabel(v.year)}`, KINDS[v.kind].short, `รหัส ${v.code}`];
    if (v.body) meta.push(BODY_LABEL[v.body]);
    return `
      <section class="card car-summary">
        <div class="car-row">
          <span class="car-ico">${icon(v.kind.startsWith('truck') ? 'truck' : 'car')}</span>
          <div class="car-text"><b>${esc(v.name)}</b><small>${meta.join(' · ')}</small></div>
          <button class="link-btn" data-action="edit-car">แก้ไข</button>
        </div>
        ${v.kind === 'car' ? `
          <div class="usage">
            <span>การใช้รถ</span>
            <div class="seg small">
              <button class="${state.usage === 'personal' ? 'is-on' : ''}" data-action="usage" data-value="personal">ส่วนบุคคล</button>
              <button class="${state.usage === 'commercial' ? 'is-on' : ''}" data-action="usage" data-value="commercial">เพื่อการพาณิชย์</button>
            </div>
          </div>` : ''}
      </section>`;
  }

  function renderPlans() {
    const v = vehicle();
    const offers = buildOffers(v);
    const counts = { '2+': 0, '3+': 0, 3: 0 };
    offers.forEach((o) => { counts[o.cls]++; });
    if (state.filter !== 'all' && !counts[state.filter]) state.filter = 'all';
    const shown = state.filter === 'all' ? offers : offers.filter((o) => o.cls === state.filter);
    const block = plusBlockReason(v);
    const notices = [];
    if (block && !v.kind.startsWith('truck')) notices.push(block);
    if (v.brand.group === 'other' || (v.model && v.model.custom)) {
      notices.push('รถที่ไม่มีในรายการ บริษัทฯ จะพิจารณาการรับประกันภัยอีกครั้ง (ป.2+ / ป.3+ รับเฉพาะรถญี่ปุ่นและรถตลาด)');
    }

    const tabs = [['all', 'ทั้งหมด', offers.length], ['2+', 'ชั้น 2+', counts['2+']], ['3+', 'ชั้น 3+', counts['3+']], ['3', 'ชั้น 3', counts[3]]]
      .filter(([id, , n]) => id === 'all' || n > 0);
    const withDeduct = shown.find((o) => o.type !== 'tawikoon' && !o.fixedDeduct);

    return `
      ${carSummary(v)}
      ${notices.map((n) => `<div class="notice">${icon('info')}<p>${esc(n)}</p></div>`).join('')}
      ${offers.length ? `
        <div class="tabs" role="tablist">
          ${tabs.map(([id, label, n]) => `<button role="tab" class="tab ${state.filter === id ? 'is-on' : ''}" data-action="filter" data-value="${id}" aria-selected="${state.filter === id}">${label}<span>${n}</span></button>`).join('')}
        </div>
        ${withDeduct ? `
          <div class="deduct">
            <p class="field-label">ค่าเสียหายส่วนแรก (Deduct)<small>${withDeduct.type === 'truck' ? 'ต่อทรัพย์สินบุคคลภายนอก' : 'ใช้กับแผนชั้น 2+ และ 3+'}</small></p>
            <div class="seg">
              <button class="${state.deduct ? 'is-on' : ''}" data-action="deduct" data-value="1">มี ${money(withDeduct.deductAmount)} บาท<small>เบี้ยถูกกว่า</small></button>
              <button class="${!state.deduct ? 'is-on' : ''}" data-action="deduct" data-value="0">ไม่มี<small>ไม่ต้องจ่ายส่วนแรก</small></button>
            </div>
          </div>` : ''}
        <p class="result-count">พบ ${shown.length} แผน · เรียงจากเบี้ยต่ำสุด · เลือกได้สูงสุด ${MAX_PICKS} แผน</p>
        <div class="offer-list">${shown.map((o) => offerCard(o, v)).join('')}</div>
        ${agentCard()}
        <p class="page-note">เบี้ยประกันรวมภาษีมูลค่าเพิ่มและอากรแสตมป์แล้ว · บริษัทฯ ขอสงวนสิทธิ์ในการพิจารณารับประกันภัย</p>
        ${pickTray(v)}`
      : `
        <section class="card empty">
          ${icon('info')}
          <h3>ไม่มีแผนที่คำนวณจากตารางเบี้ยได้</h3>
          <p>กรุณาติดต่อ Mittare Contact Center <a href="tel:${R.contact.center.replace(/-/g, '')}">${R.contact.center}</a></p>
          <button class="btn btn-ghost" data-action="edit-car">เลือกรถใหม่</button>
        </section>`}`;
  }

  function offerCard(o, v) {
    const sumField = o.type === 'plus'
      ? `<label class="sum-field">
          <span>ทุนรถชนรถ</span>
          <select data-action="sum" data-pid="${o.pid}" aria-label="ทุนประกันรถชนรถ">
            ${o.sums.map((s) => `<option value="${s}" ${s === o.sum ? 'selected' : ''}>${money(s)} บาท</option>`).join('')}
          </select>${icon('chev')}
        </label>`
      : '';
    const deductTag = o.type === 'tawikoon' ? '' : `<span class="tag">${o.deductible ? `Deduct ${money(o.deductible)}` : 'ไม่มี Deduct'}</span>`;
    const notes = offerNotes(o, v);
    const picked = isPicked(o);
    const rows = rowsFor([o]);

    return `
      <article class="offer ${picked ? 'is-picked' : ''}">
        <div class="offer-top">
          <span class="cls ${CLS_CLASS[o.cls]}">ชั้น ${o.cls}</span>
          ${o.tier ? `<span class="tier t-${o.tier.toLowerCase()}">${o.tier}</span>` : ''}
          ${deductTag}
        </div>
        <div class="offer-main">
          <div class="offer-name"><h3>${esc(o.product)}</h3><p>${esc(o.planTh)}</p></div>
          <div class="price"><b>${money(o.price)}</b><small>บาท/ปี</small></div>
        </div>
        ${sumField}
        <ul class="hl">
          ${highlights(o).map(([ok, t]) => `<li class="${ok ? 'ok' : 'no'}">${icon(ok ? 'check' : 'x')}<span>${esc(t)}</span></li>`).join('')}
        </ul>
        ${notes.length ? `<div class="notes">${notes.map((n) => `<span class="note ${n.warn ? 'warn' : ''}">${icon(n.icon)}${esc(n.text)}</span>`).join('')}</div>` : ''}
        <details class="cov" data-key="${o.key}" ${openCov.has(o.key) ? 'open' : ''}>
          <summary>ดูความคุ้มครองทั้งหมด ${icon('chev')}</summary>
          <table class="cov-table"><tbody>
            ${rows.map((r) => {
              const val = coverageValue(r.id, o, v);
              return `<tr><th>${rowLabel(r, [o])}</th><td class="${val ? '' : 'no'}">${val || 'ไม่คุ้มครอง'}</td></tr>`;
            }).join('')}
          </tbody></table>
        </details>
        <button class="btn ${picked ? 'btn-primary' : 'btn-outline'} btn-block pick-btn" data-action="pick" data-value="${o.key}" aria-pressed="${picked}">
          ${icon(picked ? 'check' : 'plus')}${picked ? 'เลือกแล้ว' : 'เลือกแผนนี้'}
        </button>
      </article>`;
  }

  function pickTray(v) {
    const offers = pickedOffers(v);
    if (!offers.length) return '';
    return `
      <div class="bottom-bar tray">
        <div class="bottom-inner col">
          <div class="tray-chips">
            ${offers.map((o) => `
              <span class="pchip">
                <span><b>${esc(shortName(o))}</b><small>${esc(pickDetail(o))}</small></span>
                <button data-action="unpick" data-value="${o.pickIndex}" aria-label="เอา ${esc(shortName(o))} ออก">${icon('x')}</button>
              </span>`).join('')}
          </div>
          <div class="tray-row">
            <span>เลือกแล้ว <b>${offers.length}</b> / ${MAX_PICKS} แผน</span>
            <button class="btn btn-primary" data-action="to-checkout">ขอใบเสนอราคา</button>
          </div>
        </div>
      </div>`;
  }

  function radioList(action, items, current) {
    return `<div class="option-list compact">
      ${items.map(([val, title, extra]) => `
        <button class="option ${String(current) === String(val) ? 'is-on' : ''}" data-action="${action}" data-value="${val}" aria-pressed="${String(current) === String(val)}">
          <span class="radio"></span><span><b>${title}</b></span>${extra ? `<em>${extra}</em>` : ''}
        </button>`).join('')}
    </div>`;
  }

  function pickCard(o) {
    const opts = [];
    if (o.type === 'plus') {
      opts.push(`
        <label class="mini-select">
          <span>ทุนรถชนรถ</span>
          <select data-action="pick-sum" data-index="${o.pickIndex}">
            ${o.sums.map((s) => `<option value="${s}" ${s === o.sum ? 'selected' : ''}>${money(s)}</option>`).join('')}
          </select>${icon('chev')}
        </label>`);
    }
    if (o.type !== 'tawikoon' && !o.fixedDeduct) {
      opts.push(`
        <label class="mini-select">
          <span>ค่าเสียหายส่วนแรก</span>
          <select data-action="pick-deduct" data-index="${o.pickIndex}">
            <option value="1" ${o.deductible ? 'selected' : ''}>มี ${money(o.deductAmount)}</option>
            <option value="0" ${o.deductible ? '' : 'selected'}>ไม่มี</option>
          </select>${icon('chev')}
        </label>`);
    }
    return `
      <article class="card pick-card">
        <div class="offer-top">
          <span class="cls ${CLS_CLASS[o.cls]}">ชั้น ${o.cls}</span>
          ${o.tier ? `<span class="tier t-${o.tier.toLowerCase()}">${o.tier}</span>` : ''}
          <button class="icon-btn remove" data-action="unpick" data-value="${o.pickIndex}" aria-label="เอาแผนนี้ออก">${icon('x')}</button>
        </div>
        <div class="offer-main">
          <div class="offer-name"><h3>${esc(o.product)}</h3><p>${esc(o.planTh)}</p></div>
          <div class="price"><b>${money(o.price)}</b><small>บาท/ปี</small></div>
        </div>
        ${opts.length ? `<div class="pick-opts ${opts.length === 1 ? 'one' : ''}">${opts.join('')}</div>` : ''}
      </article>`;
  }

  function renderCheckout() {
    const v = vehicle();
    const offers = pickedOffers(v);
    const cmi = offers.map((o) => cmiAmount(o, v)).find(Boolean) || 0;
    const totals = offers.map((o) => ({ o, p: pricing(o, v) }));
    const minTotal = Math.min(...totals.map((t) => t.p.total));

    const extras = [];
    if (cmi) {
      extras.push(`
        <button class="toggle-row ${state.addons.cmi ? 'is-on' : ''}" data-action="cmi" aria-pressed="${state.addons.cmi}">
          <span><b>ซื้อรวม พ.ร.บ.</b><small>ประกันภาคบังคับ รหัส ${v.code}</small></span>
          <em>+${money(cmi)}</em><span class="switch"></span>
        </button>`);
    }

    return `
      <div class="section-head">
        <h2>แผนที่เลือก <span>${offers.length} แผน</span></h2>
        <p>${icon(v.kind.startsWith('truck') ? 'truck' : 'car')} ${esc(v.name)} · ปี ${yearLabel(v.year)}</p>
      </div>
      ${offers.map((o) => pickCard(o)).join('')}
      ${offers.length < MAX_PICKS ? `<button class="add-more" data-action="back">${icon('plus')}เลือกแผนเพิ่ม (ได้อีก ${MAX_PICKS - offers.length} แผน)</button>` : ''}

      ${extras.length ? `<section class="card"><h2 class="card-title">ประกันภาคบังคับ (พ.ร.บ.) <small>ไม่บังคับ</small></h2>${extras.join('')}</section>` : ''}

      <section class="card">
        <h2 class="card-title">ข้อมูลสำหรับใบเสนอราคา</h2>
        <label class="field">
          <span>ชื่อลูกค้า <i class="req">*</i></span>
          <input id="custName" type="text" value="${esc(state.customer.name)}" placeholder="เช่น คุณสมชาย ใจดี" autocomplete="name" maxlength="80">
          <em class="field-error" id="nameError" hidden>กรุณากรอกชื่อลูกค้า</em>
        </label>
        <label class="field">
          <span>เบอร์โทรศัพท์ <small>(ไม่บังคับ)</small></span>
          <input id="custPhone" type="tel" inputmode="tel" value="${esc(state.customer.phone)}" placeholder="08x-xxx-xxxx" autocomplete="tel" maxlength="20">
          <em class="field-error" id="phoneError" hidden>เบอร์โทรไม่ถูกต้อง</em>
        </label>
      </section>

      <section class="card">
        <h2 class="card-title">สรุปเบี้ยประกัน</h2>
        <dl class="bd plan-totals">
          ${totals.map(({ o, p }) => {
            const parts = [`เบี้ย ${money(p.premium)}`];
            if (p.cmi) parts.push(`พ.ร.บ. ${signed(p.cmi)}`);
            return `<div><dt><b>${esc(shortName(o))}</b><small>${esc(pickDetail(o))}${parts.length > 1 ? `<br>${esc(parts.join(' · '))}` : ''}</small></dt><dd>${money(p.total)}</dd></div>`;
          }).join('')}
        </dl>
      </section>

      <div class="bottom-bar">
        <div class="bottom-inner">
          <div><small>${offers.length > 1 ? `ใบเสนอราคา ${offers.length} แผน · เริ่มต้น` : 'รวมทั้งสิ้น'}</small><b>${money(minTotal)} <span>บาท</span></b></div>
          <button class="btn btn-primary" data-action="make-quote">ออกใบเสนอราคา</button>
        </div>
      </div>`;
  }

  // ---------- quote (A4 หนึ่งหน้า) ----------
  function renderQuote() {
    return `
      <div class="quote-actions">
        <button class="btn btn-primary" data-action="save-image">${icon('image')}บันทึกรูป</button>
        <button class="btn btn-ghost" data-action="print">${icon('print')}PDF</button>
        <button class="btn btn-ghost" data-action="share">${icon('share')}แชร์</button>
      </div>
      <p class="quote-hint">ใบเสนอราคาขนาด A4 หนึ่งหน้า · ถ่างนิ้วเพื่อซูมดู</p>
      <div class="quote-stage">
        <div class="quote-scaler">${quotePage()}</div>
      </div>
      <button class="btn btn-primary btn-block issue-cta" data-action="to-issue">
        <span>${icon('doc')}แจ้งออกกรมธรรม์</span><small>ลูกค้าตกลงทำ · แนบเล่มทะเบียน บัตรประชาชน ที่อยู่จัดส่ง</small>
      </button>
      <button class="btn btn-ghost btn-block restart" data-action="restart">${icon('refresh')}เช็คเบี้ยคันใหม่</button>`;
  }

  function docHead(title, sub) {
    return `
      <header class="qp-head">
        <div class="qp-brand">
          ${icon('shield')}
          <div><small>${esc(AGENT.office)}</small><b>${esc(AGENT.name)}</b><span>${icon('phone')}โทร ${esc(AGENT.phone)}</span></div>
        </div>
        <div class="qp-title">
          <h1>${title}</h1>
          <p>${sub}</p>
          <p class="qp-insurer">ผู้รับประกันภัย บริษัท มิตรแท้ประกันภัย จำกัด (มหาชน)</p>
        </div>
      </header>`;
  }

  const docFoot = () => `
      <footer class="qp-foot">
        <span>Mittare Contact Center <b>${R.contact.center}</b></span>
        <span>แจ้งอุบัติเหตุ 24 ชม. <b>${R.contact.accident}</b></span>
      </footer>`;

  function carRows(v) {
    const car = [
      ['ยี่ห้อ / รุ่น', esc(v.name)],
      ['ปีรถ', yearLabel(v.year)],
      ['ประเภทรถ', `${KINDS[v.kind].label} · รหัส ${v.code}`],
    ];
    if (v.body) car.push(['ลักษณะรถ', BODY_LABEL[v.body]]);
    else if (v.kind === 'car') car.push(['การใช้รถ', state.usage === 'commercial' ? 'เพื่อการพาณิชย์' : 'ส่วนบุคคล']);
    return car;
  }

  function quotePage(id = 'quoteDoc') {
    const v = vehicle();
    const offers = pickedOffers(v);
    const n = offers.length;
    const q = state.quote;
    const date = thDate(q.date);
    const prices = offers.map((o) => pricing(o, v));
    const anyPlus = offers.some((o) => o.type === 'plus');
    const anyDeduct = offers.some((o) => o.type !== 'tawikoon');
    const labelWidth = { 1: 46, 2: 34, 3: 28, 4: 25 }[n];
    const car = carRows(v);

    const row = (label, cells, cls = '') => `<tr class="${cls}"><th>${label}</th>${cells.join('')}</tr>`;
    const cell = (val) => `<td class="${val == null ? 'no' : ''}">${val == null ? 'ไม่คุ้มครอง' : val}</td>`;
    const dash = '<td class="na">—</td>';
    const group = (title) => `<tr class="grp"><td colspan="${n + 1}">${title}</td></tr>`;

    const body = [];
    body.push(group('รายละเอียดแผน'));
    if (anyPlus) body.push(row('ทุนประกันรถชนรถ', offers.map((o) => (o.type === 'plus' ? `<td>${money(o.sum)}</td>` : dash))));
    if (anyDeduct) {
      body.push(row(offers.some((o) => o.type === 'truck') ? 'ค่าเสียหายส่วนแรก<small>ต่อทรัพย์สินบุคคลภายนอก</small>' : 'ค่าเสียหายส่วนแรก (Deduct)',
        offers.map((o) => (o.type === 'tawikoon' ? dash : `<td>${o.deductible ? money(o.deductible) : 'ไม่มี'}</td>`))));
    }
    body.push(group('ความคุ้มครอง (บาท)'));
    rowsFor(offers).forEach((r) => {
      body.push(row(rowLabel(r, offers), offers.map((o) => {
        if (r.plus2Only && !hasCompRows(o)) return cell(null);
        return cell(coverageValue(r.id, o, v));
      })));
    });
    body.push(group('เบี้ยประกันภัย (บาท)'));
    body.push(row('เบี้ยประกันภัย<small>รวมภาษีมูลค่าเพิ่มและอากรแสตมป์</small>', prices.map((p) => `<td>${money(p.premium)}</td>`)));
    if (prices.some((p) => p.cmi)) {
      body.push(row('พ.ร.บ.<small>รวมภาษีอากร</small>', prices.map((p) => (p.cmi ? `<td>${signed(p.cmi)}</td>` : dash))));
    }
    body.push(row('รวมทั้งสิ้น', prices.map((p) => `<td>${money(p.total)}</td>`), 'total'));

    return `
      <article class="qp" id="${id}" data-fit>
        <div class="qp-inner">
          ${docHead('ใบเสนอราคา', 'ประกันภัยรถยนต์ภาคสมัครใจ')}
          <div class="qp-meta">
            <div><small>เรียน</small><b>${esc(state.customer.name.trim())}</b>${state.customer.phone.trim() ? `<span>โทร ${esc(state.customer.phone.trim())}</span>` : ''}</div>
            <div><small>เลขที่</small><b>${esc(q.no)}</b></div>
            <div><small>วันที่</small><b>${date}</b></div>
          </div>
          <section class="qp-sec">
            <h4>รายละเอียดรถยนต์</h4>
            <dl class="qp-car">${car.map(([k, val]) => `<div><dt>${k}</dt><dd>${val}</dd></div>`).join('')}</dl>
          </section>
          <section class="qp-sec">
            <h4>${n > 1 ? `เปรียบเทียบแผนประกันภัย ${n} แผน` : 'แผนประกันภัย'}</h4>
            <table class="qp-table">
              <colgroup><col style="width:${labelWidth}%">${offers.map(() => '<col>').join('')}</colgroup>
              <thead>
                <tr>
                  <th></th>
                  ${offers.map((o) => `
                    <th>
                      <span class="qp-badges"><span class="cls ${CLS_CLASS[o.cls]}">ชั้น ${o.cls}</span>${o.tier ? `<span class="tier t-${o.tier.toLowerCase()}">${o.tier}</span>` : ''}</span>
                      <b>${esc(o.product)}</b>
                      <small>${esc(o.planTh)}</small>
                    </th>`).join('')}
                </tr>
              </thead>
              <tbody>${body.join('')}</tbody>
            </table>
          </section>
          <section class="qp-sec qp-cond">
            <h4>เงื่อนไข</h4>
            <ol>${quoteConditions(v, offers).map((c) => `<li>${esc(c)}</li>`).join('')}</ol>
          </section>
          ${docFoot()}
        </div>
      </article>`;
  }

  // ---------- ใบแจ้งออกกรมธรรม์ ----------
  function issueOffer(v) {
    const offers = pickedOffers(v);
    return offers.find((o) => pickId(pickFromOffer(o)) === state.issue.pick) || offers[0] || null;
  }

  function shrinkImage(file, max = 1600) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s);
        c.height = Math.round(img.naturalHeight * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/';
  const MAX_PDF_PAGES = 10;

  async function loadPdfJs() {
    if (!window.pdfjsLib) {
      const lib = await import(`${PDFJS}pdf.min.mjs`);
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS}pdf.worker.min.mjs`;
      window.pdfjsLib = lib;
    }
    return window.pdfjsLib;
  }

  // แปลงแต่ละหน้าของ PDF เป็นรูป JPEG เพื่อใช้ระบบเอกสารแนบเดียวกับรูปถ่าย
  async function pdfToImages(file, max = 1600) {
    const pdfjs = await loadPdfJs();
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const n = Math.min(pdf.numPages, MAX_PDF_PAGES);
    const out = [];
    for (let i = 1; i <= n; i++) {
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: max / Math.max(base.width, base.height) });
      const c = document.createElement('canvas');
      c.width = Math.round(vp.width);
      c.height = Math.round(vp.height);
      // intent 'print' ใช้ timer แทน requestAnimationFrame — ไม่ค้างถ้าผู้ใช้สลับแอปไปตอนกำลังอ่านไฟล์
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp, intent: 'print' }).promise;
      out.push({ dataUrl: c.toDataURL('image/jpeg', 0.85), page: i, pages: pdf.numPages });
    }
    return out;
  }

  const isPdf = (file) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

  async function addAttachments(group, files) {
    attachPending += files.length;
    render();
    for (const file of files) {
      try {
        if (isPdf(file)) {
          toast(`กำลังอ่าน ${file.name}…`);
          const pages = await pdfToImages(file);
          pages.forEach((p) => attachments[group].push({ id: ++attachSeq, dataUrl: p.dataUrl, name: `${file.name} หน้า ${p.page}/${p.pages}` }));
          if (pages.length && pages[0].pages > MAX_PDF_PAGES) toast(`แนบได้สูงสุด ${MAX_PDF_PAGES} หน้าแรกของ PDF`);
        } else if (file.type.startsWith('image/')) {
          attachments[group].push({ id: ++attachSeq, dataUrl: await shrinkImage(file), name: file.name });
        } else {
          toast('รองรับเฉพาะรูปภาพและไฟล์ PDF');
        }
      } catch (e) {
        toast(isPdf(file) ? `อ่านไฟล์ PDF ${file.name} ไม่สำเร็จ` : 'อ่านรูปไม่สำเร็จ');
      }
      attachPending--;
      render();
    }
  }

  function renderIssue() {
    const v = vehicle();
    const offers = pickedOffers(v);
    const o = issueOffer(v);
    const is = state.issue;
    const total = pricing(o, v).total;

    const planCard = offers.length > 1
      ? `<section class="card">
          <h2 class="card-title">แผนที่ลูกค้าตกลงทำ <small>เลือก 1 แผน</small></h2>
          ${radioList('issue-pick', offers.map((x) => [pickId(pickFromOffer(x)), `${esc(shortName(x))} · ${esc(x.product)}<small>${esc(pickDetail(x))}</small>`, money(pricing(x, v).total)]), pickId(pickFromOffer(o)))}
        </section>`
      : `<section class="card">
          <h2 class="card-title">แผนที่ลูกค้าตกลงทำ</h2>
          <dl class="bd plan-totals"><div><dt><b>${esc(shortName(o))} · ${esc(o.product)}</b><small>${esc(pickDetail(o))}</small></dt><dd>${money(total)}</dd></div></dl>
        </section>`;

    return `
      <div class="section-head">
        <h2>แจ้งออกกรมธรรม์</h2>
        <p>${icon(v.kind.startsWith('truck') ? 'truck' : 'car')} ${esc(v.name)} · ปี ${yearLabel(v.year)} · ใบเสนอราคา ${esc(state.quote.no)}</p>
      </div>
      ${planCard}

      <section class="card">
        <h2 class="card-title">ข้อมูลผู้เอาประกันภัย</h2>
        <label class="field">
          <span>ชื่อ-นามสกุล <i class="req">*</i></span>
          <input id="custName" type="text" value="${esc(state.customer.name)}" autocomplete="name" maxlength="80">
          <em class="field-error" id="nameError" hidden>กรุณากรอกชื่อลูกค้า</em>
        </label>
        <label class="field">
          <span>เบอร์โทรศัพท์</span>
          <input id="custPhone" type="tel" inputmode="tel" value="${esc(state.customer.phone)}" placeholder="08x-xxx-xxxx" autocomplete="tel" maxlength="20">
          <em class="field-error" id="phoneError" hidden>เบอร์โทรไม่ถูกต้อง</em>
        </label>
        <label class="field">
          <span>เลขบัตรประชาชน <small>(13 หลัก)</small></span>
          <input id="issIdNo" type="text" inputmode="numeric" value="${esc(is.idNo)}" placeholder="x-xxxx-xxxxx-xx-x" maxlength="17">
          <em class="field-error" id="idNoError" hidden>เลขบัตรประชาชนต้องมี 13 หลัก</em>
        </label>
        <div class="field-row">
          <label class="field">
            <span>วันเกิด <small>(ไม่บังคับ)</small></span>
            <input id="issBirth" type="date" value="${esc(is.birthDate)}">
          </label>
          <label class="field">
            <span>อีเมล <small>(รับกรมธรรม์ออนไลน์)</small></span>
            <input id="issEmail" type="email" inputmode="email" value="${esc(is.email)}" placeholder="name@email.com" maxlength="80">
          </label>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title">ข้อมูลรถตามเล่มทะเบียน <small>ไม่บังคับ — แอดมินอ่านจากรูปเล่มได้</small></h2>
        <div class="field-row">
          <label class="field">
            <span>ทะเบียนรถ</span>
            <input id="issPlate" type="text" value="${esc(is.plate)}" placeholder="กข 1234 / ป้ายแดง" maxlength="20">
          </label>
          <label class="field">
            <span>จังหวัด</span>
            <input id="issProvince" type="text" value="${esc(is.province)}" placeholder="กรุงเทพมหานคร" maxlength="40">
          </label>
        </div>
        <label class="field">
          <span>เลขตัวถัง (VIN)</span>
          <input id="issChassis" type="text" value="${esc(is.chassis)}" placeholder="17 หลัก" maxlength="25" autocapitalize="characters">
        </label>
        <div class="field-row">
          <label class="field">
            <span>เลขเครื่องยนต์</span>
            <input id="issEngine" type="text" value="${esc(is.engine)}" maxlength="25" autocapitalize="characters">
          </label>
          <label class="field">
            <span>สีรถ</span>
            <input id="issColor" type="text" value="${esc(is.color)}" placeholder="ขาว" maxlength="20">
          </label>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title">ความคุ้มครองและการจัดส่ง</h2>
        <label class="field">
          <span>วันที่เริ่มคุ้มครอง <small>(ไม่บังคับ — ว่างไว้ = แจ้งภายหลัง)</small></span>
          <input id="issStart" type="date" value="${esc(is.startDate)}">
        </label>
        <label class="field">
          <span>ที่อยู่จัดส่งเอกสาร / กรมธรรม์ <i class="req">*</i></span>
          <textarea id="issAddress" rows="3" placeholder="บ้านเลขที่ หมู่ ซอย ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์">${esc(is.address)}</textarea>
          <em class="field-error" id="addressError" hidden>กรุณากรอกที่อยู่จัดส่งเอกสาร</em>
        </label>
        <label class="field">
          <span>หมายเหตุถึงแอดมิน <small>(ไม่บังคับ)</small></span>
          <textarea id="issNote" rows="2" placeholder="เช่น ต้องการใบเสร็จในนามบริษัท, โอนชำระแล้ววันที่…">${esc(is.note)}</textarea>
        </label>
      </section>

      <section class="card">
        <h2 class="card-title">เอกสารแนบ <small>ถ่ายรูป เลือกรูป หรือไฟล์ PDF</small></h2>
        ${ATTACH_GROUPS.map((g) => `
          <div class="attach-group">
            <p class="field-label">${g.label}<small>${g.hint}</small></p>
            <div class="attach-grid">
              ${attachments[g.id].map((a) => `
                <div class="attach-thumb" title="${esc(a.name)}">
                  <img src="${a.dataUrl}" alt="">
                  ${/หน้า \d+\/\d+$/.test(a.name) ? `<small>${esc(a.name.replace(/^.*หน้า /, 'PDF หน้า '))}</small>` : ''}
                  <button type="button" class="icon-btn remove" data-action="attach-remove" data-group="${g.id}" data-value="${a.id}" aria-label="ลบรูป">${icon('x')}</button>
                </div>`).join('')}
              <label class="attach-add ${attachPending ? 'is-busy' : ''}">${icon('camera')}<span>${attachPending ? 'กำลังอ่านไฟล์…' : 'เพิ่มรูป / PDF'}</span><input type="file" accept="image/*,application/pdf,.pdf" multiple data-action="attach" data-group="${g.id}" hidden></label>
            </div>
          </div>`).join('')}
        <p class="attach-note">รูปแนบอยู่ในเครื่องนี้เท่านั้นจนกว่าจะปิดหน้า และไม่ถูกส่งไปที่ใดจนกว่าจะกดบันทึก/แชร์เอง</p>
      </section>

      <div class="bottom-bar">
        <div class="bottom-inner">
          <div><small>${esc(shortName(o))} · ${esc(pickDetail(o))}</small><b>${money(total)} <span>บาท</span></b></div>
          <button class="btn btn-primary" data-action="make-issue">สร้างใบแจ้ง</button>
        </div>
      </div>`;
  }

  function makeIssue() {
    if (attachPending) { toast('กำลังอ่านไฟล์แนบ รอสักครู่แล้วกดอีกครั้ง'); return; }
    const name = state.customer.name.trim();
    const phone = state.customer.phone.trim();
    const digits = phone.replace(/\D/g, '');
    const phoneBad = !!phone && (digits.length < 9 || digits.length > 10);
    const idBad = !!state.issue.idNo.trim() && state.issue.idNo.replace(/\D/g, '').length !== 13;
    const addr = state.issue.address.trim();
    $('#nameError').hidden = !!name;
    $('#phoneError').hidden = !phoneBad;
    $('#idNoError').hidden = !idBad;
    $('#addressError').hidden = !!addr;
    const bad = (!name && '#custName') || (phoneBad && '#custPhone') || (idBad && '#issIdNo') || (!addr && '#issAddress');
    if (bad) { $(bad).focus(); return; }
    const v = vehicle();
    state.issue.pick = pickId(pickFromOffer(issueOffer(v)));
    const now = new Date();
    const pad = (x) => String(x).padStart(2, '0');
    state.issue.no = `IS${String(now.getFullYear() + 543).slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    state.issue.date = now.toISOString();
    go('issuedoc');
  }

  function renderIssueDoc() {
    const v = vehicle();
    const o = issueOffer(v);
    const items = attachItems();
    const pages = [issuePage(v, o), quotePage('issueQuote'), ...items.map((it, i) => attachmentPage(it, i + 1, items.length))];
    return `
      <div class="quote-actions">
        <button class="btn btn-primary" data-action="save-images">${icon('image')}บันทึกรูป</button>
        <button class="btn btn-ghost" data-action="print">${icon('print')}PDF</button>
        <button class="btn btn-ghost" data-action="share-issue">${icon('share')}แชร์</button>
      </div>
      <p class="quote-hint">ใบแจ้งออกกรมธรรม์ ${pages.length} หน้า (A4) · ใบแจ้ง + ใบเสนอราคา${items.length ? ` + เอกสารแนบ ${items.length} รูป` : ''}</p>
      <div class="pages">${pages.map((p) => `<div class="quote-stage"><div class="quote-scaler">${p}</div></div>`).join('')}</div>
      <button class="btn btn-ghost btn-block restart" data-action="restart">${icon('refresh')}เช็คเบี้ยคันใหม่</button>`;
  }

  function issuePage(v, o) {
    const is = state.issue;
    const q = state.quote;
    const p = pricing(o, v);
    const name = state.customer.name.trim();
    const phone = state.customer.phone.trim();
    const dl = (rows) => rows.map(([k, val]) => `<div><dt>${k}</dt><dd>${val}</dd></div>`).join('');

    const or = (s, alt = '—') => (s && s.trim() ? esc(s.trim()) : `<i class="qp-na">${alt}</i>`);
    const cust = [
      ['ชื่อ-นามสกุล', esc(name)],
      ['โทรศัพท์', or(phone)],
      ['เลขบัตรประชาชน', or(is.idNo)],
      ['วันเกิด', is.birthDate ? thDate(is.birthDate) : '<i class="qp-na">—</i>'],
      ['อีเมล', or(is.email)],
      ['วันที่เริ่มคุ้มครอง', is.startDate ? thDate(is.startDate) : '<i class="qp-na">แจ้งภายหลัง / ตามที่บริษัทกำหนด</i>'],
    ];
    const reg = [
      ['ทะเบียนรถ', or(is.plate, 'ดูสำเนาเล่มทะเบียน')],
      ['จังหวัด', or(is.province, 'ดูสำเนาเล่มทะเบียน')],
      ['เลขตัวถัง', or(is.chassis, 'ดูสำเนาเล่มทะเบียน')],
      ['เลขเครื่องยนต์', or(is.engine, 'ดูสำเนาเล่มทะเบียน')],
      ['สีรถ', or(is.color, 'ดูสำเนาเล่มทะเบียน')],
    ];
    const plan = [];
    if (o.type === 'plus') plan.push(['ทุนประกันรถชนรถ', `${money(o.sum)} บาท`]);
    if (o.type !== 'tawikoon') plan.push(['ค่าเสียหายส่วนแรก', o.deductible ? `${money(o.deductible)} บาท` : 'ไม่มี']);
    plan.push(['เบี้ยประกันภัย', `${money(p.premium)} บาท`]);
    if (p.cmi) plan.push(['พ.ร.บ.', `${signed(p.cmi)} บาท`]);

    const docs = [
      [`ใบเสนอราคา เลขที่ ${q.no}`, 1, 'หน้า'],
      ...ATTACH_GROUPS.map((g) => [g.label, attachments[g.id].length, 'รูป']),
    ];

    return `
      <article class="qp qp-issue" data-fit>
        <div class="qp-inner">
          ${docHead('ใบแจ้งออกกรมธรรม์', 'ประกันภัยรถยนต์ภาคสมัครใจ')}
          <div class="qp-meta">
            <div><small>ผู้เอาประกันภัย</small><b>${esc(name)}</b></div>
            <div><small>เลขที่</small><b>${esc(is.no)}</b></div>
            <div><small>วันที่</small><b>${thDate(is.date)}</b></div>
          </div>
          <section class="qp-sec">
            <h4>ข้อมูลผู้เอาประกันภัย</h4>
            <dl class="qp-dl">${dl(cust)}</dl>
            <dl class="qp-dl one"><div><dt>ที่อยู่จัดส่งเอกสาร / กรมธรรม์</dt><dd>${esc(is.address.trim())}</dd></div></dl>
          </section>
          <section class="qp-sec">
            <h4>รายละเอียดรถยนต์</h4>
            <dl class="qp-car">${dl(carRows(v))}</dl>
            <dl class="qp-dl reg">${dl(reg)}</dl>
          </section>
          <section class="qp-sec">
            <h4>แผนประกันภัยที่ตกลงทำ</h4>
            <div class="qp-plan">
              <div class="qp-plan-head">
                <span class="qp-badges"><span class="cls ${CLS_CLASS[o.cls]}">ชั้น ${o.cls}</span>${o.tier ? `<span class="tier t-${o.tier.toLowerCase()}">${o.tier}</span>` : ''}</span>
                <b>${esc(o.product)}</b><small>${esc(o.planTh)}</small>
              </div>
              <dl class="qp-dl">${dl(plan)}</dl>
              <div class="qp-plan-total"><span>เบี้ยประกันภัยรวมทั้งสิ้น</span><b>${money(p.total)} บาท</b></div>
            </div>
            <p class="qp-ref">อ้างอิงใบเสนอราคาเลขที่ ${esc(q.no)} ลงวันที่ ${thDate(q.date)} (แนบท้าย) · ความคุ้มครองและเงื่อนไขตามใบเสนอราคา</p>
          </section>
          <section class="qp-sec">
            <h4>เอกสารประกอบการออกกรมธรรม์</h4>
            <ul class="qp-check">${docs.map(([l, n, u]) => `<li class="${n ? 'ok' : 'none'}">${icon(n ? 'check' : 'x')}<span>${esc(l)}</span><small>${n ? `${n} ${u}` : 'ไม่มี'}</small></li>`).join('')}</ul>
          </section>
          ${is.note.trim() ? `<section class="qp-sec"><h4>หมายเหตุ</h4><p class="qp-note">${esc(is.note.trim())}</p></section>` : ''}
          <section class="qp-sec qp-admin">
            <h4>สำหรับเจ้าหน้าที่บริษัท</h4>
            <div class="qp-admin-box">
              <div><small>เลขที่กรมธรรม์</small><span></span></div>
              <div><small>วันที่ออกกรมธรรม์</small><span></span></div>
              <div><small>ผู้บันทึก</small><span></span></div>
              <div class="wide"><small>หมายเหตุเจ้าหน้าที่</small><span></span></div>
            </div>
          </section>
          <section class="qp-sec qp-sign">
            <div><span></span><b>ผู้เอาประกันภัย</b><small>(${esc(name)})</small></div>
            <div><span></span><b>ตัวแทน</b><small>(${esc(AGENT.name)} · โทร ${esc(AGENT.phone)})</small></div>
          </section>
          ${docFoot()}
        </div>
      </article>`;
  }

  function attachmentPage(it, i, n) {
    return `
      <article class="qp qp-attach">
        <div class="qp-inner">
          ${docHead('เอกสารแนบ', `${esc(it.label)} · ${i}/${n}`)}
          <div class="qp-meta">
            <div><small>ผู้เอาประกันภัย</small><b>${esc(state.customer.name.trim())}</b></div>
            <div><small>ใบแจ้งเลขที่</small><b>${esc(state.issue.no)}</b></div>
            <div><small>เอกสาร</small><b>${esc(it.label)}</b>${/หน้า \d+\/\d+$/.test(it.name) ? `<br><small>${esc(it.name)}</small>` : ''}</div>
          </div>
          <div class="qp-attach-img"><img src="${it.dataUrl}" alt="${esc(it.label)}"></div>
          ${docFoot()}
        </div>
      </article>`;
  }

  function issueShareText() {
    const v = vehicle();
    const o = issueOffer(v);
    const is = state.issue;
    const p = pricing(o, v);
    const lines = [
      'ใบแจ้งออกกรมธรรม์ประกันภัยรถยนต์ มิตรแท้ประกันภัย',
      `เลขที่ ${is.no} (อ้างอิงใบเสนอราคา ${state.quote.no})`,
      `ผู้เอาประกันภัย: ${state.customer.name.trim()}${state.customer.phone.trim() ? ` โทร ${state.customer.phone.trim()}` : ''}`,
    ];
    if (is.idNo.trim()) lines.push(`เลขบัตรประชาชน: ${is.idNo.trim()}`);
    if (is.birthDate) lines.push(`วันเกิด: ${thDate(is.birthDate)}`);
    if (is.email.trim()) lines.push(`อีเมล: ${is.email.trim()}`);
    lines.push(`รถ: ${v.name} ปี ${yearLabel(v.year)}`);
    const reg = [['ทะเบียน', is.plate], ['จังหวัด', is.province], ['เลขตัวถัง', is.chassis], ['เลขเครื่อง', is.engine], ['สี', is.color]].filter(([, x]) => x.trim());
    if (reg.length) lines.push(`   ${reg.map(([k, x]) => `${k} ${x.trim()}`).join(' · ')}`);
    lines.push('', `แผน: ${shortName(o)} ${o.product}`, `   ${pickDetail(o)}`, `   เบี้ยรวม ${money(p.total)} บาท`);
    if (is.startDate) lines.push(`เริ่มคุ้มครอง: ${thDate(is.startDate)}`);
    lines.push('', `ที่อยู่จัดส่งเอกสาร: ${is.address.trim()}`);
    if (is.note.trim()) lines.push(`หมายเหตุ: ${is.note.trim()}`);
    lines.push('', `เอกสารแนบ: ${ATTACH_GROUPS.map((g) => `${g.label} ${attachments[g.id].length} รูป`).join(', ')}`);
    lines.push('', `${AGENT.office} ${AGENT.name}`, `โทร ${AGENT.phone}`);
    return lines.join('\n');
  }

  // ย่อขนาดตัวอักษรจนเนื้อหาพอดี A4 หนึ่งหน้า แล้วย่อทุกหน้าให้พอดีความกว้างจอ
  function fitPage(page) {
    const inner = page.querySelector('.qp-inner');
    // วัดความสูงจริงของเนื้อหา (ไม่ยืดเต็มหน้า) และเผื่อที่ว่างไว้ เพราะตอนบันทึกรูปตัวอักษรกว้างกว่าบนจอเล็กน้อย
    page.classList.add('is-measuring');
    let fs = 13;
    page.style.setProperty('--qfs', `${fs}px`);
    while (inner.offsetHeight > PAGE_H - 24 && fs > 8) {
      fs -= 0.25;
      page.style.setProperty('--qfs', `${fs}px`);
    }
    page.classList.remove('is-measuring');
  }

  function layoutPages() {
    document.querySelectorAll('.qp[data-fit]').forEach(fitPage);
    scalePages();
  }

  function scalePages() {
    document.querySelectorAll('.quote-stage').forEach((stage) => {
      const scaler = stage.querySelector('.quote-scaler');
      const s = Math.min(1, stage.clientWidth / PAGE_W);
      scaler.style.transform = `scale(${s})`;
      stage.style.height = `${Math.ceil(PAGE_H * s)}px`;
    });
  }

  function shareText() {
    const v = vehicle();
    const offers = pickedOffers(v);
    const lines = [
      'ใบเสนอราคาประกันภัยรถยนต์ มิตรแท้ประกันภัย',
      `เลขที่ ${state.quote.no}`,
      `ลูกค้า: ${state.customer.name.trim()}`,
      `รถ: ${v.name} ปี ${yearLabel(v.year)}`,
      '',
    ];
    offers.forEach((o, i) => {
      const p = pricing(o, v);
      lines.push(`${i + 1}) ${shortName(o)} ${o.product}`);
      lines.push(`   ${pickDetail(o)}`);
      lines.push(`   เบี้ยรวม ${money(p.total)} บาท`);
    });
    const extra = [];
    if (state.addons.cmi) extra.push('รวม พ.ร.บ.');
    if (extra.length) lines.push('', `(รวม ${extra.join(' · ')} แล้ว)`);
    lines.push('', `${AGENT.office} ${AGENT.name}`, `โทร ${AGENT.phone}`);
    return lines.join('\n');
  }

  // ---------- bottom sheet ----------
  const sheetEl = $('#sheet');
  let sheet = null;
  let skipPop = false;

  function openSheet(cfg) {
    sheet = { query: '', ...cfg };
    sheetEl.innerHTML = `
      <div class="sheet-backdrop" data-action="sheet-close"></div>
      <div class="sheet-panel" role="dialog" aria-modal="true" aria-label="${esc(cfg.title)}">
        <div class="sheet-head"><b>${esc(cfg.title)}</b><button class="icon-btn" data-action="sheet-close" aria-label="ปิด">${icon('x')}</button></div>
        ${cfg.search ? `<div class="sheet-search">${icon('search')}<input id="sheetSearch" type="search" placeholder="${esc(cfg.placeholder || 'ค้นหา')}" autocomplete="off"></div>` : ''}
        <ul class="sheet-list" id="sheetList"></ul>
      </div>`;
    drawSheetList();
    sheetEl.hidden = false;
    document.body.classList.add('no-scroll');
    history.pushState({ view: state.view, depth: depth() + 1, sheet: true }, '');
    const input = $('#sheetSearch');
    if (input && window.matchMedia('(pointer: fine)').matches) input.focus();
  }

  function drawSheetList() {
    const q = sheet.query.trim().toLowerCase();
    const items = sheet.items.filter((it) => !q || `${it.label} ${it.sub || ''}`.toLowerCase().includes(q));
    const extra = sheet.extra ? sheet.extra(sheet.query.trim()) : null;
    const all = extra ? items.concat(extra) : items;
    $('#sheetList').innerHTML = all.length
      ? all.map((it) => `
          <li><button class="${it.selected ? 'is-on' : ''} ${it.muted ? 'muted' : ''}" data-action="sheet-pick" data-value="${esc(it.value)}">
            <span>${esc(it.label)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}${it.selected ? icon('check') : ''}
          </button></li>`).join('')
      : '<li class="sheet-empty">ไม่พบรายการ</li>';
  }

  function hideSheet() {
    sheet = null;
    sheetEl.hidden = true;
    sheetEl.innerHTML = '';
    document.body.classList.remove('no-scroll');
  }

  function closeSheet() {
    if (!sheet) return;
    hideSheet();
    skipPop = true;
    history.back();
  }

  // ---------- actions ----------
  function scrollToStep(id) {
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function nextStepId() {
    const m = getModel();
    if (!m || !m.kind) return 'step-model';
    if (!state.year) return 'step-year';
    if (needsBody(m.kind) && !state.body) return 'step-body';
    return 'seePlans';
  }

  function resetCar() {
    Object.assign(state, { modelName: null, customModel: false, customModelName: '', customKind: null, year: null, body: null, usage: 'personal' });
  }

  function selectBrand(id, customName) {
    if (state.brandId === id && !customName) return;
    state.brandId = id;
    state.customBrand = customName || '';
    resetCar();
    if (id === 'other') state.customModel = true;
    render();
    scrollToStep('step-model');
  }

  function selectModel(name) {
    const prev = getModel();
    state.modelName = name;
    state.customModel = false;
    const m = getModel();
    if (!prev || m.kind !== prev.kind) state.body = null;
    if (state.year && !yearsFor(m).includes(state.year)) state.year = null;
    render();
    scrollToStep(nextStepId());
  }

  function pickCustomModel() {
    state.customModel = true;
    state.modelName = null;
    state.customKind = null;
    state.body = null;
    render();
    scrollToStep('step-model');
  }

  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  function togglePick(key) {
    const o = buildOffers(vehicle()).find((x) => x.key === key);
    if (!o) return;
    const p = pickFromOffer(o);
    const idx = state.picks.findIndex((x) => pickId(x) === pickId(p));
    if (idx >= 0) {
      state.picks.splice(idx, 1);
    } else if (state.picks.length >= MAX_PICKS) {
      toast(`เลือกได้สูงสุด ${MAX_PICKS} แผนต่อใบเสนอราคา`);
      return;
    } else {
      state.picks.push(p);
    }
    render();
  }

  function updatePick(index, patch) {
    const next = { ...state.picks[index], ...patch };
    if (state.picks.some((p, j) => j !== index && pickId(p) === pickId(next))) {
      toast('มีแผนนี้ในใบเสนอราคาแล้ว');
    } else {
      state.picks[index] = next;
    }
    render();
  }

  function makeQuote() {
    const name = state.customer.name.trim();
    const phone = state.customer.phone.trim();
    $('#nameError').hidden = !!name;
    const digits = phone.replace(/\D/g, '');
    const phoneBad = !!phone && (digits.length < 9 || digits.length > 10);
    $('#phoneError').hidden = !phoneBad;
    if (!name) { $('#custName').focus(); return; }
    if (phoneBad) { $('#custPhone').focus(); return; }
    const now = new Date();
    const pad = (x) => String(x).padStart(2, '0');
    state.quote = {
      no: `MT${String(now.getFullYear() + 543).slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      date: now.toISOString(),
    };
    go('quote');
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // html-to-image อ่านสไตล์ชีตข้าม origin ของ Google Fonts ไม่ได้ → ฝังฟอนต์ไทย/ละตินเองเป็น data URL
  // ไม่เช่นนั้นรูปจะใช้ฟอนต์สำรองที่กว้างกว่า ทำให้ข้อความตัดบรรทัดทับกัน
  let fontCSS = null;
  async function embeddedFontCSS() {
    if (fontCSS !== null) return fontCSS;
    try {
      const link = document.querySelector('link[href*="fonts.googleapis.com/css2"]');
      const raw = await (await fetch(link.href)).text();
      let css = raw.split('/* ')
        .filter((b) => b.startsWith('thai */') || b.startsWith('latin */'))
        .map((b) => b.slice(b.indexOf('*/') + 2))
        .join('\n');
      const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)'"\s]+/g) || [])];
      const toDataURL = (blob) => new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.readAsDataURL(blob);
      });
      await Promise.all(urls.map(async (u) => {
        const data = await toDataURL(await (await fetch(u)).blob());
        css = css.split(u).join(data);
      }));
      fontCSS = css;
    } catch (e) {
      fontCSS = '';
    }
    return fontCSS;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function download(file) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  // บันทึกหน้าเอกสาร (.qp) เป็น PNG — หลายหน้าจะแชร์เป็นหลายไฟล์ในครั้งเดียวบนมือถือ
  async function savePages(btn, pages, name, title) {
    btn.disabled = true;
    toast(pages.length > 1 ? `กำลังสร้างรูปภาพ ${pages.length} หน้า…` : 'กำลังสร้างรูปภาพ…');
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js');
      const fontEmbedCSS = await embeddedFontCSS();
      const files = [];
      for (let i = 0; i < pages.length; i++) {
        const blob = await window.htmlToImage.toBlob(pages[i], { width: PAGE_W, height: PAGE_H, pixelRatio: 2, backgroundColor: '#ffffff', fontEmbedCSS });
        files.push(new File([blob], `${name}${pages.length > 1 ? `-${i + 1}` : ''}.png`, { type: 'image/png' }));
      }
      const mobile = window.matchMedia('(pointer: coarse)').matches;
      if (mobile && navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files, title });
      } else {
        for (const f of files) { download(f); await sleep(400); }
        toast(files.length > 1 ? `บันทึกรูปภาพ ${files.length} ไฟล์แล้ว` : 'บันทึกรูปภาพแล้ว');
      }
    } catch (e) {
      if (e && e.name !== 'AbortError') toast('สร้างรูปภาพไม่สำเร็จ ลองใช้ปุ่ม PDF');
    } finally {
      btn.disabled = false;
    }
  }

  async function share(title, text) {
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast('คัดลอกข้อความแล้ว');
    } catch (e) {
      if (e && e.name !== 'AbortError') toast('แชร์ไม่สำเร็จ');
    }
  }

  const openCov = new Set();

  document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (d.matches && d.matches('details.cov')) d.open ? openCov.add(d.dataset.key) : openCov.delete(d.dataset.key);
  }, true);

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.tagName === 'SELECT') return;
    const val = el.dataset.value;

    switch (el.dataset.action) {
      case 'back': goBack(); break;
      case 'brand': selectBrand(val); break;
      case 'brand-more': {
        const current = getBrand();
        openSheet({
          title: 'เลือกยี่ห้อรถ',
          search: true,
          placeholder: 'ค้นหายี่ห้อ เช่น Toyota, BYD',
          items: [...BRANDS].sort((a, b) => a.name.localeCompare(b.name)).map((b) => ({ value: b.id, label: b.name, sub: b.th, selected: current && current.id === b.id })),
          extra: (q) => [{ value: '__other', label: q ? `ใช้ยี่ห้อ “${q}”` : 'ไม่พบยี่ห้อรถ', sub: 'ยี่ห้ออื่นที่ไม่มีในรายการ', muted: true }],
          onPick: (v, q) => (v === '__other' ? selectBrand('other', q) : selectBrand(v)),
        });
        break;
      }
      case 'model': selectModel(val); break;
      case 'model-more': {
        const brand = getBrand();
        const model = getModel();
        openSheet({
          title: `รุ่นรถ ${brand.name}`,
          search: brand.models.length > TOP_MODELS,
          placeholder: 'ค้นหารุ่นรถ',
          items: brand.models.map((m) => ({ value: m.name, label: m.name, sub: KINDS[m.kind].short, selected: model === m })),
          extra: () => [{ value: '__custom', label: 'ไม่พบรุ่นรถ', sub: 'ระบุรุ่นและประเภทรถเอง', muted: true }],
          onPick: (v) => (v === '__custom' ? pickCustomModel() : selectModel(v)),
        });
        break;
      }
      case 'kind':
        state.customKind = val;
        state.body = null;
        render();
        scrollToStep(nextStepId());
        break;
      case 'year':
        state.year = Number(val);
        render();
        scrollToStep(nextStepId());
        break;
      case 'year-more': {
        const model = getModel();
        openSheet({
          title: 'เลือกปีรถยนต์',
          items: yearsFor(model).map((y) => ({ value: String(y), label: yearLabel(y), selected: state.year === y })),
          onPick: (v) => { state.year = Number(v); render(); scrollToStep(nextStepId()); },
        });
        break;
      }
      case 'body':
        state.body = val;
        render();
        scrollToStep('seePlans');
        break;
      case 'see-plans':
        if (!isComplete()) break;
        if (state.picksSig !== carSig()) {
          state.picks = [];
          state.picksSig = carSig();
          state.filter = 'all';
        }
        go('plans');
        break;
      case 'edit-car':
        if (depth() > 0 && history.state && history.state.view === 'plans') goBack();
        else go('search');
        break;
      case 'usage': state.usage = val; render(); break;
      case 'filter': state.filter = val; render(); break;
      case 'deduct': state.deduct = val === '1'; render(); break;
      case 'pick': togglePick(val); break;
      case 'unpick': state.picks.splice(Number(val), 1); render(); break;
      case 'to-checkout': go('checkout'); break;
      case 'cmi': state.addons.cmi = !state.addons.cmi; render(); break;
      case 'make-quote': makeQuote(); break;
      case 'save-image': savePages(el, [$('#quoteDoc')], `ใบเสนอราคา-${state.quote.no}`, 'ใบเสนอราคาประกันภัยรถยนต์'); break;
      case 'save-images': savePages(el, [...document.querySelectorAll('.pages .qp')], `ใบแจ้งออกกรมธรรม์-${state.issue.no}`, 'ใบแจ้งออกกรมธรรม์'); break;
      case 'print': window.print(); break;
      case 'share': share('ใบเสนอราคาประกันภัยรถยนต์', shareText()); break;
      case 'share-issue': share('ใบแจ้งออกกรมธรรม์', issueShareText()); break;
      case 'to-issue': go('issue'); break;
      case 'to-coverage': go('coverage'); break;
      case 'cov-group': state.covGroup = Number(val); render(); break;
      case 'issue-pick': state.issue.pick = val; render(); break;
      case 'attach-remove':
        attachments[el.dataset.group] = attachments[el.dataset.group].filter((a) => String(a.id) !== val);
        render();
        break;
      case 'make-issue': makeIssue(); break;
      case 'restart': {
        state = { ...initialState(), deduct: state.deduct };
        attachments = emptyAttachments();
        history.replaceState({ view: 'search', depth: 0 }, '', '#search');
        render();
        window.scrollTo(0, 0);
        break;
      }
      case 'sheet-close': closeSheet(); break;
      case 'sheet-pick': {
        const { onPick, query } = sheet;
        closeSheet();
        onPick(val, query.trim());
        break;
      }
      default: break;
    }
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    const action = el.dataset && el.dataset.action;
    if (action === 'sum') {
      state.sums[el.dataset.pid] = Number(el.value);
      render();
    } else if (action === 'pick-sum') {
      updatePick(Number(el.dataset.index), { sum: Number(el.value) });
    } else if (action === 'pick-deduct') {
      updatePick(Number(el.dataset.index), { deduct: el.value === '1' });
    } else if (action === 'attach') {
      const files = [...el.files];
      el.value = '';
      if (files.length) addAttachments(el.dataset.group, files);
    }
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.id === 'sheetSearch' && sheet) { sheet.query = el.value; drawSheetList(); return; }
    if (el.id === 'custName') { state.customer.name = el.value; $('#nameError').hidden = true; save(); return; }
    if (el.id === 'custPhone') { state.customer.phone = el.value; $('#phoneError').hidden = true; save(); return; }
    if (el.id === 'issIdNo') { state.issue.idNo = el.value; $('#idNoError').hidden = true; save(); return; }
    if (el.id === 'issAddress') { state.issue.address = el.value; $('#addressError').hidden = true; save(); return; }
    const issueFields = { issStart: 'startDate', issNote: 'note', issBirth: 'birthDate', issEmail: 'email', issPlate: 'plate', issProvince: 'province', issChassis: 'chassis', issEngine: 'engine', issColor: 'color' };
    if (issueFields[el.id]) { state.issue[issueFields[el.id]] = el.value; save(); return; }
    if (el.id === 'customModelName') { state.customModelName = el.value; save(); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheet) closeSheet();
  });

  window.addEventListener('resize', scalePages);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutPages);

  window.addEventListener('popstate', (e) => {
    if (skipPop) { skipPop = false; return; }
    if (sheet) { hideSheet(); return; }
    state.view = (e.state && e.state.view) || 'search';
    render();
    window.scrollTo(0, 0);
  });

  // ---------- boot ----------
  const hashView = location.hash.replace('#', '');
  state.view = ['search', 'plans', 'checkout', 'quote', 'issue', 'issuedoc', 'coverage'].includes(hashView) ? hashView : 'search';
  history.replaceState({ view: state.view, depth: 0 }, '', `#${state.view}`);
  render();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
