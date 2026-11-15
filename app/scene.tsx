import {useEffect,useRef} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {createExplosionLayout} from './explosion-layout';
import {COLOSSEUM_LAYERS,colosseumLayer,FLOOR_GAP} from './colosseum-pilot';
import type {PosterCapture} from './colosseum-poster';
import {decodeModelResponse} from './model-download';
import {PointerTap} from './pointer-tap';
import {type Atlas,type SceneState} from './atlas';
interface Props {atlas:Atlas;state:SceneState;onSelect:(id:string)=>void;onProgress:(n:number)=>void;onError:(s:string)=>void;hotspots?:{part:string;title:string;text:string}[];captureRef?:{current:(() => PosterCapture | null) | null}}
export default function BuildingScene({atlas,state,onSelect,onProgress,onError,hotspots,captureRef}:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(state),select=useRef(onSelect),hotspotRef=useRef(hotspots);
 latest.current=state;select.current=onSelect;hotspotRef.current=hotspots;
 useEffect(()=>{
  const el=host.current!;let disposed=false,frame=0,dirty=true,ready=false,lastView='',lastReset=-1,lastIsolate='',lastFocus='',layoutKey='',amount=0,lastPoster=false,lastScaleFigures=false,lastDiscs=false,lastPlinth=false,lastShadow=false;
  let lastState:SceneState|null=null;
  const abort=new AbortController();
  let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch{onError('This browser could not start the 3D viewer. Please try a browser with WebGL enabled.');return;}
  const modelBox=new T.Box3();atlas.parts.forEach(p=>modelBox.union(new T.Box3(new T.Vector3().fromArray(p.bounds[0]),new T.Vector3().fromArray(p.bounds[1]))));
  const modelSize=modelBox.getSize(new T.Vector3()),modelCenter=modelBox.getCenter(new T.Vector3());
  // Contrast check: measure the area-weighted luminance of the model's upper
  // mass (what reads against the sky). Light models get a dark studio
  // backdrop so the structure stands out instead of dissolving into it.
  const darkStage=(()=>{
   const lum=(hex:string)=>{const n=parseInt(hex.slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255;
    const f=(c:number)=>c>0.03928?Math.pow((c+0.055)/1.055,2.4):c/12.92;
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
   const sysLum=new Map(atlas.systems.map(s=>[s.id,lum(s.color??'#aebbb8')] as const));
   let tot=0,wsum=0;
   for(const p of atlas.parts){
    if((p.bounds[0][1]+p.bounds[1][1])/2<=modelCenter.y)continue;
    const sx=p.bounds[1][0]-p.bounds[0][0],sy=p.bounds[1][1]-p.bounds[0][1],sz=p.bounds[1][2]-p.bounds[0][2];
    const a=2*(sx*sy+sy*sz+sx*sz);tot+=a;wsum+=(sysLum.get(p.system)??0.5)*a;}
   return tot>0&&wsum/tot>0.55;})();
  if(darkStage)el.closest('.studio')?.classList.add('dark-stage');
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<768?1.5:2));renderer.setClearColor(darkStage?'#33393f':'#f2f3f3');renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  // Poster stage: soft shadows are ready before any light casts them, so
  // toggling the poster stage never needs a renderer rebuild. Local
  // clipping is on so the section cutaway's clip plane always applies.
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.localClippingEnabled=true;
  el.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Interactive architectural model. Drag to orbit, pinch or scroll to zoom, and tap a component to inspect it.');
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.005,100),controls=new OrbitControls(camera,renderer.domElement);
  camera.position.set(1.5,1.2,4);controls.target.set(0,1,0);controls.enableDamping=true;controls.dampingFactor=.085;controls.minDistance=.07;controls.maxDistance=40;controls.maxPolarAngle=Math.PI*.96;controls.addEventListener('change',()=>{dirty=true;});
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);scene.environment=env.texture;room.dispose();pmrem.dispose();
  scene.add(new T.HemisphereLight(0xffffff,0xa7acb2,1.05));
  const key=new T.DirectionalLight(0xfffaf4,2.3);key.position.set(-2,4,3);
  key.castShadow=false;key.shadow.mapSize.set(2048,2048);
  // Shadow frustum covers the whole model plus its cast shadows; the
  // projection matrix must be updated after changing the bounds, or the
  // defaults (plus/minus 5) stay in effect.
  key.shadow.camera.left=-3;key.shadow.camera.right=3;key.shadow.camera.top=3;key.shadow.camera.bottom=-3;
  key.shadow.camera.near=.5;key.shadow.camera.far=20;key.shadow.bias=-.0004;key.shadow.normalBias=.02;key.shadow.camera.updateProjectionMatrix();
  scene.add(key);
  const rim=new T.DirectionalLight(0xe9f0ff,1.8);rim.position.set(2,2,-3);scene.add(rim);
  const platformRadius=Math.max(.68,Math.max(modelSize.x,modelSize.z)*.62);
  // The ground disc used to be a radius-30 slab that read as a pancake
  // under the model. It is now a modest plinth just wider than the
  // platform, so the model, not the disc, fills the view.
  const ground=new T.Mesh(new T.CircleGeometry(platformRadius*1.15,96),new T.MeshStandardMaterial({color:darkStage?0x454e55:0xd5d9dc,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.019;ground.receiveShadow=true;scene.add(ground);
  const platform=new T.Mesh(new T.CylinderGeometry(platformRadius,platformRadius*1.03,.028,100),new T.MeshStandardMaterial({color:0xeeeeec,metalness:.12,roughness:.67}));platform.position.y=-.016;platform.receiveShadow=true;scene.add(platform);
  const ring=new T.Mesh(new T.RingGeometry(platformRadius*.926,platformRadius*.929,128),new T.MeshBasicMaterial({color:0x8c969f,transparent:true,opacity:.4,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.001;scene.add(ring);
  const innerRing=new T.Mesh(new T.RingGeometry(platformRadius*.809,platformRadius*.81,128),new T.MeshBasicMaterial({color:0xa4aeb8,transparent:true,opacity:.16,side:T.DoubleSide}));innerRing.rotation.x=-Math.PI/2;innerRing.position.y=.001;scene.add(innerRing);
  const width=T.MathUtils.ceilPowerOfTwo(atlas.parts.length),data=new Float32Array(width*4),partTexture=new T.DataTexture(data,width,1,T.RGBAFormat,T.FloatType);partTexture.needsUpdate=true;
  const selectedData=new Uint8Array(width*4),selectionTexture=new T.DataTexture(selectedData,width,1);selectionTexture.needsUpdate=true;
  const materials:T.Material[]=[],geometries:T.BufferGeometry[]=[],pickers:(T.Mesh|undefined)[]=[],centers=atlas.parts.map(p=>new T.Vector3().fromArray(p.bounds[0]).add(new T.Vector3().fromArray(p.bounds[1])).multiplyScalar(.5));
  const offsets:T.Vector3[]=[],bounds=atlas.parts.map(p=>new T.Box3(new T.Vector3().fromArray(p.bounds[0]),new T.Vector3().fromArray(p.bounds[1])));
  let packingWidth=1,packingHeight=1;
  const markerPositions=new Float32Array(atlas.parts.length*3),markerGeometry=new T.BufferGeometry();markerGeometry.setAttribute('position',new T.BufferAttribute(markerPositions,3));
  const markerMaterial=new T.PointsMaterial({color:0x64748b,size:5,sizeAttenuation:false,transparent:true,opacity:.72,depthTest:false});
  markerMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif (distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;');};
  const markers=new T.Points(markerGeometry,markerMaterial);markers.frustumCulled=false;markers.renderOrder=10;markers.visible=false;scene.add(markers);
  const hover=document.createElement('div');hover.className='part-hover';hover.setAttribute('role','tooltip');hover.hidden=true;el.appendChild(hover);
  // Story hotspots: pulsing dots anchored to named parts, opening a small card.
  const hotspotDefs=hotspotRef.current??[];
  const hotspotIdx=hotspotDefs.map(h=>atlas.parts.findIndex(p=>p.name.toLowerCase()===h.part.toLowerCase()||p.id===h.part));
  const hotspotLayer=document.createElement('div');hotspotLayer.className='hotspot-layer';el.appendChild(hotspotLayer);
  const popup=document.createElement('div');popup.className='hotspot-popup';popup.hidden=true;hotspotLayer.appendChild(popup);
  let openHotspot=-1;
  const closeHotspot=()=>{popup.hidden=true;openHotspot=-1;};
  const positionPopup=(btn:HTMLButtonElement)=>{
   const r=btn.getBoundingClientRect(),lr=hotspotLayer.getBoundingClientRect(),pw=Math.min(280,lr.width-16);
   popup.style.width=pw+'px';
   const left=Math.min(Math.max(8,(r.left-lr.left)-pw/2),Math.max(8,lr.width-pw-8));
   let top=(r.top-lr.top)+20;if(top+220>lr.height)top=(r.top-lr.top)-230;
   popup.style.left=left+'px';popup.style.top=Math.max(8,top)+'px';
  };
  const dots=hotspotDefs.map((h,k)=>{
   const b=document.createElement('button');b.type='button';b.className='hotspot-dot';b.setAttribute('aria-label','About '+h.title);b.hidden=true;
   const s=document.createElement('span');b.appendChild(s);
   b.addEventListener('click',ev=>{ev.stopPropagation();
    if(openHotspot===k){closeHotspot();return;}
    openHotspot=k;popup.textContent='';
    const t=document.createElement('div');t.className='hotspot-title';t.textContent=h.title;
    const p=document.createElement('p');p.textContent=h.text;
    const c=document.createElement('button');c.type='button';c.className='hotspot-close';c.setAttribute('aria-label','Close');c.textContent='×';
    c.addEventListener('click',ev2=>{ev2.stopPropagation();closeHotspot();});
    popup.appendChild(t);popup.appendChild(p);popup.appendChild(c);popup.hidden=false;positionPopup(b);});
   hotspotLayer.appendChild(b);return b;
  });
  // Colosseum pilot: floor labels for Floors mode, anchored to the left edge
  // of each layer at its lifted height.
  const floorLabelLayer=document.createElement('div');floorLabelLayer.className='floor-label-layer';el.appendChild(floorLabelLayer);
  const floorLabels=COLOSSEUM_LAYERS.map(l=>{const d=document.createElement('div');d.className='floor-label';d.textContent=l.label;d.hidden=true;floorLabelLayer.appendChild(d);return d;});
  // Round 4: the leader lines are gone. The floor labels on the model
  // (above) are the layer names now; the lines' dots floated in mid-air
  // in every re-test, and the lines ran off the bottom of the panel.
  // Poster pilot: schematic scale figures on the arena floor, off by
  // default. The arena sand surface sits at sandTop; the figures stand on
  // it, not on the model's origin, so they are never buried inside the
  // arena disc. Dark silhouettes only, no invented detail, drawn a little
  // larger than true scale so they read as people at poster distance.
  const sandTop=Math.max(0,...atlas.parts.filter(p=>/sand surface/i.test(p.name)).map(p=>p.bounds[1][1]));
  // Round 5: the arena label and the two lower contact shadows anchor to
  // the actual surfaces, not to the layer's tallest part. The sand
  // surface's left edge is the arena disc's edge; the travertine
  // pavement is the hypogeum slab's top. Both are computed from the
  // model, so they hold on every variant that has them.
  const sandHalf=Math.max(0,...atlas.parts.filter(p=>/sand surface/i.test(p.name)).map(p=>Math.max(Math.abs(p.bounds[0][0]),Math.abs(p.bounds[1][0]))));
  const pavementTop=Math.max(0,...atlas.parts.filter(p=>/travertine pavement/i.test(p.name)).map(p=>p.bounds[1][1]));
  const figureMaterial=new T.MeshBasicMaterial({color:0x1a2027});
  const figures=new T.Group();
  [[0.32,0.1],[-0.28,0.08],[0.05,-0.22]].forEach(([fx,fz])=>{
   const g=new T.Group();
   const body=new T.Mesh(new T.CapsuleGeometry(0.009,0.028,3,8),figureMaterial);body.position.y=0.023;g.add(body);
   const head=new T.Mesh(new T.SphereGeometry(0.0075,12,8),figureMaterial);head.position.y=0.052;g.add(head);
   g.position.set(fx,0,fz);figures.add(g);
  });
  figures.visible=false;scene.add(figures);
  // Round 4: one soft contact shadow on the top of the layer below each
  // lifted layer, so every floating layer casts a shadow you can see from
  // the default camera. The old discs hung just under their own layer,
  // edge-on to the camera and mostly hidden behind the layer below, so
  // they never read. A shadow on the surface below reads from above: the
  // disc is the caster's footprint, clamped to the receiver's top, and
  // rides the receiver's lift. The discs show in Floors mode, live and
  // in the poster stage, and are hidden for the inset captures.
  // Round 6: the gradient must vary LUMINANCE, not alpha. The old stops
  // were white with a fading alpha, but an alphaMap reads the texture's
  // green channel, which was 255 everywhere, so every disc rendered as
  // a hard-edged uniform disc instead of a soft shadow. White centre to
  // black edge gives the alphaMap the falloff it was meant to have.
  const shadowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d')!;const grad=g.createRadialGradient(64,64,6,64,64,64);grad.addColorStop(0,'rgb(242,242,242)');grad.addColorStop(0.7,'rgb(217,217,217)');grad.addColorStop(0.9,'rgb(115,115,115)');grad.addColorStop(1,'rgb(0,0,0)');g.fillStyle=grad;g.fillRect(0,0,128,128);return new T.CanvasTexture(c);})();
  // Round 6: the seating shadow is a ring, not a disc. A full disc
  // darkens the whole arena floor evenly, so the floor just reads as a
  // darker olive-tan with no band to see. The seating tier is a ring,
  // so its shadow is a ring: the annulus under the seating is dark
  // while the sand in the middle stays lit, and the light/dark edge
  // is what the eye reads as a shadow band. The ring's alphaMap is
  // dark across the ring's span and fades at both edges, so the band
  // has soft edges instead of a hard outline.
  const shadowRingTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d')!;const grad=g.createRadialGradient(64,64,6,64,64,64);grad.addColorStop(0,'rgb(0,0,0)');grad.addColorStop(0.45,'rgb(0,0,0)');grad.addColorStop(0.58,'rgb(235,235,235)');grad.addColorStop(0.88,'rgb(235,235,235)');grad.addColorStop(1,'rgb(0,0,0)');g.fillStyle=grad;g.fillRect(0,0,128,128);return new T.CanvasTexture(c);})();
  const layerFoot=COLOSSEUM_LAYERS.map((_,li)=>{let rx=0.1,rz=0.1;atlas.parts.forEach(p=>{if(colosseumLayer(p)===li){rx=Math.max(rx,Math.abs(p.bounds[0][0]),Math.abs(p.bounds[1][0]));rz=Math.max(rz,Math.abs(p.bounds[0][2]),Math.abs(p.bounds[1][2]));}});return {x:rx,z:rz};});
  const layerTops=COLOSSEUM_LAYERS.map((_,li)=>{let top=-Infinity;atlas.parts.forEach(p=>{if(colosseumLayer(p)===li)top=Math.max(top,p.bounds[1][1]);});return top===-Infinity?modelCenter.y:top;});
  // Round 5: a contact shadow must sit ON the surface below its layer.
  // layerTops is the tallest part in the layer, not the surface below:
  // the arena shadow floated above the pavement (the hypogeum top is
  // the fallen wall, hidden in Floors mode) and the seating shadow
  // floated above the sand (the arena top is the box canopy). The
  // receiver surfaces are the pavement and the sand; the seating top is
  // already the bowl's rim, so it stays.
  // Round 6: the seating shadow's receiver is NOT the sand. The probe
  // showed the sand is buried: the arena floor you see is the white
  // podium ring's top (seating #EDEDED), a solid disc over the gold
  // sand, and a shadow at sand level hides under it, showing only as a
  // thin sliver at the disc's front edge. The receiver is the top of
  // the arena floor itself: the highest top among the arena layer's
  // wide flat parts (podium ring, marble passage, arena wall, and in
  // Detailed the bronze balustrade). The fence, gates and boxes are
  // vertical elements that rise through the shadow, which is correct.
  const arenaFloorTop=Math.max(0,...atlas.parts.filter(p=>{if(colosseumLayer(p)!==1)return false;const b=p.bounds;return Math.max(Math.abs(b[0][0]),Math.abs(b[1][0]))>0.5&&Math.max(Math.abs(b[0][2]),Math.abs(b[1][2]))>0.3;}).map(p=>p.bounds[1][1]));
  const receiverTop=[pavementTop,arenaFloorTop,layerTops[2]];
  const contactDiscs=COLOSSEUM_LAYERS.map((_,li)=>{
   // The seating shadow (li 2) is a ring: see shadowRingTex above.
   // The other layers keep their full discs.
   const isSeatingShadow=li===2;
   const d=new T.Mesh(isSeatingShadow?new T.RingGeometry(0.52,1,64):new T.CircleGeometry(1,64),new T.MeshBasicMaterial({color:0x0a0f14,transparent:true,opacity:isSeatingShadow?0.6:0.5,alphaMap:isSeatingShadow?shadowRingTex:shadowTex,depthWrite:false}));
   d.rotation.x=-Math.PI/2;
   // The bottom layer is not lifted: its disc is a contact halo on the
   // platform, just wider than the terrace, at the terrace base. A lifted
   // layer's disc is its own footprint, clamped to the top it lands on,
   // so it never overhangs the receiver's edge and floats in the air.
   const rx=li===0?layerFoot[0].x:Math.min(layerFoot[li].x,layerFoot[li-1].x);
   const rz=li===0?layerFoot[0].z:Math.min(layerFoot[li].z,layerFoot[li-1].z);
   const spread=li===0?1.06:1.03;
   d.scale.set(rx*spread,rz*spread,1);d.renderOrder=3;d.visible=false;scene.add(d);return d;
  });
  type Target={index:number;x:number;y:number;left:number;right:number;top:number;bottom:number};let targets:Target[]=[];
  const projected=new T.Vector3();
  const findTarget=(x:number,y:number,radius:number)=>{
   let best=-1,score=Infinity;
   for(const t of targets){const dx=Math.max(t.left-x,0,x-t.right),dy=Math.max(t.top-y,0,y-t.bottom),distance=Math.hypot(dx,dy);if(distance>radius)continue;const candidate=distance+Math.hypot(t.x-x,t.y-y)*.025;if(candidate<score){score=candidate;best=t.index;}}
   return best;
  };
  const materialCache=new Map<string,T.Material>();
  // Poster stage: a subtle procedural stone variation, driven by world
  // position so no UVs are needed. Off (0) everywhere except the poster
  // stage, so other buildings render exactly as before.
  const stoneNoise={value:0};
  const materialFor=(color:string)=>{
   const cached=materialCache.get(color);if(cached)return cached;
   const m=new T.MeshStandardMaterial({color,metalness:.08,roughness:.53,side:T.DoubleSide,transparent:false,opacity:1,depthWrite:true});
   m.onBeforeCompile=shader=>{
    shader.uniforms.partState={value:partTexture};shader.uniforms.selectionState={value:selectionTexture};shader.uniforms.stateWidth={value:width};shader.uniforms.stoneNoise=stoneNoise;
    shader.vertexShader='attribute float partIndex; uniform sampler2D partState; uniform sampler2D selectionState; uniform float stateWidth; varying float partVisible; varying float partSelected; varying vec3 stonePos;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec2 stateUv = vec2((partIndex + 0.5) / stateWidth, 0.5); vec4 state = texture2D(partState, stateUv); transformed += state.xyz; partVisible = state.w; partSelected = texture2D(selectionState, stateUv).r; stonePos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader='uniform float stoneNoise; varying float partVisible; varying float partSelected; varying vec3 stonePos;\nfloat stoneHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\nfloat stoneNoise3(vec3 p){ vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f); float n000 = stoneHash(i); float n100 = stoneHash(i + vec3(1.0,0.0,0.0)); float n010 = stoneHash(i + vec3(0.0,1.0,0.0)); float n110 = stoneHash(i + vec3(1.0,1.0,0.0)); float n001 = stoneHash(i + vec3(0.0,0.0,1.0)); float n101 = stoneHash(i + vec3(1.0,0.0,1.0)); float n011 = stoneHash(i + vec3(0.0,1.0,1.0)); float n111 = stoneHash(i + vec3(1.0,1.0,1.0)); return mix(mix(mix(n000,n100,f.x),mix(n010,n110,f.x),f.y),mix(mix(n001,n101,f.x),mix(n011,n111,f.x),f.y),f.z); }\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif (partVisible < 0.5) discard;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.85, 0.78), partSelected * 0.75);\ndiffuseColor.rgb *= 1.0 + stoneNoise * ((stoneNoise3(stonePos * 26.0) - 0.5) * 0.10 + (stoneNoise3(stonePos * 90.0) - 0.5) * 0.05);');
   };materials.push(m);materialCache.set(color,m);return m;
  };
  // Poster stage: shadows must follow the exploded offsets, which live in
  // the vertex shader. The depth material repeats the same displacement and
  // the same visibility discard, so shadows fall where the parts are.
  const depthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});
  depthMaterial.onBeforeCompile=shader=>{
   shader.uniforms.partState={value:partTexture};shader.uniforms.stateWidth={value:width};
   shader.vertexShader='attribute float partIndex; uniform sampler2D partState; uniform float stateWidth; varying float partVisible;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec2 stateUv = vec2((partIndex + 0.5) / stateWidth, 0.5); vec4 state = texture2D(partState, stateUv); transformed += state.xyz; partVisible = state.w;');
   shader.fragmentShader='varying float partVisible;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif (partVisible < 0.5) discard;');
  };
  let loaded=0;
  const loadChunk=async(ci:number)=>{
   const chunk=atlas.chunks[ci],compressed=!!chunk.gzip&&typeof DecompressionStream!=='undefined';const response=await fetch(compressed?chunk.gzip!:chunk.url,{signal:abort.signal});const buffer=await decodeModelResponse(response,chunk.bytes,compressed);if(disposed)return;
   const groups=new Map<string,T.BufferGeometry[]>();
   atlas.parts.forEach((p,i)=>{
    if(p.chunk!==ci)return;
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(buffer,p.positions,p.vertexCount*3),3));
    // GPU normalized signed-short normals keep the complete atlas compact in memory.
    g.setAttribute('normal',new T.BufferAttribute(new Int16Array(buffer,p.normals,p.vertexCount*3),3,true));g.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.indices,p.indexCount),1));
    g.boundingBox=bounds[i].clone();g.computeBoundingSphere();const pick=new T.Mesh(g);pick.matrixAutoUpdate=false;pickers[i]=pick;geometries.push(g);
    g.setAttribute('partIndex',new T.BufferAttribute(new Float32Array(p.vertexCount).fill(i),1));
    g.userData.color=p.color??atlas.systems.find(s=>s.id===p.system)?.color??'#aebbb8';
    const list=groups.get(p.system)??[];list.push(g);groups.set(p.system,list);
   });
   const colorGroups=new Map<string,T.BufferGeometry[]>();
   groups.forEach((gs)=>{for(const g of gs){const key=g.userData.color as string;const l=colorGroups.get(key)??[];l.push(g);colorGroups.set(key,l);}});
   colorGroups.forEach((gs,color)=>{const geometry=mergeGeometries(gs,false);if(!geometry)throw new Error('Could not assemble model geometry.');geometries.push(geometry);const mesh=new T.Mesh(geometry,materialFor(color));mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;mesh.customDepthMaterial=depthMaterial;scene.add(mesh);});
   lastState=null;loaded++;onProgress(Math.round(loaded/atlas.chunks.length*100));dirty=true;
  };
  (async()=>{try{let cursor=0;await Promise.all(Array.from({length:3},async()=>{while(cursor<atlas.chunks.length){const i=cursor++;await loadChunk(i);}}));if(!disposed){ready=true;dirty=true;}}catch(e){if(!disposed)onError(e instanceof Error?e.message:'Could not load the model.');}})();
  const fit=(view:string,extent=0)=>{
   const aspect=camera.aspect,mobile=el.clientWidth<768,halfFov=T.MathUtils.degToRad(camera.fov/2);
   // Assembled view: fit the whole model bounding box in the available viewport.
   // In Floors mode the separated stack is tall and its lowest layer, the
   // hypogeum slab, reaches down into the caption zone (the pilot caption
   // sits 232px from the bottom, just above the tall pilot dock). Reserve
   // more bottom space here so the stack clears the caption.
   const floorsMode=latest.current.mode==='floors';
   const reservedW=mobile?40:340,reservedH=mobile?350:(floorsMode?430:270);
   const availW=Math.max(160,el.clientWidth-reservedW),availH=Math.max(160,el.clientHeight-reservedH);
   const fitDistance=Math.max(modelSize.y,modelSize.x/(availW/availH),modelSize.z)/(2*Math.tan(halfFov));
   const normalDistance=Math.max(mobile?4.5:2.5,fitDistance*1.3);
   const reservedHeight=mobile?350:(floorsMode?430:270);const availableAspect=Math.max(.35,(el.clientWidth-(mobile?40:340))/Math.max(160,el.clientHeight-reservedHeight));const atlasDistance=Math.max(packingHeight,packingWidth/availableAspect)/(2*Math.tan(halfFov))*(el.clientHeight/Math.max(160,el.clientHeight-reservedHeight))*1.08;
   const distance=T.MathUtils.lerp(normalDistance,Math.max(.2,atlasDistance),extent);if(extent>.8)view='front';
   // Round 5: in Floors mode the camera looks down at the stack from
   // above, so each layer's top surface reads, including the arena sand
   // and the contact shadow on it. The standard near-level directions
   // hide every layer top behind its own rim, so the seating shadow on
   // the sand was invisible from the default view even though it sits
   // on the surface. Explode mode keeps the standard directions.
   const direction=(()=>{const liftY=floorsMode?0.3:0.02;return view==='front'?new T.Vector3(0,liftY,1):view==='back'?new T.Vector3(0,liftY,-1):view==='side'?new T.Vector3(1,liftY,0):new T.Vector3(.35,floorsMode?0.3:0.06,1).normalize();})();
   // In Floors mode the stack rises as it separates; aim at the lifted
   // stack's centre, not the assembled model's, or the top layer (the
   // velarium netting) is cropped by the top edge of the viewport. Aim
   // well below the centre, so the stack sits higher in the frame and
   // its lowest layer, the hypogeum slab, plus the plinth's front edge
   // clear the caption above the dock. The old offset (0.08) left the
   // caption sitting on the hypogeum grid.
   // Round 6: the aim offset grows with the separation, because the
   // stack grows with it. A fixed offset left the slab's bottom edge
   // under the SEPARATED FLOORS pill at 85 and 100 percent: the pill
   // sits on the slab's dark centre and brown ring instead of on empty
   // backdrop. At full separation the stack sits about 60px higher
   // than before the round, which clears the pill with room to spare
   // while the attic stays below the top buttons. Calibrated from the
   // renders: 0.18 of offset moves the stack about 27px at this
   // distance, and the extra bottom reserve shrinks it a little more.
   const liftCenter=(latest.current.mode==='floors')?FLOOR_GAP*(COLOSSEUM_LAYERS.length-1)*amount/2:0;
   const targetY=modelCenter.y+liftCenter-((latest.current.mode==='floors')?0.28+0.38*amount:0);
   controls.target.set(extent>.1&&el.clientWidth>767?-packingWidth*.12:0,targetY,0);camera.position.copy(controls.target).addScaledVector(direction,distance);controls.update();dirty=true;
  };
  const resize=()=>{layoutKey='';lastState=null;renderer.setPixelRatio(Math.min(devicePixelRatio,el.clientWidth<768||el.clientHeight<600?1.5:2));camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);fit(latest.current.view,amount);};const observer=new ResizeObserver(resize);observer.observe(el);
  const raycaster=new T.Raycaster(),pointer=new T.Vector2(),tap=new PointerTap(),worldBox=new T.Box3(),hitPoint=new T.Vector3();
  const down=(e:PointerEvent)=>{hover.hidden=true;closeHotspot();tap.down(e.pointerId,e.clientX,e.clientY,e.pointerType==='touch'?12:5);};
  const move=(e:PointerEvent)=>{tap.move(e.pointerId,e.clientX,e.clientY);if(e.buttons||amount<.5||e.pointerType==='touch'){hover.hidden=true;return;}const rect=el.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top,index=findTarget(x,y,12);hover.hidden=index<0;renderer.domElement.style.cursor=index<0?'grab':'pointer';if(index>=0){hover.textContent=atlas.parts[index].name;hover.style.left=`${Math.max(8,Math.min(x+14,el.clientWidth-260))}px`;hover.style.top=`${Math.max(8,Math.min(y+18,el.clientHeight-55))}px`;}};
  const cancel=(e:PointerEvent)=>tap.cancel(e.pointerId);
  const up=(e:PointerEvent)=>{
   const validTap=tap.up(e.pointerId,e.clientX,e.clientY);if(!validTap||!ready)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
   let nearest=Infinity,found=-1;const hasSolid=atlas.parts.some((p,i)=>data[i*4+3]>.5);
   pickers.forEach((mesh,i)=>{if(!mesh||data[i*4+3]<.5)return;worldBox.copy(bounds[i]).translate(mesh.position);if(!raycaster.ray.intersectBox(worldBox,hitPoint))return;const hits=raycaster.intersectObject(mesh,false);if(hits[0]&&hits[0].distance<nearest){nearest=hits[0].distance;found=i;}});
   if(found<0&&amount>.45)found=findTarget(e.clientX-rect.left,e.clientY-rect.top,e.pointerType==='touch'?24:16);if(found>=0){hover.hidden=true;select.current(atlas.parts[found].id);}
  };
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);
  // Round 4: the floor-label anchor, shared by the live labels and the
  // poster capture so both agree. One anchor per layer: the layer's own
  // left edge at its lifted height, the same projection the hotspot dots
  // use. The label is centred on the anchor, so half of it sits on the
  // stone. The anchor is the LAYER's edge, not the model's: the arena
  // disc is narrower than the facade, so a model-edge anchor left its
  // label floating in empty space. This replaces layerAnchors, whose
  // right-edge points the leader dots were drawn on, floating in mid-air.
  const layerLabelPoints=():({x:number;y:number}|null)[]=>{
   return COLOSSEUM_LAYERS.map((_,li)=>{
    // Round 5: the arena label anchors to the arena disc itself, the
    // sand surface's left edge at sand level. The layer-top anchor put
    // it left of the disc and above the sand: the layer's top is the
    // imperial box canopy, not the floor, and its widest part reaches
    // past the disc. The chip is centred on the anchor, so it sits a
    // little inside the edge and overlaps the stone. The other layers
    // keep the layer-edge anchor, which the live test confirmed.
    const arenaDisc=li===1&&sandHalf>0;
    const ax=arenaDisc?-(sandHalf-0.03):-layerFoot[li].x-0.08;
    const ay=arenaDisc?sandTop+li*FLOOR_GAP*amount:layerTops[li]+li*FLOOR_GAP*amount;
    projected.set(ax,ay,0).project(camera);
    if(projected.z<-1||projected.z>1)return null;
    return {x:(projected.x+1)*el.clientWidth/2,y:(1-projected.y)*el.clientHeight/2};
   });
  };
  const clock=new T.Clock();let lastExtent=-1;
  const animate=()=>{
   if(disposed)return;frame=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),s=latest.current;
   // Poster pilot: dark slate stage, warm key light, soft shadows, stone
   // variation. Applies on change only; other buildings never set poster.
   const posterOn=s.poster??false;
   if(posterOn!==lastPoster){
    lastPoster=posterOn;
    renderer.setClearColor(posterOn?'#1e2936':darkStage?'#33393f':'#f2f3f3');
    key.color.set(posterOn?0xffe3b8:0xfffaf4);key.intensity=posterOn?2.6:2.3;
    (ground.material as T.MeshStandardMaterial).color.set(posterOn?0x202a36:darkStage?0x454e55:0xd5d9dc);
    (platform.material as T.MeshStandardMaterial).color.set(posterOn?0x33404f:0xeeeeec);
    stoneNoise.value=posterOn?1:0;
    dirty=true;
   }
   // Round 4: the plinth is a platform just wider than the model in
   // Floors mode as well as in the poster stage. In the live view it was
   // a stage floor spanning the view, about 30 percent wider than the
   // facade, with its front edge under the dock.
   const smallPlinth=posterOn||(s.mode??'explode')==='floors';
   if(smallPlinth!==lastPlinth){
    lastPlinth=smallPlinth;
    ground.scale.set(smallPlinth?0.78:1,smallPlinth?0.78:1,1);
    platform.scale.set(smallPlinth?0.88:1,1,smallPlinth?0.88:1);
    ring.scale.set(smallPlinth?0.88:1,smallPlinth?0.88:1,1);
    innerRing.scale.set(smallPlinth?0.88:1,smallPlinth?0.88:1,1);
    dirty=true;
   }
   // Round 4: the key light casts shadows in Floors mode too, so each
   // lifted layer shades the one below it. The poster stage already had
   // this; the live view did not, so the stack read as flat.
   const wantShadow=posterOn||((s.mode??'explode')==='floors'&&amount>.05);
   if(wantShadow!==lastShadow){
    lastShadow=wantShadow;
    key.castShadow=wantShadow;
    dirty=true;
   }
   const changed=lastState?.visible!==s.visible||lastState?.selected!==s.selected||lastState?.isolate!==s.isolate;
   const moving=Math.abs(amount-s.explode)>.0001;
   if(moving){amount=T.MathUtils.damp(amount,s.explode,8,dt);dirty=true;}
   if(changed||moving||lastExtent<0){
    const visible=new Set(s.visible),selection=new Set(s.selected);
    const visibleParts=atlas.parts.filter(p=>s.isolate?selection.has(p.id):visible.has(p.system)||selection.has(p.id));
    const nextLayoutKey=(s.mode??'explode')+':'+visibleParts.map(p=>p.id).join(',')+':'+camera.aspect.toFixed(3);
    if(nextLayoutKey!==layoutKey){
     if((s.mode??'explode')==='floors'){packingWidth=modelSize.x;packingHeight=modelSize.y+FLOOR_GAP*(COLOSSEUM_LAYERS.length-1);}
     else{const layout=createExplosionLayout(visibleParts,camera.aspect,atlas.spread??1);packingWidth=layout.width;packingHeight=layout.height;atlas.parts.forEach((p,i)=>{const cell=layout.cells.get(p.id);offsets[i]=cell?new T.Vector3(cell.x,cell.y+1,0):centers[i].clone();});}
     layoutKey=nextLayoutKey;if(amount>.05&&!s.isolate)fit(s.view,Math.max(0,(amount-.3)/.7));}

    const systems=atlas.systems,systemCount=Math.max(1,systems.length);
    // Round 5: the velarium sail panels form a flat canopy over the
    // whole bowl at y 0.48 to 0.60, so any camera above them sees the
    // canopy, not the arena floor. The arena floor stop retracts the
    // awning (it was retractable) so the floor reads from above. The
    // sails return on the next stop.
    const focusIsSand=!!s.focus&&atlas.parts.some(q=>s.focus!.ids.includes(q.id)&&/sand surface/i.test(q.name));
    // Round 6: the hypogeum sits below the arena floor, so no camera
    // angle can show it while the floor is in place: the floor is the
    // only thing between the camera and the tunnels. The hypogeum stop
    // lifts the floor (sand and planks) so the corridor, chambers,
    // dens and shafts read from above, the way the arena floor stop
    // retracts the awning. The floor returns on the next stop. The
    // story text already says it: with the floor gone, the hypogeum
    // stands exposed to the sky. The arena's edge structures (podium
    // ring, arena wall, fence, balustrade) lift with it: they sit
    // above the hypogeum and hide its outer grid behind a white ring,
    // so the floor alone leaves only the corridor's middle visible.
    const focusIsHypogeum=!!s.focus&&atlas.parts.some(q=>s.focus!.ids.includes(q.id)&&/hypogeum central corridor/i.test(q.name));
    atlas.parts.forEach((p,i)=>{
     const c=centers[i],destination=offsets[i];let dx=0,dy=0,dz=0;
     if((s.mode??'explode')==='floors'){dy=colosseumLayer(p)*FLOOR_GAP*amount;}
     else{
      const group=Math.max(0,systems.findIndex(sys=>sys.id===p.system)),angle=group/systemCount*Math.PI*2;
      if(amount<=.45){const t=amount/.45;dx=Math.sin(angle)*t*.48;dy=(c.y-1)*t*.28;dz=Math.cos(angle)*t*.48;}
      else {const t=(amount-.45)/.55;dx=T.MathUtils.lerp(Math.sin(angle)*.48,destination.x-c.x,t);dy=T.MathUtils.lerp((c.y-.85)*.28,destination.y-c.y,t);dz=T.MathUtils.lerp(Math.cos(angle)*.48,-c.z,t);}
     }
     // In Floors mode the shoring wedges, the fallen south wall and the
     // material samples are not a floor: they sit detached beside the
     // arena layer and read as floating debris, so they stay hidden here.
     // They remain visible in Explode mode and in the Tour, where the
     // fallen wall is a stop of its own.
     const floorsHidden=(s.mode??'explode')==='floors'&&(p.system==='ruin'||p.system==='materials');
     const sailsHidden=focusIsSand&&p.system==='velarium'&&/sail/i.test(p.name);
     const floorHidden=focusIsHypogeum&&/sand surface|floor planks|podium ring|arena wall|arena fence|balustrade/i.test(p.name);
     const shown=!floorsHidden&&!sailsHidden&&!floorHidden&&(s.isolate?selection.has(p.id):visible.has(p.system)||selection.has(p.id));
     const selected=selection.has(p.id);data.set([dx,dy,dz,shown?1:0],i*4);selectedData[i*4]=selected?255:0;
     markerPositions.set(data[i*4+3]>.5?[c.x+dx,c.y+dy,c.z+dz]:[10000,10000,10000],i*3);const mesh=pickers[i];if(mesh){mesh.position.set(dx,dy,dz);mesh.updateMatrix();mesh.updateMatrixWorld(true);}
    });partTexture.needsUpdate=true;selectionTexture.needsUpdate=true;markerGeometry.attributes.position.needsUpdate=true;lastState=s;lastExtent=amount;dirty=true;
   }
   if(s.view!==lastView||s.reset!==lastReset){fit(s.view,amount);lastView=s.view;lastReset=s.reset;}
   if(moving&&!s.isolate)fit(amount>.5?'front':s.view,Math.max(0,(amount-.3)/.7));
   const isolateKey=s.isolate?s.selected.join(',')+':'+s.reset+':'+s.inspectorOpen+':'+camera.aspect:'';
   if(isolateKey!==lastIsolate||(s.isolate&&moving)){
    if(s.isolate){const box=new T.Box3();atlas.parts.forEach((p,i)=>{if(s.selected.includes(p.id))box.union(bounds[i].clone().translate(new T.Vector3(data[i*4],data[i*4+1],data[i*4+2])));});
     if(!box.isEmpty()){const center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());const w=el.clientWidth,h=el.clientHeight,mobile=w<768,landscape=w>h&&h<=600;let left=20,right=w-20,top=mobile?175:110,bottom=h-170;if(s.inspectorOpen){if(landscape){right=w-335;top=100;bottom=h-125;}else if(mobile){const sheet=document.querySelector('.detail-sheet')?.getBoundingClientRect(),header=document.querySelector('.identity')?.getBoundingClientRect();top=(header?.bottom??94)+16;bottom=(sheet?.top??h*.58-139)-16;}else{right=w-370;left=w>1100?285:25;}}const availableWidth=Math.max(150,right-left),availableHeight=Math.max(40,bottom-top);camera.setViewOffset(w,h,w/2-(left+right)/2,h/2-(top+bottom)/2,w,h);const distance=Math.max(.07,Math.max(size.y*h/availableHeight,size.x*w/availableWidth/camera.aspect,size.z)/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*1.35);controls.maxDistance=Math.max(40,distance*2);controls.target.copy(center);camera.position.copy(center).add(new T.Vector3(.2,.1,1).normalize().multiplyScalar(distance));controls.update();dirty=true;}
    }else if(lastIsolate){camera.clearViewOffset();fit(s.view,amount);}
    lastIsolate=isolateKey;
   }
   // Colosseum pilot: tour focus frames the stop's part without hiding the
   // rest of the building (unlike isolate). Keyed on the focus object so a
   // variant reload re-frames the same stop.
   const focusKey=s.focus?s.focus.ids.join(',')+':'+s.focus.key:'';
   if(focusKey!==lastFocus){
    const f=s.focus;
    if(f){
     const box=new T.Box3();
     atlas.parts.forEach((p,i)=>{if(f.ids.includes(p.id))box.union(bounds[i].clone().translate(new T.Vector3(data[i*4],data[i*4+1],data[i*4+2])));});
     // Round 5: the arena floor stop focuses one sand quadrant, but the
     // subject is the whole arena floor. Frame the full sand disc, or
     // the quadrant sits at the frame edge and the rest of the floor
     // hides behind the tour card.
     const focusPart=atlas.parts.find(p=>f.ids.includes(p.id));
     const isSand=!!focusPart&&/sand surface/i.test(focusPart.name);
     // Round 6: the elevated-framing trigger is the camera landing
     // inside the model, and it must be judged on the single focus
     // part, before the box is widened to the whole sand disc or the
     // whole hypogeum below. Widening the box first inflates the
     // standard distance, pushes the standard camera outside the
     // model, and the trigger flips off: the hypogeum stop then framed
     // from the low outside angle and showed the facade instead of
     // the tunnels.
     const singleCenter=box.getCenter(new T.Vector3()),singleSize=box.getSize(new T.Vector3());
     const w=el.clientWidth,h=el.clientHeight,mobile=w<768;
     const left=20,right=w-20,top=mobile?175:110,bottom=h-190;
     const availableWidth=Math.max(150,right-left),availableHeight=Math.max(40,bottom-top);
     const singleDistance=Math.max(.07,Math.max(singleSize.y*h/availableHeight,singleSize.x*w/availableWidth/camera.aspect,singleSize.z)/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*1.35);
     const singleStdPos=singleCenter.clone().addScaledVector(new T.Vector3(.2,.1,1).normalize(),singleDistance);
     const insideModel=Math.hypot(singleStdPos.x,singleStdPos.z)<Math.max(modelSize.x,modelSize.z)/2;
     if(isSand){
      atlas.parts.forEach((p,i)=>{if(/sand surface/i.test(p.name))box.union(bounds[i].clone().translate(new T.Vector3(data[i*4],data[i*4+1],data[i*4+2])));});
     }
     // Round 6: the hypogeum stop focuses one corridor, but the subject
     // is the whole subterranean network: corridor, chambers, dens,
     // shafts and ramps. Frame the full hypogeum, or the corridor alone
     // is a thin line and the grid around it never reads. The floor is
     // already lifted for this stop, so the network is exposed.
     const isHypogeum=!!focusPart&&/hypogeum central corridor/i.test(focusPart.name);
     if(isHypogeum){
      atlas.parts.forEach((p,i)=>{if(p.system==='hypogeum')box.union(bounds[i].clone().translate(new T.Vector3(data[i*4],data[i*4+1],data[i*4+2])));});
     }
     if(!box.isEmpty()){
      const center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
      const halfFov=T.MathUtils.degToRad(camera.fov/2);
      let distance=Math.max(.07,Math.max(size.y*h/availableHeight,size.x*w/availableWidth/camera.aspect,size.z)/(2*Math.tan(halfFov))*1.35);
      let dir=new T.Vector3(.2,.1,1).normalize();
      // Round 5: a flat part framed from the standard low angle with the
      // camera inside the building reads as a flat field. The arena floor
      // filled the frame edge-on and the rest of the model was out of
      // shot. Frame flat parts the camera would land inside over from
      // higher up, so the floor reads in context with the seating bowl
      // around it. The arena floor is framed from above even though the
      // standard camera lands outside: the low sightline is blocked by
      // the facade wall. The direction is steep enough that the sightline
      // clears the 0.6 tall facade at radius 1.0. The sand disc keeps the
      // standard distance, which already fits it; other flat parts keep
      // the wider fit.
      // insideModel is judged on the single focus part above, before
      // the box was widened, so the trigger survives the widening.
      // Round 6: a stop whose subject sits inside the building (the
      // hypogeum below the floor, the imperial box in the bowl, the
      // seating wedges behind the facade) frames from the standard low
      // angle with the camera inside the structure, against a wall:
      // the hypogeum was a flat tan wall, the box was white columns
      // and a gold floor, the wedges were a beige blank. Frame those
      // from higher up and wider, the same elevated framing that fixed
      // the arena floor stop, so each subject reads with its
      // surroundings. The old flat test was too strict: the corridor
      // and the wedges are wide and low but not flat enough to trip
      // it, and the box is small in every direction. The trigger is
      // the camera landing inside the model. Stops 1, 6 and 7 frame
      // from outside the model and keep the standard angle; the arena
      // floor stop keeps its own fit and its steep angle.
      // The interior stops use a lower elevation than the arena floor
      // (about 33 degrees instead of 39): straight down into the bowl
      // the seating fills the frame and a low subject like the
      // hypogeum grid or the box reads as a flat field with no relief.
      // A lower angle shows the subject's height against its
      // surroundings. It must stay above about 28 degrees, or the
      // facade wall hides the arena entirely: at 27 degrees the
      // hypogeum stop showed the outside of the facade instead of the
      // tunnels. The fit is closer too: the 1.2 minimum put the
      // camera so far back that the box was a speck and the grid a
      // blank, and the seating bowl filled the frame instead of
      // framing the subject. The fit is clamped to the arena's own
      // scale (0.9 to 1.2), so a tiny subject like the box is framed
      // with its podium and arena around it instead of filling the
      // frame alone, and a wide subject like the hypogeum network is
      // not pushed so far back that its grid shrinks to a blank.
      // Without the clamp the fit follows the subject's own size:
      // the hypogeum's depth pushed the camera to 4.3 units and the
      // box's smallness pulled it to 1.1, inside the seating.
      if(insideModel||isSand){
       if(isSand){
        dir=new T.Vector3(.35,.85,1).normalize();
       }else{
        dir=new T.Vector3(.35,.7,1).normalize();
        const rawFit=Math.max(size.x*1.3*w/availableWidth/camera.aspect,size.z*1.3*h/availableHeight,size.y);
        const fit=Math.min(1.2,Math.max(0.9,rawFit));
        distance=Math.max(.07,fit/(2*Math.tan(halfFov))*1.35);
       }
      }
      controls.maxDistance=Math.max(40,distance*2);
      controls.target.copy(center);
      camera.position.copy(center).addScaledVector(dir,distance);
      controls.update();dirty=true;
     }
    }else if(lastFocus){
     camera.clearViewOffset();fit(s.view,amount);
    }
    lastFocus=focusKey;
   }
   controls.enableRotate=amount<.8;controls.mouseButtons.LEFT=amount<.8?T.MOUSE.ROTATE:T.MOUSE.PAN;controls.touches.ONE=amount<.8?T.TOUCH.ROTATE:T.TOUCH.PAN;ground.visible=platform.visible=ring.visible=innerRing.visible=(amount<.5||!!s.poster)&&!s.isolate;markers.visible=amount>.75&&!s.poster&&(s.mode??'explode')!=='floors';controls.autoRotate=s.rotate&&!s.isolate&&amount<.4;controls.autoRotateSpeed=.65;controls.update();if(controls.autoRotate)dirty=true;
   // Poster pilot: scale figures ride the arena layer in Floors mode and
   // stand on the assembled floor otherwise. Hidden during tours and
   // isolation, where they would sit in the way of the framing. The
   // toggle flips visibility, so a change must dirty the frame or the
   // toggle appears to do nothing.
   const showFigures=!!s.scaleFigures&&ready&&!s.isolate&&(s.mode??'explode')!=='tour'&&((s.mode??'explode')==='floors'||amount<.05);
   figures.visible=showFigures;
   if(showFigures)figures.position.y=sandTop+((s.mode??'explode')==='floors'?FLOOR_GAP*amount:0);
   if(showFigures!==lastScaleFigures){lastScaleFigures=showFigures;dirty=true;}
   // Round 4: contact shadows ride the receiver layer's lift, in Floors
   // mode live and in the poster stage. The bottom layer's disc is a
   // contact halo on the platform.
   const showDiscs=ready&&!s.isolate&&(s.mode??'explode')==='floors'&&amount>.05;
   contactDiscs.forEach((d,li)=>{if(!d)return;d.visible=showDiscs;if(showDiscs)d.position.y=li===0?0.004:receiverTop[li-1]+(li-1)*FLOOR_GAP*amount+0.004;});
   if(showDiscs!==lastDiscs){lastDiscs=showDiscs;dirty=true;}
   if(dirty){renderer.render(scene,camera);targets=[];if(amount>.45){const hasSolid=atlas.parts.some((p,i)=>data[i*4+3]>.5);atlas.parts.forEach((p,i)=>{if(data[i*4+3]<.5)return;let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;for(let corner=0;corner<8;corner++){projected.set(p.bounds[(corner&1)?1:0][0]+data[i*4],p.bounds[(corner&2)?1:0][1]+data[i*4+1],p.bounds[(corner&4)?1:0][2]+data[i*4+2]).project(camera);const x=(projected.x+1)*el.clientWidth/2,y=(1-projected.y)*el.clientHeight/2;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}projected.copy(centers[i]).add(new T.Vector3(data[i*4],data[i*4+1],data[i*4+2])).project(camera);if(projected.z< -1||projected.z>1)return;targets.push({index:i,x:(projected.x+1)*el.clientWidth/2,y:(1-projected.y)*el.clientHeight/2,left,right,top,bottom});});}
   // Story hotspots follow their part (assembled or exploded). Round 5:
   // in Floors mode the layers move apart and the dots stay behind in
   // the gaps, floating between layers, so they are hidden there. They
   // stay in Explode mode and in the Tour, where they anchor the stops.
   hotspotDefs.forEach((h,k)=>{
    const i=hotspotIdx[k],dot=dots[k];
    if((s.mode??'explode')==='floors'){dot.hidden=true;if(openHotspot===k)closeHotspot();return;}
    if(i<0||!ready||data[i*4+3]<.5){dot.hidden=true;if(openHotspot===k)closeHotspot();return;}
    const b0=bounds[i].min,b1=bounds[i].max;
    projected.set((b0.x+b1.x)/2+data[i*4],b1.y+data[i*4+1]+.03,(b0.z+b1.z)/2+data[i*4+2]).project(camera);
    if(projected.z<-1||projected.z>1){dot.hidden=true;if(openHotspot===k)closeHotspot();return;}
    dot.hidden=false;
    dot.style.transform=`translate(${((projected.x+1)*el.clientWidth/2).toFixed(1)}px,${((1-projected.y)*el.clientHeight/2).toFixed(1)}px)`;
   });
   // Colosseum pilot: floor labels ride their layer as it separates.
   // Round 4: the labels ARE the layer names now. The leader lines to
   // the Floors panel rows are gone: their dots floated in mid-air in
   // every re-test, the lines ran off the bottom of the panel, and the
   // row margins the lines needed pushed the Hypogeum row below the fold.
   if((s.mode??'explode')==='floors'&&ready&&amount>.05){
    const points=layerLabelPoints();
    COLOSSEUM_LAYERS.forEach((_,li)=>{
     const lab=floorLabels[li];
     const anyVisible=atlas.parts.some((p,i)=>colosseumLayer(p)===li&&data[i*4+3]>.5);
     const pt=points[li];
     if(!anyVisible||!pt){lab.hidden=true;return;}
     lab.hidden=false;
     lab.style.left=`${pt.x.toFixed(1)}px`;
     lab.style.top=`${pt.y.toFixed(1)}px`;
    });
   }else{floorLabels.forEach(lab=>{lab.hidden=true;});}
   dirty=false;}

  // Poster pilot: render the current view plus the three poster insets from
  // the real model, all synchronously in one task so the canvas capture is
  // never blank. The animate loop restores the live view afterwards.
  if(captureRef){
   captureRef.current=()=>{
    if(!ready)return null;
    const renderNow=()=>renderer.render(scene,camera);
    camera.clearViewOffset();
    // The exploded-part markers and scale figures are live-view helpers;
    // they read as dust in a still poster, so hide them for all captures.
    const savedMarkersVisible=markers.visible,savedFiguresVisible=figures.visible;
    markers.visible=false;figures.visible=false;
    // The layer contact shadows stay visible for the main capture: they
    // are part of the poster, not live-view helpers. They are hidden below,
    // before the inset renders, so the plan, section and facade stay clean.
    renderNow();
    const main=renderer.domElement.toDataURL('image/png');
    const labelAnchors=layerLabelPoints();
    const savedDiscsVisible=contactDiscs.map(d=>d?d.visible:false);
    contactDiscs.forEach(d=>{if(d)d.visible=false;});
    const savedPos=camera.position.clone(),savedTarget=controls.target.clone();
    const savedData=data.slice();
    const zeroOffsets=()=>{atlas.parts.forEach((p,i)=>{data[i*4]=0;data[i*4+1]=0;data[i*4+2]=0;});partTexture.needsUpdate=true;};
    const restoreData=()=>{data.set(savedData);partTexture.needsUpdate=true;};
    // Plan: assembled top-down view. The arena floor and the awning are
    // hidden so the facade ring, seating bowl and hypogeum read as a plan
    // instead of a stack of overlapping discs. Framed to fit the wide plan
    // inset after the poster's cover crop of the viewport render.
    zeroOffsets();
    atlas.parts.forEach((p,i)=>{const li=colosseumLayer(p);if(li===1||li===3)data[i*4+3]=0;});
    partTexture.needsUpdate=true;
    const insetAspect=368/150;
    const planVh=Math.max(modelSize.x*1.12,modelSize.z*1.12*insetAspect)/camera.aspect;
    const planDist=planVh/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)));
    camera.up.set(0,0,-1);
    camera.position.set(0,modelCenter.y+planDist,0);controls.target.set(0,modelCenter.y,0);controls.update();renderNow();
    const plan=renderer.domElement.toDataURL('image/png');
    camera.up.set(0,1,0);
    // Section: assembled, front half clipped away, three-quarter view, so
    // the whole structure reads as one cutaway. The live camera is framed
    // for the separated stack, far too wide for the assembled model, so
    // the section is framed from the assembled bounds here; otherwise it
    // renders as a thin slice at the bottom of an empty frame. The
    // clipped model is the back half (z below 0), so the target sits
    // slightly behind the centre.
    atlas.parts.forEach((p,i)=>{data[i*4+3]=savedData[i*4+3];});
    partTexture.needsUpdate=true;
    renderer.clippingPlanes=[new T.Plane(new T.Vector3(0,0,-1),0)];
    const secHalfFov=T.MathUtils.degToRad(camera.fov/2);
    const secDist=Math.max(modelSize.y/(2*Math.tan(secHalfFov)),modelSize.x/(2*Math.tan(secHalfFov)*camera.aspect))*1.1;
    const secTarget=new T.Vector3(0,modelCenter.y,-modelSize.z*0.15);
    camera.position.copy(secTarget).addScaledVector(new T.Vector3(0.35,0.06,1).normalize(),secDist);
    controls.target.copy(secTarget);controls.update();renderNow();
    const section=renderer.domElement.toDataURL('image/png');
    renderer.clippingPlanes=[];
    restoreData();
    // Facade detail: close on the front arches (Doric, Ionic, Corinthian
    // tiers), in their lifted Floors position. The target is the front
    // band of the facade ring, not the ring's empty centre.
    let fcx=0,fcy=0,fcz=0,fcn=0;
    atlas.parts.forEach((p,i)=>{if(p.system!=='facade'||p.bounds[1][2]<0.95)return;const c=centers[i];fcx+=c.x+data[i*4];fcy+=c.y+data[i*4+1];fcz+=c.z+data[i*4+2];fcn++;});
    if(fcn===0){atlas.parts.forEach((p,i)=>{if(p.system!=='facade')return;const c=centers[i];fcx+=c.x+data[i*4];fcy+=c.y+data[i*4+1];fcz+=c.z+data[i*4+2];fcn++;});}
    const fcenter=new T.Vector3(fcx/Math.max(1,fcn),fcy/Math.max(1,fcn),fcz/Math.max(1,fcn));
    const fdir=new T.Vector3(0.12,0.10,1).normalize();
    camera.position.copy(fcenter).addScaledVector(fdir,0.9);controls.target.copy(fcenter);controls.update();renderNow();
    const facade=renderer.domElement.toDataURL('image/png');
    camera.position.copy(savedPos);controls.target.copy(savedTarget);controls.update();
    markers.visible=savedMarkersVisible;figures.visible=savedFiguresVisible;contactDiscs.forEach((d,i)=>{if(d)d.visible=savedDiscsVisible[i];});
    fit(latest.current.view,amount);renderNow();dirty=true;
    return {main,plan,section,facade,labelAnchors,viewWidth:el.clientWidth,viewHeight:el.clientHeight};
   };
  }
  };animate();
  const contextLost=(e:Event)=>{e.preventDefault();onError('The 3D session was paused by your device. Reload to continue.');};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  return()=>{disposed=true;abort.abort();cancelAnimationFrame(frame);observer.disconnect();controls.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());depthMaterial.dispose();scene.traverse(o=>{if(o instanceof T.Mesh&&!geometries.includes(o.geometry)){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});env.dispose();partTexture.dispose();selectionTexture.dispose();markerGeometry.dispose();markerMaterial.dispose();shadowTex.dispose();shadowRingTex.dispose();hover.remove();hotspotLayer.remove();floorLabelLayer.remove();if(captureRef)captureRef.current=null;renderer.dispose();renderer.domElement.remove();};
 },[atlas]);
 return <div className="scene" ref={host}/>;
}
