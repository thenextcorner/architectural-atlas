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
export interface SceneState {inspectorOpen?:boolean;explode:number;visible:string[];selected:string[];isolate:boolean;view:View;rotate:boolean;reset:number}
export function explanationFor(atlas:Atlas,name:string,systemId:string):string{
 return atlas.explanations?.[name.toLowerCase()] ?? atlas.systems.find(s=>s.id===systemId)?.description ?? '';
}
export function hasExplanation(atlas:Atlas,name:string):boolean{
 return Object.prototype.hasOwnProperty.call(atlas.explanations??{},name.toLowerCase());
}
export const GENERIC_EXPLANATION_NOTE='System overview · component identified from reference dimensions';
