#!/usr/bin/env python3
"""Prerender per-building viewer pages.

Reads dist/index.html (built app shell) and writes dist/viewer/<slug>/index.html
for every story in repo/stories/*.json, with per-page head tags (title,
description, canonical, OG) plus the story content in a <dialog> that a floating
Story button opens. The story sits in the HTML source (good for SEO) but stays
hidden until the visitor opens it.

Run after `npm run build`, before deploy:
    npm run build && python3 prerender-viewer.py
"""
import html
import json
import os
import re

REPO = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(REPO, "dist")
STORIES = os.path.join(REPO, "stories")
BASE = "https://architecturalatlas.com"

STORY_CSS = """
.story-fab{position:fixed;right:18px;bottom:18px;z-index:60;display:flex;gap:10px}
.story-btn{display:inline-flex;align-items:center;gap:8px;padding:13px 22px;border:0;border-radius:999px;background:#20242b;color:#fff;font-size:15px;font-weight:700;letter-spacing:.2px;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,.4);animation:fab-in .55s cubic-bezier(.2,.9,.3,1.2) backwards}
.story-btn:nth-child(2){animation-delay:.12s}
.story-btn:nth-child(3){animation-delay:.24s}
.story-btn:hover{background:#3a424c;transform:translateY(-1px)}
.story-btn svg{flex:none}
@keyframes fab-in{0%{transform:translateY(16px) scale(.9);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}
.story-dialog{border:0;border-radius:16px;padding:0;max-width:700px;width:calc(100vw - 48px);max-height:calc(100vh - 80px)}
.story-dialog::backdrop{background:rgba(10,14,18,.65)}
.story-body{padding:28px 30px;max-height:calc(100vh - 80px);overflow-y:auto;font-family:'Helvetica Neue',Arial,sans-serif;color:#20242b;line-height:1.65}
.story-body h2{font-size:26px;margin:0 0 6px;letter-spacing:-.5px}
.story-body h3{font-size:19px;margin:30px 0 6px}
.story-body h3 span{color:#6c7883;font-weight:400;font-size:15px;margin-left:8px}
.story-intro{color:#3a424c;font-size:16px}
.story-body figure{margin:18px 0}
.story-body figure img{width:100%;border-radius:10px;display:block}
.story-body figure video{width:100%;border-radius:10px;display:block;background:#000}
.story-body figcaption{font-size:12.5px;color:#6c7883;margin-top:6px}
.story-sources{font-size:12.5px;color:#6c7883;border-top:1px solid #e3e6e8;margin-top:30px;padding-top:14px}
.story-close{display:block;margin:22px auto 4px;padding:10px 26px;border:0;border-radius:999px;background:#20242b;color:#fff;font-size:14px;font-weight:600;cursor:pointer}
details.transcript{margin-top:10px;font-size:13.5px}
details.transcript summary{cursor:pointer;font-weight:600;color:#3a424c}
details.transcript p{margin:8px 0 0;color:#3a424c;line-height:1.6}
.timeline{list-style:none;margin:18px 0 0;padding:0}
.timeline li{position:relative;padding:0 0 22px 22px;border-left:2px solid #dfe3e6;margin-left:6px}
.timeline li:last-child{padding-bottom:4px}
.timeline li::before{content:'';position:absolute;left:-7px;top:5px;width:12px;height:12px;border-radius:50%;background:#20242b}
.timeline .tl-date{font-weight:700;font-size:14px}
.timeline .tl-text{margin:2px 0 0;font-size:15px;color:#3a424c}
.map-frame{width:100%;height:420px;border:0;border-radius:10px;margin-top:14px}
""".strip()

STORY_JS = """
(function(){var ds={story:'storyDialog',timeline:'timelineDialog',map:'mapDialog'};
Object.keys(ds).forEach(function(k){var b=document.getElementById(k+'Btn'),d=document.getElementById(ds[k]);
if(!b||!d||!d.showModal)return;
b.addEventListener('click',function(){d.showModal();});
d.addEventListener('click',function(e){if(e.target===d)d.close();});});})();
""".strip()


def esc(t):
    return html.escape(t, quote=True)


