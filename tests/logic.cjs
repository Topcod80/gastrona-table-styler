const assert=require('node:assert/strict');
const G=require('../geometry.js');
const ratio=1.5;
const dist=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/ratio);
for(const n of [2,4,6]){
 const seats=G.layout(n,ratio);assert.equal(seats.length,n);
 for(const seat of seats){assert.equal(seat.items.length,4);const [p,f,k,g]=seat.items;
   for(const i of seat.items){assert.ok(i.x>0&&i.x<1&&i.y>0&&i.y<1);assert.equal(i.rotation,seat.rotation);}
   const relative=i=>G.rotate(i.x-p.x,(i.y-p.y)/ratio,-seat.rotation);
   assert.ok(relative(f).x<0&&relative(k).x>0);assert.ok(relative(g).x>0&&relative(g).y<0);assert.ok(dist(p,g)<p.scale*.24);
   const center=G.pivot(seat.items),result=G.transform(seat.items,center,ratio,{factor:1.25,rotation:33,dx:.01,dy:.02});
   for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)assert.ok(Math.abs(dist(result.items[a],result.items[b])-dist(seat.items[a],seat.items[b])*1.25)<1e-10);
   const spread=G.spread(seat.items,ratio,'standard','formal');assert.equal(spread[0].x,p.x);assert.equal(spread[0].y,p.y);
   assert.ok(Math.abs(dist(spread[0],spread[3])/dist(p,g)-1.16)<1e-10);assert.equal(spread[3].scale,g.scale);
 }
}
const six=G.layout(6,ratio);assert.ok(six.some(s=>s.rotation===90)&&six.some(s=>s.rotation===-90));
const corner=G.transform(six[0].items,G.pivot(six[0].items),ratio,{dx:-10,dy:-10});
assert.ok(Math.abs(dist(corner.items[0],corner.items[3])-dist(six[0].items[0],six[0].items[3]))<1e-10);
for(const ratio of [.65,1,1.5,2.5])for(const n of [2,4,6])for(const seat of G.layout(n,ratio))for(const i of seat.items)assert.ok(i.x>0&&i.x<1&&i.y>0&&i.y<1);
console.log('PASS: all seating templates, 6-guest end seats, guest-relative fork/knife/glass positions, glass proximity, affine group transform distances, spacing presets, whole-group boundary correction, portrait/wide layouts.');
const P=require('../perspective.js');
const q=[{x:.05,y:.93},{x:.96,y:.83},{x:.66,y:.16},{x:.4,y:.2}],h=P.matrix(q),inv=P.inverse(h);
const source=[{x:0,y:1},{x:1,y:1},{x:1,y:0},{x:0,y:0}];
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9);
source.forEach((p,i)=>{const v=P.project(h,p);close(v.x,q[i].x);close(v.y,q[i].y)});
for(let x=0;x<=1;x+=.1)for(let y=0;y<=1;y+=.1){const p=P.project(inv,P.project(h,{x,y}));close(p.x,x);close(p.y,y)}
const widthAt=y=>{const a=P.project(h,{x:.4,y}),b=P.project(h,{x:.6,y});return Math.hypot(a.x-b.x,a.y-b.y)};
assert.ok(widthAt(.2)<widthAt(.8)*.7);
assert.equal(P.valid([q[0],q[2],q[1],q[3]]),false);assert.equal(P.valid(Array(4).fill(q[0])),false);
const F=require('../fit.js');
const fixtures={
 narrow:[{x:.39,y:.95},{x:.64,y:.92},{x:.6,y:.1},{x:.44,y:.12}],
 wide:[{x:.03,y:.69},{x:.97,y:.69},{x:.9,y:.4},{x:.1,y:.4}],
 angled:q,
 severe:[{x:.04,y:.95},{x:.96,y:.92},{x:.58,y:.12},{x:.42,y:.13}]
};
assert.notEqual(P.ratio(fixtures.narrow,1.5),P.ratio(fixtures.wide,1.5));
for(const [name,quad] of Object.entries(fixtures))for(const n of [2,4,6]){
 const ctx=F.context(quad,1.5),seats=G.layout(n,ctx.ratio,'formal');
 for(const seat of seats){
  const fitted=F.fit(seat.items,ctx);assert.ok(fitted.ok,name+' '+n+' fits');assert.ok(F.inside(fitted.items,ctx));
  const a=seat.items,b=fitted.items;
  for(let j=1;j<4;j++){close(Math.hypot(b[j].x-b[0].x,(b[j].y-b[0].y)/ctx.ratio),Math.hypot(a[j].x-a[0].x,(a[j].y-a[0].y)/ctx.ratio)*fitted.factor);}
  assert.deepEqual(F.fit(fitted.items,ctx).items,fitted.items,'Fit is idempotent');
  const displaced=G.transform(seat.items,G.pivot(seat.items),ctx.ratio,{dx:-2,dy:2,factor:2}).items;
  const rescued=F.fit(displaced,ctx);assert.ok(rescued.ok,name+' large displaced setting');assert.ok(F.inside(rescued.items,ctx));
 }
 for(const y of [.2,.8]){const p=P.pose(ctx.h,{x:.5,y,rotation:0},ctx.ratio,1.5);assert.ok(Number.isFinite(p.scale)&&p.scale>0);}
}
const ctx=F.context(q,1.5);assert.ok(F.pose({x:.5,y:.2,rotation:0},ctx).scale<F.pose({x:.5,y:.8,rotation:0},ctx).scale);
console.log('PASS: adaptive quad proportions, uniform artwork scaling, narrow/wide/strong-angle 2/4/6 footprint containment, large-group recovery, proportional fitting, idempotence.');
// QA reproduction: an enlarged setting can be inside the table yet overlap peers.
for(const [name,quad] of Object.entries(fixtures))for(const n of [2,4,6]){
 const ctx=F.context(quad,1.5),seats=G.layout(n,ctx.ratio);let id=0;
 const groups=seats.map((s,i)=>({id:'g'+(i+1),scale:s.scale,rotation:s.rotation}));
 const items=seats.flatMap((s,i)=>s.items.map(p=>({...p,id:++id,groupId:groups[i].id})));
 const large=G.transform(items.slice(0,4),items[0],ctx.ratio,{factor:3}).items;
 const baseline=[...large,...items.slice(4)];groups[0].scale*=3;
 const fixed=F.arrange(baseline,groups,ctx,n);assert.ok(fixed.ok,name+' fit packing');assert.ok(fixed.changed>0);assert.ok(F.inside(fixed.items,ctx));
 for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)assert.equal(F.overlaps(fixed.items.filter(i=>i.groupId===groups[a].id),fixed.items.filter(i=>i.groupId===groups[b].id),ctx),false,name+' no overlap');
 assert.equal(F.arrange(fixed.items,fixed.groups,ctx,n).changed,0,'No-op is identified');
}
for(const r of [.6,1,1.5,2.5])for(const n of [2,4,6]){
 const seats=G.layout(n,r);for(const s of seats){const p=s.items[0];assert.ok(Math.min(p.x,1-p.x,p.y/r,(1-p.y)/r)<.16,'Plate sits near seat edge');}
}
const ground=P.pose(ctx.h,{x:.5,y:.5,rotation:0},ctx.ratio,1.5);assert.ok(ground.flatness>=.66&&ground.flatness<1);assert.ok(Number.isFinite(ground.surfaceAngle));
console.log('PASS QA: in-bounds oversized overlap repaired; proportional packing; seat-edge placement; bounded surface flattening.');

