import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending } from 'three';
const particlesVertex = `
uniform float time; uniform float pixelRatio;
varying float brightness;
void main() {
  vec3 p = position;
  p.y += sin(time * 0.35 + position.x * 2.0) * 0.14;
  p.x += cos(time * 0.22 + position.z) * 0.08;
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * view;
  gl_PointSize = min(18.0 * pixelRatio, 46.0 * pixelRatio / max(1.0, -view.z));
  brightness = 1.4 + 0.6 * sin(position.y * 3.0 + 1.0);
}`;
const particlesFragment = `
varying float brightness;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float alpha = pow(1.0 - d, 1.6);
  gl_FragColor = vec4(vec3(1.8, 1.16, 0.65) * brightness, alpha);
}`;
export default function StageAtmosphere({ paused, reduced }) {
  const elapsed = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const points = useMemo(() => ({ time: { value: 0 }, pixelRatio: { value: 1 } }), []);
  const positions = useMemo(
    () =>
      Float32Array.from(
        Array.from({ length: 12 }, (_, i) => {
          const angle = i * 2.39996;
          return [Math.cos(angle) * (1.6 + i * 0.05), -0.4 + (i % 5) * 0.65, Math.sin(angle) * 2.2];
        }).flat(),
      ),
    [],
  );
  useFrame((_, delta) => {
    points.pixelRatio.value = gl.getPixelRatio();
    if (paused || reduced) return;
    elapsed.current += Math.min(delta, 0.05);
    points.time.value = elapsed.current;
    invalidate();
  });
  return (
    <points name="stage-gpu-particles" frustumCulled={false}>
      <bufferGeometry>
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
