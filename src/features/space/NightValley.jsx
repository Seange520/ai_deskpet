import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, DoubleSide, Object3D } from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import ToonMaterial from '../npr/ToonMaterial';
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
    dome.material.depthWrite = false;
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
      gl_FragColor = vec4(night + retColor * vec3(0.035, 0.065, 0.13) + lunarGlow + moon, 1.0);
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

function ValleyStars({ tier, reduced, occluded }) {
  const stars = useRef(null);
  const count = tier === 3 ? 1400 : tier === 2 ? 620 : 105;
  const positions = useMemo(() => {
    let state = 47291;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const array = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const y = 0.1 + random() * 0.88;
      const angle = random() * Math.PI * 2;
      const radius = 96 + random() * 7;
      const horizontal = Math.sqrt(1 - y * y) * radius;
      array.set([Math.cos(angle) * horizontal, y * radius, Math.sin(angle) * horizontal], i * 3);
    }
    return array;
  }, [count]);
  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);
  useFrame((_, delta) => {
    if (!reduced) uniforms.time.value += Math.min(delta, 0.05);
  });
  return (
    <points name="valley-stars" ref={stars} renderOrder={-90} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={occluded}
        blending={AdditiveBlending}
        vertexShader={`
        uniform float time; varying float brightness;
        void main() {
          float seed=fract(sin(dot(position,vec3(12.9,78.2,39.4)))*43758.54);
          brightness=(0.55+seed*0.45)*(0.88+0.12*sin(time*0.5+seed*24.0));
          vec4 view=modelViewMatrix*vec4(position,1.0);
          gl_PointSize=clamp((1.8+seed*1.8)*80.0/max(1.0,-view.z),1.0,3.0);
          gl_Position=projectionMatrix*view;
        }
      `}
        fragmentShader={`
        varying float brightness;
        void main() {
          float radius=length(gl_PointCoord-0.5)*2.0;
          float alpha=(1.0-smoothstep(0.0,1.0,radius))*brightness;
          gl_FragColor=vec4(vec3(0.66,0.83,1.0),alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `}
      />
    </points>
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
uniform float time; uniform float contrast;
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
  gl_FragColor = vec4(tint, sheet * filament * breakUp * 0.64 * contrast);
}
`;

function AuroraPlane({ paused, reduced, contrast = 1 }) {
  const uniforms = useMemo(
    () => ({ time: { value: 0 }, contrast: { value: contrast } }),
    [contrast],
  );
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

function ridgeHaze(shader) {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <opaque_fragment>',
    `
    float haze=1.0-exp(-max(length(vViewPosition)-26.0,0.0)*0.012);
    outgoingLight=mix(outgoingLight,vec3(0.11,0.17,0.28),haze*0.72);
    #include <opaque_fragment>
  `,
  );
}
function Ridge({ radius, amplitude, segments, tint, smooth = false }) {
  const { positions, colors, indices } = useMemo(
    () => ridgeMesh(radius, amplitude, segments, tint),
    [radius, amplitude, segments, tint],
  );
  return (
    <mesh name="valley-ridge">
      <bufferGeometry onUpdate={(geometry) => geometry.computeVertexNormals()}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="index" args={[indices, 1]} />
      </bufferGeometry>
      <ToonMaterial
        vertexColors
        flatShading={!smooth}
        fog={false}
        side={DoubleSide}
        onBeforeCompile={ridgeHaze}
      />
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
        <ToonMaterial color="#536f8c" flatShading />
      </instancedMesh>
      <instancedMesh
        name="valley-tower-windows"
        ref={windows}
        args={[null, null, towerCount * rows]}
      >
        <boxGeometry />
        <ToonMaterial color="#a8c9d9" emissive="#6a9eaf" emissiveIntensity={0.4} />
      </instancedMesh>
    </group>
  );
}

export default function NightValley({
  tier,
  paused,
  reduced,
  occludeStars = false,
  detailed = false,
  contrast = 1,
}) {
  return (
    <>
      <MoonSky />
      <ValleyStars tier={tier} reduced={paused || reduced} occluded={occludeStars} />
      {tier >= 2 && <AuroraPlane paused={paused} reduced={reduced} contrast={contrast} />}
      <Ridge
        radius={79}
        amplitude={16}
        segments={tier === 1 ? 54 : 104}
        tint={detailed ? '#425771' : '#727fae'}
        smooth={detailed}
      />
      <Ridge
        radius={61}
        amplitude={12}
        segments={tier === 1 ? 54 : 104}
        tint={detailed ? '#294a60' : '#3c6584'}
        smooth={detailed}
      />
      {tier >= 2 && !detailed && <WorkshopTowers tier={tier} />}
      {tier >= 2 && !detailed && (
        <Suspense fallback={null}>
          <DistantSkyline tier={tier} />
        </Suspense>
      )}
    </>
  );
}
