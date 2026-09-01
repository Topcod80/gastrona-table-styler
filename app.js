'use strict';
const $ = id => document.getElementById(id);
const dimensions = {plate:[.24,1],glass:[.07,120/70],fork:[.05,140/32],knife:[.05,140/32]};
let items = [], selected = null, serial = 0, history = [], photoURL = null, photoRequest = 0;
let guestCount = null;
let collections = {plates:'classic',cutlery:'classic',glassware:'classic'};
const SAVE_KEY = 'table-studio.arrangement.v2'; // Read-only compatibility with the old metadata save.
let groups=[],groupSerial=0,selectionMode='setting',spacing='standard',sceneRatio=4/3,photoBlob=null,focused=false,viewZoom=1,pan=null,revision=0;
let calibration=null,calibrating=false,calibrationDraft=null,cornerDrag=null;
const planeRatio=()=>calibration?TablePerspective.ratio:sceneRatio;
const activeCalibration=()=>calibrating&&TablePerspective.valid(calibrationDraft)?calibrationDraft:calibration;
let activeTool='size',sliderBase=null,sliderKey=null,busy=false;
const workspace=document.querySelector('.workspace'), canvasWindow=$('canvas-window');
let pointers = new Map(), gesture = null;
const stage = $('stage');
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const angle = v => ((v+180)%360+360)%360-180;
const current = () => items.find(i=>i.id===selected);
function scene(){return {version:30,items,groups,guestCount,collections,spacing,sceneRatio,calibration};}
function checkpoint(){revision++;history.push({scene:JSON.parse(JSON.stringify(scene())),selected,photo:photoBlob});if(history.length>25)history.shift();$('undo').disabled=false;}
function announce(message){$('status').textContent=message;$('edit-status').textContent=message;}
function currentGroup(){const item=current();return item?.groupId?groups.find(g=>g.id===item.groupId):null;}
function members(){const item=current();if(!item)return [];return selectionMode==='setting'&&currentGroup()?items.filter(i=>i.groupId===item.groupId):[item];}
function capture(){const list=members().map(i=>({...i})),g=selectionMode==='setting'?currentGroup():null;return {items:list,pivot:TableGeometry.pivot(list),groupId:g?.id,scale:g?.scale??list[0]?.scale??1,rotation:g?.rotation??list[0]?.rotation??0};}
function applyTransform(base,change){
  const result=TableGeometry.transform(base.items,base.pivot,planeRatio(),change);
  const mapped=new Map(result.items.map(i=>[i.id,i]));items=items.map(i=>mapped.get(i.id)||i);
  const g=groups.find(g=>g.id===base.groupId);if(g){g.scale=base.scale*result.factor;g.rotation=angle(base.rotation+(change.rotation||0));}
  paint();
}
function controls(){
  const item=current(),g=selectionMode==='setting'?currentGroup():null,list=members();
  $('selection-label').textContent=item?(g?'Place setting · '+list.length+' pieces':item.type[0].toUpperCase()+item.type.slice(1)):'Tap a plate to select its setting';
  $('count').textContent=items.length+' pieces';
  for(const id of ['size','rotation','duplicate','delete','forward'])$(id).disabled=!item;
  $('size').value=g?.scale??item?.scale??1;$('rotation').value=g?.rotation??item?.rotation??0;
  $('size-caption').textContent=g?'Group size':'Item size';
  $('size-value').value=Math.round((g?.scale??item?.scale??1)*100)+'%';$('rotation-value').value=Math.round(g?.rotation??item?.rotation??0)+'°';
  const plate=list.find(i=>i.type==='plate');$('tilt').disabled=!plate;$('tilt').value=plate?.tilt??1;$('tilt-value').value=Math.round((plate?.tilt??1)*100)+'%';
  $('mode-item').setAttribute('aria-pressed',String(selectionMode==='item'));$('mode-setting').setAttribute('aria-pressed',String(selectionMode==='setting'));
  $('undo').disabled=!history.length;syncGameControls();
  const mode=currentGroup()?.spacing||spacing;for(const v of ['compact','standard','formal'])$('spacing-'+v).setAttribute('aria-pressed',String(v===mode));
}
function position(el,item){
  const [width,ratio]=activeCalibration()&&item.type==='glass'?[.07,1]:dimensions[item.type];el.style.width=width*100+'%';el.style.height=stage.clientWidth*width*ratio+'px';el.style.left=item.x*100+'%';el.style.top=item.y*100+'%';
  el.style.transform=`translate(-50%,-50%) rotate(${item.rotation}deg) scale(${item.scale})`;
  el.style.setProperty('--compression',String(item.type==='plate'?(item.tilt??1):1));
  const active=members().some(i=>i.id===item.id);el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));
  el.dataset.group=item.groupId||'';
}
function render(){updatePlane();const layer=$('items');layer.replaceChildren();for(const item of items){const el=document.createElement('button');el.className='piece';el.dataset.id=item.id;el.setAttribute('aria-label',`${item.type} ${item.id}`);el.innerHTML='<span class=visual>'+TableAssets.render(item.type,item.collection || collections[TableAssets.categories[item.type]],!!activeCalibration())+'</span>';position(el,item);layer.append(el);} $('empty').hidden=!!photoURL||items.length>0;for(const button of $('products').children){const type=button.dataset.type;button.innerHTML=TableAssets.render(type,collections[TableAssets.categories[type]])+'<span>'+type[0].toUpperCase()+type.slice(1)+'</span>'; }controls();}
function paint(){updatePlane();for(const item of items){const el=$('items').querySelector(`[data-id="${item.id}"]`);if(el)position(el,item);}controls();}
for(const type of Object.keys(TableAssets.categories)){const button=document.createElement('button');button.className='product';button.dataset.type=type;button.setAttribute('aria-label',`Add ${type}`);button.innerHTML=`${TableAssets.render(type,collections[TableAssets.categories[type]])}<span>${type[0].toUpperCase()+type.slice(1)}</span>`;button.addEventListener('click',()=>{checkpoint();selected=++serial;items.push({id:selected,type,collection:collections[TableAssets.categories[type]],x:.5+(items.length%3-1)*.06,y:.5,scale:1,rotation:0,tilt:1,groupId:null});render();announce(`${type} added.`);});$('products').append(button);}
function point(e){const rect=stage.getBoundingClientRect(),p={x:(e.clientX-rect.left)/stage.clientWidth,y:(e.clientY-rect.top)/stage.clientHeight};
 const v=calibration?TablePerspective.project(TablePerspective.inverse(TablePerspective.matrix(calibration)),p):p;
 return {x:v.x*stage.clientWidth,y:v.y*stage.clientWidth/planeRatio()};}
