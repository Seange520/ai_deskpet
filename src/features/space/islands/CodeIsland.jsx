import ToonMaterial from '../../npr/ToonMaterial';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, CanvasTexture, Matrix4, UniformsLib, UniformsUtils } from 'three';

const fallHeight = 2.85;
const vertexShader = `
#include <fog_pars_vertex>
uniform float time;
varying vec2 glyphUv;
varying float brightness;
varying float glyph;
void main() {
  vec3 origin = instanceMatrix[3].xyz;
  float lane = origin.x * 2.9 + origin.z * 8.6;
  float seed = fract(sin(lane * 39.27) * 2971.32);
  float fall = fract(origin.y / ${fallHeight} - time * (0.19 + seed * 0.13));
  origin.y = 0.19 + fall * ${fallHeight};
  float head = pow(0.5 + 0.5 * cos(fall * 26.0 + seed * 18.0 + time * 2.3), 4.0);
  brightness = smoothstep(0.02, 0.26, fall) * (1.0 - smoothstep(0.86, 1.0, fall))
    * (0.32 + head * 0.68);
  float characterSeed = dot(instanceMatrix[3].xyz, vec3(19.0, 23.0, 11.0)) + floor(time * 2.3) + 0.5;
  glyph = floor(fract(sin(characterSeed * 37.71) * 4375.39) * 64.0);
  glyphUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(origin, 1.0);
  mvPosition.xy += position.xy;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const fragmentShader = `
#include <fog_pars_fragment>
uniform sampler2D atlas;
uniform float energy;
varying vec2 glyphUv;
varying float brightness;
varying float glyph;
void main() {
  vec2 cell = vec2(mod(glyph, 8.0), 7.0 - floor(glyph / 8.0));
  float ink = texture2D(atlas, (cell + mix(vec2(0.025), vec2(0.975), glyphUv)) / 8.0).a;
  float fog = 1.0;
  #ifdef FOG_EXP2
    fog = exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  #endif
  float band = floor(brightness * 3.0) / 3.0;
  vec3 color = mix(vec3(0.10, 0.52, 0.49), vec3(0.68, 1.4, 1.15), band);
  gl_FragColor = vec4(color * energy, ink * brightness * fog);
}
`;

function createAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 47px "Yu Gothic", "Meiryo", monospace';
  for (let i = 0; i < 64; i++) {
    const char = i % 4 < 2 ? String(i % 4) : String.fromCharCode(0x30a1 + ((i * 19) % 84));
    ctx.fillText(char, (i % 8) * 64 + 32, Math.floor(i / 8) * 64 + 33, 52);
  }
  return new CanvasTexture(canvas);
}

function placeLanes(mesh, layers, columns, rows) {
  const transform = new Matrix4();
  let index = 0;
  for (let layer = 0; layer < layers; layer++) {
    for (let column = 0; column < columns; column++) {
      const x = ((column + 0.5) / columns - 0.5) * 5.4;
      const z = 0.52 + layer * 0.58 - x * x * 0.087;
      for (let row = 0; row < rows; row++) {
        const y = (((row + column * 0.37 + layer * 0.62) / rows) % 1) * fallHeight;
        transform.makeTranslation(x, y, z);
        mesh.setMatrixAt(index++, transform);
      }
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

function DataFall({ tier, paused, reduced }) {
  const mesh = useRef(null);
  const material = useRef(null);
  const layers = 3;
  const columns = tier === 3 ? 8 : 6;
  const rows = tier === 3 ? 48 : 36;
  const atlas = useMemo(createAtlas, []);
  const uniforms = useMemo(
    () => ({
      ...UniformsUtils.clone(UniformsLib.fog),
      atlas: { value: atlas },
      time: { value: 0 },
      energy: { value: tier === 3 ? 1.2 : 0.88 },
    }),
    [atlas, tier],
  );
  useEffect(() => () => atlas.dispose(), [atlas]);
  useLayoutEffect(() => placeLanes(mesh.current, layers, columns, rows), [columns, rows]);

  useFrame((_, delta) => {
    if (!paused && !reduced) material.current.uniforms.time.value += Math.min(delta, 0.05);
  });

  return (
    <instancedMesh
      name="p5-data-waterfall"
      ref={mesh}
      args={[null, null, layers * columns * rows]}
      frustumCulled={false}
    >
      <planeGeometry args={tier === 3 ? [0.14, 0.087] : [0.15, 0.107]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
        toneMapped={false}
        fog
      />
    </instancedMesh>
  );
}

function DataSilhouette() {
  const mesh = useRef(null);
  useLayoutEffect(() => placeLanes(mesh.current, 2, 9, 13), []);
  return (
    <instancedMesh
      name="p5-data-silhouette"
      ref={mesh}
      args={[null, null, 234]}
      position={[0, 0.19, 0]}
    >
      <boxGeometry args={[0.085, 0.096, 0.045]} />
      <meshBasicMaterial color="#64dcb7" />
    </instancedMesh>
  );
}

export default function CodeIsland({ tier, paused, reduced }) {
  return (
    <group name="p5-code-array">
      <mesh position={[0, 0.16, 0.76]}>
        <boxGeometry args={[5.15, 0.31, 1.6]} />
        <ToonMaterial color="#15393e" emissive="#15383d" emissiveIntensity={0.53} />
      </mesh>
      <mesh position={[0, 0.324, 0.76]}>
        <boxGeometry args={[5.02, 0.045, 1.43]} />
        <ToonMaterial
          color="#38b3a8"
          emissive="#43e5c8"
          emissiveIntensity={tier >= 2 ? 1.15 : 0.42}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 2.52, 1.61, 0.55]} rotation={[0, 0, side * -0.1]}>
          <mesh>
            <boxGeometry args={[0.22, 2.59, 0.42]} />
            <ToonMaterial color="#27314a" emissive="#244458" emissiveIntensity={0.54} />
          </mesh>
          <mesh position={[-side * 0.115, 0.19, -0.08]}>
            <boxGeometry args={[0.045, 2.07, 0.09]} />
            <meshBasicMaterial color="#85efd5" />
          </mesh>
        </group>
      ))}
      {tier === 1 ? <DataSilhouette /> : <DataFall tier={tier} paused={paused} reduced={reduced} />}
    </group>
  );
}
