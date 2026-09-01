'use strict';
// The renderer and boundary fitter share exactly the same product envelopes.
const TableFit=(()=>{
 const P=typeof module!=='undefined'?require('./perspective.js'):TablePerspective;
 const sizes={plate:[.24,1],glass:[.07,1],fork:[.05,140/32],knife:[.05,140/32]};
 const C=typeof module!=='undefined'?require('./camera.js'):TableCamera;
 const identity=[{x:0,y:1},{x:1,y:1},{x:1,y:0},{x:0,y:0}];
 function context(q,imageRatio,three=false){return {three,h:P.matrix(q||identity),imageRatio,ratio:three?C.solve(q,imageRatio).ratio:q?P.ratio(q,imageRatio):imageRatio,surface:!!q};}
 function pose(i,ctx){return ctx.surface?P.pose(ctx.h,i,ctx.ratio,ctx.imageRatio):{x:i.x,y:i.y,scale:1,rotation:i.rotation};}
 function footprint(i,ctx){
  if(ctx.three){const [width,aspect]=sizes[i.type],a=width*i.scale*.54,b=a*aspect,t=i.rotation*Math.PI/180,c=Math.cos(t),s=Math.sin(t);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>P.project(ctx.h,{x:i.x+c*x*a-s*y*b,y:i.y+(s*x*a+c*y*b)*ctx.ratio}));}
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
 function polygonsOverlap(a,b){
  for(const shape of [a,b])for(let i=0;i<shape.length;i++){
   const p=shape[i],q=shape[(i+1)%shape.length],axis={x:p.y-q.y,y:q.x-p.x};
   const aa=a.map(v=>v.x*axis.x+v.y*axis.y),bb=b.map(v=>v.x*axis.x+v.y*axis.y);
   if(Math.max(...aa)<=Math.min(...bb)+1e-8||Math.max(...bb)<=Math.min(...aa)+1e-8)return false;
  }
  return true;
 }
 function overlaps(a,b,ctx){return a.some(i=>b.some(j=>polygonsOverlap(footprint(i,ctx),footprint(j,ctx))));}
 function arrange(items,groups,ctx,count){
  const G=typeof module!=='undefined'?require('./geometry.js'):TableGeometry;
  const seats=G.layout([2,4,6].includes(count)?count:6,ctx.ratio),cap=seats[0].scale*1.05;
  const batches=new Map(),placed=[],result=new Map(),factors=new Map();
  for(const i of items){const key=i.groupId||'item-'+i.id;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(i);}
  for(const [key,list] of batches){
   const center=G.pivot(list),group=groups.find(g=>g.id===key),initial=Math.min(1,cap/(group?.scale||list[0].scale));
   const minimum=Math.max(...list.map(i=>.08/i.scale));let accepted=initial>=1-1e-9&&inside(list,ctx)&&!placed.some(other=>overlaps(list,other,ctx))?{items:list.map(i=>({...i})),factor:1}:null;
   const candidates=[center,...seats.map(s=>G.pivot(s.items))];
   for(let x=.12;x<.95;x+=.14)for(let y=.12;y<.95;y+=.14)candidates.push({x,y});
   candidates.sort((a,b)=>Math.hypot(a.x-center.x,(a.y-center.y)/ctx.ratio)-Math.hypot(b.x-center.x,(b.y-center.y)/ctx.ratio));
   for(let step=0;step<32&&!accepted;step++){
    const factor=Math.max(minimum,initial*Math.pow(.94,step));
    for(const target of candidates){
     const trial=list.map(i=>({...i,x:target.x+(i.x-center.x)*factor,y:target.y+(i.y-center.y)*factor,scale:i.scale*factor}));
     const fitted=fit(trial,ctx);
     if(fitted.ok&&!placed.some(other=>overlaps(fitted.items,other,ctx))){accepted={items:fitted.items,factor:factor*fitted.factor};break;}
    }
    if(factor===minimum)break;
   }
   if(!accepted)return {ok:false,items,groups,changed:0};
   placed.push(accepted.items);accepted.items.forEach(i=>result.set(i.id,i));factors.set(key,accepted.factor);
  }
  const next=items.map(i=>result.get(i.id));
  return {ok:true,items:next,groups:groups.map(g=>({...g,scale:g.scale*(factors.get(g.id)||1)})),changed:items.filter((i,n)=>JSON.stringify(i)!==JSON.stringify(next[n])).length};
 }
 return {sizes,context,pose,footprint,bounds,inside,fit,overlaps,arrange};
})();
if(typeof module!=='undefined')module.exports=TableFit;
