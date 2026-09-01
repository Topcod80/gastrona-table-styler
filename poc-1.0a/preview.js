import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
// Geometry data is generated from the stable procedural asset during build.
const data=PLATE_DATA;
export function createPreview(canvas,onFailure){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor('#e8e6df');renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.01,10);camera.position.set(.27,.31,.36);camera.lookAt(0,0,0);
 const geometry=new T.BufferGeometryLoader().parse(data.geometry),material=new T.MeshPhysicalMaterial({...data.material,clearcoat:.65,clearcoatRoughness:.19}),plate=new T.Mesh(geometry,material);scene.add(plate);
 const room=new RoomEnvironment(),generator=new T.PMREMGenerator(renderer),environment=generator.fromScene(room,.03);scene.environment=environment.texture;scene.environmentIntensity=.8;room.dispose();generator.dispose();scene.add(new T.HemisphereLight(0xfff8e8,0x72776e,2));
 const key=new T.DirectionalLight(0xffffff,2.5);key.position.set(1,2,1);scene.add(key);
 let frame=0,disposed=false;function draw(){if(!disposed&&!frame&&!document.hidden)frame=requestAnimationFrame(()=>{frame=0;try{renderer.render(scene,camera)}catch{onFailure('The 3D preview stopped. Apple AR is separate; you can still try its button on a compatible iPhone.')}})}
 function pause(){cancelAnimationFrame(frame);frame=0}
 function resize(){if(disposed)return;const r=canvas.parentElement.getBoundingClientRect();if(!r.width||!r.height)return;camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false);draw()}
 const observer=new ResizeObserver(resize);observer.observe(canvas.parentElement);
 function lost(e){e.preventDefault();onFailure('Graphics were interrupted. Reload the preview or use Apple AR on a compatible iPhone.')}
 canvas.addEventListener('webglcontextlost',lost);resize();
 return {draw,pause,resize,rotate(degrees){plate.rotation.y=degrees*Math.PI/180;canvas.dataset.rotation=String(degrees);draw()},dispose(){if(disposed)return;disposed=true;pause();observer.disconnect();canvas.removeEventListener('webglcontextlost',lost);geometry.dispose();material.dispose();environment.dispose();renderer.dispose()}};
}
