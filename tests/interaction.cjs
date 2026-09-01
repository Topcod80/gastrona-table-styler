const assert=require('node:assert/strict');
let pw;try{pw=require('playwright')}catch{pw=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright')}
(async()=>{
 const browser=await pw[process.env.BROWSER||'webkit'].launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[],external=[];page.setDefaultTimeout(15000);
  const base=process.env.BASE_URL||'http://127.0.0.1:8000';
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))external.push(r.url());assert.equal(r.method(),'GET')});
  const ready=async()=>{await page.evaluate(()=>window.TableStudioReady)};
  const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(scene())));
  const tap=id=>page.locator('#'+id).tap();
  const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
  const distances=(list,ratio)=>list.slice(1).map(i=>Math.hypot(i.x-list[0].x,(i.y-list[0].y)/ratio));
  await page.goto(base);await ready();
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1200;c.height=800;const x=c.getContext('2d');x.fillStyle='#bba78a';x.fillRect(0,0,1200,800);x.fillStyle='#d6c4a8';x.fillRect(100,80,1000,640);return c.toDataURL().split(',')[1]});
  const file={name:'synthetic-table.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')};
  await page.locator('#photo-input').setInputFiles(file);await page.waitForFunction(()=>!!photoBlob);
  for(const n of [2,4,6]){await tap('guests-'+n);const s=await state();assert.equal(s.items.length,n*4);assert.equal(s.groups.length,n);}
  let s=await state();assert.ok(s.groups.some(g=>g.rotation===90));assert.ok(s.groups.some(g=>g.rotation===-90));
  for(const g of s.groups){const list=s.items.filter(i=>i.groupId===g.id),p=list.find(i=>i.type==='plate'),glass=list.find(i=>i.type==='glass');assert.ok(Math.hypot(glass.x-p.x,(glass.y-p.y)/s.sceneRatio)<p.scale*.24)}
  // Collection changes still preserve grouping and all geometry.
  for(const [category,names] of [['plates',['Sage','Cobalt','Ivory']],['cutlery',['Brass','Ink','Silver']],['glassware',['Amber','Rose','Clear']]])for(const name of names){const before=await state();await page.getByRole('button',{name:'Change '+category+' to '+name,exact:true}).tap();const after=await state();assert.deepEqual(after.items.map(({collection,...i})=>i),before.items.map(({collection,...i})=>i));assert.deepEqual(after.groups,before.groups);}
  // A plate tap opens the focus editor and selects its four related pieces.
  await page.locator('.piece[aria-label^="plate"]').first().tap();await page.waitForFunction(()=>focused&&stage.clientWidth>400);
  assert.equal(await page.locator('.piece.selected').count(),4);
  assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('editing')),true);
  const assertVisible=async()=>{const r=await page.locator('#inspector').boundingBox();assert.ok(r.y>=0&&r.y+r.height<=845);const b=await page.locator('#canvas-window').boundingBox();assert.ok(b.height>=200&&b.y+b.height<=r.y+1);};
  await assertVisible();
  let before=await state();const groupId=before.items[0].groupId,list=before.items.filter(i=>i.groupId===groupId),scale=before.groups.find(g=>g.id===groupId).scale;
  await page.locator('#size').press('ArrowRight');let after=await state();const grown=after.items.filter(i=>i.groupId===groupId),factor=after.groups.find(g=>g.id===groupId).scale/scale;
  distances(grown,after.sceneRatio).forEach((d,i)=>near(d,distances(list,before.sceneRatio)[i]*factor));
  assert.deepEqual(after.items.filter(i=>i.groupId!==groupId),before.items.filter(i=>i.groupId!==groupId));
  await tap('tool-rotation');before=await state();await page.locator('#rotation').press('ArrowLeft');after=await state();
  distances(after.items.filter(i=>i.groupId===groupId),after.sceneRatio).forEach((d,i)=>near(d,distances(before.items.filter(i=>i.groupId===groupId),before.sceneRatio)[i]));
  await tap('tool-spacing');before=await state();await tap('spacing-formal');after=await state();
  distances(after.items.filter(i=>i.groupId===groupId),after.sceneRatio).forEach((d,i)=>near(d,distances(before.items.filter(i=>i.groupId===groupId),before.sceneRatio)[i]*1.16));
  await tap('spacing-compact');await tap('spacing-standard');
  await tap('tool-tilt');await page.locator('#tilt').press('ArrowLeft');assert.equal((await state()).items.find(i=>i.groupId===groupId&&i.type==='plate').tilt,.99);
  await tap('duplicate');assert.equal((await state()).items.length,28);assert.equal((await state()).groups.length,7);assert.equal(await page.locator('.piece.selected').count(),4);
  await tap('delete');assert.equal((await state()).items.length,24);await tap('undo');assert.equal((await state()).items.length,28);await tap('undo');assert.equal((await state()).items.length,24);
  await tap('forward');assert.equal((await state()).items.at(-1).groupId,groupId);await tap('undo');
  // Real browser PointerEvents drive the unchanged drag/pinch/twist event path.
  const transform=await page.evaluate(()=>{
   const before=JSON.parse(JSON.stringify(members()));const r=stage.getBoundingClientRect(),target=document.querySelector('.piece.selected');
   const original=stage.setPointerCapture;stage.setPointerCapture=()=>{};
   const emit=(type,id,x,y,node=stage)=>node.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',clientX:r.left+x,clientY:r.top+y}));
   emit('pointerdown',1,180,120,target);emit('pointermove',1,195,135);emit('pointerdown',2,240,135);emit('pointermove',2,250,165);emit('pointercancel',2,250,165);emit('pointerup',1,195,135);stage.setPointerCapture=original;
   return {before,after:JSON.parse(JSON.stringify(members())),ratio:sceneRatio,pointers:pointers.size};
  });
  assert.equal(transform.after.length,4);assert.equal(transform.pointers,0);assert.notEqual(transform.before[0].x,transform.after[0].x);
  const gf=transform.after[0].scale/transform.before[0].scale;distances(transform.after,transform.ratio).forEach((d,i)=>near(d,distances(transform.before,transform.ratio)[i]*gf));
  // Item mode edits and deletes one piece, not its siblings.
  await tap('mode-item');assert.equal(await page.locator('.piece.selected').count(),1);await tap('tool-size');before=await state();await page.locator('#size').press('ArrowRight');after=await state();assert.equal(after.items.filter((i,n)=>JSON.stringify(i)!==JSON.stringify(before.items[n])).length,1);
  await tap('duplicate');assert.equal((await state()).items.length,25);assert.equal((await state()).groups.length,6);await tap('delete');assert.equal((await state()).items.length,24);await tap('undo');await tap('undo');
  // Back to a complete setting, ensure zoom and toolbar coexist on a narrow screen.
  await tap('mode-setting');await tap('zoom');await tap('zoom');await assertVisible();
  await page.screenshot({path:'test-results/focused-six-guests.png',fullPage:false});
  await tap('done');assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('editing')),false);
  // Save the photo and scene atomically, then auto-restore both on reload.
  const saved=await state();assert.equal(await page.evaluate(()=>{try{validateScene(scene());return 'valid'}catch(e){return e.message}}),'valid');await tap('save');await page.waitForFunction(()=>!busy);if(!(await page.locator('#storage-note').textContent()).startsWith('Photo +')){throw Error(await page.evaluate(async()=>{try{await TableStorage.write({scene:scene(),photo:photoBlob,hadPhoto:!!photoBlob});return 'Retry wrote; UI: '+document.getElementById('storage-note').textContent}catch(e){return e.name+': '+e.message}}));}
  const record=await page.evaluate(async()=>{const r=await TableStorage.read();return {bytes:r.photo.size,type:r.photo.type,hadPhoto:r.hadPhoto,version:r.scene.version}});
  assert.equal(record.bytes,file.buffer.length);assert.equal(record.hadPhoto,true);assert.equal(record.version,30);
  await page.reload();await ready();assert.deepEqual(await state(),saved);assert.match(await page.locator('#table-photo').getAttribute('src'),/^blob:/);assert.equal(await page.evaluate(()=>photoBlob.size),file.buffer.length);
  await tap('reset');assert.equal((await state()).items.length,0);assert.ok(await page.evaluate(()=>!!photoBlob));await tap('undo');assert.deepEqual(await state(),saved);
  await tap('guests-2');await tap('restore');await page.waitForFunction(()=>!busy&&items.length===24);assert.deepEqual(await state(),saved);await tap('undo');assert.equal((await state()).items.length,8);await tap('restore');await page.waitForFunction(()=>!busy&&items.length===24);
  // Browser-storage errors are explicit and cannot silently replace the scene.
  await page.evaluate(()=>{window.originalWrite=TableStorage.write;TableStorage.write=async()=>{throw Error('quota')}});await tap('save');await page.waitForFunction(()=>!busy);assert.match(await page.locator('#storage-note').textContent(),/NOT SAVED/);await page.evaluate(()=>{TableStorage.write=window.originalWrite});assert.deepEqual(await state(),saved);
  await page.evaluate(async()=>{window.goodRecord=await TableStorage.read();await TableStorage.write({...window.goodRecord,photo:null})});await tap('restore');await page.waitForFunction(()=>!busy);assert.match(await page.locator('#storage-note').textContent(),/COULD NOT RESTORE/);assert.deepEqual(await state(),saved);
  await page.evaluate(()=>TableStorage.write(window.goodRecord));
  // Photo replacement and undo do not corrupt the saved scene.
  await page.locator('#photo-input').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('invalid')});await page.waitForFunction(()=>document.getElementById('status').textContent.includes('could not be opened'));assert.ok(await page.evaluate(()=>!!photoBlob));
  for(const width of [320,390,844]){
   await page.setViewportSize({width,height:width===844?390:844});
   await page.locator('.piece[aria-label^="plate"]').first().tap();await page.waitForFunction(()=>focused);await page.waitForTimeout(100);
   const rect=await page.locator('#inspector').boundingBox();assert.ok(rect.y>=0&&rect.y+rect.height<=(width===844?391:845));
   const shape=await page.locator('#stage').evaluate(e=>e.clientWidth/e.clientHeight);assert.ok(Math.abs(shape-1.5)<.02);await tap('done');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  await page.setViewportSize({width:390,height:844});await tap('forget-save');await page.waitForFunction(()=>!busy);await page.reload();await ready();assert.equal((await state()).items.length,0);assert.equal(await page.evaluate(()=>photoBlob),null);
  // Explicitly saving without a photo also restores with an honest message.
  await tap('guests-2');await tap('save');await page.waitForFunction(()=>!busy);await page.reload();await ready();assert.equal((await state()).items.length,8);assert.match(await page.locator('#storage-note').textContent(),/did not contain a photo/);
  // POC 0.3 calibration using draggable corner events on a mobile viewport.
  await page.locator('#photo-input').setInputFiles(file);await page.waitForFunction(()=>!!photoBlob);
  await tap('calibrate');await page.waitForFunction(()=>calibrating);await page.waitForTimeout(100);
  const q=[{x:.05,y:.93},{x:.96,y:.83},{x:.66,y:.16},{x:.4,y:.2}];
  for(let i=0;i<4;i++){
   const handle=page.locator('.corner').nth(i),box=await handle.boundingBox();assert.ok(box.width>=44&&box.height>=44);assert.ok(box.x>=0&&box.x+box.width<=391);
   await handle.evaluate((el,{i,p})=>{const r=stage.getBoundingClientRect(),saved=el.setPointerCapture;el.setPointerCapture=()=>{};
    const emit=type=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:100+i,clientX:r.left+p.x*r.width,clientY:r.top+p.y*r.height}));
    emit('pointerdown');emit('pointermove');emit('pointerup');el.setPointerCapture=saved;
   },{i,p:q[i]});
  }
  await page.screenshot({path:'test-results/calibration-mobile.png'});
  await tap('calibration-done');assert.equal(await page.evaluate(()=>calibrating),false);
  (await state()).calibration.forEach((p,i)=>{near(p.x,q[i].x);near(p.y,q[i].y)});
  await tap('done');await tap('guests-6');assert.equal((await state()).items.length,24);
  // Browser-rendered plates shrink with depth, and the actual hit regions track them.
  const rects=await page.locator('.piece[aria-label^="plate"]').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height}}));
  assert.ok(rects[0].width<rects[2].width*.8);assert.ok(rects[0].height<rects[2].height*.8);
  await page.locator('.piece[aria-label^="plate"]').nth(2).tap();await page.waitForFunction(()=>focused);await page.waitForTimeout(100);
  assert.equal(await page.locator('.piece.selected').count(),4);
  const mappedGesture=await page.evaluate(()=>{
   const before=structuredClone(members()),r=stage.getBoundingClientRect(),target=document.querySelector('.piece.selected'),h=TablePerspective.matrix(calibration),old=stage.setPointerCapture;stage.setPointerCapture=()=>{};
   const emit=(type,id,p,node=stage)=>{const v=TablePerspective.project(h,p);node.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',clientX:r.left+v.x*r.width,clientY:r.top+v.y*r.height}));};
   const p=before[0];emit('pointerdown',1,p,target);emit('pointermove',1,{x:p.x+.03,y:p.y-.04});emit('pointerup',1,{x:p.x+.03,y:p.y-.04});
   const dragged=structuredClone(members());
   emit('pointerdown',2,{x:p.x,y:p.y},target);emit('pointerdown',3,{x:p.x+.08,y:p.y});emit('pointermove',3,{x:p.x+.09,y:p.y+.04});emit('pointerup',3,p);emit('pointerup',2,p);stage.setPointerCapture=old;
   return {before,dragged,after:structuredClone(members()),ratio:planeRatio()};
  });
  mappedGesture.dragged.forEach((p,i)=>{near(p.x,mappedGesture.before[i].x+.03);near(p.y,mappedGesture.before[i].y-.04)});
  const f=mappedGesture.after[0].scale/mappedGesture.dragged[0].scale;
  distances(mappedGesture.after,1.5).forEach((d,i)=>near(d,distances(mappedGesture.dragged,1.5)[i]*f));
  await tap('tool-size');before=await state();await page.locator('#size').press('ArrowRight');after=await state();assert.notDeepEqual(before.items,after.items);
  await tap('duplicate');assert.equal((await state()).items.length,28);await tap('delete');await tap('undo');await tap('undo');assert.equal((await state()).items.length,24);
  await tap('mode-item');before=await state();await page.locator('#size').press('ArrowRight');after=await state();assert.equal(after.items.filter((p,i)=>JSON.stringify(p)!==JSON.stringify(before.items[i])).length,1);await tap('mode-setting');
  await page.screenshot({path:'test-results/perspective-six-guests.png'});
  await tap('done');const calibrated=await state();await tap('save');await page.waitForFunction(()=>!busy);await page.reload();await ready();assert.deepEqual(await state(),calibrated);assert.equal(await page.evaluate(()=>photoBlob.size),file.buffer.length);
  // Invalid quadrilateral cannot be committed; Cancel retains the saved calibration.
  await tap('calibrate');await page.evaluate(()=>{calibrationDraft=[calibration[0],calibration[2],calibration[1],calibration[3]];paint()});assert.equal(await page.locator('#calibration-done').isDisabled(),true);await tap('calibration-cancel');assert.deepEqual(await state(),calibrated);await tap('done');
  await tap('calibrate');await tap('calibration-reset');assert.equal((await state()).calibration,null);await tap('undo');assert.deepEqual(await state(),calibrated);await tap('done');
  // Replacing a photo clears calibration; undo restores both the original photo and plane.
  await page.locator('#photo-input').setInputFiles(file);await page.waitForFunction(()=>calibration===null);await tap('undo');assert.deepEqual(await state(),calibrated);
  const legacy=await page.evaluate(()=>validateScene({...scene(),version:25,calibration:undefined}));assert.equal(legacy.calibration,null);assert.equal(legacy.version,30);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  console.log('PASS POC 0.3: calibration handles, strong perspective, projected hit testing, inverse group drag/pinch, depth scaling, calibration/photo persistence, flat fallback, legacy migration; POC 0.25: mobile focus/toolbar/zoom, 2/4/6 templates, attached glassware, collection isolation, group drag/scale/rotation/spacing/duplicate/delete/undo/layers, individual edits, plate compression, atomic IndexedDB photo save and automatic reload restoration, reset/restore undo, failed/missing-photo storage, no network uploads, portrait/landscape layout.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
