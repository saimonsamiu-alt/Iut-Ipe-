import { META_KEY, BOOK_KEY, loadLS } from "./store.js";
import { streaks, heatmap, weekly, addDays, MILESTONES } from "./progress.js";

const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const bn = n => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);
const JS_DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const shortDate = ds => new Date(ds + "T00:00:00").toLocaleDateString("bn-BD", { day: "numeric", month: "short" });

/* সেদিনের রুটিন কতটুকু শেষ (০–১০০), টাস্ক না থাকলে null */
export const makePctOn = (routine, mode, loadRtn) => ds => {
  const [y, m, d] = ds.split("-").map(Number);
  const tasks = (routine[mode] && routine[mode][JS_DAY[new Date(y, m - 1, d).getDay()]]) || [];
  if (!tasks.length) return null;
  const done = (loadRtn(ds).done || []).slice(0, tasks.length).filter(Boolean).length;
  return Math.round((done / tasks.length) * 100);
};
const heat = pct => pct === null ? "transparent" : pct === 0 ? "#111827" : pct < 34 ? "#14532D" : pct < 67 ? "#15803D" : pct < 100 ? "#22C55E" : "#4ADE80";

export default function ProgressTab({ courses, done, routine, mode, loadRtn, wasStudied }) {
  const today = fmtDate(new Date());
  const pctOn = makePctOn(routine, mode, loadRtn);
  const st = streaks(wasStudied, today);
  const weeks = weekly(pctOn, wasStudied, today, 8);
  const cols = heatmap(pctOn, today, 16);
  const thisW = weeks[weeks.length - 1], lastW = weeks[weeks.length - 2];

  /* কোর্স অনুযায়ী টপিক কভারেজ */
  const cov = courses.map(c => {
    const total = c.topics.length, dn = c.topics.filter(t => done[`${c.id}__${t.id}`]).length;
    return { c, total, dn, pct: total ? Math.round((dn / total) * 100) : 0 };
  });
  const allTotal = cov.reduce((s, x) => s + x.total, 0), allDone = cov.reduce((s, x) => s + x.dn, 0);
  const allPct = allTotal ? Math.round((allDone / allTotal) * 100) : 0;

  /* Revision ও Doubt */
  const meta = loadLS(META_KEY, {});
  const revCount = Object.values(meta).reduce((s, m) => s + ((m && m.rev && m.rev.n) || 0), 0);
  const book = loadLS(BOOK_KEY, []);
  const weekAgo = addDays(today, -6);
  const solvedWeek = book.filter(e => e.resolved && (e.resolvedAt || "") >= weekAgo).length;
  const solvedAll = book.filter(e => e.resolved).length;
  const openAll = book.length - solvedAll;

  const delta = lastW ? thisW.avg - lastW.avg : 0;
  const maxAvg = Math.max(100, ...weeks.map(w => w.avg));

  const card = { background: "#0F172A", border: "1px solid #1E293B", borderRadius: 14, padding: "14px 15px", marginBottom: 12 };
  const h = { fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: "#64748B", marginBottom: 10 };
  const fire = st.current >= 30 ? "#F97316" : st.current >= 7 ? "#F59E0B" : st.current >= 1 ? "#FBBF24" : "#475569";

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 14px" }}>
      {/* streak */}
      <div style={{ ...card, borderColor: fire + "66", textAlign: "center", padding: "20px 15px" }}>
        <div style={{ fontSize: 44, lineHeight: 1 }}>{st.current > 0 ? "🔥" : "🌱"}</div>
        <div style={{ fontSize: 38, fontWeight: 900, color: fire, lineHeight: 1.1, marginTop: 4 }}>{bn(st.current)}</div>
        <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 700 }}>দিন টানা পড়া</div>
        <div style={{ fontSize: 11.5, marginTop: 8, color: st.todayDone ? "#34D399" : "#F59E0B", fontWeight: 700 }}>
          {st.todayDone ? "✅ আজ পড়া হয়ে গেছে" : st.current > 0 ? "⚠️ আজ পড়ার টাস্ক টিক দিন, নইলে streak ভেঙে যাবে" : "আজ পড়ার একটা টাস্ক টিক দিয়ে শুরু করুন"}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 12, fontSize: 11, color: "#64748B" }}>
          <span>সেরা: <b style={{ color: "#E2E8F0" }}>{bn(st.best)} দিন</b></span>
          {st.next && <span>পরের লক্ষ্য: <b style={{ color: "#E2E8F0" }}>{bn(st.next)} দিন</b> (আর {bn(st.toNext)})</span>}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {MILESTONES.map(m => (
            <span key={m} style={{ fontSize: 10.5, fontWeight: 800, padding: "3px 9px", borderRadius: 100, border: `1px solid ${st.best >= m ? "#F59E0B" : "#1E293B"}`, color: st.best >= m ? "#FCD34D" : "#334155", background: st.best >= m ? "#F59E0B1A" : "transparent" }}>
              {st.best >= m ? "🏅" : "○"} {bn(m)}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 9.5, color: "#475569", marginTop: 10 }}>"পড়া" মানে সেদিন রুটিনের অন্তত একটা পড়ার টাস্ক টিক দেওয়া, যেটা আপনার Reading শাস্তির হিসাবেও ধরা হয়।</div>
      </div>

      {/* এই সপ্তাহ */}
      <div style={card}>
        <div style={h}>📈 এই সপ্তাহ</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, textAlign: "center" }}>
          {[[`${bn(thisW.studied)}/${bn(thisW.days)}`, "দিন পড়েছেন", "#38BDF8"], [`${bn(thisW.avg)}%`, "রুটিন গড়", "#34D399"],
            [`${delta > 0 ? "+" : ""}${bn(delta)}%`, "গত সপ্তাহের তুলনায়", delta >= 0 ? "#34D399" : "#F87171"]].map(([v, l, c]) => (
            <div key={l}>
              <div style={{ fontSize: 20, fontWeight: 900, color: c }}>{v}</div>
              <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* সাপ্তাহিক চার্ট */}
      <div style={card}>
        <div style={h}>📊 গত ৮ সপ্তাহের রুটিন গড় (%)</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 110 }}>
          {weeks.map(w => (
            <div key={w.start} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
              <div style={{ fontSize: 9.5, color: "#94A3B8", marginBottom: 2 }}>{bn(w.avg)}</div>
              <div style={{ width: "100%", height: `${(w.avg / maxAvg) * 80}%`, minHeight: 2, borderRadius: "4px 4px 0 0", background: w.current ? "#38BDF8" : "#334155" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {weeks.map(w => <div key={w.start} style={{ flex: 1, textAlign: "center", fontSize: 8.5, color: w.current ? "#38BDF8" : "#475569" }}>{shortDate(w.start)}</div>)}
        </div>
      </div>

      {/* heatmap */}
      <div style={card}>
        <div style={h}>🗓 গত ১৬ সপ্তাহ (গাঢ় সবুজ = বেশি টাস্ক শেষ)</div>
        <div style={{ display: "flex", gap: 3, overflowX: "auto", paddingBottom: 4 }}>
          {cols.map((col, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {col.map(c => (
                <div key={c.ds} title={`${c.ds}${c.pct !== null ? ` — ${c.pct}%` : ""}`}
                  style={{ width: 15, height: 15, borderRadius: 3, background: c.future ? "transparent" : heat(c.pct), border: c.ds === today ? "1.5px solid #38BDF8" : c.future ? "1px dashed #1E293B" : "1px solid #0B1120" }} />
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, fontSize: 9.5, color: "#475569" }}>
          কম {[0, 20, 50, 80, 100].map(p => <span key={p} style={{ width: 11, height: 11, borderRadius: 3, background: heat(p), display: "inline-block" }} />)} বেশি
          <span style={{ marginLeft: 8 }}>সারি: শনি → শুক্র</span>
        </div>
      </div>

      {/* কোর্স কভারেজ */}
      <div style={card}>
        <div style={{ ...h, display: "flex", justifyContent: "space-between" }}>
          <span>📚 কোর্স অনুযায়ী টপিক</span>
          <span style={{ color: "#E2E8F0" }}>{bn(allDone)}/{bn(allTotal)} · {bn(allPct)}%</span>
        </div>
        {cov.map(({ c, total, dn, pct }) => (
          <div key={c.id} style={{ marginBottom: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
              <span style={{ color: c.color, fontWeight: 800 }}>{c.code}</span>
              <span style={{ color: "#94A3B8" }}>{bn(dn)}/{bn(total)} · {bn(pct)}%</span>
            </div>
            <div style={{ height: 6, background: "#1E293B", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: c.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Revision ও Doubt */}
      <div style={card}>
        <div style={h}>🔁 Revision আর Doubt</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, textAlign: "center" }}>
          {[[bn(revCount), "Revision সম্পন্ন (মোট)", "#F59E0B"], [bn(solvedWeek), "এই সপ্তাহে Doubt সমাধান", "#34D399"], [bn(openAll), "এখনো খোলা Doubt/ভুল", openAll ? "#F87171" : "#34D399"]].map(([v, l, c]) => (
            <div key={l}>
              <div style={{ fontSize: 20, fontWeight: 900, color: c }}>{v}</div>
              <div style={{ fontSize: 10, color: "#64748B", marginTop: 2, lineHeight: 1.3 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: "#475569", marginTop: 10, textAlign: "center" }}>সব সময়ে সমাধান হয়েছে {bn(solvedAll)}টা Doubt/ভুল।</div>
      </div>
    </div>
  );
}
