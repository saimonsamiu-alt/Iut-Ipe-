import { useState, useEffect } from "react";
import { sortKey } from "./ClassPlanner.jsx";
import { SCHED_KEY, META_KEY, BOOK_KEY, getAllPdfs } from "./store.js";

/* ── ছোট helper ── */
const loadLS = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toDate = ds => new Date(ds + "T00:00:00");
const addDays = (ds, n) => { const d = toDate(ds); d.setDate(d.getDate() + n); return fmtDate(d); };
const JS_DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const bn = n => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);

/* "8:00–9:15 AM" → [শুরু মিনিট, শেষ মিনিট] */
const timeRange = (t = "") => {
  const ms = [...t.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/gi)];
  if (!ms.length) return [0, 0];
  const conv = (m, ap) => { let h = +m[1] % 12; if (ap && ap.toUpperCase() === "PM") h += 12; return h * 60 + (+m[2] || 0); };
  const last = ms[ms.length - 1], first = ms[0];
  if (ms.length < 2) { const s = conv(first, first[3]); return [s, s + 60]; }
  const end = conv(last, last[3]);
  let start = conv(first, first[3] || last[3]);
  if (!first[3] && start > end) start -= 720;
  return [start, end];
};
const gap = m => {
  const h = Math.floor(m / 60), mm = m % 60;
  return h > 0 ? `${bn(h)} ঘণ্টা${mm ? " " + bn(mm) + " মিনিট" : ""}` : `${bn(mm)} মিনিট`;
};

