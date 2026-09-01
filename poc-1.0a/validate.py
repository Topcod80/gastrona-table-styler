"""Validate the actual USDZ package with OpenUSD; this is not an ARKit device test."""
from pathlib import Path
import hashlib,json,struct,zipfile,math
from pxr import Usd,UsdGeom,UsdShade,Gf
root=Path(__file__).parent/'dist';path=root/'plate.usdz';manifest=json.loads((root/'build.json').read_text())
assert hashlib.sha256(path.read_bytes()).hexdigest()==manifest['usdzSha256']
assert manifest['sourceSha256']==hashlib.sha256((root.parent.parent/'src/models3d.js').read_bytes()).hexdigest()
with zipfile.ZipFile(path) as archive:
    assert archive.namelist()[0]=='model.usda'
    assert len(archive.namelist())==2
    for item in archive.infolist():
        assert item.compress_type==0
        with path.open('rb') as handle:
            handle.seek(item.header_offset);header=handle.read(30)
            name,extra=struct.unpack_from('<HH',header,26)
        assert (item.header_offset+30+name+extra)%64==0
stage=Usd.Stage.Open(str(path));assert stage and stage.GetDefaultPrim()
assert UsdGeom.GetStageMetersPerUnit(stage)==1 and UsdGeom.GetStageUpAxis(stage)=='Y'
meshes=[UsdGeom.Mesh(p) for p in stage.Traverse() if p.IsA(UsdGeom.Mesh)]
assert len(meshes)==1
mesh=meshes[0];points=mesh.GetPointsAttr().Get();indices=mesh.GetFaceVertexIndicesAttr().Get();counts=mesh.GetFaceVertexCountsAttr().Get()
assert len(counts)==1152 and all(n==3 for n in counts) and len(indices)==3456
assert all(0<=i<len(points) for i in indices) and all(math.isfinite(v) for p in points for v in p)
box=UsdGeom.BBoxCache(Usd.TimeCode.Default(),['default']).ComputeWorldBound(mesh.GetPrim()).ComputeAlignedBox()
assert abs(box.GetSize()[0]-.26)<1e-6 and abs(box.GetMin()[1])<1e-6 and box.GetSize()[1]>.003
scene=stage.GetPrimAtPath('/Root/Scenes/Scene')
assert scene.GetAttribute('preliminary:anchoring:type').Get()=='plane'
assert scene.GetAttribute('preliminary:planeAnchoring:alignment').Get()=='horizontal'
material=UsdShade.MaterialBindingAPI(mesh.GetPrim()).ComputeBoundMaterial()[0]
assert material and material.ComputeSurfaceSource()[0]
print('PASS OpenUSD: one original plate, valid topology/material, 26 cm, grounded Y-up, horizontal anchoring, uncompressed aligned USDZ.')
