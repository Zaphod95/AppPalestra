// Modalità "dati di esempio": usa un archivio separato, quindi i dati veri non vengono toccati.
const FLAG = 'palestra-demo';
export const DEMO_DB = 'palestra-esempio';
const WEEK = 7 * 864e5;

export function isDemo() {
  try { return localStorage.getItem(FLAG) === '1'; } catch { return false; }
}

export function enterDemo(hash = '#/statistiche') {
  try { localStorage.setItem(FLAG, '1'); } catch { return false; }
  location.hash = hash;
  location.reload();
  return true;
}

export function exitDemo() {
  try { localStorage.removeItem(FLAG); } catch { /* niente da togliere */ }
  location.hash = '#/';
  location.reload();
}

// Riempie l'archivio di esempio. Le date vengono spostate di settimane intere,
// così l'ultimo allenamento cade nell'ultima settimana e i giorni restano gli stessi.
export async function loadDemo(db) {
  if (await db.getMeta('demoLoaded')) return;
  const data = await (await fetch('esempio/palestra-esempio.json')).json();
  const latest = Math.max(...data.workouts.map((w) => w.startedAt));
  const shift = Math.floor((Date.now() - latest) / WEEK) * WEEK;
  const mv = (t) => (t ? t + shift : t);
  const workouts = data.workouts.map((w) => ({
    ...w,
    startedAt: mv(w.startedAt),
    endedAt: mv(w.endedAt),
    exercises: w.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, doneAt: mv(s.doneAt) })) })),
  }));
  await db.replaceAll('exercises', data.exercises);
  await db.replaceAll('plans', data.plans.map((p) => ({ ...p, createdAt: mv(p.createdAt) })));
  await db.replaceAll('workouts', workouts);
  await db.replaceAll('body', (data.body || []).map((b) => ({ ...b, t: mv(b.t) })));
  await db.setMeta('settings', data.settings || {});
  await db.setMeta('lastBackup', Date.now());
  await db.setMeta('demoLoaded', true);
}

// Fuori dalla modalità esempio l'archivio di esempio non serve: lo cancella.
export function dropDemo() {
  try { indexedDB.deleteDatabase(DEMO_DB); } catch { /* ignora */ }
}
