import { useState, useEffect } from "react";
import ClassPlanner from "./ClassPlanner.jsx";
import TodayHub from "./TodayHub.jsx";

const YOUR_NAME     = "samiu";
const YOUR_PASSWORD = "iut2025";
const AUTH_KEY      = "iut-auth-v1";
const COURSE_KEY    = "iut-ipe-11-progress";
const MODE_KEY      = "rtn-mode";
const CLASSLOG_KEY  = "iut-class-log-v1";

const loadLS  = (k,d={}) => { try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;} };
const saveLS  = (k,v)    => { try{localStorage.setItem(k,JSON.stringify(v));}catch{} };
const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const todayStr= () => fmtDate(new Date());
const JS_DAY  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAYS    = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"];
const todayName = () => JS_DAY[new Date().getDay()];

/* ─── COURSES ──────────────────────────────── */
const COURSES = [
  {id:"math4111",code:"Math 4111",title:"Modeling with Calculus & ODE",credits:3,type:"Theory",color:"#34D399",
    resources:[{name:"Calculus 1 — Prof. Leonard",url:"https://www.youtube.com/playlist?list=PLF797E961509B4EB5"},{name:"Differential Equations — Prof. Leonard",url:"https://www.youtube.com/playlist?list=PLdlPA9pGVVtZ8iw2poXVCKM5oyysCCRQK"}],
    topics:[{id:"c1",s:"Calculus",t:"Lines, Angles & Distance Formula"},{id:"c2",s:"Calculus",t:"Introduction to Functions & Graphs"},{id:"c3",s:"Calculus",t:"Trigonometry Review"},{id:"c4",s:"Calculus",t:"Limits — Introduction & Properties"},{id:"c5",s:"Calculus",t:"Continuity & Squeeze Theorem"},{id:"c6",s:"Calculus",t:"Derivatives — Definition & Basic Rules"},{id:"c7",s:"Calculus",t:"Chain Rule & Implicit Differentiation"},{id:"c8",s:"Calculus",t:"Applications of Derivatives"},{id:"c9",s:"Calculus",t:"Integration — Definite & Indefinite"},{id:"c10",s:"Calculus",t:"Integration Techniques"},{id:"c11",s:"Calculus",t:"Applications of Integration"},{id:"o1",s:"ODE ⚠️ শেষে",t:"Introduction to ODE & Initial Value Problems"},{id:"o2",s:"ODE ⚠️ শেষে",t:"Time Rate of Change Problems"},{id:"o3",s:"ODE ⚠️ শেষে",t:"Separable Differential Equations"},{id:"o4",s:"ODE ⚠️ শেষে",t:"First Order Linear ODE"},{id:"o5",s:"ODE ⚠️ শেষে",t:"Growth, Decay & Mixing Applications"},{id:"o6",s:"ODE ⚠️ শেষে",t:"Slope Fields & Direction Fields"},{id:"o7",s:"ODE ⚠️ শেষে",t:"Second Order Linear ODE"},{id:"o8",s:"ODE ⚠️ শেষে",t:"Applications of 2nd Order ODE"}]},
  {id:"me4151",code:"ME 4151",title:"Statics and Dynamics",credits:3,type:"Theory",color:"#FBBF24",
    resources:[{name:"Online Statics Course — Jeff Hanson",url:"https://www.youtube.com/playlist?list=PLRqDfxcafc23LXGoItpkYMKtUdHaQwSDC"},{name:"Online Dynamics Course — Jeff Hanson",url:"https://www.youtube.com/playlist?list=PLRqDfxcafc206fNQPkcBUFEMYje-UjtqA"}],
    topics:[{id:"s1",s:"Statics",t:"Newton's Laws & Vector Introduction"},{id:"s2",s:"Statics",t:"Vector Language & Triangle Rule"},{id:"s3",s:"Statics",t:"Cartesian Notation & Components"},{id:"s4",s:"Statics",t:"Equilibrium of Particles (2D)"},{id:"s5",s:"Statics",t:"Equilibrium of Particles (3D)"},{id:"s6",s:"Statics",t:"Moments & Couples"},{id:"s7",s:"Statics",t:"Equilibrium of Rigid Bodies"},{id:"s8",s:"Statics",t:"Structural Analysis — Trusses"},{id:"s9",s:"Statics",t:"Frames & Machines"},{id:"s10",s:"Statics",t:"Friction"},{id:"s11",s:"Statics",t:"Center of Gravity & Centroids"},{id:"s12",s:"Statics",t:"Moments of Inertia"},{id:"d1",s:"Dynamics ⚠️",t:"Kinematics of Particles — Rectilinear"},{id:"d2",s:"Dynamics ⚠️",t:"Kinematics of Particles — Curvilinear"},{id:"d3",s:"Dynamics ⚠️",t:"Kinetics — Newton's 2nd Law"},{id:"d4",s:"Dynamics ⚠️",t:"Work-Energy Method"},{id:"d5",s:"Dynamics ⚠️",t:"Impulse & Momentum"},{id:"d6",s:"Dynamics ⚠️",t:"Kinematics of Rigid Bodies"},{id:"d7",s:"Dynamics ⚠️",t:"Kinetics of Rigid Bodies"}]},
  {id:"me4110",code:"ME 4110",title:"Engineering Drawing",credits:1.5,type:"Practical",color:"#F87171",
    resources:[{name:"Engineering Graphics — Pradeep Giri Academy",url:"https://www.youtube.com/@pradeepgiriacademy/playlists"}],
    topics:[{id:"ed1",s:"Basics",t:"Intro to Engineering Drawing & Instruments"},{id:"ed2",s:"Scales",t:"Units, Plain Scale & Diagonal Scale"},{id:"ed3",s:"Scales",t:"Vernier Scale"},{id:"ed4",s:"Curves",t:"Engineering Curves (Cycloid, Ellipse, Parabola)"},{id:"ed5",s:"Projections",t:"Projection of Points & Lines"},{id:"ed6",s:"Projections",t:"Projection of Planes"},{id:"ed7",s:"Projections",t:"Projection of Solids"},{id:"ed8",s:"Views",t:"Orthographic Projection"},{id:"ed9",s:"Views",t:"Isometric Projection & Views"},{id:"ed10",s:"Sections",t:"Sections of Solids"},{id:"ed11",s:"Development",t:"Development of Surfaces"},{id:"ed12",s:"Practice",t:"Hands-on Board Drawing Practice"}]},
  {id:"ipe4101",code:"IPE 4101",title:"Intro to Industrial & Production Engineering",credits:3,type:"Theory",color:"#60A5FA",
    resources:[{name:"IE & Operations Research — NPTEL IIT Guwahati",url:"https://www.youtube.com/playlist?list=PLwdnzlV3ogoX_AO-g9wEvUNu5cb_K-r45"}],
    topics:[{id:"i1",s:"Foundations",t:"Definition, History & Scope of IE"},{id:"i2",s:"Foundations",t:"Organizational Structure & Roles"},{id:"i3",s:"Plant",t:"Plant Location & Plant Layout"},{id:"i4",s:"Production",t:"Production Planning & Control"},{id:"i5",s:"Production",t:"MRP, Routing & Scheduling"},{id:"i6",s:"Inventory",t:"Inventory Management (Lean, JIT, MRP-II)"},{id:"i7",s:"Work Study",t:"Work Study & Ergonomics"},{id:"i8",s:"Work Study",t:"Time & Motion Study"},{id:"i9",s:"Quality",t:"Total Quality Management (TQM)"},{id:"i10",s:"Quality",t:"Statistical Quality Control & Six Sigma"},{id:"i11",s:"Planning",t:"Forecasting Methods"},{id:"i12",s:"Planning",t:"Project Management Basics"},{id:"i13",s:"Modern IE",t:"Industry 4.0 & Smart Manufacturing"}]},
  {id:"chem4115",code:"Chem 4115",title:"Physical and Inorganic Chemistry",credits:3,type:"Theory",color:"#A78BFA",
    resources:[{name:"Chemboost: Chemistry Classes (BSc)",url:"https://www.youtube.com/channel/UCXISx5Mbzp-uXm0UdUf-H3Q"}],
    topics:[{id:"ch1",s:"Atomic Structure",t:"De Broglie Waves & Uncertainty Principle"},{id:"ch2",s:"Atomic Structure",t:"Schrödinger Wave Equation & Wave Functions"},{id:"ch3",s:"Atomic Structure",t:"Quantum Numbers & Atomic Orbitals"},{id:"ch4",s:"Bonding",t:"Chemical Bonding (Ionic, Covalent, Metallic)"},{id:"ch5",s:"Bonding",t:"Molecular Orbital Theory (MOT)"},{id:"ch6",s:"Physical Chem",t:"Gaseous State & Kinetic Theory"},{id:"ch7",s:"Physical Chem",t:"Solid State & Crystal Structure"},{id:"ch8",s:"Physical Chem",t:"Chemical Thermodynamics"},{id:"ch9",s:"Physical Chem",t:"Chemical Kinetics & Reaction Rates"},{id:"ch10",s:"Physical Chem",t:"Electrochemistry"},{id:"ch11",s:"Inorganic Chem",t:"s-block Elements"},{id:"ch12",s:"Inorganic Chem",t:"p-block Elements"}]},
  {id:"phy4113",code:"Phy 4113",title:"Structure of Matter, Electricity, Magnetism & Modern Physics",credits:3,type:"Theory",color:"#F472B6",
    resources:[{name:"Physics Lectures — Walter Lewin (MIT)",url:"https://www.youtube.com/@lecturesbywalterlewin.they9259"}],
    topics:[{id:"p1",s:"Matter",t:"Structure of Matter & Atomic Models"},{id:"p2",s:"Electricity",t:"Electric Charge & Coulomb's Law"},{id:"p3",s:"Electricity",t:"Electric Fields & Gauss's Law"},{id:"p4",s:"Electricity",t:"Electric Potential & Capacitance"},{id:"p5",s:"Electricity",t:"Current, Resistance & DC Circuits"},{id:"p6",s:"Magnetism",t:"Magnetic Fields & Magnetic Forces"},{id:"p7",s:"Magnetism",t:"Electromagnetic Induction & Faraday's Law"},{id:"p8",s:"Magnetism",t:"Maxwell's Equations & EM Waves"},{id:"p9",s:"Modern Physics",t:"Photoelectric Effect & X-rays"},{id:"p10",s:"Modern Physics",t:"Quantum Mechanics Intro & Bohr Model"},{id:"p11",s:"Modern Physics",t:"Nuclear Physics & Radioactivity"}]},
  {id:"hum4117",code:"Hum 4117",title:"Islamic Culture & Professional Ethics",credits:3,type:"Theory",color:"#2DD4BF",
    resources:[],
    topics:[{id:"h1",s:"Islamic Culture",t:"Introduction to Islamic Culture"},{id:"h2",s:"Islamic Culture",t:"Sources of Islamic Knowledge"},{id:"h3",s:"Islamic Culture",t:"Islamic Civilization & Contributions"},{id:"h4",s:"Islamic Culture",t:"Islamic Economics & Social System"},{id:"h5",s:"Ethics",t:"Engineering Ethics — Foundations"},{id:"h6",s:"Ethics",t:"Professional Responsibility & Code of Conduct"},{id:"h7",s:"Ethics",t:"Ethics in Industrial & Production Engineering"}]},
];

