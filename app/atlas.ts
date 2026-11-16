export interface BuildingSystem {id:string;name:string;color:string;description:string}
export interface SourceUrl {label:string;url:string}
export interface Part {id:string;name:string;conceptId:string;system:string;chunk:number;color?:string;positions:number;normals:number;indices:number;vertexCount:number;indexCount:number;bounds:[number[],number[]]}
export interface Concept {id:string;name:string;elements:string[]}
export interface Atlas {
 version:string;source?:string;scope?:string;
 title:string;location:string;blurb:string;sourceUrls:SourceUrl[];
 systems:BuildingSystem[];explanations:Record<string,string>;
 parts:Part[];concepts:Concept[];
 chunks:{url:string;bytes:number;gzip?:string;gzipBytes?:number}[];triangles:number;spread?:number;
}
export interface BuildingVariant {id:string;label:string;slug:string;parts:number;systems:number;blurb:string}
export interface BuildingIndexEntry {
 slug:string;title:string;location:string;blurb:string;sourceUrls:SourceUrl[];
 systems:{id:string;name:string;color:string}[];partCount:number;conceptCount:number;
 variants:BuildingVariant[];
}
export type View = 'three-quarter'|'front'|'back'|'side';
export type ViewerMode = 'explode'|'floors'|'tour';
export interface SceneState {inspectorOpen?:boolean;explode:number;visible:string[];selected:string[];isolate:boolean;view:View;rotate:boolean;reset:number;mode?:ViewerMode;focus?:{ids:string[];key:number}|null;poster?:boolean;scaleFigures?:boolean;highlight?:string[]|null;highlightSector?:{angle:number;half:number}|null}
export function explanationFor(atlas:Atlas,name:string,systemId:string):string{
 return atlas.explanations?.[name.toLowerCase()] ?? atlas.systems.find(s=>s.id===systemId)?.description ?? '';
}
// Dark-stage check: measure the area-weighted luminance of the model's
// upper mass (what reads against the sky). Light models get a dark studio
// backdrop so the structure stands out instead of dissolving into it.
// Shared by the scene (clear color, ground colors) and the viewer (the
// dark-stage class on the page chrome), so both always agree on the
// loaded model. The scene used to add the class to the page itself and
// never remove it, so the dark chrome leaked past a tour that had
// switched to a light-mass variant; React owns the class now.
export function isDarkStage(atlas:Atlas):boolean{
 const lum=(hex:string)=>{const n=parseInt(hex.slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255;
  const f=(c:number)=>c>0.03928?Math.pow((c+0.055)/1.055,2.4):c/12.92;
  return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
 const sysLum=new Map(atlas.systems.map(s=>[s.id,lum(s.color??'#aebbb8')] as const));
 let minY=Infinity,maxY=-Infinity;
 for(const p of atlas.parts){minY=Math.min(minY,p.bounds[0][1]);maxY=Math.max(maxY,p.bounds[1][1]);}
 const centerY=(minY+maxY)/2;
 let tot=0,wsum=0;
 for(const p of atlas.parts){
  if((p.bounds[0][1]+p.bounds[1][1])/2<=centerY)continue;
  const sx=p.bounds[1][0]-p.bounds[0][0],sy=p.bounds[1][1]-p.bounds[0][1],sz=p.bounds[1][2]-p.bounds[0][2];
  const a=2*(sx*sy+sy*sz+sx*sz);tot+=a;wsum+=(sysLum.get(p.system)??0.5)*a;}
 return tot>0&&wsum/tot>0.55;
}
export function hasExplanation(atlas:Atlas,name:string):boolean{
 return Object.prototype.hasOwnProperty.call(atlas.explanations??{},name.toLowerCase());
}
export const GENERIC_EXPLANATION_NOTE='System overview · component identified from reference dimensions';
