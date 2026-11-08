import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, CatmullRomCurve3, Vector3 } from 'three';
const curve = new CatmullRomCurve3(
  [
    [0, 1.05, 11.3],
    [8, 1.48, 8],
    [11.3, 1.2, 0],
    [8, 1.55, -8],
    [0, 1.1, -11.3],
    [-8, 1.5, -8],
    [-11.3, 1.2, 0],
    [-8, 1.4, 8],
  ].map((p) => new Vector3(...p)),
  true,
  'catmullrom',
  0.35,
);
const vertex = `uniform float time; varying vec2 coord;
void main(){coord=uv;vec3 p=position;p.y+=.035*sin(time*.85+uv.x*28.);
gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const fragment = `uniform float time;varying vec2 coord;
void main(){float pulse=.75+.25*sin(time*1.1+coord.x*19.);
float flow=pow(.5+.5*sin(coord.x*82.-time*3.8),14.);
gl_FragColor=vec4(mix(vec3(.12,.6,.9),vec3(.45,1.3,1.8),flow),(.21+flow*.3)*pulse);}`;
const particleVertex = `uniform float time; attribute float seed; varying float alpha;
void main(){float t=fract(seed+time*.045);vec3 p=position;
float angle=t*6.2831853;
p.x=sin(angle)*11.35;p.z=cos(angle)*11.35;
p.y=1.27+.2*sin(angle*4.)+.06*sin(seed*117.+time*2.);
vec4 view=modelViewMatrix*vec4(p,1.);
gl_Position=projectionMatrix*view;
gl_PointSize=clamp(45./max(1.,-view.z),1.3,4.);
alpha=.4+.6*pow(.5+.5*sin(seed*91.+time*2.),3.);}`;
const rainVertex = `uniform float time;attribute float seed;varying float alpha;
void main(){float age=mod(time+seed*31.,8.);vec3 p=position;p.y-=age*1.8;
alpha=(1.-smoothstep(.25,.85,age))*smoothstep(0.,.12,age);
vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;gl_PointSize=clamp(140./max(1.,-view.z),2.,12.);}`;
const particleFragment = `varying float alpha;void main(){
float r=length(gl_PointCoord-.5)*2.;float a=exp(-r*r*5.)*(1.-smoothstep(.6,1.,r))*alpha;
gl_FragColor=vec4(.4,1.1,1.7,a);}`;
const rainFragment = `varying float alpha;void main(){vec2 p=gl_PointCoord-.5;
float a=exp(-p.x*p.x*150.-p.y*p.y*10.)*alpha;
gl_FragColor=vec4(.2,.8,1.4,a*.48);}`;
export default function FluidEnergyRail({ paused, reduced }) {
  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);
  const particles = useMemo(() => {
    const p = new Float32Array(420 * 3),
      s = new Float32Array(420);
    for (let i = 0; i < 420; i++) {
      s[i] = i / 420;
      curve.getPointAt(i / 420).toArray(p, i * 3);
    }
    return { p, s };
  }, []);
  const rain = useMemo(() => {
    const p = new Float32Array(96 * 3),
      s = new Float32Array(96);
    for (let i = 0; i < 96; i++) {
      s[i] = (i * 0.6180339) % 1;
      curve.getPointAt(s[i]).toArray(p, i * 3);
    }
    return { p, s };
  }, []);
  useFrame((_, dt) => {
    if (!paused && !reduced) uniforms.time.value += Math.min(dt, 0.05);
  });
  return (
    <group name="p9-fluid-energy-rail" userData={{ coreRadius: 0.012, additive: true }}>
      <mesh name="p9-thin-energy-filament">
        <tubeGeometry args={[curve, 384, 0.012, 8, true]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={vertex}
          fragmentShader={fragment}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <points name="p9-flow-particles" frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles.p, 3]} />
          <bufferAttribute attach="attributes-seed" args={[particles.s, 1]} />
        </bufferGeometry>
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={particleVertex}
          fragmentShader={particleFragment}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <points name="p9-energy-rain" frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[rain.p, 3]} />
          <bufferAttribute attach="attributes-seed" args={[rain.s, 1]} />
        </bufferGeometry>
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={rainVertex}
          fragmentShader={rainFragment}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
