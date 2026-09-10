/* ============================================================
   Road naar 85 — krachttraining, persoonlijke records
   Vereist: config.js, core.js
   Eén rij per oefening per persoon: een nieuwe PR overschrijft de oude.
   ============================================================ */

(() => {
  const $ = APP.$;

  const CATS = [
    { key: 'chest',     label: 'Chest' },
    { key: 'tricep',    label: 'Tricep' },
    { key: 'rug',       label: 'Rug' },
    { key: 'bicep',     label: 'Bicep' },
    { key: 'benen',     label: 'Benen' },
    { key: 'schouders', label: 'Schouders' }
  ];

  let exercises = [];
  let prs = [];
  let filter = 'alles';
  let open = null;          // { id, person } of { id, edit:true }

  /* ---------- helpers ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const wfmt = w => Number(w).toLocaleString('nl-NL', { maximumFractionDigits: 1 });

  const findPR = (id, p) => prs.find(x => x.exercise_id === id && x.person === p) || null;

  /* Een PR leest als "120 × 9". Zonder gewicht is het lichaamsgewicht: "15 reps". */
  function prText(pr) {
    if (!pr || pr.reps == null) return '–';
    if (pr.weight == null) return pr.reps + ' reps';
    return wfmt(pr.weight) + ' × ' + pr.reps;
  }

  /* ---------- Supabase (PostgREST via fetch, net als core.js) ---------- */
  async function req(path, opts) {
    opts = opts || {};
    const r = await fetch(SUPABASE.url + '/rest/v1/' + path, {
      method: opts.method || 'GET',
      headers: Object.assign({}, APP.headers(), opts.headers || {}),
      body: opts.body
    });
    if (!r.ok) {
      let body = null;
      try { body = await r.json(); } catch (_) { /* geen json-body */ }
      const err = new Error((body && body.message) || ('HTTP ' + r.status));
      err.code = body && body.code;
      throw err;
    }
    const txt = await r.text();
    return txt ? JSON.parse(txt) : null;
  }

  async function loadAll() {
    const [ex, pr] = await Promise.all([
      req('exercises?select=id,name,category,note,is_custom,sort_order&order=sort_order.asc,name.asc'),
      req('exercise_prs?select=exercise_id,person,weight,reps,note')
    ]);
    exercises = ex || [];
    prs = pr || [];
  }

  /* ---------- foutmeldingen in gewoon Nederlands ---------- */
  function humanError(err) {
    if (err.code === '23505') return 'Deze oefening bestaat al in deze categorie.';
    if (err.code === '23514') return 'Ongeldige waarde — controleer de categorie.';
    if (/Failed to fetch|NetworkError/i.test(err.message)) {
      return 'Geen verbinding. Je invoer staat nog in het formulier, probeer het zo nog eens.';
    }
    return 'Opslaan mislukte: ' + err.message;
  }

  /* ---------- opbouw ---------- */
  function catSelect(id, current) {
    return '<select id="' + id + '">'
      + CATS.map(c => '<option value="' + c.key + '"'
        + (c.key === current ? ' selected' : '') + '>' + c.label + '</option>').join('')
      + '</select>';
  }

  function prTile(p, pr) {
    return '<button type="button" class="pr ' + p + '" data-act="pr" data-p="' + p + '">'
      + '<span class="lab">' + PROFILES[p].name + '</span>'
      + '<b>' + prText(pr) + '</b>'
      + (pr && pr.note ? '<span class="pr-note">' + esc(pr.note) + '</span>' : '')
      + '</button>';
  }

  function prForm(e, p) {
    const pr = findPR(e.id, p) || {};
    return '<div class="ex-form">'
      + '<p class="ex-form-h">PR van ' + PROFILES[p].name + ' — ' + esc(e.name) + '</p>'
      + '<div class="fields">'
      + '<div><label for="f-w">Gewicht</label>'
      // Bewust type="text": een input type="number" wist een komma-invoer als
      // "95,5" stilzwijgend. inputmode="decimal" geeft nog steeds het cijferklavier.
      + '<input type="text" id="f-w" inputmode="decimal" maxlength="7"'
      + ' placeholder="bv. 120" value="' + (pr.weight == null ? '' : wfmt(pr.weight)) + '"></div>'
      + '<div><label for="f-r"><b>Herhalingen</b></label>'
      + '<input type="number" id="f-r" class="required" step="1" min="1" max="200" inputmode="numeric"'
      + ' placeholder="10" value="' + (pr.reps == null ? '' : pr.reps) + '"></div>'
      + '</div>'
      + '<p class="hint">Gewicht leeg laten bij pull ups en dips — dan telt alleen het aantal.</p>'
      + '<div><label for="f-n">Notitie</label>'
      + '<input type="text" id="f-n" placeholder="optioneel" value="' + esc(pr.note || '') + '"></div>'
      + '<div class="row-btns">'
      + '<button type="button" class="submit" data-act="save-pr">Opslaan</button>'
      + '<button type="button" class="ghost" data-act="cancel">Annuleren</button>'
      + '</div>'
      + (pr.reps != null
        ? '<button type="button" class="danger-link" data-act="clear-pr">PR wissen</button>' : '')
      + '<p class="msg" id="f-msg"></p>'
      + '</div>';
  }

  function exForm(e) {
    return '<div class="ex-form">'
      + '<p class="ex-form-h">Oefening bewerken</p>'
      + '<div><label for="e-n">Naam</label>'
      + '<input type="text" id="e-n" value="' + esc(e.name) + '"></div>'
      + '<div class="fields">'
      + '<div><label for="e-c">Categorie</label>' + catSelect('e-c', e.category) + '</div>'
      + '<div><label for="e-note">Notitie</label>'
      + '<input type="text" id="e-note" placeholder="bv. per kant" value="' + esc(e.note || '') + '"></div>'
      + '</div>'
      + '<div class="row-btns">'
      + '<button type="button" class="submit" data-act="save-ex">Opslaan</button>'
      + '<button type="button" class="ghost" data-act="cancel">Annuleren</button>'
      + '</div>'
      + '<button type="button" class="danger-link" data-act="del-ex">Oefening verwijderen</button>'
      + '<p class="msg" id="f-msg"></p>'
      + '</div>';
  }

  function exRow(e) {
    let h = '<div class="ex" data-id="' + e.id + '">'
      + '<div class="ex-head">'
      + '<p class="ex-name">' + esc(e.name)
      + (e.note ? ' <span class="ex-note">' + esc(e.note) + '</span>' : '')
      + '</p>'
      + '<button type="button" class="ex-edit" data-act="edit">Bewerk</button>'
      + '</div>'
      + '<div class="ex-prs">' + prTile('nick', findPR(e.id, 'nick'))
      + prTile('victor', findPR(e.id, 'victor')) + '</div>';
    if (open && open.id === e.id) h += open.edit ? exForm(e) : prForm(e, open.person);
    return h + '</div>';
  }

  function render() {
    $('chips').innerHTML = [{ key: 'alles', label: 'Alles' }].concat(CATS)
      .map(c => '<button type="button" data-c="' + c.key + '" aria-pressed="'
        + (filter === c.key) + '">' + c.label + '</button>').join('');

    const shown = CATS.filter(c => filter === 'alles' || c.key === filter);
    let html = '';
    shown.forEach(c => {
      const rows = exercises.filter(e => e.category === c.key);
      html += '<div class="gcat"><p class="lab gcat-h">' + c.label + '</p>';
      html += rows.length
        ? rows.map(exRow).join('')
        : '<p class="empty">Nog geen oefeningen in deze categorie.</p>';
      html += '</div>';
    });
    $('list').innerHTML = html || '<p class="empty">Nog niets geladen.</p>';

    const done = prs.length;
    const total = exercises.length * 2;
    $('count').textContent = exercises.length + ' oefeningen · ' + done + ' van ' + total + ' PR\u2019s ingevuld';
  }

  /* ---------- acties ---------- */
  function val(id) {
    const el = $(id);
    if (!el) return null;
    const s = el.value.trim().replace(',', '.');
    return s === '' ? null : Number(s);
  }

  async function savePR(id) {
    const p = open.person;
    const weight = val('f-w');
    const reps = val('f-r');
    const note = $('f-n').value.trim() || null;

    if (reps === null || !Number.isFinite(reps) || reps < 1) {
      return APP.say('f-msg', 'Vul een aantal herhalingen in van minimaal 1.', 'err');
    }
    if (weight !== null && (!Number.isFinite(weight) || weight < 0)) {
      return APP.say('f-msg', 'Gewicht mag niet negatief zijn.', 'err');
    }

    const row = {
      exercise_id: id,
      person: p,
      weight: weight === null ? null : Math.round(weight * 10) / 10,
      reps: Math.round(reps),
      note: note
    };

    APP.say('f-msg', 'Bezig met opslaan…');
    try {
      await req('exercise_prs?on_conflict=exercise_id,person', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(row)
      });
      const i = prs.findIndex(x => x.exercise_id === id && x.person === p);
      if (i >= 0) prs[i] = row; else prs.push(row);
      open = null;
      render();
      APP.say('status', PROFILES[p].name + ': ' + prText(row) + ' opgeslagen.', 'ok');
    } catch (err) {
      APP.say('f-msg', humanError(err), 'err');
    }
  }

  async function clearPR(id) {
    const p = open.person;
    if (!confirm('PR van ' + PROFILES[p].name + ' wissen?')) return;
    try {
      await req('exercise_prs?exercise_id=eq.' + id + '&person=eq.' + p, { method: 'DELETE' });
      prs = prs.filter(x => !(x.exercise_id === id && x.person === p));
      open = null;
      render();
      APP.say('status', 'PR gewist.', 'ok');
    } catch (err) {
      APP.say('f-msg', humanError(err), 'err');
    }
  }

  async function saveEx(id) {
    const name = $('e-n').value.trim();
    if (!name) return APP.say('f-msg', 'Een oefening heeft een naam nodig.', 'err');

    const patch = {
      name: name,
      category: $('e-c').value,
      note: $('e-note').value.trim() || null
    };

    APP.say('f-msg', 'Bezig met opslaan…');
    try {
      // Hernoemen raakt de PR's niet: die hangen aan exercise_id, niet aan de naam.
      await req('exercises?id=eq.' + id, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify(patch)
      });
      const e = exercises.find(x => x.id === id);
      Object.assign(e, patch);
      open = null;
      render();
      APP.say('status', 'Oefening bijgewerkt.', 'ok');
    } catch (err) {
      APP.say('f-msg', humanError(err), 'err');
    }
  }

  async function delEx(id) {
    const e = exercises.find(x => x.id === id);
    const n = prs.filter(x => x.exercise_id === id).length;
    const warn = n ? '\n\nDe ' + n + ' ingevulde PR' + (n > 1 ? "'s" : '') + ' verdwijnen mee.' : '';
    if (!confirm('"' + e.name + '" verwijderen?' + warn)) return;
    try {
      await req('exercises?id=eq.' + id, { method: 'DELETE' });
      exercises = exercises.filter(x => x.id !== id);
      prs = prs.filter(x => x.exercise_id !== id);
      open = null;
      render();
      APP.say('status', 'Oefening verwijderd.', 'ok');
    } catch (err) {
      APP.say('f-msg', humanError(err), 'err');
    }
  }

  async function addEx() {
    const name = $('a-name').value.trim();
    if (!name) return APP.say('a-msg', 'Vul eerst een naam in.', 'err');

    const row = {
      name: name,
      category: $('a-cat').value,
      note: $('a-note').value.trim() || null,
      is_custom: true
    };

    APP.say('a-msg', 'Bezig met toevoegen…');
    try {
      const res = await req('exercises?select=id,name,category,note,is_custom,sort_order', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(row)
      });
      exercises.push(res[0]);
      exercises.sort((a, b) => (a.sort_order - b.sort_order) || (a.name < b.name ? -1 : 1));
      $('a-name').value = '';
      $('a-note').value = '';
      render();
      APP.say('a-msg', row.name + ' toegevoegd aan ' + $('a-cat').selectedOptions[0].text + '.', 'ok');
    } catch (err) {
      APP.say('a-msg', humanError(err), 'err');
    }
  }

  /* ---------- interactie ---------- */
  function wire() {
    $('chips').addEventListener('click', ev => {
      const b = ev.target.closest('button');
      if (!b) return;
      filter = b.dataset.c;
      open = null;
      render();
    });

    $('list').addEventListener('click', ev => {
      const btn = ev.target.closest('button');
      if (!btn) return;
      const box = btn.closest('.ex');
      if (!box) return;
      const id = box.dataset.id;

      switch (btn.dataset.act) {
        case 'pr':     open = { id: id, person: btn.dataset.p }; render(); break;
        case 'edit':   open = { id: id, edit: true };            render(); break;
        case 'cancel': open = null;                              render(); break;
        case 'save-pr':  savePR(id); break;
        case 'clear-pr': clearPR(id); break;
        case 'save-ex':  saveEx(id); break;
        case 'del-ex':   delEx(id); break;
      }
    });

    $('a-add').addEventListener('click', addEx);
    $('a-name').addEventListener('keydown', ev => { if (ev.key === 'Enter') addEx(); });
  }

  /* ---------- start ---------- */
  async function init() {
    $('nav-slot').outerHTML = APP.nav('gym');
    $('a-cat').innerHTML = CATS
      .map(c => '<option value="' + c.key + '">' + c.label + '</option>').join('');
    wire();

    if (!APP.live) {
      $('banner').hidden = false;
      return;
    }
    try {
      await loadAll();
      render();
    } catch (err) {
      APP.say('status', 'Laden mislukte: ' + err.message
        + ' — draai je de databasemigratie al in Supabase?', 'err');
    }
  }

  init();
})();
