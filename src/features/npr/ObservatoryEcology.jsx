import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Float32BufferAttribute, Color, Object3D, DoubleSide } from 'three';
import ToonMaterial from './ToonMaterial';

// Original lofted six-petal flowers and hanging leaf ribbons. No external assets.
function botanicalGeometry(vine = false) {
  const points = [];
  const tri = (a, b, c) => points.push(...a, ...b, ...c);
  const strip = (sample, steps) => {
    for (let i = 0; i < steps; i++) {
      const t = i / steps,
        u = (i + 1) / steps;
      const a = sample(t, -1),
        b = sample(t, 1),
        c = sample(u, -1),
        d = sample(u, 1);
      tri(a, b, c);
      tri(b, d, c);
    }
  };
  if (!vine) {
    for (let layer = 0; layer < 2; layer++)
      for (let petal = 0; petal < 6; petal++) {
        const angle = (petal * Math.PI) / 3 + layer * 0.52;
        strip((t, side) => {
          const length = layer ? 0.58 : 0.9;
          const radius = 0.04 + t * length;
          const width = Math.sin(Math.PI * t) * 0.23 * (layer ? 0.72 : 1);
          return [
            Math.cos(angle) * radius - Math.sin(angle) * width * side,
            0.22 + 0.2 * Math.sin(t * Math.PI) - 0.3 * t + layer * 0.19 + 0.04 * side * side,
            Math.sin(angle) * radius + Math.cos(angle) * width * side,
          ];
        }, 7);
      }
  } else {
    strip(
      (t, side) => [Math.sin(t * 4) * 0.12 + side * 0.015, -t * 2.6, Math.cos(t * 5) * 0.08],
      18,
    );
    for (let leaf = 0; leaf < 11; leaf++) {
      const y = -0.18 - leaf * 0.21,
        sign = leaf % 2 ? -1 : 1;
      strip(
        (t, side) => [
          Math.sin(-y * 1.5) * 0.12 + sign * t * 0.46,
          y - t * 0.23 + Math.sin(t * Math.PI) * side * 0.1,
          0.06 + Math.sin(t * Math.PI) * side * 0.13,
        ],
        5,
      );
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(points, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
export default function ObservatoryEcology({ island, tier, paused, reduced }) {
  const flowers = useRef(),
    cores = useRef(),
    vines = useRef();
  const clock = useMemo(() => ({ value: 0 }), []);
  const geometry = useMemo(() => [botanicalGeometry(), botanicalGeometry(true)], []);
  const count = tier === 3 ? 28 : 16;
  const compile = useMemo(
    () => (shader) => {
      shader.uniforms.botanicalTime = clock;
      shader.vertexShader = 'uniform float botanicalTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
      #include <begin_vertex>
      float phase=instanceMatrix[3].x*2.3+instanceMatrix[3].z*1.7;
      float stem=abs(position.y);
      transformed.x+=sin(botanicalTime*1.1+phase+position.y)*stem*stem*0.025;
      transformed.y+=sin(botanicalTime*1.3+phase)*length(position.xz)*0.05;
      transformed.z+=cos(botanicalTime*0.8+phase)*stem*0.025;
    `,
      );
    },
    [clock],
  );
  useEffect(() => () => geometry.forEach((g) => g.dispose()), [geometry]);
  useLayoutEffect(() => {
    const pose = new Object3D(),
      tint = new Color();
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399963,
        radius = 2.65 + (i % 3) * 0.12;
      const x = Math.cos(angle) * radius,
        z = Math.sin(angle) * radius;
      // Hardware has a square shoreline; keep its circuit/chip sites clear.
      const scale = island.id === 'hardware' ? 2.6 / Math.max(Math.abs(x), Math.abs(z)) : 1;
      pose.position.set(x * scale, island.id === 'hardware' ? 0.35 : 0.14, z * scale);
      pose.rotation.set(0.06, angle, 0.12 * Math.sin(i * 3));
      pose.scale.setScalar(0.24 + (i % 4) * 0.045);
      pose.updateMatrix();
      flowers.current.setMatrixAt(i, pose.matrix);
      flowers.current.setColorAt(i, tint.set(i % 3 ? '#8fdfd2' : '#c2a2ed'));
      pose.scale.multiplyScalar(0.22);
      pose.position.y += 0.09;
      pose.updateMatrix();
      cores.current.setMatrixAt(i, pose.matrix);
      pose.position.set(x * scale * 1.07, -0.04, z * scale * 1.07);
      pose.scale.setScalar(0.42 + (i % 5) * 0.08);
      pose.rotation.set(0, angle, 0);
      pose.updateMatrix();
      vines.current.setMatrixAt(i, pose.matrix);
    }
    for (const ref of [flowers, cores, vines]) {
      ref.current.instanceMatrix.needsUpdate = true;
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
      ref.current.computeBoundingSphere();
      ref.current.boundingSphere.radius += 0.8;
    }
  }, [count, island.id]);
  useFrame((_, delta) => {
    if (!paused && !reduced && tier >= 2) clock.value += Math.min(delta, 0.05);
  });
  return (
    <group name="npr-observatory-ecology">
      <instancedMesh name="npr-crystal-shells" ref={flowers} args={[geometry[0], null, count]}>
        <ToonMaterial
          color="#c6e8f1"
          transparent
          opacity={0.72}
          depthWrite={false}
          side={DoubleSide}
          onBeforeCompile={compile}
        />
      </instancedMesh>
      <instancedMesh name="npr-plant-lights" ref={cores} args={[null, null, count]}>
        <icosahedronGeometry args={[1, 1]} />
        <ToonMaterial color="#a5f2d7" emissive="#6bc5c0" emissiveIntensity={2} />
      </instancedMesh>
      <instancedMesh name="npr-edge-vines" ref={vines} args={[geometry[1], null, count]}>
        <ToonMaterial
          color="#63b5b7"
          side={DoubleSide}
          emissive="#346c83"
          emissiveIntensity={0.22}
          onBeforeCompile={compile}
        />
      </instancedMesh>
    </group>
  );
}
