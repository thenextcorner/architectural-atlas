import {Suspense,lazy,useEffect,useState} from 'react';
const Viewer=lazy(()=>import('./viewer'));
import IndexPage from './home';
import ConsentBanner from './consent';
function usePath(){const [path,setPath]=useState(()=>window.location.pathname);
 useEffect(()=>{const on=()=>setPath(window.location.pathname);window.addEventListener('popstate',on);return()=>window.removeEventListener('popstate',on);},[]);
 return path;}
/** Path router: `/` is the building index, `/viewer/<slug>/` is a per-building
 * explorer. Served as clean URLs through a Cloudflare Pages rewrite
 * (`/viewer/*` -> `/index.html`). Legacy `#/viewer/<slug>` hashes redirect
 * to the clean URL on first load. */
export default function Home(){
 useEffect(()=>{const m=/^#\/viewer\/([a-z0-9-]+)\/?$/.exec(window.location.hash);
  if(m) window.location.replace(`/viewer/${m[1]}/`);},[]);
 const path=usePath();
 const match=/^\/viewer\/([a-z0-9-]+)\/?$/.exec(path);
 if(match)return <Suspense fallback={<div className="index-loading" role="status">Loading the 3D viewer…</div>}><Viewer key={match[1]} slug={match[1]}/><ConsentBanner/></Suspense>;
 return <><IndexPage/><ConsentBanner/></>;
}
