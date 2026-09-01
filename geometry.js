'use strict';
// Scene coordinates use image width as the physical unit, including vertical distances.
// These helpers never depend on a viewport, DOM, photo bytes, or collection artwork.
const TableGeometry = (() => {
  const spacingFactors={compact:.86,standard:1,formal:1.16};
  const offsets={plate:[0,0],fork:[-.165,0],knife:[.165,0],glass:[.155,-.16]};
  const templates={
    2:{scale:.85,seats:[[.5,.24,180],[.5,.76,0]]},
    4:{scale:.72,seats:[[.29,.23,180],[.71,.23,180],[.29,.77,0],[.71,.77,0]]},
    6:{scale:.56,seats:[[.34,.22,180],[.66,.22,180],[.34,.78,0],[.66,.78,0],[.12,.5,90],[.88,.5,-90]]}
  };
  const angle=v=>((v+180)%360+360)%360-180;
  function rotate(x,y,degrees){const r=degrees*Math.PI/180;return {x:x*Math.cos(r)-y*Math.sin(r),y:x*Math.sin(r)+y*Math.cos(r)};}
  function layout(count,ratio,spacing='standard'){
    const template=templates[count];if(!template||!Number.isFinite(ratio)||ratio<=0)throw Error('Invalid layout');
    const short=Math.min(1,1/ratio),scale=Math.max(.08,Math.min(template.scale,short*.27/.24));
    // A plate sits just inside its seat edge; inward glass offsets stay attached.
    const inset=.12*scale+.035*short;
    let seats=count===2?[[.5,inset*ratio,180],[.5,1-inset*ratio,0]]:
      count===4?[[.27,inset*ratio,180],[.73,inset*ratio,180],[.27,1-inset*ratio,0],[.73,1-inset*ratio,0]]:
      [[.3,inset*ratio,180],[.7,inset*ratio,180],[.3,1-inset*ratio,0],[.7,1-inset*ratio,0],[inset,.5,90],[1-inset,.5,-90]];
    if(ratio<1){
      const edge=inset;
      seats=count===2?[[edge,.5,90],[1-edge,.5,-90]]:
       count===4?[[edge,.27,90],[edge,.73,90],[1-edge,.27,-90],[1-edge,.73,-90]]:
       [[edge,.3,90],[edge,.7,90],[1-edge,.3,-90],[1-edge,.7,-90],[.5,edge*ratio,180],[.5,1-edge*ratio,0]];
    }
    return seats.map(([x,y,rotation])=>{
      return {scale,rotation,spacing,items:Object.entries(offsets).map(([type,[dx,dy]])=>{
        const p=rotate(dx*scale*spacingFactors[spacing],dy*scale*spacingFactors[spacing],rotation);
        return {type,x:x+p.x,y:y+p.y*ratio,scale,rotation,tilt:1};
      })};
    });
  }
  function pivot(members){const plate=members.find(i=>i.type==='plate');return plate?{x:plate.x,y:plate.y}:{x:members.reduce((s,i)=>s+i.x,0)/members.length,y:members.reduce((s,i)=>s+i.y,0)/members.length};}
  function transform(members,center,ratio,{factor=1,rotation=0,dx=0,dy=0}={}){
    // Clamp the whole set once. Never clamp members independently and distort their spacing.
    factor=Math.max(Math.max(...members.map(i=>.08/i.scale)),Math.min(factor,Math.min(...members.map(i=>3/i.scale))));
    const transformed=members.map(i=>{const p=rotate((i.x-center.x)*factor,(i.y-center.y)/ratio*factor,rotation);return {...i,x:center.x+p.x+dx,y:center.y+p.y*ratio+dy,scale:i.scale*factor,rotation:angle(i.rotation+rotation)};});
    const xs=transformed.map(i=>i.x),ys=transformed.map(i=>i.y);
    const shift=(lo,hi)=>hi-lo>.96?.5-(hi+lo)/2:lo<.02?.02-lo:hi>.98?.98-hi:0;
    const sx=shift(Math.min(...xs),Math.max(...xs)),sy=shift(Math.min(...ys),Math.max(...ys));
    return {factor,items:transformed.map(i=>({...i,x:i.x+sx,y:i.y+sy}))};
  }
  function spread(members,ratio,oldMode,newMode){const center=pivot(members),factor=spacingFactors[newMode]/spacingFactors[oldMode];return members.map(i=>({...i,x:center.x+(i.x-center.x)*factor,y:center.y+(i.y-center.y)*factor}));}
  return {layout,pivot,transform,spread,rotate,angle,spacingFactors};
})();
if(typeof module!=='undefined')module.exports=TableGeometry;
