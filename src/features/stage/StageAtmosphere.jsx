import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending } from 'three';
import { ISLANDS } from '../space/world';
const particlesVertex = `
uniform float time; uniform float pixelRatio;
varying float brightness;
varying float visibility;
void main() {
  vec3 p = position;
  p.y += sin(time * 0.35 + position.x * 2.0) * 0.14;
  p.x += cos(time * 0.22 + position.z) * 0.08;
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * view;
  gl_PointSize = min(18.0 * pixelRatio, 46.0 * pixelRatio / max(1.0, -view.z));
  visibility = exp(-0.000484 * view.z * view.z);
  brightness = 1.4 + 0.6 * sin(position.y * 3.0 + 1.0);
}`;
const particlesFragment = `
varying float brightness;
varying float visibility;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float alpha = pow(1.0 - d, 1.6);
  gl_FragColor = vec4(vec3(1.8, 1.16, 0.65) * brightness, alpha * visibility);
}`;
export default function StageAtmosphere({ tier, paused, reduced }) {
  const elapsed = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const points = useMemo(() => ({ time: { value: 0 }, pixelRatio: { value: 1 } }), []);
  const positions = useMemo(() => {
    const [x, , z] = ISLANDS.dashboard.position;
    const count = tier === 3 ? 600 : 12;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.39996;
      if (i < 12) {
        positions.set(
          [x + Math.cos(angle) * (1.6 + i * 0.05), 1 + (i % 5) * 0.65, z + Math.sin(angle) * 2.2],
          i * 3,
        );
      } else {
        const radius = 47 * Math.sqrt(((i * 277) % 601) / 601);
        const height = 0.2 + ((i * 167) % 601) * 0.024;
        positions.set([Math.cos(angle) * radius, height, Math.sin(angle) * radius], i * 3);
      }
    }
    return positions;
  }, [tier]);
  useFrame((_, delta) => {
    points.pixelRatio.value = gl.getPixelRatio();
    if (paused || reduced) return;
    elapsed.current += Math.min(delta, 0.05);
    points.time.value = elapsed.current;
    invalidate();
  });
  return (
    <points name="stage-gpu-particles" frustumCulled={false}>
      <bufferGeometry key={tier}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={points}
        vertexShader={particlesVertex}
        fragmentShader={particlesFragment}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
