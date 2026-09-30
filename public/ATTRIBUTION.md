# Model attribution

All nine building models in this release are procedural and schematic, generated
in code by the `scripts/generate-*.mjs` generators. No third-party geometry is
used. Facts used in the models (dimensions in the generator header comments, and
every fact in each `atlas.json` `explanations` map, system description, and
blurb) come from the sources listed below. Geometry not documented in them is
marked schematic in the UI and is never presented as a sourced fact.

## Eiffel Tower (`public/models/tower/`)

- Eiffel Tower, Wikipedia - https://en.wikipedia.org/wiki/Eiffel_Tower
  Heights (330 m tip, 300 m architectural top, 276 m summit deck, 115 m second
  floor, 57 m first floor, 125 m square base), 18,038 iron pieces, 2.5 million
  rivets, foundation figures (2 m slabs under east/south legs; 15 m long,
  6 m diameter compressed-air caissons to 22 m under 6 m slabs for north/west
  legs; anchor bolts 10 cm diameter, 7.5 m long), Stephen Sauvestre arches,
  eight elevators (east/west lifts replaced for the 1900 Exposition
  Universelle), over 300 steps per flight, first floor glass floor and
  58 Tour Eiffel, Le Jules Verne on the second floor, summit as highest public
  observation deck in the EU, Eiffel's apartment (Jean Lachaise furniture),
  1957 broadcasting aerial, tallest structure 1889-1930 (Chrysler Building),
  most visited monument with an entrance fee in the world, 1889 Exposition
  Universelle, Maurice Koechlin's lattice girder sketch.
- Eiffel Tower, Simple English Wikipedia - https://simple.wikipedia.org/wiki/Eiffel_Tower
  Cross-checked: foundation caisson work on the Seine side, slanted elevator
  placement in the legs.
- The Eiffel Tower: Is it an iron pile or a masterpiece?, Interesting Engineering
  https://interestingengineering.com/videos/ep-4-the-eiffel-tower-is-it-an-iron-pile-or-a-masterpiece
  Hydraulic jacks attached to the leg shoes to align the legs during
  construction (used in the leg shoe explanation).

## El Castillo, Chichen Itza (`public/models/el-castillo/`)

All dimensions and facts come from the research file
`research/el-castillo.md`, compiled from these sources opened in full:

- El Castillo, Chichen Itza, Wikipedia - https://en.wikipedia.org/wiki/El_Castillo,_Chichen_Itza
- Chichen Itza, Wikipedia - https://en.wikipedia.org/wiki/Chichen_Itza
- Chichen Itza, World Heritage Site, National Geographic - https://www.nationalgeographic.com/travel/world-heritage/article/chichen-itza
- Ciudad prehispanica de Chichen-Itza, INAH (UNESCO listing text, added to atlas sourceUrls during the 2026-09-30 deepening) - https://lugares.inah.gob.mx/en/node/6131

Geometry not stated in these sources (terrace setback widths derived from the
53 degree face slope, stair and balustrade widths, step tread/riser, serpent
carving shapes, summit temple footprint and roofcomb, inner substructure exact
profile, summit slab thickness, tunnel route, cenote water level) is schematic
and is never presented as sourced fact in the UI copy.

## Colosseum (`public/models/colosseum/`)

All dimensions and facts come from the research file
`research/colosseum-research.md` (researched 2026-09-30), built from these
three pages, all opened and read in full during research:

- Colosseum, Wikipedia - https://en.wikipedia.org/wiki/Colosseum
- Colosseum (Flavian Amphitheatre), Ancient Rome Live, reproducing Platner's
  Topographical Dictionary of Ancient Rome (richest dimensional detail) -
  https://ancientromelive.org/colosseum-flavian-amphitheatre/
- Colosseum (Rome, 80), Structurae (a Wikipedia mirror, no unique dimensional
  data) - https://structurae.net/en/structures/colosseum

Deepening (2026-09-30, 57 to 128 parts) added two more sources, both opened
in full and added to the atlas sourceUrls:

- Inside the Colosseum, thecolosseum.org - https://www.thecolosseum.org/inside/
  (gate functions and positions)
- Colosseum, ancient-history-sites.com - https://www.ancient-history-sites.com/sites/colosseum/
  (160 statues, 40 bronze shields, gate detail)

