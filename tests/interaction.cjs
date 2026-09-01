const assert = require('node:assert/strict');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright'); }
(async()=>{
  const browser = await playwright[process.env.BROWSER || 'webkit'].launch({headless:true});
  try {
    const context = await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    const page = await context.newPage(); const errors=[], outgoing=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',r=>{if(!r.url().startsWith(process.env.BASE_URL||'http://127.0.0.1:8000')&&!/^(blob:|data:)/.test(r.url()))outgoing.push(r.url());assert.equal(r.method(),'GET');});
    await page.goto(process.env.BASE_URL || 'http://127.0.0.1:8000');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    for(const type of ['plate','glass','fork','knife'])await page.getByRole('button',{name:`Add ${type}`,exact:true}).tap();
    assert.equal(await page.locator('.piece').count(),4);
    await page.locator('.piece').first().tap({position:{x:14,y:50}});
    await page.locator('#size').press('ArrowRight');
    await page.locator('#rotation').press('ArrowRight');
    assert.match(await page.locator('.selected').getAttribute('style'),/rotate\(1deg\) scale\(1.01\)/);
    await page.getByRole('button',{name:'Duplicate',exact:true}).tap();assert.equal(await page.locator('.piece').count(),5);
    await page.getByRole('button',{name:'Delete',exact:true}).tap();assert.equal(await page.locator('.piece').count(),4);
    await page.getByRole('button',{name:'Undo',exact:true}).tap();assert.equal(await page.locator('.piece').count(),5);
    // Synthetic touch pointer sequence exercises drag, pinch, twist and cancellation.
    const result = await page.evaluate(()=>{
      const stage=document.getElementById('stage'),el=document.querySelector('.selected');
      const rect=stage.getBoundingClientRect(); const initial=el.style.left;
      const realCapture=stage.setPointerCapture;stage.setPointerCapture=()=>{};
      function fire(target,type,id,x,y){target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',clientX:rect.left+x,clientY:rect.top+y}));}
      fire(el,'pointerdown',1,100,100);fire(stage,'pointermove',1,130,120);
      const dragged=el.style.left!==initial;
      fire(stage,'pointerdown',2,200,120);fire(stage,'pointermove',2,220,160);
      const transformed=el.style.transform;
      fire(stage,'pointercancel',2,220,160);fire(stage,'pointerup',1,130,120);
      stage.setPointerCapture=realCapture;
      return {dragged,transformed};
    });
    assert.equal(result.dragged,true);assert.ok(!result.transformed.includes('rotate(1deg)'));
    // Local synthetic PNG photo, repeated selection and invalid-format handling.
    const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=600;c.height=400;const x=c.getContext('2d');x.fillStyle='#bda98c';x.fillRect(0,0,600,400);return c.toDataURL().split(',')[1];});
    const file={name:'test-table.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')};
    await page.locator('#photo-input').setInputFiles(file);
    await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Photo ready'));
    assert.match(await page.locator('#table-photo').getAttribute('src'),/^blob:/);
    await page.locator('#photo-input').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('invalid')});
    await page.waitForFunction(()=>document.getElementById('status').textContent.includes('could not be opened'));
    assert.match(await page.locator('#table-photo').getAttribute('src'),/^blob:/);
    await page.locator('#photo-input').setInputFiles(file);
    await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Photo ready'));
    await page.setViewportSize({width:844,height:390});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:'test-results/mobile.png',fullPage:true});
    await page.getByRole('button',{name:'Remove photo'}).tap();assert.equal(await page.locator('#table-photo').getAttribute('src'),null);
    await page.reload();assert.equal(await page.locator('.piece').count(),0);assert.equal(await page.locator('#table-photo').getAttribute('src'),null);
    // POC 0.2 game flow: all layouts and independent collections.
    const snapshot=()=>page.locator('.piece').evaluateAll(nodes=>nodes.map(e=>({id:e.dataset.id,label:e.getAttribute('aria-label'),style:e.getAttribute('style'),art:e.innerHTML})));
    for(const guests of [2,4,6]){
      await page.locator('#guests-'+guests).tap();
      assert.equal(await page.locator('.piece').count(),guests*4);
      assert.equal(await page.locator('#guests-'+guests).getAttribute('aria-pressed'),'true');
    }
    // Positions are guest-relative; opposing row is rotated 180 degrees.
    const auto=await snapshot();
    const layout=await page.locator('.piece').evaluateAll(nodes=>nodes.slice(12,16).map(e=>({x:parseFloat(e.style.left),y:parseFloat(e.style.top)})));
    assert.ok(layout[1].x<layout[0].x && layout[2].x>layout[0].x && layout[3].x>layout[0].x && layout[3].y<layout[0].y);
    assert.match(auto[0].style,/rotate\(180deg\)/);
    for(const [category,names,types] of [['plates',['Sage','Cobalt','Ivory'],['plate']],['cutlery',['Brass','Ink','Silver'],['fork','knife']],['glassware',['Amber','Rose','Clear'],['glass']]]){
      for(const name of names){
        const before=await snapshot();
        await page.getByRole('button',{name:'Change '+category+' to '+name,exact:true}).tap();
        const after=await snapshot();
        assert.deepEqual(after.map(({art,...rest})=>rest),before.map(({art,...rest})=>rest));
        for(let i=0;i<after.length;i++){
          if(types.some(t=>after[i].label.startsWith(t+' ')))assert.notEqual(after[i].art,before[i].art);
          else assert.equal(after[i].art,before[i].art);
        }
      }
    }
    await page.getByRole('button',{name:'Change plates to Sage',exact:true}).tap();
    await page.locator('#undo').tap();assert.equal(await page.locator('#plates-classic').getAttribute('aria-pressed'),'true');
    // Select an exposed plate edge, edit it, then switch collections without re-layout.
    await page.locator('.piece').first().tap({position:{x:12,y:40}});
    await page.locator('#size').press('ArrowRight');await page.locator('#rotation').press('ArrowLeft');
    const edited=await snapshot();
    await page.locator('#guests-6').tap();assert.deepEqual(await snapshot(),edited);
    await page.getByRole('button',{name:'Change plates to Cobalt',exact:true}).tap();
    assert.deepEqual((await snapshot()).map(({art,...rest})=>rest),edited.map(({art,...rest})=>rest));
    const firstId=(await snapshot())[0].id;
    await page.locator('#forward').tap();assert.equal((await snapshot()).at(-1).id,firstId);
    await page.locator('#undo').tap();assert.equal((await snapshot())[0].id,firstId);
    await page.locator('#duplicate').tap();assert.equal(await page.locator('.piece').count(),25);
    await page.locator('#delete').tap();assert.equal(await page.locator('.piece').count(),24);
    await page.locator('#save').tap();
    const saved=await page.evaluate(()=>localStorage.getItem('table-studio.arrangement.v2'));
    assert.ok(saved);assert.ok(!/blob:|data:|photo/i.test(saved));assert.equal(JSON.parse(saved).items.length,24);
    await page.locator('#reset').tap();assert.equal(await page.locator('.piece').count(),0);
    await page.locator('#undo').tap();assert.equal(await page.locator('.piece').count(),24);
    await page.locator('#photo-input').setInputFiles(file);
    await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Photo ready'));
    await page.locator('#restore').tap();assert.match(await page.locator('#table-photo').getAttribute('src'),/^blob:/);
    await page.reload();assert.equal(await page.locator('.piece').count(),0);assert.equal(await page.locator('#table-photo').getAttribute('src'),null);
    await page.locator('#restore').tap();assert.equal(await page.locator('.piece').count(),24);
    await page.locator('#save').tap();
    assert.deepEqual(JSON.parse(await page.evaluate(()=>localStorage.getItem('table-studio.arrangement.v2'))).items,JSON.parse(saved).items);
    // Reset keeps the photo, and undo restores a replaced Auto Set in one step.
    const restored=await snapshot();
    await page.locator('#guests-2').tap();assert.equal(await page.locator('.piece').count(),8);
    await page.locator('#undo').tap();assert.deepEqual(await snapshot(),restored);
    await page.evaluate(()=>localStorage.setItem('table-studio.arrangement.v2','{broken'));
    await page.locator('#restore').tap();assert.deepEqual(await snapshot(),restored);
    assert.match(await page.locator('#status').textContent(),/Could not restore/);
    await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('Storage blocked')}});
    await page.locator('#save').tap();assert.match(await page.locator('#status').textContent(),/Could not save/);
    await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;localStorage.removeItem('table-studio.arrangement.v2')});
    await page.locator('#restore').tap();assert.match(await page.locator('#status').textContent(),/No saved arrangement/);
    for(const width of [320,390,844]){
      await page.setViewportSize({width,height:width===844?390:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:'test-results/mobile-v02.png',fullPage:true});
    console.log('PASS POC 0.2: all guest layouts, all nine collection choices, category isolation, transforms, same-count preservation, layers, reset/undo, save/restore/reload, no stored photos, corrupt and blocked storage, narrow/mobile/landscape layouts.');
    assert.deepEqual(errors,[]);assert.deepEqual(outgoing,[]);
    console.log('PASS: mobile layout, four items, size, rotation, duplicate, delete, undo, drag, pinch/twist, cancel, local photo, invalid photo recovery, replacement, orientation resize, removal, refresh, zero external requests.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
