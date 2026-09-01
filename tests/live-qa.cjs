// User-path tests: native browser controls, DOM observations, no app-state writes.
const assert=require('node:assert/strict');
let pw;try{pw=require('playwright')}catch{pw=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright')}
(async()=>{
 const browser=await pw.webkit.launch({headless:true});
 try{
 const base=(process.env.BASE_URL||'http://127.0.0.1:8000/').replace(/\/$/,'')+'/';
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 const page=await context.newPage(),errors=[],unexpected=[];page.setDefaultTimeout(15000);
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()!=='GET'||!r.url().startsWith(base)&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))unexpected.push(r.url());});
 const tap=id=>page.locator('#'+id).tap();
 const visible=async id=>{const b=await page.locator('#'+id).boundingBox(),vp=page.viewportSize();assert.ok(b&&b.y>=-1&&b.x>=-1&&b.y+b.height<=vp.height+1&&b.x+b.width<=vp.width+1,id+' is in viewport');};
 const ready=()=>page.waitForFunction(()=>!document.querySelector('main').inert);
 const pieces=()=>page.locator('.piece').evaluateAll(els=>{const stage=document.getElementById('stage');return els.map(el=>{const m=new DOMMatrix(getComputedStyle(el).transform);return {id:el.dataset.id,type:el.getAttribute('aria-label').split(' ')[0],group:el.dataset.group,selected:el.getAttribute('aria-pressed')==='true',x:+(parseFloat(el.style.left)/stage.clientWidth).toFixed(6),y:+(parseFloat(el.style.top)/stage.clientHeight).toFixed(6),a:m.a,b:m.b,c:m.c,d:m.d,art:el.innerHTML};});});
 const coords=p=>p.map(({art,selected,...p})=>p);
 const shapes={narrow:[{x:.39,y:.95},{x:.64,y:.92},{x:.6,y:.1},{x:.44,y:.12}],wide:[{x:.03,y:.69},{x:.97,y:.69},{x:.9,y:.4},{x:.1,y:.4}],angled:[{x:.05,y:.93},{x:.96,y:.83},{x:.66,y:.16},{x:.4,y:.2}]};
 await page.goto(base);await ready();
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1200;c.height=800;const d=c.getContext('2d');d.fillStyle='#d3c7b4';d.fillRect(0,0,1200,800);d.fillStyle='#ad9371';d.beginPath();d.moveTo(60,744);d.lineTo(1152,664);d.lineTo(792,128);d.lineTo(480,160);d.closePath();d.fill();return c.toDataURL().split(',')[1]});
 await page.locator('#photo-input').setInputFiles({name:'qa-synthetic.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.locator('#table-photo').waitFor({state:'visible'});
 for(const [name,q] of Object.entries(shapes)){
  await tap('edit-calibrate');await page.locator('#calibration-overlay').waitFor({state:'visible'});
  for(let i=0;i<4;i++){const handle=page.locator('.corner').nth(i),p=await handle.boundingBox(),r=await page.locator('#stage').boundingBox();await page.mouse.move(p.x+p.width/2,p.y+p.height/2);await page.mouse.down();await page.mouse.move(r.x+q[i].x*r.width,r.y+q[i].y*r.height,{steps:8});await page.mouse.up();}
  assert.equal(await page.locator('#calibration-done').isEnabled(),true);await tap('calibration-done');assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('editing')),false);
  for(const count of [2,4,6]){await page.locator('#edit-guests').selectOption(String(count));assert.equal((await pieces()).length,count*4);}
  await page.locator('.piece[aria-label^="plate"]').nth(2).tap();assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('editing')),false);
  await tap('expand');await visible('tab-arrange');await visible('tab-collections');await visible('tab-save');await visible('edit-fit');
  assert.equal(await page.locator('#zoom').textContent(),'Zoom 1×');
  const view=await page.locator('#stage').boundingBox(),win=await page.locator('#canvas-window').boundingBox();assert.ok(view.width<=win.width+1&&view.height<=win.height+1,'Initial expansion shows entire table');
  await page.locator('#size').press('End');const enlarged=await pieces();await tap('edit-fit');const fitted=await pieces();assert.notDeepEqual(coords(enlarged),coords(fitted),'Fit changes enlarged setting');assert.match(await page.locator('#edit-status').textContent(),/Fitted/);
  await tap('edit-fit');assert.match(await page.locator('#edit-status').textContent(),/Already fits/);
  // Read actual rendered silhouettes, not internal fitting functions.
  const screen=await page.locator('.piece').evaluateAll(els=>{const stage=document.getElementById('stage'),r=stage.getBoundingClientRect();return {width:stage.clientWidth,height:stage.clientHeight,shapes:els.map(el=>{const m=new DOMMatrix(getComputedStyle(el).transform),v=new DOMMatrix(getComputedStyle(el.querySelector('.visual')).transform),w=parseFloat(el.style.width),h=parseFloat(el.style.height),cx=parseFloat(el.style.left),cy=parseFloat(el.style.top),round=/^(plate|glass)/.test(el.getAttribute('aria-label'));const pts=round?Array.from({length:32},(_,i)=>[Math.cos(i*Math.PI/16)*w/2,Math.sin(i*Math.PI/16)*h/2]):[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];return {group:el.dataset.group,points:pts.map(([x,y])=>({x:(cx+m.a*x+m.c*y*v.d)/stage.clientWidth,y:(cy+m.b*x+m.d*y*v.d)/stage.clientHeight}))};})};});
  for(const shape of screen.shapes)for(const p of shape.points)for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4];assert.ok((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x)<.004,'Visible artwork inside table '+name);}
  await tap('mode-item');await tap('pick-knife');let before=await pieces();await page.locator('#size').press('ArrowRight');let after=await pieces();assert.equal(after.filter((p,i)=>JSON.stringify(coords([p]))!==JSON.stringify(coords([before[i]]))).length,1,'Item changes exactly one piece');assert.equal(after.filter(p=>p.selected).length,1);
  await tap('mode-setting');before=await pieces();await page.locator('#size').press('ArrowRight');after=await pieces();assert.equal(after.filter(p=>p.selected).length,4);assert.equal(after.filter((p,i)=>JSON.stringify(coords([p]))!==JSON.stringify(coords([before[i]]))).length,4,'Group changes all four pieces');
  await tap('tab-collections');for(const [category,type,value] of [['plates','plate','sage'],['cutlery','fork','gold'],['glassware','glass','amber']]){
   await visible('edit-'+category);before=await pieces();await page.locator('#edit-'+category).selectOption(value);after=await pieces();assert.deepEqual(coords(after),coords(before));for(let i=0;i<before.length;i++){const applies=category==='cutlery'?['fork','knife'].includes(before[i].type):before[i].type===type;if(!applies)assert.equal(after[i].art,before[i].art);}
  }
  await tap('tab-save');await visible('edit-save');await visible('edit-restore');await tap('edit-save');await page.waitForFunction(()=>document.getElementById('save-indicator').dataset.state==='saved');const saved=coords(await pieces());
  await page.reload();await ready();assert.match(await page.locator('#table-photo').getAttribute('src'),/^blob:/);assert.deepEqual(coords(await pieces()),saved,'Arrangement restores exactly');assert.equal(await page.locator('#save-indicator').textContent(),'Saved on this device');
  await tap('edit-calibrate');const restored=await page.locator('.corner').evaluateAll(es=>es.map(e=>({x:parseFloat(e.style.left)/100,y:parseFloat(e.style.top)/100})));restored.forEach((p,i)=>{assert.ok(Math.abs(p.x-q[i].x)<.003);assert.ok(Math.abs(p.y-q[i].y)<.003)});await tap('calibration-cancel');
  await page.locator('#edit-guests').selectOption('2');assert.equal(await page.locator('#save-indicator').textContent(),'Unsaved changes');await tap('tab-save');await tap('edit-restore');await page.waitForFunction(()=>document.querySelectorAll('.piece').length===24);assert.deepEqual(coords(await pieces()),saved);await tap('tab-arrange');
  await page.screenshot({path:'test-results/live-qa-'+name+'.png',fullPage:true});
 }
 for(const vp of [{width:320,height:740},{width:390,height:664},{width:844,height:390}]){await page.setViewportSize(vp);await tap('expand');await visible('tab-collections');await tap('tab-collections');await visible('edit-plates');await visible('edit-glassware');await tap('tab-save');await visible('edit-save');await visible('edit-restore');await tap('done');await tap('tab-arrange');}
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
 console.log('PASS LIVE QA '+base+': native calibration, 2/4/6, enlarge/Fit, intentional single/group edits, all category switches, photo/calibration/arrangement reload, dirty/save/restore feedback, optional uncropped expansion, narrow/wide/angled containment, viewport controls, privacy.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
