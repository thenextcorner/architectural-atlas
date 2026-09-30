import {Suspense,lazy,useEffect,useState} from 'react';
const Viewer=lazy(()=>import('./viewer'));
import IndexPage from './home';
import ConsentBanner from './consent';
function useHash(){const [hash,setHash]=useState(()=>window.location.hash);
 useEffect(()=>{const on=()=>setHash(window.location.hash);window.addEventListener('hashchange',on);return()=>window.removeEventListener('hashchange',on);},[]);
 return hash;}
/** Hash router: `#/` is the building index, `#/viewer/<slug>` is a per-building
 * explorer. Hashes keep every route deep-linkable on static hosts and file URLs. */
export default function Home(){
 const hash=useHash();
 const match=/^#\/viewer\/([a-z0-9-]+)\/?$/.exec(hash);
 if(match)return <Suspense fallback={<div className="index-loading" role="status">Loading the 3D viewer…</div>}><Viewer key={match[1]} slug={match[1]}/><ConsentBanner/></Suspense>;
 return <><IndexPage/><ConsentBanner/></>;
}
