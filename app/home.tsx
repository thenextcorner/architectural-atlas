import {useEffect,useState} from 'react';
import {ArrowUpRight,Coffee} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {COFFEE_URL,OWNER_URL,REPO_URL} from './config';
import {openCookieSettings} from './consent';
import type {BuildingIndexEntry} from './atlas';
export default function IndexPage(){
 const [entries,setEntries]=useState<BuildingIndexEntry[]|null>(null),[error,setError]=useState('');
 useEffect(()=>{const abort=new AbortController();
  fetch('/models/index.json',{signal:abort.signal})
   .then(r=>{if(!r.ok)throw new Error('The building catalogue could not be loaded.');return r.json();})
   .then(data=>setEntries(data as BuildingIndexEntry[]))
   .catch(e=>{if(e.name!=='AbortError')setError(e.message);});
  return()=>abort.abort();},[]);
 const total=entries?.reduce((n,e)=>n+e.partCount,0)??0;
 return <main className="index">
  <div className="index-inner">
   <header className="index-head">
    <div className="eyebrow"><span className="status-dot"/> INTERACTIVE ARCHITECTURE</div>
    <a className="coffee-btn" href={COFFEE_URL} target="_blank" rel="noreferrer"><Coffee size={15}/><span>Buy me a coffee</span></a>
    <h1>Architectural Atlas<Badge variant="outline" className="edition">3D</Badge></h1>
    <p className="index-sub">{entries?`${entries.length} famous structures, taken apart in 3D. `:''}{entries?`${total.toLocaleString()} modeled pieces across ${entries.length} buildings. `:''}Orbit every model, explode it into a structural inventory, and inspect each named component.</p>
   </header>
   {error&&<p className="index-error" role="alert">{error}</p>}
   {!entries&&!error&&<p className="index-loading" role="status">Loading the atlas…</p>}
   <div className="index-grid">{(entries??[]).map(e=>
    <a key={e.slug} className="index-card" href={`#/viewer/${e.slug}`}>
     <div className="index-dots">{e.systems.map(s=><span key={s.id} className="index-dot" style={{background:s.color}} title={s.name}/>)}</div>
     <h2>{e.title}</h2>
     <p className="index-loc">{e.location}</p>
     <p className="index-blurb">{e.blurb}</p>
     <div className="index-card-foot"><span>{e.partCount} modeled pieces · {e.systems.length} systems</span><span className="index-open">Explore <ArrowUpRight size={14}/></span></div>
    </a>)}
   </div>
   <footer className="index-foot">
    <nav className="foot-links" aria-label="Footer">
     <a href="/privacy/">Privacy</a>
     <a href="/cookies/">Cookies</a>
     <a href="/terms/">Terms</a>
     <button type="button" className="foot-link-btn" onClick={openCookieSettings}>Cookie settings</button>
     <a href={OWNER_URL} target="_blank" rel="noreferrer">dennisgoedegebuure.com</a>
     <a href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>
    </nav>
    <span>Viewer code is a fork of <a href="https://github.com/ashemag/human-atlas" target="_blank" rel="noreferrer">Human Atlas by ashemag</a>, MIT licensed.</span>
   </footer>
  </div>
 </main>;
}
