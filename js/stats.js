// Calcoli puri sulle statistiche: nessun accesso a DOM o archivio.
const MAX_REST_MS = 15 * 60 * 1000;

export const doneSets = (ex) => ex.sets.filter((s) => s.done);

// 1RM stimato con la formula di Epley.
export function e1rm(kg, reps) {
  if (!(kg > 0) || !(reps > 0)) return 0;
  return reps === 1 ? kg : kg * (1 + reps / 30);
}

export function exerciseStats(ex) {
  const sets = doneSets(ex);
  let volume = 0, reps = 0, topKg = 0, best = 0, bestSet = null, maxReps = 0;
  for (const s of sets) {
    volume += s.kg * s.reps;
    reps += s.reps;
    topKg = Math.max(topKg, s.kg);
    maxReps = Math.max(maxReps, s.reps);
    const score = e1rm(s.kg, s.reps);
    const cur = bestSet ? e1rm(bestSet.kg, bestSet.reps) : -1;
    if (score > cur || (score === cur && s.reps > bestSet.reps)) bestSet = s;
    best = Math.max(best, score);
  }
  return { sets: sets.length, reps, volume, topKg, maxReps, e1rm: best, bestSet };
}

export function workoutStats(w) {
  let sets = 0, reps = 0, volume = 0, planned = 0;
  let restTotal = 0, restCount = 0;
  const muscles = {};
  for (const ex of w.exercises) {
    const s = exerciseStats(ex);
    sets += s.sets;
    reps += s.reps;
    volume += s.volume;
    planned += ex.plannedSets || 0;
    if (s.sets) muscles[ex.muscle || 'Altro'] = (muscles[ex.muscle || 'Altro'] || 0) + s.sets;
    const times = doneSets(ex).map((x) => x.doneAt).filter(Boolean).sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) {
      const gap = times[i] - times[i - 1];
      if (gap > 0 && gap < MAX_REST_MS) { restTotal += gap; restCount++; }
    }
  }
  const durationMs = Math.max(0, (w.endedAt || Date.now()) - w.startedAt);
  const minutes = durationMs / 60000;
  return {
    durationMs, sets, reps, volume, planned, muscles,
    exercisesDone: w.exercises.filter((e) => doneSets(e).length).length,
    completion: planned ? Math.min(1, sets / planned) : null,
    avgRestMs: restCount ? restTotal / restCount : null,
    avgLoad: reps ? volume / reps : 0,
    density: minutes >= 1 ? volume / minutes : 0,
  };
}

const byDate = (a, b) => a.startedAt - b.startedAt;

export function previousWorkout(w, all) {
  return all
    .filter((x) => x.id !== w.id && x.dayId === w.dayId && x.startedAt < w.startedAt)
    .sort(byDate)
    .pop() || null;
}

export function previousExercise(w, exerciseId, all) {
  const earlier = all.filter((x) => x.id !== w.id && x.startedAt < w.startedAt).sort(byDate).reverse();
  for (const x of earlier) {
    const e = x.exercises.find((y) => y.exerciseId === exerciseId && doneSets(y).length);
    if (e) return e;
  }
  return null;
}

// Record battuti in questo allenamento rispetto a tutti quelli precedenti.
export function personalRecords(w, all) {
  const earlier = all.filter((x) => x.id !== w.id && x.startedAt < w.startedAt);
  const out = [];
  for (const ex of w.exercises) {
    const cur = exerciseStats(ex);
    if (!cur.sets) continue;
    const past = earlier.flatMap((x) => x.exercises.filter((y) => y.exerciseId === ex.exerciseId && doneSets(y).length)).map(exerciseStats);
    if (!past.length) continue;
    const beat = (key) => cur[key] > Math.max(...past.map((p) => p[key]));
    const types = [];
    if (cur.topKg > 0) {
      if (beat('topKg')) types.push({ label: 'Carico massimo', value: cur.topKg, unit: 'kg' });
      if (beat('e1rm')) types.push({ label: '1RM stimato', value: cur.e1rm, unit: 'kg' });
      if (beat('volume')) types.push({ label: 'Volume', value: cur.volume, unit: 'kg' });
    } else if (beat('maxReps')) {
      types.push({ label: 'Ripetizioni in una serie', value: cur.maxReps, unit: 'rip' });
    }
    if (types.length) out.push({ exerciseId: ex.exerciseId, name: ex.name, types });
  }
  return out;
}

export function exerciseHistory(exerciseId, all) {
  const rows = [];
  for (const w of [...all].sort(byDate)) {
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId || !doneSets(ex).length) continue;
      rows.push({ t: w.startedAt, workoutId: w.id, ...exerciseStats(ex), setList: doneSets(ex) });
    }
  }
  return rows;
}

export function weekStart(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

// Ultime n settimane, incluse quelle senza allenamenti.
export function weeklyTotals(all, n, now = Date.now()) {
  const weeks = [];
  let start = weekStart(now);
  for (let i = 0; i < n; i++) {
    weeks.unshift({ start, volume: 0, workouts: 0 });
    const d = new Date(start);
    d.setDate(d.getDate() - 7);
    start = d.getTime();
  }
  for (const w of all) {
    const wk = weeks.find((x) => x.start === weekStart(w.startedAt));
    if (!wk) continue;
    wk.volume += workoutStats(w).volume;
    wk.workouts += 1;
  }
  return weeks;
}

export function muscleTotals(all, since) {
  const out = {};
  for (const w of all) {
    if (w.startedAt < since) continue;
    for (const [m, n] of Object.entries(workoutStats(w).muscles)) out[m] = (out[m] || 0) + n;
  }
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
}
