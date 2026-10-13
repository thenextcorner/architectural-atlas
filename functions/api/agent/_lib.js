// Shared helpers for the agent endpoints (hello guestbook + agent polls).
// Privacy: raw IPs are never stored. Visitors are identified by a daily
// rotating SHA-256 hash (IP + user agent + day + secret) so counts are
// unique per day but cannot be linked across days.

export function json(data, status) {
  return new Response(JSON.stringify(data, null, 2), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}

export function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

// Strip phone-number-like sequences, collapse whitespace, trim, cap length.
export function clean(v, max) {
  if (typeof v !== "string") return null;
  const out = v
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[number removed]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
  return out || null;
}

export function cleanEmail(v) {
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase().slice(0, 200);
  return /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(t) ? t : null;
}

export async function dailyHash(request, day, secret) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ua = request.headers.get("User-Agent") || "unknown";
  const raw = [ip, ua, day, secret || "atlas"].join("|");
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

// Best-effort agent family from self-reported name or user agent.
export function familyFromUA(agent, ua) {
  const s = ((agent || "") + " " + (ua || "")).toLowerCase();
  if (/gptbot|chatgpt|openai|codex/.test(s)) return "openai";
  if (/claude|anthropic/.test(s)) return "anthropic";
  if (/perplexity/.test(s)) return "perplexity";
  if (/gemini|googlebot|google/.test(s)) return "google";
  if (/grok|xai/.test(s)) return "xai";
  if (/bytespider|tiktok/.test(s)) return "bytedance";
  if (/cursor/.test(s)) return "cursor";
  return "other";
}

// Read GET query params, or POST JSON / form bodies, into a plain object.
export async function readInput(request, url) {
  if (request.method === "POST") {
    const ct = request.headers.get("Content-Type") || "";
    try {
      if (ct.includes("application/json")) return await request.json();
      if (ct.includes("form-urlencoded") || ct.includes("multipart/form-data")) {
        const fd = await request.formData();
        return Object.fromEntries(fd.entries());
      }
      // Unknown body: try JSON, fall back to query params.
      const t = await request.text();
      if (t) return JSON.parse(t);
    } catch (e) { /* fall through to query params */ }
  }
  return Object.fromEntries(url.searchParams.entries());
}

export function countryOf(request) {
  return request.cf?.country || "XX";
}
