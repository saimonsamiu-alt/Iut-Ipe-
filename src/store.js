import { currentUser, pullState, pushState, listRemotePdfs, uploadPdf, deleteRemotePdf } from "./cloud.js";

/* সব local data + cloud sync এক জায়গায় (Classes & Notes, ভুল-খাতা — দুটোই এটা ব্যবহার করে) */
export const SCHED_KEY = "iut-sched-v1";      // class routine
export const META_KEY  = "iut-class-meta-v1"; // per-class instruction + revised tick
export const BOOK_KEY  = "iut-book-v1";       // ভুল-খাতা / Doubt
export const TS_KEY    = "iut-sync-ts-v1";    // সর্বশেষ local edit (last-write-wins)
export const PEND_KEY  = "iut-pending-del-v1";// offline-এ মুছে ফেলা file, cloud থেকে মোছা বাকি

export const loadLS = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
export const saveLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/* PDF / ছবি IndexedDB-তে (localStorage-এ বড় file ধরে না) */
const DB_NAME = "iut-ipe-notes", STORE = "pdfs";
const openDB = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB_NAME, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const idb = async (mode, fn) => {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, mode), st = tx.objectStore(STORE), req = fn(st);
    tx.oncomplete = () => res(req && req.result);
    tx.onerror = () => rej(tx.error);
  });
};
export const getAllPdfs = () => idb("readonly", s => s.getAll()).then(r => r || []);
export const putPdf = rec => idb("readwrite", s => s.put(rec));
export const delPdf = id => idb("readwrite", s => s.delete(id));

export const touchLocal = () => saveLS(TS_KEY, Date.now());

export const pushLocal = u => pushState(u, {
  schedule: loadLS(SCHED_KEY, []), meta: loadLS(META_KEY, {}), book: loadLS(BOOK_KEY, []), ts: loadLS(TS_KEY, 0),
});

/* যে পাতায় নিজের push নেই (যেমন "আজ"), সেখান থেকে বদল হলে cloud-এ পাঠাই */
let _pushTimer;
export const schedulePush = () => {
  clearTimeout(_pushTimer);
  _pushTimer = setTimeout(async () => { try { const u = await currentUser(); if (u) await pushLocal(u); } catch {} }, 1200);
};

/* একটা file cloud-এ তুলি (ব্যর্থ হলে পরে sync-এ আবার চেষ্টা হবে) */
export async function uploadFile(u, rec) {
  rec.path = await uploadPdf(u, rec);
  await putPdf(rec);
}
/* একটা file local + cloud থেকে মুছি */
export async function removeFile(u, rec) {
  await delPdf(rec.id);
  if (rec.path) {
    try { if (!u) throw 0; await deleteRemotePdf(rec.path, rec.id); }
    catch { saveLS(PEND_KEY, [...loadLS(PEND_KEY, []), { id: rec.id, path: rec.path }]); }
  }
}

/* পুরো sync: state (routine, meta, ভুল-খাতা) + PDF/ছবি। ফেরত: { pulled, pdfs } */
export async function syncEverything(u) {
  // ১) offline-এ মুছে ফেলা file cloud থেকেও মুছি
  const stillPend = [];
  for (const d of loadLS(PEND_KEY, [])) { try { await deleteRemotePdf(d.path, d.id); } catch { stillPend.push(d); } }
  saveLS(PEND_KEY, stillPend);
  const pendIds = new Set(stillPend.map(d => d.id));

  // ২) state: যেটা নতুন সেটা জেতে
  const remote = await pullState(), localTs = loadLS(TS_KEY, 0);
  let pulled = false;
  if (remote && remote.ts > localTs) {
    saveLS(SCHED_KEY, remote.schedule || []);
    saveLS(META_KEY, remote.meta || {});
    if (remote.book !== undefined) saveLS(BOOK_KEY, remote.book);
    saveLS(TS_KEY, remote.ts);
    pulled = true;
    if (remote.book === undefined && loadLS(BOOK_KEY, []).length) await pushLocal(u); // পুরনো ভার্সনের state-এ book ছিল না
  } else if (localTs > 0 || loadLS(SCHED_KEY, []).length || loadLS(BOOK_KEY, []).length) {
    const ts = localTs || Date.now(); saveLS(TS_KEY, ts);
    await pushLocal(u);
  }

  // ৩) PDF / ছবি
  const rows = await listRemotePdfs(), remoteIds = new Set(rows.map(r => r.id));
  let local = await getAllPdfs();
  for (const r of local) if (r.path && !remoteIds.has(r.id)) await delPdf(r.id);   // অন্য device-এ মুছেছে
  local = local.filter(r => !(r.path && !remoteIds.has(r.id)));
  for (const r of local) {                                                         // local-only → upload
    if (!r.path && r.blob) { try { await uploadFile(u, r); } catch {} }
  }
  const have = new Set(local.map(r => r.id));
  for (const row of rows) {                                                        // cloud-only → list-এ আনি
    if (have.has(row.id) || pendIds.has(row.id)) continue;
    const rec = { id: row.id, occ: row.occ, ds: row.ds, subjKey: row.subj_key, name: row.name, size: row.size, blob: null, path: row.path };
    await putPdf(rec); local.push(rec);
  }
  return { pulled, pdfs: local };
}
