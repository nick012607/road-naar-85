/* ============================================================
   Road naar 85 — weekupdate om te delen
   Vereist: config.js, core.js
   ============================================================ */

const WEEKLY = (() => {
  const PEOPLE = ['nick', 'victor'];

  /* Verschil met teken, zoals in de feed: +0,4 / −0,6. */
  const signed = n => Math.abs(n) < 0.05
    ? '±' + APP.fmt(0, 1)
    : (n > 0 ? '+' : '−') + APP.fmt(Math.abs(n), 1);

  /* Week 1 is de week waarin de weddenschap begon. */
  const weekNr = () => Math.floor((APP.days(APP.today()) - APP.days(START_DATE)) / 7) + 1;

  /* Huidig 7-daags gemiddelde en het gemiddelde van een week eerder.
     "Een week eerder" telt vanaf de laatste weging, niet vanaf vandaag. */
  function weight(p) {
    const pts = APP.smoothed(p);
    if (!pts.length) return PROFILES[p].name + ': nog geen weging';
    const cur = pts[pts.length - 1];
    const prev = pts.filter(x => x.t <= cur.t - 7).pop();

    let line = PROFILES[p].name + ' ' + APP.fmt(cur.kg, 1) + ' kg';
    const bits = [];
    if (prev) bits.push(signed(cur.kg - prev.kg));
    if (APP.days(APP.today()) - cur.t > 7) bits.push('laatste weging ' + APP.dutch(cur.date));
    if (bits.length) line += ' (' + bits.join(', ') + ')';
    return line;
  }

  function togo() {
    const parts = PEOPLE
      .filter(p => APP.distance(p) !== null)
      .map(p => PROFILES[p].name + ' ' + APP.fmt(APP.distance(p), 1) + ' kg');
    return parts.length ? 'Nog te gaan: ' + parts.join(' · ') : null;
  }

  function compose() {
    const lines = ['Road naar 85 · week ' + weekNr(), ''];
    PEOPLE.forEach(p => lines.push(weight(p)));
    const t = togo();
    if (t) lines.push('', t);
    return lines.join('\n');
  }

  /* Deelmenu op de telefoon; op desktop naar het klembord. */
  async function share(msg) {
    const text = compose();
    if (navigator.share) {
      try {
        await navigator.share({ text });
        APP.say(msg, '');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;   // zelf weggeklikt
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      APP.say(msg, 'Weekupdate gekopieerd — plak hem in de groepsapp.', 'ok');
    } catch (err) {
      APP.say(msg, 'Delen en kopiëren lukten niet in deze browser.', 'err');
    }
  }

  return { compose, share };
})();