// Grounding axis follows the table edge even where the longest projected axis is depth.
{ const P=require("../perspective.js"),q=[{x:.06,y:.93},{x:.94,y:.87},{x:.65,y:.14},{x:.41,y:.17}],h=P.matrix(q),p={x:.5,y:.7};
 const pose=P.pose(h,p,P.ratio(q,1.5),1.5),next=P.project(h,{x:p.x+.001,y:p.y}),at=P.project(h,p);
 const expected=Math.atan2((next.y-at.y)/1.5,next.x-at.x)*180/Math.PI;
 assert.ok(Math.abs(pose.surfaceAngle-expected)<1e-6,"Plate axis follows local table width, not its upright depth axis"); }
// Exact ground-plane anchors and real homogeneous depth for elevated 3D vertices.
const C=require('../camera.js');
for(const quad of Object.values(fixtures)){
 const camera=C.solve(quad,1.5),ratio=camera.ratio;
 source.forEach((p,i)=>{const v=C.project(camera,p.x,p.y/ratio);close(v.x,quad[i].x);close(v.y,quad[i].y);});
 const foot=C.project(camera,.5,.7/ratio),rim=C.project(camera,.5,.7/ratio,.1);
 assert.ok(rim.y<foot.y,'Glass height rises above its foot');assert.ok(camera.clip.every(Number.isFinite));
 for(const n of [2,4,6]){const ctx=F.context(quad,1.5,true),seats=G.layout(n,ctx.ratio);let id=0;const gs=seats.map((s,i)=>({id:'g'+i,scale:s.scale})),items=seats.flatMap((s,i)=>s.items.map(p=>({...p,id:++id,groupId:gs[i].id})));const fit=F.arrange(items,gs,ctx,n);assert.ok(fit.ok);assert.ok(F.inside(fit.items,ctx));}
}
const cam=C.solve(q,1.5);assert.ok(C.project(cam,.5,.2/cam.ratio).w>C.project(cam,.5,.8/cam.ratio).w,'Far objects have larger perspective denominator');
console.log('PASS 3D: exact quad anchors, elevated glass projection, virtual-camera depth, complete 2/4/6 ground footprints fit.');
// Camera-space axes set physical proportions; photographed edge ratio is not metric.
{const q=[{x:.09,y:.90},{x:.92,y:.84},{x:.73,y:.20},{x:.31,y:.23}],c=C.solve(q,1.5),h=P.matrix(q),f=c.focal;
 const length=(x,y,w)=>Math.hypot((x-.5*w)/f,(y-.5*w)/(1.5*f),w);
 close(c.ratio,length(h[0],h[3],h[6])/length(h[1],h[4],h[7]));assert.ok(Math.abs(c.ratio-P.ratio(q,1.5))>.1);}
