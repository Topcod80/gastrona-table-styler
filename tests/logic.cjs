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
