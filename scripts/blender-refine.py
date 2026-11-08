import bpy, math, os, json, numpy as np
from mathutils import Vector
out=r"D:\deepseek_file\ai_deskpet\public\assets\skins"
def mat(name,c,metal=0,rough=.6,emit=0,coat=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emit;p.inputs['Coat Weight'].default_value=coat
 return m
ivory=mat('Refined_Ceramic',(.61,.78,.83),.13,.21,0,1)
dark=mat('Refined_Obsidian',(.008,.024,.037),.45,.18,0,.9)
orange=mat('Refined_Amber',(.95,.28,.045),.35,.25,.25,.6)
gold=mat('Refined_Bronze',(.47,.29,.13),.8,.3)
stone=mat('Refined_Limestone',(.39,.47,.54),.06,.85)
rune=mat('Refined_Rune',(.12,.65,.8),.2,.32,1.4)
crystal=mat('Refined_Crystal',(.18,.58,.68),.05,.15,.16,.8)
def roundbox(name,loc,size,m,bevel=.05):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 mod=o.modifiers.new('Sculpted edge','BEVEL');mod.width=bevel;mod.segments=5;bpy.ops.object.modifier_apply(modifier=mod.name)
 for f in o.data.polygons:f.use_smooth=True
 mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def sphere(name,loc,scale,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=1,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return o
def cyl(name,loc,r,depth,m,vertices=48):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc)
 o=bpy.context.object;o.name=name;o.data.materials.append(m)
 bevel=o.modifiers.new('Worn edges','BEVEL');bevel.width=.018;bevel.segments=3;bpy.ops.object.modifier_apply(modifier=bevel.name)
 return o
def torus(name,loc,r,t,m,rot=(0,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=12,major_radius=r,minor_radius=t,location=loc,rotation=rot)
 o=bpy.context.object;o.name=name;o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 return o
def mesh(name,vs,fs,m):
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.scene.collection.objects.link(o);me.materials.append(m)
 uv=me.uv_layers.new()
 for p in me.polygons:
  n=p.normal
  for l in p.loop_indices:
   v=me.vertices[me.loops[l].vertex_index].co
   uv.data[l].uv=(v.x,v.z) if abs(n.y)>.5 else (v.x,v.y)
 return o
def line(name,points,m,r=.012):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=3
 p=cu.splines.new('POLY');p.points.add(len(points)-1)
 for q,v in zip(p.points,points):q.co=(*v,1)
 o=bpy.data.objects.new(name,cu);bpy.context.scene.collection.objects.link(o);cu.materials.append(m)
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
 return bpy.context.object
def export(name,objects):
 for o in bpy.context.view_layer.objects:o.select_set(False)
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=os.path.join(out,name+'.glb'),use_selection=True,export_format='GLB',export_apply=True)
 return {'file':name+'.glb','objects':len(objects)}
# Rounded blind-box robot, feet bottom -.661 (original standing capsule Y=.673).
pet=[roundbox('Refined_Torso',(0,0,-.11),(.44,.34,.47),ivory,.15),
 roundbox('Refined_Helmet',(0,0,.32),(.66,.46,.48),ivory,.17),
 roundbox('Refined_Visor',(0,-.235,.33),(.52,.045,.32),dark,.12),
 roundbox('Refined_Backpack',(0,.19,-.1),(.25,.12,.29),dark,.05)]
for side in [-1,1]:
 pet.append(sphere('Refined_Shoulder',(side*.28,0,-.07),(.095,.12,.13),orange))
 pet.append(roundbox('Refined_Mitten',(side*.3,-.02,-.23),(.15,.2,.2),ivory,.07))
 pet.append(roundbox('Refined_Boot',(side*.135,-.04,-.54),(.23,.34,.242),dark,.08))
 pet.append(cyl('Refined_Leg',(side*.135,0,-.38),.055,.14,gold))
 pet.append(roundbox('Refined_Toe',(side*.135,-.16,-.53),(.19,.06,.12),orange,.035))
 pet.append(roundbox('Refined_Eye',(side*.13,-.264,.35),(.07,.018,.085),rune,.032))
pet.append(line('Refined_Smile',[(-.06,-.265,.25),(0,-.272,.23),(.06,-.265,.25)],rune,.009))
pet.append(cyl('Refined_AntennaStem',(.16,.025,.64),.023,.2,gold))
pet.append(sphere('Refined_OrangeAntenna',(.16,.025,.76),(.073,.073,.075),orange))
pet.append(torus('Refined_PowerRing',(0,-.18,-.1),.058,.015,orange,(math.pi/2,0,0)))
for i in range(3):pet.append(roundbox('Refined_BackVent',(0,.258,-.04-i*.045),(.15,.018,.014),gold,.006))
report=[export('companion_refined',pet)]
# Monumental temple within existing central obstacle footprint, approached from Blender +Y.
temple=[]
for z,size in [(.12,(3.0,3.15,.24)),(.32,(2.8,2.95,.18))]:
 temple.append(roundbox('Temple_Foundation',(0,0,z),size,stone,.07))
temple.append(roundbox('Temple_Altar',(0,0,.8),(1.6,1.45,.85),stone,.06))
temple.append(roundbox('Temple_AltarTrim',(0,0,1.23),(1.72,1.57,.09),gold,.035))
for x,y in [(-1.12,1.15),(1.12,1.15),(-1.12,-1.15),(1.12,-1.15)]:
 h=2.15 if (x<0 and y<0) else 2.65
 temple.append(roundbox('Temple_Pl columnbase',(x,y,.5),(.56,.56,.22),stone,.035))
 # Fluting from alternating radii.
 vs=[];fs=[];n=48
 for zz in [.6,h]:
  for i in range(n):
   t=i/n*math.tau;r=.19 if i%2 else .23;vs.append((x+math.cos(t)*r,y+math.sin(t)*r,zz))
 for i in range(n):fs.append((i,(i+1)%n,(i+1)%n+n,i+n))
 fs.extend([tuple(range(n-1,-1,-1)),tuple(range(n,n*2))])
 temple.append(mesh('Temple_FlutedColumn',vs,fs,stone))
 for zz in [.64,h-.05]:
  temple.append(torus('Temple_LeafCapital',(x,y,zz),.25,.035,gold))
 temple.append(roundbox('Temple_CarvedCapital',(x,y,h+.09),(.61,.61,.18),stone,.035))
 # Spiralling carved filigree, individually modelled.
 for k in range(5):
  t=k*math.tau/5
  temple.append(line('Temple_ColumnInlay',[(x+math.cos(t)*.233,y+math.sin(t)*.233,.83),(x+math.cos(t+.2)*.233,y+math.sin(t+.2)*.233,1.05),(x+math.cos(t)*.233,y+math.sin(t)*.233,1.3)],gold,.009))
temple.append(roundbox('Temple_Entablature',(0,1.15,2.96),(2.95,.67,.32),stone,.055))
temple.append(roundbox('Temple_GoldCornice',(0,1.15,3.13),(3.1,.75,.09),gold,.025))
# Broken triangular pediment, stone volume rather than planks.
temple.append(mesh('Temple_BrokenPediment',[(-1.55,.82,3.18),(-.05,.82,4.12),(.28,.82,3.91),(.07,.82,3.56),(1.55,.82,3.18),
 (-1.55,1.52,3.18),(-.05,1.52,4.12),(.28,1.52,3.91),(.07,1.52,3.56),(1.55,1.52,3.18)],
 [(0,1,2,3,4),(9,8,7,6,5),(0,5,6,1),(1,6,7,2),(2,7,8,3),(3,8,9,4),(4,9,5,0)],stone))
temple.append(line('Temple_PedimentInlay',[(-1.4,1.535,3.24),(-.05,1.535,4.01),(.18,1.535,3.87)],gold,.02))
for i in range(11):
 x=-1.22+i*.244
 temple.append(line('Temple_CarvedFrieze',[(x-.06,1.5,2.94),(x,1.5,3.03),(x+.06,1.5,2.94),(x,1.5,2.87),(x-.06,1.5,2.94)],gold,.012))
temple.append(torus('Temple_SanctumRing',(0,.22,1.98),.46,.035,gold,(math.pi/2,0,0)))
temple.append(sphere('Temple_SoulCore',(0,.22,1.98),(.16,.16,.2),rune))
for i in range(7):
 x=-.66+i*.22
 temple.append(line('Temple_AltarRune',[(x-.04,.735,.74),(x+.05,.735,.93),(x-.02,.735,1.04),(x+.07,.735,1.12)],rune,.013))
# Broken stone debris constrained to pedestal.
for i in range(5):
 o=roundbox('Temple_FallenMasonry',(-.9+i*.41,-.9,.52),(.28,.33,.23),stone,.025);o.rotation_euler.z=i*.7;temple.append(o)
report.append(export('temple_refined',temple))
# True six-sided prismatic clusters with bevelled crown and angled siblings.
vs=[];fs=[]
for i,(x,y,h,r,tx,ty) in enumerate([(0,0,.88,.18,.02,.03),(.26,.04,.56,.14,.19,.03),(-.21,-.05,.45,.13,-.16,.04),(.04,.22,.37,.12,.03,.15),(-.04,-.2,.5,.13,-.02,-.14)]):
 start=len(vs)
 for z,rad,tilt in [(0,r*.82,0),(h*.73,r,1),(h*.9,r*.76,1.2)]:
  for j in range(6):
   t=j/6*math.tau;vs.append((x+math.cos(t)*rad+tx*tilt,y+math.sin(t)*rad+ty*tilt,z))
 tip=len(vs);vs.append((x+tx*1.4,y+ty*1.4,h))
 for k in range(2):
  for j in range(6):a=start+k*6+j;b=start+k*6+(j+1)%6;fs.append((a,b,b+6,a+6))
 for j in range(6):fs.append((start+12+j,start+12+(j+1)%6,tip))
 fs.append(tuple(start+j for j in range(5,-1,-1)))
report.append(export('crystal_refined',[mesh('Refined_PrismaticCluster',vs,fs,crystal)]))
# Fine seamless sand/granite micro-normal: original seeded periodic noise.
N=2048;rng=np.random.default_rng(9471);y,x=np.mgrid[0:N,0:N]/N;h=np.zeros((N,N))
for f,amp in [(48,1),(128,.42),(384,.16),(768,.065)]:
 g=rng.random((f,f));xx=x*f;yy=y*f;ix=xx.astype(int);iy=yy.astype(int);u=xx-ix;v=yy-iy;u=u*u*(3-2*u);v=v*v*(3-2*v)
 h+=amp*((g[iy%f,ix%f]*(1-u)+g[iy%f,(ix+1)%f]*u)*(1-v)+(g[(iy+1)%f,ix%f]*(1-u)+g[(iy+1)%f,(ix+1)%f]*u)*v)
gy,gx=np.gradient(h);normal=np.stack([-gx*3.5,-gy*3.5,np.ones_like(h)],-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
rgba=np.concatenate([normal*.5+.5,np.ones((N,N,1))],-1).astype(np.float32)
im=bpy.data.images.new('Refined_SandMicroNormal',width=N,height=N,alpha=True);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(rgba.ravel());im.filepath_raw=os.path.join(out,'sand_micro_normal.png');im.file_format='PNG';im.save()
with open(os.path.join(out,'refined-source.json'),'w') as f:json.dump({'generator':'Blender MCP execute_blender_code','blender':bpy.app.version_string,'assets':report,'microNormal':2048},f,indent=2)
print(json.dumps(report))
