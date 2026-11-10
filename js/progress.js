// Statistiche nel tempo: settimane, singolo giorno, singolo esercizio e peso corporeo.
import * as db from './db.js';
import { actions, confirmBox, dateShort, duration, esc, num, parseNum, setText, thumb, toast, uid } from './ui.js';
import { exerciseHistory, muscleTotals, setBodyweights, weekStart, weeklyTotals, workoutStats } from './stats.js';
import { barChart, hbars, lineChart } from './charts.js';

const METRICS = [
  { key: 'topKg', label: 'Carico max', unit: 'kg' },
  { key: 'e1rm', label: '1RM stimato', unit: 'kg' },
  { key: 'volume', label: 'Volume', unit: 'kg' },
  { key: 'reps', label: 'Ripetizioni', unit: 'rip' },
];

const tile = (label, value) => `<div class="tile"><small>${label}</small><b>${value}</b></div>`;
const kg = (v) => `${num(v, 1)} kg`;
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

function bodyCard(body) {
  const sorted = [...body].sort((a, b) => a.t - b.t);
  const last = sorted[sorted.length - 1];
  const first = sorted[0];
  const change = sorted.length > 1 ? last.kg - first.kg : null;
  return `<section class="card">
    <div class="card-head"><h2>Peso corporeo</h2>${last ? `<b class="big-num">${kg(last.kg)}</b>` : ''}</div>
    ${change !== null ? `<p class="hint">${change > 0 ? '+' : ''}${num(change, 1)} kg dal ${dateShort(first.t)}</p>` : ''}
    <div class="row"><input class="field grow" data-bw inputmode="decimal" placeholder="Peso di oggi, in kg" aria-label="Peso di oggi in kg" autocomplete="off">
      <button class="btn primary" data-a="bwSave">Salva</button></div>
    ${sorted.length > 1 ? '<div data-bw-chart></div>' : `<p class="hint">${sorted.length ? 'Con una seconda pesata vedrai il grafico.' : 'Serve anche a dare un volume agli esercizi a corpo libero, come trazioni e dip.'}</p>`}
    ${sorted.length ? `<details class="weighins"><summary>Tutte le pesate (${sorted.length})</summary>
      ${[...sorted].reverse().map((b) => `<div class="weighin"><span>${dateShort(b.t)}</span><b>${kg(b.kg)}</b><button class="icon-btn sm" data-a="bwDel" data-id="${esc(b.id)}" aria-label="Elimina pesata">✕</button></div>`).join('')}
    </details>` : ''}
  </section>`;
}

