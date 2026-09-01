const assert=require('node:assert/strict'),fs=require('node:fs'),{webkit,devices}=require('playwright');
(async()=>{
 const base=(process.env.BASE_URL||'http://127.0.0.1:8010/').replace(/\/$/,'')+'/',browser=await webkit.launch(),checks=[],out='test-results/poc-1.0a';fs.mkdirSync(out,{recursive:true});
 const check=(name,value)=>{assert.ok(value,name);checks.push(name);console.log('PASS '+name)};
 const mobile={...devices['iPhone 13']},context=await browser.newContext(mobile);await context.addInitScript(()=>{window.auditStorageOpens=0;const open=indexedDB.open.bind(indexedDB);indexedDB.open=(...a)=>{window.auditStorageOpens++;return open(...a)}});const page=await context.newPage(),errors=[],warnings=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type())){warnings.push(m.text());console.log('BROWSER '+m.type()+': '+m.text())}});page.on('request',r=>requests.push({url:r.url(),method:r.method(),body:r.postDataBuffer()?.length||0}));
 try{
 await page.goto(base);await page.waitForFunction(()=>!document.getElementById('webxr-support').textContent.includes('Checking'));
 check('unsupported browser gets honest fallback',await page.locator('#unsupported').isVisible());
 check('no camera overlay or hidden capture',await page.locator('video').count()===0);
 check('3D preview is lazy',!requests.some(r=>r.url.includes('preview.js')));
 const asset=await context.request.get(base+'plate.usdz');check('USDZ MIME type',asset.headers()['content-type'].includes('model/vnd.usdz+zip'));check('USDZ asset delivered',asset.ok()&&(await asset.body()).length>50000);
 await page.getByRole('button',{name:'Load 3D preview'}).tap();await page.locator('#preview-controls').waitFor({state:'visible'});
 check('real WebGL preview initializes',await page.locator('#model').evaluate(c=>!!c.getContext('webgl2')));
 await page.locator('#rotation').press('End');check('preview rotation works',await page.locator('#model').getAttribute('data-rotation')==='180');await page.getByRole('button',{name:'Reset view'}).tap();check('preview reset works',await page.locator('#model').getAttribute('data-rotation')==='0');
 await page.locator('#preview-stage').screenshot({path:out+'/plate-preview.png'});
 for(const v of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(v);check('no horizontal overflow '+v.width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#preview-reset').scrollIntoViewIfNeeded();const r=await page.locator('#preview-reset').boundingBox();check('reachable 48px control '+v.width,r.height>=48&&r.y>=0&&r.y+r.height<=v.height+1)}
 check('no persistence added',await page.evaluate(()=>localStorage.length===0&&sessionStorage.length===0&&window.auditStorageOpens===0));
 check('normal console clean',errors.length===0&&warnings.length===0);
 // Actual GPU context loss should reveal the illustration and retry, without claiming AR.
 const lost=await page.locator('#model').evaluate(c=>{const e=c.getContext('webgl2').getExtension('WEBGL_lose_context');if(!e)return false;e.loseContext();return true});check('context loss extension present',lost);await page.locator('#preview-start').waitFor({state:'visible'});check('context loss fallback is explicit',/Graphics were interrupted/.test(await page.locator('#preview-status').textContent()));
 check('requests are local GET only',requests.every(r=>r.method==='GET'&&!r.body&&r.url.startsWith(base)));
 // Capability branch test only: no claim to emulate Apple's native AR viewer.
 const native=await browser.newContext(mobile);await native.addInitScript(()=>{const supports=DOMTokenList.prototype.supports;DOMTokenList.prototype.supports=function(t){return t==='ar'||supports.call(this,t)}});const np=await native.newPage();await np.goto(base);await np.locator('#quicklook').waitFor({state:'visible'});
 check('native handoff markup',await np.locator('#quicklook').evaluate(a=>a.rel==='ar'&&a.children.length===1&&a.firstElementChild.tagName==='IMG'&&a.href.endsWith('plate.usdz#allowsContentScaling=0')));
 check('native handoff is labelled honestly',(await np.locator('#native-note').textContent()).includes('native camera'));
 await np.locator('#quicklook').evaluate(a=>a.addEventListener('click',e=>e.preventDefault(),{once:true}));await np.locator('#quicklook').tap();check('handoff never claims tracking success',(await np.locator('#capability').textContent()).includes('cannot confirm tracking'));
 // Preventing default avoids opening an OS viewer on the runner; only page behavior is asserted.
 await np.locator('#quicklook').screenshot({path:out+'/native-launch-control.png'});await native.close();
 const broken=await browser.newContext(mobile);await broken.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type.includes('webgl'))return null;return get.call(this,type,...args)}});const bp=await broken.newPage();await bp.goto(base);await bp.locator('#preview-start').tap();await bp.waitForFunction(()=>document.getElementById('preview-status').textContent.includes('unavailable'));check('WebGL unavailable does not fake AR',await bp.locator('#poster').isVisible()&&await bp.locator('#preview-start').isEnabled());await broken.close();
 const failed=await browser.newContext(mobile);await failed.route('**/preview.js',r=>r.abort());const fp=await failed.newPage();await fp.goto(base);await fp.locator('#preview-start').tap();await fp.waitForFunction(()=>document.getElementById('preview-status').textContent.includes('unavailable'));check('bundle failure remains readable/retryable',await fp.locator('#preview-start').isEnabled());await failed.close();
 fs.writeFileSync(out+'/qa.json',JSON.stringify({base,commit:process.env.GITHUB_SHA,checks,errors,warnings,requests,physicalQuickLook:'NOT TESTED: requires an AR-capable physical iPhone',worldTracking:'Native Apple viewer only; no browser tracking implemented'},null,2));
 }finally{fs.writeFileSync(out+'/diagnostics.json',JSON.stringify({base,checks,errors,warnings,requests},null,2));await browser.close()}
 console.log('POC 1.0A PASS: '+checks.length+' checks. Native AR tracking requires physical iPhone validation.');
})().catch(e=>{console.error(e);process.exit(1)});
