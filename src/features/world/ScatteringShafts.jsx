import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, AdditiveBlending, Matrix4, Vector3 } from 'three';
import { ANCHORS } from './poi';
const vertex = `varying vec3 pLocal;void main(){pLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment = `uniform vec3 eye;uniform float time;varying vec3 pLocal;
void main(){vec3 ray=normalize(pLocal-eye);vec3 inv=1./ray;
vec3 a=(-vec3(.5)-eye)*inv,b=(vec3(.5)-eye)*inv;vec3 lo=min(a,b),hi=max(a,b);
float start=max(0.,max(lo.x,max(lo.y,lo.z))),end=min(hi.x,min(hi.y,hi.z));if(end<=start)discard;
float sum=0.;float stepSize=(end-start)/16.;
for(int i=0;i<16;i++){vec3 p=eye+ray*(start+(float(i)+.5)*stepSize);
float width=.055+.10*(p.y+.5);float radial=exp(-dot(p.xz,p.xz)/(width*width));
float strata=.7+.3*sin(p.y*41.+time*.35);
sum+=radial*strata*stepSize*(1.-smoothstep(.27,.5,p.y));}
float phase=.65+.35*pow(abs(ray.y),3.);
gl_FragColor=vec4(.38,.68,1.05,(1.-exp(-sum*.24))*phase);}`;
function Shaft({ position, paused, reduced }) {
  const ref = useRef();
  const inverse = useMemo(() => new Matrix4(), []);
  const uniforms = useMemo(() => ({ eye: { value: new Vector3() }, time: { value: 0 } }), []);
  useFrame(({ camera }, dt) => {
    ref.current.updateWorldMatrix(true, false);
    inverse.copy(ref.current.matrixWorld).invert();
    uniforms.eye.value.copy(camera.position).applyMatrix4(inverse);
    if (!paused && !reduced) uniforms.time.value += Math.min(dt, 0.05);
  });
  return (
    <mesh ref={ref} position={position} scale={[2, 7, 2]} name="p9-volume-scattering-shaft">
      <boxGeometry />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        side={BackSide}
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
export default function ScatteringShafts(props) {
  return (
    <group name="p9-godrays">
      {ANCHORS.map((a) => (
        <Shaft key={a.id} position={[a.position[0], 4, a.position[2]]} {...props} />
      ))}
    </group>
  );
}
