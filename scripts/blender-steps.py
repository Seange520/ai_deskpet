import bpy,math,os,random,json
out=r'D:\deepseek_file\ai_deskpet\public\assets\skins'
random.seed(4107)
m=bpy.data.materials.new('Fractured_Step_Stone');m.use_nodes=True
p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.34,.42,.48,1);p.inputs['Roughness'].default_value=.87
objects=[]
for level in range(3):
 w=.98-level*.18;d=.84-level*.16;z=level*.13
 # Broken perimeter: clipped corners and individually chipped edge vertices.
 outline=[(-w/2+.045,-d/2),(.13,-d/2+.015),(.2,-d/2+.055),(w/2-.08,-d/2),(w/2,-d/2+.07),(w/2,d/2-.06),(w/2-.09,d/2),(-.18,d/2-.012),(-.25,d/2-.05),(-w/2+.05,d/2),(-w/2,d/2-.07),(-w/2,-d/2+.08)]
 vs=[(x,y,z+height) for height in [0,.125] for x,y in outline];n=len(outline)
 fs=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
 fs += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 me=bpy.data.meshes.new('Chipped stone step');me.from_pydata(vs,[],fs);me.update()
 o=bpy.data.objects.new('Broken_Step_'+str(level),me);bpy.context.scene.collection.objects.link(o);me.materials.append(m)
 uv=me.uv_layers.new()
 for f in me.polygons:
  for i in f.loop_indices:
   v=me.vertices[me.loops[i].vertex_index].co;uv.data[i].uv=(v.x*2,v.y*2 if abs(f.normal.z)>.5 else v.z*2)
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 b=o.modifiers.new('Eroded edge','BEVEL');b.width=.013;b.segments=3;bpy.ops.object.modifier_apply(modifier=b.name);o.select_set(False);objects.append(o)
# Small dislodged chips beside the stair.
for i in range(5):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.045,location=(.31-i*.15,-.43,.035))
 o=bpy.context.object;o.name='Dislodged_Stone_Chip';o.scale=(1,.8,.6);o.data.materials.append(m);objects.append(o)
for o in bpy.context.view_layer.objects:o.select_set(False)
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.export_scene.gltf(filepath=os.path.join(out,'broken_steps.glb'),export_format='GLB',use_selection=True,export_apply=True)
print(json.dumps({'asset':'broken_steps.glb','objects':len(objects),'generator':'Blender MCP'}))
