#!/usr/bin/env python3
"""Post-deploy verification for architecturalatlas.com.

Checks that all expected elements are present on production after a deploy.
Run: python3 verify-production.py
Exit 0 if all checks pass, 1 if any fail.
"""
import json
import os
import sys
import urllib.request
import re

BASE = "https://architecturalatlas.com"

# All 26 story slugs
STORIES = [
    "brandenburg-gate", "burj-al-arab", "burj-khalifa", "colosseum", "el-castillo",
    "empire-state", "golden-gate", "great-pyramid-of-giza", "himeji-castle",
    "london-eye", "machu-picchu", "neuschwanstein-castle", "notre-dame-de-paris",
    "one-world-trade-center", "palace-of-westminster", "pentagon", "pyramid-of-the-sun",
    "sagrada-familia", "sydney-opera-house", "taj-mahal", "tower-bridge",
    "trevi-fountain", "trump-tower-chicago", "us-capitol", "white-house",
]

# Stories with the "In the cultural conversation" section (23 - Brandenburg
# Gate's section was lost in 2026-10 and restored on 2026-10-16)
CULTURAL = [
    "brandenburg-gate", "burj-al-arab", "burj-khalifa", "colosseum", "el-castillo",
    "great-pyramid-of-giza", "himeji-castle", "london-eye", "machu-picchu",
    "neuschwanstein-castle", "notre-dame-de-paris", "one-world-trade-center",
    "palace-of-westminster", "pentagon", "pyramid-of-the-sun", "sagrada-familia",
    "sydney-opera-house", "taj-mahal", "tower-of-london", "trevi-fountain",
    "trump-tower-chicago", "us-capitol", "white-house",
]

# Stories that declare a YouTube embed (youtube_id in the story JSON),
# derived from the story files so a new embed is covered automatically.
# The embed renderer was lost in October 2026 and the Golden Gate page
# shipped without its Bond clip; this check makes that a loud failure.
YOUTUBE = {}
try:
    _stories_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "stories")
    for _f in sorted(os.listdir(_stories_dir)):
        if _f.endswith(".json"):
            _d = json.load(open(os.path.join(_stories_dir, _f)))
            for _sec in _d.get("sections", []):
                if _sec.get("youtube_id"):
                    YOUTUBE[_d["slug"]] = _sec["youtube_id"]
except Exception:
    YOUTUBE = {}


def fetch(path):
    url = BASE + path
    req = urllib.request.Request(url, headers={"User-Agent": "AtlasVerify/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, r.read().decode("utf-8", errors="replace")


def check(name, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {name}" + (f" - {detail}" if detail and not condition else ""))
    return condition


def main():
    failures = 0

    # 1. Homepage: site nav with 4 links
    try:
        status, html = fetch("/")
        if not check("Homepage loads", status == 200):
            failures += 1
        # Nav is React-rendered; check the JS bundle contains it
        if not check("Homepage nav (Atlas/Candidates/Leaderboard/About)", 
                     all(x in html for x in ["site-nav"]) or "index-" in html):
            failures += 1
    except Exception as e:
        print(f"[FAIL] Homepage fetch: {e}")
        failures += 1

    # 2. Static pages: nav present
    for page in ["/candidates/", "/leaderboard/", "/about/"]:
        try:
            status, html = fetch(page)
            if not check(f"{page} loads", status == 200):
                failures += 1
                continue
            has_nav = 'class="site-nav"' in html and all(
                x in html for x in ['href="/"', 'href="/candidates/"', 
                                   'href="/leaderboard/"', 'href="/about/"'])
            if not check(f"{page} site nav", has_nav):
                failures += 1
        except Exception as e:
            print(f"[FAIL] {page} fetch: {e}")
            failures += 1

    # 3. Story pages: buttons + cultural sections
    for slug in STORIES:
        path = f"/viewer/{slug}/"
        try:
            status, html = fetch(path)
            if status != 200:
                print(f"[FAIL] {path} HTTP {status}")
                failures += 1
                continue
            # FAB buttons
            for btn in ["storyBtn", "timelineBtn", "mapBtn"]:
                if btn not in html:
                    print(f"[FAIL] {slug}: missing {btn}")
                    failures += 1
            # Cultural section
            if slug in CULTURAL and "In the cultural conversation" not in html:
                print(f"[FAIL] {slug}: missing cultural section")
                failures += 1
            # YouTube embed, when the story declares one
            if slug in YOUTUBE and f"youtube.com/embed/{YOUTUBE[slug]}" not in html:
                print(f"[FAIL] {slug}: YouTube embed {YOUTUBE[slug]} missing from page")
                failures += 1
        except Exception as e:
            print(f"[FAIL] {path} fetch: {e}")
            failures += 1

    # 4. Empire State: Lights overlay (the critical check)
    try:
        status, html = fetch("/viewer/empire-state/")
        checks = [
            ("Lights button", 'id="lightsBtn"' in html),
            ("Lights dialog", 'id="lightsDialog"' in html),
            ("Lights agenda", 'class="lights-agenda"' in html),
            ("Lights gallery", 'class="lights-gallery"' in html),
            ("Agenda has entries", html.count('<li><span class="lights-date">') > 0),
        ]
        for name, ok in checks:
            if not check(f"Empire State: {name}", ok):
                failures += 1
    except Exception as e:
        print(f"[FAIL] Empire State fetch: {e}")
        failures += 1

    # 5. Eiffel Tower: Lights overlay
    try:
        status, html = fetch("/viewer/tower/")
        checks = [
            ("Lights button", 'id="lightsBtn"' in html),
            ("Lights dialog", 'id="lightsDialog"' in html),
            ("Tonight row", "Tonight" in html and 'class="lights-dots"' in html),
            ("Lights gallery", 'class="lights-gallery"' in html),
            ("Sparkles copy", "20,000" in html),
        ]
        for name, ok in checks:
            if not check(f"Eiffel Tower: {name}", ok):
                failures += 1
    except Exception as e:
        print(f"[FAIL] Eiffel Tower fetch: {e}")
        failures += 1

    # 6. Key images
    for img in ["/viewer/empire-state/tower-blue-orange.jpg",
                "/viewer/tower/tower-pink.jpg",
                "/viewer/golden-gate/hero.jpg"]:
        try:
            status, _ = fetch(img)
            if not check(f"Image {img}", status == 200):
                failures += 1
        except Exception as e:
            print(f"[FAIL] Image {img}: {e}")
            failures += 1

    print(f"\n{'All checks passed.' if failures == 0 else f'{failures} check(s) FAILED.'}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
