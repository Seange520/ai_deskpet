import { useMemo, useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Object3D } from 'three';
import { ANCHORS } from './poi';
import useReducedMotionPreference from '../../lib/useReducedMotionPreference';
const vertex = `
uniform float time; varying float height;
void main(){ height=uv.y; vec3 p=position;
p.x*=1.0-uv.y*.96; vec4 world=instanceMatrix*vec4(p,1.);
p.x+=sin(time*1.4+world.x*.73+world.z*.8)*uv.y*uv.y*.16;
p.z+=cos(time*.9+world.x*.6)*uv.y*uv.y*.08;
gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.); }`;
const fragment = `varying float height; void main(){
vec3 c=mix(vec3(.025,.17,.20),vec3(.12,.7,.55),pow(height,6.));
gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
export default function SkinEcology({ paused }) {
  const ref = useRef();
  const reduced = useReducedMotionPreference();
  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);
  const blades = useMemo(() => {
    const result = [];
    [{ position: [0, 0, 0], hub: true }, ...ANCHORS].forEach((a, k) => {
      const r = a.hub ? 3.8 : 4.55;
      for (let i = 0; i < 420; i++) {
        const t = i * 2.39996323,
          spread = 0.22 * Math.sin(i * 17.3);
        const x = Math.cos(t) * (r + spread),
          z = Math.sin(t) * (r + spread);
        // Leave original spoke connections open. Decorative plants never create colliders.
        if (Math.abs(x) < 1.3 || Math.abs(z) < 1.3) continue;
        result.push([
          a.position[0] + x,
          0.015,
          a.position[2] + z,
          t,
          0.28 + (Math.sin(i * 4.17) + 1) * 0.2,
        ]);
      }
      for (let i = 0; i < 64; i++) {
        const t = i * 2.39996323;
        result.push([
          a.position[0] + Math.cos(t) * (r + 0.04),
          -0.25 - (i % 8) * 0.2,
          a.position[2] + Math.sin(t) * (r + 0.04),
          t,
          0.5 + (i % 4) * 0.14,
        ]);
      }
    });
    return result;
  }, []);
  useLayoutEffect(() => {
    const o = new Object3D();
    blades.forEach(([x, y, z, t, s], i) => {
      o.position.set(x, y, z);
      o.rotation.set(0, t, 0);
      o.scale.set(0.035, s * .42, 0.035);
      o.updateMatrix();
      ref.current.setMatrixAt(i, o.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [blades]);
  useFrame((_, d) => {
    if (!paused && !reduced) uniforms.time.value += Math.min(d, 0.05);
  });
  return (
    <instancedMesh
      name="p9-wind-grass-vines"
      ref={ref}
      args={[null, null, blades.length]}
      userData={{ visualOnly: true }}
    >
      <planeGeometry args={[1, 1, 1, 5]} onUpdate={(g) => g.translate(0, 0.5, 0)} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        side={DoubleSide}
      />
    </instancedMesh>
  );
}
