/* ============================================================
   Road naar 85 — grafieken (handgeschreven SVG, geen library)
   Vereist: assets/config.js, assets/core.js
   ============================================================ */

const CHARTS = (() => {

  const GRID = '#E2E6EB', AXIS = '#98A2AE', INK = '#0F1620', CARD = '#FFFFFF';
  const MONO = 'IBM Plex Mono, monospace';

  function frame(W, H) {
    return { W, H, L: 34, R: 14, T: 12, B: 26 };
  }

  function yGrid(f, yMin, yMax, Y, opts) {
    const range = yMax - yMin;
    const step = range > 30 ? 10 : range > 16 ? 5 : range > 6 ? 2 : 1;
    let g = '';
    for (let k = Math.ceil(yMin / step) * step; k <= yMax; k += step) {
      const y = Y(k).toFixed(1);
      g += '<line x1="' + f.L + '" y1="' + y + '" x2="' + (f.W - f.R) + '" y2="' + y + '" stroke="' + GRID + '" stroke-width="1"/>'
        + '<text x="' + (f.L - 8) + '" y="' + (Y(k) + 3.4).toFixed(1) + '" fill="' + AXIS + '" font-size="9" font-family="' + MONO + '" text-anchor="end">'
        + (opts && opts.suffix ? k + opts.suffix : k) + '</text>';
    }
    return g;
  }

  function xLabels(f, tMin, tMax, H) {
    let g = '';
    [tMin, tMax].forEach((t, i) => {
      const d = new Date(t * 86400000)
        .toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', timeZone: 'UTC' });
      g += '<text x="' + (i ? f.W - f.R : f.L) + '" y="' + (H - 8) + '" fill="' + AXIS
        + '" font-size="9" font-family="' + MONO + '" text-anchor="' + (i ? 'end' : 'start') + '">' + d + '</text>';
    });
    return g;
  }

  /* ------------------------------------------------------------
     1. Convergentie — beide lijnen naar de 85,0-referentie
     ------------------------------------------------------------ */
  function convergence(el, people) {
    const f = frame(380, 250);
    const series = people
      .map(p => ({ p, pts: APP.smoothed(p), tr: APP.trend(p) }))
      .filter(s => s.pts.length);
    if (!series.length) return;

    let tMin = Math.min(...series.flatMap(s => s.pts.map(x => x.t)));
    let tMax = Math.max(...series.flatMap(s => s.pts.map(x => x.t)));
    series.forEach(s => {
      if (s.tr && s.tr.eta !== null) tMax = Math.max(tMax, s.tr.last.t + s.tr.eta);
    });
    if (tMax - tMin < 14) tMax = tMin + 14;

    const vals = series.flatMap(s => s.pts.map(x => x.kg)).concat([TARGET]);
    const yMin = Math.floor(Math.min(...vals) - 2);
    const yMax = Math.ceil(Math.max(...vals) + 2);

    const X = t => f.L + (t - tMin) / (tMax - tMin) * (f.W - f.L - f.R);
    const Y = k => f.T + (yMax - k) / (yMax - yMin) * (f.H - f.T - f.B);

    let g = yGrid(f, yMin, yMax, Y);

    g += '<line x1="' + f.L + '" y1="' + Y(TARGET).toFixed(1) + '" x2="' + (f.W - f.R)
      + '" y2="' + Y(TARGET).toFixed(1) + '" stroke="' + INK + '" stroke-width="1.2"/>'
      + '<text x="' + (f.W - f.R) + '" y="' + (Y(TARGET) - 6).toFixed(1) + '" fill="' + INK
      + '" font-size="9.5" font-family="' + MONO + '" font-weight="600" text-anchor="end">85,0</text>';

    series.forEach(s => {
      const c = PROFILES[s.p].color;
      const d = s.pts.map((x, i) => (i ? 'L' : 'M') + X(x.t).toFixed(1) + ' ' + Y(x.kg).toFixed(1)).join(' ');
      g += '<path class="draw" d="' + d + '" fill="none" stroke="' + c + '" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/>';
      s.pts.forEach(x => {
        g += '<circle cx="' + X(x.t).toFixed(1) + '" cy="' + Y(x.raw).toFixed(1) + '" r="1.5" fill="' + c + '" opacity=".3"/>';
      });
      if (s.tr && s.tr.eta !== null) {
        const ex = X(s.tr.last.t + s.tr.eta), ey = Y(TARGET);
        g += '<path d="M' + X(s.tr.last.t).toFixed(1) + ' ' + Y(s.tr.last.kg).toFixed(1)
          + ' L' + ex.toFixed(1) + ' ' + ey.toFixed(1) + '" fill="none" stroke="' + c
          + '" stroke-width="1.1" stroke-dasharray="3 3" opacity=".5"/>'
          + '<circle cx="' + ex.toFixed(1) + '" cy="' + ey.toFixed(1) + '" r="3" fill="' + c + '"/>';
      }
      const last = s.pts[s.pts.length - 1];
      g += '<circle cx="' + X(last.t).toFixed(1) + '" cy="' + Y(last.kg).toFixed(1)
        + '" r="3" fill="' + CARD + '" stroke="' + c + '" stroke-width="1.9"/>';
    });

    g += xLabels(f, tMin, tMax, f.H);
    el.innerHTML = g;
  }

  /* ------------------------------------------------------------
     2. Afstand tot 85 — beide richtingen op één schaal.
        Nick daalt naar 85, Victor stijgt ernaartoe; in afstand
        bewegen ze allebei naar nul. Zo is het een eerlijke race.
     ------------------------------------------------------------ */
  function distance(el, people) {
    const f = frame(380, 210);
    const series = people.map(p => ({
      p,
      pts: APP.smoothed(p).map(x => ({ t: x.t, v: Math.abs(TARGET - x.kg) }))
    })).filter(s => s.pts.length);
    if (!series.length) return;

    const tMin = Math.min(...series.flatMap(s => s.pts.map(x => x.t)));
    let tMax = Math.max(...series.flatMap(s => s.pts.map(x => x.t)));
    if (tMax - tMin < 14) tMax = tMin + 14;

    const yMax = Math.ceil(Math.max(...series.flatMap(s => s.pts.map(x => x.v))) + 1);
    const yMin = 0;

    const X = t => f.L + (t - tMin) / (tMax - tMin) * (f.W - f.L - f.R);
    const Y = v => f.T + (yMax - v) / (yMax - yMin) * (f.H - f.T - f.B);

    let g = yGrid(f, yMin, yMax, Y);

    // de nullijn is de finish
    g += '<line x1="' + f.L + '" y1="' + Y(0).toFixed(1) + '" x2="' + (f.W - f.R)
      + '" y2="' + Y(0).toFixed(1) + '" stroke="' + INK + '" stroke-width="1.2"/>'
      + '<text x="' + (f.W - f.R) + '" y="' + (Y(0) - 6).toFixed(1) + '" fill="' + INK
      + '" font-size="9.5" font-family="' + MONO + '" font-weight="600" text-anchor="end">op 85,0</text>';

    series.forEach(s => {
      const c = PROFILES[s.p].color;
      const d = s.pts.map((x, i) => (i ? 'L' : 'M') + X(x.t).toFixed(1) + ' ' + Y(x.v).toFixed(1)).join(' ');
      g += '<path class="draw" d="' + d + '" fill="none" stroke="' + c + '" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/>';
      const last = s.pts[s.pts.length - 1];
      g += '<circle cx="' + X(last.t).toFixed(1) + '" cy="' + Y(last.v).toFixed(1)
        + '" r="3" fill="' + CARD + '" stroke="' + c + '" stroke-width="1.9"/>'
        + '<text x="' + (X(last.t) - 7).toFixed(1) + '" y="' + (Y(last.v) - 7).toFixed(1)
        + '" fill="' + c + '" font-size="9.5" font-family="' + MONO + '" font-weight="600" text-anchor="end">'
        + APP.fmt(last.v, 1) + '</text>';
    });

    g += xLabels(f, tMin, tMax, f.H);
    el.innerHTML = g;
  }

  /* ------------------------------------------------------------
     3. Persoonlijke grafiek — één deelnemer
     ------------------------------------------------------------ */
  function personal(el, p) {
    const f = frame(380, 220);
    const pts = APP.smoothed(p);
    const tr = APP.trend(p);
    const c = PROFILES[p].color;
    if (!pts.length) return;

    const tMin = Math.min(...pts.map(x => x.t));
    let tMax = Math.max(...pts.map(x => x.t));
    if (tr && tr.eta !== null) tMax = Math.max(tMax, tr.last.t + tr.eta);
    if (tMax - tMin < 14) tMax = tMin + 14;

    const vals = pts.map(x => x.kg).concat(pts.map(x => x.raw)).concat([TARGET]);
    const yMin = Math.floor(Math.min(...vals) - 1.5);
    const yMax = Math.ceil(Math.max(...vals) + 1.5);

    const X = t => f.L + (t - tMin) / (tMax - tMin) * (f.W - f.L - f.R);
    const Y = k => f.T + (yMax - k) / (yMax - yMin) * (f.H - f.T - f.B);

    let g = yGrid(f, yMin, yMax, Y);

    g += '<line x1="' + f.L + '" y1="' + Y(TARGET).toFixed(1) + '" x2="' + (f.W - f.R)
      + '" y2="' + Y(TARGET).toFixed(1) + '" stroke="' + INK + '" stroke-width="1.2"/>'
      + '<text x="' + (f.W - f.R) + '" y="' + (Y(TARGET) - 6).toFixed(1) + '" fill="' + INK
      + '" font-size="9.5" font-family="' + MONO + '" font-weight="600" text-anchor="end">85,0</text>';

    // losse wegingen
    pts.forEach(x => {
      g += '<circle cx="' + X(x.t).toFixed(1) + '" cy="' + Y(x.raw).toFixed(1) + '" r="1.8" fill="' + c + '" opacity=".32"/>';
    });

    const d = pts.map((x, i) => (i ? 'L' : 'M') + X(x.t).toFixed(1) + ' ' + Y(x.kg).toFixed(1)).join(' ');
    g += '<path class="draw" d="' + d + '" fill="none" stroke="' + c + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';

    if (tr && tr.eta !== null) {
      const ex = X(tr.last.t + tr.eta), ey = Y(TARGET);
      g += '<path d="M' + X(tr.last.t).toFixed(1) + ' ' + Y(tr.last.kg).toFixed(1)
        + ' L' + ex.toFixed(1) + ' ' + ey.toFixed(1) + '" fill="none" stroke="' + c
        + '" stroke-width="1.1" stroke-dasharray="3 3" opacity=".5"/>'
        + '<circle cx="' + ex.toFixed(1) + '" cy="' + ey.toFixed(1) + '" r="3" fill="' + c + '"/>';
    }

    const last = pts[pts.length - 1];
    g += '<circle cx="' + X(last.t).toFixed(1) + '" cy="' + Y(last.kg).toFixed(1)
      + '" r="3.2" fill="' + CARD + '" stroke="' + c + '" stroke-width="2"/>';

    g += xLabels(f, tMin, tMax, f.H);
    el.innerHTML = g;
  }

  return { convergence, distance, personal };
})();
