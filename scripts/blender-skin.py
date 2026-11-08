import bpy,math,os,json,numpy as np
from mathutils import Vector
out=r"D:\deepseek_file\ai_deskpet\public\assets\skins"
os.makedirs(out,exist_ok=True)
rng=np.random.default_rng(2907)
def image(name,array,noncolor=False):
 a=np.asarray(array,dtype=np.float32)
 if a.ndim==2:a=np.stack([a,a,a],axis=-1)
 rgba=np.concatenate([a,np.ones((*a.shape[:2],1),dtype=np.float32)],axis=-1)
 im=bpy.data.images.new(name,width=a.shape[1],height=a.shape[0],alpha=True)
 if noncolor:im.colorspace_settings.name='Non-Color'
 im.pixels.foreach_set(rgba.ravel());im.filepath_raw=os.path.join(out,name+'.png');im.file_format='PNG';im.save()
 return im
N=1024
y,x=np.mgrid[0:N,0:N]/N
height=np.zeros((N,N))
# Smooth periodic value noise with independently seeded strata and fine mineral grain.
for i in range(2,10):
 f=2**i;grid=rng.random((f,f));xx=x*f;yy=y*f
 ix=xx.astype(int);iy=yy.astype(int);u=xx-ix;v=yy-iy
 u=u*u*(3-2*u);v=v*v*(3-2*v)
 field=(grid[iy%f,ix%f]*(1-u)+grid[iy%f,(ix+1)%f]*u)*(1-v)+(grid[(iy+1)%f,ix%f]*(1-u)+grid[(iy+1)%f,(ix+1)%f]*u)*v
 height+=field/(2**((i-2)*.72))
height=(height-height.min())/(height.max()-height.min())
veins=np.exp(-np.abs(height-.49)*180)+np.exp(-np.abs(height-.64)*240)*.5
albedo=np.stack([.16+.28*height+.09*veins,.22+.30*height+.09*veins,.27+.33*height+.08*veins],-1)
image('rock_albedo',np.clip(albedo,0,1))
gy,gx=np.gradient(height);norm=np.stack([-gx*24,-gy*24,np.ones_like(gx)],-1);norm/=np.linalg.norm(norm,axis=-1,keepdims=True)
image('rock_normal',norm*.5+.5,True);image('rock_roughness',np.clip(.55+height*.35,0,1),True)
brushed=.4+.1*np.sin(y*1800)+.06*rng.random((N,N));image('metal_albedo',np.stack([brushed*.72,brushed*.92,brushed],-1))
# Original emissive pixel face.
sy,sx=np.mgrid[0:256,0:512];face=np.zeros((256,512,3),np.float32)+[.008,.018,.03]
for eye in [155,357]:
 mask=((sx-eye)/37)**4+((sy-148)/31)**4<1;face[mask]=[.14,.85,1]
grid=((sx%32)<1)|((sy%32)<1);face[grid]+=.015
image('companion_screen',face)
def mat(name,c,metal=0,rough=.7,emit=0,coat=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*c,1);p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emit;p.inputs['Coat Weight'].default_value=coat
 return m
rock=mat('Skin_Rock_PBR',(.34,.48,.61));cliff=mat('Skin_Cliff_Toon',(.25,.38,.52));metal=mat('Skin_Metal_PBR',(.44,.65,.7),.85,.28)
white=mat('Skin_Ceramic',(.82,.91,.94),.08,.2,0,1);dark=mat('Skin_Face',(.008,.018,.03),.15,.24);glow=mat('Skin_Core',(.03,.65,.95),.15,.2,3)
def mesh(name,verts,faces,material):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 o=bpy.data.objects.new(name,me);bpy.context.scene.collection.objects.link(o);me.materials.append(material)
 uv=me.uv_layers.new()
 for p in me.polygons:
  for i in p.loop_indices:
   v=me.vertices[me.loops[i].vertex_index].co;uv.data[i].uv=(v.x/2+0.5,v.y/2+0.5)
 return o
def export(name,objects):
 for o in bpy.context.view_layer.objects:o.select_set(False)
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=os.path.join(out,name+'.glb'),use_selection=True,export_format='GLB',export_apply=True,export_yup=True)
 return {'file':name+'.glb','vertices':sum(len(o.data.vertices) for o in objects)}
segments=192;rings=20;verts=[];faces=[]
for j in range(rings+1):
 r=max(.002,j/rings*4.78)
 for i in range(segments):
  t=i/segments*math.tau;z=.008+math.sin(t*17+r*13)*.002
  verts.append((math.cos(t)*r,math.sin(t)*r,z))
for j in range(rings):
 for i in range(segments):
  a=j*segments+i;b=j*segments+(i+1)%segments;c=(j+1)*segments+(i+1)%segments;d=(j+1)*segments+i;faces.append((a,d,c,b))
top=mesh('Skin_TerrainTop',verts,faces,rock)
verts=[];faces=[]
for j in range(17):
 f=j/16
 for i in range(segments):
  t=i/segments*math.tau
  radius=(4.78*(1-f*.62)+math.sin(t*13+f*8)*.28*f+math.sin(t*31)*.16*f+math.sin(t*11)*.42*math.sin(f*math.pi))
  z=.004-f*3.6-(math.sin(t*7)+math.sin(t*19)*.5)*f*.38
  verts.append((math.cos(t)*radius,math.sin(t)*radius,z))
for j in range(16):
 for i in range(segments):
  a=j*segments+i;b=j*segments+(i+1)%segments;c=(j+1)*segments+(i+1)%segments;d=(j+1)*segments+i;faces.append((a,b,c,d))
walls=mesh('Skin_FracturedCliff',verts,faces,cliff)
bpy.ops.mesh.primitive_torus_add(major_segments=192,minor_segments=12,major_radius=4.58,minor_radius=.045,location=(0,0,.035))
rim=bpy.context.object;rim.name='Skin_MetalRim';rim.data.materials.append(metal)
report=[export('island_skin',[top,walls,rim])]
def rounded(name,loc,size,material,bevel=.08):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 mod=o.modifiers.new('Ceramic edge radius','BEVEL');mod.width=bevel;mod.segments=6;bpy.ops.object.modifier_apply(modifier=mod.name)
 for p in o.data.polygons:p.use_smooth=True
 mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
pet=[rounded('Skin_PetBody',(0,0,-.08),(.43,.33,.54),white,.09),rounded('Skin_PetHead',(0,0,.35),(.54,.39,.43),white,.09),
 rounded('Skin_PetScreen',(0,-.201,.36),(.44,.035,.29),dark,.045)]
for side in [-1,1]:
 pet.append(rounded('Skin_PetArm',(side*.31,0,-.03),(.13,.18,.32),white,.055))
 pet.append(rounded('Skin_PetBoot',(side*.13,-.035,-.53),(.20,.30,.24),metal,.05))
bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=.075,location=(0,-.183,-.08))
core=bpy.context.object;core.name='Skin_PetCore';core.scale.y=.28;core.data.materials.append(glow);pet.append(core)
# Rounded emissive eyes; browser also applies authored face texture.
for side in [-1,1]:pet.append(rounded('Skin_PetEye',(side*.12,-.228,.38),(.072,.018,.07),glow,.022))
report.append(export('companion_skin',pet))
with open(os.path.join(out,'skin-source.json'),'w')as f:json.dump({'generator':'Blender MCP / bpy','blender':bpy.app.version_string,'assets':report,'textureSize':1024,'walkPlane':.008},f,indent=2)
print(json.dumps(report))
