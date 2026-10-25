"""Inject the consent-gated GTM loader into the static Atlas pages.

The React app shell (homepage, viewer pages) already carries the consent
banner and GTM injection from app/consent.tsx. The static pages
(about, launch, leaderboard, candidates, guestbook, privacy, cookies,
terms, 404) do not load the app bundle, so they get this standalone
snippet instead. It uses the same rules on purpose:

- Same GTM container: GTM-P4X33Q7D.
- Same consent cookie: atlas_consent, Path=/, 12 months, SameSite=Lax,
  so a choice made on any page carries across the whole site.
- GTM loads only after the visitor accepts statistics cookies.
- No cookie choice yet shows the banner; reject sets the cookie and
  loads nothing.

Idempotent: pages already carrying the marker comment are skipped.
Run from the repo root: python3 scripts/inject-static-analytics.py
"""

import os
import sys

GTM_ID = "GTM-P4X33Q7D"
COOKIE = "atlas_consent"
MAX_AGE = 60 * 60 * 24 * 365

MARKER = "<!-- atlas-consent-static -->"

CSS = """
<style>
.atlas-consent{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#20242b;color:#fff;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.5;padding:14px 16px;display:none}
.atlas-consent p{margin:0 0 10px;max-width:720px}
.atlas-consent a{color:#fff;text-decoration:underline}
.atlas-consent button{border:0;border-radius:999px;padding:8px 18px;font-size:14px;font-weight:600;cursor:pointer;margin-right:8px}
.atlas-consent .accept{background:#fff;color:#20242b}
.atlas-consent .reject{background:transparent;color:#fff;border:1px solid #fff}
</style>
"""

SNIPPET = (
    MARKER
    + """
<div class="atlas-consent" id="atlas-consent" role="dialog" aria-label="Cookie consent">
<p>Architectural Atlas measures visits with Google Analytics, but only with your permission. Read the <a href="/cookies/">cookie policy</a>.</p>
<div><button class="accept" id="atlas-accept">Accept</button><button class="reject" id="atlas-reject">Reject</button></div>
</div>
<script>
(function(){
  var COOKIE = "atlas_consent";
  function read(){
    var m = document.cookie.match(new RegExp('(?:^|;\\\\s*)' + COOKIE + '=([^;]*)'));
    var v = m ? decodeURIComponent(m[1]) : '';
    return (v === 'accepted' || v === 'rejected') ? v : null;
  }
  function write(choice){
    document.cookie = COOKIE + '=' + choice + '; Max-Age=31536000; Path=/; SameSite=Lax';
  }
  function loadGtm(){
    if (document.getElementById('atlas-gtm')) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.id = 'atlas-gtm';
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent('GTM-P4X33Q7D');
    document.head.appendChild(s);
  }
  var choice = read();
  var bar = document.getElementById('atlas-consent');
  if (choice === 'accepted') { loadGtm(); return; }
  if (choice === null && bar) {
    bar.style.display = 'block';
    var ok = document.getElementById('atlas-accept');
    var no = document.getElementById('atlas-reject');
    if (ok) ok.onclick = function(){ write('accepted'); bar.style.display = 'none'; loadGtm(); };
    if (no) no.onclick = function(){ write('rejected'); bar.style.display = 'none'; };
  }
})();
</script>
"""
)

PAGES = [
    "public/about/index.html",
    "public/candidates/index.html",
    "public/cookies/index.html",
    "public/guestbook/index.html",
    "public/launch/index.html",
    "public/leaderboard/index.html",
    "public/privacy/index.html",
    "public/terms/index.html",
    "public/404.html",
]


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    changed, skipped, failed = [], [], []
    for rel in PAGES:
        path = os.path.join(root, rel)
        with open(path) as f:
            text = f.read()
        if MARKER in text:
            skipped.append(rel)
            continue
        if "</head>" not in text or "</body>" not in text:
            failed.append(rel)
            continue
        text = text.replace("</head>", CSS + "</head>", 1)
        text = text.replace("</body>", SNIPPET + "</body>", 1)
        with open(path, "w") as f:
            f.write(text)
        changed.append(rel)
    print("changed:", ", ".join(changed) or "none")
    print("skipped (already present):", ", ".join(skipped) or "none")
    print("failed:", ", ".join(failed) or "none")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
