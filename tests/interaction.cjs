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
    assert.deepEqual(errors,[]);assert.deepEqual(outgoing,[]);
    console.log('PASS: mobile layout, four items, size, rotation, duplicate, delete, undo, drag, pinch/twist, cancel, local photo, invalid photo recovery, replacement, orientation resize, removal, refresh, zero external requests.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
