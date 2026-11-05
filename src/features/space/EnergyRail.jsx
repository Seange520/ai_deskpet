import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, CatmullRomCurve3, Matrix4, Vector3 } from 'three';
import { HUB, ISLANDS } from './world';

const count = 60;
const rail = new CatmullRomCurve3(
  [
    [HUB[0], 0.22, HUB[2] + 3.86],
    [6.2, 0.7, 5.15],
    [ISLANDS.hardware.position[0] - 2.86, 0.35, 0],
    [10.3, 1.06, -8.85],
    [0, 0.37, ISLANDS.code.position[2] + 2.83],
    [-10.4, 0.97, -8.25],
    [ISLANDS.ranking.position[0] + 2.87, 0.36, 0],
    [-6.3, 0.67, 5.05],
  ].map((position) => new Vector3(...position)),
  true,
);
const railVertex = `
varying vec2 railUv;
void main() {
  railUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const railFragment = `
uniform float time;
varying vec2 railUv;
void main() {
  float phase = railUv.x * 10.0 - time * 0.92;
  float pulse = pow(0.5 + 0.5 * cos(6.2831853 * phase), 8.0);
  float filament = 0.65 + 0.35 * cos(6.2831853 * railUv.y);
  vec3 cold = vec3(0.11, 0.69, 1.45);
  vec3 hot = vec3(1.9, 0.77, 0.23);
  gl_FragColor = vec4(mix(cold * filament, hot, pulse), 0.79);
}
`;

function RailBeads({ paused, reduced }) {
  const mesh = useRef(null);
  const offset = useRef(0);
  const scratch = useMemo(() => ({ point: new Vector3(), matrix: new Matrix4() }), []);
  function update() {
    for (let i = 0; i < count; i += 1) {
      rail.getPointAt((i / count + offset.current) % 1, scratch.point);
      scratch.point.y += 0.13;
      mesh.current.setMatrixAt(
        i,
        scratch.matrix.makeTranslation(scratch.point.x, scratch.point.y, scratch.point.z),
      );
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  }
  useLayoutEffect(update, []);
  useFrame((_, delta) => {
    if (paused || reduced) return;
    offset.current = (offset.current + Math.min(delta, 0.05) * 0.095) % 1;
    update();
  });
  return (
    <instancedMesh
      name="rail-beads"
      args={[undefined, undefined, count]}
      ref={mesh}
      frustumCulled={false}
    >
      <sphereGeometry args={[0.055, 8, 5]} />
      <meshStandardMaterial
        color="#a1f7f0"
        emissive="#56eadf"
        emissiveIntensity={2.2}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

export default function EnergyRail({ tier, paused, reduced }) {
  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);
  useFrame((_, delta) => {
    if (tier === 3 && !paused && !reduced) uniforms.time.value += Math.min(delta, 0.05);
  });
  return (
    <group name="space-energy-rail">
      <mesh name="rail-tube">
        <tubeGeometry
          args={[rail, tier === 1 ? 72 : 144, tier === 3 ? 0.095 : 0.062, tier === 1 ? 4 : 8, true]}
        />
        {tier === 3 ? (
          <shaderMaterial
            vertexShader={railVertex}
            fragmentShader={railFragment}
            uniforms={uniforms}
            blending={AdditiveBlending}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        ) : tier === 2 ? (
          <meshStandardMaterial color="#367c90" emissive="#3db8c7" emissiveIntensity={0.95} />
        ) : (
          <meshBasicMaterial color="#477b88" />
        )}
      </mesh>
      {tier >= 2 && <RailBeads paused={paused} reduced={reduced} />}
    </group>
  );
}
