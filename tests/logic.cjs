const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Element {
 constructor(){this.style={};this.dataset={};this.children=[];this.events={};this.clientWidth=350;this.clientHeight=262.5;this.classList={toggle(){}};this.attributes={};}
 addEventListener(name,fn){(this.events[name]??=[]).push(fn)}
 emit(name,props={}){for(const fn of this.events[name]||[])fn({target:this,preventDefault(){},...props})}
 setAttribute(k,v){this.attributes[k]=v} removeAttribute(k){delete this.attributes[k]}
 append(el){this.children.push(el)} replaceChildren(){this.children=[]}
 querySelector(q){const id=q.match(/data-id="(\d+)"/);return this.children.find(e=>String(e.dataset.id)===id?.[1])}
 closest(){return this.className==='piece'?this:null}
 getBoundingClientRect(){return {left:0,top:0}} focus(){} setPointerCapture(){}
}
const elements={};const get=id=>elements[id]??=new Element();
const context=vm.createContext({document:{getElementById:get,createElement:()=>new Element()},ResizeObserver:class{observe(){}},URL,Image:class{},console});
vm.runInContext(fs.readFileSync('app.js','utf8'),context);
const run=s=>vm.runInContext(s,context);
for(const button of get('products').children)button.emit('click');
assert.equal(run('items.length'),4);
get('size').value='1.5';get('size').emit('input');get('size').emit('change');
get('rotation').value='45';get('rotation').emit('input');get('rotation').emit('change');
assert.equal(run('current().scale'),1.5);assert.equal(run('current().rotation'),45);
get('duplicate').emit('click');assert.equal(run('items.length'),5);
get('delete').emit('click');assert.equal(run('items.length'),4);
get('undo').emit('click');assert.equal(run('items.length'),5);
const stage=get('stage'),piece=get('items').children.at(-1),x=run('current().x');
const event=(pointerId,clientX,clientY,target=stage)=>({pointerId,clientX,clientY,target,pointerType:'touch'});
stage.emit('pointerdown',event(1,100,100,piece));stage.emit('pointermove',event(1,130,120));assert.ok(run('current().x')>x);
stage.emit('pointerdown',event(2,200,120));stage.emit('pointermove',event(2,220,160));assert.ok(run('current().scale')>1.5);assert.notEqual(run('current().rotation'),45);
stage.emit('pointercancel',event(2,220,160));stage.emit('pointerup',event(1,130,120));assert.equal(run('pointers.size'),0);
get('undo').emit('click');assert.equal(run('current().x'),x);
stage.emit('keydown',{key:'Delete'});assert.equal(run('items.length'),4);
assert.ok(fs.readFileSync('index.html','utf8').includes("connect-src 'none'"));assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|localStorage|indexedDB/.test(fs.readFileSync('app.js','utf8')));
console.log('PASS: app logic for add, resize, rotate, duplicate, delete, undo, drag, pinch, twist, pointer cancellation, keyboard delete; network/storage guards. DOM stub only; not browser rendering or real touch verification.');
