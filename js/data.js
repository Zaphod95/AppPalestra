// Impostazioni e backup dei dati.
import * as db from './db.js';
import { actions, confirmBox, dateShort, toast } from './ui.js';
import { enterDemo, exitDemo, isDemo } from './demo.js';
export const BACKUP_EVERY_DAYS = 14;

async function downloadBackup() {
  const payload = {
    app: 'AppPalestra', version: 2, exportedAt: new Date().toISOString(),
    exercises: await db.all('exercises'),
    plans: await db.all('plans'),
    workouts: await db.all('workouts'),
    body: await db.all('body'),
    settings: await db.getMeta('settings', {}),
  };
  const name = `palestra-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([JSON.stringify(payload)], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ files: [file], title: name });
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return true;
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
  await db.replaceAll('body', Array.isArray(data.body) ? data.body : []);
  await db.setMeta('settings', data.settings || {});
  await db.delMeta('active');
  // I dati appena ripristinati sono già al sicuro in quel file.
  await db.setMeta('lastBackup', Date.now());
  toast('Backup ripristinato');
  location.hash = '#/';
}

export async function dataView(main) {
  const settings = await db.getMeta('settings', {});
  const lastBackup = await db.getMeta('lastBackup', null);
  const prefill = settings.prefill || 'last';
  const build = typeof caches !== 'undefined' ? (await caches.keys()).find((k) => k.startsWith('palestra-')) : null;
  const saveSettings = async (patch) => {
    Object.assign(settings, patch);
    await db.setMeta('settings', settings);
    toast('Impostazione salvata');
  };

  main.innerHTML = `
    <header class="top"><a class="icon-btn" href="#/" aria-label="Indietro">←</a><h1>Dati e impostazioni</h1></header>
    <section class="card"><h2>Valori precompilati in palestra</h2>
      <label class="radio"><input type="radio" name="prefill" value="last" ${prefill === 'last' ? 'checked' : ''}>
        <span><b>Ultima volta</b><small>Parti da quello che hai fatto nell'ultimo allenamento. La prima volta usa i valori di base.</small></span></label>
      <label class="radio"><input type="radio" name="prefill" value="base" ${prefill === 'base' ? 'checked' : ''}>
        <span><b>Valori di base</b><small>Parti sempre dai valori inseriti nella scheda.</small></span></label>
    </section>
    <section class="card"><h2>Dati di esempio</h2>
      ${isDemo()
        ? `<p class="hint">Stai guardando dati di esempio. Quando esci tornano i tuoi dati veri, che non sono mai stati toccati.</p>
           <button class="btn primary wide" data-a="demoExit">Esci dai dati di esempio</button>`
        : `<p class="hint">Mostra l'app piena di allenamenti finti, per vedere come appaiono storico e statistiche. Usa un archivio a parte: i tuoi dati non vengono toccati e tornano quando esci.</p>
           <button class="btn ghost wide" data-a="demoEnter">Guarda con dati di esempio</button>`}
    </section>
    ${isDemo() ? '' : `<section class="card"><h2>Backup</h2>
      <p class="hint">I dati esistono solo su questo dispositivo. Salva un backup almeno ogni ${BACKUP_EVERY_DAYS} giorni, comprese foto e pesate.
        <b data-last>${lastBackup ? `Ultimo backup: ${dateShort(lastBackup)}.` : 'Non hai ancora salvato un backup.'}</b></p>
      <button class="btn primary wide" data-a="export">Salva backup</button>
      <label class="btn ghost wide">Ripristina da file<input type="file" accept=".json,application/json" data-file hidden></label>
    </section>`}
    <p class="hint center">Versione ${build ? build.replace('palestra-', '') : 'di sviluppo'}</p>`;

  main.onchange = async (e) => {
    const t = e.target;
    if (t.name === 'prefill') await saveSettings({ prefill: t.value });
    else if (t.matches('[data-file]') && t.files[0]) {
      await restoreBackup(t.files[0]);
      t.value = '';
    }
  };
  actions(main, {
    demoEnter: () => enterDemo(),
    demoExit: exitDemo,
    export: async () => {
      if (!await downloadBackup()) return;
      await db.setMeta('lastBackup', Date.now());
      main.querySelector('[data-last]').textContent = `Ultimo backup: ${dateShort(Date.now())}.`;
    },
  });
}
