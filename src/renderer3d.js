import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {makeGeometries,makeMaterials} from './models3d.js';
import {createFrameHealth} from './frame-health.js';
export function create({canvas,onFailure,onFrame}){
 const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),geometries=makeGeometries(),materials=makeMaterials(),nodes=new Map(),roots=new Map();
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.06,.1,100);scene.environment=env.texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
 scene.add(new T.HemisphereLight(0xfff4df,0x656b72,2));
 const light=new T.DirectionalLight(0xfff5df,2.8);light.position.set(-.5,1.5,-.5);light.target.position.set(.5,0,.5);light.castShadow=true;light.shadow.mapSize.set(512,512);light.shadow.camera.left=-1.5;light.shadow.camera.right=1.5;light.shadow.camera.top=1.5;light.shadow.camera.bottom=-1.5;light.shadow.camera.near=.01;light.shadow.camera.far=8;light.shadow.bias=-.0003;light.shadow.normalBias=.001;light.shadow.radius=3;scene.add(light,light.target);
 const floorGeo=new T.PlaneGeometry(1,1),floorMat=new T.ShadowMaterial({opacity:.15}),floor=new T.Mesh(floorGeo,floorMat);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const sc=shadowCanvas.getContext('2d'),gradient=sc.createRadialGradient(32,32,2,32,32,32);gradient.addColorStop(0,'rgba(30,24,15,.25)');gradient.addColorStop(.5,'rgba(30,24,15,.12)');gradient.addColorStop(1,'rgba(30,24,15,0)');sc.fillStyle=gradient;sc.fillRect(0,0,64,64);
 const shadowTexture=new T.CanvasTexture(shadowCanvas),contactMat=new T.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 let latest=null,queued=0,disposed=false,active=true,width=0,height=0,quality='standard',frames=0,cpu=[],lastTime=0,lastFinished=0,continuous=false,benchmarkEnd=0,benchmarkResolve=null,shaderFailed=false;
 const health=createFrameHealth();
 renderer.debug.onShaderError=()=>{shaderFailed=true;};
 const raycaster=new T.Raycaster(),vec=new T.Vector3();
 const onLost=e=>{e.preventDefault();fail('3D graphics paused. Your table is safe in 2D.');};canvas.addEventListener('webglcontextlost',onLost);
 function fail(reason){if(disposed)return;active=false;cancelAnimationFrame(queued);queued=0;onFailure(reason);}
 function configure(data){
  const c=TableCamera.solve(data.calibration,data.sceneRatio);camera.matrixAutoUpdate=false;camera.matrixWorldInverse.set(...c.view);camera.matrixWorld.copy(camera.matrixWorldInverse).invert();camera.matrix.copy(camera.matrixWorld);camera.projectionMatrix.set(...c.clip).multiply(camera.matrixWorld);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  floor.position.set(.5,-.0004,.5/c.ratio);floor.scale.set(1,1/c.ratio,1);light.target.position.set(.5,0,.5/c.ratio);
  return c;
 }
 function sync(data){
  latest=data;if(!active||disposed)return;const c=configure(data),keep=new Set(),groupKeep=new Set();
  for(const i of data.items){
   const key=i.groupId||'item-'+i.id;groupKeep.add(key);let root=roots.get(key);if(!root){root=new T.Group();roots.set(key,root);scene.add(root);}
   const g=data.groups.find(g=>g.id===i.groupId),members=data.items.filter(j=>j.groupId===i.groupId),pivot=g?(members.find(j=>j.type==='plate')||members[0]):i;
   const gs=g?.scale||1,angle=-(g?.rotation||0)*Math.PI/180;root.position.set(pivot.x,0,pivot.y/c.ratio);root.rotation.y=angle;root.scale.setScalar(gs);
   let node=nodes.get(i.id);if(!node){const mesh=new T.Mesh(geometries[i.type]);mesh.castShadow=i.type!=='glass';mesh.receiveShadow=true;mesh.userData.itemId=i.id;const contact=new T.Mesh(floorGeo,contactMat);contact.rotation.x=-Math.PI/2;const body=new T.Group();body.add(mesh,contact);node={body,mesh,contact,type:i.type};nodes.set(i.id,node);}
   keep.add(i.id);root.add(node.body);const dx=(i.x-pivot.x)/gs,dz=(i.y-pivot.y)/c.ratio/gs,co=Math.cos(angle),si=Math.sin(angle);
   node.body.position.set(co*dx-si*dz,0,si*dx+co*dz);node.body.rotation.y=-i.rotation*Math.PI/180-angle;node.body.scale.setScalar(i.scale/gs);
   node.mesh.rotation.z=i.type==='plate'?(1-(i.tilt??1))*.45:0;node.mesh.position.y=i.type==='plate'?Math.sin(Math.abs(node.mesh.rotation.z))*.12:0;
   const category=i.type==='plate'?'plates':i.type==='glass'?'glassware':'cutlery';node.mesh.material=materials[category][i.collection]||materials[category].classic;
   // Bring-forward only resolves coplanar ties; normal physical depth still wins.
   node.mesh.renderOrder=data.items.indexOf(i);node.contact.position.y=.0002;node.contact.scale.set(i.type==='plate'?.265:i.type==='glass'?.078:.055,i.type==='plate'?.265:i.type==='glass'?.078:.23,1);
  }
  for(const [id,n] of nodes)if(!keep.has(id)){n.body.removeFromParent();nodes.delete(id);}for(const [id,r]of roots)if(!groupKeep.has(id)){r.removeFromParent();roots.delete(id);}
  scene.updateMatrixWorld(true);request();
 }
 function request(){if(!queued&&active&&!disposed&&!document.hidden){continuous=!!lastTime&&(!!benchmarkEnd||performance.now()-lastFinished<100);queued=requestAnimationFrame(draw);}}
 function draw(time){queued=0;if(!active||disposed||document.hidden)return;const start=performance.now();try{renderer.render(scene,camera);if(shaderFailed)throw Error('shader');}catch{fail('3D could not render here. Showing your table in 2D.');return;}
  frames++;
  const action=continuous&&lastTime?health.sample(time-lastTime):null;lastTime=time;
  onFrame?.();cpu.push(performance.now()-start);if(cpu.length>180)cpu.shift();lastFinished=performance.now();
  if(action==='reduce'){quality='reduced';renderer.setPixelRatio(1);renderer.shadowMap.enabled=false;}
  if(action==='fallback'){fail('3D is slow on this device. Switched to smooth 2D editing.');return;}
  if(benchmarkEnd>time)request();else settleBenchmark('complete');
 }
 function settleBenchmark(status){if(!benchmarkResolve)return;const done=benchmarkResolve;benchmarkResolve=null;benchmarkEnd=0;done({...stats(),status});}

 function resize(w,h){if(!w||!h||disposed)return;if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);}request();}
 function bounds(id){const n=nodes.get(id);if(!n)return null;const b=n.mesh.geometry.boundingBox,min={x:Infinity,y:Infinity},max={x:-Infinity,y:-Infinity};for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){vec.set(x,y,z).applyMatrix4(n.mesh.matrixWorld).project(camera);const u=(vec.x+1)*width/2,v=(1-vec.y)*height/2;min.x=Math.min(min.x,u);min.y=Math.min(min.y,v);max.x=Math.max(max.x,u);max.y=Math.max(max.y,v);}return {x:min.x,y:min.y,width:Math.max(4,max.x-min.x),height:Math.max(4,max.y-min.y)};}
 function pick(x,y){raycaster.setFromCamera({x:x*2-1,y:1-y*2},camera);return raycaster.intersectObjects([...nodes.values()].map(n=>n.mesh),false)[0]?.object.userData.itemId??null;}
 function stats(){const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;let geometryBytes=0;for(const g of Object.values(geometries)){for(const a of Object.values(g.attributes))geometryBytes+=a.array.byteLength;geometryBytes+=g.index?.array.byteLength||0;}
  const pixels=canvas.width*canvas.height;return {technology:'Three.js r185 / WebGL2',...health.stats(),quality,frames,cpuFrameMs:+mean(cpu).toFixed(2),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,materials:Object.values(materials).reduce((n,g)=>n+Object.keys(g).length,2),programs:renderer.info.programs?.length??null,pixelRatio:renderer.getPixelRatio(),geometryBytes,estimatedGraphicsBytes:geometryBytes+pixels*12+512*512*4+256*256*8,jsHeapBytes:performance.memory?.usedJSHeapSize??null,items:nodes.size,groups:roots.size,assets:Object.fromEntries(Object.entries(geometries).map(([k,g])=>[k,{triangles:(g.index?.count||g.attributes.position.count)/3,vertices:g.attributes.position.count}]))};}
 function benchmark(){settleBenchmark('cancelled');if(disposed||!active||document.hidden)return Promise.resolve({...stats(),status:'cancelled'});health.reset();cpu=[];lastTime=0;benchmarkEnd=performance.now()+3000;return new Promise(resolve=>{benchmarkResolve=resolve;request();});}
 function suspend(value){if(disposed||active===!value)return;active=!value;if(value){cancelAnimationFrame(queued);queued=0;lastTime=0;settleBenchmark('cancelled');}else request();}
 function visibility(){if(document.hidden){cancelAnimationFrame(queued);queued=0;lastTime=0;settleBenchmark('cancelled');}else request();}document.addEventListener('visibilitychange',visibility);
 function dispose(){if(disposed)return;settleBenchmark('cancelled');disposed=true;cancelAnimationFrame(queued);canvas.removeEventListener('webglcontextlost',onLost);document.removeEventListener('visibilitychange',visibility);for(const g of Object.values(geometries))g.dispose();for(const group of Object.values(materials))for(const m of Object.values(group))m.dispose();floorGeo.dispose();floorMat.dispose();contactMat.dispose();shadowTexture.dispose();env.dispose();light.shadow.dispose();renderer.dispose();}
 return {sync,resize,bounds,pick,stats,benchmark,suspend,dispose};
}
