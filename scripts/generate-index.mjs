// Generates public/models/index.json from the per-building atlas.json files so the
// home page and validation scripts stay in sync with the model data.
//
// Buildings can ship multiple model variants (simple / detailed). VARIANTS maps
// a canonical building slug to its variants in display order; the first variant
// whose id is 'simple' (otherwise the first listed) is the default the viewer
// loads. Variant blurbs use {parts} and {systems} placeholders so the counts
// can never drift from the generated model data.
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';

const VARIANTS={
 'sagrada-familia':[
  {id:'simple',label:'Simple',slug:'sagrada-familia-simple',
   blurb:'Antoni Gaudi\u2019s unfinished basilica in Barcelona, in simplified schematic form. Explore {parts} named components across {systems} systems, from the branching nave columns to the planned 18 spires rising to 172.5 m, the tallest church tower in the world since February 2026.'},
  {id:'detailed',label:'Detailed',slug:'sagrada-familia',
   blurb:'Antoni Gaudi\u2019s unfinished basilica in Barcelona. Explore {parts} named components across {systems} systems, from the branching nave columns and hyperboloid vaults to the planned 18 spires rising to 172.5 m, the tallest church tower in the world since February 2026.'},
 ],
 'tower-bridge':[
  {id:'simple',label:'Simple',slug:'tower-bridge-simple',
   blurb:'London\u2019s Grade I listed combined bascule and suspension bridge over the Thames, in simplified schematic form. Explore {parts} named components across {systems} systems, from the 213 ft towers and 1,070-ton bascules to the high-level walkways and 270 ft suspension side spans.'},
  {id:'detailed',label:'Detailed',slug:'tower-bridge',
   blurb:'London\u2019s Grade I listed combined bascule and suspension bridge over the Thames, opened in 1894. Explore {parts} named components across {systems} systems, from the 213 ft towers, 1,070-ton bascules and steam-driven hydraulics to the high-level walkways and 270 ft suspension side spans.'},
 ],
 'trevi-fountain':[
  {id:'simple',label:'Simple',slug:'trevi-fountain-simple',
   blurb:'Rome’s Trevi Fountain, the largest Baroque fountain in the world, in simplified schematic form. Explore {parts} named components across {systems} systems, from Oceanus and his tritons to the Palazzo Poli facade, the rockwork reef, and the great basin.'},
  {id:'detailed',label:'Detailed',slug:'trevi-fountain',
   blurb:'Rome’s 18th century Trevi Fountain, the largest Baroque fountain in the world at 26.3 m high and 49.15 m wide. Explore {parts} named components across {systems} systems, from Oceanus on his shell chariot and the giant Corinthian pilasters of Palazzo Poli to the travertine reef, the great basin, and the Acqua Vergine waterworks.'},
 ],
 'neuschwanstein-castle':[
  {id:'simple',label:'Simple',slug:'neuschwanstein-castle-simple',
   blurb:'Ludwig II of Bavaria’s Romanesque Revival palace above the Pöllat Gorge, in simplified schematic form. Explore {parts} named components across {systems} systems, from the red-brick Gatehouse and the two courtyard levels to the five-storey Palas with its 65 m tower, the tallest castle in the world.'},
  {id:'detailed',label:'Detailed',slug:'neuschwanstein-castle',
   blurb:'Ludwig II of Bavaria’s Romanesque Revival palace above the Pöllat Gorge, built from 1869 as an inhabitable stage set for Wagner’s operas. Explore {parts} named components across {systems} systems, from the Gatehouse and the courtyards to the Throne Hall, the Hall of the Singers, and the foundations of the unbuilt 90 m keep.'},
 ],
 'london-eye':[
  {id:'simple',label:'Simple',slug:'london-eye-simple',
   blurb:'The London Eye, originally the Millennium Wheel, is a cantilevered observation wheel on the South Bank of the Thames in London, in simplified schematic form. Explore {parts} named components across {systems} systems, from the 120 m steel rim and its tensioned cables to the 32 passenger capsules and the leaning A-frame.'},
  {id:'detailed',label:'Detailed',slug:'london-eye',
   blurb:'The London Eye, originally the Millennium Wheel, is a cantilevered observation wheel on the South Bank of the Thames in London, opened to the public in 2000. Explore {parts} named components across {systems} systems, from the 120 m steel rim and 64 tensioned cables to the 32 passenger capsules, the 22 m spindle, and the leaning A-frame.'},
 ],
 'palace-of-westminster':[
  {id:'simple',label:'Simple',slug:'palace-of-westminster-simple',
   blurb:'The Palace of Westminster in London, meeting place of the UK Parliament, in simplified schematic form. Explore {parts} named components across {systems} systems, from the 98.5 m Victoria Tower and the Elizabeth Tower with its Great Bell Big Ben to the octagonal Central Tower and the 20.7 by 73.2 m Westminster Hall.'},
  {id:'detailed',label:'Detailed',slug:'palace-of-westminster',
   blurb:'The Palace of Westminster in London, meeting place of the UK Parliament, rebuilt 1840 to 1876 in Perpendicular Gothic Revival style. Explore {parts} named components across {systems} systems, from the 98.5 m Victoria Tower, the 96.3 m Elizabeth Tower and the 91 m octagonal Central Tower to the two debating chambers and Westminster Hall, completed in 1099.'},
 ],
 'notre-dame-de-paris':[
  {id:'simple',label:'Simple',slug:'notre-dame-de-paris-simple',
   blurb:'Notre-Dame de Paris on the \u00cele de la Cit\u00e9, the great French Gothic cathedral begun in 1163, in simplified schematic form. Explore {parts} named components across {systems} systems, from the 69 m west towers and three sculpted portals to the flying buttresses and the 96 m crossing spire, rebuilt after the 2019 fire.'},
  {id:'detailed',label:'Detailed',slug:'notre-dame-de-paris',
   blurb:'Notre-Dame de Paris on the \u00cele de la Cit\u00e9, the great French Gothic cathedral begun in 1163 under Bishop Maurice de Sully. Explore {parts} named components across {systems} systems, from the 69 m west towers, the three west portals and the 28 kings of the gallery to the flying buttresses, the three rose windows, the great organ of 8,000 pipes, and the 96 m crossing spire rebuilt after the fire of 15 April 2019.'},
 ],
 'himeji-castle':[
  {id:'simple',label:'Simple',slug:'himeji-castle-simple',
   blurb:'Japan\u2019s White Heron Castle in Himeji, in simplified schematic form. Explore {parts} named components across {systems} systems, from the 46.4 m main keep and its cluster of smaller keeps to the maze of gates, stone walls and three concentric moats.'},
  {id:'detailed',label:'Detailed',slug:'himeji-castle',
   blurb:'Japan\u2019s White Heron Castle in Himeji, built from 1601 to 1609 by Ikeda Terumasa and never taken in battle. Explore {parts} named components across {systems} systems, from the 46.4 m main keep with its thousand-mat room and great pillars to the three subsidiary keeps, the roofed connecting corridors, the maze of gates, and the legendary Okiku well.'},
 ],
 'machu-picchu':[
  {id:'simple',label:'Simple',slug:'machu-picchu-simple',
   blurb:'The 15th-century Inca citadel on a 2,430 m mountain ridge in Peru, in simplified schematic form. Explore {parts} named components across {systems} systems, from the semicircular Temple of the Sun and the bedrock-carved Intihuatana to the Temple of the Three Windows, the Main Temple, the Temple of the Condor, the fountains, and the agricultural terraces. This model covers the key structures, not the whole mountain.'},
  {id:'detailed',label:'Detailed',slug:'machu-picchu',
   blurb:'The 15th-century Inca citadel on a 2,430 m mountain ridge in Peru, built around 1450 as an estate for the emperor Pachacuti. Explore {parts} named components across {systems} systems, from the curved ashlar wall of the Temple of the Sun, the Royal Tomb, the Intihuatana and the Temple of the Three Windows to the Stairway of Fountains, the terraces, and the residential sector in outline. This model covers the key structures, not the whole mountain.'},
 ],
 'great-pyramid-of-giza':[
  {id:'simple',label:'Simple',slug:'great-pyramid-of-giza-simple',
   blurb:'The Great Pyramid of Giza, tomb of Pharaoh Khufu built around 2560 BC, in simplified schematic form. Explore {parts} named components across {systems} systems, from the 146.6 m pyramid and its vanished Tura limestone casing to the Grand Gallery, the granite King’s Chamber, and the funerary complex in outline. The Sphinx belongs to Khafre’s complex and is not modeled.'},
  {id:'detailed',label:'Detailed',slug:'great-pyramid-of-giza',
   blurb:'The Great Pyramid of Giza, tomb of Pharaoh Khufu built around 2560 BC. Explore {parts} named components across {systems} systems, from the stepped core of 2.3 million blocks and the vanished Tura limestone casing to the 47 m Grand Gallery, the King’s Chamber with its granite sarcophagus and five relieving chambers, and the mortuary temple, causeway and valley temple in outline. The Sphinx belongs to Khafre’s complex and is not modeled.'},
 ],
 'brandenburg-gate':[
  {id:'simple',label:'Simple',slug:'brandenburg-gate-simple',
   blurb:'The Brandenburg Gate in Berlin, Germany’s first great Greek Revival building, in simplified schematic form. Explore {parts} named components across {systems} systems, from the twelve 15 m Doric columns and the five passageways to the copper Quadriga of Victoria driving her four-horse chariot.'},
  {id:'detailed',label:'Detailed',slug:'brandenburg-gate',
   blurb:'The Brandenburg Gate in Berlin, built 1788 to 1791 to Carl Gotthard Langhans’ design as one of Germany’s first Greek Revival buildings. Explore {parts} named components across {systems} systems, from the twelve 15 m Doric columns, the Labors of Hercules reliefs and the sixteen metopes on each long face to the Triumph of Peace relief and the copper Quadriga of Victoria driving her four-horse chariot.'},
 ],
 'pyramid-of-the-sun':[
  {id:'simple',label:'Simple',slug:'pyramid-of-the-sun-simple',
   blurb:'The Pyramid of the Sun at Teotihuacan, Mexico, the largest building of the ancient city, built about 200 AD, in simplified schematic form. Explore {parts} named components across {systems} systems, from the five stepped talud-tablero tiers and the grand west staircase to the summit temple remnants, the later Adosada platform, the Avenue of the Dead frontage, and the sacred cave tunnel beneath the pyramid. This model covers the pyramid, its forecourt and the avenue frontage in outline, not the whole city.'},
  {id:'detailed',label:'Detailed',slug:'pyramid-of-the-sun',
   blurb:'The Pyramid of the Sun at Teotihuacan, Mexico, the largest building of the ancient city, built about 200 AD. Explore {parts} named components across {systems} systems, from the five stepped talud-tablero tiers and the grand west staircase to the summit temple remnants, the later Adosada platform, the Avenue of the Dead frontage, and the sacred cave tunnel beneath the pyramid. This model covers the pyramid, its forecourt and the avenue frontage in outline, not the whole city.'},
 ],
 'tower':[
  {id:'simple',label:'Simple',slug:'tower-simple',
   blurb:'The 330 m wrought iron lattice tower on the Champ de Mars in Paris, built for the 1889 Exposition Universelle, in simplified schematic form. Explore {parts} named components across {systems} systems, from the four lattice legs and their foundations to the three visitor platforms and the summit crown.'},
  {id:'detailed',label:'Detailed',slug:'tower',
   blurb:'The 330 m wrought iron lattice tower on the Champ de Mars in Paris, built for the 1889 Exposition Universelle. Explore {parts} named components across {systems} systems, from the lattice legs, elevators and hydraulic machinery to the restaurants, the 72-name frieze, the sparkling illumination and the summit broadcasting aerials.'},
 ],
 'colosseum':[
  {id:'simple',label:'Simple',slug:'colosseum-simple',
   blurb:'The Colosseum in Rome, the largest ancient amphitheatre ever built, in simplified schematic form. Explore {parts} named components across {systems} systems, from the travertine arcades and the velarium awning to the cavea seating, the arena and the hypogeum tunnels below.'},
  {id:'detailed',label:'Detailed',slug:'colosseum',
   blurb:'The Colosseum in Rome, the largest ancient amphitheatre ever built, inaugurated in AD 80 and seating about 50,000 spectators. Explore {parts} named components across {systems} systems, from the tier-by-tier arcade bays and the velarium rigging to the cavea wedges, the arena, the hypogeum machinery and the 1349 collapse ruins.'},
 ],
 'white-house':[
  {id:'simple',label:'Simple',slug:'white-house-simple',
   blurb:'The White House in Washington, D.C., the official residence and workplace of the president of the United States, in simplified schematic form. Explore {parts} named components across {systems} systems, from the north and south porticoes to the West Wing, the Truman-era steel frame and the 18-acre grounds.'},
  {id:'detailed',label:'Detailed',slug:'white-house',
   blurb:'The White House in Washington, D.C., the official residence and workplace of the president of the United States, its sandstone walls first occupied in 1800. Explore {parts} named components across {systems} systems, from the column-by-column porticoes and the State Floor rooms to the Oval Office and Resolute desk, the Truman-era steel frame and the 18-acre grounds.'},
 ],
 'taj-mahal':[
  {id:'simple',label:'Simple',slug:'taj-mahal-simple',
   blurb:'The Taj Mahal in Agra, the marble mausoleum commissioned by Shah Jahan, in simplified schematic form. Explore {parts} named components across {systems} systems, from the riverfront terrace and the dome cluster to the great gate, the charbagh garden and its waterworks.'},
  {id:'detailed',label:'Detailed',slug:'taj-mahal',
   blurb:'The Taj Mahal in Agra, the white marble mausoleum commissioned by Shah Jahan in 1632, standing on its 300 m riverfront terrace. Explore {parts} named components across {systems} systems, from the pishtaq arches and the 23 m onion dome to the minaret tiers, the burial chamber, the Darwaza-i rauza gate, the mosque and jawab, and the charbagh waterworks.'},
 ],
 'golden-gate':[
  {id:'simple',label:'Simple',slug:'golden-gate-simple',
   blurb:'The Golden Gate Bridge in San Francisco, the 2,737 m suspension bridge opened in 1937, in simplified schematic form. Explore {parts} named components across {systems} systems, from the 746 ft Art Deco towers and the spun main cables to the deck, the anchorages and the Fort Point arch.'},
  {id:'detailed',label:'Detailed',slug:'golden-gate',
   blurb:'The Golden Gate Bridge in San Francisco, the 2,737 m suspension bridge opened in 1937, its two main cables each spun from 27,572 wires. Explore {parts} named components across {systems} systems, from the tower portal bracing and cable bands to the stiffening truss, the six-lane deck with its markings, the anchorages, the Fort Point arch and the toll plaza.'},
 ],
 'empire-state':[
  {id:'simple',label:'Simple',slug:'empire-state-simple',
   blurb:'The Empire State Building in New York City, the 443.2 m Art Deco skyscraper completed in 1931, in simplified schematic form. Explore {parts} named components across {systems} systems, from the limestone base and the 81-story setback shaft to the observatories, the mooring mast and the Art Deco lobby.'},
  {id:'detailed',label:'Detailed',slug:'empire-state',
   blurb:'The Empire State Building in New York City, the 443.2 m Art Deco skyscraper completed in 1931, its 102 stories rising on a riveted steel frame. Explore {parts} named components across {systems} systems, from the five-story base and the setback shaft to the 86th and 102nd floor observatories, the mooring mast, the broadcast aerials, the 1,200 LED crown lights and the three-story lobby.'},
 ],
 'el-castillo':[
  {id:'simple',label:'Simple',slug:'el-castillo-simple',
   blurb:'The 30 meter step pyramid of Kukulcan at Chichen Itza, with nine terraces and four stairways of 91 steps, in simplified schematic form. Explore {parts} named components across {systems} systems, including the buried inner pyramid, offering chambers, and the water filled cenote below.'},
  {id:'detailed',label:'Detailed',slug:'el-castillo',
   blurb:'The Temple of Kukulcan at Chichen Itza: a 30 meter Maya step pyramid with nine terraces and four stairways of 91 steps each. Explore {parts} named components across {systems} systems, from the battered terrace panels and tread by tread stairways to the summit temple, the buried inner pyramid with its offering chambers, and the astronomy of the equinox serpent.'},
 ],
 'sydney-opera-house':[
  {id:'simple',label:'Simple',slug:'sydney-opera-house-simple',
   blurb:'Sydney Opera House on Sydney Harbour, Jorn Utzon\'s 1973 performing arts center with its fourteen shell vaults, in simplified schematic form. Explore {parts} named components across {systems} systems, from the pink granite podium and the tile clad shells to the glass walls, interiors, and supporting structure.'},
  {id:'detailed',label:'Detailed',slug:'sydney-opera-house',
   blurb:'Jorn Utzon\'s 1973 performing arts center on Sydney Harbour: fourteen precast concrete shell vaults, every one a section of a single 75.2 m sphere. Explore {parts} named components across {systems} systems, from the rib fans and chevron tile lids to the steel mullion glass walls, the opened podium with its five venues, and the foundations.'},
 ],
 'burj-al-arab':[
  {id:'simple',label:'Simple',slug:'burj-al-arab-simple',
   blurb:'Dubai’s sail-shaped Burj Al Arab hotel on its artificial island, in simplified schematic form. Explore {parts} named components across {systems} systems, from the fabric sail and V-shaped mast to the 180 m atrium and the helipad.'},
  {id:'detailed',label:'Detailed',slug:'burj-al-arab',
   blurb:'Dubai’s sail-shaped Burj Al Arab, the 321 m luxury hotel on an artificial island 280 m offshore, opened in 1999. Explore {parts} named components across {systems} systems, from the Teflon-coated fiberglass sail and V-shaped mast to the 180 m atrium, the 202 suites, and the helipad 210 m up.'},
 ],
 'burj-khalifa':[
  {id:'simple',label:'Simple',slug:'burj-khalifa-simple',
   blurb:'The Burj Khalifa in Dubai, the world’s tallest building, in simplified schematic form. Explore {parts} named components across {systems} systems, from the Y-shaped buttressed core and spiraling setbacks to the spire reaching 828 m.'},
  {id:'detailed',label:'Detailed',slug:'burj-khalifa',
   blurb:'The Burj Khalifa in Dubai, the world’s tallest building at 828 m, opened in 2010. Explore {parts} named components across {systems} systems, from the Y-shaped buttressed core and the spiraling setback tiers to the 200 m spire, the 57 elevators, and the lake and fountains below.'},
 ],
 'one-world-trade-center':[
  {id:'simple',label:'Simple',slug:'one-world-trade-center-simple',
   blurb:'One World Trade Center in New York, in simplified schematic form. Explore {parts} named components across {systems} systems, from the 185 ft fortified base and the tapering chamfered cube to the spire reaching the symbolic 1,776 ft.'},
  {id:'detailed',label:'Detailed',slug:'one-world-trade-center',
   blurb:'One World Trade Center in New York, rising to the symbolic height of 1,776 ft, opened in 2014. Explore {parts} named components across {systems} systems, from the 185 ft fortified base and the eight-triangle chamfered facade to the observatory, the 408 ft spire, and the memorial plaza.'},
 ],
 'us-capitol':[
  {id:'simple',label:'Simple',slug:'us-capitol-simple',
   blurb:'The United States Capitol in Washington DC, in simplified schematic form. Explore {parts} named components across {systems} systems, from the cast iron dome and the Rotunda to the Senate and House wings.'},
  {id:'detailed',label:'Detailed',slug:'us-capitol',
   blurb:'The United States Capitol in Washington DC, seat of the US Congress, crowned by Thomas U. Walter’s cast iron dome completed in 1866. Explore {parts} named components across {systems} systems, from the 288 ft dome and the 19.5 ft Statue of Freedom to the Rotunda, the two wings, and the crypt below.'},
 ],
 'pentagon':[
  {id:'simple',label:'Simple',slug:'pentagon-simple',
   blurb:'The Pentagon in Arlington, Virginia, in simplified schematic form. Explore {parts} named components across {systems} systems, from the five concentric rings around the central courtyard to the limestone facades and the five entrances.'},
  {id:'detailed',label:'Detailed',slug:'pentagon',
   blurb:'The Pentagon in Arlington, Virginia, among the world’s largest office buildings at about 6.5 million sq ft, built from 1941 to 1943. Explore {parts} named components across {systems} systems, from the five concentric rings A through E and the 17.5 miles of corridors to the 5-acre central courtyard, the limestone facades, and the heliport.'},
 ],
 'trump-tower-chicago':[
  {id:'simple',label:'Simple',slug:'trump-tower-chicago-simple',
   blurb:'Trump International Hotel and Tower in Chicago, in simplified schematic form. Explore {parts} named components across {systems} systems, from the three setback tiers and the riverfront podium to the spire at 1,389 ft.'},
  {id:'detailed',label:'Detailed',slug:'trump-tower-chicago',
   blurb:'Trump International Hotel and Tower in Chicago, 1,389 ft tall with its spire, completed in 2009. Explore {parts} named components across {systems} systems, from the three setbacks and the stainless steel facade to the hotel and residential floors, the concrete core, and the riverwalk.'},
 ],
};

