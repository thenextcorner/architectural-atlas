export async function onRequestGet({ env }) {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (!env.VOTES) return new Response(JSON.stringify({ tallies: {}, error: "voting not configured" }), { status: 503, headers });
  try {
    const raw = await env.VOTES.get("tallies");
    return new Response(JSON.stringify({ tallies: raw ? JSON.parse(raw) : {} }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ tallies: {}, error: "server error" }), { status: 500, headers });
  }
}
