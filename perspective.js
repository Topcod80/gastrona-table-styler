'use strict';
// Normalized 3:2 tabletop; corners near-left, near-right, far-right, far-left.
const TablePerspective=(()=>{
 const ratio=1.5;
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
 function css(h,w,height){const ph=w/ratio;return `matrix3d(${[h[0],h[3]*height/w,0,h[6]/w,h[1]*w/ph,h[4]*height/ph,0,h[7]/ph,0,0,1,0,h[2]*w,h[5]*height,0,1].join(',')})`;}
 return {ratio,valid,matrix,project,inverse,css};
})();
if(typeof module!=='undefined')module.exports=TablePerspective;
