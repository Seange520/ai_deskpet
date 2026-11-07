import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, DoubleSide } from 'three';

const vertex = `
  varying vec2 abyssPoint;
  varying float abyssDepth;
  void main() {
    abyssPoint=position.xy;
    vec4 view=modelViewMatrix*vec4(position,1.0);
    abyssDepth=-view.z;
    gl_Position=projectionMatrix*view;
  }
`;
const fragment = `
  uniform float time;
  uniform float radius;
  uniform float phase;
  uniform vec3 tint;
  varying vec2 abyssPoint;
  varying float abyssDepth;
  void main() {
    float r=length(abyssPoint);
    float angle=atan(abyssPoint.y,abyssPoint.x);
    float flow=angle+time*0.035+phase;
    float path=radius+sin(flow*2.0)*0.65+sin(flow*3.0+phase)*0.22;
    float d=r-path;
    float cloud=exp(-d*d/1.3);
    float filament=exp(-d*d*48.0);
    float lace=pow(0.5+0.5*sin(d*17.0+sin(flow*5.0)*2.0),4.0);
    float arc=0.3+0.7*pow(0.5+0.5*sin(flow*3.0+phase),2.0);
    float veil=(cloud*(0.23+lace*0.10)+filament*0.30)*arc;
    float depthFade=exp(-0.00020*abyssDepth*abyssDepth);
    vec3 color=mix(tint,tint*1.5+vec3(0.12),filament);
    gl_FragColor=vec4(color,veil*depthFade);
  }
`;
// Three shallow translucent swirls above the floor, below decks and navigation.
// Owned by the existing Stage renderer; no RT, composer, texture or store writes.
export default function AbyssRibbons({ paused, reduced }) {
  const bands = useMemo(
    () =>
      [5.5, 9.1, 12.8].map((radius, i) => ({
        time: { value: 0 },
        radius: { value: radius },
        phase: { value: i * 1.8 },
        tint: { value: new Color(['#6cbdce', '#9384cc', '#609cae'][i]) },
      })),
    [],
  );
  useFrame((_, delta) => {
    if (paused || reduced) return;
    for (const uniforms of bands) uniforms.time.value += Math.min(delta, 0.05);
  });
  return (
    <group name="npr-abyss-ribbons">
      {bands.map((uniforms, i) => (
        <mesh
          key={i}
          name={`npr-abyss-band-${i}`}
          position={[0, -0.99 + i * 0.055, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={-1}
        >
          <planeGeometry args={[34, 34]} />
          <shaderMaterial
            vertexShader={vertex}
            fragmentShader={fragment}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            side={DoubleSide}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
