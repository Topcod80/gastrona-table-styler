'use strict';
// Unit-square position mapping; near-left, near-right, far-right, far-left.
const TablePerspective=(()=>{

 function valid(q){
  if(!Array.isArray(q)||q.length!==4||q.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1))return false;
  let area=0;
  for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4],c=q[(i+2)%4];if((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x)>-0.002)return false;area+=a.x*b.y-b.x*a.y;}
  return -area/2>=.025;
 }
 function matrix(q){
  if(!valid(q))throw Error('Use an uncrossed tabletop quadrilateral.');
  const src=[[0,1],[1,1],[1,0],[0,0]],a=[];
  src.forEach(([x,y],i)=>{const {x:u,y:v}=q[i];a.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);});
  for(let col=0;col<8;col++){let pivot=col;for(let j=col+1;j<8;j++)if(Math.abs(a[j][col])>Math.abs(a[pivot][col]))pivot=j;
   [a[col],a[pivot]]=[a[pivot],a[col]];const d=a[col][col];if(Math.abs(d)<1e-10)throw Error('Table corners are too narrow.');
   for(let k=col;k<=8;k++)a[col][k]/=d;
   for(let j=0;j<8;j++)if(j!==col){const f=a[j][col];for(let k=col;k<=8;k++)a[j][k]-=f*a[col][k];}
  }
  return [...a.map(row=>row[8]),1];
 }
 function project(h,p){const w=h[6]*p.x+h[7]*p.y+h[8];if(Math.abs(w)<1e-9)throw Error('Outside table projection');return {x:(h[0]*p.x+h[1]*p.y+h[2])/w,y:(h[3]*p.x+h[4]*p.y+h[5])/w};}
 function inverse(m){const [a,b,c,d,e,f,g,h,i]=m;return [e*i-f*h,c*h-b*i,b*f-c*e,f*g-d*i,a*i-c*g,c*d-a*f,d*h-e*g,b*g-a*h,a*e-b*d];}
 // A screen-space layout estimate, NOT a metric reconstruction of the table.
 function ratio(q,imageRatio){
  const length=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/imageRatio);
  return Math.max(.2,Math.min(5,(length(q[0],q[1])+length(q[2],q[3]))/(length(q[1],q[2])+length(q[3],q[0]))));
 }
 function pose(h,p,layoutRatio,imageRatio){
  const v=project(h,p),w=h[6]*p.x+h[7]*p.y+h[8];
  const a=(h[0]-v.x*h[6])/w,b=(h[1]-v.x*h[7])/w*layoutRatio;
  const c=(h[3]-v.y*h[6])/w/imageRatio,d=(h[4]-v.y*h[7])/w*layoutRatio/imageRatio;
  // Smaller singular value of the local Jacobian gives one conservative size.
  // No unequal X/Y scaling or shear reaches the product artwork.
  const trace=a*a+b*b+c*c+d*d,det=a*d-b*c;
  const scale=Math.sqrt(Math.max(1e-12,(trace-Math.sqrt(Math.max(0,trace*trace-4*det*det)))/2));
  const t=(p.rotation||0)*Math.PI/180;
  // Follow the piece's longitudinal axis (fork/knife direction).
  const vx=-Math.sin(t),vy=Math.cos(t);
  const rotation=Math.atan2(c*vx+d*vy,a*vx+b*vy)*180/Math.PI-90;
  const maximum=Math.sqrt(Math.max(1e-12,(trace+Math.sqrt(Math.max(0,trace*trace-4*det*det)))/2));
  const surfaceAngle=.5*Math.atan2(2*(a*c+b*d),a*a+b*b-c*c-d*d)*180/Math.PI;
  return {...v,scale,rotation,flatness:Math.max(.66,Math.min(1,scale/maximum)),surfaceAngle};
 }
 return {ratio,valid,matrix,project,inverse,pose};
})();
if(typeof module!=='undefined')module.exports=TablePerspective;
