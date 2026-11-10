// Calcoli sulle statistiche: nessun accesso a DOM o archivio.
import { CATALOG } from './catalog.js';

const MAX_REST_MS = 15 * 60 * 1000;
const CATALOG_BW = new Map(CATALOG.filter((c) => c.bw).map((c) => [c.id, c.bw]));

// Pesate del corpo, impostate da app.js prima di ogni schermata.
let weights = [];
export function setBodyweights(list) {
  weights = [...list].sort((a, b) => a.t - b.t);
}

// Peso dell'ultima pesata prima di t; prima della prima pesata vale la prima.
export function bodyweightAt(t) {
  if (!weights.length) return 0;
  let kg = weights[0].kg;
  for (const w of weights) {
    if (w.t > t) break;
    kg = w.kg;
  }
  return kg;
}

// Quota del peso corporeo che conta come carico per questo esercizio.
export const bwFactor = (ex) => ex?.bw ?? CATALOG_BW.get(ex?.exerciseId ?? ex?.id) ?? 0;
export const isBodyweight = (ex) => bwFactor(ex) > 0;

// Carico effettivo di una serie: kg inseriti più l'eventuale peso corporeo.
export const setLoad = (ex, s, t) => s.kg + bwFactor(ex) * bodyweightAt(t);

export const doneSets = (ex) => ex.sets.filter((s) => s.done);

// 1RM stimato con la formula di Epley.
export function e1rm(kg, reps) {
  if (!(kg > 0) || !(reps > 0)) return 0;
  return reps === 1 ? kg : kg * (1 + reps / 30);
}

export function exerciseStats(ex, t = Date.now()) {
  const sets = doneSets(ex);
  let volume = 0, reps = 0, topKg = 0, best = -1, bestSet = null, maxReps = 0;
  for (const s of sets) {
    const load = setLoad(ex, s, t);
    volume += load * s.reps;
    reps += s.reps;
    topKg = Math.max(topKg, load);
    maxReps = Math.max(maxReps, s.reps);
    const score = e1rm(load, s.reps);
    if (score > best || (score === best && s.reps > bestSet.reps)) { best = score; bestSet = s; }
  }
  return { sets: sets.length, reps, volume, topKg, maxReps, e1rm: Math.max(0, best), bestSet };
}

export function workoutStats(w) {
  let sets = 0, reps = 0, volume = 0, planned = 0;
  let restTotal = 0, restCount = 0;
  const muscles = {};
  for (const ex of w.exercises) {
    const s = exerciseStats(ex, w.startedAt);
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

// Ultima volta che l'esercizio è stato fatto prima di questo allenamento.
export function previousExercise(w, exerciseId, all) {
  const earlier = all.filter((x) => x.id !== w.id && x.startedAt < w.startedAt).sort(byDate).reverse();
  for (const x of earlier) {
    const e = x.exercises.find((y) => y.exerciseId === exerciseId && doneSets(y).length);
    if (e) return { ex: e, t: x.startedAt };
  }
  return null;
}

// Record battuti in questo allenamento rispetto a tutti quelli precedenti.
export function personalRecords(w, all) {
  const earlier = all.filter((x) => x.id !== w.id && x.startedAt < w.startedAt);
  const out = [];
  for (const ex of w.exercises) {
    const cur = exerciseStats(ex, w.startedAt);
    if (!cur.sets) continue;
    const past = earlier.flatMap((x) => x.exercises
      .filter((y) => y.exerciseId === ex.exerciseId && doneSets(y).length)
      .map((y) => exerciseStats(y, x.startedAt)));
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
      rows.push({ t: w.startedAt, workoutId: w.id, ...exerciseStats(ex, w.startedAt), setList: doneSets(ex), bw: isBodyweight(ex) });
    }
  }
  return rows;
}

// Proposta per la prossima volta: se l'ultima volta sono state fatte tutte
// le ripetizioni previste, si aumenta il carico (o una ripetizione).
export function progressionHint(base, last) {
  if (!base?.length || !last || last.length < base.length) return null;
  if (base.some((b, i) => !b.reps || last[i].reps < b.reps)) return null;
  const top = Math.max(...last.map((s) => s.kg || 0));
  if (top <= 0) return { reps: 1 };
  const step = top < 20 ? 1 : Math.max(2.5, Math.round((top * 0.05) / 2.5) * 2.5);
  return { kg: Math.round((top + step) * 100) / 100 };
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
