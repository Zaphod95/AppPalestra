// Funzioni di interfaccia condivise da tutte le schermate.
import { figure } from './catalog.js';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const parseNum = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
export const num = (n, digits = 1) => (n ?? 0).toLocaleString('it-IT', { maximumFractionDigits: digits });
export const inputNum = (n) => (n === null || n === undefined ? '' : String(n).replace('.', ','));

export const dateShort = (t) => new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
export const dateLong = (t) => new Date(t).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const monthLabel = (t) => new Date(t).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

export function duration(ms) {
  const m = Math.round(ms / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}
export function clock(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const setText = (s) => (s.kg > 0 ? `${num(s.kg, 2)}×${s.reps ?? '–'}` : `${s.reps ?? '–'} rip`);

export function summarizeSets(sets) {
  if (!sets.length) return 'Nessuna serie';
  const same = sets.every((s) => s.kg === sets[0].kg && s.reps === sets[0].reps);
  if (same) return `${sets.length} × ${sets[0].reps ?? '–'}${sets[0].kg > 0 ? ` · ${num(sets[0].kg, 2)} kg` : ''}`;
  return `${sets.length} serie · ${sets.map(setText).join(' / ')}`;
}

export function thumb(ex, size = '') {
  const inner = ex?.photo ? `<img src="${esc(ex.photo)}" alt="">` : figure(ex?.pose);
  return `<span class="thumb ${size}">${inner}</span>`;
}

// Ogni schermata registra qui i propri pulsanti (attributo data-a).
export function actions(root, handlers) {
  root.onclick = (e) => {
    const t = e.target.closest('[data-a]');
    if (t && root.contains(t) && handlers[t.dataset.a]) handlers[t.dataset.a](t, e);
  };
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2600);
}

export function modal(html, bind) {
  const d = document.createElement('dialog');
  d.className = 'sheet';
  d.innerHTML = html;
  document.body.append(d);
  const close = () => { d.close(); d.remove(); };
  bind(d, close);
  d.showModal();
  return d;
}

export function confirmBox(message, { ok = 'Conferma', danger = false } = {}) {
  return new Promise((resolve) => {
    modal(`<p class="confirm">${esc(message)}</p>
      <div class="row end"><button class="btn ghost" data-a="no">Annulla</button>
      <button class="btn ${danger ? 'danger' : 'primary'}" data-a="yes">${esc(ok)}</button></div>`, (d, close) => {
      actions(d, {
        no: () => { close(); resolve(false); },
        yes: () => { close(); resolve(true); },
      });
      d.addEventListener('cancel', () => { d.remove(); resolve(false); });
    });
  });
}

export function pickExercise(exercises) {
  return new Promise((resolve) => {
    const sorted = [...exercises].sort((a, b) => a.name.localeCompare(b.name, 'it'));
    modal(`<div class="sheet-head"><h2>Scegli esercizio</h2><button class="icon-btn" data-a="close" aria-label="Chiudi">✕</button></div>
      <input class="field" data-search placeholder="Cerca o scrivi un nome nuovo" autocomplete="off">
      <div class="pick-list" data-list></div>`, (d, close) => {
      const list = d.querySelector('[data-list]');
      const search = d.querySelector('[data-search]');
      const draw = () => {
        const q = search.value.trim().toLowerCase();
        const rows = sorted.filter((x) => x.name.toLowerCase().includes(q) || (x.muscle || '').toLowerCase().includes(q));
        list.innerHTML = rows.map((x) => `<button class="item" data-a="pick" data-id="${esc(x.id)}">${thumb(x, 'sm')}<span class="grow"><b>${esc(x.name)}</b><small>${esc(x.muscle)}</small></span></button>`).join('')
          + (q && !rows.some((x) => x.name.toLowerCase() === q) ? `<button class="item" data-a="create">${thumb(null, 'sm')}<span class="grow"><b>Crea “${esc(search.value.trim())}”</b><small>Nuovo esercizio</small></span></button>` : '');
      };
      search.oninput = draw;
      draw();
      actions(d, {
        close: () => { close(); resolve(null); },
        pick: (t) => { close(); resolve(sorted.find((x) => x.id === t.dataset.id)); },
        create: () => {
          const name = search.value.trim();
          close();
          resolve({ id: `u-${uid()}`, name, muscle: 'Altro', isNew: true });
        },
      });
      d.addEventListener('cancel', () => { d.remove(); resolve(null); });
    });
  });
}

// Riduce una foto a un quadrato piccolo, così occupa pochi kB.
export async function photoToThumb(file, size = 320) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    c.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return c.toDataURL('image/jpeg', 0.78);
  } finally {
    URL.revokeObjectURL(url);
  }
}
