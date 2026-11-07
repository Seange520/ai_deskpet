import ToonMaterial from '../npr/ToonMaterial';
import { useMemo } from 'react';
import { AdditiveBlending, Color, DoubleSide } from 'three';
import FloatingDebris from './FloatingDebris';
import { RING_RADIUS } from './world';

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

export function IslandLights({ island, tier, volume }) {
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
    <group rotation={[0, heading, 0]}>
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
      {volume && (
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
      )}
    </group>
  );
}

export default function SpaceEnvironment({ tier, paused, reduced }) {
  return (
    <>
      <mesh name="space-gradient-floor" position={[0, -1.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[85, 96]} />
        <ToonMaterial color="#293643" />
      </mesh>
      <mesh position={[0, -1.145, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[RING_RADIUS - 4.4, RING_RADIUS + 4.4, 96]} />
        <meshBasicMaterial color="#9d7abc" transparent opacity={0.045} depthWrite={false} />
      </mesh>
      <FloatingDebris tier={tier} paused={paused} reduced={reduced} />
    </>
  );
}
