'use strict';
// Exact calibrated ground plane + approximate upright camera axis. No photo access.
const TableCamera=(()=>{
 const P=typeof module!=='undefined'?require('./perspective.js'):TablePerspective;
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),norm=v=>Math.hypot(...v),unit=v=>v.map(x=>x/norm(v));
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 function solve(q,imageRatio){
  const quad=q||[{x:0,y:1},{x:1,y:1},{x:1,y:0},{x:0,y:0}],h=P.matrix(quad),ratio=q?P.ratio(q,imageRatio):imageRatio;
  // Principal point at image center. Infer focal length from orthogonal vanishing
  // directions where stable; otherwise use a moderate phone-like field of view.
  const ux=h[0]-.5*h[6],uy=(h[3]-.5*h[6])/imageRatio,vx=h[1]-.5*h[7],vy=(h[4]-.5*h[7])/imageRatio;
  const f2=-(ux*vx+uy*vy)/(h[6]*h[7]);
  const focal=Number.isFinite(f2)&&f2>.16&&f2<9?Math.sqrt(f2):.9;
  const lift=(x,y,w)=>[(x-.5*w)/focal,(y-.5*w)/(imageRatio*focal),w];
  const a=lift(h[0],h[3],h[6]),b=lift(h[1]*ratio,h[4]*ratio,h[7]*ratio),t=lift(h[2],h[5],h[8]);
  const right=unit(a),depth=unit(b.map((v,i)=>v-dot(b,right)*right[i])),up=unit(cross(depth,right));
  const scale=Math.sqrt(norm(a)*norm(b)),c=up.map(v=>v*scale);
  const height=[focal*c[0]+.5*c[2],imageRatio*focal*c[1]+.5*c[2],c[2]];
  // Rows mapping world (x,height,z,1) to homogeneous image (u,v,w).
  const u=[h[0],height[0],h[1]*ratio,h[2]],v=[h[3],height[1],h[4]*ratio,h[5]],w=[h[6],height[2],h[7]*ratio,h[8]];
  const near=.001,far=100,A=(far+near)/(far-near),B=2*far*near/(far-near);
  const clip=[...u.map((x,i)=>2*x-w[i]),...v.map((x,i)=>w[i]-2*x),...w.map((x,i)=>A*x-(i===3?B:0)),...w];
  // Rigid pose for lighting/rays; residual projective correction lives in the
  // camera projection, preserving the original quad exactly despite uncertain intrinsics.
  const view=[right[0],up[0],depth[0],t[0]/scale,-right[1],-up[1],-depth[1],-t[1]/scale,-right[2],-up[2],-depth[2],-t[2]/scale,0,0,0,1];
  return {ratio,focal,clip,view,u,v,w};
 }
 function project(c,x,z,height=0){const p=[x,height,z,1],d=dot(c.w,p);return {x:dot(c.u,p)/d,y:dot(c.v,p)/d,w:d};}
 return {solve,project};
})();
if(typeof module!=='undefined')module.exports=TableCamera;
