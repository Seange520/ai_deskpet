import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { AdditiveBlending, Color, DoubleSide, Object3D } from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { MOON_DIRECTION } from './world';

const towerCount = 14;
const DistantSkyline = lazy(() => import('./DistantSkyline'));

function MoonSky() {
  const sky = useMemo(() => {
    const dome = new Sky();
    dome.name = 'valley-moon-sky';
    dome.scale.setScalar(380);
    dome.renderOrder = -100;
    dome.frustumCulled = false;
    dome.material.depthTest = false;
    dome.material.vertexShader = dome.material.vertexShader.replace(
      'gl_Position.z = gl_Position.w;',
      'gl_Position.z = gl_Position.w * 0.98;',
    );
    const { uniforms } = dome.material;
    uniforms.sunPosition.value.set(0.22, -0.075, -1);
    uniforms.turbidity.value = 2.5;
    uniforms.rayleigh.value = 0.72;
    uniforms.mieCoefficient.value = 0.004;
    dome.material.fragmentShader = dome.material.fragmentShader.replace(
      'gl_FragColor = vec4( retColor, 1.0 );',
      `
      float horizon = exp(-abs(direction.y) * 8.0);
      vec3 night = mix(vec3(0.005, 0.012, 0.028), vec3(0.034, 0.063, 0.105), horizon);
      vec3 moonDir = normalize(vec3(${MOON_DIRECTION.map((value) => value.toFixed(3)).join(', ')}));
      float lunarAngle = length(direction - moonDir);
      float disc = 1.0 - smoothstep(0.013, 0.014, lunarAngle);
      float halo = exp(-lunarAngle * 25.0);
      vec3 lunarGlow = vec3(0.44, 0.65, 0.85) * halo * 0.21;
      vec3 moon = vec3(1.4, 1.72, 2.0) * disc;
      gl_FragColor = vec4(night + retColor * vec3(0.07, 0.12, 0.24) + lunarGlow + moon, 1.0);
      `,
    );
    return dome;
  }, []);
  useEffect(
    () => () => {
      sky.geometry.dispose();
      sky.material.dispose();
    },
    [sky],
  );
  return <primitive object={sky} />;
}

function ValleyStars({ tier, reduced }) {
  const stars = useRef(null);
  useEffect(() => {
    // Drei attaches this ShaderMaterial as a primitive, so own its disposal here.
    const material = stars.current.material;
    return () => material.dispose();
  }, []);
  return (
    <Stars
      ref={stars}
      radius={89}
      depth={9}
      count={tier === 3 ? 950 : tier === 2 ? 460 : 105}
      factor={0.63}
      fade
      speed={reduced ? 0 : 0.2}
    />
  );
}

const auroraVertex = `
varying vec2 coord;
void main() {
  coord = uv * 2.0 - 1.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const auroraFragment = `
