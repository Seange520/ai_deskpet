import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { SphereGeometry, ConeGeometry, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const vertex = `
uniform float fishTime;
varying vec3 tint;
varying float depth;
void main() {
  vec3 center = instanceMatrix[3].xyz;
  float phase = dot(center.xz, vec2(1.7, 2.3));
  vec3 p = position;
  p.z += sin(p.x * 9.0 + fishTime * 2.0 + phase) * 0.055;
  vec4 world = instanceMatrix * vec4(p, 1.0);
  float a = fishTime * 0.026;
  world.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * world.xz;
  world.y += sin(fishTime * 0.36 + phase) * 0.18;
  vec4 view = modelViewMatrix * world;
  depth = -view.z;
  tint = mix(vec3(0.25, 1.4, 1.5), vec3(1.4, 0.7, 2.0), fract(phase));
  gl_Position = projectionMatrix * view;
}`;
const fragment = `varying vec3 tint; varying float depth;
void main(){gl_FragColor=vec4(tint * exp(-depth * 0.014), 1.0);}`;

// Memory couriers follow the old maintenance rings. One draw; motion stays on GPU.
export default function LumenFish({ tier, paused, reduced }) {
  const mesh = useRef();
  const count = tier === 3 ? 72 : 40;
  const uniforms = useMemo(() => ({ fishTime: { value: 0 } }), []);
  const geometry = useMemo(() => {
    const body = new SphereGeometry(1, 8, 5);
    body.scale(0.29, 0.1, 0.085);
    const tail = new ConeGeometry(0.14, 0.24, 3);
    tail.rotateZ(-Math.PI / 2);
    tail.translate(-0.28, 0, 0);
    const result = mergeGeometries([body, tail]);
    body.dispose();
    tail.dispose();
    return result;
  }, []);
  useLayoutEffect(() => {
    const pose = new Object3D();
    let seed = 7713;
    const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < count; i++) {
      const a = (i % 3) * 2.094 + random() * 0.65;
      const r = 6.8 + (i % 3) * 2.4 + random() * 1.1;
      pose.position.set(Math.cos(a) * r, -0.35 + random() * 1.7, Math.sin(a) * r);
      pose.rotation.set(0, -a - Math.PI / 2, 0);
      pose.scale.setScalar(0.65 + random() * 0.65);
      pose.updateMatrix();
      mesh.current.setMatrixAt(i, pose.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ invalidate }, dt) => {
    if (paused || reduced) return;
    uniforms.fishTime.value += Math.min(dt, 0.05);
    invalidate();
  });
  return (
    <instancedMesh
      name="lumen-memory-fish"
      ref={mesh}
      args={[geometry, null, count]}
      frustumCulled={false}
    >
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
