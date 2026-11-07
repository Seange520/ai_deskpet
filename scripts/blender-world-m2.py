import bpy, math, random, json, os
from mathutils import Vector
if not bpy.app.background:
 raise RuntimeError('Use isolated blender --background --factory-startup for final export; never clear an interactive user scene.')
rng=random.Random(9102)
original=bpy.context.window.scene
scene=bpy.context.scene
# This script runs only in a separate --background --factory-startup process.
for obj in list(scene.objects): bpy.data.objects.remove(obj,do_unlink=True)
out=r"D:\deepseek_file\ai_deskpet\public\assets\models"
os.makedirs(out,exist_ok=True)
def mat(name,c,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=.8
 p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emission
 return m
stone=mat("Basalt · cool blue",(.22,.34,.43)); trim=mat("Ancient jade",(.15,.85,.73),1.3)
crystal=mat("Lumen turquoise",(.12,.78,.76),1.4);rock=mat("Slate facets",(.28,.39,.51))
def link_obj(obj):
 for c in list(obj.users_collection): c.objects.unlink(obj)
 scene.collection.objects.link(obj)
 return obj
def cube(name,pos,scale,material):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=link_obj(bpy.context.object);o.name=name;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 return o
def export(name,objects):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=os.path.join(out,name+'.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True)
 return {'file':name+'.glb','objects':len(objects),'vertices':sum(len(o.data.vertices) for o in objects)}
try:
 # Broken polygon outline extruded along depth; upper corner is genuinely missing.
 outline=[(-.68,0),(.68,0),(.62,2.0),(.19,2.43),(-.18,2.18),(-.63,2.28)]
 verts=[(x,y,z) for y in [-.23,.23] for x,z in outline];n=len(outline)
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh=bpy.data.meshes.new('broken tablet carved topology');mesh.from_pydata(verts,[],faces);mesh.update()
 tablet=bpy.data.objects.new('Ancient fractured tablet',mesh);scene.collection.objects.link(tablet);tablet.data.materials.append(stone)
 bpy.context.view_layer.objects.active=tablet;tablet.select_set(True)
 bevel=tablet.modifiers.new('Chipped bevel','BEVEL');bevel.width=.055;bevel.segments=1
 bpy.ops.object.modifier_apply(modifier=bevel.name)
 for v in tablet.data.vertices:
  v.co.y+=rng.uniform(-.025,.025)
 tablet.data.update()
 objs=[tablet,cube('Sunken plinth',(0,0,.06),(1.65,.8,.12),stone)]
 for i in range(7):
  z=.45+i*.22;o=cube('Checksum groove '+str(i),(-.12+.12*math.sin(i),-.267,z),(.52 if i<6 else .25,.035,.038),trim);o.rotation_euler.y=(-.1 if i%2 else .08);objs.append(o)
 report=[export('stone_tablet',objs)]
 objs=[]
 for i,(x,y,h) in enumerate([(-.28,.12,.85),(.15,0,1.3),(.42,.22,.65),(-.08,-.3,.55)]):
  bpy.ops.mesh.primitive_cone_add(vertices=5,radius1=.16 if i else .2,radius2=0,depth=h,location=(x,y,h/2))
  o=link_obj(bpy.context.object);o.name='Lumen shard '+str(i);o.rotation_euler=(.06*i,-.1*i,i*.65);o.data.materials.append(crystal);objs.append(o)
 report.append(export('crystals',objs))
 objs=[]
 for i,(x,y,z,s) in enumerate([(-.28,0,.23,.48),(.3,.12,.18,.37),(0,-.24,.1,.25)]):
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=s,location=(x,y,z));o=link_obj(bpy.context.object);o.name='Weathered rock '+str(i)
  for v in o.data.vertices:v.co*=rng.uniform(.78,1.2)
  o.scale.z=.65;o.data.materials.append(rock);objs.append(o)
 report.append(export('rocks',objs))
 with open(os.path.join(out,'blender-source.json'),'w',encoding='utf8')as f:json.dump({'generator':'Original bpy script, first executed via MCP; final clean export via isolated Blender background','blender':bpy.app.version_string,'seed':9102,'units':'metres','assets':report},f,indent=2)
 print(json.dumps(report))
finally:
 bpy.context.window.scene=original
