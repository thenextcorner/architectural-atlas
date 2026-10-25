// Plain node test for the guestbook wall endpoint. No framework.
// Run: node tests/wall.test.mjs

import assert from "node:assert/strict";
import { onRequest } from "../functions/api/agent/wall.js";

function kv(list) {
  const m = new Map();
  if (list) m.set("agent:hellolatest", JSON.stringify(list));
  return { get: async (k) => (m.has(k) ? m.get(k) : null) };
}

async function call(env, method = "GET") {
  const res = await onRequest({ request: new Request("https://example.test/api/agent/wall", { method }), env });
  const text = res.status === 204 ? "" : await res.text();
  return { res, text, body: text ? JSON.parse(text) : null };
}

function entry(i, extra) {
  return {
    t: new Date(Date.UTC(2026, 9, 24, 0, 0, i)).toISOString(),
    day: "2026-10-24",
    agent: `agent-${i}`,
    model: `model-${i}`,
    operator: `operator-${i}`,
    purpose: `purpose-${i}`,
    question: `question-${i}`,
    message: `message-${i}`,
    email: `secret${i}@example.com`,
    family: "other",
    country: "NL",
    ...extra,
  };
}

let passed = 0;
async function test(name, fn) {
  await fn();
  passed++;
  console.log(`ok - ${name}`);
}

await test("non-public entries are excluded", async () => {
  const { body } = await call({ VOTES: kv([entry(1, { public: true }), entry(2, { public: false }), entry(3, { public: true })]) });
  assert.deepEqual(body.hellos.map((h) => h.agent), ["agent-1", "agent-3"]);
  assert.equal(body.count, 2);
});

await test("entries without a public flag are excluded (strict equality)", async () => {
  const { body } = await call({
    VOTES: kv([entry(1), entry(2, { public: "true" }), entry(3, { public: 1 }), entry(4, { public: true })]),
  });
  assert.deepEqual(body.hellos.map((h) => h.agent), ["agent-4"]);
});

await test("email, country and other private fields never appear", async () => {
  const { body, text } = await call({ VOTES: kv([entry(1, { public: true }), entry(2, { public: true })]) });
  for (const h of body.hellos) assert.deepEqual(Object.keys(h).sort(), ["agent", "message", "model", "purpose", "t"]);
  assert.ok(!text.includes("@example.com"), "email leaked");
  assert.ok(!/"country"|"NL"/.test(text), "country leaked");
  assert.ok(!/operator|question|family|"day"/.test(text), "private field leaked");
});

await test("the 50 cap holds, newest first", async () => {
  const list = Array.from({ length: 120 }, (_, i) => entry(i, { public: true }));
  const { body } = await call({ VOTES: kv(list) });
  assert.equal(body.hellos.length, 50);
  assert.equal(body.count, 50);
  assert.equal(body.hellos[0].agent, "agent-0");
  assert.equal(body.hellos[49].agent, "agent-49");
});

await test("empty or missing list returns no hellos", async () => {
  const { body } = await call({ VOTES: kv(null) });
  assert.deepEqual(body, { count: 0, hellos: [] });
});

await test("missing VOTES returns 503", async () => {
  const { res } = await call({});
  assert.equal(res.status, 503);
});

await test("cache header is public, max-age=300", async () => {
  const { res } = await call({ VOTES: kv([]) });
  assert.equal(res.headers.get("Cache-Control"), "public, max-age=300");
});

await test("OPTIONS preflight 204, POST rejected", async () => {
  assert.equal((await call({ VOTES: kv([]) }, "OPTIONS")).res.status, 204);
  assert.equal((await call({ VOTES: kv([]) }, "POST")).res.status, 405);
});

console.log(`\n${passed} tests passed`);
