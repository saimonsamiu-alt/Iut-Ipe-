import { useState, useEffect } from "react";

/* ══════════════════════════════════════════════════
   🔐  শুধু এই দুইটা লাইন বদলান — আপনার login info
   ══════════════════════════════════════════════════ */
const YOUR_NAME     = "samiu";    // ← আপনার নাম (যেকোনো কিছু)
const YOUR_PASSWORD = "iut2025";  // ← আপনার password
/* ══════════════════════════════════════════════════ */

const AUTH_KEY      = "iut-auth-v1";
const STORAGE_KEY   = "iut-ipe-11-progress";
const loadDone      = () => { try { const v = localStorage.getItem(STORAGE_KEY); return v ? JSON.parse(v) : {}; } catch { return {}; } };
const saveDone      = (d) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} };

/* ─── DATA ─────────────────────────────────────── */
const COURSES = [
  {
    id:"math4111", code:"Math 4111", title:"Modeling with Calculus & ODE",
    credits:3, type:"Theory", color:"#34D399",
    resources:[
      {name:"Calculus 1 — Prof. Leonard", url:"https://www.youtube.com/playlist?list=PLF797E961509B4EB5"},
      {name:"Differential Equations — Prof. Leonard", url:"https://www.youtube.com/playlist?list=PLdlPA9pGVVtZ8iw2poXVCKM5oyysCCRQK"},
    ],
    topics:[
      {id:"c1", section:"Calculus", title:"Lines, Angles & Distance Formula"},
      {id:"c2", section:"Calculus", title:"Introduction to Functions & Graphs"},
      {id:"c3", section:"Calculus", title:"Trigonometry Review"},
      {id:"c4", section:"Calculus", title:"Limits — Introduction & Properties"},
      {id:"c5", section:"Calculus", title:"Continuity & Squeeze Theorem"},
      {id:"c6", section:"Calculus", title:"Derivatives — Definition & Basic Rules"},
      {id:"c7", section:"Calculus", title:"Chain Rule & Implicit Differentiation"},
      {id:"c8", section:"Calculus", title:"Applications of Derivatives"},
      {id:"c9", section:"Calculus", title:"Integration — Definite & Indefinite"},
      {id:"c10",section:"Calculus", title:"Integration Techniques (Substitution, By Parts)"},
      {id:"c11",section:"Calculus", title:"Applications of Integration"},
      {id:"o1", section:"ODE ⚠️ শেষে করুন", title:"Introduction to ODE & Initial Value Problems"},
      {id:"o2", section:"ODE ⚠️ শেষে করুন", title:"Time Rate of Change Problems"},
      {id:"o3", section:"ODE ⚠️ শেষে করুন", title:"Separable Differential Equations"},
      {id:"o4", section:"ODE ⚠️ শেষে করুন", title:"First Order Linear ODE"},
      {id:"o5", section:"ODE ⚠️ শেষে করুন", title:"Growth, Decay & Mixing Applications"},
      {id:"o6", section:"ODE ⚠️ শেষে করুন", title:"Slope Fields & Direction Fields"},
      {id:"o7", section:"ODE ⚠️ শেষে করুন", title:"Second Order Linear ODE"},
      {id:"o8", section:"ODE ⚠️ শেষে করুন", title:"Applications of 2nd Order ODE"},
    ],
  },
  {
    id:"me4151", code:"ME 4151", title:"Statics and Dynamics",
    credits:3, type:"Theory", color:"#FBBF24",
    resources:[
      {name:"Online Statics Course — Jeff Hanson", url:"https://www.youtube.com/playlist?list=PLRqDfxcafc23LXGoItpkYMKtUdHaQwSDC"},
      {name:"Online Dynamics Course — Jeff Hanson", url:"https://www.youtube.com/playlist?list=PLRqDfxcafc206fNQPkcBUFEMYje-UjtqA"},
    ],
    topics:[
      {id:"s1", section:"Statics", title:"Newton's Laws & Vector Introduction"},
      {id:"s2", section:"Statics", title:"Vector Language & Triangle Rule"},
      {id:"s3", section:"Statics", title:"Cartesian Notation & Components"},
      {id:"s4", section:"Statics", title:"Equilibrium of Particles (2D)"},
      {id:"s5", section:"Statics", title:"Equilibrium of Particles (3D)"},
      {id:"s6", section:"Statics", title:"Moments & Couples"},
      {id:"s7", section:"Statics", title:"Equilibrium of Rigid Bodies"},
      {id:"s8", section:"Statics", title:"Structural Analysis — Trusses"},
      {id:"s9", section:"Statics", title:"Frames & Machines"},
      {id:"s10",section:"Statics", title:"Friction"},
      {id:"s11",section:"Statics", title:"Center of Gravity & Centroids"},
      {id:"s12",section:"Statics", title:"Moments of Inertia"},
      {id:"d1", section:"Dynamics ⚠️ Statics পরে", title:"Kinematics of Particles — Rectilinear"},
      {id:"d2", section:"Dynamics ⚠️ Statics পরে", title:"Kinematics of Particles — Curvilinear"},
      {id:"d3", section:"Dynamics ⚠️ Statics পরে", title:"Kinetics — Newton's 2nd Law"},
      {id:"d4", section:"Dynamics ⚠️ Statics পরে", title:"Work-Energy Method"},
      {id:"d5", section:"Dynamics ⚠️ Statics পরে", title:"Impulse & Momentum"},
      {id:"d6", section:"Dynamics ⚠️ Statics পরে", title:"Kinematics of Rigid Bodies"},
      {id:"d7", section:"Dynamics ⚠️ Statics পরে", title:"Kinetics of Rigid Bodies"},
    ],
  },
  {
    id:"me4110", code:"ME 4110", title:"Engineering Drawing",
    credits:1.5, type:"Practical", color:"#F87171",
    resources:[{name:"Engineering Graphics — Pradeep Giri Academy", url:"https://www.youtube.com/@pradeepgiriacademy/playlists"}],
    topics:[
      {id:"ed1", section:"Basics",      title:"Intro to Engineering Drawing & Instruments"},
      {id:"ed2", section:"Scales",      title:"Units, Plain Scale & Diagonal Scale"},
      {id:"ed3", section:"Scales",      title:"Vernier Scale"},
      {id:"ed4", section:"Curves",      title:"Engineering Curves (Cycloid, Ellipse, Parabola)"},
      {id:"ed5", section:"Projections", title:"Projection of Points & Lines"},
      {id:"ed6", section:"Projections", title:"Projection of Planes"},
      {id:"ed7", section:"Projections", title:"Projection of Solids"},
      {id:"ed8", section:"Views",       title:"Orthographic Projection (Multiview Drawing)"},
      {id:"ed9", section:"Views",       title:"Isometric Projection & Views"},
      {id:"ed10",section:"Sections",    title:"Sections of Solids"},
      {id:"ed11",section:"Development", title:"Development of Surfaces"},
      {id:"ed12",section:"Practice",    title:"Hands-on Board Drawing Practice"},
    ],
  },
  {
    id:"ipe4101", code:"IPE 4101", title:"Intro to Industrial & Production Engineering",
    credits:3, type:"Theory", color:"#60A5FA",
    resources:[{name:"IE & Operations Research — NPTEL IIT Guwahati", url:"https://www.youtube.com/playlist?list=PLwdnzlV3ogoX_AO-g9wEvUNu5cb_K-r45"}],
    topics:[
      {id:"i1", section:"Foundations", title:"Definition, History & Scope of IE"},
      {id:"i2", section:"Foundations", title:"Organizational Structure & Roles"},
      {id:"i3", section:"Plant",       title:"Plant Location & Plant Layout"},
      {id:"i4", section:"Production",  title:"Production Planning & Control"},
      {id:"i5", section:"Production",  title:"MRP, Routing & Scheduling"},
      {id:"i6", section:"Inventory",   title:"Inventory Management (Lean, JIT, MRP-II)"},
      {id:"i7", section:"Work Study",  title:"Work Study & Ergonomics"},
      {id:"i8", section:"Work Study",  title:"Time & Motion Study"},
      {id:"i9", section:"Quality",     title:"Total Quality Management (TQM)"},
      {id:"i10",section:"Quality",     title:"Statistical Quality Control & Six Sigma"},
      {id:"i11",section:"Planning",    title:"Forecasting Methods"},
      {id:"i12",section:"Planning",    title:"Project Management Basics"},
      {id:"i13",section:"Modern IE",   title:"Industry 4.0 & Smart Manufacturing"},
    ],
  },
  {
    id:"chem4115", code:"Chem 4115", title:"Physical and Inorganic Chemistry",
    credits:3, type:"Theory", color:"#A78BFA",
    resources:[{name:"Chemboost: Chemistry Classes (BSc)", url:"https://www.youtube.com/channel/UCXISx5Mbzp-uXm0UdUf-H3Q"}],
    topics:[
      {id:"ch1", section:"Atomic Structure", title:"De Broglie Waves & Uncertainty Principle"},
      {id:"ch2", section:"Atomic Structure", title:"Schrödinger Wave Equation & Wave Functions"},
      {id:"ch3", section:"Atomic Structure", title:"Quantum Numbers & Atomic Orbitals"},
      {id:"ch4", section:"Bonding",          title:"Chemical Bonding (Ionic, Covalent, Metallic)"},
      {id:"ch5", section:"Bonding",          title:"Molecular Orbital Theory (MOT)"},
      {id:"ch6", section:"Physical Chem",    title:"Gaseous State & Kinetic Theory"},
      {id:"ch7", section:"Physical Chem",    title:"Solid State & Crystal Structure"},
      {id:"ch8", section:"Physical Chem",    title:"Chemical Thermodynamics"},
      {id:"ch9", section:"Physical Chem",    title:"Chemical Kinetics & Reaction Rates"},
      {id:"ch10",section:"Physical Chem",    title:"Electrochemistry"},
      {id:"ch11",section:"Inorganic Chem",   title:"s-block Elements"},
      {id:"ch12",section:"Inorganic Chem",   title:"p-block Elements"},
    ],
  },
  {
    id:"phy4113", code:"Phy 4113", title:"Structure of Matter, Electricity, Magnetism & Modern Physics",
    credits:3, type:"Theory", color:"#F472B6",
    resources:[{name:"Physics Lectures — Walter Lewin (MIT)", url:"https://www.youtube.com/@lecturesbywalterlewin.they9259"}],
    topics:[
      {id:"p1", section:"Matter",        title:"Structure of Matter & Atomic Models"},
      {id:"p2", section:"Electricity",   title:"Electric Charge & Coulomb's Law"},
      {id:"p3", section:"Electricity",   title:"Electric Fields & Gauss's Law"},
      {id:"p4", section:"Electricity",   title:"Electric Potential & Capacitance"},
      {id:"p5", section:"Electricity",   title:"Current, Resistance & DC Circuits"},
      {id:"p6", section:"Magnetism",     title:"Magnetic Fields & Magnetic Forces"},
      {id:"p7", section:"Magnetism",     title:"Electromagnetic Induction & Faraday's Law"},
      {id:"p8", section:"Magnetism",     title:"Maxwell's Equations & EM Waves"},
      {id:"p9", section:"Modern Physics",title:"Photoelectric Effect & X-rays"},
      {id:"p10",section:"Modern Physics",title:"Quantum Mechanics Intro & Bohr Model"},
      {id:"p11",section:"Modern Physics",title:"Nuclear Physics & Radioactivity"},
    ],
  },
  {
    id:"hum4117", code:"Hum 4117", title:"Islamic Culture & Professional Ethics",
    credits:3, type:"Theory", color:"#2DD4BF",
    resources:[],
    topics:[
      {id:"h1",section:"Islamic Culture",title:"Introduction to Islamic Culture"},
      {id:"h2",section:"Islamic Culture",title:"Sources of Islamic Knowledge"},
      {id:"h3",section:"Islamic Culture",title:"Islamic Civilization & Contributions"},
      {id:"h4",section:"Islamic Culture",title:"Islamic Economics & Social System"},
      {id:"h5",section:"Ethics",         title:"Engineering Ethics — Foundations"},
      {id:"h6",section:"Ethics",         title:"Professional Responsibility & Code of Conduct"},
      {id:"h7",section:"Ethics",         title:"Ethics in Industrial & Production Engineering"},
    ],
  },
];