uniform float time;
varying vec2 coord;
void main() {
  float angle = atan(coord.y, coord.x);
  float radius = length(coord);
  float ribbon = 0.63 + sin(angle * 4.0 + time * 0.16) * 0.12 + sin(angle * 9.0) * 0.045;
  float edge = (radius - ribbon) * 15.0;
  float sheet = exp(-edge * edge);
  float filament = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(angle * 76.0 + 1.4 * sin(angle * 21.0 + time)), 3.0);
  float breakUp = 0.22 + 0.78 * pow(0.5 + 0.5 * sin(angle * 3.0 - 0.8), 2.0);
  vec3 tint = mix(vec3(0.09, 0.54, 0.36), vec3(0.25, 0.20, 0.58), 0.5 + 0.5 * sin(angle * 5.0));
  gl_FragColor = vec4(tint, sheet * filament * breakUp * 0.64);
}
`;

function AuroraPlane({ paused, reduced }) {
  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);
  useFrame((_, delta) => {
    if (!paused && !reduced) uniforms.time.value += Math.min(delta, 0.05);
  });
  return (
    <mesh name="space-aurora" position={[0, 14, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={-2}>
      <planeGeometry args={[242, 242]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={auroraVertex}
        fragmentShader={auroraFragment}
        side={DoubleSide}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

let seed = 48117;
const noise = new SimplexNoise({
  random: () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  },
});

function ridgeMesh(radius, amplitude, segments, tint) {
  const positions = [];
  const colors = [];
  const indices = [];
  const base = new Color(tint);
  const rings = [
    [-16, 0],
    [-8, 0.35],
    [0, 1],
    [9, 0.44],
    [16, 0],
  ];
  for (const [offset, rise] of rings) {
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      const x = Math.cos(angle);
      const z = Math.sin(angle);
      const ridged = 1 - Math.abs(noise.noise(x * 3.4 + radius, z * 3.4));
      const grain = 1 - Math.abs(noise.noise(x * 10, z * 10 + radius));
      const profile = 0.25 + 0.55 * Math.abs(Math.sin(angle * 2 + 0.75));
      const height = (0.16 + ridged ** 2 * 0.63 + grain * 0.21) * amplitude * profile;
      positions.push(x * (radius + offset), -1.18 + height * rise, z * (radius + offset));
      const shade = 0.55 + rise * (0.62 + grain * 0.36);
      colors.push(base.r * shade, base.g * shade, base.b * shade);
    }
  }
  for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let i = 0; i < segments; i++) {
      const a = ring * segments + i;
      const b = ring * segments + ((i + 1) % segments);
      indices.push(a, b, a + segments, b, b + segments, a + segments);
    }
  }
  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    indices: new Uint16Array(indices),
  };
}

function Ridge({ radius, amplitude, segments, tint }) {
  const { positions, colors, indices } = useMemo(
    () => ridgeMesh(radius, amplitude, segments, tint),
    [radius, amplitude, segments, tint],
  );
  return (
    <mesh name="valley-ridge">
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="index" args={[indices, 1]} />
      </bufferGeometry>
      <meshBasicMaterial vertexColors fog={false} side={DoubleSide} />
    </mesh>
  );
}

function WorkshopTowers({ tier }) {
  const towers = useRef(null);
  const windows = useRef(null);
  const rows = tier === 1 ? 2 : 4;
  useLayoutEffect(() => {
    const dummy = new Object3D();
    const lamp = new Color();
    for (let i = 0; i < towerCount; i++) {
      const angle = (i * Math.PI * 2) / towerCount + Math.sin(i * 1.72) * 0.15;
      const distance = 43 + (i % 4) * 2.4;
      const width = 1.1 + ((i * 7) % 5) * 0.27;
      const height = 3.4 + ((i * 13) % 8) * 0.68;
      const depth = width * 0.8;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      dummy.rotation.y = Math.atan2(-x, -z);
      dummy.position.set(x, height / 2 - 1.15, z);
      dummy.scale.set(width, height, depth);
      dummy.updateMatrix();
      towers.current.setMatrixAt(i, dummy.matrix);
      for (let row = 0; row < rows; row++) {
        const index = i * rows + row;
        const edge = depth / 2 + 0.018;
        dummy.position.set(
          x + Math.sin(dummy.rotation.y) * edge,
          (height * (row + 1)) / (rows + 1) - 1.15,
          z + Math.cos(dummy.rotation.y) * edge,
        );
        dummy.scale.set(width * 0.56, 0.11, 0.04);
        dummy.updateMatrix();
        windows.current.setMatrixAt(index, dummy.matrix);
        windows.current.setColorAt(index, lamp.set((i + row) % 3 === 0 ? '#71b9bf' : '#e8a763'));
      }
    }
    for (const mesh of [towers.current, windows.current]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    windows.current.instanceColor.needsUpdate = true;
  }, [rows]);
  return (
    <group name="space-horizon-structures">
      <instancedMesh name="valley-towers" ref={towers} args={[null, null, towerCount]}>
        <boxGeometry />
        <meshBasicMaterial color="#182831" fog={false} />
      </instancedMesh>
      <instancedMesh
        name="valley-tower-windows"
        ref={windows}
        args={[null, null, towerCount * rows]}
      >
        <boxGeometry />
        <meshBasicMaterial color={[1.8, 1.8, 1.8]} fog={false} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

export default function NightValley({ tier, paused, reduced }) {
  return (
    <>
      <MoonSky />
      <ValleyStars tier={tier} reduced={paused || reduced} />
      {tier >= 2 && <AuroraPlane paused={paused} reduced={reduced} />}
      <Ridge radius={79} amplitude={16} segments={tier === 1 ? 54 : 104} tint="#314659" />
      <Ridge radius={61} amplitude={12} segments={tier === 1 ? 54 : 104} tint="#192b38" />
      <WorkshopTowers tier={tier} />
      {tier >= 2 && (
        <Suspense fallback={null}>
          <DistantSkyline tier={tier} />
        </Suspense>
      )}
    </>
  );
}
