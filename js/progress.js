// Statistiche nel tempo: settimane, singolo giorno e singolo esercizio.
import * as db from './db.js';
import { dateShort, duration, esc, num, setText, thumb } from './ui.js';
import { exerciseHistory, muscleTotals, weekStart, weeklyTotals, workoutStats } from './stats.js';
import { barChart, hbars, lineChart } from './charts.js';

const METRICS = [
  { key: 'topKg', label: 'Carico max', unit: 'kg' },
  { key: 'e1rm', label: '1RM stimato', unit: 'kg' },
  { key: 'volume', label: 'Volume', unit: 'kg' },
  { key: 'reps', label: 'Ripetizioni', unit: 'rip' },
];

const tile = (label, value) => `<div class="tile"><small>${label}</small><b>${value}</b></div>`;
const kg = (v) => `${num(v, 1)} kg`;

export async function progressView(main) {
  const [workouts, library] = await Promise.all([db.all('workouts'), db.all('exercises')]);
  if (!workouts.length) {
    main.innerHTML = `<header class="top"><h1>Statistiche</h1></header>
      <div class="empty"><h2>Ancora nessun dato</h2><p>Completa il primo allenamento per vedere i tuoi progressi.</p></div>`;
    return;
  }
  const lib = new Map(library.map((e) => [e.id, e]));
  const stats = workouts.map(workoutStats);
  const totalVolume = stats.reduce((n, s) => n + s.volume, 0);
  const totalMs = stats.reduce((n, s) => n + s.durationMs, 0);
  const thisWeek = workouts.filter((w) => weekStart(w.startedAt) === weekStart(Date.now())).length;

  const days = new Map();
  for (const w of workouts) days.set(w.dayId, `${w.planName} · ${w.dayName}`);

  const names = new Map();
  for (const w of [...workouts].sort((a, b) => a.startedAt - b.startedAt)) {
    for (const e of w.exercises) if (e.sets.length) names.set(e.exerciseId, e.name);
  }
  const exOptions = [...names].sort((a, b) => a[1].localeCompare(b[1], 'it'));
  const muscles = muscleTotals(workouts, Date.now() - 30 * 864e5);

  let dayId = 'all', exId = exOptions[0]?.[0], metric = 'topKg';

  main.innerHTML = `
    <header class="top"><h1>Statistiche</h1></header>
    <div class="tiles">
      ${tile('Allenamenti', workouts.length)}
      ${tile('Questa settimana', thisWeek)}
      ${tile('Volume totale', `${num(totalVolume, 0)} kg`)}
      ${tile('Tempo totale', duration(totalMs))}
    </div>
    <section class="card"><h2>Volume per settimana</h2><div data-weeks></div></section>
    <section class="card">
      <h2>Volume per allenamento</h2>
      <select class="field" data-day aria-label="Giorno della scheda"><option value="all">Tutti i giorni</option>${[...days].map(([id, n]) => `<option value="${esc(id)}">${esc(n)}</option>`).join('')}</select>
      <div data-sessions></div>
    </section>
    ${exOptions.length ? `<section class="card">
      <h2>Progressi per esercizio</h2>
      <select class="field" data-ex aria-label="Esercizio">${exOptions.map(([id, n]) => `<option value="${esc(id)}">${esc(n)}</option>`).join('')}</select>
      <div class="seg" role="tablist">${METRICS.map((m) => `<button data-m="${m.key}">${m.label}</button>`).join('')}</div>
      <div data-ex-chart></div>
      <div data-ex-info></div>
    </section>` : ''}
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
      el.innerHTML = '<p class="hint">Nessun carico registrato: gli esercizi a corpo libero non hanno volume.</p>';
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
    // A corpo libero non ci sono carichi: mostra subito le ripetizioni.
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
      <div class="ex-head rec">${thumb(ex, 'sm')}
        <div class="mini grow">
          <div><small>Carico max</small><b>${best('topKg') ? kg(best('topKg')) : '–'}</b></div>
          <div><small>1RM max</small><b>${best('e1rm') ? kg(best('e1rm')) : '–'}</b></div>
          <div><small>Volume max</small><b>${best('volume') ? `${num(best('volume'), 0)} kg` : '–'}</b></div>
        </div></div>
      <table class="sets-table"><thead><tr><th>Data</th><th>Serie</th><th>Volume</th></tr></thead><tbody>
        ${[...rows].reverse().slice(0, 12).map((r) => `<tr class="click" onclick="location.hash='#/storico/${esc(r.workoutId)}'"><td>${dateShort(r.t)}</td><td class="wrap">${r.setList.map((s) => esc(setText(s))).join(' · ')}</td><td>${num(r.volume, 0)}</td></tr>`).join('')}
      </tbody></table>`;
  }

  main.onchange = (e) => {
    if (e.target.matches('[data-day]')) { dayId = e.target.value; drawSessions(); }
    if (e.target.matches('[data-ex]')) { exId = e.target.value; drawExercise(); }
  };
  main.onclick = (e) => {
    const b = e.target.closest('[data-m]');
    if (b) { metric = b.dataset.m; drawExercise(); }
  };
  drawSessions();
  drawExercise();
}