const STUDY_ORDER = [
  {step:1,courseId:"ipe4101",focus:"Full course, Lec 1–35",why:"সবচেয়ে easy — math নেই, concept-based। নিজের major বলে দ্রুত বুঝবেন।",tag:"Easy",tagColor:"#34D399",playlists:[{name:"NPTEL IE & OR (IIT Guwahati)",url:"https://www.youtube.com/playlist?list=PLwdnzlV3ogoX_AO-g9wEvUNu5cb_K-r45"}]},
  {step:2,courseId:"math4111",focus:"Calculus — Limits, Derivatives, Integration",why:"HSC base আছে তাই fast যাবে। এটা শেষ করলে ODE-এর foundation ready।",tag:"Medium",tagColor:"#FBBF24",playlists:[{name:"Calculus 1 Full (Prof. Leonard)",url:"https://www.youtube.com/playlist?list=PLF797E961509B4EB5"}]},
  {step:3,courseId:"me4151",focus:"Statics অংশ — Vectors থেকে Inertia পর্যন্ত",why:"Calculus-এর সাথে parallel-এ শুরু করুন। Vector concept ভালো রাখুন।",tag:"Medium",tagColor:"#FBBF24",playlists:[{name:"Online Statics Course (Jeff Hanson)",url:"https://www.youtube.com/playlist?list=PLRqDfxcafc23LXGoItpkYMKtUdHaQwSDC"}]},
  {step:4,courseId:"chem4115",focus:"Atomic Structure → Bonding → Physical → Inorganic",why:"Topic-by-topic section ধরে Chemboost channel-এ playlist খুঁজুন।",tag:"Medium",tagColor:"#FBBF24",playlists:[{name:"Chemboost: Chemistry Classes (BSc)",url:"https://www.youtube.com/channel/UCXISx5Mbzp-uXm0UdUf-H3Q"}]},
  {step:5,courseId:"me4110",focus:"Instruments → Scales → Curves → Projections",why:"Practical course। ভিডিও দেখার সাথে সাথে drawing board-এ practice করুন।",tag:"Medium (Practical)",tagColor:"#FBBF24",playlists:[{name:"Engineering Graphics (Pradeep Giri Academy)",url:"https://www.youtube.com/@pradeepgiriacademy/playlists"}]},
  {step:6,courseId:"phy4113",focus:"Matter → Electricity → Magnetism → Modern Physics",why:"HSC Physics base কাজে লাগবে। Concept বোঝার পর problem practice করুন।",tag:"Medium",tagColor:"#FBBF24",playlists:[{name:"Physics Lectures — Walter Lewin (MIT)",url:"https://www.youtube.com/@lecturesbywalterlewin.they9259"}]},
  {step:7,courseId:"math4111",focus:"ODE — Calculus শেষ করার পর শুরু করুন",why:"সবচেয়ে কঠিন। Calculus ভালো না হলে ODE impossible — তাই intentionally শেষে।",tag:"Hard",tagColor:"#F87171",playlists:[{name:"Differential Equations Full (Prof. Leonard)",url:"https://www.youtube.com/playlist?list=PLdlPA9pGVVtZ8iw2poXVCKM5oyysCCRQK"}]},
  {step:8,courseId:"me4151",focus:"Dynamics — Statics সম্পূর্ণ শেষ করার পর",why:"Statics ভালো না হলে Dynamics impossible। Statics-কে foundation হিসেবে নিন।",tag:"Hard",tagColor:"#F87171",playlists:[{name:"Online Dynamics Course (Jeff Hanson)",url:"https://www.youtube.com/playlist?list=PLRqDfxcafc206fNQPkcBUFEMYje-UjtqA"}]},
  {step:9,courseId:"hum4117",focus:"Class-এর সাথে সমান্তরালে পড়ুন",why:"Reading ও class notes-based। Teacher-এর outline-ই যথেষ্ট।",tag:"Easy",tagColor:"#34D399",playlists:[]},
];