def slugify(t):
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")


WIKI = {
    "Q82425": "https://en.wikipedia.org/wiki/Brandenburg_Gate",
    "Q152229": "https://en.wikipedia.org/wiki/Frederick_William_II_of_Prussia",
    "Q313181": "https://en.wikipedia.org/wiki/Carl_Gotthard_Langhans",
    "Q51989": "https://en.wikipedia.org/wiki/Johann_Gottfried_Schadow",
    "Q517": "https://en.wikipedia.org/wiki/Napoleon",
    "Q151759": "https://en.wikipedia.org/wiki/Karl_Friedrich_Schinkel",
    "Q9960": "https://en.wikipedia.org/wiki/Ronald_Reagan",
    "Q2518": "https://en.wikipedia.org/wiki/Helmut_Kohl",
    "Q57241": "https://en.wikipedia.org/wiki/Hans_Modrow",
    "Q201927": "https://en.wikipedia.org/wiki/David_Hasselhoff",
    "Q9696": "https://en.wikipedia.org/wiki/John_F._Kennedy",
}


def json_ld(story, slug, page_url, og_image):
    """Entity graph: the structure, its people, and its key events."""
    ent = story.get("entities", {})
    c = story.get("coordinates", {})
    graph = []
    building_id = f"{page_url}#building"
    person_ids = {}

    def person_node(p):
        qid = p["wikidata"]
        pid = f"{page_url}#person-{slugify(p['name'])}"
        person_ids[p["name"]] = pid
        return {"@type": "Person", "@id": pid, "name": p["name"],
                "description": p.get("role", ""),
                "sameAs": [f"https://www.wikidata.org/wiki/{qid}", WIKI[qid]]}

    people = [person_node(story["entities"]["architect"])] if ent.get("architect") else []
    people += [person_node(p) for p in ent.get("people", [])]

    building = {
        "@type": "LandmarksOrHistoricalBuildings", "@id": building_id,
        "name": story["title"], "description": story["description"],
        "url": page_url, "image": og_image,
        "sameAs": [f"https://www.wikidata.org/wiki/{ent.get('wikidata', '')}",
                   WIKI.get(ent.get("wikidata", ""), "")],
        "geo": {"@type": "GeoCoordinates",
                "latitude": c.get("lat"), "longitude": c.get("lng")},
        "address": {"@type": "PostalAddress",
                    "addressLocality": "Berlin", "addressCountry": "DE"},
        "dateBuilt": "1791",
    }
    arch = ent.get("architect")
    if arch and arch["name"] in person_ids:
        building["architect"] = {"@id": person_ids[arch["name"]]}

    events = []
    for i, ev in enumerate(ent.get("events", [])):
        node = {"@type": "Event", "@id": f"{page_url}#event-{i}",
                "name": ev["name"], "startDate": ev["start"],
                "location": {"@id": building_id}}
        if ev.get("end"):
            node["endDate"] = ev["end"]
        events.append(node)

    graph.append({
        "@type": "WebPage", "@id": page_url, "url": page_url,
        "name": story["page_title"], "description": story["description"],
        "about": {"@id": building_id}, "mainEntity": {"@id": building_id},
    })
    graph.append(building)
    graph.extend(people)
    graph.extend(events)
    graph.append({
        "@type": "BreadcrumbList", "@id": f"{page_url}#breadcrumb",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Architectural Atlas",
             "item": BASE + "/"},
            {"@type": "ListItem", "position": 2, "name": story["title"],
             "item": page_url},
        ],
    })
    # VideoObject nodes for embedded clips
    for sec in story.get("sections", []):
        vobjs = []
        if sec.get("video"):
            vobjs.append({"file": sec["video"], "caption": sec.get("video_caption", ""),
                          "credit": sec.get("video_credit", "")})
        vobjs.extend(sec.get("videos", []))
        for v in vobjs:
            vnode = {
                "@type": "VideoObject",
                "@id": f"{page_url}#video-{slugify(v['file'].rsplit('.', 1)[0])}",
                "name": v.get("caption", story["title"]),
                "description": f"{v.get('caption', '')} {v.get('credit', '')}".strip(),
                "contentUrl": f"{BASE}/viewer/{slug}/{v['file']}",
                "embedUrl": page_url,
                "uploadDate": "2026-10-08",
            }
            if v.get("poster"):
                vnode["thumbnailUrl"] = f"{BASE}/viewer/{slug}/{v['poster']}"
            if v.get("duration"):
                vnode["duration"] = v["duration"]
            graph.append(vnode)
    return {"@context": "https://schema.org", "@graph": graph}