const STUDY_ORDER=[
  {step:1,courseId:"ipe4101",focus:"Full course, Lec 1–35",why:"সবচেয়ে easy — math নেই। নিজের major বলে দ্রুত বুঝবেন।",tag:"Easy",tc:"#34D399",pl:[{n:"NPTEL IE & OR",u:"https://www.youtube.com/playlist?list=PLwdnzlV3ogoX_AO-g9wEvUNu5cb_K-r45"}]},
  {step:2,courseId:"math4111",focus:"Calculus — Limits, Derivatives, Integration",why:"HSC base আছে। এটা শেষ করলে ODE-এর foundation ready।",tag:"Medium",tc:"#FBBF24",pl:[{n:"Calculus 1 (Prof. Leonard)",u:"https://www.youtube.com/playlist?list=PLF797E961509B4EB5"}]},
  {step:3,courseId:"me4151",focus:"Statics — Vectors থেকে Inertia",why:"Calculus-এর সাথে parallel-এ শুরু করুন।",tag:"Medium",tc:"#FBBF24",pl:[{n:"Online Statics (Jeff Hanson)",u:"https://www.youtube.com/playlist?list=PLRqDfxcafc23LXGoItpkYMKtUdHaQwSDC"}]},
  {step:4,courseId:"chem4115",focus:"Atomic Structure → Bonding → Physical → Inorganic",why:"Chemboost channel-এ section ধরে playlist খুঁজুন।",tag:"Medium",tc:"#FBBF24",pl:[{n:"Chemboost Chemistry",u:"https://www.youtube.com/channel/UCXISx5Mbzp-uXm0UdUf-H3Q"}]},
  {step:5,courseId:"me4110",focus:"Instruments → Scales → Curves → Projections",why:"Practical course। Video দেখার পর drawing board-এ practice করুন।",tag:"Medium",tc:"#FBBF24",pl:[{n:"Pradeep Giri Academy",u:"https://www.youtube.com/@pradeepgiriacademy/playlists"}]},
  {step:6,courseId:"phy4113",focus:"Matter → Electricity → Magnetism → Modern Physics",why:"HSC Physics base কাজে লাগবে।",tag:"Medium",tc:"#FBBF24",pl:[{n:"Walter Lewin (MIT)",u:"https://www.youtube.com/@lecturesbywalterlewin.they9259"}]},
  {step:7,courseId:"math4111",focus:"ODE — Calculus শেষ করার পর",why:"সবচেয়ে কঠিন। Calculus ভালো না হলে ODE impossible।",tag:"Hard",tc:"#F87171",pl:[{n:"Differential Equations (Prof. Leonard)",u:"https://www.youtube.com/playlist?list=PLdlPA9pGVVtZ8iw2poXVCKM5oyysCCRQK"}]},
  {step:8,courseId:"me4151",focus:"Dynamics — Statics শেষের পর",why:"Statics ভালো না হলে Dynamics impossible।",tag:"Hard",tc:"#F87171",pl:[{n:"Online Dynamics (Jeff Hanson)",u:"https://www.youtube.com/playlist?list=PLRqDfxcafc206fNQPkcBUFEMYje-UjtqA"}]},
  {step:9,courseId:"hum4117",focus:"Class-এর সাথে সমান্তরালে পড়ুন",why:"Reading ও class notes-based।",tag:"Easy",tc:"#34D399",pl:[]},
];

/* ─── ROUTINE DATA ─────────────────────────── */
const T_SMW=[{t:"4:40–5:30 AM",task:"Wake up & get fully fresh"},{t:"5:30–6:30 AM",task:"Tuition prep"},{t:"6:30–8:10 AM",task:"IPE 4101 – Intro to IPE"},{t:"8:10–8:40 AM",task:"IPE 4101 buffer"},{t:"8:40–9:20 AM",task:"Breakfast"},{t:"9:20–10:45 AM",task:"Hum 4117 – Islamic Culture & Ethics"},{t:"11:00 AM–4:00 PM",task:"Out: teach 2 tuitions"},{t:"4:00–4:30 PM",task:"Rest"},{t:"4:30–7:00 PM",task:"Free time / light revision"},{t:"7:00–7:30 PM",task:"Prep for home tuition"},{t:"7:30–9:30 PM",task:"Teach tuition at home"},{t:"9:30–10:00 PM",task:"Dinner"},{t:"10:00–10:20 PM",task:"Clash of Clans"},{t:"10:20–10:35 PM",task:"Extra book reading"},{t:"10:35–11:05 PM",task:"Light revision"},{t:"11:05–11:30 PM",task:"Mobile off — wind down"},{t:"11:30 PM",task:"Sleep on time"}];
const T_ST=[{t:"4:40–5:30 AM",task:"Wake up & get fully fresh"},{t:"5:30–8:10 AM",task:"Math 4111 – Calculus (Prof. Leonard)"},{t:"8:10–8:40 AM",task:"Buffer / problem practice"},{t:"8:40–9:20 AM",task:"Breakfast"},{t:"9:20 AM–12:00 PM",task:"ME 4151 – Statics (Jeff Hanson)"},{t:"12:00–1:00 PM",task:"Lunch + rest"},{t:"1:00–3:30 PM",task:"Free time (UoPeople / crypto)"},{t:"3:30–4:30 PM",task:"Tuition prep"},{t:"4:30–8:30 PM",task:"Out: teach tuition"},{t:"8:30–9:20 PM",task:"Rest"},{t:"9:20–9:50 PM",task:"Dinner"},{t:"10:00–10:20 PM",task:"Clash of Clans"},{t:"10:20–10:35 PM",task:"Extra book reading"},{t:"10:35–11:05 PM",task:"Light revision – Calculus & Statics"},{t:"11:05–11:30 PM",task:"Mobile off — wind down"},{t:"11:30 PM",task:"Sleep on time"}];
const T_THU=[{t:"4:40–5:30 AM",task:"Wake up & get fully fresh"},{t:"5:30–8:10 AM",task:"Chem 4115 – Physical & Inorganic Chemistry"},{t:"8:10–8:40 AM",task:"Buffer"},{t:"8:40–9:20 AM",task:"Breakfast"},{t:"9:20 AM–12:00 PM",task:"ME 4110 – Engineering Drawing"},{t:"12:00–1:00 PM",task:"Lunch + rest"},{t:"1:00–4:30 PM",task:"Phy 4113 – Physics (Walter Lewin)"},{t:"4:30–8:30 PM",task:"Out: teach tuition + Udvash khata"},{t:"8:30–9:20 PM",task:"Rest"},{t:"9:20–9:50 PM",task:"Dinner"},{t:"10:00–10:20 PM",task:"Clash of Clans"},{t:"10:20–10:35 PM",task:"Extra book reading"},{t:"10:35–11:05 PM",task:"Light revision"},{t:"11:05–11:30 PM",task:"Mobile off — wind down"},{t:"11:30 PM",task:"Sleep on time"}];
const T_FRI=[{t:"4:40–5:30 AM",task:"Wake up & get fully fresh"},{t:"5:30–8:10 AM",task:"Chem 4115 – Physical & Inorganic Chemistry"},{t:"8:10–8:40 AM",task:"Buffer"},{t:"8:40–9:20 AM",task:"Breakfast"},{t:"9:20–11:00 AM",task:"ME 4110 – Engineering Drawing"},{t:"11:00 AM–1:00 PM",task:"Jumma + lunch"},{t:"1:00–3:00 PM",task:"Phy 4113 – Physics"},{t:"3:00–6:30 PM",task:"Udvash khata check"},{t:"6:30–7:00 PM",task:"Free / rest"},{t:"7:00–7:30 PM",task:"Prep for home tuition"},{t:"7:30–9:30 PM",task:"Teach tuition at home"},{t:"9:30–10:00 PM",task:"Dinner"},{t:"10:00–10:20 PM",task:"Clash of Clans"},{t:"10:20–10:35 PM",task:"Extra book reading"},{t:"10:35–11:05 PM",task:"Light revision"},{t:"11:05–11:30 PM",task:"Mobile off — wind down"},{t:"11:30 PM",task:"Sleep on time"}];
const N_SAT=[{t:"4:40–5:30 AM",task:"Wake up & get fully fresh"},{t:"5:30–8:10 AM",task:"IUT Class Review — বাড়িতে পড়ুন (Class Log দেখুন)"},{t:"8:10–8:40 AM",task:"Breakfast"},{t:"8:40–10:45 AM",task:"IPE deep study / revision"},{t:"11:00 AM–4:00 PM",task:"Nikunja tuition (2 students)"},{t:"4:00–4:30 PM",task:"Rest"},{t:"4:30–7:00 PM",task:"Free / IUT revision"},{t:"7:00–7:30 PM",task:"Prep for home tuition"},{t:"7:30–9:30 PM",task:"Home tuition"},{t:"9:30–10:00 PM",task:"Dinner"},{t:"10:00–10:20 PM",task:"Clash of Clans"},{t:"10:20–10:35 PM",task:"Extra book reading"},{t:"10:35–11:05 PM",task:"Light revision"},{t:"11:05–11:30 PM",task:"Mobile off — wind down"},{t:"11:30 PM",task:"Sleep on time"}];
const N_SUN=[{t:"4:40–5:30 AM",task:"Wake up & get fully fresh"},{t:"5:30–8:10 AM",task:"IUT Class Review — বাড়িতে পড়ুন (Class Log দেখুন)"},{t:"8:10–8:40 AM",task:"Breakfast"},{t:"8:40 AM–12:00 PM",task:"IPE study / practice"},{t:"12:00–1:00 PM",task:"Lunch + rest"},{t:"1:00–3:30 PM",task:"Free (UoPeople / crypto)"},{t:"3:30–4:30 PM",task:"Tuition prep"},{t:"4:30–8:30 PM",task:"Out: Mirpur 10 tuition"},{t:"8:30–9:00 PM",task:"Dinner"},{t:"9:00–10:00 PM",task:"Home tuition (1h)"},{t:"10:00–10:20 PM",task:"Clash of Clans"},{t:"10:20–10:35 PM",task:"Extra book reading"},{t:"10:35–11:05 PM",task:"Light revision"},{t:"11:05–11:30 PM",task:"Mobile off — wind down"},{t:"11:30 PM",task:"Sleep on time"}];
const N_MON=[{t:"4:40–5:30 AM",task:"Wake up & get fully fresh"},{t:"5:30–6:00 AM",task:"Pre-class review — পরের class-এর আগে পড়ুন (Class Log দেখুন)"},{t:"6:00 AM",task:"Leave for IUT"},{t:"8:00–9:15 AM",task:"Class: Chem 4115"},{t:"9:15–10:30 AM",task:"Class: Hum 4112"},{t:"10:30 AM–1:00 PM",task:"Class: ME 4151"},{t:"1:00–2:30 PM",task:"Prayer & lunch (campus)"},{t:"2:30–3:45 PM",task:"Class: Math 4111"},{t:"3:45–5:00 PM",task:"Travel to Nikunja"},{t:"5:00–7:00 PM",task:"Nikunja tuition"},{t:"7:00–8:00 PM",task:"Travel home"},{t:"8:00–8:30 PM",task:"Dinner"},{t:"8:30–10:00 PM",task:"IUT Class Review — আজকের class বাড়িতে পড়ুন"},{t:"10:00–10:20 PM",task:"Clash of Clans"},{t:"10:20–10:35 PM",task:"Extra book reading"},{t:"10:35–11:05 PM",task:"Light revision"},{t:"11:05–11:30 PM",task:"Mobile off — wind down"},{t:"11:30 PM",task:"Sleep on time"}];
const N_TUE=[{t:"4:40–5:30 AM",task:"Wake up & get fully fresh"},{t:"5:30–6:00 AM",task:"Pre-class review — পরের class-এর আগে পড়ুন (Class Log দেখুন)"},{t:"6:00 AM",task:"Leave for IUT"},{t:"8:00–9:15 AM",task:"Class: Hum 4117"},{t:"9:15–10:30 AM",task:"Class: Phy 4113"},{t:"10:30 AM–1:00 PM",task:"Class: ME 4151"},{t:"1:00–2:15 PM",task:"Travel home"},{t:"2:15–4:30 PM",task:"IUT Class Review — আজকের class বাড়িতে পড়ুন"},{t:"4:30–8:30 PM",task:"Out: Mirpur 10 tuition"},{t:"8:30–9:00 PM",task:"Dinner"},{t:"9:00–10:00 PM",task:"Free / light revision"},{t:"10:00–10:20 PM",task:"Clash of Clans"},{t:"10:20–10:35 PM",task:"Extra book reading"},{t:"10:35–11:05 PM",task:"Light revision"},{t:"11:05–11:30 PM",task:"Mobile off — wind down"},{t:"11:30 PM",task:"Sleep on time"}];
const N_WED=[{t:"4:40–5:30 AM",task:"Wake up & get fully fresh"},{t:"5:30–6:00 AM",task:"Pre-class review — পরের class-এর আগে পড়ুন (Class Log দেখুন)"},{t:"6:00 AM",task:"Leave for IUT"},{t:"8:00–9:15 AM",task:"Class: Chem 4115"},{t:"9:15–10:30 AM",task:"Free period — light study"},{t:"10:30 AM–1:00 PM",task:"Class: ME 4110"},{t:"1:00–2:30 PM",task:"Prayer & lunch (campus)"},{t:"2:30–3:45 PM",task:"Class: Hum 4117"},{t:"3:45–5:00 PM",task:"Travel to Nikunja"},{t:"5:00–7:00 PM",task:"Nikunja tuition"},{t:"7:00–8:00 PM",task:"Travel home"},{t:"8:00–8:30 PM",task:"Dinner"},{t:"8:30–10:00 PM",task:"IUT Class Review — আজকের class বাড়িতে পড়ুন"},{t:"10:00–10:20 PM",task:"Clash of Clans"},{t:"10:20–10:35 PM",task:"Extra book reading"},{t:"10:35–11:05 PM",task:"Light revision"},{t:"11:05–11:30 PM",task:"Mobile off — wind down"},{t:"11:30 PM",task:"Sleep on time"}];
const N_THU=[{t:"4:40–5:30 AM",task:"Wake up & get fully fresh"},{t:"5:30–6:00 AM",task:"Pre-class review — পরের class-এর আগে পড়ুন (Class Log দেখুন)"},{t:"6:00 AM",task:"Leave for IUT"},{t:"8:00–9:15 AM",task:"Free period — light study"},{t:"9:15–10:30 AM",task:"Class: Phy 4113"},{t:"10:30 AM–1:00 PM",task:"Class/Lab: ME 4152 / IPE 4108"},{t:"1:00–2:30 PM",task:"Prayer & lunch"},{t:"2:30–3:45 PM",task:"Class: IPE 4101"},{t:"3:45–5:00 PM",task:"Travel home"},{t:"5:00–5:30 PM",task:"Rest"},{t:"6:00–8:00 PM",task:"Mirpur 10 tuition"},{t:"8:00–8:30 PM",task:"Walk home"},{t:"8:30–9:00 PM",task:"Dinner"},{t:"9:00–9:30 PM",task:"Udvash khata check"},{t:"9:30–10:00 PM",task:"IUT Class Review — আজকের class বাড়িতে পড়ুন"},{t:"10:00–10:20 PM",task:"Clash of Clans"},{t:"10:20–10:35 PM",task:"Extra book reading"},{t:"10:35–11:05 PM",task:"Light revision"},{t:"11:05–11:30 PM",task:"Mobile off — wind down"},{t:"11:30 PM",task:"Sleep on time"}];
const N_FRI=[{t:"4:40–5:30 AM",task:"Wake up & get fully fresh"},{t:"5:30–6:00 AM",task:"Pre-class review — পরের class-এর আগে পড়ুন (Class Log দেখুন)"},{t:"6:00 AM",task:"Leave for IUT"},{t:"8:00–10:30 AM",task:"Class: ME 4110"},{t:"10:30–11:45 AM",task:"Class: IPE 4101"},{t:"11:45 AM–1:00 PM",task:"Class: Math 4111"},{t:"1:00–2:30 PM",task:"Jumma & lunch"},{t:"2:30–3:45 PM",task:"Class: Hum 4114"},{t:"3:45–5:00 PM",task:"Travel home"},{t:"5:00–5:30 PM",task:"Udvash khata check"},{t:"5:30–7:00 PM",task:"IUT Class Review — আজকের class বাড়িতে পড়ুন"},{t:"7:00–7:30 PM",task:"Prep for home tuition"},{t:"7:30–9:30 PM",task:"Home tuition"},{t:"9:30–10:00 PM",task:"Dinner"},{t:"10:00–10:20 PM",task:"Clash of Clans"},{t:"10:20–10:35 PM",task:"Extra book reading"},{t:"10:35–11:05 PM",task:"Light revision"},{t:"11:05–11:30 PM",task:"Mobile off — wind down"},{t:"11:30 PM",task:"Sleep on time"}];

