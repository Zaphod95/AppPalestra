// Impostazioni e backup dei dati.
import * as db from './db.js';
import { actions, confirmBox, toast } from './ui.js';

async function downloadBackup() {
  const payload = {
    app: 'AppPalestra', version: 1, exportedAt: new Date().toISOString(),
    exercises: await db.all('exercises'),
    plans: await db.all('plans'),
    workouts: await db.all('workouts'),
    settings: await db.getMeta('settings', {}),
  };
  const name = `palestra-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([JSON.stringify(payload)], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function restoreBackup(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { toast('Il file non è un backup valido'); return; }
  if (data?.app !== 'AppPalestra' || ![data.exercises, data.plans, data.workouts].every(Array.isArray)) {
    toast('Il file non è un backup di questa app');
    return;
  }
  const ok = await confirmBox(`Sostituire tutti i dati attuali con il backup (schede: ${data.plans.length}, allenamenti: ${data.workouts.length})?`, { ok: 'Ripristina', danger: true });
  if (!ok) return;
  await db.replaceAll('exercises', data.exercises);
  await db.replaceAll('plans', data.plans);
  await db.replaceAll('workouts', data.workouts);
  await db.setMeta('settings', data.settings || {});
  await db.delMeta('active');
  toast('Backup ripristinato');
  location.hash = '#/';
}

export async function dataView(main) {
  const settings = await db.getMeta('settings', {});
  const prefill = settings.prefill || 'last';
  const build = typeof caches !== 'undefined' ? (await caches.keys()).find((k) => k.startsWith('palestra-')) : null;

  main.innerHTML = `
    <header class="top"><a class="icon-btn" href="#/" aria-label="Indietro">←</a><h1>Dati e backup</h1></header>
    <section class="card"><h2>Valori precompilati in palestra</h2>
      <label class="radio"><input type="radio" name="prefill" value="last" ${prefill === 'last' ? 'checked' : ''}>
        <span><b>Ultima volta</b><small>Parti da quello che hai fatto nell'ultimo allenamento. La prima volta usa i valori di base.</small></span></label>
      <label class="radio"><input type="radio" name="prefill" value="base" ${prefill === 'base' ? 'checked' : ''}>
        <span><b>Valori di base</b><small>Parti sempre dai valori inseriti nella scheda.</small></span></label>
    </section>
    <section class="card"><h2>Backup</h2>
      <p class="hint">I dati esistono solo su questo dispositivo. Salva ogni tanto un backup, comprese le foto degli esercizi.</p>
      <button class="btn primary wide" data-a="export">Salva backup</button>
      <label class="btn ghost wide">Ripristina da file<input type="file" accept=".json,application/json" data-file hidden></label>
    </section>
    <p class="hint center">Versione ${build ? build.replace('palestra-', '') : 'di sviluppo'}</p>`;

  main.onchange = async (e) => {
    if (e.target.name === 'prefill') {
      await db.setMeta('settings', { ...settings, prefill: e.target.value });
      settings.prefill = e.target.value;
      toast('Impostazione salvata');
    } else if (e.target.matches('[data-file]') && e.target.files[0]) {
      await restoreBackup(e.target.files[0]);
      e.target.value = '';
    }
  };
  actions(main, { export: downloadBackup });
}
