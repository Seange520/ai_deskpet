import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, Color } from 'three';

const vertex = `varying vec3 direction;
void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const fragment = `
varying vec3 direction;
uniform float day; uniform float dusk; uniform float time;
uniform vec3 horizon; uniform vec3 zenith;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){
// Lower the artistic horizon for an elevated view of the floating street.
vec3 d=normalize(direction); float h=clamp(d.y+0.35,0.0,1.0);
vec3 color=mix(horizon,zenith,smoothstep(0.0,0.8,h));
vec2 uv=d.xz/(abs(d.y)+0.24)*1.7;
float n=noise(uv+vec2(time*0.012,0));n+=noise(uv*2.2)*0.35;
float cloud=smoothstep(0.68,0.93,n)*smoothstep(0.04,0.25,h);
color=mix(color,mix(vec3(0.25,0.34,0.58),vec3(1.0,0.97,0.88),day),cloud*0.8);
float ribbon=exp(-pow((h-0.23-sin(d.x*9.0+time*0.04)*0.04)*26.0,2.0));
float veil=0.5+0.5*sin(d.x*90.0+sin(d.z*18.0)*2.0);
color+=mix(vec3(0.09,0.54,0.49),vec3(0.32,0.16,0.65),veil)*ribbon*(1.0-day)*0.6;
float star=step(0.998,hash(floor(d.xz/(h+0.2)*290.0)))*smoothstep(0.16,0.6,h);
color+=star*(1.0-day)*0.65;
float sun=pow(max(dot(d,normalize(vec3(-0.55,0.48,-0.5))),0.0),480.0);
color+=vec3(1.0,0.72,0.35)*sun*(day+dusk);
gl_FragColor=vec4(color,1.0);
#include <colorspace_fragment>
}`;

export default function PrototypeSky({ day, dusk, horizon, zenith, reduced }) {
  const material = useRef();
  const uniforms = useMemo(
    () => ({
      day: { value: day },
      dusk: { value: dusk },
      time: { value: 0 },
      horizon: { value: new Color(horizon) },
      zenith: { value: new Color(zenith) },
    }),
    [],
  );
  useFrame((_, delta) => {
    const u = material.current.uniforms;
    u.day.value = day;
    u.dusk.value = dusk;
    u.horizon.value.set(horizon);
    u.zenith.value.set(zenith);
    if (!reduced) u.time.value += Math.min(delta, 0.05);
  });
  return (
    <mesh name="r1-procedural-sky" renderOrder={-10}>
      <sphereGeometry args={[110, 32, 16]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        side={BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
