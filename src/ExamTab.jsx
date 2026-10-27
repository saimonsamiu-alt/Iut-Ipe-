import { useState } from "react";
import { EXAM_KEY, loadLS, saveLS } from "./store.js";
import { useSync } from "./useSync.js";
import { EXAM_TYPES, examStats, upcoming, past } from "./exams.js";

const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const bn = n => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const niceDate = ds => new Date(ds + "T00:00:00").toLocaleDateString("bn-BD", { weekday: "short", day: "numeric", month: "long" });
const LEVEL = {
  ok:   ["#34D399", "✅ ঠিক পথে"],
  push: ["#F59E0B", "⚡ একটু দ্রুত লাগবে"],
  hard: ["#F87171", "🔥 চাপ বেশি"],
  late: ["#F87171", "🚨 সময় শেষ প্রায়"],
};

export default function ExamTab({ courses, done, toggleTopic }) {
  const [exams, setExams] = useState(() => loadLS(EXAM_KEY, []));
  const { user, status, pushSoon } = useSync(() => setExams(loadLS(EXAM_KEY, [])));
  const today = fmtDate(new Date());

  const emptyForm = { id: "", courseId: courses[0] ? courses[0].id : "", type: "CT", date: today, time: "", note: "", syllabus: [] };
  const [form, setForm] = useState(emptyForm);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState({});
  const [showPast, setShowPast] = useState(false);

  const commit = list => { setExams(list); saveLS(EXAM_KEY, list); pushSoon(); };
  const patch = (id, ch) => commit(exams.map(e => e.id === id ? { ...e, ...ch } : e));

  const save = () => {
    if (!form.courseId || !form.date) return;
    const all = (courses.find(c => c.id === form.courseId) || { topics: [] }).topics.length;
    const ex = { ...form, syllabus: form.syllabus.length === all ? [] : form.syllabus }; // সব বাছা = পুরো কোর্স
    commit(form.id ? exams.map(e => e.id === form.id ? { ...e, ...ex } : e) : [{ ...ex, id: uid() }, ...exams]);
    setAdding(false); setForm(emptyForm);
  };
  const startAdd = () => {
    const c = courses[0];
    setForm({ ...emptyForm, courseId: c ? c.id : "", syllabus: c ? c.topics.map(t => t.id) : [] });
    setAdding(true);
  };
  const startEdit = e => {
    const c = courses.find(x => x.id === e.courseId) || { topics: [] };
    setForm({ ...emptyForm, ...e, syllabus: e.syllabus && e.syllabus.length ? e.syllabus : c.topics.map(t => t.id) });
    setAdding(true); window.scrollTo(0, 0);
  };
  const remove = e => { if (window.confirm("এই পরীক্ষাটা মুছবেন?")) commit(exams.filter(x => x.id !== e.id)); };

  const formCourse = courses.find(c => c.id === form.courseId) || { topics: [] };
  const sections = {};
  formCourse.topics.forEach(t => { (sections[t.s] = sections[t.s] || []).push(t); });
  const toggleSyl = id => setForm(f => ({ ...f, syllabus: f.syllabus.includes(id) ? f.syllabus.filter(x => x !== id) : [...f.syllabus, id] }));
  const toggleSec = ts => setForm(f => {
    const ids = ts.map(t => t.id), all = ids.every(i => f.syllabus.includes(i));
    return { ...f, syllabus: all ? f.syllabus.filter(i => !ids.includes(i)) : [...new Set([...f.syllabus, ...ids])] };
  });

  const up = upcoming(exams, today), ps = past(exams, today);

  const card = { background: "#0F172A", border: "1px solid #1E293B", borderRadius: 14, padding: "14px 15px", marginBottom: 12 };
  const inp = { width: "100%", padding: "9px 12px", background: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#E2E8F0", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  const btn = (on, c = "#38BDF8") => ({ padding: "6px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", border: `1px solid ${on ? c : "#1E293B"}`, borderRadius: 8, background: on ? c + "22" : "#0F172A", color: on ? c : "#64748B" });

  const ExamCard = ({ e, isPast }) => {
    const s = examStats(e, courses, done, today), c = s.course, [lc, ltxt] = LEVEL[s.level];
    const cd = s.daysLeft <= 3 ? "#F87171" : s.daysLeft <= 7 ? "#F59E0B" : "#38BDF8";
    const isOpen = !!open[e.id];
    return (
      <div style={{ ...card, borderLeft: `3px solid ${c.color || "#475569"}`, opacity: isPast ? 0.85 : 1 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: c.color || "#94A3B8", background: (c.color || "#94A3B8") + "22", padding: "2px 8px", borderRadius: 6 }}>{c.code || "—"}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#E2E8F0", background: "#1E293B", padding: "2px 8px", borderRadius: 6 }}>{e.type}</span>
            </div>
            <div style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 700 }}>{niceDate(e.date)}{e.time ? ` · ${e.time}` : ""}</div>
            {e.note && <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 3, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>📝 {e.note}</div>}
          </div>
          {!isPast && (
            <div style={{ textAlign: "center", minWidth: 74 }}>
              <div style={{ fontSize: s.daysLeft === 0 ? 17 : 28, fontWeight: 900, color: cd, lineHeight: 1 }}>{s.daysLeft === 0 ? "আজ!" : bn(s.daysLeft)}</div>
              {s.daysLeft > 0 && <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>দিন বাকি</div>}
            </div>
          )}
        </div>

        {/* কভারেজ */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>
            <span>সিলেবাস কভারেজ{e.syllabus && e.syllabus.length ? " (বাছাই করা টপিক)" : ""}</span>
            <span><b style={{ color: c.color }}>{bn(s.doneCount)}</b>/{bn(s.total)} · {bn(s.pct)}%</span>
          </div>
          <div style={{ height: 6, background: "#1E293B", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${s.pct}%`, height: "100%", background: c.color || "#38BDF8" }} />
          </div>
        </div>

        {!isPast && s.total > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: lc, fontWeight: 700 }}>
            {s.remaining.length === 0
              ? "🎉 সব টপিক শেষ! এখন শুধু Revision।"
              : s.daysLeft >= 1
                ? `${ltxt} — প্রতিদিন গড়ে ${bn((Math.round(s.pace * 10) / 10).toString())}টা টপিক পড়তে হবে`
                : `${ltxt} — ${bn(s.remaining.length)}টা টপিক বাকি`}
          </div>
        )}

        {/* ফল (পরীক্ষার পর) */}
        {isPast && (
          <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>পেয়েছি:</span>
            <input type="number" inputMode="decimal" value={e.score ?? ""} onChange={ev => patch(e.id, { score: ev.target.value })} placeholder="নম্বর" style={{ ...inp, width: 80, padding: "6px 8px" }} />
            <span style={{ color: "#475569" }}>/</span>
            <input type="number" inputMode="decimal" value={e.total ?? ""} onChange={ev => patch(e.id, { total: ev.target.value })} placeholder="মোট" style={{ ...inp, width: 80, padding: "6px 8px" }} />
            {e.score !== undefined && e.score !== "" && +e.total > 0 && (
              <b style={{ fontSize: 13, color: +e.score / +e.total >= 0.7 ? "#34D399" : +e.score / +e.total >= 0.5 ? "#F59E0B" : "#F87171" }}>{bn(Math.round((+e.score / +e.total) * 100))}%</b>
            )}
          </div>
        )}

        {/* বাকি টপিক */}
        {s.remaining.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <span onClick={() => setOpen(o => ({ ...o, [e.id]: !o[e.id] }))} style={{ fontSize: 11.5, fontWeight: 700, color: "#38BDF8", cursor: "pointer" }}>
              {isOpen ? "▲ বাকি টপিক লুকান" : `▼ বাকি ${bn(s.remaining.length)}টা টপিক দেখুন`}
            </span>
            {isOpen && (
              <div style={{ marginTop: 6 }}>
                {s.remaining.map(t => (
                  <div key={t.id} onClick={() => toggleTopic(c.id, t.id)} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 2px", borderTop: "1px solid #1E293B", cursor: "pointer" }}>
                    <div style={{ width: 17, height: 17, borderRadius: 5, border: "2px solid #334155", flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 12.5, color: "#E2E8F0", lineHeight: 1.4 }}>
                      <span style={{ fontSize: 10, color: "#64748B" }}>{t.s} · </span>{t.t}
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 10, color: "#475569", marginTop: 6 }}>টিক দিলে Courses ট্যাবেও টিক পড়ে যাবে।</div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button onClick={() => startEdit(e)} style={btn(false)}>✏️ বদলান</button>
          <div style={{ flex: 1 }} />
          <button onClick={() => remove(e)} style={btn(false, "#EF4444")}>🗑</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => (adding ? (setAdding(false), setForm(emptyForm)) : startAdd())} style={{ ...btn(true), padding: "9px 16px" }}>{adding ? "✕ বন্ধ" : "+ পরীক্ষা যোগ"}</button>
        <span style={{ fontSize: 10.5, color: user ? "#64748B" : "#F59E0B" }}>{user ? status : "📴 শুধু এই device-এ"}</span>
      </div>

      {adding && (
        <div style={{ ...card, borderColor: "#38BDF855" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#38BDF8", marginBottom: 8 }}>{form.id ? "পরীক্ষা বদলান" : "নতুন পরীক্ষা"}</div>
          <select value={form.courseId} onChange={e => { const c = courses.find(x => x.id === e.target.value); setForm(f => ({ ...f, courseId: e.target.value, syllabus: c ? c.topics.map(t => t.id) : [] })); }} style={{ ...inp, marginBottom: 8 }}>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
          </select>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
            {EXAM_TYPES.map(t => <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={btn(form.type === t)}>{t}</button>)}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} />
            <input value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} placeholder="সময় (ঐচ্ছিক) 10:00 AM" style={inp} />
          </div>

          <div style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", margin: "10px 0 6px", display: "flex", justifyContent: "space-between" }}>
            <span>সিলেবাস ({bn(form.syllabus.length)}/{bn(formCourse.topics.length)} টপিক)</span>
            <span>
              <span onClick={() => setForm(f => ({ ...f, syllabus: formCourse.topics.map(t => t.id) }))} style={{ color: "#38BDF8", cursor: "pointer", marginRight: 12 }}>সব</span>
              <span onClick={() => setForm(f => ({ ...f, syllabus: [] }))} style={{ color: "#64748B", cursor: "pointer" }}>কিছুই না</span>
            </span>
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid #1E293B", borderRadius: 10, padding: "4px 10px", marginBottom: 8 }}>
            {Object.entries(sections).map(([sec, ts]) => (
              <div key={sec} style={{ marginBottom: 6 }}>
                <div onClick={() => toggleSec(ts)} style={{ fontSize: 11, fontWeight: 800, color: formCourse.color || "#38BDF8", padding: "6px 0 3px", cursor: "pointer" }}>◉ {sec}</div>
                {ts.map(t => (
                  <div key={t.id} onClick={() => toggleSyl(t.id)} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 0", cursor: "pointer" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${form.syllabus.includes(t.id) ? "#38BDF8" : "#334155"}`, background: form.syllabus.includes(t.id) ? "#38BDF8" : "transparent", color: "#082033", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{form.syllabus.includes(t.id) ? "✓" : ""}</div>
                    <div style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.4 }}>{t.t}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2} placeholder="নোট (ঐচ্ছিক) — কোন রুম, কী আনতে হবে…" style={{ ...inp, marginBottom: 8 }} />
          <button onClick={save} disabled={!form.syllabus.length} style={{ ...btn(true, "#34D399"), padding: "10px 20px", opacity: form.syllabus.length ? 1 : 0.4 }}>Save</button>
        </div>
      )}

      {up.length === 0 && !adding && (
        <div style={{ textAlign: "center", color: "#334155", fontSize: 12.5, padding: "30px 0", lineHeight: 1.7 }}>
          আসন্ন কোনো পরীক্ষা নেই।<br /><b>+ পরীক্ষা যোগ</b> চেপে CT, মিড বা ফাইনালের তারিখ আর সিলেবাস দিন।
        </div>
      )}
      {up.map(e => <ExamCard key={e.id} e={e} />)}

      {ps.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div onClick={() => setShowPast(s => !s)} style={{ fontSize: 11.5, fontWeight: 700, color: "#64748B", cursor: "pointer", marginBottom: 8 }}>
            {showPast ? "▲" : "▼"} শেষ হওয়া পরীক্ষা ({bn(ps.length)})
          </div>
          {showPast && ps.map(e => <ExamCard key={e.id} e={e} isPast />)}
        </div>
      )}
    </div>
  );
}
