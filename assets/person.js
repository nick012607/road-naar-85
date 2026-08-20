/* ============================================================
   Road naar 85 — persoonlijke pagina
   Vereist: config.js, core.js, charts.js
   De pagina bepaalt via <body data-person="nick"> wie er ingelogd is.
   ============================================================ */

(() => {
  const P = document.body.dataset.person;
  const prof = PROFILES[P];
  const $ = APP.$;

  /* accentkleur van deze deelnemer door de hele pagina */
  document.documentElement.style.setProperty('--accent', prof.color);
  document.documentElement.style.setProperty('--accent-tint', prof.tint);

  const TRAININGEN = ['Gym', 'Padel', 'Hardlopen', 'Fietsen', 'Rust'];
  let picked = new Set();

  /* ---------- opbouw van de pagina ---------- */
  function chrome() {
    $('nav-slot').outerHTML = APP.nav(P);

    $('chips').innerHTML = TRAININGEN
      .map(t => '<button type="button" data-t="' + t + '" aria-pressed="false">' + t + '</button>')
      .join('');

    document.querySelectorAll('#chips button').forEach(b => {
      b.addEventListener('click', () => {
        const t = b.dataset.t;
        if (picked.has(t)) picked.delete(t); else picked.add(t);
        // Rust sluit de rest uit, en andersom
        if (t === 'Rust' && picked.has('Rust')) picked = new Set(['Rust']);
        else if (t !== 'Rust') picked.delete('Rust');
        document.querySelectorAll('#chips button')
          .forEach(x => x.setAttribute('aria-pressed', String(picked.has(x.dataset.t))));
      });
    });
  }

  /* ---------- status ---------- */
  function renderStatus() {
    const pts = APP.smoothed(P);
    const tr = APP.trend(P);
    if (!pts.length) return;
    const last = pts[pts.length - 1];

    $('now').innerHTML = APP.fmt(last.raw) + '<u>kg</u>';
    $('now-date').textContent = 'laatste weging ' + APP.dutch(last.date);
    $('avg').textContent = APP.fmt(last.kg, 2) + ' kg';
    $('rate').textContent = tr
      ? (tr.slope > 0 ? '+' : '−') + APP.fmt(Math.abs(tr.slope * 7), 2) + ' kg'
      : 'nog geen trend';

    const eta = APP.etaDate(P);
    $('eta').textContent = eta
      ? eta.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
      : '–';

    const dir = prof.mode === 'cut' ? 'af te vallen' : 'aan te komen';
    $('direction').textContent = 'Nog ' + APP.fmt(Math.abs(TARGET - last.kg), 1) + ' kg ' + dir;
  }

  /* ---------- dagdoel ---------- */
  function renderGoals() {
    const g = APP.goals(P);

    $('t-kcal').innerHTML = APP.int(g.kcal) + '<u>kcal</u>';
    $('t-kcal-sub').textContent = prof.adjust + ' kcal '
      + (g.mode === 'cut' ? 'tekort' : 'overschot') + ' · '
      + APP.fmt(g.perWeek, 2) + ' kg per week';
    $('t-prot').innerHTML = g.protein + '<u>g</u>';
    $('t-prot-sub').textContent = APP.fmt(prof.proteinPerKg, 1) + ' g per kg lichaamsgewicht';

    const t = APP.onDate(P, APP.today());
    const kcal = (t && t.kcal) || 0;
    const prot = (t && t.protein) || 0;

    $('m-kcal').textContent = APP.int(kcal) + ' / ' + APP.int(g.kcal);
    $('m-prot').textContent = prot + ' / ' + g.protein;
    $('b-kcal').style.width = Math.min(100, kcal / g.kcal * 100) + '%';
    $('b-kcal').className = kcal > g.kcal * 1.08 ? 'over' : '';
    $('b-prot').style.width = Math.min(100, prot / g.protein * 100) + '%';
    $('b-prot').className = 'prot';

    /* onderhoud */
    const m = g.measured;
    $('tdee-calc').innerHTML = APP.int(g.formula) + '<u>kcal</u>';
    if (m.ok) {
      $('tdee-real').innerHTML = APP.int(m.kcal) + '<u>kcal</u>';
      $('tdee-sub').textContent = m.logged + ' dagen gelogd over ' + m.span + ' dagen';
      const diff = Math.round(m.kcal - g.formula);
      $('tdee-hint').textContent = Math.abs(diff) < 100
        ? 'De formule zat er dicht bij. Het dagdoel hierboven blijft staan.'
        : 'Je werkelijke onderhoud ligt ' + Math.abs(diff) + ' kcal '
          + (diff > 0 ? 'hoger' : 'lager') + ' dan de formule voorspelde. '
          + 'Het dagdoel hierboven is daar al op aangepast.';
    } else {
      $('tdee-real').innerHTML = '–<u>kcal</u>';
      $('tdee-sub').textContent = m.need > 0
        ? 'nog ' + m.need + ' dagen calorieën loggen'
        : 'meer spreiding in de datums nodig';
      $('tdee-hint').textContent = 'Elke calculator zit er makkelijk 300 kcal naast. '
        + 'Zodra je tien dagen calorieën hebt gelogd, rekent deze kaart je werkelijke '
        + 'onderhoud terug uit je intake en je gewichtstrend. Dat getal weegt zwaarder dan de formule.';
    }
  }

  /* ---------- logboek ---------- */
  function renderLog() {
    const rows = APP.forPerson(P).slice().reverse().slice(0, 21);
    if (!rows.length) {
      $('log').innerHTML = '<tr><td colspan="4" class="empty">Nog niets ingevuld.</td></tr>';
      return;
    }
    const asc = APP.forPerson(P);
    $('log').innerHTML = rows.map(e => {
      const i = asc.findIndex(x => x.date === e.date);
      const prev = i > 0 ? asc[i - 1].kg : null;
      const dv = prev === null ? null : e.kg - prev;
      const cls = dv === null ? '' : (dv < 0 ? 'dn' : 'up');
      const dtxt = dv === null ? '–' : (dv > 0 ? '+' : '−') + APP.fmt(Math.abs(dv), 1);

      const bits = [];
      if (e.kcal) bits.push(APP.int(e.kcal) + ' kcal');
      if (e.protein) bits.push(e.protein + ' g eiwit');
      if (e.training) bits.push(e.training);
      if (e.sleep) bits.push(APP.fmt(e.sleep, 1) + ' u slaap');
      if (e.note) bits.push(e.note);

      return '<tr>'
        + '<td>' + APP.dutch(e.date) + '</td>'
        + '<td class="r">' + APP.fmt(e.kg) + '</td>'
        + '<td class="r ' + cls + '">' + dtxt + '</td>'
        + '<td class="txt">' + (bits.length ? bits.join(' · ') : '<span style="color:var(--faint)">—</span>') + '</td>'
        + '</tr>';
    }).join('');
  }

  function renderAll() {
    renderStatus();
    CHARTS.personal($('chart'), P);
    renderGoals();
    renderLog();
  }

  /* ---------- invoer ---------- */
  function prefill() {
    const d = $('date').value;
    const e = APP.onDate(P, d);
    $('kg').value = e ? e.kg : '';
    $('kcal').value = e && e.kcal ? e.kcal : '';
    $('protein').value = e && e.protein ? e.protein : '';
    $('sleep').value = e && e.sleep ? e.sleep : '';
    $('note').value = e && e.note ? e.note : '';
    picked = new Set(e && e.training ? e.training.split(', ') : []);
    document.querySelectorAll('#chips button')
      .forEach(x => x.setAttribute('aria-pressed', String(picked.has(x.dataset.t))));
    if (e) APP.say('status', 'Deze dag was al ingevuld — opslaan overschrijft hem.');
    else APP.say('status', '');
  }

  async function submit() {
    const date = $('date').value;
    const kg = parseFloat(String($('kg').value).replace(',', '.'));

    if (!date) { APP.say('status', 'Kies eerst een datum.', 'err'); return; }
    if (!kg || kg < 40 || kg > 180) {
      APP.say('status', 'Het gewicht is het enige verplichte veld. Vul een waarde tussen 40 en 180 kg in.', 'err');
      $('kg').focus();
      return;
    }

    const num = id => {
      const v = parseFloat(String($(id).value).replace(',', '.'));
      return isNaN(v) ? null : v;
    };

    const entry = {
      person: P,
      date,
      kg: Math.round(kg * 10) / 10,
      kcal: num('kcal') === null ? null : Math.round(num('kcal')),
      protein: num('protein') === null ? null : Math.round(num('protein')),
      training: picked.size ? [...picked].join(', ') : null,
      sleep: num('sleep'),
      note: $('note').value.trim() || null
    };

    const res = await APP.save(entry);
    renderAll();

    if (res.ok) {
      APP.say('status', APP.fmt(entry.kg) + ' kg op ' + APP.dutch(date) + ' opgeslagen en gesynchroniseerd.', 'ok');
    } else if (res.reason === 'offline') {
      APP.say('status', 'Opgeslagen in dit tabblad. Vul assets/config.js in om echt te bewaren.', 'err');
    } else {
      APP.say('status', 'Lokaal bijgewerkt, maar opslaan mislukte: ' + res.reason, 'err');
    }
  }

  /* ---------- start ---------- */
  async function init() {
    document.title = prof.name + ' — Road naar 85';
    $('who').textContent = prof.name;
    chrome();
    $('date').value = APP.today();
    $('date').addEventListener('change', prefill);
    $('save').addEventListener('click', submit);
    $('kg').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });

    renderAll();
    const res = await APP.load();
    if (res.ok) { renderAll(); prefill(); }
    else if (res.reason === 'offline') {
      $('banner').hidden = false;
    } else {
      APP.say('status', 'Synchroniseren mislukt: ' + res.reason, 'err');
    }
  }

  init();
})();
