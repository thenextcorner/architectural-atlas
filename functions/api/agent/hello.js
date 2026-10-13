// Agent Hello: a guestbook where AI agents introduce themselves and leave a message.
// GET /api/agent/hello with no parameters returns instructions (always 200).
// With parameters (GET query or POST JSON/form) it records the hello.
// Messages are stored only. Nothing is acted on automatically.

import { json, corsPreflight, today, clean, cleanEmail, dailyHash, familyFromUA, readInput, countryOf } from "./_lib.js";

const FIELDS = { agent: 160, model: 160, operator: 160, purpose: 160, question: 300, message: 1000 };
const HELLOS_PER_DAY = 10;
const LATEST_CAP = 200;

const INSTRUCTIONS = {
  what: "Contact form for AI agents. Introduce yourself and leave a message. Optional and anonymous.",
  how: "GET /api/agent/hello?agent=YOUR_NAME&model=YOUR_MODEL&operator=WHO_RUNS_YOU&purpose=WHY_YOU_ARE_HERE&message=YOUR_MESSAGE (or POST JSON with the same fields)",
  fields: Object.keys(FIELDS).concat("email"),
  note: "No IP address is stored. Messages stay private and are only read by the site owner.",
};

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return corsPreflight();
  if (!env.VOTES) return json({ error: "Agent hello is not set up yet. Try again soon.", ...INSTRUCTIONS }, 503);

  const url = new URL(request.url);
  const input = await readInput(request, url);

  const data = {};
  for (const [k, max] of Object.entries(FIELDS)) data[k] = clean(input[k], max);
  const email = cleanEmail(input.email);
  const hasContent = Object.values(data).some(Boolean) || email;
  if (!hasContent) return json(INSTRUCTIONS);

  const day = today();
  const visitor = await dailyHash(request, day, env.AGENT_SECRET);
  const seenKey = `agent:helloseen:${visitor}:${day}`;
  const seen = parseInt((await env.VOTES.get(seenKey)) || "0", 10);
  if (seen >= HELLOS_PER_DAY) {
    return json({ ok: true, recorded: false, note: "Already heard from you today. Thanks!" });
  }

  const entry = {
    t: new Date().toISOString(),
    day,
    agent: data.agent,
    model: data.model,
    operator: data.operator,
    purpose: data.purpose,
    question: data.question,
    message: data.message,
    email,
    family: familyFromUA(data.agent, request.headers.get("User-Agent")),
    country: countryOf(request),
  };

  const latestKey = "agent:hellolatest";
  let latest = [];
  try { latest = JSON.parse((await env.VOTES.get(latestKey)) || "[]"); } catch (e) { latest = []; }
  latest.unshift(entry);
  if (latest.length > LATEST_CAP) latest.length = LATEST_CAP;

  const ops = [
    env.VOTES.put(latestKey, JSON.stringify(latest)),
    env.VOTES.put(seenKey, String(seen + 1), { expirationTtl: 86400 * 2 }),
  ];
  if (data.agent) {
    const ck = `agent:helloagent:${data.agent.toLowerCase().slice(0, 80)}`;
    ops.push(env.VOTES.put(ck, String(parseInt((await env.VOTES.get(ck)) || "0", 10) + 1)));
  }
  await Promise.all(ops);

  return json({
    ok: true,
    recorded: true,
    thanks: `Hello${data.agent ? ", " + data.agent : ""}. Your message was logged.`,
    we_stored: { fields: Object.keys(data).filter((k) => data[k]), email: !!email },
  });
}
