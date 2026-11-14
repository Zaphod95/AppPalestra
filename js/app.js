// Avvio dell'app, navigazione e aggiornamenti.
import * as db from './db.js';
import { CATALOG, NAMED_POSES } from './catalog.js';
import { planEditView, plansView } from './plans.js';
import { exercisesView } from './exercises.js';
import { workoutView } from './workout.js';
import { historyView, workoutDetailView } from './history.js';
import { progressView } from './progress.js';
import { dataView } from './data.js';
import { guideView } from './guide.js';
import { setBodyweights } from './stats.js';

const main = document.getElementById('main');
const nav = document.getElementById('nav');
let leaving = [];
const onLeave = (fn) => leaving.push(fn);

const ROUTES = [
  [/^#\/scheda\/([^/]+)$/, planEditView, '#/'],
  [/^#\/esercizi$/, exercisesView, '#/esercizi'],
  [/^#\/allenamento$/, (m) => workoutView(m, onLeave), '#/'],
  [/^#\/storico$/, historyView, '#/storico'],
  [/^#\/storico\/([^/]+)$/, workoutDetailView, '#/storico'],
  [/^#\/statistiche$/, progressView, '#/statistiche'],
  [/^#\/dati$/, dataView, '#/'],
  [/^#\/guida$/, guideView, '#/statistiche'],
];

let ticket = 0;
async function route() {
  const mine = ++ticket;
  leaving.forEach((fn) => fn());
  leaving = [];
  main.onclick = main.onchange = main.oninput = null;
  const hash = location.hash || '#/';
  const found = ROUTES.map(([re, view, tab]) => ({ m: hash.match(re), view, tab })).find((r) => r.m);
  const view = found ? found.view : plansView;
  const tab = found ? found.tab : '#/';
  nav.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === tab));
  try {
    setBodyweights(await db.all('body'));
    await view(main, ...(found ? found.m.slice(1) : []));
    if (mine === ticket) window.scrollTo(0, 0);
  } catch (e) {
    console.error(e);
    main.innerHTML = '<div class="empty"><h2>Qualcosa è andato storto</h2><p>Ricarica la pagina. I dati salvati non vengono toccati.</p></div>';
  }
}

async function seed() {
  if (!await db.getMeta('seeded')) {
    for (const e of CATALOG) await db.put('exercises', e);
    await db.setMeta('seeded', true);
    await db.setMeta('catalogIds', CATALOG.map((c) => c.id));
    return;
  }
  const saved = new Map((await db.all('exercises')).map((e) => [e.id, e]));
  // Esercizi del catalogo già proposti in passato: quelli che hai eliminato non tornano.
  // Prima di questa informazione nessun esercizio del catalogo era eliminabile.
  const known = new Set(await db.getMeta('catalogIds', null) ?? [...saved.keys()]);
  for (const c of CATALOG) {
    const e = saved.get(c.id);
    if (!e && !known.has(c.id)) {
      await db.put('exercises', c);
    } else if (e && (e.bw === undefined || e.muscle2 === undefined)) {
      // Informazioni nuove del catalogo, senza toccare nome, muscolo o foto scelti da te.
      await db.put('exercises', { ...e, bw: e.bw ?? c.bw, muscle2: e.muscle2 ?? c.muscle2 });
    }
    known.add(c.id);
  }
  await db.setMeta('catalogIds', [...known]);
  // Esercizi creati da te senza immagine: se il nome è noto ricevono la sua illustrazione.
  for (const e of saved.values()) {
    const pose = NAMED_POSES[e.name.trim().toLowerCase()];
    if (!e.builtin && !e.pose && !e.photo && pose) await db.put('exercises', { ...e, pose });
  }
}

async function registerWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.hostname === 'localhost' && !localStorage.getItem('sw')) return;
  const hadController = !!navigator.serviceWorker.controller;
  const reg = await navigator.serviceWorker.register('./sw.js');
  const box = document.getElementById('update');
  const offer = () => { box.hidden = false; };
  box.querySelector('button').onclick = () => reg.waiting?.postMessage('attiva');
  if (reg.waiting && hadController) offer();
  reg.addEventListener('updatefound', () => {
    const w = reg.installing;
    w.addEventListener('statechange', () => {
      if (w.state === 'installed' && navigator.serviceWorker.controller) offer();
    });
  });
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
}

await seed();
navigator.storage?.persist?.();
window.addEventListener('hashchange', route);
await route();
registerWorker();