function imagePoint(item){return calibration?TablePerspective.project(TablePerspective.matrix(calibration),item):item;}

function baseline(){if(!current()||!pointers.size){gesture=null;return;}gesture={...capture(),points:[...pointers.values()].map(p=>({...p})),width:stage.clientWidth,height:stage.clientWidth/planeRatio()};}
stage.addEventListener('pointerdown',e=>{
  if(calibrating)return;if(e.pointerType==='mouse'&&e.button!==0)return;const target=e.target.closest('.piece');
  if(!focused){selected=target?Number(target.dataset.id):null;enterFocus();e.preventDefault();return;}
  if(!pointers.size){selected=target?Number(target.dataset.id):null;paint();
    if(!current()){pan={id:e.pointerId,x:e.clientX,y:e.clientY,left:canvasWindow.scrollLeft,top:canvasWindow.scrollTop};stage.setPointerCapture(e.pointerId);return;}
    checkpoint();
  }
  if(pointers.size>=2)return;e.preventDefault();stage.focus({preventScroll:true});stage.setPointerCapture(e.pointerId);pointers.set(e.pointerId,point(e));baseline();
});
stage.addEventListener('pointermove',e=>{
  if(calibrating)return;if(pan?.id===e.pointerId){canvasWindow.scrollLeft=pan.left+pan.x-e.clientX;canvasWindow.scrollTop=pan.top+pan.y-e.clientY;return;}
  if(!pointers.has(e.pointerId)||!gesture)return;e.preventDefault();pointers.set(e.pointerId,point(e));
  const p=[...pointers.values()],b=gesture.points;let dx=(p[0].x-b[0].x)/gesture.width,dy=(p[0].y-b[0].y)/gesture.height,factor=1,rotation=0;
  if(p.length===2&&b.length===2){
    const middle=a=>({x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2}),distance=a=>Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y),direction=a=>Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x);
    const a=middle(b),c=middle(p);factor=distance(p)/Math.max(1,distance(b));factor=clamp(factor,Math.max(...gesture.items.map(i=>.08/i.scale)),Math.min(...gesture.items.map(i=>3/i.scale)));
    rotation=(direction(p)-direction(b))*180/Math.PI;
    const offset=TableGeometry.rotate((gesture.pivot.x*gesture.width-a.x)*factor,(gesture.pivot.y*gesture.height-a.y)*factor,rotation);
    dx=(c.x+offset.x)/gesture.width-gesture.pivot.x;dy=(c.y+offset.y)/gesture.height-gesture.pivot.y;
  }
  applyTransform(gesture,{dx,dy,factor,rotation});
});
function endPointer(e){if(pan?.id===e.pointerId)pan=null;if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);baseline();}
for(const event of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(event,endPointer);
$('items').addEventListener('click',e=>{const el=e.target.closest('.piece');if(el){selected=Number(el.dataset.id);paint();}});
for(const mode of ['item','setting'])$('mode-'+mode).addEventListener('click',()=>{selectionMode=mode;sliderBase=null;paint();});
for(const key of ['size','rotation','tilt']){
  $(key).addEventListener('input',()=>{
    if(!current())return;const value=Number($(key).value);
    if(!sliderBase||sliderKey!==key){checkpoint();sliderBase=capture();sliderKey=key;}
    if(key==='size')applyTransform(sliderBase,{factor:value/sliderBase.scale});
    else if(key==='rotation')applyTransform(sliderBase,{rotation:value-sliderBase.rotation});
    else {const ids=new Set(sliderBase.items.filter(i=>i.type==='plate').map(i=>i.id));for(const i of items)if(ids.has(i.id))i.tilt=value;paint();}
  });
  for(const event of ['change','blur'])$(key).addEventListener(event,()=>{sliderBase=null;sliderKey=null;});
}
for(const tool of ['size','rotation','tilt','spacing'])$('tool-'+tool).addEventListener('click',()=>{
  activeTool=tool;for(const name of ['size','rotation','tilt','spacing']){$('control-'+name).hidden=name!==tool;$('tool-'+name).setAttribute('aria-pressed',String(name===tool));}fitStage();
});
$('duplicate').addEventListener('click',()=>{
  if(!current())return;checkpoint();const source=members(),group=selectionMode==='setting'?currentGroup():null,newGroup=group?'g'+(++groupSerial):null;
  if(group)groups.push({...group,id:newGroup});
  const moved=TableGeometry.transform(source,TableGeometry.pivot(source),planeRatio(),{dx:.04,dy:.04}).items;
  const copies=moved.map(i=>({...i,id:++serial,groupId:newGroup}));items.push(...copies);selected=copies.find(i=>i.type==='plate')?.id??copies[0].id;render();announce(group?'Place setting duplicated.':'Piece duplicated.');
});
function remove(){if(!current())return;checkpoint();const ids=new Set(members().map(i=>i.id));items=items.filter(i=>!ids.has(i.id));groups=groups.filter(g=>items.some(i=>i.groupId===g.id));selected=null;render();announce('Selection deleted. Undo brings it back.');}
$('delete').addEventListener('click',remove);
$('undo').addEventListener('click',()=>{if(!history.length)return;revision++;const previous=history.pop();applyScene(previous.scene);selected=previous.selected;setPhoto(previous.photo,previous.scene.sceneRatio);render();announce('Last change undone.');});
stage.addEventListener('keydown',e=>{
  if(e.key==='Escape'){exitFocus();return;}if(!current())return;
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}
  const delta={ArrowLeft:[-.01,0],ArrowRight:[.01,0],ArrowUp:[0,-.01],ArrowDown:[0,.01]}[e.key];if(delta){e.preventDefault();checkpoint();applyTransform(capture(),{dx:delta[0],dy:delta[1]});}
});
$('choose').addEventListener('click',()=>$('photo-input').click());$('camera').addEventListener('click',()=>$('camera-input').click());
async function decodePhoto(blob){const url=URL.createObjectURL(blob);try{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});return image.naturalWidth/image.naturalHeight;}finally{URL.revokeObjectURL(url);}}
function setPhoto(blob,ratio){
  if(photoURL)URL.revokeObjectURL(photoURL);photoBlob=blob;photoURL=blob?URL.createObjectURL(blob):null;sceneRatio=ratio;
  if(photoURL){$('table-photo').src=photoURL;$('table-photo').hidden=false;}else{$('table-photo').removeAttribute('src');$('table-photo').hidden=true;}
  $('scene-label').textContent=blob?'YOUR TABLE':'YOUR CANVAS';$('clear-photo').disabled=!blob;$('calibrate').disabled=!blob;fitStage();
}
async function loadPhoto(file){
  if(!file)return;const request=++photoRequest;if(!file.type.startsWith('image/')&&!/\.(heic|heif|jpg|jpeg|png|webp|avif)$/i.test(file.name)){announce('Please choose an image file.');return;}
  if(file.size>40*1024*1024){announce('This photo is too large. Choose one under 40 MB.');return;}
  try{const ratio=await decodePhoto(file);if(request!==photoRequest)return;checkpoint();calibration=null;setPhoto(file,ratio);render();announce('Photo ready. Calibrate the tabletop, or skip and choose guests.');}
  catch{if(request===photoRequest)announce('This image could not be opened. Try JPEG or PNG, or take a new photo.');}
}
for(const id of ['photo-input','camera-input'])$(id).addEventListener('change',e=>{loadPhoto(e.target.files[0]);e.target.value='';});
$('clear-photo').addEventListener('click',()=>{checkpoint();++photoRequest;calibration=null;setPhoto(null,4/3);render();announce('Photo removed from this scene. Save to replace your stored scene.');});
function fitStage(){
  if(focused){const width=canvasWindow.clientWidth,height=canvasWindow.clientHeight;const w=Math.min(width,height*sceneRatio)*viewZoom;stage.style.width=w+'px';stage.style.height=w/sceneRatio+'px';}
  else {stage.style.width='100%';stage.style.height='auto';}
  stage.style.aspectRatio=String(sceneRatio);paint();
}
let previousScroll=0;
function enterFocus(){if(focused)return;previousScroll=window.scrollY;focused=true;document.body.classList.add('editing');viewZoom=1.5;$('zoom').textContent='Zoom 1.5×';requestAnimationFrame(()=>{fitStage();const item=current(),where=item?imagePoint(item):null;canvasWindow.scrollLeft=item?where.x*stage.clientWidth-canvasWindow.clientWidth/2:(canvasWindow.scrollWidth-canvasWindow.clientWidth)/2;canvasWindow.scrollTop=item?where.y*stage.clientHeight-canvasWindow.clientHeight/2:0;stage.focus({preventScroll:true});});paint();}
function exitFocus(){if(calibrating){cancelCalibration();return;}focused=false;pointers.clear();gesture=null;pan=null;document.body.classList.remove('editing');fitStage();window.scrollTo(0,previousScroll);}
$('done').addEventListener('click',exitFocus);
$('zoom').addEventListener('click',()=>{viewZoom=viewZoom===1?1.5:viewZoom===1.5?2:1;$('zoom').textContent='Zoom '+viewZoom+'×';fitStage();const item=current(),where=item?imagePoint(item):null;canvasWindow.scrollLeft=item?where.x*stage.clientWidth-canvasWindow.clientWidth/2:(canvasWindow.scrollWidth-canvasWindow.clientWidth)/2;canvasWindow.scrollTop=item?where.y*stage.clientHeight-canvasWindow.clientHeight/2:(canvasWindow.scrollHeight-canvasWindow.clientHeight)/2;});
new ResizeObserver(()=>{pointers.clear();gesture=null;paint();}).observe(stage);
new ResizeObserver(()=>{if(focused)fitStage();}).observe(canvasWindow);
window.visualViewport?.addEventListener('resize',()=>{document.documentElement.style.setProperty('--visible-height',window.visualViewport.height+'px');if(focused)fitStage();});
function syncGameControls(){
  for(const n of [2,4,6])$('guests-'+n).setAttribute('aria-pressed',String(guestCount===n));
  for(const [category,choices] of Object.entries(TableAssets.collections)){
    for(const choice of choices)$(category+'-'+choice.id)?.setAttribute('aria-pressed',String(collections[category]===choice.id));
  }
}
function changeCollection(category,id){
  if(collections[category]===id)return;
  checkpoint();collections[category]=id;
  for(const item of items)if(TableAssets.categories[item.type]===category)item.collection=id;
  render();
  for(const button of $('products').children){const type=button.dataset.type;button.innerHTML=TableAssets.render(type,collections[TableAssets.categories[type]])+'<span>'+type[0].toUpperCase()+type.slice(1)+'</span>';}
  announce('Changed '+category+'. Your arrangement stays in place.');
}
for(const [category,choices] of Object.entries(TableAssets.collections)){
  for(const choice of choices){const button=document.createElement('button');button.id=category+'-'+choice.id;button.className='collection-choice';button.setAttribute('aria-label','Change '+category+' to '+choice.name);button.style.setProperty('--swatch',choice.color);button.innerHTML='<span class="swatch" aria-hidden="true"></span>'+choice.name;button.addEventListener('click',()=>changeCollection(category,choice.id));$('choices-'+category).append(button);}
}
function autoSet(count){
  if(guestCount===count&&items.length){announce('Already set for '+count+' guests. Your edits are preserved.');return;}
  checkpoint();items=[];groups=[];selected=null;guestCount=count;pointers.clear();gesture=null;
  for(const seat of TableGeometry.layout(count,planeRatio(),spacing)){
    const group={id:'g'+(++groupSerial),scale:seat.scale,rotation:seat.rotation,spacing:seat.spacing};groups.push(group);
    for(const piece of seat.items)items.push({...piece,id:++serial,groupId:group.id,collection:collections[TableAssets.categories[piece.type]]});
  }
  render();announce('Set for '+count+' guests. Tap a plate to move its whole place setting.');
}
for(const n of [2,4,6])$('guests-'+n).addEventListener('click',()=>autoSet(n));
for(const mode of ['compact','standard','formal'])$('spacing-'+mode).addEventListener('click',()=>{
  checkpoint();const selectedGroup=currentGroup(),targets=selectedGroup?[selectedGroup]:groups;
  for(const group of targets){const list=items.filter(i=>i.groupId===group.id),spread=TableGeometry.spread(list,planeRatio(),group.spacing,mode),map=new Map(spread.map(i=>[i.id,i]));items=items.map(i=>map.get(i.id)||i);group.spacing=mode;}
  spacing=mode;render();announce(mode[0].toUpperCase()+mode.slice(1)+' spacing applied '+(selectedGroup?'to this place setting.':'to all place settings.'));
});
$('reset').addEventListener('click',()=>{checkpoint();items=[];groups=[];selected=null;guestCount=null;render();announce('Table cleared. Photo kept. Undo restores the settings.');});
$('forward').addEventListener('click',()=>{if(!current())return;checkpoint();const list=members(),ids=new Set(list.map(i=>i.id));items=items.filter(i=>!ids.has(i.id)).concat(list);render();announce('Selection brought to front.');});
function applyScene(data){({items,groups,guestCount,collections,spacing,sceneRatio,calibration=null}=JSON.parse(JSON.stringify(data)));selected=null;serial=Math.max(serial,0,...items.map(i=>i.id));groupSerial=Math.max(groupSerial,0,...groups.map(g=>Number(g.id.slice(1))));pointers.clear();gesture=null;}
function validateScene(data){
  if(!data||![25,30].includes(data.version)||![null,2,4,6].includes(data.guestCount)||!Array.isArray(data.items)||data.items.length>500||!Array.isArray(data.groups)||data.groups.length>500||!Number.isFinite(data.sceneRatio)||data.sceneRatio<.05||data.sceneRatio>20||!Object.hasOwn(TableGeometry.spacingFactors,data.spacing))throw Error('Invalid scene');
  for(const [category,choices] of Object.entries(TableAssets.collections))if(!choices.some(c=>c.id===data.collections?.[category]))throw Error('Invalid collection');
  const groupIds=new Set();
  for(const g of data.groups){if(!/^g[1-9][0-9]{0,8}$/.test(g.id)||groupIds.has(g.id)||!Number.isFinite(g.scale)||g.scale<.01||g.scale>40||!Number.isFinite(g.rotation)||Math.abs(g.rotation)>180||!Object.hasOwn(TableGeometry.spacingFactors,g.spacing))throw Error('Invalid group');groupIds.add(g.id);}
  const ids=new Set();
  for(const i of data.items){if(!Number.isSafeInteger(i.id)||i.id<1||ids.has(i.id)||!Object.hasOwn(TableAssets.categories,i.type)||!TableAssets.collections[TableAssets.categories[i.type]].some(c=>c.id===i.collection)||!(i.groupId===null||groupIds.has(i.groupId)))throw Error('Invalid item');ids.add(i.id);
    for(const key of ['x','y','scale','rotation','tilt'])if(!Number.isFinite(i[key]))throw Error('Invalid geometry');
    if(Math.abs(i.x)>10||Math.abs(i.y)>10||i.scale<.079999||i.scale>3.000001||Math.abs(i.rotation)>180||i.tilt<.55||i.tilt>1)throw Error('Out of range');
  }
  if(data.version===30&&data.calibration!==null&&!TablePerspective.valid(data.calibration))throw Error('Invalid calibration');
  return {...JSON.parse(JSON.stringify(data)),version:30,calibration:data.version===25?null:data.calibration};
}
function storageMessage(text){$('storage-note').textContent=text;announce(text);}
function setBusy(value){busy=value;for(const id of ['save','restore','forget-save','edit-save'])$(id).disabled=value;}
async function saveScene(){
  if(busy)return;setBusy(true);
  try{const payload=validateScene(scene()),photo=photoBlob,atRevision=revision;await TableStorage.write({scene:payload,photo,hadPhoto:!!photo});
    storageMessage((photo?'Photo + arrangement saved locally.':'Arrangement saved locally (no photo selected).')+(atRevision!==revision?' Newer edits are not saved.':' Safari may clear site data; this is not a backup.'));
  }catch{storageMessage('NOT SAVED: local storage is unavailable or full. Keep this page open; your current table is unchanged.');}finally{setBusy(false);}
}
async function restoreScene(automatic=false){
  if(busy)return;setBusy(true);const atRevision=revision;
  try{const record=await TableStorage.read();
    if(!record){let legacy=false;try{legacy=!!localStorage.getItem(SAVE_KEY);}catch{}storageMessage(legacy?'An older POC 0.2 save has no photo. Choose a photo and create a new save.':automatic?'Save stores your photo and arrangement on this browser only.':'No saved photo and arrangement in this browser.');return;}
    const data=validateScene(record.scene);
    if(typeof record.hadPhoto!=='boolean'||(record.hadPhoto&&!(record.photo instanceof Blob))||(!record.hadPhoto&&record.photo!==null))throw Error('Missing saved photo');
    if(record.photo){const ratio=await decodePhoto(record.photo);if(Math.abs(ratio-data.sceneRatio)>.001)throw Error('Photo ratio mismatch');}
    if(revision!==atRevision){storageMessage('Restore cancelled because you edited the table. Tap Restore to try again.');return;}
    if(!automatic)checkpoint();applyScene(data);setPhoto(record.photo,data.sceneRatio);render();storageMessage(record.photo?'Saved photo + arrangement restored locally.':'Saved arrangement restored. This save did not contain a photo.');
  }catch{storageMessage('COULD NOT RESTORE the photo and arrangement. Safari storage may be unavailable or the save damaged. Your table is unchanged.');}
  finally{setBusy(false);}
}
$('save').addEventListener('click',saveScene);$('edit-save').addEventListener('click',saveScene);$('restore').addEventListener('click',()=>restoreScene(false));
$('forget-save').addEventListener('click',async()=>{if(busy)return;setBusy(true);try{await TableStorage.clear();try{localStorage.removeItem(SAVE_KEY);}catch{}storageMessage('Saved photo and arrangement deleted from this browser. Current table kept.');}catch{storageMessage('Could not delete the local save.');}finally{setBusy(false);}});