An official source (Parco archeologico del Colosseo, parcocolosseo.it) was not
needed because the three pages above already covered every required dimension
and structural fact.

## Taj Mahal (`public/models/taj-mahal/`)

Dimensions and structural facts used in `scripts/generate-taj-mahal.mjs`.
Undocumented visual details (arch profiles, chhatri diameters, minaret tier
spacing, lean angle, parterre planting) are schematic and are not presented as
sourced fact in the UI.

1. Taj Mahal, Wikipedia - https://en.wikipedia.org/wiki/Taj_Mahal
   (plinth 95.5 m square and 6 m high; pishtaq arches 33 m; drum 12 m high
   with 18.4 m inner diameter; outer dome 23 m high; finial 9.6 m; inner dome
   35 m from ground; chamber walls about 25 m high; octagonal chamber with
   7.3 m sides; Mumtaz cenotaph on 1.5 x 2.5 m marble base; jali screen of
   eight pierced marble panels; minarets leaning slightly outward; jawab
   mirroring the mosque with inlaid floors and no mihrab; central tank with
   five fountains; complex enclosed by crenellated red sandstone walls on
   three sides with the river side open)
2. Dimensions of the Taj Mahal, wonders-of-the-world.net (Koch/Barraud 2006
   measured survey table) -
   https://www.wonders-of-the-world.net/Taj-Mahal/Dimensions-of-the-Taj-Mahal.php
   (terrace 300 x 111.89 m, 8.7 m high; mausoleum 56.9 x 56.9 m, 67.97 m high;
   minarets 43.02 m high, 5.65 m diameter; great gate 41.2 x 34 m, 23.07 m high;
   mosque 56.6 x 23.38 m, 20.3 m high; charbagh 296.31 x 296.31 m; channels
   120 m long, 6 m wide; central fountain platform 40 m wide with 10 m square
   water space)
3. Taj Mahal (Agra, 1648), Structurae - https://structurae.net/en/structures/taj-mahal
   (outer dome 17.70 m diameter, 24.4 m arc height)
4. Taj mahal, vocal.media Earth (republishes Britannica layout and
   architecture text) - https://vocal.media/earth/taj-mahal-cm1oi0ai9
   (gate: 11 white chhatris per facade; thin ornamental minarets about 30 m;
   octagonal corner towers with larger chhatris; recessed two-story central
   arch with two pairs of smaller flanking arches; fountain pressure from
   drop off 9.47 m high walls)
