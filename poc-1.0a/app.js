const $=id=>document.getElementById(id);
const link=$('quicklook');let appleViewer=false;
try{appleViewer=link.relList.supports('ar')}catch{}
// rel=ar can also mean an object viewer on desktop. Never promise a camera there.
const appleMobile=/iPhone|iPad|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
const quickLook=appleViewer&&appleMobile;
link.hidden=!quickLook;$('native-note').hidden=!quickLook;$('unsupported').hidden=quickLook;
$('capability').textContent=quickLook?'Apple AR viewer available — open it to place the plate.':'This browser cannot launch this Apple AR experiment.';
$('quicklook-support').textContent=quickLook?'Available; camera and tracking must be tested on device.':appleViewer?'Object viewer detected; mobile AR not confirmed.':'Not available in this browser.';
let timeout;
Promise.race([Promise.resolve().then(()=>navigator.xr?.isSessionSupported?.('immersive-ar')??false),new Promise(resolve=>{timeout=setTimeout(()=>resolve('timeout'),2500)})]).then(result=>{
 $('webxr-support').textContent=result==='timeout'?'Capability check timed out.':result?'Reported available; not used by this Quick Look experiment.':'Not exposed by this browser.';
}).catch(()=>{$('webxr-support').textContent='Capability check unavailable.'}).finally(()=>clearTimeout(timeout));
let launched=false,preview=null,loading=false;
link.addEventListener('click',()=>{launched=true;preview?.pause();$('capability').textContent='Opening Apple’s viewer. Select AR and scan your tabletop. This page cannot confirm tracking.'});
window.addEventListener('pageshow',()=>{if(launched){$('capability').textContent='Back on this page. Native placement is not saved or readable here.';launched=false}preview?.draw()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)preview?.pause();else{if(launched){$('capability').textContent='Back on this page. Native placement is not saved or readable here.';launched=false}preview?.draw()}});
$('preview-start').addEventListener('click',async()=>{
 if(loading||preview)return;loading=true;$('preview-start').disabled=true;$('preview-status').textContent='Loading the 3D preview…';
 try{const module=await import('./preview.js');preview=module.createPreview($('model'),message=>{preview?.dispose();preview=null;$('model').hidden=true;$('poster').hidden=false;$('preview-controls').hidden=true;$('preview-start').hidden=false;$('preview-start').disabled=false;$('preview-status').textContent=message});$('model').hidden=false;$('poster').hidden=true;$('preview-controls').hidden=false;$('preview-start').hidden=true;$('preview-status').textContent='3D preview only. Rotate the plate below; it is not on your table.';preview.resize();}
 catch{$('preview-status').textContent='3D preview is unavailable. The illustration is not AR. On a compatible iPhone, you can still open Apple’s AR viewer.';preview?.dispose();preview=null;$('model').hidden=true;$('poster').hidden=false;}
 finally{loading=false;$('preview-start').disabled=false}
});
$('rotation').addEventListener('input',e=>preview?.rotate(Number(e.target.value)));
$('preview-reset').addEventListener('click',()=>{$('rotation').value='0';preview?.rotate(0)});
window.addEventListener('pagehide',()=>preview?.pause());
