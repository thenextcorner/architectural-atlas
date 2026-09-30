// Generates public/models/index.json from the per-building atlas.json files so the
// home page and validation scripts stay in sync with the model data.
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';

const dir=new URL('../public/models/',import.meta.url);
const slugs=readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort();
const entries=slugs.map(slug=>{
 const atlas=JSON.parse(readFileSync(new URL(`${slug}/atlas.json`,dir),'utf8'));
 for(const key of ['title','location','blurb','systems','explanations'])if(!atlas[key])throw new Error(`${slug}: atlas.json is missing "${key}"`);
 return {
  slug,
  title:atlas.title,
  location:atlas.location,
  blurb:atlas.blurb,
  sourceUrls:atlas.sourceUrls??[],
  systems:atlas.systems.map(s=>({id:s.id,name:s.name,color:s.color})),
  partCount:atlas.parts.length,
  conceptCount:atlas.concepts.length,
 };
});
writeFileSync(new URL('index.json',dir),JSON.stringify(entries,null,1)+'\n');
console.log(`Wrote public/models/index.json with ${entries.length} buildings: ${slugs.join(', ')}`);