function setCalibration(next){
 const oldRatio=planeRatio();calibration=next;const newRatio=planeRatio();
 // Keep existing guest-relative geometry when switching image/plane metrics.
 if(oldRatio!==newRatio)for(const group of groups){const list=items.filter(i=>i.groupId===group.id),p=TableGeometry.pivot(list);for(const i of list)i.y=p.y+(i.y-p.y)*newRatio/oldRatio;}
}
function updatePlane(){
 const q=activeCalibration(),layer=$('items');
 layer.style.height=q?stage.clientWidth/TablePerspective.ratio+'px':'100%';
 layer.style.transform=q?TablePerspective.css(TablePerspective.matrix(q),stage.clientWidth,stage.clientHeight):'none';
 $('calibrate').textContent=calibration?'Adjust table':'Calibrate table';
 if(calibrating){
  $('calibration-outline').setAttribute('points',calibrationDraft.map(p=>`${p.x*1000},${p.y*1000}`).join(' '));
  document.querySelectorAll('.corner').forEach((el,i)=>{el.style.left=calibrationDraft[i].x*100+'%';el.style.top=calibrationDraft[i].y*100+'%';});
  const valid=TablePerspective.valid(calibrationDraft);$('calibration-done').disabled=!valid;
  $('calibration-help').textContent=valid?'Drag corners onto the tabletop. 1–2 near you; 3–4 far away.':'Corners must form a wide, uncrossed table. Adjust them to continue.';
 }
}
function startCalibration(){
 if(!photoBlob)return;enterFocus();calibrating=true;selected=null;pointers.clear();gesture=null;pan=null;
 calibrationDraft=calibration?structuredClone(calibration):[{x:.08,y:.88},{x:.92,y:.88},{x:.75,y:.22},{x:.25,y:.22}];
 document.body.classList.add('calibrating');$('calibration-overlay').hidden=false;$('calibration-tools').hidden=false;
 viewZoom=.86;$('zoom').disabled=true;render();requestAnimationFrame(()=>{fitStage();canvasWindow.scrollLeft=0;canvasWindow.scrollTop=0;});paint();
}
function cancelCalibration(){calibrating=false;cornerDrag=null;document.body.classList.remove('calibrating');$('calibration-overlay').hidden=true;$('calibration-tools').hidden=true;$('zoom').disabled=false;viewZoom=1;$('zoom').textContent='Zoom 1×';fitStage();render();}
$('calibrate').addEventListener('click',startCalibration);
$('calibration-done').addEventListener('click',()=>{if(!TablePerspective.valid(calibrationDraft))return;checkpoint();setCalibration(structuredClone(calibrationDraft));cancelCalibration();render();announce('Table calibrated. Settings follow this surface. Save to keep your calibration.');});
$('calibration-reset').addEventListener('click',()=>{checkpoint();setCalibration(null);cancelCalibration();render();announce('Calibration removed. Flat editing restored. Undo brings it back.');});
$('calibration-cancel').addEventListener('click',cancelCalibration);
for(const el of document.querySelectorAll('.corner')){
 el.addEventListener('pointerdown',e=>{if(cornerDrag)return;e.preventDefault();e.stopPropagation();cornerDrag={id:e.pointerId,index:Number(el.dataset.corner)};el.setPointerCapture(e.pointerId);});
 el.addEventListener('pointermove',e=>{if(cornerDrag?.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();const r=stage.getBoundingClientRect();calibrationDraft[cornerDrag.index]={x:clamp((e.clientX-r.left)/r.width,.015,.985),y:clamp((e.clientY-r.top)/r.height,.015,.985)};paint();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,e=>{if(cornerDrag?.id===e.pointerId)cornerDrag=null;});
 el.addEventListener('keydown',e=>{const delta={ArrowLeft:[-.005,0],ArrowRight:[.005,0],ArrowUp:[0,-.005],ArrowDown:[0,.005]}[e.key];if(!delta)return;e.preventDefault();e.stopPropagation();const p=calibrationDraft[Number(el.dataset.corner)];p.x=clamp(p.x+delta[0],.015,.985);p.y=clamp(p.y+delta[1],.015,.985);paint();});
}
render();
document.querySelector('main').inert=true;
window.TableStudioReady=restoreScene(true).finally(()=>{document.querySelector('main').inert=false;});