5. Origins and architecture of the Taj Mahal, Citizendium -
   https://en.citizendium.org/wiki/index.php?title=Origins_and_architecture_of_the_Taj_Mahal&printable=yes
   (terrace foundations, tahkhana river rooms, Mumtaz's temporary burial site)
6. Taj Mahal Complex, Archnet - https://www.archnet.org/sites/1559
   (153 gaz forecourt, Khawasspura attendant courtyards, Saheli Burj
   miniature tomb complexes)
7. Great gate of the Taj Mahal, wonders-of-the-world.net -
   https://www.wonders-of-the-world.net/Taj-Mahal/Great-gate-of-the-Taj-Mahal.php
   (33x19 m pishtaq; gate has an internal dome with no outward expression)

## White House (`public/models/white-house/`)

All dimensions and facts come from the research file `research/white-house.md`
and the four sources below. No overall height is stated anywhere: no reliable
published figure exists, so all vertical dimensions above grade are schematic
proportions derived from the documented 170 x 85 ft footprint.

- White House, Wikipedia - https://en.wikipedia.org/wiki/White_House
- In a White House Passageway, White House Historical Association - https://www.whitehousehistory.org/in-a-white-house-passageway
- Portico, Wikipedia - http://en.wikipedia.org/wiki/Portico
- White House, Columbia Electronic Encyclopedia via FactMonster - https://www.factmonster.com/encyclopedia/places/north-america/us-national-parks/white-house

Deepening (2026-09-30, 58 to 129 parts) added these sources, all opened in
full during research:

- East Wing, Wikipedia - https://en.wikipedia.org/wiki/East_Wing
- Roosevelt Room, Wikipedia - https://en.wikipedia.org/wiki/Roosevelt_Room
- Situation Room, Wikipedia - https://en.wikipedia.org/wiki/Situation_Room
- White House Fence Timeline, White House Historical Association (PDF) - https://d1y822qhq55g6.cloudfront.net/pdfs/White-House-Fence-Timeline_historianupdates.pdf
- Rose Garden, National Park Service - https://www.nps.gov/whho/learn/historyculture/rose-garden.htm
- Jacqueline Kennedy Garden, National Park Service - https://www.nps.gov/whho/learn/historyculture/jacqueline-kennedy-garden.htm
- HowStuffWorks, "How the White House Rose Garden Became the Most Famous Garden in the World" - https://history.howstuffworks.com/american-history/white-house-rose-garden.htm
- Security Today, "Construction on Taller White House Fence to Begin this Summer" - https://securitytoday.com/articles/2019/05/28/contruction-on-taller-white-house-fence-to-begin-this-summer.aspx
- US Secret Service press release, "Construction Begins Today on New White House Fence" - https://www.secretservice.gov/press/releases/2019/07/construction-begins-today-new-white-house-fence

Configuration note: the model shows the pre-2025 White House. The original
East Wing was demolished in 2025 for a new East Wing containing a ballroom
(per the White House Wikipedia article), so the East Wing block in this model
is the 1942-2025 reception/office block with its below-grade Presidential
Emergency Operations Center.

## Golden Gate Bridge (`public/models/golden-gate/`)

Every dimension and fact used in the procedural model comes from one of these
sources. Derived or schematic figures (side spans, cable parabola, suspender
spacing, tower setback steps, truss member sizes, anchorage shape, fender
profile, approach geometry) are procedural and are not presented as sourced
fact in the UI.

1. Golden Gate Bridge, Highway and Transportation District, "Facts and Figures About the Bridge" - https://www.goldengate.org/exhibits/facts-and-figures-about-the-bridge/
2. Golden Gate Bridge, Wikipedia - https://en.wikipedia.org/wiki/Golden_Gate_Bridge
3. Golden Gate Bridge (San Francisco, 1937), Structurae - https://structurae.net/en/structures/golden-gate-bridge
4. Golden Gate Bridge District statement on the NTSB report - https://www.goldengate.org/golden-gate-bridge-district-statement-on-recent-ntsb-report/
5. Golden Gate Bridge District, "Art Deco Style" exhibit PDF - https://www.goldengate.org/assets/1/6/art_deco_ggb1.pdf

Deepening (2026-09-30, 45 to 111 parts) re-verified the same sources; no new
source sites were needed. New facts (median barrier installed Jan 11, 2015;
walkway railings added 2003; 1.2M rivets; 80,000 miles of wire; chevron
ornament on the south tower; Strauss's brick in the south anchorage) all come
from the Wikipedia article and goldengate.org facts page above.

## Sydney Opera House (`public/models/sydney-opera-house/`)

Home-page card copy, system descriptions, and part explanations draw only on
these two pages; all other geometry is schematic and labeled as such.

- Sydney Opera House, Wikipedia - https://en.wikipedia.org/wiki/Sydney_Opera_House
- Sydney Opera House (Sydney Central Business District, 1973), Structurae - https://structurae.net/en/structures/sydney-opera-house

Deepening (2026-09-30, 40 to 125 parts) added these sources, all opened in
full during research:

- Renewing an icon, Sydney Opera House official stories (Box Office Foyer
  under the Monumental Steps, lift, visitor lounge) - https://stories.sydneyoperahouse.com/renewing-an-icon/
- Sydney Opera House Trust, Regulatory Impact Statement, Bylaw 2020
  (Forecourt: open-air venue south of the shells, up to 6,000 people) - https://sydneyoperahouse.api.collaboro.com/media/regulatory-impact-statement
- Sydney Opera House Open House Weekend digital visitor map (Western
  Broadwalk, Central Passage, Box Office, foyers) - https://sydneyoperahouse.api.collaboro.com/media/open-house-weekend-digital-map
- Sydney Opera House Trust / Arup, Lower Concourse Operational Noise and
  Vibration Management Plan 2020 (Lower Concourse; outdoor events on
  Forecourt, Monumental Steps, Western Broadwalk) - https://sydneyoperahouse.api.collaboro.com/direct?Guid=db52e11c-772a-4109-9d3c-f49e577b28e4

Sourced facts used: Jørn Utzon architect, opened 20 October 1973, A$102
million cost; Bennelong Point, Sydney Harbour; 183 m long, 120 m wide, 1.8 ha
site; highest roof point 67 m above sea level (22 storey equivalent); all
shells are sections of a single 75.2 m radius sphere; 2,194 precast concrete
roof sections (up to 15 tonnes), 2,400 precast ribs and 4,000 roof panels cast
by Hornibrook; 1,056,006 glossy white and matte cream tiles by Höganäs AB
(Sweden); 588 concrete piers up to 25 m below sea level; podium clad in pink
granite aggregate panels quarried at Tarana; glass curtain walls of the foyer
spaces; Concert Hall 2,679 seats in the western shell group (Grand Organ:
largest mechanical tracker action organ, 10,000+ pipes); Joan Sutherland
Theatre 1,507 seats in the eastern group (called Opera Theatre until 17
October 2012); Drama Theatre 544, Playhouse 398, Studio up to 400, Utzon Room
210; smaller venues within the podium beneath the Concert Hall; Bennelong
Restaurant in the smaller shell group on the western side of the Monumental
Steps; stone paved forecourt and Monumental Steps used as an outdoor venue
with the steps as audience seating; shells step up from low entrance spaces to
the high stage towers; perspex acoustic clouds over the Concert Hall stage;
podium columns first built too weak and rebuilt; interiors completed by Peter
Hall after Utzon's 1966 resignation.

## Empire State Building (`public/models/empire-state/`)

Every sourced dimension and fact used in `scripts/generate-empire-state.mjs`
(the model header comment and the per-part explanations) was read from one of
these two pages, both opened in full on 2026-09-30. Geometry not stated on
these pages (intermediate setback widths, interior layout, foundation depth,
fixture placement) is schematic and is never presented as sourced fact.

- Empire State Building, Wikipedia - https://en.wikipedia.org/wiki/Empire_State_Building
- Empire State Building (Manhattan, 1931), Structurae - https://structurae.net/en/structures/empire-state-building

## Sagrada Familia (`public/models/sagrada-familia/`)

All Sagrada Familia facts in the model (dimensions in the generator header
comment, and every fact in the `atlas.json` explanations map, system
descriptions, and blurb) come from the pages listed below, all opened in full
on 2026-09-30. Geometry not stated on these pages (exact footprint placement,
per-spire profiles, pinnacle shapes, evangelist symbol sculptures, branch
crown geometry, vault profiles, stained glass divisions, crypt layout, bronze
door divisions, and the unfinished Glory Facade, modeled as designed) is
schematic and is never presented as sourced fact.

- Sagrada Familia official booklet 10: Towers - https://sagradafamilia.org/documents/20142/1205286/SF_Booklet_10_20240415_digital_AF.pdf/504e0081-e3b7-43ff-be2c-0efb05e2ebaf
- Sagrada Familia official booklet 7: Passion Facade, cloister and sacristy - https://sagradafamilia.org/documents/20142/1000561/Booklet_07.pdf/1d9c8f31-1c73-d9bd-4eee-024a935ecac4
- Sagrada Familia official booklet 8: Glory Facade, baptistery and chapel - https://sagradafamilia.org/documents/20142/1000561/Booklet_08.pdf
- Sagrada Familia, Wikipedia - http://en.wikipedia.org/wiki/Sagrada_Fam%C3%ADlia
- Sagrada Familia, Simple English Wikipedia - https://simple.wikipedia.org/wiki/Sagrada_Fam%C3%ADlia
- Popular Science: Tower of Jesus completed February 2026 - https://www.popsci.com/technology/sagrada-familia-church-construction/
- AZoBuild: Building La Sagrada Familia - https://www.azobuild.com/article.aspx?ArticleID=8127
- Sagrada Familia, WikiArquitectura - https://en.wikiarquitectura.com/building/sagrada-familia/

## Viewer code attribution

The interactive viewer is a fork of Human Atlas by ashemag, used under the MIT License
(see `LICENSE`). The original anatomy dataset it shipped with (BodyParts3D, CC BY 4.0)
has been removed from this project and replaced with the procedural models above.
