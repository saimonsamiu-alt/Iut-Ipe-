import { useState, useEffect } from "react";
import { AI_KEY, SCHED_KEY, META_KEY, BOOK_KEY, EXAM_KEY, loadLS, saveLS, getAllPdfs, putPdf, uploadFile, removeFile, touchLocal, schedulePush } from "./store.js";
import { currentUser, aiIngest, aiNotes, aiPlan } from "./cloud.js";
import { examStats, upcoming, EXAM_TYPES } from "./exams.js";
import { occOnDate, revisionItems } from "./revision.js";

/* ── ছোট helper ── */
const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (ds, n) => { const d = new Date(ds + "T00:00:00"); d.setDate(d.getDate() + n); return fmtDate(d); };
const bn = n => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const DAYS_BN = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি"];   // JS getDay() ক্রমে
const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];                                      // শনি থেকে শুরু
const JS_DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const KINDS = [["pyq", "আগের বছরের প্রশ্ন"], ["slide", "টিচারের স্লাইড"], ["outline", "কোর্স আউটলাইন/তথ্য"], ["note", "আমার নোট"]];
const kindLabel = k => (KINDS.find(x => x[0] === k) || [0, "ফাইল"])[1];
const TYPE_COLOR = { study: "#38BDF8", revision: "#A78BFA", practice: "#34D399", pyq: "#F59E0B", rest: "#64748B" };

