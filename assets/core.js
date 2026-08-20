/* ============================================================
   Road naar 85 — gedeelde logica
   Vereist: assets/config.js
   ============================================================ */

const APP = (() => {

  /* ---------- state ---------- */
  let entries = SEED.map(e => ({ ...e }));   // { person, date, kg, kcal?, protein?, training?, sleep?, note? }
  const live = Boolean(SUPABASE.url && SUPABASE.anonKey);

  /* ---------- kleine helpers ---------- */
  const $ = id => document.getElementById(id);
  const iso = d => d.toISOString().slice(0, 10);
  const today = () => iso(new Date());
  const days = s => Math.round(new Date(s + 'T00:00:00Z').getTime() / 86400000);
  const fmt = (n, d = 1) => n.toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });
  const int = n => Math.round(n).toLocaleString('nl-NL');
  const dutch = s => new Date(s + 'T00:00:00Z')
    .toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', timeZone: 'UTC' });

  function say(el, msg, kind) {
    const n = typeof el === 'string' ? $(el) : el;
    if (!n) return;
    n.textContent = msg;
    n.className = 'msg' + (kind ? ' ' + kind : '');
  }

  /* ---------- data ---------- */
  const all = () => entries;

  const forPerson = p => entries
    .filter(e => e.person === p)
    .sort((a, b) => a.date < b.date ? -1 : 1);

  const onDate = (p, date) => entries.find(e => e.person === p && e.date === date) || null;

  /* 7-daags voortschrijdend gemiddelde.
     Dagschommelingen zijn water en glycogeen; alleen het gemiddelde zegt iets. */
  function smoothed(p) {
    const rows = forPerson(p);
    return rows.map((r, i) => {
      const cutoff = days(r.date) - 6;
      const w = rows.slice(0, i + 1).filter(x => days(x.date) >= cutoff);
      return {
        t: days(r.date),
        kg: w.reduce((s, x) => s + x.kg, 0) / w.length,
        raw: r.kg,
        date: r.date
      };
    });
  }

  /* Kleinste-kwadraten helling over de laatste 21 dagen van het gemiddelde. */
  function trend(p) {
    const pts = smoothed(p);
    if (pts.length < 3) return null;
    const cutoff = pts[pts.length - 1].t - 21;
    const w = pts.filter(x => x.t >= cutoff);
    if (w.length < 3) return null;

    const n = w.length;
    const mx = w.reduce((s, x) => s + x.t, 0) / n;
    const my = w.reduce((s, x) => s + x.kg, 0) / n;
    let num = 0, den = 0;
    w.forEach(x => { num += (x.t - mx) * (x.kg - my); den += (x.t - mx) ** 2; });
    if (den === 0) return null;

    const slope = num / den;                       // kg per dag
    const last = pts[pts.length - 1];
    const gap = TARGET - last.kg;                  // + = moet omhoog, − = moet omlaag
    let eta = null;
    if (slope !== 0 && Math.sign(gap) === Math.sign(slope)) {
      const d = gap / slope;
      if (d > 0 && d < 400) eta = d;
    }
    return { slope, last, gap, eta };
  }

  /* Afstand tot het streefgewicht — werkt voor beide richtingen. */
  function distance(p) {
    const pts = smoothed(p);
    if (!pts.length) return null;
    return Math.abs(TARGET - pts[pts.length - 1].kg);
  }

  function etaDate(p) {
    const tr = trend(p);
    if (!tr || tr.eta === null) return null;
    return new Date(Date.now() + tr.eta * 86400000);
  }

  /* ---------- energie ---------- */

  /* Mifflin-St Jeor × activiteitsfactor. Een schatting, geen meting. */
  function tdeeFormula(p) {
    const prof = PROFILES[p];
    const pts = smoothed(p);
    const kg = pts.length ? pts[pts.length - 1].kg : 80;
    return (10 * kg + 6.25 * prof.height - 5 * prof.age + 5) * prof.activity;
  }

  /* Gemeten onderhoud: gemiddelde intake, gecorrigeerd voor de werkelijke
     gewichtsverandering over dezelfde periode. Betrouwbaarder dan elke formule,
     mits er eerlijk gelogd wordt. */
  function tdeeMeasured(p) {
    const logged = forPerson(p).filter(e => e.kcal > 0);
    if (logged.length < 10) return { ok: false, need: 10 - logged.length, logged: logged.length };

    const w = logged.slice(-28);
    const first = days(w[0].date), last = days(w[w.length - 1].date);
    const span = last - first;
    if (span < 10) return { ok: false, need: 0, logged: w.length };

    const curve = smoothed(p).filter(x => x.t >= first && x.t <= last);
    if (curve.length < 2) return { ok: false, need: 0, logged: w.length };

    const avgIntake = w.reduce((s, x) => s + x.kcal, 0) / w.length;
    const change = curve[0].kg - curve[curve.length - 1].kg;   // + = afgevallen
    return {
      ok: true,
      kcal: avgIntake + (change * KCAL_PER_KG) / span,
      avgIntake,
      change,
      span,
      logged: w.length
    };
  }

  /* Dagdoel. Gebruikt het gemeten onderhoud zodra dat beschikbaar is. */
  function goals(p) {
    const prof = PROFILES[p];
    const m = tdeeMeasured(p);
    const formula = tdeeFormula(p);
    const base = m.ok ? m.kcal : formula;
    const sign = prof.mode === 'cut' ? -1 : 1;

    const pts = smoothed(p);
    const kg = pts.length ? pts[pts.length - 1].kg : 80;

    return {
      kcal: Math.round((base + sign * prof.adjust) / 10) * 10,
      protein: Math.round(kg * prof.proteinPerKg / 5) * 5,
      formula,
      measured: m,
      base,
      perWeek: prof.adjust * 7 / KCAL_PER_KG,
      mode: prof.mode
    };
  }

  /* ---------- Supabase (PostgREST via fetch, geen SDK) ---------- */
  const headers = () => ({
    'apikey': SUPABASE.anonKey,
    'Authorization': 'Bearer ' + SUPABASE.anonKey,
    'Content-Type': 'application/json'
  });

  async function load() {
    if (!live) return { ok: false, reason: 'offline' };
    try {
      const r = await fetch(
        SUPABASE.url + '/rest/v1/daily_entry?select=person,date,kg,kcal,protein,training,sleep,note&order=date.asc',
        { headers: headers() }
      );
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const rows = await r.json();
      if (rows.length) {
        entries = rows.map(x => ({
          person: x.person,
          date: x.date,
          kg: Number(x.kg),
          kcal: x.kcal == null ? null : Number(x.kcal),
          protein: x.protein == null ? null : Number(x.protein),
          training: x.training || null,
          sleep: x.sleep == null ? null : Number(x.sleep),
          note: x.note || null
        }));
      }
      return { ok: true, count: rows.length };
    } catch (err) {
      return { ok: false, reason: err.message };
    }
  }

  async function save(entry) {
    // lokaal eerst, zodat de pagina meteen reageert
    const i = entries.findIndex(e => e.person === entry.person && e.date === entry.date);
    if (i >= 0) entries[i] = { ...entries[i], ...entry }; else entries.push(entry);

    if (!live) return { ok: false, reason: 'offline' };
    try {
      const r = await fetch(SUPABASE.url + '/rest/v1/daily_entry?on_conflict=person,date', {
        method: 'POST',
        headers: { ...headers(), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(entry)
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err.message };
    }
  }

  /* ---------- navigatie ---------- */
  function nav(current) {
    return '<nav>'
      + '<a href="./index.html"' + (current === 'index' ? ' aria-current="page"' : '') + '>Vergelijking</a>'
      + '<a href="./nick.html"' + (current === 'nick' ? ' aria-current="page"' : '') + '>Nick</a>'
      + '<a href="./victor.html"' + (current === 'victor' ? ' aria-current="page"' : '') + '>Victor</a>'
      + '</nav>';
  }

  return {
    $, iso, today, days, fmt, int, dutch, say, nav,
    all, forPerson, onDate, smoothed, trend, distance, etaDate,
    tdeeFormula, tdeeMeasured, goals,
    load, save, live
  };
})();
