'use strict';
// Adapter only: arrangement, photo storage, grouping and undo remain in app.js.
let renderer3D=null,view3D='loading',requested3D=true,loading3D=null;
try{requested3D=sessionStorage.getItem('table-studio.renderer')!=='2d';}catch{}
function is3D(){return !!renderer3D&&view3D==='3d';}
function fitContext(){return TableFit.context(calibration,sceneRatio,is3D());}
function update3DControls(){
 $('render-mode').textContent=is3D()?'3D view · Switch to 2D':'2D view · Try 3D';$('render-mode').setAttribute('aria-pressed',String(is3D()));$('render-mode').disabled=view3D==='loading'&&!!loading3D;
 $('surface-view').hidden=is3D();$('perf-start').disabled=!is3D();
 document.body.classList.toggle('three-active',is3D()&&!calibrating);$('table-3d').hidden=!is3D()||calibrating;
}
function fallback3D(reason){view3D='fallback';renderer3D?.dispose();renderer3D=null;$('render-status').textContent=reason;$('render-status').dataset.mode='2d';update3DControls();render();}
function load3D(){
 if(loading3D)return loading3D;
 view3D='loading';$('render-status').textContent='Loading 3D…';
 loading3D=new Promise((resolve,reject)=>{if(window.Table3D){resolve();return;}const script=document.createElement('script');script.src='./dist/table3d.js?v=0.40.1';script.onload=resolve;script.onerror=()=>reject(Error('load'));document.head.append(script);});
 update3DControls();
 loading3D.then(()=>{
  loading3D=null;if(!requested3D)return;
  try{renderer3D=Table3D.create({canvas:$('table-3d'),onFailure:fallback3D,onFrame:()=>{if(!is3D())return;for(const item of items){const el=$('items').querySelector(`[data-id="${item.id}"]`),b=renderer3D.bounds(item.id);if(el&&b){el.style.width=b.width+'px';el.style.height=b.height+'px';el.style.left=b.x+b.width/2+'px';el.style.top=b.y+b.height/2+'px';el.style.transform='translate(-50%,-50%)';}}paintHalo();$('table-3d').dataset.stats=JSON.stringify(renderer3D.stats());}});
   view3D='3d';$('render-status').textContent=calibration?'3D · Matched to your table':'3D · Calibrate for a table match';$('render-status').dataset.mode='3d';update3DControls();sync3D();
  }catch{fallback3D('3D is unavailable in this browser. All editing works in 2D.');}
 }).catch(()=>{loading3D=null;fallback3D('3D could not load. Your table remains editable in 2D.');});
 return loading3D;
}
function sync3D(){
 if(!requested3D){view3D='2d';update3DControls();return;}
 if(!renderer3D&&view3D!=='fallback'){if(items.length||photoBlob)load3D();return;}
 if(!is3D())return;
 renderer3D.suspend(calibrating);update3DControls();if(calibrating)return;
 renderer3D.resize(stage.clientWidth,stage.clientHeight);renderer3D.sync({items,groups,sceneRatio,calibration});
}
function setup3D(){
 $('render-mode').addEventListener('click',()=>{requested3D=!is3D();try{sessionStorage.setItem('table-studio.renderer',requested3D?'3d':'2d');}catch{}
  if(requested3D){view3D='loading';if(renderer3D){renderer3D.suspend(false);view3D='3d';$('render-status').textContent='3D · Matched to your table';$('render-status').dataset.mode='3d';}else load3D();}
  else{renderer3D?.suspend(true);view3D='2d';$('render-status').textContent='2D comparison · Same saved arrangement';$('render-status').dataset.mode='2d';}
  render();update3DControls();});
 $('perf-start').addEventListener('click',async()=>{if(!is3D())return;$('perf-start').disabled=true;$('perf-output').textContent='Measuring 3 seconds of rendering…';const result=await renderer3D.benchmark();$('perf-output').textContent=`${result.fps??'—'} FPS · ${result.cpuFrameMs} ms CPU/frame · ${result.triangles.toLocaleString()} triangles · ${(result.estimatedGraphicsBytes/1048576).toFixed(1)} MB estimated graphics allocations. ${result.jsHeapBytes?'JS heap '+(result.jsHeapBytes/1048576).toFixed(1)+' MB.':'Browser does not expose JS heap memory.'} This measures this browser, not an iPhone certification.`;$('perf-output').dataset.result=JSON.stringify(result);$('perf-start').disabled=!is3D();});
 update3DControls();
}
