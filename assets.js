'use strict';
// Asset adapter: replace a collection's per-type SVG with an <img> using a
// relative, repository-hosted asset path. Keep the same viewbox/aspect envelope.
// Interaction geometry and saved state use only category/collection identifiers.
const baseArt = {
  plate: '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" fill="#eeeade" stroke="#c5bc9d" stroke-width="2"/><circle cx="60" cy="60" r="51" fill="#fffdf4" stroke="#b5a675"/><circle cx="60" cy="60" r="39" fill="#f0ede3" stroke="#d6ceba"/><circle cx="60" cy="60" r="35" fill="#faf8f0"/></svg>',
  glass: '<svg viewBox="0 0 70 120" aria-hidden="true"><ellipse cx="35" cy="108" rx="24" ry="7" fill="#dbe5dc" fill-opacity=".7" stroke="#85998f"/><path d="M35 64v42" stroke="#e9f1e7" stroke-width="6"/><path d="M35 64v42" stroke="#83958b" stroke-width="1"/><path d="M13 10h44l-3 37c-2 23-36 23-38 0Z" fill="#eaf3e8" fill-opacity=".5" stroke="#83958b" stroke-width="2"/><ellipse cx="35" cy="10" rx="22" ry="6" fill="#ffffff" fill-opacity=".35" stroke="#83958b"/><path d="M21 19l2 27q1 10 9 12" fill="none" stroke="#fff" stroke-width="3"/></svg>',
  fork: '<svg viewBox="0 0 32 140" aria-hidden="true"><path d="M5 4v29q0 13 8 14l-3 82q0 8 6 8t6-8l-3-82q8-1 8-14V4h-4v27h-3V4h-3v27h-3V4h-3v27H9V4Z" fill="#c7ceca" stroke="#808e88"/><path d="M15 53l-1 72" stroke="#fff" stroke-width="2"/></svg>',
  knife: '<svg viewBox="0 0 32 140" aria-hidden="true"><path d="M23 3Q6 14 6 60q0 8 11 8l-5 61q0 8 7 8t7-8L25 4Z" fill="#c7ceca" stroke="#808e88"/><path d="M21 74l-2 53M21 12v46" stroke="#fff" stroke-width="2"/></svg>'
};

const TableAssets = (() => {
  const categories = {plate:'plates', fork:'cutlery', knife:'cutlery', glass:'glassware'};
  const collections = {
    plates: [{id:'classic',name:'Ivory',color:'#e7dcc0'}, {id:'sage',name:'Sage',color:'#91a78b'}, {id:'blue',name:'Cobalt',color:'#315880'}],
    cutlery: [{id:'classic',name:'Silver',color:'#aebcb6'}, {id:'gold',name:'Brass',color:'#b49552'}, {id:'ink',name:'Ink',color:'#39433f'}],
    glassware: [{id:'classic',name:'Clear',color:'#dae8e2'}, {id:'amber',name:'Amber',color:'#c99148'}, {id:'rose',name:'Rose',color:'#bc8091'}]
  };
  const assets = {
    plates: {
      classic:{plate:baseArt.plate},
      sage:{plate:baseArt.plate.replaceAll('#fffdf4','#bdd0b7').replaceAll('#faf8f0','#dae5d4').replaceAll('#b5a675','#607953')},
      blue:{plate:baseArt.plate.replaceAll('#fffdf4','#2c537b').replaceAll('#faf8f0','#e3ecf3').replaceAll('#b5a675','#163f66')}
    },
    cutlery: Object.fromEntries([['classic','#c7ceca','#808e88'],['gold','#d2b879','#947638'],['ink','#46524d','#24352c']].map(([id,fill,stroke])=>[id,Object.fromEntries(['fork','knife'].map(type=>[type,baseArt[type].replaceAll('#c7ceca',fill).replaceAll('#808e88',stroke)]))])),
    glassware: Object.fromEntries([['classic','#eaf3e8','#83958b'],['amber','#dfa959','#987344'],['rose','#df9dae','#a97382']].map(([id,fill,stroke])=>[id,{glass:baseArt.glass.replaceAll('#eaf3e8',fill).replaceAll('#83958b',stroke)}]))
  };
  return {categories,collections,render(type,id){return assets[categories[type]][id]?.[type] || baseArt[type];}};
})();
