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
