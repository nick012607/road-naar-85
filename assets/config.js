/* ============================================================
   CONFIG — dit is het enige bestand dat je hoeft in te vullen.
   ============================================================ */

/* 1. Supabase. Te vinden in je dashboard onder
      Project Settings → API → Project URL en anon public key. */
const SUPABASE = {
  url:     'https://iwcqgimehazjktzlbqoi.supabase.co',
  anonKey: 'sb_publishable_33-_vNzUYvgJH-L4wf4OvQ_hhfhdrD_'
};

/* 2. Het streefgewicht waar jullie allebei naartoe werken. */
const TARGET = 85.0;

/* 3. De twee deelnemers.
      mode 'cut'  = moet afvallen naar TARGET  → adjust is een tekort
      mode 'bulk' = moet aankomen naar TARGET  → adjust is een overschot     */
const PROFILES = {
  nick: {
    name:   'Nick',
    color:  '#A72B37',
    tint:   '#FBEEF0',
    height: 182,        // cm
    age:    19,
    activity: 1.65,     // 5x gym + 1-2x padel + 1x cardio
    mode:   'cut',
    adjust: 750,        // kcal per dag onder onderhoud
    proteinPerKg: 1.9
  },
  victor: {
    name:   'Victor',
    color:  '#1F5C8B',
    tint:   '#EDF3F9',
    height: 182,        // cm
    age:    20,
    activity: 1.65,
    mode:   'bulk',
    adjust: 700,        // kcal per dag boven onderhoud
    proteinPerKg: 1.8
  }
};

/* 4. Vaste referentiepunten. De app vult zichzelf verder met wat je invoert. */
const SEED = [
  { person:'nick',   date:'2026-08-20', kg:93.5 },
  { person:'victor', date:'2026-08-20', kg:77.0 }
];

const START_DATE = '2026-08-20';
const STAKE = '€50';
const KCAL_PER_KG = 7700;   // energie-inhoud van een kilo lichaamsvet
