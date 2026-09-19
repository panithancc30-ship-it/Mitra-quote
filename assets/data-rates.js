/*
 * อัตราเบี้ยประกันภัยรถยนต์ภาคสมัครใจ มิตรแท้ประกันภัย
 * ทุกราคาเป็น "เบี้ยรวมภาษีมูลค่าเพิ่มและอากรแสตมป์" (บาท/ปี)
 * ที่มา: โฟลเดอร์ "ข้อมูลเบี้ยประกัน - แอปเชคเบี้ยมิตรแท้" (PDF ต้นฉบับ + Google Sheet)
 *
 * ถ้าบริษัทปรับอัตราเบี้ย แก้ตัวเลขในไฟล์นี้ไฟล์เดียว
 */
window.MT_RATES = {
  // พ.ร.บ. (รวมภาษีอากร) ตามรหัสรถ — ตรงกับส่วนต่างราคา "รวม/ไม่รวม พ.ร.บ." ในตาราง ป.3 มิตรแท้ทวีคูณ
  compulsory: { '110': 645.21, '120': 645.21, '210': 1182.35, '320': 967.28 },

  // เงื่อนไขร่วมของ มิตรแท้เพิ่มพูน 2+ และ 3+
  plusRules: {
    maxAge: 15, // อายุรถเกิน 15 ปี (นับจากปีจดทะเบียน) ต้องส่งพิจารณาอนุมัติ
    // ตารางลูกค้าใหม่ปี 2569 (รถเก๋ง 110 และกระบะ 320 ทั่วไป) มีผล 16 ก.ย. – 31 ธ.ค. 2569
    newCustomer: {
      label: 'อัตราสำหรับลูกค้าใหม่ปี 2569',
      period: '16 ก.ย. – 31 ธ.ค. 2569',
      advanceNcd: 500,
      definition: 'ไม่มีกรมธรรม์ภาคสมัครใจกับบริษัทในปี 2568 หรือมีประเภท 1/2/3 ในปี 2568 แล้วปี 2569 ทำ 2+/3+ หรือมีประเภท 3+ ในปี 2568 แล้วปี 2569 ทำ 2+',
    },
    // เงื่อนไขเพิ่มเติมของกระบะต่อเติมตู้ทึบ/ตู้แห้ง/ตู้เย็น (ตารางอัตราเบี้ยปี 2569)
    fridge: {
      tppdDeductible: 5000, // ค่าเสียหายส่วนแรกต่อทรัพย์สินบุคคลภายนอก
      exclusions: ['รถ Load เตี้ย', 'รถที่ติด Skirt ที่เป็นงานปั้น'],
    },
  },

  plus: {
    plus2: {
      cls: '2+',
      name: 'มิตรแท้เพิ่มพูน 2+',
      deductible: 2000,
      sums: [100000, 150000, 200000, 250000, 300000, 350000],
      // deduct = มี Deduct 2,000 บาท, noDeduct = ไม่มี Deduct — เรียงตาม sums
      rates: {
        standard: { // รถเก๋ง/รถตลาด รหัส 110 และรถปิคอัพไม่เกิน 4 ตัน รหัส 320 — ตารางลูกค้าใหม่ปี 2569
          PLATINUM: { deduct: [6520, 6920, 7320, 7720, 8020, 8320], noDeduct: [7220, 7720, 8220, 8720, 9220, 9420] },
          GOLD: { deduct: [6100, 6500, 6900, 7300, 7600, 7900], noDeduct: [6800, 7300, 7800, 8300, 8800, 9200] },
          SILVER: { deduct: [5400, 5800, 6100, 6400, 6600, 6900], noDeduct: [6100, 6600, 7000, 7400, 7800, 8200] },
        },
        fridge: { // รถปิคอัพไม่เกิน 4 ตัน รหัส 320 ต่อเติมตู้ทึบ/ตู้แห้ง/ตู้เย็น — อัตราปี 2569 มีเฉพาะแบบมี Deduct
          GOLD: { deduct: [15200, 15700, 16300, 16800, 17200, 17600] },
          SILVER: { deduct: [13700, 14200, 14600, 15000, 15200, 15600] },
        },
      },
      coverage: {
        // เงินชดเชยรายได้/ค่าเดินทาง มีเฉพาะ PLATINUM ตาม PDF ต้นฉบับ
        // (Google Sheet ใส่ 1,000 ให้ GOLD ด้วย ซึ่งไม่ตรงกับ PDF)
        PLATINUM: { tpbiPerson: 500000, tpbiTime: 20000000, tppd: 2000000, theftFire: true, pa: 150000, med: 150000, bail: 600000, dailyComp: 1000, travelComp: 1000 },
        GOLD: { tpbiPerson: 500000, tpbiTime: 20000000, tppd: 2000000, theftFire: true, pa: 150000, med: 150000, bail: 600000 },
        SILVER: { tpbiPerson: 500000, tpbiTime: 20000000, tppd: 1000000, theftFire: true, pa: 50000, med: 50000, bail: 200000 },
      },
    },

    plus3: {
      cls: '3+',
      name: 'มิตรแท้เพิ่มพูน 3+',
      deductible: 2000,
      sums: [20000, 30000, 40000, 50000, 100000, 150000, 200000, 250000],
      rates: {
        standard: { // ตารางลูกค้าใหม่ปี 2569
          GOLD: { deduct: [5200, 5200, 5200, 5200, 5400, 5600, 5800, 6100], noDeduct: [6300, 6300, 6300, 6300, 6400, 6600, 6900, 7200] },
          SILVER: { deduct: [4200, 4200, 4200, 4200, 4200, 4900, 5100, 5400], noDeduct: [5200, 5200, 5200, 5200, 5200, 5900, 6200, 6500] },
        },
        fridge: { // อัตราปี 2569 มีเฉพาะแบบมี Deduct
          GOLD: { deduct: [13100, 13100, 13100, 13100, 13300, 13600, 13800, 14200] },
          SILVER: { deduct: [11500, 11500, 11500, 11500, 11800, 12000, 12300, 12700] },
        },
      },
      coverage: {
        GOLD: { tpbiPerson: 500000, tpbiTime: 20000000, tppd: 2000000, theftFire: false, pa: 150000, med: 150000, bail: 600000 },
        SILVER: { tpbiPerson: 500000, tpbiTime: 20000000, tppd: 1000000, theftFire: false, pa: 50000, med: 50000, bail: 200000 },
      },
    },
  },

  // มิตรแท้เพิ่มพูน 2+ ซ่อมห้าง — รถเก๋งส่วนบุคคล รหัส 110 เฉพาะรุ่นที่ระบุ มีผล 24 ส.ค. – 31 ธ.ค. 2569
  dealer: {
    cls: '2+',
    name: 'มิตรแท้เพิ่มพูน 2+ ซ่อมห้าง',
    period: '24 ส.ค. – 31 ธ.ค. 2569',
    maxAge: 10,
    accessories: 5000, // คุ้มครองอุปกรณ์ตกแต่งเพิ่มเติม
    sums: [100000, 200000, 300000],
    // ไม่มีค่าเสียหายส่วนแรก — เรียงตาม sums
    rates: {
      A: { PLATINUM: [9300, 10300, 11300], GOLD: [8880, 9880, 10880] }, // เก๋ง Eco Car / เก๋งเล็ก / SUV
      B: { PLATINUM: [10300, 11300, 12300], GOLD: [9880, 10880, 11880] }, // เก๋งกลาง
    },
    coverage: {
      PLATINUM: { tpbiPerson: 500000, tpbiTime: 20000000, tppd: 2000000, theftFire: true, pa: 150000, med: 150000, bail: 300000, natural: 20000, dailyComp: 1000, travelComp: 1000 },
      GOLD: { tpbiPerson: 500000, tpbiTime: 20000000, tppd: 2000000, theftFire: true, pa: 150000, med: 150000, bail: 300000, natural: 20000 },
    },
    // ยี่ห้อ (id ใน data-cars.js) → ชื่อรุ่นที่รับประกัน
    models: {
      A: {
        honda: ['Brio', 'City', 'City Hatchback', 'Jazz', 'Mobilio', 'BR-V', 'WR-V', 'CR-V', 'HR-V'],
        mitsubishi: ['Mirage', 'Attrage', 'Xpander', 'Xpander Cross', 'Pajero Sport', 'Xforce'],
        nissan: ['Almera', 'March', 'Note', 'Juke', 'X-Trail', 'Terra'],
        suzuki: ['Swift', 'Celerio', 'Ciaz', 'Ertiga', 'XL7'],
        toyota: ['Yaris', 'Yaris ATIV', 'Vios', 'Fortuner', 'Veloz', 'Corolla Cross', 'Yaris Cross'],
        mazda: ['Mazda2', 'CX-5'],
        mg: ['MG3', 'MG5', 'MG ZS'],
        ford: ['Everest'],
        isuzu: ['MU-X'],
        gwm: ['Haval H6', 'Haval Jolion', 'Tank 300'],
      },
      B: {
        honda: ['Civic'],
        mazda: ['CX-3', 'CX-30', 'Mazda3'],
        mg: ['MG6'],
        nissan: ['Kicks'],
        toyota: ['Corolla Altis', 'Sienta', 'C-HR'],
      },
    },
  },

  // ป.3 มิตรแท้ทวีคูณ — เบี้ยไม่รวม พ.ร.บ. แยกตามรหัสรถ
  tawikoon: {
    cls: '3',
    name: 'มิตรแท้ทวีคูณ',
    rates: {
      '110': { NOPA: 2299, PA50: 2600, PA100: 2800 }, // รถเก๋งส่วนบุคคล
      '120': { NOPA: 3500, PA50: 3700, PA100: 3900 }, // รถเก๋งเพื่อการพาณิชย์
      '320': { NOPA: 3200, PA50: 3400, PA100: 3600 }, // รถกระบะบรรทุกไม่เกิน 4 ตัน
      '210': { NOPA: 3800 }, // รถตู้ส่วนบุคคลไม่เกิน 15 ที่นั่ง
    },
    plans: {
      NOPA: { label: 'ไม่มี PA', coverage: { tpbiPerson: 500000, tpbiTime: 20000000, tppd: 1000000, pa: 0, med: 0, bail: 100000 } },
      PA50: { label: 'พลัส PA 50,000', coverage: { tpbiPerson: 500000, tpbiTime: 20000000, tppd: 1000000, pa: 50000, med: 50000, bail: 200000 } },
      PA100: { label: 'พลัส PA 100,000', coverage: { tpbiPerson: 500000, tpbiTime: 20000000, tppd: 1500000, pa: 100000, med: 100000, bail: 300000 } },
    },
  },

  // ป.3 รถยนต์บรรทุก รหัส 320 ใช้เพื่อการพาณิชย์ (ราคาสำหรับรถที่ติดกล้อง)
  truck: {
    cls: '3',
    name: 'รถบรรทุก ประเภท 3',
    tppdOptions: [200000, 600000], // ลำดับตรงกับตัวเลขในตาราง rates
    coverage: { tpbiPerson: 500000, tpbiTime: 20000000, pa: 100000, med: 100000 },
    sizes: {
      le12: {
        label: 'ขนาดไม่เกิน 12 ตัน',
        deductible: 3000, // ค่าเสียหายส่วนแรกต่อทรัพย์สินบุคคลภายนอก
        bail: 700000,
        rates: {
          plain: { deduct: [10500, 10700], noDeduct: [13000, 13200] }, // ไม่มีอุปกรณ์พิเศษ
          equip: { deduct: [11200, 11400], noDeduct: [14000, 14200] }, // มีอุปกรณ์พิเศษ
        },
      },
      gt12: {
        label: 'ขนาดเกิน 12 ตัน',
        deductible: 4000,
        bail: 1200000,
        rates: {
          plain: { deduct: [15300, 15600], noDeduct: [17700, 18100] },
          equip: { deduct: [16300, 16600], noDeduct: [18900, 19400] },
        },
      },
    },
  },

  contact: { center: '0-2640-7777', accident: '1741' },
};
