import { useLayoutEffect, useMemo, useRef } from 'react';
import { useDepthBuffer } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, Vector2, Vector3 } from 'three';
import { isSpaceTransition, useSpaceStore } from './spaceStore';

const mistLayer = 2;
const depths = [4.6, 8.8, 14.2];
const vertex = `
varying vec3 cloudPoint;
varying vec4 clipPoint;
varying float viewDepth;
varying vec2 cardUv;
void main() {
  cardUv = uv;
  cloudPoint = (modelMatrix * vec4(position, 1.0)).xyz;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  viewDepth = -view.z;
  clipPoint = projectionMatrix * view;
  gl_Position = clipPoint;
}
`;
const fragment = `
uniform sampler2D sceneDepth;
uniform vec2 cameraRange;
uniform float travelAlpha;
uniform float layer;
varying vec3 cloudPoint;
varying vec4 clipPoint;
varying float viewDepth;
varying vec2 cardUv;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.29)) * 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
void main() {
  if (travelAlpha < 0.001) discard;
  vec2 screenUv = clipPoint.xy / clipPoint.w * 0.5 + 0.5;
  float d = texture2D(sceneDepth, screenUv).r;
  float n = cameraRange.x;
  float f = cameraRange.y;
  float opaqueDepth = n * f / (f + d * (n - f));
  float intersection = smoothstep(0.08, 2.5, opaqueDepth - viewDepth);
  vec3 p = cloudPoint * vec3(0.24, 0.42, 0.24) + vec3(layer * 9.3);
  float cloud = noise3(p) * 0.62 + noise3(p * 2.16 + 6.4) * 0.28 + noise3(p * 4.47) * 0.1;
  float band = 0.78 + 0.22 * sin(dot(cloudPoint, vec3(0.21, 0.57, 0.09)) + cloud * 8.0);
  float shape = smoothstep(0.32, 0.86, cloud) * band;
  vec2 edge = smoothstep(vec2(0.0), vec2(0.17), cardUv)
    * smoothstep(vec2(0.0), vec2(0.17), 1.0 - cardUv);
  vec3 tint = mix(vec3(0.08, 0.12, 0.23), vec3(0.23, 0.29, 0.42), shape);
  float falloff = mix(0.72, 1.0, smoothstep(0.08, 0.55, length(cardUv - 0.5)));
  gl_FragColor = vec4(tint, shape * intersection * edge.x * edge.y * falloff * travelAlpha * 0.33);
}
`;

export default function TravelMist({ tier, progress }) {
  const inFlight = useSpaceStore((state) => isSpaceTransition(state.phase));
  return inFlight ? <MistCards tier={tier} progress={progress} /> : null;
}

function MistCards({ tier, progress }) {
  const camera = useThree((state) => state.camera);
  const cards = useRef([]);
  const offset = useMemo(() => new Vector3(), []);
  const count = tier === 3 ? 3 : 2;
  // UseDepthBuffer renders the same scene before the cards are admitted to the main camera.
  // The reflector camera stays on its default layer and never samples this screen-space depth.
  useFrame(() => camera.layers.disable(mistLayer), -0.25);
  const depth = useDepthBuffer({ size: tier === 3 ? 256 : 160 });
  const uniforms = useMemo(
    () =>
      depths.slice(0, count).map((_, i) => ({
        sceneDepth: { value: depth },
        cameraRange: { value: new Vector2(camera.near, camera.far) },
        travelAlpha: { value: 0 },
        layer: { value: i },
      })),
    [camera, count, depth],
  );
  useLayoutEffect(() => () => camera.layers.disable(mistLayer), [camera]);
  useFrame(() => {
    const fraction = progress.current;
    const strength =
      MathUtils.smoothstep(fraction, 0.02, 0.2) * (1 - MathUtils.smoothstep(fraction, 0.81, 1));
    for (const [i, card] of cards.current.entries()) {
      if (!card) continue;
      const distance = depths[i];
      const height = 2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * distance;
      card.quaternion.copy(camera.quaternion);
      card.position
        .copy(camera.position)
        .add(offset.set(0, 0, -distance).applyQuaternion(camera.quaternion));
      card.scale.set(height * camera.aspect * 1.18, height * 1.18, 1);
      uniforms[i].travelAlpha.value = strength;
    }
    camera.layers.enable(mistLayer);
  });
  return (
    <group name="space-travel-mist">
      {uniforms.map((layerUniforms, i) => (
        <mesh
          key={i}
          layers-mask={1 << mistLayer}
          ref={(card) => {
            cards.current[i] = card;
          }}
          frustumCulled={false}
          renderOrder={6 - i}
        >
          <planeGeometry />
          <shaderMaterial
            uniforms={layerUniforms}
            vertexShader={vertex}
            fragmentShader={fragment}
            transparent
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
