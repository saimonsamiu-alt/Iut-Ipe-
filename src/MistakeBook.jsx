import { useState, useEffect, useRef } from "react";
import { currentUser, downloadPdf } from "./cloud.js";
import { BOOK_KEY, loadLS, saveLS, getAllPdfs, putPdf, touchLocal, pushLocal, syncEverything, uploadFile, removeFile } from "./store.js";

const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const bn = n => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);
const isBook = r => String(r.occ || "").startsWith("book:");
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ছবি ছোট করি (ফোনের ছবি ৫MB+ হয়, cloud-এ তোলার জন্য ~৩০০KB যথেষ্ট) */
async function compress(file, max = 1600, q = 0.8) {
  try {
    const bmp = await createImageBitmap(file);
    const r = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(res => c.toBlob(res, "image/jpeg", q));
    return blob || file;
  } catch { return file; }
}

function Thumb({ rec, onOpen }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let u, dead = false;
    (async () => {
      let blob = rec.blob;
      if (!blob && rec.path) {
        try { const b = await downloadPdf(rec.path); blob = new Blob([b], { type: "image/jpeg" }); await putPdf({ ...rec, blob }); } catch {}
      }
      if (blob && !dead) { u = URL.createObjectURL(blob); setUrl(u); }
    })();
    return () => { dead = true; if (u) URL.revokeObjectURL(u); };
  }, [rec.id, rec.blob]);
  return url
    ? <img src={url} alt="" onClick={() => onOpen(url)} style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "1px solid #334155", cursor: "pointer" }} />
    : <div style={{ width: 84, height: 84, borderRadius: 8, background: "#1E293B", color: "#475569", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>☁️</div>;
}

export default function MistakeBook({ courses = [] }) {
  const [entries, setEntries] = useState(() => loadLS(BOOK_KEY, []));
  const [files, setFiles] = useState([]);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("");
  const [fType, setFType] = useState("all");
  const [fState, setFState] = useState("open");
  const [fCourse, setFCourse] = useState("all");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ type: "doubt", courseId: courses[0] ? courses[0].id : "", topic: "", text: "" });
  const [pics, setPics] = useState([]);
  const [review, setReview] = useState(null);   // { id, show }
  const [big, setBig] = useState(null);
  const pushTimer = useRef(null);
  const addFileRef = useRef(null);
  const [addTarget, setAddTarget] = useState(null);

  const today = fmtDate(new Date());
  const course = id => courses.find(c => c.id === id) || {};
  const fileById = id => files.find(f => f.id === id);

  /* mount: ছবি লোড + cloud sync */
  useEffect(() => {
    (async () => {
      try { setFiles((await getAllPdfs()).filter(isBook)); } catch {}
      const u = await currentUser().catch(() => null);
      if (!u) return;
      setUser(u);
      try {
        setStatus("🔄 Sync হচ্ছে…");
        const r = await syncEverything(u);
        setEntries(loadLS(BOOK_KEY, []));
        setFiles(r.pdfs.filter(isBook));
        setStatus("✅ Synced");
      } catch { setStatus("⚠️ Sync হয়নি (net/login check করুন)"); }
    })();
  }, []);

  const commit = list => {
    setEntries(list); saveLS(BOOK_KEY, list); touchLocal();
    if (!user) return;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      pushLocal(user).then(() => setStatus("☁️ Saved")).catch(() => setStatus("⚠️ Cloud save হয়নি — পরে Sync হবে"));
    }, 1200);
  };
  const patch = (id, ch) => commit(entries.map(e => e.id === id ? { ...e, ...ch } : e));

  /* ছবি যোগ (নতুন বা পুরনো entry-তে) */
  const makeRecs = async (entryId, courseId, fileList, startN = 0) => {
    const recs = [];
    let n = startN;
    for (const f of fileList) {
      const blob = await compress(f), rid = `img-${entryId}-${n++}-${uid()}`;
      const rec = { id: rid, occ: `book:${entryId}`, ds: today, subjKey: courseId, name: `${rid}.jpg`, size: blob.size, blob };
      await putPdf(rec);
      if (user) { try { await uploadFile(user, rec); } catch { setStatus("⚠️ ছবি cloud-এ যায়নি, পরে Sync হবে"); } }
      recs.push(rec);
    }
    setFiles(p => [...p, ...recs]);
    return recs;
  };

  const addEntry = async () => {
    if (!form.text.trim() && !pics.length) return;
    const id = uid();
    const recs = await makeRecs(id, form.courseId, pics);
    const e = {
      id, type: form.type, courseId: form.courseId, topic: form.topic, text: form.text.trim(), answer: "",
      imgIds: recs.map(r => r.id), date: today, resolved: false, star: false, seen: 0, streak: 0, lastSeen: "",
    };
    commit([e, ...entries]);
    setForm(f => ({ ...f, topic: "", text: "" })); setPics([]); setAdding(false);
    setFState("open");
  };

  const addPicsTo = async (entry, fileList) => {
    const recs = await makeRecs(entry.id, entry.courseId, fileList, (entry.imgIds || []).length);
    patch(entry.id, { imgIds: [...(entry.imgIds || []), ...recs.map(r => r.id)] });
  };

  const removeEntry = async e => {
    if (!window.confirm("এই entry মুছে ফেলবেন?")) return;
    for (const id of e.imgIds || []) { const rec = fileById(id); if (rec) await removeFile(user, rec); }
    setFiles(p => p.filter(f => !(e.imgIds || []).includes(f.id)));
    commit(entries.filter(x => x.id !== e.id));
  };
  const removePic = async (e, id) => {
    const rec = fileById(id); if (rec) await removeFile(user, rec);
    setFiles(p => p.filter(f => f.id !== id));
    patch(e.id, { imgIds: (e.imgIds || []).filter(x => x !== id) });
  };

  /* ── filter ── */
  const list = entries
    .filter(e => fType === "all" || e.type === fType)
    .filter(e => fState === "all" || (fState === "open" ? !e.resolved : e.resolved))
    .filter(e => fCourse === "all" || e.courseId === fCourse)
    .filter(e => !q.trim() || `${e.text} ${e.answer} ${e.topic}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0) || b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const openDoubts = entries.filter(e => e.type === "doubt" && !e.resolved).length;
  const openMistakes = entries.filter(e => e.type === "mistake" && !e.resolved).length;
  const weekAgo = fmtDate(new Date(Date.now() - 7 * 864e5));
  const solvedWeek = entries.filter(e => e.resolved && (e.resolvedAt || "") >= weekAgo).length;

  /* ── র‍্যান্ডম রিভিশন ── */
  const reviewPool = entries.filter(e => e.answer.trim() || (e.imgIds || []).length);
  const pickNext = (skipId) => {
    const pool = reviewPool.filter(e => e.id !== skipId);
    const src = pool.length ? pool : reviewPool;
    if (!src.length) return null;
    const sorted = [...src].sort((a, b) => (a.streak - b.streak) || (a.lastSeen || "").localeCompare(b.lastSeen || ""));
    return sorted[0].id;
  };
  const startReview = () => { const id = pickNext(null); if (id) setReview({ id, show: false }); };
  const answerReview = known => {
    const e = entries.find(x => x.id === review.id); if (!e) return setReview(null);
    const upd = entries.map(x => x.id === e.id ? { ...x, seen: (x.seen || 0) + 1, streak: known ? (x.streak || 0) + 1 : 0, lastSeen: today } : x);
    commit(upd);
    const pool = upd.filter(x => (x.answer.trim() || (x.imgIds || []).length) && x.id !== e.id);
    const sorted = [...pool].sort((a, b) => (a.streak - b.streak) || (a.lastSeen || "").localeCompare(b.lastSeen || ""));
    setReview(sorted.length ? { id: sorted[0].id, show: false } : null);
  };

  /* ── style ── */
  const card = { background: "#0F172A", border: "1px solid #1E293B", borderRadius: 14, padding: "13px 14px", marginBottom: 10 };
  const inp = { width: "100%", padding: "9px 12px", background: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#E2E8F0", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
  const btn = (on, c = "#38BDF8") => ({ padding: "6px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", border: `1px solid ${on ? c : "#1E293B"}`, borderRadius: 8, background: on ? c + "22" : "#0F172A", color: on ? c : "#64748B" });

  const Card = ({ e }) => {
    const [ans, setAns] = useState(e.answer || "");
    const [editAns, setEditAns] = useState(false);
    const c = course(e.courseId), isD = e.type === "doubt", tc = isD ? "#38BDF8" : "#F87171";
    return (
      <div style={{ ...card, borderLeft: `3px solid ${c.color || "#475569"}`, opacity: e.resolved ? 0.9 : 1 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: tc, background: tc + "22", padding: "2px 8px", borderRadius: 6 }}>{isD ? "❓ Doubt" : "❌ ভুল"}</span>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: c.color || "#94A3B8", background: (c.color || "#94A3B8") + "22", padding: "2px 8px", borderRadius: 6 }}>{c.code || "—"}</span>
          <span style={{ fontSize: 10, color: "#475569" }}>{e.date}</span>
          {e.resolved && <span style={{ fontSize: 10, fontWeight: 800, color: "#34D399" }}>✅ সমাধান</span>}
          <div style={{ flex: 1 }} />
          <span onClick={() => patch(e.id, { star: !e.star })} style={{ cursor: "pointer", fontSize: 16, filter: e.star ? "none" : "grayscale(1) opacity(.45)" }}>⭐</span>
        </div>
        {e.topic && <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>📌 {e.topic}</div>}
        {e.text && <div style={{ fontSize: 14, color: "#E2E8F0", lineHeight: 1.55, whiteSpace: "pre-wrap", marginBottom: 8 }}>{e.text}</div>}

        {(e.imgIds || []).length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {e.imgIds.map(id => { const rec = fileById(id); return rec ? (
              <div key={id} style={{ position: "relative" }}>
                <Thumb rec={rec} onOpen={setBig} />
                <span onClick={() => window.confirm("ছবিটা মুছবেন?") && removePic(e, id)} style={{ position: "absolute", top: 2, right: 4, fontSize: 11, cursor: "pointer", background: "#000A", borderRadius: 8, padding: "0 4px" }}>✕</span>
              </div>) : null; })}
          </div>
        )}

        {(e.answer || editAns) ? (
          <div style={{ background: "#052E1633", border: "1px solid #34D39944", borderRadius: 10, padding: "8px 10px", marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#34D399", marginBottom: 4 }}>💡 সমাধান / সঠিক উত্তর</div>
            {editAns ? (
              <div>
                <textarea value={ans} onChange={ev => setAns(ev.target.value)} rows={3} placeholder="সঠিক উত্তর বা ব্যাখ্যা লিখুন…" style={{ ...inp, marginBottom: 6 }} />
                <button onClick={() => { patch(e.id, { answer: ans.trim() }); setEditAns(false); }} style={btn(true, "#34D399")}>Save</button>
              </div>
            ) : (
              <div onClick={() => setEditAns(true)} style={{ fontSize: 13, color: "#D1FAE5", lineHeight: 1.55, whiteSpace: "pre-wrap", cursor: "pointer" }}>{e.answer}</div>
            )}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {!e.answer && !editAns && <button onClick={() => setEditAns(true)} style={btn(false, "#34D399")}>💡 সমাধান লিখুন</button>}
          <button onClick={() => { setAddTarget(e); addFileRef.current && addFileRef.current.click(); }} style={btn(false)}>📷 ছবি</button>
          {!e.resolved
            ? <button onClick={() => patch(e.id, { resolved: true, resolvedAt: today })} style={btn(true, "#34D399")}>✓ সমাধান হয়েছে</button>
            : <button onClick={() => patch(e.id, { resolved: false, resolvedAt: "" })} style={btn(false, "#F59E0B")}>↩ আবার খুলুন</button>}
          <div style={{ flex: 1 }} />
          <button onClick={() => removeEntry(e)} style={btn(false, "#EF4444")}>🗑</button>
        </div>
      </div>
    );
  };

  const topics = (courses.find(c => c.id === form.courseId) || {}).topics || [];
  const revEntry = review && entries.find(e => e.id === review.id);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 14px" }}>
      {/* সারসংক্ষেপ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
        {[[openDoubts, "খোলা Doubt", "#38BDF8"], [openMistakes, "খোলা ভুল", "#F87171"], [solvedWeek, "এই সপ্তাহে সমাধান", "#34D399"]].map(([v, l, c]) => (
          <div key={l} style={{ background: "#0F172A", border: `1px solid ${c}33`, borderRadius: 12, padding: "10px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: c }}>{bn(v)}</div>
            <div style={{ fontSize: 9.5, color: "#64748B", marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => setAdding(a => !a)} style={{ ...btn(true), padding: "9px 16px" }}>{adding ? "✕ বন্ধ" : "+ নতুন যোগ"}</button>
        <button onClick={startReview} disabled={!reviewPool.length} style={{ ...btn(false, "#A78BFA"), padding: "9px 14px", opacity: reviewPool.length ? 1 : 0.4 }}>🎲 র‍্যান্ডম রিভিশন</button>
        <span style={{ fontSize: 10.5, color: user ? "#64748B" : "#F59E0B" }}>{user ? status : "📴 শুধু এই device-এ"}</span>
      </div>

      {/* নতুন entry */}
      {adding && (
        <div style={{ ...card, borderColor: "#38BDF855" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <button onClick={() => setForm(f => ({ ...f, type: "doubt" }))} style={btn(form.type === "doubt")}>❓ Doubt (বুঝিনি)</button>
            <button onClick={() => setForm(f => ({ ...f, type: "mistake" }))} style={btn(form.type === "mistake", "#F87171")}>❌ ভুল (করেছি)</button>
          </div>
          <select value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value, topic: "" }))} style={{ ...inp, marginBottom: 8 }}>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
          </select>
          <select value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} style={{ ...inp, marginBottom: 8 }}>
            <option value="">— টপিক বাছুন (ঐচ্ছিক) —</option>
            {topics.map(t => <option key={t.id} value={t.t}>{t.s}: {t.t}</option>)}
          </select>
          <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} rows={4}
            placeholder={form.type === "doubt" ? "কী বুঝতে পারছেন না? প্রশ্নটা লিখুন…" : "কোন প্রশ্নে কী ভুল করেছেন? কেন ভুল হলো?"} style={{ ...inp, marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ ...btn(false), display: "inline-block" }}>
              📷 ছবি ({bn(pics.length)})
              <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => { setPics(p => [...p, ...e.target.files]); e.target.value = ""; }} />
            </label>
            {pics.length > 0 && <span onClick={() => setPics([])} style={{ fontSize: 11, color: "#64748B", cursor: "pointer" }}>ছবি মুছুন</span>}
            <div style={{ flex: 1 }} />
            <button onClick={addEntry} style={{ ...btn(true, "#34D399"), padding: "9px 18px" }}>Save</button>
          </div>
        </div>
      )}

      {/* filter */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
        {[["all", "সব"], ["doubt", "❓ Doubt"], ["mistake", "❌ ভুল"]].map(([k, l]) => <button key={k} onClick={() => setFType(k)} style={btn(fType === k)}>{l}</button>)}
        <span style={{ width: 8 }} />
        {[["open", "খোলা"], ["done", "সমাধান"], ["all", "সব"]].map(([k, l]) => <button key={k} onClick={() => setFState(k)} style={btn(fState === k, "#34D399")}>{l}</button>)}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <select value={fCourse} onChange={e => setFCourse(e.target.value)} style={{ ...inp, width: "40%" }}>
          <option value="all">সব কোর্স</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 খুঁজুন…" style={inp} />
      </div>

      {list.length === 0
        ? <div style={{ textAlign: "center", color: "#334155", fontSize: 12.5, padding: "30px 0", lineHeight: 1.7 }}>
            {entries.length === 0 ? <>এখনো কিছু নেই।<br />ক্লাসে বা পড়তে গিয়ে কিছু না বুঝলে <b>+ নতুন যোগ</b> চেপে লিখে রাখুন।</> : "এই ফিল্টারে কিছু নেই।"}
          </div>
        : list.map(e => <Card key={e.id} e={e} />)}

      <input ref={addFileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={ev => { const fl = [...ev.target.files]; ev.target.value = ""; if (addTarget && fl.length) addPicsTo(addTarget, fl); setAddTarget(null); }} />

      {/* বড় ছবি */}
      {big && (
        <div onClick={() => setBig(null)} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#000D", display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
          <img src={big} alt="" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }} />
        </div>
      )}

      {/* র‍্যান্ডম রিভিশন */}
      {review && revEntry && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#080D18", overflowY: "auto", padding: "18px 14px" }}>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
              <button onClick={() => setReview(null)} style={btn(true)}>← বন্ধ</button>
              <div style={{ flex: 1, textAlign: "center", fontSize: 12, color: "#A78BFA", fontWeight: 800 }}>🎲 র‍্যান্ডম রিভিশন</div>
              <div style={{ width: 60 }} />
            </div>
            <div style={card}>
              <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 6 }}>
                <b style={{ color: course(revEntry.courseId).color }}>{course(revEntry.courseId).code}</b>{revEntry.topic ? ` · ${revEntry.topic}` : ""} · মনে ছিল পরপর {bn(revEntry.streak || 0)} বার
              </div>
              {revEntry.text && <div style={{ fontSize: 15, color: "#E2E8F0", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 10 }}>{revEntry.text}</div>}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(revEntry.imgIds || []).map(id => { const rec = fileById(id); return rec ? <Thumb key={id} rec={rec} onOpen={setBig} /> : null; })}
              </div>
            </div>
            {!review.show
              ? <button onClick={() => setReview(r => ({ ...r, show: true }))} style={{ ...btn(true, "#A78BFA"), width: "100%", padding: 13, fontSize: 13 }}>আগে নিজে ভাবুন, তারপর উত্তর দেখুন</button>
              : <div>
                  <div style={{ ...card, background: "#052E1633", borderColor: "#34D39955" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#34D399", marginBottom: 4 }}>💡 সমাধান</div>
                    <div style={{ fontSize: 14, color: "#D1FAE5", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{revEntry.answer || "(শুধু ছবিতে আছে)"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => answerReview(true)} style={{ ...btn(true, "#34D399"), flex: 1, padding: 13 }}>✅ মনে ছিল</button>
                    <button onClick={() => answerReview(false)} style={{ ...btn(true, "#F59E0B"), flex: 1, padding: 13 }}>🔁 আবার দেখব</button>
                  </div>
                </div>}
          </div>
        </div>
      )}
    </div>
  );
}