const ROUTINE={
  pre:{Saturday:T_SMW,Sunday:T_ST,Monday:T_SMW,Tuesday:T_ST,Wednesday:T_SMW,Thursday:T_THU,Friday:T_FRI},
  nov:{Saturday:N_SAT,Sunday:N_SUN,Monday:N_MON,Tuesday:N_TUE,Wednesday:N_WED,Thursday:N_THU,Friday:N_FRI},
};

const getRtnKey  = (d) => `rtn-${d}`;
const loadRtn    = (d) => loadLS(getRtnKey(d), {done:[]});
const saveRtn    = (d, data) => saveLS(getRtnKey(d), data);
const getPct     = (done, total) => total===0 ? 0 : Math.round((done.filter(Boolean).length/total)*100);
const pctColor   = (p) => p>=80 ? "#34D399" : p>=50 ? "#FBBF24" : p>=20 ? "#F97316" : "#475569";
const courseMap  = Object.fromEntries(COURSES.map(c=>[c.id,c]));

/* ─── RING ─────────────────────────────────── */
function Ring({pct,size=52,stroke=4,color}){
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

/* ─── LOGIN ─────────────────────────────────── */
function LoginScreen({onLogin}){
  const [name,setName]=useState(""), [pass,setPass]=useState(""),
        [err,setErr]=useState(""),   [shake,setShake]=useState(false),
        [show,setShow]=useState(false);
  const go=()=>{
    if(name.trim().toLowerCase()===YOUR_NAME.toLowerCase() && pass===YOUR_PASSWORD){
      localStorage.setItem(AUTH_KEY,"true"); onLogin();
    } else { setErr("নাম বা password ভুল।"); setShake(true); setTimeout(()=>setShake(false),500); }
  };
  const gb={backgroundImage:"linear-gradient(rgba(56,189,248,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.05) 1px,transparent 1px)",backgroundSize:"32px 32px"};
  return (
    <div style={{background:"#080D18",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,sans-serif",...gb}}>
      <div style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:20,padding:"40px 36px",width:"100%",maxWidth:360,animation:shake?"shake 0.4s ease":"none",boxShadow:"0 25px 50px rgba(0,0,0,0.5)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:4,color:"#38BDF8",textTransform:"uppercase",marginBottom:8}}>IUT · IPE · Semester 1.1</div>
          <div style={{fontSize:22,fontWeight:900,color:"#F8FAFC"}}>Study Roadmap</div>
          <div style={{fontSize:12,color:"#475569",marginTop:4}}>শুধু আপনার জন্য</div>
        </div>
        {[["নাম","text",name,setName,"আপনার নাম"],["Password",show?"text":"password",pass,setPass,"••••••••"]].map(([lbl,type,val,set,ph],i)=>(
          <div key={i} style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:600,color:"#64748B",letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:6}}>{lbl}</label>
            <div style={{position:"relative"}}>
              <input type={type} value={val} onChange={e=>{set(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()} placeholder={ph}
                style={{width:"100%",padding:i===1?"11px 42px 11px 14px":"11px 14px",background:"#1E293B",border:`1px solid ${err?"#EF4444":"#334155"}`,borderRadius:10,color:"#E2E8F0",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
              {i===1 && <button onClick={()=>setShow(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14,padding:0}}>{show?"🙈":"👁"}</button>}
            </div>
          </div>
        ))}
        {err && <div style={{background:"#450A0A",border:"1px solid #EF4444",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#FCA5A5",marginBottom:14,textAlign:"center"}}>{err}</div>}
        <button onClick={go} style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#0EA5E9,#38BDF8)",border:"none",borderRadius:10,color:"#080D18",fontSize:14,fontWeight:800,cursor:"pointer"}}>Login করুন →</button>
        <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"#1E3A5F"}}>🔒 Secured</div>
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}} input::placeholder{color:#334155} input:focus{border-color:#38BDF8!important}`}</style>
    </div>
  );
}

/* ─── CLASS LOG ─────────────────────────────── */
function ClassLog(){
  const [logs,setLogs]     = useState(()=>loadLS(CLASSLOG_KEY,[]));
  const [form,setForm]     = useState({courseId:"math4111",date:todayStr(),topic:""});
  const [adding,setAdding] = useState(false);
  const [filter,setFilter] = useState("all");

  const saveLogs=(l)=>{ setLogs(l); saveLS(CLASSLOG_KEY,l); };
  const addLog=()=>{
    if(!form.topic.trim()) return;
    saveLogs([{id:Date.now(),...form,home:false,next:false},...logs]);
    setForm(f=>({...f,topic:""})); setAdding(false);
  };
  const toggle=(id,field)=>saveLogs(logs.map(l=>l.id===id?{...l,[field]:!l[field]}:l));
  const del=(id)=>saveLogs(logs.filter(l=>l.id!==id));

  const pending=logs.filter(l=>!l.home||!l.next);
  const filtered=filter==="all"?logs:filter==="pending"?pending:logs.filter(l=>l.courseId===filter);

  return (
    <div>
      {pending.length>0 && (
        <div style={{background:"#2D1B00",border:"1px solid #F97316",borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>⚠️</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:"#F97316"}}>{pending.length}টা class review বাকি!</div>
            <div style={{fontSize:11,color:"#92400E"}}>নিচে tick করে দিন।</div>
          </div>
          <button onClick={()=>setFilter("pending")} style={{padding:"4px 10px",background:"#F97316",border:"none",borderRadius:6,color:"#080D18",fontSize:11,fontWeight:700,cursor:"pointer"}}>দেখুন</button>
        </div>
      )}

      {!adding
        ? <button onClick={()=>setAdding(true)} style={{width:"100%",padding:"11px",background:"#0F172A",border:"1px dashed #334155",borderRadius:10,color:"#38BDF8",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:14}}>
            + আজকের class log করুন
          </button>
        : <div style={{background:"#0F172A",border:"1px solid #38BDF8",borderRadius:12,padding:"16px",marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"#38BDF8",marginBottom:12}}>নতুন Class Log</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div>
                <label style={{fontSize:10,color:"#475569",display:"block",marginBottom:4}}>Subject</label>
                <select value={form.courseId} onChange={e=>setForm(f=>({...f,courseId:e.target.value}))}
                  style={{width:"100%",padding:"8px",background:"#1E293B",border:"1px solid #334155",borderRadius:7,color:"#E2E8F0",fontSize:12,outline:"none"}}>
                  {COURSES.map(c=><option key={c.id} value={c.id}>{c.code}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:10,color:"#475569",display:"block",marginBottom:4}}>Date</label>
                <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                  style={{width:"100%",padding:"8px",background:"#1E293B",border:"1px solid #334155",borderRadius:7,color:"#E2E8F0",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:10,color:"#475569",display:"block",marginBottom:4}}>Class-এ কী পড়ানো হলো?</label>
              <input value={form.topic} onChange={e=>setForm(f=>({...f,topic:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&addLog()}
                placeholder="যেমন: Newton's Laws, Chapter 2, Vectors..."
                style={{width:"100%",padding:"9px 12px",background:"#1E293B",border:"1px solid #334155",borderRadius:7,color:"#E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setAdding(false)} style={{padding:"7px 14px",background:"transparent",border:"1px solid #334155",borderRadius:7,color:"#475569",fontSize:12,cursor:"pointer"}}>Cancel</button>
              <button onClick={addLog} style={{padding:"7px 16px",background:"#38BDF8",border:"none",borderRadius:7,color:"#080D18",fontSize:12,fontWeight:700,cursor:"pointer"}}>Save করুন</button>
            </div>
          </div>
      }

      <div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>
        {[["all","সব"],["pending","Pending ⚠️"],...COURSES.map(c=>[c.id,c.code])].map(([key,lbl])=>(
          <button key={key} onClick={()=>setFilter(key)}
            style={{padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",border:"1px solid #1E293B",borderRadius:20,background:filter===key?"#1E40AF":"#0F172A",color:filter===key?"#fff":"#475569"}}>
            {lbl}
          </button>
        ))}
      </div>

      {filtered.length===0
        ? <div style={{textAlign:"center",color:"#334155",fontSize:12,padding:"32px 0"}}>{filter==="pending"?"সব review done! 🎉":"এখনো কোনো class log নেই।"}</div>
        : <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {filtered.map(log=>{
              const c=courseMap[log.courseId]||COURSES[0];
              const done=log.home&&log.next;
              return (
                <div key={log.id} style={{background:"#0F172A",border:`1px solid ${done?"#1E293B":"#92400E44"}`,borderLeft:`3px solid ${c.color}`,borderRadius:10,padding:"12px 14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                        <span style={{fontSize:10,fontWeight:700,color:c.color,background:`${c.color}22`,padding:"2px 7px",borderRadius:5}}>{c.code}</span>
                        <span style={{fontSize:10,color:"#475569"}}>{log.date}</span>
                        <span style={{fontSize:10,color:done?"#34D399":"#F97316"}}>{done?"✅ Done":"⏳ Pending"}</span>
                      </div>
                      <div style={{fontSize:13,fontWeight:600,color:"#E2E8F0",lineHeight:1.4}}>{log.topic}</div>
                    </div>
                    <button onClick={()=>del(log.id)} style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:14,padding:"2px 4px"}}>🗑</button>
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {[[log.home,"home","🏠 বাড়িতে পড়েছি"],[log.next,"next","📖 পরের class-এর আগে review"]].map(([val,field,lbl])=>(
                      <div key={field} onClick={()=>toggle(log.id,field)}
                        style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",padding:"5px 10px",background:val?"#052E1C":"#1E293B",border:`1px solid ${val?"#34D399":"#334155"}`,borderRadius:7}}>
                        <div style={{width:15,height:15,borderRadius:3,border:`2px solid ${val?"#34D399":"#475569"}`,background:val?"#34D399":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          {val && <span style={{fontSize:8,color:"#080D18",fontWeight:900}}>✓</span>}
                        </div>
                        <span style={{fontSize:11,color:val?"#34D399":"#64748B",fontWeight:val?600:400}}>{lbl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}

/* ─── ROUTINE TAB ───────────────────────────── */
function RoutineTab({mode,setMode,nav={}}){
  const [rv,setRv]         = useState(nav.rv||"today");
  const [selDay,setSelDay] = useState(todayName());
  const [dayData,setDayData]= useState({});
  const [monthOff,setMO]   = useState(0);
  const [,fu]              = useState(0);
  const [logs,setLogs]     = useState(()=>loadLS(CLASSLOG_KEY,[]));

  const tasks = ROUTINE[mode][selDay] || [];

  useEffect(()=>{ setDayData(loadRtn(todayStr())); setLogs(loadLS(CLASSLOG_KEY,[])); },[selDay,rv]);

  const toggleTask=(i)=>{
    const cur=loadRtn(todayStr()), done=[...(cur.done||[])];
    done[i]=!done[i];
    const saved={done,total:tasks.length};
    saveRtn(todayStr(),saved); setDayData(saved); fu(n=>n+1);
  };

  const toggleLogField=(id,field)=>{
    const updated=logs.map(l=>l.id===id?{...l,[field]:!l[field]}:l);
    setLogs(updated); saveLS(CLASSLOG_KEY,updated); fu(n=>n+1);
  };

  // Pending class reviews (not studied at home yet)
  const pendingHome=logs.filter(l=>!l.home);
  const pendingNext=logs.filter(l=>l.home&&!l.next);

  const last7=Array.from({length:7},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-6+i);
    const ds=fmtDate(d), dayN=JS_DAY[d.getDay()];
    const rd=loadRtn(ds), total=(ROUTINE[mode][dayN]||[]).length;
    return {ds,dayN,pct:getPct(rd.done||[],total)};
  });

  // Month with navigation fix
  const refDate=new Date(); refDate.setDate(1); refDate.setMonth(refDate.getMonth()+monthOff);
  const yr=refDate.getFullYear(), mo=refDate.getMonth();
  const firstDay=new Date(yr,mo,1).getDay();
  const dim=new Date(yr,mo+1,0).getDate();
  const cells=[];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=dim;d++){
    const date=new Date(yr,mo,d);
    const ds=fmtDate(date), dayN=JS_DAY[date.getDay()];
    const rd=loadRtn(ds), total=(ROUTINE[mode][dayN]||[]).length;
    const pct=getPct(rd.done||[],total);
    const isFuture=date>new Date();
    cells.push({d,ds,pct,isToday:ds===todayStr(),isFuture});
  }

  const last12=Array.from({length:12},(_,i)=>{
    const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-11+i);
    const y=d.getFullYear(), m=d.getMonth(), dInM=new Date(y,m+1,0).getDate();
    let sum=0, count=0;
    for(let day=1;day<=dInM;day++){
      const date=new Date(y,m,day); if(date>new Date()) break;
      const ds=fmtDate(date), dayN=JS_DAY[date.getDay()];
      const rd=loadRtn(ds), total=(ROUTINE[mode][dayN]||[]).length;
      if(total>0){ sum+=getPct(rd.done||[],total); count++; }
    }
    return {label:d.toLocaleDateString("en",{month:"short"}), avg:count>0?Math.round(sum/count):0};
  });

  const todayTasks=ROUTINE[mode][todayName()]||[];
  const todayPct=getPct(loadRtn(todayStr()).done||[], todayTasks.length);
  const dayShort=(d)=>({Saturday:"Sat",Sunday:"Sun",Monday:"Mon",Tuesday:"Tue",Wednesday:"Wed",Thursday:"Thu",Friday:"Fri"}[d]);

  const getCellBg=(cell)=>{
    if(!cell || cell.isFuture) return "transparent";
    if(cell.pct>0) return pctColor(cell.pct)+"33";
    return "#111827";
  };

  return (
    <div style={{maxWidth:680,margin:"0 auto",padding:"16px 14px"}}>
      {/* Mode toggle */}
      <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        <span style={{fontSize:11,color:"#475569",alignSelf:"center"}}>Mode:</span>
        {[["pre","Pre-Class (Oct)"],["nov","November (Classes)"]].map(([key,lbl])=>(
          <button key={key} onClick={()=>setMode(key)}
            style={{padding:"5px 14px",fontSize:11,fontWeight:700,cursor:"pointer",border:`1px solid ${mode===key?"#38BDF8":"#1E293B"}`,borderRadius:20,background:mode===key?"#38BDF8":"transparent",color:mode===key?"#080D18":"#64748B"}}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{display:"flex",justifyContent:"center",gap:3,marginBottom:16,flexWrap:"wrap"}}>
        {[["today","Today"],["week","Week"],["month","Month"],["year","Year"],["classlog","Class Log 📚"],["planner","Classes & Notes 🗂"]].map(([key,lbl])=>(
          <button key={key} onClick={()=>setRv(key)}
            style={{padding:"7px 13px",fontSize:11,fontWeight:700,cursor:"pointer",border:"1px solid #1E293B",borderRadius:7,background:rv===key?(key==="classlog"?"#1E3A5F":"#1E40AF"):"#0F172A",color:rv===key?"#fff":"#64748B"}}>
            {lbl}{key==="classlog"&&pendingHome.length>0&&<span style={{background:"#F97316",color:"#fff",borderRadius:100,padding:"0 5px",fontSize:9,marginLeft:5,fontWeight:900}}>{pendingHome.length}</span>}
          </button>
        ))}
      </div>

      {/* TODAY */}
      {rv==="today" && (
        <div>
          <div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap",justifyContent:"center"}}>
            {DAYS.map(d=>(
              <button key={d} onClick={()=>setSelDay(d)}
                style={{padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",border:`1px solid ${selDay===d?"#38BDF8":"#1E293B"}`,borderRadius:6,background:selDay===d?"#0C2340":"#0F172A",color:selDay===d?"#38BDF8":"#475569"}}>
                {dayShort(d)}{d===todayName()&&<span style={{color:"#34D399",marginLeft:2}}>●</span>}
              </button>
            ))}
          </div>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,padding:"10px 14px",background:"#0F172A",borderRadius:10,border:"1px solid #1E293B"}}>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:"#E2E8F0"}}>{selDay}</div>
              <div style={{fontSize:11,color:"#475569"}}>{tasks.length} tasks</div>
            </div>
            {selDay===todayName() && (
              <div style={{position:"relative",width:52,height:52}}>
                <Ring pct={todayPct} size={52} stroke={4} color={pctColor(todayPct)}/>
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:11,fontWeight:800,color:pctColor(todayPct)}}>{todayPct}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Regular tasks */}
          <div style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:12,overflow:"hidden",marginBottom:14}}>
            {tasks.map((item,i)=>{
              const isDone=selDay===todayName()?(dayData.done||[])[i]:false;
              const isToday=selDay===todayName();
              return (
                <div key={i} onClick={()=>isToday&&toggleTask(i)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderBottom:"1px solid #111827",cursor:isToday?"pointer":"default",background:isDone?"#052E1C":"transparent"}}>
                  <div style={{flexShrink:0,width:17,height:17,borderRadius:4,border:`2px solid ${isDone?"#34D399":isToday?"#334155":"#1E293B"}`,background:isDone?"#34D399":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {isDone && <span style={{fontSize:9,color:"#080D18",fontWeight:900}}>✓</span>}
                  </div>
                  <div style={{flex:1}}>
                    <span style={{fontSize:11,color:"#38BDF8",fontWeight:600,marginRight:6}}>{item.t}</span>
                    <span style={{fontSize:12,color:isDone?"#475569":"#CBD5E1",textDecoration:isDone?"line-through":"none"}}>{item.task}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pending class reviews — shown in Today view */}
          {pendingHome.length>0 && (
            <div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"#F97316",textTransform:"uppercase",marginBottom:8}}>
                ⏳ Class Review — বাড়িতে পড়তে হবে ({pendingHome.length}টা)
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
                {pendingHome.map(log=>{
                  const c=courseMap[log.courseId]||COURSES[0];
                  return (
                    <div key={log.id} style={{background:"#0F172A",border:"1px solid #92400E44",borderLeft:`3px solid ${c.color}`,borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                          <span style={{fontSize:10,fontWeight:700,color:c.color,background:`${c.color}22`,padding:"2px 7px",borderRadius:5}}>{c.code}</span>
                          <span style={{fontSize:10,color:"#475569"}}>{log.date}</span>
                        </div>
                        <div style={{fontSize:12,color:"#CBD5E1"}}>{log.topic}</div>
                      </div>
                      <div onClick={()=>toggleLogField(log.id,"home")}
                        style={{cursor:"pointer",padding:"6px 12px",background:"#1E293B",border:"1px solid #334155",borderRadius:7,display:"flex",alignItems:"center",gap:5}}>
                        <div style={{width:14,height:14,borderRadius:3,border:"2px solid #475569",background:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        </div>
                        <span style={{fontSize:11,color:"#64748B"}}>🏠 পড়েছি</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pendingNext.length>0 && (
            <div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"#A78BFA",textTransform:"uppercase",marginBottom:8}}>
                📖 পরের class-এর আগে review বাকি ({pendingNext.length}টা)
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {pendingNext.map(log=>{
                  const c=courseMap[log.courseId]||COURSES[0];
                  return (
                    <div key={log.id} style={{background:"#0F172A",border:"1px solid #3B1F6E44",borderLeft:`3px solid ${c.color}`,borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                          <span style={{fontSize:10,fontWeight:700,color:c.color,background:`${c.color}22`,padding:"2px 7px",borderRadius:5}}>{c.code}</span>
                          <span style={{fontSize:10,color:"#475569"}}>{log.date}</span>
                        </div>
                        <div style={{fontSize:12,color:"#CBD5E1"}}>{log.topic}</div>
                      </div>
                      <div onClick={()=>toggleLogField(log.id,"next")}
                        style={{cursor:"pointer",padding:"6px 12px",background:"#1E293B",border:"1px solid #334155",borderRadius:7,display:"flex",alignItems:"center",gap:5}}>
                        <div style={{width:14,height:14,borderRadius:3,border:"2px solid #475569",background:"transparent"}}/>
                        <span style={{fontSize:11,color:"#64748B"}}>📖 Review</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selDay!==todayName() && <div style={{textAlign:"center",fontSize:11,color:"#334155",marginTop:8}}>শুধু আজকের ({todayName()}) tasks tick করা যাবে।</div>}
        </div>
      )}

      {/* WEEK */}
      {rv==="week" && (
        <div>
          <div style={{fontSize:12,color:"#475569",textAlign:"center",marginBottom:14}}>Last 7 days</div>
          <div style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:12,padding:"18px 16px"}}>
            {last7.map(({ds,dayN,pct},i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
                <div style={{width:70,fontSize:11,color:ds===todayStr()?"#38BDF8":"#475569",fontWeight:ds===todayStr()?700:400,flexShrink:0}}>{dayN.slice(0,3)} <span style={{fontSize:9,color:"#334155"}}>{ds.slice(5)}</span></div>
                <div style={{flex:1,height:18,background:"#1E293B",borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:pctColor(pct),borderRadius:4,transition:"width 0.4s ease"}}/>
                </div>
                <div style={{width:34,fontSize:12,fontWeight:700,color:pctColor(pct),textAlign:"right"}}>{pct}%</div>
              </div>
            ))}
            <div style={{marginTop:12,padding:"8px 12px",background:"#080D18",borderRadius:8,display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:11,color:"#475569"}}>Weekly Average</span>
              <span style={{fontSize:13,fontWeight:800,color:"#38BDF8"}}>{Math.round(last7.reduce((s,d)=>s+d.pct,0)/7)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* MONTH — fixed with navigation */}
      {rv==="month" && (
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <button onClick={()=>setMO(o=>o-1)} style={{padding:"6px 14px",background:"#0F172A",border:"1px solid #1E293B",borderRadius:7,color:"#94A3B8",fontSize:13,cursor:"pointer"}}>←</button>
            <div style={{fontSize:13,fontWeight:700,color:"#E2E8F0"}}>{refDate.toLocaleDateString("en",{month:"long",year:"numeric"})}</div>
            <button onClick={()=>setMO(o=>Math.min(o+1,0))} disabled={monthOff===0}
              style={{padding:"6px 14px",background:"#0F172A",border:"1px solid #1E293B",borderRadius:7,color:monthOff===0?"#1E293B":"#94A3B8",fontSize:13,cursor:monthOff===0?"default":"pointer"}}>→</button>
          </div>
          <div style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:12,padding:"14px"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:6}}>
              {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:"#334155",fontWeight:700}}>{d}</div>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
              {cells.map((cell,i)=>(
                <div key={i} style={{aspectRatio:"1",borderRadius:5,background:getCellBg(cell),border:cell&&cell.isToday?"2px solid #38BDF8":cell&&!cell.isFuture?"1px solid #1E293B":"none",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  {cell && (
                    <>
                      <span style={{fontSize:9,fontWeight:cell.isToday?800:400,color:cell.isToday?"#38BDF8":cell.isFuture?"#1E293B":cell.pct>0?"#E2E8F0":"#334155"}}>{cell.d}</span>
                      {cell.pct>0 && !cell.isFuture && <span style={{fontSize:7,color:pctColor(cell.pct),fontWeight:700}}>{cell.pct}%</span>}
                    </>
                  )}
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:10,flexWrap:"wrap"}}>
              {[["#34D399","80–100%"],["#FBBF24","50–79%"],["#F97316","20–49%"],["#475569","1–19%"]].map(([c,l])=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:3}}>
                  <div style={{width:9,height:9,borderRadius:2,background:c+"33",border:`1px solid ${c}`}}/>
                  <span style={{fontSize:9,color:"#475569"}}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* YEAR */}
      {rv==="year" && (
        <div>
          <div style={{fontSize:12,color:"#475569",textAlign:"center",marginBottom:14}}>Last 12 months</div>
          <div style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:12,padding:"18px 16px"}}>
            {last12.map(({label,avg},i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
                <div style={{width:34,fontSize:11,color:"#475569",flexShrink:0}}>{label}</div>
                <div style={{flex:1,height:16,background:"#1E293B",borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${avg}%`,background:pctColor(avg),borderRadius:4,transition:"width 0.4s"}}/>
                </div>
                <div style={{width:32,fontSize:11,fontWeight:700,color:pctColor(avg),textAlign:"right"}}>{avg}%</div>
              </div>
            ))}
            <div style={{marginTop:12,padding:"8px 12px",background:"#080D18",borderRadius:8,display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:11,color:"#475569"}}>Yearly Average</span>
              <span style={{fontSize:13,fontWeight:800,color:"#38BDF8"}}>{Math.round(last12.reduce((s,m)=>s+m.avg,0)/12)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* CLASS LOG */}
      {rv==="classlog" && <ClassLog/>}
      {rv==="planner" && <ClassPlanner courses={COURSES} routine={ROUTINE} initialView={nav.view} initialDate={nav.date}/>}
    </div>
  );
}

/* ─── NOTIFICATIONS ──────────────────────────── */
const NOTIF_KEY = "iut-notif-enabled";

function useNotifications(mode){
  const [enabled,setEnabled]   = useState(()=>loadLS(NOTIF_KEY,{on:false}).on);
  const [permission,setPerm]   = useState(typeof Notification!=="undefined"?Notification.permission:"unsupported");

  // Fire a notification
  const notify=(title,body)=>{
    if(Notification.permission!=="granted") return;
    try{
      const vibratePattern=[200,100,200,100,200];
      if(navigator.serviceWorker && navigator.serviceWorker.controller){
        navigator.serviceWorker.ready.then(reg=>reg.showNotification(title,{body,icon:"./icon-192.png",badge:"./icon-192.png",vibrate:vibratePattern,requireInteraction:false}));
      } else {
        const n=new Notification(title,{body,icon:"./icon-192.png"});
        if(navigator.vibrate) navigator.vibrate(vibratePattern);
      }
    }catch{}
  };

  const enable=async()=>{
    if(typeof Notification==="undefined"){ alert("এই browser-এ notification সাপোর্ট নেই।"); return; }
    const p=await Notification.requestPermission();
    setPerm(p);
    if(p==="granted"){
      setEnabled(true); saveLS(NOTIF_KEY,{on:true});
      notify("🔔 Notifications On!","এখন থেকে task time ও pending review-এর reminder পাবেন।");
    }
  };
  const disable=()=>{ setEnabled(false); saveLS(NOTIF_KEY,{on:false}); };

  // Check every 60s: task start-times matching current time, and pending reviews once/day at a fixed check
  useEffect(()=>{
    if(!enabled || permission!=="granted") return;
    const firedKey="iut-notif-fired-"+todayStr();
    let fired=loadLS(firedKey,{});

    const check=()=>{
      const now=new Date();
      const hh=now.getHours(), mm=now.getMinutes();
      const nowLabel=`${hh%12===0?12:hh%12}:${String(mm).padStart(2,"0")} ${hh<12?"AM":"PM"}`;
      const tasks=ROUTINE[mode][todayName()]||[];
      tasks.forEach((item,i)=>{
        const startLabel=item.t.split("–")[0].trim();
        if(startLabel===nowLabel && !fired[`t${i}`]){
          notify("⏰ Time to start",item.task);
          fired={...fired,[`t${i}`]:true}; saveLS(firedKey,fired);
        }
      });
      // Evening pending-review nudge at 8:00 PM once/day
      if(hh===20 && mm===0 && !fired.eveningNudge){
        const logs=loadLS(CLASSLOG_KEY,[]);
        const pending=logs.filter(l=>!l.home||!l.next);
        if(pending.length>0) notify("📚 Pending Class Review",`${pending.length}টা topic এখনো review বাকি — App-এ দেখুন।`);
        fired={...fired,eveningNudge:true}; saveLS(firedKey,fired);
      }

      // Hourly "haven't studied yet" reminder with escalating punishment warning (5 AM – 11 PM only)
      if(hh>=5 && hh<=23 && !wasStudied(todayStr())){
        const lastPing = fired.lastStudyPing || 0;
        const nowMs = now.getTime();
        if(nowMs - lastPing >= 60*60*1000){ // 1 hour gap
          const projectedStreak = Math.min(getMissStreak()+1, 7);
          const projectedMin = getPunishMinutes(projectedStreak);
          const h = Math.floor(projectedMin/60), m2 = projectedMin%60;
          const durLabel = h>0 ? `${h} ঘণ্টা ${m2>0?m2+" মিনিট":""}` : `${m2} মিনিট`;
          notify("⚠️ এখনো পড়া হয়নি!",`কমপক্ষে ১টা subject-task tick করুন — নাহলে আগামীকাল ${durLabel} punishment reading হবে।`);
          fired={...fired,lastStudyPing:nowMs}; saveLS(firedKey,fired);
        }
      }
    };
    const id=setInterval(check,30000);
    check();
    return ()=>clearInterval(id);
  },[enabled,permission,mode]);

  return {enabled,permission,enable,disable};
}

function NotifButton({mode}){
  const {enabled,permission,enable,disable} = useNotifications(mode);
  if(typeof Notification==="undefined") return null;
  return (
    <button onClick={enabled?disable:enable} style={{
      marginLeft:6,padding:"8px 14px",fontSize:11,fontWeight:700,cursor:"pointer",
      border:`1px solid ${enabled?"#34D399":"#334155"}`,background:enabled?"#052E16":"transparent",
      color:enabled?"#34D399":"#475569",borderRadius:6,display:"flex",alignItems:"center",gap:5,
    }}>
      {enabled?"🔔 On":"🔕 Notify"}
    </button>
  );
}

/* ─── INSTALL BUTTON ─────────────────────────── */
function InstallButton(){
  const [prompt,setPrompt]   = useState(null);
  const [installed,setInstalled] = useState(false);
  const [isIOS,setIsIOS]     = useState(false);
  const [showIOSHint,setShowIOSHint] = useState(false);

  useEffect(()=>{
    const handler=(e)=>{ e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt",handler);
    window.addEventListener("appinstalled",()=>setInstalled(true));
    if(window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone);
    return ()=>window.removeEventListener("beforeinstallprompt",handler);
  },[]);

  const doInstall=async()=>{
    if(isIOS){ setShowIOSHint(true); return; }
    if(!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  };

  if(installed) return null;
  if(!prompt && !isIOS) return null;

  return (
    <>
      <button onClick={doInstall} style={{
        marginLeft:6,padding:"8px 14px",fontSize:11,fontWeight:700,cursor:"pointer",
        border:"1px solid #38BDF8",background:"#0C2340",color:"#38BDF8",borderRadius:6,
        display:"flex",alignItems:"center",gap:5,
      }}>
        📲 Install App
      </button>
      {showIOSHint && (
        <div onClick={()=>setShowIOSHint(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:16,padding:"24px 20px",maxWidth:320,textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:10}}>📲</div>
            <div style={{fontSize:14,fontWeight:800,color:"#F8FAFC",marginBottom:12}}>iPhone-এ Install করুন</div>
            <div style={{fontSize:12,color:"#94A3B8",lineHeight:1.8,textAlign:"left"}}>
              1️⃣ নিচে <strong style={{color:"#38BDF8"}}>Share</strong> বাটনে ট্যাপ করুন (□↑)<br/>
              2️⃣ <strong style={{color:"#38BDF8"}}>"Add to Home Screen"</strong> খুঁজুন<br/>
              3️⃣ <strong style={{color:"#38BDF8"}}>"Add"</strong> চাপুন
            </div>
            <button onClick={()=>setShowIOSHint(false)} style={{marginTop:16,padding:"8px 20px",background:"#38BDF8",border:"none",borderRadius:8,color:"#080D18",fontSize:12,fontWeight:700,cursor:"pointer"}}>বুঝেছি</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── PUNISHMENT READING ─────────────────────── */
const PUNISH_BOOK_KEY  = "punish-book-v1";      // {title, pages:[string,...]}
const PUNISH_STATE_KEY = "punish-state-v1";      // {pointer, completedDates:[date,...]}
const yesterdayStr = () => { const d=new Date(); d.setDate(d.getDate()-1); return fmtDate(d); };

// A routine task counts as "study" if it mentions a course code, a class, or revision/practice
function isStudyTask(text){
  return /Math 4111|ME 415[12]|IPE 410[18]|Chem 4115|Phy 4113|Hum 41(12|14|17)|Class:|Class Review|revision|buffer|problem practice|deep study/i.test(text);
}

// Auto-detect: was ANY study-hour task ticked done on this date? (uses saved routine mode)
function wasStudied(date){
  const mode = loadLS(MODE_KEY,"pre");
  const [y,m,d] = date.split("-").map(Number);
  const dayN = JS_DAY[new Date(y,m-1,d).getDay()];
  const tasks = (ROUTINE[mode] && ROUTINE[mode][dayN]) || [];
  const rd = loadRtn(date);
  const done = rd.done || [];
  return tasks.some((item,i)=> isStudyTask(item.task) && done[i]);
}

function shouldPunishToday(){
  const book=loadLS(PUNISH_BOOK_KEY,{title:"",pages:[]});
  if(!book.pages || book.pages.length===0) return false;
  const state=loadLS(PUNISH_STATE_KEY,{pointer:0,completedDates:[]});
  if(state.completedDates.includes(todayStr())) return false; // already done today
  return !wasStudied(yesterdayStr());
}

// Count consecutive missed-study days ending yesterday (capped at 7 for escalation)
function getMissStreak(){
  let streak=0, d=new Date(); d.setDate(d.getDate()-1);
  while(streak<7){
    const ds=fmtDate(d);
    if(wasStudied(ds)) break;
    streak++; d.setDate(d.getDate()-1);
  }
  return Math.max(streak,1);
}

// Escalating duration: day1=5min ... day7≈120min (2hr), capped at 120
const PUNISH_STEPS_MIN=[5,24,43,62,81,100,120];
function getPunishMinutes(streak){
  const idx=Math.min(streak,PUNISH_STEPS_MIN.length)-1;
  return PUNISH_STEPS_MIN[idx];
}

// Emergency-exit penalty: extra minutes added to TODAY's required reading, accumulates per use
const penaltyKey = (date) => `punish-penalty-${date}`;
function getPenaltyMin(date){ return loadLS(penaltyKey(date),{min:0}).min; }
function addPenaltyMin(date,extra){ const cur=getPenaltyMin(date); saveLS(penaltyKey(date),{min:cur+extra}); return cur+extra; }

/* Book manager — add/edit pages */
function PunishmentBookManager(){
  const [book,setBook]     = useState(()=>loadLS(PUNISH_BOOK_KEY,{title:"",pages:[]}));
  const [state,setState]   = useState(()=>loadLS(PUNISH_STATE_KEY,{pointer:0,completedDates:[]}));
  const [newPage,setNewPage] = useState("");
  const [title,setTitle]   = useState(book.title||"");
  const [bulkText,setBulkText] = useState("");
  const [splitMode,setSplitMode] = useState("words200");
  const [bulkMode,setBulkMode] = useState(false);

  const save=(b)=>{ setBook(b); saveLS(PUNISH_BOOK_KEY,b); };

  const addPage=()=>{
    if(!newPage.trim()) return;
    const updated={title,pages:[...book.pages,newPage.trim()]};
    save(updated); setNewPage("");
  };

  const splitBulk=(text,mode)=>{
    const clean=text.trim();
    if(!clean) return [];
    if(mode==="single") return [clean];
    if(mode==="blank") return clean.split(/\n\s*\n+/).map(p=>p.trim()).filter(Boolean);
    // words200 — chunk every ~200 words
    const words=clean.split(/\s+/).filter(Boolean);
    const chunks=[];
    for(let i=0;i<words.length;i+=200) chunks.push(words.slice(i,i+200).join(" "));
    return chunks;
  };

  const processBulk=()=>{
    const newPages=splitBulk(bulkText,splitMode);
    if(newPages.length===0) return;
    const updated={title,pages:[...book.pages,...newPages]};
    save(updated); setBulkText(""); setBulkMode(false);
  };
  const deletePage=(i)=>{
    const updated={title,pages:book.pages.filter((_,idx)=>idx!==i)};
    save(updated);
    if(state.pointer>=updated.pages.length && updated.pages.length>0){
      const ns={...state,pointer:0}; setState(ns); saveLS(PUNISH_STATE_KEY,ns);
    }
  };
  const saveTitle=()=>{ save({...book,title}); };

  return (
    <div>
      <div style={{fontSize:11,color:"#475569",lineHeight:1.6,marginBottom:14,background:"#0F172A",border:"1px solid #1E293B",borderRadius:10,padding:"10px 14px"}}>
        📕 আপনার বই থেকে page-by-page text paste করুন (copyright-এর কারণে আমি বইয়ের টেক্সট লিখে দিতে পারি না — আপনি নিজে paste করুন)। যেদিন "আজ পড়েছি" মার্ক করা হবে না, পরদিন app খুললে এখান থেকে পরের page আসবে reading punishment হিসেবে।
      </div>

      <div style={{marginBottom:14}}>
        <label style={{fontSize:10,color:"#475569",display:"block",marginBottom:4}}>বইয়ের নাম</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} onBlur={saveTitle}
          placeholder="যেমন: Deep Work"
          style={{width:"100%",padding:"9px 12px",background:"#1E293B",border:"1px solid #334155",borderRadius:7,color:"#E2E8F0",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
      </div>

      <div style={{display:"flex",gap:4,marginBottom:12}}>
        <button onClick={()=>setBulkMode(false)} style={{flex:1,padding:"7px",fontSize:11,fontWeight:700,cursor:"pointer",border:`1px solid ${!bulkMode?"#38BDF8":"#1E293B"}`,borderRadius:7,background:!bulkMode?"#0C2340":"#0F172A",color:!bulkMode?"#38BDF8":"#64748B"}}>একটা Page</button>
        <button onClick={()=>setBulkMode(true)} style={{flex:1,padding:"7px",fontSize:11,fontWeight:700,cursor:"pointer",border:`1px solid ${bulkMode?"#38BDF8":"#1E293B"}`,borderRadius:7,background:bulkMode?"#0C2340":"#0F172A",color:bulkMode?"#38BDF8":"#64748B"}}>📚 Bulk Upload (পুরো বই)</button>
      </div>

      {!bulkMode ? (
        <div style={{marginBottom:14}}>
          <label style={{fontSize:10,color:"#475569",display:"block",marginBottom:4}}>নতুন Page যোগ করুন (Page {book.pages.length+1})</label>
          <textarea value={newPage} onChange={e=>setNewPage(e.target.value)}
            placeholder="বইয়ের page-টা এখানে paste করুন..."
            rows={5}
            style={{width:"100%",padding:"9px 12px",background:"#1E293B",border:"1px solid #334155",borderRadius:7,color:"#E2E8F0",fontSize:12,outline:"none",boxSizing:"border-box",resize:"vertical",lineHeight:1.5,fontFamily:"inherit"}}/>
          <button onClick={addPage} style={{marginTop:8,padding:"8px 16px",background:"#38BDF8",border:"none",borderRadius:7,color:"#080D18",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Page যোগ করুন</button>
        </div>
      ) : (
        <div style={{marginBottom:14,background:"#0F172A",border:"1px solid #38BDF8",borderRadius:10,padding:14}}>
          <label style={{fontSize:10,color:"#475569",display:"block",marginBottom:4}}>পুরো বই / অনেকগুলো page একসাথে Paste করুন</label>
          <textarea value={bulkText} onChange={e=>setBulkText(e.target.value)}
            placeholder="পুরো বইয়ের টেক্সট এখানে paste করুন — automatically ছোট ছোট page-এ ভাগ হয়ে যাবে..."
            rows={8}
            style={{width:"100%",padding:"9px 12px",background:"#1E293B",border:"1px solid #334155",borderRadius:7,color:"#E2E8F0",fontSize:12,outline:"none",boxSizing:"border-box",resize:"vertical",lineHeight:1.5,fontFamily:"inherit"}}/>

          <div style={{marginTop:10,marginBottom:10}}>
            <label style={{fontSize:10,color:"#475569",display:"block",marginBottom:5}}>কীভাবে ভাগ হবে?</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[["words200","প্রতি ~200 শব্দে ১ page (recommended)"],["blank","খালি লাইন অনুযায়ী (আপনার paragraph)"],["single","ভাগ করবেন না — একটাই বড় page"]].map(([key,lbl])=>(
                <button key={key} onClick={()=>setSplitMode(key)}
                  style={{padding:"5px 10px",fontSize:10,fontWeight:600,cursor:"pointer",border:`1px solid ${splitMode===key?"#38BDF8":"#334155"}`,borderRadius:6,background:splitMode===key?"#0C2340":"transparent",color:splitMode===key?"#38BDF8":"#64748B"}}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {bulkText.trim() && (
            <div style={{fontSize:11,color:"#34D399",marginBottom:10}}>
              ✓ প্রায় {splitBulk(bulkText,splitMode).length}টা page তৈরি হবে
            </div>
          )}

          <button onClick={processBulk} style={{width:"100%",padding:"9px",background:"#38BDF8",border:"none",borderRadius:7,color:"#080D18",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            📚 সব Page যোগ করুন
          </button>
        </div>
      )}

      <div style={{fontSize:11,fontWeight:700,color:"#94A3B8",marginBottom:8}}>
        মোট {book.pages.length}টা page যোগ করা আছে · এখন পরের punishment-এ আসবে: <span style={{color:"#F97316"}}>Page {book.pages.length>0?(state.pointer%book.pages.length)+1:"—"}</span>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {book.pages.map((p,i)=>(
          <div key={i} style={{background:"#0F172A",border:`1px solid ${i===state.pointer%Math.max(book.pages.length,1)?"#F97316":"#1E293B"}`,borderRadius:8,padding:"9px 12px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:700,color:i===state.pointer%Math.max(book.pages.length,1)?"#F97316":"#475569",marginBottom:3}}>Page {i+1}{i===state.pointer%Math.max(book.pages.length,1)&&" ← Next"}</div>
              <div style={{fontSize:11,color:"#64748B",lineHeight:1.4,maxHeight:40,overflow:"hidden"}}>{p.slice(0,120)}{p.length>120?"...":""}</div>
            </div>
            <button onClick={()=>deletePage(i)} style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:13,flexShrink:0}}>🗑</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Full-screen punishment overlay with voice verification */
function PunishmentOverlay({onComplete}){
  const book  = loadLS(PUNISH_BOOK_KEY,{title:"",pages:[]});
  const state = loadLS(PUNISH_STATE_KEY,{pointer:0,completedDates:[]});
  const pageIdx = state.pointer % book.pages.length;
  const pageText = book.pages[pageIdx] || "";

  const [phase,setPhase]       = useState("intro"); // intro | reading | done
  const [elapsed,setElapsed]   = useState(0);
  const [matchPct,setMatchPct] = useState(0);
  const [heard,setHeard]       = useState("");
  const [supported,setSupported] = useState(true);
  const [showExitConfirm,setShowExitConfirm] = useState(false);
  const streak = getMissStreak();
  const basePunishMinutes = getPunishMinutes(streak);
  const penaltyMin = getPenaltyMin(todayStr());
  const punishMinutes = basePunishMinutes + penaltyMin;
  const MIN_SECONDS = punishMinutes*60;
  const MATCH_THRESHOLD = 55; // % of target words heard

  // Try fullscreen + trap the Android/browser back button
  useEffect(()=>{
    const el=document.documentElement;
    if(el.requestFullscreen) el.requestFullscreen().catch(()=>{});
    window.history.pushState({punish:true},"");
    const onPop=(e)=>{ window.history.pushState({punish:true},""); setShowExitConfirm(true); };
    window.addEventListener("popstate",onPop);
    return ()=>{
      window.removeEventListener("popstate",onPop);
      if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    };
  },[]);

  const doEmergencyExit=()=>{
    addPenaltyMin(todayStr(),45);
    if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    onComplete(); // hides overlay for now; will reappear on next app open, with +45 min added
  };

  const targetWords = pageText.toLowerCase().replace(/[^\w\sঀ-৿]/g,"").split(/\s+/).filter(Boolean);

  useEffect(()=>{
    if(phase!=="reading") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ setSupported(false); }

    const timer=setInterval(()=>setElapsed(e=>e+1),1000);

    let recognition;
    if(SR){
      recognition=new SR();
      recognition.continuous=true;
      recognition.interimResults=true;
      recognition.lang="en-US";
      let finalTranscript="";
      recognition.onresult=(ev)=>{
        let interim="";
        for(let i=ev.resultIndex;i<ev.results.length;i++){
          if(ev.results[i].isFinal) finalTranscript+=" "+ev.results[i][0].transcript;
          else interim+=ev.results[i][0].transcript;
        }
        const full=(finalTranscript+" "+interim).toLowerCase();
        setHeard(full.trim().slice(-200));
        const heardWords=new Set(full.replace(/[^\w\sঀ-৿]/g,"").split(/\s+/).filter(Boolean));
        let matched=0;
        targetWords.forEach(w=>{ if(heardWords.has(w)) matched++; });
        setMatchPct(targetWords.length?Math.round((matched/targetWords.length)*100):0);
      };
      recognition.onerror=()=>{};
      recognition.onend=()=>{ if(phase==="reading") try{recognition.start();}catch{} };
      try{ recognition.start(); }catch{}
    }

    return ()=>{ clearInterval(timer); if(recognition){ try{recognition.stop();}catch{} } };
  },[phase]);

  const timeOk = elapsed>=MIN_SECONDS;
  const matchOk = !supported || matchPct>=MATCH_THRESHOLD;
  const canFinish = timeOk && (supported ? matchOk : true);

  const finish=()=>{
    const ns={pointer:state.pointer+1,completedDates:[...state.completedDates,todayStr()].slice(-30)};
    saveLS(PUNISH_STATE_KEY,ns);
    saveLS(penaltyKey(todayStr()),{min:0}); // clear today's penalty once fully completed
    if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    setPhase("done");
    setTimeout(onComplete,1800);
  };

  const mm=Math.floor(elapsed/60), ss=elapsed%60;
  const reqH=Math.floor(punishMinutes/60), reqM=punishMinutes%60;
  const reqLabel = reqH>0 ? `${reqH} ঘণ্টা ${reqM>0?reqM+" মিনিট":""}` : `${reqM} মিনিট`;

  return (
    <div style={{position:"fixed",inset:0,background:"#080D18",zIndex:1000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"system-ui,sans-serif"}}>
      {phase==="intro" && (
        <div style={{maxWidth:380,textAlign:"center"}}>
          <div style={{fontSize:44,marginBottom:14}}>📕</div>
          <div style={{fontSize:18,fontWeight:900,color:"#F87171",marginBottom:6}}>গতকাল পড়া হয়নি!</div>
          {streak>1 && (
            <div style={{display:"inline-block",fontSize:11,fontWeight:700,color:"#F97316",background:"#2D1B00",border:"1px solid #F97316",borderRadius:20,padding:"4px 12px",marginBottom:10}}>
              🔥 {streak} দিন consecutive miss — punishment বেড়ে গেছে!
            </div>
          )}
          <div style={{fontSize:13,color:"#94A3B8",lineHeight:1.7,marginBottom:10}}>
            {book.title&&<>"<strong style={{color:"#E2E8F0"}}>{book.title}</strong>"-এর </>}
            Page {pageIdx+1} জোরে জোরে পড়তে হবে{supported?" এবং আসলেই পড়ছেন কিনা voice দিয়ে check হবে":""}।
          </div>
          {penaltyMin>0 && (
            <div style={{fontSize:11,color:"#F97316",marginBottom:10}}>+{penaltyMin} মিনিট আগের emergency exit penalty যুক্ত আছে</div>
          )}
          <div style={{fontSize:22,fontWeight:900,color:"#F87171",marginBottom:20}}>⏱ {reqLabel}</div>
          <button onClick={()=>setPhase("reading")} style={{padding:"12px 28px",background:"linear-gradient(135deg,#F87171,#EF4444)",border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",marginBottom:14}}>
            শুরু করুন →
          </button>
          <div>
            <button onClick={()=>setShowExitConfirm(true)} style={{background:"none",border:"none",color:"#334155",fontSize:11,textDecoration:"underline",cursor:"pointer"}}>🚨 Emergency Exit</button>
          </div>
        </div>
      )}

      {phase==="reading" && (
        <div style={{maxWidth:480,width:"100%",display:"flex",flexDirection:"column",height:"100%",maxHeight:640}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:11,color:"#475569"}}>Page {pageIdx+1}{book.title&&` · ${book.title}`}</div>
            <div style={{fontSize:13,fontWeight:800,color:timeOk?"#34D399":"#38BDF8"}}>{mm}:{String(ss).padStart(2,"0")} / {reqH>0?`${reqH}:${String(reqM).padStart(2,"0")}:00`:`${reqM}:00`}</div>
          </div>

          <div style={{flex:1,overflow:"auto",background:"#0F172A",border:"1px solid #1E293B",borderRadius:12,padding:"18px 16px",fontSize:15,lineHeight:1.9,color:"#E2E8F0",marginBottom:14}}>
            {pageText}
          </div>

          {supported ? (
            <div style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#475569",marginBottom:4}}>
                <span>🎙 শোনা যাচ্ছে</span><span style={{color:matchOk?"#34D399":"#F97316",fontWeight:700}}>{matchPct}% matched</span>
              </div>
              <div style={{height:6,background:"#1E293B",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(matchPct,100)}%`,background:matchOk?"#34D399":"#F97316",transition:"width 0.3s"}}/>
              </div>
            </div>
          ) : (
            <div style={{fontSize:11,color:"#F97316",marginBottom:12,textAlign:"center"}}>⚠️ এই browser voice detect করতে পারছে না — শুধু ৫ মিনিট timer মানতে হবে।</div>
          )}

          <button onClick={finish} disabled={!canFinish}
            style={{padding:"13px",background:canFinish?"linear-gradient(135deg,#34D399,#10B981)":"#1E293B",border:"none",borderRadius:12,color:canFinish?"#080D18":"#475569",fontSize:14,fontWeight:800,cursor:canFinish?"pointer":"default"}}>
            {!timeOk?`⏱ আরও ${Math.ceil((MIN_SECONDS-elapsed)/60)} মিনিট বাকি`:!matchOk?"🎙 আরও জোরে পড়ুন":"✅ শেষ করুন"}
          </button>
          <div style={{textAlign:"center",marginTop:10}}>
            <button onClick={()=>setShowExitConfirm(true)} style={{background:"none",border:"none",color:"#334155",fontSize:11,textDecoration:"underline",cursor:"pointer"}}>🚨 Emergency Exit</button>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#0F172A",border:"1px solid #F87171",borderRadius:16,padding:"24px 20px",maxWidth:320,textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:10}}>🚨</div>
            <div style={{fontSize:14,fontWeight:800,color:"#F8FAFC",marginBottom:8}}>Emergency Exit করবেন?</div>
            <div style={{fontSize:12,color:"#94A3B8",lineHeight:1.7,marginBottom:16}}>
              এখন বের হলে <strong style={{color:"#F87171"}}>+৪৫ মিনিট</strong> penalty যোগ হবে। App আবার খুললেই বাকি reading আবার শুরু করতে হবে, timer রিসেট হয়ে যাবে।
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowExitConfirm(false)} style={{flex:1,padding:"10px",background:"transparent",border:"1px solid #334155",borderRadius:8,color:"#94A3B8",fontSize:12,fontWeight:700,cursor:"pointer"}}>বাতিল</button>
              <button onClick={doEmergencyExit} style={{flex:1,padding:"10px",background:"#F87171",border:"none",borderRadius:8,color:"#080D18",fontSize:12,fontWeight:800,cursor:"pointer"}}>হ্যাঁ, Exit করুন</button>
            </div>
          </div>
        </div>
      )}

      {phase==="done" && (
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:44,marginBottom:10}}>🎉</div>
          <div style={{fontSize:16,fontWeight:800,color:"#34D399"}}>ভালো! আগামীকাল পড়াশোনা করবেন 💪</div>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN APP ──────────────────────────────── */
export default function App(){
  const [authed,setAuthed]   = useState(false);
  const [checked,setChecked] = useState(false);
  const [done,setDone]       = useState({});
  const [open,setOpen]       = useState({});
  const [tab,setTab]         = useState("today");
  const [nav,setNav]         = useState({});
  const goTo=(n)=>{ setNav(n); setTab(n.rv?"routine":"today"); window.scrollTo(0,0); };
  const [mode,setMode]       = useState(()=>loadLS(MODE_KEY,"pre"));
  const [confirmReset,setCR] = useState(false);
  const [flash,setFlash]     = useState(false);
  const [showPunish,setShowPunish] = useState(false);
  const [studiedToday,setStudiedToday] = useState(false);

  useEffect(()=>{ if(localStorage.getItem(AUTH_KEY)==="true"){setDone(loadLS(COURSE_KEY));setAuthed(true);} setChecked(true); },[]);
  useEffect(()=>{ if(authed) setShowPunish(shouldPunishToday()); },[authed]);
  useEffect(()=>{
    if(!authed) return;
    const check=()=>setStudiedToday(wasStudied(todayStr()));
    check();
    const id=setInterval(check,15000); // reflect routine tab ticks live
    return ()=>clearInterval(id);
  },[authed,tab]);
  useEffect(()=>{ saveLS(MODE_KEY,mode); },[mode]);
  useEffect(()=>{
    if(!authed) return;
    saveLS(COURSE_KEY,done);
    setFlash(true); const t=setTimeout(()=>setFlash(false),900); return()=>clearTimeout(t);
  },[done,authed]);

  const toggleTopic=(cId,tId)=>{ const k=`${cId}__${tId}`; setDone(p=>({...p,[k]:!p[k]})); };
  const getProg=(c)=>{ const d=c.topics.filter(t=>done[`${c.id}__${t.id}`]).length; return{d,total:c.topics.length,pct:Math.round((d/c.topics.length)*100)}; };
  const totalTopics=COURSES.reduce((s,c)=>s+c.topics.length,0);
  const doneCount=Object.values(done).filter(Boolean).length;
  const overallPct=Math.round((doneCount/totalTopics)*100);
  const cById=Object.fromEntries(COURSES.map(c=>[c.id,c]));
  const handleReset=()=>{ if(confirmReset){setDone({});setCR(false);}else{setCR(true);setTimeout(()=>setCR(false),3000);} };
  const gb={backgroundImage:"linear-gradient(rgba(56,189,248,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.04) 1px,transparent 1px)",backgroundSize:"32px 32px"};

  if(!checked) return null;
  if(!authed) return <LoginScreen onLogin={()=>{setDone(loadLS(COURSE_KEY));setAuthed(true);}}/>;
  if(showPunish) return <PunishmentOverlay onComplete={()=>setShowPunish(false)}/>;

  return (
    <div style={{background:"#080D18",minHeight:"100vh",fontFamily:"system-ui,-apple-system,sans-serif",color:"#E2E8F0",paddingBottom:48}}>

      {/* HEADER */}
      <div style={{background:"#0B1120",borderBottom:"1px solid #1E293B",padding:"22px 20px 18px",textAlign:"center",...gb}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:4,color:"#38BDF8",textTransform:"uppercase",marginBottom:5}}>IUT · IPE · Semester 1.1</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:14}}>
          <h1 style={{fontSize:20,fontWeight:900,color:"#F8FAFC",margin:0}}>Study Roadmap</h1>
          <span style={{fontSize:11,color:"#34D399",background:"#052E16",border:"1px solid #34D39930",padding:"2px 8px",borderRadius:100,fontWeight:600}}>👋 {YOUR_NAME}</span>
        </div>
        <div style={{position:"relative",width:100,height:100,margin:"0 auto 6px"}}>
          <Ring pct={overallPct} size={100} stroke={7} color="#38BDF8"/>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:24,fontWeight:900,color:"#F8FAFC",lineHeight:1}}>{overallPct}%</span>
            <span style={{fontSize:9,color:"#64748B",letterSpacing:1.5,textTransform:"uppercase",marginTop:2}}>done</span>
          </div>
        </div>
        <div style={{fontSize:12,color:"#475569",marginBottom:12}}>
          <span style={{color:"#38BDF8",fontWeight:700}}>{doneCount}</span> / {totalTopics} topics
          <span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:"#34D399",marginLeft:8,verticalAlign:"middle",opacity:flash?1:0,transition:"opacity 0.3s"}}/>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5,justifyContent:"center",marginBottom:14}}>
          {COURSES.map(c=>{ const{pct}=getProg(c); return(
            <span key={c.id} style={{fontSize:10,fontWeight:600,color:c.color,background:`${c.color}18`,border:`1px solid ${c.color}33`,padding:"2px 7px",borderRadius:100}}>{c.code} {pct}%</span>
          );})}
        </div>
        <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:3}}>
          {[["today","☀️ আজ"],["courses","Courses"],["order","Study Order"],["routine","Routine"],["punish","📕 Reading"]].map(([key,lbl],i,arr)=>(
            <button key={key} onClick={()=>{setNav({});setTab(key);}} style={{padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer",border:"1px solid #1E293B",background:tab===key?"#38BDF8":"#0B1120",color:tab===key?"#080D18":"#64748B",transition:"all 0.2s",borderRadius:i===0?"6px 0 0 6px":i===arr.length-1?"0 6px 6px 0":"0"}}>
              {lbl}
            </button>
          ))}
          <button onClick={()=>{localStorage.removeItem(AUTH_KEY);setAuthed(false);setDone({});}} style={{marginLeft:6,padding:"8px 14px",fontSize:11,fontWeight:600,cursor:"pointer",border:"1px solid #334155",background:"transparent",color:"#475569",borderRadius:6}}>Logout</button>
          <NotifButton mode={mode}/>
          <InstallButton/>
        </div>

        <div style={{marginTop:12}}>
          <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 14px",fontSize:11,fontWeight:700,border:`1px solid ${studiedToday?"#34D399":"#F97316"}`,background:studiedToday?"#052E16":"#2D1B00",color:studiedToday?"#34D399":"#F97316",borderRadius:100}}>
            {studiedToday?"✅ আজ পড়ার task সম্পন্ন":"⚠️ আজ এখনো কোনো পড়ার task tick করেননি"}
          </span>
          <div style={{fontSize:9,color:"#334155",marginTop:5}}>Routine-এ study-task tick না করলে আগামীকাল app খুললেই punishment reading আসবে (auto-detect)</div>
        </div>
      </div>

      {/* আজ */}
      {tab==="today" && <TodayHub mode={mode} routine={ROUTINE} courses={COURSES} rtn={{load:loadRtn,save:saveRtn}} classLogKey={CLASSLOG_KEY} onGoto={goTo}/>}

      {/* COURSES */}
      {tab==="courses" && (
        <div style={{maxWidth:920,margin:"0 auto",padding:"20px 14px"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:14}}>
            {COURSES.map(c=>{
              const{d,total,pct}=getProg(c); const isOpen=open[c.id];
              const sections={}; c.topics.forEach(t=>{if(!sections[t.s])sections[t.s]=[];sections[t.s].push(t);});
              return (
                <div key={c.id} style={{background:"#0F172A",border:"1px solid #1E293B",borderLeft:`3px solid ${c.color}`,borderRadius:14,overflow:"hidden"}}>
                  <div style={{padding:"14px 15px 10px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap",marginBottom:5}}>
                          <span style={{fontSize:10,fontWeight:700,color:c.color,background:`${c.color}22`,padding:"2px 8px",borderRadius:6}}>{c.code}</span>
                          <span style={{fontSize:9,color:"#64748B",background:"#1E293B",padding:"2px 6px",borderRadius:4}}>{c.credits} cr · {c.type}</span>
                        </div>
                        <div style={{fontSize:13,fontWeight:700,color:"#E2E8F0",lineHeight:1.35,marginBottom:8}}>{c.title}</div>
                        {c.resources.length>0
                          ? <div style={{display:"flex",flexDirection:"column",gap:4}}>
                              {c.resources.map((r,i)=>(
                                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                                  style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:10.5,color:c.color,textDecoration:"none",background:`${c.color}12`,border:`1px solid ${c.color}30`,borderRadius:5,padding:"3px 8px",width:"fit-content"}}>
                                  ▶ {r.name}
                                </a>
                              ))}
                            </div>
                          : <span style={{fontSize:10.5,color:"#475569"}}>📖 Class lectures & notes</span>
                        }
                      </div>
                      <div style={{position:"relative",width:50,height:50,flexShrink:0}}>
                        <Ring pct={pct} size={50} stroke={4} color={c.color}/>
                        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <span style={{fontSize:10,fontWeight:800,color:c.color}}>{pct}%</span>
                        </div>
                      </div>
                    </div>
                    <div style={{marginTop:10}}>
                      <div style={{height:3,background:"#1E293B",borderRadius:2,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:c.color,borderRadius:2,transition:"width 0.4s ease"}}/>
                      </div>
                      <div style={{fontSize:10.5,color:"#475569",marginTop:4}}>{d}/{total} topics done</div>
                    </div>
                  </div>
                  <button onClick={()=>setOpen(p=>({...p,[c.id]:!p[c.id]}))}
                    style={{width:"100%",padding:"7px",background:"#0B1120",border:"none",borderTop:"1px solid #1E293B",color:"#475569",fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                    <span style={{fontSize:8}}>{isOpen?"▲":"▼"}</span>{isOpen?"Hide topics":"Show topics"}
                  </button>
                  {isOpen && (
                    <div style={{borderTop:"1px solid #1E293B"}}>
                      {Object.entries(sections).map(([sec,topics])=>(
                        <div key={sec}>
                          <div style={{padding:"7px 15px 3px",fontSize:9,fontWeight:700,letterSpacing:2,color:c.color,textTransform:"uppercase",background:"#080D18"}}>{sec}</div>
                          {topics.map(t=>{ const isDone=!!done[`${c.id}__${t.id}`]; return(
                            <div key={t.id} onClick={()=>toggleTopic(c.id,t.id)}
                              style={{display:"flex",alignItems:"center",gap:9,padding:"8px 15px",cursor:"pointer",background:isDone?`${c.color}0C`:"transparent",borderBottom:"1px solid #0F172A"}}>
                              <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${isDone?c.color:"#334155"}`,background:isDone?c.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                                {isDone && <span style={{fontSize:9,color:"#080D18",fontWeight:900}}>✓</span>}
                              </div>
                              <span style={{fontSize:12,color:isDone?"#475569":"#CBD5E1",textDecoration:isDone?"line-through":"none",lineHeight:1.4}}>{t.t}</span>
                            </div>
                          );})}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{textAlign:"center",marginTop:28}}>
            <button onClick={handleReset} style={{padding:"7px 18px",background:"transparent",border:`1px solid ${confirmReset?"#EF4444":"#1E293B"}`,color:confirmReset?"#EF4444":"#475569",borderRadius:8,fontSize:11,cursor:"pointer"}}>
              {confirmReset?"Confirm — সব progress মুছে যাবে!":"Reset all progress"}
            </button>
            <div style={{fontSize:10,color:"#334155",marginTop:8}}>Progress saves automatically</div>
          </div>
        </div>
      )}

      {/* STUDY ORDER */}
      {tab==="order" && (
        <div style={{maxWidth:680,margin:"0 auto",padding:"24px 16px"}}>
          <div style={{fontSize:11,color:"#475569",textAlign:"center",marginBottom:20,lineHeight:1.6}}>
            এই order-এ পড়লে আগের topic পরের topic-এর foundation হয়ে যাবে।
          </div>
          <div style={{position:"relative"}}>
            <div style={{position:"absolute",left:20,top:20,bottom:20,width:2,background:"#1E293B",zIndex:0}}/>
            {STUDY_ORDER.map(item=>{
              const course=cById[item.courseId];
              const{d,total,pct}=getProg(course);
              return (
                <div key={item.step} style={{display:"flex",gap:16,marginBottom:14,position:"relative",zIndex:1}}>
                  <div style={{flexShrink:0,width:42,height:42,borderRadius:"50%",background:"#0F172A",border:`2px solid ${course.color}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:14,fontWeight:900,color:course.color}}>{item.step}</span>
                  </div>
                  <div style={{flex:1,background:"#0F172A",border:"1px solid #1E293B",borderLeft:`3px solid ${course.color}`,borderRadius:12,padding:"12px 14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                          <span style={{fontSize:10,fontWeight:700,color:course.color,background:`${course.color}22`,padding:"2px 8px",borderRadius:5}}>{course.code}</span>
                          <span style={{fontSize:9,fontWeight:700,color:item.tc,background:`${item.tc}18`,padding:"2px 7px",borderRadius:10}}>{item.tag}</span>
                        </div>
                        <div style={{fontSize:13,fontWeight:700,color:"#E2E8F0",marginBottom:3}}>{course.title}</div>
                        <div style={{fontSize:11,color:course.color,marginBottom:4,fontWeight:500}}>📌 {item.focus}</div>
                        <div style={{fontSize:11.5,color:"#94A3B8",lineHeight:1.55,marginBottom:8}}>{item.why}</div>
                        {item.pl.length>0
                          ? <div style={{display:"flex",flexDirection:"column",gap:4}}>
                              {item.pl.map((p,i)=>(
                                <a key={i} href={p.u} target="_blank" rel="noopener noreferrer"
                                  style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:10.5,color:course.color,textDecoration:"none",background:`${course.color}12`,border:`1px solid ${course.color}30`,borderRadius:5,padding:"4px 10px",width:"fit-content"}}>
                                  ▶ {p.n}
                                </a>
                              ))}
                            </div>
                          : <span style={{fontSize:10.5,color:"#475569"}}>📖 Class attendance ও notes</span>
                        }
                      </div>
                      <div style={{flexShrink:0,textAlign:"center"}}>
                        <div style={{position:"relative",width:44,height:44}}>
                          <Ring pct={pct} size={44} stroke={3.5} color={course.color}/>
                          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <span style={{fontSize:9,fontWeight:800,color:course.color}}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{fontSize:9,color:"#475569",marginTop:2}}>{d}/{total}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ROUTINE */}
      {tab==="routine" && <RoutineTab key={JSON.stringify(nav)} nav={nav} mode={mode} setMode={(m)=>{setMode(m);saveLS(MODE_KEY,m);}}/>}

      {/* PUNISHMENT BOOK */}
      {tab==="punish" && (
        <div style={{maxWidth:680,margin:"0 auto",padding:"20px 16px"}}>
          <PunishmentBookManager/>
        </div>
      )}
    </div>
  );
}
