import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Matrix4, Vector3 } from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { isSpaceTransition, useSpaceStore } from './spaceStore';

const particleCount = 960;
const noise = `
uniform float jumpDissolve;
varying vec3 jumpPosition;
float jumpHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.17) * 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float jumpNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 u = fract(p);
  u = u * u * (3.0 - 2.0 * u);
  return mix(
    mix(mix(jumpHash(i), jumpHash(i + vec3(1,0,0)), u.x),
        mix(jumpHash(i + vec3(0,1,0)), jumpHash(i + vec3(1,1,0)), u.x), u.y),
    mix(mix(jumpHash(i + vec3(0,0,1)), jumpHash(i + vec3(1,0,1)), u.x),
        mix(jumpHash(i + vec3(0,1,1)), jumpHash(i + vec3(1,1,1)), u.x), u.y), u.z);
}
`;

function patchMaterial(material, amount) {
  const compile = material.onBeforeCompile;
  const key = material.customProgramCacheKey;
  const previousKey = key.call(material);
  material.customProgramCacheKey = () => previousKey + '|sparkmate-jump';
  material.onBeforeCompile = function (shader, renderer) {
    compile.call(this, shader, renderer);
    shader.uniforms.jumpDissolve = amount;
    shader.vertexShader =
      'varying vec3 jumpPosition;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\njumpPosition = position;',
      );
    shader.fragmentShader =
      noise +
      shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
      if (jumpDissolve > 0.001) {
        float pattern = jumpNoise(jumpPosition * 6.5) * 0.73 + jumpNoise(jumpPosition * 18.0) * 0.27;
        float edge = pattern - mix(-0.13, 1.15, jumpDissolve);
        float opacity = smoothstep(-0.045, 0.09, edge);
        // Screen-door coverage retains the material's ordinary opaque depth and sort order.
        if (opacity < jumpHash(vec3(gl_FragCoord.xy, 0.53))) discard;
        float rim = 1.0 - smoothstep(0.025, 0.15, abs(edge));
        totalEmissiveRadiance += rim * vec3(0.32, 1.78, 2.75);
      }`,
      );
  };
  material.needsUpdate = true;
  return () => {
    material.onBeforeCompile = compile;
    material.customProgramCacheKey = key;
    material.needsUpdate = true;
  };
}

function surfaceParticles(body) {
  const surfaces = [];
  let total = 0;
  body.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.material?.isMeshStandardMaterial) return;
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
    const radius = mesh.geometry.boundingSphere.radius;
    const weight = Math.max(0.02, radius * radius);
    total += weight;
    surfaces.push({ mesh, end: total });
  });
  let seed = 9829;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (const surface of surfaces) {
    surface.sampler = new MeshSurfaceSampler(surface.mesh).setRandomGenerator(random).build();
  }
  return Array.from({ length: particleCount }, (_, index) => {
    const { mesh, sampler } = surfaces.find(({ end }) => end > (index / particleCount) * total);
    const point = new Vector3();
    sampler.sample(point);
    return { mesh, point };
  });
}

const vertex = `
uniform float dissolve;
uniform float flightTime;
uniform float pixelRatio;
varying float spark;
varying float fade;
void main() {
  float seed = fract(sin(dot(position, vec3(41.3, 53.1, 39.7))) * 49177.1);
  float angle = seed * 6.283 + flightTime * (0.55 + seed * 0.9);
  vec3 drift = vec3(cos(angle), sin(angle * 1.37), sin(angle));
  float burst = dissolve * (0.15 + seed * seed * 1.05);
  vec3 p = position + drift * burst + vec3(0.0, dissolve * 0.13, -seed * dissolve * 0.72);
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * view;
  gl_PointSize = clamp((8.0 + 10.0 * seed) * pixelRatio / max(1.0, -view.z), 1.3, 5.5);
  spark = seed;
  fade = smoothstep(seed * 0.46, seed * 0.46 + 0.19, dissolve);
}
`;
const fragment = `
varying float spark;
varying float fade;
void main() {
  float falloff = max(0.0, 1.0 - length(gl_PointCoord - 0.5) * 2.0);
  vec3 cold = vec3(0.18, 1.02, 1.73);
  vec3 warm = vec3(2.10, 1.12, 0.51);
  gl_FragColor = vec4(mix(cold, warm, step(0.81, spark)), falloff * falloff * fade);
}
`;

export default function PetDissolve({ pet, paused }) {
  const points = useRef(null);
  const sources = useRef({ body: null, points: [], patches: new Map() });
  const uniforms = useMemo(
    () => ({
      dissolve: { value: 0 },
      flightTime: { value: 0 },
      pixelRatio: { value: 1 },
    }),
    [],
  );
  const positions = useMemo(() => new Float32Array(particleCount * 3), []);
  const inverse = useMemo(() => new Matrix4(), []);
  const point = useMemo(() => new Vector3(), []);
  useLayoutEffect(
    () => () => {
      const state = sources.current;
      for (const restore of state.patches.values()) restore();
      state.patches.clear();
      state.body = null;
    },
    [],
  );
  useFrame(({ gl }, delta) => {
    if (paused) return;
    const group = pet.current;
    const particles = points.current;
    if (!group || !particles) return;
    const body = group.getObjectByName('command-pet');
    const source = sources.current;
    if (body && source.body !== body) {
      for (const restore of source.patches.values()) restore();
      source.patches.clear();
      source.body = body;
      source.points = surfaceParticles(body);
      body.traverse((mesh) => {
        const { material } = mesh;
        if (material?.isMeshStandardMaterial && !source.patches.has(material))
          source.patches.set(material, patchMaterial(material, uniforms.dissolve));
      });
    }
    const { phase } = useSpaceStore.getState();
    const dt = Math.min(delta, 0.085);
    const leaving = isSpaceTransition(phase);
    const previous = uniforms.dissolve.value;
    const amount = Math.max(0, Math.min(1, previous + (leaving ? dt / 0.31 : -dt / 0.32)));
    uniforms.dissolve.value = amount;
    group.userData.dissolve = amount;
    particles.visible = amount > 0.001 && source.points.length === particleCount;
    if (!particles.visible) return;
    uniforms.pixelRatio.value = gl.getPixelRatio();
    uniforms.flightTime.value += dt;
    group.updateWorldMatrix(true, true);
    inverse.copy(group.matrixWorld).invert();
    for (const [index, sample] of source.points.entries()) {
      point.copy(sample.point).applyMatrix4(sample.mesh.matrixWorld).applyMatrix4(inverse);
      point.toArray(positions, index * 3);
    }
    particles.geometry.attributes.position.needsUpdate = true;
  }, 0.25);

  return (
    <points name="p7-jump-shell" ref={points} visible={false} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}
