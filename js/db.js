// Archivio locale (IndexedDB): tutti i dati restano sul dispositivo.
const NAME = 'palestra';
const STORES = ['exercises', 'plans', 'workouts', 'meta'];
let conn;

function open() {
  if (conn) return conn;
  conn = new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, 1);
    req.onupgradeneeded = () => {
      for (const s of STORES) req.result.createObjectStore(s, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
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
