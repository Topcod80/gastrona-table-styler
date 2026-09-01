// Only active frame intervals count. A long scheduled frame is a stall, never idle.
export function createFrameHealth(){
 let intervals=[],window=[],quality='standard';
 const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
 return {
  sample(ms){if(!Number.isFinite(ms)||ms<=0)return null;intervals.push(ms);if(intervals.length>180)intervals.shift();window.push(ms);if(window.length<6||window.reduce((s,v)=>s+v,0)<3000)return null;const slow=mean(window)>80;window=[];if(!slow)return null;if(quality==='standard'){quality='reduced';return 'reduce'}return 'fallback'},
  reset(){intervals=[];window=[]},
  stats(){const sorted=[...intervals].sort((a,b)=>a-b);return {quality,measuredFrames:intervals.length,fps:intervals.length?+(1000/mean(intervals)).toFixed(1):null,p95FrameMs:sorted.length?+sorted[Math.ceil(sorted.length*.95)-1].toFixed(2):null,maxFrameMs:sorted.length?+sorted.at(-1).toFixed(2):null,slowFrames:intervals.filter(n=>n>50).length}}
 };
}