const dir=new URL('../public/models/',import.meta.url);
const readAtlas=(slug)=>JSON.parse(readFileSync(new URL(`${slug}/atlas.json`,dir),'utf8'));
const variantSlugs=new Set(Object.values(VARIANTS).flat().map(v=>v.slug));
const canonicalSlugs=new Set(Object.keys(VARIANTS));
// Model directories that are non-canonical variant slugs stay out of the
// building list; they are reachable through their building's variants.
const slugs=readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).filter(s=>!variantSlugs.has(s)||canonicalSlugs.has(s)).sort();

const entries=slugs.map(slug=>{
 const configured=VARIANTS[slug];
 const defs=configured??[{id:'simple',label:'Simple',slug}];
 const variants=defs.map(d=>{
  const atlas=readAtlas(d.slug);
  for(const key of ['title','location','blurb','systems','explanations'])if(!atlas[key])throw new Error(`${d.slug}: atlas.json is missing "${key}"`);
  const parts=atlas.parts.length,systems=atlas.systems.length;
  return {
   id:d.id,label:d.label,slug:d.slug,parts,systems,
   blurb:(d.blurb??atlas.blurb).replaceAll('{parts}',String(parts)).replaceAll('{systems}',String(systems)),
  };
 });
 const fallback=variants.find(v=>v.id==='simple')??variants[0];
 const atlas=readAtlas(fallback.slug);
 return {
  slug,
  title:atlas.title,
  location:atlas.location,
  blurb:fallback.blurb,
  sourceUrls:atlas.sourceUrls??[],
  systems:atlas.systems.map(s=>({id:s.id,name:s.name,color:s.color})),
  partCount:fallback.parts,
  conceptCount:atlas.concepts.length,
  variants,
 };
});
writeFileSync(new URL('index.json',dir),JSON.stringify(entries,null,1)+'\n');
console.log(`Wrote public/models/index.json with ${entries.length} buildings: ${slugs.join(', ')}`);
