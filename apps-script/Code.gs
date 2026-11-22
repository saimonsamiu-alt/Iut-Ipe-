/**
 * IUT IPE Class Planner — Google Sheet cloud backend
 *
 * Setup (একবারই):
 *  1. নতুন Google Sheet খুলুন → Extensions → Apps Script
 *  2. এই পুরো code paste করুন (আগের কোড মুছে), নিচের SECRET বদলান, Save
 *  3. Deploy → New deployment → ধরন: Web app
 *       Execute as: Me   |   Who has access: Anyone
 *     → Deploy → Authorize access (Advanced → Go to project → Allow)
 *  4. যে "Web app URL" পাবেন সেটা copy করে GitHub-এর src/cloud-config.js এ বসান
 */
const SECRET = "CHANGE-ME-to-your-own-secret";   // <- এখানে নিজের গোপন কোড দিন (app-এ একবার দিতে হবে)
const FOLDER_NAME = "IUT-IPE-Notes";               // PDF গুলো Google Drive-এর এই folder-এ জমা হবে
const CHUNK = 45000;                               // Sheet cell limit এড়াতে
// ── AI (Google Gemini) ─────────────────────────────────────────────────
// API key কোডে লিখবেন না: Apps Script → Project Settings → Script properties → GEMINI_API_KEY
// মডেল বদলাতে চাইলে শুধু নিচের নামটা পাল্টান (সস্তা/দ্রুত চাইলে "gemini-3.5-flash-lite")
const AI_MODEL = "gemini-3.8-flash";
const AI_MAX_FILE = 14 * 1024 * 1024;             // Gemini inline limit ~20MB (base64-এ বাড়ে), তাই এর বেশি নয়

function sheet_(name) { const ss = SpreadsheetApp.getActiveSpreadsheet(); return ss.getSheetByName(name) || ss.insertSheet(name); }
function folder_() { const it = DriveApp.getFoldersByName(FOLDER_NAME); return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME); }

/* routine + instruction + revised tick: "state" sheet-এ JSON হিসেবে */
function readState_() {
  const sh = sheet_("state"), n = sh.getLastRow();
  if (!n) return null;
  const s = sh.getRange(1, 1, n, 1).getValues().map(r => r[0]).join("");
  try { return JSON.parse(s); } catch (e) { return null; }
}
function writeState_(obj) {
  const sh = sheet_("state"), s = JSON.stringify(obj), parts = [];
  for (let i = 0; i < s.length; i += CHUNK) parts.push([s.substring(i, i + CHUNK)]);
  sh.clear();
  const r = sh.getRange(1, 1, parts.length, 1);
  r.setNumberFormat("@");
  r.setValues(parts);
}

/* PDF index: "pdfs" sheet */
function pdfSheet_() {
  const sh = sheet_("pdfs");
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, 7).setValues([["id", "occ", "ds", "subjKey", "name", "size", "fileId"]]);
  return sh;
}
function pdfRows_() {
  const sh = pdfSheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 7).getValues().map((r, i) => ({
    row: i + 2, id: String(r[0]), occ: String(r[1]), ds: String(r[2]), subj_key: String(r[3]),
    name: String(r[4]), size: Number(r[5]), path: String(r[0]), fileId: String(r[6])
  }));
}
function findPdf_(id) { return pdfRows_().find(r => r.id === id); }
function dropPdf_(id) {
  const hit = findPdf_(id);
  if (!hit) return;
  try { DriveApp.getFileById(hit.fileId).setTrashed(true); } catch (e) {}
  pdfSheet_().deleteRow(hit.row);
}

