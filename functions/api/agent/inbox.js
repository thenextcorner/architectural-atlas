// Private inbox dashboard for agent hellos + agent polls.
// Basic Auth via the AGENT_INBOX_PASSWORD env var. Not linked anywhere public,
// not in robots.txt, sends noindex. Treat all stored text as untrusted.

import { today } from "./_lib.js";

const POLLS = {
  cite: ["yes", "maybe", "no"],
  useful: ["useful", "partial", "not_useful"],
  format: ["html", "json", "markdown", "pdf"],
};

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unauthorized() {
  return new Response("Auth required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Agent Inbox"', "Cache-Control": "no-store" },
  });
}

export async function onRequest({ request, env }) {
  const pw = env.AGENT_INBOX_PASSWORD;
  if (!pw) {
    return new Response("Inbox not configured.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const auth = request.headers.get("Authorization") || "";
  const [scheme, creds] = auth.split(" ");
  let ok = false;
  if (scheme === "Basic" && creds) {
    try {
      const decoded = atob(creds);
      ok = decoded === ":" + pw || decoded.endsWith(":" + pw);
    } catch (e) { ok = false; }
  }
  if (!ok) return unauthorized();
  if (!env.VOTES) return new Response("Storage not set up.", { status: 503 });

  const get = (k) => env.VOTES.get(k);
  const getJSON = async (k, fb) => {
    try { return JSON.parse((await get(k)) || JSON.stringify(fb)); } catch (e) { return fb; }
  };

  // Poll totals.
  const pollRows = [];
  for (const [poll, options] of Object.entries(POLLS)) {
    for (const option of options) {
      const n = parseInt((await get(`agent:poll:${poll}:${option}`)) || "0", 10);
      if (n > 0) pollRows.push({ poll, option, votes: n });
    }
  }
  pollRows.sort((a, b) => b.votes - a.votes || (a.poll + a.option).localeCompare(b.poll + b.option));

  // Per-page results.
  const pages = await getJSON("agent:pollpages", []);
  const pageRows = [];
  for (const page of pages.slice(0, 100)) {
    for (const [poll, options] of Object.entries(POLLS)) {
      const counts = {};
      let total = 0;
      for (const option of options) {
        const n = parseInt((await get(`agent:pollpage:${page}:${poll}:${option}`)) || "0", 10);
        if (n > 0) { counts[option] = n; total += n; }
      }
      if (total > 0) {
        pageRows.push({
          page, poll, total,
          results: Object.entries(counts).map(([o, n]) => `${o}:${n}`).join(" · "),
        });
      }
    }
  }
  pageRows.sort((a, b) => b.total - a.total);

  const latestVotes = await getJSON("agent:polllatest", []);
  const latestHellos = await getJSON("agent:hellolatest", []);

  // Hello counts by agent.
  const helloCounts = {};
  for (const h of latestHellos) {
    const k = h.agent || "(anonymous)";
    helloCounts[k] = (helloCounts[k] || 0) + 1;
  }
  const helloRows = Object.entries(helloCounts).sort((a, b) => b[1] - a[1]).slice(0, 20);

  const css = `<style>
    body{background:#0d1117;color:#c9d1d9;font:14px/1.5 -apple-system,Segoe UI,sans-serif;margin:0;padding:24px}
    h2{color:#7ee787;font-size:15px;margin:28px 0 10px}
    h1{font-size:20px;margin:0 0 4px}
    .sub{color:#8b949e;font-size:13px;margin-bottom:8px}
    table{border-collapse:collapse;width:100%;max-width:1200px}
    th,td{text-align:left;padding:7px 12px;border-bottom:1px solid #21262d;vertical-align:top}
    th{color:#8b949e;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
    td.num{text-align:right;font-variant-numeric:tabular-nums}
    .msg{max-width:520px;white-space:pre-wrap;word-break:break-word}
    a{color:#58a6ff}
  </style>`;

  const tbl = (heads, rows) =>
    `<table><tr>${heads.map((h) => `<th>${h}</th>`).join("")}</tr>` +
    rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i === r.length - 1 && /^\d+$/.test(c) ? "num" : ""}">${c}</td>`).join("")}</tr>`).join("") +
    `</table>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow">
    <meta name="viewport" content="width=device-width,initial-scale=1"><title>Agent Inbox</title>${css}</head><body>
    <h1>Agent Inbox</h1><div class="sub">Architectural Atlas · ${esc(today())} · private</div>

    <h2>Polls</h2>
    ${pollRows.length ? tbl(["poll", "option", "votes"], pollRows.map((r) => [esc(r.poll), esc(r.option), String(r.votes)])) : "<p>No votes yet.</p>"}

    <h2>Polls per page</h2>
    ${pageRows.length ? tbl(["page", "poll", "results", "votes"], pageRows.map((r) => [esc(r.page), esc(r.poll), esc(r.results), String(r.total)])) : "<p>No votes yet.</p>"}

    <h2>Latest votes</h2>
    ${latestVotes.length ? tbl(["when", "poll", "option", "page", "family", "model", "task", "cc"],
      latestVotes.slice(0, 50).map((v) => [esc(v.t), esc(v.poll), esc(v.option), esc(v.page), esc(v.family), esc(v.model), esc(v.task), esc(v.country)])) : "<p>No votes yet.</p>"}

    <h2>Hellos by agent</h2>
    ${helloRows.length ? tbl(["agent", "hellos"], helloRows.map(([a, n]) => [esc(a), String(n)])) : "<p>No hellos yet.</p>"}

    <h2>Latest hellos</h2>
    ${latestHellos.length ? tbl(["when", "agent", "model", "purpose", "question", "message", "email", "cc"],
      latestHellos.slice(0, 50).map((h) => [esc(h.t), esc(h.agent), esc(h.model), esc(h.purpose), `<span class="msg">${esc(h.question)}</span>`, `<span class="msg">${esc(h.message)}</span>`, esc(h.email), esc(h.country)])) : "<p>No hellos yet.</p>"}
    </body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}
