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
    default: throw new Error("unknown action");
  }
}

function doPost(e) {
  let out;
  try {
    const req = JSON.parse(e.postData.contents);
    if (req.secret !== SECRET) throw new Error("Secret ভুল");
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try { out = handle_(req); } finally { lock.releaseLock(); }
  } catch (err) { out = { ok: false, error: String(err && err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() { return ContentService.createTextOutput("IUT IPE cloud OK"); }
