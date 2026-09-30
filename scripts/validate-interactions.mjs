import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createExplosionLayout} from '../app/explosion-layout.ts';
import {PointerTap} from '../app/pointer-tap.ts';
import {atlasTools} from '../app/agent-tools.ts';

const modelsDir=new URL('../public/models/',import.meta.url);
const index=JSON.parse(await readFile(new URL('index.json',modelsDir),'utf8'));
assert.ok(index.length>=1,'index.json lists no buildings');
for (const entry of index) {
  // Every variant ships its own model dataset; validate each one.
  const variants=entry.variants?.length?entry.variants:[{id:'simple',slug:entry.slug,parts:entry.partCount,systems:entry.systems.length}];
  const fallback=variants.find(v=>v.id==='simple')??variants[0];
  assert.equal(entry.partCount,fallback.parts,`${entry.slug}: index part count mismatch`);
  assert.equal(entry.systems.length,fallback.systems,`${entry.slug}: index system count mismatch`);
  for (const variant of variants) {
  const atlas=JSON.parse(await readFile(new URL(`${variant.slug}/atlas.json`,modelsDir)));
  for(const key of ['title','location','blurb','systems','explanations'])assert.ok(atlas[key],`${variant.slug}: atlas.json is missing "${key}"`);
  assert.equal(variant.parts,atlas.parts.length,`${variant.slug}: index part count mismatch`);
  assert.equal(variant.systems,atlas.systems.length,`${variant.slug}: index system count mismatch`);
  const systemIds=new Set(atlas.systems.map(s=>s.id));
  for(const p of atlas.parts)assert.ok(systemIds.has(p.system),`${entry.slug}: part ${p.id} has unknown system ${p.system}`);
  for(const [k,v] of Object.entries(atlas.explanations))assert.ok(v&&v.trim(),`${entry.slug}: empty explanation for ${k}`);
  const groups=[atlas.parts,...[...systemIds].map(system=>atlas.parts.filter(p=>p.system===system))];
  for(const group of groups) for(const aspect of [.46,1,1.7]) {
    const layout=createExplosionLayout(group,aspect),cells=[...layout.cells.values()];
    assert.equal(cells.length,group.length);
    for(let i=0;i<cells.length;i++) {
      const a=cells[i];
      assert.ok(Math.abs(a.x)+a.width/2<=layout.width/2+1e-8);
      assert.ok(Math.abs(a.y)+a.height/2<=layout.height/2+1e-8);
      for(let j=i+1;j<cells.length;j++) {
        const b=cells[j];
        assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2-1e-8 || Math.abs(a.y-b.y)>=(a.height+b.height)/2-1e-8,'Exploded pieces overlap');
      }
    }
  }
  let selected=null;
  const [find,inspect]=atlasTools(atlas,c=>{selected=c;});
  const seed=atlas.concepts[0].name.split(' ')[0];
  const results=find.execute({query:seed});
  assert.ok(results.length>0,`${entry.slug}: search for "${seed}" returned nothing`);
  inspect.execute({id:results[0].id});
  const previous=selected;
  assert.throws(()=>inspect.execute({id:'nonexistent-structure'}));
  assert.equal(selected,previous);
  assert.throws(()=>find.execute({query:' '}));
  console.log(`${variant.slug}: ${atlas.parts.length} parts, ${atlas.systems.length} systems, packing at desktop/mobile aspect ratios and search/inspection contracts passed.`);
 }
}
const tap=new PointerTap();
tap.down(1,10,10,5);assert.equal(tap.up(1,12,11),true);
tap.down(1,10,10,5);tap.move(1,40,10);assert.equal(tap.up(1,10,10),false);
tap.down(1,10,10,12);tap.down(2,20,20,12);assert.equal(tap.up(2,20,20),false);assert.equal(tap.up(1,10,10),false);
tap.down(1,10,10,5);tap.cancel(1);assert.equal(tap.up(1,10,10),false);
tap.down(1,10,10,5);assert.equal(tap.up(1,10,10),true);
assert.equal(createExplosionLayout([]).cells.size,0);
console.log('Tap, drag, multitouch, cancellation, and empty-view checks passed.');
