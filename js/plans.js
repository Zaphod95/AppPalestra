// Elenco delle schede e modifica di giorni, esercizi e valori di base.
import * as db from './db.js';
import { actions, confirmBox, dateShort, esc, inputNum, modal, parseNum, pickExercise, summarizeSets, thumb, toast, uid } from './ui.js';
import { startWorkout } from './workout.js';
import { BACKUP_EVERY_DAYS } from './data.js';
import { enterDemo } from './demo.js';

const go = (h) => { location.hash = h; };
const newDay = (n) => ({ id: uid(), name: `Giorno ${String.fromCharCode(64 + n)}`, exercises: [] });

export async function plansView(main) {
  const [plans, workouts, active, lastBackup] = await Promise.all([db.all('plans'), db.all('workouts'), db.getMeta('active'), db.getMeta('lastBackup', null)]);
  plans.sort((a, b) => a.createdAt - b.createdAt);
  const lastByDay = {};
  for (const w of workouts) lastByDay[w.dayId] = Math.max(lastByDay[w.dayId] || 0, w.startedAt);

  // Promemoria: ci sono allenamenti non ancora salvati in un backup da troppo tempo.
  const newest = Math.max(0, ...workouts.map((w) => w.endedAt || w.startedAt));
  const oldest = Math.min(Date.now(), ...workouts.map((w) => w.startedAt));
  const since = lastBackup || oldest;
  const days = Math.floor((Date.now() - since) / 864e5);
  const remind = workouts.length && newest > (lastBackup || 0) && days >= BACKUP_EVERY_DAYS;

  main.innerHTML = `
    <header class="top"><h1>Le tue schede</h1><a class="icon-btn" href="#/dati" aria-label="Dati e impostazioni">${GEAR}</a></header>
    ${remind ? `<a class="banner warn" href="#/dati"><b>${lastBackup ? `Ultimo backup ${days} giorni fa` : 'Non hai ancora un backup'}</b><span>I dati sono solo su questo telefono. Salvane una copia.</span><em>Backup →</em></a>` : ''}
    ${active ?`<a class="banner" href="#/allenamento"><b>${active.editingId ? 'Modifica in corso' : 'Allenamento in corso'}</b><span>${esc(active.planName)} · ${esc(active.dayName)}</span><em>Riprendi →</em></a>` : ''}
    ${plans.length ? plans.map((p) => `
      <section class="card">
        <div class="card-head"><h2>${esc(p.name)}</h2><a class="link" href="#/scheda/${esc(p.id)}">Modifica</a></div>
        ${p.days.map((d) => `
          <div class="day-row">
            <div class="grow"><b>${esc(d.name)}</b>
              <small>${d.exercises.length} ${d.exercises.length === 1 ? 'esercizio' : 'esercizi'}${lastByDay[d.id] ? ` · ultimo ${dateShort(lastByDay[d.id])}` : ''}</small></div>
            <button class="btn primary sm" data-a="start" data-plan="${esc(p.id)}" data-day="${esc(d.id)}" ${d.exercises.length ? '' : 'disabled'}>Inizia</button>
          </div>`).join('')}
      </section>`).join('') : `
      <div class="empty"><h2>Crea la tua prima scheda</h2><p>Dividila in giorni, aggiungi gli esercizi e inserisci carichi e ripetizioni di base.</p>
        <button class="btn ghost" data-a="demo">Guarda prima un esempio</button></div>`}
    <button class="btn wide ${plans.length ? 'ghost' : 'primary'}" data-a="add">+ Nuova scheda</button>`;

  actions(main, {
    demo: () => enterDemo('#/'),
    add: async () => {
      const plan = { id: uid(), name: 'Nuova scheda', createdAt: Date.now(), days: [newDay(1)] };
      await db.put('plans', plan);
      go(`#/scheda/${plan.id}`);
    },
    start: async (t) => {
      if (active) { toast('Hai già un allenamento in corso'); go('#/allenamento'); return; }
      await startWorkout(t.dataset.plan, t.dataset.day);
      go('#/allenamento');
    },
  });
}