/* ───────────── AI ───────────── */
function aiKey_() {
  const k = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!k) throw new Error("GEMINI_API_KEY সেট করা নেই (Script properties-এ দিন)");
  return k;
}
// parts: [{text}] বা [{inlineData:{mimeType,data}}, {text}]
function aiCall_(system, parts, maxTokens) {
  const res = UrlFetchApp.fetch("https://generativelanguage.googleapis.com/v1beta/models/" + AI_MODEL + ":generateContent", {
    method: "post", contentType: "application/json", muteHttpExceptions: true,
    headers: { "x-goog-api-key": aiKey_() },
    payload: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: parts }],
      generationConfig: { maxOutputTokens: maxTokens || 8192, responseMimeType: "application/json" }
    })
  });
  const code = res.getResponseCode(), body = res.getContentText();
  if (code !== 200) throw new Error("AI error " + code + ": " + body.substring(0, 300));
  const j = JSON.parse(body);
  const cand = (j.candidates || [])[0];
  if (!cand || !cand.content) throw new Error("AI উত্তর দেয়নি" + (j.promptFeedback ? " (" + JSON.stringify(j.promptFeedback).substring(0, 120) + ")" : ""));
  return (cand.content.parts || []).map(function (x) { return x.text || ""; }).join("");
}
function aiJson_(text) {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("AI JSON দেয়নি");
  return JSON.parse(text.substring(a, b + 1));
}
function notesSheet_() {
  const sh = sheet_("ai_notes");
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, 2).setValues([["id", "json"]]);
  return sh;
}
function readNotes_() {
  const sh = notesSheet_(), n = sh.getLastRow(), out = {};
  if (n < 2) return out;
  sh.getRange(2, 1, n - 1, 2).getValues().forEach(function (r) { try { out[String(r[0])] = JSON.parse(r[1]); } catch (e) {} });
  return out;
}
function writeNote_(id, obj) {
  const sh = notesSheet_(), n = sh.getLastRow(), json = JSON.stringify(obj).substring(0, CHUNK);
  let row = 0;
  if (n >= 2) sh.getRange(2, 1, n - 1, 1).getValues().forEach(function (r, i) { if (String(r[0]) === id) row = i + 2; });
  if (!row) row = n + 1;
  const rg = sh.getRange(row, 1, 1, 2);
  rg.setNumberFormat("@");
  rg.setValues([[id, json]]);
}

const INGEST_SYSTEM = "তুমি একজন বিশ্ববিদ্যালয়-ছাত্রের পড়ার সহকারী। দেওয়া ফাইলটা (স্লাইড, নোট, আগের বছরের প্রশ্ন বা কোর্স আউটলাইন) পড়ে শুধু JSON ফেরত দাও, অন্য কিছু না। " +
  "ফরম্যাট: {\"kind\":\"pyq|slide|outline|note|other\",\"teacher\":\"নাম বা null\",\"topics\":[\"মূল টপিক...\"],\"exam_info\":[{\"type\":\"CT|মিড|ফাইনাল|কুইজ|অন্যান্য\",\"date\":\"YYYY-MM-DD বা null\",\"note\":\"...\"}]," +
  "\"frequent_questions\":[\"বারবার আসা প্রশ্ন/ধরন (আগের বছরের প্রশ্ন হলে)\"],\"difficulty\":\"easy|medium|hard\",\"summary\":\"১৫০ শব্দের মধ্যে বাংলায় সারাংশ\"}. " +
  "ফাইলে যা লেখা নেই তা বানাবে না: তারিখ না থাকলে null, টিচারের নাম না থাকলে null।";

function ingest_(id) {
  const hit = findPdf_(id);
  if (!hit) throw new Error("ফাইল পাওয়া যায়নি");
  const blob = DriveApp.getFileById(hit.fileId).getBlob();
  const bytes = blob.getBytes();
  if (bytes.length > AI_MAX_FILE) throw new Error("ফাইল বড় (২০MB-র বেশি), ছোট করে দিন");
  const mime = blob.getContentType() || "application/pdf";
  const b64 = Utilities.base64Encode(bytes);
  const mt = mime.indexOf("image/") === 0 ? mime : "application/pdf";
  const text = aiCall_(INGEST_SYSTEM, [
    { inlineData: { mimeType: mt, data: b64 } },
    { text: "ফাইলের নাম: " + hit.name + "\nকোর্স/ধরন (ইউজারের দেওয়া): " + hit.occ }
  ], 4096);
  const note = aiJson_(text);
  note.name = hit.name; note.at = Date.now();
  writeNote_(id, note);
  return note;
}

