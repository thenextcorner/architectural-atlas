const SLUGS = ["st-peters-basilica", "st-pauls-cathedral", "chrysler-building", "sydney-harbour-bridge", "st-basils-cathedral", "atomium", "angkor-wat", "petronas-towers", "hall-of-prayer-for-good-harvests", "christ-the-redeemer", "hagia-sophia", "dome-of-the-rock", "shanghai-tower", "sheikh-zayed-grand-mosque", "arc-de-triomphe", "domtoren", "rijksmuseum", "kubuswoningen", "stockholm-city-hall", "turning-torso", "winter-palace", "charles-bridge", "oriental-pearl-tower", "potala-palace", "marina-bay-sands", "wat-arun", "qutb-minar", "mysore-palace", "gateway-of-india", "lotus-temple", "abraj-al-bait", "great-mosque-of-djenne", "brasilia-cathedral", "sky-tower", "louvre-pyramid", "statue-of-liberty", "space-needle", "cn-tower", "milan-cathedral"];

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.VOTES) return json({ error: "Voting is not set up yet. Try again soon." }, 503);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "Bad request." }, 400); }
  const slug = body && body.slug, token = body && body.token;
  if (!slug || !SLUGS.includes(slug)) return json({ error: "Unknown structure." }, 400);
  if (!token) return json({ error: "Bot check missing." }, 400);
  if (!env.TURNSTILE_SECRET) return json({ error: "Voting is not set up yet. Try again soon." }, 503);

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  try {
    const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
    }).then((r) => r.json());
    if (!verify.success) return json({ error: "Bot check failed. Try again." }, 403);
  } catch (e) { return json({ error: "Bot check unavailable. Try again." }, 503); }

  try {
    const votedKey = "voted:" + ip + ":" + slug;
    if (await env.VOTES.get(votedKey)) return json({ error: "already voted" }, 409);
    const raw = await env.VOTES.get("tallies");
    const tallies = raw ? JSON.parse(raw) : {};
    tallies[slug] = (tallies[slug] || 0) + 1;
    await env.VOTES.put("tallies", JSON.stringify(tallies));
    await env.VOTES.put(votedKey, "1", { expirationTtl: 31536000 });
    return json({ ok: true, votes: tallies[slug], tallies });
  } catch (e) {
    return json({ error: "Server error. Try again." }, 500);
  }
}

export async function onRequestGet() {
  return json({ error: "Use POST." }, 405);
}
