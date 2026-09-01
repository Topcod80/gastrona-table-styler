const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{buildSync}=require('esbuild');
(async()=>{
 const root=__dirname,out=path.join(root,'dist');fs.mkdirSync(out,{recursive:true});
 const T=require('three'),source=path.resolve(root,'../src/models3d.js');
 const result=buildSync({entryPoints:[source],bundle:true,write:false,format:'cjs',platform:'node',external:['three']}),mod={exports:{}};
 new Function('require','module','exports',result.outputFiles[0].text)(require,mod,mod.exports);
 const geometries=mod.exports.makeGeometries(),materials=mod.exports.makeMaterials(),geometry=geometries.plate.clone();
 // Reuse every vertex of the stable POC asset. Set a 26 cm diameter and ground the foot.
 const originalMin=geometry.boundingBox.min.y,factor=.26/(geometry.boundingBox.max.x-geometry.boundingBox.min.x);
 geometry.translate(0,-originalMin,0);geometry.scale(factor,factor,factor);geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const material=new T.MeshStandardMaterial({color:materials.plates.classic.color.clone(),roughness:materials.plates.classic.roughness,metalness:0});
 const scene=new T.Scene(),plate=new T.Mesh(geometry,material);plate.name='DinnerPlate';scene.add(plate);scene.updateMatrixWorld(true);
 const {USDZExporter}=await import('three/addons/exporters/USDZExporter.js');
 const usdz=Buffer.from(await new USDZExporter().parseAsync(scene,{quickLookCompatible:true,includeAnchoringProperties:true,ar:{anchoring:{type:'plane'},planeAnchoring:{alignment:'horizontal'}}}));
 fs.writeFileSync(path.join(out,'plate.usdz'),usdz);
 const data={geometry:geometry.toJSON(),material:{color:'#'+material.color.getHexString(),roughness:material.roughness,metalness:0}};
 buildSync({entryPoints:[path.join(root,'preview.js')],bundle:true,outfile:path.join(out,'preview.js'),minify:true,format:'esm',target:['safari16'],define:{PLATE_DATA:JSON.stringify(data)},legalComments:'eof'});
 for(const file of ['index.html','style.css','app.js','launch.svg','poster.svg'])fs.copyFileSync(path.join(root,file),path.join(out,file));
 fs.copyFileSync(path.resolve(root,'../node_modules/three/LICENSE'),path.join(out,'THREE-LICENSE.txt'));
 const b=geometry.boundingBox,manifest={version:'POC 1.0A',source:'src/models3d.js at v0.4-stable',sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),objects:1,triangles:geometry.index.count/3,diameterMetres:b.max.x-b.min.x,heightMetres:b.max.y-b.min.y,minY:b.min.y,upAxis:'Y',metersPerUnit:1,anchoring:'horizontal plane',usdzBytes:usdz.length,usdzSha256:crypto.createHash('sha256').update(usdz).digest('hex'),commit:process.env.GITHUB_SHA||'local'};
 fs.writeFileSync(path.join(out,'build.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify(manifest));
 geometry.dispose();material.dispose();Object.values(geometries).forEach(g=>g.dispose());Object.values(materials).forEach(c=>Object.values(c).forEach(m=>m.dispose()));
})().catch(e=>{console.error(e);process.exit(1)});
