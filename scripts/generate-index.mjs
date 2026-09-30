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
