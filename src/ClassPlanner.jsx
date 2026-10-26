import { useState, useEffect, useRef } from "react";
import { hasConfigUrl, getCfg, setCfg, currentUser, connect as cloudConnect, signOut,
         uploadPdf, downloadPdf, deleteRemotePdf } from "./cloud.js";
import { SCHED_KEY, META_KEY, TS_KEY, PEND_KEY, loadLS, saveLS, getAllPdfs, putPdf, delPdf,
         touchLocal, pushLocal, syncEverything } from "./store.js";

/* ─── storage helpers: store.js-এ ─── */
export { SCHED_KEY, META_KEY, getAllPdfs } from "./store.js";

/* ─── date / time helpers ───────────────────── */
const JS_DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const D3 = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayStr = () => fmtDate(new Date());
const toDate = ds => new Date(ds + "T00:00:00");
const addDays = (ds, n) => { const d = toDate(ds); d.setDate(d.getDate() + n); return fmtDate(d); };
const niceDate = ds => toDate(ds).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export const sortKey = (t = "") => {
  const ms = [...t.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/gi)];
  if (!ms.length) return 0;
  const conv = (m, ap) => { let h = +m[1] % 12; if (ap && ap.toUpperCase() === "PM") h += 12; return h * 60 + (+m[2] || 0); };
  const last = ms[ms.length - 1], first = ms[0];
  const endAp = last[3];
  let s = conv(first, first[3] || endAp);
  if (!first[3] && ms.length > 1 && s > conv(last, endAp)) s -= 720;
  return s;
};

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const parseDayOrDate = v => {
  const x = (v || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return { date: x, day: null };
  const d = D3[x.slice(0, 3).toLowerCase()];
  return d === undefined ? null : { date: null, day: d };
};
const splitCSV = line => {
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { out.push(cur.trim()); cur = ""; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
};

const SAMPLE_CSV = `day_or_date,time,subject,instruction
Monday,8:00-9:15 AM,Chem 4115,Lab report ana lagbe
Monday,10:30 AM-1:00 PM,ME 4151,
Tuesday,9:15-10:30 AM,Phy 4113,Calculator niye ashbe
2026-11-12,2:30-3:45 PM,Math 4111,Class test - Ch 3
`;

/* ─── component ─────────────────────────────── */
export default function ClassPlanner({ courses = [], routine = {}, initialView = "daily", initialDate }) {
  const [sched, setSched] = useState(() => loadLS(SCHED_KEY, []));
  const [meta, setMeta] = useState(() => loadLS(META_KEY, {}));
  const [pdfs, setPdfs] = useState([]);
  const [view, setView] = useState(initialView || "daily");
  const [date, setDate] = useState(initialDate || todayStr());
  const [monthOff, setMonthOff] = useState(0);
  const [revMode, setRevMode] = useState("date");
  const [revRange, setRevRange] = useState(30);
  const [onlyNotes, setOnlyNotes] = useState(true);
  const [viewer, setViewer] = useState(null);
  const [msg, setMsg] = useState("");
  const [paste, setPaste] = useState("");
  const [form, setForm] = useState({ when: "Monday", time: "", subject: "", instruction: "" });
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [cfg, setCfgState] = useState(() => getCfg());
  const pushTimer = useRef(null);

  useEffect(() => { getAllPdfs().then(setPdfs).catch(() => setMsg("PDF storage চালু করা যায়নি (private mode?)")); }, []);

  /* ── cloud sync ── */
  const touch = () => {
    touchLocal();
    if (!user) return;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      try { await pushLocal(user); setSyncMsg("☁️ Saved"); }
      catch { setSyncMsg("⚠️ Cloud save হয়নি — net এলে Sync চাপুন"); }
    }, 1200);
  };
  const saveSched = s => { setSched(s); saveLS(SCHED_KEY, s); touch(); };
  const saveMeta = m => { setMeta(m); saveLS(META_KEY, m); touch(); };

  const syncAll = async u => {
    u = u || user; if (!u) return;
    setBusy(true); setSyncMsg("🔄 Sync হচ্ছে…");
    try {
      const r = await syncEverything(u);
      if (r.pulled) { setSched(loadLS(SCHED_KEY, [])); setMeta(loadLS(META_KEY, {})); }
      setPdfs(r.pdfs);
      setSyncMsg("✅ Synced " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) { setSyncMsg("⚠️ Sync হয়নি: " + (e.message || "net/login check করুন")); }
    setBusy(false);
  };

  useEffect(() => {
    currentUser().then(u => { if (u) { setUser(u); syncAll(u); } }).catch(() => {});
    const on = () => currentUser().then(u => { if (u) { setUser(u); syncAll(u); } }).catch(() => {});
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
    // eslint-disable-next-line
  }, []);

  const connect = async () => {
    setCfg({ url: (cfg.url || "").trim(), secret: (cfg.secret || "").trim() });
    try {
      setSyncMsg("🔌 Connect হচ্ছে…");
      const u = await cloudConnect();
      setUser(u);
      await syncAll(u);
    } catch (e) { setSyncMsg("❌ " + (e.message || "Connect হয়নি")); }
  };
  const logout = async () => { await signOut(); setUser(null); setCfgState(getCfg()); setSyncMsg("Disconnect হয়েছে (local data আছে)"); };

  /* subject → course colour/label */
  const matchCourse = subject => {
    const s = slug(subject);
    const c = courses.find(c => s.includes(slug(c.code)));
    return c ? { key: c.id, label: c.code, color: c.color } : { key: "x-" + s, label: subject, color: "#94A3B8" };
  };
  const colorOf = key => (courses.find(c => c.id === key) || {}).color || "#94A3B8";

  /* all classes on a date */
  const occOn = ds => {
    const w = toDate(ds).getDay();
    return sched
      .filter(e => (e.date ? e.date === ds : e.day === w))
      .map(e => {
        const occ = `${ds}|${e.subjKey}|${e.time}`;
        const m = meta[occ] || {};
        return {
          occ, ds, time: e.time, subject: e.subject, subjKey: e.subjKey,
          instruction: m.instruction !== undefined ? m.instruction : (e.instruction || ""),
          revised: !!m.revised,
          pdfs: pdfs.filter(p => p.occ === occ),
        };
      })
      .sort((a, b) => sortKey(a.time) - sortKey(b.time));
  };

  /* ── routine import ── */
  const addEntries = (rows, replace) => {
    const entries = rows.map((r, i) => {
      const w = parseDayOrDate(r.when);
      if (!w || !r.subject) return null;
      const c = matchCourse(r.subject);
      return { id: Date.now() + i + Math.random(), ...w, time: r.time || "", subject: c.label, subjKey: c.key, instruction: r.instruction || "" };
    }).filter(Boolean);
    if (!entries.length) { setMsg("কোনো valid row পাওয়া যায়নি। day/date আর subject লাগবে।"); return; }
    saveSched(replace ? entries : [...sched, ...entries]);
    setMsg(`✅ ${entries.length}টা class ${replace ? "set" : "add"} হয়েছে।`);
  };
  const parseText = (text, name = "") => {
    const t = text.trim();
    if (name.endsWith(".json") || t.startsWith("[")) {
      try {
        const arr = JSON.parse(t);
        return arr.map(o => ({ when: o.date || o.day || o.when, time: o.time, subject: o.subject, instruction: o.instruction }));
      } catch { setMsg("JSON পড়া গেল না।"); return []; }
    }
    const lines = t.split(/\r?\n/).filter(l => l.trim());
    if (lines.length && /day|date/i.test(lines[0]) && /subject/i.test(lines[0])) lines.shift();
    return lines.map(l => { const [when, time, subject, instruction] = splitCSV(l); return { when, time, subject, instruction }; });
  };
  const onRoutineFile = async e => {
    const f = e.target.files[0]; if (!f) return;
    addEntries(parseText(await f.text(), f.name.toLowerCase()), true);
    e.target.value = "";
  };
  const importNov = () => {
    const rows = [];
    Object.entries(routine.nov || {}).forEach(([dayName, tasks]) => {
      tasks.forEach(t => {
        const m = t.task.match(/^Class(?:\/Lab)?:\s*(.+)$/);
        if (m) rows.push({ when: dayName, time: t.t, subject: m[1].trim(), instruction: "" });
      });
    });
    addEntries(rows, true);
  };
  const downloadSample = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: "text/csv" }));
    a.download = "routine-sample.csv"; a.click();
  };

  /* ── per-class actions ── */
  const saveInstr = (o, text) => saveMeta({ ...meta, [o.occ]: { ...(meta[o.occ] || {}), instruction: text } });
  const toggleRevised = o => saveMeta({ ...meta, [o.occ]: { ...(meta[o.occ] || {}), revised: !o.revised } });
  const upload = async (o, files) => {
    const added = [];
    for (const f of files) {
      if (user && f.size > 15 * 1048576) setMsg("⚠️ " + f.name + " অনেক বড় (>15MB) — cloud upload ব্যর্থ হতে পারে।");
      if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) continue;
      const rec = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, occ: o.occ, ds: o.ds, subjKey: o.subjKey, name: f.name, size: f.size, blob: f };
      try { await putPdf(rec); added.push(rec); } catch { setMsg("PDF save হয়নি।"); }
    }
    if (user) {
      for (const rec of added) {
        try { rec.path = await uploadPdf(user, rec); await putPdf(rec); }
        catch { setMsg("⚠️ Cloud-এ upload হয়নি, net এলে Sync চাপুন।"); }
      }
    }
    if (added.length) setPdfs(p => [...p, ...added]);
  };
  const removePdf = async p => {
    if (!window.confirm(`"${p.name}" মুছে ফেলবেন?`)) return;
    await delPdf(p.id); setPdfs(list => list.filter(x => x.id !== p.id));
    if (p.path) {
      try { if (!user) throw 0; await deleteRemotePdf(p.path, p.id); }
      catch { saveLS(PEND_KEY, [...loadLS(PEND_KEY, []), { id: p.id, path: p.path }]); }
    }
  };
  const openPdf = async p => {
    let blob = p.blob;
    if (!blob) {
      try {
        setMsg("⬇️ Cloud থেকে PDF আনছি…");
        blob = await downloadPdf(p.path);
        const rec = { ...p, blob }; await putPdf(rec);
        setPdfs(l => l.map(x => x.id === p.id ? rec : x)); setMsg("");
      } catch { setMsg("PDF আনা যায়নি — net/login check করুন।"); return; }
    }
    setViewer({ url: URL.createObjectURL(blob), name: p.name });
  };
  const closeViewer = () => { if (viewer) URL.revokeObjectURL(viewer.url); setViewer(null); };

  const goDaily = ds => { setDate(ds); setView("daily"); };

  /* ── derived: month grid ── */
  const ref = new Date(); ref.setDate(1); ref.setMonth(ref.getMonth() + monthOff);
  const yr = ref.getFullYear(), mo = ref.getMonth();
  const dim = new Date(yr, mo + 1, 0).getDate();
  const monthDays = Array.from({ length: dim }, (_, i) => {
    const ds = fmtDate(new Date(yr, mo, i + 1));
    const occs = occOn(ds);
    return { d: i + 1, ds, occs, hasInstr: occs.some(o => o.instruction.trim()), hasPdf: occs.some(o => o.pdfs.length) };
  });
  const lead = new Date(yr, mo, 1).getDay();

  /* ── derived: revision ── */
  const pastDates = Array.from({ length: revRange }, (_, i) => addDays(todayStr(), -i));
  const revOccs = pastDates.flatMap(occOn).filter(o => !onlyNotes || o.pdfs.length || o.instruction.trim());
  const bySubject = {};
  revOccs.forEach(o => { (bySubject[o.subjKey] = bySubject[o.subjKey] || { label: o.subject, items: [] }).items.push(o); });

  /* ── styles ── */
  const card = { background: "#0F172A", border: "1px solid #1E293B", borderRadius: 12, padding: "12px 14px" };
  const btn = (on, c = "#38BDF8") => ({ padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", border: `1px solid ${on ? c : "#1E293B"}`, borderRadius: 7, background: on ? c + "22" : "#0F172A", color: on ? c : "#64748B" });
  const inp = { width: "100%", padding: "9px 12px", background: "#1E293B", border: "1px solid #334155", borderRadius: 7, color: "#E2E8F0", fontSize: 13, outline: "none", boxSizing: "border-box" };

  /* ── class card ── */
  const ClassCard = ({ o, showDate }) => {
    const [draft, setDraft] = useState(o.instruction);
    const fileRef = useRef(null);
    const color = colorOf(o.subjKey);
    const has = o.instruction.trim().length > 0;
    useEffect(() => setDraft(o.instruction), [o.instruction]);
    return (
      <div style={{ ...card, borderLeft: `3px solid ${color}`, background: has ? "#1C1304" : "#0F172A", borderColor: has ? "#F59E0B" : "#1E293B", borderLeftColor: color }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color, background: color + "22", padding: "2px 8px", borderRadius: 5 }}>{o.subject}</span>
          {showDate && <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 700 }}>{niceDate(o.ds)}</span>}
          <span style={{ fontSize: 11, color: "#38BDF8" }}>{o.time}</span>
          {has && <span style={{ fontSize: 10, fontWeight: 800, color: "#F59E0B" }}>⚠️ INSTRUCTION</span>}
          <div style={{ flex: 1 }} />
          {o.ds <= todayStr() && (
            <div onClick={() => toggleRevised(o)} style={{ cursor: "pointer", fontSize: 11, color: o.revised ? "#34D399" : "#64748B", fontWeight: 600 }}>
              {o.revised ? "✅ Revised" : "☐ Revise"}
            </div>
          )}
        </div>

        {has && <div style={{ fontSize: 14, fontWeight: 900, color: "#FCD34D", marginBottom: 8, lineHeight: 1.45 }}>📌 {o.instruction}</div>}

        <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={1}
          placeholder="Instruction (কী আনতে হবে / করতে হবে)…"
          style={{ ...inp, fontSize: 12, resize: "vertical", marginBottom: 6 }} />
        {draft !== o.instruction && (
          <button onClick={() => saveInstr(o, draft)} style={{ ...btn(true, "#F59E0B"), marginBottom: 8 }}>Save instruction</button>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {o.pdfs.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#1E293B", borderRadius: 7, padding: "6px 10px" }}>
              <span onClick={() => openPdf(p)} style={{ flex: 1, cursor: "pointer", fontSize: 12, color: "#E2E8F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.blob ? "📄" : "☁️"} {p.name}</span>
              <span style={{ fontSize: 10, color: "#475569" }}>{(p.size / 1048576).toFixed(1)}MB</span>
              <span onClick={() => removePdf(p)} style={{ cursor: "pointer", color: "#475569" }}>🗑</span>
            </div>
          ))}
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" multiple style={{ display: "none" }}
            onChange={e => { upload(o, [...e.target.files]); e.target.value = ""; }} />
          <button onClick={() => fileRef.current.click()} style={{ ...btn(false), borderStyle: "dashed", color: "#38BDF8", textAlign: "center" }}>
            + Handnote PDF {o.pdfs.length ? "আরও " : ""}add করুন
          </button>
        </div>
      </div>
    );
  };

  /* ── render ── */
  return (
    <div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", marginBottom: 14 }}>
        {[["daily", "📅 Daily"], ["monthly", "🗓 Monthly"], ["revision", "🔁 Revision"], ["setup", "⬆️ Routine upload"]].map(([k, l]) =>
          <button key={k} onClick={() => setView(k)} style={btn(view === k)}>{l}</button>)}
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 11 }}>
        <span style={{ color: user ? "#34D399" : "#F59E0B", fontWeight: 700 }}>{user ? "☁️ Cloud connected" : "📴 শুধু এই device-এ"}</span>
        {user && <span onClick={() => !busy && syncAll()} style={{ ...btn(false), padding: "3px 10px" }}>{busy ? "…" : "🔄 Sync"}</span>}
        {syncMsg && <span style={{ color: "#64748B" }}>{syncMsg}</span>}
      </div>

      {msg && <div onClick={() => setMsg("")} style={{ ...card, marginBottom: 12, fontSize: 12, color: "#E2E8F0" }}>{msg}</div>}

      {sched.length === 0 && view !== "setup" && (
        <div style={{ ...card, textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
          এখনো কোনো routine নেই। <span onClick={() => setView("setup")} style={{ color: "#38BDF8", cursor: "pointer", fontWeight: 700 }}>Routine upload</span> করুন।
        </div>
      )}

      {/* DAILY */}
      {view === "daily" && sched.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <button onClick={() => setDate(addDays(date, -1))} style={btn(false)}>←</button>
            <input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} style={{ ...inp, flex: 1, textAlign: "center" }} />
            <button onClick={() => setDate(addDays(date, 1))} style={btn(false)}>→</button>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#E2E8F0", marginBottom: 10 }}>
            {JS_DAY[toDate(date).getDay()]} {date === todayStr() && <span style={{ color: "#34D399", fontSize: 11 }}>● আজ</span>}
          </div>
          {occOn(date).length === 0
            ? <div style={{ textAlign: "center", color: "#334155", fontSize: 12, padding: "28px 0" }}>এই দিনে কোনো class নেই।</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{occOn(date).map(o => <ClassCard key={o.occ} o={o} />)}</div>}
        </div>
      )}

      {/* MONTHLY */}
      {view === "monthly" && sched.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <button onClick={() => setMonthOff(o => o - 1)} style={btn(false)}>←</button>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#E2E8F0" }}>{ref.toLocaleDateString("en", { month: "long", year: "numeric" })}</div>
            <button onClick={() => setMonthOff(o => o + 1)} style={btn(false)}>→</button>
          </div>
          <div style={card}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 6 }}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <div key={d} style={{ textAlign: "center", fontSize: 9, color: "#334155", fontWeight: 700 }}>{d}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
              {Array.from({ length: lead }).map((_, i) => <div key={"e" + i} />)}
              {monthDays.map(c => (
                <div key={c.ds} onClick={() => goDaily(c.ds)}
                  style={{ aspectRatio: "1", borderRadius: 6, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                    background: c.hasInstr ? "#3A2504" : c.occs.length ? "#111827" : "transparent",
                    border: c.ds === todayStr() ? "2px solid #38BDF8" : c.hasInstr ? "1px solid #F59E0B" : "1px solid #1E293B" }}>
                  <span style={{ fontSize: c.hasInstr ? 12 : 10, fontWeight: c.hasInstr ? 900 : 400, color: c.hasInstr ? "#FCD34D" : c.occs.length ? "#E2E8F0" : "#334155" }}>{c.d}</span>
                  <span style={{ fontSize: 8, color: "#64748B" }}>{c.occs.length ? `${c.occs.length}c` : ""}{c.hasPdf ? " 📄" : ""}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "#475569", textAlign: "center", marginTop: 10 }}>
              <b style={{ color: "#FCD34D" }}>Bold/হলুদ</b> = instruction আছে · 📄 = handnote আছে · tap করলে সেই দিন খুলবে
            </div>
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#F59E0B", textTransform: "uppercase", margin: "16px 0 8px" }}>এই মাসের instruction গুলো</div>
          {monthDays.flatMap(c => c.occs.filter(o => o.instruction.trim())).length === 0
            ? <div style={{ fontSize: 12, color: "#334155" }}>কোনো instruction নেই।</div>
            : monthDays.flatMap(c => c.occs.filter(o => o.instruction.trim())).map(o => (
              <div key={o.occ} onClick={() => goDaily(o.ds)} style={{ ...card, marginBottom: 6, cursor: "pointer", borderColor: "#F59E0B66" }}>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{niceDate(o.ds)} · {o.time} · <b style={{ color: colorOf(o.subjKey) }}>{o.subject}</b></div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#FCD34D", marginTop: 3 }}>📌 {o.instruction}</div>
              </div>
            ))}
        </div>
      )}

      {/* REVISION */}
      {view === "revision" && sched.length > 0 && (
        <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 10 }}>
            <button onClick={() => setRevMode("date")} style={btn(revMode === "date", "#A78BFA")}>Date-wise</button>
            <button onClick={() => setRevMode("subject")} style={btn(revMode === "subject", "#A78BFA")}>Subject-wise</button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 14, alignItems: "center" }}>
            {[14, 30, 60, 120].map(n => <button key={n} onClick={() => setRevRange(n)} style={btn(revRange === n)}>{n} দিন</button>)}
            <button onClick={() => setOnlyNotes(v => !v)} style={btn(onlyNotes, "#34D399")}>{onlyNotes ? "✓ শুধু note/instruction আছে" : "সব class"}</button>
          </div>

          {revOccs.length === 0 && <div style={{ textAlign: "center", color: "#334155", fontSize: 12, padding: "28px 0" }}>Revision-এর মতো কিছু নেই।</div>}

          {revMode === "date" && pastDates.map(ds => {
            const list = revOccs.filter(o => o.ds === ds);
            if (!list.length) return null;
            return (
              <div key={ds} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#A78BFA", marginBottom: 6 }}>{niceDate(ds)}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{list.map(o => <ClassCard key={o.occ} o={o} />)}</div>
              </div>
            );
          })}

          {revMode === "subject" && Object.entries(bySubject).map(([k, g]) => (
            <div key={k} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: colorOf(k), marginBottom: 6 }}>
                {g.label} <span style={{ fontSize: 10, color: "#475569", fontWeight: 400 }}>
                  · {g.items.length} class · {g.items.reduce((s, o) => s + o.pdfs.length, 0)} PDF · {g.items.filter(o => o.revised).length} revised
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{g.items.map(o => <ClassCard key={o.occ} o={o} showDate />)}</div>
            </div>
          ))}
        </div>
      )}

      {/* SETUP */}
      {view === "setup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ ...card, borderColor: user ? "#34D39955" : "#1E293B" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#34D399", marginBottom: 8 }}>☁️ Cloud sync — Google Sheet (device বদলালেও data থাকবে)</div>
            {user ? (
              <div>
                <div style={{ fontSize: 12, color: "#CBD5E1", marginBottom: 8 }}>Connected: <b>{user.email}</b></div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => syncAll()} disabled={busy} style={btn(true, "#34D399")}>{busy ? "Sync…" : "🔄 Sync now"}</button>
                  <button onClick={logout} style={btn(false, "#EF4444")}>Disconnect</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {!hasConfigUrl() && (
                  <input value={cfg.url || ""} onChange={e => setCfgState(c => ({ ...c, url: e.target.value }))}
                    placeholder="Google Script Web app URL (https://script.google.com/…/exec)" style={inp} />
                )}
                <input type="password" value={cfg.secret || ""} onChange={e => setCfgState(c => ({ ...c, secret: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && connect()} placeholder="Secret (Code.gs এ যেটা দিয়েছেন)" style={inp} />
                <button onClick={connect} style={btn(true, "#34D399")}>Connect & Sync</button>
                <div style={{ fontSize: 10, color: "#64748B", lineHeight: 1.5 }}>একবার connect করলে এই device-এ মনে থাকবে। নতুন device-এ শুধু secret দিলেই সব চলে আসবে।</div>
              </div>
            )}
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#38BDF8", marginBottom: 8 }}>1) Routine file upload (CSV / JSON)</div>
            <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.6, marginBottom: 8 }}>
              Column: <b>day_or_date, time, subject, instruction</b>. day হলে (Monday…) প্রতি সপ্তাহে repeat হবে, date হলে (2026-11-12) শুধু সেই দিন।
              Upload করলে আগের routine replace হবে।
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <label style={{ ...btn(true), display: "inline-block" }}>
                ⬆️ File বাছুন
                <input type="file" accept=".csv,.json,.txt" onChange={onRoutineFile} style={{ display: "none" }} />
              </label>
              <button onClick={downloadSample} style={btn(false)}>Sample CSV</button>
              <button onClick={importNov} style={btn(false, "#34D399")}>November routine থেকে নিন</button>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#38BDF8", marginBottom: 8 }}>2) Text paste করুন</div>
            <textarea value={paste} onChange={e => setPaste(e.target.value)} rows={5} placeholder={SAMPLE_CSV} style={{ ...inp, fontFamily: "monospace", fontSize: 11 }} />
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button onClick={() => { addEntries(parseText(paste), true); setPaste(""); }} style={btn(true)}>Replace করে import</button>
              <button onClick={() => { addEntries(parseText(paste), false); setPaste(""); }} style={btn(false)}>Existing-এর সাথে add</button>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#38BDF8", marginBottom: 8 }}>3) একটা class হাতে add করুন</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <input value={form.when} onChange={e => setForm(f => ({ ...f, when: e.target.value }))} placeholder="Monday বা 2026-11-12" style={inp} />
              <input value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} placeholder="8:00-9:15 AM" style={inp} />
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Subject (Chem 4115)" style={inp} />
              <input value={form.instruction} onChange={e => setForm(f => ({ ...f, instruction: e.target.value }))} placeholder="Instruction (optional)" style={inp} />
            </div>
            <button onClick={() => { addEntries([form], false); setForm(f => ({ ...f, subject: "", instruction: "" })); }} style={btn(true)}>+ Add</button>
          </div>

          {sched.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#E2E8F0", marginBottom: 8 }}>বর্তমান routine ({sched.length}টা class)</div>
              <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {[...sched].sort((a, b) => (a.date ? 7 : a.day) - (b.date ? 7 : b.day) || sortKey(a.time) - sortKey(b.time)).map(e => (
                  <div key={e.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "#CBD5E1" }}>
                    <span style={{ width: 70, color: "#64748B" }}>{e.date || JS_DAY[e.day].slice(0, 3)}</span>
                    <span style={{ width: 110, color: "#38BDF8" }}>{e.time}</span>
                    <span style={{ flex: 1, fontWeight: 700, color: colorOf(e.subjKey) }}>{e.subject}</span>
                    <span onClick={() => saveSched(sched.filter(x => x.id !== e.id))} style={{ cursor: "pointer", color: "#475569" }}>✕</span>
                  </div>
                ))}
              </div>
              <button onClick={() => window.confirm("পুরো routine মুছবেন? (PDF গুলো থাকবে)") && saveSched([])} style={{ ...btn(false, "#EF4444"), marginTop: 10 }}>Routine clear</button>
            </div>
          )}
        </div>
      )}

      {/* PDF VIEWER */}
      {viewer && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#080D18", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid #1E293B" }}>
            <button onClick={closeViewer} style={btn(true)}>← Back</button>
            <div style={{ flex: 1, fontSize: 12, color: "#E2E8F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{viewer.name}</div>
            <a href={viewer.url} target="_blank" rel="noopener noreferrer" style={{ ...btn(false), textDecoration: "none" }}>নতুন tab ↗</a>
          </div>
          <iframe title={viewer.name} src={viewer.url} style={{ flex: 1, border: "none", background: "#fff" }} />
        </div>
      )}
    </div>
  );
}
