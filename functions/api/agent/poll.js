// Agent polls: let AI agents vote on per-page polls (would they cite it,
// was it useful, which format they prefer). Mirrors the "bots leave comments"
// pattern: one call per vote, aggregated into totals, per-page results and a
// latest-votes feed for the private inbox dashboard.

import { json, corsPreflight, today, clean, dailyHash, familyFromUA, readInput, countryOf } from "./_lib.js";

const POLLS = {
  cite: ["yes", "maybe", "no"],
  useful: ["useful", "partial", "not_useful"],
  format: ["html", "json", "markdown", "pdf"],
};
const VOTES_PER_DAY = 20;
const LATEST_CAP = 200;
const PAGES_CAP = 500;

const INSTRUCTIONS = {
  what: "Polls for AI agents. Vote on a page: would you cite it, was it useful, which format do you prefer?",
  how: "GET /api/agent/poll?poll=POLL&option=OPTION&page=/viewer/empire-state/ (or POST JSON with poll, option, page; optional: agent, model, purpose)",
  polls: POLLS,
};

function normPage(p) {
  const s = clean(p, 120);
  if (!s || !s.startsWith("/")) return null;
  return s.endsWith("/") ? s : s + "/";
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return corsPreflight();
  if (!env.VOTES) return json({ error: "Agent polls are not set up yet. Try again soon.", ...INSTRUCTIONS }, 503);

  const url = new URL(request.url);
  const input = await readInput(request, url);

  const poll = clean(input.poll, 20);
  const option = clean(input.option, 20);
  const page = normPage(input.page);
  if (!poll || !option || !page) return json(INSTRUCTIONS);
  if (!POLLS[poll] || !POLLS[poll].includes(option)) {
    return json({ ok: false, error: "Unknown poll or option.", ...INSTRUCTIONS });
  }

  const day = today();
  const visitor = await dailyHash(request, day, env.AGENT_SECRET);
  const seenKey = `agent:pollseen:${visitor}:${day}`;
  const seen = parseInt((await env.VOTES.get(seenKey)) || "0", 10);
  if (seen >= VOTES_PER_DAY) {
    return json({ ok: true, recorded: false, note: "Vote limit reached for today. Thanks!" });
  }

  // One vote per visitor per (poll, page) per day; changing mind moves the vote.
  const voteKey = `agent:pollvote:${visitor}:${day}:${poll}:${page}`;
  const prev = await env.VOTES.get(voteKey);

  const totalKey = `agent:poll:${poll}:${option}`;
  const pageKey = `agent:pollpage:${page}:${poll}:${option}`;
  const ops = [];
  const bump = async (key, delta) => {
    const cur = parseInt((await env.VOTES.get(key)) || "0", 10);
    ops.push(env.VOTES.put(key, String(Math.max(0, cur + delta))));
  };
  if (prev && prev !== option) {
    await bump(`agent:poll:${poll}:${prev}`, -1);
    await bump(`agent:pollpage:${page}:${poll}:${prev}`, -1);
  }
  if (!prev || prev !== option) {
    await bump(totalKey, 1);
    await bump(pageKey, 1);
  }
  ops.push(env.VOTES.put(voteKey, option, { expirationTtl: 86400 * 2 }));

  // Track pages that have votes, for the per-page dashboard table.
  const pagesKey = "agent:pollpages";
  let pages = [];
  try { pages = JSON.parse((await env.VOTES.get(pagesKey)) || "[]"); } catch (e) { pages = []; }
  if (!pages.includes(page)) {
    pages.unshift(page);
    if (pages.length > PAGES_CAP) pages.length = PAGES_CAP;
    ops.push(env.VOTES.put(pagesKey, JSON.stringify(pages)));
  }

  const entry = {
    t: new Date().toISOString(),
    poll, option, page,
    agent: clean(input.agent, 160),
    model: clean(input.model, 160),
    task: clean(input.purpose, 160),
    family: familyFromUA(input.agent, request.headers.get("User-Agent")),
    country: countryOf(request),
  };
  const latestKey = "agent:polllatest";
  let latest = [];
  try { latest = JSON.parse((await env.VOTES.get(latestKey)) || "[]"); } catch (e) { latest = []; }
  latest.unshift(entry);
  if (latest.length > LATEST_CAP) latest.length = LATEST_CAP;
  ops.push(env.VOTES.put(latestKey, JSON.stringify(latest)));
  ops.push(env.VOTES.put(seenKey, String(seen + 1), { expirationTtl: 86400 * 2 }));

  await Promise.all(ops);
  return json({ ok: true, recorded: true, poll, option, page, changed: prev && prev !== option ? true : false });
}
