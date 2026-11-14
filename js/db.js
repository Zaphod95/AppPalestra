// Archivio locale (IndexedDB): tutti i dati restano sul dispositivo.
import { DEMO_DB, isDemo } from './demo.js';

// In modalità esempio si usa un archivio a parte.
const NAME = isDemo() ? DEMO_DB : 'palestra';
const VERSION = 2;
const STORES = ['exercises', 'plans', 'workouts', 'meta', 'body'];
let conn;

function open() {
  if (conn) return conn;
  conn = new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, VERSION);
    // Le versioni nuove aggiungono contenitori senza toccare quelli esistenti.
    req.onupgradeneeded = () => {
      for (const s of STORES) {
        if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => {
      const d = req.result;
      // Se un'altra scheda aggiorna l'archivio, questa si ricarica con il codice nuovo.
      d.onversionchange = () => { d.close(); location.reload(); };
      resolve(d);
    };
    req.onerror = () => reject(req.error);
  });
  return conn;
}

async function tx(store, mode, fn) {
  const d = await open();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const out = fn(t.objectStore(store));
    t.oncomplete = () => resolve(out && 'result' in out ? out.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const all = (s) => tx(s, 'readonly', (o) => o.getAll());
export const get = (s, id) => tx(s, 'readonly', (o) => o.get(id));
export const put = (s, v) => tx(s, 'readwrite', (o) => o.put(v));
export const del = (s, id) => tx(s, 'readwrite', (o) => o.delete(id));

export async function replaceAll(s, rows) {
  await tx(s, 'readwrite', (o) => {
    o.clear();
    for (const r of rows) o.put(r);
  });
}

export async function getMeta(id, fallback) {
  const r = await get('meta', id);
  return r ? r.value : fallback;
}
export const setMeta = (id, value) => put('meta', { id, value });
export const delMeta = (id) => del('meta', id);