const PLAN_SYSTEM = "তুমি একজন কড়া কিন্তু সহানুভূতিশীল স্টাডি কোচ। ছাত্রের সব ডেটা (ক্লাস রুটিন, টিউশন রুটিন, পরীক্ষার তারিখ ও বাকি টপিক, Revision বাকি, আগের বছরের প্রশ্নের সারাংশ, কালকের অসমাপ্ত কাজ) দেওয়া হবে। " +
  "আজকের বাস্তবসম্মত প্ল্যান বানাও। নিয়ম: (১) ক্লাস ও টিউশনের সময়ে কিছু বসাবে না, শুধু ফাঁকা সময়ে বসাও; (২) যেই পরীক্ষা সবচেয়ে কাছে ও যেখানে পেছনে পড়ে আছে সেটা আগে; (৩) Revision বাকি থাকলে অন্তত একটা টাস্ক সেটার জন্য; " +
  "(৪) আগের বছরের প্রশ্নে যে টপিক বারবার এসেছে তাকে গুরুত্ব দাও; (৫) আজ যতটুকু সময় বাকি তার বেশি টাস্ক দিও না, ২০-৫০ মিনিটের টাস্ক, মাঝে ছোট বিরতি; (৬) ডেটায় যা নেই তা বানাবে না; (৭) alreadyDoneToday-র কাজ আবার দিও না, carryOverFromLastPlan থেকে জরুরিগুলো নাও। " +
  "শুধু JSON ফেরত দাও: {\"summary\":\"আজকের ফোকাস ১-২ বাক্যে\",\"tasks\":[{\"start\":\"HH:MM\",\"end\":\"HH:MM\",\"course\":\"কোর্স কোড\",\"title\":\"কী করবে (বাংলায়)\",\"why\":\"কেন এখন (১ বাক্য)\",\"type\":\"study|revision|practice|pyq|rest\"}]," +
  "\"suggestions\":[\"ছোট পরামর্শ...\"],\"warnings\":[\"ঝুঁকি/পিছিয়ে পড়ার সতর্কতা...\"]}. ভাষা বাংলা (বাংলা অক্ষরে)।";

function plan_(ctx) {
  const text = aiCall_(PLAN_SYSTEM, [{ text: JSON.stringify(ctx).substring(0, 60000) }], 8192);
  return aiJson_(text);
}

function handle_(req) {
  switch (req.action) {
    case "ping": return { ok: true };
    case "get_state": return { ok: true, state: readState_() };
    case "put_state": writeState_(req.state); return { ok: true };
    case "list_pdfs": return { ok: true, rows: pdfRows_().map(r => { delete r.fileId; delete r.row; return r; }) };
    case "put_pdf": {
      dropPdf_(req.id); // একই id আবার এলে replace
      const blob = Utilities.newBlob(Utilities.base64Decode(req.b64), "application/pdf", req.name);
      const file = folder_().createFile(blob);
      const sh = pdfSheet_(), row = sh.getLastRow() + 1, rg = sh.getRange(row, 1, 1, 7);
      rg.setNumberFormat("@");
      rg.setValues([[req.id, req.occ, req.ds, req.subjKey, req.name, String(req.size), file.getId()]]);
      return { ok: true };
    }
    case "get_pdf": {
      const hit = findPdf_(req.id);
      if (!hit) throw new Error("PDF পাওয়া যায়নি");
      return { ok: true, b64: Utilities.base64Encode(DriveApp.getFileById(hit.fileId).getBlob().getBytes()) };
    }
    case "del_pdf": dropPdf_(req.id); return { ok: true };
    case "ai_ingest": return { ok: true, note: ingest_(req.id) };
    case "ai_notes": return { ok: true, notes: readNotes_() };
    case "ai_plan": return { ok: true, plan: plan_(req.context || {}) };
    default: throw new Error("unknown action");
  }
}

function doPost(e) {
  let out;
  try {
    const req = JSON.parse(e.postData.contents);
    if (req.secret !== SECRET) throw new Error("Secret ভুল");
    if (req.action === "ai_ingest" || req.action === "ai_plan") {
      out = handle_(req);            // ধীর AI কল: lock ধরে রাখলে sync আটকে যাবে
    } else {
      const lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try { out = handle_(req); } finally { lock.releaseLock(); }
    }
  } catch (err) { out = { ok: false, error: String(err && err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() { return ContentService.createTextOutput("IUT IPE cloud OK"); }
