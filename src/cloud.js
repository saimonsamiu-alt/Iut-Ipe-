import { SCRIPT_URL } from "./cloud-config.js";

/* Google Sheet (Apps Script) cloud backend. URL: cloud-config.js অথবা app-এ paste; secret: app-এ একবার */
const CFG_KEY = "iut-cloud-cfg-v2";
export const hasConfigUrl = () => !!SCRIPT_URL;
export const getCfg = () => {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch {}
  return { url: SCRIPT_URL || s.url || "", secret: s.secret || "" };
};
export const setCfg = cfg => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch {} };

async function call(action, payload = {}) {
  const { url, secret } = getCfg();
  if (!url || !secret) throw new Error("Script URL আর secret লাগবে");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // preflight এড়াতে
    body: JSON.stringify({ secret, action, ...payload }),
  });
  let j;
  try { j = await res.json(); } catch { throw new Error("Script থেকে সঠিক উত্তর আসেনি (Deploy → Anyone access ঠিক আছে?)"); }
  if (!j.ok) throw new Error(j.error || "cloud error");
  return j;
}

const SHEET_USER = { id: "sheet", email: "Google Sheet" };
export async function currentUser() { const c = getCfg(); return c.url && c.secret ? SHEET_USER : null; }
export async function connect() { await call("ping"); return SHEET_USER; }
export async function signOut() { const c = getCfg(); setCfg({ url: c.url, secret: "" }); }

export async function pullState() { return (await call("get_state")).state || null; }
export async function pushState(_u, { schedule, meta, ts }) { await call("put_state", { state: { schedule, meta, ts } }); }

export async function listRemotePdfs() { return (await call("list_pdfs")).rows || []; }

const toB64 = blob => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(",")[1]);
  r.onerror = () => rej(r.error);
  r.readAsDataURL(blob);
});
export async function uploadPdf(_u, rec) {
  await call("put_pdf", { id: rec.id, occ: rec.occ, ds: rec.ds, subjKey: rec.subjKey, name: rec.name, size: rec.size, b64: await toB64(rec.blob) });
  return rec.id; // path = id
}
export async function downloadPdf(path) {
  const { b64 } = await call("get_pdf", { id: path });
  const bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "application/pdf" });
}
export async function deleteRemotePdf(path, id) { await call("del_pdf", { id: id || path }); }