export async function progressView(main) {
  const [workouts, library, plans, body] = await Promise.all([db.all('workouts'), db.all('exercises'), db.all('plans'), db.all('body')]);
  setBodyweights(body);

  const drawBodyChart = () => {
    const el = main.querySelector('[data-bw-chart]');
    if (!el) return;
    lineChart(el, {
      format: kg,
      xLabel: (p) => dateShort(p.x),
      points: [...body].sort((a, b) => a.t - b.t).map((b) => ({ x: b.t, y: b.kg, label: dateShort(b.t) })),
    });
  };
  const bodyActions = {
    bwSave: async () => {
      const value = parseNum(main.querySelector('[data-bw]').value);
      if (!value || value < 25 || value > 300) { toast('Inserisci un peso valido in kg'); return; }
      const now = Date.now();
      const today = body.find((b) => sameDay(b.t, now));
      await db.put('body', { id: today?.id || uid(), t: now, kg: value });
      toast('Peso salvato');
      progressView(main);
    },
    bwDel: async (t) => {
      if (!await confirmBox('Eliminare questa pesata?', { ok: 'Elimina', danger: true })) return;
      await db.del('body', t.dataset.id);
      progressView(main);
    },
  };

  if (!workouts.length) {
    main.innerHTML = `<header class="top"><h1>Statistiche</h1><a class="link" href="#/guida">Cosa significano?</a></header>
      <div class="empty"><h2>Ancora nessun allenamento</h2><p>Completa il primo allenamento per vedere i tuoi progressi.</p></div>
      ${bodyCard(body)}`;
    actions(main, bodyActions);
    drawBodyChart();
    return;
  }

  const lib = new Map(library.map((e) => [e.id, e]));
  const stats = workouts.map(workoutStats);
  const totalVolume = stats.reduce((n, s) => n + s.volume, 0);
  const totalMs = stats.reduce((n, s) => n + s.durationMs, 0);
  const thisWeek = workouts.filter((w) => weekStart(w.startedAt) === weekStart(Date.now())).length;

  const days = new Map();
  for (const w of workouts) days.set(w.dayId, `${w.planName} · ${w.dayName}`);

  // Esercizi con almeno un allenamento: prima quelli presenti in una scheda.
  const inPlan = new Set(plans.flatMap((p) => p.days.flatMap((d) => d.exercises.map((x) => x.exerciseId))));
  const names = new Map();
  for (const w of [...workouts].sort((a, b) => a.startedAt - b.startedAt)) {
    for (const e of w.exercises) if (e.sets.length) names.set(e.exerciseId, lib.get(e.exerciseId)?.name || e.name);
  }
  const exOptions = [...names].sort((a, b) => (inPlan.has(b[0]) - inPlan.has(a[0])) || a[1].localeCompare(b[1], 'it'));
  const muscles = muscleTotals(workouts, Date.now() - 30 * 864e5);

  // Giorni diversi hanno volumi diversi: si parte dal giorno fatto più di recente.
  let dayId = [...workouts].sort((a, b) => b.startedAt - a.startedAt)[0].dayId, exId = exOptions[0]?.[0], metric = 'topKg';

  main.innerHTML = `
    <header class="top"><h1>Statistiche</h1><a class="link" href="#/guida">Cosa significano?</a></header>
    <div class="tiles">
      ${tile('Allenamenti', workouts.length)}
      ${tile('Questa settimana', thisWeek)}
      ${tile('Volume totale', `${num(totalVolume, 0)} kg`)}
      ${tile('Tempo totale', duration(totalMs))}
    </div>
    <section class="card"><h2>Volume per settimana</h2><div data-weeks></div></section>
    <section class="card">
      <h2>Volume per allenamento</h2>
      <select class="field" data-day aria-label="Giorno della scheda"><option value="all">Tutti i giorni</option>${[...days].map(([id, n]) => `<option value="${esc(id)}" ${id === dayId ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <div data-sessions></div>
    </section>
    ${exOptions.length ? `<section class="card">
      <h2>Progressi per esercizio</h2>
      <select class="field" data-ex aria-label="Esercizio">${exOptions.map(([id, n]) => `<option value="${esc(id)}">${esc(n)}${inPlan.has(id) ? '' : ' (non in scheda)'}</option>`).join('')}</select>
      <div class="seg" role="tablist">${METRICS.map((m) => `<button data-a="metric" data-m="${m.key}">${m.label}</button>`).join('')}</div>
      <div data-ex-chart></div>
      <div data-ex-info></div>
    </section>` : ''}
    ${bodyCard(body)}
    ${muscles.length ? `<section class="card"><h2>Serie per muscolo, ultimi 30 giorni</h2>${hbars(muscles.map(([m, n]) => [esc(m), n]), 'serie')}</section>` : ''}`;

  const weeks = weeklyTotals(workouts, 12);
  barChart(main.querySelector('[data-weeks]'), {
    format: (v) => `${num(v, 0)} kg`,
    bars: weeks.map((w) => ({ y: w.volume, short: dateShort(w.start), label: `Settimana del ${dateShort(w.start)} · ${w.workouts} allen.` })),
  });

  function drawSessions() {
    const el = main.querySelector('[data-sessions]');
    const rows = workouts
      .filter((w) => (dayId === 'all' || w.dayId === dayId) && workoutStats(w).volume > 0)
      .sort((a, b) => a.startedAt - b.startedAt);
    if (!rows.length) {
      el.classList.remove('chart');
      el.innerHTML = '<p class="hint">Nessun carico registrato. Per dare un volume agli esercizi a corpo libero, inserisci il tuo peso corporeo.</p>';
      return;
    }
    lineChart(el, {
      format: (v) => `${num(v, 0)} kg`,
      xLabel: (p) => dateShort(p.x),
      points: rows.map((w) => ({ x: w.startedAt, y: workoutStats(w).volume, label: `${dateShort(w.startedAt)} · ${esc(w.dayName)}` })),
    });
  }

  function drawExercise() {
    const chart = main.querySelector('[data-ex-chart]');
    if (!chart) return;
    const rows = exerciseHistory(exId, workouts);
    // Senza carichi (corpo libero senza peso corporeo) mostra subito le ripetizioni.
    if (metric !== 'reps' && rows.every((r) => r[metric] === 0)) metric = 'reps';
    const m = METRICS.find((x) => x.key === metric);
    main.querySelectorAll('[data-m]').forEach((b) => b.classList.toggle('on', b.dataset.m === metric));
    const fmt = (v) => `${num(v, 1)} ${m.unit}`;
    if (rows.length) {
      lineChart(chart, { format: fmt, xLabel: (p) => dateShort(p.x), points: rows.map((r) => ({ x: r.t, y: r[metric], label: dateShort(r.t) })) });
    }
    const best = (k) => Math.max(...rows.map((r) => r[k]));
    const ex = lib.get(exId);
    main.querySelector('[data-ex-info]').innerHTML = `
      ${inPlan.has(exId) ? '' : '<p class="hint">Questo esercizio non è in nessuna scheda: qui trovi le volte in cui l\'hai fatto.</p>'}
      <div class="ex-head rec">${thumb(ex, 'sm')}
        <div class="mini grow">
          <div><small>Carico max</small><b>${best('topKg') ? kg(best('topKg')) : '–'}</b></div>
          <div><small>1RM max</small><b>${best('e1rm') ? kg(best('e1rm')) : '–'}</b></div>
          <div><small>Volume max</small><b>${best('volume') ? `${num(best('volume'), 0)} kg` : '–'}</b></div>
        </div></div>
      <table class="sets-table"><thead><tr><th>Data</th><th>Serie</th><th>Volume</th></tr></thead><tbody>
        ${[...rows].reverse().slice(0, 12).map((r) => `<tr class="click" onclick="location.hash='#/storico/${esc(r.workoutId)}'"><td>${dateShort(r.t)}</td><td class="wrap">${r.setList.map((s) => esc(setText(s, r.bw))).join(' · ')}</td><td>${num(r.volume, 0)}</td></tr>`).join('')}
      </tbody></table>`;
  }

  main.onchange = (e) => {
    if (e.target.matches('[data-day]')) { dayId = e.target.value; drawSessions(); }
    if (e.target.matches('[data-ex]')) { exId = e.target.value; metric = 'topKg'; drawExercise(); }
  };
  actions(main, {
    ...bodyActions,
    metric: (b) => { metric = b.dataset.m; drawExercise(); },
  });
  drawSessions();
  drawExercise();
  drawBodyChart();
}