def _icon(paths):
    inner = "".join(paths)
    return (f'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{inner}</svg>')


ICON_STORY = _icon(['<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/>',
                    '<path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>'])
ICON_TIMELINE = _icon(['<circle cx="12" cy="12" r="10"/>', '<path d="M12 6v6l4 2"/>'])
ICON_MAP = _icon(['<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>',
                  '<circle cx="12" cy="10" r="3"/>'])


def story_dialog(story, slug):
    parts = ['<div class="story-fab">'
             f'<button id="storyBtn" class="story-btn" aria-haspopup="dialog">{ICON_STORY}<span>Story</span></button>'
             f'<button id="timelineBtn" class="story-btn" aria-haspopup="dialog">{ICON_TIMELINE}<span>Timeline</span></button>'
             f'<button id="mapBtn" class="story-btn" aria-haspopup="dialog">{ICON_MAP}<span>Map</span></button>'
             '</div>']
    parts.append('<dialog id="storyDialog" class="story-dialog" aria-labelledby="storyTitle">')
    parts.append('<div class="story-body">')
    parts.append(f'<h2 id="storyTitle">{esc(story["story_title"])}</h2>')
    parts.append(f'<p class="story-intro">{esc(story["intro"])}</p>')
    for sec in story["sections"]:
        dates = f' <span>{esc(sec["dates"])}</span>' if sec.get("dates") else ""
        parts.append(f'<h3>{esc(sec["heading"])}{dates}</h3>')
        parts.append(f'<p>{esc(sec["body"])}</p>')
        vobjs = []
        if sec.get("video"):
            vobjs.append({"file": sec["video"], "caption": sec.get("video_caption", ""),
                          "credit": sec.get("video_credit", "")})
        vobjs.extend(sec.get("videos", []))
        for vobj in vobjs:
            vurl = f"/viewer/{slug}/{esc(vobj['file'])}"
            poster = f' poster="/viewer/{slug}/{esc(vobj["poster"])}"' if vobj.get("poster") else ""
            transcript = (f'<details class="transcript"><summary>Transcript</summary><p>{esc(vobj["transcript"])}</p></details>'
                          if vobj.get("transcript") else "")
            parts.append(f'<figure><video controls playsinline preload="none"{poster} src="{vurl}"></video>'
                         f'<figcaption>{esc(vobj.get("caption", ""))} {esc(vobj.get("credit", ""))}</figcaption>{transcript}</figure>')
        if sec.get("image"):
            img = f"/viewer/{slug}/{esc(sec['image'])}"
            parts.append(f'<figure><img loading="lazy" src="{img}" alt="{esc(sec.get("alt", sec["heading"]))}"/>'
                         f'<figcaption>{esc(sec.get("caption", ""))} {esc(sec.get("credit", ""))}</figcaption></figure>')
    parts.append(f'<p class="story-sources">Sources: {esc(story["sources"])}<br/>'
                 + "<br/>".join(esc(c) for c in story.get("photo_credits", [])) + "</p>")
    parts.append('<form method="dialog"><button class="story-close">Close</button></form>')
    parts.append("</div></dialog>")
    # timeline dialog
    parts.append('<dialog id="timelineDialog" class="story-dialog" aria-labelledby="timelineTitle">')
    parts.append('<div class="story-body">')
    parts.append(f'<h2 id="timelineTitle">Timeline: {esc(story["title"])}</h2>')
    parts.append('<ol class="timeline">')
    for ev in story.get("timeline", []):
        link = (f' <a href="{esc(ev["link"])}" target="_blank" rel="noreferrer">{esc(ev.get("link_label", "More"))}</a>'
                if ev.get("link") else "")
        parts.append(f'<li><div class="tl-date">{esc(ev["date"])}</div>'
                     f'<p class="tl-text">{esc(ev["text"])}{link}</p></li>')
    parts.append("</ol>")
    parts.append('<form method="dialog"><button class="story-close">Close</button></form>')
    parts.append("</div></dialog>")
    # map dialog
    c = story.get("coordinates")
    if c:
        lat, lng = c["lat"], c["lng"]
        bbox = f"{lng-0.02:.4f}%2C{lat-0.012:.4f}%2C{lng+0.02:.4f}%2C{lat+0.012:.4f}"
        src = (f"https://www.openstreetmap.org/export/embed.html?bbox={bbox}"
               f"&layer=mapnik&marker={lat}%2C{lng}")
        big = f"https://www.openstreetmap.org/?mlat={lat}&mlon={lng}#map=15/{lat}/{lng}"
        parts.append('<dialog id="mapDialog" class="story-dialog" aria-labelledby="mapTitle">')
        parts.append('<div class="story-body">')
        parts.append(f'<h2 id="mapTitle">Where: {esc(c["label"])}</h2>')
        parts.append(f'<iframe class="map-frame" title="Map of {esc(c["label"])}" src="{src}" loading="lazy"></iframe>')
        parts.append(f'<p style="font-size:13px"><a href="{big}" target="_blank" rel="noreferrer">Open a larger map</a> · Map data © OpenStreetMap contributors</p>')
        parts.append('<form method="dialog"><button class="story-close">Close</button></form>')
        parts.append("</div></dialog>")
    # hotspot data for the 3D viewer
    hotspots = [{"title": h["title"], "text": h["text"], "part": h["part"]}
                for h in story.get("hotspots", [])]
    parts.append(f'<script>window.__HOTSPOTS__={json.dumps(hotspots, ensure_ascii=False)};</script>')
    return "\n".join(parts)