export default function AIPlanner({ courses = [], done = {} }) {
  const [ai, setAi] = useState(() => loadLS(AI_KEY, {}));
  const [pdfs, setPdfs] = useState([]);
  const [notes, setNotes] = useState({});        // pdfId → AI-র পড়া সারাংশ
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");          // চলমান কাজের লেখা
  const [libCourse, setLibCourse] = useState(courses[0] ? courses[0].id : "");
  const [libKind, setLibKind] = useState("pyq");
  const [tu, setTu] = useState({ day: 6, time: "", label: "" });

  const today = fmtDate(new Date());
  const code = id => (courses.find(c => c.id === id) || {}).code || id;

  const save = next => { setAi(next); saveLS(AI_KEY, next); touchLocal(); schedulePush(); };

  useEffect(() => {
    getAllPdfs().then(setPdfs).catch(() => {});
    currentUser().then(u => {
      setUser(u);
      if (u) aiNotes().then(setNotes).catch(() => {});
    }).catch(() => {});
  }, []);

  /* ── ১) ব্যাচ আপলোড (কোর্স লাইব্রেরি) ── */
  const libFiles = pdfs.filter(p => String(p.occ || "").startsWith("LIB|"));
  const recentClass = pdfs.filter(p => !String(p.occ || "").startsWith("LIB|") && p.ds >= addDays(today, -7));
  const fileKind = p => String(p.occ).split("|")[2];

  const uploadBatch = async fileList => {
    const files = [...fileList].filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!files.length) { setMsg("শুধু PDF নেওয়া হয়। অন্য ফাইল PDF করে দিন।"); return; }
    if (!user) { setMsg("আগে ক্লাউড (Google Sheet) কানেক্ট করুন — না হলে AI ফাইল পড়তে পারবে না।"); return; }
    const added = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setBusy(`আপলোড ${bn(i + 1)}/${bn(files.length)}: ${f.name}`);
      if (f.size > 14 * 1048576) { setMsg("⚠️ " + f.name + " অনেক বড় (>১৪MB), বাদ দিলাম।"); continue; }
      const rec = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, occ: `LIB|${libCourse}|${libKind}`, ds: today, subjKey: libCourse, name: f.name, size: f.size, blob: f };
      try { await putPdf(rec); await uploadFile(user, rec); added.push(rec); }
      catch { setMsg("⚠️ " + f.name + " ক্লাউডে যায়নি (নেট/Script URL দেখুন)।"); }
    }
    setBusy("");
    if (added.length) { setPdfs(p => [...p, ...added]); setMsg(`✅ ${bn(added.length)}টা ফাইল জমা হয়েছে। এবার "AI-কে পড়াও" চাপুন।`); }
  };

  const ingestOne = async p => {
    setBusy("AI পড়ছে: " + p.name);
    try { const n = await aiIngest(p.id); setNotes(m => ({ ...m, [p.id]: n })); setMsg(""); }
    catch (e) { setMsg("⚠️ " + p.name + ": " + e.message); }
    setBusy("");
  };
  const ingestAll = async () => {
    const todo = [...libFiles, ...recentClass].filter(p => !notes[p.id] && p.path);
    if (!todo.length) { setMsg("সব ফাইল আগেই পড়া হয়ে গেছে।"); return; }
    for (let i = 0; i < todo.length; i++) {
      setBusy(`AI পড়ছে ${bn(i + 1)}/${bn(todo.length)}: ${todo[i].name}`);
      try { const n = await aiIngest(todo[i].id); setNotes(m => ({ ...m, [todo[i].id]: n })); }
      catch (e) { setMsg("⚠️ " + todo[i].name + ": " + e.message); }
    }
    setBusy("");
  };
  const removeLib = async p => {
    if (!window.confirm(`"${p.name}" মুছে ফেলবেন?`)) return;
    await removeFile(user, p);
    setPdfs(l => l.filter(x => x.id !== p.id));
  };

  /* AI যে পরীক্ষার তারিখ খুঁজে পেয়েছে সেটা পরীক্ষা-ট্যাবে তুলি */
  const addExam = (p, info) => {
    const exams = loadLS(EXAM_KEY, []);
    const type = EXAM_TYPES.includes(info.type) ? info.type : "অন্যান্য";
    if (exams.some(e => e.courseId === p.subjKey && e.type === type && e.date === info.date)) { setMsg("এই পরীক্ষা আগেই আছে।"); return; }
    saveLS(EXAM_KEY, [{ id: uid(), courseId: p.subjKey, type, date: info.date, time: "", note: info.note || "", syllabus: [] }, ...exams]);
    touchLocal(); schedulePush();
    setMsg(`✅ ${code(p.subjKey)} ${type} (${info.date}) পরীক্ষা-ট্যাবে যোগ হয়েছে।`);
  };

  /* ── টিচার/পরীক্ষার তথ্য, টিউশন রুটিন, দৈনিক নোট ── */
  const setTeacher = (cid, field, val) => save({ ...ai, teachers: { ...(ai.teachers || {}), [cid]: { ...((ai.teachers || {})[cid] || {}), [field]: val } } });
  const addTuition = () => {
    if (!tu.time.trim() || !tu.label.trim()) { setMsg("টিউশনের সময় ও নাম দুটোই দিন (যেমন 5:00–6:30 PM)।"); return; }
    save({ ...ai, tuition: [...(ai.tuition || []), { id: uid(), day: +tu.day, time: tu.time.trim(), label: tu.label.trim() }] });
    setTu({ ...tu, time: "", label: "" }); setMsg("");
  };
  const delTuition = id => save({ ...ai, tuition: (ai.tuition || []).filter(t => t.id !== id) });
  const setDaily = text => save({ ...ai, daily: { ...(ai.daily || {}), [today]: text } });

  /* ── ৪) AI-র জন্য পুরো প্রেক্ষাপট জোড়া ── */
  const buildContext = () => {
    const now = new Date(), tomorrow = addDays(today, 1);
    const sched = loadLS(SCHED_KEY, []), meta = loadLS(META_KEY, {});
    const tuiOn = ds => (ai.tuition || []).filter(t => t.day === new Date(ds + "T00:00:00").getDay()).map(t => ({ time: t.time, what: t.label }));
    const classOn = ds => occOnDate(sched, meta, ds, []).map(o => ({ time: o.time, subject: o.subject }));
    const exams = upcoming(loadLS(EXAM_KEY, []), today).map(ex => ({ ex, st: examStats(ex, courses, done, today) })).filter(x => x.st.daysLeft <= 60);
    const rev = revisionItems(sched, meta, today, []).due.slice(0, 8).map(r => ({ class: r.subject, classDate: r.ds, revisionRound: r.stage + 1, daysLate: r.late }));
    const old = ai.plan && ai.plan.date === today ? ai.plan : null;
    const prev = ai.plan && ai.plan.date !== today ? ai.plan : null;
    const hasExam = new Set(exams.map(x => x.ex.courseId));
    const fileNotes = [...libFiles, ...recentClass].filter(p => notes[p.id]).slice(0, 15).map(p => {
      const n = notes[p.id];
      return { course: code(p.subjKey), kind: String(p.occ).startsWith("LIB|") ? kindLabel(fileKind(p)) : "ক্লাসের ফাইল (" + p.ds + ")", teacher: n.teacher || null, topics: (n.topics || []).slice(0, 12), frequentQuestions: (n.frequent_questions || []).slice(0, 8), summary: String(n.summary || "").slice(0, 400) };
    });
    return {
      today, weekday: JS_DAY[now.getDay()], nowTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      classesToday: classOn(today), classesTomorrow: classOn(tomorrow), tuitionToday: tuiOn(today), tuitionTomorrow: tuiOn(tomorrow),
      exams: exams.map(({ ex, st }) => ({ course: code(ex.courseId), type: ex.type, date: ex.date, time: ex.time || null, daysLeft: st.daysLeft, note: ex.note || null, topicsTotal: st.total, topicsDone: st.doneCount, remainingTopics: st.remaining.slice(0, 25).map(t => t.t), neededPerDay: Math.round(st.pace * 10) / 10 })),
      courses: courses.map(c => {
        const rest = (c.topics || []).filter(t => !done[`${c.id}__${t.id}`]);
        const tt = (ai.teachers || {})[c.id] || {};
        return { code: c.code, title: c.title, teacher: tt.name || null, teacherOrExamInfo: tt.info || null, remainingTopicsCount: rest.length, nextTopics: hasExam.has(c.id) ? [] : rest.slice(0, 5).map(t => t.t) };
      }),
      revisionDue: rev, openMistakes: loadLS(BOOK_KEY, []).filter(e => !e.resolved).length,
      fileNotes, userNote: ai.notes || null,
      dailyNoteToday: (ai.daily || {})[today] || null, dailyNoteYesterday: (ai.daily || {})[addDays(today, -1)] || null,
      yesterday: (ai.history || {})[addDays(today, -1)] || null,
      carryOverFromLastPlan: prev ? prev.tasks.filter(t => !t.done).map(t => t.title) : [],
      alreadyDoneToday: old ? old.tasks.filter(t => t.done).map(t => t.title) : [],
    };
  };

  const record = (history, tasks) => {
    const h = { ...(history || {}), [today]: { planned: tasks.length, done: tasks.filter(t => t.done).length } };
    const cut = addDays(today, -60);
    Object.keys(h).forEach(k => { if (k < cut) delete h[k]; });
    return h;
  };

  const generate = async () => {
    if (!user) { setMsg("ক্লাউড কানেক্ট করুন (Classes ট্যাবে Script URL + secret)।"); return; }
    setBusy("AI আজকের প্ল্যান বানাচ্ছে… (২০–৪০ সেকেন্ড লাগতে পারে)"); setMsg("");
    try {
      const r = await aiPlan(buildContext());
      const kept = ai.plan && ai.plan.date === today ? ai.plan.tasks.filter(t => t.done) : [];
      const fresh = (r.tasks || []).map((t, i) => ({ id: uid() + i, start: t.start || "", end: t.end || "", course: t.course || "", title: t.title || "", why: t.why || "", type: t.type || "study", done: false }));
      const tasks = [...kept, ...fresh];
      save({ ...ai, plan: { date: today, at: Date.now(), summary: r.summary || "", suggestions: r.suggestions || [], warnings: r.warnings || [], tasks }, history: record(ai.history, tasks) });
    } catch (e) { setMsg("⚠️ প্ল্যান হয়নি: " + e.message); }
    setBusy("");
  };

  /* ── ৫) টার্গেট টিক ও প্রগ্রেস ── */
  const plan = ai.plan && ai.plan.date === today ? ai.plan : null;
  const toggleTask = id => {
    const tasks = plan.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    save({ ...ai, plan: { ...plan, tasks }, history: record(ai.history, tasks) });
  };
  const planned = plan ? plan.tasks.length : 0, doneN = plan ? plan.tasks.filter(t => t.done).length : 0;
  const pct = planned ? Math.round((doneN / planned) * 100) : 0;
  const week = Array.from({ length: 7 }, (_, i) => { const ds = addDays(today, i - 6), h = (ai.history || {})[ds]; return { ds, pct: h && h.planned ? Math.round((h.done / h.planned) * 100) : null }; });
  const examRows = upcoming(loadLS(EXAM_KEY, []), today).map(ex => ({ ex, st: examStats(ex, courses, done, today) })).slice(0, 4);
  const lvlColor = { ok: "#34D399", push: "#F59E0B", hard: "#F87171", late: "#F87171" };

  /* ── styles ── */
  const card = { background: "#0F172A", border: "1px solid #1E293B", borderRadius: 14, padding: "14px 15px", marginBottom: 12 };
  const h = { fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: "#64748B", marginBottom: 10 };
  const inp = { width: "100%", padding: "8px 10px", fontSize: 13, background: "#0B1120", color: "#E2E8F0", border: "1px solid #1E293B", borderRadius: 8, boxSizing: "border-box" };
  const btn = (c = "#38BDF8", solid) => ({ padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${c}`, borderRadius: 8, background: solid ? c : c + "22", color: solid ? "#080D18" : c });
  const sub = { fontSize: 11, color: "#64748B" };

  const FileRow = ({ p, lib }) => {
    const n = notes[p.id];
    return (
      <div style={{ borderTop: "1px solid #1E293B", padding: "8px 0" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "#E2E8F0", flex: 1, minWidth: 140 }}>📄 {p.name}</span>
          <span style={{ ...sub }}>{code(p.subjKey)} · {lib ? kindLabel(fileKind(p)) : "ক্লাস " + p.ds}</span>
          {n ? <span style={{ fontSize: 11, color: "#34D399" }}>✓ AI পড়েছে</span>
            : <button style={btn("#A78BFA")} disabled={!!busy || !p.path} onClick={() => ingestOne(p)}>{p.path ? "AI-কে পড়াও" : "আপলোড বাকি"}</button>}
          {lib && <button style={{ ...btn("#F87171"), padding: "4px 8px" }} onClick={() => removeLib(p)}>✕</button>}
        </div>
        {n && (
          <div style={{ ...sub, marginTop: 5, lineHeight: 1.6 }}>
            {n.teacher && <div>👤 {n.teacher}</div>}
            {n.topics && n.topics.length > 0 && <div>টপিক: {n.topics.slice(0, 8).join(", ")}</div>}
            {n.summary && <div>{n.summary}</div>}
            {(n.exam_info || []).filter(x => courses.some(c => c.id === p.subjKey) && x && /^\d{4}-\d{2}-\d{2}$/.test(x.date || "")).map((x, i) => (
              <div key={i} style={{ marginTop: 4 }}>
                🎯 {x.type} — {x.date} {x.note ? "(" + x.note + ")" : ""}{" "}
                <button style={{ ...btn("#F59E0B"), padding: "2px 8px", fontSize: 11 }} onClick={() => addExam(p, x)}>পরীক্ষায় যোগ করো</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {(busy || msg) && (
        <div style={{ ...card, borderColor: busy ? "#A78BFA" : "#334155", fontSize: 12, color: "#E2E8F0" }}>
          {busy ? "⏳ " + busy : msg}
        </div>
      )}

      {/* আজকের প্ল্যান */}
      <div style={card}>
        <div style={h}>🤖 আজকের AI প্ল্যান</div>
        <button style={btn("#38BDF8", true)} disabled={!!busy} onClick={generate}>{plan ? "🔄 নতুন করে বানাও" : "✨ আজকের প্ল্যান বানাও"}</button>
        {plan && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, color: "#E2E8F0", lineHeight: 1.6, marginBottom: 8 }}>{plan.summary}</div>
            <div style={{ display: "flex", justifyContent: "space-between", ...sub }}><span>আজকের টার্গেট</span><span>{bn(doneN)}/{bn(planned)} · {bn(pct)}%</span></div>
            <div style={{ height: 8, background: "#1E293B", borderRadius: 6, overflow: "hidden", margin: "4px 0 10px" }}><div style={{ width: pct + "%", height: "100%", background: "#34D399" }} /></div>
            {plan.tasks.map(t => (
              <label key={t.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderTop: "1px solid #1E293B", cursor: "pointer", opacity: t.done ? 0.55 : 1 }}>
                <input type="checkbox" checked={!!t.done} onChange={() => toggleTask(t.id)} style={{ marginTop: 4 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#E2E8F0", textDecoration: t.done ? "line-through" : "none" }}>{t.title}</div>
                  <div style={sub}>
                    <span style={{ color: TYPE_COLOR[t.type] || "#38BDF8", fontWeight: 700 }}>{t.start && t.end ? `${t.start}–${t.end}` : ""}</span>
                    {t.course ? " · " + t.course : ""}{t.why ? " — " + t.why : ""}
                  </div>
                </div>
              </label>
            ))}
            {plan.warnings.length > 0 && <div style={{ marginTop: 10, fontSize: 12, color: "#F87171", lineHeight: 1.7 }}>{plan.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}</div>}
            {plan.suggestions.length > 0 && <div style={{ marginTop: 8, fontSize: 12, color: "#94A3B8", lineHeight: 1.7 }}>{plan.suggestions.map((w, i) => <div key={i}>💡 {w}</div>)}</div>}
          </div>
        )}
      </div>

      {/* প্রগ্রেস */}
      <div style={card}>
        <div style={h}>📈 গত ৭ দিনের টার্গেট পূরণ</div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 70 }}>
          {week.map(d => (
            <div key={d.ds} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 50, display: "flex", alignItems: "flex-end" }}>
                <div style={{ width: "100%", height: d.pct === null ? 3 : Math.max(3, d.pct * 0.5), background: d.pct === null ? "#1E293B" : d.pct >= 80 ? "#34D399" : d.pct >= 50 ? "#F59E0B" : "#F87171", borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 10, color: "#64748B" }}>{DAYS_BN[new Date(d.ds + "T00:00:00").getDay()]}</div>
            </div>
          ))}
        </div>
        {examRows.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {examRows.map(({ ex, st }) => (
              <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", color: "#CBD5E1" }}>
                <span>{code(ex.courseId)} {ex.type} — {bn(st.daysLeft)} দিন বাকি</span>
                <span style={{ color: lvlColor[st.level] }}>সিলেবাস {bn(st.pct)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* দৈনিক নোট */}
      <div style={card}>
        <div style={h}>📝 আজকের ক্লাসে কী হলো / কী বললেন</div>
        <textarea style={{ ...inp, minHeight: 70 }} placeholder="যেমন: Calculus স্যার বললেন CT ৫ ডিসেম্বর, চ্যাপ্টার ১–৩…" value={(ai.daily || {})[today] || ""} onChange={e => setDaily(e.target.value)} />
        <div style={{ ...sub, marginTop: 4 }}>আজকের স্লাইড/নোট PDF দিতে "Classes" ট্যাবে ঐ ক্লাসের নিচে আপলোড করুন — এখানে সেটা AI-কে পড়ানো যাবে।</div>
      </div>

      {/* ব্যাচ আপলোড */}
      <div style={card}>
        <div style={h}>📚 কোর্স লাইব্রেরি (একসাথে অনেক ফাইল)</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <select style={{ ...inp, flex: 1, minWidth: 130 }} value={libCourse} onChange={e => setLibCourse(e.target.value)}>{courses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}</select>
          <select style={{ ...inp, flex: 1, minWidth: 130 }} value={libKind} onChange={e => setLibKind(e.target.value)}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </div>
        <input type="file" accept="application/pdf,.pdf" multiple disabled={!!busy} onChange={e => { uploadBatch(e.target.files); e.target.value = ""; }} style={{ fontSize: 12, color: "#94A3B8" }} />
        <div style={{ marginTop: 10 }}><button style={btn("#A78BFA")} disabled={!!busy} onClick={ingestAll}>🧠 নতুন সব ফাইল AI-কে পড়াও</button></div>
        {libFiles.length === 0 && recentClass.length === 0 && <div style={{ ...sub, marginTop: 8 }}>এখনো কোনো ফাইল নেই।</div>}
        <div style={{ marginTop: 6 }}>
          {libFiles.map(p => <FileRow key={p.id} p={p} lib />)}
          {recentClass.length > 0 && <div style={{ ...sub, marginTop: 10 }}>গত ৭ দিনের ক্লাসের ফাইল</div>}
          {recentClass.map(p => <FileRow key={p.id} p={p} />)}
        </div>
      </div>

      {/* টিচার ও পরীক্ষার তথ্য */}
      <div style={card}>
        <div style={h}>👤 কোর্স-ভিত্তিক টিচার ও পরীক্ষার তথ্য</div>
        {courses.map(c => {
          const t = (ai.teachers || {})[c.id] || {};
          return (
            <details key={c.id} style={{ borderTop: "1px solid #1E293B", padding: "6px 0" }}>
              <summary style={{ fontSize: 13, color: "#E2E8F0", cursor: "pointer" }}>{c.code}{t.name ? " — " + t.name : ""}</summary>
              <input style={{ ...inp, margin: "8px 0 6px" }} placeholder="টিচারের নাম" value={t.name || ""} onChange={e => setTeacher(c.id, "name", e.target.value)} />
              <textarea style={{ ...inp, minHeight: 60 }} placeholder="কোর্স আউটলেটে/স্যার যা বলেছেন: কবে CT/মিড, কোন চ্যাপ্টার, মার্কস ভাগ…" value={t.info || ""} onChange={e => setTeacher(c.id, "info", e.target.value)} />
            </details>
          );
        })}
        <textarea style={{ ...inp, minHeight: 60, marginTop: 10 }} placeholder="সাধারণ নির্দেশ AI-কে (যেমন: সকালে কঠিন বিষয়, রাত ১১টার পর পড়া নয়)" value={ai.notes || ""} onChange={e => save({ ...ai, notes: e.target.value })} />
      </div>

      {/* টিউশন রুটিন */}
      <div style={card}>
        <div style={h}>🕒 টিউশন রুটিন</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <select style={{ ...inp, width: 110 }} value={tu.day} onChange={e => setTu({ ...tu, day: e.target.value })}>{DAY_ORDER.map(d => <option key={d} value={d}>{DAYS_BN[d]}</option>)}</select>
          <input style={{ ...inp, width: 150 }} placeholder="5:00–6:30 PM" value={tu.time} onChange={e => setTu({ ...tu, time: e.target.value })} />
          <input style={{ ...inp, flex: 1, minWidth: 120 }} placeholder="Physics — ছাত্রের নাম" value={tu.label} onChange={e => setTu({ ...tu, label: e.target.value })} />
          <button style={btn("#34D399", true)} onClick={addTuition}>যোগ</button>
        </div>
        {(ai.tuition || []).slice().sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)).map(t => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderTop: "1px solid #1E293B", color: "#CBD5E1" }}>
            <span>{DAYS_BN[t.day]} · {t.time} · {t.label}</span>
            <span style={{ cursor: "pointer", color: "#F87171" }} onClick={() => delTuition(t.id)}>✕</span>
          </div>
        ))}
        <div style={{ ...sub, marginTop: 6 }}>ক্লাস রুটিন আগের মতোই "Classes" ট্যাব থেকে আপলোড হবে; AI দুটোই দেখে ফাঁকা সময় বের করবে।</div>
      </div>
    </div>
  );
}
