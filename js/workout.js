// Allenamento dal vivo: ogni modifica viene salvata subito.
import * as db from './db.js';
import { actions, clock, confirmBox, esc, inputNum, num, parseNum, pickExercise, setText, thumb, toast, uid } from './ui.js';
import { workoutStats } from './stats.js';

const go = (h) => { location.hash = h; };

function lastPerformance(exerciseId, dayId, workouts) {
  const sorted = [...workouts].sort((a, b) => b.startedAt - a.startedAt);
  const find = (list) => {
    for (const w of list) {
      const e = w.exercises.find((x) => x.exerciseId === exerciseId && x.sets.some((s) => s.done));
      if (e) return e.sets.filter((s) => s.done).map(({ kg, reps }) => ({ kg, reps }));
    }
    return null;
  };
  return find(sorted.filter((w) => w.dayId === dayId)) || find(sorted);
}

function prefilledSets(base, last, mode) {
  const source = mode === 'last' && last ? last : null;
  return base.map((b, i) => {
    const s = source ? (source[i] || source[source.length - 1]) : b;
    return { kg: s.kg ?? 0, reps: s.reps, done: false };
  });
}

function entry(ex, base, last, mode) {
  return {
    exerciseId: ex.id, name: ex.name, muscle: ex.muscle,
    base, last, plannedSets: base.length,
    sets: prefilledSets(base, last, mode), note: '',
  };
}

export async function startWorkout(planId, dayId) {
  const [plan, library, workouts, settings] = await Promise.all([
    db.get('plans', planId), db.all('exercises'), db.all('workouts'), db.getMeta('settings', {}),
  ]);
  const day = plan.days.find((d) => d.id === dayId);
  const lib = new Map(library.map((e) => [e.id, e]));
  const mode = settings.prefill || 'last';
  await db.setMeta('active', {
    id: uid(), planId, dayId, planName: plan.name, dayName: day.name, startedAt: Date.now(),
    exercises: day.exercises.filter((x) => lib.has(x.exerciseId)).map((x) => entry(lib.get(x.exerciseId), x.sets, lastPerformance(x.exerciseId, dayId, workouts), mode)),
  });
}

