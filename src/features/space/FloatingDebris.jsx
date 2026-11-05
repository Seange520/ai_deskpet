import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Object3D } from 'three';

const count = 60;
const accent = new Color('#a98bff');

export default function FloatingDebris({ paused, reduced }) {
  const boxes = useRef(null);
  const shards = useRef(null);
  const time = useMemo(() => ({ value: 0 }), []);

  useLayoutEffect(() => {
    const dummy = new Object3D();
    for (const [batch, mesh] of [boxes.current, shards.current].entries()) {
      for (let index = 0; index < count; index += 1) {
        const i = 2 * index + batch;
        const angle = i * 2.39996;
        const radius = 5 + 34 * Math.sqrt(((i * 53) % 121) / 121);
        const size = 0.15 + ((i * 29) % 19) * 0.019;
        dummy.position.set(
          Math.cos(angle) * radius,
          0.65 + ((i * 37) % 113) * 0.067,
          Math.sin(angle) * radius,
        );
        dummy.rotation.set(i * 0.61, i * 1.11, i * 0.83);
        dummy.scale.set(size * (0.8 + (i % 4) * 0.24), size * (0.55 + (i % 7) * 0.15), size);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }, []);

  useFrame((_, delta) => {
    if (!paused && !reduced) time.value += Math.min(delta, 0.05);
  });

  const materials = useMemo(
    () =>
      [false, true].map((octahedron) => ({
        customProgramCacheKey: () => (octahedron ? 'space-debris-octahedron' : 'space-debris-box'),
        onBeforeCompile(shader) {
          shader.uniforms.driftTime = time;
          shader.uniforms.edgeColor = { value: accent };
          shader.vertexShader =
            'uniform float driftTime; varying vec3 debrisLocal;\n' + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace(
            '#include <project_vertex>',
            `
        debrisLocal = position;
        vec3 center = instanceMatrix[3].xyz;
        transformed += (inverse(instanceMatrix) * vec4(
          0.0, sin(driftTime * 0.48 + dot(center.xz, vec2(0.39, 0.63))) * 0.31, 0.0, 0.0
        )).xyz;
        #include <project_vertex>
      `,
          );
          const edgeDistance = octahedron
            ? 'min(p.x, min(p.y, p.z))'
            : '0.5 - max(min(p.x, p.y), max(min(p.x, p.z), min(p.y, p.z)))';
          shader.fragmentShader =
            'uniform vec3 edgeColor; varying vec3 debrisLocal;\n' + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `
        #include <emissivemap_fragment>
        vec3 p = abs(debrisLocal);
        float distanceToEdge = ${edgeDistance};
        float edge = 1.0 - smoothstep(0.012, 0.092, distanceToEdge);
        totalEmissiveRadiance += edgeColor * edge * 1.9;
      `,
          );
        },
      })),
    [time],
  );

  return (
    <group name="space-floating-debris">
      <instancedMesh ref={boxes} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry />
        <meshStandardMaterial color="#43355f" roughness={0.53} metalness={0.28} {...materials[0]} />
      </instancedMesh>
      <instancedMesh ref={shards} args={[undefined, undefined, count]} frustumCulled={false}>
        <octahedronGeometry args={[0.68, 0]} />
        <meshStandardMaterial color="#365063" roughness={0.49} metalness={0.24} {...materials[1]} />
      </instancedMesh>
    </group>
  );
}
