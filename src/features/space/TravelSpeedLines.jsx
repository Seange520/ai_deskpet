import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending } from 'three';

const speedLayer = 3;
const vertex = `
uniform float time;
varying float tail;
void main() {
  float radius = 0.39 + 0.83 * fract(position.x + time * 1.8);
  float extension = position.z * (0.07 + radius * 0.12);
  vec2 direction = vec2(cos(position.y), sin(position.y));
  gl_Position = vec4(direction * (radius + extension), 0.0, 1.0);
  tail = position.z * smoothstep(0.42, 0.64, radius);
}
`;
const fragment = `
uniform float strength;
varying float tail;
void main() {
  gl_FragColor = vec4(0.56, 0.81, 1.12, tail * strength * 0.24);
}
`;

export default function TravelSpeedLines() {
  const camera = useThree((state) => state.camera);
  const lines = useRef(null);
  const uniforms = useMemo(() => ({ time: { value: 0 }, strength: { value: 0 } }), []);
  const points = useMemo(() => {
    const result = new Float32Array(30 * 6);
    for (let i = 0; i < 30; i++) {
      const angle = i * 2.39996;
      const seed = ((i * 19) % 31) / 31;
      result.set([seed, angle, 0, seed, angle, 1], i * 6);
    }
    return result;
  }, []);
  useLayoutEffect(() => {
    camera.layers.enable(speedLayer);
    return () => camera.layers.disable(speedLayer);
  }, [camera]);
  useFrame(() => {
    const launch = camera.userData.travelStage === 'launch';
    lines.current.visible = launch;
    if (launch) {
      const progress = camera.userData.travelStageProgress;
      uniforms.time.value = progress;
      uniforms.strength.value = Math.sin(Math.PI * progress) * (0.6 + progress * 0.4);
    }
  });
  return (
    <lineSegments
      ref={lines}
      name="valley-speed-lines"
      layers-mask={1 << speedLayer}
      visible={false}
      frustumCulled={false}
      renderOrder={8}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
        blending={AdditiveBlending}
      />
    </lineSegments>
  );
}
