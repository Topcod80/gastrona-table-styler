// Exercise the original generated meshes, including physical profile and normals.
const assert=require('node:assert/strict'),{buildSync}=require('esbuild');
const built=buildSync({entryPoints:['src/models3d.js'],bundle:true,write:false,format:'cjs',platform:'node',external:['three']}),mod={exports:{}};
new Function('require','module','exports',built.outputFiles[0].text)(require,mod,mod.exports);
const geometries=mod.exports.makeGeometries(),materials=mod.exports.makeMaterials();
for(const [name,g]of Object.entries(geometries)){
 const p=g.attributes.position,n=g.attributes.normal,index=g.index;let volume=0;
 for(let i=0;i<p.count;i++){for(const attribute of [p,n])for(let j=0;j<3;j++)assert.ok(Number.isFinite(attribute.array[i*3+j]),name+' finite geometry');assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-6,name+' unit lighting normal');}
 for(let i=0;i<(index?.count||p.count);i+=3){const [a,b,c]=[0,1,2].map(k=>{const v=index?index.getX(i+k):i+k;return [p.getX(v),p.getY(v),p.getZ(v)]});volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;}
 assert.ok(volume>0,name+' outward overall winding');assert.ok(g.boundingBox.max.y-g.boundingBox.min.y>.003,name+' has thickness');assert.ok(g.boundingBox.min.y>=-.0004,name+' above shadow receiver');g.dispose();
}
assert.ok(geometries.glass.boundingBox.max.y>.18);assert.equal(materials.glassware.classic.transparent,true);assert.equal(materials.glassware.classic.depthWrite,false);assert.ok(materials.cutlery.classic.metalness>.9);for(const group of Object.values(materials))for(const m of Object.values(group))m.dispose();
console.log('PASS four 3D meshes: finite vertices/unit normals, outward volume, real thickness and glass height; transparent/metal materials');
