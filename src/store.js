import { currentUser, pullState, pushState, listRemotePdfs, uploadPdf, deleteRemotePdf } from "./cloud.js";
import { reconcile } from "./merge.js";

/* সব local data + cloud sync এক জায়গায় (Classes & Notes, ভুল-খাতা — দুটোই এটা ব্যবহার করে) */
export const SCHED_KEY = "iut-sched-v1";      // class routine
export const META_KEY  = "iut-class-meta-v1"; // per-class instruction + revised tick
export const BOOK_KEY  = "iut-book-v1";       // ভুল-খাতা / Doubt
export const EXAM_KEY  = "iut-exams-v1";      // পরীক্ষার তালিকা
export const TS_KEY    = "iut-sync-ts-v1";    // সর্বশেষ local edit (last-write-wins)
export const PEND_KEY  = "iut-pending-del-v1";// offline-এ মুছে ফেলা file, cloud থেকে মোছা বাকি
export const X_KEY     = "iut-sync-x-v1";     // টিক/লগের আইটেম-ভিত্তিক sync tracker
// মূল অ্যাপের key (App.jsx-এর সাথে একই)
const COURSE_KEY = "iut-ipe-11-progress", MODE_KEY = "rtn-mode", CLASSLOG_KEY = "iut-class-log-v1";

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

/* ── টপিক-টিক, রুটিন-টিক, ক্লাস লগ, মোড: এই ডিভাইসে এখন কী আছে ── */
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

function collectLocal() {
  const ticks = {}, recs = {};
  const topics = loadLS(COURSE_KEY, {});
  for (const k in topics) if (topics[k]) ticks["T|" + k] = true;
  const old = new Date(Date.now() - 200 * 864e5).toISOString().slice(0, 10);
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i), m = /^rtn-(\d{4}-\d{2}-\d{2})$/.exec(key || "");
    if (!m || m[1] < old) continue;
    const done = (loadLS(key, { done: [] }).done) || [];
    done.forEach((v, idx) => { if (v) ticks[`R|${m[1]}|${idx}`] = true; });
  }
  for (const l of loadLS(CLASSLOG_KEY, [])) recs["L|" + l.id] = JSON.stringify(l);
  const mode = localStorage.getItem(MODE_KEY);
  if (mode !== null) recs["S|mode"] = mode;
  return { ticks, recs };
}

function applyLocal(apply) {
  let changed = false;
  const tk = Object.entries(apply.ticks), rc = Object.entries(apply.recs);
  if (tk.length) {
    const topics = loadLS(COURSE_KEY, {}), days = {};
    for (const [k, want] of tk) {
      changed = true;
      if (k.startsWith("T|")) topics[k.slice(2)] = want;
      else if (k.startsWith("R|")) { const [, ds, i] = k.split("|"); (days[ds] = days[ds] || []).push([+i, want]); }
    }
    saveLS(COURSE_KEY, topics);
    for (const ds in days) {
      const obj = loadLS("rtn-" + ds, { done: [] }), done = [...(obj.done || [])];
      for (const [i, want] of days[ds]) { while (done.length <= i) done.push(false); done[i] = want; }
      saveLS("rtn-" + ds, { ...obj, done: done.map(v => !!v) });
    }
  }
  if (rc.length) {
    let logs = loadLS(CLASSLOG_KEY, []), logsChanged = false;
    for (const [k, val] of rc) {
      changed = true;
      if (k === "S|mode") { if (val !== null) { try { localStorage.setItem(MODE_KEY, val); } catch {} } }
      else if (k.startsWith("L|")) {
        const id = k.slice(2); logsChanged = true;
        logs = logs.filter(l => String(l.id) !== id);
        if (val !== null) { try { logs = [JSON.parse(val), ...logs]; } catch {} }
      }
    }
    if (logsChanged) saveLS(CLASSLOG_KEY, logs);
  }
  if (changed && typeof window !== "undefined") window.dispatchEvent(new Event("iut-data-applied"));
}

/* remote.x-এর সাথে মিলিয়ে এই ডিভাইসে বদল বসাই; ফেরত: { merged, remoteDiffers } */
export function reconcileLocal(remoteX) {
  const r = reconcile(loadLS(X_KEY, { ticks: {}, recs: {} }), collectLocal(), remoteX, Date.now(), todayStr());
  applyLocal(r.apply);
  saveLS(X_KEY, r.merged);
  return r;
}

const buildState = x => ({
  schedule: loadLS(SCHED_KEY, []), meta: loadLS(META_KEY, {}), book: loadLS(BOOK_KEY, []), exams: loadLS(EXAM_KEY, []),
  x, ts: loadLS(TS_KEY, 0),
});
/* push সবসময় আগে remote টেনে টিকগুলো মিলিয়ে নেয়, যাতে অন্য ডিভাইসের টিক মুছে না যায় */
export async function pushLocal(u, merged) {
  let x = merged;
  if (!x) { const remote = await pullState(); x = reconcileLocal(remote && remote.x).merged; }
  await pushState(u, buildState(x));
}

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

/* পুরো sync: state (routine, meta, ভুল-খাতা, পরীক্ষা) + টিক/লগ + PDF/ছবি।
   opts.files === false হলে PDF/ছবি বাদ (হালকা sync)। ফেরত: { pulled, pdfs } */
export async function syncEverything(u, opts) {
  const files = !opts || opts.files !== false;
  let pendIds = new Set();
  if (files) {
    // ১) offline-এ মুছে ফেলা file cloud থেকেও মুছি
    const stillPend = [];
    for (const d of loadLS(PEND_KEY, [])) { try { await deleteRemotePdf(d.path, d.id); } catch { stillPend.push(d); } }
    saveLS(PEND_KEY, stillPend);
    pendIds = new Set(stillPend.map(d => d.id));
  }

  // ২) state: যেটা নতুন সেটা জেতে
  const remote = await pullState(), localTs = loadLS(TS_KEY, 0);
  let pulled = false, needPush = false;
  if (remote && remote.ts > localTs) {
    saveLS(SCHED_KEY, remote.schedule || []);
    saveLS(META_KEY, remote.meta || {});
    if (remote.book !== undefined) saveLS(BOOK_KEY, remote.book);
    if (remote.exams !== undefined) saveLS(EXAM_KEY, remote.exams);
    saveLS(TS_KEY, remote.ts);
    pulled = true;
    // পুরনো ভার্সনের state-এ book/exams ছিল না — আমাদের local data হারাতে দেব না
    if ((remote.book === undefined && loadLS(BOOK_KEY, []).length) || (remote.exams === undefined && loadLS(EXAM_KEY, []).length)) needPush = true;
  } else {
    // remote-এর চেয়ে আমাদের বেশি নতুন (বা remote-এ কিছুই নেই) হলেই শুধু push
    const hasData = localTs > 0 || loadLS(SCHED_KEY, []).length || loadLS(BOOK_KEY, []).length || loadLS(EXAM_KEY, []).length;
    if (!remote ? hasData : localTs > remote.ts) { saveLS(TS_KEY, localTs || Date.now()); needPush = true; }
  }

  // ৩) টিক / ক্লাস লগ / মোড: আইটেম ধরে মেলাই (সবসময়, ts-এর উপর নির্ভর না করে)
  const rx = reconcileLocal(remote && remote.x);
  if (rx.remoteDiffers) needPush = true;
  if (needPush) await pushLocal(u, rx.merged);
  if (!files) return { pulled, pdfs: null };

  // ৪) PDF / ছবি
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