export default function TodayHub({ mode, routine, courses, rtn, classLogKey, onGoto }) {
  const [, force] = useState(0);
  const [pdfs, setPdfs] = useState([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    getAllPdfs().then(setPdfs).catch(() => {});
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const today = fmtDate(now), tomorrow = addDays(today, 1);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const colorOf = key => (courses.find(c => c.id === key) || {}).color || "#94A3B8";

  /* ── ক্লাস (Classes & Notes-এর routine থেকে) ── */
  const sched = loadLS(SCHED_KEY, []);
  const meta = loadLS(META_KEY, {});
  const occOn = ds => {
    const w = toDate(ds).getDay();
    return sched
      .filter(e => (e.date ? e.date === ds : e.day === w))
      .map(e => {
        const occ = `${ds}|${e.subjKey}|${e.time}`, m = meta[occ] || {};
        return {
          occ, ds, time: e.time, subject: e.subject, subjKey: e.subjKey,
          instruction: m.instruction !== undefined ? m.instruction : (e.instruction || ""),
          revised: !!m.revised, pdfs: pdfs.filter(p => p.occ === occ),
        };
      })
      .sort((a, b) => sortKey(a.time) - sortKey(b.time));
  };
  const classesToday = occOn(today);
  const classesTomorrow = occOn(tomorrow);
  const next = classesToday.find(o => timeRange(o.time)[0] > nowMin);
  const running = classesToday.find(o => { const [s, e] = timeRange(o.time); return nowMin >= s && nowMin < e; });
  const mustBring = [
    ...classesToday.filter(o => o.instruction.trim()).map(o => ({ ...o, when: "আজ" })),
    ...classesTomorrow.filter(o => o.instruction.trim()).map(o => ({ ...o, when: "কাল" })),
  ];

  /* ── আজকের রুটিন টাস্ক (আগের Routine ট্যাবের সাথে একই data) ── */
  const dayName = JS_DAY[now.getDay()];
  const tasks = (routine[mode] || {})[dayName] || [];
  const done = (rtn.load(today).done) || [];
  const doneCount = tasks.filter((_, i) => done[i]).length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const toggleTask = i => {
    const cur = rtn.load(today), d = [...(cur.done || [])];
    d[i] = !d[i];
    rtn.save(today, { done: d, total: tasks.length });
    force(n => n + 1);
  };

  /* ── Class Log: review বাকি ── */
  const logs = loadLS(classLogKey, []);
  const pendingLogs = logs.filter(l => !l.home || !l.next);
  const toggleLog = (id, field) => {
    const upd = logs.map(l => l.id === id ? { ...l, [field]: !l[field] } : l);
    try { localStorage.setItem(classLogKey, JSON.stringify(upd)); } catch {}
    force(n => n + 1);
  };
  const courseCode = id => (courses.find(c => c.id === id) || {}).code || id;

  /* ── Revision বাকি: গত ৭ দিনের ক্লাস, যেখানে note/instruction আছে অথচ revise হয়নি ── */
  const revDue = Array.from({ length: 7 }, (_, i) => addDays(today, -i - 1))
    .flatMap(occOn)
    .filter(o => !o.revised && (o.pdfs.length || o.instruction.trim()));

  /* ── ভুল-খাতা: খোলা Doubt / ভুল ── */
  const openBook = loadLS(BOOK_KEY, []).filter(e => !e.resolved)
    .sort((a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0) || String(b.date).localeCompare(String(a.date)));

  /* ── styles ── */
  const card = { background: "#0F172A", border: "1px solid #1E293B", borderRadius: 14, padding: "14px 15px", marginBottom: 12 };
  const h = { fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: "#64748B", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" };
  const link = { fontSize: 11, fontWeight: 700, color: "#38BDF8", cursor: "pointer", letterSpacing: 0 };
  const chip = (on, c) => ({ cursor: "pointer", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 100, border: `1px solid ${on ? c : "#334155"}`, background: on ? c + "22" : "transparent", color: on ? c : "#64748B" });

  const dateText = now.toLocaleDateString("bn-BD", { weekday: "long", day: "numeric", month: "long" });
  const hour = now.getHours();
  const greet = hour < 5 ? "শুভ রাত্রি" : hour < 12 ? "শুভ সকাল" : hour < 17 ? "শুভ দুপুর" : hour < 20 ? "শুভ সন্ধ্যা" : "শুভ রাত্রি";

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "18px 14px" }}>
      {/* শিরোনাম */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#38BDF8", fontWeight: 700 }}>{greet}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#F8FAFC" }}>{dateText}</div>
      </div>

      {/* সারসংক্ষেপ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
        {[
          [bn(classesToday.length), "আজ ক্লাস", "#38BDF8"],
          [bn(mustBring.length), "Instruction", "#F59E0B"],
          [`${bn(doneCount)}/${bn(tasks.length)}`, "টাস্ক", "#34D399"],
          [bn(pendingLogs.length + revDue.length), "Review বাকি", "#F97316"],
        ].map(([v, l, c]) => (
          <div key={l} style={{ background: "#0F172A", border: `1px solid ${c}33`, borderRadius: 12, padding: "10px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: c }}>{v}</div>
            <div style={{ fontSize: 9.5, color: "#64748B", marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* এখন / পরের ক্লাস */}
      {(running || next) && (
        <div style={{ ...card, borderColor: "#38BDF8", background: "#082033" }}>
          {running && (
            <div style={{ marginBottom: next ? 8 : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#34D399" }}>🟢 এখন চলছে</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: colorOf(running.subjKey) }}>{running.subject} <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>{running.time}</span></div>
            </div>
          )}
          {next && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#38BDF8" }}>⏭ পরের ক্লাস · {gap(timeRange(next.time)[0] - nowMin)} পর</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: colorOf(next.subjKey) }}>{next.subject} <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>{next.time}</span></div>
            </div>
          )}
        </div>
      )}

      {/* যা সঙ্গে আনতে/করতে হবে */}
      {mustBring.length > 0 && (
        <div style={{ ...card, background: "#1C1304", borderColor: "#F59E0B" }}>
          <div style={{ ...h, color: "#F59E0B" }}><span>⚠️ ক্লাসের Instruction (অবশ্যই)</span></div>
          {mustBring.map(o => (
            <div key={o.occ} onClick={() => onGoto({ rv: "planner", view: "daily", date: o.ds })} style={{ cursor: "pointer", marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>
                <b style={{ color: "#F59E0B" }}>{o.when}</b> · {o.time} · <b style={{ color: colorOf(o.subjKey) }}>{o.subject}</b>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#FCD34D", lineHeight: 1.45 }}>📌 {o.instruction}</div>
            </div>
          ))}
        </div>
      )}

      {/* আজকের ক্লাস */}
      <div style={card}>
        <div style={h}>
          <span>📅 আজকের ক্লাস</span>
          <span style={link} onClick={() => onGoto({ rv: "planner", view: "daily", date: today })}>Notes / PDF →</span>
        </div>
        {sched.length === 0 ? (
          <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>
            এখনো ক্লাস routine দেওয়া হয়নি।{" "}
            <span style={link} onClick={() => onGoto({ rv: "planner", view: "setup" })}>Routine upload করুন →</span>
          </div>
        ) : classesToday.length === 0 ? (
          <div style={{ fontSize: 12, color: "#475569" }}>আজ কোনো ক্লাস নেই 🎉</div>
        ) : (
          classesToday.map(o => {
            const [s, e] = timeRange(o.time), isNow = nowMin >= s && nowMin < e, over = nowMin >= e;
            return (
              <div key={o.occ} onClick={() => onGoto({ rv: "planner", view: "daily", date: today })}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid #1E293B", cursor: "pointer", opacity: over ? 0.55 : 1 }}>
                <div style={{ width: 4, alignSelf: "stretch", borderRadius: 3, background: colorOf(o.subjKey) }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: o.instruction.trim() ? 900 : 700, color: o.instruction.trim() ? "#FCD34D" : "#E2E8F0" }}>
                    {o.subject} {isNow && <span style={{ fontSize: 9, color: "#34D399" }}>● চলছে</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>{o.time}</div>
                </div>
                <div style={{ fontSize: 10, color: "#64748B", textAlign: "right" }}>
                  {o.pdfs.length > 0 && <div>📄 {bn(o.pdfs.length)}</div>}
                  {o.instruction.trim() && <div style={{ color: "#F59E0B", fontWeight: 800 }}>📌</div>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* আজকের টাস্ক */}
      <div style={card}>
        <div style={h}>
          <span>✅ আজকের রুটিন ({bn(pct)}%)</span>
          <span style={link} onClick={() => onGoto({ rv: "today" })}>পুরো routine →</span>
        </div>
        <div style={{ height: 5, background: "#1E293B", borderRadius: 4, marginBottom: 8, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "#34D399", transition: "width .3s" }} />
        </div>
        {tasks.length === 0 && <div style={{ fontSize: 12, color: "#475569" }}>আজকের জন্য কোনো টাস্ক নেই।</div>}
        {tasks.map((t, i) => {
          const [s, e] = timeRange(t.t), cur = nowMin >= s && nowMin < e;
          return (
            <div key={i} onClick={() => toggleTask(i)}
              style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 6px", borderRadius: 8, cursor: "pointer",
                background: cur ? "#082033" : "transparent", border: cur ? "1px solid #38BDF855" : "1px solid transparent" }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${done[i] ? "#34D399" : "#334155"}`, background: done[i] ? "#34D399" : "transparent",
                color: "#052E16", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{done[i] ? "✓" : ""}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, color: done[i] ? "#475569" : "#E2E8F0", textDecoration: done[i] ? "line-through" : "none", lineHeight: 1.4 }}>{t.task}</div>
                <div style={{ fontSize: 10, color: cur ? "#38BDF8" : "#475569" }}>{t.t}{cur ? " · এখন" : ""}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Class Log review বাকি */}
      {pendingLogs.length > 0 && (
        <div style={{ ...card, borderColor: "#F9731655" }}>
          <div style={{ ...h, color: "#F97316" }}>
            <span>📚 Class review বাকি ({bn(pendingLogs.length)})</span>
            <span style={link} onClick={() => onGoto({ rv: "classlog" })}>সব দেখুন →</span>
          </div>
          {pendingLogs.slice(0, 5).map(l => (
            <div key={l.id} style={{ padding: "7px 0", borderTop: "1px solid #1E293B" }}>
              <div style={{ fontSize: 12.5, color: "#E2E8F0", marginBottom: 5 }}>
                <b style={{ color: colorOf(l.courseId) }}>{courseCode(l.courseId)}</b> · {l.topic}
                <span style={{ fontSize: 10, color: "#475569" }}> ({l.date})</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span onClick={() => toggleLog(l.id, "home")} style={chip(l.home, "#34D399")}>{l.home ? "✓ " : ""}বাড়িতে পড়া</span>
                <span onClick={() => toggleLog(l.id, "next")} style={chip(l.next, "#38BDF8")}>{l.next ? "✓ " : ""}পরের ক্লাসের আগে</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revision বাকি */}
      {revDue.length > 0 && (
        <div style={card}>
          <div style={h}>
            <span>🔁 Revision বাকি (গত ৭ দিন)</span>
            <span style={link} onClick={() => onGoto({ rv: "planner", view: "revision" })}>Revision →</span>
          </div>
          {revDue.slice(0, 5).map(o => (
            <div key={o.occ} onClick={() => onGoto({ rv: "planner", view: "daily", date: o.ds })}
              style={{ display: "flex", gap: 8, alignItems: "center", padding: "7px 0", borderTop: "1px solid #1E293B", cursor: "pointer" }}>
              <div style={{ width: 4, alignSelf: "stretch", borderRadius: 3, background: colorOf(o.subjKey) }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: o.instruction.trim() ? 900 : 700, color: o.instruction.trim() ? "#FCD34D" : "#E2E8F0" }}>{o.subject}</div>
                <div style={{ fontSize: 10.5, color: "#64748B" }}>{toDate(o.ds).toLocaleDateString("bn-BD", { weekday: "short", day: "numeric", month: "short" })} · {o.time}</div>
              </div>
              <div style={{ fontSize: 10, color: "#64748B" }}>{o.pdfs.length > 0 && `📄 ${bn(o.pdfs.length)}`}</div>
            </div>
          ))}
          {revDue.length > 5 && <div style={{ fontSize: 11, color: "#475569", paddingTop: 6 }}>আরও {bn(revDue.length - 5)}টা বাকি…</div>}
        </div>
      )}

      {/* খোলা Doubt / ভুল */}
      {openBook.length > 0 && (
        <div style={{ ...card, borderColor: "#F8717155" }}>
          <div style={h}>
            <span>📓 খোলা Doubt / ভুল ({bn(openBook.length)})</span>
            <span style={link} onClick={() => onGoto({ tab: "book" })}>ভুল-খাতা →</span>
          </div>
          {openBook.slice(0, 3).map(e => (
            <div key={e.id} onClick={() => onGoto({ tab: "book" })} style={{ display: "flex", gap: 8, alignItems: "center", padding: "7px 0", borderTop: "1px solid #1E293B", cursor: "pointer" }}>
              <div style={{ width: 4, alignSelf: "stretch", borderRadius: 3, background: colorOf(e.courseId) }} />
              <div style={{ flex: 1, fontSize: 12.5, color: "#E2E8F0", lineHeight: 1.4 }}>
                {e.star && "⭐ "}{e.type === "doubt" ? "❓" : "❌"} {String(e.text || "(ছবি)").slice(0, 70)}
              </div>
              <div style={{ fontSize: 10, color: "#64748B" }}>{courseCode(e.courseId)}</div>
            </div>
          ))}
        </div>
      )}

      {/* তাড়াতাড়ি যাওয়ার বাটন */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
        {[["🗂 Classes & Notes", { rv: "planner", view: "daily", date: today }], ["🗓 মাসের view", { rv: "planner", view: "monthly" }], ["⬆️ Routine upload", { rv: "planner", view: "setup" }]].map(([l, nav]) => (
          <button key={l} onClick={() => onGoto(nav)}
            style={{ flex: 1, minWidth: 110, padding: "10px 8px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", background: "#0F172A", border: "1px solid #1E293B", borderRadius: 10, color: "#94A3B8" }}>{l}</button>
        ))}
      </div>
    </div>
  );
}
