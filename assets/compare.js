/* ============================================================
   Road naar 85 — vergelijkingspagina
   Vereist: config.js, core.js, charts.js
   ============================================================ */

(() => {
  const $ = APP.$;
  const PEOPLE = ['nick', 'victor'];

  function renderHeader() {
    $('stake').textContent = STAKE;
    $('start').textContent = APP.dutch(START_DATE);
    const d = Math.max(0, APP.days(APP.today()) - APP.days(START_DATE));
    $('elapsed').textContent = d + ' ' + (d === 1 ? 'dag' : 'dagen');
  }

  function renderStanding() {
    const t = {};
    PEOPLE.forEach(p => {
      const pts = APP.smoothed(p);
      const tr = APP.trend(p);
      t[p] = tr;
      if (!pts.length) return;
      const last = pts[pts.length - 1];

      $(p + '-kg').innerHTML = APP.fmt(last.raw) + '<u>kg</u>';
      $(p + '-avg').textContent = APP.fmt(last.kg, 2) + ' kg';
      $(p + '-togo').textContent = APP.fmt(Math.abs(TARGET - last.kg), 1) + ' kg';
      $(p + '-rate').textContent = tr
        ? (tr.slope > 0 ? '+' : '−') + APP.fmt(Math.abs(tr.slope * 7), 2) + ' kg'
        : '–';
      const eta = APP.etaDate(p);
      $(p + '-eta').textContent = eta
        ? eta.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
        : '–';
      $(p + '-last').textContent = APP.dutch(last.date);
    });

    /* stand bovenaan */
    const v = $('verdict');
    if (t.nick && t.victor && t.nick.eta !== null && t.victor.eta !== null) {
      const lead = t.nick.eta < t.victor.eta ? 'nick' : 'victor';
      const marge = Math.abs(Math.round(t.nick.eta - t.victor.eta));
      v.textContent = PROFILES[lead].name + ' voor';
      v.style.color = PROFILES[lead].color;
      $('margin-note').textContent = 'Op het huidige tempo komt ' + PROFILES[lead].name
        + ' er ' + marge + ' ' + (marge === 1 ? 'dag' : 'dagen') + ' eerder aan.';
    } else {
      const near = PEOPLE
        .map(p => ({ p, d: APP.distance(p) === null ? 99 : APP.distance(p) }))
        .sort((a, b) => a.d - b.d)[0];
      v.textContent = PROFILES[near.p].name + ' dichterbij';
      v.style.color = PROFILES[near.p].color;
      $('margin-note').textContent = 'Er zijn nog te weinig wegingen voor een betrouwbare projectie. '
        + 'Na ongeveer twee weken dagelijks wegen wordt de trendlijn bruikbaar.';
    }
  }

  function renderFeed() {
    const rows = APP.all()
      .slice()
      .sort((a, b) => a.date < b.date ? 1 : (a.date > b.date ? -1 : (a.person < b.person ? -1 : 1)))
      .slice(0, 16);

    if (!rows.length) {
      $('feed').innerHTML = '<tr><td colspan="5" class="empty">Nog niets ingevuld.</td></tr>';
      return;
    }

    $('feed').innerHTML = rows.map(e => {
      const asc = APP.forPerson(e.person);
      const i = asc.findIndex(x => x.date === e.date);
      const prev = i > 0 ? asc[i - 1].kg : null;
      const dv = prev === null ? null : e.kg - prev;
      const cls = dv === null ? '' : (dv < 0 ? 'dn' : 'up');
      const dtxt = dv === null ? '–' : (dv > 0 ? '+' : '−') + APP.fmt(Math.abs(dv), 1);

      const bits = [];
      if (e.kcal) bits.push(APP.int(e.kcal) + ' kcal');
      if (e.training) bits.push(e.training);

      return '<tr>'
        + '<td>' + APP.dutch(e.date) + '</td>'
        + '<td class="name" data-p="' + e.person + '">' + PROFILES[e.person].name + '</td>'
        + '<td class="r">' + APP.fmt(e.kg) + '</td>'
        + '<td class="r ' + cls + '">' + dtxt + '</td>'
        + '<td class="txt">' + (bits.join(' · ') || '<span style="color:var(--faint)">—</span>') + '</td>'
        + '</tr>';
    }).join('');
  }

  function renderAll() {
    renderHeader();
    renderStanding();
    CHARTS.convergence($('chart-conv'), PEOPLE);
    CHARTS.distance($('chart-dist'), PEOPLE);
    renderFeed();
  }

  async function init() {
    $('nav-slot').outerHTML = APP.nav('index');
    renderAll();
    const res = await APP.load();
    if (res.ok) renderAll();
    else if (res.reason === 'offline') $('banner').hidden = false;
    else APP.say('sync', 'Synchroniseren mislukt: ' + res.reason, 'err');
  }

  init();
})();
