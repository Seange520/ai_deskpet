import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BackSide, Color, DoubleSide } from 'three';
import { sceneAuroraFragment } from '../../components/auroraShader';
import FloatingDebris from './FloatingDebris';
import ReflectiveFloor from './ReflectiveFloor';
import { ISLANDS, RING_RADIUS } from './world';

const islands = Object.values(ISLANDS);

const atmosphereVertex = `
varying vec2 effectUv;
varying float viewDepth;
void main() {
  effectUv = uv;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  viewDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

const poolFragment = `
uniform vec3 tint;
uniform float strength;
varying vec2 effectUv;
varying float viewDepth;
void main() {
  float radius = length(effectUv * 2.0 - 1.0);
  float glow = pow(1.0 - smoothstep(0.04, 1.0, radius), 1.7);
  float ring = exp(-105.0 * abs(radius - 0.41)) * 0.24;
  float haze = exp(-0.000484 * viewDepth * viewDepth);
  gl_FragColor = vec4(tint * 1.5, (glow + ring) * haze * strength);
}
`;

const beamFragment = `
uniform vec3 tint;
uniform float strength;
varying vec2 effectUv;
varying float viewDepth;
void main() {
  float height = effectUv.y;
  float width = mix(0.075, 0.49, height);
  float across = abs(effectUv.x - 0.5) / width;
  float softEdge = 1.0 - smoothstep(0.0, 1.0, across);
  float fade = smoothstep(0.0, 0.19, height) * pow(1.0 - height, 1.65);
  float haze = exp(-0.000484 * viewDepth * viewDepth);
  gl_FragColor = vec4(tint * 3.4, softEdge * softEdge * fade * haze * strength);
}
`;

const skyVertex = `
varying vec3 skyDirection;
void main() {
  skyDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const skyFragment = sceneAuroraFragment
  .replace('varying vec2 fieldUv;', 'varying vec3 skyDirection; uniform vec3 horizon;')
  .replace(
    'vec2 p = vec2(uv.x * resolution.x / max(resolution.y, 1.0), uv.y) * 1.8;',
    `
    vec3 direction = normalize(skyDirection);
    vec2 fieldUv = vec2(direction.x * 0.5 + 0.5, max(direction.y, 0.0));
    vec2 p = direction.xz * 2.2 + vec2(0.2, direction.y * 3.1);
  `,
  )
  .replace('gl_FragColor = vec4(', 'vec4 aurora = vec4(')
  .replace(
    '1.0);\n}',
    `
    1.0);
    float altitude = smoothstep(-0.035, 0.28, direction.y);
    gl_FragColor = vec4(mix(horizon, aurora.rgb, altitude), 1.0);
  }`,
  );
function AuroraSky({ paused, reduced }) {
  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      horizon: { value: new Color('#1b1626') },
    }),
    [],
  );
  useFrame((_, delta) => {
    if (!paused && !reduced) uniforms.time.value += Math.min(delta, 0.05);
  });
  return (
    <mesh name="space-aurora" frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[85, 40, 24]} />
      <shaderMaterial
        vertexShader={skyVertex}
        fragmentShader={skyFragment}
        side={BackSide}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function HorizonStructures() {
  return (
    <group name="space-horizon-structures">
      {Array.from({ length: 14 }, (_, i) => {
        const angle = i * 2.39996;
        const distance = 27 + ((i * 17) % 29);
        const radius = 3.8 + (i % 5) * 1.08;
        return (
          <group
            key={i}
            position={[Math.cos(angle) * distance, -1.1, Math.sin(angle) * distance]}
            rotation={[0, -angle + 0.34, 0]}
          >
            <mesh position={[0, 1.4, 0]} rotation={[0, 0, 0.12 - (i % 3) * 0.12]}>
              <torusGeometry args={[radius, 0.34 + (i % 4) * 0.09, 5, 24, Math.PI * 1.12]} />
              <meshBasicMaterial color={i % 2 === 0 ? '#342840' : '#3c304b'} />
            </mesh>
            <mesh position={[-radius * 0.82, 0.5, -0.12]}>
              <boxGeometry args={[radius * 0.65, 2.6, 1.25]} />
              <meshBasicMaterial color="#302539" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function IslandLights({ island, tier }) {
  const [x, , z] = island.position;
  const heading = Math.atan2(x, z);
  const tint = useMemo(() => ({ value: new Color(island.accent) }), [island.accent]);
  const pool = useMemo(
    () => ({
      tint,
      strength: { value: tier === 3 ? 0.23 : 0.45 },
    }),
    [tier, tint],
  );
  const beams = useMemo(() => ({ tint, strength: { value: 0.26 } }), [tint]);
  return (
    <group position={island.position} rotation={[0, heading, 0]}>
      <mesh position={[0, -1.145, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[15.5, 15.5]} />
        <shaderMaterial
          vertexShader={atmosphereVertex}
          fragmentShader={poolFragment}
          uniforms={pool}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <group name={`space-beams-${island.id}`} position={[0, 0, -3.35]}>
        {Array.from({ length: 5 }, (_, i) => {
          const x = i - 2;
          const height = 4.7 + ((i * 3) % 5) * 0.48;
          return (
            <mesh
              key={i}
              position={[x * 0.98, height / 2 - 0.62, -Math.abs(x) * 0.24]}
              rotation={[-0.2, x * 0.26, -x * 0.13]}
            >
              <planeGeometry args={[2.8, height]} />
              <shaderMaterial
                vertexShader={atmosphereVertex}
                fragmentShader={beamFragment}
                uniforms={beams}
                side={DoubleSide}
                transparent
                depthWrite={false}
                blending={AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

export default function SpaceEnvironment({ tier, paused, reduced }) {
  return (
    <>
      <AuroraSky paused={paused} reduced={reduced} />
      <HorizonStructures />
      {tier === 3 ? (
        <ReflectiveFloor />
      ) : (
        <mesh name="space-gradient-floor" position={[0, -1.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[85, 96]} />
          <meshBasicMaterial color="#251d31" />
        </mesh>
      )}
      {islands.map((island) => (
        <IslandLights key={island.id} island={island} tier={tier} />
      ))}
      <mesh position={[0, -1.145, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[RING_RADIUS - 4.4, RING_RADIUS + 4.4, 96]} />
        <meshBasicMaterial color="#9d7abc" transparent opacity={0.045} depthWrite={false} />
      </mesh>
      <FloatingDebris paused={paused} reduced={reduced} />
    </>
  );
}