/* ─── RING ───────────────────────────────────── */
function Ring({pct, size=52, stroke=4, color}) {
  const r=(size-stroke)/2, circ=2*Math.PI*r;
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)",flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1E293B" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${(pct/100)*circ} ${circ}`} strokeLinecap="round"
        style={{transition:"stroke-dasharray 0.5s ease"}}/>
    </svg>
  );
}

/* ─── LOGIN SCREEN ───────────────────────────── */
function LoginScreen({onLogin}) {
  const [name, setName]   = useState("");
  const [pass, setPass]   = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = () => {
    if (name.trim().toLowerCase() === YOUR_NAME.toLowerCase() && pass === YOUR_PASSWORD) {
      localStorage.setItem(AUTH_KEY, "true");
      onLogin();
    } else {
      setError("নাম বা password ভুল হয়েছে।");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const gridBg = {
    backgroundImage:"linear-gradient(rgba(56,189,248,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.05) 1px,transparent 1px)",
    backgroundSize:"32px 32px",
  };

  return (
    <div style={{background:"#080D18", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui,-apple-system,sans-serif", ...gridBg}}>
      <div style={{
        background:"#0F172A", border:"1px solid #1E293B", borderRadius:20,
        padding:"40px 36px", width:"100%", maxWidth:360,
        animation: shake ? "shake 0.4s ease" : "none",
        boxShadow:"0 25px 50px rgba(0,0,0,0.5)"
      }}>
        {/* Logo area */}
        <div style={{textAlign:"center", marginBottom:28}}>
          <div style={{fontSize:10, fontWeight:700, letterSpacing:4, color:"#38BDF8", textTransform:"uppercase", marginBottom:8}}>
            IUT · IPE · Semester 1.1
          </div>
          <div style={{fontSize:22, fontWeight:900, color:"#F8FAFC", letterSpacing:-0.5}}>Study Roadmap</div>
          <div style={{fontSize:12, color:"#475569", marginTop:4}}>Login করুন — শুধু আপনার জন্য</div>
        </div>

        {/* Name field */}
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11, fontWeight:600, color:"#64748B", letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:6}}>
            নাম
          </label>
          <input
            type="text"
            value={name}
            onChange={e => {setName(e.target.value); setError("");}}
            onKeyDown={e => e.key==="Enter" && handleLogin()}
            placeholder="আপনার নাম লিখুন"
            style={{
              width:"100%", padding:"11px 14px", background:"#1E293B",
              border:`1px solid ${error?"#EF4444":"#334155"}`, borderRadius:10,
              color:"#E2E8F0", fontSize:14, outline:"none", boxSizing:"border-box",
              transition:"border-color 0.2s",
            }}
          />
        </div>

        {/* Password field */}
        <div style={{marginBottom:20}}>
          <label style={{fontSize:11, fontWeight:600, color:"#64748B", letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:6}}>
            Password
          </label>
          <div style={{position:"relative"}}>
            <input
              type={showPass ? "text" : "password"}
              value={pass}
              onChange={e => {setPass(e.target.value); setError("");}}
              onKeyDown={e => e.key==="Enter" && handleLogin()}
              placeholder="••••••••"
              style={{
                width:"100%", padding:"11px 42px 11px 14px", background:"#1E293B",
                border:`1px solid ${error?"#EF4444":"#334155"}`, borderRadius:10,
                color:"#E2E8F0", fontSize:14, outline:"none", boxSizing:"border-box",
                transition:"border-color 0.2s",
              }}
            />
            <button onClick={() => setShowPass(p=>!p)}
              style={{position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#475569", cursor:"pointer", fontSize:14, padding:0}}>
              {showPass ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{background:"#450A0A", border:"1px solid #EF4444", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#FCA5A5", marginBottom:14, textAlign:"center"}}>
            {error}
          </div>
        )}

        {/* Login button */}
        <button onClick={handleLogin}
          style={{
            width:"100%", padding:"12px", background:"linear-gradient(135deg,#0EA5E9,#38BDF8)",
            border:"none", borderRadius:10, color:"#080D18", fontSize:14, fontWeight:800,
            cursor:"pointer", letterSpacing:0.5, transition:"opacity 0.2s",
          }}
          onMouseOver={e=>e.target.style.opacity="0.85"}
          onMouseOut={e=>e.target.style.opacity="1"}
        >
          Login করুন →
        </button>

        <div style={{textAlign:"center", marginTop:16, fontSize:11, color:"#1E3A5F"}}>
          🔒 Secured · শুধু আপনি access করতে পারবেন
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-5px)}
          80%{transform:translateX(5px)}
        }
        input::placeholder{color:#334155}
        input:focus{border-color:#38BDF8 !important; box-shadow:0 0 0 3px rgba(56,189,248,0.15)}
      `}</style>
    </div>
  );
}

