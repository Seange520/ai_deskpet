import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Raycaster } from 'three';

const footLevel = -1.245;
const vertexShader = `
varying vec2 shadowUv;
void main() {
  shadowUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const fragmentShader = `
uniform float strength;
varying vec2 shadowUv;
void main() {
  float radius = length(shadowUv * 2.0 - 1.0);
  float falloff = 1.0 - smoothstep(0.04, 1.0, radius);
  gl_FragColor = vec4(0.012, 0.016, 0.028, falloff * falloff * strength);
}
`;

export default function PetContactShadow({ body, ground, travelRoot, paused, reduced }) {
  const shadow = useRef(null);
  const uniforms = useMemo(() => ({ strength: { value: 0.62 } }), []);
  const ray = useMemo(() => new Raycaster(), []);
  const support = useRef(null);

  useFrame(({ scene }, delta) => {
    if (paused || !body.current || !ground.current) return;
    const travel = travelRoot?.current;
    const docked = !travel || travel.userData.motion === 'docked';
    let offset = 0;
    if (travel && docked) {
      let surface = 0.008;
      if (travel.userData.dock === 'hardware') {
        const { x, z } = travel.position;
        if (support.current?.x !== x || support.current?.z !== z) {
          const terrain = scene.getObjectByName('p5-circuit-terrain');
          if (terrain) {
            terrain.updateWorldMatrix(true, false);
            ray.ray.origin.set(x, 3, z);
            ray.ray.direction.set(0, -1, 0);
            support.current = {
              x,
              z,
              height: ray.intersectObject(terrain, false)[0]?.point.y ?? 0.167,
            };
          }
        }
        surface = support.current?.height ?? 0.167;
      } else {
        support.current = null;
      }
      offset = surface - travel.position.y - footLevel;
    }

    ground.current.position.y = reduced
      ? offset
      : MathUtils.damp(ground.current.position.y, offset, 16, Math.min(delta, 0.05));
    const node = shadow.current;
    const { x, y, z } = body.current.position;
    const lift = Math.max(0, y);
    node.position.set(x, footLevel + 0.009 + offset - ground.current.position.y, z + 0.12);
    node.scale.setScalar(1 + lift * 0.35);
    uniforms.strength.value = 0.64 / (1 + lift * 2.1);
    node.visible = docked;
  });

  return (
    <mesh
      ref={shadow}
      name="pet-contact-shadow"
      position={[0, footLevel + 0.009, 0.12]}
      rotation={[-Math.PI / 2, 0, 0]}
      visible={!travelRoot}
    >
      <planeGeometry args={[2.25, 1.55]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
