/*
  টিক / ছোট রেকর্ড মেলানোর নিয়ম (প্রতিটি আইটেমের নিজস্ব সময় ধরে)।
  দুই ডিভাইসে আলাদা আলাদা টিক দিলে দুটোই থাকে; একই টিকে বিরোধ হলে সর্বশেষটা জেতে।

  tracker / remoteX = { ticks: { key: [0|1, সময়] }, recs: { key: [string|null, সময়] } }
  current           = { ticks: { key: true }, recs: { key: string } }   (এই ডিভাইসে এখন যা আছে)
*/
const DAY = 864e5;

export function reconcile(tracker, current, remoteX, now, today) {
  const tk = { ...(tracker.ticks || {}) }, rc = { ...(tracker.recs || {}) };

  // ১) এই ডিভাইসে যা বদলেছে তাতে "এখন" সময় বসাই
  for (const k in current.ticks) if (!tk[k] || tk[k][0] !== 1) tk[k] = [1, now];
  for (const k in tk) if (tk[k][0] === 1 && !current.ticks[k]) tk[k] = [0, now];
  const rr0 = (remoteX && remoteX.recs) || {};
  for (const k in current.recs) {
    if (!rc[k]) rc[k] = [current.recs[k], k in rr0 ? 0 : now];   // এই ডিভাইস আগে কখনো sync করেনি: remote-এ থাকলে remote-ই জিতবে (অ্যাপের নিজে-লেখা ডিফল্ট যেন উল্টে না দেয়)
    else if (rc[k][0] !== current.recs[k]) rc[k] = [current.recs[k], now];
  }
  for (const k in rc) if (rc[k][0] !== null && !(k in current.recs)) rc[k] = [null, now];

  // ২) remote-এর সাথে মেলাই
  const mt = { ...tk }, mr = { ...rc };
  const rt = (remoteX && remoteX.ticks) || {}, rr = (remoteX && remoteX.recs) || {};
  for (const k in rt) {
    const [v, t] = rt[k], l = mt[k];
    if (!l || t > l[1] || (t === l[1] && v === 1 && l[0] !== 1)) mt[k] = [v, t];
  }
  for (const k in rr) {
    const [v, t] = rr[k], l = mr[k];
    if (!l || t > l[1]) mr[k] = [v, t];
  }

  // ৩) পুরনো জঞ্জাল ছাঁটি (২০০ দিনের পুরনো রুটিন-টিক, ৯০ দিনের পুরনো মোছার চিহ্ন)
  const oldDay = new Date(new Date(today + "T00:00:00").getTime() - 200 * DAY).toISOString().slice(0, 10);
  for (const k in mt) {
    if (k.startsWith("R|") && k.split("|")[1] < oldDay) delete mt[k];
    else if (mt[k][0] === 0 && now - mt[k][1] > 90 * DAY) delete mt[k];
  }
  for (const k in mr) if (mr[k][0] === null && now - mr[k][1] > 90 * DAY) delete mr[k];

  // ৪) এই ডিভাইসে কী বদলাতে হবে
  const apply = { ticks: {}, recs: {} };
  for (const k in mt) { const want = mt[k][0] === 1; if (want !== !!current.ticks[k]) apply.ticks[k] = want; }
  for (const k in mr) {
    const want = mr[k][0], have = k in current.recs ? current.recs[k] : null;
    if (want !== have) apply.recs[k] = want;
  }

  // ৫) remote-এ কি কিছু নতুন পাঠাতে হবে?
  let remoteDiffers = false;
  for (const k in mt) { const r = rt[k]; if (!r || r[0] !== mt[k][0] || r[1] !== mt[k][1]) { remoteDiffers = true; break; } }
  if (!remoteDiffers) for (const k in mr) { const r = rr[k]; if (!r || r[0] !== mr[k][0] || r[1] !== mr[k][1]) { remoteDiffers = true; break; } }

  return { merged: { ticks: mt, recs: mr }, apply, remoteDiffers };
}