/* ─── MAIN APP ───────────────────────────────── */
export default function App() {
  const [authed, setAuthed]           = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [done, setDone]               = useState({});
  const [open, setOpen]               = useState({});
  const [tab,  setTab]                = useState("courses");
  const [confirmReset, setConfirmReset] = useState(false);
  const [flash, setFlash]             = useState(false);

  // Check auth on load
  useEffect(() => {
    const isAuth = localStorage.getItem(AUTH_KEY) === "true";
    if (isAuth) { setDone(loadDone()); setAuthed(true); }
    setAuthChecked(true);
  }, []);

  const handleLogin = () => { setDone(loadDone()); setAuthed(true); };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuthed(false);
    setDone({});
  };

  useEffect(() => {
    if (!authed) return;
    saveDone(done);
    setFlash(true);
    const t = setTimeout(()=>setFlash(false), 900);
    return ()=>clearTimeout(t);
  }, [done, authed]);

  const toggleTopic = (cId, tId) => {
    const k=`${cId}__${tId}`;
    setDone(p=>({...p,[k]:!p[k]}));
  };

  const getProg = (c) => {
    const d=c.topics.filter(t=>done[`${c.id}__${t.id}`]).length;
    return {d, total:c.topics.length, pct:Math.round((d/c.topics.length)*100)};
  };

  const totalTopics = COURSES.reduce((s,c)=>s+c.topics.length,0);
  const doneCount   = Object.values(done).filter(Boolean).length;
  const overallPct  = Math.round((doneCount/totalTopics)*100);
  const courseById  = Object.fromEntries(COURSES.map(c=>[c.id,c]));

  const handleReset = () => {
    if(confirmReset){setDone({});setConfirmReset(false);}
    else{setConfirmReset(true);setTimeout(()=>setConfirmReset(false),3000);}
  };

  const gridBg = {
    backgroundImage:"linear-gradient(rgba(56,189,248,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.04) 1px,transparent 1px)",
    backgroundSize:"32px 32px",
  };

  if (!authChecked) return null;
  if (!authed) return <LoginScreen onLogin={handleLogin}/>;

  return (
    <div style={{background:"#080D18", minHeight:"100vh", fontFamily:"system-ui,-apple-system,sans-serif", color:"#E2E8F0", paddingBottom:48}}>

      {/* ── HEADER ── */}
      <div style={{background:"#0B1120", borderBottom:"1px solid #1E293B", padding:"22px 20px 18px", textAlign:"center", ...gridBg}}>
        <div style={{fontSize:10, fontWeight:700, letterSpacing:4, color:"#38BDF8", textTransform:"uppercase", marginBottom:5}}>
          IUT · IPE · Semester 1.1 · Batch 2025
        </div>
        <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:14}}>
          <h1 style={{fontSize:20, fontWeight:900, color:"#F8FAFC", margin:0, letterSpacing:-0.5}}>Study Roadmap</h1>
          <span style={{fontSize:11, color:"#34D399", background:"#052E16", border:"1px solid #34D39930", padding:"2px 8px", borderRadius:100, fontWeight:600}}>
            👋 {YOUR_NAME}
          </span>
        </div>

        <div style={{position:"relative", width:100, height:100, margin:"0 auto 6px"}}>
          <Ring pct={overallPct} size={100} stroke={7} color="#38BDF8"/>
          <div style={{position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
            <span style={{fontSize:24, fontWeight:900, color:"#F8FAFC", lineHeight:1}}>{overallPct}%</span>
            <span style={{fontSize:9, color:"#64748B", letterSpacing:1.5, textTransform:"uppercase", marginTop:2}}>done</span>
          </div>
        </div>

        <div style={{fontSize:12, color:"#475569", marginBottom:12}}>
          <span style={{color:"#38BDF8", fontWeight:700}}>{doneCount}</span> / {totalTopics} topics
          <span style={{display:"inline-block", width:6, height:6, borderRadius:"50%", background:"#34D399", marginLeft:8, verticalAlign:"middle", opacity:flash?1:0, transition:"opacity 0.3s"}}/>
        </div>

        <div style={{display:"flex", flexWrap:"wrap", gap:5, justifyContent:"center", marginBottom:16}}>
          {COURSES.map(c=>{
            const {pct}=getProg(c);
            return <span key={c.id} style={{fontSize:10, fontWeight:600, color:c.color, background:`${c.color}18`, border:`1px solid ${c.color}33`, padding:"2px 7px", borderRadius:100}}>{c.code} {pct}%</span>;
          })}
        </div>

        <div style={{display:"flex", justifyContent:"center", gap:0}}>
          {[["courses","Courses & Progress"],["order","Study Order"]].map(([key,label],i)=>(
            <button key={key} onClick={()=>setTab(key)} style={{
              padding:"8px 20px", fontSize:12, fontWeight:700, cursor:"pointer",
              border:"1px solid #1E293B", background:tab===key?"#38BDF8":"#0B1120",
              color:tab===key?"#080D18":"#64748B", transition:"all 0.2s",
              borderRadius:i===0?"6px 0 0 6px":"0 6px 6px 0",
            }}>{label}</button>
          ))}
          <button onClick={handleLogout} style={{
            marginLeft:8, padding:"8px 14px", fontSize:11, fontWeight:600, cursor:"pointer",
            border:"1px solid #334155", background:"transparent", color:"#475569",
            borderRadius:6, transition:"all 0.2s",
          }}>Logout</button>
        </div>
      </div>

      {/* ── COURSES TAB ── */}
      {tab==="courses" && (
        <div style={{maxWidth:920, margin:"0 auto", padding:"20px 14px"}}>
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:14}}>
            {COURSES.map(c=>{
              const {d,total,pct}=getProg(c);
              const isOpen=open[c.id];
              const sections={};
              c.topics.forEach(t=>{if(!sections[t.section])sections[t.section]=[];sections[t.section].push(t);});

              return (
                <div key={c.id} style={{background:"#0F172A", border:"1px solid #1E293B", borderLeft:`3px solid ${c.color}`, borderRadius:14, overflow:"hidden"}}>
                  <div style={{padding:"14px 15px 10px"}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex", gap:5, alignItems:"center", flexWrap:"wrap", marginBottom:5}}>
                          <span style={{fontSize:10, fontWeight:700, color:c.color, background:`${c.color}22`, padding:"2px 8px", borderRadius:6}}>{c.code}</span>
                          <span style={{fontSize:9, color:"#64748B", background:"#1E293B", padding:"2px 6px", borderRadius:4}}>{c.credits} cr · {c.type}</span>
                        </div>
                        <div style={{fontSize:13, fontWeight:700, color:"#E2E8F0", lineHeight:1.35, marginBottom:8}}>{c.title}</div>
                        {c.resources.length>0
                          ? <div style={{display:"flex", flexDirection:"column", gap:4}}>
                              {c.resources.map((r,i)=>(
                                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                                  style={{display:"inline-flex", alignItems:"center", gap:5, fontSize:10.5, color:c.color, textDecoration:"none", background:`${c.color}12`, border:`1px solid ${c.color}30`, borderRadius:5, padding:"3px 8px", width:"fit-content"}}>
                                  ▶ {r.name}
                                </a>
                              ))}
                            </div>
                          : <span style={{fontSize:10.5, color:"#475569"}}>📖 Class lectures & notes</span>
                        }
                      </div>
                      <div style={{position:"relative", width:50, height:50, flexShrink:0}}>
                        <Ring pct={pct} size={50} stroke={4} color={c.color}/>
                        <div style={{position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center"}}>
                          <span style={{fontSize:10, fontWeight:800, color:c.color}}>{pct}%</span>
                        </div>
                      </div>
                    </div>
                    <div style={{marginTop:10}}>
                      <div style={{height:3, background:"#1E293B", borderRadius:2, overflow:"hidden"}}>
                        <div style={{height:"100%", width:`${pct}%`, background:c.color, borderRadius:2, transition:"width 0.4s ease"}}/>
                      </div>
                      <div style={{fontSize:10.5, color:"#475569", marginTop:4}}>{d}/{total} topics done</div>
                    </div>
                  </div>

                  <button onClick={()=>setOpen(p=>({...p,[c.id]:!p[c.id]}))}
                    style={{width:"100%", padding:"7px", background:"#0B1120", border:"none", borderTop:"1px solid #1E293B", color:"#475569", fontSize:11, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4}}>
                    <span style={{fontSize:8}}>{isOpen?"▲":"▼"}</span>{isOpen?"Hide topics":"Show topics"}
                  </button>

                  {isOpen && (
                    <div style={{borderTop:"1px solid #1E293B"}}>
                      {Object.entries(sections).map(([sec,topics])=>(
                        <div key={sec}>
                          <div style={{padding:"7px 15px 3px", fontSize:9, fontWeight:700, letterSpacing:2, color:c.color, textTransform:"uppercase", background:"#080D18"}}>{sec}</div>
                          {topics.map(t=>{
                            const isDone=!!done[`${c.id}__${t.id}`];
                            return (
                              <div key={t.id} onClick={()=>toggleTopic(c.id,t.id)}
                                style={{display:"flex", alignItems:"center", gap:9, padding:"8px 15px", cursor:"pointer", background:isDone?`${c.color}0C`:"transparent", borderBottom:"1px solid #0F172A"}}>
                                <div style={{width:16, height:16, borderRadius:4, border:`2px solid ${isDone?c.color:"#334155"}`, background:isDone?c.color:"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s"}}>
                                  {isDone&&<span style={{fontSize:9, color:"#080D18", fontWeight:900}}>✓</span>}
                                </div>
                                <span style={{fontSize:12, color:isDone?"#475569":"#CBD5E1", textDecoration:isDone?"line-through":"none", lineHeight:1.4}}>{t.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{textAlign:"center", marginTop:28}}>
            <button onClick={handleReset}
              style={{padding:"7px 18px", background:"transparent", border:`1px solid ${confirmReset?"#EF4444":"#1E293B"}`, color:confirmReset?"#EF4444":"#475569", borderRadius:8, fontSize:11, cursor:"pointer", transition:"all 0.2s"}}>
              {confirmReset?"Confirm — সব progress মুছে যাবে!":"Reset all progress"}
            </button>
            <div style={{fontSize:10, color:"#334155", marginTop:8}}>Progress saves automatically in your browser</div>
          </div>
        </div>
      )}

      {/* ── STUDY ORDER TAB ── */}
      {tab==="order" && (
        <div style={{maxWidth:680, margin:"0 auto", padding:"24px 16px"}}>
          <div style={{fontSize:11, color:"#475569", textAlign:"center", marginBottom:20, lineHeight:1.6}}>
            এই order-এ পড়লে আগের topic পরের topic-এর foundation হয়ে যাবে।<br/>Hard topics intentionally শেষে রাখা হয়েছে।
          </div>
          <div style={{position:"relative"}}>
            <div style={{position:"absolute", left:20, top:20, bottom:20, width:2, background:"#1E293B", zIndex:0}}/>
            {STUDY_ORDER.map(item=>{
              const course=courseById[item.courseId];
              const {d,total,pct}=getProg(course);
              return (
                <div key={item.step} style={{display:"flex", gap:16, marginBottom:14, position:"relative", zIndex:1}}>
                  <div style={{flexShrink:0, width:42, height:42, borderRadius:"50%", background:"#0F172A", border:`2px solid ${course.color}`, display:"flex", alignItems:"center", justifyContent:"center"}}>
                    <span style={{fontSize:14, fontWeight:900, color:course.color}}>{item.step}</span>
                  </div>
                  <div style={{flex:1, background:"#0F172A", border:"1px solid #1E293B", borderLeft:`3px solid ${course.color}`, borderRadius:12, padding:"12px 14px"}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, flexWrap:"wrap"}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex", gap:5, alignItems:"center", marginBottom:4, flexWrap:"wrap"}}>
                          <span style={{fontSize:10, fontWeight:700, color:course.color, background:`${course.color}22`, padding:"2px 8px", borderRadius:5}}>{course.code}</span>
                          <span style={{fontSize:9, fontWeight:700, color:item.tagColor, background:`${item.tagColor}18`, padding:"2px 7px", borderRadius:10}}>{item.tag}</span>
                        </div>
                        <div style={{fontSize:13, fontWeight:700, color:"#E2E8F0", marginBottom:3, lineHeight:1.3}}>{course.title}</div>
                        <div style={{fontSize:11, color:course.color, marginBottom:5, fontWeight:500}}>📌 {item.focus}</div>
                        <div style={{fontSize:11.5, color:"#94A3B8", lineHeight:1.55, marginBottom:8}}>{item.why}</div>
                        {item.playlists.length>0
                          ? <div style={{display:"flex", flexDirection:"column", gap:4}}>
                              {item.playlists.map((p,i)=>(
                                <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                                  style={{display:"inline-flex", alignItems:"center", gap:5, fontSize:10.5, color:course.color, textDecoration:"none", background:`${course.color}12`, border:`1px solid ${course.color}30`, borderRadius:5, padding:"4px 10px", width:"fit-content"}}>
                                  ▶ {p.name}
                                </a>
                              ))}
                            </div>
                          : <span style={{fontSize:10.5, color:"#475569"}}>📖 Class attendance ও notes</span>
                        }
                      </div>
                      <div style={{flexShrink:0, textAlign:"center"}}>
                        <div style={{position:"relative", width:44, height:44}}>
                          <Ring pct={pct} size={44} stroke={3.5} color={course.color}/>
                          <div style={{position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center"}}>
                            <span style={{fontSize:9, fontWeight:800, color:course.color}}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{fontSize:9, color:"#475569", marginTop:2}}>{d}/{total}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:8, padding:"12px 16px", background:"#0F172A", border:"1px solid #1E293B", borderRadius:10, fontSize:11, color:"#64748B", lineHeight:1.6}}>
            <strong style={{color:"#94A3B8"}}>Tip:</strong> Step 2 + 3 parallel-এ চালান। Step 4 + 5 ও parallel সম্ভব। Step 7 ও 8 শুধু আগের step শেষ হলে শুরু করুন।
          </div>
        </div>
      )}
    </div>
  );
}
