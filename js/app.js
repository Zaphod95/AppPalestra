// Avvio dell'app, navigazione e aggiornamenti.
import * as db from './db.js';
import { CATALOG } from './catalog.js';
import { planEditView, plansView } from './plans.js';
import { exercisesView } from './exercises.js';
import { workoutView } from './workout.js';
import { historyView, workoutDetailView } from './history.js';
import { progressView } from './progress.js';
import { dataView } from './data.js';
import { guideView } from './guide.js';

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
    await view(main, ...(found ? found.m.slice(1) : []));
    if (mine === ticket) window.scrollTo(0, 0);
  } catch (e) {
    console.error(e);
    main.innerHTML = '<div class="empty"><h2>Qualcosa è andato storto</h2><p>Ricarica la pagina. I dati salvati non vengono toccati.</p></div>';
  }
}

async function seed() {
  if (await db.getMeta('seeded')) return;
  for (const e of CATALOG) await db.put('exercises', e);
  await db.setMeta('seeded', true);
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
