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
// CSS matrix3d and mathematical mapping must agree at points across the plane.
const css=P.css(h,600,400).slice(9,-1).split(',').map(Number);
for(const p of [...source,{x:.34,y:.22},{x:.88,y:.5}]){const x=p.x*600,y=p.y*400,w=css[3]*x+css[7]*y+css[15],v=P.project(h,p);close((css[0]*x+css[4]*y+css[12])/w,v.x*600);close((css[1]*x+css[5]*y+css[13])/w,v.y*400)}
console.log('PASS: homography corner fit, inverse round trips, strong depth scaling, invalid quad rejection, CSS projection equivalence.');
