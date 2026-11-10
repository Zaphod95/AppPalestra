// Libreria esercizi: nome, gruppo muscolare e immagine.
import * as db from './db.js';
import { MUSCLES } from './catalog.js';
import { actions, confirmBox, esc, modal, photoToThumb, thumb, toast, uid } from './ui.js';

export async function exercisesView(main) {
  let list = await db.all('exercises');
  let query = '';

  const results = () => {
    const q = query.trim().toLowerCase();
    return list
      .filter((x) => x.name.toLowerCase().includes(q) || (x.muscle || '').toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'it'));
  };
  const drawList = () => {
    main.querySelector('[data-list]').innerHTML = results().map((x) => `
      <button class="item" data-a="edit" data-id="${esc(x.id)}">${thumb(x)}
        <span class="grow"><b>${esc(x.name)}</b><small>${esc(x.muscle)}${x.photo ? ' · foto tua' : ''}</small></span></button>`).join('') || '<p class="hint center">Nessun esercizio trovato.</p>';
  };

  main.innerHTML = `
    <header class="top"><h1>Esercizi</h1><button class="btn primary sm" data-a="add">+ Nuovo</button></header>
    <input class="field" data-search placeholder="Cerca per nome o muscolo" autocomplete="off">
    <div class="list" data-list></div>`;
  main.querySelector('[data-search]').oninput = (e) => { query = e.target.value; drawList(); };

  async function reload() { list = await db.all('exercises'); drawList(); }

  actions(main, {
    add: () => editor({ id: `u-${uid()}`, name: '', muscle: 'Petto' }, true, reload),
    edit: (t) => editor(list.find((x) => x.id === t.dataset.id), false, reload),
  });
  drawList();
}

function editor(original, isNew, onDone) {
  const ex = { ...original };
  modal(`<div class="sheet-head"><h2>${isNew ? 'Nuovo esercizio' : 'Modifica esercizio'}</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
    <div class="photo-row"><span data-preview>${thumb(ex, 'lg')}</span>
      <div class="stack">
        <label class="btn ghost sm">Scegli foto<input type="file" accept="image/*" data-file hidden></label>
        <button class="btn ghost sm" data-a="clear" ${ex.photo ? '' : 'hidden'}>Rimuovi foto</button>
      </div></div>
    <label class="label">Nome</label>
    <input class="field" data-name value="${esc(ex.name)}" autocomplete="off">
    <label class="label">Gruppo muscolare</label>
    <select class="field" data-muscle>${MUSCLES.map((m) => `<option ${m === ex.muscle ? 'selected' : ''}>${m}</option>`).join('')}</select>
    <label class="radio"><input type="checkbox" data-bw ${ex.bw > 0 ? 'checked' : ''}>
      <span><b>A corpo libero</b><small>Il peso corporeo conta nel volume. I kg che inserisci in palestra diventano la zavorra aggiunta.</small></span></label>
    <button class="btn primary wide" data-a="save">Salva</button>
    ${ex.builtin || isNew ? '' : '<button class="btn text-danger wide" data-a="del">Elimina esercizio</button>'}`, (d, close) => {
    const preview = d.querySelector('[data-preview]');
    const clearBtn = d.querySelector('[data-a=clear]');
    const paint = () => { preview.innerHTML = thumb(ex, 'lg'); clearBtn.hidden = !ex.photo; };

    d.querySelector('[data-file]').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        ex.photo = await photoToThumb(file);
        paint();
      } catch {
        toast('Non riesco a leggere questa immagine');
      }
    };
    actions(d, {
      close,
      clear: () => { delete ex.photo; paint(); },
      save: async () => {
        ex.name = d.querySelector('[data-name]').value.trim();
        ex.muscle = d.querySelector('[data-muscle]').value;
        // Mantiene la quota del catalogo (per esempio 0,65 nei piegamenti).
        ex.bw = d.querySelector('[data-bw]').checked ? (ex.bw > 0 ? ex.bw : 1) : 0;
        if (!ex.name) { toast('Inserisci un nome'); return; }
        await db.put('exercises', ex);
        close();
        onDone();
      },
      del: async () => {
        if (!await confirmBox(`Eliminare “${ex.name}”? Lo storico resta, ma l'esercizio sparirà dalle schede.`, { ok: 'Elimina', danger: true })) return;
        await db.del('exercises', ex.id);
        const plans = await db.all('plans');
        for (const p of plans) {
          for (const day of p.days) day.exercises = day.exercises.filter((x) => x.exerciseId !== ex.id);
          await db.put('plans', p);
        }
        close();
        onDone();
      },
    });
  });
}
