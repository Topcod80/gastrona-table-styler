const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const {createFrameHealth}=await import('data:text/javascript,'+encodeURIComponent(fs.readFileSync('src/frame-health.js','utf8')));
 const fast=createFrameHealth();for(let i=0;i<300;i++)assert.equal(fast.sample(16.67),null);assert.equal(fast.stats().fps,60);assert.equal(fast.stats().measuredFrames,180);
 const slow=createFrameHealth();let actions=[];for(let i=0;i<20;i++)actions.push(slow.sample(300));assert.deepEqual(actions.filter(Boolean),['reduce','fallback']);assert.equal(slow.stats().fps,3.3);assert.equal(slow.stats().maxFrameMs,300);assert.equal(slow.stats().slowFrames,20);
 slow.reset();assert.equal(slow.stats().measuredFrames,0);assert.equal(slow.stats().quality,'reduced');
 const repeated=createFrameHealth();for(let i=0;i<9;i++)repeated.sample(320);repeated.reset();assert.equal(repeated.sample(320),'reduce');for(let i=0;i<9;i++)repeated.sample(320);repeated.reset();assert.equal(repeated.sample(320),'fallback');
 console.log('PASS active frame accounting: 300ms stalls retained; reduced quality then fallback; bounded samples; reset retains quality');
})().catch(e=>{console.error(e);process.exit(1)});
