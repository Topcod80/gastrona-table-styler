'use strict';
// The renderer and boundary fitter share exactly the same product envelopes.
const TableFit=(()=>{
 const P=typeof module!=='undefined'?require('./perspective.js'):TablePerspective;
 const sizes={plate:[.24,1],glass:[.07,1],fork:[.05,140/32],knife:[.05,140/32]};
 const identity=[{x:0,y:1},{x:1,y:1},{x:1,y:0},{x:0,y:0}];
 function context(q,imageRatio){return {h:P.matrix(q||identity),imageRatio,ratio:q?P.ratio(q,imageRatio):imageRatio,surface:!!q};}
 function pose(i,ctx){return ctx.surface?P.pose(ctx.h,i,ctx.ratio,ctx.imageRatio):{x:i.x,y:i.y,scale:1,rotation:i.rotation};}
 function footprint(i,ctx){
  const v=pose(i,ctx),[width,aspect]=sizes[i.type],a=width*i.scale*v.scale/2,b=a*(i.type==='glass'&&!ctx.surface?120/70:aspect);
  // Conservative rotated envelope includes a small contact-shadow allowance.
  const theta=v.rotation*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta),pad=width*i.scale*v.scale*.08;
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:v.x+c*x*(a+pad)-s*y*(b+pad),y:v.y+(s*x*(a+pad)+c*y*(b+pad))*ctx.imageRatio}));
 }
 function bounds(list,ctx){const inverse=P.inverse(ctx.h),points=list.flatMap(i=>footprint(i,ctx).map(p=>P.project(inverse,p)));return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};}
 function inside(list,ctx){try{const b=bounds(list,ctx);return b.left>=.012&&b.right<=.988&&b.top>=.012&&b.bottom<=.988;}catch{return false;}}
 function fit(list,ctx){
  if(!list.length||inside(list,ctx))return {items:list.map(i=>({...i})),factor:1,ok:true};
  const plate=list.find(i=>i.type==='plate'),pivot=plate||{x:list.reduce((s,i)=>s+i.x,0)/list.length,y:list.reduce((s,i)=>s+i.y,0)/list.length};
  const minimum=Math.max(...list.map(i=>.08/i.scale));
  // Try translation first; then reduce every member AND its offsets together.
  for(let step=0;step<65;step++){
   const factor=Math.max(minimum,Math.pow(.95,step));
   let trial=list.map(i=>({...i,x:.5+(i.x-pivot.x)*factor,y:.5+(i.y-pivot.y)*factor,scale:i.scale*factor}));
   let cx=Math.max(.1,Math.min(.9,pivot.x)),cy=Math.max(.1,Math.min(.9,pivot.y));
   trial=trial.map(i=>({...i,x:i.x+cx-.5,y:i.y+cy-.5}));
   for(let n=0;n<16;n++){
    if(inside(trial,ctx))return {items:trial,factor,ok:true};
    let b;try{b=bounds(trial,ctx);}catch{break;}
    if(b.right-b.left>.95||b.bottom-b.top>.95)break;
    const dx=b.left<.02?.02-b.left:b.right>.98?.98-b.right:0;
    const dy=b.top<.02?.02-b.top:b.bottom>.98?.98-b.bottom:0;
    trial=trial.map(i=>({...i,x:i.x+dx,y:i.y+dy}));
   }
   if(factor===minimum)break;
  }
  return {items:list.map(i=>({...i})),factor:1,ok:false};
 }
 return {sizes,context,pose,footprint,bounds,inside,fit};
})();
if(typeof module!=='undefined')module.exports=TableFit;
