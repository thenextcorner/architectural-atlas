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
  const el=host.current!;let disposed=false,frame=0,dirty=true,ready=false,lastView='',lastReset=-1,lastIsolate='',lastFocus='',layoutKey='',amount=0,lastPoster=false,lastScaleFigures=false,lastDiscs=false;
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
  // Poster pilot: leader lines in Floors mode, from each layer in the 3D
  // scene to its row in the Floors panel. Desktop only. The panel sits on
  // the right and its rows are listed top layer first, the same order as
  // the layers in the render, so the lines run from each layer's right
  // edge straight to its own row and never cross. A halo under-stroke
  // keeps each line readable where it crosses pale stone.
  const leaderLayer=document.createElement('div');leaderLayer.className='leader-layer';el.appendChild(leaderLayer);
  const leaderSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  leaderSvg.setAttribute('width','100%');leaderSvg.setAttribute('height','100%');
  leaderLayer.appendChild(leaderSvg);
  const leaderHalos=COLOSSEUM_LAYERS.map(()=>{const l=document.createElementNS('http://www.w3.org/2000/svg','path');l.setAttribute('class','leader-halo');leaderSvg.appendChild(l);return l;});
  const leaderLines=COLOSSEUM_LAYERS.map(()=>{const l=document.createElementNS('http://www.w3.org/2000/svg','path');leaderSvg.appendChild(l);return l;});
  const leaderDots=COLOSSEUM_LAYERS.map(()=>{const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('r','3.5');leaderSvg.appendChild(c);return c;});
  // Poster pilot: schematic scale figures on the arena floor, off by
  // default. The arena sand surface sits at sandTop; the figures stand on
  // it, not on the model's origin, so they are never buried inside the
  // arena disc. Dark silhouettes only, no invented detail, drawn a little
  // larger than true scale so they read as people at poster distance.
  const sandTop=Math.max(0,...atlas.parts.filter(p=>/sand surface/i.test(p.name)).map(p=>p.bounds[1][1]));
  const figureMaterial=new T.MeshBasicMaterial({color:0x1a2027});
  const figures=new T.Group();
  [[0.32,0.1],[-0.28,0.08],[0.05,-0.22]].forEach(([fx,fz])=>{
   const g=new T.Group();
   const body=new T.Mesh(new T.CapsuleGeometry(0.009,0.028,3,8),figureMaterial);body.position.y=0.023;g.add(body);
   const head=new T.Mesh(new T.SphereGeometry(0.0075,12,8),figureMaterial);head.position.y=0.052;g.add(head);
   g.position.set(fx,0,fz);figures.add(g);
  });
  figures.visible=false;scene.add(figures);
  // Poster pilot: one soft shadow disc glued just under each lifted
  // layer, so every floating layer casts its own shadow instead of the
  // whole stack reading as a single soft ellipse on the platform. The
  // discs ride their layer's lift, show in the poster stage only, and are
  // hidden for the inset captures.
  const shadowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d')!;const grad=g.createRadialGradient(64,64,6,64,64,64);grad.addColorStop(0,'rgba(255,255,255,0.95)');grad.addColorStop(0.7,'rgba(255,255,255,0.85)');grad.addColorStop(0.9,'rgba(255,255,255,0.45)');grad.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=grad;g.fillRect(0,0,128,128);return new T.CanvasTexture(c);})();
  const layerBottoms=COLOSSEUM_LAYERS.map((_,li)=>{let bot=Infinity;atlas.parts.forEach(p=>{if(colosseumLayer(p)===li)bot=Math.min(bot,p.bounds[0][1]);});return bot===Infinity?modelCenter.y:bot;});
  const layerFoot=COLOSSEUM_LAYERS.map((_,li)=>{let rx=0.1,rz=0.1;atlas.parts.forEach(p=>{if(colosseumLayer(p)===li){rx=Math.max(rx,Math.abs(p.bounds[0][0]),Math.abs(p.bounds[1][0]));rz=Math.max(rz,Math.abs(p.bounds[0][2]),Math.abs(p.bounds[1][2]));}});return {x:rx,z:rz};});
  const layerDiscs=COLOSSEUM_LAYERS.map((_,li)=>{
   const d=new T.Mesh(new T.CircleGeometry(1,64),new T.MeshBasicMaterial({color:0x0a0f14,transparent:true,opacity:0.5,alphaMap:shadowTex,depthWrite:false}));
   d.rotation.x=-Math.PI/2;
   // The disc is a little wider than its layer, so the shadow spills past
   // the edge instead of ending exactly at it. The bottom layer is not
   // lifted: its disc is a contact halo on the platform, just wider than
   // the terrace, at the terrace base.
   const spread=li===0?1.06:1.1;
   d.scale.set(layerFoot[li].x*spread,layerFoot[li].z*spread,1);d.renderOrder=3;d.visible=false;scene.add(d);return d;
  });
  const layerTops=COLOSSEUM_LAYERS.map((_,li)=>{let top=-Infinity;atlas.parts.forEach(p=>{if(colosseumLayer(p)===li)top=Math.max(top,p.bounds[1][1]);});return top===-Infinity?modelCenter.y:top;});
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
   const reservedW=mobile?40:340,reservedH=mobile?350:(floorsMode?380:270);
   const availW=Math.max(160,el.clientWidth-reservedW),availH=Math.max(160,el.clientHeight-reservedH);
   const fitDistance=Math.max(modelSize.y,modelSize.x/(availW/availH),modelSize.z)/(2*Math.tan(halfFov));
   const normalDistance=Math.max(mobile?4.5:2.5,fitDistance*1.3);
   const reservedHeight=mobile?350:(floorsMode?380:270);const availableAspect=Math.max(.35,(el.clientWidth-(mobile?40:340))/Math.max(160,el.clientHeight-reservedHeight));const atlasDistance=Math.max(packingHeight,packingWidth/availableAspect)/(2*Math.tan(halfFov))*(el.clientHeight/Math.max(160,el.clientHeight-reservedHeight))*1.08;
   const distance=T.MathUtils.lerp(normalDistance,Math.max(.2,atlasDistance),extent);if(extent>.8)view='front';
   const direction=view==='front'?new T.Vector3(0,.02,1):view==='back'?new T.Vector3(0,.02,-1):view==='side'?new T.Vector3(1,.02,0):new T.Vector3(.35,.06,1).normalize();
   // In Floors mode the stack rises as it separates; aim at the lifted
   // stack's centre, not the assembled model's, or the top layer (the
   // velarium netting) is cropped by the top edge of the viewport. Aim a
   // little below the centre, so the stack sits higher in the frame and
   // its lowest layer clears the caption above the dock.
   const liftCenter=(latest.current.mode==='floors')?FLOOR_GAP*(COLOSSEUM_LAYERS.length-1)*amount/2:0;
   const targetY=modelCenter.y+liftCenter-((latest.current.mode==='floors')?0.08:0);
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
  // Leader-line anchors: for each layer, the screen position of the
  // layer's rightmost visible point, so the dot sits ON its layer. Uses
  // the actual part corners (with their current lift offsets), not the
  // model's bounding box: each layer is narrower than the whole model,
  // and the model is not centred on the camera axis, so a box edge puts
  // the dot in empty space beside the model. The dot is pulled a few
  // pixels inside the silhouette so it lands on stone, not on the edge.
  // Used by the live leader lines and by the poster capture, so both agree.
  const layerAnchors=():({x:number;y:number}|null)[]=>{
   const out:({x:number;y:number}|null)[]=[];
   for(let li=0;li<COLOSSEUM_LAYERS.length;li++){
    let bestX=-Infinity,bestY=0;
    for(let i=0;i<atlas.parts.length;i++){
     const p=atlas.parts[i];
     if(colosseumLayer(p)!==li||data[i*4+3]<.5)continue;
     const b=bounds[i];
     for(let c=0;c<8;c++){
      projected.set((c&1?b.max.x:b.min.x)+data[i*4],(c&2?b.max.y:b.min.y)+data[i*4+1],(c&4?b.max.z:b.min.z)+data[i*4+2]).project(camera);
      if(projected.z<-1||projected.z>1)continue;
      const x=(projected.x+1)*el.clientWidth/2,y=(1-projected.y)*el.clientHeight/2;
      if(x>bestX){bestX=x;bestY=y;}
     }
    }
    out.push(bestX===-Infinity?null:{x:bestX-12,y:bestY+4});
   }
   return out;
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
    key.color.set(posterOn?0xffe3b8:0xfffaf4);key.intensity=posterOn?2.6:2.3;key.castShadow=posterOn;
    (ground.material as T.MeshStandardMaterial).color.set(posterOn?0x202a36:darkStage?0x454e55:0xd5d9dc);
    (platform.material as T.MeshStandardMaterial).color.set(posterOn?0x33404f:0xeeeeec);
    // Poster stage: the plinth shrinks to a platform just wider than the
    // model, instead of a stage floor spanning the view. The ground disc
    // keeps only a hair of rim past the platform edge.
    ground.scale.set(posterOn?0.78:1,posterOn?0.78:1,1);
    platform.scale.set(posterOn?0.88:1,1,posterOn?0.88:1);
    ring.scale.set(posterOn?0.88:1,posterOn?0.88:1,1);
    innerRing.scale.set(posterOn?0.88:1,posterOn?0.88:1,1);
    stoneNoise.value=posterOn?1:0;
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
     const shown=!floorsHidden&&(s.isolate?selection.has(p.id):visible.has(p.system)||selection.has(p.id));
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
     if(!box.isEmpty()){
      const center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
      const w=el.clientWidth,h=el.clientHeight,mobile=w<768;
      const left=20,right=w-20,top=mobile?175:110,bottom=h-190;
      const availableWidth=Math.max(150,right-left),availableHeight=Math.max(40,bottom-top);
      const distance=Math.max(.07,Math.max(size.y*h/availableHeight,size.x*w/availableWidth/camera.aspect,size.z)/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*1.35);
      controls.maxDistance=Math.max(40,distance*2);
      controls.target.copy(center);
      camera.position.copy(center).add(new T.Vector3(.2,.1,1).normalize().multiplyScalar(distance));
      controls.update();dirty=true;
     }
    }else if(lastFocus){
     camera.clearViewOffset();fit(s.view,amount);
    }
    lastFocus=focusKey;
   }
   controls.enableRotate=amount<.8;controls.mouseButtons.LEFT=amount<.8?T.MOUSE.ROTATE:T.MOUSE.PAN;controls.touches.ONE=amount<.8?T.TOUCH.ROTATE:T.TOUCH.PAN;ground.visible=platform.visible=ring.visible=innerRing.visible=(amount<.5||!!s.poster)&&!s.isolate;markers.visible=amount>.75&&!s.poster;controls.autoRotate=s.rotate&&!s.isolate&&amount<.4;controls.autoRotateSpeed=.65;controls.update();if(controls.autoRotate)dirty=true;
   // Poster pilot: scale figures ride the arena layer in Floors mode and
   // stand on the assembled floor otherwise. Hidden during tours and
   // isolation, where they would sit in the way of the framing. The
   // toggle flips visibility, so a change must dirty the frame or the
   // toggle appears to do nothing.
   const showFigures=!!s.scaleFigures&&ready&&!s.isolate&&(s.mode??'explode')!=='tour'&&((s.mode??'explode')==='floors'||amount<.05);
   figures.visible=showFigures;
   if(showFigures)figures.position.y=sandTop+((s.mode??'explode')==='floors'?FLOOR_GAP*amount:0);
   if(showFigures!==lastScaleFigures){lastScaleFigures=showFigures;dirty=true;}
   // Per-layer shadow discs ride their layer's lift in the poster stage.
   const showDiscs=!!s.poster&&ready&&!s.isolate&&(s.mode??'explode')==='floors'&&amount>.05;
   layerDiscs.forEach((d,li)=>{if(!d)return;d.visible=showDiscs;if(showDiscs)d.position.y=li===0?0.004:layerBottoms[li]+li*FLOOR_GAP*amount-0.012;});
   if(showDiscs!==lastDiscs){lastDiscs=showDiscs;dirty=true;}
   if(dirty){renderer.render(scene,camera);targets=[];if(amount>.45){const hasSolid=atlas.parts.some((p,i)=>data[i*4+3]>.5);atlas.parts.forEach((p,i)=>{if(data[i*4+3]<.5)return;let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;for(let corner=0;corner<8;corner++){projected.set(p.bounds[(corner&1)?1:0][0]+data[i*4],p.bounds[(corner&2)?1:0][1]+data[i*4+1],p.bounds[(corner&4)?1:0][2]+data[i*4+2]).project(camera);const x=(projected.x+1)*el.clientWidth/2,y=(1-projected.y)*el.clientHeight/2;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}projected.copy(centers[i]).add(new T.Vector3(data[i*4],data[i*4+1],data[i*4+2])).project(camera);if(projected.z< -1||projected.z>1)return;targets.push({index:i,x:(projected.x+1)*el.clientWidth/2,y:(1-projected.y)*el.clientHeight/2,left,right,top,bottom});});}
   // Story hotspots follow their part (assembled or exploded).
   hotspotDefs.forEach((h,k)=>{
    const i=hotspotIdx[k],dot=dots[k];
    if(i<0||!ready||data[i*4+3]<.5){dot.hidden=true;if(openHotspot===k)closeHotspot();return;}
    const b0=bounds[i].min,b1=bounds[i].max;
    projected.set((b0.x+b1.x)/2+data[i*4],b1.y+data[i*4+1]+.03,(b0.z+b1.z)/2+data[i*4+2]).project(camera);
    if(projected.z<-1||projected.z>1){dot.hidden=true;if(openHotspot===k)closeHotspot();return;}
    dot.hidden=false;
    dot.style.transform=`translate(${((projected.x+1)*el.clientWidth/2).toFixed(1)}px,${((1-projected.y)*el.clientHeight/2).toFixed(1)}px)`;
   });
   // Colosseum pilot: floor labels ride their layer as it separates.
   if((s.mode??'explode')==='floors'&&ready&&amount>.05){
    COLOSSEUM_LAYERS.forEach((_,li)=>{
     const lab=floorLabels[li];
     const anyVisible=atlas.parts.some((p,i)=>colosseumLayer(p)===li&&data[i*4+3]>.5);
     if(!anyVisible){lab.hidden=true;return;}
     projected.set(-(modelSize.x/2)-.25,layerTops[li]+li*FLOOR_GAP*amount,0).project(camera);
     if(projected.z<-1||projected.z>1){lab.hidden=true;return;}
     lab.hidden=false;
     lab.style.left=`${((projected.x+1)*el.clientWidth/2).toFixed(1)}px`;
     lab.style.top=`${((1-projected.y)*el.clientHeight/2).toFixed(1)}px`;
    });
    // Poster pilot: leader lines from each layer to its Floors panel row.
    // Each line is an elbow: out from its layer's right edge, then along
    // a staggered vertical bus just left of the panel, then into its row.
    // The panel rows are listed top layer first, the same order as the
    // layers in the render. A row is kept below the anchor of the layer
    // above it: a margin on the row, sized from the live anchor, pushes
    // it down when it would otherwise sit above that anchor, because
    // then the two elbows must cross. With every row clear of the anchor
    // above it, the elbows never cross. A halo under each line keeps it
    // readable where it crosses pale stone.
    const desktop=el.clientWidth>=768;
    const anchors=layerAnchors();
    // Rows are processed top layer first, so a margin on an upper row is
    // already in the rects of the rows below it.
    [...COLOSSEUM_LAYERS.keys()].reverse().forEach(li=>{
     const lineEl=leaderLines[li],dotEl=leaderDots[li],haloEl=leaderHalos[li];
     const row=document.querySelector(`.floor-row[data-layer="${li}"]`) as HTMLElement|null;
     const a=anchors[li];
     if(!desktop||!row||row.offsetParent===null||!a){lineEl.style.display='none';dotEl.style.display='none';haloEl.style.display='none';return;}
     const anyVisible=atlas.parts.some((p,i)=>colosseumLayer(p)===li&&data[i*4+3]>.5);
     if(!anyVisible){lineEl.style.display='none';dotEl.style.display='none';haloEl.style.display='none';return;}
     const hr=row.getBoundingClientRect(),er=el.getBoundingClientRect();
     // The row's centre without the margin this code put on it, so the
     // needed push is stable from frame to frame.
     const ownMargin=parseFloat(row.style.marginTop)||0;
     const naturalCenter=hr.top-er.top+hr.height/2-ownMargin;
     const above=li<3?anchors[li+1]:null;
     const clearance=14;
     let margin=0;
     if(above&&naturalCenter<above.y+clearance)margin=above.y+clearance-naturalCenter;
     row.style.marginTop=margin>0?`${margin.toFixed(1)}px`:'';
     const ax=a.x,ay=a.y;
     const bx=hr.left-er.left-8,by=naturalCenter+margin;
     const busX=er.width-404+(3-li)*6;
     const path=`M ${ax.toFixed(1)} ${ay.toFixed(1)} H ${busX.toFixed(1)} V ${by.toFixed(1)} H ${bx.toFixed(1)}`;
     lineEl.setAttribute('d',path);haloEl.setAttribute('d',path);
     lineEl.style.display='';haloEl.style.display='';dotEl.setAttribute('cx',ax.toFixed(1));dotEl.setAttribute('cy',ay.toFixed(1));dotEl.style.display='';
    });
   }else{floorLabels.forEach(lab=>{lab.hidden=true;});leaderLines.forEach(l=>{l.style.display='none';});leaderDots.forEach(d=>{d.style.display='none';});leaderHalos.forEach(l=>{l.style.display='none';});}
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
    // The layer shadow discs stay visible for the main capture: they are
    // part of the poster, not live-view helpers. They are hidden below,
    // before the inset renders, so the plan, section and facade stay clean.
    renderNow();
    const main=renderer.domElement.toDataURL('image/png');
    const anchors=layerAnchors();
    const savedDiscsVisible=layerDiscs.map(d=>d?d.visible:false);
    layerDiscs.forEach(d=>{if(d)d.visible=false;});
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
    markers.visible=savedMarkersVisible;figures.visible=savedFiguresVisible;layerDiscs.forEach((d,i)=>{if(d)d.visible=savedDiscsVisible[i];});
    fit(latest.current.view,amount);renderNow();dirty=true;
    return {main,plan,section,facade,anchors,viewWidth:el.clientWidth,viewHeight:el.clientHeight};
   };
  }
  };animate();
  const contextLost=(e:Event)=>{e.preventDefault();onError('The 3D session was paused by your device. Reload to continue.');};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  return()=>{disposed=true;abort.abort();cancelAnimationFrame(frame);observer.disconnect();controls.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());depthMaterial.dispose();scene.traverse(o=>{if(o instanceof T.Mesh&&!geometries.includes(o.geometry)){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose());}});env.dispose();partTexture.dispose();selectionTexture.dispose();markerGeometry.dispose();markerMaterial.dispose();shadowTex.dispose();hover.remove();hotspotLayer.remove();floorLabelLayer.remove();leaderLayer.remove();if(captureRef)captureRef.current=null;renderer.dispose();renderer.domElement.remove();};
 },[atlas]);
 return <div className="scene" ref={host}/>;
}
