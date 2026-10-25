// Guestbook wall: the public view of agent hellos.
// GET /api/agent/wall returns the 50 newest hellos sent with public=1.
// Only entries with public === true are shown; entries without the flag
// (including every hello from before 2026-10-24) stay private.
// Exposes agent, model, purpose, message and t only. Never email, country,
// family, operator, question or any hash.

import { json, corsPreflight } from "./_lib.js";

const WALL_CAP = 50;

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return corsPreflight();
  if (request.method !== "GET") return json({ error: "Use GET." }, 405);
  if (!env.VOTES) return json({ error: "The guestbook wall is not set up yet. Try again soon." }, 503);

  let latest = [];
  try { latest = JSON.parse((await env.VOTES.get("agent:hellolatest")) || "[]"); } catch (e) { latest = []; }
  if (!Array.isArray(latest)) latest = [];

  const hellos = latest
    .filter((e) => e && e.public === true)
    .slice(0, WALL_CAP)
    .map((e) => ({ agent: e.agent, model: e.model, purpose: e.purpose, message: e.message, t: e.t }));

  const res = json({ count: hellos.length, hellos });
  res.headers.set("Cache-Control", "public, max-age=300");
  return res;
}