export async function planEditView(main, id) {
  const plan = await db.get('plans', id);
  if (!plan) { go('#/'); return; }
  const lib = new Map((await db.all('exercises')).map((e) => [e.id, e]));
  const save = () => db.put('plans', plan);

  const swap = (arr, i, j) => { if (j >= 0 && j < arr.length) [arr[i], arr[j]] = [arr[j], arr[i]]; };
  const dayOf = (t) => plan.days.find((d) => d.id === t.closest('[data-day]').dataset.day);
  const indexOf = (t) => Number(t.closest('[data-i]').dataset.i);

  function draw() {
    main.innerHTML = `
      <header class="top"><a class="icon-btn" href="#/" aria-label="Indietro">←</a><h1>Modifica scheda</h1></header>
      <label class="label">Nome scheda</label>
      <input class="field big" data-plan-name value="${esc(plan.name)}" autocomplete="off">
      ${plan.days.map((d, di) => `
        <section class="card" data-day="${esc(d.id)}">
          <div class="row">
            <input class="field grow" data-day-name value="${esc(d.name)}" aria-label="Nome del giorno" autocomplete="off">
            <button class="icon-btn" data-a="dayUp" aria-label="Sposta su" ${di ? '' : 'disabled'}>↑</button>
            <button class="icon-btn" data-a="dayDown" aria-label="Sposta giù" ${di < plan.days.length - 1 ? '' : 'disabled'}>↓</button>
            <button class="icon-btn" data-a="dayDel" aria-label="Elimina giorno">✕</button>
          </div>
          ${d.exercises.map((x, i) => `
            <div class="ex-row" data-i="${i}">
              <button class="ex-main" data-a="exEdit">${thumb(lib.get(x.exerciseId), 'sm')}
                <span class="grow"><b>${esc(lib.get(x.exerciseId)?.name || 'Esercizio eliminato')}</b><small>${esc(summarizeSets(x.sets))}</small></span></button>
              <div class="ex-tools">
                <button class="icon-btn sm" data-a="exUp" aria-label="Sposta su" ${i ? '' : 'disabled'}>↑</button>
                <button class="icon-btn sm" data-a="exDown" aria-label="Sposta giù" ${i < d.exercises.length - 1 ? '' : 'disabled'}>↓</button>
                <button class="icon-btn sm" data-a="exDel" aria-label="Rimuovi esercizio">✕</button>
              </div>
            </div>`).join('')}
          <button class="btn ghost wide" data-a="exAdd">+ Aggiungi esercizio</button>
        </section>`).join('')}
      <button class="btn ghost wide" data-a="dayAdd">+ Aggiungi giorno</button>
      <button class="btn primary wide" data-a="done">Fatto</button>
      <button class="btn text-danger wide" data-a="planDel">Elimina scheda</button>`;
  }

  async function mutate(fn) { fn(); await save(); draw(); }

  async function editSets(entry, name) {
    const sets = await setsEditor(name, entry.sets);
    if (sets) await mutate(() => { entry.sets = sets; });
  }

  main.onchange = async (e) => {
    if (e.target.matches('[data-plan-name]')) plan.name = e.target.value.trim() || 'Scheda senza nome';
    else if (e.target.matches('[data-day-name]')) dayOf(e.target).name = e.target.value.trim() || 'Giorno';
    await save();
  };

  actions(main, {
    done: () => go('#/'),
    dayAdd: () => mutate(() => plan.days.push(newDay(plan.days.length + 1))),
    dayUp: (t) => mutate(() => { const i = plan.days.indexOf(dayOf(t)); swap(plan.days, i, i - 1); }),
    dayDown: (t) => mutate(() => { const i = plan.days.indexOf(dayOf(t)); swap(plan.days, i, i + 1); }),
    dayDel: async (t) => {
      const d = dayOf(t);
      if (plan.days.length === 1) { toast('Una scheda ha almeno un giorno'); return; }
      if (await confirmBox(`Eliminare “${d.name}”? Lo storico degli allenamenti resta.`, { ok: 'Elimina', danger: true })) {
        mutate(() => plan.days.splice(plan.days.indexOf(d), 1));
      }
    },
    exAdd: async (t) => {
      const d = dayOf(t);
      const picked = await pickExercise([...lib.values()]);
      if (!picked) return;
      if (picked.isNew) {
        delete picked.isNew;
        await db.put('exercises', picked);
        lib.set(picked.id, picked);
      }
      const sets = await setsEditor(picked.name, [{ kg: null, reps: 10 }, { kg: null, reps: 10 }, { kg: null, reps: 10 }]);
      if (sets) mutate(() => d.exercises.push({ exerciseId: picked.id, sets }));
    },
    exEdit: (t) => { const x = dayOf(t).exercises[indexOf(t)]; editSets(x, lib.get(x.exerciseId)?.name || 'Esercizio'); },
    exUp: (t) => mutate(() => { const i = indexOf(t); swap(dayOf(t).exercises, i, i - 1); }),
    exDown: (t) => mutate(() => { const i = indexOf(t); swap(dayOf(t).exercises, i, i + 1); }),
    exDel: (t) => mutate(() => dayOf(t).exercises.splice(indexOf(t), 1)),
    planDel: async () => {
      if (await confirmBox(`Eliminare “${plan.name}”? Lo storico degli allenamenti resta.`, { ok: 'Elimina', danger: true })) {
        await db.del('plans', plan.id);
        go('#/');
      }
    },
  });
  draw();
}

