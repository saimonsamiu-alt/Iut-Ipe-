/* অগ্রগতির হিসাব: streak, heatmap, সাপ্তাহিক গড় */
const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toDate = ds => new Date(ds + "T00:00:00");
export const addDays = (ds, n) => { const d = toDate(ds); d.setDate(d.getDate() + n); return fmtDate(d); };
/* সপ্তাহ শুরু শনিবার (০ = শনি … ৬ = শুক্র) */
export const wd = ds => (toDate(ds).getDay() + 1) % 7;
export const weekStart = ds => addDays(ds, -wd(ds));

export const MILESTONES = [3, 7, 14, 30, 60, 100];

/* studiedOn(ds) → true/false. আজ না পড়া থাকলে গতকাল থেকে গুনি (দিন এখনো শেষ হয়নি) */
export function streaks(studiedOn, today, maxBack = 400) {
  const todayDone = !!studiedOn(today);
  const from = todayDone ? today : addDays(today, -1);
  let current = 0;
  for (let i = 0; i <= maxBack; i++) { if (studiedOn(addDays(from, -i))) current++; else break; }
  let best = 0, run = 0;
  for (let i = maxBack; i >= 0; i--) {
    if (studiedOn(addDays(today, -i))) { run++; if (run > best) best = run; } else run = 0;
  }
  const next = MILESTONES.find(m => m > current) || null;
  return { current, best, todayDone, next, toNext: next ? next - current : 0, reached: MILESTONES.filter(m => best >= m) };
}

/* pctOn(ds) → 0..100 বা null (সেদিন কোনো টাস্কই নেই) */
export function heatmap(pctOn, today, weeks = 16) {
  const start = addDays(weekStart(today), -(weeks - 1) * 7);
  const cols = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const ds = addDays(start, w * 7 + d);
      col.push({ ds, future: ds > today, pct: ds > today ? null : pctOn(ds) });
    }
    cols.push(col);
  }
  return cols;
}

export function weekly(pctOn, studiedOn, today, n = 8) {
  const thisStart = weekStart(today), out = [];
  for (let k = n - 1; k >= 0; k--) {
    const s = addDays(thisStart, -k * 7);
    let sum = 0, cnt = 0, studied = 0, days = 0;
    for (let d = 0; d < 7; d++) {
      const ds = addDays(s, d);
      if (ds > today) break;
      days++;
      const p = pctOn(ds);
      if (p !== null) { sum += p; cnt++; }
      if (studiedOn(ds)) studied++;
    }
    out.push({ start: s, avg: cnt ? Math.round(sum / cnt) : 0, studied, days, current: k === 0 });
  }
  return out;
}