def prerender_one(path, story):
    slug = story["slug"]
    page_url = f"{BASE}/viewer/{slug}/"
    og_image = f"{BASE}/viewer/{slug}/og.jpg"
    page = open(path).read()

    # head tags
    page = re.sub(r"<title>.*?</title>", f"<title>{esc(story['page_title'])}</title>", page, count=1)
    page = re.sub(r'<meta name="description" content=".*?"/>',
                  f'<meta name="description" content="{esc(story["description"])}"/>', page, count=1)
    head_extra = (
        f'<link rel="canonical" href="{page_url}"/>'
        f'<meta property="og:type" content="article"/>'
        f'<meta property="og:title" content="{esc(story["page_title"])}"/>'
        f'<meta property="og:description" content="{esc(story["description"])}"/>'
        f'<meta property="og:url" content="{page_url}"/>'
        f'<meta property="og:image" content="{og_image}"/>'
        f'<meta property="og:image:width" content="1200"/>'
        f'<meta property="og:image:height" content="630"/>'
        f'<meta name="twitter:card" content="summary_large_image"/>'
        f"<style>{STORY_CSS}</style>"
        f'<script type="application/ld+json">{json.dumps(json_ld(story, slug, page_url, og_image), ensure_ascii=False)}</script>'
    )
    page = page.replace("</head>", head_extra + "</head>", 1)

    # story dialog + button + opener script before </body>
    inject = story_dialog(story, slug) + f"\n<script>{STORY_JS}</script>"
    page = page.replace("</body>", inject + "</body>", 1)

    # dash scrub
    assert "\u2014" not in page and "\u2013" not in page, "em/en dash in prerendered page"

    out_dir = os.path.join(DIST, "viewer", slug)
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, "index.html")
    open(out, "w").write(page)
    print("prerendered", out, len(page), "bytes")


def main():
    template = os.path.join(DIST, "index.html")
    assert os.path.exists(template), "run npm run build first"
    names = sorted(f for f in os.listdir(STORIES) if f.endswith(".json"))
    assert names, "no stories found"
    for name in names:
        story = json.load(open(os.path.join(STORIES, name)))
        prerender_one(template, story)


if __name__ == "__main__":
    main()