function setsEditor(name, initial) {
  return new Promise((resolve) => {
    let sets = initial.map((s) => ({ ...s }));
    modal(`<div class="sheet-head"><h2>${esc(name)}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <p class="hint">Valori di base: li ritroverai già compilati in palestra.</p>
      <div class="sets-head"><span>Serie</span><span>Kg</span><span>Rip</span><span></span></div>
      <div data-rows></div>
      <button class="btn ghost wide" data-a="add">+ Serie</button>
      <button class="btn primary wide" data-a="save">Salva</button>`, (d, close) => {
      const rows = d.querySelector('[data-rows]');
      const sync = () => {
        rows.querySelectorAll('.set').forEach((r, i) => {
          sets[i].kg = parseNum(r.querySelector('[data-f=kg]').value);
          sets[i].reps = parseNum(r.querySelector('[data-f=reps]').value);
        });
      };
      const draw = () => {
        rows.innerHTML = sets.map((s, i) => `<div class="set" data-i="${i}"><span class="n">${i + 1}</span>
          <input data-f="kg" inputmode="decimal" placeholder="0" value="${inputNum(s.kg)}" aria-label="Chili serie ${i + 1}">
          <input data-f="reps" inputmode="numeric" placeholder="0" value="${inputNum(s.reps)}" aria-label="Ripetizioni serie ${i + 1}">
          <button class="icon-btn sm" data-a="del" aria-label="Rimuovi serie">✕</button></div>`).join('');
      };
      draw();
      d.addEventListener('focusin', (e) => { if (e.target.matches('input')) e.target.select(); });
      actions(d, {
        close: () => { close(); resolve(null); },
        add: () => { sync(); sets.push({ ...(sets[sets.length - 1] || { kg: null, reps: 10 }) }); draw(); },
        del: (t) => { sync(); sets.splice(Number(t.closest('[data-i]').dataset.i), 1); draw(); },
        save: () => {
          sync();
          if (!sets.length) { toast('Serve almeno una serie'); return; }
          if (sets.some((s) => !s.reps)) { toast('Inserisci le ripetizioni di ogni serie'); return; }
          close();
          resolve(sets);
        },
      });
      d.addEventListener('cancel', () => { d.remove(); resolve(null); });
    });
  });
}

const GEAR = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>';
