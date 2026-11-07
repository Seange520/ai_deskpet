import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, Matrix4, Vector3 } from 'three';
const vertex = `varying vec3 localPoint; void main(){ localPoint=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const fragment = `
uniform vec3 localCamera; uniform float time; varying vec3 localPoint;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){
  vec3 ray=normalize(localPoint-localCamera);
  vec3 inv=1.0/ray;
  vec3 a=(-vec3(0.5)-localCamera)*inv,b=(vec3(0.5)-localCamera)*inv;
  vec3 lo=min(a,b),hi=max(a,b);
  float start=max(0.0,max(lo.x,max(lo.y,lo.z))),end=min(hi.x,min(hi.y,hi.z));
  if(end<=start) discard;
  float stride=(end-start)/24.0; vec4 cloud=vec4(0.0);
  for(int i=0;i<24;i++){
    vec3 p=localCamera+ray*(start+(float(i)+0.5)*stride);
    float n=noise(p*vec3(12,3,8)+vec3(time*0.025,0,0));
    float shape=(1.0-smoothstep(0.15,0.5,abs(p.y)))*(1.0-smoothstep(0.30,0.5,abs(p.x)));
    float density=smoothstep(0.40,0.66,n)*shape;
    float alpha=1.0-exp(-density*stride*2.0);
    vec3 color=mix(vec3(0.37,0.51,0.78),vec3(1.0,0.88,0.70),step(0.1,p.y+n*0.22));
    cloud.rgb+=(1.0-cloud.a)*color*alpha; cloud.a+=(1.0-cloud.a)*alpha;
  }
  if(cloud.a<0.01) discard;
  gl_FragColor=vec4(cloud.rgb/max(cloud.a,0.001),cloud.a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export default function ToonClouds({ paused, reduced }) {
  const mesh = useRef();
  const inverse = useMemo(() => new Matrix4(), []);
  const uniforms = useMemo(
    () => ({ time: { value: 0 }, localCamera: { value: new Vector3() } }),
    [],
  );
  useFrame(({ camera }, delta) => {
    if (paused) return;
    mesh.current.updateWorldMatrix(true, false);
    inverse.copy(mesh.current.matrixWorld).invert();
    uniforms.localCamera.value.copy(camera.position).applyMatrix4(inverse);
    if (!reduced) uniforms.time.value += Math.min(delta, 0.05);
  });
  return (
    <mesh name="npr-tier3-volume-cloud" ref={mesh} position={[0, 5, -35]} scale={[70, 4, 14]}>
      <boxGeometry />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        side={BackSide}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
