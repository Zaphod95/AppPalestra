// Storico e statistiche del singolo allenamento.
import * as db from './db.js';
import { actions, confirmBox, dateLong, dateShort, duration, esc, monthLabel, num, setText, thumb, toast } from './ui.js';
import { doneSets, e1rm, exerciseStats, personalRecords, previousExercise, previousWorkout, workoutStats } from './stats.js';
import { hbars } from './charts.js';

const go = (h) => { location.hash = h; };

export async function historyView(main) {
  const workouts = (await db.all('workouts')).sort((a, b) => b.startedAt - a.startedAt);
  if (!workouts.length) {
    main.innerHTML = `<header class="top"><h1>Storico</h1></header>
      <div class="empty"><h2>Nessun allenamento</h2><p>Quando termini un allenamento lo trovi qui con tutte le statistiche.</p></div>`;
    return;
  }
  let month = '';
  main.innerHTML = '<header class="top"><h1>Storico</h1></header>' + workouts.map((w) => {
    const s = workoutStats(w);
    const label = monthLabel(w.startedAt);
    const head = label !== month ? `<h3 class="month">${esc(label)}</h3>` : '';
    month = label;
    return `${head}<a class="item card-item" href="#/storico/${esc(w.id)}">
      <span class="date-box"><b>${new Date(w.startedAt).getDate()}</b><small>${new Date(w.startedAt).toLocaleDateString('it-IT', { weekday: 'short' })}</small></span>
      <span class="grow"><b>${esc(w.dayName)}</b><small>${esc(w.planName)}</small><small>${duration(s.durationMs)} · ${s.sets} serie · ${num(s.volume, 0)} kg</small></span>
      <span class="chev">›</span></a>`;
  }).join('');
}

// Variazione con freccia e segno: non si affida solo al colore.
function delta(cur, prev, { suffix = '%', neutral = false } = {}) {
  if (prev === null || prev === undefined || prev === 0) return '';
  const pct = ((cur - prev) / prev) * 100;
  if (Math.abs(pct) < 0.05) return '<span class="delta">= uguale</span>';
  const up = pct > 0;
  return `<span class="delta ${neutral ? '' : up ? 'good' : 'bad'}">${up ? '▲ +' : '▼ '}${num(pct, 1)}${suffix}</span>`;
}

const tile = (label, value, extra = '') => `<div class="tile"><small>${label}</small><b>${value}</b>${extra}</div>`;

export async function workoutDetailView(main, id) {
  const [w, all, library] = await Promise.all([db.get('workouts', id), db.all('workouts'), db.all('exercises')]);
  if (!w) { go('#/storico'); return; }
  const lib = new Map(library.map((e) => [e.id, e]));
  const s = workoutStats(w);
  const prevW = previousWorkout(w, all);
  const p = prevW ? workoutStats(prevW) : null;
  const prs = personalRecords(w, all);
  const muscles = Object.entries(s.muscles).sort((a, b) => b[1] - a[1]);

  main.innerHTML = `
    <header class="top"><a class="icon-btn" href="#/storico" aria-label="Indietro">←</a>
      <div class="grow"><h1>${esc(w.dayName)}</h1><small class="cap">${esc(w.planName)} · ${dateLong(w.startedAt)}</small></div></header>

    <div class="tiles">
      ${tile('Volume totale', `${num(s.volume, 0)} kg`, delta(s.volume, p?.volume))}
      ${tile('Durata', duration(s.durationMs), delta(s.durationMs, p?.durationMs, { neutral: true }))}
      ${tile('Serie', s.planned ? `${s.sets}<i> / ${s.planned}</i>` : s.sets, delta(s.sets, p?.sets))}
      ${tile('Ripetizioni', num(s.reps, 0), delta(s.reps, p?.reps))}
      ${tile('Carico medio', `${num(s.avgLoad, 1)} kg`, delta(s.avgLoad, p?.avgLoad))}
      ${tile('Recupero medio', s.avgRestMs === null ? '–' : `${Math.round(s.avgRestMs / 1000)} s`)}
      ${tile('Densità', s.density ? `${num(s.density, 0)} kg/min` : '–')}
      ${tile('Completamento', s.completion === null ? '–' : `${Math.round(s.completion * 100)}%`)}
    </div>
    ${prevW ? `<p class="hint">Confronto con ${esc(prevW.dayName)} del ${dateShort(prevW.startedAt)}.</p>` : '<p class="hint">Al prossimo allenamento di questo giorno vedrai il confronto.</p>'}
    <a class="link guide-link" href="#/guida">Cosa significano questi valori?</a>

    ${prs.length ? `<section class="card pr"><h2>★ Nuovi record</h2>${prs.map((r) => `<div class="pr-row"><b>${esc(r.name)}</b><small>${r.types.map((t) => `${t.label}: ${num(t.value, 1)} ${t.unit}`).join(' · ')}</small></div>`).join('')}</section>` : ''}

    ${w.exercises.map((ex) => exerciseCard(ex, w, all, lib)).join('')}

    ${muscles.length ? `<section class="card"><h2>Serie per muscolo</h2>${hbars(muscles.map(([m, n]) => [esc(m), n]), 'serie')}</section>` : ''}

    <button class="btn ghost wide" data-a="edit">Modifica allenamento</button>
    <button class="btn text-danger wide" data-a="del">Elimina allenamento</button>`;

  actions(main, {
    edit: async () => {
      if (await db.getMeta('active')) { toast('Termina prima l\'allenamento in corso'); go('#/allenamento'); return; }
      await db.setMeta('active', { ...w, editingId: w.id });
      go('#/allenamento');
    },
    del: async () => {
      if (await confirmBox('Eliminare questo allenamento? Non si può recuperare.', { ok: 'Elimina', danger: true })) {
        await db.del('workouts', w.id);
        go('#/storico');
      }
    },
  });
}

function exerciseCard(ex, w, all, lib) {
  const s = exerciseStats(ex);
  if (!s.sets) return `<section class="card muted-card"><div class="ex-head">${thumb(lib.get(ex.exerciseId), 'sm')}<div class="grow"><h2>${esc(ex.name)}</h2><small class="cap">Non eseguito</small></div></div></section>`;
  const prevEx = previousExercise(w, ex.exerciseId, all);
  const p = prevEx ? exerciseStats(prevEx) : null;
  return `<section class="card">
    <div class="ex-head">${thumb(lib.get(ex.exerciseId), 'sm')}<div class="grow"><h2>${esc(ex.name)}</h2><small class="cap">${esc(ex.muscle)}</small></div></div>
    <table class="sets-table"><thead><tr><th>Serie</th><th>Kg</th><th>Rip</th><th>1RM st.</th></tr></thead><tbody>
      ${doneSets(ex).map((x, i) => `<tr><td>${i + 1}</td><td>${num(x.kg, 2)}</td><td>${x.reps}</td><td>${x.kg > 0 ? num(e1rm(x.kg, x.reps), 1) : '–'}</td></tr>`).join('')}
    </tbody></table>
    <div class="mini">
      <div><small>Volume</small><b>${num(s.volume, 0)} kg</b>${delta(s.volume, p?.volume)}</div>
      <div><small>Serie migliore</small><b>${esc(setText(s.bestSet))}</b></div>
      <div><small>1RM stimato</small><b>${s.e1rm ? `${num(s.e1rm, 1)} kg` : '–'}</b>${s.e1rm ? delta(s.e1rm, p?.e1rm) : ''}</div>
    </div>
    ${ex.note ? `<p class="note-text">${esc(ex.note)}</p>` : ''}
  </section>`;
}
