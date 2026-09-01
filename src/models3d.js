import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Original unbranded geometry, in table-width units. Built once and shared.
const lathe=(points,n=48)=>new T.LatheGeometry(points.map(p=>new T.Vector2(...p)),n);
function extrude(points,thickness){const s=new T.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,z):s.moveTo(x,z));s.closePath();const g=new T.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.0012,bevelThickness:.0007,curveSegments:8});g.rotateX(Math.PI/2);g.translate(0,.004,0);return g;}
export function makeGeometries(){
 const plate=lathe([[0,.005],[.058,.005],[.066,.002],[.071,.002],[.077,.006],[.108,.012],[.120,.016],[.120,.021],[.115,.023],[.100,.020],[.078,.012],[.066,.010],[0,.010]]);
 const handle=[[-.006,.106],[.006,.106],[.008,.090],[.004,.010],[.006,-.025],[-.006,-.025],[-.004,.010],[-.008,.090]];
 const forkParts=[extrude(handle,.003),extrude([[-.021,-.022],[.021,-.022],[.022,-.052],[-.022,-.052]],.0025)];
 for(let i=0;i<4;i++){const x=-.019+i*.012;forkParts.push(extrude([[x,-.049],[x+.005,-.049],[x+.004,-.109],[x+.001,-.113]],.0016));}
 const fork=mergeGeometries(forkParts);forkParts.forEach(g=>g.dispose());
 const knife=extrude([[-.005,.108],[.006,.108],[.009,.090],[.006,-.005],[.014,-.010],[.020,-.080],[.015,-.110],[-.001,-.110],[-.008,-.075],[-.011,-.020],[-.005,.010]],.0035);
 // Closed bowl wall with lip, solid stem and foot. Actual height .185, foot .070 wide.
 const glass=lathe([[0,.001],[.030,.001],[.035,.003],[.035,.006],[.028,.009],[.004,.012],[.0025,.070],[.008,.078],[.023,.089],[.031,.111],[.033,.143],[.027,.185],[.0255,.185],[.031,.142],[.029,.113],[.021,.094],[.006,.083],[0,.081]],40);
 const out={plate,fork,knife,glass};for(const g of Object.values(out)){g.computeBoundingBox();g.computeBoundingSphere();}return out;
}
export function makeMaterials(){
 const ceramic=color=>new T.MeshPhysicalMaterial({color,roughness:.23,metalness:0,clearcoat:.65,clearcoatRoughness:.19});
 const metal=color=>new T.MeshStandardMaterial({color,roughness:.24,metalness:.92});
 // Alpha compositing preserves the local photograph underneath. No costly
 // transmission render target, no claim of refraction of the user's photo.
 const glass=color=>new T.MeshPhysicalMaterial({color,roughness:.09,metalness:0,transparent:true,opacity:.28,depthWrite:false,side:T.DoubleSide,clearcoat:1,clearcoatRoughness:.06,ior:1.46,specularIntensity:1.4});
 return {plates:{classic:ceramic('#eee9de'),sage:ceramic('#718c77'),blue:ceramic('#243f6e')},cutlery:{classic:metal('#b7bcc4'),gold:metal('#c79a44'),ink:metal('#363b40')},glassware:{classic:glass('#edf8ff'),amber:glass('#c8933f'),rose:glass('#b77987')}};
}
