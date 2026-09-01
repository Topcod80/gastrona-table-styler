'use strict';
const $ = id => document.getElementById(id);
const dimensions = {plate:[.28,1],glass:[.15,120/70],fork:[.09,140/32],knife:[.09,140/32]};
let items = [], selected = null, serial = 0, history = [], photoURL = null, photoRequest = 0;
let guestCount = null;
let collections = {plates:'classic',cutlery:'classic',glassware:'classic'};
const SAVE_KEY = 'table-studio.arrangement.v2';
let pointers = new Map(), gesture = null;
const stage = $('stage');
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const angle = v => ((v+180)%360+360)%360-180;
const current = () => items.find(i=>i.id===selected);
function checkpoint(){history.push(JSON.stringify({items,selected,guestCount,collections}));if(history.length>40)history.shift();$('undo').disabled=false;}
function announce(message){$('status').textContent=message;}
function controls(){const item=current();$('selection-label').textContent=item ? `${item.type[0].toUpperCase()+item.type.slice(1)} selected` : 'Select a piece to adjust';$('count').textContent=`${items.length} ${items.length===1?'piece':'pieces'}`;for(const id of ['size','rotation','duplicate','delete','forward'])$(id).disabled=!item;$('size').value=item?.scale??1;$('rotation').value=item?.rotation??0;$('size-value').value=`${Math.round((item?.scale??1)*100)}%`;$('rotation-value').value=`${Math.round(item?.rotation??0)}°`;$('undo').disabled=!history.length;syncGameControls();}
function position(el,item){const [width,ratio]=dimensions[item.type];el.style.width=`${width*100}%`;el.style.height=`${stage.clientWidth*width*ratio}px`;el.style.left=`${item.x*100}%`;el.style.top=`${item.y*100}%`;el.style.transform=`translate(-50%,-50%) rotate(${item.rotation}deg) scale(${item.scale})`;el.classList.toggle('selected',item.id===selected);el.setAttribute('aria-pressed',String(item.id===selected));}
function render(){const layer=$('items');layer.replaceChildren();for(const item of items){const el=document.createElement('button');el.className='piece';el.dataset.id=item.id;el.setAttribute('aria-label',`${item.type} ${item.id}`);el.innerHTML=TableAssets.render(item.type,item.collection || collections[TableAssets.categories[item.type]]);position(el,item);layer.append(el);} $('empty').hidden=!!photoURL||items.length>0;for(const button of $('products').children){const type=button.dataset.type;button.innerHTML=TableAssets.render(type,collections[TableAssets.categories[type]])+'<span>'+type[0].toUpperCase()+type.slice(1)+'</span>'; }controls();}
function paint(){for(const item of items){const el=$('items').querySelector(`[data-id="${item.id}"]`);if(el)position(el,item);}controls();}
for(const type of Object.keys(TableAssets.categories)){const button=document.createElement('button');button.className='product';button.dataset.type=type;button.setAttribute('aria-label',`Add ${type}`);button.innerHTML=`${TableAssets.render(type,collections[TableAssets.categories[type]])}<span>${type[0].toUpperCase()+type.slice(1)}</span>`;button.addEventListener('click',()=>{checkpoint();selected=++serial;items.push({id:selected,type,collection:collections[TableAssets.categories[type]],x:.5+(items.length%3-1)*.06,y:.5,scale:1,rotation:0});render();announce(`${type} added.`);});$('products').append(button);}
function point(e){const rect=stage.getBoundingClientRect();return {x:e.clientX-rect.left,y:e.clientY-rect.top};}
function baseline(){const item=current();if(!item||!pointers.size){gesture=null;return;}const p=[...pointers.values()];gesture={item:{...item},points:p.map(v=>({...v})),width:stage.clientWidth,height:stage.clientHeight};}
stage.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;const target=e.target.closest('.piece');if(!pointers.size){selected=target?Number(target.dataset.id):null;paint();if(!current())return;checkpoint();}if(pointers.size>=2)return;e.preventDefault();stage.focus({preventScroll:true});stage.setPointerCapture(e.pointerId);pointers.set(e.pointerId,point(e));baseline();});
stage.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!gesture)return;e.preventDefault();pointers.set(e.pointerId,point(e));const item=current();if(!item)return;const p=[...pointers.values()], b=gesture.points, original=gesture.item;let dx=p[0].x-b[0].x,dy=p[0].y-b[0].y;if(p.length===2&&b.length===2){const mid=a=>({x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2});const a=mid(b),c=mid(p);const distance=a=>Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y);const direction=a=>Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x);const factor=distance(p)/Math.max(1,distance(b));item.scale=clamp(original.scale*factor,.1,3);const delta=direction(p)-direction(b);item.rotation=angle(original.rotation+delta*180/Math.PI);const effective=item.scale/original.scale;const ox=original.x*gesture.width-a.x,oy=original.y*gesture.height-a.y;dx=c.x+effective*(ox*Math.cos(delta)-oy*Math.sin(delta))-original.x*gesture.width;dy=c.y+effective*(ox*Math.sin(delta)+oy*Math.cos(delta))-original.y*gesture.height;}item.x=clamp(original.x+dx/gesture.width,.03,.97);item.y=clamp(original.y+dy/gesture.height,.03,.97);paint();});
function endPointer(e){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);baseline();}
for(const event of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(event,endPointer);
// Keyboard activation also selects pieces, independently of touch pointer events.
$('items').addEventListener('click',e=>{const el=e.target.closest('.piece');if(el){selected=Number(el.dataset.id);paint();}});
for(const id of ['size','rotation']){let started=false;const input=$(id);input.addEventListener('input',()=>{const item=current();if(!item)return;if(!started){checkpoint();started=true;}item[id==='size'?'scale':'rotation']=Number(input.value);paint();});input.addEventListener('change',()=>{started=false;});input.addEventListener('blur',()=>{started=false;});}
$('duplicate').addEventListener('click',()=>{const item=current();if(!item)return;checkpoint();const copy={...item,id:++serial,x:clamp(item.x+.05,.03,.97),y:clamp(item.y+.05,.03,.97)};items.push(copy);selected=copy.id;render();announce('Piece duplicated.');});
function remove(){if(!current())return;checkpoint();items=items.filter(i=>i.id!==selected);selected=null;render();announce('Piece deleted.');}
$('delete').addEventListener('click',remove);
$('undo').addEventListener('click',()=>{if(!history.length)return;({items,selected,guestCount,collections}=JSON.parse(history.pop()));render();announce('Last arrangement change undone.');});
stage.addEventListener('keydown',e=>{const item=current();if(!item)return;if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}const delta={ArrowLeft:[-.01,0],ArrowRight:[.01,0],ArrowUp:[0,-.01],ArrowDown:[0,.01]}[e.key];if(delta){e.preventDefault();checkpoint();item.x=clamp(item.x+delta[0],.03,.97);item.y=clamp(item.y+delta[1],.03,.97);paint();}});
$('choose').addEventListener('click',()=>$('photo-input').click());$('camera').addEventListener('click',()=>$('camera-input').click());
async function loadPhoto(file){if(!file)return;const request=++photoRequest;if(!file.type.startsWith('image/')&&!/\.(heic|heif|jpg|jpeg|png|webp|avif)$/i.test(file.name)){announce('Please choose an image file.');return;}if(file.size>40*1024*1024){announce('This photo is too large. Choose one under 40 MB.');return;}const url=URL.createObjectURL(file);const probe=new Image();try{await new Promise((resolve,reject)=>{probe.onload=resolve;probe.onerror=reject;probe.src=url;});if(request!==photoRequest){URL.revokeObjectURL(url);return;}if(photoURL)URL.revokeObjectURL(photoURL);photoURL=url;$('table-photo').src=url;$('table-photo').hidden=false;stage.style.aspectRatio=`${probe.naturalWidth} / ${probe.naturalHeight}`;$('scene-label').textContent='YOUR TABLE';$('clear-photo').disabled=false;render();announce('Photo ready. Tap a piece below to add it.');}catch{URL.revokeObjectURL(url);if(request===photoRequest)announce('This image could not be opened. Try a JPEG or PNG, or take a new photo.');}}
for(const id of ['photo-input','camera-input'])$(id).addEventListener('change',e=>{loadPhoto(e.target.files[0]);e.target.value='';});
$('clear-photo').addEventListener('click',()=>{++photoRequest;if(photoURL)URL.revokeObjectURL(photoURL);photoURL=null;$('table-photo').removeAttribute('src');$('table-photo').hidden=true;stage.style.aspectRatio='4 / 3';$('scene-label').textContent='YOUR CANVAS';$('clear-photo').disabled=true;render();announce('Photo removed.');});
new ResizeObserver(()=>{pointers.clear();gesture=null;paint();}).observe(stage);

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
  // Intentional user action only: never called on collection, resize, or photo changes.
  if(guestCount===count && items.length){announce('Already set for '+count+' guests. Your edits are preserved.');return;}
  checkpoint();items=[];selected=null;guestCount=count;pointers.clear();gesture=null;
  const columns=count/2, ratio=stage.clientHeight/stage.clientWidth;
  const scale=Math.max(.1,Math.min(.85,1.45/columns,.85*ratio));
  for(let row=0;row<2;row++)for(let col=0;col<columns;col++){
    const cx=(col+.5)/columns, cy=row===0?.25:.75, direction=row===0?-1:1;
    // Coordinates are relative to the seated guest: the opposite row faces inward.
    for(const [type,dx,dy] of [['plate',0,0],['fork',-.20,0],['knife',.20,0],['glass',.19,-.23]]){
      items.push({id:++serial,type,collection:collections[TableAssets.categories[type]],x:cx+dx*scale*direction,y:cy+dy*scale*direction/ratio,scale,rotation:row===0?180:0});
    }
  }
  render();announce('Table set for '+count+' guests. Pick collections, then fine-tune by touch. Undo restores your previous layout.');
}
for(const n of [2,4,6])$('guests-'+n).addEventListener('click',()=>autoSet(n));
$('reset').addEventListener('click',()=>{if(!items.length)return;checkpoint();items=[];selected=null;guestCount=null;render();announce('Table cleared. Photo and collections kept. Undo restores the pieces.');});
$('forward').addEventListener('click',()=>{const item=current();if(!item)return;if(items.at(-1)===item){announce('This piece is already in front.');return;}checkpoint();items=items.filter(i=>i.id!==item.id);items.push(item);render();announce('Piece brought to front.');});
function savedPayload(){return {version:2,guestCount,collections:{...collections},items:items.map(({id,type,collection,x,y,scale,rotation})=>({id,type,collection,x,y,scale,rotation})),canvasRatio:stage.clientWidth/stage.clientHeight};}
function validateSave(data){
  if(!data||data.version!==2||![null,2,4,6].includes(data.guestCount)||!Array.isArray(data.items)||data.items.length>500||!Number.isFinite(data.canvasRatio)||data.canvasRatio<.05||data.canvasRatio>20)throw Error('Invalid save');
  for(const [category,choices] of Object.entries(TableAssets.collections))if(!choices.some(c=>c.id===data.collections?.[category]))throw Error('Invalid collections');
  const ids=new Set();
  for(const item of data.items){
    const category=TableAssets.categories[item.type];
    if(!category||!TableAssets.collections[category].some(c=>c.id===item.collection)||!Number.isSafeInteger(item.id)||item.id<1||ids.has(item.id))throw Error('Invalid piece');
    ids.add(item.id);
    for(const key of ['x','y','scale','rotation'])if(!Number.isFinite(item[key]))throw Error('Invalid position');
    if(item.x<0||item.x>1||item.y<0||item.y>1||item.scale<.1||item.scale>3||item.rotation< -180||item.rotation>180)throw Error('Out of range');
  }
  return {guestCount:data.guestCount,collections:Object.fromEntries(Object.keys(TableAssets.collections).map(k=>[k,data.collections[k]])),items:data.items.map(({id,type,collection,x,y,scale,rotation})=>({id,type,collection,x,y,scale,rotation})),canvasRatio:data.canvasRatio};
}
$('save').addEventListener('click',()=>{
  try{const payload=savedPayload();validateSave(payload);localStorage.setItem(SAVE_KEY,JSON.stringify(payload));announce('Arrangement saved on this browser. Photo is not saved.');}
  catch{announce('Could not save. Browser storage may be full or unavailable. Your current table is unchanged.');}
});
$('restore').addEventListener('click',()=>{
  try{const raw=localStorage.getItem(SAVE_KEY);if(!raw){announce('No saved arrangement in this browser yet.');return;}if(raw.length>200000)throw Error('Save too large');const data=validateSave(JSON.parse(raw));checkpoint();items=data.items;guestCount=data.guestCount;collections=data.collections;selected=null;serial=Math.max(serial,...items.map(i=>i.id));pointers.clear();gesture=null;
    if(!photoURL)stage.style.aspectRatio=String(data.canvasRatio);
    render();announce(photoURL?'Saved arrangement restored over your current photo.':'Arrangement restored. Choose the same table photo to match it.');
  }catch{announce('Could not restore this save. Your current table is unchanged.');}
});
render();
