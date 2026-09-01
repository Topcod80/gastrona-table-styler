const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Element {
 set id(value){this._id=value;elements[value]=this} get id(){return this._id}
 constructor(){this.style={setProperty(){}};this.dataset={};this.children=[];this.events={};this.clientWidth=350;this.clientHeight=262.5;this.classList={toggle(){}};this.attributes={};}
 addEventListener(name,fn){(this.events[name]??=[]).push(fn)}
 emit(name,props={}){for(const fn of this.events[name]||[])fn({target:this,preventDefault(){},...props})}
 setAttribute(k,v){this.attributes[k]=v} removeAttribute(k){delete this.attributes[k]}
 append(el){this.children.push(el)} replaceChildren(){this.children=[]}
 querySelector(q){const id=q.match(/data-id="(\d+)"/);return this.children.find(e=>String(e.dataset.id)===id?.[1])}
 closest(){return this.className==='piece'?this:null}
 getBoundingClientRect(){return {left:0,top:0}} focus(){} setPointerCapture(){}
}
const elements={};const get=id=>elements[id]??=new Element();
const saved=new Map();
const context=vm.createContext({localStorage:{setItem(k,v){saved.set(k,v)},getItem(k){return saved.get(k)??null}},document:{getElementById:get,createElement:()=>new Element()},ResizeObserver:class{observe(){}},URL,Image:class{},console});
vm.runInContext(fs.readFileSync('assets.js','utf8'),context);
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
assert.ok(fs.readFileSync('index.html','utf8').includes("connect-src 'none'"));assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|indexedDB/.test(fs.readFileSync('app.js','utf8')));
console.log('PASS: app logic for add, resize, rotate, duplicate, delete, undo, drag, pinch, twist, pointer cancellation, keyboard delete; network/storage guards. DOM stub only; not browser rendering or real touch verification.');

for(const n of [2,4,6]){get('guests-'+n).emit('click');assert.equal(run('items.length'),n*4);assert.equal(run('guestCount'),n);}
run('items[0].x=.31;items[0].rotation=22;items[0].scale=.8');
const geometry=run('JSON.stringify(items.map(({collection,...i})=>i))');
get('plates-sage').emit('click');get('cutlery-gold').emit('click');get('glassware-amber').emit('click');
assert.equal(run('JSON.stringify(items.map(({collection,...i})=>i))'),geometry);
get('guests-6').emit('click');assert.equal(run('JSON.stringify(items.map(({collection,...i})=>i))'),geometry);
get('save').emit('click');assert.equal(saved.size,1);const payload=[...saved.values()][0];assert.ok(!/blob:|data:|photo/i.test(payload));
get('reset').emit('click');assert.equal(run('items.length'),0);
get('undo').emit('click');assert.equal(run('items.length'),24);
get('reset').emit('click');get('restore').emit('click');assert.equal(run('items.length'),24);assert.equal(run('items[0].x'),.31);assert.equal(run('collections.plates'),'sage');
run('selected=items[0].id');const front=run('selected');get('forward').emit('click');assert.equal(run('items.at(-1).id'),front);get('undo').emit('click');assert.equal(run('items[0].id'),front);
const before=run('JSON.stringify(items)');saved.set('table-studio.arrangement.v2','{"version":2}');get('restore').emit('click');assert.equal(run('JSON.stringify(items)'),before);
assert.throws(()=>run('validateSave({version:1})'));
console.log('PASS: 2/4/6 Auto Set, category isolation and transform preservation, same-count preservation, reset/undo, metadata-only save/restore, layers/undo, invalid save rejection.');
