import {flushSync} from 'react-dom';
import {registerAtlasTools} from './agent-tools';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Activity,ArrowLeft,ArrowUpRight,ChevronLeft,ChevronRight,Coffee,Download,Focus,Info,Layers3,Pause,RotateCcw,RotateCw,Search,X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Slider} from '@/components/ui/slider';
import {Switch} from '@/components/ui/switch';
import {Sheet,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Combobox,ComboboxInput,ComboboxContent,ComboboxList,ComboboxItem,ComboboxEmpty} from '@/components/ui/combobox';
import BuildingScene from './scene';
import SiteNav from './sitenav';
import {COFFEE_URL,REPO_URL} from './config';
import {trackEvent} from './analytics';
import {COLOSSEUM_LAYERS,COLOSSEUM_TOUR,colosseumLayer} from './colosseum-pilot';
import {composePoster,downloadPoster,POSTER_TIMELINE_FALLBACK} from './colosseum-poster';
import type {PosterCapture} from './colosseum-poster';
import {explanationFor,hasExplanation,GENERIC_EXPLANATION_NOTE,type Atlas,type BuildingIndexEntry,type BuildingSystem,type BuildingVariant,type Concept,type SceneState,type View,type ViewerMode} from './atlas';
const variantStorageKey=(building:string)=>`atlas_detail_variant:${building}`;
const readStoredVariant=(building:string):string|null=>{try{return localStorage.getItem(variantStorageKey(building));}catch{return null;}};
const writeStoredVariant=(building:string,id:string)=>{try{localStorage.setItem(variantStorageKey(building),id);}catch{}};
export default function Viewer({slug}:{slug:string}){
 const detailTitle=useRef<HTMLHeadingElement>(null);
 // Story hotspots injected by the prerendered page (window.__HOTSPOTS__), if any.
 const hotspots=useMemo(()=>{try{const w=window as unknown as {__HOTSPOTS__?:{part:string;title:string;text:string}[]};return Array.isArray(w.__HOTSPOTS__)?w.__HOTSPOTS__:[];}catch{return[];}},[]);
 // Colosseum pilot: Floors and Tour modes. Other buildings keep Explode only.
 const isPilot=slug==='colosseum';
 const [mode,setMode]=useState<ViewerMode>('explode');
 const [tour,setTour]=useState<{step:number;fromVariant:string|null}|null>(null);
 const [focus,setFocus]=useState<{ids:string[];key:number}|null>(null);
 const [floorLayer,setFloorLayer]=useState<number|null>(null);
 // Colosseum Poster pilot: dark stage, scale figures, poster export.
 const [posterStage,setPosterStage]=useState(false);
 const [scaleFigures,setScaleFigures]=useState(false);
 const [posterStatus,setPosterStatus]=useState('');
 const [posterBusy,setPosterBusy]=useState(false);
 const captureRef=useRef<(() => PosterCapture | null) | null>(null);
 const [atlas,setAtlas]=useState<Atlas|null>(null),
 [variants,setVariants]=useState<BuildingVariant[]|null>(null),
 [variantId,setVariantId]=useState<string|null>(null),
 [state,setState]=useState<SceneState>({explode:0,visible:[],selected:[],isolate:false,view:'three-quarter',rotate:false,reset:0}),
 [progress,setProgress]=useState(0),[error,setError]=useState(''),
 [panel,setPanel]=useState<'layers'|'search'|null>(null),
 [details,setDetails]=useState(false),[about,setAbout]=useState(false),
 [query,setQuery]=useState(''),[chosen,setChosen]=useState<Concept|null>(null);
 useEffect(()=>{const abort=new AbortController();
  setProgress(0);setError('');setAtlas(null);setChosen(null);setDetails(false);setPanel(null);
  setVariants(null);setVariantId(null);
  // Resolve the building's model variants from the catalogue. Defaults to the
  // simple variant; a stored choice wins. Falls back to the legacy single-model
  // path when the catalogue cannot be read, so the viewer never goes blank.
  const single:BuildingVariant[]=[{id:'simple',label:'Simple',slug,parts:0,systems:0,blurb:''}];
  fetch('/models/index.json',{signal:abort.signal})
   .then(r=>{if(!r.ok)throw new Error('catalogue');return r.json() as Promise<BuildingIndexEntry[]>;})
   .then((entries:BuildingIndexEntry[])=>{
     const found=entries.find(e=>e.slug===slug)?.variants;
     const vs=found&&found.length?found:single;
     const stored=readStoredVariant(slug);
     const initial=vs.some(v=>v.id===stored)?stored as string:(vs.some(v=>v.id==='simple')?'simple':vs[0].id);
     if(!abort.signal.aborted){setVariants(vs);setVariantId(initial);}
   })
   .catch(()=>{if(!abort.signal.aborted){setVariants(single);setVariantId('simple');}});
  return()=>abort.abort();},[slug]);
 const activeVariant=variants?.find(v=>v.id===variantId)??null;
 const modelSlug=activeVariant?.slug??null;
 const switchVariant=(id:string,persist=true)=>{
  if(id===variantId||!variants?.some(v=>v.id===id))return;
  if(persist)writeStoredVariant(slug,id);
  trackEvent('detail_toggle',{building:slug,variant:id});
  setVariantId(id);
 };
 useEffect(()=>{if(!modelSlug)return;const abort=new AbortController();
  setProgress(0);setError('');setAtlas(null);setChosen(null);setDetails(false);setPanel(null);
  setState(s=>({...s,explode:0,visible:[],selected:[],isolate:false,view:'three-quarter',rotate:false,reset:s.reset+1}));
  fetch(`/models/${modelSlug}/atlas.json`,{signal:abort.signal})
   .then(r=>{if(!r.ok)throw new Error('This building could not be loaded.');return r.json();})
   .then(data=>{const a=data as Atlas;setAtlas(a);setState(s=>({...s,visible:a.systems.map(sys=>sys.id)}));})
   .catch(e=>{if(e.name!=='AbortError')setError(e.message);});
  return()=>abort.abort();},[slug,modelSlug]);
 // Colosseum pilot: each tour step focuses its hotspot part. The tour runs
 // on the Detailed model, where all ten hotspot parts exist; the Simple and
 // Today variants lack some of them. The switch does not overwrite the
 // stored variant choice, and exiting the tour restores it.
 useEffect(()=>{
  if(!tour)return;
  if(variants&&variantId&&variantId!=='detailed'){switchVariant('detailed',false);return;}
  if(!atlas)return;
  const partName=COLOSSEUM_TOUR[tour.step];
  const part=atlas.parts.find(p=>p.name.toLowerCase()===partName.toLowerCase());
  if(part){setFocus({ids:[part.id],key:Date.now()});setState(s=>({...s,selected:[part.id],isolate:false,rotate:false}));}
  else{setFocus(null);setState(s=>({...s,selected:[],isolate:false}));}
 },[tour,atlas,variants,variantId]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='/'&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLTextAreaElement)){e.preventDefault();setPanel('search');setDetails(false);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 const systems:BuildingSystem[]=useMemo(()=>atlas?.systems??[],[atlas]);
 const parts=useMemo(()=>new Map(atlas?.parts.map(p=>[p.id,p])),[atlas]);
 const counts=useMemo(()=>Object.fromEntries(systems.map(s=>[s.id,atlas?.parts.filter(p=>p.system===s.id).length??0])),[atlas,systems]);
 const activeSystems=systems.filter(s=>(counts[s.id]??0)>0);
 const selectedParts=state.selected.map(id=>parts.get(id)).filter(p=>!!p),selected=selectedParts[0],system=systems.find(s=>s.id===selected?.system);
 const visibleCount=atlas?.parts.filter(p=>state.isolate?state.selected.includes(p.id):state.visible.includes(p.system)||state.selected.includes(p.id)).length??0;
 const results=useMemo(()=>{if(!atlas)return[];const term=query.toLowerCase().trim();if(!term)return atlas.concepts.slice().sort((a,b)=>a.name.length-b.name.length).slice(0,6);return atlas.concepts.filter(c=>c.name.toLowerCase().includes(term)||c.id.toLowerCase().includes(term)).sort((a,b)=>a.name.length-b.name.length).slice(0,80);},[atlas,query]);
 const choose=(c:Concept)=>{setChosen(c);setState(s=>({...s,selected:c.elements,isolate:false,rotate:false}));setDetails(true);setPanel(null);};
 useEffect(()=>{if(!atlas)return;return registerAtlasTools(atlas,c=>flushSync(()=>choose(c)));},[atlas]);
 const choosePart=(id:string)=>{const p=parts.get(id);if(!p)return;setChosen({id:p.conceptId,name:p.name,elements:[id]});setState(s=>({...s,selected:[id],isolate:false,rotate:false}));setDetails(true);setPanel(null);};
 const toggle=(id:string)=>{setDetails(false);setState(s=>({...s,selected:[],isolate:false,visible:s.visible.includes(id)?s.visible.filter(x=>x!==id):[...s.visible,id]}));};
 const startTour=()=>{
  if(!isPilot||tour||!variants)return;
  const from=variantId;
  setTour({step:0,fromVariant:from});
  setMode('tour');setFloorLayer(null);
  setState(s=>({...s,explode:0,selected:[],isolate:false,rotate:false}));
  setDetails(false);setPanel(null);
  if(from!=='detailed')switchVariant('detailed',false);
 };
 const exitTour=()=>{
  if(!tour)return;
  const from=tour.fromVariant;
  setTour(null);setFocus(null);
  setMode('explode');
  setState(s=>({...s,explode:0,selected:[],isolate:false,rotate:false}));
  if(from&&from!==variantId)switchVariant(from,false);
 };
 const enterMode=(next:'explode'|'floors')=>{
  if(!isPilot)return;
  if(tour)exitTour();
  if(next===mode)return;
  setMode(next);setFloorLayer(null);setFocus(null);
  setState(s=>({...s,explode:0,selected:[],isolate:false,rotate:false,reset:s.reset+1}));
  setDetails(false);setPanel(null);
 };
 // Colosseum Poster pilot: the poster stage is a dark slate backdrop with
 // warm light and soft shadows. Turning it on jumps to the separated
 // Floors stack, the composition the poster is built from.
 const togglePosterStage=()=>{
  if(!isPilot)return;
  const next=!posterStage;
  setPosterStage(next);
  setPosterStatus('');
  if(next&&!tour){
   if(mode!=='floors')enterMode('floors');
   setState(s=>({...s,explode:0.85,selected:[],isolate:false,rotate:false}));
  }
 };
 // Colosseum Poster pilot: compose the live Floors view into a poster PNG
 // and download it. Waits for the stack to settle, then captures the main
 // view and the three insets from the real model in one synchronous pass.
 const exportPoster=async()=>{
  if(!isPilot||posterBusy)return;
  setPosterBusy(true);setPosterStatus('Preparing poster…');
  try{
   if(mode!=='floors')enterMode('floors');
   setState(s=>({...s,explode:0.85,selected:[],isolate:false,rotate:false}));
   await new Promise(r=>setTimeout(r,1400));
   const capture=captureRef.current?.()??null;
   if(!capture){setPosterStatus('The 3D view is not ready yet. Try again in a moment.');setPosterBusy(false);return;}
   const layers=COLOSSEUM_LAYERS.map(l=>{
    const hs=hotspots.find(h=>h.part===l.hotspotPart);
    return {name:l.name,text:hs?hs.text:''};
   });
   const canvas=document.createElement('canvas');
   await composePoster(canvas,capture,layers,POSTER_TIMELINE_FALLBACK);
   downloadPoster(canvas);
   setPosterStatus('Poster downloaded.');
  }catch{
   setPosterStatus('The poster could not be made. Try again.');
  }
  setPosterBusy(false);
 };
 const reset=()=>{if(tour)exitTour();setState(s=>({explode:0,visible:systems.map(x=>x.id),selected:[],isolate:false,view:'three-quarter',rotate:false,reset:s.reset+1}));setChosen(null);setDetails(false);setPanel(null);};
 const goStep=(d:number)=>{if(!tour)return;const next=Math.min(COLOSSEUM_TOUR.length-1,Math.max(0,tour.step+d));if(next!==tour.step)setTour({...tour,step:next});};
 const chooseFloorLayer=(li:number)=>{
  if(!atlas)return;
  if(floorLayer===li){setFloorLayer(null);setState(s=>({...s,selected:[]}));return;}
  setFloorLayer(li);
  // The shoring wedges, fallen wall and material samples are not a floor;
  // they stay hidden in Floors mode, so selecting a layer must not select them.
  const ids=atlas.parts.filter(p=>colosseumLayer(p)===li&&p.system!=='ruin'&&p.system!=='materials').map(p=>p.id);
  setState(s=>({...s,explode:Math.max(s.explode,0.6),selected:ids,isolate:false,rotate:false}));
  setDetails(false);
 };
 const openPanel=(next:'layers'|'search')=>{setDetails(false);setPanel(p=>p===next?null:next);};
 const title=atlas?.title??'Architectural Atlas',loc=atlas?.location??'',assembledCaption=atlas?`${title.toUpperCase()} · ${loc.toUpperCase()}`:'LOADING';
 const tourStop=tour?hotspots.find(h=>h.part.toLowerCase()===COLOSSEUM_TOUR[tour.step].toLowerCase()):undefined;
 const primarySource=atlas?.sourceUrls?.[0];
 return <main className={isPilot?(posterStage?'studio pilot poster-stage':'studio pilot'):'studio'}>
  {atlas&&<BuildingScene atlas={atlas} hotspots={hotspots} state={{...state,mode:isPilot?mode:undefined,poster:isPilot&&posterStage,scaleFigures:isPilot&&scaleFigures,focus:tour?focus:null,inspectorOpen:details&&selectedParts.length>0}} captureRef={captureRef} onSelect={tour?()=>{}:choosePart} onProgress={n=>{setProgress(n);if(n===100)setError('');}} onError={setError}/>}
  <div className="vignette"/>
  <div className="identity-wrap">
  <header className="identity"><div className="eyebrow"><span className="status-dot"/> INTERACTIVE ARCHITECTURE</div><h1>{title}<Badge variant="outline" className="edition">3D</Badge></h1><div className="identity-meta">{atlas?atlas.parts.length.toLocaleString():'…'} modeled pieces <span>·</span> {atlas?`${title}, ${loc}`:'Loading'}</div>{variants&&variants.length>1&&<div className="variant-toggle" role="group" aria-label="Model detail level">{variants.map(v=><button key={v.id} type="button" className={v.id===variantId?'active':''} aria-pressed={v.id===variantId} disabled={!!tour} onClick={()=>switchVariant(v.id)}>{v.label}</button>)}</div>}</header>
  <SiteNav/>
  </div>
  <nav className="top-actions" aria-label="Explorer panels"><a className="back-link" href="/"><ArrowLeft size={16}/><span>All buildings</span></a><a className="back-link coffee-link" href={COFFEE_URL} target="_blank" rel="noreferrer"><Coffee size={16}/><span>Buy me a coffee</span></a><Button variant="ghost" className={panel==='search'?'active':''} onClick={()=>openPanel('search')} aria-label="Search components"><Search size={18}/><span>Find a component</span><kbd>/</kbd></Button>{isPilot&&<Button variant="ghost" className={posterStage?'active':''} aria-pressed={posterStage} onClick={togglePosterStage} title="Poster stage: dark backdrop, warm light, soft shadows"><span>Poster stage</span></Button>}<Button variant="ghost" className="icon-button" aria-label="About this model" onClick={()=>{setDetails(false);setPanel(null);setAbout(true);}}><Info size={18}/></Button></nav>
  <section className={`layers-panel glass ${panel==='layers'?'mobile-open':''}`} aria-label="Structural layers">
   <div className="panel-heading"><span>Systems</span><Button variant="ghost" className="mobile-only icon-button" onClick={()=>setPanel(null)} aria-label="Close systems"><X size={18}/></Button><Badge variant="secondary" className="desktop-only small-number">{activeSystems.length}</Badge></div>
   <div className="layer-presets"><Button variant="ghost" aria-pressed={activeSystems.every(x=>state.visible.includes(x.id))} onClick={()=>setState(s=>({...s,selected:[],isolate:false,visible:activeSystems.map(x=>x.id)}))}>All</Button></div>
   <div className="system-list">{activeSystems.map(s=><div className={`system-row ${state.visible.includes(s.id)?'enabled':''}`} key={s.id}><Button variant="ghost" className="system-name" title={`Show only ${s.name.toLowerCase()}`} onClick={()=>setState(v=>({...v,visible:[s.id],isolate:false,selected:[]}))}><span className="system-dot" style={{background:s.color}}/>{s.name}<span className="system-count">{counts[s.id]}</span></Button><Switch checked={state.visible.includes(s.id)} onCheckedChange={()=>toggle(s.id)} aria-label={`Show ${s.name.toLowerCase()}`} /></div>)}</div>
   <div className="panel-foot"><span>{visibleCount.toLocaleString()} pieces visible</span><Button variant="ghost" onClick={()=>setState(s=>({...s,visible:[],selected:[],isolate:false}))}>Hide all</Button></div>
  </section>
  {panel==='search'&&<section className="search-panel glass" aria-label="Find a component"><div className="panel-heading"><span>Find a component</span><Button variant="ghost" className="icon-button" onClick={()=>setPanel(null)} aria-label="Close search"><X size={18}/></Button></div><Combobox<Concept> items={results} value={null} onValueChange={value=>{if(value)choose(value);}} inputValue={query} onInputValueChange={setQuery} itemToStringLabel={c=>c.name} filter={null} open onOpenChange={open=>{if(!open)setPanel(null);}}><ComboboxInput autoFocus placeholder="Search components…" aria-label="Search named components" showTrigger={false}/><ComboboxContent className="tower-search-results"><ComboboxEmpty>No components match your search.</ComboboxEmpty><ComboboxList>{(c:Concept)=><ComboboxItem key={c.id} value={c}><span className="search-result-name">{c.name}</span><span className="small-number">{c.elements.length} {c.elements.length===1?'piece':'pieces'}</span></ComboboxItem>}</ComboboxList></ComboboxContent></Combobox><p className="search-note">{query?'Showing up to 80 matches. Refine your search to find smaller components.':'Start with a major assembly, or search every named component.'}</p></section>}
  {tour&&tourStop&&<section className="tour-card glass" aria-label="Guided tour"><div className="tour-card-head"><span>Stop {tour.step+1} of {COLOSSEUM_TOUR.length}</span><span>{tourStop.title}</span></div><p>{tourStop.text}</p></section>}
  {/* Floors panel rows are listed top layer first, the same order as the
  layers appear in the render, so the leader lines from each layer to its
  row never cross. data-layer keeps each row tied to its layer number. */}
  {isPilot&&mode==='floors'&&<section className="floors-panel glass" aria-label="Floors"><div className="panel-heading"><span>Floors</span><Button variant="ghost" className="mobile-only icon-button" onClick={()=>enterMode('explode')} aria-label="Close floors"><X size={18}/></Button><Badge variant="secondary" className="desktop-only small-number">{COLOSSEUM_LAYERS.length}</Badge></div><div className="floor-list">{[...COLOSSEUM_LAYERS.keys()].reverse().map(li=>{const l=COLOSSEUM_LAYERS[li];const hs=hotspots.find(h=>h.part===l.hotspotPart);return <button key={l.name} type="button" data-layer={li} className={`floor-row ${floorLayer===li?'active':''}`} aria-pressed={floorLayer===li} onClick={()=>chooseFloorLayer(li)}><span className="floor-name">{l.name}</span>{hs&&<span className="floor-text">{hs.text}</span>}</button>;})}</div><div className="panel-foot"><span>Scale figures on the arena floor</span><Switch checked={scaleFigures} onCheckedChange={setScaleFigures} aria-label="Show schematic scale figures on the arena floor"/></div></section>}
  <nav className="view-controls glass" aria-label="Camera controls">{(['three-quarter','front','side','back'] as View[]).map((v,i)=><Button variant="ghost" key={v} className={state.view===v?'active':''} aria-pressed={state.view===v} disabled={state.explode>.8&&v!=='front'} onClick={()=>setState(s=>({...s,view:v,reset:s.reset+1,rotate:false}))} title={`${v} view`} aria-label={`${v} view`}><span>{['¾','F','S','B'][i]}</span></Button>)}<i/><Button variant="ghost" disabled={state.explode>=.4} aria-label={state.rotate?'Pause rotation':'Rotate structure'} title="Auto rotate" className={state.rotate?'active':''} onClick={()=>setState(s=>({...s,rotate:!s.rotate}))}>{state.rotate?<Pause size={17}/>:<RotateCw size={18}/>}</Button><Button variant="ghost" aria-label="Reset view and layers" title="Reset" onClick={reset}><RotateCcw size={17}/></Button></nav>
  {!tour&&<div className="scene-caption"><span className="caption-line"/><span>{state.isolate?(chosen?.name??'SELECTED COMPONENT'):mode==='floors'?(state.explode>.05?'SEPARATED FLOORS':assembledCaption):state.explode>.95?'STRUCTURAL INVENTORY':state.explode>.05?'SEPARATED COMPONENTS':assembledCaption}</span><span className="caption-line"/></div>}
  <div className={`bottom-dock glass ${isPilot?'pilot-dock':''}`}>{isPilot&&<div className="mode-switch" role="group" aria-label="Viewer mode"><button type="button" className={mode==='explode'?'active':''} aria-pressed={mode==='explode'} onClick={()=>enterMode('explode')}>Explode</button><button type="button" className={mode==='floors'?'active':''} aria-pressed={mode==='floors'} onClick={()=>enterMode('floors')}>Floors</button><button type="button" className={mode==='tour'?'active':''} aria-pressed={mode==='tour'} onClick={startTour}>Tour</button></div>}{tour?<div className="tour-nav"><Button variant="ghost" onClick={()=>goStep(-1)} disabled={tour.step===0} aria-label="Previous stop"><ChevronLeft size={18}/><span>Back</span></Button><span className="tour-count">Stop {tour.step+1} of {COLOSSEUM_TOUR.length}</span><Button variant="ghost" onClick={()=>goStep(1)} disabled={tour.step===COLOSSEUM_TOUR.length-1} aria-label="Next stop"><span>Next</span><ChevronRight size={18}/></Button><Button variant="ghost" onClick={exitTour}><span>Exit tour</span></Button></div>:<div className="dock-row"><Button variant="ghost" className="mobile-only dock-layers" onClick={()=>openPanel('layers')} aria-label="Open system layers"><Layers3 size={20}/><span>Systems</span></Button><div className="explode-control"><div className="explode-label"><label id="explode-label">{mode==='floors'?'Separate floors':'Explode structure'}</label><output>{Math.round(state.explode*100)}<span>%</span></output></div><Slider aria-labelledby="explode-label" min={0} max={100} step={1} value={[state.explode*100]} onValueChange={v=>setState(s=>({...s,explode:(Array.isArray(v)?v[0]:v)/100,view:(Array.isArray(v)?v[0]:v)>80?'front':s.view,rotate:false}))}/><div className="slider-endpoints"><span>{mode==='floors'?'Stacked':'Assembled'}</span><span>{mode==='floors'?'Separated':'Every piece'}</span></div></div>{isPilot&&posterStage&&<Button variant="ghost" className="dock-poster" onClick={exportPoster} disabled={posterBusy} aria-label="Download poster image"><Download size={18}/><span>{posterBusy?'Making poster…':'Download poster'}</span></Button>}<Button variant="ghost" className="dock-reset" onClick={reset} aria-label="Assemble and reset"><RotateCcw size={18}/><span>Reset</span></Button></div>}<div className="poster-status" role="status">{posterStatus}</div></div>
  <footer className="studio-footer"><span>{state.explode>.8?'Drag to pan':'Drag to orbit'} <b>·</b> Pinch to zoom <b>·</b> Tap to inspect</span><Button variant="ghost" onClick={()=>{setDetails(false);setPanel(null);setAbout(true);}}>Source & credits <ArrowUpRight size={12}/></Button></footer>
  {progress<100&&!error&&<div className="loading glass" role="status"><Activity size={18}/><div><strong>Preparing the structure</strong><span>{progress}% · Loading {atlas?.parts.length.toLocaleString()??'…'} pieces</span><div className="loading-track"><i style={{width:`${progress}%`}}/></div></div></div>}
  {error&&<div className="loading glass error" role="alert"><p>{error}</p><Button variant="ghost" onClick={()=>location.reload()}>Reload viewer</Button><a className="source-link" href="/">Back to all buildings</a></div>}
  <Sheet open={details&&selectedParts.length>0} modal={false} disablePointerDismissal onOpenChange={setDetails}><SheetContent initialFocus={detailTitle} className={`detail-sheet glass ${state.isolate?'is-isolated':''}`} showCloseButton={true}><div className="detail-header"><div className="detail-accent" style={{background:system?.color}}/><div className="eyebrow">{system?.name??'STRUCTURE'}</div><SheetTitle ref={detailTitle} tabIndex={-1} className="structure-title">{chosen?.name}</SheetTitle></div><div className="detail-scroll" key={`${chosen?.id}-${state.isolate}`}><SheetDescription className="structure-description">{atlas&&chosen&&selected?explanationFor(atlas,chosen.name,selected.system):''}</SheetDescription>{atlas&&chosen&&!hasExplanation(atlas,chosen.name)&&<span className="context-note">{GENERIC_EXPLANATION_NOTE}</span>}<div className="structure-meta"><span>Atlas reference<strong>{chosen?.id}</strong></span><span>Selected pieces<strong>{state.selected.length.toLocaleString()}</strong></span></div>{selectedParts.length>1&&<div className="member-list"><h3>Included components</h3>{selectedParts.slice(0,50).map(p=><Button variant="ghost" key={p.id} onClick={()=>choosePart(p.id)}><span>{p.name}</span><ChevronRight size={14}/></Button>)}{selectedParts.length>50&&<p>And {selectedParts.length-50} more modeled pieces.</p>}</div>}{primarySource&&<a className="source-link" href={primarySource.url} target="_blank" rel="noreferrer">Read the reference article <ArrowUpRight size={14}/></a>}</div><div className="detail-actions"><Button className={`primary-action ${state.isolate?'active':''}`} onClick={()=>setState(s=>({...s,isolate:!s.isolate,explode:0}))}><Focus size={18}/>{state.isolate?'Show surrounding structure':'Isolate component'}<ChevronRight size={16}/></Button><Button variant="ghost" className="secondary-action" onClick={()=>{setState(s=>({...s,selected:[],isolate:false}));setDetails(false);}}>Clear selection</Button></div></SheetContent></Sheet>
  <Sheet open={about} onOpenChange={setAbout}><SheetContent className="about-sheet glass"><div className="eyebrow">SOURCE & SCOPE</div><SheetTitle className="structure-title">A structure, taken apart.</SheetTitle>{atlas&&<><SheetDescription>Explore {atlas.title} as {atlas.parts.length.toLocaleString()} named components across {atlas.systems.length} systems.</SheetDescription><div className="about-copy"><p><strong>{atlas.title} · {atlas.location}</strong><br/>{atlas.blurb}</p><p>Documented dimensions are taken from the reference sources. Shapes between those fixed points are schematic, not engineering drawings.</p><p>Colors and system groupings are designed for exploration. The geometry is procedural and simplified for the web, and short explanations provide general context.</p><h3>Sources</h3>{atlas.sourceUrls.map(u=><a key={u.url} href={u.url} target="_blank" rel="noreferrer">{u.label} <ArrowUpRight size={14}/></a>)}<p>The viewer code is a fork of <a href="https://github.com/ashemag/human-atlas" target="_blank" rel="noreferrer" style={{display:'inline'}}>Human Atlas by ashemag</a>, MIT licensed. Our fork is on <a href={REPO_URL} target="_blank" rel="noreferrer" style={{display:'inline'}}>GitHub</a>.</p></div></>}</SheetContent></Sheet>
 </main>;
}
