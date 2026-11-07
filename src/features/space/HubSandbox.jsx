import ToonMaterial from '../npr/ToonMaterial';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, CanvasTexture, Object3D } from 'three';
import WorldLabel from './WorldLabel';

const tau = Math.PI * 2;
const ringVertex = `
varying vec3 localPosition;
varying vec3 viewNormal;
varying vec3 toCamera;
void main() {
  localPosition = position;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  viewNormal = normalMatrix * normal;
  toCamera = -view.xyz;
  gl_Position = projectionMatrix * view;
}
`;
const ringFragment = `
uniform float time;
varying vec3 localPosition;
varying vec3 viewNormal;
varying vec3 toCamera;
float hexBorder(vec2 p) {
  vec2 lattice = vec2(1.0, 1.73205);
  vec2 a = mod(p, lattice) - lattice * 0.5;
  vec2 b = mod(p + lattice * 0.5, lattice) - lattice * 0.5;
  vec2 q = abs(dot(a,a) < dot(b,b) ? a : b);
  float edge = 0.5 - max(q.x, dot(q, vec2(0.5, 0.866025)));
  return 1.0 - smoothstep(0.018, 0.085, edge);
}
void main() {
  float fresnel = pow(1.0 - abs(dot(normalize(viewNormal), normalize(toCamera))), 2.2);
  float scan = 0.45 + 0.55 * sin(localPosition.z * 42.0 - time * 3.4);
  float hex = hexBorder(vec2(atan(localPosition.y, localPosition.x) * 8.91, localPosition.z * 3.5));
  float energy = 0.22 + fresnel * 0.55 + scan * 0.25 + hex * 0.5;
  vec3 tint = mix(vec3(0.11, 0.68, 1.55), vec3(1.6, 0.64, 0.24), smoothstep(0.12, 0.65, hex * fresnel));
  gl_FragColor = vec4(tint * energy, 0.82);
}
`;
const diskVertex = `
varying vec2 diskUv;
void main() {
  diskUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const diskFragment = `
uniform sampler2D ticks;
varying vec2 diskUv;
void main() {
  float radius = length(diskUv * 2.0 - 1.0);
  float mask = 1.0 - smoothstep(0.89, 1.0, radius);
  vec4 marks = texture2D(ticks, diskUv);
  vec3 base = mix(vec3(0.012, 0.08, 0.16), vec3(0.08, 0.24, 0.34), radius);
  gl_FragColor = vec4((base + marks.rgb * marks.a * 1.65) * mask, mask * 0.9);
}
`;

function Dial({ reduced, paused }) {
  const mesh = useRef(null);
  const ticks = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.translate(128, 128);
    for (let i = 0; i < 96; i += 1) {
      const angle = (i / 96) * tau;
      const major = i % 12 === 0;
      const inside = major ? 91 : 108;
      ctx.strokeStyle = major ? '#ffb56b' : '#48b6d1';
      ctx.lineWidth = major ? 2.4 : 1.25;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inside, Math.sin(angle) * inside);
      ctx.lineTo(Math.cos(angle) * 119, Math.sin(angle) * 119);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#398caf';
    for (const r of [36, 61, 86]) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, tau);
      ctx.stroke();
    }
    return new CanvasTexture(canvas);
  }, []);
  const uniforms = useMemo(() => ({ ticks: { value: ticks } }), [ticks]);
  useEffect(() => () => ticks.dispose(), [ticks]);
  useFrame((_, delta) => {
    if (!paused && !reduced) mesh.current.rotation.z += Math.min(delta, 0.05) * 0.16;
  });
  return (
    <mesh name="hub-dial" ref={mesh} position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[3.77, 80]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={diskVertex}
        fragmentShader={diskFragment}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function Diorama({ tier }) {
  const mesh = useRef(null);
  useLayoutEffect(() => {
    const building = new Object3D();
    for (let i = 0; i < 24; i += 1) {
      const angle = i * 2.399963;
      const radius = 0.78 + Math.sqrt(i / 24) * 1.6;
      const height = 0.26 + ((i * 7) % 9) * 0.13;
      building.position.set(Math.cos(angle) * radius, 0.15 + height / 2, Math.sin(angle) * radius);
      building.rotation.y = i * 0.32;
      building.scale.set(0.25 + (i % 4) * 0.09, height, 0.27 + (i % 3) * 0.11);
      building.updateMatrix();
      mesh.current.setMatrixAt(i, building.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh name="hub-diorama" ref={mesh} args={[undefined, undefined, 24]}>
      <boxGeometry />
      {tier >= 2 ? (
        <ToonMaterial color="#29586b" emissive="#2e9fb7" emissiveIntensity={0.46} />
      ) : (
        <meshBasicMaterial color="#325d71" />
      )}
    </instancedMesh>
  );
}

export default function HubSandbox({ tier, paused, reduced }) {
  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);
  useFrame((_, delta) => {
    if (tier === 3 && !paused && !reduced) uniforms.time.value += Math.min(delta, 0.05);
  });
  return (
    <group name="space-hub">
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[4.23, 3.87, 1.1, tier === 1 ? 24 : 64]} />
        <meshBasicMaterial color="#182032" />
      </mesh>
      <mesh name="hub-outline" position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.93, tier === 1 ? 0.055 : 0.19, 10, 96]} />
        {tier === 3 ? (
          <shaderMaterial
            uniforms={uniforms}
            vertexShader={ringVertex}
            fragmentShader={ringFragment}
            blending={AdditiveBlending}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        ) : (
          <meshBasicMaterial color={tier === 2 ? '#75d6e8' : '#529cae'} toneMapped={false} />
        )}
      </mesh>
      {tier >= 2 && <Dial reduced={reduced} paused={paused} />}
      <Diorama tier={tier} />
      <mesh name="hub-beacon" position={[0, 1.85, 0]}>
        <octahedronGeometry args={[0.72, 0]} />
        <meshBasicMaterial color="#ffbf81" wireframe={tier >= 2} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.85, 0]} rotation={[0.21, 0.3, -0.18]}>
        <octahedronGeometry args={[0.38, 0]} />
        <meshBasicMaterial color="#f7a769" toneMapped={false} />
      </mesh>
      <WorldLabel
        title="中央枢纽"
        code="00 / SPARKMATE HUB"
        color="#90e4f0"
        position={[0, 3.36, 0]}
      />
    </group>
  );
}