export async function workoutView(main, onLeave) {
  const w = await db.getMeta('active');
  if (!w) { go('#/'); return; }
  const library = await db.all('exercises');
  const lib = new Map(library.map((e) => [e.id, e]));
  const save = () => db.setMeta('active', w);

  const summaryLine = () => {
    const s = workoutStats(w);
    const total = w.exercises.reduce((n, e) => n + e.sets.length, 0);
    return `${s.sets}/${total} serie · ${num(s.volume, 0)} kg`;
  };
  const paintSummary = () => { main.querySelector('[data-summary]').textContent = summaryLine(); };

  const history = (label, sets) => (sets?.length ? `<small><b>${label}</b> ${sets.map((s) => esc(setText(s))).join(' · ')}</small>` : '');

  const setRow = (s, j) => `
    <div class="set ${s.done ? 'done' : ''}" data-s="${j}">
      <span class="n">${j + 1}</span>
      <input data-f="kg" inputmode="decimal" placeholder="0" value="${inputNum(s.kg)}" aria-label="Chili serie ${j + 1}">
      <input data-f="reps" inputmode="numeric" placeholder="0" value="${inputNum(s.reps)}" aria-label="Ripetizioni serie ${j + 1}">
      <button class="tick" data-a="tick" aria-label="Serie completata" aria-pressed="${!!s.done}">✓</button>
    </div>`;

  function draw() {
    main.innerHTML = `
      <header class="top sticky">
        <div class="grow"><h1>${esc(w.dayName)}</h1>
          <small><span data-clock></span> · <span data-summary></span></small></div>
        <button class="btn primary sm" data-a="finish">${w.editingId ? 'Salva' : 'Termina'}</button>
      </header>
      ${w.exercises.map((e, i) => `
        <section class="card" data-e="${i}">
          <div class="ex-head">${thumb(lib.get(e.exerciseId))}
            <div class="grow"><h2>${esc(e.name)}</h2>
              <div class="past">${history('Base', e.base)}${history('Ultima', e.last)}</div></div>
            <button class="icon-btn sm" data-a="exDel" aria-label="Rimuovi dall'allenamento">✕</button>
          </div>
          <div class="sets-head"><span>Serie</span><span>Kg</span><span>Rip</span><span>Fatta</span></div>
          ${e.sets.map(setRow).join('')}
          <div class="row">
            <button class="btn ghost sm grow" data-a="setAdd">+ Serie</button>
            <button class="btn ghost sm grow" data-a="setDel" ${e.sets.length > 1 ? '' : 'disabled'}>− Serie</button>
          </div>
          <input class="field note" data-note placeholder="Nota (facoltativa)" value="${esc(e.note)}" autocomplete="off">
        </section>`).join('')}
      <button class="btn ghost wide" data-a="exAdd">+ Aggiungi esercizio</button>
      <button class="btn primary wide" data-a="finish">${w.editingId ? 'Salva modifiche' : 'Termina allenamento'}</button>
      <button class="btn text-danger wide" data-a="cancel">${w.editingId ? 'Annulla modifiche' : 'Annulla allenamento'}</button>`;
    paintSummary();
    tick();
  }

  const clockFixed = w.editingId ? w.endedAt - w.startedAt : null;
  function tick() {
    const el = main.querySelector('[data-clock]');
    if (el) el.textContent = clock(clockFixed ?? Date.now() - w.startedAt);
  }
  const timer = setInterval(tick, 1000);
  onLeave(() => clearInterval(timer));

  const exOf = (t) => w.exercises[Number(t.closest('[data-e]').dataset.e)];

  main.addEventListener('focusin', selectOnFocus);
  onLeave(() => main.removeEventListener('focusin', selectOnFocus));

  main.oninput = (e) => {
    const t = e.target;
    if (t.matches('[data-note]')) { exOf(t).note = t.value; save(); return; }
    if (!t.matches('[data-f]')) return;
    const s = exOf(t).sets[Number(t.closest('[data-s]').dataset.s)];
    s[t.dataset.f] = parseNum(t.value);
    save();
    paintSummary();
  };

  async function finish() {
    const done = w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
    const total = w.exercises.reduce((n, e) => n + e.sets.length, 0);
    if (!done) {
      if (w.editingId) { toast('Spunta almeno una serie, oppure elimina l\'allenamento dallo storico'); return; }
      if (await confirmBox('Non hai spuntato nessuna serie. Vuoi annullare questo allenamento?', { ok: 'Annulla allenamento', danger: true })) {
        await db.delMeta('active');
        go('#/');
      }
      return;
    }
    if (done < total && !await confirmBox(`${total - done} serie non spuntate non verranno salvate. Terminare?`, { ok: 'Termina' })) return;
    const { editingId, ...record } = w;
    record.id = editingId || w.id;
    record.endedAt = editingId ? w.endedAt : Date.now();
    record.exercises = w.exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }));
    await db.put('workouts', record);
    await db.delMeta('active');
    go(`#/storico/${record.id}`);
  }

  actions(main, {
    tick: (t) => {
      const row = t.closest('[data-s]');
      const s = exOf(t).sets[Number(row.dataset.s)];
      if (!s.done && !s.reps) { toast('Inserisci le ripetizioni'); return; }
      s.done = !s.done;
      if (s.done) { s.kg ??= 0; s.doneAt ||= Date.now(); } else delete s.doneAt;
      row.classList.toggle('done', s.done);
      t.setAttribute('aria-pressed', s.done);
      save();
      paintSummary();
    },
    setAdd: async (t) => {
      const e = exOf(t);
      const prev = e.sets[e.sets.length - 1];
      e.sets.push({ kg: prev.kg, reps: prev.reps, done: false });
      await save();
      draw();
    },
    setDel: async (t) => { exOf(t).sets.pop(); await save(); draw(); },
    exDel: async (t) => {
      const e = exOf(t);
      if (await confirmBox(`Togliere “${e.name}” da questo allenamento?`, { ok: 'Togli', danger: true })) {
        w.exercises.splice(w.exercises.indexOf(e), 1);
        await save();
        draw();
      }
    },
    exAdd: async () => {
      const picked = await pickExercise(library);
      if (!picked) return;
      if (picked.isNew) {
        delete picked.isNew;
        await db.put('exercises', picked);
        library.push(picked);
        lib.set(picked.id, picked);
      }
      const workouts = await db.all('workouts');
      const last = lastPerformance(picked.id, w.dayId, workouts);
      const base = last || [{ kg: 0, reps: 10 }];
      w.exercises.push({ ...entry(picked, base, last, 'last'), base: [], plannedSets: 0 });
      await save();
      draw();
    },
    finish,
    cancel: async () => {
      const msg = w.editingId ? 'Annullare le modifiche? L\'allenamento salvato resta com\'era.' : 'Annullare questo allenamento? Quello che hai inserito andrà perso.';
      if (await confirmBox(msg, { ok: 'Annulla', danger: true })) {
        await db.delMeta('active');
        go(w.editingId ? `#/storico/${w.editingId}` : '#/');
      }
    },
  });
  draw();
}

function selectOnFocus(e) {
  if (e.target.matches('[data-f]')) e.target.select();
}
