/* স্বয়ংক্রিয় Revision: ক্লাসের ১, ৩, ৭ ও ১৪ দিন পর (spaced repetition) */
export const INTERVALS = [1, 3, 7, 14];
export const STAGE_BN = ["১ম", "২য়", "৩য়", "৪র্থ"];
const LOOKBACK = 21;                       // এর চেয়ে পুরনো ক্লাসের বাকি Revision নিজে থেকে বাদ
const FALLBACK_KEY = "iut-rev-start-local";

const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toDate = ds => new Date(ds + "T00:00:00");
export const addDays = (ds, n) => { const d = toDate(ds); d.setDate(d.getDate() + n); return fmtDate(d); };
const diffDays = (a, b) => Math.round((toDate(a) - toDate(b)) / 864e5);

export const sortKey = (t = "") => {
  const ms = [...t.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/gi)];
  if (!ms.length) return 0;
  const conv = (m, ap) => { let h = +m[1] % 12; if (ap && ap.toUpperCase() === "PM") h += 12; return h * 60 + (+m[2] || 0); };
  const last = ms[ms.length - 1], first = ms[0];
  let s = conv(first, first[3] || last[3]);
  if (!first[3] && ms.length > 1 && s > conv(last, last[3])) s -= 720;
  return s;
};

/* একটা তারিখের সব ক্লাস */
export function occOnDate(sched, meta, ds, pdfs = []) {
  const w = toDate(ds).getDay();
  return sched
    .filter(e => (e.date ? e.date === ds : e.day === w))
    .map(e => {
      const occ = `${ds}|${e.subjKey}|${e.time}`, m = meta[occ] || {};
      return {
        occ, ds, time: e.time, subject: e.subject, subjKey: e.subjKey,
        instruction: m.instruction !== undefined ? m.instruction : (e.instruction || ""),
        pdfs: pdfs.filter(p => p.occ === occ),
      };
    })
    .sort((a, b) => sortKey(a.time) - sortKey(b.time));
}

/* Revision কোন তারিখ থেকে গোনা শুরু (পুরনো ক্লাসের স্তূপ এড়াতে) */
export function revStart(meta, today) {
  if (meta.__rev && meta.__rev.start) return meta.__rev.start;
  try {
    let v = localStorage.getItem(FALLBACK_KEY);
    if (!v) { v = today; localStorage.setItem(FALLBACK_KEY, v); }
    return v;
  } catch { return today; }
}

/* { due: [...আজ ও দেরি], upcoming: [...আগামী ৭ দিন] } */
export function revisionItems(sched, meta, today, pdfs = []) {
  const start = revStart(meta, today);
  const items = [];
  for (let i = 0; i <= LOOKBACK; i++) {
    const ds = addDays(today, -i);
    if (ds < start) break;
    for (const o of occOnDate(sched, meta, ds, pdfs)) {
      const r = (meta[o.occ] || {}).rev || {};
      const n = r.n || 0;
      if (r.skip || n >= INTERVALS.length) continue;
      let due = addDays(ds, INTERVALS[n]);
      if (r.last && addDays(r.last, 1) > due) due = addDays(r.last, 1);   // দেরিতে করলে পরেরটা সাথে সাথে জমে না
      items.push({ ...o, stage: n, due, late: diffDays(today, due), days: INTERVALS[n] });
    }
  }
  const due = items.filter(i => i.due <= today).sort((a, b) => b.late - a.late || a.ds.localeCompare(b.ds));
  const upcoming = items.filter(i => i.due > today && i.due <= addDays(today, 7)).sort((a, b) => a.due.localeCompare(b.due));
  return { due, upcoming, start };
}

const patchRev = (meta, occ, ch) => {
  const cur = meta[occ] || {};
  return { ...meta, [occ]: { ...cur, rev: { ...(cur.rev || {}), ...ch } } };
};
export const markDone = (meta, occ, today) => {
  const n = ((meta[occ] || {}).rev || {}).n || 0;
  return patchRev(meta, occ, { n: n + 1, last: today });
};
export const markSkip = (meta, occ) => patchRev(meta, occ, { skip: true });
export const setStart = (meta, ds) => ({ ...meta, __rev: { ...(meta.__rev || {}), start: ds } });
